/**
 * FieldSVGRenderer — Composes SVG field elements based on lineType + viewMode.
 * 
 * Two independent axes:
 *  - lineType: what markings to draw (full, zones1-4, empty)
 *  - viewMode: how to crop the view (entire, halfLeft, halfRight, halfUp, halfDown)
 * 
 * The renderer ALWAYS draws the full field internally.
 * - halfLeft/halfRight: use SVG viewBox to crop (no rotation)
 * - halfUp/halfDown: crop + rotate 90° CW via SVG transform (portrait output)
 * 
 * This ensures icon coordinates (0-1) are consistent across all view modes.
 * 
 * Props:
 *  - lineType: string (default 'full')
 *  - viewMode: string (default 'entire')
 *  - width: number — pixel width available
 *  - height: number — pixel height available
 *  - grassColor / stripeColor / lineColor / strokeWidth: optional styling
 */
import React, { memo, useMemo } from 'react';
import Svg, { G } from 'react-native-svg';
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

const MARGIN_RATIO = 0.06; // 6% margin on each side
const FIELD_ASPECT = 0.65; // h/w ratio of a football field

/**
 * Renders the full field into a virtual canvas, then clips/rotates via viewBox + transform.
 * - entire/halfLeft/halfRight: simple viewBox crop
 * - halfUp/halfDown: viewBox crop + 90° CW rotation (portrait)
 */
const FieldSVGRenderer = memo(({
  lineType = 'full',
  viewMode = 'entire',
  width,
  height,
  lineColor = '#ffffff',
  strokeWidth = 2,
  clipIdPrefix = '',
}) => {
  const lineConfig = useMemo(() => getLineTypeConfig(lineType), [lineType]);
  const viewConfig = useMemo(() => getViewModeConfig(viewMode), [viewMode]);

  const vp = viewConfig.viewport;
  const isRotated = viewConfig.rotated;

  // Virtual canvas: scale up so the cropped portion fills the output size
  let virtualW, virtualH, vbX, vbY, vbW, vbH, groupTransform;

  if (!vp) {
    // Entire field
    virtualW = width;
    virtualH = height;
    vbX = 0; vbY = 0; vbW = width; vbH = height;
    groupTransform = '';
  } else if (isRotated) {
    // Rotated modes (halfUp/halfDown): same vertical crop as halfLeft/halfRight + 90° CW rotation
    // Virtual canvas = full field
    virtualW = height; // field width maps to display height after rotation
    virtualH = height * FIELD_ASPECT;
    
    // 90° CW rotation: field (x,y) → rotated (virtualH - y, x)
    // After rotation, field occupies (0,0)→(virtualH, virtualW)
    // Crop x-range [vp.x*vW, (vp.x+vp.w)*vW] maps to rotated y-range
    vbX = 0;
    vbY = vp.x * virtualW;
    vbW = virtualH;
    vbH = vp.w * virtualW;
    groupTransform = `translate(${virtualH}, 0) rotate(90)`;
  } else {
    // Non-rotated crop (halfLeft/halfRight)
    virtualW = width / vp.w;
    virtualH = height / vp.h;
    vbX = vp.x * virtualW;
    vbY = vp.y * virtualH;
    vbW = vp.w * virtualW;
    vbH = vp.h * virtualH;
    groupTransform = '';
  }

  const isZoneField = lineConfig.id.startsWith('zones');
  const margin = isZoneField 
    ? Math.min(virtualW, virtualH) * 0.16 
    : Math.min(virtualW, virtualH) * MARGIN_RATIO;

  const scaledStrokeWidth = strokeWidth * (Math.min(virtualW, virtualH) / 500);

  const hMargin = isZoneField 
    ? Math.max(margin, virtualW * 0.22) 
    : margin;

  return (
    <Svg key={viewMode} width={width} height={height} viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}>
      <G transform={groupTransform || undefined}>
        {/* Grass stripes */}
        <GrassBackground w={virtualW} h={virtualH} />

        {/* Field outline (center line conditional on showHalfwayLine) */}
        {lineConfig.id !== 'empty' && (
          <FieldOutline
            w={virtualW} h={virtualH} margin={margin} hMargin={hMargin}
            showCenterLine={lineConfig.showHalfwayLine}
            lineColor={lineColor} strokeWidth={scaledStrokeWidth}
          />
        )}

        {/* Center circle + spot */}
        {lineConfig.showCenter && (
          <CenterMark w={virtualW} h={virtualH} margin={margin} lineColor={lineColor} strokeWidth={scaledStrokeWidth} />
        )}

        {/* Penalty areas */}
        {lineConfig.showPenaltyAreas.map((side) => (
          <PenaltyArea key={side} w={virtualW} h={virtualH} margin={margin} side={side} lineColor={lineColor} strokeWidth={scaledStrokeWidth} clipIdPrefix={clipIdPrefix} />
        ))}

        {/* Corner arcs */}
        {lineConfig.showCorners.length > 0 && (
          <CornerArcs w={virtualW} h={virtualH} margin={margin} corners={lineConfig.showCorners} lineColor={lineColor} strokeWidth={scaledStrokeWidth} />
        )}

        {/* Goals */}
        {lineConfig.showGoals && lineConfig.showPenaltyAreas.map((side) => (
          <GoalNet key={`goal-${side}`} w={virtualW} h={virtualH} margin={margin} side={side} lineColor={lineColor} strokeWidth={scaledStrokeWidth} />
        ))}

        {/* Zone dividers */}
        {lineConfig.zones > 0 && (
          <ZoneDividers w={virtualW} h={virtualH} margin={margin} hMargin={hMargin} zones={lineConfig.zones} lineColor={lineColor} strokeWidth={scaledStrokeWidth} />
        )}
      </G>
    </Svg>
  );
});

export default FieldSVGRenderer;
