// Generación de PDF para Metodología de Porteros (web).
// Portado 1:1 desde misterdata-source/src/components/pages/goalkeeperMethodology/goalkeeperMethodology.js
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

  const tableHeaders = days
    .map(
      (day) => `
    <th style="background-color: ${GK_PRIMARY_COLOR}; color: white; padding: 10px 8px; font-size: 12px; font-weight: bold; text-align: center; border: 1px solid ${GK_PRIMARY_COLOR};">
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
          const color = getIntensityColor(value, t);
          return `<td style="padding: 10px 12px; font-size: 11px; border: 1px solid #ddd; vertical-align: top; text-align: center;">
            <span style="display: inline-block; background-color: ${color}; color: white; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 10px;">
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

  const matchDayCell = `<td colspan="${days.length}" style="background-color: ${GK_PRIMARY_COLOR}15; padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold; color: ${GK_PRIMARY_COLOR}; font-size: 12px;">
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
          background: linear-gradient(135deg, ${GK_PRIMARY_COLOR}, ${GK_SECONDARY_COLOR});
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
            <th style="background-color: #263238; color: white; padding: 10px 8px; font-size: 11px; border: 1px solid #263238; width: 120px;"></th>
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
