import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { cleanPdfText, teamKey, matchesForTeam, pdfItems, parseCalendarPage, parseCalendarVenues, parseDirectoryPage } from '../src/features/federationImport/parseFederationPdf.js';

assert.equal(cleanPdfText('ATLÃ‰TICO. MULEÃ‘O CF "B"'), 'ATLÉTICO. MULEÑO CF "B"');
assert.equal(teamKey('  Atlético. Muleño CF "B" '), teamKey('ATLÉTICO. MULEÑO CF "B"'));
assert.notEqual(teamKey('LOS GARRES "B"'), teamKey('LOS GARRES "A"'));
const schedule = [{ jornada: 1, home: 'Mi club', away: 'Rival' }, { jornada: 2, home: 'Rival', away: 'Mi club' }, { jornada: 3, home: 'Mi club', away: 'Descansa' }];
assert.deepEqual(matchesForTeam(schedule, 'MI CLUB').map(m => [m.rival, m.ubicacion]), [['Rival', 'Casa'], ['Rival', 'Fuera']]);
assert.deepEqual(parseCalendarPage([], 595), []);

// Optional integration check against the two original FFRM samples; files stay outside Git.
if (process.argv[2]) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  async function read(name, parse) {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path.join(process.argv[2], name))), useSystemFonts: true }).promise;
    try {
      const results = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        results.push(...parse(pdfItems(await page.getTextContent()), page.view[2]));
      }
      return results;
    } finally { await doc.destroy(); }
  }
  const directory = await read('Directorio de equipos.pdf', parseDirectoryPage);
  const calendar = await read('Calendario.pdf', parseCalendarPage);
  assert.equal(directory.length, 13);
  assert.equal(calendar.length, 240);
  assert.equal(new Set(calendar.map(m => m.jornada)).size, 30);
  const names = [...new Set(calendar.flatMap(m => [m.home, m.away]))].filter(n => n !== 'Descansa');
  assert.equal(names.length, 14);
  const venues = await read('Calendario.pdf', items => [...parseCalendarVenues(items, names)].filter(([, campo]) => campo));
  assert.equal(new Map(venues).size, 14);
  assert.equal(new Map(venues).get(teamKey('CIUDAD DE MULA C.F.')), 'MPAL. DE DEPORTES DE MULA');
  assert.equal(directory.filter(t => t.column === 1).length, 6);
  for (const name of names) {
    const matches = matchesForTeam(calendar, name);
    assert.equal(matches.length, 26, name);
    assert.equal(matches.filter(m => m.ubicacion === 'Casa').length, 13, name);
    assert.equal(matches.filter(m => m.ubicacion === 'Fuera').length, 13, name);
    assert.equal(new Set(matches.map(m => m.jornada)).size, 26, name);
    const rivals = new Map();
    for (const match of matches) rivals.set(teamKey(match.rival), (rivals.get(teamKey(match.rival)) || 0) + 1);
    assert.equal(rivals.size, 13);
    assert.ok([...rivals.values()].every(count => count === 2));
  }
  assert.equal(matchesForTeam(calendar, 'CIUDAD DE MULA C.F.')[0].date, '2026-10-11');
  console.log('Original PDFs: 13 directory entries, 14 calendar teams, 30 rounds; every team has 13 home and 13 away matches.');
}
console.log('Federation PDF checks passed.');
