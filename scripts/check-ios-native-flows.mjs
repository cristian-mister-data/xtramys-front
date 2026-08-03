import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const playback = read('src/utils/videoPlayback.js');
assert.match(playback, /platform === 'ios'[\s\S]*?https\?:[\s\S]*?ensureMp4Blob/);

const videoView = read('src/shims/expo-video.js');
assert.match(videoView, /crossOrigin=\{isNative && platform === 'ios' \? undefined/);

const videoFieldImage = read('src/utils/videoFieldImage.js');
assert.match(videoFieldImage, /flushSync\(\(\) =>/);
assert.match(videoFieldImage, /data:image\/svg\+xml;charset=utf-8/);
assert.ok(
  videoFieldImage.indexOf('data:image/svg+xml;charset=utf-8') <
    videoFieldImage.indexOf('URL.createObjectURL'),
  'iOS-safe SVG data URLs must be attempted before blob URLs',
);
const videoRecorder = read('src/vendor/tacticalBoard/videoRecorder.js');
const videoRegenerator = read('src/utils/localVideoRegenerator.js');
assert.match(videoRecorder, /renderVideoFieldImage\(fieldType, canvasW, canvasH\)/);
assert.match(
  videoRegenerator,
  /renderVideoFieldImage\(video\.fieldType, canvas\.width, canvas\.height\)/,
);

const videoUtils = read('src/utils/videoUtils.js');
assert.match(videoUtils, /getPlatform\?\.\(\) === 'ios'[\s\S]*?encoder nativo de iOS/);
assert.match(
  videoUtils,
  /isNativeAndroid\(\) \|\| isNativeIOS\(\)[\s\S]*?generateVideoWithNativeEncoder/,
);

const appDelegate = read('ios/App/App/AppDelegate.swift');
assert.match(appDelegate, /registerPluginInstance\(NativeVideoEncoderPlugin\(\)\)/);
assert.match(appDelegate, /registerPluginInstance\(AppleSignInPlugin\(\)\)/);
assert.match(appDelegate, /import EventKit/);
assert.match(appDelegate, /registerPluginInstance\(AppleCalendarPlugin\(\)\)/);
assert.match(appDelegate, /requestFullAccessToEvents/);
assert.match(appDelegate, /request\.requestedScopes = \[\.fullName, \.email\]/);
assert.match(appDelegate, /request\.nonce = nonce/);
assert.match(appDelegate, /AVAssetWriter\(outputURL: outputURL, fileType: \.mp4\)/);
assert.match(appDelegate, /CMTime\(value: CMTimeValue\(index\), timescale: CMTimeScale\(fps\)\)/);

const entitlements = read('ios/App/App/App.entitlements');
assert.match(entitlements, /com\.apple\.developer\.applesignin[\s\S]*?<string>Default<\/string>/);

const login = read('src/pages/auth/Login.jsx');
assert.match(login, /platform === 'ios'[\s\S]*?handleAppleLogin[\s\S]*?social\.apple/);
assert.match(login, /\(platform === 'ios' \|\| !isNative\)/);

const appleSignIn = read('src/platform/appleSignIn.js');
assert.match(appleSignIn, /AppleID\.auth\.init/);
assert.match(appleSignIn, /usePopup: true/);
assert.match(appleSignIn, /identityToken: authorization\.id_token/);
assert.match(appleSignIn, /authorization\.state !== state/);
assert.match(
  read('index.html'),
  /appleid\.cdn-apple\.com\/appleauth\/static\/jsapi\/appleid\/1\/en_US\/appleid\.auth\.js/,
);

const storyboard = read('ios/App/App/Base.lproj/Main.storyboard');
assert.match(storyboard, /customClass="BridgeViewController" customModule="App"/);

const pdf = read('src/utils/pdfDownload.js');
assert.match(pdf, /platform === 'ios'[\s\S]*?Directory\.Cache[\s\S]*?Share\.share/);
assert.match(pdf, /platform === 'ios'[\s\S]*?@capacitor\/share[\s\S]*?Share\.share/);

const pdfDialog = read('src/ui/PdfActionDialog.jsx');
assert.match(
  pdfDialog,
  /platform === 'android'[\s\S]*?registerPlugin\('VideoSaver'\)[\s\S]*?saveToDownloads/,
);
assert.match(pdfDialog, /action === 'share'[\s\S]*?Share\.share/);

const plist = read('ios/App/App/Info.plist');
assert.match(plist, /NSCalendarsFullAccessUsageDescription/);
assert.match(plist, /LSSupportsOpeningDocumentsInPlace[\s\S]*?<true\/>/);
assert.match(plist, /UIFileSharingEnabled[\s\S]*?<true\/>/);

const iosWorkflow = read('.github/workflows/ios.yml');
assert.match(iosWorkflow, /pull_request:/);
assert.match(iosWorkflow, /generic\/platform=iOS Simulator[\s\S]*?CODE_SIGNING_ALLOWED=NO/);

const snapshot = read('src/features/rivalAnalysis/TacticalSnapshotModal.jsx');
assert.match(snapshot, /<Field onSave=\{handleFieldSave\} onCancel=\{handleFieldCancel\}/);
assert.doesNotMatch(snapshot, /global\.fieldCallbacks\s*=/);

const field = read('src/vendor/tacticalBoard/field.js');
assert.match(field, /if \(!isNative\) return undefined;[\s\S]*?ScreenOrientation\.lock/);

const nativeFrame = read('src/pages/_RNWebPage.jsx');
assert.match(nativeFrame, /html\[data-native='true'\][\s\S]*?width: calc\(100% \+ 48px\)/);

const rivals = read('src/features/rivals/Rivals.jsx');
assert.match(rivals, /html\[data-platform='ios'\][\s\S]*?flex-basis: 32px/);

console.log('iOS native calendar, video, encoder timing, PDF and board boundaries OK');
