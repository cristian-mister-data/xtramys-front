// Position metadata mirroring xtramys mobile app

export const POSITION_VALUES = ['portero', 'lateral', 'central', 'centrocampista', 'extremo', 'delantero'];

export const POSITION_ORDER = {
  portero: 0,
  lateral: 1,
  central: 2,
  centrocampista: 3,
  extremo: 4,
  delantero: 5,
};

const COLORS = {
  portero: ['#10b981', '#059669'],
  central: ['#3b82f6', '#2563eb'],
  lateral: ['#8b5cf6', '#7c3aed'],
  centrocampista: ['#f59e0b', '#d97706'],
  extremo: ['#ec4899', '#db2777'],
  delantero: ['#ef4444', '#dc2626'],
};

const ICONS = {
  portero: '🧤',
  lateral: '🛡️',
  central: '🛡️',
  centrocampista: '⚙️',
  extremo: '⚡',
  delantero: '⚽',
};

export const getPositionColor = (pos) => COLORS[(pos || '').toLowerCase()] || ['#6366f1', '#4f46e5'];
export const getPositionIcon = (pos) => ICONS[(pos || '').toLowerCase()] || '👤';

export const getPositionOptions = (t) => [
  { value: 'portero', label: t('player.positions.goalkeeper', 'Portero') },
  { value: 'lateral', label: t('player.positions.lateral', 'Lateral') },
  { value: 'central', label: t('player.positions.central', 'Central') },
  { value: 'centrocampista', label: t('player.positions.midfielder', 'Centrocampista') },
  { value: 'extremo', label: t('player.positions.winger', 'Extremo') },
  { value: 'delantero', label: t('player.positions.forward', 'Delantero') },
];

export const translatePosition = (pos, t) => {
  if (!pos) return '';
  const key = pos.toLowerCase();
  const map = {
    portero: 'player.positions.goalkeeper',
    lateral: 'player.positions.lateral',
    central: 'player.positions.central',
    centrocampista: 'player.positions.midfielder',
    extremo: 'player.positions.winger',
    delantero: 'player.positions.forward',
  };
  if (map[key]) return t(map[key], pos);
  return pos;
};

export const getPlayerFullName = (p) => {
  if (!p) return '';
  return `${p.nombre || ''} ${p.apellido || ''}`.trim();
};

export const getPlayerInitials = (p) => {
  if (!p) return '?';
  const a = (p.nombre || '').trim().charAt(0).toUpperCase();
  const b = (p.apellido || '').trim().charAt(0).toUpperCase();
  return (a + b) || '?';
};

export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
