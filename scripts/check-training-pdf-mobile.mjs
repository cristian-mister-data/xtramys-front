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
assert.match(importModal, /const input = event\.currentTarget/);
assert.match(importModal, /setFile\(\{ name: (?:filename|next\.name), size: next\.size \}\)/);
assert.match(importModal, /const data = await fileToBase64\(next\)/);
assert.match(importModal, /setFileData\(data\)/);
assert.match(importModal, /finally \{\s*input\.value = ''/);
assert.match(importModal, /analyzeSessionPdf\(\{ fileData, filename: file\.name \}\)/);
assert.match(importModal, /loading="lazy" decoding="async"/);
assert.doesNotMatch(importModal, /const data = await fileToBase64\(file\)/);
assert.match(read('src/components/season/seasonHelpers.js'), /readFileWithReader/);
assert.match(read('src/components/season/seasonHelpers.js'), /looksLikeCompletePdf/);
assert.match(read('src/components/season/seasonHelpers.js'), /file\.arrayBuffer\(\)/);
assert.match(read('src/api/session.js'), /api\.post\('\/session\/import\/analyze'/);

const { fileToBase64 } = await import('../src/components/season/seasonHelpers.js');
const pdfBytes = new TextEncoder().encode('%PDF-1.7\nmobile-byte-check\n%%EOF');
const encoded = await fileToBase64({
  name: 'sesion.pdf',
  type: 'application/octet-stream',
  size: pdfBytes.length,
  arrayBuffer: async () => pdfBytes.buffer,
});
assert.equal(encoded.split(',')[0], 'data:application/pdf;base64');
assert.deepEqual(Buffer.from(encoded.split(',')[1], 'base64'), Buffer.from(pdfBytes));

const previousFileReader = globalThis.FileReader;
globalThis.FileReader = class {
  readAsDataURL(file) {
    const base64 = Buffer.from(file._bytes).toString('base64');
    this.result = `data:;base64,${base64}`;
    queueMicrotask(() => this.onload({ target: { result: this.result } }));
  }
};
try {
  const readerEncoded = await fileToBase64({ name: 'sesion.pdf', type: 'application/pdf', size: pdfBytes.length, _bytes: pdfBytes });
  assert.equal(readerEncoded.split(',')[0], 'data:application/pdf;base64');
  assert.deepEqual(Buffer.from(readerEncoded.split(',')[1], 'base64'), Buffer.from(pdfBytes));
} finally {
  globalThis.FileReader = previousFileReader;
}

console.log('Training PDF import uses the web transport and native-safe modal layout');
