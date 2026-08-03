import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [zoom, detail, share] = await Promise.all([
  readFile(new URL('../src/shims/react-native-image-pan-zoom.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/vendor/season/TrainingSessionDetailModal.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/public/TrainingSessionShare.jsx', import.meta.url), 'utf8'),
]);

assert.match(zoom, /onPointerDown/);
assert.match(zoom, /touchAction: 'none'/);
assert.match(zoom, /Math\.hypot/);
assert.match(detail, /modalImageWidth = Math\.round\(screenWidth\)/);
assert.match(detail, /maxScale=\{8\}/);
assert.match(share, /className=\{`mediaBox/);
assert.match(share, /showControls/);

console.log('fullscreen image zoom: ok');
