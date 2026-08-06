// Helpers de temporada/equipo compartidos por la sección Season
export const formatSeasonYear = (year) => {
  const y = parseInt(year, 10);
  if (Number.isNaN(y)) return String(year || '');
  return `${y}-${y + 1}`;
};

export const yearOptions = (() => {
  const opts = [];
  const cy = new Date().getFullYear();
  for (let y = 2000; y <= cy + 1; y += 1) {
    opts.push({ value: String(y), label: `${y}-${y + 1}` });
  }
  return opts;
})();

export const categoryOptions = (t) => [
  { value: 'prebenjamin', label: t('team.categories.prebenjamin', 'Prebenjamín') },
  { value: 'benjamin', label: t('team.categories.benjamin', 'Benjamín') },
  { value: 'alevin', label: t('team.categories.alevin', 'Alevín') },
  { value: 'infantil', label: t('team.categories.infantil', 'Infantil') },
  { value: 'cadete', label: t('team.categories.cadete', 'Cadete') },
  { value: 'juvenil', label: t('team.categories.juvenil', 'Juvenil') },
  { value: 'senior', label: t('team.categories.senior', 'Sénior') },
  { value: 'otro', label: t('team.categories.otro', 'Otro') },
];

export const timePerHalfOptions = [10, 15, 20, 25, 30, 35, 40, 45];
export const playersPerTeamOptions = [7, 8, 11];

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function normalizeFileDataUrl(result, fallbackMime) {
  if (typeof result !== 'string' || !result) return '';
  return result.startsWith('data:;base64,')
    ? result.replace('data:;base64,', `data:${fallbackMime};base64,`)
    : result;
}

function looksLikeCompletePdf(dataUrl, file) {
  if (!/\.pdf$/i.test(file?.name || '')) return Boolean(dataUrl);
  const encoded = dataUrl.split(',')[1] || '';
  try {
    const bytes = atob(encoded);
    return bytes.slice(0, 4) === '%PDF' && (!file.size || bytes.length === file.size);
  } catch (_) {
    return false;
  }
}

function readFileWithReader(file, fallbackMime) {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') return reject(new Error('FileReader unavailable'));
    const reader = new FileReader();
    reader.onload = () => resolve(normalizeFileDataUrl(reader.result, fallbackMime));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Convierte un File a base64 usando la misma lectura binaria en web, Android e iOS.
export async function fileToBase64(file) {
  if (!file) return '';

  const fallbackMime = /\.pdf$/i.test(file.name || '') ? 'application/pdf' : (file.type || 'application/octet-stream');

  try {
    const dataUrl = await readFileWithReader(file, fallbackMime);
    if (looksLikeCompletePdf(dataUrl, file)) return dataUrl;
  } catch (_) {
    // Algunos selectores nativos no exponen FileReader.
  }

  if (typeof file.arrayBuffer === 'function') {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = file.type && file.type !== 'application/octet-stream' ? file.type : fallbackMime;
      const dataUrl = `data:${mime};base64,${bytesToBase64(bytes)}`;
      if (looksLikeCompletePdf(dataUrl, file)) return dataUrl;
    } catch (_) {
      // Fallback para shells donde arrayBuffer falla con archivos del sistema.
    }
  }

  throw new Error('No se pudo leer el PDF completo');
}
