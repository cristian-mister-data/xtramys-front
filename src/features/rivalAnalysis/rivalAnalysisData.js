// Constantes para el feature RivalAnalysis: alineaciones, tipos de pregunta,
// iconos disponibles y helpers de normalización. Mantiene los mismos valores
// que misterdata-source para compatibilidad de datos en backend.
import {
  MdHelpOutline,
  MdLocalFireDepartment,
  MdSportsSoccer,
  MdAnalytics,
  MdShield,
  MdBolt,
  MdLocationOn,
  MdGroup,
  MdEmojiEvents,
  MdWarning,
  MdStar,
  MdFlag,
  MdLightbulb,
  MdNoteAlt,
  MdSpeed,
  MdArrowForward,
  MdCallSplit,
  MdOpenInFull,
  MdOutlineShield,
  MdDescription,
  MdSwapHoriz,
  MdSwapVert,
  MdBackHand,
  MdTrendingDown,
  MdGridOn,
  MdBrush,
  MdVideocam,
  MdList,
  MdEdit,
} from 'react-icons/md';

export const ALINEACIONES = [
  '1-4-4-2',
  '1-4-3-3',
  '1-4-2-3-1',
  '1-3-5-2',
  '1-3-4-3',
  '1-4-5-1',
  '1-5-3-2',
  '1-5-4-1',
  '1-4-1-4-1',
  '1-3-4-1-2',
  '1-4-3-2-1',
  '1-4-1-2-1-2',
];

// Campos "conocidos" del modelo backend de RivalAnalysis. Se guardan al
// nivel raíz del documento; el resto va a customAnswers[id].
export const KNOWN_FIELDS = [
  'ladoDebilSalidaBalon',
  'generanPeligroPorDonde',
  'combinativoDirecto',
  'pressingAltura',
  'pressingPuntas',
  'pressingSaltanLineas',
  'ortjDefendiendo',
  'zonaSaquePortero',
  'cambioSistemaDerrota',
  'observaciones',
  'jugadoresDestacados',
  'jugadoresDebiles',
  'alineacion',
];

// Tipos de pregunta soportados por las plantillas
export const QUESTION_TYPES = [
  { key: 'select', labelKey: 'rivalAnalysis.template.types.select', fallback: 'Selección', icon: MdList },
  { key: 'text', labelKey: 'rivalAnalysis.template.types.text', fallback: 'Texto', icon: MdEdit },
  { key: 'players', labelKey: 'rivalAnalysis.template.types.players', fallback: 'Jugadores', icon: MdGroup },
  { key: 'formation', labelKey: 'rivalAnalysis.template.types.formation', fallback: 'Formación', icon: MdGridOn },
  { key: 'graphic', labelKey: 'rivalAnalysis.template.types.graphic', fallback: 'Gráfico', icon: MdBrush },
  { key: 'video', labelKey: 'rivalAnalysis.template.types.video', fallback: 'Vídeo', icon: MdVideocam },
];

// Iconos disponibles para personalizar preguntas. Mantenemos los nombres
// de Ionicons por compatibilidad con misterdata (DB) — solo cambia el render.
export const AVAILABLE_ICONS = [
  { name: 'help-circle', color: '#3578e5', component: MdHelpOutline },
  { name: 'flame', color: '#ef4444', component: MdLocalFireDepartment },
  { name: 'football', color: '#10b981', component: MdSportsSoccer },
  { name: 'analytics', color: '#f59e0b', component: MdAnalytics },
  { name: 'shield', color: '#8b5cf6', component: MdShield },
  { name: 'shield-checkmark', color: '#14b8a6', component: MdOutlineShield },
  { name: 'flash', color: '#06b6d4', component: MdBolt },
  { name: 'location', color: '#14b8a6', component: MdLocationOn },
  { name: 'people', color: '#ec4899', component: MdGroup },
  { name: 'trophy', color: '#f97316', component: MdEmojiEvents },
  { name: 'warning', color: '#FFC107', component: MdWarning },
  { name: 'star', color: '#fbbf24', component: MdStar },
  { name: 'flag', color: '#3b82f6', component: MdFlag },
  { name: 'bulb', color: '#a855f7', component: MdLightbulb },
  { name: 'note', color: '#0ea5e9', component: MdNoteAlt },
  { name: 'document-text', color: '#2196F3', component: MdDescription },
  { name: 'speed', color: '#22c55e', component: MdSpeed },
  { name: 'arrow-forward-circle', color: '#6366f1', component: MdArrowForward },
  { name: 'git-branch', color: '#10b981', component: MdCallSplit },
  { name: 'resize', color: '#f59e0b', component: MdOpenInFull },
  { name: 'swap-horizontal', color: '#06b6d4', component: MdSwapHoriz },
  { name: 'swap-vertical', color: '#f97316', component: MdSwapVert },
  { name: 'hand-left', color: '#ec4899', component: MdBackHand },
  { name: 'trending-down', color: '#ef4444', component: MdTrendingDown },
];

export const ICON_MAP = AVAILABLE_ICONS.reduce((acc, it) => {
  acc[it.name] = it.component;
  return acc;
}, {});

export function getIconComponent(name) {
  return ICON_MAP[name] || MdHelpOutline;
}

// Asegura el prefijo "1-" en formaciones almacenadas
export function normalizeFormation(value) {
  if (!value) return '';
  const v = String(value).trim();
  if (v.startsWith('1-')) return v;
  if (/^\d+-/.test(v)) return `1-${v}`;
  return v;
}

// Quita el "1-" prefijo para mostrar de forma compacta en chips
export function getFormationShort(formation) {
  if (!formation) return '';
  const f = String(formation);
  return f.startsWith('1-') ? f.slice(2) : f;
}

// Traduce los enums comunes guardados en BD a etiquetas legibles
export function translateEnum(value, t) {
  if (!value) return '';
  const map = {
    RIGHT: t('rivalAnalysis.options.right', 'Derecha'),
    LEFT: t('rivalAnalysis.options.left', 'Izquierda'),
    COMBINATIVE: t('rivalAnalysis.options.combinative', 'Combinativo'),
    DIRECT: t('rivalAnalysis.options.direct', 'Directo'),
    HIGH: t('rivalAnalysis.options.high', 'Alto'),
    MEDIUM: t('rivalAnalysis.options.medium', 'Medio'),
    LOW: t('rivalAnalysis.options.low', 'Bajo'),
  };
  return map[value] || value;
}

// Resuelve la etiqueta de una opción de un select. Si la label parece una
// clave i18n ("rivalAnalysis...."), la traduce; si no, la devuelve tal cual.
export function resolveOptionLabel(option, t) {
  if (!option) return '';
  const label = option.label || option.key || '';
  if (typeof label === 'string' && label.startsWith('rivalAnalysis.')) {
    return t(label, label);
  }
  return label;
}

// Texto de una pregunta: prioriza questionText (custom) sobre questionKey (i18n)
export function getQuestionText(question, t) {
  if (!question) return '';
  if (question.questionText) return question.questionText;
  if (question.questionKey) return t(question.questionKey, question.questionKey);
  return '';
}

// Particiona dynamicAnswers en {topLevel, customAnswers} según KNOWN_FIELDS
export function partitionAnswers(dynamicAnswers) {
  const topLevel = {};
  const customAnswers = {};
  Object.entries(dynamicAnswers || {}).forEach(([key, value]) => {
    if (KNOWN_FIELDS.includes(key)) topLevel[key] = value;
    else customAnswers[key] = value;
  });
  return { topLevel, customAnswers };
}

// Reconstruye dynamicAnswers a partir de un análisis guardado
export function buildDynamicAnswers(analysis) {
  const out = {};
  if (!analysis) return out;
  KNOWN_FIELDS.forEach((k) => {
    if (analysis[k] !== undefined && analysis[k] !== null && analysis[k] !== '') {
      out[k] = analysis[k];
    }
  });
  if (analysis.customAnswers && typeof analysis.customAnswers === 'object') {
    Object.entries(analysis.customAnswers).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') out[k] = v;
    });
  }
  return out;
}
