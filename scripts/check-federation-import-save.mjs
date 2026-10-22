import assert from 'node:assert/strict';
import fs from 'node:fs';
import { teamKey } from '../src/features/federationImport/parseFederationPdf.js';

// Exercise the component's save handler against frozen API responses, as shared Redux data is frozen by Immer.
const source = fs.readFileSync(new URL('../src/features/federationImport/FederationImport.jsx', import.meta.url), 'utf8');
const start = source.indexOf('  async function save() {');
const end = source.indexOf('\n  return <>', start);
assert.ok(start >= 0 && end > start);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction('ctx', `const { inFlight, ownName, calendar, tournamentId, setBusy, setError, setResult, api, team, teamKey, rivals, setProgress, dispatch, createRival, updateRival, matches, directory, createMatchSheet, fetchRivalsByTeam, fetchMatchSheetsByTeam, onImported } = ctx; ${source.slice(start, end)}; await save();`);

const savedRivals = Array.from({ length: 13 }, (_, i) => Object.freeze({ _id: `r${i}`, nombre: `Rival ${i}`, escudo: `https://example.test/${i}.png` }));
const savedMatches = Array.from({ length: 5 }, (_, i) => Object.freeze({ jornada: i + 1, torneoId: i === 0 ? { _id: 'league' } : 'other', fase: 'liga' }));
const matches = Array.from({ length: 26 }, (_, i) => ({ jornada: i + 1, rival: `Rival ${i % 13}`, home: 'Mi equipo', date: '2026-10-11', ubicacion: i % 2 ? 'Fuera' : 'Casa' }));
let rivalWrites = 0, matchWrites = 0, failAt = 3, error = '', result = '', refreshes = 0;
const ctx = {
  inFlight: { current: false }, ownName: 'Mi equipo', calendar: matches, matches, tournamentId: 'league', team: { _id: 'team' }, teamKey,
  rivals: savedRivals, directory: [], setBusy() {}, setProgress() {}, setError(v) { error = v; }, setResult(v) { result = v; },
  api: { async get(url) { return { data: Object.freeze([...(url.startsWith('/rival/') ? savedRivals : savedMatches)]) }; } },
  createRival: data => ({ kind: 'rival', data }), updateRival: data => ({ kind: 'rival', data }),
  createMatchSheet: data => ({ kind: 'match', data }), fetchRivalsByTeam: () => ({ kind: 'refresh' }), fetchMatchSheetsByTeam: () => ({ kind: 'refresh' }),
  dispatch(action) { return { async unwrap() {
    if (action.kind === 'rival') { rivalWrites++; throw new Error('Existing rivals must be preserved'); }
    if (action.kind === 'refresh') { refreshes++; return []; }
    if (matchWrites === failAt) { failAt = -1; throw new Error('Simulated interruption'); }
    const saved = Object.freeze({ ...action.data, _id: `m${matchWrites++}` });
    savedMatches.push(saved);
    return saved;
  } }; },
};
await run(ctx);
assert.match(error, /Simulated interruption.*3 fichas/);
assert.equal(ctx.inFlight.current, false);
await run(ctx);
assert.equal(error, '');
assert.match(result, /4 jornadas existentes conservadas/);
assert.match(result, /22 fichas creadas/);
assert.equal(rivalWrites, 0);
assert.equal(matchWrites, 25);
assert.equal(new Set(savedMatches.filter(m => String(m.torneoId?._id || m.torneoId) === 'league').map(m => m.jornada)).size, 26);
await run(ctx);
assert.match(result, /0 fichas creadas. 26 jornadas existentes conservadas/);
assert.equal(matchWrites, 25);
assert.equal(refreshes, 6);
console.log('Import save checks passed: frozen responses, preserved rivals, correct partial count, safe retries and 26 unique rounds.');
