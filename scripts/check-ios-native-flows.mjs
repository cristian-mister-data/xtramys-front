import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const playback = read('src/utils/videoPlayback.js');
assert.match(playback, /platform === 'ios'[\s\S]*?\.webm[\s\S]*?ensureMp4Blob/);

const videoView = read('src/shims/expo-video.js');
assert.match(videoView, /crossOrigin=\{isNative && platform === 'ios' \? undefined/);

const pdf = read('src/utils/pdfDownload.js');
assert.match(pdf, /platform === 'ios'[\s\S]*?Downloads\/\$\{fullFileName\}[\s\S]*?Directory\.Documents/);

const plist = read('ios/App/App/Info.plist');
assert.match(plist, /LSSupportsOpeningDocumentsInPlace[\s\S]*?<true\/>/);
assert.match(plist, /UIFileSharingEnabled[\s\S]*?<true\/>/);

const snapshot = read('src/features/rivalAnalysis/TacticalSnapshotModal.jsx');
assert.match(snapshot, /<Field onSave=\{handleFieldSave\} onCancel=\{handleFieldCancel\}/);
assert.doesNotMatch(snapshot, /global\.fieldCallbacks\s*=/);

const nativeFrame = read('src/pages/_RNWebPage.jsx');
assert.match(nativeFrame, /html\[data-native='true'\][\s\S]*?width: calc\(100% \+ 48px\)/);

const rivals = read('src/features/rivals/Rivals.jsx');
assert.match(rivals, /html\[data-platform='ios'\][\s\S]*?flex-basis: 32px/);

console.log('iOS native video, PDF and board boundaries OK');
