/**
 * ShapeRenderers — líneas, curvas, rectángulos y círculos con drag de cuerpo
 * y handles de extremos editables (cuando están seleccionados).
 *
 * Port simplificado de la UX del source: cada línea/forma se puede arrastrar
 * por completo (mover); cuando está seleccionada aparecen círculos amarillos
 * en cada vértice (extremo) que pueden arrastrarse independientemente.
 */
import { Group, Line, Arrow, Rect, Circle } from 'react-konva';

const HANDLE_RADIUS = 6;
const HANDLE_FILL = '#fbbf24';
const HANDLE_STROKE = '#1c1917';

/* Arrastrar el grupo completo: en dragEnd traducimos cada punto en ratio. */
function makeBodyDragHandlers({ el, p2r, r2p, applyChange }) {
  return {
    draggable: true,
    onDragEnd: (e) => {
      const node = e.target;
      const dx = node.x();
      const dy = node.y();
      if (dx === 0 && dy === 0) return;
      // Resetear posición del Group
      node.position({ x: 0, y: 0 });
      // Para cada punto: añadir delta en píxeles y reconvertir a ratio
      const newPoints = el.points
        ? el.points.map((p) => {
            const px = r2p(p.x, p.y);
            return p2r(px.x + dx, px.y + dy);
          })
        : null;
      const newXY = (typeof el.x === 'number' && typeof el.y === 'number' && !newPoints)
        ? (() => {
            const px = r2p(el.x, el.y);
            return p2r(px.x + dx, px.y + dy);
          })()
        : null;

      applyChange((prev) => prev.map((it) => {
        if (it.id !== el.id) return it;
        if (newPoints) return { ...it, points: newPoints };
        if (newXY) return { ...it, x: newXY.x, y: newXY.y };
        return it;
      }));
    },
  };
}

/** Handle para un vértice individual: convierte a ratio en dragEnd. */
function VertexHandle({ x, y, onUpdate }) {
  return (
    <Circle
      x={x}
      y={y}
      radius={HANDLE_RADIUS}
      fill={HANDLE_FILL}
      stroke={HANDLE_STROKE}
      strokeWidth={1.5}
      draggable
      onDragEnd={(e) => {
        e.cancelBubble = true;
        onUpdate(e.target.x(), e.target.y());
      }}
      onMouseDown={(e) => { e.cancelBubble = true; }}
      onClick={(e) => { e.cancelBubble = true; }}
    />
  );
}

// ============================================================================
// LINE / CURVE
// ============================================================================
export function LineShape({ el, selected, onSelect, p2r, r2p, applyChange, refScale }) {
  const points = el.points.flatMap((p) => {
    const px = r2p(p.x, p.y);
    return [px.x, px.y];
  });
  const stroke = el.color || '#000';
  const strokeWidth = Math.max(1, (el.thickness || 0.004) * refScale);
  const tension = el.type === 'curve' ? 0.5 : 0;
  const dash = el.dashed ? [strokeWidth * 3, strokeWidth * 2] : undefined;
  const Comp = el.arrow ? Arrow : Line;

  const updateVertex = (idx) => (px, py) => {
    const r = p2r(px, py);
    applyChange((prev) => prev.map((it) => {
      if (it.id !== el.id) return it;
      const nextPts = it.points.map((p, i) => (i === idx ? { x: r.x, y: r.y } : p));
      return { ...it, points: nextPts };
    }));
  };

  const bodyHandlers = makeBodyDragHandlers({ el, p2r, r2p, applyChange });

  return (
    <Group {...bodyHandlers} onClick={onSelect} onTap={onSelect}>
      <Comp
        points={points}
        stroke={selected ? '#fbbf24' : stroke}
        strokeWidth={selected ? strokeWidth + 2 : strokeWidth}
        tension={tension}
        dash={dash}
        pointerLength={el.arrow ? strokeWidth * 3 : undefined}
        pointerWidth={el.arrow ? strokeWidth * 3 : undefined}
        fill={el.arrow ? stroke : undefined}
        hitStrokeWidth={Math.max(12, strokeWidth + 12)}
      />
      {selected && el.points.map((p, idx) => {
        const px = r2p(p.x, p.y);
        return <VertexHandle key={idx} x={px.x} y={px.y} onUpdate={updateVertex(idx)} />;
      })}
    </Group>
  );
}

// ============================================================================
// RECT
// ============================================================================
export function RectShape({ el, selected, onSelect, p2r, r2p, applyChange, refScale }) {
  const c1 = r2p(el.x, el.y);
  const c2 = r2p(el.x + el.w, el.y + el.h);
  const x = Math.min(c1.x, c2.x), y = Math.min(c1.y, c2.y);
  const w = Math.abs(c2.x - c1.x), h = Math.abs(c2.y - c1.y);
  const sw = Math.max(1, (el.thickness || 0.004) * refScale);
  const dash = el.dashed ? [sw * 3, sw * 2] : undefined;

  const bodyHandlers = makeBodyDragHandlers({
    el: { ...el, points: [{ x: el.x, y: el.y }, { x: el.x + el.w, y: el.y + el.h }] },
    p2r, r2p,
    applyChange: (updater) => applyChange((prev) => {
      const interim = updater(prev);
      // Recalcular x/y/w/h a partir de los puntos modificados
      return interim.map((it) => {
        if (it.id !== el.id || !it.points) return it;
        const [a, b] = it.points;
        const nx = Math.min(a.x, b.x), ny = Math.min(a.y, b.y);
        const nw = Math.abs(b.x - a.x), nh = Math.abs(b.y - a.y);
        const { points: _omit, ...rest } = it;
        return { ...rest, x: nx, y: ny, w: nw, h: nh };
      });
    }),
  });

  // 4 handles en las esquinas — actualizan las dos esquinas opuestas
  const updateCorner = (corner) => (px, py) => {
    const r = p2r(px, py);
    applyChange((prev) => prev.map((it) => {
      if (it.id !== el.id) return it;
      let nx = it.x, ny = it.y, nw = it.w, nh = it.h;
      if (corner === 'tl') { nw = (it.x + it.w) - r.x; nh = (it.y + it.h) - r.y; nx = r.x; ny = r.y; }
      else if (corner === 'tr') { nw = r.x - it.x; nh = (it.y + it.h) - r.y; ny = r.y; }
      else if (corner === 'bl') { nw = (it.x + it.w) - r.x; nh = r.y - it.y; nx = r.x; }
      else if (corner === 'br') { nw = r.x - it.x; nh = r.y - it.y; }
      if (nw < 0) { nx += nw; nw = -nw; }
      if (nh < 0) { ny += nh; nh = -nh; }
      return { ...it, x: nx, y: ny, w: nw, h: nh };
    }));
  };

  return (
    <Group {...bodyHandlers} onClick={onSelect} onTap={onSelect}>
      <Rect x={x} y={y} width={w} height={h}
        stroke={selected ? '#fbbf24' : (el.color || '#000')}
        strokeWidth={selected ? sw + 2 : sw}
        dash={dash} />
      {selected && (
        <>
          <VertexHandle x={x}     y={y}     onUpdate={updateCorner('tl')} />
          <VertexHandle x={x + w} y={y}     onUpdate={updateCorner('tr')} />
          <VertexHandle x={x}     y={y + h} onUpdate={updateCorner('bl')} />
          <VertexHandle x={x + w} y={y + h} onUpdate={updateCorner('br')} />
        </>
      )}
    </Group>
  );
}

// ============================================================================
// CIRCLE (forma — distinta del icono "ring")
// ============================================================================
export function CircleShape({ el, selected, onSelect, p2r, r2p, applyChange, refScale }) {
  const center = r2p(el.x, el.y);
  const radiusPx = (el.radius || 0.05) * refScale;
  const sw = Math.max(1, (el.thickness || 0.004) * refScale);
  const dash = el.dashed ? [sw * 3, sw * 2] : undefined;

  const bodyHandlers = makeBodyDragHandlers({ el, p2r, r2p, applyChange });

  const updateRadius = (px) => {
    const dx = px - center.x;
    const dy = 0;
    const newR = Math.hypot(dx, dy) / refScale;
    applyChange((prev) => prev.map((it) => (it.id === el.id ? { ...it, radius: Math.max(0.01, newR) } : it)));
  };

  return (
    <Group {...bodyHandlers} onClick={onSelect} onTap={onSelect}>
      <Circle x={center.x} y={center.y} radius={radiusPx}
        stroke={selected ? '#fbbf24' : (el.color || '#000')}
        strokeWidth={selected ? sw + 2 : sw}
        dash={dash}
        hitStrokeWidth={Math.max(12, sw + 12)}
        fillEnabled={false}
      />
      {selected && (
        <>
          <VertexHandle x={center.x} y={center.y} onUpdate={() => {}} />
          <VertexHandle x={center.x + radiusPx} y={center.y} onUpdate={(px) => updateRadius(px)} />
        </>
      )}
    </Group>
  );
}
