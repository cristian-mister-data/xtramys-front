import assert from 'node:assert/strict';
import { buildLineupAssignments, buildVisualPositions } from '../src/utils/lineupPositions.js';

const formation = Array.from({ length: 11 }, (_, index) => ({ index, pos: index === 0 ? 'POR' : 'MC', x: index * 5, y: index * 8 }));
const saved = buildVisualPositions({ 7: 'player-1' }, formation);
const restored = buildLineupAssignments(['player-1'], saved, formation);

assert.equal(restored[0], undefined);
assert.equal(restored[7], 'player-1');
console.log('lineup positions ok');
