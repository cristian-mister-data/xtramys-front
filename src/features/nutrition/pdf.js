// PDF de Nutrición - Port 1:1 desde misterdata (móvil) para que el documento
// generado en web sea idéntico al de iOS/Android.
// Ver: misterdata/src/components/pages/nutrition/nutrition.js -> generatePDFHTML
const esc = (text) => {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

function buildNutritionHTML(preseasonData, seasonData, referenceData, t, optionLabel) {
  const pdfTitle = optionLabel
    ? `${t('nutrition.pdf.title')} - ${optionLabel}`
    : t('nutrition.pdf.title');
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${esc(pdfTitle)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; line-height: 1.4; color: #333; padding: 20px; }
        h1 { font-size: 22px; text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { font-size: 16px; margin: 20px 0 10px 0; background: #f5f5f5; padding: 8px; border-left: 4px solid #333; }
        h3 { font-size: 13px; margin: 15px 0 8px 0; color: #444; }
        h4 { font-size: 11px; margin: 10px 0 5px 0; color: #666; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10px; }
        th { background: #f0f0f0; font-weight: 600; }
        .meal-section { margin: 15px 0; padding: 10px; background: #fafafa; border-radius: 4px; }
        .meal-title { font-weight: 600; margin-bottom: 8px; }
        .meal-item { margin: 4px 0; padding-left: 15px; }
        .day-card { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .day-header { font-weight: 600; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #eee; }
        .day-tag { font-size: 9px; color: #666; margin-left: 10px; }
        .protocol-step { margin: 8px 0; padding-left: 20px; }
        .protocol-time { font-weight: 600; }
        ul { margin: 5px 0 5px 20px; }
        li { margin: 3px 0; }
        .page-break { page-break-before: always; }
        .two-columns { display: flex; gap: 20px; }
        .column { flex: 1; }
        .note { font-size: 9px; color: #666; font-style: italic; }
        @media print { @page { size: A4; margin: 14mm; } }
      </style>
    </head>
    <body>
      <h1>${esc(pdfTitle)}</h1>

      <!-- PRETEMPORADA -->
      <h2>🏋️ ${esc(t('nutrition.tabs.preseason').toUpperCase())} - ${esc(preseasonData.title)}</h2>

      <h3>${esc(t('nutrition.meals.breakfast'))}</h3>
      ${(preseasonData.meals?.breakfast || []).map(item => `
        <div class="meal-section">
          <div class="meal-title">${esc(item.type || item.condition)}</div>
          <ul>
            ${(item.items || item.options || []).map(i => `<li>${esc(i)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}

      <h3>${esc(t('nutrition.meals.midMorning'))}</h3>
      ${(preseasonData.meals?.mid_morning || []).map(item => `
        <div class="meal-section">
          <div class="meal-title">${esc(item.condition)}</div>
          <ul>
            ${(item.options || []).map(i => `<li>${esc(i)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}

      <h3>${esc(t('nutrition.meals.snacks'))}</h3>
      ${(preseasonData.meals?.snacks || []).map(item => `
        <div class="meal-section">
          <div class="meal-title">${esc(item.condition)}</div>
          <ul>
            ${(item.options || []).map(i => `<li>${esc(i)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}

      <h3>${esc(t('nutrition.sections.weeklyMenu'))}</h3>
      <table>
        <tr>
          <th>${esc(t('nutrition.days.monday').split(' ')[0])}</th>
          <th>Tipo</th>
          <th>${esc(t('nutrition.meals.lunch'))}</th>
          <th>${esc(t('nutrition.meals.dinner'))}</th>
        </tr>
        ${(preseasonData.weekly_menu || []).map(day => `
          <tr>
            <td><strong>${esc(day.day)}</strong></td>
            <td>${esc(day.tag)}</td>
            <td>${esc(day.lunch)}</td>
            <td>${esc(day.dinner)}</td>
          </tr>
        `).join('')}
      </table>

      <div class="page-break"></div>

      <!-- TEMPORADA -->
      <h2>⚽ ${esc(t('nutrition.tabs.season').toUpperCase())} - ${esc(seasonData.title)}</h2>

      <h3>${esc(t('nutrition.sections.contextMenus'))}</h3>
      ${(seasonData.menu_options || []).map(ctx => `
        <div class="meal-section">
          <div class="meal-title">${esc(ctx.context)}</div>
          <h4>${esc(t('nutrition.meals.lunch'))}:</h4>
          <ul>
            ${(ctx.lunches || []).map(l => `<li>${esc(l)}</li>`).join('')}
          </ul>
          <h4>${esc(t('nutrition.meals.dinner'))}:</h4>
          <ul>
            ${(ctx.dinners || []).map(d => `<li>${esc(d)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}

      <div class="page-break"></div>

      <!-- REFERENCIA -->
      <h2>📊 ${esc(t('nutrition.tabs.reference').toUpperCase())}</h2>

      <h3>${esc(t('nutrition.reference.quantitiesTitle'))}</h3>
      <div class="two-columns">
        <div class="column">
          <h4>${esc(t('nutrition.reference.carbohydrates'))}</h4>
          <table>
            <tr><th>${esc(t('nutrition.reference.food'))}</th><th>${esc(t('nutrition.meals.lunch'))}</th><th>${esc(t('nutrition.meals.dinner'))}</th></tr>
            ${(referenceData.quantities_gr?.carbohydrates || []).map(item => `
              <tr>
                <td>${esc(item.name)}${item.note ? ` <span class="note">(${esc(item.note)})</span>` : ''}</td>
                <td>${esc(item.lunch)}g</td>
                <td>${item.dinner === 0 ? '-' : esc(item.dinner) + 'g'}</td>
              </tr>
            `).join('')}
          </table>
        </div>
        <div class="column">
          <h4>${esc(t('nutrition.reference.proteins'))}</h4>
          <table>
            <tr><th>${esc(t('nutrition.reference.food'))}</th><th>${esc(t('nutrition.meals.lunch'))}</th><th>${esc(t('nutrition.meals.dinner'))}</th></tr>
            ${(referenceData.quantities_gr?.proteins || []).map(item => `
              <tr>
                <td>${esc(item.name)}</td>
                <td>${esc(item.lunch)}${esc(item.unit || 'g')}</td>
                <td>${esc(item.dinner)}${esc(item.unit || 'g')}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>

      <h3>${esc(t('nutrition.reference.supplements'))}</h3>
      <ul>
        ${(referenceData.supplements || []).map(s => `<li><strong>${esc(s.name)}:</strong> ${esc(s.description)}</li>`).join('')}
      </ul>

      <h3>${esc(t('nutrition.reference.matchProtocol'))}</h3>
      ${((referenceData.match_day_protocol?.steps) || []).map(step => `
        <div class="protocol-step">
          <span class="protocol-time">${esc(step.time)}:</span> ${esc(step.description)}
        </div>
      `).join('')}

      <h3>${esc(t('nutrition.reference.hydration'))}</h3>
      <ul>
        ${(referenceData.hydration_tips || []).map(tip => `<li>${esc(tip)}</li>`).join('')}
      </ul>

      <div style="margin-top: 30px; text-align: center; color: #999; font-size: 9px;">
        ${esc(t('nutrition.pdf.generatedBy'))} - ${new Date().toLocaleDateString()}
      </div>
    </body>
    </html>
  `;
}

export async function generateNutritionPdf(preseasonData, seasonData, referenceData, t, optionLabel) {
  const html = buildNutritionHTML(preseasonData, seasonData, referenceData, t, optionLabel);
  const Print = await import('expo-print');
  const { savePdfToDownloads } = await import('@/utils/pdfDownload');
  const { uri } = await Print.printToFileAsync({ html });
  await savePdfToDownloads(uri, `nutrition-${optionLabel || 'report'}`);
}

export { buildNutritionHTML };
