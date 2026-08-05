import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const capacitor = JSON.parse(read('capacitor.config.json'));

assert.equal(capacitor.plugins.CapacitorHttp.enabled, false);
assert.equal(capacitor.plugins.Keyboard.resize, 'native');
assert.match(read('src/platform/nativeApp.js'), /KeyboardResize\.Native/);
assert.match(read('src/ui/Modal.jsx'), /--safe-area-inset-bottom/);
assert.match(read('src/components/season/TrainingSessionImportModal.jsx'), /footer=\{footer\}/);
assert.match(read('src/components/season/seasonHelpers.js'), /file\.arrayBuffer\(\)/);
assert.match(read('src/api/session.js'), /api\.post\('\/session\/import\/analyze'/);

console.log('Training PDF import uses the web transport and native-safe modal layout');
