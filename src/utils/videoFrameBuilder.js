const PLAYER_VISUAL_FIELDS = [
  'color',
  'numberColor',
  'backgroundColor',
  'isNeutral',
  'shape',
  'hasStripes',
  'stripeColor',
  'kitPattern',
  'kitSecondaryColor',
  'hasBib',
  'bibColor',
  'isGoalkeeper',
  'differentiateGoalkeeper',
  'goalkeeperStripeColor',
  'showPhotos',
  'playersWithNumber',
  'photoUrl',
  'preserveVisualStyle',
];

const DRAW_REVEAL_TYPES = new Set([
  'straight-line',
  'straight-arrow',
  'curve-line',
  'curve-arrow',
  'circle',
]);

export function hydrateKeyframePlayerStyles(keyframes, currentElements = []) {
  const stylesById = new Map(
    currentElements
      .filter((element) => element?.type === 'player' && element.id)
      .map((element) => [element.id, element]),
  );

  return (keyframes || []).map((keyframe) => ({
    ...keyframe,
    elements: (keyframe.elements || []).map((element) => {
      if (element?.type !== 'player') return element;
      const current = stylesById.get(element.id);
      const next = { ...element };
      if (current) {
        PLAYER_VISUAL_FIELDS.forEach((key) => {
          if (next[key] === undefined && current[key] !== undefined) next[key] = current[key];
        });
      }
      if (next.number === 'N' || next.id === 'neutral-player' || next.idBase === 'neutral-player') {
        next.isNeutral = true;
      }
      return next;
    }),
  }));
}

const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const lerp = (a, b, t) => {
  if (a === undefined || b === undefined) return b ?? a;
  return a + (b - a) * t;
};

const INTERPOLATED_NUMBER_PROPS = [
  'xRatio', 'yRatio', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height',
  'radius', 'size', 'baseSize', 'fontSize', 'baseFontSize', 'textX', 'textY',
  'textMaxWidth', 'thickness', 'baseThickness', 'rotation',
];

const INTERPOLATED_POINT_PROPS = ['pointsRatio', 'points'];

function pointsDiffer(fromPoints, toPoints) {
  if (!Array.isArray(fromPoints) || !Array.isArray(toPoints)) {
    return Array.isArray(fromPoints) !== Array.isArray(toPoints);
  }
  if (fromPoints.length !== toPoints.length) return true;
  for (let index = 0; index < fromPoints.length; index++) {
    if (fromPoints[index].x !== toPoints[index].x || fromPoints[index].y !== toPoints[index].y) {
      return true;
    }
  }
  return false;
}

function hasInterpolatedChange(from, to) {
  for (const prop of INTERPOLATED_NUMBER_PROPS) {
    if (from[prop] !== to[prop]) return true;
  }
  for (const prop of INTERPOLATED_POINT_PROPS) {
    if (pointsDiffer(from[prop], to[prop])) return true;
  }
  return false;
}

function interpolateElement(from, to, t) {
  const out = { ...to };
  INTERPOLATED_NUMBER_PROPS.forEach((prop) => {
    if (typeof from[prop] === 'number' && typeof to[prop] === 'number') {
      out[prop] = lerp(from[prop], to[prop], t);
    }
  });

  for (const prop of INTERPOLATED_POINT_PROPS) {
    const fromPoints = from[prop];
    const toPoints = to[prop];
    if (!Array.isArray(fromPoints) || !Array.isArray(toPoints)) continue;
    const length = Math.min(fromPoints.length, toPoints.length);
    const points = Array.from({ length }, (_, index) => ({
      x: lerp(fromPoints[index].x, toPoints[index].x, t),
      y: lerp(fromPoints[index].y, toPoints[index].y, t),
    }));
    const longer = fromPoints.length >= toPoints.length ? fromPoints : toPoints;
    for (let index = length; index < longer.length; index++) points.push({ ...longer[index] });
    out[prop] = points;
  }
  return out;
}

const getBallTrajectory = (keyframe, ballId) =>
  keyframe?.ballTrajectoryById?.[ballId] || keyframe?.ballTrajectoryType || 'ground';

const sortElementsByZIndex = (elements) =>
  [...(elements || [])].sort((left, right) => (left.zIndex || 0) - (right.zIndex || 0));

function applyBallAirEffect(ball, from, to, progress, ballSize) {
  const dx = (to.x || 0) - (from.x || 0);
  const dy = (to.y || 0) - (from.y || 0);
  const distance = Math.hypot(dx, dy);
  const size = ball.size || ballSize;
  const heightProgress = 4 * progress * (1 - progress);
  const scale = 1 + heightProgress * 0.08;
  const airborne = heightProgress > 0.025 && progress > 0.015 && progress < 0.985;
  if (!airborne) return { yOffset: 0, scale, shadow: null };
  return {
    yOffset: -Math.max(size * 0.9, Math.min(distance * 0.32, size * 3.2)) * heightProgress,
    scale,
    shadow: {
      id: `${ball.id}__shadow`,
      type: 'ball-shadow',
      size,
      opacity: Math.min(0.48, 0.08 + heightProgress * 0.38),
      shadowScale: Math.max(0.48, 1.06 - heightProgress * 0.52),
      zIndex: (ball.zIndex || 200) - 1,
    },
  };
}

export function getInterpolatedFrameCount(
  keyframes,
  fps,
  moveDuration,
  holdDuration,
  speedMultiplier,
  extraDurationEnd,
) {
  if (!keyframes || keyframes.length < 2) return 0;
  const framesPerTransition = Math.max(2, Math.round((fps * moveDuration) / speedMultiplier));
  const holdFrames = Math.max(1, Math.round((fps * holdDuration) / speedMultiplier));
  const extraFrames = Math.round(fps * extraDurationEnd);
  return (
    framesPerTransition +
    (keyframes.length - 1) * (framesPerTransition + holdFrames) +
    extraFrames
  );
}

export function* iterateInterpolatedFrames(
  keyframes,
  fps,
  moveDuration,
  holdDuration,
  speedMultiplier,
  extraDurationEnd,
  ballSize = 18,
) {
  if (!keyframes || keyframes.length < 2) return;

  const framesPerTransition = Math.max(2, Math.round((fps * moveDuration) / speedMultiplier));
  const holdFrames = Math.max(1, Math.round((fps * holdDuration) / speedMultiplier));
  const extraFrames = Math.round(fps * extraDurationEnd);
  const ballRotations = new Map();
  const firstKeyframe = keyframes[0];
  const firstElements = sortElementsByZIndex(firstKeyframe.elements);
  const firstFrameHasReveal = firstElements.some((element) => DRAW_REVEAL_TYPES.has(element.type));
  firstElements.forEach((element) => {
    if (element.type === 'ball') ballRotations.set(element.id, element.rotation || 0);
  });

  for (let index = 0; index < framesPerTransition; index++) {
    const progress = framesPerTransition > 1 ? easeInOutCubic(index / (framesPerTransition - 1)) : 1;
    yield {
      elements: firstElements.map((element) => {
        if (element.type === 'ball') return { ...element, rotation: ballRotations.get(element.id) || 0 };
        return DRAW_REVEAL_TYPES.has(element.type) ? { ...element, _drawProgress: progress } : element;
      }),
      connectors: firstKeyframe.connectors || [],
      _reusePreviousFrame: !firstFrameHasReveal && index > 0,
    };
  }

  for (let keyframeIndex = 0; keyframeIndex < keyframes.length - 1; keyframeIndex++) {
    const fromKeyframe = keyframes[keyframeIndex];
    const toKeyframe = keyframes[keyframeIndex + 1];
    const fromElements = sortElementsByZIndex(fromKeyframe.elements);
    const toElements = sortElementsByZIndex(toKeyframe.elements);
    const fromMap = new Map(fromElements.map((element) => [element.id, element]));
    const toMap = new Map(toElements.map((element) => [element.id, element]));
    const ids = [...new Set([...fromMap.keys(), ...toMap.keys()])].sort((leftId, rightId) => {
      const left = toMap.get(leftId) || fromMap.get(leftId);
      const right = toMap.get(rightId) || fromMap.get(rightId);
      return (left?.zIndex || 0) - (right?.zIndex || 0);
    });
    const ballDeltas = new Map();
    const changedIds = new Set();

    for (const id of ids) {
      const from = fromMap.get(id);
      const to = toMap.get(id);
      if (!from || !to || from.type === 'ball' || hasInterpolatedChange(from, to)) changedIds.add(id);
      if (from?.type !== 'ball' || to?.type !== 'ball') continue;
      const dx = to.x !== undefined && from.x !== undefined
        ? to.x - from.x
        : ((to.xRatio || 0) - (from.xRatio || 0)) * 1000;
      const dy = to.y !== undefined && from.y !== undefined
        ? to.y - from.y
        : ((to.yRatio || 0) - (from.yRatio || 0)) * 1000;
      const sign = Math.abs(dx) > 0.01 ? (dx > 0 ? 1 : -1) : Math.abs(dy) > 0.01 && dy < 0 ? -1 : 1;
      ballDeltas.set(id, Math.hypot(dx, dy) * sign);
    }

    for (let frameIndex = 1; frameIndex <= framesPerTransition; frameIndex++) {
      const linearProgress = frameIndex / framesPerTransition;
      const progress = easeInOutCubic(linearProgress);
      const elements = [];
      const shadows = [];

      for (const id of ids) {
        const from = fromMap.get(id);
        const to = toMap.get(id);
        const isAirBall = from?.type === 'ball' && to?.type === 'ball' && getBallTrajectory(fromKeyframe, id) === 'air';
        let element;
        if (from && to) {
          element = changedIds.has(id)
            ? interpolateElement(from, to, isAirBall ? linearProgress : progress)
            : to;
        } else if (to) {
          element = { ...to };
          if (DRAW_REVEAL_TYPES.has(to.type)) element._drawProgress = progress;
        } else {
          continue;
        }

        if (from?.type === 'ball' && to?.type === 'ball') {
          element.rotation = (ballRotations.get(id) || 0) + (ballDeltas.get(id) || 0) * (isAirBall ? linearProgress : progress);
        }

        if (isAirBall) {
          const effect = applyBallAirEffect(element, from, to, linearProgress, ballSize);
          const ground = { x: element.x, y: element.y, xRatio: element.xRatio, yRatio: element.yRatio };
          const refHeight = typeof ground.y === 'number' && typeof ground.yRatio === 'number' && ground.yRatio !== 0
            ? ground.y / ground.yRatio
            : null;
          const y = (ground.y || 0) + effect.yOffset;
          element = {
            ...element,
            y,
            yRatio: refHeight ? y / refHeight : ground.yRatio,
            size: (element.size || ballSize) * effect.scale,
            baseSize: (element.baseSize || element.size || ballSize) * effect.scale,
            zIndex: (element.zIndex || 200) + 50,
            isAirborne: true,
          };
          if (effect.shadow) shadows.push({ ...effect.shadow, ...ground, baseSize: effect.shadow.size });
        }
        elements.push(element);
      }

      yield {
        elements: [...shadows, ...elements],
        connectors: progress < 0.5
          ? fromKeyframe.connectors || []
          : toKeyframe.connectors || fromKeyframe.connectors || [],
      };
    }

    for (const [id, delta] of ballDeltas) ballRotations.set(id, (ballRotations.get(id) || 0) + delta);
    const heldFrame = {
      elements: toElements.map((element) =>
        element.type === 'ball' ? { ...element, rotation: ballRotations.get(element.id) || 0 } : element,
      ),
      connectors: toKeyframe.connectors || [],
      _reusePreviousFrame: true,
    };
    for (let index = 0; index < holdFrames; index++) {
      yield heldFrame;
    }
  }

  const lastKeyframe = keyframes[keyframes.length - 1];
  const lastElements = sortElementsByZIndex(lastKeyframe.elements);
  const lastFrame = {
    elements: lastElements.map((element) =>
      element.type === 'ball' ? { ...element, rotation: ballRotations.get(element.id) || 0 } : element,
    ),
    connectors: lastKeyframe.connectors || [],
    _reusePreviousFrame: true,
  };
  for (let index = 0; index < extraFrames; index++) {
    yield lastFrame;
  }
}

export function buildInterpolatedFrames(...args) {
  return Array.from(iterateInterpolatedFrames(...args));
}
