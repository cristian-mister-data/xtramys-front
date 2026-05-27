/**
 * SVG primitive components for drawing football field elements.
 * Each component is responsible for a single visual concern (SRP).
 * All coordinates use the 0-1 normalized system from fieldDimensions.
 */
import React, { memo } from 'react';
import Svg, {
  Rect, Line, Circle, Ellipse, Path, G, Defs,
  ClipPath, Pattern
} from 'react-native-svg';
import { FIELD, GRASS_STRIPE_COUNT } from './fieldDimensions';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const px = (ratio, width) => ratio * width;
const py = (ratio, height) => ratio * height;

/**
 * Build an SVG arc path for penalty arcs and center circle arcs.
 * cx, cy = center; rx, ry = radii; startAngle, endAngle in degrees
 */
function describeArc(cx, cy, rx, ry, startAngle, endAngle) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const x1 = cx + rx * Math.cos(rad(startAngle));
  const y1 = cy + ry * Math.sin(rad(startAngle));
  const x2 = cx + rx * Math.cos(rad(endAngle));
  const y2 = cy + ry * Math.sin(rad(endAngle));
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// ──────────────────────────────────────────────
// 1. Grass Background
// ──────────────────────────────────────────────
export const GrassBackground = memo(({ w, h, grassColor = '#4a8c3f', stripeColor = '#438537' }) => {
  const stripes = [];
  const stripeWidth = w / GRASS_STRIPE_COUNT;
  for (let i = 0; i < GRASS_STRIPE_COUNT; i++) {
    stripes.push(
      <Rect
        key={`stripe-${i}`}
        x={i * stripeWidth}
        y={0}
        width={stripeWidth + 0.5} // slight overlap to prevent gaps
        height={h}
        fill={i % 2 === 0 ? grassColor : stripeColor}
      />
    );
  }
  return <G>{stripes}</G>;
});

// ──────────────────────────────────────────────
// 2. Field Outline (boundary + half-way line)
// ──────────────────────────────────────────────
export const FieldOutline = memo(({ w, h, margin, hMargin, showCenterLine = true, lineColor = '#ffffff', strokeWidth = 2 }) => {
  const m = margin;
  const hm = hMargin ?? margin; // optional wider horizontal margin (e.g. for zones1)
  const fw = w - 2 * hm; // field drawable width
  const fh = h - 2 * m;
  const midX = hm + fw / 2;

  return (
    <G>
      {/* Outer rectangle */}
      <Rect x={hm} y={m} width={fw} height={fh} stroke={lineColor} strokeWidth={strokeWidth} fill="none" />
      {/* Center line (half-way line) — only for full field */}
      {showCenterLine && (
        <Line x1={midX} y1={m} x2={midX} y2={m + fh} stroke={lineColor} strokeWidth={strokeWidth} />
      )}
    </G>
  );
});

// ──────────────────────────────────────────────
// 3. Center Circle + Spot
// ──────────────────────────────────────────────
export const CenterMark = memo(({ w, h, margin, lineColor = '#ffffff', strokeWidth = 2 }) => {
  const fw = w - 2 * margin;
  const fh = h - 2 * margin;
  const cx = margin + fw / 2;
  const cy = margin + fh / 2;
  const rx = FIELD.CENTER_CIRCLE_RX * fw;
  const ry = FIELD.CENTER_CIRCLE_RY * fh;

  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke={lineColor} strokeWidth={strokeWidth} fill="none" />
      <Circle cx={cx} cy={cy} r={Math.max(1.5, strokeWidth * 1.5)} fill={lineColor} />
    </G>
  );
});

// ──────────────────────────────────────────────
// 4. Penalty Area (one side)
// ──────────────────────────────────────────────
export const PenaltyArea = memo(({ w, h, margin, side = 'left', lineColor = '#ffffff', strokeWidth = 2, clipIdPrefix = '' }) => {
  const fw = w - 2 * margin;
  const fh = h - 2 * margin;
  const pa = side === 'left' ? FIELD.LEFT_PENALTY : FIELD.RIGHT_PENALTY;
  const ga = side === 'left' ? FIELD.LEFT_GOAL_AREA : FIELD.RIGHT_GOAL_AREA;
  const spot = side === 'left' ? FIELD.LEFT_PENALTY_SPOT : FIELD.RIGHT_PENALTY_SPOT;

  // Penalty area box
  const paTop = margin + pa.top * fh;
  const paBottom = margin + pa.bottom * fh;
  const paDepth = pa.depth * fw;
  const paX = side === 'left' ? margin : margin + fw - paDepth;

  // Goal area box
  const gaTop = margin + ga.top * fh;
  const gaBottom = margin + ga.bottom * fh;
  const gaDepth = ga.depth * fw;
  const gaX = side === 'left' ? margin : margin + fw - gaDepth;

  // Penalty spot
  const spotX = margin + spot.x * fw;
  const spotY = margin + spot.y * fh;

  // Penalty arc (only the part outside penalty area)
  const arcRx = FIELD.PENALTY_ARC_RX * fw;
  const arcRy = FIELD.PENALTY_ARC_RY * fh;
  const paEdgeX = side === 'left' ? margin + paDepth : margin + fw - paDepth;
  const dx = paEdgeX - spotX;
  const arcAngleDeg = dx !== 0 && arcRx !== 0
    ? Math.acos(Math.max(-1, Math.min(1, dx / arcRx))) * (180 / Math.PI)
    : 0;
  const arcStartAngle = side === 'left' ? -arcAngleDeg : 180 - arcAngleDeg;
  const arcEndAngle = side === 'left' ? arcAngleDeg : 180 + arcAngleDeg;

  const arcPath = describeArc(spotX, spotY, arcRx, arcRy, arcStartAngle, arcEndAngle);

  // Clip path ID — unique per side
  const clipId = `${clipIdPrefix}penalty-arc-clip-${side}`;

  return (
    <G>
      {/* Penalty area */}
      <Rect x={paX} y={paTop} width={paDepth} height={paBottom - paTop} stroke={lineColor} strokeWidth={strokeWidth} fill="none" />
      {/* Goal area */}
      <Rect x={gaX} y={gaTop} width={gaDepth} height={gaBottom - gaTop} stroke={lineColor} strokeWidth={strokeWidth} fill="none" />
      {/* Penalty spot */}
      <Circle cx={spotX} cy={spotY} r={Math.max(1.5, strokeWidth * 1.5)} fill={lineColor} />
      {/* Penalty arc - clipped to show only outside penalty area */}
      <Defs>
        <ClipPath id={clipId}>
          <Rect
            x={side === 'left' ? margin + paDepth : margin}
            y={margin}
            width={fw - paDepth}
            height={fh}
          />
        </ClipPath>
      </Defs>
      <Path d={arcPath} stroke={lineColor} strokeWidth={strokeWidth} fill="none" clipPath={`url(#${clipId})`} />
    </G>
  );
});

// ──────────────────────────────────────────────
// 5. Corner Arcs
// ──────────────────────────────────────────────
export const CornerArcs = memo(({ w, h, margin, corners = ['tl', 'tr', 'bl', 'br'], lineColor = '#ffffff', strokeWidth = 2 }) => {
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
    <G>
      {corners.map((c) => (
        <Path key={c} d={arcs[c]} stroke={lineColor} strokeWidth={strokeWidth} fill="none" />
      ))}
    </G>
  );
});

// ──────────────────────────────────────────────
// 6. Goal Net Drawing
// ──────────────────────────────────────────────
export const GoalNet = memo(({ w, h, margin, side = 'left', lineColor = '#ffffff', strokeWidth = 2 }) => {
  const fw = w - 2 * margin;
  const fh = h - 2 * margin;
  const goal = side === 'left' ? FIELD.LEFT_GOAL : FIELD.RIGHT_GOAL;

  const goalTop = margin + goal.top * fh;
  const goalBottom = margin + goal.bottom * fh;
  const goalHeight = goalBottom - goalTop;

  // El espacio de coordenadas local de la portería es 120 x 70.
  // El ancho de la boca es 90 (de x=15 a x=105).
  // Escalamos para que el ancho local (90) sea igual al goalHeight real.
  const scale = goalHeight / 90;

  // Parámetros de transformación para rotar y posicionar en la línea de meta
  let tx, ty, rot;
  if (side === 'left') {
    // Rotación de -90 grados (apunta a la izquierda, boca a la derecha)
    tx = margin - 38 * scale;
    ty = goalTop + 105 * scale;
    rot = -90;
  } else {
    // Rotación de 90 grados (apunta a la derecha, boca a la izquierda)
    tx = margin + fw + 38 * scale;
    ty = goalTop - 15 * scale;
    rot = 90;
  }

  // Generamos el mismo patrón de red procedimental de ojo de halcón
  const netD = React.useMemo(() => {
    const getQuadNetPath = (p0, p1, p2, p3, uDivs = 8, vDivs = 6) => {
      const getPt = (u, v) => {
        const x = (1 - u) * ((1 - v) * p0.x + v * p3.x) + u * ((1 - v) * p1.x + v * p2.x);
        const y = (1 - u) * ((1 - v) * p0.y + v * p3.y) + u * ((1 - v) * p1.y + v * p2.y);
        return { x, y };
      };
      let d = '';
      for (let i = 0; i < uDivs; i++) {
        for (let j = 0; j <= vDivs; j++) {
          const u1 = i / uDivs;
          const v1 = j / vDivs;
          if (j < vDivs) {
            const u2 = (i + 1) / uDivs;
            const v2 = (j + 1) / vDivs;
            const pt1 = getPt(u1, v1);
            const pt2 = getPt(u2, v2);
            d += `M ${pt1.x.toFixed(1)} ${pt1.y.toFixed(1)} L ${pt2.x.toFixed(1)} ${pt2.y.toFixed(1)} `;
          }
          if (j > 0) {
            const u2 = (i + 1) / uDivs;
            const v2 = (j - 1) / vDivs;
            const pt1 = getPt(u1, v1);
            const pt2 = getPt(u2, v2);
            d += `M ${pt1.x.toFixed(1)} ${pt1.y.toFixed(1)} L ${pt2.x.toFixed(1)} ${pt2.y.toFixed(1)} `;
          }
        }
      }
      return d;
    };

    // Panels for Large Goal
    const topPanel = getQuadNetPath({ x: 15, y: 32 }, { x: 105, y: 32 }, { x: 98, y: 12 }, { x: 22, y: 12 }, 10, 4);
    const backPanel = getQuadNetPath({ x: 22, y: 12 }, { x: 98, y: 12 }, { x: 98, y: 22 }, { x: 22, y: 22 }, 10, 4);
    const leftPanel = getQuadNetPath({ x: 15, y: 32 }, { x: 22, y: 12 }, { x: 22, y: 22 }, { x: 15, y: 38 }, 4, 4);
    const rightPanel = getQuadNetPath({ x: 105, y: 32 }, { x: 105, y: 38 }, { x: 98, y: 22 }, { x: 98, y: 12 }, 4, 4);

    return `${topPanel}${backPanel}${leftPanel}${rightPanel}`;
  }, []);

  return (
    <G transform={`translate(${tx}, ${ty}) scale(${scale}) rotate(${rot})`}>
      {/* Fondo translúcido de la red */}
      <Path
        d="M 15 32 L 22 12 L 98 12 L 105 32 L 105 38 L 98 22 L 22 22 L 15 38 Z"
        fill="rgba(255,255,255,0.06)"
      />

      {/* Patrón de red de diamantes */}
      <Path d={netD} stroke="#cccccc" strokeWidth="0.8" fill="none" opacity="0.65" />

      {/* Estructura de soporte posterior (metal blanco fino) */}
      <Path d="M 22 12 L 98 12" stroke={lineColor} strokeWidth="2.5" fill="none" />
      <Path d="M 22 22 L 98 22" stroke={lineColor} strokeWidth="2.5" fill="none" />
      <Path d="M 22 12 L 22 22" stroke={lineColor} strokeWidth="2" fill="none" />
      <Path d="M 98 12 L 98 22" stroke={lineColor} strokeWidth="2" fill="none" />

      {/* Profundidad lateral */}
      <Path d="M 15 32 L 22 12" stroke={lineColor} strokeWidth="2.5" fill="none" />
      <Path d="M 105 32 L 98 12" stroke={lineColor} strokeWidth="2.5" fill="none" />
      <Path d="M 15 38 L 22 22" stroke={lineColor} strokeWidth="2.5" fill="none" />
      <Path d="M 105 38 L 98 22" stroke={lineColor} strokeWidth="2.5" fill="none" />

      {/* Marco principal frontal (Postes y travesaño blanco grueso) */}
      <Path d="M 15 38 L 15 32 L 105 32 L 105 38" stroke={lineColor} strokeWidth="4" fill="none" strokeLinecap="square" />
    </G>
  );
});

// ──────────────────────────────────────────────
// 7. Zone Division Lines (solid grid style)
// ──────────────────────────────────────────────
export const ZoneDividers = memo(({ w, h, margin, hMargin, zones = 1, lineColor = '#ffffff', strokeWidth = 2 }) => {
  const hm = hMargin ?? margin;
  const fw = w - 2 * hm;
  const fh = h - 2 * margin;
  const lines = [];

  if (zones === 2) {
    // 2 zones: vertical center line (2 columns)
    const midX = hm + fw / 2;
    lines.push(
      <Line key="v-center" x1={midX} y1={margin} x2={midX} y2={margin + fh} stroke={lineColor} strokeWidth={strokeWidth} />
    );
  }

  if (zones === 3) {
    // 3 zones: 2 vertical lines (3 equal columns)
    const third = fw / 3;
    lines.push(
      <Line key="v1" x1={hm + third} y1={margin} x2={hm + third} y2={margin + fh} stroke={lineColor} strokeWidth={strokeWidth} />
    );
    lines.push(
      <Line key="v2" x1={hm + 2 * third} y1={margin} x2={hm + 2 * third} y2={margin + fh} stroke={lineColor} strokeWidth={strokeWidth} />
    );
  }

  if (zones === 4) {
    // 4 zones: cross divider (vertical center + horizontal center = 4 quadrants)
    const midX = hm + fw / 2;
    const midY = margin + fh / 2;
    lines.push(
      <Line key="v-center" x1={midX} y1={margin} x2={midX} y2={margin + fh} stroke={lineColor} strokeWidth={strokeWidth} />
    );
    lines.push(
      <Line key="h-center" x1={hm} y1={midY} x2={hm + fw} y2={midY} stroke={lineColor} strokeWidth={strokeWidth} />
    );
  }

  return <G>{lines}</G>;
});
