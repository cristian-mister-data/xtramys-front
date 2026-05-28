import ballPng from '@/images/ball.png';

export default function PaletteIcon({ icon, size = 32 }) {
  const s = size;
  const half = s / 2;
  const color = icon.color || '#2176ff';

  if (icon.type === 'player') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={half} cy={half} r={half - 2} fill={color} stroke="#222" strokeWidth="1" />
        <text x={half} y={half} textAnchor="middle" dominantBaseline="central"
          fontSize={s * 0.5} fontWeight="bold" fill="#fff">{icon.number ?? ''}</text>
      </svg>
    );
  }
  if (icon.type === 'team-players') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={half} cy={half} r={half - 2} fill={color} stroke="#222" strokeWidth="1" />
        <text x={half} y={half + 1} textAnchor="middle" dominantBaseline="central" fontSize={s * 0.55}>👥</text>
      </svg>
    );
  }
  if (icon.type === 'coaching-staff') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={half} cy={half} r={half - 2} fill={color} stroke="#222" strokeWidth="1" />
        <text x={half} y={half + 1} textAnchor="middle" dominantBaseline="central" fontSize={s * 0.55}>📋</text>
      </svg>
    );
  }
  if (icon.type === 'materials-button') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <rect x="2" y="2" width={s - 4} height={s - 4} rx="4" fill="#666" stroke="#222" />
        {/* simbolo cuadrícula */}
        <g stroke="#fff" strokeWidth="1.5" fill="none">
          <rect x={s * 0.25} y={s * 0.25} width={s * 0.18} height={s * 0.18} />
          <rect x={s * 0.55} y={s * 0.25} width={s * 0.18} height={s * 0.18} />
          <rect x={s * 0.25} y={s * 0.55} width={s * 0.18} height={s * 0.18} />
          <rect x={s * 0.55} y={s * 0.55} width={s * 0.18} height={s * 0.18} />
        </g>
      </svg>
    );
  }
  if (icon.type === 'ball') {
    return (
      <img src={ballPng} style={{ width: s, height: s, objectFit: 'contain' }} alt="Ball" />
    );
  }
  if (icon.type === 'cone-pro') {
    const c = color || '#FF6B00';
    return (
      <svg width={s} height={s} viewBox="0 0 50 50">
        <path d="M 10 45 L 25 8 L 40 45 Z" fill={c} stroke="#000" strokeWidth="1" />
        <path d="M 15 38 L 25 15 L 35 38" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.7" />
        <rect x="8" y="43" width="34" height="5" fill={c} stroke="#000" strokeWidth="1" rx="1" />
      </svg>
    );
  }
  if (icon.type === 'cone-flat') {
    const c = color || '#FF6B00';
    return (
      <svg width={s} height={s * 0.55} viewBox="0 0 40 20">
        <path d="M 2 14 Q 20 22 38 14 Q 20 6 2 14 Z" fill={c} stroke="#000" strokeWidth="1" />
        <path d="M 8 12 Q 20 8 32 12" stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (icon.type === 'ring') {
    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={half} cy={half} r={half - 4} fill="none" stroke={color || '#FFD700'} strokeWidth={s * 0.18} />
      </svg>
    );
  }
  if (icon.type === 'goal-large') {
    return (
      <svg width={s} height={s * 0.6} viewBox="0 0 120 70">
        <path d="M 5 65 L 5 10 L 115 10 L 115 65" stroke="#FFFFFF" strokeWidth="4" fill="none" />
        {[15, 30, 45, 60, 75, 90, 105].map((xv) => <path key={xv} d={`M ${xv} 10 L ${xv} 65`} stroke="#CCCCCC" strokeWidth="1" opacity="0.6" />)}
        {[25, 40, 55].map((yv) => <path key={yv} d={`M 5 ${yv} L 115 ${yv}`} stroke="#CCCCCC" strokeWidth="1" opacity="0.6" />)}
      </svg>
    );
  }
  if (icon.type === 'goal-small') {
    return (
      <svg width={s} height={s * 0.62} viewBox="0 0 80 50">
        <path d="M 5 45 L 5 8 L 75 8 L 75 45" stroke="#FF6B00" strokeWidth="3" fill="none" />
        <path d="M 20 8 L 20 45" stroke="#CCCCCC" strokeWidth="1" opacity="0.5" />
        <path d="M 40 8 L 40 45" stroke="#CCCCCC" strokeWidth="1" opacity="0.5" />
        <path d="M 60 8 L 60 45" stroke="#CCCCCC" strokeWidth="1" opacity="0.5" />
        <path d="M 5 25 L 75 25" stroke="#CCCCCC" strokeWidth="1" opacity="0.5" />
      </svg>
    );
  }
  if (icon.type === 'barrier') {
    return (
      <svg width={s} height={s * 0.4} viewBox="0 0 100 40">
        <path d="M 5 35 L 5 8 L 95 8 L 95 35" stroke="#FFFFFF" strokeWidth="3" fill="none" />
      </svg>
    );
  }
  if (icon.type === 'dummy') {
    const c = color || '#2196F3';
    return (
      <svg width={s * 0.6} height={s} viewBox="0 0 40 80">
        <circle cx="20" cy="75" r="8" fill="#333" />
        <rect x="18" y="25" width="4" height="50" fill="#444" />
        <path d="M 8 25 Q 20 20 32 25 L 30 50 Q 20 52 10 50 Z" fill={c} stroke="#1565C0" strokeWidth="1" />
        <path d="M 5 28 Q 20 22 35 28" stroke="#1565C0" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="20" cy="12" r="10" fill="#FFE0B2" stroke="#FFCC80" strokeWidth="1" />
      </svg>
    );
  }
  if (icon.type === 'pole') {
    const c = color || '#FFD700';
    return (
      <svg width={s * 0.4} height={s} viewBox="0 0 24 80">
        <rect x="10" y="5" width="4" height="60" fill={c} />
        <path d="M 4 75 L 12 55 L 20 75 Z" fill="#FF6B00" stroke="#E65100" strokeWidth="1" />
        <rect x="2" y="73" width="20" height="4" fill="#E65100" rx="1" />
      </svg>
    );
  }
  if (icon.type === 'ladder') {
    return (
      <svg width={s} height={s * 0.5} viewBox="0 0 50 25">
        <line x1="2" y1="4" x2="48" y2="4" stroke="#000" strokeWidth="2" />
        <line x1="2" y1="21" x2="48" y2="21" stroke="#000" strokeWidth="2" />
        {[12, 22, 32, 42].map((xv) => <line key={xv} x1={xv} y1="4" x2={xv} y2="21" stroke="#000" strokeWidth="2" />)}
      </svg>
    );
  }
  if (icon.type === 'weights') {
    const c = color || '#333';
    return (
      <svg width={s} height={s} viewBox="0 0 50 50">
        <rect x="10" y="22" width="30" height="6" fill="#666" rx="1" />
        <rect x="2" y="12" width="6" height="26" fill={c} rx="2" />
        <rect x="8" y="16" width="4" height="18" fill={c} rx="1" />
        <rect x="38" y="16" width="4" height="18" fill={c} rx="1" />
        <rect x="42" y="12" width="6" height="26" fill={c} rx="2" />
      </svg>
    );
  }

  // ---- LINE / SHAPE TOOLS ----
  if (icon.type === 'straight-line') {
    return <svg width={s} height={s} viewBox="0 0 40 40"><line x1="6" y1="34" x2="34" y2="6" stroke="#000" strokeWidth="2.5" /></svg>;
  }
  if (icon.type === 'straight-arrow') {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <line x1="6" y1="34" x2="32" y2="8" stroke="#000" strokeWidth="2.5" />
        <polygon points="32,8 26,10 30,14" fill="#000" />
      </svg>
    );
  }
  if (icon.type === 'curve-line') {
    return <svg width={s} height={s} viewBox="0 0 40 40"><path d="M 6 32 Q 20 6 34 32" fill="none" stroke="#000" strokeWidth="2.5" /></svg>;
  }
  if (icon.type === 'curve-arrow') {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <path d="M 6 32 Q 20 6 32 30" fill="none" stroke="#000" strokeWidth="2.5" />
        <polygon points="32,30 27,28 30,24" fill="#000" />
      </svg>
    );
  }
  if (icon.type === 'circle') {
    return <svg width={s} height={s} viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="none" stroke="#000" strokeWidth="2.5" /></svg>;
  }
  if (icon.type === 'rectangle') {
    return <svg width={s} height={s} viewBox="0 0 40 40"><rect x="6" y="10" width="28" height="20" fill="none" stroke="#000" strokeWidth="2.5" /></svg>;
  }
  if (icon.type === 'text') {
    return <svg width={s} height={s} viewBox="0 0 40 40"><text x="20" y="22" textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="bold" fill="#000">T</text></svg>;
  }
  if (icon.type === 'connector') {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <circle cx="8" cy="20" r="4" fill="#2176ff" />
        <circle cx="32" cy="20" r="4" fill="#ff3838" />
        <line x1="11" y1="20" x2="29" y2="20" stroke="#000" strokeWidth="2.5" strokeDasharray="3,3" />
      </svg>
    );
  }
  if (icon.type === 'eraser') {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <rect x="8" y="14" width="20" height="14" rx="2" fill="#fbbf24" stroke="#222" transform="rotate(-30 18 21)" />
      </svg>
    );
  }

  return <svg width={s} height={s}><circle cx={half} cy={half} r="4" fill="#f00" /></svg>;
}
