/**
 * Formaciones de fútbol para pizarra táctica.
 * Coordenadas en ratio (0..1) con el propio campo (eje X = lado-a-lado, eje Y = fondo-a-fondo).
 * Convención: equipo "home" ataca de izquierda a derecha (x bajos = portería propia).
 */

const F11 = {
  '4-4-2': [
    { x: 0.06, y: 0.50, pos: 'GK' },
    { x: 0.20, y: 0.15, pos: 'LB' },
    { x: 0.20, y: 0.38, pos: 'CB' },
    { x: 0.20, y: 0.62, pos: 'CB' },
    { x: 0.20, y: 0.85, pos: 'RB' },
    { x: 0.42, y: 0.15, pos: 'LM' },
    { x: 0.42, y: 0.38, pos: 'CM' },
    { x: 0.42, y: 0.62, pos: 'CM' },
    { x: 0.42, y: 0.85, pos: 'RM' },
    { x: 0.62, y: 0.38, pos: 'ST' },
    { x: 0.62, y: 0.62, pos: 'ST' },
  ],
  '4-3-3': [
    { x: 0.06, y: 0.50, pos: 'GK' },
    { x: 0.20, y: 0.15, pos: 'LB' },
    { x: 0.20, y: 0.38, pos: 'CB' },
    { x: 0.20, y: 0.62, pos: 'CB' },
    { x: 0.20, y: 0.85, pos: 'RB' },
    { x: 0.38, y: 0.30, pos: 'CM' },
    { x: 0.38, y: 0.50, pos: 'CM' },
    { x: 0.38, y: 0.70, pos: 'CM' },
    { x: 0.62, y: 0.18, pos: 'LW' },
    { x: 0.62, y: 0.50, pos: 'ST' },
    { x: 0.62, y: 0.82, pos: 'RW' },
  ],
  '4-2-3-1': [
    { x: 0.06, y: 0.50, pos: 'GK' },
    { x: 0.20, y: 0.15, pos: 'LB' },
    { x: 0.20, y: 0.38, pos: 'CB' },
    { x: 0.20, y: 0.62, pos: 'CB' },
    { x: 0.20, y: 0.85, pos: 'RB' },
    { x: 0.35, y: 0.38, pos: 'CDM' },
    { x: 0.35, y: 0.62, pos: 'CDM' },
    { x: 0.50, y: 0.20, pos: 'LM' },
    { x: 0.50, y: 0.50, pos: 'CAM' },
    { x: 0.50, y: 0.80, pos: 'RM' },
    { x: 0.65, y: 0.50, pos: 'ST' },
  ],
  '3-5-2': [
    { x: 0.06, y: 0.50, pos: 'GK' },
    { x: 0.20, y: 0.28, pos: 'CB' },
    { x: 0.20, y: 0.50, pos: 'CB' },
    { x: 0.20, y: 0.72, pos: 'CB' },
    { x: 0.38, y: 0.12, pos: 'LM' },
    { x: 0.38, y: 0.35, pos: 'CM' },
    { x: 0.38, y: 0.50, pos: 'CM' },
    { x: 0.38, y: 0.65, pos: 'CM' },
    { x: 0.38, y: 0.88, pos: 'RM' },
    { x: 0.62, y: 0.38, pos: 'ST' },
    { x: 0.62, y: 0.62, pos: 'ST' },
  ],
  '5-3-2': [
    { x: 0.06, y: 0.50, pos: 'GK' },
    { x: 0.18, y: 0.12, pos: 'LB' },
    { x: 0.18, y: 0.30, pos: 'CB' },
    { x: 0.18, y: 0.50, pos: 'CB' },
    { x: 0.18, y: 0.70, pos: 'CB' },
    { x: 0.18, y: 0.88, pos: 'RB' },
    { x: 0.40, y: 0.30, pos: 'CM' },
    { x: 0.40, y: 0.50, pos: 'CM' },
    { x: 0.40, y: 0.70, pos: 'CM' },
    { x: 0.62, y: 0.38, pos: 'ST' },
    { x: 0.62, y: 0.62, pos: 'ST' },
  ],
};

const F8 = {
  '3-3-1': [
    { x: 0.08, y: 0.50, pos: 'GK' },
    { x: 0.24, y: 0.25, pos: 'DEF' },
    { x: 0.24, y: 0.50, pos: 'DEF' },
    { x: 0.24, y: 0.75, pos: 'DEF' },
    { x: 0.45, y: 0.25, pos: 'MID' },
    { x: 0.45, y: 0.50, pos: 'MID' },
    { x: 0.45, y: 0.75, pos: 'MID' },
    { x: 0.65, y: 0.50, pos: 'ST' },
  ],
  '2-3-2': [
    { x: 0.08, y: 0.50, pos: 'GK' },
    { x: 0.22, y: 0.35, pos: 'DEF' },
    { x: 0.22, y: 0.65, pos: 'DEF' },
    { x: 0.42, y: 0.25, pos: 'MID' },
    { x: 0.42, y: 0.50, pos: 'MID' },
    { x: 0.42, y: 0.75, pos: 'MID' },
    { x: 0.62, y: 0.38, pos: 'ST' },
    { x: 0.62, y: 0.62, pos: 'ST' },
  ],
  '3-2-2': [
    { x: 0.08, y: 0.50, pos: 'GK' },
    { x: 0.24, y: 0.25, pos: 'DEF' },
    { x: 0.24, y: 0.50, pos: 'DEF' },
    { x: 0.24, y: 0.75, pos: 'DEF' },
    { x: 0.45, y: 0.35, pos: 'MID' },
    { x: 0.45, y: 0.65, pos: 'MID' },
    { x: 0.65, y: 0.38, pos: 'ST' },
    { x: 0.65, y: 0.62, pos: 'ST' },
  ],
};

const F7 = {
  '2-3-1': [
    { x: 0.10, y: 0.50, pos: 'GK' },
    { x: 0.26, y: 0.35, pos: 'DEF' },
    { x: 0.26, y: 0.65, pos: 'DEF' },
    { x: 0.46, y: 0.25, pos: 'MID' },
    { x: 0.46, y: 0.50, pos: 'MID' },
    { x: 0.46, y: 0.75, pos: 'MID' },
    { x: 0.66, y: 0.50, pos: 'ST' },
  ],
  '3-2-1': [
    { x: 0.10, y: 0.50, pos: 'GK' },
    { x: 0.26, y: 0.25, pos: 'DEF' },
    { x: 0.26, y: 0.50, pos: 'DEF' },
    { x: 0.26, y: 0.75, pos: 'DEF' },
    { x: 0.48, y: 0.38, pos: 'MID' },
    { x: 0.48, y: 0.62, pos: 'MID' },
    { x: 0.66, y: 0.50, pos: 'ST' },
  ],
  '2-2-2': [
    { x: 0.10, y: 0.50, pos: 'GK' },
    { x: 0.26, y: 0.35, pos: 'DEF' },
    { x: 0.26, y: 0.65, pos: 'DEF' },
    { x: 0.46, y: 0.35, pos: 'MID' },
    { x: 0.46, y: 0.65, pos: 'MID' },
    { x: 0.66, y: 0.38, pos: 'ST' },
    { x: 0.66, y: 0.62, pos: 'ST' },
  ],
};

export const FORMATIONS_BY_COUNT = { 7: F7, 8: F8, 11: F11 };

export const FORMATION_NAMES = {
  7: Object.keys(F7),
  8: Object.keys(F8),
  11: Object.keys(F11),
};

/** Espeja horizontalmente una formación (para rival). */
export function mirrorFormation(positions) {
  return positions.map((p) => ({ ...p, x: 1 - p.x }));
}

/**
 * Aplica una formación devolviendo un array de elementos "player".
 * @param {number} count 7|8|11
 * @param {string} name clave (ej. '4-3-3')
 * @param {string} color
 * @param {string} prefix id prefix
 * @param {boolean} mirror equipo rival
 */
export function buildFormation({ count = 11, name, color = '#1a237e', prefix = 'H', mirror = false }) {
  const pool = FORMATIONS_BY_COUNT[count] || F11;
  const positions = pool[name] || Object.values(pool)[0];
  const finalPos = mirror ? mirrorFormation(positions) : positions;
  return finalPos.map((p, i) => ({
    id: `${prefix}${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'player',
    x: p.x,
    y: p.y,
    color,
    label: i === 0 ? 'GK' : String(i),
    position: p.pos,
    rotation: 0,
  }));
}
