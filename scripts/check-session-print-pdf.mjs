import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import { renderToFile } from '@react-pdf/renderer';
import { readFileSync } from 'node:fs';

const directory = resolve('tmp/pdfs/session-print');
await mkdir(directory, { recursive: true });
const printSource = readFileSync('src/vendor/training/SessionPrintDocument.jsx', 'utf8');
const sessionSource = readFileSync('src/vendor/training/SessionPDF.js', 'utf8');
assert.match(printSource, /descriptionColumn:\s*\{ width: '68%' \}/);
assert.match(printSource, /descriptionColumnFull:\s*\{ width: '100%' \}/);
assert.match(printSource, /visual:\s*\{[\s\S]*?height: 300/);
assert.match(printSource, /column === 0 \|\| fields\.length > 0/);
assert.match(sessionSource, /grayscale: format === 'print' && blackAndWhite/);
const bundled = await build({
  entryPoints: ['src/vendor/training/SessionPDF.js'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  loader: { '.js': 'jsx' },
  external: ['react', 'react/jsx-runtime', '@react-pdf/renderer'],
  plugins: [
    {
      name: 'session-pdf-check',
      setup(builder) {
        builder.onResolve({ filter: /^@\/api\/client$/ }, () => ({
          path: 'api',
          namespace: 'mock',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
          contents: 'export default { get() { throw new Error("Unexpected network request"); } };',
        }));
        builder.onResolve({ filter: /^@\/data\/strengthExercises$/ }, () => ({
          path: 'strength',
          namespace: 'strength',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'strength' }, () => ({
          contents:
            'export const getStrengthExerciseImage = () => null; export const getSectionForExercise = () => null;',
        }));
        builder.onResolve({ filter: /^@\// }, (args) => ({
          path: resolve('src', `${args.path.slice(2)}.js`),
        }));
        builder.onLoad({ filter: /pdfDesign\.js$/ }, async (args) => {
          const source = await readFile(args.path, 'utf8');
          const start = source.indexOf('export async function renderPdf(');
          const end = source.indexOf('// Re-export react-pdf', start);
          return {
            contents:
              source.slice(0, start) +
              'export async function renderPdf(documentElement,fileName) { globalThis.__sessionDocument = documentElement; globalThis.__sessionFilename = fileName; }\n' +
              source.slice(end),
            loader: 'jsx',
          };
        });
      },
    },
  ],
});
const modulePath = resolve(directory, 'session-check.mjs');
await writeFile(modulePath, bundled.outputFiles[0].text);
const { generateSessionPDF } = await import(pathToFileURL(modulePath));
const locale = JSON.parse(await readFile('src/locales/es.json', 'utf8'));
const i18n = {
  language: 'es',
  t(key, options) {
    return (
      key.split('.').reduce((object, part) => object?.[part], locale) ||
      (typeof options === 'string' ? options : options?.defaultValue) ||
      key
    );
  },
};
const requireApi = createRequire(resolve('../xtramys-api/package.json'));
const { createCanvas } = requireApi('canvas');
const canvas = createCanvas(1200, 700);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#F2F5F2';
ctx.fillRect(0, 0, 1200, 700);
ctx.strokeStyle = '#718271';
ctx.lineWidth = 4;
ctx.strokeRect(35, 35, 1130, 630);
ctx.beginPath();
ctx.moveTo(600, 35);
ctx.lineTo(600, 665);
ctx.stroke();
ctx.beginPath();
ctx.arc(600, 350, 105, 0, Math.PI * 2);
ctx.stroke();
for (const [x, y, color, number] of [
  [200, 170, '#2563EB', '1'],
  [420, 320, '#2563EB', '2'],
  [800, 400, '#C43A3A', '3'],
  [980, 180, '#C43A3A', '4'],
]) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 35px Arial';
  ctx.fillText(number, x - 10, y + 12);
}
const image = canvas.toDataURL('image/png');
const exercises = [
  {
    _id: 'rondo',
    nombre: 'Rondo de activación 4 contra 2',
    objetivo: 'Mejorar la orientación corporal y generar líneas de pase para conservar el balón.',
    descripcion:
      'Cuatro jugadores mantienen la posesión frente a dos defensores. Máximo dos toques. Tras recuperar el balón, el defensor cambia su posición con el jugador que perdió la posesión.',
    materialNecesario: '8 conos, 6 petos y 4 balones',
    tiempo: 12,
    numeroJugadores: 6,
    equipos: 2,
    dimensiones: '15 × 15 m',
    imagen: image,
  },
  {
    _id: 'possession',
    nombre: 'Conservación y progresión en tres zonas',
    objetivo: 'Atraer al rival para encontrar al tercer hombre y progresar con ventaja.',
    descripcion:
      'Organizar dos equipos y dos comodines. El equipo con balón busca conectar con la zona opuesta después de cinco pases. Los comodines participan con el poseedor. Al recuperar, buscar la progresión en menos de seis segundos.',
    materialNecesario: 'Petos de tres colores, balones y conos',
    tiempo: 20,
    numeroJugadores: 14,
    equipos: 2,
    dimensiones: '40 × 30 m',
    imagen: image,
  },
];
const input = {
  session: {
    fecha: '2026-10-20T12:00:00',
    horaInicio: '18:30',
    horaFin: '20:00',
    jugadores: ['p1', 'p2'],
    ejerciciosDetalle: [
      {
        ejercicio: 'rondo',
        orden: 1,
        tiempoDescanso: 2,
        observacion:
          'Cuerpo perfilado antes de recibir. Cambiar la orientación con el primer toque.',
        teamAssignments: [
          { teamNumber: 1, players: ['p1'] },
          { teamNumber: 2, players: ['p2'] },
        ],
      },
      {
        ejercicio: 'possession',
        orden: 2,
        observacion: 'Corregir la distancia entre apoyos. Dar amplitud antes de progresar.',
      },
    ],
    tareasPersonalizadas: [
      {
        id: 'recovery',
        nombre: 'Vuelta a la calma',
        orden: 3,
        tiempo: 8,
        descripcion: 'Movilidad y estiramientos suaves. Respiración y recuperación.',
      },
    ],
  },
  exercises,
  team: { nombre: 'Club Deportivo / Juvenil A' },
  players: [
    { _id: 'p1', nombre: 'Álvaro', apellido: 'Muñoz' },
    { _id: 'p2', nombre: 'José', apellido: 'Pérez' },
  ],
  strengthExercises: [
    {
      id: 'strength',
      nombre: 'Plancha isométrica',
      i18nKey: 'fixture.strength',
      observacion: 'Tres series de 30 segundos, mantener la cadera alineada.',
      tiempoDescanso: 1,
    },
  ],
  i18n,
};
await generateSessionPDF(input);
assert.equal(
  globalThis.__sessionDocument.type.name,
  'SessionDocument',
  'La descarga predeterminada conserva el PDF completo',
);
assert.ok(!globalThis.__sessionFilename.endsWith('_campo'));
const completeDocument = globalThis.__sessionDocument;
await generateSessionPDF({ ...input, format: 'print' });
assert.equal(globalThis.__sessionDocument.type.name, 'SessionPrintDocument');
assert.ok(globalThis.__sessionFilename.endsWith('_campo'));
const output = resolve(directory, 'entrenamiento-campo.pdf');
await renderToFile(globalThis.__sessionDocument, output);
// PDF_PYTHON can point to the bundled Python runtime with pypdf installed.
const inspect = (path) => {
  const result = spawnSync(
    process.env.PDF_PYTHON || 'python',
    [
      '-c',
      'import json,sys; from pypdf import PdfReader; r=PdfReader(sys.argv[1]); print(json.dumps([{ "text": p.extract_text(), "width": float(p.mediabox.width), "height": float(p.mediabox.height) } for p in r.pages]))',
      path,
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};
const pages = inspect(output);
const completeOutput = resolve(directory, 'entrenamiento-completo.pdf');
await renderToFile(completeDocument, completeOutput);
const completePages = inspect(completeOutput);
assert.ok(completePages.length > 1);
assert.ok(
  completePages.every((page) => page.width < page.height),
  'El PDF completo mantiene la orientación original',
);
assert.equal(pages.length, 4);
for (const page of pages) {
  assert.ok(Math.abs(page.width - 841.89) < 0.01);
  assert.ok(Math.abs(page.height - 595.28) < 0.01);
}
const text = pages.map((page) => page.text).join('\n');
for (const value of [
  'Rondo de activación',
  'Conservación y progresión',
  'Vuelta a la calma',
  'Álvaro Muñoz',
  'José Pérez',
  'Mantener',
]) {
  // The final strength note is checked case-insensitively too.
  if (value === 'Mantener') assert.match(text, /mantener la cadera alinea-?\s*da/i);
  else assert.ok(text.includes(value), `Falta contenido: ${value}`);
}
assert.ok(
  pages[0].text.includes('Rondo de activación') &&
    !pages[0].text.includes('Conservación y progresión'),
);
assert.ok(pages[1].text.includes('Conservación y progresión'));
assert.ok(pages[2].text.includes('Vuelta a la calma'));
await generateSessionPDF({
  ...input,
  strengthExercises: [],
  format: 'print',
  exercises: [
    {
      ...exercises[0],
      nombre:
        'Conservación del balón con apoyos exteriores, cambio de orientación y finalización en zona de progresión',
      descripcion:
        'El equipo con balón debe mantener las distancias de apoyo, orientarse antes de recibir y buscar la progresión por el lado libre. '.repeat(
          18,
        ) + 'FIN DE INSTRUCCIONES',
    },
  ],
  session: { ...input.session, tareasPersonalizadas: [] },
});
const denseOutput = resolve(directory, 'instrucciones-largas.pdf');
await renderToFile(globalThis.__sessionDocument, denseOutput);
const densePages = inspect(denseOutput);
assert.equal(densePages.length, 1);
assert.ok(
  densePages[0].text.includes('FIN DE INSTRUCCIONES'),
  'No se deben recortar las instrucciones largas',
);
await generateSessionPDF({
  ...input,
  exercises: [],
  strengthExercises: [],
  session: { fecha: input.session.fecha },
  format: 'print',
});
await renderToFile(globalThis.__sessionDocument, resolve(directory, 'sin-ejercicios.pdf'));
assert.equal(inspect(resolve(directory, 'sin-ejercicios.pdf')).length, 1);
console.log(
  `Session PDF: complete default retained; 4 landscape pages; order, custom tasks, strength, team assignments and empty session OK. Preview: ${output}`,
);
