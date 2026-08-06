import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const capacitor = JSON.parse(read('capacitor.config.json'));
const importModal = read('src/components/season/TrainingSessionImportModal.jsx');

assert.equal(capacitor.plugins.CapacitorHttp.enabled, false);
assert.equal(capacitor.plugins.Keyboard.resize, 'native');
assert.match(read('src/platform/nativeApp.js'), /KeyboardResize\.Native/);
assert.match(read('src/ui/Modal.jsx'), /--safe-area-inset-bottom/);
assert.match(importModal, /footer=\{footer\}/);
assert.match(importModal, /const chooseFile = async/);
assert.match(importModal, /setFileData\(await fileToBase64\(next\)\)/);
assert.match(importModal, /analyzeSessionPdf\(\{ fileData, filename: file\.name \}\)/);
assert.doesNotMatch(importModal, /const data = await fileToBase64\(file\)/);
assert.match(read('src/components/season/seasonHelpers.js'), /file\.arrayBuffer\(\)/);
assert.match(read('src/api/session.js'), /api\.post\('\/session\/import\/analyze'/);

console.log('Training PDF import uses the web transport and native-safe modal layout');
