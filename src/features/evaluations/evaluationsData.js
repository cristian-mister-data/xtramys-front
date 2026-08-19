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
  MdOutlineShield,
  MdDescription,
  MdList,
  MdChecklist,
  MdEdit,
  MdToggleOn,
  MdFormatListNumbered,
  MdPerson,
} from 'react-icons/md';

export const QUESTION_TYPES = [
  { key: 'rating10', label: 'Escala 1 - 10', description: 'Puntuación numérica del 1 al 10', icon: MdFormatListNumbered },
  { key: 'stars5', label: 'Estrellas (1-5)', description: 'Calificación con 5 estrellas', icon: MdStar },
  { key: 'select', label: 'Selección Única', description: 'Elegir una sola opción entre varias', icon: MdList },
  { key: 'multiSelect', label: 'Selección Múltiple', description: 'Elegir varias opciones aplicables', icon: MdChecklist },
  { key: 'text', label: 'Texto Libre / Campo a mano', description: 'Campo de texto descriptivo u observaciones', icon: MdEdit },
  { key: 'boolean', label: 'Sí / No', description: 'Respuesta afirmativa o negativa', icon: MdToggleOn },
  { key: 'player', label: 'Selección de Jugador', description: 'Seleccionar un jugador del equipo', icon: MdPerson },
];

export function getQuestionTypes(t) {
  if (!t) return QUESTION_TYPES;
  return [
    {
      key: 'rating10',
      label: t('evaluations.questionTypes.rating10.label', 'Escala 1 - 10'),
      description: t('evaluations.questionTypes.rating10.desc', 'Puntuación numérica del 1 al 10'),
      icon: MdFormatListNumbered,
    },
    {
      key: 'stars5',
      label: t('evaluations.questionTypes.stars5.label', 'Estrellas (1-5)'),
      description: t('evaluations.questionTypes.stars5.desc', 'Calificación con 5 estrellas'),
      icon: MdStar,
    },
    {
      key: 'select',
      label: t('evaluations.questionTypes.select.label', 'Selección Única'),
      description: t('evaluations.questionTypes.select.desc', 'Elegir una sola opción entre varias'),
      icon: MdList,
    },
    {
      key: 'multiSelect',
      label: t('evaluations.questionTypes.multiSelect.label', 'Selección Múltiple'),
      description: t('evaluations.questionTypes.multiSelect.desc', 'Elegir varias opciones aplicables'),
      icon: MdChecklist,
    },
    {
      key: 'text',
      label: t('evaluations.questionTypes.text.label', 'Texto Libre / Campo a mano'),
      description: t('evaluations.questionTypes.text.desc', 'Campo de texto descriptivo u observaciones'),
      icon: MdEdit,
    },
    {
      key: 'boolean',
      label: t('evaluations.questionTypes.boolean.label', 'Sí / No'),
      description: t('evaluations.questionTypes.boolean.desc', 'Respuesta afirmativa o negativa'),
      icon: MdToggleOn,
    },
    {
      key: 'player',
      label: t('evaluations.questionTypes.player.label', 'Selección de Jugador'),
      description: t('evaluations.questionTypes.player.desc', 'Seleccionar un jugador del equipo'),
      icon: MdPerson,
    },
  ];
}

export const AVAILABLE_ICONS = [
  { name: 'analytics', color: '#3b82f6', component: MdAnalytics },
  { name: 'flame', color: '#ef4444', component: MdLocalFireDepartment },
  { name: 'flash', color: '#f59e0b', component: MdBolt },
  { name: 'star', color: '#fbbf24', component: MdStar },
  { name: 'shield-checkmark', color: '#10b981', component: MdOutlineShield },
  { name: 'shield', color: '#8b5cf6', component: MdShield },
  { name: 'people', color: '#ec4899', component: MdGroup },
  { name: 'football', color: '#10b981', component: MdSportsSoccer },
  { name: 'trophy', color: '#f97316', component: MdEmojiEvents },
  { name: 'speed', color: '#22c55e', component: MdSpeed },
  { name: 'note', color: '#0ea5e9', component: MdNoteAlt },
  { name: 'warning', color: '#f97316', component: MdWarning },
  { name: 'bulb', color: '#a855f7', component: MdLightbulb },
  { name: 'document-text', color: '#6366f1', component: MdDescription },
  { name: 'help-circle', color: '#64748b', component: MdHelpOutline },
  { name: 'flag', color: '#06b6d4', component: MdFlag },
  { name: 'location', color: '#14b8a6', component: MdLocationOn },
  { name: 'arrow-forward', color: '#6366f1', component: MdArrowForward },
];

export const ICON_MAP = AVAILABLE_ICONS.reduce((acc, it) => {
  acc[it.name] = it.component;
  return acc;
}, {});

export function getIconComponent(name) {
  return ICON_MAP[name] || MdHelpOutline;
}

export function getScoreColor(score) {
  if (score === null || score === undefined || isNaN(score)) return { bg: '#f1f5f9', color: '#64748b' };
  const num = Number(score);
  if (num >= 8.5) return { bg: '#dcfce7', color: '#15803d' };
  if (num >= 7) return { bg: '#e0f2fe', color: '#0369a1' };
  if (num >= 5) return { bg: '#fef3c7', color: '#b45309' };
  return { bg: '#fee2e2', color: '#b91c1c' };
}

export function computeEvaluationScore(answers, questions = []) {
  if (!answers || !questions || questions.length === 0) return null;
  let totalScore = 0;
  let count = 0;

  questions.forEach((q) => {
    const val = answers[q.id];
    if (val !== undefined && val !== null && val !== '') {
      if (q.type === 'rating10') {
        totalScore += Number(val);
        count++;
      } else if (q.type === 'stars5') {
        // Normalizar 5 estrellas a escala 10
        totalScore += Number(val) * 2;
        count++;
      } else if (q.type === 'boolean') {
        // Sí = 10, No = 0
        totalScore += val ? 10 : 0;
        count++;
      }
    }
  });

  if (count === 0) return null;
  return Math.round((totalScore / count) * 10) / 10;
}

export function resolveOptionLabel(option, t) {
  if (!option) return '';
  const raw = typeof option === 'string' ? option : option.label || option.key || '';
  if (!t) return raw;
  const keyMap = {
    'Portero': t('evaluations.options.goalkeeper', 'Portero'),
    'Defensa': t('evaluations.options.defender', 'Defensa'),
    'Centrocampista': t('evaluations.options.midfielder', 'Centrocampista'),
    'Delantero': t('evaluations.options.forward', 'Delantero'),
  };
  return keyMap[raw] || raw;
}

export function resolveQuestionText(q, t) {
  if (!q || !q.questionText) return '';
  if (!t) return q.questionText;
  const qMap = {
    'Rendimiento Táctico Individual': t('evaluations.defaultQuestions.tacticalPerformance', 'Rendimiento Táctico Individual'),
    'Intensidad Física y Despliegue': t('evaluations.defaultQuestions.physicalIntensity', 'Intensidad Física y Despliegue'),
    'Toma de Decisiones y Calidad Técnica': t('evaluations.defaultQuestions.decisionMaking', 'Toma de Decisiones y Calidad Técnica'),
    'Actitud y Liderazgo en el Campo': t('evaluations.defaultQuestions.attitudeLeadership', 'Actitud y Liderazgo en el Campo'),
    '¿Cumplió el plan de juego asignado?': t('evaluations.defaultQuestions.gamePlanMet', '¿Cumplió el plan de juego asignado?'),
    'Rol o Posición desempeñada principal': t('evaluations.defaultQuestions.rolePosition', 'Rol o Posición desempeñada principal'),
    'Puntos Fuertes y Aspectos Destacados': t('evaluations.defaultQuestions.strengths', 'Puntos Fuertes y Aspectos Destacados'),
    'Aspectos a Mejorar en el Próximo Entrenamiento': t('evaluations.defaultQuestions.improvementAreas', 'Aspectos a Mejorar en el Próximo Entrenamiento'),
  };
  return qMap[q.questionText] || q.questionText;
}

export function getTemplateDisplayName(tpl, t) {
  if (!tpl) return '';
  if (tpl._id === 'tpl_partido_jugador') {
    return t ? t('evaluations.defaultTemplates.matchPlayer.name', tpl.name) : tpl.name;
  }
  if (tpl._id === 'tpl_semanal_equipo') {
    return t ? t('evaluations.defaultTemplates.weeklyTeam.name', tpl.name) : tpl.name;
  }
  if (tpl._id === 'tpl_fisico_rendimiento') {
    return t ? t('evaluations.defaultTemplates.physicalPerformance.name', tpl.name) : tpl.name;
  }
  return tpl.name;
}
