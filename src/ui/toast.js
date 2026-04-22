// Toast minimalista basado en eventos.
// Permite emitir mensajes de éxito/error sin acoplar a una librería concreta.
const listeners = new Set();

export const toast = {
  success: (message) => emit({ type: 'success', message }),
  error: (message) => emit({ type: 'error', message }),
  info: (message) => emit({ type: 'info', message }),
  subscribe: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

function emit(payload) {
  const t = { ...payload, id: Date.now() + Math.random() };
  listeners.forEach((fn) => fn(t));
}
