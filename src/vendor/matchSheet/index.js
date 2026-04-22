// components/pages/matchSheet/index.js
// Exportaciones de componentes y hooks reutilizables para fichas de partido

// Hooks
export { default as useMatchSheetPDF } from './useMatchSheetPDF';
export { default as useMatchSheetForm, ALINEACIONES, ALINEACIONES_BY_PLAYER_COUNT, UBICACIONES_KEYS, normalizeFormation } from './useMatchSheetForm';

// Componentes de PDF
export { default as MatchSheetPDFModals, MatchSheetPDFButtons } from './MatchSheetPDFModals';

// Componentes de Selección
export {
  OptionSelectionModal,
  UbicacionModal,
  JornadaModal,
  AlineacionModal,
  PlayerSelectionModal,
  SinglePlayerModal,
} from './MatchSheetSelectionModals';

// Componentes de Alineación
export { default as LineupEditor } from './LineupEditor';
export { default as LineupField } from './LineupField';

// Componente de Formulario unificado
export { default as MatchSheetFormContent } from './MatchSheetFormContent';

// Funciones de PDF
export { generateLineupPDF, generateCallUpPDF, generateMatchSheetPDF } from './MatchSheetPDF';
