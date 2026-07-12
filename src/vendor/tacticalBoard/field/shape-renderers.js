import React, { useRef, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Path, Rect, Ellipse, G, Text as SvgText } from 'react-native-svg';
import {
  ratioToDisplay,
  deltaToRatio,
  isOutsideVisibleField,
  areAllPointsOutside,
} from '../fields';
import { arraysEqual, clampDrawProgress } from './line-renderers';
import { ZINDEX_BASE_LINES, acquireBoardDrag, isBoardDragOwner, releaseBoardDrag } from './config';
import { TouchableOpacity, boardInteractionState } from './primitives';
import {
  ALLOW_MULTI_ELEMENT_DRAG,
  applyBoardDragSnapshot,
  createBoardDragSnapshot,
  getDisplayBoxFromRatioPoints,
  getRatioPointsFromDisplayBox,
  getResponderLocalPoint,
  hasVisibleFill,
  isEllipseBorderTouch,
  isPolygonBorderTouch,
  isRectangleBorderTouch,
  resizeDisplayBoxFromHandle,
} from './geometry';
export // =====================================================
// COMPONENTES SVG MEMOIZADOS PARA CÍRCULOS Y RECTÁNGULOS
// =====================================================

// Círculo SVG memoizado - solo renderiza el SVG
const MemoizedCircleSvg = React.memo(
  ({
    id,
    centerX,
    centerY,
    rx,
    ry,
    color,
    thickness,
    fillColor,
    lineType,
    dotSize,
    dotSpacing,
    isMultiSelected,
    diameter_w_m,
    diameter_h_m,
    isSelected,
    imageWidth,
    imageHeight,
    drawProgress,
  }) => {
    const progress = clampDrawProgress(drawProgress);
    const approxCircumference = Math.PI * 2 * Math.max(rx, ry);
    const dashArray =
      progress < 1
        ? `${approxCircumference * progress},${approxCircumference}`
        : lineType === 'dotted'
          ? `${dotSize || 2},${dotSpacing || 4}`
          : null;
    const showDimensions =
      progress >= 1 &&
      isSelected &&
      diameter_w_m !== undefined &&
      diameter_h_m !== undefined &&
      diameter_w_m > 0 &&
      diameter_h_m > 0;
    let labelText = '';
    let labelWidth = 0;
    let labelHeight = 0;
    let labelX = 0;
    let labelY = 0;
    let fontSize = 0;
    if (showDimensions) {
      const equal = Math.abs(diameter_w_m - diameter_h_m) < 0.05;
      labelText = equal
        ? `D: ${diameter_w_m.toFixed(1)}m`
        : `D: ${diameter_w_m.toFixed(1)}m x ${diameter_h_m.toFixed(1)}m`;
      fontSize = Math.max(10, Math.min(14, (imageWidth || 800) * 0.015));
      labelWidth = labelText.length * fontSize * 0.6 + 12;
      labelHeight = fontSize + 10;
      labelX = 16;
      labelY = (imageHeight || 600) - labelHeight - 16;
    }
    return (
      <G>
        <Ellipse
          key={`circle-${id}-${lineType || 'solid'}-${dotSize || 2}-${dotSpacing || 4}`}
          cx={centerX}
          cy={centerY}
          rx={rx}
          ry={ry}
          stroke={isMultiSelected ? '#3498db' : color}
          strokeWidth={thickness}
          fill={
            progress >= 1 && fillColor && fillColor !== 'transparent'
              ? `${fillColor}99`
              : 'transparent'
          }
          strokeDasharray={dashArray}
        />
        {showDimensions && (
          <G>
            <Rect
              x={labelX}
              y={labelY}
              width={labelWidth}
              height={labelHeight}
              fill="rgba(15, 23, 42, 0.9)"
              rx={6}
              ry={6}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={1}
            />
            <SvgText
              x={labelX + 6}
              y={labelY + fontSize + 3}
              fill="#ffffff"
              fontSize={fontSize}
              fontWeight="bold"
              textAnchor="start"
            >
              {labelText}
            </SvgText>
          </G>
        )}
      </G>
    );
  },
  (prev, next) =>
    prev.id === next.id &&
    prev.centerX === next.centerX &&
    prev.centerY === next.centerY &&
    prev.rx === next.rx &&
    prev.ry === next.ry &&
    prev.color === next.color &&
    prev.thickness === next.thickness &&
    prev.fillColor === next.fillColor &&
    prev.lineType === next.lineType &&
    prev.dotSize === next.dotSize &&
    prev.dotSpacing === next.dotSpacing &&
    prev.isMultiSelected === next.isMultiSelected &&
    prev.diameter_w_m === next.diameter_w_m &&
    prev.diameter_h_m === next.diameter_h_m &&
    prev.isSelected === next.isSelected &&
    prev.imageWidth === next.imageWidth &&
    prev.imageHeight === next.imageHeight &&
    prev.drawProgress === next.drawProgress,
);

// Rectángulo SVG memoizado - solo renderiza el SVG
export // Rectángulo SVG memoizado - solo renderiza el SVG
const MemoizedRectangleSvg = React.memo(
  ({
    id,
    x,
    y,
    width,
    height,
    color,
    thickness,
    fillColor,
    lineType,
    dotSize,
    dotSpacing,
    isMultiSelected,
    width_m,
    height_m,
    isSelected,
    imageWidth,
    imageHeight,
  }) => {
    const dashArray = lineType === 'dotted' ? `${dotSize || 2},${dotSpacing || 4}` : null;
    const showDimensions =
      isSelected && width_m !== undefined && height_m !== undefined && width_m > 0 && height_m > 0;
    let labelText = '';
    let labelWidth = 0;
    let labelHeight = 0;
    let labelX = 0;
    let labelY = 0;
    let fontSize = 0;
    if (showDimensions) {
      labelText = `${width_m.toFixed(1)}m x ${height_m.toFixed(1)}m`;
      fontSize = Math.max(10, Math.min(14, (imageWidth || 800) * 0.015));
      labelWidth = labelText.length * fontSize * 0.6 + 12;
      labelHeight = fontSize + 10;
      labelX = 16;
      labelY = (imageHeight || 600) - labelHeight - 16;
    }
    return (
      <G>
        <Rect
          key={`rect-${id}-${lineType || 'solid'}-${dotSize || 2}-${dotSpacing || 4}`}
          x={x}
          y={y}
          width={width}
          height={height}
          stroke={isMultiSelected ? '#3498db' : color}
          strokeWidth={thickness}
          fill={fillColor && fillColor !== 'transparent' ? `${fillColor}99` : 'transparent'}
          strokeDasharray={dashArray}
        />
        {showDimensions && (
          <G>
            <Rect
              x={labelX}
              y={labelY}
              width={labelWidth}
              height={labelHeight}
              fill="rgba(15, 23, 42, 0.9)"
              rx={6}
              ry={6}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={1}
            />
            <SvgText
              x={labelX + 6}
              y={labelY + fontSize + 3}
              fill="#ffffff"
              fontSize={fontSize}
              fontWeight="bold"
              textAnchor="start"
            >
              {labelText}
            </SvgText>
          </G>
        )}
      </G>
    );
  },
  (prev, next) =>
    prev.id === next.id &&
    prev.x === next.x &&
    prev.y === next.y &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.color === next.color &&
    prev.thickness === next.thickness &&
    prev.fillColor === next.fillColor &&
    prev.lineType === next.lineType &&
    prev.dotSize === next.dotSize &&
    prev.dotSpacing === next.dotSpacing &&
    prev.isMultiSelected === next.isMultiSelected &&
    prev.width_m === next.width_m &&
    prev.height_m === next.height_m &&
    prev.isSelected === next.isSelected &&
    prev.imageWidth === next.imageWidth &&
    prev.imageHeight === next.imageHeight,
);

// Custom Shape SVG memoizado
export // Custom Shape SVG memoizado
const MemoizedCustomShapeSvg = React.memo(
  ({
    id,
    pathData,
    color,
    thickness,
    fillColor,
    lineType,
    dotSize,
    dotSpacing,
    isMultiSelected,
  }) => {
    const dashArray = lineType === 'dotted' ? `${dotSize || 2},${dotSpacing || 4}` : null;
    return (
      <Path
        key={`cs-${id}-${lineType || 'solid'}-${dotSize || 2}-${dotSpacing || 4}`}
        d={pathData}
        stroke={isMultiSelected ? '#3498db' : color}
        strokeWidth={thickness}
        fill={fillColor && fillColor !== 'transparent' ? `${fillColor}99` : 'transparent'}
        strokeDasharray={dashArray}
        strokeLinejoin="round"
      />
    );
  },
  (prev, next) =>
    prev.id === next.id &&
    prev.pathData === next.pathData &&
    prev.color === next.color &&
    prev.thickness === next.thickness &&
    prev.fillColor === next.fillColor &&
    prev.lineType === next.lineType &&
    prev.dotSize === next.dotSize &&
    prev.dotSpacing === next.dotSpacing &&
    prev.isMultiSelected === next.isMultiSelected,
);

// Batch renderer para todas las figuras geométricas
export // Batch renderer para todas las figuras geométricas
const BatchShapesRenderer = React.memo(
  ({
    circles,
    rectangles,
    customShapes,
    imageWidth,
    imageHeight,
    selectedCloneIdsSet,
    selectedCloneId,
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

    // Pre-calcular datos de círculos
    const circleData = useMemo(() => {
      return circles
        .map((icon) => {
          if (!icon.points || icon.points.length !== 2) return null;
          const originalWidth = icon.imageWidth || imageWidth;
          const originalHeight = icon.imageHeight || imageHeight;
          const scale = (imageWidth / originalWidth + imageHeight / originalHeight) / 2;
          const p1 = tp(icon.points[0].x, icon.points[0].y);
          const p2 = tp(icon.points[1].x, icon.points[1].y);
          const p1x = p1.x;
          const p1y = p1.y;
          const p2x = p2.x;
          const p2y = p2.y;
          const centerX = (p1x + p2x) / 2;
          const centerY = (p1y + p2y) / 2;
          const rx = Math.abs(p2x - p1x) / 2;
          const ry = Math.abs(p2y - p1y) / 2;
          const thickness = (icon.thickness || 1) * scale * 0.7;
          const dx_ratio = Math.abs(icon.points[1].x - icon.points[0].x);
          const dy_ratio = Math.abs(icon.points[1].y - icon.points[0].y);
          const diameter_w_m = dx_ratio * 105;
          const diameter_h_m = dy_ratio * 68;
          return {
            id: icon.id,
            shapeType: 'circle',
            zIndex: icon.zIndex || 0,
            centerX,
            centerY,
            rx,
            ry,
            color: icon.color || '#2980b9',
            thickness,
            fillColor: icon.fillColor,
            lineType: icon.lineType,
            dotSize: icon.dotSize,
            dotSpacing: icon.dotSpacing,
            isMultiSelected: multiSelectMode && selectedCloneIdsSet?.has(icon.id),
            isSelected: multiSelectMode
              ? selectedCloneIdsSet?.has(icon.id)
              : selectedCloneId === icon.id,
            imageWidth,
            imageHeight,
            diameter_w_m,
            diameter_h_m,
            drawProgress: icon._drawProgress,
          };
        })
        .filter(Boolean);
    }, [
      circles,
      imageWidth,
      imageHeight,
      selectedCloneIdsSet,
      selectedCloneId,
      multiSelectMode,
      tp,
    ]);

    // Pre-calcular datos de rectángulos
    const rectangleData = useMemo(() => {
      return rectangles
        .map((icon) => {
          if (!icon.points || icon.points.length !== 2) return null;
          const originalWidth = icon.imageWidth || imageWidth;
          const originalHeight = icon.imageHeight || imageHeight;
          const scale = (imageWidth / originalWidth + imageHeight / originalHeight) / 2;
          const p1 = tp(icon.points[0].x, icon.points[0].y);
          const p2 = tp(icon.points[1].x, icon.points[1].y);
          const p1x = p1.x;
          const p1y = p1.y;
          const p2x = p2.x;
          const p2y = p2.y;
          const x = Math.min(p1x, p2x);
          const y = Math.min(p1y, p2y);
          const width = Math.abs(p2x - p1x);
          const height = Math.abs(p2y - p1y);
          const thickness = (icon.thickness || 1) * scale * 0.7;
          const dx_ratio = Math.abs(icon.points[1].x - icon.points[0].x);
          const dy_ratio = Math.abs(icon.points[1].y - icon.points[0].y);
          const width_m = dx_ratio * 105;
          const height_m = dy_ratio * 68;
          return {
            id: icon.id,
            shapeType: 'rectangle',
            zIndex: icon.zIndex || 0,
            x,
            y,
            width,
            height,
            color: icon.color || '#2980b9',
            thickness,
            fillColor: icon.fillColor,
            lineType: icon.lineType,
            dotSize: icon.dotSize,
            dotSpacing: icon.dotSpacing,
            isMultiSelected: multiSelectMode && selectedCloneIdsSet?.has(icon.id),
            isSelected: multiSelectMode
              ? selectedCloneIdsSet?.has(icon.id)
              : selectedCloneId === icon.id,
            imageWidth,
            imageHeight,
            width_m,
            height_m,
          };
        })
        .filter(Boolean);
    }, [
      rectangles,
      imageWidth,
      imageHeight,
      selectedCloneIdsSet,
      selectedCloneId,
      multiSelectMode,
      tp,
    ]);

    // Pre-calcular datos de custom shapes
    const customShapeData = useMemo(() => {
      return customShapes
        .map((icon) => {
          if (!icon.points || icon.points.length < 3 || !icon.isCustomShapeComplete) return null;
          const originalWidth = icon.imageWidth || imageWidth;
          const originalHeight = icon.imageHeight || imageHeight;
          const scale = (imageWidth / originalWidth + imageHeight / originalHeight) / 2;
          const pts = icon.points.map((p) => tp(p.x, p.y));
          const pathData = `M${pts.map((p) => `${p.x},${p.y}`).join(' L')} Z`;
          const thickness = (icon.thickness || 1) * scale * 0.7;
          return {
            id: icon.id,
            shapeType: 'custom-shape',
            zIndex: icon.zIndex || 0,
            pathData,
            color: icon.color || '#2980b9',
            thickness,
            fillColor: icon.fillColor,
            lineType: icon.lineType,
            dotSize: icon.dotSize,
            dotSpacing: icon.dotSpacing,
            isMultiSelected: multiSelectMode && selectedCloneIdsSet?.has(icon.id),
          };
        })
        .filter(Boolean);
    }, [customShapes, imageWidth, imageHeight, selectedCloneIdsSet, multiSelectMode, tp]);

    // Combinar todas las figuras y ordenar por zIndex para renderizado correcto
    const allShapes = useMemo(() => {
      const shapes = [...circleData, ...rectangleData, ...customShapeData];
      shapes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      return shapes;
    }, [circleData, rectangleData, customShapeData]);
    return (
      <G>
        {allShapes.map((data) => {
          if (data.shapeType === 'circle')
            return <MemoizedCircleSvg key={`c-${data.id}`} {...data} />;
          if (data.shapeType === 'rectangle')
            return <MemoizedRectangleSvg key={`r-${data.id}`} {...data} />;
          return <MemoizedCustomShapeSvg key={`cs-${data.id}`} {...data} />;
        })}
      </G>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.selectedCloneId !== nextProps.selectedCloneId) return false;
    if (prevProps.selectedCloneIdsSet !== nextProps.selectedCloneIdsSet) return false;
    if (prevProps.viewMode !== nextProps.viewMode) return false;
    if (prevProps.circles.length !== nextProps.circles.length) return false;
    if (prevProps.rectangles.length !== nextProps.rectangles.length) return false;
    if (prevProps.customShapes.length !== nextProps.customShapes.length) return false;
    if (prevProps.imageWidth !== nextProps.imageWidth) return false;
    if (prevProps.imageHeight !== nextProps.imageHeight) return false;
    if (prevProps.multiSelectMode !== nextProps.multiSelectMode) return false;

    // Comparar c�rculos
    for (let i = 0; i < prevProps.circles.length; i++) {
      const prev = prevProps.circles[i];
      const next = nextProps.circles[i];
      if (
        prev.id !== next.id ||
        prev.color !== next.color ||
        prev.thickness !== next.thickness ||
        prev.fillColor !== next.fillColor ||
        prev.lineType !== next.lineType ||
        prev.dotSize !== next.dotSize ||
        prev.dotSpacing !== next.dotSpacing ||
        prev._drawProgress !== next._drawProgress ||
        prev.zIndex !== next.zIndex ||
        !arraysEqual(prev.points, next.points)
      )
        return false;
    }

    // Comparar rect�ngulos
    for (let i = 0; i < prevProps.rectangles.length; i++) {
      const prev = prevProps.rectangles[i];
      const next = nextProps.rectangles[i];
      if (
        prev.id !== next.id ||
        prev.color !== next.color ||
        prev.thickness !== next.thickness ||
        prev.fillColor !== next.fillColor ||
        prev.lineType !== next.lineType ||
        prev.dotSize !== next.dotSize ||
        prev.dotSpacing !== next.dotSpacing ||
        prev.zIndex !== next.zIndex ||
        !arraysEqual(prev.points, next.points)
      )
        return false;
    }

    // Comparar custom shapes
    for (let i = 0; i < prevProps.customShapes.length; i++) {
      const prev = prevProps.customShapes[i];
      const next = nextProps.customShapes[i];
      if (
        prev.id !== next.id ||
        prev.color !== next.color ||
        prev.thickness !== next.thickness ||
        prev.fillColor !== next.fillColor ||
        prev.lineType !== next.lineType ||
        prev.dotSize !== next.dotSize ||
        prev.dotSpacing !== next.dotSpacing ||
        prev.zIndex !== next.zIndex ||
        !arraysEqual(prev.points, next.points)
      )
        return false;
    }
    return true;
  },
);

// =====================================================
// DETECTORES MEMOIZADOS PARA FIGURAS GEOMÉTRICAS
// =====================================================

// Detector memoizado para c�rculos
export // =====================================================
// DETECTORES MEMOIZADOS PARA FIGURAS GEOMÉTRICAS
// =====================================================

// Detector memoizado para c�rculos
const MemoizedCircleDetector = React.memo(
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
    renderScale,
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
    const scale = (imageWidth / originalWidth + imageHeight / originalHeight) / 2;
    const { x: p1x, y: p1y } = ratioToDisplay(
      icon.points[0].x,
      icon.points[0].y,
      viewMode,
      imageWidth,
      imageHeight,
    );
    const { x: p2x, y: p2y } = ratioToDisplay(
      icon.points[1].x,
      icon.points[1].y,
      viewMode,
      imageWidth,
      imageHeight,
    );
    const centerX = (p1x + p2x) / 2;
    const centerY = (p1y + p2y) / 2;
    const rx = Math.abs(p2x - p1x) / 2;
    const ry = Math.abs(p2y - p1y) / 2;
    const thickness = (icon.thickness || 1) * scale * 0.7;
    const touchTolerance = Math.max(thickness / 2 + 12, 18);
    const touchMargin = 22;
    const isSelected = selectedCloneIdsSet?.has(icon.id);
    const canDrag =
      !icon.locked &&
      !isAnyDrawingMode &&
      (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isSelected));
    const detectorZIndex = icon.calculatedZIndex || ZINDEX_BASE_LINES;

    // Bounding box del c�rculo
    const minX = centerX - rx;
    const minY = centerY - ry;
    const touchWidth = rx * 2 + touchMargin * 2;
    const touchHeight = ry * 2 + touchMargin * 2;

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
            initialPositions[id] = {
              points: c.points.map((p) => ({
                x: p.x,
                y: p.y,
              })),
            };
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
      const { dxRatio: ddx, dyRatio: ddy } = deltaToRatio(
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
            if (init.points && Array.isArray(init.points)) {
              return {
                ...c,
                points: init.points.map((pt) => ({
                  x: pt.x + ddx,
                  y: pt.y + ddy,
                })),
              };
            }
            return {
              ...c,
              xRatio: (init.xRatio || 0) + ddx,
              yRatio: (init.yRatio || 0) + ddy,
            };
          });
      } else {
        pendingUpdateRef.current = (prev) => {
          const idx = prev.findIndex((c) => c.id === icon.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            points: base.points.map((pt) => ({
              x: pt.x + ddx,
              y: pt.y + ddy,
            })),
          };
          return next;
        };
      }
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

    // Resize handlers for circle/ellipse bounds
    const handleCircleResizeGrant = (handle, e) => {
      dragStart.current[`${icon.id}-resize`] = {
        handle,
        startX: e.nativeEvent.pageX,
        startY: e.nativeEvent.pageY,
        origBox: getDisplayBoxFromRatioPoints(icon.points, viewMode, imageWidth, imageHeight),
      };
    };
    const handleCircleResizeMove = (e) => {
      const base = dragStart.current[`${icon.id}-resize`];
      if (!base) return;
      const nextBox = resizeDisplayBoxFromHandle(
        base.origBox,
        base.handle,
        (e.nativeEvent.pageX - base.startX) / zoomLevel,
        (e.nativeEvent.pageY - base.startY) / zoomLevel,
        imageWidth,
        imageHeight,
        14,
      );
      const nextPoints = getRatioPointsFromDisplayBox(nextBox, viewMode, imageWidth, imageHeight);
      pendingUpdateRef.current = (prev) => {
        const idx = prev.findIndex((c) => c.id === icon.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          points: nextPoints,
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
    const handleCircleResizeRelease = () => {
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
    const isCircleResponderHit = (e, offsetX = 0, offsetY = 0) => {
      const point = getResponderLocalPoint(e, offsetX, offsetY);
      const centerLocalX = touchMargin + rx;
      const centerLocalY = touchMargin + ry;
      return isEllipseBorderTouch(
        point.x,
        point.y,
        centerLocalX,
        centerLocalY,
        rx,
        ry,
        touchTolerance,
      );
    };

    // Props comunes de responder
    const responderProps = {
      onStartShouldSetResponder: (e) => isCircleResponderHit(e),
      onMoveShouldSetResponder: (e) => canDrag && isCircleResponderHit(e),
      onResponderGrant: handleResponderGrant,
      onResponderMove: handleResponderMove,
      onResponderRelease: handleResponderRelease,
      onResponderTerminate: handleResponderRelease,
    };

    // Generar segmentos de toque a lo largo del per�metro del c�rculo
    const generateTouchSegments = () => {
      const segments = [];
      const segmentSize = touchTolerance * 2;

      // Calcular cu�ntos segmentos necesitamos para cubrir todo el per�metro
      const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
      const numSegments = Math.max(12, Math.ceil(perimeter / segmentSize));
      for (let i = 0; i < numSegments; i++) {
        const angle = (i / numSegments) * 2 * Math.PI;
        // Posici�n en el per�metro del c�rculo
        const x = centerX + Math.cos(angle) * rx;
        const y = centerY + Math.sin(angle) * ry;
        const segmentLeft = x - minX + touchMargin - touchTolerance;
        const segmentTop = y - minY + touchMargin - touchTolerance;
        segments.push(
          <View
            key={`seg-${i}`}
            pointerEvents="auto"
            style={{
              position: 'absolute',
              left: segmentLeft,
              top: segmentTop,
              width: touchTolerance * 2,
              height: touchTolerance * 2,
              backgroundColor: 'transparent',
              borderRadius: touchTolerance,
            }}
            {...{
              ...responderProps,
              onStartShouldSetResponder: (e) => isCircleResponderHit(e, segmentLeft, segmentTop),
              onMoveShouldSetResponder: (e) =>
                canDrag && isCircleResponderHit(e, segmentLeft, segmentTop),
            }}
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
        {/* Segmentos de toque a lo largo del permetro del crculo */}
        {generateTouchSegments()}

        {/* Resize handles en los puntos cardinales del crculo */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: touchWidth,
            height: touchHeight,
            backgroundColor: 'transparent',
          }}
          {...responderProps}
        />

        {selectedCloneId === icon.id && !multiSelectMode && (
          <>
            {[
              {
                handle: 'tl',
                cx: touchMargin,
                cy: touchMargin,
              },
              {
                handle: 'top',
                cx: touchMargin + rx,
                cy: touchMargin,
              },
              {
                handle: 'tr',
                cx: touchMargin + rx * 2,
                cy: touchMargin,
              },
              {
                handle: 'right',
                cx: touchMargin + rx * 2,
                cy: touchMargin + ry,
              },
              {
                handle: 'br',
                cx: touchMargin + rx * 2,
                cy: touchMargin + ry * 2,
              },
              {
                handle: 'bottom',
                cx: touchMargin + rx,
                cy: touchMargin + ry * 2,
              },
              {
                handle: 'bl',
                cx: touchMargin,
                cy: touchMargin + ry * 2,
              },
              {
                handle: 'left',
                cx: touchMargin,
                cy: touchMargin + ry,
              },
            ].map(({ handle, cx, cy }) => (
              <View
                key={`resize-${handle}`}
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
                onResponderGrant={(e) => handleCircleResizeGrant(handle, e)}
                onResponderMove={handleCircleResizeMove}
                onResponderRelease={handleCircleResizeRelease}
                onResponderTerminate={handleCircleResizeRelease}
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

        {/* Indicador visual para seleccin mltiple en crculos */}
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
                  canRotate: false,
                  hideEdit: false,
                });
              });
            }}
            style={{
              position: 'absolute',
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 10,
              borderWidth: 1,
              borderColor: '#ddd',
              zIndex: 10000,
              right: -14,
              top: touchHeight / 2 - 14,
            }}
          >
            <Feather name="more-vertical" size={16} color="#444" />
          </TouchableOpacity>
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.icon.id === next.icon.id &&
    prev.icon.locked === next.icon.locked &&
    prev.icon.thickness === next.icon.thickness &&
    arraysEqual(prev.icon.points, next.icon.points) &&
    prev.selectedCloneId === next.selectedCloneId &&
    prev.multiSelectMode === next.multiSelectMode &&
    prev.selectionInteractionMode === next.selectionInteractionMode &&
    prev.isAnyDrawingMode === next.isAnyDrawingMode &&
    prev.imageWidth === next.imageWidth &&
    prev.imageHeight === next.imageHeight &&
    prev.viewMode === next.viewMode &&
    prev.selectedCloneIdsSet?.has(prev.icon.id) === next.selectedCloneIdsSet?.has(next.icon.id),
);

// Detector memoizado para rectngulos - Solo detecta toques en los BORDES
export // Detector memoizado para rectngulos - Solo detecta toques en los BORDES
const MemoizedRectangleDetector = React.memo(
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
    renderScale,
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
    const scale = (imageWidth / originalWidth + imageHeight / originalHeight) / 2;
    const { x: p1x, y: p1y } = ratioToDisplay(
      icon.points[0].x,
      icon.points[0].y,
      viewMode,
      imageWidth,
      imageHeight,
    );
    const { x: p2x, y: p2y } = ratioToDisplay(
      icon.points[1].x,
      icon.points[1].y,
      viewMode,
      imageWidth,
      imageHeight,
    );
    const minX = Math.min(p1x, p2x);
    const minY = Math.min(p1y, p2y);
    const width = Math.abs(p2x - p1x);
    const height = Math.abs(p2y - p1y);
    const thickness = (icon.thickness || 1) * scale * 0.7;
    const touchTolerance = Math.max(thickness / 2 + 12, 18);
    const centerY = minY + height / 2;
    const isSelected = selectedCloneIdsSet?.has(icon.id);
    const hasFill = hasVisibleFill(icon.fillColor);
    const canDrag =
      !icon.locked &&
      !isAnyDrawingMode &&
      (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isSelected));
    const detectorZIndex = icon.calculatedZIndex || ZINDEX_BASE_LINES;
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
            initialPositions[id] = {
              points: c.points.map((p) => ({
                x: p.x,
                y: p.y,
              })),
            };
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
      const { dxRatio: ddx, dyRatio: ddy } = deltaToRatio(
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
            if (init.points && Array.isArray(init.points)) {
              return {
                ...c,
                points: init.points.map((pt) => ({
                  x: pt.x + ddx,
                  y: pt.y + ddy,
                })),
              };
            }
            return {
              ...c,
              xRatio: (init.xRatio || 0) + ddx,
              yRatio: (init.yRatio || 0) + ddy,
            };
          });
      } else {
        pendingUpdateRef.current = (prev) => {
          const idx = prev.findIndex((c) => c.id === icon.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            points: base.points.map((pt) => ({
              x: pt.x + ddx,
              y: pt.y + ddy,
            })),
          };
          return next;
        };
      }
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

    // Resize handlers for corner drag
    const handleResizeGrant = (corner, e) => {
      dragStart.current[`${icon.id}-resize`] = {
        corner,
        startX: e.nativeEvent.pageX,
        startY: e.nativeEvent.pageY,
        origBox: getDisplayBoxFromRatioPoints(icon.points, viewMode, imageWidth, imageHeight),
      };
    };
    const handleResizeMove = (e) => {
      const base = dragStart.current[`${icon.id}-resize`];
      if (!base) return;
      const nextBox = resizeDisplayBoxFromHandle(
        base.origBox,
        base.corner,
        (e.nativeEvent.pageX - base.startX) / zoomLevel,
        (e.nativeEvent.pageY - base.startY) / zoomLevel,
        imageWidth,
        imageHeight,
        14,
      );
      const nextPoints = getRatioPointsFromDisplayBox(nextBox, viewMode, imageWidth, imageHeight);
      pendingUpdateRef.current = (prev) => {
        const idx = prev.findIndex((c) => c.id === icon.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          points: nextPoints,
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
    const handleResizeRelease = () => {
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

    // Estilo base para las bandas de borde
    const edgeBandStyle = {
      position: 'absolute',
      backgroundColor: 'transparent',
    };
    const isRectangleResponderHit = (e, offsetX = 0, offsetY = 0) => {
      const point = getResponderLocalPoint(e, offsetX, offsetY);
      const rectX = touchTolerance;
      const rectY = touchTolerance;
      return isRectangleBorderTouch(point.x, point.y, rectX, rectY, width, height, touchTolerance);
    };
    const rectangleResponderProps = {
      onStartShouldSetResponder: (e) => isRectangleResponderHit(e),
      onMoveShouldSetResponder: (e) => canDrag && isRectangleResponderHit(e),
      onResponderGrant: handleResponderGrant,
      onResponderMove: handleResponderMove,
      onResponderRelease: handleResponderRelease,
      onResponderTerminate: handleResponderRelease,
    };
    const makeEdgeResponderProps = (offsetX = 0, offsetY = 0) => ({
      onStartShouldSetResponder: (e) => {
        const point = getResponderLocalPoint(e, offsetX, offsetY);
        return isRectangleBorderTouch(
          point.x,
          point.y,
          touchTolerance,
          touchTolerance,
          width,
          height,
          touchTolerance,
        );
      },
      onMoveShouldSetResponder: (e) => {
        const point = getResponderLocalPoint(e, offsetX, offsetY);
        return (
          canDrag &&
          isRectangleBorderTouch(
            point.x,
            point.y,
            touchTolerance,
            touchTolerance,
            width,
            height,
            touchTolerance,
          )
        );
      },
      onResponderGrant: handleResponderGrant,
      onResponderMove: handleResponderMove,
      onResponderRelease: handleResponderRelease,
      onResponderTerminate: handleResponderRelease,
    });

    // Props comunes de responder para las bandas
    const topEdgeResponderProps = makeEdgeResponderProps(0, 0);
    const bottomEdgeResponderProps = makeEdgeResponderProps(0, height);
    const leftEdgeResponderProps = makeEdgeResponderProps(0, touchTolerance * 2);
    const rightEdgeResponderProps = makeEdgeResponderProps(width, touchTolerance * 2);
    return (
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: minX - touchTolerance,
          top: minY - touchTolerance,
          width: width + touchTolerance * 2,
          height: height + touchTolerance * 2,
          backgroundColor: 'transparent',
          zIndex: detectorZIndex,
        }}
      >
        <View
          pointerEvents="none"
          style={[
            edgeBandStyle,
            {
              left: 0,
              top: 0,
              width: width + touchTolerance * 2,
              height: height + touchTolerance * 2,
            },
          ]}
          {...rectangleResponderProps}
        />

        {/* Banda superior */}
        <View
          pointerEvents="auto"
          style={[
            edgeBandStyle,
            {
              left: 0,
              top: 0,
              width: width + touchTolerance * 2,
              height: touchTolerance * 2,
            },
          ]}
          {...topEdgeResponderProps}
        />

        {/* Banda inferior */}
        <View
          pointerEvents="auto"
          style={[
            edgeBandStyle,
            {
              left: 0,
              bottom: 0,
              width: width + touchTolerance * 2,
              height: touchTolerance * 2,
            },
          ]}
          {...bottomEdgeResponderProps}
        />

        {/* Banda izquierda (solo la parte central, para no superponer con superior/inferior) */}
        <View
          pointerEvents="auto"
          style={[
            edgeBandStyle,
            {
              left: 0,
              top: touchTolerance * 2,
              width: touchTolerance * 2,
              height: height - touchTolerance * 2,
            },
          ]}
          {...leftEdgeResponderProps}
        />

        {/* Banda derecha (solo la parte central) */}
        <View
          pointerEvents="auto"
          style={[
            edgeBandStyle,
            {
              right: 0,
              top: touchTolerance * 2,
              width: touchTolerance * 2,
              height: height - touchTolerance * 2,
            },
          ]}
          {...rightEdgeResponderProps}
        />

        {/* Resize handles en las esquinas del rectngulo */}
        {selectedCloneId === icon.id && !multiSelectMode && (
          <>
            {[
              {
                corner: 'tl',
                cx: touchTolerance,
                cy: touchTolerance,
              },
              {
                corner: 'tr',
                cx: touchTolerance + width,
                cy: touchTolerance,
              },
              {
                corner: 'bl',
                cx: touchTolerance,
                cy: touchTolerance + height,
              },
              {
                corner: 'br',
                cx: touchTolerance + width,
                cy: touchTolerance + height,
              },
            ].map(({ corner, cx, cy }) => (
              <View
                key={`resize-${corner}`}
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
                onResponderGrant={(e) => handleResizeGrant(corner, e)}
                onResponderMove={handleResizeMove}
                onResponderRelease={handleResizeRelease}
                onResponderTerminate={handleResizeRelease}
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

        {/* Indicador visual para seleccin mltiple en rectngulos */}
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

        {/* Botn de men - solo visible cuando est seleccionado */}
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
                  canRotate: false,
                  hideEdit: false,
                });
              });
            }}
            style={{
              position: 'absolute',
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 10,
              borderWidth: 1,
              borderColor: '#ddd',
              zIndex: 10000,
              right: -14,
              top: (height + touchTolerance * 2) / 2 - 14,
            }}
          >
            <Feather name="more-vertical" size={16} color="#444" />
          </TouchableOpacity>
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.icon.id === next.icon.id &&
    prev.icon.locked === next.icon.locked &&
    prev.icon.thickness === next.icon.thickness &&
    arraysEqual(prev.icon.points, next.icon.points) &&
    prev.selectedCloneId === next.selectedCloneId &&
    prev.multiSelectMode === next.multiSelectMode &&
    prev.selectionInteractionMode === next.selectionInteractionMode &&
    prev.isAnyDrawingMode === next.isAnyDrawingMode &&
    prev.imageWidth === next.imageWidth &&
    prev.imageHeight === next.imageHeight &&
    prev.viewMode === next.viewMode &&
    prev.selectedCloneIdsSet?.has(prev.icon.id) === next.selectedCloneIdsSet?.has(next.icon.id),
);

// Detector memoizado para custom shapes - Solo detecta toques en el PERÍMETRO
export // Detector memoizado para custom shapes - Solo detecta toques en el PERÍMETRO
const MemoizedCustomShapeDetector = React.memo(
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
    renderScale,
    saveClonesHistory,
    zoomLevel = 1,
    setEditingIcon,
    setLeftPanelVisible,
  }) => {
    const rafRef = useRef(null);
    const pendingUpdateRef = useRef(null);
    if (!icon.points || icon.points.length < 3 || !icon.isCustomShapeComplete) return null;
    if (isAnyDrawingMode) return null;
    const originalWidth = icon.imageWidth || imageWidth;
    const originalHeight = icon.imageHeight || imageHeight;
    const scale = (imageWidth / originalWidth + imageHeight / originalHeight) / 2;
    const pts = icon.points.map((p) => ratioToDisplay(p.x, p.y, viewMode, imageWidth, imageHeight));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const touchTolerance = Math.max(16, 12 * renderScale);
    const touchMargin = 22;
    const isSelected = selectedCloneIdsSet?.has(icon.id);
    const hasFill = hasVisibleFill(icon.fillColor);
    const canDrag =
      !icon.locked &&
      !isAnyDrawingMode &&
      (!multiSelectMode || (multiSelectMode && selectionInteractionMode === 'move' && isSelected));
    const detectorZIndex = icon.calculatedZIndex || ZINDEX_BASE_LINES;

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
          const snapshot = createBoardDragSnapshot(c);
          if (snapshot) initialPositions[id] = snapshot;
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
      const { dxRatio: ddx, dyRatio: ddy } = deltaToRatio(
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
            return applyBoardDragSnapshot(c, init, ddx, ddy, 0, 0);
          });
      } else {
        pendingUpdateRef.current = (prev) => {
          const idx = prev.findIndex((c) => c.id === icon.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            points: base.points.map((pt) => ({
              x: pt.x + ddx,
              y: pt.y + ddy,
            })),
          };
          return next;
        };
      }
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
        // Multi-drag: eliminar TODOS los seleccionados que estn fuera del campo
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
        // Single drag: solo eliminar esta forma
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

    // Vertex resize handlers for custom-shape
    const handleVertexGrant = (vertexIdx, e) => {
      dragStart.current[`${icon.id}-vertex`] = {
        vertexIdx,
        startX: e.nativeEvent.pageX,
        startY: e.nativeEvent.pageY,
        origPoints: icon.points.map((p) => ({
          x: p.x,
          y: p.y,
        })),
      };
    };
    const handleVertexMove = (e) => {
      const base = dragStart.current[`${icon.id}-vertex`];
      if (!base) return;
      const { dxRatio, dyRatio } = deltaToRatio(
        (e.nativeEvent.pageX - base.startX) / zoomLevel,
        (e.nativeEvent.pageY - base.startY) / zoomLevel,
        viewMode,
        imageWidth,
        imageHeight,
      );
      const newPoints = base.origPoints.map((p, i) => {
        if (i === base.vertexIdx) {
          return {
            x: Math.max(0, Math.min(1, p.x + dxRatio)),
            y: Math.max(0, Math.min(1, p.y + dyRatio)),
          };
        }
        return {
          ...p,
        };
      });
      pendingUpdateRef.current = (prev) => {
        const idx = prev.findIndex((c) => c.id === icon.id);
        if (idx === -1) return prev;
        const next = [...prev];
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
    const handleVertexRelease = () => {
      delete dragStart.current[`${icon.id}-vertex`];
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
    const isBorderResponderHit = (e, offsetX = 0, offsetY = 0) => {
      const point = getResponderLocalPoint(e, offsetX, offsetY);
      return isPolygonBorderTouch(
        point.x,
        point.y,
        pts,
        touchTolerance,
        minX,
        minY,
        touchMargin,
        width,
        height,
      );
    };

    // Props comunes de responder
    const responderProps = {
      onStartShouldSetResponder: (e) => isBorderResponderHit(e),
      onMoveShouldSetResponder: (e) => canDrag && isBorderResponderHit(e),
      onResponderGrant: handleResponderGrant,
      onResponderMove: handleResponderMove,
      onResponderRelease: handleResponderRelease,
      onResponderTerminate: handleResponderRelease,
    };

    // Generar segmentos de toque a lo largo del permetro del polgono
    const generateTouchSegments = () => {
      const segments = [];
      const segmentSize = touchTolerance * 2;

      // Recorrer cada lado del polgono (incluyendo el que cierra la forma)
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length]; // El ltimo punto conecta con el primero
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Crear segmentos a lo largo de cada lado
        const numSegments = Math.max(1, Math.ceil(length / segmentSize));
        for (let j = 0; j < numSegments; j++) {
          const t = numSegments === 1 ? 0.5 : j / (numSegments - 1 || 1);
          const x = p1.x + dx * t;
          const y = p1.y + dy * t;
          const segmentLeft = x - minX + touchMargin - touchTolerance;
          const segmentTop = y - minY + touchMargin - touchTolerance;
          segments.push(
            <View
              key={`seg-${i}-${j}`}
              pointerEvents="auto"
              style={{
                position: 'absolute',
                left: segmentLeft,
                top: segmentTop,
                width: touchTolerance * 2,
                height: touchTolerance * 2,
                backgroundColor: 'transparent',
                borderRadius: touchTolerance,
              }}
              {...{
                ...responderProps,
                onStartShouldSetResponder: (e) => isBorderResponderHit(e, segmentLeft, segmentTop),
                onMoveShouldSetResponder: (e) =>
                  canDrag && isBorderResponderHit(e, segmentLeft, segmentTop),
              }}
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
          width: width + touchMargin * 2,
          height: height + touchMargin * 2,
          backgroundColor: 'transparent',
          zIndex: detectorZIndex,
        }}
      >
        {/* Segmentos de toque a lo largo del permetro */}
        {generateTouchSegments()}

        {/* Vertex resize handles en cada v�rtice del custom-shape */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: width + touchMargin * 2,
            height: height + touchMargin * 2,
            backgroundColor: 'transparent',
          }}
          {...responderProps}
        />

        {selectedCloneId === icon.id && !multiSelectMode && (
          <>
            {pts.map((pt, i) => (
              <View
                key={`vertex-${i}`}
                pointerEvents="auto"
                style={{
                  position: 'absolute',
                  left: pt.x - minX + touchMargin - 14,
                  top: pt.y - minY + touchMargin - 14,
                  width: 28,
                  height: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10001,
                }}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => handleVertexGrant(i, e)}
                onResponderMove={handleVertexMove}
                onResponderRelease={handleVertexRelease}
                onResponderTerminate={handleVertexRelease}
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
                  canRotate: false,
                  hideEdit: false,
                });
              });
            }}
            style={{
              position: 'absolute',
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 10,
              borderWidth: 1,
              borderColor: '#ddd',
              zIndex: 10000,
              right: -14,
              top: (height + touchMargin * 2) / 2 - 14,
            }}
          >
            <Feather name="more-vertical" size={16} color="#444" />
          </TouchableOpacity>
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.icon.id === next.icon.id &&
    prev.icon.locked === next.icon.locked &&
    prev.icon.thickness === next.icon.thickness &&
    arraysEqual(prev.icon.points, next.icon.points) &&
    prev.selectedCloneId === next.selectedCloneId &&
    prev.multiSelectMode === next.multiSelectMode &&
    prev.selectionInteractionMode === next.selectionInteractionMode &&
    prev.isAnyDrawingMode === next.isAnyDrawingMode &&
    prev.imageWidth === next.imageWidth &&
    prev.imageHeight === next.imageHeight &&
    prev.viewMode === next.viewMode &&
    prev.selectedCloneIdsSet?.has(prev.icon.id) === next.selectedCloneIdsSet?.has(next.icon.id),
);
