export const parseCalendarDate = (value) => {
  if (!value) return null;
  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const buildActiveCalendarMonths = (matchSheets = [], trainingSessions = []) => {
  const months = new Map();

  const addEvent = (type, item, rawDate) => {
    const date = parseCalendarDate(rawDate);
    if (!date) return;
    const key = monthKey(date);
    if (!months.has(key)) {
      months.set(key, { key, year: date.getFullYear(), month: date.getMonth(), days: new Map() });
    }
    const day = date.getDate();
    const month = months.get(key);
    if (!month.days.has(day)) month.days.set(day, []);
    month.days.get(day).push({ type, item, date });
  };

  matchSheets.forEach((match) => addEvent('match', match, match?.fechaHora));
  trainingSessions.forEach((session) => addEvent('training', session, session?.fecha || session?.fechaHora));

  return [...months.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((month) => ({
      ...month,
      days: new Map([...month.days].map(([day, events]) => [
        day,
        events.sort((a, b) => a.date - b.date),
      ])),
    }));
};
