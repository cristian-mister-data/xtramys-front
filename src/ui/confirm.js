// Wrapper alrededor de window.confirm para mantener una API uniforme y
// permitir sustituirlo por un modal personalizado en el futuro.
export function confirmAction(message) {
  return Promise.resolve(window.confirm(message));
}
