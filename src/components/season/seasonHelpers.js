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

// Convierte un File a base64 data URL (para enviar el escudo al backend igual que en mobile)
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
