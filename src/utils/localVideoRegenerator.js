import RNFS from '@/shims/react-native-fs';
import { getVideoForEdit, proxyUploadToR2, updateVideo } from '@/utils/api';
import { initRecordingSession, generateVideo as encodeVideo } from '@/utils/videoUtils';
import { renderFrameToCanvas, getVideoDimensions } from '@/utils/videoCanvasRenderer';
import { decomposeFieldId, getAspectForView } from '@/vendor/tacticalBoard/fields/fieldConfigs';
import { getFieldById } from '@/utils/fieldTypes';

const CAPTURE_FORMAT = 'jpeg';
const CAPTURE_EXTENSION = 'jpg';
const CAPTURE_QUALITY = 0.9;

const FIELD_IMAGE_BY_LINE_TYPE = {
  full: 'full',
  zones1: 'zonas1',
  zones2: 'zonas2',
  zones3: 'zonas3',
  zones4: 'zonas4',
  empty: 'empty',
};

const localRegenerationById = new Map();

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a, b, t) {
  if (a === undefined || b === undefined) return b ?? a;
  return a + (b - a) * t;
}

function lerpNumericProp(out, from, to, prop, t) {
  if (typeof from[prop] === 'number' && typeof to[prop] === 'number') {
    out[prop] = lerp(from[prop], to[prop], t);
  }
}

function lerpPointArray(fromPoints, toPoints, t) {
  if (!Array.isArray(fromPoints) || !Array.isArray(toPoints)) return undefined;
  const minLen = Math.min(fromPoints.length, toPoints.length);
  const out = [];
  for (let i = 0; i < minLen; i++) {
    out.push({
      x: lerp(fromPoints[i].x, toPoints[i].x, t),
      y: lerp(fromPoints[i].y, toPoints[i].y, t),
    });
  }
  const longer = fromPoints.length >= toPoints.length ? fromPoints : toPoints;
  for (let i = minLen; i < longer.length; i++) out.push({ ...longer[i] });
  return out;
}

function interpolateElement(from, to, t) {
  const out = { ...to };
  [
    'xRatio',
    'yRatio',
    'x',
    'y',
    'x1',
    'y1',
    'x2',
    'y2',
    'width',
    'height',
    'radius',
    'size',
    'baseSize',
    'fontSize',
    'baseFontSize',
    'textX',
    'textY',
    'textMaxWidth',
    'thickness',
    'baseThickness',
    'rotation',
  ].forEach((prop) => lerpNumericProp(out, from, to, prop, t));

  const pointsRatio = lerpPointArray(from.pointsRatio, to.pointsRatio, t);
  if (pointsRatio) out.pointsRatio = pointsRatio;
  const points = lerpPointArray(from.points, to.points, t);
  if (points) out.points = points;
  return out;
}

function getBallTrajectoryForSegment(keyframe, ballId) {
  return keyframe?.ballTrajectoryById?.[ballId] || keyframe?.ballTrajectoryType || 'ground';
}

function applyBallAirEffect(ballElement, fromBall, toBall, linearProgress) {
  if (!ballElement || !fromBall || !toBall) return null;
  const dx = (toBall.x || 0) - (fromBall.x || 0);
  const dy = (toBall.y || 0) - (fromBall.y || 0);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const ballSize = ballElement.size || 18;
  const arcHeight = Math.max(ballSize * 0.9, Math.min(distance * 0.32, ballSize * 3.2));
  const heightProgress = 4 * linearProgress * (1 - linearProgress);
  const airborne = heightProgress > 0.025 && linearProgress > 0.015 && linearProgress < 0.985;
  const ballScale = 1 + heightProgress * 0.08;
  if (!airborne) return { ballYOffset: 0, ballScale, shadow: null };
  return {
    ballYOffset: -arcHeight * heightProgress,
    ballScale,
    shadow: {
      id: `${ballElement.id}__shadow`,
      type: 'ball-shadow',
      x: ballElement.x,
      y: ballElement.y,
      xRatio: ballElement.xRatio,
      yRatio: ballElement.yRatio,
      size: ballSize,
      baseSize: ballSize,
      opacity: Math.min(0.48, 0.08 + heightProgress * 0.38),
      shadowScale: Math.max(0.48, 1.06 - heightProgress * 0.52),
      zIndex: (ballElement.zIndex || 200) - 1,
    },
  };
}

function buildInterpolatedFrames(keyframes, fps, moveDuration, holdDuration, speedMultiplier, extraDurationEnd) {
  if (!keyframes || keyframes.length < 2) return [];

  const framesPerTransition = Math.max(2, Math.round((fps * moveDuration) / speedMultiplier));
  const holdFrames = Math.max(1, Math.round((fps * holdDuration) / speedMultiplier));
  const extraFrames = Math.round(fps * extraDurationEnd);
  const frames = [];
  const ballRotations = new Map();
  const firstKf = keyframes[0];

  (firstKf.elements || []).forEach((element) => {
    if (element.type === 'ball') ballRotations.set(element.id, element.rotation || 0);
  });

  for (let h = 0; h < holdFrames; h++) {
    frames.push({
      elements: (firstKf.elements || []).map((element) =>
        element.type === 'ball' ? { ...element, rotation: ballRotations.get(element.id) || 0 } : element,
      ),
      connectors: firstKf.connectors || [],
    });
  }

  for (let ki = 0; ki < keyframes.length - 1; ki++) {
    const kf = keyframes[ki];
    const nextKf = keyframes[ki + 1];
    const fromMap = new Map((kf.elements || []).map((element) => [element.id, element]));
    const toMap = new Map((nextKf.elements || []).map((element) => [element.id, element]));
    const allIds = new Set([...fromMap.keys(), ...toMap.keys()]);
    const segmentBallDeltas = new Map();

    for (const id of allIds) {
      const from = fromMap.get(id);
      const to = toMap.get(id);
      if (from?.type !== 'ball' || to?.type !== 'ball') continue;
      const dx = from.x !== undefined && to.x !== undefined ? to.x - from.x : ((to.xRatio || 0) - (from.xRatio || 0)) * 1000;
      const dy = from.y !== undefined && to.y !== undefined ? to.y - from.y : ((to.yRatio || 0) - (from.yRatio || 0)) * 1000;
      const sign = Math.abs(dx) > 0.01 ? (dx > 0 ? 1 : -1) : dy > 0 ? 1 : -1;
      segmentBallDeltas.set(id, Math.sqrt(dx * dx + dy * dy) * sign);
    }

    for (let f = 1; f <= framesPerTransition; f++) {
      const linearProgress = f / framesPerTransition;
      const easedProgress = easeInOutCubic(linearProgress);
      const interpolated = [];
      const airShadows = [];

      for (const id of allIds) {
        const from = fromMap.get(id);
        const to = toMap.get(id);
        const isAirBall = from?.type === 'ball' && to?.type === 'ball' && getBallTrajectoryForSegment(kf, id) === 'air';
        let element = from && to ? interpolateElement(from, to, isAirBall ? linearProgress : easedProgress) : { ...(to || from) };

        if (from?.type === 'ball' && to?.type === 'ball') {
          const startRot = ballRotations.get(id) || 0;
          const deltaRot = segmentBallDeltas.get(id) || 0;
          element.rotation = startRot + deltaRot * (isAirBall ? linearProgress : easedProgress);
        }

        if (isAirBall) {
          const effect = applyBallAirEffect(element, from, to, linearProgress);
          if (effect) {
            const ground = { x: element.x, y: element.y, xRatio: element.xRatio, yRatio: element.yRatio };
            const refH = typeof ground.y === 'number' && typeof ground.yRatio === 'number' && ground.yRatio !== 0 ? ground.y / ground.yRatio : null;
            element = {
              ...element,
              y: (ground.y || 0) + effect.ballYOffset,
              yRatio: refH ? ((ground.y || 0) + effect.ballYOffset) / refH : ground.yRatio,
              size: (element.size || 18) * effect.ballScale,
              baseSize: (element.baseSize || element.size || 18) * effect.ballScale,
              zIndex: (element.zIndex || 200) + 50,
              isAirborne: true,
            };
            if (effect.shadow) airShadows.push({ ...effect.shadow, ...ground });
          }
        }

        interpolated.push(element);
      }

      frames.push({
        elements: [...airShadows, ...interpolated],
        connectors: easedProgress < 0.5 ? kf.connectors || [] : nextKf.connectors || kf.connectors || [],
      });
    }

    for (const [id, deltaRot] of segmentBallDeltas.entries()) {
      ballRotations.set(id, (ballRotations.get(id) || 0) + deltaRot);
    }

    for (let h = 0; h < holdFrames; h++) {
      frames.push({
        elements: (nextKf.elements || []).map((element) =>
          element.type === 'ball' ? { ...element, rotation: ballRotations.get(element.id) || 0 } : element,
        ),
        connectors: nextKf.connectors || [],
      });
    }
  }

  const lastKf = keyframes[keyframes.length - 1];
  for (let e = 0; e < extraFrames; e++) {
    frames.push({
      elements: (lastKf.elements || []).map((element) =>
        element.type === 'ball' ? { ...element, rotation: ballRotations.get(element.id) || 0 } : element,
      ),
      connectors: lastKf.connectors || [],
    });
  }

  return frames;
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src || typeof Image === 'undefined') return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function getFieldImageSource(fieldType) {
  const { lineType } = decomposeFieldId(fieldType || 'full');
  return getFieldById(FIELD_IMAGE_BY_LINE_TYPE[lineType] || lineType).src;
}

function getRenderConfig(video) {
  const config = video.config || {};
  const { viewMode } = decomposeFieldId(video.fieldType || 'full');
  const aspect = 1 / getAspectForView(viewMode);
  return {
    fps: config.fps || 30,
    moveDuration: config.transitionDuration || 0.8,
    holdDuration: config.holdDuration || 0.5,
    speedMultiplier: config.speedMultiplier || 1,
    extraDurationEnd: config.extraDurationEnd ?? 1,
    playersWithNumber: config.playersWithNumber !== undefined ? config.playersWithNumber : true,
    showPhotos: config.showPhotos || false,
    viewMode,
    dimensions: getVideoDimensions(aspect),
  };
}

async function renderFramesToDirectory(video, frames, renderConfig) {
  const framesDir = await initRecordingSession();
  const canvas = document.createElement('canvas');
  canvas.width = renderConfig.dimensions.width;
  canvas.height = renderConfig.dimensions.height;
  const ctx = canvas.getContext('2d');
  const fieldImage = await loadImage(getFieldImageSource(video.fieldType));

  for (let index = 0; index < frames.length; index++) {
    if (index % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    const frame = frames[index];
    renderFrameToCanvas(ctx, canvas.width, canvas.height, frame.elements, frame.connectors, fieldImage, {
      playersWithNumber: renderConfig.playersWithNumber,
      showPhotos: renderConfig.showPhotos,
      viewMode: renderConfig.viewMode,
    });
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((nextBlob) => (nextBlob ? resolve(nextBlob) : reject(new Error('Canvas toBlob failed'))), `image/${CAPTURE_FORMAT}`, CAPTURE_QUALITY);
    });
    await RNFS.moveFile(blob, `${framesDir}/frame${String(index).padStart(4, '0')}.${CAPTURE_EXTENSION}`);
  }

  return framesDir;
}

async function regenerateStoredVideo(videoId) {
  const response = await getVideoForEdit(videoId);
  const video = response?.video;
  if (!response?.success || !video?.keyframes?.length) {
    throw new Error('No se pudieron cargar los keyframes del video');
  }

  const renderConfig = getRenderConfig(video);
  const frames = buildInterpolatedFrames(
    video.keyframes,
    renderConfig.fps,
    renderConfig.moveDuration,
    renderConfig.holdDuration,
    renderConfig.speedMultiplier,
    renderConfig.extraDurationEnd,
  );
  if (!frames.length) throw new Error('No hay frames suficientes para regenerar el video');

  const framesDir = await renderFramesToDirectory(video, frames, renderConfig);
  try {
    const { outputPath } = await encodeVideo(framesDir, frames.length, renderConfig.speedMultiplier);
    const upload = await proxyUploadToR2(outputPath);
    if (upload?.r2Key) await updateVideo(videoId, { r2Key: upload.r2Key });
    return outputPath;
  } finally {
    RNFS.unlink(framesDir).catch(() => {});
  }
}

export function regenerateVideoInBrowser(videoId) {
  if (!videoId) throw new Error('No hay video para regenerar');
  if (!localRegenerationById.has(videoId)) {
    localRegenerationById.set(
      videoId,
      regenerateStoredVideo(videoId).finally(() => localRegenerationById.delete(videoId)),
    );
  }
  return localRegenerationById.get(videoId);
}
