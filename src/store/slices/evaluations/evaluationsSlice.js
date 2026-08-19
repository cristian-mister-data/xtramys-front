import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'xtramys_evaluations_v1';

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

const loadInitialState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        templates: parsed.templates || DEFAULT_TEMPLATES,
        evaluations: parsed.evaluations || [],
        activeTemplateId: parsed.activeTemplateId || 'tpl_partido_jugador',
      };
    }
  } catch (err) {
    console.error('Error loading evaluations from storage:', err);
  }
  return {
    templates: DEFAULT_TEMPLATES,
    evaluations: [],
    activeTemplateId: 'tpl_partido_jugador',
  };
};

const saveState = (state) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
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

const initialState = loadInitialState();

const evaluationsSlice = createSlice({
  name: 'evaluations',
  initialState,
  reducers: {
    // ---------- EVALUATIONS RECORD CRUD ----------
    addEvaluation(state, action) {
      const newEval = {
        _id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString(),
        ...action.payload,
      };
      state.evaluations.unshift(newEval);
      saveState(state);
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
        saveState(state);
      }
    },
    deleteEvaluation(state, action) {
      const id = action.payload;
      state.evaluations = state.evaluations.filter((e) => e._id !== id);
      saveState(state);
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
      saveState(state);
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
      saveState(state);
    },
    updateTemplate(state, action) {
      const { id, data } = action.payload;
      const index = state.templates.findIndex((t) => t._id === id);
      if (index !== -1) {
        state.templates[index] = { ...state.templates[index], ...data };
        saveState(state);
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
        saveState(state);
      }
    },
    setDefaultTemplate(state, action) {
      const id = action.payload;
      state.templates.forEach((t) => {
        t.isDefault = t._id === id;
      });
      state.activeTemplateId = id;
      saveState(state);
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
        saveState(state);
      }
    },
    updateQuestionInTemplate(state, action) {
      const { templateId, questionId, question } = action.payload;
      const tpl = state.templates.find((t) => t._id === templateId);
      if (tpl && tpl.questions) {
        const qIndex = tpl.questions.findIndex((q) => q.id === questionId);
        if (qIndex !== -1) {
          tpl.questions[qIndex] = { ...tpl.questions[qIndex], ...question };
          saveState(state);
        }
      }
    },
    removeQuestionFromTemplate(state, action) {
      const { templateId, questionId } = action.payload;
      const tpl = state.templates.find((t) => t._id === templateId);
      if (tpl && tpl.questions) {
        tpl.questions = tpl.questions.filter((q) => q.id !== questionId);
        saveState(state);
      }
    },
  },
});

export const {
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

export default evaluationsSlice.reducer;
