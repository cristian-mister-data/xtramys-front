/**
 * Helpers para persistir el estado de formularios cuando hacen un round-trip
 * a otra ruta (típicamente al editor del campo táctico) y necesitan
 * restaurarse al volver. En RN nativo el stack mantiene la pantalla viva,
 * pero en web (react-router) la pantalla se desmonta al navegar.
 *
 * Almacenamos en sessionStorage para que sobreviva al reload del SPA pero
 * no contamine entre pestañas.
 */

const safeWindow = typeof window !== 'undefined' ? window : null;
const storage = safeWindow?.sessionStorage || null;

export function saveFormDraft(key, value) {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // sessionStorage lleno o deshabilitado: ignorar.
  }
}

export function loadFormDraft(key, { remove = true } = {}) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (raw == null) return null;
    if (remove) storage.removeItem(key);
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearFormDraft(key) {
  if (!storage) return;
  try { storage.removeItem(key); } catch {}
}

// Claves usadas por las páginas/listas y formularios.
export const STORAGE_KEYS = {
  STRATEGY_LIST: 'xtramys.strategyList.state',
  EXERCISE_LIST: 'xtramys.exerciseList.state',
  TRAINING_SESSION_DRAFT: 'xtramys.trainingSession.draft',
  STRATEGY_FORM_DRAFT: 'xtramys.strategyForm.draft',
  EXERCISE_FORM_DRAFT: 'xtramys.exerciseForm.draft',
  FIELD_RESULT: 'xtramys.field.result',
};
