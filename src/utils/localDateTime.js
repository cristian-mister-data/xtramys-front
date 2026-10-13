export function formatLocalDateTime(value, locale, options = {}) {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toLocaleString(locale, { ...options, timeZone: 'UTC' });
}
