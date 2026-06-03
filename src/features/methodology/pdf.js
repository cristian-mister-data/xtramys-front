// Generación de PDF para Metodología (web).
// Portado 1:1 desde misterdata-source/src/components/pages/methodology/methodology.js
// (función generatePlanPDF). Usa el shim de expo-print (jsPDF + html2canvas) y
// descarga directa vía savePdfToDownloads. Sin print-dialog del navegador.
import * as Print from 'expo-print';
import { savePdfToDownloads } from '../../utils/pdfDownload';
import { getDaysLabel } from './methodologyData';

export async function generateMethodologyPdf(categoryName, planKey, days, primaryColor, t) {
  const brandPrimaryColor = '#0f172a';
  const brandSecondaryColor = '#1e293b';
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
    <th class="th-day">
      ${tt('methodology.dayNumber', ({ number }) => `Día ${number}`, { number: day.day_number || index + 1 })}
    </th>
  `,
    )
    .join('');

  const generateRow = (label, icon, getValue) => {
    const cells = days
      .map((day) => {
        const value = getValue(day);
        return `<td class="td-value">${value || '-'}</td>`;
      })
      .join('');
    return `
      <tr>
        <td class="td-label">
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
      return `<td class="td-mainpart-instruction">
      ${instruction || '-'}
    </td>`;
    })
    .join('');
  mainPartRows += `
    <tr>
      <td class="td-label">
        🏃 ${tt('methodology.mainPart', 'Parte principal')}
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
          return `<td class="td-mainpart-option">
          <strong class="option-tasks">${tasksText}</strong><br/>
          <span class="constraint-text">${option.constraint || ''}</span>
        </td>`;
        }
        return `<td class="empty-cell">-</td>`;
      })
      .join('');
    mainPartRows += `
      <tr>
        <td class="td-label-empty"></td>
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
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-main: #f8fafc;
          --bg-card: #ffffff;
          --primary: #0f172a;
          --secondary: #1e293b;
          --accent: #2563eb;
          --text-main: #334155;
          --text-muted: #64748b;
          --border: #e2e8f0;
          --border-dark: #cbd5e1;
        }

        @page { size: landscape; margin: 12mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
          padding: 8px;
          color: var(--text-main);
          background: var(--bg-main);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          color: white;
          padding: 18px 24px;
          border-radius: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.05);
        }
        .header-left h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 3px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header-left h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 600;
          opacity: 0.9;
          color: #94a3b8;
        }
        .header-right {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          opacity: 0.8;
          text-align: right;
          color: #cbd5e1;
          letter-spacing: 1px;
        }
        
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 10px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--bg-card);
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        
        th.th-empty {
          background-color: var(--secondary);
          color: white;
          padding: 12px 10px;
          font-size: 11px;
          border: 1px solid var(--secondary);
          width: 130px;
          line-height: 1.2;
          font-family: 'Outfit', sans-serif;
        }
        
        th.th-day {
          background-color: var(--primary);
          color: white;
          padding: 12px 8px;
          font-size: 11px;
          font-weight: bold;
          text-align: center;
          border: 1px solid var(--primary);
          line-height: 1.2;
          font-family: 'Outfit', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        td.td-label {
          background-color: #f8fafc;
          padding: 12px 14px;
          font-size: 9.5px;
          font-weight: 700;
          border: 1px solid var(--border);
          white-space: nowrap;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
        }
        
        td.td-label-empty {
          background-color: #f8fafc;
          padding: 12px 14px;
          font-size: 9.5px;
          border: 1px solid var(--border);
          white-space: nowrap;
        }
        
        td.td-value {
          padding: 12px 14px;
          font-size: 9.5px;
          border: 1px solid var(--border);
          vertical-align: top;
          line-height: 1.5;
          color: var(--text-main);
        }
        
        td.td-mainpart-instruction {
          padding: 12px 14px;
          font-size: 9.5px;
          border: 1px solid var(--border);
          vertical-align: middle;
          background-color: #f8fafc;
          font-weight: 750;
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
        }
        
        td.td-mainpart-option {
          padding: 12px 14px;
          font-size: 9.5px;
          border: 1px solid var(--border);
          vertical-align: top;
          line-height: 1.5;
        }
        
        .option-tasks {
          color: var(--primary);
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
        }
        
        .constraint-text {
          color: var(--text-muted);
          font-size: 8.5px;
          display: block;
          margin-top: 4px;
          font-weight: 500;
        }
        
        td.empty-cell {
          padding: 12px 14px;
          font-size: 9.5px;
          border: 1px solid var(--border);
          vertical-align: top;
          color: var(--text-muted);
        }
        
        .footer {
          margin-top: 18px;
          text-align: right;
          color: var(--text-muted);
          font-size: 8.5px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>📋 ${categoryName}</h1>
          <h2>${daysLabel}</h2>
        </div>
        <div class="header-right">Xtramys Performance</div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="th-empty"></th>
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
