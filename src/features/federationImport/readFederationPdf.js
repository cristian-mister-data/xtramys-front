import { pdfItems, parseDirectoryPage, parseCalendarPage, parseCalendarVenues, teamKey } from './parseFederationPdf';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export function imageBounds(ops) {
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack = [], boxes = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const op = ops.fnArray[i], args = ops.argsArray[i];
    if (op === pdfjs.OPS.save) stack.push([...matrix]);
    else if (op === pdfjs.OPS.restore) matrix = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (op === pdfjs.OPS.transform) matrix = pdfjs.Util.transform(matrix, args);
    else if (op === pdfjs.OPS.paintImageXObject || op === pdfjs.OPS.paintInlineImageXObject) {
      const points = [[0, 0], [0, 1], [1, 0], [1, 1]].map(p => pdfjs.Util.applyTransform(p, matrix));
      const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
      boxes.push({ x: Math.min(...xs), y: Math.min(...ys), right: Math.max(...xs), top: Math.max(...ys) });
    }
  }
  return boxes;
}

export async function readFederationPdf(file, type, onProgress = () => {}) {
  if (!file || file.size > 20 * 1024 * 1024) throw new Error('Selecciona un PDF de hasta 20 MB.');
  const data = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(data.slice(0, 5)) !== '%PDF-') throw new Error('El archivo no es un PDF válido.');
  const task = pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: true });
  let doc;
  try {
    doc = await task.promise;
    if (doc.numPages > 60) throw new Error('El PDF supera el máximo de 60 páginas.');
    const results = [], details = [];
    for (let n = 1; n <= doc.numPages; n++) {
      onProgress(`Leyendo ${type === 'directory' ? 'directorio' : 'calendario'}: página ${n} de ${doc.numPages}`);
      const page = await doc.getPage(n);
      const items = pdfItems(await page.getTextContent());
      const width = page.view[2] - page.view[0];
      if (type === 'calendar') {
        const fixtures = parseCalendarPage(items, width);
        results.push(...fixtures);
        if (!fixtures.length) details.push(items);
      }
      else {
        const teams = parseDirectoryPage(items, width);
        if (teams.length) {
          const boxes = imageBounds(await page.getOperatorList());
          const viewport = page.getViewport({ scale: 3 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          for (const team of teams) {
            const box = boxes.filter(b => (b.x < width * 0.43 ? 0 : 1) === team.column && b.top < team.heading.y && b.y > team.bottom && b.right - b.x < width / 4).sort((a, b) => b.top - a.top)[0];
            let escudo = '';
            if (box) {
              const rect = viewport.convertToViewportRectangle([box.x, box.y, box.right, box.top]);
              const crop = document.createElement('canvas');
              crop.width = Math.ceil(Math.abs(rect[2] - rect[0])); crop.height = Math.ceil(Math.abs(rect[3] - rect[1]));
              crop.getContext('2d').drawImage(canvas, Math.min(rect[0], rect[2]), Math.min(rect[1], rect[3]), crop.width, crop.height, 0, 0, crop.width, crop.height);
              escudo = crop.toDataURL('image/png');
            }
            results.push({ nombre: team.nombre, campo: team.campo, escudo });
          }
          canvas.width = 0; canvas.height = 0;
        }
      }
      page.cleanup();
    }
    if (!results.length) throw new Error('No se han reconocido datos. Usa el PDF original de la FFRM con texto seleccionable.');
    if (type === 'directory') {
      const unique = new Map(results.map(r => [teamKey(r.nombre), r]));
      return [...unique.values()];
    }
    const seen = new Set();
    const names = results.flatMap(m => [m.home, m.away]);
    const venues = new Map(details.flatMap(items => [...parseCalendarVenues(items, names)]));
    for (const match of results) {
      match.campo = venues.get(teamKey(match.home)) || '';
      for (const name of [match.home, match.away].filter(n => teamKey(n) !== 'DESCANSA')) {
        const key = `${match.jornada}:${teamKey(name)}`;
        if (seen.has(key)) throw new Error(`El equipo ${name} aparece más de una vez en la jornada ${match.jornada}. Revisa el PDF.`);
        seen.add(key);
      }
    }
    return results.sort((a, b) => a.jornada - b.jornada);
  } finally { await task.destroy(); }
}
