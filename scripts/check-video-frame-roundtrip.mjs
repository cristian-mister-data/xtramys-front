import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';

const requireApi = createRequire(resolve('../xtramys-api/package.json'));
const { createCanvas, Image, loadImage } = requireApi('canvas');
const backend = requireApi('./src/services/videoFrameEncoder');
const ffmpeg = requireApi('ffmpeg-static');
const canvas = createCanvas(1920, 1080);
const snapshots = [];
canvas.toDataURL = () => {
  const png = canvas.toBuffer('image/png');
  snapshots.push(png);
  return `data:image/png;base64,${png.toString('base64')}`;
};
let largestBatch = 0;
let lostResponse = false;
let frameRequests = 0;
let pendingRequests = 0;
let maxPending = 0;
let cleanup = Promise.resolve();
let decoded;
const owner = 'test-render-owner';
const api = {
  async request({ method, url, data }) {
    const [id, action] = url.split('/').slice(3);
    if (method === 'put' && !action) return { data: await backend.start(id, owner, data) };
    if (action === 'frames') {
      largestBatch = Math.max(largestBatch, data.frames.length);
      maxPending = Math.max(maxPending, ++pendingRequests);
      frameRequests++;
      const result = await backend.append(id, owner, data.frames);
      pendingRequests--;
      if (!lostResponse) {
        lostResponse = true;
        throw Object.assign(new Error('Respuesta perdida después de aceptar el bloque'), {
          type: 'TIMEOUT',
        });
      }
      return { data: result };
    }
    if (action === 'finish') return { data: await backend.finish(id, owner) };
    if (action === 'video') {
      const path = await backend.output(id, owner);
      const result = spawnSync(
        ffmpeg,
        ['-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
        {
          maxBuffer: 200 * 1024 * 1024,
          windowsHide: true,
        },
      );
      assert.equal(result.status, 0, result.stderr.toString());
      decoded = result.stdout;
      const { readFile } = await import('node:fs/promises');
      return { data: new Blob([await readFile(path)], { type: 'video/mp4' }) };
    }
    return { data: backend.getStatus(id, owner) };
  },
  delete(url) {
    cleanup = backend.cancel(url.split('/')[3], owner);
    return cleanup;
  },
};
const compiled = await build({
  stdin: {
    contents: `export { renderFrameToCanvas } from './src/utils/videoCanvasRenderer.js';
    export { createServerFrameEncoder } from './src/utils/serverFrameEncoder.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  alias: { '@': resolve('src') },
  loader: { '.png': 'dataurl' },
  plugins: [
    {
      name: 'test-api',
      setup(builder) {
        builder.onResolve({ filter: /^@\/api\/client$/ }, () => ({
          path: 'api',
          namespace: 'test',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
          contents: 'export default globalThis.__api;',
        }));
      },
    },
  ],
});
const context = {
  module: { exports: {} },
  __api: api,
  Blob,
  Uint8Array,
  URL,
  AbortController,
  Image,
  // iOS 15.0: crypto.randomUUID todavía no existe.
  crypto: { getRandomValues: (value) => webcrypto.getRandomValues(value) },
  setTimeout,
  clearTimeout,
  console,
  FileReader: class {
    readAsDataURL(blob) {
      blob.arrayBuffer().then(
        (buffer) => {
          this.result = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
          this.onload();
        },
        (error) => this.onerror(error),
      );
    }
  },
};
runInNewContext(compiled.outputFiles[0].text, context);
const { renderFrameToCanvas, createServerFrameEncoder } = context.module.exports;
const encoder = createServerFrameEncoder({ speed: 1, frameCount: 20 });
try {
  const background = createCanvas(1920, 1080);
  background.getContext('2d').fillStyle = '#4a8c3f';
  background.getContext('2d').fillRect(0, 0, 1920, 1080);
  const ctx = canvas.getContext('2d');
  const elements = [
    {
      id: 'p1',
      type: 'player',
      baseSize: 50,
      xRatio: 0.2,
      yRatio: 0.35,
      number: 10,
      shape: 'jersey',
      color: '#cc2035',
      playerData: { nombre: 'Álvaro Muñoz' },
    },
    {
      id: 'p2',
      type: 'player',
      baseSize: 50,
      xRatio: 0.4,
      yRatio: 0.35,
      number: 8,
      color: '#2049cc',
      displayLabel: 'POR',
      kitPattern: 'vertical',
      hasStripes: true,
      playerData: { nombre: 'José Pérez' },
      numberColor: '#fff',
    },
    {
      id: 'p3',
      type: 'player',
      baseSize: 50,
      xRatio: 0.6,
      yRatio: 0.35,
      number: 'N',
      isNeutral: true,
    },
    { id: 'staff', type: 'staff', baseSize: 44, xRatio: 0.8, yRatio: 0.35, displayLabel: 'CT' },
    { id: 'cone', type: 'cone', baseSize: 40, xRatio: 0.3, yRatio: 0.6 },
    {
      id: 'text',
      type: 'free-text',
      text: 'Salida de balón',
      baseFontSize: 20,
      xRatio: 0.5,
      yRatio: 0.65,
    },
    {
      id: 'arrow',
      type: 'straight-arrow',
      baseThickness: 3,
      pointsRatio: [
        { x: 0.1, y: 0.8 },
        { x: 0.8, y: 0.8 },
      ],
    },
  ];
  for (let index = 0; index < 10; index++) {
    elements[0].xRatio = 0.2 + index * 0.003;
    renderFrameToCanvas(ctx, 1920, 1080, elements, [], background, {
      playersWithNumber: true,
      viewMode: 'entire',
    });
    await encoder.addFrame(canvas, index * 2, 2);
  }
  const result = await encoder.finish();
  assert.equal(result.mimeType, 'video/mp4');
  assert.equal(largestBatch, 1);
  assert.equal(maxPending, 1, 'No deben acumularse subidas en paralelo');
  assert.equal(frameRequests, 11, 'Un envío por frame más un reintento');
  const stride = 1920 * 1080 * 3;
  assert.equal(
    decoded.length,
    stride * 20,
    'Ni duplicar fotogramas al reintentar ni alterar pausas',
  );
  const originalImage = await loadImage(snapshots[0]);
  ctx.drawImage(originalImage, 0, 0);
  const originalPixels = ctx.getImageData(0, 0, 1920, 1080).data;
  let totalError = 0;
  let brightPixels = 0;
  let preservedBright = 0;
  for (let pixel = 0; pixel < 1920 * 1080; pixel++) {
    for (let channel = 0; channel < 3; channel++)
      totalError += Math.abs(originalPixels[pixel * 4 + channel] - decoded[pixel * 3 + channel]);
    if (
      originalPixels[pixel * 4] > 230 &&
      originalPixels[pixel * 4 + 1] > 230 &&
      originalPixels[pixel * 4 + 2] > 230
    ) {
      brightPixels++;
      if (decoded[pixel * 3] > 200 && decoded[pixel * 3 + 1] > 200 && decoded[pixel * 3 + 2] > 200)
        preservedBright++;
    }
  }
  assert.ok(totalError / stride < 3, 'La compresión debe conservar el aspecto del canvas original');
  assert.ok(
    preservedBright / brightPixels > 0.97,
    'Dorsales y nombres deben conservar sus píxeles y ubicación',
  );
  const directory = resolve('release/video-qa');
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'original.png'), snapshots[0]);
  const imageData = ctx.createImageData(1920, 1080);
  for (let pixel = 0; pixel < 1920 * 1080; pixel++) {
    imageData.data.set(decoded.subarray(pixel * 3, pixel * 3 + 3), pixel * 4);
    imageData.data[pixel * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  await writeFile(resolve(directory, 'mp4-decoded.png'), canvas.toBuffer('image/png'));
  URL.revokeObjectURL(result.outputPath);
  await cleanup;
  console.log(
    `Roundtrip 1920x1080 OK: 20 frames, envío unitario, reintento sin duplicados; error medio ${(totalError / stride).toFixed(3)}/255; texto conservado ${((preservedBright / brightPixels) * 100).toFixed(2)}%.`,
  );
} finally {
  encoder.abort();
  await cleanup;
}
