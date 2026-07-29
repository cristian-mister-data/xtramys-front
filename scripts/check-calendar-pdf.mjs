import assert from 'node:assert/strict';
import { buildActiveCalendarMonths } from '../src/vendor/season/calendarPdfData.js';

const months = buildActiveCalendarMonths(
  [
    { _id: 'm1', fechaHora: '2026-09-10T18:00:00', rival: 'A' },
    { _id: 'm2', fechaHora: '2026-10-02T12:00:00', rival: 'B' },
  ],
  [
    { _id: 't1', fecha: '2026-09-10', horaInicio: '17:00' },
    { _id: 'invalid', fecha: 'not-a-date' },
  ],
);

assert.deepEqual(months.map((month) => month.key), ['2026-09', '2026-10']);
assert.equal(months[0].days.get(10).length, 2);
assert.equal(months[1].days.get(2)[0].type, 'match');
console.log('calendar PDF grouping: OK');
