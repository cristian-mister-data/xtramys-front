// Normalize decomposed accents and repair UTF-8 text previously read as Latin-1.
export function normalizePdfText(value) {
  return String(value || '').normalize('NFC').replace(/[ÃÂ][\u0080-\u00bf]+/g, text => {
    try { return new TextDecoder('utf-8', {fatal: true}).decode(Uint8Array.from(text, char => char.charCodeAt(0))); }
    catch { return text; }
  });
}
export function safePdfName(fileName) {
  const name = normalizePdfText(fileName || 'Xtramys').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'Xtramys';
  return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
}
