// Paleta de colores de la pizarra táctica
export const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#1a237e', '#ef4444',
  '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f97316', '#6b7280',
];

export const TEAM_COLORS = {
  home: '#1a237e',
  away: '#ef4444',
  staff: '#111827',
};

export function isValidHex(c) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c || '');
}
