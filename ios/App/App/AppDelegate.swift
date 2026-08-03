import UIKit
import Capacitor
import AVFoundation
import AuthenticationServices
import EventKit

@objc(BridgeViewController)
class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeVideoEncoderPlugin())
        bridge?.registerPluginInstance(AppleSignInPlugin())
        bridge?.registerPluginInstance(AppleCalendarPlugin())
    }
}

@objc(AppleCalendarPlugin)
public class AppleCalendarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleCalendarPlugin"
    public let jsName = "AppleCalendar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listCalendars", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncEvents", returnType: CAPPluginReturnPromise)
    ]

    private let eventStore = EKEventStore()
    private let isoFormatter = ISO8601DateFormatter()

    @objc func requestAccess(_ call: CAPPluginCall) {
        let completion: (Bool, Error?) -> Void = { granted, error in
            if let error {
                call.reject(error.localizedDescription, "APPLE_CALENDAR_PERMISSION_FAILED", error)
            } else {
                call.resolve(["granted": granted])
            }
        }
        if #available(iOS 17.0, *) {
            eventStore.requestFullAccessToEvents(completion: completion)
        } else {
            eventStore.requestAccess(to: .event, completion: completion)
        }
    }

    @objc func listCalendars(_ call: CAPPluginCall) {
        guard hasFullAccess else {
            call.reject("Calendar access is required", "APPLE_CALENDAR_PERMISSION_REQUIRED")
            return
        }
        let defaultId = eventStore.defaultCalendarForNewEvents?.calendarIdentifier
        let calendars: JSArray = eventStore.calendars(for: .event)
            .filter(\.allowsContentModifications)
            .map { calendar in
                [
                    "id": calendar.calendarIdentifier,
                    "name": calendar.title,
                    "source": calendar.source.title,
                    "isDefault": calendar.calendarIdentifier == defaultId
                ] as JSObject
            }
        call.resolve(["calendars": calendars])
    }

    @objc func syncEvents(_ call: CAPPluginCall) {
        guard hasFullAccess else {
            call.reject("Calendar access is required", "APPLE_CALENDAR_PERMISSION_REQUIRED")
            return
        }
        guard
            let calendarId = call.getString("calendarId"),
            let calendar = eventStore.calendar(withIdentifier: calendarId),
            calendar.allowsContentModifications,
            let rawEvents = call.getArray("events")
        else {
            call.reject("A writable calendar and events are required", "APPLE_CALENDAR_INVALID_INPUT")
            return
        }

        do {
            let wanted = rawEvents.compactMap { $0 as? JSObject }
            let wantedIds = Set(wanted.compactMap { $0["id"] as? String })
            let existingByMarker = xtramysEvents(in: calendar).reduce(into: [String: EKEvent]()) { result, event in
                if let marker = event.url?.absoluteString { result[marker] = event }
            }
            var results: JSArray = []

            for item in wanted {
                guard
                    let id = item["id"] as? String,
                    let type = item["type"] as? String,
                    let startObject = item["start"] as? JSObject,
                    let endObject = item["end"] as? JSObject,
                    let start = parseDate(startObject),
                    let end = parseDate(endObject)
                else { continue }

                let marker = markerURL(type: type, id: id)
                let savedId = item["appleEventId"] as? String
                let event = savedId.flatMap { eventStore.event(withIdentifier: $0) } ?? existingByMarker[marker]
                let localUpdated = parseISO(item["updatedAt"] as? String)
                let lastSync = parseISO(item["lastSync"] as? String)

                if event == nil, lastSync != nil, localUpdated == nil || localUpdated! <= lastSync! {
                    results.append(["id": id, "type": type, "action": "deleted"])
                    continue
                }

                if item["forceLocal"] as? Bool != true,
                   let event, let externalUpdated = event.lastModifiedDate, let lastSync,
                   externalUpdated > lastSync {
                    let localChanged = localUpdated.map { $0 > lastSync } ?? false
                    if localChanged, let localUpdated,
                       abs(localUpdated.timeIntervalSince(externalUpdated)) < 30 {
                        var conflict = externalResult(event: event, id: id, type: type)
                        conflict["action"] = "conflict"
                        results.append(conflict)
                        continue
                    }
                    if localUpdated == nil || externalUpdated > localUpdated! {
                        results.append(externalResult(event: event, id: id, type: type))
                        continue
                    }
                }

                let target = event ?? EKEvent(eventStore: eventStore)
                target.calendar = calendar
                target.title = item["title"] as? String ?? "Xtramys"
                target.startDate = start
                target.endDate = max(end, start.addingTimeInterval(60))
                target.location = item["location"] as? String
                target.notes = item["description"] as? String
                target.url = URL(string: marker)
                try eventStore.save(target, span: .thisEvent, commit: true)
                results.append([
                    "id": id,
                    "type": type,
                    "action": "synced",
                    "appleEventId": target.eventIdentifier ?? marker,
                    "externalUpdatedAt": isoFormatter.string(from: target.lastModifiedDate ?? Date())
                ])
            }

            for (marker, event) in existingByMarker {
                guard let id = marker.split(separator: "/").last.map(String.init), !wantedIds.contains(id) else { continue }
                try eventStore.remove(event, span: .thisEvent, commit: true)
            }
            call.resolve(["results": results])
        } catch {
            eventStore.reset()
            call.reject(error.localizedDescription, "APPLE_CALENDAR_SYNC_FAILED", error)
        }
    }

    private var hasFullAccess: Bool {
        let status = EKEventStore.authorizationStatus(for: .event)
        if #available(iOS 17.0, *) { return status == .fullAccess }
        return status == .authorized
    }

    private func markerURL(type: String, id: String) -> String {
        "xtramys://calendar/\(type)/\(id)"
    }

    private func parseISO(_ value: String?) -> Date? {
        value.flatMap(isoFormatter.date(from:))
    }

    private func parseDate(_ value: JSObject) -> Date? {
        guard let raw = value["dateTime"] as? String else { return nil }
        if let date = isoFormatter.date(from: raw) { return date }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
        formatter.timeZone = TimeZone(identifier: value["timeZone"] as? String ?? TimeZone.current.identifier)
        return formatter.date(from: raw)
    }

    private func xtramysEvents(in calendar: EKCalendar) -> [EKEvent] {
        // ponytail: bounded scan keeps EventKit fast; widen it if archived seasons need reconciliation.
        let start = Calendar.current.date(byAdding: .year, value: -2, to: Date()) ?? Date.distantPast
        let end = Calendar.current.date(byAdding: .year, value: 3, to: Date()) ?? Date.distantFuture
        let predicate = eventStore.predicateForEvents(withStart: start, end: end, calendars: [calendar])
        return eventStore.events(matching: predicate).filter { $0.url?.scheme == "xtramys" }
    }

    private func externalResult(event: EKEvent, id: String, type: String) -> JSObject {
        [
            "id": id,
            "type": type,
            "action": "updated",
            "appleEventId": event.eventIdentifier ?? markerURL(type: type, id: id),
            "externalUpdatedAt": isoFormatter.string(from: event.lastModifiedDate ?? Date()),
            "start": ["dateTime": isoFormatter.string(from: event.startDate)] as JSObject,
            "end": ["dateTime": isoFormatter.string(from: event.endDate)] as JSObject,
            "location": event.location ?? ""
        ]
    }
}

@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin,
    ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var pendingNonce: String?

    @objc func signIn(_ call: CAPPluginCall) {
        guard pendingCall == nil else {
            call.reject("Sign in with Apple is already running", "APPLE_SIGN_IN_IN_PROGRESS")
            return
        }

        let nonce = UUID().uuidString
        pendingCall = call
        pendingNonce = nonce

        DispatchQueue.main.async {
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = nonce

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? UIWindow()
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard
            let call = pendingCall,
            let nonce = pendingNonce,
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let identityTokenData = credential.identityToken,
            let identityToken = String(data: identityTokenData, encoding: .utf8)
        else {
            finishWithError("Apple did not return a valid identity token", code: "INVALID_APPLE_CREDENTIAL")
            return
        }

        var result: JSObject = [
            "identityToken": identityToken,
            "user": credential.user,
            "nonce": nonce
        ]
        if let code = credential.authorizationCode.flatMap({ String(data: $0, encoding: .utf8) }) {
            result["authorizationCode"] = code
        }
        if let email = credential.email { result["email"] = email }
        if let givenName = credential.fullName?.givenName { result["givenName"] = givenName }
        if let familyName = credential.fullName?.familyName { result["familyName"] = familyName }

        pendingCall = nil
        pendingNonce = nil
        call.resolve(result)
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        let code = (error as? ASAuthorizationError)?.code == .canceled
            ? "APPLE_SIGN_IN_CANCELLED"
            : "APPLE_SIGN_IN_FAILED"
        finishWithError(error.localizedDescription, code: code)
    }

    private func finishWithError(_ message: String, code: String) {
        let call = pendingCall
        pendingCall = nil
        pendingNonce = nil
        call?.reject(message, code)
    }
}

@objc(NativeVideoEncoderPlugin)
public class NativeVideoEncoderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeVideoEncoderPlugin"
    public let jsName = "NativeVideoEncoder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "encodeFrames", returnType: CAPPluginReturnPromise)
    ]

    @objc func encodeFrames(_ call: CAPPluginCall) {
        guard let frames = call.getArray("frames", String.self), !frames.isEmpty else {
            call.reject("No frames provided")
            return
        }
        let fps = max(1, call.getInt("fps") ?? 30)

        DispatchQueue.global(qos: .userInitiated).async {
            let outputURL = FileManager.default.temporaryDirectory
                .appendingPathComponent("xtramys_video_\(UUID().uuidString).mp4")
            do {
                try self.encode(frames: frames, fps: fps, outputURL: outputURL)
                let data = try Data(contentsOf: outputURL)
                try? FileManager.default.removeItem(at: outputURL)
                call.resolve([
                    "mimeType": "video/mp4",
                    "data": data.base64EncodedString()
                ])
            } catch {
                try? FileManager.default.removeItem(at: outputURL)
                call.reject("Native video encode failed: \(error.localizedDescription)", nil, error)
            }
        }
    }

    private func encode(frames: [String], fps: Int, outputURL: URL) throws {
        guard let firstImage = try decodeFrame(frames[0]).cgImage else {
            throw encoderError("Invalid first frame")
        }
        let width = max(2, firstImage.width - firstImage.width % 2)
        let height = max(2, firstImage.height - firstImage.height % 2)
        let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
        let areaScale = max(1.0, Double(width * height) / Double(1920 * 1080))
        let bitrate = Int(min(28_000_000.0, max(8_000_000.0, areaScale * 14_000_000.0)))
        let settings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: bitrate,
                AVVideoMaxKeyFrameIntervalKey: fps,
                AVVideoExpectedSourceFrameRateKey: fps
            ]
        ]
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
        input.expectsMediaDataInRealTime = false
        let attributes: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: width,
            kCVPixelBufferHeightKey as String: height,
            kCVPixelBufferIOSurfacePropertiesKey as String: [:]
        ]
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: input,
            sourcePixelBufferAttributes: attributes
        )
        guard writer.canAdd(input) else { throw encoderError("Video writer input unavailable") }
        writer.add(input)
        guard writer.startWriting() else {
            throw writer.error ?? encoderError("Video writer could not start")
        }
        writer.startSession(atSourceTime: .zero)
        defer {
            if writer.status == .writing {
                input.markAsFinished()
                writer.cancelWriting()
            }
        }

        for (index, frame) in frames.enumerated() {
            while !input.isReadyForMoreMediaData {
                if writer.status == .failed || writer.status == .cancelled {
                    throw writer.error ?? encoderError("Video writer failed")
                }
                Thread.sleep(forTimeInterval: 0.002)
            }
            let image = try decodeFrame(frame)
            guard let pixelBuffer = makePixelBuffer(
                image: image,
                width: width,
                height: height,
                pool: adaptor.pixelBufferPool
            ) else {
                throw encoderError("Could not create video frame")
            }
            let time = CMTime(value: CMTimeValue(index), timescale: CMTimeScale(fps))
            guard adaptor.append(pixelBuffer, withPresentationTime: time) else {
                throw writer.error ?? encoderError("Could not append video frame")
            }
        }

        input.markAsFinished()
        let finished = DispatchSemaphore(value: 0)
        writer.finishWriting { finished.signal() }
        finished.wait()
        guard writer.status == .completed else {
            throw writer.error ?? encoderError("Video writer did not finish")
        }
    }

    private func decodeFrame(_ value: String) throws -> UIImage {
        let payload = value.split(separator: ",", maxSplits: 1).last.map(String.init) ?? value
        guard let data = Data(base64Encoded: payload, options: .ignoreUnknownCharacters),
              let image = UIImage(data: data) else {
            throw encoderError("Invalid frame data")
        }
        return image
    }

    private func makePixelBuffer(
        image: UIImage,
        width: Int,
        height: Int,
        pool: CVPixelBufferPool?
    ) -> CVPixelBuffer? {
        guard let cgImage = image.cgImage else { return nil }
        var pixelBuffer: CVPixelBuffer?
        let status: CVReturn
        if let pool {
            status = CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pixelBuffer)
        } else {
            status = CVPixelBufferCreate(
                nil,
                width,
                height,
                kCVPixelFormatType_32BGRA,
                [kCVPixelBufferCGImageCompatibilityKey: true,
                 kCVPixelBufferCGBitmapContextCompatibilityKey: true] as CFDictionary,
                &pixelBuffer
            )
        }
        guard status == kCVReturnSuccess, let pixelBuffer else { return nil }

        CVPixelBufferLockBaseAddress(pixelBuffer, [])
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }
        guard let context = CGContext(
            data: CVPixelBufferGetBaseAddress(pixelBuffer),
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGBitmapInfo.byteOrder32Little.rawValue |
                CGImageAlphaInfo.premultipliedFirst.rawValue
        ) else { return nil }
        context.setFillColor(UIColor.black.cgColor)
        context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        context.interpolationQuality = .high
        context.translateBy(x: 0, y: CGFloat(height))
        context.scaleBy(x: 1, y: -1)
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
        return pixelBuffer
    }

    private func encoderError(_ message: String) -> NSError {
        NSError(domain: "com.xtramys.video", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
