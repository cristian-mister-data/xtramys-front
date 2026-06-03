import { Group, Line, Arrow, Rect, Circle, Text } from 'react-konva';
import { isOutsideVisibleField } from './fieldConfigs';

const HANDLE_RADIUS = 6;
const HANDLE_FILL = '#fbbf24';
const HANDLE_STROKE = '#1c1917';

function getDraggableGroup(node) {
  while (node && !node.attrs?.draggable) {
    node = node.getParent();
  }
  return node;
}

function makeBodyDragHandlers({ el, p2r, r2p, applyChange, viewMode, size }) {
  return {
    draggable: true,
    onDragStart: (e) => {
      const node = getDraggableGroup(e.target);
      if (!node) return;
      node.opacity(1);
      node.scaleX(1);
      node.scaleY(1);
      const ring = node.findOne('.delIndicator');
      if (ring) ring.visible(false);
    },
    onDragMove: (e) => {
      const node = getDraggableGroup(e.target);
      if (!node) return;
      const dx = node.x();
      const dy = node.y();
      const checkPoints = el.points
        ? el.points.map((p) => {
            const px = r2p(p.x, p.y);
            return { x: px.x + dx, y: px.y + dy };
          })
        : null;
      const checkXY =
        typeof el.x === 'number' && typeof el.y === 'number' && !checkPoints
          ? (() => {
              const px = r2p(el.x, el.y);
              return { x: px.x + dx, y: px.y + dy };
            })()
          : null;
      let outside = false;
      if (checkPoints) {
        outside = checkPoints.some((pt) => {
          const r = p2r(pt.x, pt.y);
          return isOutsideVisibleField(r.x, r.y, viewMode, size.w, size.h);
        });
      } else if (checkXY) {
        const r = p2r(checkXY.x, checkXY.y);
        outside = isOutsideVisibleField(r.x, r.y, viewMode, size.w, size.h);
      }
      const ring = node.findOne('.delIndicator');
      if (outside) {
        node.opacity(0.4);
        node.scaleX(0.75);
        node.scaleY(0.75);
        if (ring) ring.visible(true);
      } else {
        node.opacity(1);
        node.scaleX(1);
        node.scaleY(1);
        if (ring) ring.visible(false);
      }
      node.getLayer()?.batchDraw();
    },
    onDragEnd: (e) => {
      const node = getDraggableGroup(e.target);
      if (!node) return;
      const dx = node.x();
      const dy = node.y();
      node.opacity(1);
      node.scaleX(1);
      node.scaleY(1);
      const ring = node.findOne('.delIndicator');
      if (ring) ring.visible(false);
      if (dx === 0 && dy === 0) {
        node.getLayer()?.batchDraw();
        return;
      }
      node.position({ x: 0, y: 0 });
      const newPoints = el.points
        ? el.points.map((p) => {
            const px = r2p(p.x, p.y);
            return p2r(px.x + dx, px.y + dy);
          })
        : null;
      const newXY =
        typeof el.x === 'number' && typeof el.y === 'number' && !newPoints
          ? (() => {
              const px = r2p(el.x, el.y);
              return p2r(px.x + dx, px.y + dy);
            })()
          : null;
      let outside = false;
      if (newPoints) {
        outside = newPoints.some((pt) =>
          isOutsideVisibleField(pt.x, pt.y, viewMode, size.w, size.h),
        );
      } else if (newXY) {
        outside = isOutsideVisibleField(newXY.x, newXY.y, viewMode, size.w, size.h);
      }
      if (outside) {
        applyChange((prev) => prev.filter((it) => it.id !== el.id));
      } else {
        applyChange((prev) =>
          prev.map((it) => {
            if (it.id !== el.id) return it;
            if (newPoints) return { ...it, points: newPoints };
            if (newXY) return { ...it, x: newXY.x, y: newXY.y };
            return it;
          }),
        );
      }
      node.getLayer()?.batchDraw();
    },
  };
}

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
      onMouseDown={(e) => {
        e.cancelBubble = true;
      }}
      onClick={(e) => {
        e.cancelBubble = true;
      }}
    />
  );
}

export function LineShape({
  el,
  selected,
  onSelect,
  p2r,
  r2p,
  applyChange,
  refScale,
  viewMode,
  size,
}) {
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
    applyChange((prev) =>
      prev.map((it) => {
        if (it.id !== el.id) return it;
        const nextPts = it.points.map((p, i) => (i === idx ? { x: r.x, y: r.y } : p));
        return { ...it, points: nextPts };
      }),
    );
  };
  const bodyHandlers = makeBodyDragHandlers({ el, p2r, r2p, applyChange, viewMode, size });
  const minX = Math.min(...el.points.map((p) => r2p(p.x, p.y).x));
  const minY = Math.min(...el.points.map((p) => r2p(p.x, p.y).y));
  const maxX = Math.max(...el.points.map((p) => r2p(p.x, p.y).x));
  const maxY = Math.max(...el.points.map((p) => r2p(p.x, p.y).y));
  return (
    <Group {...bodyHandlers} onClick={onSelect} onTap={onSelect}>
      <Rect
        name="delIndicator"
        x={minX - 8}
        y={minY - 8}
        width={(maxX - minX || 20) + 16}
        height={(maxY - minY || 20) + 16}
        stroke="#ff0000"
        strokeWidth={3}
        dash={[6, 4]}
        fill="rgba(255,0,0,0.2)"
        cornerRadius={4}
        listening={false}
        visible={false}
      />
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
      {selected &&
        el.points.map((p, idx) => {
          const px = r2p(p.x, p.y);
          return <VertexHandle key={idx} x={px.x} y={px.y} onUpdate={updateVertex(idx)} />;
        })}
    </Group>
  );
}

export function RectShape({
  el,
  selected,
  onSelect,
  p2r,
  r2p,
  applyChange,
  refScale,
  viewMode,
  size,
}) {
  const c1 = r2p(el.x, el.y);
  const c2 = r2p(el.x + el.w, el.y + el.h);
  const x = Math.min(c1.x, c2.x),
    y = Math.min(c1.y, c2.y);
  const w = Math.abs(c2.x - c1.x),
    h = Math.abs(c2.y - c1.y);
  const sw = Math.max(1, (el.thickness || 0.004) * refScale);
  const dash = el.dashed ? [sw * 3, sw * 2] : undefined;
  const bodyHandlers = makeBodyDragHandlers({
    el: {
      ...el,
      points: [
        { x: el.x, y: el.y },
        { x: el.x + el.w, y: el.y + el.h },
      ],
    },
    p2r,
    r2p,
    applyChange: (updater) =>
      applyChange((prev) => {
        const interim = updater(prev);
        return interim.map((it) => {
          if (it.id !== el.id || !it.points) return it;
          const [a, b] = it.points;
          const nx = Math.min(a.x, b.x),
            ny = Math.min(a.y, b.y);
          const nw = Math.abs(b.x - a.x),
            nh = Math.abs(b.y - a.y);
          const { points: _omit, ...rest } = it;
          return { ...rest, x: nx, y: ny, w: nw, h: nh };
        });
      }),
    viewMode,
    size,
  });
  const updateCorner = (corner) => (px, py) => {
    const r = p2r(px, py);
    applyChange((prev) =>
      prev.map((it) => {
        if (it.id !== el.id) return it;
        let nx = it.x,
          ny = it.y,
          nw = it.w,
          nh = it.h;
        if (corner === 'tl') {
          nw = it.x + it.w - r.x;
          nh = it.y + it.h - r.y;
          nx = r.x;
          ny = r.y;
        } else if (corner === 'tr') {
          nw = r.x - it.x;
          nh = it.y + it.h - r.y;
          ny = r.y;
        } else if (corner === 'bl') {
          nw = it.x + it.w - r.x;
          nh = r.y - it.y;
          nx = r.x;
        } else if (corner === 'br') {
          nw = r.x - it.x;
          nh = r.y - it.y;
        }
        if (nw < 0) {
          nx += nw;
          nw = -nw;
        }
        if (nh < 0) {
          ny += nh;
          nh = -nh;
        }
        return { ...it, x: nx, y: ny, w: nw, h: nh };
      }),
    );
  };

  const fontSize = Math.max(10, Math.min(14, (size?.w || refScale) * 0.015));
  const mWidth = (el.w * 105).toFixed(1);
  const mHeight = (el.h * 68).toFixed(1);
  const labelText = `${mWidth}m × ${mHeight}m`;
  // Estimate text width
  const labelWidth = labelText.length * fontSize * 0.6 + 12;
  const labelHeight = fontSize + 10;

  // Position at bottom-left corner of the canvas to avoid the center
  const labelX = 16;
  const labelY = (size?.h || 600) - labelHeight - 16;
  return (
    <Group {...bodyHandlers} onClick={onSelect} onTap={onSelect}>
      <Rect
        name="delIndicator"
        x={x - 8}
        y={y - 8}
        width={w + 16}
        height={h + 16}
        stroke="#ff0000"
        strokeWidth={3}
        dash={[6, 4]}
        fill="rgba(255,0,0,0.2)"
        cornerRadius={4}
        listening={false}
        visible={false}
      />
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        stroke={selected ? '#fbbf24' : el.color || '#000'}
        strokeWidth={selected ? sw + 2 : sw}
        dash={dash}
      />
      {selected && (
        <>
          <VertexHandle x={x} y={y} onUpdate={updateCorner('tl')} />
          <VertexHandle x={x + w} y={y} onUpdate={updateCorner('tr')} />
          <VertexHandle x={x} y={y + h} onUpdate={updateCorner('bl')} />
          <VertexHandle x={x + w} y={y + h} onUpdate={updateCorner('br')} />
          <Group x={labelX} y={labelY}>
            <Rect
              width={labelWidth}
              height={labelHeight}
              fill="rgba(15, 23, 42, 0.9)"
              cornerRadius={6}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={1}
            />
            <Text
              text={labelText}
              fontSize={fontSize}
              fontFamily="sans-serif"
              fill="#ffffff"
              fontStyle="bold"
              x={6}
              y={5}
            />
          </Group>
        </>
      )}
    </Group>
  );
}

export function CircleShape({
  el,
  selected,
  onSelect,
  p2r,
  r2p,
  applyChange,
  refScale,
  viewMode,
  size,
}) {
  const center = r2p(el.x, el.y);
  const radiusPx = (el.radius || 0.05) * refScale;
  const sw = Math.max(1, (el.thickness || 0.004) * refScale);
  const dash = el.dashed ? [sw * 3, sw * 2] : undefined;
  const bodyHandlers = makeBodyDragHandlers({ el, p2r, r2p, applyChange, viewMode, size });
  const updateRadius = (px) => {
    const dx = px - center.x;
    const newR = Math.hypot(dx, 0) / refScale;
    applyChange((prev) =>
      prev.map((it) => (it.id === el.id ? { ...it, radius: Math.max(0.01, newR) } : it)),
    );
  };

  const fontSize = Math.max(10, Math.min(14, (size?.w || refScale) * 0.015));
  const mRadius = (el.radius * 105).toFixed(1);
  const labelText = `r: ${mRadius}m`;
  const labelWidth = labelText.length * fontSize * 0.6 + 12;
  const labelHeight = fontSize + 10;

  // Position at bottom-left corner of the canvas to avoid the center
  const labelX = 16;
  const labelY = (size?.h || 600) - labelHeight - 16;
  return (
    <Group {...bodyHandlers} onClick={onSelect} onTap={onSelect}>
      <Rect
        name="delIndicator"
        x={center.x - radiusPx - 8}
        y={center.y - radiusPx - 8}
        width={radiusPx * 2 + 16}
        height={radiusPx * 2 + 16}
        stroke="#ff0000"
        strokeWidth={3}
        dash={[6, 4]}
        fill="rgba(255,0,0,0.2)"
        cornerRadius={8}
        listening={false}
        visible={false}
      />
      <Circle
        x={center.x}
        y={center.y}
        radius={radiusPx}
        stroke={selected ? '#fbbf24' : el.color || '#000'}
        strokeWidth={selected ? sw + 2 : sw}
        dash={dash}
        hitStrokeWidth={Math.max(12, sw + 12)}
        fillEnabled={false}
      />
      {selected && (
        <>
          <VertexHandle x={center.x} y={center.y} onUpdate={() => {}} />
          <VertexHandle x={center.x + radiusPx} y={center.y} onUpdate={(px) => updateRadius(px)} />
          <Group x={labelX} y={labelY}>
            <Rect
              width={labelWidth}
              height={labelHeight}
              fill="rgba(15, 23, 42, 0.9)"
              cornerRadius={6}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={1}
            />
            <Text
              text={labelText}
              fontSize={fontSize}
              fontFamily="sans-serif"
              fill="#ffffff"
              fontStyle="bold"
              x={6}
              y={5}
            />
          </Group>
        </>
      )}
    </Group>
  );
}
