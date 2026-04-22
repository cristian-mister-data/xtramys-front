/** Shim de expo-clipboard para web (Clipboard API). */
export async function setStringAsync(text) {
  try {
    await navigator.clipboard.writeText(text || '');
    return true;
  } catch {
    return false;
  }
}
export async function getStringAsync() {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return '';
  }
}
export const setString = setStringAsync;
export const getString = getStringAsync;

export default { setStringAsync, getStringAsync, setString, getString };
