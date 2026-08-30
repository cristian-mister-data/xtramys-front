import assert from 'node:assert/strict';
import { getMatchPlayerContributions, getPlayerMatchStats } from '../src/utils/matchPlayerStats.js';

const stats = getMatchPlayerContributions({
  eventos: [{ player: 'kuchini', goles: 2, asistencias: 1 }],
  goles: [1, 2, 3, 4].map((minuto) => ({ jugador: { _id: 'kuchini' }, minuto })),
});

assert.equal(stats.get('kuchini').goals, 4, 'Los goles detallados deben prevalecer sobre eventos');
assert.equal(stats.get('kuchini').assists, 1, 'Eventos debe respaldar asistencias sin detalle');

const totals = getPlayerMatchStats([{
  fechaHora: '2020-01-01T12:00:00Z',
  alineacionTitulares: ['kuchini'],
  goles: [1, 2, 3, 4].map((minuto) => ({ jugador: 'kuchini', minuto })),
}], 'kuchini', { tiempoPorParte: 45 });
assert.deepEqual(
  { matches: totals.matches.total, minutes: totals.matches.minutesPlayed, goals: totals.goals.total },
  { matches: 1, minutes: 90, goals: 4 },
);
console.log('match player stats check passed');
