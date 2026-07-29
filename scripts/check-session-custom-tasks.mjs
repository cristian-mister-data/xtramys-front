import assert from 'node:assert/strict';
import {
  getCustomTaskSelectionId,
  isCustomTaskSelectionId,
  mergeOrderedSessionTasks,
} from '../src/utils/sessionCustomTasks.js';

const task = { id: 'pressing', nombre: 'Presión', orden: 2, observaciones: ['Intensidad alta'] };
const items = mergeOrderedSessionTasks(
  [{ _id: 'exercise-a', nombre: 'Rondo' }, { _id: 'exercise-b', nombre: 'Partido' }],
  { 'exercise-a': { orden: 1 }, 'exercise-b': { orden: 3 } },
  [task],
);

assert.deepEqual(items.map((item) => item.nombre), ['Rondo', 'Presión', 'Partido']);
assert.equal(getCustomTaskSelectionId(task), 'custom-task:pressing');
assert.equal(isCustomTaskSelectionId(items[1]._id), true);
console.log('session custom task ordering: OK');
