import {
  ratioToDisplay,
  displayToRatio,
  isOutsideVisibleField,
  areAllPointsOutside,
} from '../fields';
import { REFERENCE_WIDTH } from './primitives';
import { getZIndexBaseForType } from './config';
export function getProportionalIconSize(icon, imageWidth, standardSize = 24) {
  const baseSize =
    (icon.size || standardSize) + (icon.type === 'player' && icon.shape === 'jersey' ? 2 : 0);
  const REFERENCE_SCALE = 1.5;
  const viewportRatio = imageWidth / REFERENCE_WIDTH;
  const scaleFactor = Math.max(0.5, REFERENCE_SCALE * viewportRatio);
  return baseSize * scaleFactor;
}
export const BOARD_OBJECT_HIT_TOLERANCE = 8;
export const SHAPE_BORDER_HIT_TOLERANCE = 6;
export const ALLOW_MULTI_ELEMENT_DRAG = true;
export function hasVisibleFill(fillColor) {
  return Boolean(fillColor && fillColor !== 'transparent');
}
export function isPointInsideEllipse(pointX, pointY, centerX, centerY, rx, ry) {
  if (!Number.isFinite(rx) || rx <= 0 || !Number.isFinite(ry) || ry <= 0) return false;
  const nx = (pointX - centerX) / rx;
  const ny = (pointY - centerY) / ry;
  return nx * nx + ny * ny <= 1;
}
export function distanceToBoardSegment(pointX, pointY, startX, startY, endX, endY) {
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;
  if (segmentLengthSq === 0) return Math.hypot(pointX - startX, pointY - startY);
  const projection = Math.max(
    0,
    Math.min(1, ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / segmentLengthSq),
  );
  return Math.hypot(
    pointX - (startX + projection * segmentX),
    pointY - (startY + projection * segmentY),
  );
}
export function getResponderLocalPoint(event, offsetX = 0, offsetY = 0) {
  const nativeEvent = event?.nativeEvent || {};
  return {
    x: (nativeEvent.locationX || 0) + offsetX,
    y: (nativeEvent.locationY || 0) + offsetY,
  };
}
export function isCircleBorderTouch(localX, localY, centerX, centerY, radius, tolerance) {
  if (!Number.isFinite(radius) || radius <= 0) return false;
  const usableTolerance = Math.min(
    tolerance,
    SHAPE_BORDER_HIT_TOLERANCE,
    Math.max(4, radius * 0.14),
  );
  return Math.abs(Math.hypot(localX - centerX, localY - centerY) - radius) <= usableTolerance;
}
export function isEllipseBorderTouch(localX, localY, centerX, centerY, rx, ry, tolerance) {
  if (!Number.isFinite(rx) || rx <= 0 || !Number.isFinite(ry) || ry <= 0) return false;
  const dx = localX - centerX;
  const dy = localY - centerY;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return false;
  const cos = dx / distance;
  const sin = dy / distance;
  const angleRadius = (rx * ry) / Math.sqrt((ry * cos) ** 2 + (rx * sin) ** 2);
  const usableTolerance = Math.min(
    tolerance,
    SHAPE_BORDER_HIT_TOLERANCE,
    Math.max(4, Math.min(rx, ry) * 0.14),
  );
  return Math.abs(distance - angleRadius) <= usableTolerance;
}
export function isRectangleBorderTouch(
  localX,
  localY,
  rectX,
  rectY,
  rectWidth,
  rectHeight,
  tolerance,
) {
  if (rectWidth <= 0 || rectHeight <= 0) return false;
  const outerLeft = rectX - tolerance;
  const outerRight = rectX + rectWidth + tolerance;
  const outerTop = rectY - tolerance;
  const outerBottom = rectY + rectHeight + tolerance;
  if (localX < outerLeft || localX > outerRight || localY < outerTop || localY > outerBottom)
    return false;
  const insideX = localX >= rectX && localX <= rectX + rectWidth;
  const insideY = localY >= rectY && localY <= rectY + rectHeight;
  if (insideX && insideY) {
    const innerTolerance = Math.min(
      tolerance,
      SHAPE_BORDER_HIT_TOLERANCE,
      Math.max(4, Math.min(rectWidth, rectHeight) * 0.14),
    );
    return (
      Math.min(
        localX - rectX,
        rectX + rectWidth - localX,
        localY - rectY,
        rectY + rectHeight - localY,
      ) <= innerTolerance
    );
  }
  const dx = Math.max(rectX - localX, 0, localX - (rectX + rectWidth));
  const dy = Math.max(rectY - localY, 0, localY - (rectY + rectHeight));
  return Math.hypot(dx, dy) <= tolerance;
}
export function isPolygonBorderTouch(
  localX,
  localY,
  points,
  tolerance,
  minX,
  minY,
  touchMargin,
  width,
  height,
) {
  const pointX = localX + minX - touchMargin;
  const pointY = localY + minY - touchMargin;
  const usableTolerance = Math.min(
    tolerance,
    SHAPE_BORDER_HIT_TOLERANCE,
    Math.max(4, Math.min(width, height) * 0.14),
  );
  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (
      distanceToBoardSegment(pointX, pointY, current.x, current.y, next.x, next.y) <=
      usableTolerance
    ) {
      return true;
    }
  }
  return false;
}
export function clampBoardRatio(value) {
  return Math.max(0, Math.min(1, value));
}
export function clampDisplayValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
export function getDisplayBoxFromRatioPoints(points, viewMode, imageWidth, imageHeight) {
  const firstPoint = ratioToDisplay(points[0].x, points[0].y, viewMode, imageWidth, imageHeight);
  const secondPoint = ratioToDisplay(points[1].x, points[1].y, viewMode, imageWidth, imageHeight);
  return {
    minX: Math.min(firstPoint.x, secondPoint.x),
    minY: Math.min(firstPoint.y, secondPoint.y),
    maxX: Math.max(firstPoint.x, secondPoint.x),
    maxY: Math.max(firstPoint.y, secondPoint.y),
  };
}
export function getRatioPointsFromDisplayBox(box, viewMode, imageWidth, imageHeight) {
  const firstPoint = displayToRatio(box.minX, box.minY, viewMode, imageWidth, imageHeight);
  const secondPoint = displayToRatio(box.maxX, box.maxY, viewMode, imageWidth, imageHeight);
  return [
    {
      x: clampBoardRatio(firstPoint.x),
      y: clampBoardRatio(firstPoint.y),
    },
    {
      x: clampBoardRatio(secondPoint.x),
      y: clampBoardRatio(secondPoint.y),
    },
  ];
}
export function resizeDisplayBoxFromHandle(
  origBox,
  handle,
  dx,
  dy,
  imageWidth,
  imageHeight,
  minSize = 12,
) {
  let minX = origBox.minX;
  let minY = origBox.minY;
  let maxX = origBox.maxX;
  let maxY = origBox.maxY;
  const isCornerHandle = handle.length === 2;
  if (isCornerHandle && handle.includes('l')) minX += dx;
  if (isCornerHandle && handle.includes('r')) maxX += dx;
  if (isCornerHandle && handle.includes('t')) minY += dy;
  if (isCornerHandle && handle.includes('b')) maxY += dy;
  if (handle === 'left') minX += dx;
  if (handle === 'right') maxX += dx;
  if (handle === 'top') minY += dy;
  if (handle === 'bottom') maxY += dy;
  minX = clampDisplayValue(minX, 0, imageWidth);
  maxX = clampDisplayValue(maxX, 0, imageWidth);
  minY = clampDisplayValue(minY, 0, imageHeight);
  maxY = clampDisplayValue(maxY, 0, imageHeight);
  if (maxX - minX < minSize) {
    if ((isCornerHandle && handle.includes('l')) || handle === 'left') {
      minX = clampDisplayValue(maxX - minSize, 0, imageWidth);
    } else {
      maxX = clampDisplayValue(minX + minSize, 0, imageWidth);
    }
  }
  if (maxY - minY < minSize) {
    if ((isCornerHandle && handle.includes('t')) || handle === 'top') {
      minY = clampDisplayValue(maxY - minSize, 0, imageHeight);
    } else {
      maxY = clampDisplayValue(minY + minSize, 0, imageHeight);
    }
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}
export function isPointInsidePolygon(pointX, pointY, points) {
  let inside = false;
  for (
    let currentIndex = 0, previousIndex = points.length - 1;
    currentIndex < points.length;
    previousIndex = currentIndex++
  ) {
    const currentPoint = points[currentIndex];
    const previousPoint = points[previousIndex];
    const crossesY = currentPoint.y > pointY !== previousPoint.y > pointY;
    const intersectionX =
      ((previousPoint.x - currentPoint.x) * (pointY - currentPoint.y)) /
        (previousPoint.y - currentPoint.y || 1) +
      currentPoint.x;
    if (crossesY && pointX < intersectionX) inside = !inside;
  }
  return inside;
}
export function getCloneDisplayPoints(clone, viewMode, imageWidth, imageHeight) {
  if (!Array.isArray(clone.points)) return [];
  return clone.points.map((point) =>
    ratioToDisplay(point.x, point.y, viewMode, imageWidth, imageHeight),
  );
}
export function getCloneHitTolerance(clone, imageWidth, imageHeight) {
  const originalWidth = clone.imageWidth || imageWidth;
  const originalHeight = clone.imageHeight || imageHeight;
  const renderScale = (imageWidth / originalWidth + imageHeight / originalHeight) / 2;
  const strokeWidth = (clone.thickness || 2) * renderScale * 0.7;
  return Math.max(strokeWidth / 2 + 6, BOARD_OBJECT_HIT_TOLERANCE);
}
export function isPointNearPointList(pointX, pointY, points, tolerance, closed = false) {
  const lastSegmentIndex = closed ? points.length : points.length - 1;
  for (let pointIndex = 0; pointIndex < lastSegmentIndex; pointIndex++) {
    const currentPoint = points[pointIndex];
    const nextPoint = points[(pointIndex + 1) % points.length];
    if (
      distanceToBoardSegment(
        pointX,
        pointY,
        currentPoint.x,
        currentPoint.y,
        nextPoint.x,
        nextPoint.y,
      ) <= tolerance
    ) {
      return true;
    }
  }
  return false;
}
export function isPointOnBoardClone(
  clone,
  pointX,
  pointY,
  viewMode,
  imageWidth,
  imageHeight,
  standardSize = 24,
) {
  if (!clone || clone.type === 'custom-shape-button') return false;
  const tolerance = getCloneHitTolerance(clone, imageWidth, imageHeight);
  if (
    (clone.type === 'straight-line' ||
      clone.type === 'straight-arrow' ||
      clone.type === 'curve-line' ||
      clone.type === 'curve-arrow') &&
    clone.points?.length >= 2
  ) {
    return isPointNearPointList(
      pointX,
      pointY,
      getCloneDisplayPoints(clone, viewMode, imageWidth, imageHeight),
      tolerance,
      false,
    );
  }
  if (clone.type === 'circle' && clone.points?.length === 2) {
    const firstPoint = ratioToDisplay(
      clone.points[0].x,
      clone.points[0].y,
      viewMode,
      imageWidth,
      imageHeight,
    );
    const secondPoint = ratioToDisplay(
      clone.points[1].x,
      clone.points[1].y,
      viewMode,
      imageWidth,
      imageHeight,
    );
    const centerX = (firstPoint.x + secondPoint.x) / 2;
    const centerY = (firstPoint.y + secondPoint.y) / 2;
    const rx = Math.abs(secondPoint.x - firstPoint.x) / 2;
    const ry = Math.abs(secondPoint.y - firstPoint.y) / 2;
    return (
      isPointInsideEllipse(pointX, pointY, centerX, centerY, rx, ry) ||
      isEllipseBorderTouch(pointX, pointY, centerX, centerY, rx, ry, tolerance)
    );
  }
  if (clone.type === 'rectangle' && clone.points?.length === 2) {
    const firstPoint = ratioToDisplay(
      clone.points[0].x,
      clone.points[0].y,
      viewMode,
      imageWidth,
      imageHeight,
    );
    const secondPoint = ratioToDisplay(
      clone.points[1].x,
      clone.points[1].y,
      viewMode,
      imageWidth,
      imageHeight,
    );
    const minX = Math.min(firstPoint.x, secondPoint.x);
    const minY = Math.min(firstPoint.y, secondPoint.y);
    const width = Math.abs(secondPoint.x - firstPoint.x);
    const height = Math.abs(secondPoint.y - firstPoint.y);
    return isRectangleBorderTouch(pointX, pointY, minX, minY, width, height, tolerance);
  }
  if (clone.type === 'custom-shape' && clone.points?.length >= 3) {
    const points = getCloneDisplayPoints(clone, viewMode, imageWidth, imageHeight);
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const width = Math.max(...xs) - minX;
    const height = Math.max(...ys) - minY;
    const usableTolerance = Math.min(
      tolerance,
      SHAPE_BORDER_HIT_TOLERANCE,
      Math.max(4, Math.min(width, height) * 0.14),
    );
    return isPointNearPointList(pointX, pointY, points, usableTolerance, true);
  }
  if (clone.xRatio !== undefined && clone.yRatio !== undefined) {
    const center = ratioToDisplay(clone.xRatio, clone.yRatio, viewMode, imageWidth, imageHeight);
    if (clone.type === 'free-text') {
      const fontSize = clone.size || 18;
      const textWidth = Math.max(40, String(clone.value || '').length * fontSize * 0.6 + 8);
      const textHeight = Math.max(30, fontSize * 1.4 + 8);
      return (
        pointX >= center.x - 4 &&
        pointX <= center.x + textWidth + 4 &&
        pointY >= center.y - 4 &&
        pointY <= center.y + textHeight + 4
      );
    }
    const iconSize = getProportionalIconSize(clone, imageWidth, standardSize);

    // Bounding box specific to each tool type, accounting for rotation
    const rotation = clone.rotation || 0;
    let localPt = {
      x: pointX,
      y: pointY,
    };
    if (rotation) {
      const rad = (-rotation * Math.PI) / 180;
      const dx = pointX - center.x;
      const dy = pointY - center.y;
      localPt = {
        x: center.x + (dx * Math.cos(rad) - dy * Math.sin(rad)),
        y: center.y + (dx * Math.sin(rad) + dy * Math.cos(rad)),
      };
    }
    let w = iconSize;
    let h = iconSize;
    let isCircular = false;
    if (
      clone.type === 'ball' ||
      clone.type === 'ring' ||
      clone.type === 'cone' ||
      clone.type === 'cone-pro'
    ) {
      isCircular = true;
    } else if (clone.type === 'goal-large' || clone.type === 'goal') {
      h = iconSize * 0.25;
    } else if (clone.type === 'goal-small') {
      w = iconSize * 0.75;
      h = iconSize * 0.21;
    } else if (clone.type === 'barrier' || clone.type === 'ladder') {
      h = iconSize * 0.4;
    } else if (clone.type === 'dummy') {
      w = iconSize * 0.5;
    } else if (clone.type === 'pole') {
      w = iconSize * 0.3;
    } else if (clone.type === 'weights') {
      h = iconSize * 0.5;
    } else if (clone.type === 'cone-flat') {
      h = iconSize * 0.5;
    }
    if (isCircular) {
      const hitRadius = w / 2 + 4;
      return Math.hypot(pointX - center.x, pointY - center.y) <= hitRadius;
    } else {
      const pad = 4;
      return (
        localPt.x >= center.x - w / 2 - pad &&
        localPt.x <= center.x + w / 2 + pad &&
        localPt.y >= center.y - h / 2 - pad &&
        localPt.y <= center.y + h / 2 + pad
      );
    }
  }
  return false;
}
export function getCloneInteractionZIndex(clone, originalIndex, selectedCloneId) {
  if (clone.locked === true) return 1;
  return clone.zIndex || getZIndexBaseForType(clone.type) + originalIndex;
}
export function findTopBoardCloneAtPoint(
  clones,
  pointX,
  pointY,
  viewMode,
  imageWidth,
  imageHeight,
  standardSize,
  selectedCloneId,
) {
  let topClone = null;
  let topZIndex = -Infinity;
  let topOriginalIndex = -1;

  clones.forEach((clone, originalIndex) => {
    if (clone.locked) return;
    const zIndex = getCloneInteractionZIndex(clone, originalIndex, selectedCloneId);
    if (zIndex < topZIndex || (zIndex === topZIndex && originalIndex <= topOriginalIndex)) return;
    if (
      isPointOnBoardClone(clone, pointX, pointY, viewMode, imageWidth, imageHeight, standardSize)
    ) {
      topClone = clone;
      topZIndex = zIndex;
      topOriginalIndex = originalIndex;
    }
  });

  return topClone;
}
export function createBoardDragSnapshot(clone) {
  if (!clone) return null;
  if (clone.points && Array.isArray(clone.points)) {
    return {
      points: clone.points.map((point) => ({
        x: point.x,
        y: point.y,
      })),
    };
  }
  if (clone.xRatio !== undefined && clone.yRatio !== undefined) {
    return {
      xRatio: clone.xRatio,
      yRatio: clone.yRatio,
    };
  }
  if (clone.x !== undefined && clone.y !== undefined) {
    return {
      x: clone.x,
      y: clone.y,
    };
  }
  return null;
}
export function applyBoardDragSnapshot(clone, snapshot, dxRatio, dyRatio, dxDisplay, dyDisplay) {
  if (!snapshot) return clone;
  if (snapshot.points) {
    return {
      ...clone,
      points: snapshot.points.map((point) => ({
        x: point.x + dxRatio,
        y: point.y + dyRatio,
      })),
    };
  }
  if (snapshot.xRatio !== undefined && snapshot.yRatio !== undefined) {
    return {
      ...clone,
      xRatio: snapshot.xRatio + dxRatio,
      yRatio: snapshot.yRatio + dyRatio,
    };
  }
  if (snapshot.x !== undefined && snapshot.y !== undefined) {
    return {
      ...clone,
      x: snapshot.x + dxDisplay,
      y: snapshot.y + dyDisplay,
    };
  }
  return clone;
}
export function buildBoardDragSnapshots(clones, selectedIds) {
  return buildBoardDragState(clones, selectedIds).initialPositions;
}
export function buildBoardDragState(clones, selectedIds) {
  const selectedIdsSet = new Set(selectedIds);
  const initialPositions = {};
  const selectedIndices = [];
  clones.forEach((clone, index) => {
    if (!selectedIdsSet.has(clone.id) || clone.locked) return;
    const snapshot = createBoardDragSnapshot(clone);
    if (!snapshot) return;
    initialPositions[clone.id] = snapshot;
    selectedIndices.push({ id: clone.id, index });
  });
  return { initialPositions, selectedIdsSet, selectedIndices };
}
export function applyBoardDragState(clones, dragState, dxRatio, dyRatio, dxDisplay, dyDisplay) {
  let next = null;
  for (const selected of dragState.selectedIndices || []) {
    let index = selected.index;
    if (clones[index]?.id !== selected.id) {
      index = clones.findIndex((clone) => clone.id === selected.id);
    }
    if (index < 0 || clones[index].locked) continue;
    const updated = applyBoardDragSnapshot(
      clones[index],
      dragState.initialPositions[selected.id],
      dxRatio,
      dyRatio,
      dxDisplay,
      dyDisplay,
    );
    if (updated === clones[index]) continue;
    if (!next) next = [...clones];
    next[index] = updated;
  }
  return next || clones;
}
export function findBoardCloneIndex(clones, id, preferredIndex) {
  if (Number.isInteger(preferredIndex) && clones[preferredIndex]?.id === id) return preferredIndex;
  return clones.findIndex((clone) => clone.id === id);
}
export function isBoardCloneOutsideForDelete(clone, viewMode, imageWidth, imageHeight) {
  if (!clone) return false;
  if (clone.points && Array.isArray(clone.points) && clone.points.length >= 2) {
    return areAllPointsOutside(clone.points, viewMode, imageWidth, imageHeight);
  }
  if (clone.xRatio !== undefined && clone.yRatio !== undefined) {
    return isOutsideVisibleField(clone.xRatio, clone.yRatio, viewMode, imageWidth, imageHeight);
  }
  if (clone.x !== undefined && clone.y !== undefined) {
    return clone.x < 0 || clone.x > imageWidth || clone.y < 0 || clone.y > imageHeight;
  }
  return false;
}
export function getArrowHeadForStraightLine(start, end, size = 24, ratio = 0.5, thickness = 2) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0)
    return {
      arrowPoints: '',
      lineEnd: end,
    };

  // Calcular el �ngulo de la l�nea
  const angle = Math.atan2(dy, dx);
  // Tama�o de flecha proporcional al grosor de la l�nea (m�s fino = flecha m�s peque�a)
  const arrowSize = Math.max(6 * thickness, 8);

  // Calcular los puntos para la punta de flecha
  const x3 = end.x - arrowSize * Math.cos(angle - Math.PI / 6);
  const y3 = end.y - arrowSize * Math.sin(angle - Math.PI / 6);
  const x4 = end.x - arrowSize * Math.cos(angle + Math.PI / 6);
  const y4 = end.y - arrowSize * Math.sin(angle + Math.PI / 6);

  // Calcular el punto donde debe terminar la l�nea (base de la flecha)
  const lineEndX = end.x - arrowSize * 0.85 * Math.cos(angle);
  const lineEndY = end.y - arrowSize * 0.85 * Math.sin(angle);
  return {
    arrowPoints: `${end.x},${end.y} ${x3},${y3} ${x4},${y4}`,
    lineEnd: {
      x: lineEndX,
      y: lineEndY,
    },
  };
}

// Funci�n para generar el path SVG para l�neas curvas
export // Funci�n para generar el path SVG para l�neas curvas
function generateCurvePath(points) {
  if (!points || points.length < 2) return '';

  // Comenzamos con un 'M' (move to) para el primer punto
  let path = `M${points[0].x},${points[0].y}`;

  // Para cada punto restante, a�adimos un comando 'L' (line to)
  for (let i = 1; i < points.length; i++) {
    path += ` L${points[i].x},${points[i].y}`;
  }
  return path;
}

// Funci�n auxiliar para calcular la distancia de un punto a un segmento de l�nea
export // Funci�n auxiliar para calcular la distancia de un punto a un segmento de l�nea
function distanceToLineSegment(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// =====================================================
// COMPONENTES MEMOIZADOS PARA LÍNEAS - OPTIMIZACIÓN CRÍTICA
// =====================================================

// Componente memoizado para l�neas rectas - evita re-renders innecesarios
