import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const field = read('../src/vendor/tacticalBoard/field.js');
const geometry = read('../src/vendor/tacticalBoard/field/geometry.js');
const uiComponents = read('../src/vendor/tacticalBoard/field/ui-components.js');
const videoRecorder = read('../src/vendor/tacticalBoard/videoRecorder.js');
const localVideoRegenerator = read('../src/utils/localVideoRegenerator.js');
const videoCanvasRenderer = read('../src/utils/videoCanvasRenderer.js');
const videoUtils = read('../src/utils/videoUtils.js');
const videoFrameBuilder = read('../src/utils/videoFrameBuilder.js');
const iconRenderers = read('../src/vendor/tacticalBoard/field/icon-renderers.js');
const lineRenderers = read('../src/vendor/tacticalBoard/field/line-renderers.js');
const shapeRenderers = read('../src/vendor/tacticalBoard/field/shape-renderers.js');
const controls = read('../src/vendor/tacticalBoard/field/controls.js');

const hitTest = geometry.slice(
  geometry.indexOf('export function findTopBoardCloneAtPoint'),
  geometry.indexOf('export function createBoardDragSnapshot'),
);
assert.match(hitTest, /let topClone = null/);
assert.doesNotMatch(hitTest, /\.sort\(/);

const dragSnapshots = geometry.slice(
  geometry.indexOf('export function buildBoardDragSnapshots'),
  geometry.indexOf('export function isBoardCloneOutsideForDelete'),
);
assert.match(dragSnapshots, /new Set\(selectedIds\)/);
assert.match(dragSnapshots, /selectedIndices\.push/);
assert.match(dragSnapshots, /clones\[index\]\?\.id/);

assert.match(field, /Clasificar una sola vez por frame/);
assert.match(field, /scheduleElementDragUpdate/);
assert.match(field, /resultIndexById/);
assert.match(field, /hasOnlyClonePositionChanges/);
assert.match(field, /boardPreviewCanvasRef/);
assert.match(field, /globalThis\.devicePixelRatio/);
assert.match(field, /imageSmoothingQuality/);
assert.match(field, /opacity: boardPreviewActive \? 1 : 0/);
assert.doesNotMatch(field, /desynchronized: true/);
assert.ok(
  field.indexOf('renderFrame(lastFrame);') < field.indexOf('setBoardPreviewActive(true);'),
  'The first preview frame must be painted before the canvas becomes visible',
);
assert.match(field, /floatingButtonsNode/);
assert.match(field, /handleGuardarGraficoRef/);
assert.match(field, /createFieldPalettes\([\s\S]*?\[formationSettings, t\]/);
assert.match(field, /curvePointsRef\.current\.push\(newPoint\)/);
assert.match(field, /curveDrawRafRef\.current = requestAnimationFrame/);
assert.doesNotMatch(field, /cloneIndexMap/);
assert.doesNotMatch(uiComponents, /createFieldPalettes|createFieldModals/);

assert.match(videoRecorder, /elementsRef\?\.current \|\| elements/);
assert.match(videoRecorder, /streamingEncoder\.addFrame/);
assert.match(videoRecorder, /pendingFrameRun\.durationFrames/);
assert.match(videoRecorder, /iterateSharedInterpolatedFrames/);
assert.doesNotMatch(videoRecorder, /enqueueStreamingFrame/);
assert.doesNotMatch(videoRecorder, /frames: allFrames|buildSharedInterpolatedFrames/);
assert.doesNotMatch(videoRecorder, /i % 4/);
assert.match(videoRecorder, /performance\.now\(\) - lastGenerationYieldAt < 50/);
assert.match(videoRecorder, /createVideoRenderCache/);
assert.match(videoRecorder, /!frame\._reusePreviousFrame/);
assert.doesNotMatch(videoRecorder, /ballMovementsBySegment|styles\.trajOpt/);
assert.match(
  videoRecorder,
  /export default React\.memo\(VideoRecorder, areVideoRecorderPropsEqual\)/,
);
assert.match(localVideoRegenerator, /iterateSharedInterpolatedFrames/);
const directRegeneration = localVideoRegenerator.slice(
  localVideoRegenerator.indexOf('async function renderFramesDirectly'),
  localVideoRegenerator.indexOf('async function renderFramesToDirectory'),
);
assert.match(directRegeneration, /createStreamingVideoEncoder/);
assert.match(directRegeneration, /encoder\.addFrame/);
assert.match(directRegeneration, /pendingFrameRun\.durationFrames/);
assert.doesNotMatch(directRegeneration, /toBlob|CAPTURE_FORMAT/);

const canvasCurveRenderer = videoCanvasRenderer.slice(
  videoCanvasRenderer.indexOf('function drawCurveLine'),
  videoCanvasRenderer.indexOf('function drawCircleShape'),
);
const canvasLineShapeRenderer = videoCanvasRenderer.slice(
  videoCanvasRenderer.indexOf('function strokePolyline'),
  videoCanvasRenderer.indexOf('function drawFreeText'),
);
assert.match(canvasCurveRenderer, /strokePolyline\(ctx, renderPoints/);
assert.doesNotMatch(canvasCurveRenderer, /quadraticCurveTo/);
assert.match(videoCanvasRenderer, /const headLen = Math\.max\(8, thickness \* 6\)/);
assert.match(
  videoCanvasRenderer,
  /return \(cw \/ sourceWidth \+ ch \/ sourceHeight\) \/ 2/,
);
assert.doesNotMatch(canvasLineShapeRenderer, /lineWidth = Math\.max\(1, thickness\)/);
assert.match(
  videoRecorder,
  /snapshot\.imageWidth = elem\.imageWidth \|\| fieldDisplayWidth \|\| fieldWidth/,
);
assert.match(videoRecorder, /norm\.imageWidth \|\|= refWidth/);
assert.doesNotMatch(videoCanvasRenderer, /playerSprites|createPlayerSprite/);
assert.match(videoCanvasRenderer, /paintPlayerAt\(ctx, pos\(elem, cw, ch\), elem, scale, options\)/);
assert.match(videoCanvasRenderer, /displayPoints: new WeakMap\(\)/);
assert.match(videoCanvasRenderer, /drawFrameBackground/);
assert.match(videoFrameBuilder, /_reusePreviousFrame: true/);
assert.match(videoUtils, /webCodecsConfigCache/);
assert.match(videoUtils, /window\.VideoEncoder && window\.VideoFrame/);
assert.match(videoUtils, /getMediaRecorderMp4Mime\(\)/);
assert.match(videoUtils, /let conversionCanvas = null/);
assert.match(videoUtils, /latencyMode: 'quality'/);
assert.match(videoUtils, /\(area \/ ref\) \* 24_000_000/);
assert.match(videoUtils, /duration: safeDurationFrames \* frameDurationUs/);
assert.match(videoUtils, /createMediaRecorderStreamingEncoder/);
const streamingEncoderFactory = videoUtils.slice(
  videoUtils.indexOf('export async function createStreamingVideoEncoder'),
  videoUtils.indexOf('async function generateVideoWithFFmpeg'),
);
assert.ok(
  streamingEncoderFactory.indexOf("typeof window === 'undefined' || !window.VideoEncoder") <
    streamingEncoderFactory.indexOf('getMediaRecorderMp4Mime()'),
  'WebCodecs must be preferred so render delays cannot alter frame timing',
);
assert.match(videoUtils, /videoBitsPerSecond: getRealtimeVideoBitrate/);
assert.match(videoUtils, /getVideoBitrate\(width, height\) \* 1\.5/);
assert.match(videoUtils, /track\.requestFrame\(\)/);
assert.match(iconRenderers, /pendingWebDragPositionRef/);
assert.match(iconRenderers, /translate3d\(\$\{dxDisplay\}px, \$\{dyDisplay\}px, 0\)/);
assert.match(lineRenderers, /moveLineWithoutRender/);
assert.match(lineRenderers, /if \(a === b\) return true/);
assert.match(lineRenderers, /const touchPoints = \[pts\[0\]\]/);
assert.doesNotMatch(lineRenderers, /const segments = \[\];[\s\S]*?key=\{`seg-\$\{i\}-\$\{j\}`\}/);
assert.match(shapeRenderers, /moveShapeWithoutRender/);
assert.match(shapeRenderers, /board-shape-\$\{id\}/);
assert.match(controls, /pendingWebDragPositionRef/);
assert.match(controls, /translate3d\(\$\{dxDisplay\}px, \$\{dyDisplay\}px, 0\)/);

for (const path of [
  '../src/vendor/tacticalBoard/field/controls.js',
  '../src/vendor/tacticalBoard/field/icon-renderers.js',
  '../src/vendor/tacticalBoard/field/line-renderers.js',
  '../src/vendor/tacticalBoard/field/shape-renderers.js',
]) {
  const source = read(path);
  assert.doesNotMatch(source, /(?:start|base)\.selectedIds\.includes/);
}

console.log('Tactical board performance checks passed.');
