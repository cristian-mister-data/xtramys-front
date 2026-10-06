export function parseSubstitutionLimit(value) {
  if (value === 'infinito' || value === null) return null;
  const text = String(value ?? '').trim();
  const number = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(number)) return undefined;
  return number;
}
