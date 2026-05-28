// Generación de PDF para Metodología (web).
// Portado 1:1 desde misterdata-source/src/components/pages/methodology/methodology.js
// (función generatePlanPDF). Usa el shim de expo-print (jsPDF + html2canvas) y
// descarga directa vía savePdfToDownloads. Sin print-dialog del navegador.
import * as Print from 'expo-print';
import { savePdfToDownloads } from '../../utils/pdfDownload';
import { getDaysLabel } from './methodologyData';

export async function generateMethodologyPdf(categoryName, planKey, days, primaryColor, t) {
  const grayscalePrimaryColor = '#1e293b';
  const daysLabel = getDaysLabel(planKey, t);
  const cleanName = String(categoryName || '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '')
    .trim();
  const cleanDaysLabel = String(daysLabel || '').replace('/', '-');
  const fileName = `${cleanName}_${cleanDaysLabel}`.replace(/\s+/g, '_') || 'metodologia';

  const tt = (key, fallback, opts) => {
    if (typeof t === 'function') {
      const res = t(key, opts);
      // t() puede devolver la key si no encuentra traducción
      if (res && res !== key) return res;
    }
    if (typeof fallback === 'function') return fallback(opts || {});
    return fallback;
  };

  const tableHeaders = days
    .map(
      (day, index) => `
    <th style="background-color: ${grayscalePrimaryColor}; color: white; padding: 8px 6px; font-size: 11px; font-weight: bold; text-align: center; border: 1px solid ${grayscalePrimaryColor}; line-height: 1.2;">
      ${tt('methodology.dayNumber', ({ number }) => `Día ${number}`, { number: day.day_number || index + 1 })}
    </th>
  `,
    )
    .join('');

  const generateRow = (label, icon, getValue) => {
    const cells = days
      .map((day) => {
        const value = getValue(day);
        return `<td style="padding: 6px 8px; font-size: 9px; border: 1px solid #ddd; vertical-align: top;">${value || '-'}</td>`;
      })
      .join('');
    return `
      <tr>
        <td style="background-color: #f5f5f5; padding: 6px 8px; font-size: 9px; font-weight: bold; border: 1px solid #ddd; white-space: nowrap;">
          ${icon} ${label}
        </td>
        ${cells}
      </tr>
    `;
  };

  // Filas main_part
  const maxOptions = Math.max(...days.map((d) => (d.main_part?.options || []).length), 0);
  let mainPartRows = '';
  const instructionCells = days
    .map((day) => {
      const instruction = day.main_part?.instruction || '';
      return `<td style="padding: 6px 8px; font-size: 9px; border: 1px solid #ddd; vertical-align: top; background-color: #f1f5f9; font-weight: bold; color: ${grayscalePrimaryColor};">
      ${instruction || '-'}
    </td>`;
    })
    .join('');
  mainPartRows += `
    <tr>
      <td style="background-color: #f5f5f5; padding: 6px 8px; font-size: 9px; font-weight: bold; border: 1px solid #ddd; white-space: nowrap;">
        ${tt('methodology.mainPart', 'Parte principal')}
      </td>
      ${instructionCells}
    </tr>
  `;

  for (let i = 0; i < maxOptions; i += 1) {
    const cells = days
      .map((day) => {
        const option = (day.main_part?.options || [])[i];
        if (option) {
          const tasksText = option.tasks?.join(' / ') || '';
          return `<td style="padding: 6px 8px; font-size: 9px; border: 1px solid #ddd; vertical-align: top;">
          <strong style="color: ${grayscalePrimaryColor};">${tasksText}</strong><br/>
          <span style="color: #666; font-size: 8px;">${option.constraint || ''}</span>
        </td>`;
        }
        return `<td style="padding: 6px 8px; font-size: 9px; border: 1px solid #ddd; vertical-align: top;">-</td>`;
      })
      .join('');
    mainPartRows += `
      <tr>
        <td style="background-color: #f5f5f5; padding: 6px 8px; font-size: 9px; font-weight: bold; border: 1px solid #ddd; white-space: nowrap;"></td>
        ${cells}
      </tr>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${categoryName} - ${daysLabel}</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 10px; background: white; }
        .header {
          background: linear-gradient(135deg, ${grayscalePrimaryColor}, #334155);
          color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 12px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .header-left h1 { font-size: 16px; margin-bottom: 2px; }
        .header-left h2 { font-size: 12px; font-weight: normal; opacity: 0.9; }
        .header-right { font-size: 10px; opacity: 0.8; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th, td { text-align: left; }
        .footer { margin-top: 10px; text-align: right; color: #999; font-size: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>${categoryName}</h1>
          <h2>${daysLabel}</h2>
        </div>
        <div class="header-right">Xtramys - www.xtramys.com</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="background-color: #333; color: white; padding: 8px 6px; font-size: 10px; border: 1px solid #333; width: 100px; line-height: 1.2;"></th>
            ${tableHeaders}
          </tr>
        </thead>
        <tbody>
          ${generateRow(tt('methodology.orientation', 'Orientación'), '📍', (d) => d.orientation)}
          ${generateRow(tt('methodology.objective', 'Objetivo'), '🎯', (d) => d.objective)}
          ${generateRow(tt('methodology.gameSituation', 'Situación de juego'), '👥', (d) => d.game_situation)}
          ${generateRow(tt('methodology.dimensions', 'Dimensiones'), '📐', (d) => d.dimensions)}
          ${mainPartRows}
        </tbody>
      </table>

      <div class="footer">
        ${tt('methodology.generatedOn', ({ date }) => `Generado el ${date}`, { date: new Date().toLocaleDateString() })}
      </div>
    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({
      html,
      width: 842, // A4 landscape (pt)
      height: 595,
    });
    await savePdfToDownloads(uri, `${fileName}.pdf`);
    return true;
  } catch (e) {
    console.error('[methodology pdf] error', e);
    return false;
  }
}
