/**
 * Helpers para persistir el estado de formularios cuando hacen un round-trip
 * a otra ruta (típicamente al editor del campo táctico) y necesitan
 * restaurarse al volver. En RN nativo el stack mantiene la pantalla viva,
 * pero en web (react-router) la pantalla se desmonta al navegar.
 *
 * Se guarda en sessionStorage y localStorage: el segundo permite recuperar
 * el borrador tras reiniciar una app móvil. Al guardar en BBDD se limpian ambos.
 */

const safeWindow = typeof window !== 'undefined' ? window : null;
const storages = [safeWindow?.sessionStorage, safeWindow?.localStorage].filter(Boolean);

export function saveFormDraft(key, value) {
  const serialized = JSON.stringify(value);
  storages.forEach((storage) => {
    try { storage.setItem(key, serialized); } catch {}
  });
}

export function loadFormDraft(key, { remove = true } = {}) {
  for (const storage of storages) {
    try {
      const raw = storage.getItem(key);
      if (raw == null) continue;
      if (remove) clearFormDraft(key);
      return JSON.parse(raw);
    } catch {}
  }
  return null;
}

export function loadFormDrafts(key) {
  const seen = new Set();
  return storages.flatMap((storage) => {
    try {
      const raw = storage.getItem(key);
      if (!raw || seen.has(raw)) return [];
      seen.add(raw);
      return [JSON.parse(raw)];
    } catch {
      return [];
    }
  });
}

export function clearFormDraft(key) {
  storages.forEach((storage) => {
    try { storage.removeItem(key); } catch {}
  });
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
