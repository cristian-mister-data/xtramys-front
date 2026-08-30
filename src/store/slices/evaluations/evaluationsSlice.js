import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  listEvaluations,
  createEvaluation,
  updateEvaluationRemote,
  deleteEvaluationRemote,
} from '@/api/evaluations';

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

const createEmptyState = () => ({
  templates: DEFAULT_TEMPLATES,
  evaluations: [],
  activeTemplateId: DEFAULT_ACTIVE_TEMPLATE_ID,
});

export const clearEvaluationStorage = () => {
  [localStorage, sessionStorage].forEach((storage) => {
    try {
      Object.keys(storage)
        .filter((key) => key.toLowerCase().includes('evaluation'))
        .forEach((key) => storage.removeItem(key));
    } catch {
      // Storage can be unavailable in restricted WebViews; evaluations never depend on it.
    }
  });
};

clearEvaluationStorage();

export const syncEvaluations = createAsyncThunk('evaluations/sync', listEvaluations);
export const addEvaluation = createAsyncThunk('evaluations/add', createEvaluation);
export const updateEvaluation = createAsyncThunk(
  'evaluations/update',
  ({ id, data }) => updateEvaluationRemote(id, data)
);
export const deleteEvaluation = createAsyncThunk(
  'evaluations/delete',
  async (id) => {
    await deleteEvaluationRemote(id);
    return id;
  }
);

const evaluationsSlice = createSlice({
  name: 'evaluations',
  initialState: createEmptyState(),
  reducers: {
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
    },
    updateTemplate(state, action) {
      const { id, data } = action.payload;
      const index = state.templates.findIndex((t) => t._id === id);
      if (index !== -1) {
        state.templates[index] = { ...state.templates[index], ...data };
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
      }
    },
    setDefaultTemplate(state, action) {
      const id = action.payload;
      state.templates.forEach((t) => {
        t.isDefault = t._id === id;
      });
      state.activeTemplateId = id;
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
      }
    },
    updateQuestionInTemplate(state, action) {
      const { templateId, questionId, question } = action.payload;
      const tpl = state.templates.find((t) => t._id === templateId);
      if (tpl && tpl.questions) {
        const qIndex = tpl.questions.findIndex((q) => q.id === questionId);
        if (qIndex !== -1) {
          tpl.questions[qIndex] = { ...tpl.questions[qIndex], ...question };
        }
      }
    },
    removeQuestionFromTemplate(state, action) {
      const { templateId, questionId } = action.payload;
      const tpl = state.templates.find((t) => t._id === templateId);
      if (tpl && tpl.questions) {
        tpl.questions = tpl.questions.filter((q) => q.id !== questionId);
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(syncEvaluations.pending, (state) => {
      state.evaluations = [];
    });
    builder.addCase(syncEvaluations.rejected, (state) => {
      state.evaluations = [];
    });
    builder.addCase(syncEvaluations.fulfilled, (state, action) => {
      state.evaluations = action.payload;
    });
    builder.addCase(addEvaluation.fulfilled, (state, action) => {
      state.evaluations.unshift(action.payload);
    });
    builder.addCase(updateEvaluation.fulfilled, (state, action) => {
      const index = state.evaluations.findIndex((evaluation) => evaluation._id === action.payload._id);
      if (index !== -1) state.evaluations[index] = action.payload;
    });
    builder.addCase(deleteEvaluation.fulfilled, (state, action) => {
      state.evaluations = state.evaluations.filter((evaluation) => evaluation._id !== action.payload);
    });
  },
});

export const {
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
  return evaluationsSlice.reducer(state, action);
}
