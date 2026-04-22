/**
 * FIFA-standard football field dimensions normalized to 0-1 coordinate space.
 * All values are ratios relative to full field width (W) and height (H).
 * 
 * Reference: FIFA field 105m x 68m (aspect ≈ 1.544)
 * Orientation: landscape — width > height
 */

// --- Core field ratios ---
const FIELD_WIDTH = 105;
const FIELD_HEIGHT = 68;

// Normalize helper: converts meters to 0-1 ratio
const nx = (m) => m / FIELD_WIDTH;
const ny = (m) => m / FIELD_HEIGHT;

// --- Penalty area (16.5m from goal line, 40.32m wide) ---
const PENALTY_AREA_DEPTH = nx(16.5);    // ~0.157
const PENALTY_AREA_TOP = ny((FIELD_HEIGHT - 40.32) / 2); // ~0.203
const PENALTY_AREA_BOTTOM = ny((FIELD_HEIGHT + 40.32) / 2); // ~0.797

// --- Goal area (5.5m from goal line, 18.32m wide) ---
const GOAL_AREA_DEPTH = nx(5.5);        // ~0.052
const GOAL_AREA_TOP = ny((FIELD_HEIGHT - 18.32) / 2); // ~0.365
const GOAL_AREA_BOTTOM = ny((FIELD_HEIGHT + 18.32) / 2); // ~0.635

// --- Center circle (9.15m radius) ---
const CENTER_CIRCLE_RADIUS_X = nx(9.15); // ~0.087
const CENTER_CIRCLE_RADIUS_Y = ny(9.15); // ~0.135

// --- Penalty spot (11m from goal line) ---
const PENALTY_SPOT_DEPTH = nx(11);       // ~0.105

// --- Penalty arc radius (9.15m from penalty spot) ---
const PENALTY_ARC_RADIUS_X = nx(9.15);
const PENALTY_ARC_RADIUS_Y = ny(9.15);

// --- Corner arc radius (1m) ---
const CORNER_ARC_RADIUS_X = nx(1);
const CORNER_ARC_RADIUS_Y = ny(1);

// --- Goal dimensions (7.32m wide, 2.44m high → rendered as net depth) ---
const GOAL_WIDTH_Y = ny(7.32);          // ~0.108
const GOAL_DEPTH_X = nx(2.5);           // visual depth for net drawing
const GOAL_TOP = ny((FIELD_HEIGHT - 7.32) / 2);
const GOAL_BOTTOM = ny((FIELD_HEIGHT + 7.32) / 2);

export const FIELD = {
  // Overall
  ASPECT_RATIO: FIELD_WIDTH / FIELD_HEIGHT, // ~1.544

  // Center
  CENTER_X: 0.5,
  CENTER_Y: 0.5,
  CENTER_CIRCLE_RX: CENTER_CIRCLE_RADIUS_X,
  CENTER_CIRCLE_RY: CENTER_CIRCLE_RADIUS_Y,

  // Penalty area — left side
  LEFT_PENALTY: {
    x: 0,
    top: PENALTY_AREA_TOP,
    bottom: PENALTY_AREA_BOTTOM,
    depth: PENALTY_AREA_DEPTH,
  },
  // Penalty area — right side
  RIGHT_PENALTY: {
    x: 1,
    top: PENALTY_AREA_TOP,
    bottom: PENALTY_AREA_BOTTOM,
    depth: PENALTY_AREA_DEPTH,
  },

  // Goal area — left side
  LEFT_GOAL_AREA: {
    x: 0,
    top: GOAL_AREA_TOP,
    bottom: GOAL_AREA_BOTTOM,
    depth: GOAL_AREA_DEPTH,
  },
  // Goal area — right side
  RIGHT_GOAL_AREA: {
    x: 1,
    top: GOAL_AREA_TOP,
    bottom: GOAL_AREA_BOTTOM,
    depth: GOAL_AREA_DEPTH,
  },

  // Penalty spots
  LEFT_PENALTY_SPOT: { x: PENALTY_SPOT_DEPTH, y: 0.5 },
  RIGHT_PENALTY_SPOT: { x: 1 - PENALTY_SPOT_DEPTH, y: 0.5 },

  // Penalty arc
  PENALTY_ARC_RX: PENALTY_ARC_RADIUS_X,
  PENALTY_ARC_RY: PENALTY_ARC_RADIUS_Y,

  // Corner arc
  CORNER_ARC_RX: CORNER_ARC_RADIUS_X,
  CORNER_ARC_RY: CORNER_ARC_RADIUS_Y,

  // Goals
  LEFT_GOAL: {
    top: GOAL_TOP,
    bottom: GOAL_BOTTOM,
    depth: GOAL_DEPTH_X,
  },
  RIGHT_GOAL: {
    top: GOAL_TOP,
    bottom: GOAL_BOTTOM,
    depth: GOAL_DEPTH_X,
  },
  GOAL_WIDTH_Y,
};

// Grass stripe count for visual effect
export const GRASS_STRIPE_COUNT = 10;
