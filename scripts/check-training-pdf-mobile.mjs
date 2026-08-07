import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const capacitor = JSON.parse(read('capacitor.config.json'));
const uploadModal = read('src/components/season/TrainingSessionPdfUploadModal.jsx');
const training = read('src/vendor/training/training.js');
const sessionApi = read('src/api/session.js');
const sessionRoutes = read('../xtramys-api/src/routes/trainingSession.js');
const sessionController = read('../xtramys-api/src/controllers/trainingSession.js');

assert.equal(capacitor.plugins.CapacitorHttp.enabled, false);
assert.equal(capacitor.plugins.Keyboard.resize, 'native');
assert.match(read('src/platform/nativeApp.js'), /KeyboardResize\.Native/);
assert.match(read('src/ui/Modal.jsx'), /--safe-area-inset-bottom/);
assert.doesNotMatch(training, /TrainingSessionImportModal|pdfImportVisible|handlePdfImport|session\.importPdf/);
assert.doesNotMatch(sessionApi, /analyzeSessionPdf|import\/analyze/);
assert.doesNotMatch(sessionRoutes, /import\/analyze|analyzeImportedSessionPdf/);
assert.match(uploadModal, /file: file\.blob/);
assert.match(uploadModal, /fileToPdfBlob\(next\)/);
assert.doesNotMatch(uploadModal, /fileToBase64|fileData/);
assert.match(sessionApi, /'Content-Type': 'application\/pdf'/);
assert.match(sessionApi, /api\.post\(url, file/);
assert.match(sessionRoutes, /express\.raw\(\{ type: \['application\/pdf', 'application\/x-pdf'\], limit: '25mb' \}\)/);
assert.match(sessionController, /Buffer\.isBuffer\(body\)/);
assert.match(sessionController, /body\?\.fileData/);

const pdfBytes = new TextEncoder().encode('%PDF-1.7\nmobile-byte-check\n%%EOF');
const { fileToPdfBlob } = await import('../src/components/season/seasonHelpers.js');
const pdfBlob = await fileToPdfBlob({
  name: 'sesion.pdf',
  size: pdfBytes.length,
  arrayBuffer: async () => pdfBytes.slice().buffer,
});
assert.deepEqual(Buffer.from(await pdfBlob.arrayBuffer()), Buffer.from(pdfBytes));

const previousFileReader = globalThis.FileReader;
globalThis.FileReader = class {
  readAsArrayBuffer(file) {
    this.result = file._bytes.slice().buffer;
    queueMicrotask(() => this.onload());
  }
};
try {
  const nativeBlob = await fileToPdfBlob({ name: 'sesion.pdf', size: pdfBytes.length, _bytes: pdfBytes });
  assert.deepEqual(Buffer.from(await nativeBlob.arrayBuffer()), Buffer.from(pdfBytes));
} finally {
  globalThis.FileReader = previousFileReader;
}

console.log('Training PDF import is removed and PDF upload remains native-safe');
