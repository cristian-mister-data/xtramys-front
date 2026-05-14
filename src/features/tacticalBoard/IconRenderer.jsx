import { useState, useEffect, useRef } from 'react';
import { Group, Circle, Rect, Path, Text, Image as KonvaImage } from 'react-konva';
import { cdnUrl } from '@/config';

const SIZE_FACTOR = 1.4;

function pixelSize(el, scale) {
  const base = (el.size || 24) * SIZE_FACTOR;
  return base * Math.max(0.7, Math.min(1.6, scale / 900));
}

function ViewBoxGroup({ vbW, vbH, renderW, renderH, children }) {
  return (
    <Group scaleX={renderW / vbW} scaleY={renderH / vbH} offsetX={vbW / 2} offsetY={vbH / 2}>
      {children}
    </Group>
  );
}

const DELETE_INDICATOR_STYLE = {
  stroke: '#ff0000',
  strokeWidth: 3,
  dash: [6, 4],
  fill: 'rgba(255,0,0,0.2)',
  cornerRadius: 6,
};

function DelIndicator({ width, height, padding = 10 }) {
  const indicatorW = Math.max(20, width + padding * 2);
  const indicatorH = Math.max(20, height + padding * 2);
  return (
    <Group name="delIndicator" listening={false} visible={false}>
      <Rect
        x={-indicatorW / 2}
        y={-indicatorH / 2}
        width={indicatorW}
        height={indicatorH}
        {...DELETE_INDICATOR_STYLE}
      />
    </Group>
  );
}

function PlayerPhoto({ fotoUrl, size }) {
  const [image, setImage] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!fotoUrl) { setImage(null); return; }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { if (mountedRef.current) setImage(img); };
    img.onerror = () => { if (mountedRef.current) setImage(null); };
    img.src = cdnUrl(fotoUrl);
    return () => { mountedRef.current = false; };
  }, [fotoUrl]);

  if (!image) return null;
  return <KonvaImage image={image} x={-size / 2} y={-size / 2} width={size} height={size} listening={false} />;
}

export default function IconRenderer({ el, scale, x, y, selected, onDragStart, onDragEnd, onDragMove, onClick, onTap }) {
  const size = pixelSize(el, scale);
  const half = size / 2;
  const color = el.color || '#2176ff';
  const groupProps = {
    x, y,
    draggable: true,
    onDragStart,
    onDragEnd,
    onDragMove,
    onClick,
    onTap,
    rotation: el.rotation || 0,
  };
  const selRing = (r) => selected
    ? <Circle radius={r} stroke="#fbbf24" strokeWidth={1.5} dash={[3, 3]} listening={false} />
    : null;

  const showPhoto = el.showPhotos && el.playerData?.foto;
  const photoSize = size - 4;
  const stripeColor = el.goalkeeperStripeColor || '#ffffff';

  // ---------------------- PLAYER ----------------------
  if (el.type === 'player') {
    const number = el.number ?? el.label ?? '';
    const fontSize = String(number).length > 2 ? size * 0.4 : size * 0.6;
    const showGoalkeeperStripes = el.isGoalkeeper && el.differentiateGoalkeeper !== false && !showPhoto;
    return (
      <Group {...groupProps}>
        <DelIndicator width={size} height={size} />
        <Circle radius={half} fill={showPhoto ? 'transparent' : color} stroke={showPhoto ? color : selected ? '#fbbf24' : '#222'} strokeWidth={showPhoto ? 2 : selected ? 2 : 1} shadowBlur={selected ? 6 : 2} />
        {showPhoto && (
          <Group clipFunc={(ctx) => { ctx.arc(0, 0, half - 2, 0, Math.PI * 2); ctx.closePath(); }}>
            <PlayerPhoto fotoUrl={el.playerData.foto} size={photoSize} />
          </Group>
        )}
        {showGoalkeeperStripes && [0.1, 0.35, 0.6, 0.85].map((f, i) => (
          <Rect key={i} x={-half} y={-half + size * f} width={size} height={2} fill={stripeColor} opacity={0.85} listening={false} />
        ))}
        {!showPhoto && String(number) !== '' && (
          <Text text={String(number)} fontSize={fontSize} fontStyle="bold" fill={el.numberColor || '#fff'} align="center" verticalAlign="middle" width={size} height={size} offsetX={half} offsetY={half} listening={false} />
        )}
        {selected && <Circle radius={half} stroke="#fbbf24" strokeWidth={2} listening={false} />}
      </Group>
    );
  }

  // ---------------------- TEAM-PLAYERS ----------------------
  if (el.type === 'team-players') {
    return (
      <Group {...groupProps}>
        <DelIndicator width={size} height={size} />
        <Circle radius={half} fill={color} stroke={selected ? '#fbbf24' : '#222'} strokeWidth={selected ? 2 : 1} />
        <Text text="👥" fontSize={size * 0.7} align="center" verticalAlign="middle" width={size} height={size} offsetX={half} offsetY={half} listening={false} />
      </Group>
    );
  }

  // ---------------------- COACHING-STAFF ----------------------
  if (el.type === 'coaching-staff') {
    return (
      <Group {...groupProps}>
        <DelIndicator width={size} height={size} />
        <Circle radius={half} fill={color} stroke={selected ? '#fbbf24' : '#222'} strokeWidth={selected ? 2 : 1} />
        <Text text="📋" fontSize={size * 0.65} align="center" verticalAlign="middle" width={size} height={size} offsetX={half} offsetY={half} listening={false} />
      </Group>
    );
  }

  // ---------------------- BALL ----------------------
  if (el.type === 'ball') {
    return (
      <Group {...groupProps}>
        <DelIndicator width={size} height={size} />
        <Text text="⚽" fontSize={size * 0.95} align="center" verticalAlign="middle" width={size} height={size} offsetX={half} offsetY={half} />
        {selected && <Circle radius={half * 1.15} stroke="#fbbf24" strokeWidth={1.5} dash={[3, 3]} listening={false} />}
      </Group>
    );
  }

  // ---------------------- CONE-PRO ----------------------
  if (el.type === 'cone-pro') {
    const c = color || '#FF6B00';
    return (
      <Group {...groupProps}>
        <DelIndicator width={size} height={size} />
        <ViewBoxGroup vbW={50} vbH={50} renderW={size} renderH={size}>
          <Path data="M 10 45 L 25 8 L 40 45 Z" fill={c} stroke="#000" strokeWidth={1} />
          <Path data="M 15 38 L 25 15 L 35 38" stroke="#FFFFFF" strokeWidth={2} fill="" opacity={0.7} />
          <Rect x={8} y={43} width={34} height={5} fill={c} stroke="#000" strokeWidth={1} cornerRadius={1} />
          <Path data="M 18 35 L 25 18" stroke="#FFFFFF" strokeWidth={1} opacity={0.4} />
        </ViewBoxGroup>
        {selRing(half * 1.2)}
      </Group>
    );
  }

  // ---------------------- CONE-FLAT ----------------------
  if (el.type === 'cone-flat') {
    const c = color || '#FF6B00';
    return (
      <Group {...groupProps}>
        <DelIndicator width={size} height={size * 0.5} />
        <ViewBoxGroup vbW={40} vbH={20} renderW={size} renderH={size * 0.5}>
          <Path data="M 2 14 Q 20 22 38 14 Q 20 6 2 14 Z" fill={c} stroke="#000" strokeWidth={1} />
          <Path data="M 8 12 Q 20 8 32 12" stroke="rgba(255,255,255,0.5)" strokeWidth={2} fill="" />
        </ViewBoxGroup>
        {selRing(half * 1.1)}
      </Group>
    );
  }

  // ---------------------- RING ----------------------
  if (el.type === 'ring') {
    const c = color || '#FFD700';
    const sw = Math.max(2, size * 0.12);
    return (
      <Group {...groupProps}>
        <DelIndicator width={size} height={size} />
        <ViewBoxGroup vbW={40} vbH={40} renderW={size} renderH={size}>
          <Circle x={20} y={20} radius={16} fill="" stroke={c} strokeWidth={(sw / size) * 40} />
          <Circle x={20} y={20} radius={13} fill="" stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
        </ViewBoxGroup>
        {selRing(half + 4)}
      </Group>
    );
  }

  // ---------------------- GOAL-LARGE ----------------------
  if (el.type === 'goal-large') {
    const w = size * 1.6, h = size * 0.96, c = color || '#FFFFFF';
    return (
      <Group {...groupProps}>
        <DelIndicator width={w} height={h} />
        <ViewBoxGroup vbW={120} vbH={70} renderW={w} renderH={h}>
          <Path data="M 5 65 L 5 10 L 115 10 L 115 65" stroke={c} strokeWidth={4} fill="" />
          {[15, 30, 45, 60, 75, 90, 105].map((xv) => (
            <Path key={xv} data={`M ${xv} 10 L ${xv} 65`} stroke="#CCCCCC" strokeWidth={1} opacity={0.6} />
          ))}
          {[25, 40, 55].map((yv) => (
            <Path key={yv} data={`M 5 ${yv} L 115 ${yv}`} stroke="#CCCCCC" strokeWidth={1} opacity={0.6} />
          ))}
        </ViewBoxGroup>
        {selected && <Rect x={-w / 2 - 4} y={-h / 2 - 4} width={w + 8} height={h + 8} stroke="#fbbf24" strokeWidth={1.5} dash={[4, 3]} fillEnabled={false} listening={false} />}
      </Group>
    );
  }

  // ---------------------- GOAL-SMALL ----------------------
  if (el.type === 'goal-small') {
    const w = size * 1.1, h = size * 0.78, c = color || '#FF6B00';
    return (
      <Group {...groupProps}>
        <DelIndicator width={w} height={h} />
        <ViewBoxGroup vbW={80} vbH={50} renderW={w} renderH={h}>
          <Path data="M 5 45 L 5 8 L 75 8 L 75 45" stroke={c} strokeWidth={3} fill="" />
          <Path data="M 20 8 L 20 45" stroke="#CCCCCC" strokeWidth={1} opacity={0.5} />
          <Path data="M 40 8 L 40 45" stroke="#CCCCCC" strokeWidth={1} opacity={0.5} />
          <Path data="M 60 8 L 60 45" stroke="#CCCCCC" strokeWidth={1} opacity={0.5} />
          <Path data="M 5 25 L 75 25" stroke="#CCCCCC" strokeWidth={1} opacity={0.5} />
        </ViewBoxGroup>
        {selected && <Rect x={-w / 2 - 4} y={-h / 2 - 4} width={w + 8} height={h + 8} stroke="#fbbf24" strokeWidth={1.5} dash={[4, 3]} fillEnabled={false} listening={false} />}
      </Group>
    );
  }

  // ---------------------- BARRIER ----------------------
  if (el.type === 'barrier') {
    const w = size * 1.5, h = size * 0.6, c = color || '#FFFFFF';
    return (
      <Group {...groupProps}>
        <DelIndicator width={w} height={h} />
        <ViewBoxGroup vbW={100} vbH={40} renderW={w} renderH={h}>
          <Path data="M 5 35 L 5 8 L 95 8 L 95 35" stroke={c} strokeWidth={3} fill="" />
        </ViewBoxGroup>
        {selected && <Rect x={-w / 2 - 4} y={-h / 2 - 4} width={w + 8} height={h + 8} stroke="#fbbf24" strokeWidth={1.5} dash={[4, 3]} fillEnabled={false} listening={false} />}
      </Group>
    );
  }

  // ---------------------- DUMMY ----------------------
  if (el.type === 'dummy') {
    const w = size * 0.7, h = size * 1.4, c = color || '#2196F3', dark = c === '#2196F3' ? '#1565C0' : c;
    return (
      <Group {...groupProps}>
        <DelIndicator width={w} height={h} />
        <ViewBoxGroup vbW={40} vbH={80} renderW={w} renderH={h}>
          <Circle x={20} y={75} radius={8} fill="#333333" />
          <Rect x={18} y={25} width={4} height={50} fill="#444444" />
          <Path data="M 8 25 Q 20 20 32 25 L 30 50 Q 20 52 10 50 Z" fill={c} stroke={dark} strokeWidth={1} />
          <Path data="M 5 28 Q 20 22 35 28" stroke={dark} strokeWidth={3} fill="" lineCap="round" />
          <Circle x={20} y={12} radius={10} fill="#FFE0B2" stroke="#FFCC80" strokeWidth={1} />
        </ViewBoxGroup>
        {selRing(Math.max(w, h) * 0.6)}
      </Group>
    );
  }

  // ---------------------- POLE ----------------------
  if (el.type === 'pole') {
    const w = size * 0.45, h = size * 1.4, c = color || '#FFD700';
    return (
      <Group {...groupProps}>
        <DelIndicator width={w} height={h} />
        <ViewBoxGroup vbW={24} vbH={80} renderW={w} renderH={h}>
          <Rect x={10} y={5} width={4} height={60} fill={c} />
          <Path data="M 4 75 L 12 55 L 20 75 Z" fill="#FF6B00" stroke="#E65100" strokeWidth={1} />
          <Rect x={2} y={73} width={20} height={4} fill="#E65100" cornerRadius={1} />
        </ViewBoxGroup>
        {selRing(Math.max(w, h) * 0.6)}
      </Group>
    );
  }

  // ---------------------- LADDER ----------------------
  if (el.type === 'ladder') {
    const w = size * 1.8, h = size * 0.55, x0 = -w / 2, y0 = -h / 2, c = color || '#000000', rungs = 5;
    const rungEls = [];
    for (let i = 1; i < rungs; i++) {
      const xv = x0 + (w * i) / rungs;
      rungEls.push(<Path key={i} data={`M ${xv} ${y0} L ${xv} ${y0 + h}`} stroke={c} strokeWidth={2} />);
    }
    return (
      <Group {...groupProps}>
        <DelIndicator width={w} height={h} />
        <Path data={`M ${x0} ${y0} L ${x0 + w} ${y0}`} stroke={c} strokeWidth={2} />
        <Path data={`M ${x0} ${y0 + h} L ${x0 + w} ${y0 + h}`} stroke={c} strokeWidth={2} />
        {rungEls}
        {selected && <Rect x={x0 - 4} y={y0 - 4} width={w + 8} height={h + 8} stroke="#fbbf24" strokeWidth={1.5} dash={[4, 3]} fillEnabled={false} listening={false} />}
      </Group>
    );
  }

  // ---------------------- WEIGHTS ----------------------
  if (el.type === 'weights') {
    const c = color || '#333333';
    return (
      <Group {...groupProps}>
        <DelIndicator width={size} height={size} />
        <ViewBoxGroup vbW={50} vbH={50} renderW={size} renderH={size}>
          <Rect x={10} y={22} width={30} height={6} fill="#666666" cornerRadius={1} />
          <Rect x={2} y={12} width={6} height={26} fill={c} cornerRadius={2} />
          <Rect x={8} y={16} width={4} height={18} fill={c} cornerRadius={1} />
          <Rect x={38} y={16} width={4} height={18} fill={c} cornerRadius={1} />
          <Rect x={42} y={12} width={6} height={26} fill={c} cornerRadius={2} />
          <Rect x={3} y={14} width={2} height={8} fill="rgba(255,255,255,0.3)" cornerRadius={1} />
          <Rect x={43} y={14} width={2} height={8} fill="rgba(255,255,255,0.3)" cornerRadius={1} />
        </ViewBoxGroup>
        {selRing(half * 1.2)}
      </Group>
    );
  }

  // ---------------------- FALLBACK ----------------------
  return (
    <Group {...groupProps}>
      <DelIndicator width={12} height={12} />
      <Circle radius={6} fill="#f00" />
    </Group>
  );
}