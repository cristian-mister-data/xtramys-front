/**
 * Sistema de configuración del campo. Port directo de
 * misterdata-source/src/components/tacticalBoard/fields/fieldConfigs.js
 *
 * Dos ejes independientes:
 *  1. LINE TYPE — Marcas a dibujar (full, zones1-4, empty).
 *  2. VIEW MODE — Cómo recortar la vista (entire, halfLeft, halfRight, halfUp, halfDown).
 *
 * Los iconos almacenan coordenadas en ratios 0..1 del campo COMPLETO.
 * El view mode solo cambia el viewport visible.
 */

const FIELD_ASPECT = 0.65; // h/w (68m / 105m)
const CROP_FRACTION = 0.54; // fracción visible en halfLeft/Right (más allá del centro)

export const LINE_TYPES = {
  full:    { id: 'full',    showGoals: true,  showPenaltyAreas: ['left', 'right'], showCenter: true,  showCorners: ['tl','tr','bl','br'], showHalfwayLine: true,  zones: 0 },
  zones1:  { id: 'zones1',  showGoals: false, showPenaltyAreas: [],                showCenter: false, showCorners: [],                    showHalfwayLine: false, zones: 0 },
  zones2:  { id: 'zones2',  showGoals: false, showPenaltyAreas: [],                showCenter: false, showCorners: [],                    showHalfwayLine: false, zones: 2 },
  zones3:  { id: 'zones3',  showGoals: false, showPenaltyAreas: [],                showCenter: false, showCorners: [],                    showHalfwayLine: false, zones: 3 },
  zones4:  { id: 'zones4',  showGoals: false, showPenaltyAreas: [],                showCenter: false, showCorners: [],                    showHalfwayLine: false, zones: 4 },
  empty:   { id: 'empty',   showGoals: false, showPenaltyAreas: [],                showCenter: false, showCorners: [],                    showHalfwayLine: false, zones: 0 },
};

export const VIEW_MODES = {
  entire:    { id: 'entire',    viewport: null,                                              aspect: FIELD_ASPECT },
  halfLeft:  { id: 'halfLeft',  viewport: { x: 0, y: 0, w: CROP_FRACTION, h: 1 },             aspect: FIELD_ASPECT / CROP_FRACTION },
  halfRight: { id: 'halfRight', viewport: { x: 1 - CROP_FRACTION, y: 0, w: CROP_FRACTION, h: 1 }, aspect: FIELD_ASPECT / CROP_FRACTION },
  halfUp:    { id: 'halfUp',    viewport: { x: 0, y: 0, w: CROP_FRACTION, h: 1 }, rotated: true, aspect: CROP_FRACTION / FIELD_ASPECT },
  halfDown:  { id: 'halfDown',  viewport: { x: 1 - CROP_FRACTION, y: 0, w: CROP_FRACTION, h: 1 }, rotated: true, aspect: CROP_FRACTION / FIELD_ASPECT },
};

export const LINE_TYPE_LIST = Object.values(LINE_TYPES);
export const VIEW_MODE_LIST = Object.values(VIEW_MODES);

export function getLineTypeConfig(id) { return LINE_TYPES[id] || LINE_TYPES.full; }
export function getViewModeConfig(id) { return VIEW_MODES[id] || VIEW_MODES.entire; }
export function getAspectForView(id) { return getViewModeConfig(id).aspect; }

/** Convierte ratios del campo completo a píxeles del display teniendo en cuenta el view mode. */
export function ratioToDisplay(xR, yR, viewModeId, W, H) {
  const vm = getViewModeConfig(viewModeId);
  if (!vm.viewport) return { x: xR * W, y: yR * H };
  const { x: vpX, y: vpY, w: vpW, h: vpH } = vm.viewport;
  if (vm.rotated) {
    return {
      x: ((vpY + vpH - yR) / vpH) * W,
      y: ((xR - vpX) / vpW) * H,
    };
  }
  return { x: ((xR - vpX) / vpW) * W, y: ((yR - vpY) / vpH) * H };
}

/** Convierte píxeles del display a ratios 0..1 del campo completo. */
export function displayToRatio(dX, dY, viewModeId, W, H) {
  const vm = getViewModeConfig(viewModeId);
  if (!vm.viewport) return { x: dX / W, y: dY / H };
  const { x: vpX, y: vpY, w: vpW, h: vpH } = vm.viewport;
  if (vm.rotated) {
    return {
      x: (dY / H) * vpW + vpX,
      y: (vpY + vpH) - (dX / W) * vpH,
    };
  }
  return { x: (dX / W) * vpW + vpX, y: (dY / H) * vpH + vpY };
}

/** Convierte un delta de píxeles a delta de ratio (para drags). */
export function deltaToRatio(dtX, dtY, viewModeId, W, H) {
  const vm = getViewModeConfig(viewModeId);
  if (!vm.viewport) return { dxRatio: dtX / W, dyRatio: dtY / H };
  const { w: vpW, h: vpH } = vm.viewport;
  if (vm.rotated) {
    return { dxRatio: (dtY / H) * vpW, dyRatio: -(dtX / W) * vpH };
  }
  return { dxRatio: (dtX / W) * vpW, dyRatio: (dtY / H) * vpH };
}

export function isVisibleInView(xR, yR, viewModeId, margin = 0) {
  const vm = getViewModeConfig(viewModeId);
  if (!vm.viewport) return true;
  const { x: vpX, y: vpY, w: vpW, h: vpH } = vm.viewport;
  return xR >= vpX - margin && xR <= vpX + vpW + margin && yR >= vpY - margin && yR <= vpY + vpH + margin;
}

export function isOutsideVisibleField(xR, yR, viewModeId, W, H) {
  const { x, y } = ratioToDisplay(xR, yR, viewModeId, W, H);
  return x < 0 || x > W || y < 0 || y > H;
}

export function composeFieldId(lineType, viewMode) { return `${lineType}:${viewMode}`; }
export function decomposeFieldId(fieldId) {
  if (!fieldId) return { lineType: 'full', viewMode: 'entire' };
  if (fieldId.includes(':')) {
    const [lineType, viewMode] = fieldId.split(':');
    return {
      lineType: LINE_TYPES[lineType] ? lineType : 'full',
      viewMode: VIEW_MODES[viewMode] ? viewMode : 'entire',
    };
  }
  const legacyMap = {
    full: { lineType: 'full', viewMode: 'entire' },
    half: { lineType: 'full', viewMode: 'halfLeft' },
    halfUp: { lineType: 'full', viewMode: 'halfUp' },
    halfDown: { lineType: 'full', viewMode: 'halfDown' },
    area: { lineType: 'full', viewMode: 'halfLeft' },
    zonas1: { lineType: 'zones1', viewMode: 'entire' },
    zonas2: { lineType: 'zones2', viewMode: 'entire' },
    zonas3: { lineType: 'zones3', viewMode: 'entire' },
    zonas4: { lineType: 'zones4', viewMode: 'entire' },
    empty: { lineType: 'empty', viewMode: 'entire' },
    centroCampo: { lineType: 'full', viewMode: 'entire' },
  };
  return legacyMap[fieldId] || { lineType: 'full', viewMode: 'entire' };
}
