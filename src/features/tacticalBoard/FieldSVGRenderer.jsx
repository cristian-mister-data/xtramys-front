/**
 * FieldSVGRenderer — Compone los elementos SVG del campo según lineType + viewMode.
 * Port literal de misterdata-source/.../fields/FieldSVGRenderer.js usando HTML SVG.
 *
 * Dos ejes independientes:
 *  - lineType: marcas a dibujar (full, zones1-4, empty).
 *  - viewMode: cómo recortar la vista (entire, halfLeft, halfRight, halfUp, halfDown).
 *
 * Internamente siempre dibuja el campo completo y recorta/rota con viewBox + transform.
 */
import React, { memo, useMemo } from 'react';
import { getLineTypeConfig, getViewModeConfig } from './fieldConfigs';
import {
  GrassBackground,
  FieldOutline,
  CenterMark,
  PenaltyArea,
  CornerArcs,
  GoalNet,
  ZoneDividers,
} from './fieldElements';

const MARGIN_RATIO = 0.06;
const FIELD_ASPECT = 0.65;

const FieldSVGRenderer = memo(function FieldSVGRenderer({
  lineType = 'full',
  viewMode = 'entire',
  width,
  height,
  lineColor = '#ffffff',
  strokeWidth = 2,
}) {
  const lineConfig = useMemo(() => getLineTypeConfig(lineType), [lineType]);
  const viewConfig = useMemo(() => getViewModeConfig(viewMode), [viewMode]);

  const vp = viewConfig.viewport;
  const isRotated = viewConfig.rotated;

  let virtualW, virtualH, vbX, vbY, vbW, vbH, groupTransform;

  if (!vp) {
    virtualW = width;
    virtualH = height;
    vbX = 0; vbY = 0; vbW = width; vbH = height;
    groupTransform = '';
  } else if (isRotated) {
    virtualW = height;
    virtualH = height * FIELD_ASPECT;
    vbX = 0;
    vbY = vp.x * virtualW;
    vbW = virtualH;
    vbH = vp.w * virtualW;
    groupTransform = `translate(${virtualH}, 0) rotate(90)`;
  } else {
    virtualW = width / vp.w;
    virtualH = height / vp.h;
    vbX = vp.x * virtualW;
    vbY = vp.y * virtualH;
    vbW = vp.w * virtualW;
    vbH = vp.h * virtualH;
    groupTransform = '';
  }

  const margin = Math.min(virtualW, virtualH) * MARGIN_RATIO;
  const isZoneType = lineConfig.id.startsWith('zones');
  const hMargin = isZoneType ? Math.max(margin, virtualW * 0.15) : margin;
  const vMargin = isZoneType ? Math.max(margin, virtualH * 0.15) : margin;

  return (
    <svg
      key={viewMode}
      width={width}
      height={height}
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      style={{ display: 'block' }}
    >
      <g transform={groupTransform || undefined}>
        <GrassBackground w={virtualW} h={virtualH} />

        {lineConfig.id !== 'empty' && (
          <FieldOutline
            w={virtualW} h={virtualH} margin={margin} hMargin={hMargin} vMargin={vMargin}
            showCenterLine={lineConfig.showHalfwayLine}
            lineColor={lineColor} strokeWidth={strokeWidth}
          />
        )}

        {lineConfig.showCenter && (
          <CenterMark w={virtualW} h={virtualH} margin={margin} lineColor={lineColor} strokeWidth={strokeWidth} />
        )}

        {lineConfig.showPenaltyAreas.map((side) => (
          <PenaltyArea key={side} w={virtualW} h={virtualH} margin={margin} side={side} lineColor={lineColor} strokeWidth={strokeWidth} />
        ))}

        {lineConfig.showCorners.length > 0 && (
          <CornerArcs w={virtualW} h={virtualH} margin={margin} corners={lineConfig.showCorners} lineColor={lineColor} strokeWidth={strokeWidth} />
        )}

        {lineConfig.showGoals && lineConfig.showPenaltyAreas.map((side) => (
          <GoalNet key={`goal-${side}`} w={virtualW} h={virtualH} margin={margin} side={side} lineColor={lineColor} strokeWidth={strokeWidth} />
        ))}

        {lineConfig.zones > 0 && (
          <ZoneDividers w={virtualW} h={virtualH} margin={margin} hMargin={hMargin} vMargin={vMargin} zones={lineConfig.zones} lineColor={lineColor} strokeWidth={strokeWidth} />
        )}
      </g>
    </svg>
  );
});

export default FieldSVGRenderer;
