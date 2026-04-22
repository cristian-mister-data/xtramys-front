/** Shim de expo-font para web. Las fuentes se cargan vía CSS @font-face manualmente si hace falta. */
export function useFonts() { return [true, null]; }
export async function loadAsync() { return; }
export function isLoaded() { return true; }
export function isLoading() { return false; }
export function processFontFamily(fontFamily) { return fontFamily; }
export const Font = { useFonts, loadAsync, isLoaded, isLoading, processFontFamily };
export default Font;
