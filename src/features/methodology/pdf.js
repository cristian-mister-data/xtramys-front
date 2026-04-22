// Generación de PDF para metodología (web).
// Abre una nueva ventana con HTML imprimible — el usuario usa "Guardar como PDF" del navegador.
// Equivalente web del flujo expo-print original.
import { getDaysLabel } from './methodologyData';

export function generateMethodologyPdf(categoryName, planKey, days, primaryColor, t) {
  const daysLabel = getDaysLabel(planKey, t);

  const tableHeaders = days.map((day, index) => `
    <th style="background:${primaryColor};color:#fff;padding:8px 6px;font-size:11px;font-weight:bold;text-align:center;border:1px solid ${primaryColor};">
      ${t ? t('methodology.dayNumber', { number: day.day_number || index + 1 }) : `Día ${day.day_number || index + 1}`}
    </th>
  `).join('');

  const row = (label, getValue) => {
    const cells = days.map((day) => {
      const v = getValue(day);
      return `<td style="padding:6px 8px;font-size:9px;border:1px solid #ddd;vertical-align:top;">${v || '-'}</td>`;
    }).join('');
    return `<tr>
      <td style="background:#f5f5f5;padding:6px 8px;font-size:9px;font-weight:bold;border:1px solid #ddd;white-space:nowrap;">${label}</td>
      ${cells}
    </tr>`;
  };

  const maxOptions = Math.max(...days.map((d) => (d.main_part?.options || []).length), 0);
  let mainRows = '';
  mainRows += `<tr>
    <td style="background:#f5f5f5;padding:6px 8px;font-size:9px;font-weight:bold;border:1px solid #ddd;white-space:nowrap;">${t ? t('methodology.mainPart', 'Parte principal') : 'Parte principal'}</td>
    ${days.map((day) => `<td style="padding:6px 8px;font-size:9px;border:1px solid #ddd;background:#FFF8E1;font-weight:bold;color:${primaryColor};">${day.main_part?.instruction || '-'}</td>`).join('')}
  </tr>`;
  for (let i = 0; i < maxOptions; i += 1) {
    const cells = days.map((day) => {
      const opt = (day.main_part?.options || [])[i];
      if (opt) {
        const tasks = opt.tasks?.join(' / ') || '';
        return `<td style="padding:6px 8px;font-size:9px;border:1px solid #ddd;vertical-align:top;">
          <strong style="color:${primaryColor};">${tasks}</strong><br/>
          <span style="color:#666;font-size:8px;">${opt.constraint || ''}</span>
        </td>`;
      }
      return `<td style="padding:6px 8px;font-size:9px;border:1px solid #ddd;">-</td>`;
    }).join('');
    return mainRows += `<tr>
      <td style="background:#f5f5f5;padding:6px 8px;font-size:9px;font-weight:bold;border:1px solid #ddd;"></td>
      ${cells}
    </tr>`;
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${categoryName} - ${daysLabel}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:24px;color:#222;}
h1{color:${primaryColor};margin:0 0 4px;}h2{color:#666;margin:0 0 16px;font-weight:400;}
table{width:100%;border-collapse:collapse;margin-top:12px;}
@media print{@page{size:A4 landscape;margin:14mm;}}
</style></head>
<body>
<h1>${categoryName}</h1><h2>${daysLabel}</h2>
<table>
<thead><tr><th style="background:${primaryColor};color:#fff;padding:8px 6px;border:1px solid ${primaryColor};"></th>${tableHeaders}</tr></thead>
<tbody>
${row(t ? t('methodology.orientation', 'Orientación') : 'Orientación', (d) => d.orientation)}
${row(t ? t('methodology.objective', 'Objetivo') : 'Objetivo', (d) => d.objective)}
${row(t ? t('methodology.dimensions', 'Dimensiones') : 'Dimensiones', (d) => d.dimensions)}
${row(t ? t('methodology.gameSituation', 'Situación de juego') : 'Situación de juego', (d) => d.game_situation)}
${mainRows}
</tbody></table>
<script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
