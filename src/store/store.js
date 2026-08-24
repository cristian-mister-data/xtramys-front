// store/store.js
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';
import { createEvaluation, updateEvaluationRemote, deleteEvaluationRemote } from '@/api/evaluations';

const evaluationSyncMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  if (action.type === 'evaluations/addEvaluation') {
    const evaluation = store.getState().evaluations.evaluations[0];
    createEvaluation(evaluation).catch((error) => console.warn('No se pudo guardar la evaluación:', error));
  } else if (action.type === 'evaluations/updateEvaluation') {
    updateEvaluationRemote(action.payload.id, action.payload.data)
      .catch((error) => console.warn('No se pudo actualizar la evaluación:', error));
  } else if (action.type === 'evaluations/deleteEvaluation') {
    deleteEvaluationRemote(action.payload)
      .catch((error) => console.warn('No se pudo eliminar la evaluación:', error));
  }
  return result;
};

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }).concat(evaluationSyncMiddleware),
  devTools: import.meta.env.DEV,
});

export default store;
