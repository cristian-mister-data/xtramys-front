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

  const primaryColor = '#1e293b';
  const secondaryColor = '#334155';

  const tableHeaders = days
    .map(
      (day) => `
    <th style="background-color: ${primaryColor}; color: white; padding: 10px 8px; font-size: 12px; font-weight: bold; text-align: center; border: 1px solid ${primaryColor}; line-height: 1;">
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

          let badgeStyle = 'background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;';
          if (intensityText.includes(low)) {
            badgeStyle = 'background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;';
          } else if (intensityText.includes(mediumLow) || intensityText.includes(medium)) {
            badgeStyle = 'background-color: #cbd5e1; color: #1e293b; border: 1px solid #94a3b8;';
          } else if (intensityText.includes(mediumHigh) || intensityText.includes(high)) {
            badgeStyle = 'background-color: #1e293b; color: #ffffff; border: 1px solid #1e293b;';
          }

          return `<td style="padding: 10px 12px; font-size: 11px; border: 1px solid #ddd; vertical-align: top; text-align: center;">
            <span style="display: inline-flex; align-items: center; justify-content: center; height: 18px; padding: 0 12px; border-radius: 12px; font-weight: 600; font-size: 10px; line-height: 1; ${badgeStyle}">
              ${value || '-'}
            </span>
          </td>`;
        }
        return `<td style="padding: 10px 12px; font-size: 11px; border: 1px solid #ddd; vertical-align: top; line-height: 1.5;">${value || '-'}</td>`;
      })
      .join('');
    return `
      <tr>
        <td style="background-color: #f8f9fa; padding: 10px 12px; font-size: 11px; font-weight: bold; border: 1px solid #ddd; white-space: nowrap; color: #333;">
          ${icon} ${label}
        </td>
        ${cells}
      </tr>
    `;
  };

  const matchDayCell = `<td colspan="${days.length}" style="background-color: #f1f5f9; padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold; color: ${primaryColor}; font-size: 12px;">
    ⚽ ${tt(t, 'goalkeeperMethodology.matchDay', 'Día de partido')}
  </td>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${tt(t, 'goalkeeperMethodology.title', 'Metodología de Porteros')} - ${planLabel}</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 10px; background: white; }
        .header {
          background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
          color: white; padding: 16px 24px; border-radius: 10px; margin-bottom: 16px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .header-left h1 { font-size: 18px; margin-bottom: 3px; }
        .header-left h2 { font-size: 13px; font-weight: normal; opacity: 0.9; }
        .header-right { font-size: 10px; opacity: 0.8; text-align: right; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; border-radius: 8px; overflow: hidden; }
        th, td { text-align: left; }
        .footer { margin-top: 12px; text-align: right; color: #999; font-size: 9px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>🧤 ${tt(t, 'goalkeeperMethodology.title', 'Metodología de Porteros')}</h1>
          <h2>${planLabel}</h2>
        </div>
        <div class="header-right">Xtramys - www.xtramys.com</div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="background-color: #333; color: white; padding: 10px 8px; font-size: 11px; border: 1px solid #333; width: 120px; line-height: 1;"></th>
            ${tableHeaders}
          </tr>
        </thead>
        <tbody>
          ${generateRow(tt(t, 'goalkeeperMethodology.mainObjective', 'Objetivo principal'), '🎯', (d) => d.main_objective)}
          ${generateRow(tt(t, 'goalkeeperMethodology.practicalContent', 'Contenido práctico'), '📋', (d) => d.practical_content)}
          ${generateRow(tt(t, 'goalkeeperMethodology.intensity', 'Intensidad'), '⚡', (d) => d.intensity, true)}
          <tr>
            <td style="background-color: #f8f9fa; padding: 10px 12px; font-size: 11px; font-weight: bold; border: 1px solid #ddd; white-space: nowrap; color: #333;">
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
