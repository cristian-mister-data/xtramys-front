import assert from 'node:assert/strict';
import { parseSubstitutionLimit } from '../src/utils/substitutionLimit.js';

for (const value of [0, 1, 7, 8, 25, 100]) {
  assert.equal(parseSubstitutionLimit(String(value)), value);
}
assert.equal(parseSubstitutionLimit('infinito'), null);
assert.equal(parseSubstitutionLimit(null), null);
for (const value of ['', '-1', '2.5', 'abc', '5abc', 'Infinity', '9007199254740992']) {
  assert.equal(parseSubstitutionLimit(value), undefined);
}
console.log('substitution limits: ok');
