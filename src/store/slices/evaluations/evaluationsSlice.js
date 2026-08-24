import { createSlice } from '@reduxjs/toolkit';
import { loadUser } from '@/auth/storage';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { listEvaluations, createEvaluation } from '@/api/evaluations';

const LEGACY_STORAGE_KEY = 'xtramys_evaluations_v1';
const STORAGE_KEY_PREFIX = 'xtramys_evaluations_v2';
const DEMO_SOURCE_OWNER = 'cristian.misterdata@gmail.com';
const DEFAULT_ACTIVE_TEMPLATE_ID = 'tpl_partido_jugador';

export const DEFAULT_TEMPLATES = [
  {
    _id: 'tpl_partido_jugador',
    name: 'Evaluación de Partido (Jugador)',
    isRecommended: true,
    isDefault: true,
    category: 'partido',
    scope: 'POR_JUGADOR',
    questions: [
      {
        id: 'q1',
        questionText: 'Rendimiento Táctico Individual',
        type: 'rating10',
        icon: 'analytics',
        iconColor: '#3b82f6',
        category: 'tactico',
        order: 1,
      },
      {
        id: 'q2',
        questionText: 'Intensidad Física y Despliegue',
        type: 'rating10',
        icon: 'flame',
        iconColor: '#ef4444',
        category: 'fisico',
        order: 2,
      },
      {
        id: 'q3',
        questionText: 'Toma de Decisiones y Calidad Técnica',
        type: 'rating10',
        icon: 'flash',
        iconColor: '#f59e0b',
        category: 'tecnico',
        order: 3,
      },
      {
        id: 'q4',
        questionText: 'Actitud y Liderazgo en el Campo',
        type: 'stars5',
        icon: 'star',
        iconColor: '#fbbf24',
        category: 'actitud',
        order: 4,
      },
      {
        id: 'q5',
        questionText: '¿Cumplió el plan de juego asignado?',
        type: 'boolean',
        icon: 'shield-checkmark',
        iconColor: '#10b981',
        category: 'tactico',
        order: 5,
      },
      {
        id: 'q6',
        questionText: 'Rol o Posición desempeñada principal',
        type: 'select',
        icon: 'people',
        iconColor: '#8b5cf6',
        options: [
          { key: 'POR', label: 'Portero' },
          { key: 'DEF', label: 'Defensa' },
          { key: 'MED', label: 'Centrocampista' },
          { key: 'DEL', label: 'Delantero' },
        ],
        category: 'posicion',
        order: 6,
      },
      {
        id: 'q7',
        questionText: 'Puntos Fuertes y Aspectos Destacados',
        type: 'text',
        icon: 'note',
        iconColor: '#0ea5e9',
        category: 'observaciones',
        order: 7,
      },
      {
        id: 'q8',
        questionText: 'Aspectos a Mejorar en el Próximo Entrenamiento',
        type: 'text',
        icon: 'warning',
        iconColor: '#f97316',
        category: 'observaciones',
        order: 8,
      },
    ],
  },
  {
    _id: 'tpl_semanal_equipo',
    name: 'Evaluación Semanal de Equipo (General)',
    isRecommended: true,
    isDefault: false,
    category: 'semanal',
    scope: 'GENERAL',
    questions: [
      {
        id: 'q10',
        questionText: 'Nivel General de Entrenamiento de la Semana',
        type: 'rating10',
        icon: 'speed',
        iconColor: '#10b981',
        category: 'general',
        order: 1,
      },
      {
        id: 'q11',
        questionText: 'Concentración y Compromiso del Grupo',
        type: 'stars5',
        icon: 'star',
        iconColor: '#fbbf24',
        category: 'actitud',
        order: 2,
      },
      {
        id: 'q12',
        questionText: 'Ambiente y Estado de Ánimo del Vestuario',
        type: 'select',
        icon: 'people',
        iconColor: '#ec4899',
        options: [
          { key: 'EXCELENTE', label: 'Excelente / Muy Unido' },
          { key: 'BUENO', label: 'Bueno y Positivo' },
          { key: 'REGULAR', label: 'Regular / Requiere Atención' },
          { key: 'TENSO', label: 'Tenso' },
        ],
        category: 'ambiente',
        order: 3,
      },
      {
        id: 'q13',
        questionText: 'Fases del juego trabajadas con mayor éxito',
        type: 'multiSelect',
        icon: 'football',
        iconColor: '#3b82f6',
        options: [
          { key: 'SALIDA', label: 'Salida de Balón' },
          { key: 'PRESION', label: 'Presión Tras Pérdida' },
          { key: 'ABP', label: 'Acciones a Balón Parado' },
          { key: 'TRANSICION', label: 'Transición Ataque-Defensa' },
          { key: 'FINALIZACION', label: 'Finalización' },
        ],
        category: 'tactico',
        order: 4,
      },
      {
        id: 'q14',
        questionText: 'Conclusiones y Notas del Cuerpo Técnico',
        type: 'text',
        icon: 'document-text',
        iconColor: '#6366f1',
        category: 'observaciones',
        order: 5,
      },
    ],
  },
  {
    _id: 'tpl_fisico_rendimiento',
    name: 'Evaluación Física & Rendimiento',
    isRecommended: true,
    isDefault: false,
    category: 'fisico',
    scope: 'POR_JUGADOR',
    questions: [
      {
        id: 'q20',
        questionText: 'Estado Físico General',
        type: 'rating10',
        icon: 'flame',
        iconColor: '#ef4444',
        category: 'fisico',
        order: 1,
      },
      {
        id: 'q21',
        questionText: 'Nivel de Fatiga Percibida (RPE)',
        type: 'rating10',
        icon: 'speed',
        iconColor: '#f97316',
        category: 'fisico',
        order: 2,
      },
      {
        id: 'q22',
        questionText: 'Capacidad de Recuperación',
        type: 'stars5',
        icon: 'star',
        iconColor: '#3b82f6',
        category: 'fisico',
        order: 3,
      },
      {
        id: 'q23',
        questionText: '¿Presenta alguna molestia o sobrecarga?',
        type: 'boolean',
        icon: 'warning',
        iconColor: '#ef4444',
        category: 'salud',
        order: 4,
      },
      {
        id: 'q24',
        questionText: 'Detalle de zonas con molestias u observaciones físicas',
        type: 'text',
        icon: 'note',
        iconColor: '#14b8a6',
        category: 'observaciones',
        order: 5,
      },
    ],
  },
];

const LEGACY_DEFAULT_EVALUATIONS = [
  {
    _id: 'eval_demo_1',
    templateId: 'tpl_partido_jugador',
    templateName: 'Evaluación de Partido (Jugador)',
    scope: 'POR_JUGADOR',
    playerId: 'p1',
    playerName: 'Angel Ballona',
    playerDorsal: '17',
    playerPhoto: '',
    date: '2026-08-15',
    overallScore: 8.5,
    answers: {
      q1: 9,
      q2: 8,
      q3: 8,
      q4: 5,
      q5: true,
      q6: 'DEL',
      q7: 'Gran desmarque y excelente presión tras pérdida durante la segunda parte.',
      q8: 'Mejorar la toma de decisiones en el último tercio.',
    },
    generalNotes: 'Excelente actuación en el partido contra el rival directo.',
    createdAt: '2026-08-15T18:30:00.000Z',
  },
  {
    _id: 'eval_demo_2',
    templateId: 'tpl_semanal_equipo',
    templateName: 'Evaluación Semanal de Equipo (General)',
    scope: 'GENERAL',
    date: '2026-08-17',
    overallScore: 7.8,
    answers: {
      q10: 8,
      q11: 4,
      q12: 'BUENO',
      q13: ['PRESION', 'TRANSICION'],
      q14: 'Semana de alta intensidad táctica con foco en transiciones de ataque a defensa.',
    },
    generalNotes: 'Buen ritmo de trabajo general en los microciclos.',
    createdAt: '2026-08-17T12:00:00.000Z',
  },
  {
    _id: 'eval_demo_3',
    templateId: 'tpl_fisico_rendimiento',
    templateName: 'Evaluación Física & Rendimiento',
    scope: 'POR_JUGADOR',
    playerId: 'p2',
    playerName: 'Gonzalo Boluda',
    playerDorsal: '20',
    playerPhoto: '',
    date: '2026-08-18',
    overallScore: 9.0,
    answers: {
      q20: 9,
      q21: 7,
      q22: 5,
      q23: false,
      q24: 'Totalmente recuperado y en nivel óptimo de forma física.',
    },
    generalNotes: 'Test de fuerza y resistencia superado con éxito.',
    createdAt: '2026-08-18T10:15:00.000Z',
  },
];

const createEmptyState = () => ({
  templates: DEFAULT_TEMPLATES,
  evaluations: [],
  activeTemplateId: DEFAULT_ACTIVE_TEMPLATE_ID,
});

const normalizeOwnerKey = (user = loadUser()) => {
  const isDemo = user?.plan === 'demo' || user?.accessMode === 'demo';
  if (isDemo) return DEMO_SOURCE_OWNER;

  const email = String(user?.correo || user?.email || '').trim().toLowerCase();
  const id = String(user?._id || user?.id || '').trim().toLowerCase();
  return email || id || 'anonymous';
};

const getStorageKey = (user = loadUser()) => `${STORAGE_KEY_PREFIX}:${normalizeOwnerKey(user)}`;

const getStorageKeys = (user = loadUser()) => {
  const email = String(user?.correo || user?.email || '').trim().toLowerCase();
  const id = String(user?._id || user?.id || '').trim().toLowerCase();
  return [...new Set([
    getStorageKey(user),
    email && `${STORAGE_KEY_PREFIX}:${email}`,
    id && `${STORAGE_KEY_PREFIX}:${id}`,
    LEGACY_STORAGE_KEY,
  ].filter(Boolean))];
};

const sanitizeState = (parsed = {}) => ({
  templates: Array.isArray(parsed.templates) && parsed.templates.length > 0
    ? parsed.templates
    : DEFAULT_TEMPLATES,
  evaluations: Array.isArray(parsed.evaluations) ? parsed.evaluations : [],
  activeTemplateId:
    parsed.activeTemplateId ||
    parsed.templates?.find?.((template) => template?.isDefault)?._id ||
    DEFAULT_ACTIVE_TEMPLATE_ID,
});

const readState = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return sanitizeState(JSON.parse(raw));
  } catch (err) {
    console.error('Error loading evaluations from storage:', err);
    return null;
  }
};

const persistState = (state, user = loadUser()) => {
  try {
    localStorage.setItem(
      getStorageKey(user),
      JSON.stringify({
        templates: state.templates,
        evaluations: state.evaluations,
        activeTemplateId: state.activeTemplateId,
      })
    );
  } catch (err) {
    console.error('Error saving evaluations to storage:', err);
  }
};

const isLegacyDefaultSeed = (evaluations = []) =>
  evaluations.length === LEGACY_DEFAULT_EVALUATIONS.length &&
  evaluations.every((evaluation) => String(evaluation?._id || '').startsWith('eval_demo_'));

const hasMeaningfulLegacyData = (parsed = {}) => {
  const templates = Array.isArray(parsed.templates) ? parsed.templates : [];
  const evaluations = Array.isArray(parsed.evaluations) ? parsed.evaluations : [];
  return templates.some((template) => !template?.isRecommended) || (evaluations.length > 0 && !isLegacyDefaultSeed(evaluations));
};

export const loadEvaluationsState = (user = loadUser()) => {
  const storedState = readState(getStorageKey(user));
  if (storedState) return storedState;

  if (normalizeOwnerKey(user) === DEMO_SOURCE_OWNER) {
    const legacyState = readState(LEGACY_STORAGE_KEY);
    if (legacyState && hasMeaningfulLegacyData(legacyState)) {
      persistState(legacyState, user);
      return legacyState;
    }
  }

  return createEmptyState();
};

const loadLocalEvaluations = (user) => {
  const byId = new Map();
  getStorageKeys(user).forEach((key) => {
    const state = readState(key);
    (state?.evaluations || []).forEach((evaluation) => {
      const id = String(evaluation?._id || '');
      if (id && !id.startsWith('eval_demo_')) byId.set(id, evaluation);
    });
  });
  return [...byId.values()];
};

export const syncEvaluations = createAsyncThunk('evaluations/sync', async (user, { getState }) => {
  const remote = await listEvaluations();
  const local = loadLocalEvaluations(user);
  (getState().evaluations.evaluations || []).forEach((evaluation) => {
    if (!local.some((item) => item._id === evaluation._id)) local.push(evaluation);
  });
  const remoteIds = new Set(remote.map((evaluation) => String(evaluation._id)));
  const pending = local.filter((evaluation) => !remoteIds.has(String(evaluation._id)));
  if (!pending.length) return remote;
  return remote.concat(await Promise.all(pending.map((evaluation) => createEvaluation(evaluation))));
});

const evaluationsSlice = createSlice({
  name: 'evaluations',
  initialState: createEmptyState(),
  reducers: {
    rehydrateEvaluations(_state, action) {
      return sanitizeState(action.payload);
    },
    // ---------- EVALUATIONS RECORD CRUD ----------
    addEvaluation(state, action) {
      const newEval = {
        _id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString(),
        ...action.payload,
      };
      state.evaluations.unshift(newEval);
      persistState(state);
    },
    updateEvaluation(state, action) {
      const { id, data } = action.payload;
      const index = state.evaluations.findIndex((e) => e._id === id);
      if (index !== -1) {
        state.evaluations[index] = {
          ...state.evaluations[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        persistState(state);
      }
    },
    deleteEvaluation(state, action) {
      const id = action.payload;
      state.evaluations = state.evaluations.filter((e) => e._id !== id);
      persistState(state);
    },

    // ---------- TEMPLATES CRUD ----------
    createTemplate(state, action) {
      const { name, scope = 'POR_JUGADOR', questions = [] } = action.payload;
      const newTpl = {
        _id: `tpl_${Date.now()}`,
        name: name.trim(),
        scope,
        isRecommended: false,
        isDefault: false,
        questions,
      };
      state.templates.push(newTpl);
      persistState(state);
    },
    createTemplateFromRecommended(state, action) {
      const { name, baseTemplateId, scope } = action.payload;
      const base = state.templates.find((t) => t._id === baseTemplateId) || state.templates[0];
      const newTpl = {
        _id: `tpl_${Date.now()}`,
        name: name.trim(),
        scope: scope || base.scope || 'POR_JUGADOR',
        isRecommended: false,
        isDefault: false,
        questions: (base.questions || []).map((q, idx) => ({
          ...q,
          id: `q_${Date.now()}_${idx}`,
        })),
      };
      state.templates.push(newTpl);
      persistState(state);
    },
    updateTemplate(state, action) {
      const { id, data } = action.payload;
      const index = state.templates.findIndex((t) => t._id === id);
      if (index !== -1) {
        state.templates[index] = { ...state.templates[index], ...data };
        persistState(state);
      }
    },
    deleteTemplate(state, action) {
      const id = action.payload;
      const target = state.templates.find((t) => t._id === id);
      if (target && !target.isRecommended) {
        state.templates = state.templates.filter((t) => t._id !== id);
        if (state.activeTemplateId === id) {
          state.activeTemplateId = state.templates[0]?._id || null;
        }
        persistState(state);
      }
    },
    setDefaultTemplate(state, action) {
      const id = action.payload;
      state.templates.forEach((t) => {
        t.isDefault = t._id === id;
      });
      state.activeTemplateId = id;
      persistState(state);
    },

    // ---------- QUESTION CRUD WITHIN TEMPLATE ----------
    addQuestionToTemplate(state, action) {
      const { templateId, question } = action.payload;
      const tpl = state.templates.find((t) => t._id === templateId);
      if (tpl) {
        if (!tpl.questions) tpl.questions = [];
        const newQuestion = {
          id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          order: tpl.questions.length + 1,
          ...question,
        };
        tpl.questions.push(newQuestion);
        persistState(state);
      }
    },
    updateQuestionInTemplate(state, action) {
      const { templateId, questionId, question } = action.payload;
      const tpl = state.templates.find((t) => t._id === templateId);
      if (tpl && tpl.questions) {
        const qIndex = tpl.questions.findIndex((q) => q.id === questionId);
        if (qIndex !== -1) {
          tpl.questions[qIndex] = { ...tpl.questions[qIndex], ...question };
          persistState(state);
        }
      }
    },
    removeQuestionFromTemplate(state, action) {
      const { templateId, questionId } = action.payload;
      const tpl = state.templates.find((t) => t._id === templateId);
      if (tpl && tpl.questions) {
        tpl.questions = tpl.questions.filter((q) => q.id !== questionId);
        persistState(state);
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(syncEvaluations.fulfilled, (state, action) => {
      state.evaluations = action.payload;
      persistState(state);
    });
  },
});

export const {
  rehydrateEvaluations,
  addEvaluation,
  updateEvaluation,
  deleteEvaluation,
  createTemplate,
  createTemplateFromRecommended,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate,
  addQuestionToTemplate,
  updateQuestionInTemplate,
  removeQuestionFromTemplate,
} = evaluationsSlice.actions;

export default function evaluationsReducer(state, action) {
  return evaluationsSlice.reducer(state === undefined ? loadEvaluationsState() : state, action);
}
