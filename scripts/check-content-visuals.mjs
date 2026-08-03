import assert from 'node:assert/strict';
import { getContentImage, getVisualSource, usesImportedImage } from '../src/utils/contentVisual.js';

assert.equal(getContentImage({ imagen: 'board' }), 'board');
assert.equal(getContentImage({ imagen: 'board', importedImage: 'photo', visualSource: 'imported' }), 'photo');
assert.equal(getContentImage({ imagen: 'board', importedImage: 'photo', visualSource: 'board' }), 'board');
assert.equal(getContentImage({ importedImage: 'photo', visualSource: 'board' }), 'photo');
assert.equal(getVisualSource({ importedImage: 'photo', visualSource: 'imported' }), 'imported');
assert.equal(usesImportedImage({ importedImage: 'photo', visualSource: 'imported' }), true);
assert.equal(usesImportedImage({ imagen: 'board', importedImage: 'photo', visualSource: 'board' }), false);

console.log('content visual selection: ok');
