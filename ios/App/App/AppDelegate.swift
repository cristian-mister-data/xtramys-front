import UIKit
import Capacitor
import AVFoundation
import AuthenticationServices

@objc(BridgeViewController)
class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeVideoEncoderPlugin())
        bridge?.registerPluginInstance(AppleSignInPlugin())
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

private final class NativeVideoEncodingSession {
    let queue = DispatchQueue(label: "com.xtramys.video.session", qos: .userInitiated)
    let outputURL: URL

    private let writer: AVAssetWriter
    private let input: AVAssetWriterInput
    private let adaptor: AVAssetWriterInputPixelBufferAdaptor
    private let width: Int
    private let height: Int
    private let fps: Int
    private var nextFrameIndex = 0
    private var closed = false

    init(width requestedWidth: Int, height requestedHeight: Int, fps: Int, bitrate: Int) throws {
        width = max(2, requestedWidth - requestedWidth % 2)
        height = max(2, requestedHeight - requestedHeight % 2)
        self.fps = max(1, fps)
        outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("xtramys_video_\(UUID().uuidString).mp4")
        writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)

        let settings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: width,
            AVVideoHeightKey: height,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: max(1, bitrate),
                AVVideoMaxKeyFrameIntervalKey: self.fps,
                AVVideoExpectedSourceFrameRateKey: self.fps
            ]
        ]
        input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
        input.expectsMediaDataInRealTime = false
        adaptor = AVAssetWriterInputPixelBufferAdaptor(
            assetWriterInput: input,
            sourcePixelBufferAttributes: [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
                kCVPixelBufferWidthKey as String: width,
                kCVPixelBufferHeightKey as String: height,
                kCVPixelBufferIOSurfacePropertiesKey as String: [:]
            ]
        )
        guard writer.canAdd(input) else { throw Self.error("Video writer input unavailable") }
        writer.add(input)
        guard writer.startWriting() else {
            throw writer.error ?? Self.error("Video writer could not start")
        }
        writer.startSession(atSourceTime: .zero)
    }

    func append(base64: String, index: Int, durationFrames: Int) throws {
        guard !closed else { throw Self.error("Video writer is closed") }
        try autoreleasepool {
            let payload = base64.split(separator: ",", maxSplits: 1).last.map(String.init) ?? base64
            guard let data = Data(base64Encoded: payload, options: .ignoreUnknownCharacters),
                  let image = UIImage(data: data),
                  let pixelBuffer = makePixelBuffer(image: image) else {
                throw Self.error("Invalid frame data")
            }

            nextFrameIndex = max(nextFrameIndex, index)
            for _ in 0..<max(1, durationFrames) {
                while !input.isReadyForMoreMediaData {
                    if writer.status == .failed || writer.status == .cancelled {
                        throw writer.error ?? Self.error("Video writer failed")
                    }
                    Thread.sleep(forTimeInterval: 0.002)
                }
                let time = CMTime(value: CMTimeValue(nextFrameIndex), timescale: CMTimeScale(fps))
                guard adaptor.append(pixelBuffer, withPresentationTime: time) else {
                    throw writer.error ?? Self.error("Could not append video frame")
                }
                nextFrameIndex += 1
            }
        }
    }

    func finish(_ completion: @escaping (Error?) -> Void) {
        guard !closed else {
            completion(Self.error("Video writer is closed"))
            return
        }
        closed = true
        input.markAsFinished()
        writer.finishWriting { [writer] in
            completion(writer.status == .completed
                ? nil
                : writer.error ?? Self.error("Video writer did not finish"))
        }
    }

    func cancel() {
        guard !closed else { return }
        closed = true
        input.markAsFinished()
        writer.cancelWriting()
        try? FileManager.default.removeItem(at: outputURL)
    }

    private func makePixelBuffer(image: UIImage) -> CVPixelBuffer? {
        guard let cgImage = image.cgImage else { return nil }
        var pixelBuffer: CVPixelBuffer?
        let status = adaptor.pixelBufferPool.map {
            CVPixelBufferPoolCreatePixelBuffer(nil, $0, &pixelBuffer)
        } ?? CVPixelBufferCreate(
            nil,
            width,
            height,
            kCVPixelFormatType_32BGRA,
            [kCVPixelBufferCGImageCompatibilityKey: true,
             kCVPixelBufferCGBitmapContextCompatibilityKey: true] as CFDictionary,
            &pixelBuffer
        )
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

    static func error(_ message: String) -> NSError {
        NSError(domain: "com.xtramys.video", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }
}

@objc(NativeVideoEncoderPlugin)
public class NativeVideoEncoderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeVideoEncoderPlugin"
    public let jsName = "NativeVideoEncoder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startEncoding", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "appendFrame", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishEncoding", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelEncoding", returnType: CAPPluginReturnPromise)
    ]

    private var sessions: [String: NativeVideoEncodingSession] = [:]
    private let sessionsLock = NSLock()

    @objc func startEncoding(_ call: CAPPluginCall) {
        let width = call.getInt("width") ?? 0
        let height = call.getInt("height") ?? 0
        guard width > 0, height > 0 else {
            call.reject("Invalid video dimensions")
            return
        }
        let fps = max(1, call.getInt("fps") ?? 30)
        let bitrate = max(1, call.getInt("bitrate") ?? 14_000_000)

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let session = try NativeVideoEncodingSession(
                    width: width,
                    height: height,
                    fps: fps,
                    bitrate: bitrate
                )
                let sessionId = UUID().uuidString
                self.sessionsLock.lock()
                self.sessions[sessionId] = session
                self.sessionsLock.unlock()
                call.resolve(["sessionId": sessionId])
            } catch {
                call.reject("Native video encode failed: \(error.localizedDescription)", nil, error)
            }
        }
    }

    @objc func appendFrame(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId"),
              let data = call.getString("data"),
              let session = session(sessionId) else {
            call.reject("Video encoding session not found")
            return
        }
        let index = max(0, call.getInt("index") ?? 0)
        let durationFrames = max(1, call.getInt("durationFrames") ?? 1)
        session.queue.async {
            do {
                try session.append(base64: data, index: index, durationFrames: durationFrames)
                call.resolve()
            } catch {
                self.removeSession(sessionId)?.cancel()
                call.reject("Native video encode failed: \(error.localizedDescription)", nil, error)
            }
        }
    }

    @objc func finishEncoding(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId"),
              let session = removeSession(sessionId) else {
            call.reject("Video encoding session not found")
            return
        }
        session.queue.async {
            session.finish { error in
                if let error {
                    try? FileManager.default.removeItem(at: session.outputURL)
                    call.reject("Native video encode failed: \(error.localizedDescription)", nil, error)
                    return
                }
                call.resolve([
                    "mimeType": "video/mp4",
                    "path": session.outputURL.absoluteString
                ])
            }
        }
    }

    @objc func cancelEncoding(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId"),
              let session = removeSession(sessionId) else {
            call.resolve()
            return
        }
        session.queue.async {
            session.cancel()
            call.resolve()
        }
    }

    private func session(_ id: String) -> NativeVideoEncodingSession? {
        sessionsLock.lock()
        defer { sessionsLock.unlock() }
        return sessions[id]
    }

    private func removeSession(_ id: String) -> NativeVideoEncodingSession? {
        sessionsLock.lock()
        defer { sessionsLock.unlock() }
        return sessions.removeValue(forKey: id)
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
