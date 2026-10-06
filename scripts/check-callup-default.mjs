import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPlayerInjuryStatus } from '../src/vendor/shared/training/helpers.js';

const injuries = [{ jugador: 'injured', fechaInicio: '2020-01-01' }];
assert.equal(getPlayerInjuryStatus('healthy', injuries), null);
assert.ok(getPlayerInjuryStatus('injured', injuries));
const form = readFileSync(new URL('../src/vendor/season/EditMatchSheetModal.js', import.meta.url), 'utf8');
assert.match(form, /visible=\{showConvocadosModal\}\s+initialInjuryFilter="disponibles"/);
const selector = readFileSync(new URL('../src/vendor/shared/training/PlayerSelectionModal.js', import.meta.url), 'utf8');
assert.match(selector, /initialInjuryFilter = 'todos'/);
assert.match(selector, /setInjuryFilter\(initialInjuryFilter\)/);
console.log('callup available default: ok');
