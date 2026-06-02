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
    <th style="background-color: ${primaryColor}; color: white; padding: 12px 8px; font-size: 11px; font-weight: bold; text-align: center; border: 1px solid ${primaryColor}; line-height: 1.2; font-family: 'Outfit', sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">
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

          let badgeStyle = 'padding: 4px 8px; border-radius: 12px; font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block;';
          if (intensityText.includes(low)) {
            badgeStyle += ' background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;';
          } else if (intensityText.includes(mediumLow) || intensityText.includes(medium)) {
            badgeStyle += ' background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;';
          } else if (intensityText.includes(mediumHigh) || intensityText.includes(high)) {
            badgeStyle += ' background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5;';
          } else {
            badgeStyle += ' background: #f8fafc; color: #334155; border: 1px solid #e2e8f0;';
          }

          return `<td style="padding: 12px; border: 1px solid #e2e8f0; vertical-align: middle; text-align: center;">
            <span style="${badgeStyle}">
              ${value || '-'}
            </span>
          </td>`;
        }
        return `<td style="padding: 12px 14px; font-size: 9.5px; border: 1px solid #e2e8f0; vertical-align: top; line-height: 1.5; color: #334155;">${value || '-'}</td>`;
      })
      .join('');

    return `
      <tr>
        <td style="background-color: #f8fafc; padding: 12px 14px; font-size: 9.5px; font-weight: 700; border: 1px solid #e2e8f0; white-space: nowrap; color: #0f172a; font-family: 'Outfit', sans-serif;">
          ${icon} ${label}
        </td>
        ${cells}
      </tr>
    `;
  };

  const matchDayCell = `<td colspan="${days.length}" style="background-color: #eff6ff; padding: 12px; text-align: center; border: 1px solid #e2e8f0; font-family: 'Outfit', sans-serif; font-weight: 800; color: #1d4ed8; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase;">
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
        @page { size: landscape; margin: 10mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
          padding: 10px;
          background: #f8fafc;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header {
          background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
          color: white;
          padding: 16px 24px;
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
          border: 1px solid #e2e8f0;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        th, td { text-align: left; }
        
        .footer {
          margin-top: 16px;
          text-align: right;
          color: #94a3b8;
          font-size: 8px;
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
            <th style="background-color: #1e293b; color: white; padding: 12px 10px; font-size: 11px; border: 1px solid #1e293b; width: 120px; line-height: 1.2; font-family: 'Outfit', sans-serif;"></th>
            ${tableHeaders}
          </tr>
        </thead>
        <tbody>
          ${generateRow(tt(t, 'goalkeeperMethodology.mainObjective', 'Objetivo principal'), '🎯', (d) => d.main_objective)}
          ${generateRow(tt(t, 'goalkeeperMethodology.practicalContent', 'Contenido práctico'), '📋', (d) => d.practical_content)}
          ${generateRow(tt(t, 'goalkeeperMethodology.intensity', 'Intensidad'), '⚡', (d) => d.intensity, true)}
          <tr>
            <td style="background-color: #f8fafc; padding: 12px 14px; font-size: 9.5px; font-weight: bold; border: 1px solid #e2e8f0; white-space: nowrap; color: #0f172a; font-family: 'Outfit', sans-serif;">
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
