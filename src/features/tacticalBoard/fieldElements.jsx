/**
 * SVG primitives para dibujar elementos del campo.
 * Port literal de misterdata-source/.../fields/fieldElements.js
 * Diferencia: usa HTML SVG (minúsculas) en vez de react-native-svg.
 */
import React, { memo } from 'react';
import { FIELD, GRASS_STRIPE_COUNT } from './fieldDimensions';

function describeArc(cx, cy, rx, ry, startAngle, endAngle) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const x1 = cx + rx * Math.cos(rad(startAngle));
  const y1 = cy + ry * Math.sin(rad(startAngle));
  const x2 = cx + rx * Math.cos(rad(endAngle));
  const y2 = cy + ry * Math.sin(rad(endAngle));
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// 1. Grass background — stripes verticales
export const GrassBackground = memo(function GrassBackground({ w, h, grassColor = '#4a8c3f', stripeColor = '#438537' }) {
  const stripes = [];
  const stripeWidth = w / GRASS_STRIPE_COUNT;
  for (let i = 0; i < GRASS_STRIPE_COUNT; i++) {
    stripes.push(
      <rect
        key={`stripe-${i}`}
        x={i * stripeWidth}
        y={0}
        width={stripeWidth + 0.5}
        height={h}
        fill={i % 2 === 0 ? grassColor : stripeColor}
      />
    );
  }
  return <g>{stripes}</g>;
});

// 2. Field outline + center line
export const FieldOutline = memo(function FieldOutline({ w, h, margin, hMargin, showCenterLine = true, lineColor = '#ffffff', strokeWidth = 2 }) {
  const m = margin;
  const hm = hMargin ?? margin;
  const fw = w - 2 * hm;
  const fh = h - 2 * m;
  const midX = hm + fw / 2;
  return (
    <g>
      <rect x={hm} y={m} width={fw} height={fh} stroke={lineColor} strokeWidth={strokeWidth} fill="none" />
      {showCenterLine && (
        <line x1={midX} y1={m} x2={midX} y2={m + fh} stroke={lineColor} strokeWidth={strokeWidth} />
      )}
    </g>
  );
});

// 3. Center circle + spot
export const CenterMark = memo(function CenterMark({ w, h, margin, lineColor = '#ffffff', strokeWidth = 2 }) {
  const fw = w - 2 * margin;
  const fh = h - 2 * margin;
  const cx = margin + fw / 2;
  const cy = margin + fh / 2;
  const rx = FIELD.CENTER_CIRCLE_RX * fw;
  const ry = FIELD.CENTER_CIRCLE_RY * fh;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke={lineColor} strokeWidth={strokeWidth} fill="none" />
      <circle cx={cx} cy={cy} r={3} fill={lineColor} />
    </g>
  );
});

// 4. Penalty area (un lado)
export const PenaltyArea = memo(function PenaltyArea({ w, h, margin, side = 'left', lineColor = '#ffffff', strokeWidth = 2 }) {
  const fw = w - 2 * margin;
  const fh = h - 2 * margin;
  const pa = side === 'left' ? FIELD.LEFT_PENALTY : FIELD.RIGHT_PENALTY;
  const ga = side === 'left' ? FIELD.LEFT_GOAL_AREA : FIELD.RIGHT_GOAL_AREA;
  const spot = side === 'left' ? FIELD.LEFT_PENALTY_SPOT : FIELD.RIGHT_PENALTY_SPOT;

  const paTop = margin + pa.top * fh;
  const paBottom = margin + pa.bottom * fh;
  const paDepth = pa.depth * fw;
  const paX = side === 'left' ? margin : margin + fw - paDepth;

  const gaTop = margin + ga.top * fh;
  const gaBottom = margin + ga.bottom * fh;
  const gaDepth = ga.depth * fw;
  const gaX = side === 'left' ? margin : margin + fw - gaDepth;

  const spotX = margin + spot.x * fw;
  const spotY = margin + spot.y * fh;

  const arcRx = FIELD.PENALTY_ARC_RX * fw;
  const arcRy = FIELD.PENALTY_ARC_RY * fh;
  const arcStartAngle = side === 'left' ? -60 : 120;
  const arcEndAngle = side === 'left' ? 60 : 240;
  const arcPath = describeArc(spotX, spotY, arcRx, arcRy, arcStartAngle, arcEndAngle);

  const clipId = `penalty-arc-clip-${side}`;

  return (
    <g>
      <rect x={paX} y={paTop} width={paDepth} height={paBottom - paTop} stroke={lineColor} strokeWidth={strokeWidth} fill="none" />
      <rect x={gaX} y={gaTop} width={gaDepth} height={gaBottom - gaTop} stroke={lineColor} strokeWidth={strokeWidth} fill="none" />
      <circle cx={spotX} cy={spotY} r={3} fill={lineColor} />
      <defs>
        <clipPath id={clipId}>
          <rect
            x={side === 'left' ? margin + paDepth : margin}
            y={margin}
            width={fw - paDepth}
            height={fh}
          />
        </clipPath>
      </defs>
      <path d={arcPath} stroke={lineColor} strokeWidth={strokeWidth} fill="none" clipPath={`url(#${clipId})`} />
    </g>
  );
});

// 5. Corner arcs
export const CornerArcs = memo(function CornerArcs({ w, h, margin, corners = ['tl', 'tr', 'bl', 'br'], lineColor = '#ffffff', strokeWidth = 2 }) {
  const fw = w - 2 * margin;
  const fh = h - 2 * margin;
  const rx = FIELD.CORNER_ARC_RX * fw;
  const ry = FIELD.CORNER_ARC_RY * fh;
  const arcs = {
    tl: describeArc(margin, margin, rx, ry, 0, 90),
    tr: describeArc(margin + fw, margin, rx, ry, 90, 180),
    br: describeArc(margin + fw, margin + fh, rx, ry, 180, 270),
    bl: describeArc(margin, margin + fh, rx, ry, 270, 360),
  };
  return (
    <g>
      {corners.map((c) => (
        <path key={c} d={arcs[c]} stroke={lineColor} strokeWidth={strokeWidth} fill="none" />
      ))}
    </g>
  );
});

// 6. Goal net
export const GoalNet = memo(function GoalNet({ w, h, margin, side = 'left', lineColor = '#ffffff', strokeWidth = 2 }) {
  const fw = w - 2 * margin;
  const fh = h - 2 * margin;
  const goal = side === 'left' ? FIELD.LEFT_GOAL : FIELD.RIGHT_GOAL;

  const goalTop = margin + goal.top * fh;
  const goalBottom = margin + goal.bottom * fh;
  const goalDepth = goal.depth * fw;
  const goalHeight = goalBottom - goalTop;

  const x = side === 'left' ? margin - goalDepth : margin + fw;

  return (
    <g>
      <rect x={x} y={goalTop} width={goalDepth} height={goalHeight} stroke={lineColor} strokeWidth={strokeWidth + 0.5} fill="none" />
      {[0.25, 0.5, 0.75].map((r) => (
        <line key={`h-${r}`} x1={x} y1={goalTop + goalHeight * r} x2={x + goalDepth} y2={goalTop + goalHeight * r} stroke={lineColor} strokeWidth={0.5} opacity={0.5} />
      ))}
      {[0.33, 0.66].map((r) => (
        <line key={`v-${r}`} x1={x + goalDepth * r} y1={goalTop} x2={x + goalDepth * r} y2={goalBottom} stroke={lineColor} strokeWidth={0.5} opacity={0.5} />
      ))}
    </g>
  );
});

// 7. Zone dividers
export const ZoneDividers = memo(function ZoneDividers({ w, h, margin, zones = 1, lineColor = '#ffffff', strokeWidth = 2 }) {
  const fw = w - 2 * margin;
  const fh = h - 2 * margin;
  const lines = [];

  if (zones === 2) {
    const midX = margin + fw / 2;
    lines.push(
      <line key="v-center" x1={midX} y1={margin} x2={midX} y2={margin + fh} stroke={lineColor} strokeWidth={strokeWidth} />
    );
  }
  if (zones === 3) {
    const third = fw / 3;
    lines.push(
      <line key="v1" x1={margin + third} y1={margin} x2={margin + third} y2={margin + fh} stroke={lineColor} strokeWidth={strokeWidth} />,
      <line key="v2" x1={margin + 2 * third} y1={margin} x2={margin + 2 * third} y2={margin + fh} stroke={lineColor} strokeWidth={strokeWidth} />
    );
  }
  if (zones === 4) {
    const midX = margin + fw / 2;
    const midY = margin + fh / 2;
    lines.push(
      <line key="v-center" x1={midX} y1={margin} x2={midX} y2={margin + fh} stroke={lineColor} strokeWidth={strokeWidth} />,
      <line key="h-center" x1={margin} y1={midY} x2={margin + fw} y2={midY} stroke={lineColor} strokeWidth={strokeWidth} />
    );
  }

  return <g>{lines}</g>;
});
