import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const slice = readFileSync(new URL('../src/store/slices/evaluations/evaluationsSlice.js', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/api/evaluations.js', import.meta.url), 'utf8');

assert(!slice.includes('localStorage.setItem'), 'Evaluations must not be written to localStorage');
assert(!slice.includes('pending.map'), 'Local evaluations must not be uploaded during sync');
assert(api.includes("api.get('/evaluations', { skipCache: true })"), 'Evaluation reads must bypass the GET cache');

console.log('Evaluations use the server as their only persistent source.');
