/**
 * Field configuration system with two independent axes:
 * 
 * 1. LINE TYPE — What lines/markings to draw on the field:
 *    - full: Complete field with all FIFA markings (goals, penalty areas, center, corners)
 *    - zones1: Just field outline (no internal lines at all)
 *    - zones2: Field outline + vertical center divider (2 equal halves)
 *    - zones3: Field outline + 2 vertical dividers (3 equal columns)
 *    - zones4: Field outline + cross divider (4 quadrants)
 *    - empty: Grass only, no lines
 * 
 * 2. VIEW MODE — How to crop/display the full field:
 *    - entire: Show the complete field (landscape)
 *    - halfLeft: Left portion of the field (x: 0 → 0.54), no rotation (landscape)
 *    - halfRight: Right portion of the field (x: 0.46 → 1.0), no rotation (landscape)
 *    - halfUp: Left portion of the field (x: 0 → 0.54) + 90° CW rotation (goal at top)
 *    - halfDown: Right portion of the field (x: 0.46 → 1.0) + 90° CW rotation (goal at bottom)
 * 
 * Icons always use FULL FIELD coordinates (0-1).
 * View mode only changes the visible viewport — icon positions are consistent.
 * Elements outside the viewport should not be rendered visually but data is preserved.
 */

const FIELD_ASPECT = 0.65; // height/width for the full field (68m / 105m)
const CROP_FRACTION = 0.54; // show 54% of the field length (slightly past center line)

// ─── Line Types ──────────────────────────────────
export const LINE_TYPES = {
  full: {
    id: 'full',
    showGoals: true,
    showPenaltyAreas: ['left', 'right'],
    showCenter: true,
    showCorners: ['tl', 'tr', 'bl', 'br'],
    showHalfwayLine: true,
    zones: 0,
  },
  zones1: {
    id: 'zones1',
    showGoals: false,
    showPenaltyAreas: [],
    showCenter: false,
    showCorners: [],
    showHalfwayLine: false,
    zones: 0,
  },
  zones2: {
    id: 'zones2',
    showGoals: false,
    showPenaltyAreas: [],
    showCenter: false,
    showCorners: [],
    showHalfwayLine: false,
    zones: 2,
  },
  zones3: {
    id: 'zones3',
    showGoals: false,
    showPenaltyAreas: [],
    showCenter: false,
    showCorners: [],
    showHalfwayLine: false,
    zones: 3,
  },
  zones4: {
    id: 'zones4',
    showGoals: false,
    showPenaltyAreas: [],
    showCenter: false,
    showCorners: [],
    showHalfwayLine: false,
    zones: 4,
  },
  empty: {
    id: 'empty',
    showGoals: false,
    showPenaltyAreas: [],
    showCenter: false,
    showCorners: [],
    showHalfwayLine: false,
    zones: 0,
  },
};

// ─── View Modes ──────────────────────────────────
// viewport: { x, y, w, h } in 0-1 coords of the full field virtual canvas
// halfLeft/halfRight: simple viewport crops, no rotation (landscape)
// halfUp/halfDown: viewport crop + 90° CW rotation (portrait)
export const VIEW_MODES = {
  entire: {
    id: 'entire',
    viewport: null, // null = show entire field
    aspect: FIELD_ASPECT,  // 0.65
  },
  halfLeft: {
    id: 'halfLeft',
    viewport: { x: 0, y: 0, w: CROP_FRACTION, h: 1 },
    aspect: FIELD_ASPECT / CROP_FRACTION,  // ≈ 1.204
  },
  halfRight: {
    id: 'halfRight',
    viewport: { x: 1 - CROP_FRACTION, y: 0, w: CROP_FRACTION, h: 1 },
    aspect: FIELD_ASPECT / CROP_FRACTION,  // ≈ 1.204
  },
  halfUp: {
    id: 'halfUp',
    viewport: { x: 0, y: 0, w: CROP_FRACTION, h: 1 },
    rotated: true, // same crop as halfLeft + 90° CW rotation
    aspect: CROP_FRACTION / FIELD_ASPECT,  // ≈ 0.831
  },
  halfDown: {
    id: 'halfDown',
    viewport: { x: 1 - CROP_FRACTION, y: 0, w: CROP_FRACTION, h: 1 },
    rotated: true, // same crop as halfRight + 90° CW rotation
    aspect: CROP_FRACTION / FIELD_ASPECT,  // ≈ 0.831
  },
};

// ─── Coordinate Transform Utilities ──────────────
// All icons store coordinates as full-field ratios (0-1).
// These functions convert between ratio coords and display pixel coords.

/**
 * Convert full-field ratio coords to display pixel coords.
 * For rotated modes (halfUp/halfDown), applies 90° CW rotation after cropping.
 * @returns {{ x: number, y: number }}
 */
export function ratioToDisplay(xR, yR, viewModeId, W, H) {
  const vm = VIEW_MODES[viewModeId] || VIEW_MODES.entire;
  if (!vm.viewport) {
    return { x: xR * W, y: yR * H };
  }
  const { x: vpX, y: vpY, w: vpW, h: vpH } = vm.viewport;
  if (vm.rotated) {
    // 90° CW rotation: field x-axis → display y-axis, field y-axis → inverted display x-axis
    return {
      x: ((vpY + vpH - yR) / vpH) * W,
      y: ((xR - vpX) / vpW) * H,
    };
  }
  return {
    x: ((xR - vpX) / vpW) * W,
    y: ((yR - vpY) / vpH) * H,
  };
}

/**
 * Convert display pixel coords to full-field ratio coords.
 * For rotated modes (halfUp/halfDown), inverts the 90° CW rotation.
 * @returns {{ x: number, y: number }}
 */
export function displayToRatio(dX, dY, viewModeId, W, H) {
  const vm = VIEW_MODES[viewModeId] || VIEW_MODES.entire;
  if (!vm.viewport) {
    return { x: dX / W, y: dY / H };
  }
  const { x: vpX, y: vpY, w: vpW, h: vpH } = vm.viewport;
  if (vm.rotated) {
    // Inverse of CW rotation
    return {
      x: (dY / H) * vpW + vpX,
      y: (vpY + vpH) - (dX / W) * vpH,
    };
  }
  return {
    x: (dX / W) * vpW + vpX,
    y: (dY / H) * vpH + vpY,
  };
}

/**
 * Convert a pixel DELTA (translation) on the display to a ratio DELTA.
 * For rotated modes, display X-movement maps to field Y (inverted), display Y to field X.
 * @returns {{ dxRatio: number, dyRatio: number }}
 */
export function deltaToRatio(dtX, dtY, viewModeId, W, H) {
  const vm = VIEW_MODES[viewModeId] || VIEW_MODES.entire;
  if (!vm.viewport) {
    return { dxRatio: dtX / W, dyRatio: dtY / H };
  }
  const { w: vpW, h: vpH } = vm.viewport;
  if (vm.rotated) {
    // CW rotation: display X delta → negative field Y delta, display Y delta → field X delta
    return {
      dxRatio: (dtY / H) * vpW,
      dyRatio: -(dtX / W) * vpH,
    };
  }
  return {
    dxRatio: (dtX / W) * vpW,
    dyRatio: (dtY / H) * vpH,
  };
}

/**
 * Check if a full-field ratio coordinate is visible in the current view mode.
 * @returns {boolean}
 */
export function isVisibleInView(xR, yR, viewModeId, margin = 0) {
  const vm = VIEW_MODES[viewModeId] || VIEW_MODES.entire;
  if (!vm.viewport) return true;
  const { x: vpX, y: vpY, w: vpW, h: vpH } = vm.viewport;
  return xR >= vpX - margin && xR <= vpX + vpW + margin && yR >= vpY - margin && yR <= vpY + vpH + margin;
}

/**
 * Check if a ratio coordinate is outside the visible field area.
 * Uses display coordinates so it works consistently for all view modes.
 * @returns {boolean}
 */
export function isOutsideVisibleField(xR, yR, viewModeId, W, H) {
  // Si está fuera de los límites de las líneas de juego con un 4% de margen de tolerancia, se considera fuera
  if (xR < 0.04 || xR > 0.96 || yR < 0.04 || yR > 0.96) {
    return true;
  }
  const { x, y } = ratioToDisplay(xR, yR, viewModeId, W, H);
  return x < 0 || x > W || y < 0 || y > H;
}

/**
 * Check if ALL points of a line/shape are outside the visible field area.
 * @returns {boolean}
 */
export function areAllPointsOutside(points, viewModeId, W, H) {
  return points.every(pt => isOutsideVisibleField(pt.x, pt.y, viewModeId, W, H));
}

// ─── Helpers ─────────────────────────────────────

/**
 * Compose a field ID from lineType + viewMode (e.g. "full:entire", "zones2:halfUp")
 */
export function composeFieldId(lineType, viewMode) {
  return `${lineType}:${viewMode}`;
}

/**
 * Decompose a compound field ID back into { lineType, viewMode }
 * Also handles legacy single IDs for backward compatibility
 */
export function decomposeFieldId(fieldId) {
  if (!fieldId) return { lineType: 'full', viewMode: 'entire' };
  
  if (fieldId.includes(':')) {
    const [lineType, viewMode] = fieldId.split(':');
    return {
      lineType: LINE_TYPES[lineType] ? lineType : 'full',
      viewMode: VIEW_MODES[viewMode] ? viewMode : 'entire',
    };
  }
  
  // Legacy IDs: map old field IDs to new system
  const legacyMap = {
    'full': { lineType: 'full', viewMode: 'entire' },
    'half': { lineType: 'full', viewMode: 'halfLeft' },
    'halfUp': { lineType: 'full', viewMode: 'halfUp' },
    'halfDown': { lineType: 'full', viewMode: 'halfDown' },
    'area': { lineType: 'full', viewMode: 'halfLeft' },
    'zonas1': { lineType: 'zones1', viewMode: 'entire' },
    'zonas2': { lineType: 'zones2', viewMode: 'entire' },
    'zonas3': { lineType: 'zones3', viewMode: 'entire' },
    'zonas4': { lineType: 'zones4', viewMode: 'entire' },
    'empty': { lineType: 'empty', viewMode: 'entire' },
    'centroCampo': { lineType: 'full', viewMode: 'entire' },
  };
  
  return legacyMap[fieldId] || { lineType: 'full', viewMode: 'entire' };
}

/**
 * Get the line type config for a given lineType ID.
 */
export function getLineTypeConfig(lineTypeId) {
  return LINE_TYPES[lineTypeId] || LINE_TYPES.full;
}

/**
 * Get the view mode config for a given viewMode ID.
 */
export function getViewModeConfig(viewModeId) {
  return VIEW_MODES[viewModeId] || VIEW_MODES.entire;
}

/**
 * Get the aspect ratio for the current view mode.
 */
export function getAspectForView(viewModeId) {
  return (VIEW_MODES[viewModeId] || VIEW_MODES.entire).aspect;
}

/**
 * Ordered arrays for the selector UI.
 */
export function getLineTypeList() {
  return [
    LINE_TYPES.full,
    LINE_TYPES.zones1,
    LINE_TYPES.zones2,
    LINE_TYPES.zones3,
    LINE_TYPES.zones4,
    LINE_TYPES.empty,
  ];
}

export function getViewModeList() {
  return [
    VIEW_MODES.entire,
    VIEW_MODES.halfLeft,
    VIEW_MODES.halfRight,
    VIEW_MODES.halfUp,
    VIEW_MODES.halfDown,
  ];
}

