import React, { useRef, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Path, Polygon, G } from 'react-native-svg';
import {
  ratioToDisplay,
  deltaToRatio,
  isOutsideVisibleField,
  areAllPointsOutside,
} from '../fields';
import {
  ALLOW_MULTI_ELEMENT_DRAG,
  generateCurvePath,
  getArrowHeadForStraightLine,
} from './geometry';
import { ZINDEX_BASE_LINES, acquireBoardDrag, isBoardDragOwner, releaseBoardDrag } from './config';
import { TouchableOpacity, boardInteractionState, snapToHorizontalOrVertical } from './primitives';
export // =====================================================
// COMPONENTES MEMOIZADOS PARA LÍNEAS - OPTIMIZACIÓN CRÍTICA
// =====================================================

// Componente memoizado para l�neas rectas - evita re-renders innecesarios
const MemoizedStraightLine = React.memo(
  ({
    id,
    x1,
    y1,
    x2,
    y2,
    color,
    thickness,
    lineType,
    dotSize,
    dotSpacing,
    isArrow,
    arrowPoints,
    lineEndX,
    lineEndY,
    isMultiSelected,
    drawProgress,
  }) => {
    const actualEndX = isArrow ? lineEndX : x2;
    const actualEndY = isArrow ? lineEndY : y2;
    const pathD = `M${x1},${y1} L${actualEndX},${actualEndY}`;
    const strokeColor = isMultiSelected ? '#3498db' : color;
    const strokeDasharray = lineType === 'dotted' ? `${dotSize || 2}, ${dotSpacing || 4}` : null;
    return (
      <G>
        {/* Highlight para multi-selecci�n */}
        {isMultiSelected && (
          <Path
            d={pathD}
            stroke="#3498db"
            strokeWidth={thickness + 6}
            strokeOpacity={0.25}
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* L�nea principal (con o sin punteado) */}
        <Path
          key={`line-${id}-${lineType || 'solid'}-${dotSize || 2}-${dotSpacing || 4}`}
          d={pathD}
          stroke={strokeColor}
          strokeWidth={thickness}
          strokeDasharray={strokeDasharray}
          fill="none"
          strokeLinecap="round"
        />

        {/* Punta de flecha */}
        {isArrow && arrowPoints && (
          <Polygon points={arrowPoints} fill={color} strokeLinejoin="round" />
        )}
      </G>
    );
  },
  (prevProps, nextProps) => {
    // Comparaci�n profunda para evitar re-renders innecesarios
    return (
      prevProps.id === nextProps.id &&
      prevProps.x1 === nextProps.x1 &&
      prevProps.y1 === nextProps.y1 &&
      prevProps.x2 === nextProps.x2 &&
      prevProps.y2 === nextProps.y2 &&
      prevProps.color === nextProps.color &&
      prevProps.thickness === nextProps.thickness &&
      prevProps.lineType === nextProps.lineType &&
      prevProps.dotSize === nextProps.dotSize &&
      prevProps.dotSpacing === nextProps.dotSpacing &&
      prevProps.isArrow === nextProps.isArrow &&
      prevProps.isMultiSelected === nextProps.isMultiSelected &&
      prevProps.arrowPoints === nextProps.arrowPoints &&
      prevProps.lineEndX === nextProps.lineEndX &&
      prevProps.lineEndY === nextProps.lineEndY &&
      prevProps.drawProgress === nextProps.drawProgress
    );
  },
);

// Componente memoizado para l�neas curvas - evita re-renders innecesarios
export // Componente memoizado para l�neas curvas - evita re-renders innecesarios
const MemoizedCurveLine = React.memo(
  ({
    id,
    pathData,
    color,
    thickness,
    lineType,
    dotSize,
    dotSpacing,
    isArrow,
    arrowPoints,
    isMultiSelected,
    drawProgress,
  }) => {
    const strokeColor = isMultiSelected ? '#3498db' : color;
    const strokeDasharray = lineType === 'dotted' ? `${dotSize || 2}, ${dotSpacing || 4}` : null;
    return (
      <G>
        {/* Highlight para multi-selecci�n */}
        {isMultiSelected && (
          <Path
            d={pathData}
            stroke="#3498db"
            strokeWidth={thickness + 6}
            strokeOpacity={0.25}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* L�nea principal (con o sin punteado) */}
        <Path
          key={`curve-${id}-${lineType || 'solid'}-${dotSize || 2}-${dotSpacing || 4}`}
          d={pathData}
          stroke={strokeColor}
          strokeWidth={thickness}
          strokeDasharray={strokeDasharray}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Punta de flecha */}
        {isArrow && arrowPoints && (
          <Polygon points={arrowPoints} fill={color} strokeLinejoin="round" />
        )}
      </G>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.id === nextProps.id &&
      prevProps.pathData === nextProps.pathData &&
      prevProps.color === nextProps.color &&
      prevProps.thickness === nextProps.thickness &&
      prevProps.lineType === nextProps.lineType &&
      prevProps.dotSize === nextProps.dotSize &&
      prevProps.dotSpacing === nextProps.dotSpacing &&
      prevProps.isArrow === nextProps.isArrow &&
      prevProps.isMultiSelected === nextProps.isMultiSelected &&
      prevProps.arrowPoints === nextProps.arrowPoints &&
      prevProps.drawProgress === nextProps.drawProgress
    );
  },
);
export function clampDrawProgress(value) {
  return typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 1;
}
export function pointAtDrawProgress(from, to, progress) {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}
export function quadraticPointAt(from, control, to, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * from.x + 2 * mt * t * control.x + t * t * to.x,
    y: mt * mt * from.y + 2 * mt * t * control.y + t * t * to.y,
  };
}
export function sampleQuadraticPoints(from, control, to, steps = 16) {
  const out = [];
  for (let i = 1; i <= steps; i++) out.push(quadraticPointAt(from, control, to, i / steps));
  return out;
}
export function sampleCurvePoints(points) {
  if (points.length <= 2) return points;
  const out = [points[0]];
  if (points.length === 3) {
    out.push(...sampleQuadraticPoints(points[0], points[1], points[2], 32));
    return out;
  }
  let current = points[0];
  for (let i = 1; i < points.length - 2; i++) {
    const end = {
      x: (points[i].x + points[i + 1].x) / 2,
      y: (points[i].y + points[i + 1].y) / 2,
    };
    out.push(...sampleQuadraticPoints(current, points[i], end));
    current = end;
  }
  out.push(...sampleQuadraticPoints(current, points[points.length - 2], points[points.length - 1]));
  return out;
}
export function partialPointsByProgress(points, progress) {
  const p = clampDrawProgress(progress);
  if (p >= 1 || points.length < 2) return points;
  if (p <= 0) return [points[0], points[0]];
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    lengths.push(length);
    total += length;
  }
  const target = total * p;
  let covered = 0;
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const length = lengths[i - 1];
    if (covered + length >= target) {
      out.push(pointAtDrawProgress(points[i - 1], points[i], (target - covered) / length));
      return out;
    }
    out.push(points[i]);
    covered += length;
  }
  return out;
}

// Componente batch para renderizar muchas l�neas en un solo SVG Group
export // Componente batch para renderizar muchas l�neas en un solo SVG Group
const BatchLinesRenderer = React.memo(
  ({
    straightLines,
    curveLines,
    imageWidth,
    imageHeight,
    selectedCloneIdsSet,
    multiSelectMode,
    viewMode,
  }) => {
    // Helper: convert ratio point to display coords
    const tp = useCallback(
      (xR, yR) => {
        if (!viewMode || viewMode === 'entire')
          return {
            x: xR * imageWidth,
            y: yR * imageHeight,
          };
        return ratioToDisplay(xR, yR, viewMode, imageWidth, imageHeight);
      },
      [viewMode, imageWidth, imageHeight],
    );

    // Pre-calcular todos los datos de l�neas rectas
    const straightLineData = useMemo(() => {
      return straightLines
        .map((icon) => {
          if (!icon.points || icon.points.length !== 2) return null;
          const originalWidth = icon.imageWidth || imageWidth;
          const originalHeight = icon.imageHeight || imageHeight;
          const widthRatio = imageWidth / originalWidth;
          const heightRatio = imageHeight / originalHeight;
          const scale = (widthRatio + heightRatio) / 2;
          const p1 = tp(icon.points[0].x, icon.points[0].y);
          const p2 = tp(icon.points[1].x, icon.points[1].y);
          const drawProgress = clampDrawProgress(icon._drawProgress);
          const x1 = p1.x;
          const y1 = p1.y;
          const currentEnd = drawProgress < 1 ? pointAtDrawProgress(p1, p2, drawProgress) : p2;
          const x2 = currentEnd.x;
          const y2 = currentEnd.y;
          const thickness = (icon.thickness || 1) * scale * 0.7;
          const isMultiSelected = multiSelectMode && selectedCloneIdsSet?.has(icon.id);
          const isArrow = icon.type === 'straight-arrow' && drawProgress > 0.08;
          let arrowPoints = '';
          let lineEndX = x2;
          let lineEndY = y2;
          if (isArrow) {
            const arrowData = getArrowHeadForStraightLine(
              {
                x: x1,
                y: y1,
              },
              {
                x: x2,
                y: y2,
              },
              icon.size || 24,
              0.5,
              thickness,
            );
            arrowPoints = arrowData.arrowPoints;
            lineEndX = arrowData.lineEnd.x;
            lineEndY = arrowData.lineEnd.y;
          }
          return {
            id: icon.id,
            x1,
            y1,
            x2,
            y2,
            color: icon.color,
            thickness,
            lineType: icon.lineType,
            dotSize: icon.dotSize,
            dotSpacing: icon.dotSpacing,
            isArrow,
            arrowPoints,
            lineEndX,
            lineEndY,
            isMultiSelected,
            drawProgress,
          };
        })
        .filter(Boolean);
    }, [straightLines, imageWidth, imageHeight, selectedCloneIdsSet, multiSelectMode, tp]);

    // Pre-calcular todos los datos de l�neas curvas
    const curveLineData = useMemo(() => {
      return curveLines
        .map((icon) => {
          if (!icon.points || icon.points.length < 2) return null;
          const originalWidth = icon.imageWidth || imageWidth;
          const originalHeight = icon.imageHeight || imageHeight;
          const widthRatio = imageWidth / originalWidth;
          const heightRatio = imageHeight / originalHeight;
          const scale = (widthRatio + heightRatio) / 2;
          const pts = icon.points.map((p) => tp(p.x, p.y));
          const drawProgress = clampDrawProgress(icon._drawProgress);
          const renderPts =
            drawProgress < 1 ? partialPointsByProgress(sampleCurvePoints(pts), drawProgress) : pts;
          const pathData = generateCurvePath(renderPts);
          const thickness = (icon.thickness || 1) * scale * 0.7;
          const isMultiSelected = multiSelectMode && selectedCloneIdsSet?.has(icon.id);
          const isArrow = icon.type === 'curve-arrow' && drawProgress > 0.08;
          let arrowPoints = '';
          if (isArrow && renderPts.length >= 2) {
            const lastIdx = renderPts.length - 1;
            let secondLastIdx = lastIdx - 1;
            while (secondLastIdx >= 0 && lastIdx > 0) {
              const dist = Math.sqrt(
                Math.pow(renderPts[lastIdx].x - renderPts[secondLastIdx].x, 2) +
                  Math.pow(renderPts[lastIdx].y - renderPts[secondLastIdx].y, 2),
              );
              if (dist > 5) break;
              secondLastIdx--;
            }
            if (secondLastIdx < 0) secondLastIdx = 0;
            const lastPoint = renderPts[lastIdx];
            const secondLastPoint = renderPts[secondLastIdx];
            const dx = lastPoint.x - secondLastPoint.x;
            const dy = lastPoint.y - secondLastPoint.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
              const angle = Math.atan2(dy, dx);
              const arrowSize = Math.max(6 * thickness, 8);
              const x3 = lastPoint.x - arrowSize * Math.cos(angle - Math.PI / 6);
              const y3 = lastPoint.y - arrowSize * Math.sin(angle - Math.PI / 6);
              const x4 = lastPoint.x - arrowSize * Math.cos(angle + Math.PI / 6);
              const y4 = lastPoint.y - arrowSize * Math.sin(angle + Math.PI / 6);
              arrowPoints = `${lastPoint.x},${lastPoint.y} ${x3},${y3} ${x4},${y4}`;
            }
          }
          return {
            id: icon.id,
            pathData,
            color: icon.color,
            thickness,
            lineType: icon.lineType,
            dotSize: icon.dotSize,
            dotSpacing: icon.dotSpacing,
            isArrow,
            arrowPoints,
            isMultiSelected,
            drawProgress,
          };
        })
        .filter(Boolean);
    }, [curveLines, imageWidth, imageHeight, selectedCloneIdsSet, multiSelectMode, tp]);
    return (
      <G>
        {/* Renderizar l�neas rectas */}
        {straightLineData.map((data) => (
          <MemoizedStraightLine key={`sl-${data.id}`} {...data} />
        ))}

        {/* Renderizar l�neas curvas */}
        {curveLineData.map((data) => (
          <MemoizedCurveLine key={`cl-${data.id}`} {...data} />
        ))}
      </G>
    );
  },
  (prevProps, nextProps) => {
    // Solo re-renderizar si realmente cambiaron las l�neas
    if (prevProps.straightLines.length !== nextProps.straightLines.length) return false;
    if (prevProps.curveLines.length !== nextProps.curveLines.length) return false;
    if (prevProps.imageWidth !== nextProps.imageWidth) return false;
    if (prevProps.imageHeight !== nextProps.imageHeight) return false;
    if (prevProps.multiSelectMode !== nextProps.multiSelectMode) return false;

    // Comparar referencias de l�neas
    for (let i = 0; i < prevProps.straightLines.length; i++) {
      const prev = prevProps.straightLines[i];
      const next = nextProps.straightLines[i];
      if (
        prev.id !== next.id ||
        prev.color !== next.color ||
        prev.thickness !== next.thickness ||
        prev.lineType !== next.lineType ||
        prev.dotSize !== next.dotSize ||
        prev.dotSpacing !== next.dotSpacing ||
        prev._drawProgress !== next._drawProgress ||
        !arraysEqual(prev.points, next.points)
      ) {
        return false;
      }
    }
    for (let i = 0; i < prevProps.curveLines.length; i++) {
      const prev = prevProps.curveLines[i];
      const next = nextProps.curveLines[i];
      if (
        prev.id !== next.id ||
        prev.color !== next.color ||
        prev.thickness !== next.thickness ||
        prev.lineType !== next.lineType ||
        prev.dotSize !== next.dotSize ||
        prev.dotSpacing !== next.dotSpacing ||
        prev._drawProgress !== next._drawProgress ||
        !arraysEqual(prev.points, next.points)
      ) {
        return false;
      }
    }
    return true;
  },
);

// Helper para comparar arrays de puntos
export // Helper para comparar arrays de puntos
function arraysEqual(a, b) {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false;
  }
  return true;
}

// =====================================================
// COMPONENTE MEMOIZADO PARA DETECTORES DE LÍNEAS RECTAS
// =====================================================
export // =====================================================
// COMPONENTE MEMOIZADO PARA DETECTORES DE LÍNEAS RECTAS
// =====================================================
const MemoizedStraightLineDetector = React.memo(
  ({
    icon,
    imageWidth,
    imageHeight,
    viewMode,
    selectedCloneId,
    setSelectedCloneId,
    setClones,
    dragStart,
    clones,
    selectedCloneIds,
    selectedCloneIdsSet,
    multiSelectMode,
    selectionInteractionMode,
    setOptionsMenu,
    isAnyDrawingMode,
    originalIdx,
    saveClonesHistory,
    zoomLevel = 1,
    setEditingIcon,
    setLeftPanelVisible,
  }) => {
    if (!icon.points || icon.points.length !== 2) return null;
    if (isAnyDrawingMode) return null;
    const rafRef = useRef(null);
    const pendingUpdateRef = useRef(null);
    const originalWidth = icon.imageWidth || imageWidth;
    const originalHeight = icon.imageHeight || imageHeight;
    const widthRatio = imageWidth / originalWidth;
    const heightRatio = imageHeight / originalHeight;
    const scale = (widthRatio + heightRatio) / 2;
    const { x: x1, y: y1 } = ratioToDisplay(
      icon.points[0].x,
      icon.points[0].y,
      viewMode,
      imageWidth,
      imageHeight,
    );
    const { x: x2, y: y2 } = ratioToDisplay(
      icon.points[1].x,
      icon.points[1].y,
      viewMode,
      imageWidth,
      imageHeight,
    );
    const lineThickness = (icon.thickness || 2) * scale;
    const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);
    const isSelected = selectedCloneIdsSet?.has(icon.id);
    const canDrag =
      !icon.locked &&
      !isAnyDrawingMode &&
      (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isSelected));
    const touchTolerance = Math.max(lineThickness / 2 + 12, 18);
    const touchMargin = 22;
    const touchWidth = maxX - minX + touchMargin * 2;
    const touchHeight = maxY - minY + touchMargin * 2;
    const detectorZIndex = icon.calculatedZIndex || ZINDEX_BASE_LINES + originalIdx;

    // Dimensiones del bot�n de opciones (3 puntos)
    const optionsButtonSize = 28;
    const optionsButtonLeft = centerX - minX + touchMargin - 14;
    const optionsButtonTop = centerY - minY + touchMargin - 14;

    // Funci�n para verificar si el toque est� en el �rea del bot�n de opciones
    const isTouchOnOptionsButton = (touchX, touchY) => {
      if (selectedCloneId !== icon.id || multiSelectMode) return false;
      const buttonCenterX = optionsButtonLeft + optionsButtonSize / 2;
      const buttonCenterY = optionsButtonTop + optionsButtonSize / 2;
      const dx = touchX - buttonCenterX;
      const dy = touchY - buttonCenterY;
      const distFromButton = Math.sqrt(dx * dx + dy * dy);
      return distFromButton <= optionsButtonSize / 2 + 5; // 5px de margen extra
    };
    const handleResponderGrant = (e) => {
      if (
        icon.id === boardInteractionState.tapId &&
        Date.now() - boardInteractionState.tapTime < 300
      ) {
        boardInteractionState.tapTime = 0;
        boardInteractionState.tapId = null;
        setEditingIcon(icon);
        setLeftPanelVisible(true);
        return;
      }
      boardInteractionState.tapTime = Date.now();
      boardInteractionState.tapId = icon.id;
      if (selectedCloneId && selectedCloneId !== icon.id) {
        setSelectedCloneId(null);
      }
      if (!canDrag) {
        if (!multiSelectMode) setSelectedCloneId(icon.id);
        return;
      }
      if (!acquireBoardDrag(dragStart, icon.id)) return;
      if (
        ALLOW_MULTI_ELEMENT_DRAG &&
        multiSelectMode &&
        selectionInteractionMode === 'move' &&
        isSelected
      ) {
        const initialPositions = {};
        selectedCloneIds.forEach((id) => {
          const c = clones.find((cl) => cl.id === id);
          if (!c) return;
          if (c.points && Array.isArray(c.points)) {
            initialPositions[id] = c.points.map((p) => ({
              x: p.x,
              y: p.y,
            }));
          } else {
            initialPositions[id] = {
              xRatio: c.xRatio,
              yRatio: c.yRatio,
            };
          }
        });
        dragStart.current[icon.id] = {
          multiSelect: true,
          selectedIds: [...selectedCloneIds],
          initialPositions,
          isValid: true,
          startX: e.nativeEvent.pageX,
          startY: e.nativeEvent.pageY,
        };
      } else {
        dragStart.current[icon.id] = {
          points: icon.points.map((p) => ({
            x: p.x,
            y: p.y,
          })),
          isValid: true,
          startX: e.nativeEvent.pageX,
          startY: e.nativeEvent.pageY,
        };
      }
    };
    const handleResponderMove = (e) => {
      if (!canDrag || !dragStart.current[icon.id]?.isValid || !isBoardDragOwner(dragStart, icon.id))
        return;
      const base = dragStart.current[icon.id];
      const { dxRatio: dx, dyRatio: dy } = deltaToRatio(
        (e.nativeEvent.pageX - base.startX) / zoomLevel,
        (e.nativeEvent.pageY - base.startY) / zoomLevel,
        viewMode,
        imageWidth,
        imageHeight,
      );
      if (base.multiSelect && base.selectedIds && base.initialPositions) {
        pendingUpdateRef.current = (prev) =>
          prev.map((c) => {
            if (!base.selectedIds.includes(c.id)) return c;
            const init = base.initialPositions[c.id];
            if (!init) return c;
            if (Array.isArray(init)) {
              return {
                ...c,
                points: init.map((pt) => ({
                  x: pt.x + dx,
                  y: pt.y + dy,
                })),
              };
            }
            return {
              ...c,
              xRatio: (init.xRatio || 0) + dx,
              yRatio: (init.yRatio || 0) + dy,
            };
          });
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            if (pendingUpdateRef.current) {
              setClones(pendingUpdateRef.current);
              pendingUpdateRef.current = null;
            }
            rafRef.current = null;
          });
        }
        return;
      }
      pendingUpdateRef.current = (prev) => {
        const correctIndex = prev.findIndex((c) => c.id === icon.id);
        if (correctIndex === -1) return prev;
        const next = [...prev];
        next[correctIndex] = {
          ...next[correctIndex],
          points: base.points.map((pt) => ({
            x: pt.x + dx,
            y: pt.y + dy,
          })),
        };
        return next;
      };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (pendingUpdateRef.current) {
            setClones(pendingUpdateRef.current);
            pendingUpdateRef.current = null;
          }
          rafRef.current = null;
        });
      }
    };
    const handleResponderRelease = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingUpdateRef.current) {
        setClones(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
      const base = dragStart.current[icon.id];
      if (base?.multiSelect && base.selectedIds) {
        // Multi-drag: eliminar TODOS los seleccionados que est�n fuera del campo
        setClones((prev) => {
          const remaining = prev.filter((c) => {
            if (!base.selectedIds.includes(c.id) || c.locked) return true;
            if (c.points && Array.isArray(c.points) && c.points.length >= 2) {
              return !areAllPointsOutside(c.points, viewMode, imageWidth, imageHeight);
            }
            if (c.xRatio !== undefined) {
              return !isOutsideVisibleField(c.xRatio, c.yRatio, viewMode, imageWidth, imageHeight);
            }
            return true;
          });
          return remaining.length < prev.length ? remaining : prev;
        });
      } else {
        // Single drag: solo eliminar este elemento
        setClones((prev) => {
          const currentClone = prev.find((c) => c.id === icon.id);
          if (currentClone && !currentClone.locked && currentClone.points) {
            if (areAllPointsOutside(currentClone.points, viewMode, imageWidth, imageHeight)) {
              return prev.filter((c) => c.id !== icon.id);
            }
          }
          return prev;
        });
      }
      delete dragStart.current[icon.id];
      releaseBoardDrag(dragStart, icon.id);
      if (!multiSelectMode) setSelectedCloneId(icon.id);
      if (saveClonesHistory) saveClonesHistory();
    };
    const handleLineResizeGrant = (pointIndex, e) => {
      dragStart.current[`${icon.id}-resize`] = {
        pointIndex,
        startX: e.nativeEvent.pageX,
        startY: e.nativeEvent.pageY,
        origPoints: icon.points.map((p) => ({
          x: p.x,
          y: p.y,
        })),
      };
    };
    const handleLineResizeMove = (e) => {
      const base = dragStart.current[`${icon.id}-resize`];
      if (!base) return;
      const { dxRatio, dyRatio } = deltaToRatio(
        (e.nativeEvent.pageX - base.startX) / zoomLevel,
        (e.nativeEvent.pageY - base.startY) / zoomLevel,
        viewMode,
        imageWidth,
        imageHeight,
      );
      const isStartPoint = base.pointIndex === 0;
      const staticPoint = isStartPoint ? base.origPoints[1] : base.origPoints[0];
      const movingPoint = isStartPoint ? base.origPoints[0] : base.origPoints[1];
      const rawNewPoint = {
        x: Math.max(0, Math.min(1, movingPoint.x + dxRatio)),
        y: Math.max(0, Math.min(1, movingPoint.y + dyRatio)),
      };
      const finalNewPoint = snapToHorizontalOrVertical(staticPoint, rawNewPoint);
      pendingUpdateRef.current = (prev) => {
        const idx = prev.findIndex((c) => c.id === icon.id);
        if (idx === -1) return prev;
        const next = [...prev];
        const newPoints = isStartPoint
          ? [finalNewPoint, staticPoint]
          : [staticPoint, finalNewPoint];
        next[idx] = {
          ...next[idx],
          points: newPoints,
        };
        return next;
      };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (pendingUpdateRef.current) {
            setClones(pendingUpdateRef.current);
            pendingUpdateRef.current = null;
          }
          rafRef.current = null;
        });
      }
    };
    const handleLineResizeRelease = () => {
      delete dragStart.current[`${icon.id}-resize`];
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingUpdateRef.current) {
        setClones(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
      if (saveClonesHistory) saveClonesHistory();
    };
    const responderProps = {
      onStartShouldSetResponderCapture: (e) => {
        return !isTouchOnOptionsButton(
          e.nativeEvent.pageX - (minX - touchMargin),
          e.nativeEvent.pageY - (minY - touchMargin),
        );
      },
      onStartShouldSetResponder: (e) => {
        return !isTouchOnOptionsButton(
          e.nativeEvent.pageX - (minX - touchMargin),
          e.nativeEvent.pageY - (minY - touchMargin),
        );
      },
      onMoveShouldSetResponder: () => canDrag,
      onResponderGrant: handleResponderGrant,
      onResponderMove: handleResponderMove,
      onResponderRelease: handleResponderRelease,
      onResponderTerminate: handleResponderRelease,
    };
    const generateTouchSegments = () => {
      const segments = [];
      const segmentSize = Math.max(8, touchTolerance);
      const numSegments = Math.max(2, Math.ceil(distance / segmentSize) + 1);
      for (let pointIndex = 0; pointIndex < numSegments; pointIndex++) {
        const t = numSegments === 1 ? 0.5 : pointIndex / (numSegments - 1);
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        segments.push(
          <View
            key={`straight-seg-${pointIndex}`}
            pointerEvents="auto"
            style={{
              position: 'absolute',
              left: x - minX + touchMargin - touchTolerance,
              top: y - minY + touchMargin - touchTolerance,
              width: touchTolerance * 2,
              height: touchTolerance * 2,
              backgroundColor: 'transparent',
              borderRadius: touchTolerance,
            }}
            {...responderProps}
          />,
        );
      }
      return segments;
    };
    return (
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: minX - touchMargin,
          top: minY - touchMargin,
          width: touchWidth,
          height: touchHeight,
          backgroundColor: 'transparent',
          zIndex: detectorZIndex,
        }}
      >
        {generateTouchSegments()}

        {/* Indicador visual para selecci�n m�ltiple en l�neas rectas */}
        {multiSelectMode && isSelected && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: '#3498db',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10001,
              borderWidth: 2,
              borderColor: '#fff',
            }}
          >
            <Feather name="check" size={10} color="#fff" />
          </View>
        )}

        {selectedCloneId === icon.id && !multiSelectMode && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              e.target.measure((x, y, width, height, pageX, pageY) => {
                setOptionsMenu({
                  visible: true,
                  position: {
                    x: pageX + width,
                    y: pageY + 40 + height / 2,
                  },
                  iconId: icon.id,
                  canRotate: true,
                  hideEdit: false,
                });
              });
            }}
            style={{
              position: 'absolute',
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#ffffff',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 1,
              },
              shadowOpacity: 0.2,
              shadowRadius: 1.5,
              elevation: 10,
              borderWidth: 1,
              borderColor: '#dddddd',
              zIndex: 10000,
              left: optionsButtonLeft,
              top: optionsButtonTop,
            }}
          >
            <Feather name="more-vertical" size={16} color="#444444" />
          </TouchableOpacity>
        )}

        {/* Resize handles at endpoints for straight lines and arrows */}
        {selectedCloneId === icon.id && !multiSelectMode && (
          <>
            {[
              {
                index: 0,
                cx: x1 - minX + touchMargin,
                cy: y1 - minY + touchMargin,
              },
              {
                index: 1,
                cx: x2 - minX + touchMargin,
                cy: y2 - minY + touchMargin,
              },
            ].map(({ index, cx, cy }) => (
              <View
                key={`resize-endpoint-${index}`}
                pointerEvents="auto"
                style={{
                  position: 'absolute',
                  left: cx - 14,
                  top: cy - 14,
                  width: 28,
                  height: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10001,
                }}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => handleLineResizeGrant(index, e)}
                onResponderMove={handleLineResizeMove}
                onResponderRelease={handleLineResizeRelease}
                onResponderTerminate={handleLineResizeRelease}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: '#fff',
                    borderWidth: 2,
                    borderColor: '#3498db',
                  }}
                />
              </View>
            ))}
          </>
        )}
      </View>
    );
  },
  (prevProps, nextProps) => {
    // Solo re-renderizar si cambian props relevantes
    return (
      prevProps.icon.id === nextProps.icon.id &&
      prevProps.icon.locked === nextProps.icon.locked &&
      prevProps.icon.thickness === nextProps.icon.thickness &&
      arraysEqual(prevProps.icon.points, nextProps.icon.points) &&
      prevProps.selectedCloneId === nextProps.selectedCloneId &&
      prevProps.multiSelectMode === nextProps.multiSelectMode &&
      prevProps.selectionInteractionMode === nextProps.selectionInteractionMode &&
      prevProps.isAnyDrawingMode === nextProps.isAnyDrawingMode &&
      prevProps.imageWidth === nextProps.imageWidth &&
      prevProps.imageHeight === nextProps.imageHeight &&
      prevProps.viewMode === nextProps.viewMode &&
      prevProps.selectedCloneIdsSet?.has(prevProps.icon.id) ===
        nextProps.selectedCloneIdsSet?.has(nextProps.icon.id)
    );
  },
);

// =====================================================
// COMPONENTE MEMOIZADO PARA DETECTORES DE LÍNEAS CURVAS
// =====================================================
export // =====================================================
// COMPONENTE MEMOIZADO PARA DETECTORES DE LÍNEAS CURVAS
// =====================================================
const MemoizedCurveLineDetector = React.memo(
  ({
    icon,
    imageWidth,
    imageHeight,
    viewMode,
    selectedCloneId,
    setSelectedCloneId,
    setClones,
    dragStart,
    clones,
    selectedCloneIds,
    selectedCloneIdsSet,
    multiSelectMode,
    selectionInteractionMode,
    setOptionsMenu,
    isAnyDrawingMode,
    originalIdx,
    saveClonesHistory,
    zoomLevel = 1,
    setEditingIcon,
    setLeftPanelVisible,
  }) => {
    if (!icon.points || icon.points.length < 2) return null;
    if (isAnyDrawingMode) return null;
    const rafRef = useRef(null);
    const pendingUpdateRef = useRef(null);
    const originalWidth = icon.imageWidth || imageWidth;
    const originalHeight = icon.imageHeight || imageHeight;
    const widthRatio = imageWidth / originalWidth;
    const heightRatio = imageHeight / originalHeight;
    const scale = (widthRatio + heightRatio) / 2;
    const pts = icon.points.map((p) => ratioToDisplay(p.x, p.y, viewMode, imageWidth, imageHeight));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const isSelected = selectedCloneIdsSet?.has(icon.id);
    const canDrag =
      !icon.locked &&
      !isAnyDrawingMode &&
      (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isSelected));
    const lineThickness = (icon.thickness || 2) * scale;
    const touchTolerance = Math.max(lineThickness / 2 + 12, 18);
    const touchMargin = 22;
    const touchWidth = maxX - minX + touchMargin * 2;
    const touchHeight = maxY - minY + touchMargin * 2;
    const detectorZIndex = icon.calculatedZIndex || ZINDEX_BASE_LINES + originalIdx;

    // Dimensiones del bot�n de opciones (3 puntos)
    const optionsButtonSize = 28;
    const optionsButtonLeft = touchWidth / 2 - 14;
    const optionsButtonTop = touchHeight / 2 - 14;

    // Funci�n para verificar si el toque est� en el �rea del bot�n de opciones
    const isTouchOnOptionsButton = (touchX, touchY) => {
      if (selectedCloneId !== icon.id || multiSelectMode) return false;
      const buttonCenterX = optionsButtonLeft + optionsButtonSize / 2;
      const buttonCenterY = optionsButtonTop + optionsButtonSize / 2;
      const dx = touchX - buttonCenterX;
      const dy = touchY - buttonCenterY;
      const distFromButton = Math.sqrt(dx * dx + dy * dy);
      return distFromButton <= optionsButtonSize / 2 + 5; // 5px de margen extra
    };

    // Handlers para arrastre
    const handleResponderGrant = (e) => {
      if (
        icon.id === boardInteractionState.tapId &&
        Date.now() - boardInteractionState.tapTime < 300
      ) {
        boardInteractionState.tapTime = 0;
        boardInteractionState.tapId = null;
        setEditingIcon(icon);
        setLeftPanelVisible(true);
        return;
      }
      boardInteractionState.tapTime = Date.now();
      boardInteractionState.tapId = icon.id;
      if (selectedCloneId && selectedCloneId !== icon.id) {
        setSelectedCloneId(null);
      }
      if (!canDrag) {
        if (!multiSelectMode) setSelectedCloneId(icon.id);
        return;
      }
      if (!acquireBoardDrag(dragStart, icon.id)) return;
      if (
        ALLOW_MULTI_ELEMENT_DRAG &&
        multiSelectMode &&
        selectionInteractionMode === 'move' &&
        isSelected
      ) {
        const initialPositions = {};
        selectedCloneIds.forEach((id) => {
          const c = clones.find((cl) => cl.id === id);
          if (!c) return;
          if (c.points && Array.isArray(c.points)) {
            initialPositions[id] = c.points.map((p) => ({
              x: p.x,
              y: p.y,
            }));
          } else {
            initialPositions[id] = {
              xRatio: c.xRatio,
              yRatio: c.yRatio,
            };
          }
        });
        dragStart.current[icon.id] = {
          multiSelect: true,
          selectedIds: [...selectedCloneIds],
          initialPositions,
          isValid: true,
          startX: e.nativeEvent.pageX,
          startY: e.nativeEvent.pageY,
        };
      } else {
        dragStart.current[icon.id] = {
          points: icon.points.map((p) => ({
            x: p.x,
            y: p.y,
          })),
          isValid: true,
          startX: e.nativeEvent.pageX,
          startY: e.nativeEvent.pageY,
        };
      }
    };
    const handleResponderMove = (e) => {
      if (!canDrag || !dragStart.current[icon.id]?.isValid || !isBoardDragOwner(dragStart, icon.id))
        return;
      const base = dragStart.current[icon.id];
      const { dxRatio: dx, dyRatio: dy } = deltaToRatio(
        (e.nativeEvent.pageX - base.startX) / zoomLevel,
        (e.nativeEvent.pageY - base.startY) / zoomLevel,
        viewMode,
        imageWidth,
        imageHeight,
      );
      if (base.multiSelect && base.selectedIds && base.initialPositions) {
        pendingUpdateRef.current = (prev) =>
          prev.map((c) => {
            if (!base.selectedIds.includes(c.id)) return c;
            const init = base.initialPositions[c.id];
            if (!init) return c;
            if (Array.isArray(init)) {
              return {
                ...c,
                points: init.map((pt) => ({
                  x: pt.x + dx,
                  y: pt.y + dy,
                })),
              };
            }
            return {
              ...c,
              xRatio: (init.xRatio || 0) + dx,
              yRatio: (init.yRatio || 0) + dy,
            };
          });
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            if (pendingUpdateRef.current) {
              setClones(pendingUpdateRef.current);
              pendingUpdateRef.current = null;
            }
            rafRef.current = null;
          });
        }
        return;
      }
      pendingUpdateRef.current = (prev) => {
        const correctIndex = prev.findIndex((c) => c.id === icon.id);
        if (correctIndex === -1) return prev;
        const next = [...prev];
        next[correctIndex] = {
          ...next[correctIndex],
          points: base.points.map((pt) => ({
            x: pt.x + dx,
            y: pt.y + dy,
          })),
        };
        return next;
      };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (pendingUpdateRef.current) {
            setClones(pendingUpdateRef.current);
            pendingUpdateRef.current = null;
          }
          rafRef.current = null;
        });
      }
    };
    const handleResponderRelease = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingUpdateRef.current) {
        setClones(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
      const base = dragStart.current[icon.id];
      if (base?.multiSelect && base.selectedIds) {
        // Multi-drag: eliminar TODOS los seleccionados que est�n fuera del campo
        setClones((prev) => {
          const remaining = prev.filter((c) => {
            if (!base.selectedIds.includes(c.id) || c.locked) return true;
            if (c.points && Array.isArray(c.points) && c.points.length >= 2) {
              return !areAllPointsOutside(c.points, viewMode, imageWidth, imageHeight);
            }
            if (c.xRatio !== undefined) {
              return !isOutsideVisibleField(c.xRatio, c.yRatio, viewMode, imageWidth, imageHeight);
            }
            return true;
          });
          return remaining.length < prev.length ? remaining : prev;
        });
      } else {
        // Single drag: solo eliminar esta l�nea
        setClones((prev) => {
          const currentClone = prev.find((c) => c.id === icon.id);
          if (currentClone && !currentClone.locked && currentClone.points) {
            if (areAllPointsOutside(currentClone.points, viewMode, imageWidth, imageHeight)) {
              return prev.filter((c) => c.id !== icon.id);
            }
          }
          return prev;
        });
      }
      delete dragStart.current[icon.id];
      releaseBoardDrag(dragStart, icon.id);
      if (!multiSelectMode) setSelectedCloneId(icon.id);
      // Guardar en historial al finalizar el drag
      if (saveClonesHistory) saveClonesHistory();
    };

    // Props comunes de responder
    const responderProps = {
      onStartShouldSetResponderCapture: (e) => {
        // No capturar si el toque est� en el bot�n de opciones
        return !isTouchOnOptionsButton(
          e.nativeEvent.pageX - (minX - touchMargin),
          e.nativeEvent.pageY - (minY - touchMargin),
        );
      },
      onStartShouldSetResponder: (e) => {
        // No capturar si el toque est� en el bot�n de opciones
        return !isTouchOnOptionsButton(
          e.nativeEvent.pageX - (minX - touchMargin),
          e.nativeEvent.pageY - (minY - touchMargin),
        );
      },
      onMoveShouldSetResponder: () => canDrag,
      onResponderGrant: handleResponderGrant,
      onResponderMove: handleResponderMove,
      onResponderRelease: handleResponderRelease,
      onResponderTerminate: handleResponderRelease,
    };

    // Generar segmentos de toque a lo largo de la curva
    // Cada segmento es un peque�o View posicionado sobre el trazado
    const generateTouchSegments = () => {
      const segments = [];
      const segmentSize = touchTolerance * 2;
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Crear un segmento por cada trozo del path
        const numSegments = Math.max(1, Math.ceil(length / segmentSize));
        for (let j = 0; j < numSegments; j++) {
          const t = numSegments === 1 ? 0.5 : j / (numSegments - 1 || 1);
          const x = p1.x + dx * t;
          const y = p1.y + dy * t;
          segments.push(
            <View
              key={`seg-${i}-${j}`}
              pointerEvents="auto"
              style={{
                position: 'absolute',
                left: x - minX + touchMargin - touchTolerance,
                top: y - minY + touchMargin - touchTolerance,
                width: touchTolerance * 2,
                height: touchTolerance * 2,
                backgroundColor: 'transparent',
                borderRadius: touchTolerance,
              }}
              {...responderProps}
            />,
          );
        }
      }
      return segments;
    };
    return (
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: minX - touchMargin,
          top: minY - touchMargin,
          width: touchWidth,
          height: touchHeight,
          backgroundColor: 'transparent',
          zIndex: detectorZIndex,
        }}
      >
        {/* Segmentos de toque a lo largo de la curva */}
        {generateTouchSegments()}

        {/* Indicador visual para selecci�n m�ltiple */}
        {multiSelectMode && isSelected && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: '#3498db',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10001,
              borderWidth: 2,
              borderColor: '#fff',
            }}
          >
            <Feather name="check" size={10} color="#fff" />
          </View>
        )}

        {/* Bot�n de men� cuando est� seleccionado */}
        {selectedCloneId === icon.id && !multiSelectMode && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              e.target.measure((x, y, width, height, pageX, pageY) => {
                setOptionsMenu({
                  visible: true,
                  position: {
                    x: pageX + width,
                    y: pageY + 40 + height / 2,
                  },
                  iconId: icon.id,
                  canRotate: true,
                  hideEdit: false,
                });
              });
            }}
            style={{
              position: 'absolute',
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#ffffff',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 1,
              },
              shadowOpacity: 0.2,
              shadowRadius: 1.5,
              elevation: 10,
              borderWidth: 1,
              borderColor: '#dddddd',
              zIndex: 10000,
              left: touchWidth / 2 - 14,
              top: touchHeight / 2 - 14,
            }}
          >
            <Feather name="more-vertical" size={16} color="#444444" />
          </TouchableOpacity>
        )}
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.icon.id === nextProps.icon.id &&
      prevProps.icon.locked === nextProps.icon.locked &&
      prevProps.icon.thickness === nextProps.icon.thickness &&
      arraysEqual(prevProps.icon.points, nextProps.icon.points) &&
      prevProps.selectedCloneId === nextProps.selectedCloneId &&
      prevProps.multiSelectMode === nextProps.multiSelectMode &&
      prevProps.selectionInteractionMode === nextProps.selectionInteractionMode &&
      prevProps.isAnyDrawingMode === nextProps.isAnyDrawingMode &&
      prevProps.imageWidth === nextProps.imageWidth &&
      prevProps.imageHeight === nextProps.imageHeight &&
      prevProps.viewMode === nextProps.viewMode &&
      prevProps.selectedCloneIdsSet?.has(prevProps.icon.id) ===
        nextProps.selectedCloneIdsSet?.has(nextProps.icon.id)
    );
  },
);

// =====================================================
// COMPONENTES SVG MEMOIZADOS PARA CÍRCULOS Y RECTÁNGULOS
// =====================================================

// Círculo SVG memoizado - solo renderiza el SVG
