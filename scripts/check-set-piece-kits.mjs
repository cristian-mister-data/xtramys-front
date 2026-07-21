import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applySetPieceKitsToElements, applySetPiecePlayerOverlays, getSetPieceVideoSignature, syncSetPieceFromSource } from '../src/utils/kits.js';
import {
  buildInterpolatedFrames,
  getInterpolatedFrameCount,
  iterateInterpolatedFrames,
} from '../src/utils/videoFrameBuilder.js';
import {
  getPlayerKitRenderState,
  getPlayerRenderMetrics,
} from '../src/utils/playerRenderMetrics.js';
import { composeFieldId, decomposeFieldId } from '../src/vendor/tacticalBoard/fields/fieldConfigs.js';

const elements = [
  { id: 'icon1-clone-legacy', type: 'player', paletteIndex: 0, color: '#000000', showPhotos: true },
  { id: 'goalkeeper-2-clone-legacy', type: 'player', paletteIndex: 3, color: '#000000' },
];
const kitContext = {
  own: { pattern: 'halves', primaryColor: '#123456', secondaryColor: '#112233', numberColor: '#ffeedd' },
  ownGoalkeeper: { primaryColor: '#abcdef' },
  rival: { primaryColor: '#654321' },
  rivalGoalkeeper: { primaryColor: '#fedcba' },
};

const result = applySetPieceKitsToElements(elements, kitContext, false);
assert.equal(result[0].color, '#123456');
assert.equal(result[0].kitPattern, 'halves');
assert.equal(result[0].kitSecondaryColor, '#112233');
assert.equal(result[0].numberColor, '#ffeedd');
assert.equal(result[0].hasBib, false);
assert.equal(result[0].showPhotos, true);
assert.equal(result[1].color, '#fedcba');
assert.equal(result[1].kitRole, 'rivalGoalkeeper');
assert.equal(result[1].showPhotos, false);
const mixedPhotos = applySetPieceKitsToElements([
  { id: 'icon1-with-photo', type: 'player', showPhotos: true },
  { id: 'icon1-without-photo', type: 'player', showPhotos: false },
], kitContext, true);
assert.equal(mixedPhotos[0].showPhotos, true);
assert.equal(mixedPhotos[1].showPhotos, false);
const storedSetPiece = { strategyId: 'strategy-1', customFieldType: 'full:entire', videoId: 'old-video' };
const sourceSetPiece = { _id: 'strategy-1', tipoCampo: 'full:halfLeft', videos: ['current-video'] };
const syncedSetPiece = syncSetPieceFromSource(storedSetPiece, [sourceSetPiece]);
assert.equal(syncedSetPiece.customFieldType, 'full:halfLeft');
assert.equal(syncedSetPiece.videoId, 'current-video');
assert.equal(syncSetPieceFromSource(syncedSetPiece, [sourceSetPiece]), syncedSetPiece);
assert.deepEqual(decomposeFieldId(composeFieldId('full', 'halfLeft')), {
  lineType: 'full',
  viewMode: 'halfLeft',
});

const animatedFrame = [
  { id: 'icon1-clone-1', type: 'player', number: '8', xRatio: 0.4, yRatio: 0.5, color: '#000000' },
  { id: 'legacy-player', type: 'player', number: '9', xRatio: 0.8, yRatio: 0.5, color: '#000000' },
];
const overlaidFrame = applySetPiecePlayerOverlays(animatedFrame, [
  { slotId: 'icon1-clone-1', number: '10', color: '#123456', playerData: { nombre: 'Ana' } },
  { slotId: 'missing', number: '9', xRatio: 0.79, yRatio: 0.5, color: '#654321', playerData: { nombre: 'Eva' } },
]);
assert.equal(overlaidFrame[0].playerData.nombre, 'Ana');
assert.equal(overlaidFrame[0].color, '#123456');
assert.equal(overlaidFrame[0].xRatio, 0.4);
assert.equal(overlaidFrame[1].playerData.nombre, 'Eva');
assert.equal(overlaidFrame[1].color, '#654321');
const selectivePhotos = applySetPiecePlayerOverlays([
  { id: 'with-photo', type: 'player', photoUrl: 'old.webp', showPhotos: true },
  { id: 'without-photo', type: 'player', photoUrl: 'old.webp', showPhotos: true },
], [
  { slotId: 'with-photo', photoUrl: 'new.webp', showPhotos: true },
  { slotId: 'without-photo', photoUrl: '', showPhotos: false },
]);
assert.equal(selectivePhotos[0].photoUrl, 'new.webp');
assert.equal(selectivePhotos[0].showPhotos, true);
assert.equal(selectivePhotos[1].photoUrl, '');
assert.equal(selectivePhotos[1].showPhotos, false);

const signatureOverlay = {
  slotId: 'player-1',
  number: '10',
  xRatio: 0.4,
  color: '#123456',
  photoUrl: 'https://cdn.example/player.webp?token=one',
  playerData: { _id: 'player-id', nombre: 'Ana', foto: 'player.webp', ignored: true },
};
assert.equal(
  getSetPieceVideoSignature([signatureOverlay]),
  getSetPieceVideoSignature([{ ...signatureOverlay, xRatio: '0.4', photoUrl: 'https://cdn.example/player.webp?token=two', extra: true }]),
);
assert.notEqual(
  getSetPieceVideoSignature([signatureOverlay]),
  getSetPieceVideoSignature([{ ...signatureOverlay, color: '#654321' }]),
);

const playerMetrics = getPlayerRenderMetrics({ shape: 'jersey' }, 0.5);
assert.equal(playerMetrics.size, 12);
assert.equal(playerMetrics.radius, 6);
assert.equal(playerMetrics.nameFontSize, 4.32);

assert.deepEqual(
  getPlayerKitRenderState({
    shape: 'jersey',
    hasStripes: true,
    stripeColor: '#112233',
    kitSecondaryColor: '#445566',
  }),
  {
    isJersey: true,
    kitPattern: 'vertical',
    kitSecondaryColor: '#445566',
    drawPattern: true,
    drawPlayerPattern: true,
    drawVerticalStripes: true,
    verticalStripeColor: '#112233',
  },
);
assert.equal(
  getPlayerKitRenderState({
    isGoalkeeper: true,
    differentiateGoalkeeper: false,
  }).drawVerticalStripes,
  false,
);

const originalRival = [{ id: 'icon2-clone-legacy', type: 'player', color: '#aa0000' }];
assert.equal(
  applySetPieceKitsToElements(originalRival, { own: kitContext.own }, false)[0].color,
  '#aa0000',
);

const iconRenderer = readFileSync(new URL('../src/vendor/tacticalBoard/field/icon-renderers.js', import.meta.url), 'utf8');
assert.match(iconRenderer, /export function renderPlayerNameLabel/);
assert.match(iconRenderer, /bottom:\s*-22/);
assert.match(iconRenderer, /fontSize:\s*isMobile \? 8 : 10/);
for (const property of ['hasStripes', 'stripeColor', 'kitPattern', 'kitSecondaryColor']) {
  assert.match(iconRenderer, new RegExp(`icon\\.${property} !== nextIcon\\.${property}`));
}
assert.match(iconRenderer, /kitPattern !== 'solid'/);

const fieldSource = readFileSync(new URL('../src/vendor/tacticalBoard/field.js', import.meta.url), 'utf8');
assert.match(fieldSource, /kitPattern:\s*paletteIcon\.kitPattern/);
assert.match(fieldSource, /kitSecondaryColor:\s*paletteIcon\.kitSecondaryColor/);
assert.match(fieldSource, /kitPattern:\s*currentPaletteIcon\.kitPattern/);
assert.match(fieldSource, /kitSecondaryColor:\s*currentPaletteIcon\.kitSecondaryColor/);

const apiSource = readFileSync(new URL('../src/utils/api.js', import.meta.url), 'utf8');
assert.match(apiSource, /let _activeVideoPollController = null;/);

const playbackSource = readFileSync(new URL('../src/utils/videoPlayback.js', import.meta.url), 'utf8');
assert.match(playbackSource, /getSetPieceVideoCandidates/);
assert.match(playbackSource, /getSetPieceVideoId\(source\)/);
assert.match(playbackSource, /resolveMatchSheetSetPieceVideo/);
assert.doesNotMatch(playbackSource, /regenerateVideoWithField/);

const localRegeneratorSource = readFileSync(new URL('../src/utils/localVideoRegenerator.js', import.meta.url), 'utf8');
assert.match(localRegeneratorSource, /renderVideoFieldImage/);
assert.match(localRegeneratorSource, /moveDuration:\s*0\.9/);
assert.match(localRegeneratorSource, /holdDuration:\s*0\.1/);
assert.match(localRegeneratorSource, /if \(!playerOverlays\.length\)/);
assert.match(localRegeneratorSource, /Promise\.allSettled/);
assert.match(localRegeneratorSource, /El video local esta listo/);

const playerPhotoSource = readFileSync(new URL('../src/utils/videoPlayerPhotos.js', import.meta.url), 'utf8');
assert.match(playerPhotoSource, /\/media\/image-download/);
assert.match(playerPhotoSource, /playerPhotos\[source\] = image/);

const matchSheetSource = readFileSync(new URL('../src/vendor/season/EditMatchSheetModal.js', import.meta.url), 'utf8');
assert.match(matchSheetSource, /matchVideoCopy: false/);
assert.match(matchSheetSource, /resolveMatchSheetSetPieceVideo/);
assert.match(matchSheetSource, /boardOpeningRef\.current = true/);
assert.match(matchSheetSource, /finally\s*\{\s*if \(requestId === boardOpenRequestRef\.current\) \{\s*boardOpeningRef\.current = false/);
assert.match(matchSheetSource, /boardModalGuardUntilRef\.current = Date\.now\(\) \+ 2000/);
assert.match(matchSheetSource, /onRequestClose=\{handleMatchSheetRequestClose\}/);
assert.match(matchSheetSource, /loadingSetPieceVideoIndex === setPieceIndex/);
assert.match(matchSheetSource, /setPiecePreviewLoadingOverlay/);
assert.match(matchSheetSource, /customFieldType: boardSnapshot\?\.fieldType/);
assert.match(matchSheetSource, /showPhotos: assignment\.showPhotos,/);
assert.match(matchSheetSource, /const playerData = matchOverlay \? matchOverlay\.playerData : element\.playerData/);
assert.match(matchSheetSource, /playerOverlays,[\s\S]{0,80}preview: true/);
assert.doesNotMatch(matchSheetSource, /if \(!availableVideo && getSetPieceVideoId\(setPiece\)\)/);
assert.doesNotMatch(matchSheetSource, /Error loading set pieces for match sheet:[\s\S]{0,100}setAvailableSetPieces\(\[\]\)/);
assert.match(matchSheetSource, /if \(!error\?\.status \|\| error\.status >= 500\) break;/);

const recorderSource = readFileSync(new URL('../src/vendor/tacticalBoard/videoRecorder.js', import.meta.url), 'utf8');
assert.match(recorderSource, /const boardSnapshot = \{ fieldType, elements: getCurrentElements\(\) \}/);

const videoShimSource = readFileSync(new URL('../src/shims/expo-video.js', import.meta.url), 'utf8');
assert.match(videoShimSource, /sourceToUrl\(player\?\._source\) !== sourceToUrl\(mountedSource\)/);

const matchSheetDetailSource = readFileSync(new URL('../src/vendor/season/MatchSheetDetailModal.js', import.meta.url), 'utf8');
assert.match(matchSheetDetailSource, /resolveMatchSheetSetPieceVideo/);
assert.match(matchSheetDetailSource, /const playerData = matchOverlay \? matchOverlay\.playerData : element\.playerData/);
assert.match(matchSheetDetailSource, /playerOverlays,[\s\S]{0,80}preview: true/);

const loadingSpinnerSource = readFileSync(new URL('../src/vendor/shared/LoadingSpinner.js', import.meta.url), 'utf8');
assert.match(loadingSpinnerSource, /animateTransform/);
assert.match(loadingSpinnerSource, /repeatCount:\s*'indefinite'/);
assert.doesNotMatch(loadingSpinnerSource, /@keyframes/);

const sharedFrames = buildInterpolatedFrames([
  {
    elements: [
      { id: 'player', type: 'player', xRatio: 0.1, yRatio: 0.2 },
      { id: 'run', type: 'straight-arrow', xRatio: 0.1, yRatio: 0.2 },
    ],
    connectors: [],
  },
  {
    elements: [{ id: 'player', type: 'player', xRatio: 0.8, yRatio: 0.7 }],
    connectors: [],
  },
], 30, 0.9, 0.1, 1, 0.5);
assert.equal(sharedFrames.length, 72);
assert.equal(sharedFrames[0].elements.find((element) => element.id === 'run')._drawProgress, 0);
assert.equal(sharedFrames[26].elements.find((element) => element.id === 'run')._drawProgress, 1);
assert.equal(sharedFrames[53].elements.some((element) => element.id === 'run'), false);

const fourKeyframes = Array.from({ length: 4 }, (_, index) => ({
  elements: [{ id: 'player', type: 'player', xRatio: index / 4, yRatio: 0.5 }],
  connectors: [],
}));
const interpolationArgs = [fourKeyframes, 30, 0.9, 0.1, 1, 0.5];
assert.equal(getInterpolatedFrameCount(...interpolationArgs), 132);
assert.equal(Array.from(iterateInterpolatedFrames(...interpolationArgs)).length, 132);
assert.equal(buildInterpolatedFrames(...interpolationArgs).length, 132);

const previewSource = readFileSync(new URL('../src/vendor/matchSheet/SetPiecePreview.js', import.meta.url), 'utf8');
assert.match(previewSource, /renderPlayerNameLabel\(element, true\)/);
assert.match(previewSource, /assignment\?\.playerName/);
assert.match(previewSource, /const liveBoard = elements\.length > 0;/);
assert.match(previewSource, /decomposeFieldId\(setPiece\?\.customFieldType \|\| setPiece\?\.tipoCampo \|\| 'full'\)/);
assert.doesNotMatch(previewSource, /halfLeft|halfRight|autoFramed/);
assert.match(previewSource, /getPlayerRenderMetrics\(element, scale\)/);
assert.match(previewSource, /assignment\?\.playerName \|\| element\.playerData/);
assert.doesNotMatch(previewSource, /if \(!assignment \|\|/);
assert.doesNotMatch(previewSource, /isOwnSetPiecePlayer/);
assert.doesNotMatch(previewSource, /\|\| assignments\[index\]/);

const publicShareSource = readFileSync(new URL('../src/pages/public/SetPieceShare.jsx', import.meta.url), 'utf8');
assert.match(publicShareSource, /<SetPiecePreview/);
assert.match(publicShareSource, /kitContext=\{getKitContext\(setPiece\)\}/);

console.log('set-piece kit check ok');
