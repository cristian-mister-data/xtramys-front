// Generación de PDF para Metodología de Porteros (web).
// Portado 1:1 desde xtramys-source/src/components/pages/goalkeeperMethodology/goalkeeperMethodology.js
import * as Print from 'expo-print';
import { savePdfToDownloads } from '../../utils/pdfDownload';
import {
  getPlanLabel,
  getIntensityColor,
  GK_PRIMARY_COLOR,
  GK_SECONDARY_COLOR,
} from './goalkeeperMethodologyData';

const tt = (t, key, fallback, opts) => {
  if (typeof t === 'function') {
    const res = t(key, opts);
    if (res && res !== key) return res;
  }
  if (typeof fallback === 'function') return fallback(opts || {});
  return fallback;
};

export async function generateGoalkeeperMethodologyPdf(planKey, days, t) {
  const planLabel = getPlanLabel(planKey, t);
  const fileName = `Metodologia_Porteros_${planLabel}`.replace(/[\s/]+/g, '_');

  const primaryColor = '#0f172a';
  const secondaryColor = '#1e293b';

  const tableHeaders = days
    .map(
      (day) => `
    <th class="th-day">
      ${tt(t, 'goalkeeperMethodology.dayLabel', ({ label }) => `Día ${label}`, { label: day.day_label || day.day_number })}
    </th>
  `,
    )
    .join('');

  const generateRow = (label, icon, getValue, isIntensity = false) => {
    const cells = days
      .map((day) => {
        const value = getValue(day);
        if (isIntensity) {
          const intensityText = (value || '').toLowerCase();
          const low = String(tt(t, 'goalkeeperMethodology.data.intensity.low', 'baja')).toLowerCase();
          const mediumLow = String(tt(t, 'goalkeeperMethodology.data.intensity.mediumLow', 'media-baja')).toLowerCase();
          const medium = String(tt(t, 'goalkeeperMethodology.data.intensity.medium', 'media')).toLowerCase();
          const mediumHigh = String(tt(t, 'goalkeeperMethodology.data.intensity.mediumHigh', 'media-alta')).toLowerCase();
          const high = String(tt(t, 'goalkeeperMethodology.data.intensity.high', 'alta')).toLowerCase();

          let badgeClass = 'intensity-badge';
          if (intensityText.includes(low)) {
            badgeClass += ' intensity-low';
          } else if (intensityText.includes(mediumLow) || intensityText.includes(medium)) {
            badgeClass += ' intensity-medium';
          } else if (intensityText.includes(mediumHigh) || intensityText.includes(high)) {
            badgeClass += ' intensity-high';
          } else {
            badgeClass += ' intensity-default';
          }

          return `<td class="td-intensity">
            <span class="${badgeClass}">
              ${value || '-'}
            </span>
          </td>`;
        }
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

  const matchDayCell = `<td colspan="${days.length}" class="td-matchday">
    ⚽ ${tt(t, 'goalkeeperMethodology.matchDay', 'Día de partido')}
  </td>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${tt(t, 'goalkeeperMethodology.title', 'Metodología de Porteros')} - ${planLabel}</title>
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
        
        td.td-value {
          padding: 12px 14px;
          font-size: 9.5px;
          border: 1px solid var(--border);
          vertical-align: top;
          line-height: 1.5;
          color: var(--text-main);
        }
        
        td.td-intensity {
          padding: 12px;
          border: 1px solid var(--border);
          vertical-align: middle;
          text-align: center;
        }
        
        .intensity-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-block;
          font-family: 'Outfit', sans-serif;
        }
        
        .intensity-low {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        
        .intensity-medium {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        
        .intensity-high {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        }
        
        .intensity-default {
          background: var(--bg-main);
          color: var(--text-main);
          border: 1px solid var(--border);
        }
        
        td.td-matchday {
          background-color: #eff6ff;
          padding: 12px;
          text-align: center;
          border: 1px solid var(--border);
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          color: #1d4ed8;
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
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
          <h1>🧤 ${tt(t, 'goalkeeperMethodology.title', 'Metodología de Porteros')}</h1>
          <h2>${planLabel}</h2>
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
          ${generateRow(tt(t, 'goalkeeperMethodology.mainObjective', 'Objetivo principal'), '🎯', (d) => d.main_objective)}
          ${generateRow(tt(t, 'goalkeeperMethodology.practicalContent', 'Contenido práctico'), '📋', (d) => d.practical_content)}
          ${generateRow(tt(t, 'goalkeeperMethodology.intensity', 'Intensidad'), '⚡', (d) => d.intensity, true)}
          <tr>
            <td class="td-label">
              📅 ${tt(t, 'goalkeeperMethodology.day', 'Día')} 0
            </td>
            ${matchDayCell}
          </tr>
        </tbody>
      </table>

      <div class="footer">
        ${tt(t, 'goalkeeperMethodology.generatedOn', ({ date }) => `Generado el ${date}`, { date: new Date().toLocaleDateString() })}
      </div>
    </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({
      html,
      width: 842,
      height: 595,
    });
    await savePdfToDownloads(uri, `${fileName}.pdf`);
    return true;
  } catch (e) {
    console.error('[gk methodology pdf] error', e);
    return false;
  }
}
