/**
 * Dimensiones FIFA del campo, normalizadas 0-1.
 * Port directo de misterdata-source/src/components/tacticalBoard/fields/fieldDimensions.js
 */

const FIELD_WIDTH = 105;
const FIELD_HEIGHT = 68;
const nx = (m) => m / FIELD_WIDTH;
const ny = (m) => m / FIELD_HEIGHT;

const PENALTY_AREA_DEPTH = nx(16.5);
const PENALTY_AREA_TOP = ny((FIELD_HEIGHT - 40.32) / 2);
const PENALTY_AREA_BOTTOM = ny((FIELD_HEIGHT + 40.32) / 2);
const GOAL_AREA_DEPTH = nx(5.5);
const GOAL_AREA_TOP = ny((FIELD_HEIGHT - 18.32) / 2);
const GOAL_AREA_BOTTOM = ny((FIELD_HEIGHT + 18.32) / 2);
const CENTER_CIRCLE_RADIUS_X = nx(9.15);
const CENTER_CIRCLE_RADIUS_Y = ny(9.15);
const PENALTY_SPOT_DEPTH = nx(11);
const PENALTY_ARC_RADIUS_X = nx(9.15);
const PENALTY_ARC_RADIUS_Y = ny(9.15);
const CORNER_ARC_RADIUS_X = nx(1);
const CORNER_ARC_RADIUS_Y = ny(1);
const GOAL_WIDTH_Y = ny(7.32);
const GOAL_DEPTH_X = nx(2.5);
const GOAL_TOP = ny((FIELD_HEIGHT - 7.32) / 2);
const GOAL_BOTTOM = ny((FIELD_HEIGHT + 7.32) / 2);

export const FIELD = {
  ASPECT_RATIO: FIELD_WIDTH / FIELD_HEIGHT,
  CENTER_X: 0.5, CENTER_Y: 0.5,
  CENTER_CIRCLE_RX: CENTER_CIRCLE_RADIUS_X,
  CENTER_CIRCLE_RY: CENTER_CIRCLE_RADIUS_Y,
  LEFT_PENALTY: { x: 0, top: PENALTY_AREA_TOP, bottom: PENALTY_AREA_BOTTOM, depth: PENALTY_AREA_DEPTH },
  RIGHT_PENALTY: { x: 1, top: PENALTY_AREA_TOP, bottom: PENALTY_AREA_BOTTOM, depth: PENALTY_AREA_DEPTH },
  LEFT_GOAL_AREA: { x: 0, top: GOAL_AREA_TOP, bottom: GOAL_AREA_BOTTOM, depth: GOAL_AREA_DEPTH },
  RIGHT_GOAL_AREA: { x: 1, top: GOAL_AREA_TOP, bottom: GOAL_AREA_BOTTOM, depth: GOAL_AREA_DEPTH },
  LEFT_PENALTY_SPOT: { x: PENALTY_SPOT_DEPTH, y: 0.5 },
  RIGHT_PENALTY_SPOT: { x: 1 - PENALTY_SPOT_DEPTH, y: 0.5 },
  PENALTY_ARC_RX: PENALTY_ARC_RADIUS_X,
  PENALTY_ARC_RY: PENALTY_ARC_RADIUS_Y,
  CORNER_ARC_RX: CORNER_ARC_RADIUS_X,
  CORNER_ARC_RY: CORNER_ARC_RADIUS_Y,
  LEFT_GOAL: { top: GOAL_TOP, bottom: GOAL_BOTTOM, depth: GOAL_DEPTH_X },
  RIGHT_GOAL: { top: GOAL_TOP, bottom: GOAL_BOTTOM, depth: GOAL_DEPTH_X },
  GOAL_WIDTH_Y,
};

export const GRASS_STRIPE_COUNT = 10;

export const LINE_TYPES = ['full', 'zones1', 'zones2', 'zones3', 'zones4', 'empty'];
export const VIEW_MODES = ['entire', 'halfLeft', 'halfRight', 'halfUp', 'halfDown'];

export const COLORS = {
  grassDark: '#2e7d32',
  grassLight: '#43a047',
  line: '#ffffff',
  goal: '#ffffff',
};
