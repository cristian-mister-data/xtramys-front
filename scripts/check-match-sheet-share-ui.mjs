import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const players = Array.from({ length: 16 }, (_, index) => ({
  _id: `player-${index}`,
  nombre: [
    'Manuel',
    'Raúl',
    'Cristóbal',
    'Cheko',
    'Juanpe',
    'Javier',
    'Mario',
    'Álvaro',
    'Piru',
    'Martín',
    'Carlos',
    'Alfonso',
    'Valero',
    'Jorge',
    'Iván',
    'Pedro',
  ][index],
  apellido: 'García',
  dorsal: index + 1,
  posicion: index === 0 ? 'Portero' : 'Central',
}));
const sheet = {
  _id: 'sheet-a',
  equipo: { _id: 'team-a', nombre: 'Xtramys FC', jugadoresPorEquipo: 11 },
  rival: 'Madrid',
  rivalId: { _id: 'rival-a', nombre: 'Madrid' },
  fechaHora: '2026-10-17T10:00:00Z',
  jornada: 2,
  ubicacion: 'Casa',
  campo: 'Estadio Municipal',
  torneoId: { nombre: 'Liga Juvenil' },
  golesFavor: 2,
  golesContra: 3,
  alineacion: '1-4-2-3-1',
  convocados: players,
  alineacionTitulares: players.slice(0, 11),
  alineacionSuplentes: players.slice(11),
  posicionesVisuales: [],
  convocatoriaHoraQuedada: '11:00',
  convocatoriaLugar: 'Puerta principal',
  convocatoriaObservaciones: 'Equipación azul y puntualidad.',
  estadisticas: { posesion: 55, tiros: 12 },
  estadisticasRival: { posesion: 45, tiros: 8 },
  notasEntrenador: 'Mantener vigilancia tras pérdida.',
  setPieces: [],
  rivalAnalyses: [
    {
      _id: 'report-a',
      rival: 'Madrid',
      alineacion: '1-4-4-2',
      combinativoDirecto: 'DIRECT',
      pressingAltura: 'MEDIUM',
      observaciones: 'Cerrar los espacios entre líneas.',
      jugadoresDestacados: [
        { nombre: 'Delantero', apellido: 'Rival', observacion: 'Vigilar los desmarques.' },
      ],
      customAnswers: { custom: 'Asegurar la segunda jugada.' },
    },
  ],
};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.UI_BROWSER_CHANNEL ? { channel: process.env.UI_BROWSER_CHANNEL } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.addInitScript(() => {
  localStorage.setItem('xtramys.theme', 'light');
  localStorage.setItem('i18nextLng', localStorage.getItem('test.language') || 'es');
});
await page.route('**/api/**', (route) => {
  const path = new URL(route.request().url()).pathname;
  if (!path.startsWith('/api/')) return route.continue();
  return route.fulfill({
    json: path.includes('/strategy/public/') ? { setPiece: sheet.setPieces[0], video: sheet.setPieces[0]?.video } : path.includes('/match-sheet/public/')
      ? { matchSheet: sheet }
      : path.endsWith('/full-share-link')
        ? { url: 'https://example.test/public/match-sheet/aaa' }
        : path.includes('/match-sheet/sheet-a')
          ? sheet
          : path.includes('scouting') || path.includes('strategy')
            ? []
            : {},
  });
});
await mkdir('tmp/match-sheet-ui', { recursive: true });
execFileSync(
  require('../../xtramys-api/node_modules/ffmpeg-static'),
  [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x337640:s=640x416:r=10',
    '-t',
    '2',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    'tmp/match-sheet-ui/test-abp.mp4',
  ],
  { stdio: 'ignore', windowsHide: true },
);
const videoFixture = await readFile('tmp/match-sheet-ui/test-abp.mp4');
await page.route('**/test-abp.mp4', (route) =>
  route.fulfill({ contentType: 'video/mp4', body: videoFixture }),
);
async function checkInlineVideo(watchLabel, backLabel) {
  const frame = page.locator('.match-board-frame');
  const before = await frame.boundingBox();
  await page.getByRole('button', { name: watchLabel, exact: true }).click();
  const video = frame.locator('video');
  await video.waitFor();
  await page.waitForFunction(() => document.querySelector('.match-board-video')?.readyState >= 2);
  await page.waitForFunction(() => document.querySelector('.match-board-video')?.currentTime > 0);
  assert.equal(await page.locator('video').count(), 1, 'Only the inline player should exist');
  const after = await frame.boundingBox();
  const videoBox = await video.boundingBox();
  for (const key of ['width', 'height']) {
    assert.ok(Math.abs(before[key] - after[key]) < 1, `Frame ${key} must stay the same`);
    assert.ok(Math.abs(after[key] - videoBox[key]) < 1, `Video must fill frame ${key}`);
  }
  assert.ok(await video.evaluate((node) => node.controls && node.playsInline && !node.error));
  await page.getByRole('button', { name: backLabel, exact: true }).click();
  assert.equal(
    await page.locator('video').count(),
    0,
    'Returning to the board must remove and stop the video',
  );
}
try {
  await page.goto(
    `${process.env.UI_BASE_URL || 'http://localhost:5174'}/public/match-sheet/${'a'.repeat(48)}`,
  );
  await page.getByRole('heading', { name: 'Equipo titular' }).waitFor();
  assert.equal(await page.locator('.match-pitch-player').count(), 11);
  assert.equal(await page.locator('aside .match-player-list li').count(), 5);
  await page.screenshot({ path: 'tmp/match-sheet-ui/desktop.png', fullPage: true });
  for (const [name, expected] of [
    ['Convocatoria', 'Equipación azul y puntualidad.'],
    ['Estadísticas', 'Posesión %'],
    ['Análisis rival', 'Cerrar los espacios entre líneas.'],
    ['ABP', 'Este partido todavía no tiene ABP asociadas.'],
  ]) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.getByText(expected, { exact: true }).waitFor();
  }
  await page.getByRole('button', { name: 'Análisis rival', exact: true }).click();
  await page.screenshot({ path: 'tmp/match-sheet-ui/report.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Alineación', exact: true }).click();
  await page.screenshot({ path: 'tmp/match-sheet-ui/mobile.png', fullPage: true });
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Mobile must not overflow horizontally',
  );
  assert.ok(
    await page
      .locator('.match-share-page')
      .evaluate(
        (node) =>
          node.scrollHeight > node.clientHeight && getComputedStyle(node).overflowY === 'auto',
      ),
    'Long match sheets must scroll',
  );
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.activeElement?.tagName !== 'BODY'));
  assert.deepEqual(errors, []);
  sheet.setPieces = [
    {
      nombre: 'Córner ofensivo',
      video: { url: 'https://example.test/test-abp.mp4' },
      tipoCampo: 'full',
      elementosCampo: [
        {
          id: 'slot-a',
          type: 'player',
          shape: 'jersey',
          xRatio: 0.3,
          yRatio: 0.4,
          number: 7,
          team: 'A',
        },
        {
          id: 'slot-b',
          type: 'player',
          shape: 'jersey',
          xRatio: 0.6,
          yRatio: 0.6,
          number: 9,
          team: 'A',
        },
      ],
      assignments: [
        { slotId: 'slot-a', number: '7', player: players[6] },
        { slotId: 'slot-b', number: '9', player: players[8] },
      ],
    },
  ];
  sheet.fechaHora = '2099-10-17T10:00:00Z';
  sheet.golesFavor = 0;
  sheet.golesContra = 0;
  sheet.resultado = '';
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await page.getByText('Por disputar', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Convocatoria', exact: true }).click();
  assert.equal(await page.getByText('Punto de encuentro', { exact: true }).count(), 0);
  assert.equal(await page.getByText('Sin indicaciones adicionales.', { exact: true }).count(), 0);
  assert.equal(await page.locator('.match-callup-card > .match-player-list li').count(), 16);
  await page.screenshot({ path: 'tmp/match-sheet-ui/callup-redesign.png' });
  await page.getByRole('button', { name: 'ABP', exact: true }).click();
  await page.getByRole('heading', { name: 'Asignaciones de jugadores' }).waitFor();
  assert.ok(
    await page
      .locator('.match-board-expanded')
      .evaluate((node) => node.getBoundingClientRect().width > 1200),
  );
  assert.equal(await page.locator('.match-board-assignments li').count(), 2);
  await page.getByText('Mario García', { exact: true }).first().waitFor();
  assert.ok(
    await page
      .locator('.match-board-expanded')
      .getByText('Mario García', { exact: true })
      .evaluate((node) => parseFloat(getComputedStyle(node).fontSize) >= 14),
  );
  await page.screenshot({ path: 'tmp/match-sheet-ui/abp-expanded.png' });
  await checkInlineVideo('Ver vídeo', 'Volver al gráfico');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page
      .locator('.match-board-scroll')
      .evaluate((node) => node.scrollWidth > node.clientWidth),
  );
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await checkInlineVideo('Ver vídeo', 'Volver al gráfico');
  await page.getByRole('button', { name: 'Convocatoria', exact: true }).click();
  await page.screenshot({ path: 'tmp/match-sheet-ui/callup-mobile.png' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.evaluate(() => localStorage.setItem('test.language', 'en'));
  await page.reload();
  await page.getByText('To be played', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Squad', exact: true }).click();
  await page.getByText('16 selected players', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Set pieces', exact: true }).click();
  await page.getByRole('heading', { name: 'Player assignments' }).waitFor();
  await checkInlineVideo('Watch video', 'Back to diagram');
  await page.goto(
    `${process.env.UI_BASE_URL || 'http://localhost:5174'}/public/match-sheet-abp/${'a'.repeat(48)}`,
  );
  await page.getByRole('heading', { name: 'Player assignments' }).waitFor();
  assert.equal(await page.locator('.match-board-expanded').count(), 1);
  assert.equal(await page.locator('button .match-board-scroll').count(), 0);
  await checkInlineVideo('Watch video', 'Back to diagram');
  await page.goto(`${process.env.UI_BASE_URL || 'http://localhost:5174'}/public/set-piece/${'a'.repeat(48)}`);
  await page.getByRole('button', { name: 'Watch video', exact: true }).waitFor();
  await checkInlineVideo('Watch video', 'Back to diagram');
  sheet.fechaHora = '2026-10-17T10:00:00Z';
  sheet.resultado = 'Empate';
  await page.evaluate(() => localStorage.setItem('test.language', 'es'));
  await page.goto(
    `${process.env.UI_BASE_URL || 'http://localhost:5174'}/public/match-sheet/${'a'.repeat(48)}`,
  );
  await page.getByText('0 – 0', { exact: true }).waitFor();
  sheet.setPieces = [];
  sheet.golesFavor = 2;
  sheet.golesContra = 3;
  await page.addInitScript((data) => {
    window.__TEST_SHEET__ = data;
  }, sheet);
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto(
    `${process.env.UI_BASE_URL || 'http://localhost:5174'}/scripts/fixtures/match-sheet-ui.html`,
  );
  await page.getByRole('button', { name: 'Compartir ficha completa', exact: true }).waitFor();
  for (const label of ['Compartir ficha completa', 'Añadir estadísticas', 'Editar', 'Cerrar']) {
    const button = page.getByRole('button', { name: label, exact: true });
    assert.ok(await button.getAttribute('title'), `Missing tooltip for ${label}`);
  }
  assert.equal(await page.locator('.match-pdf-button').count(), 3);
  await page.getByText('Análisis rival', { exact: true }).click();
  await page.getByText('Cerrar los espacios entre líneas.', { exact: true }).waitFor();
  await page.getByText('Datos', { exact: true }).click();
  await page.locator('.match-pdf-actions').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'tmp/match-sheet-ui/pdf-buttons.png', fullPage: true });
  await page.getByRole('button', { name: 'Compartir ficha completa', exact: true }).click();
  await page.getByRole('link', { name: 'https://example.test/public/match-sheet/aaa' }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.match-pdf-actions').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'tmp/match-sheet-ui/pdf-buttons-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    'OK: inline ABP video playback with unchanged dimensions and return to diagram across match sheets, ABP links, desktop/mobile and Spanish/English.',
  );
} catch (error) {
  console.error({ url: page.url(), text: await page.locator('body').innerText(), errors });
  await page.screenshot({ path: 'tmp/match-sheet-ui/failure.png', fullPage: true });
  throw error;
} finally {
  await browser.close();
}
