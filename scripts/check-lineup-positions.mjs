import assert from 'node:assert/strict';
import { buildLineupAssignments, buildVisualPositions } from '../src/utils/lineupPositions.js';
import { ALINEACIONES_BY_PLAYER_COUNT, FORMATIONS_BY_PLAYER_COUNT } from '../src/features/matchSheet/formations.js';

const formation = Array.from({ length: 11 }, (_, index) => ({ index, pos: index === 0 ? 'POR' : 'MC', x: index * 5, y: index * 8 }));
const saved = buildVisualPositions({ 7: 'player-1' }, formation);
const restored = buildLineupAssignments(['player-1'], saved, formation);

assert.equal(restored[0], undefined);
assert.equal(restored[7], 'player-1');

for (const [playerCount, formations] of Object.entries(ALINEACIONES_BY_PLAYER_COUNT)) {
  for (const formationName of formations) {
    const slots = FORMATIONS_BY_PLAYER_COUNT[playerCount][formationName];
    assert.equal(slots.length, Number(playerCount), `${formationName} must have ${playerCount} positions`);
    assert.equal(new Set(slots.map(({ x, y }) => `${x}:${y}`)).size, Number(playerCount), `${formationName} has overlapping positions`);
    assert.ok(slots.every(({ x, y, pos }) => x >= 5 && x <= 95 && y >= 5 && y <= 95 && pos), `${formationName} has an invalid position`);
  }
}
console.log('lineup positions ok');
