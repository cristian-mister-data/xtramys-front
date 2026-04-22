/**
 * Barrel export for the fields module.
 */
export { FIELD, GRASS_STRIPE_COUNT } from './fieldDimensions';
export { 
  LINE_TYPES, VIEW_MODES,
  composeFieldId, decomposeFieldId,
  getLineTypeConfig, getViewModeConfig, getAspectForView,
  getLineTypeList, getViewModeList,
  ratioToDisplay, displayToRatio, deltaToRatio, isVisibleInView,
  isOutsideVisibleField, areAllPointsOutside,
} from './fieldConfigs';
export { default as FieldSVGRenderer } from './FieldSVGRenderer';
