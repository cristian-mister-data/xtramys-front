import i18n from '@/i18n';
export // Definiciones de formaciones de f�tbol con posiciones en ratios (0-1)
// yRatio: 0 = arriba (ataque), 1 = abajo (defensa)
// xRatio: 0 = izquierda, 1 = derecha
// Posiciones est�ndar disponibles
const POSITION_TYPES = [
  'GK',
  // Portero
  'LB',
  // Lateral Izquierdo
  'CB',
  // Central
  'RB',
  // Lateral Derecho
  'CDM',
  // Mediocentro Defensivo
  'CM',
  // Centrocampista
  'CAM',
  // Mediapunta
  'LM',
  // Mediocampista Izquierdo
  'RM',
  // Mediocampista Derecho
  'LW',
  // Extremo Izquierdo
  'RW',
  // Extremo Derecho
  'ST', // Delantero Centro
];

// Etiquetas por defecto para posiciones (m�ximo 2 caracteres)
// Funci�n que retorna las etiquetas traducidas seg�n el idioma actual
export // Etiquetas por defecto para posiciones (m�ximo 2 caracteres)
// Funci�n que retorna las etiquetas traducidas seg�n el idioma actual
const getDefaultPositionLabels = () => ({
  GK: i18n.t('formations.positionLabels.GK'),
  LB: i18n.t('formations.positionLabels.LB'),
  CB: i18n.t('formations.positionLabels.CB'),
  RB: i18n.t('formations.positionLabels.RB'),
  CDM: i18n.t('formations.positionLabels.CDM'),
  CM: i18n.t('formations.positionLabels.CM'),
  CAM: i18n.t('formations.positionLabels.CAM'),
  LM: i18n.t('formations.positionLabels.LM'),
  RM: i18n.t('formations.positionLabels.RM'),
  LW: i18n.t('formations.positionLabels.LW'),
  RW: i18n.t('formations.positionLabels.RW'),
  ST: i18n.t('formations.positionLabels.ST'),
});
export const FORMATIONS = {
  '1-4-4-2': {
    name: '1-4-4-2',
    positions: [
      // Portero
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      // Defensas (4)
      {
        xRatio: 0.15,
        yRatio: 0.75,
        number: 2,
        position: 'LB',
      },
      {
        xRatio: 0.35,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.65,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.85,
        yRatio: 0.75,
        number: 5,
        position: 'RB',
      },
      // Medios (4)
      {
        xRatio: 0.15,
        yRatio: 0.6,
        number: 6,
        position: 'LM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.6,
        number: 7,
        position: 'CM',
      },
      {
        xRatio: 0.65,
        yRatio: 0.6,
        number: 8,
        position: 'CM',
      },
      {
        xRatio: 0.85,
        yRatio: 0.6,
        number: 9,
        position: 'RM',
      },
      // Delanteros (2)
      {
        xRatio: 0.35,
        yRatio: 0.4,
        number: 10,
        position: 'ST',
      },
      {
        xRatio: 0.65,
        yRatio: 0.4,
        number: 11,
        position: 'ST',
      },
    ],
  },
  '1-4-3-3': {
    name: '1-4-3-3',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.15,
        yRatio: 0.75,
        number: 2,
        position: 'LB',
      },
      {
        xRatio: 0.35,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.65,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.85,
        yRatio: 0.75,
        number: 5,
        position: 'RB',
      },
      {
        xRatio: 0.25,
        yRatio: 0.6,
        number: 6,
        position: 'CM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.6,
        number: 7,
        position: 'CM',
      },
      {
        xRatio: 0.75,
        yRatio: 0.6,
        number: 8,
        position: 'CM',
      },
      {
        xRatio: 0.15,
        yRatio: 0.4,
        number: 9,
        position: 'LW',
      },
      {
        xRatio: 0.5,
        yRatio: 0.35,
        number: 10,
        position: 'ST',
      },
      {
        xRatio: 0.85,
        yRatio: 0.4,
        number: 11,
        position: 'RW',
      },
    ],
  },
  '1-4-2-3-1': {
    name: '1-4-2-3-1',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.15,
        yRatio: 0.75,
        number: 2,
        position: 'LB',
      },
      {
        xRatio: 0.35,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.65,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.85,
        yRatio: 0.75,
        number: 5,
        position: 'RB',
      },
      {
        xRatio: 0.35,
        yRatio: 0.6,
        number: 6,
        position: 'CDM',
      },
      {
        xRatio: 0.65,
        yRatio: 0.6,
        number: 7,
        position: 'CDM',
      },
      {
        xRatio: 0.15,
        yRatio: 0.45,
        number: 8,
        position: 'LW',
      },
      {
        xRatio: 0.5,
        yRatio: 0.45,
        number: 9,
        position: 'CAM',
      },
      {
        xRatio: 0.85,
        yRatio: 0.45,
        number: 10,
        position: 'RW',
      },
      {
        xRatio: 0.5,
        yRatio: 0.35,
        number: 11,
        position: 'ST',
      },
    ],
  },
  '1-3-5-2': {
    name: '1-3-5-2',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.25,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.75,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.1,
        yRatio: 0.6,
        number: 5,
        position: 'LM',
      },
      {
        xRatio: 0.3,
        yRatio: 0.6,
        number: 6,
        position: 'CM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.6,
        number: 7,
        position: 'CM',
      },
      {
        xRatio: 0.7,
        yRatio: 0.6,
        number: 8,
        position: 'CM',
      },
      {
        xRatio: 0.9,
        yRatio: 0.6,
        number: 9,
        position: 'RM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.4,
        number: 10,
        position: 'ST',
      },
      {
        xRatio: 0.65,
        yRatio: 0.4,
        number: 11,
        position: 'ST',
      },
    ],
  },
  '1-3-4-3': {
    name: '1-3-4-3',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.25,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.75,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.2,
        yRatio: 0.6,
        number: 5,
        position: 'LM',
      },
      {
        xRatio: 0.4,
        yRatio: 0.6,
        number: 6,
        position: 'CM',
      },
      {
        xRatio: 0.6,
        yRatio: 0.6,
        number: 7,
        position: 'CM',
      },
      {
        xRatio: 0.8,
        yRatio: 0.6,
        number: 8,
        position: 'RM',
      },
      {
        xRatio: 0.15,
        yRatio: 0.4,
        number: 9,
        position: 'LW',
      },
      {
        xRatio: 0.5,
        yRatio: 0.35,
        number: 10,
        position: 'ST',
      },
      {
        xRatio: 0.85,
        yRatio: 0.4,
        number: 11,
        position: 'RW',
      },
    ],
  },
  '1-4-5-1': {
    name: '1-4-5-1',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.15,
        yRatio: 0.75,
        number: 2,
        position: 'LB',
      },
      {
        xRatio: 0.35,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.65,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.85,
        yRatio: 0.75,
        number: 5,
        position: 'RB',
      },
      {
        xRatio: 0.1,
        yRatio: 0.6,
        number: 6,
        position: 'LM',
      },
      {
        xRatio: 0.3,
        yRatio: 0.6,
        number: 7,
        position: 'CM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.6,
        number: 8,
        position: 'CM',
      },
      {
        xRatio: 0.7,
        yRatio: 0.6,
        number: 9,
        position: 'CM',
      },
      {
        xRatio: 0.9,
        yRatio: 0.6,
        number: 10,
        position: 'RM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.4,
        number: 11,
        position: 'ST',
      },
    ],
  },
  '1-5-3-2': {
    name: '1-5-3-2',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.1,
        yRatio: 0.75,
        number: 2,
        position: 'LB',
      },
      {
        xRatio: 0.3,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.7,
        yRatio: 0.75,
        number: 5,
        position: 'CB',
      },
      {
        xRatio: 0.9,
        yRatio: 0.75,
        number: 6,
        position: 'RB',
      },
      {
        xRatio: 0.25,
        yRatio: 0.6,
        number: 7,
        position: 'CM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.6,
        number: 8,
        position: 'CM',
      },
      {
        xRatio: 0.75,
        yRatio: 0.6,
        number: 9,
        position: 'CM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.4,
        number: 10,
        position: 'ST',
      },
      {
        xRatio: 0.65,
        yRatio: 0.4,
        number: 11,
        position: 'ST',
      },
    ],
  },
  '1-5-4-1': {
    name: '1-5-4-1',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.1,
        yRatio: 0.75,
        number: 2,
        position: 'LB',
      },
      {
        xRatio: 0.3,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.7,
        yRatio: 0.75,
        number: 5,
        position: 'CB',
      },
      {
        xRatio: 0.9,
        yRatio: 0.75,
        number: 6,
        position: 'RB',
      },
      {
        xRatio: 0.2,
        yRatio: 0.6,
        number: 7,
        position: 'LM',
      },
      {
        xRatio: 0.4,
        yRatio: 0.6,
        number: 8,
        position: 'CM',
      },
      {
        xRatio: 0.6,
        yRatio: 0.6,
        number: 9,
        position: 'CM',
      },
      {
        xRatio: 0.8,
        yRatio: 0.6,
        number: 10,
        position: 'RM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.4,
        number: 11,
        position: 'ST',
      },
    ],
  },
  '1-4-1-4-1': {
    name: '1-4-1-4-1',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.15,
        yRatio: 0.75,
        number: 2,
        position: 'LB',
      },
      {
        xRatio: 0.35,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.65,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.85,
        yRatio: 0.75,
        number: 5,
        position: 'RB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.65,
        number: 6,
        position: 'CDM',
      },
      {
        xRatio: 0.15,
        yRatio: 0.55,
        number: 7,
        position: 'LM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.55,
        number: 8,
        position: 'CM',
      },
      {
        xRatio: 0.65,
        yRatio: 0.55,
        number: 9,
        position: 'CM',
      },
      {
        xRatio: 0.85,
        yRatio: 0.55,
        number: 10,
        position: 'RM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.4,
        number: 11,
        position: 'ST',
      },
    ],
  },
  '1-3-4-1-2': {
    name: '1-3-4-1-2',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.25,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.75,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.2,
        yRatio: 0.6,
        number: 5,
        position: 'LM',
      },
      {
        xRatio: 0.4,
        yRatio: 0.6,
        number: 6,
        position: 'CM',
      },
      {
        xRatio: 0.6,
        yRatio: 0.6,
        number: 7,
        position: 'CM',
      },
      {
        xRatio: 0.8,
        yRatio: 0.6,
        number: 8,
        position: 'RM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.5,
        number: 9,
        position: 'CAM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.4,
        number: 10,
        position: 'ST',
      },
      {
        xRatio: 0.65,
        yRatio: 0.4,
        number: 11,
        position: 'ST',
      },
    ],
  },
  '1-4-3-2-1': {
    name: '1-4-3-2-1',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.15,
        yRatio: 0.75,
        number: 2,
        position: 'LB',
      },
      {
        xRatio: 0.35,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.65,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.85,
        yRatio: 0.75,
        number: 5,
        position: 'RB',
      },
      {
        xRatio: 0.25,
        yRatio: 0.6,
        number: 6,
        position: 'CM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.6,
        number: 7,
        position: 'CM',
      },
      {
        xRatio: 0.75,
        yRatio: 0.6,
        number: 8,
        position: 'CM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.4,
        number: 9,
        position: 'CAM',
      },
      {
        xRatio: 0.65,
        yRatio: 0.4,
        number: 10,
        position: 'CAM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.35,
        number: 11,
        position: 'ST',
      },
    ],
  },
  '1-4-1-2-1-2': {
    name: '1-4-1-2-1-2',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.15,
        yRatio: 0.75,
        number: 2,
        position: 'LB',
      },
      {
        xRatio: 0.35,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.65,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.85,
        yRatio: 0.75,
        number: 5,
        position: 'RB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.65,
        number: 6,
        position: 'CDM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.55,
        number: 7,
        position: 'CM',
      },
      {
        xRatio: 0.65,
        yRatio: 0.55,
        number: 8,
        position: 'CM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.45,
        number: 9,
        position: 'CAM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.35,
        number: 10,
        position: 'ST',
      },
      {
        xRatio: 0.65,
        yRatio: 0.35,
        number: 11,
        position: 'ST',
      },
    ],
  },
};

// Formaciones para 8 jugadores (f�tbol 8)
export // Formaciones para 8 jugadores (f�tbol 8)
const FORMATIONS_8 = {
  '1-3-3-1': {
    name: '1-3-3-1',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.25,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.75,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.25,
        yRatio: 0.55,
        number: 5,
        position: 'LM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.55,
        number: 6,
        position: 'CM',
      },
      {
        xRatio: 0.75,
        yRatio: 0.55,
        number: 7,
        position: 'RM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.35,
        number: 8,
        position: 'ST',
      },
    ],
  },
  '1-2-3-2': {
    name: '1-2-3-2',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.35,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.65,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.25,
        yRatio: 0.55,
        number: 4,
        position: 'LM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.55,
        number: 5,
        position: 'CM',
      },
      {
        xRatio: 0.75,
        yRatio: 0.55,
        number: 6,
        position: 'RM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.35,
        number: 7,
        position: 'ST',
      },
      {
        xRatio: 0.65,
        yRatio: 0.35,
        number: 8,
        position: 'ST',
      },
    ],
  },
  '1-3-2-2': {
    name: '1-3-2-2',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.25,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.75,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.35,
        yRatio: 0.55,
        number: 5,
        position: 'CM',
      },
      {
        xRatio: 0.65,
        yRatio: 0.55,
        number: 6,
        position: 'CM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.35,
        number: 7,
        position: 'ST',
      },
      {
        xRatio: 0.65,
        yRatio: 0.35,
        number: 8,
        position: 'ST',
      },
    ],
  },
  '1-2-4-1': {
    name: '1-2-4-1',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.35,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.65,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.15,
        yRatio: 0.55,
        number: 4,
        position: 'LM',
      },
      {
        xRatio: 0.38,
        yRatio: 0.55,
        number: 5,
        position: 'CM',
      },
      {
        xRatio: 0.62,
        yRatio: 0.55,
        number: 6,
        position: 'CM',
      },
      {
        xRatio: 0.85,
        yRatio: 0.55,
        number: 7,
        position: 'RM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.35,
        number: 8,
        position: 'ST',
      },
    ],
  },
  '1-3-1-3': {
    name: '1-3-1-3',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.25,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.75,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.55,
        number: 5,
        position: 'CM',
      },
      {
        xRatio: 0.2,
        yRatio: 0.35,
        number: 6,
        position: 'LW',
      },
      {
        xRatio: 0.5,
        yRatio: 0.35,
        number: 7,
        position: 'ST',
      },
      {
        xRatio: 0.8,
        yRatio: 0.35,
        number: 8,
        position: 'RW',
      },
    ],
  },
  '1-4-2-1': {
    name: '1-4-2-1',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.15,
        yRatio: 0.75,
        number: 2,
        position: 'LB',
      },
      {
        xRatio: 0.38,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.62,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.85,
        yRatio: 0.75,
        number: 5,
        position: 'RB',
      },
      {
        xRatio: 0.35,
        yRatio: 0.55,
        number: 6,
        position: 'CM',
      },
      {
        xRatio: 0.65,
        yRatio: 0.55,
        number: 7,
        position: 'CM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.35,
        number: 8,
        position: 'ST',
      },
    ],
  },
};

// Formaciones para 7 jugadores (f�tbol 7)
export // Formaciones para 7 jugadores (f�tbol 7)
const FORMATIONS_7 = {
  '1-3-2-1': {
    name: '1-3-2-1',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.25,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.75,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.35,
        yRatio: 0.55,
        number: 5,
        position: 'CM',
      },
      {
        xRatio: 0.65,
        yRatio: 0.55,
        number: 6,
        position: 'CM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.35,
        number: 7,
        position: 'ST',
      },
    ],
  },
  '1-2-3-1': {
    name: '1-2-3-1',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.35,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.65,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.25,
        yRatio: 0.55,
        number: 4,
        position: 'LM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.55,
        number: 5,
        position: 'CM',
      },
      {
        xRatio: 0.75,
        yRatio: 0.55,
        number: 6,
        position: 'RM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.35,
        number: 7,
        position: 'ST',
      },
    ],
  },
  '1-2-2-2': {
    name: '1-2-2-2',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.35,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.65,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.35,
        yRatio: 0.55,
        number: 4,
        position: 'CM',
      },
      {
        xRatio: 0.65,
        yRatio: 0.55,
        number: 5,
        position: 'CM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.35,
        number: 6,
        position: 'ST',
      },
      {
        xRatio: 0.65,
        yRatio: 0.35,
        number: 7,
        position: 'ST',
      },
    ],
  },
  '1-3-1-2': {
    name: '1-3-1-2',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.25,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.75,
        yRatio: 0.75,
        number: 4,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.55,
        number: 5,
        position: 'CM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.35,
        number: 6,
        position: 'ST',
      },
      {
        xRatio: 0.65,
        yRatio: 0.35,
        number: 7,
        position: 'ST',
      },
    ],
  },
  '1-1-3-2': {
    name: '1-1-3-2',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.5,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.25,
        yRatio: 0.55,
        number: 3,
        position: 'LM',
      },
      {
        xRatio: 0.5,
        yRatio: 0.55,
        number: 4,
        position: 'CM',
      },
      {
        xRatio: 0.75,
        yRatio: 0.55,
        number: 5,
        position: 'RM',
      },
      {
        xRatio: 0.35,
        yRatio: 0.35,
        number: 6,
        position: 'ST',
      },
      {
        xRatio: 0.65,
        yRatio: 0.35,
        number: 7,
        position: 'ST',
      },
    ],
  },
  '1-2-1-3': {
    name: '1-2-1-3',
    positions: [
      {
        xRatio: 0.5,
        yRatio: 0.92,
        number: 1,
        position: 'GK',
      },
      {
        xRatio: 0.35,
        yRatio: 0.75,
        number: 2,
        position: 'CB',
      },
      {
        xRatio: 0.65,
        yRatio: 0.75,
        number: 3,
        position: 'CB',
      },
      {
        xRatio: 0.5,
        yRatio: 0.55,
        number: 4,
        position: 'CM',
      },
      {
        xRatio: 0.2,
        yRatio: 0.35,
        number: 5,
        position: 'LW',
      },
      {
        xRatio: 0.5,
        yRatio: 0.35,
        number: 6,
        position: 'ST',
      },
      {
        xRatio: 0.8,
        yRatio: 0.35,
        number: 7,
        position: 'RW',
      },
    ],
  },
};

// Mapa de formaciones por cantidad de jugadores
export // Mapa de formaciones por cantidad de jugadores
const FORMATIONS_BY_PLAYER_COUNT = {
  7: FORMATIONS_7,
  8: FORMATIONS_8,
  11: FORMATIONS,
};

// Legacy helper removed "� field selection now uses lineType + viewMode directly

// Funci�n para obtener los iconos iniciales con etiquetas traducidas
export // Legacy helper removed "� field selection now uses lineType + viewMode directly

// Funci�n para obtener los iconos iniciales con etiquetas traducidas
const DEFAULT_PLAYER_ICON_SIZE = 24;
export const DEFAULT_PLAYER_NUMBER_COLOR = '#ffffff';
export const NEUTRAL_PLAYER_COLORS = {
  background: '#0F766E',
  bib: '#FBBF24',
  letter: '#111827',
};
export const getDefaultNeutralPlayerSettings = () => ({
  color: NEUTRAL_PLAYER_COLORS.bib,
  backgroundColor: NEUTRAL_PLAYER_COLORS.background,
  numberColor: NEUTRAL_PLAYER_COLORS.letter,
  size: DEFAULT_PLAYER_ICON_SIZE,
  shape: 'circle',
  hasStripes: false,
  stripeColor: '#111827',
  hasBib: true,
  bibColor: NEUTRAL_PLAYER_COLORS.bib,
  isNeutral: true,
});
export const DEFAULT_GOALKEEPER_ICON_1_SETTINGS = {
  color: '#ffffff',
  size: DEFAULT_PLAYER_ICON_SIZE,
  shape: 'circle',
  hasStripes: true,
  stripeColor: '#dc2626',
  numberColor: '#111827',
  isGoalkeeper: true,
  goalkeeperStripeColor: '#dc2626',
};
export const DEFAULT_GOALKEEPER_ICON_2_SETTINGS = {
  color: '#2176ff',
  size: DEFAULT_PLAYER_ICON_SIZE,
  shape: 'circle',
  hasStripes: true,
  stripeColor: '#111827',
  numberColor: '#ffffff',
  isGoalkeeper: true,
  goalkeeperStripeColor: '#111827',
};
export const getDefaultBoardSettings = () => ({
  playerIcon1: {
    color: '#2176ff',
    size: DEFAULT_PLAYER_ICON_SIZE,
    shape: 'circle',
    hasStripes: false,
    stripeColor: '#ffffff',
    numberColor: DEFAULT_PLAYER_NUMBER_COLOR,
  },
  playerIcon2: {
    color: '#ff3838',
    size: DEFAULT_PLAYER_ICON_SIZE,
    shape: 'circle',
    hasStripes: false,
    stripeColor: '#ffffff',
    numberColor: DEFAULT_PLAYER_NUMBER_COLOR,
  },
  playerIcon3: {
    color: '#ffa600',
    size: DEFAULT_PLAYER_ICON_SIZE,
    shape: 'circle',
    hasStripes: false,
    stripeColor: '#ffffff',
    numberColor: DEFAULT_PLAYER_NUMBER_COLOR,
  },
  goalkeeperIcon1: {
    ...DEFAULT_GOALKEEPER_ICON_1_SETTINGS,
  },
  goalkeeperIcon2: {
    ...DEFAULT_GOALKEEPER_ICON_2_SETTINGS,
  },
  playerIcon4: getDefaultNeutralPlayerSettings(),
  teamPlayers: {
    color: '#2176ff',
    goalkeeperColor: '#ff4a4a',
    size: DEFAULT_PLAYER_ICON_SIZE,
    numberColor: DEFAULT_PLAYER_NUMBER_COLOR,
    textColor: '#000000',
    textBackgroundColor: '#ffffff',
    differentiateGoalkeeper: true,
    goalkeeperStripeColor: '#ffffff',
    showPhotos: false,
    shape: 'circle',
    hasStripes: false,
    hasBib: false,
    bibColor: NEUTRAL_PLAYER_COLORS.bib,
    stripeColor: '#ffffff',
  },
});
export const mergeIconSettings = (defaults, fallback, settings) => ({
  ...defaults,
  ...(fallback || {}),
  ...(settings || {}),
  numberColor: settings?.numberColor ?? fallback?.numberColor ?? defaults.numberColor,
  size: settings?.size ?? fallback?.size ?? defaults.size,
});
export const normalizeBoardSettings = (settings = {}, fallback = {}) => {
  settings = settings || {};
  fallback = fallback || {};
  const defaults = getDefaultBoardSettings();
  return {
    ...defaults,
    ...fallback,
    ...settings,
    playerIcon1: mergeIconSettings(
      defaults.playerIcon1,
      fallback.playerIcon1,
      settings.playerIcon1,
    ),
    playerIcon2: mergeIconSettings(
      defaults.playerIcon2,
      fallback.playerIcon2,
      settings.playerIcon2,
    ),
    playerIcon3: mergeIconSettings(
      defaults.playerIcon3,
      fallback.playerIcon3,
      settings.playerIcon3,
    ),
    goalkeeperIcon1: mergeIconSettings(
      defaults.goalkeeperIcon1,
      fallback.goalkeeperIcon1,
      settings.goalkeeperIcon1,
    ),
    goalkeeperIcon2: mergeIconSettings(
      defaults.goalkeeperIcon2,
      fallback.goalkeeperIcon2,
      settings.goalkeeperIcon2,
    ),
    playerIcon4: {
      ...mergeIconSettings(defaults.playerIcon4, fallback.playerIcon4, settings.playerIcon4),
      hasBib: true,
    },
    teamPlayers: mergeIconSettings(
      defaults.teamPlayers,
      fallback.teamPlayers,
      settings.teamPlayers,
    ),
  };
};
export const isNeutralPlayerIcon = (icon) =>
  icon?.type === 'player' && (icon?.isNeutral === true || icon?.id === 'neutral-player');
export const getInitialIcons = () => [
  {
    id: 'icon1',
    type: 'player',
    label: i18n.t('tacticalBoard.icons.bluePlayer'),
    color: '#2176ff',
    size: DEFAULT_PLAYER_ICON_SIZE,
    number: 2,
    shape: 'circle',
    hasStripes: false,
    stripeColor: '#ffffff',
    numberColor: DEFAULT_PLAYER_NUMBER_COLOR,
  },
  {
    id: 'icon2',
    type: 'player',
    label: i18n.t('tacticalBoard.icons.redPlayer'),
    color: '#ff3838',
    size: DEFAULT_PLAYER_ICON_SIZE,
    number: 2,
    shape: 'circle',
    hasStripes: false,
    stripeColor: '#ffffff',
    numberColor: DEFAULT_PLAYER_NUMBER_COLOR,
  },
  {
    id: 'goalkeeper-1',
    type: 'player',
    label: i18n.t('tacticalBoard.icons.goalkeeper', {
      defaultValue: 'Portero',
    }),
    number: 1,
    ...DEFAULT_GOALKEEPER_ICON_1_SETTINGS,
  },
  {
    id: 'goalkeeper-2',
    type: 'player',
    label: i18n.t('tacticalBoard.icons.goalkeeper', {
      defaultValue: 'Portero',
    }),
    number: 1,
    ...DEFAULT_GOALKEEPER_ICON_2_SETTINGS,
  },
  {
    id: 'neutral-player',
    type: 'player',
    label: i18n.t('tacticalBoard.icons.neutralPlayer', {
      defaultValue: 'Comodín',
    }),
    number: 'N',
    ...getDefaultNeutralPlayerSettings(),
  },
  {
    id: 'team-players',
    type: 'team-players',
    label: i18n.t('tacticalBoard.icons.teamPlayers'),
    color: '#000000ff',
    size: DEFAULT_PLAYER_ICON_SIZE,
  },
  {
    id: 'coaching-staff',
    type: 'coaching-staff',
    label: i18n.t('tacticalBoard.icons.coachingStaff'),
    color: '#333333',
    size: 24,
  },
  {
    id: 'materials-button',
    type: 'materials-button',
    label: i18n.t('tacticalBoard.icons.materials'),
    color: '#666',
    size: 24,
  },
  {
    id: 'straight-arrow',
    type: 'straight-arrow',
    label: i18n.t('tacticalBoard.icons.straightArrow'),
    color: '#000000',
    size: 32,
    thickness: 1,
  },
  {
    id: 'straight-line',
    type: 'straight-line',
    label: i18n.t('tacticalBoard.icons.straightLine'),
    color: '#000000',
    size: 32,
    thickness: 1,
  },
  {
    id: 'curve-line',
    type: 'curve-line',
    label: i18n.t('tacticalBoard.icons.curvedLine'),
    color: '#000000',
    size: 32,
    thickness: 1,
  },
  {
    id: 'curve-arrow',
    type: 'curve-arrow',
    label: i18n.t('tacticalBoard.icons.curvedArrow'),
    color: '#000000',
    size: 32,
    thickness: 1,
  },
  {
    id: 'circle',
    type: 'circle',
    label: i18n.t('tacticalBoard.icons.circle'),
    color: '#000000',
    size: 32,
    thickness: 1,
  },
  {
    id: 'rectangle',
    type: 'rectangle',
    label: i18n.t('tacticalBoard.icons.rectangle'),
    color: '#000000',
    size: 32,
    thickness: 1,
  },
  {
    id: 'custom-shape-button',
    type: 'custom-shape-button',
    label: i18n.t('tacticalBoard.icons.customShape'),
    color: '#000000',
    size: 32,
    thickness: 1,
    inPalette: true,
  },
];

// Set de tipos de materiales/herramientas para filtrado r�pido
export // Set de tipos de materiales/herramientas para filtrado r�pido
const MATERIAL_TYPES_SET = new Set([
  'ball',
  'ball-shadow',
  'cone-pro',
  'cone-flat',
  'ring',
  'goal-large',
  'goal-small',
  'barrier',
  'dummy',
  'pole',
  'ladder',
  'weights',
]);

// Set de tipos de l�neas/formas
export // Set de tipos de l�neas/formas
const LINE_TYPES_SET = new Set([
  'straight-line',
  'straight-arrow',
  'curve-line',
  'curve-arrow',
  'circle',
  'rectangle',
  'custom-shape',
]);

// Bases de z-index por grupo (l�neas abajo, materiales medio, jugadores/staff arriba)
export // Bases de z-index por grupo (l�neas abajo, materiales medio, jugadores/staff arriba)
const ZINDEX_BASE_LINES = 1000;
export const ZINDEX_BASE_MATERIALS = 5000;
export const ZINDEX_BASE_ICONS = 10000;
export function getZIndexBaseForType(type) {
  if (LINE_TYPES_SET.has(type)) return ZINDEX_BASE_LINES;
  if (MATERIAL_TYPES_SET.has(type)) return ZINDEX_BASE_MATERIALS;
  return ZINDEX_BASE_ICONS;
}
export const ACTIVE_BOARD_DRAG_KEY = '__activeBoardDragKey';
export function acquireBoardDrag(dragStart, dragKey) {
  if (!dragStart?.current) return false;
  const key = String(dragKey);
  const activeKey = dragStart.current[ACTIVE_BOARD_DRAG_KEY];
  if (activeKey && activeKey !== key) return false;
  dragStart.current[ACTIVE_BOARD_DRAG_KEY] = key;
  return true;
}
export function isBoardDragOwner(dragStart, dragKey) {
  return dragStart?.current?.[ACTIVE_BOARD_DRAG_KEY] === String(dragKey);
}
export function releaseBoardDrag(dragStart, dragKey) {
  if (isBoardDragOwner(dragStart, dragKey)) {
    delete dragStart.current[ACTIVE_BOARD_DRAG_KEY];
  }
}

// Funci�n para obtener los iconos de materiales con etiquetas traducidas
export // Funci�n para obtener los iconos de materiales con etiquetas traducidas
const getMaterialsIcons = () => [
  {
    id: 'ball',
    type: 'ball',
    label: i18n.t('tacticalBoard.icons.ball'),
    color: '#fff',
    size: 14,
    editable: true,
  },
  {
    id: 'cone-pro',
    type: 'cone-pro',
    label: i18n.t('tacticalBoard.icons.cone'),
    color: '#FF6B00',
    size: 18,
    editable: true,
  },
  {
    id: 'cone-flat',
    type: 'cone-flat',
    label: i18n.t('tacticalBoard.icons.coneFlat'),
    color: '#FF6B00',
    size: 24,
    editable: true,
  },
  {
    id: 'ring',
    type: 'ring',
    label: i18n.t('tacticalBoard.icons.ring'),
    color: '#FFD700',
    size: 24,
    editable: true,
  },
  {
    id: 'goal-large',
    type: 'goal-large',
    label: i18n.t('tacticalBoard.icons.bigGoal'),
    color: '#FFFFFF',
    size: 50,
    rotatable: true,
    editable: true,
  },
  {
    id: 'goal-small',
    type: 'goal-small',
    label: i18n.t('tacticalBoard.icons.smallGoal'),
    color: '#FF6B00',
    size: 40,
    rotatable: true,
    editable: true,
  },
  {
    id: 'barrier',
    type: 'barrier',
    label: i18n.t('tacticalBoard.icons.fence'),
    color: '#FFFFFF',
    size: 40,
    rotatable: true,
    editable: true,
  },
  {
    id: 'dummy',
    type: 'dummy',
    label: i18n.t('tacticalBoard.icons.mannequin'),
    color: '#2196F3',
    size: 40,
    rotatable: true,
    editable: true,
  },
  {
    id: 'pole',
    type: 'pole',
    label: i18n.t('tacticalBoard.icons.pole'),
    color: '#FFD700',
    size: 35,
    rotatable: true,
    editable: true,
  },
  {
    id: 'ladder',
    type: 'ladder',
    label: i18n.t('tacticalBoard.icons.ladder'),
    color: '#000000',
    size: 40,
    rotatable: true,
    editable: true,
  },
  {
    id: 'weights',
    type: 'weights',
    label: i18n.t('tacticalBoard.icons.weights'),
    color: '#333333',
    size: 24,
    editable: true,
  },
];
export function isValidHexColor(color) {
  return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color);
}

// Funci�n para obtener abreviatura de posici�n de jugador
export // Funci�n para obtener abreviatura de posici�n de jugador
function getPositionAbbreviation(position) {
  if (!position) return '';
  const positionLower = position.toLowerCase();
  const abbreviations = {
    portero: 'POR',
    goalkeeper: 'GK',
    lateral: 'LAT',
    'lateral derecho': 'LD',
    'lateral izquierdo': 'LI',
    'right back': 'RB',
    'left back': 'LB',
    central: 'DEF',
    defensa: 'DEF',
    'defensa central': 'DC',
    'center back': 'CB',
    centrocampista: 'MC',
    mediocentro: 'MC',
    mediocampista: 'MC',
    midfielder: 'MF',
    'central midfielder': 'CM',
    pivote: 'PIV',
    mediapunta: 'MP',
    'attacking midfielder': 'AM',
    extremo: 'EXT',
    'extremo derecho': 'ED',
    'extremo izquierdo': 'EI',
    winger: 'W',
    'right winger': 'RW',
    'left winger': 'LW',
    delantero: 'DEL',
    'delantero centro': 'DC',
    forward: 'FW',
    striker: 'ST',
  };
  return abbreviations[positionLower] || position.substring(0, 3).toUpperCase();
}
