import assert from 'node:assert/strict';
import { buildRecoveredSetPiece } from '../src/utils/setPieceMigration.js';

const draft = { kind: 'setPiece', name: 'Córner corto', description: 'Salida', fieldElements: [{ id: 'old' }] };
const result = { kind: 'setPiece', fieldElements: [{ id: 'new' }], imagen: 'data:image/png;base64,abc', pizarraConfig: '{"showPhotos":true}' };
const first = buildRecoveredSetPiece(draft, result);
const second = buildRecoveredSetPiece(draft, result);

assert.equal(first.nombre, 'Córner corto');
assert.deepEqual(first.elementosCampo, [{ id: 'new' }]);
assert.equal(first.pizarraConfig.setPieceMode, true);
assert.equal(first.pizarraConfig.showPhotos, true);
assert.equal(first.legacyMigrationKey, second.legacyMigrationKey);
assert.equal(buildRecoveredSetPiece({}, {}), null);

console.log('Set-piece local migration check passed');
