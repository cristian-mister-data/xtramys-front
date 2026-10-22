// PDF coordinates keep the two columns and wrapped team names separate.
export function cleanPdfText(value) {
  let text = value;
  if (/[ÃÂ]/.test(text)) {
    const win = new Map([[0x2030, 0x89], [0x2018, 0x91], [0x2019, 0x92]]);
    try {
      const bytes = Uint8Array.from([...text], c => win.get(c.codePointAt(0)) ?? c.codePointAt(0));
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      text = decoded;
    } catch { /* Keep valid original text when it is not UTF-8 mojibake. */ }
  }
  return text.replace(/\s+/g, ' ').trim();
}

export const teamKey = value => cleanPdfText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const join = items => cleanPdfText(items.sort((a, b) => b.y - a.y || a.x - b.x).map(i => i.text).join(' '));

export function pdfItems(content) {
  return content.items.filter(i => i.str?.trim()).map(i => ({
    text: cleanPdfText(i.str), x: i.transform[4], y: i.transform[5],
    width: i.width, height: i.height, font: i.fontName,
  }));
}

export function parseDirectoryPage(items, width) {
  // shortcut: FFRM directory columns start before the page midpoint; adapt for other federation layouts.
  const boundary = width * 0.43;
  const fonts = new Set(items.filter(i => /^(Teléfono|E-mail|Medias):/i.test(i.text)).map(i => i.font));
  const headings = items.filter(i => fonts.has(i.font) && i.text.length > 6 &&
    i.text === i.text.toUpperCase() && /[A-Z]/.test(i.text) && !/[:@]/.test(i.text));
  return headings.map(heading => {
    const column = heading.x < boundary ? 0 : 1;
    const next = headings.filter(i => (i.x < boundary ? 0 : 1) === column && i.y < heading.y).sort((a, b) => b.y - a.y)[0];
    const body = items.filter(i => (i.x < boundary ? 0 : 1) === column && i.y < heading.y && i.y > (next?.y ?? 40));
    const text = join(body);
    return { nombre: heading.text, campo: text.match(/Campo:\s*(.*?)(?=Federaci|Temporada|$)/i)?.[1]?.trim() || '',
      heading, bottom: next?.y ?? 40, column };
  });
}

export function parseCalendarPage(items, width) {
  const matches = [];
  for (const column of [0, 1]) {
    const list = items.filter(i => (i.x < width / 2 ? 0 : 1) === column);
    const headers = list.filter(i => /^Jornada\s+\d+\s*\(\d{2}-\d{2}-\d{4}\)/i.test(i.text)).sort((a, b) => b.y - a.y);
    for (let h = 0; h < headers.length; h++) {
      const header = headers[h];
      const [, day, dd, mm, yyyy] = header.text.match(/^Jornada\s+(\d+)\s*\((\d{2})-(\d{2})-(\d{4})\)/i);
      const block = list.filter(i => i.y < header.y - 2 && i.y > (headers[h + 1]?.y ?? 60));
      const separators = block.filter(i => i.text === '-').sort((a, b) => b.y - a.y);
      if (!separators.length) throw new Error(`No se pueden leer los partidos de la jornada ${day}.`);
      for (let s = 0; s < separators.length; s++) {
        const sep = separators[s];
        const top = s ? (separators[s - 1].y + sep.y) / 2 : header.y - 2;
        const bottom = s + 1 < separators.length ? (separators[s + 1].y + sep.y) / 2 : sep.y - 9;
        const row = block.filter(i => i !== sep && i.y < top && i.y > bottom);
        const home = join(row.filter(i => i.x < sep.x));
        const away = join(row.filter(i => i.x > sep.x));
        if (!home || !away) throw new Error(`Partido incompleto en la jornada ${day}.`);
        matches.push({ jornada: Number(day), date: `${yyyy}-${mm}-${dd}`, home, away });
      }
    }
  }
  return matches;
}

export function matchesForTeam(matches, name) {
  const key = teamKey(name);
  return matches.filter(m => teamKey(m.home) === key || teamKey(m.away) === key).map(m => ({
    ...m, rival: teamKey(m.home) === key ? m.away : m.home,
    ubicacion: teamKey(m.home) === key ? 'Casa' : 'Fuera',
  })).filter(m => teamKey(m.rival) !== 'DESCANSA').sort((a, b) => a.jornada - b.jornada);
}

export function parseCalendarVenues(items, names) {
  const keys = new Set(names.map(teamKey));
  const headings = items.filter(i => keys.has(teamKey(i.text))).sort((a, b) => b.y - a.y);
  return new Map(headings.map((heading, index) => {
    const bodyItems = items.filter(i => i.y <= heading.y && i.y > (headings[index + 1]?.y ?? 60) && i.x > heading.x + 100);
    const field = bodyItems.find(i => /^Campo:/.test(i.text));
    const body = join(field ? bodyItems.filter(i => i.x >= field.x - 1) : []);
    const campo = body.match(/Campo:\s*(.*?)(?=Direcci[oó]n campo:|Tel[eé]fono:|Primera Equipaci[oó]n|$)/i)?.[1]?.trim() || '';
    return [teamKey(heading.text), campo];
  }));
}
