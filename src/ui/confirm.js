// Wrapper uniforme para confirmaciones web. El shim global de RNW lo resuelve
// con un toast profesional y conserva fallback nativo si el shim no cargó.
export function confirmAction(message, options = {}) {
  if (typeof window !== 'undefined' && typeof window.__xtramysConfirm === 'function') {
    return window.__xtramysConfirm(message, options);
  }
  return Promise.resolve(false);
}
