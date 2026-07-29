import assert from 'node:assert/strict';
import { isVersionOlder } from '../src/utils/appVersion.js';

assert.equal(isVersionOlder('1.0.6', '1.0.7'), true);
assert.equal(isVersionOlder('1.0.7', '1.0.7'), false);
assert.equal(isVersionOlder('1.1.0', '1.0.7'), false);
assert.equal(isVersionOlder('1.0', '1.0.1'), true);

console.log('app version comparison: OK');
