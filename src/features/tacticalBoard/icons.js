/**
 * Datos de iconos paleta — port de misterdata getInitialIcons / getMaterialsIcons.
 */

export const PALETTE_PLAYERS = [
  { id: 'icon1', type: 'player', label: 'Jugador azul',    color: '#2176ff', size: 24, number: 1 },
  { id: 'icon2', type: 'player', label: 'Jugador rojo',    color: '#ff3838', size: 24, number: 1 },
  { id: 'icon3', type: 'player', label: 'Jugador naranja', color: '#ffa600', size: 24, number: 1 },
];

export const PALETTE_GROUPS = [
  { id: 'team-players',   type: 'team-players',   label: 'Jugadores de plantilla', color: '#000000', size: 24 },
  { id: 'coaching-staff', type: 'coaching-staff', label: 'Cuerpo técnico',         color: '#333333', size: 24 },
];

// Botón especial: abre la sub-paleta de materiales
export const PALETTE_MATERIALS_BUTTON = {
  id: 'materials-button', type: 'materials-button', label: 'Materiales', color: '#666', size: 24,
};

export const PALETTE_LINES = [
  { id: 'straight-arrow', type: 'straight-arrow', label: 'Flecha recta',   color: '#000000', size: 32, thickness: 2 },
  { id: 'straight-line',  type: 'straight-line',  label: 'Línea recta',    color: '#000000', size: 32, thickness: 2 },
  { id: 'curve-line',     type: 'curve-line',     label: 'Línea curva',    color: '#000000', size: 32, thickness: 2 },
  { id: 'curve-arrow',    type: 'curve-arrow',    label: 'Flecha curva',   color: '#000000', size: 32, thickness: 2 },
  { id: 'circle',         type: 'circle',         label: 'Círculo',        color: '#000000', size: 32, thickness: 2 },
  { id: 'rectangle',      type: 'rectangle',      label: 'Rectángulo',     color: '#000000', size: 32, thickness: 2 },
];

export const MATERIALS_ICONS = [
  { id: 'ball',       type: 'ball',       label: 'Balón',          color: '#ffffff', size: 14 },
  { id: 'cone-pro',   type: 'cone-pro',   label: 'Cono',           color: '#FF6B00', size: 18 },
  { id: 'cone-flat',  type: 'cone-flat',  label: 'Cono plano',     color: '#FF6B00', size: 24 },
  { id: 'ring',       type: 'ring',       label: 'Anilla',         color: '#FFD700', size: 24 },
  { id: 'goal-large', type: 'goal-large', label: 'Portería grande', color: '#FFFFFF', size: 50, rotatable: true },
  { id: 'goal-small', type: 'goal-small', label: 'Portería pequeña', color: '#FF6B00', size: 40, rotatable: true },
  { id: 'barrier',    type: 'barrier',    label: 'Valla',          color: '#FFFFFF', size: 40, rotatable: true },
  { id: 'dummy',      type: 'dummy',      label: 'Maniquí',        color: '#2196F3', size: 40, rotatable: true },
  { id: 'pole',       type: 'pole',       label: 'Pica',           color: '#FFD700', size: 35, rotatable: true },
  { id: 'ladder',     type: 'ladder',     label: 'Escalera',       color: '#000000', size: 40, rotatable: true },
  { id: 'weights',    type: 'weights',    label: 'Pesas',          color: '#333333', size: 24 },
];

export const MATERIAL_TYPES_SET = new Set(MATERIALS_ICONS.map(i => i.type));
export const LINE_TYPES_SET = new Set(['straight-line', 'straight-arrow', 'curve-line', 'curve-arrow', 'circle', 'rectangle', 'custom-shape']);

export const ZINDEX_BASE_LINES     = 1000;
export const ZINDEX_BASE_MATERIALS = 5000;
export const ZINDEX_BASE_ICONS     = 10000;

export function getZIndexBaseForType(type) {
  if (LINE_TYPES_SET.has(type)) return ZINDEX_BASE_LINES;
  if (MATERIAL_TYPES_SET.has(type)) return ZINDEX_BASE_MATERIALS;
  return ZINDEX_BASE_ICONS;
}
