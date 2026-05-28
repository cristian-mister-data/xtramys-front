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
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
          font-size: 10px;
          line-height: 1.5;
          color: #334155;
          padding: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .pdf-page {
          width: 210mm;
          height: 297mm;
          padding: 12mm 14mm;
          box-sizing: border-box;
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #ffffff;
          page-break-after: always;
        }
        .pdf-page:last-child {
          page-break-after: avoid;
        }
        
        .header {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border-radius: 12px;
          padding: 18px 22px;
          color: #ffffff;
          margin-bottom: 14px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.05);
        }
        .header-title {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        
        .page-header {
          border-bottom: 1.5px dashed #475569;
          padding-bottom: 6px;
          margin-bottom: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-header-title {
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          color: #334155;
          letter-spacing: 1px;
        }
        .page-header-subtitle {
          font-size: 8px;
          color: #94a3b8;
          font-weight: 500;
        }
        
        h2 {
          font-size: 11px;
          margin: 12px 0 10px 0;
          color: #0f172a;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          padding-bottom: 4px;
          border-bottom: 2.5px solid #475569;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        h3 {
          font-size: 10px;
          margin: 12px 0 6px 0;
          color: #0f172a;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        
        h4 {
          font-size: 9px;
          margin: 8px 0 4px 0;
          color: #475569;
          font-weight: 700;
          text-transform: uppercase;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        th, td {
          padding: 6px 9px;
          text-align: left;
          font-size: 8.5px;
        }
        th {
          background: #334155;
          color: #ffffff;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 8px;
          letter-spacing: 0.8px;
        }
        tr:nth-child(even) {
          background: #f8fafc;
        }
        
        .meal-section {
          margin: 6px 0;
          padding: 4px 0;
        }
        .meal-title {
          font-weight: 700;
          color: #0f172a;
          font-size: 9px;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        ul {
          margin: 2px 0 2px 14px;
        }
        li {
          margin: 1px 0;
          font-size: 8.5px;
          color: #475569;
        }
        
        .protocol-step {
          margin: 4px 0;
          padding: 2px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .protocol-time {
          font-weight: 800;
          color: #334155;
          font-size: 8.5px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        
        .two-columns {
          display: flex;
          gap: 16px;
        }
        .column {
          flex: 1;
          min-width: 0;
        }
        .note {
          font-size: 7.5px;
          color: #94a3b8;
          font-style: italic;
        }
        
        .footer {
          margin-top: auto;
          text-align: center;
          color: #94a3b8;
          font-size: 8px;
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          font-family: 'Inter', sans-serif;
        }
      </style>
    </head>
    <body>
      <!-- PAGINA 1: PRETEMPORADA - COMIDAS -->
      <div class="pdf-page">
        <div class="header">
          <h1 class="header-title">${esc(pdfTitle)}</h1>
        </div>

        <h2>🏋️ ${esc(t('nutrition.tabs.preseason').toUpperCase())} - ${esc(preseasonData.title)}</h2>

        <div class="two-columns" style="flex: 1; min-height: 0; margin-top: 10px;">
          <div class="column">
            <h3 style="margin-top: 0;">${esc(t('nutrition.meals.breakfast'))}</h3>
            ${(preseasonData.meals?.breakfast || []).map(item => `
              <div class="meal-section">
                <div class="meal-title">${esc(item.type || item.condition)}</div>
                <ul>
                  ${(item.items || item.options || []).map(i => `<li>${esc(i)}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
          
          <div class="column">
            <h3 style="margin-top: 0;">${esc(t('nutrition.meals.midMorning'))}</h3>
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
          </div>
        </div>

        <div class="footer">
          ${esc(t('nutrition.pdf.generatedBy'))} Xtramys · Pág 1 / 4
        </div>
      </div>

      <!-- PAGINA 2: PRETEMPORADA - MENU SEMANAL -->
      <div class="pdf-page">
        <div class="page-header">
          <span class="page-header-title">${esc(pdfTitle)}</span>
          <span class="page-header-subtitle">Pág 2 / 4</span>
        </div>

        <h2>🏋️ ${esc(t('nutrition.tabs.preseason').toUpperCase())} — ${esc(t('nutrition.sections.weeklyMenu'))}</h2>

        <div style="flex:1; display:flex; flex-direction:column; justify-content:start; margin-top: 10px;">
          <table>
            <thead>
              <tr>
                <th>${esc(t('nutrition.days.monday').split(' ')[0])}</th>
                <th>Tipo</th>
                <th>${esc(t('nutrition.meals.lunch'))}</th>
                <th>${esc(t('nutrition.meals.dinner'))}</th>
              </tr>
            </thead>
            <tbody>
              ${(preseasonData.weekly_menu || []).map(day => `
                <tr>
                  <td><strong>${esc(day.day)}</strong></td>
                  <td><span style="font-weight: 700; font-size: 8.5px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">${esc(day.tag)}</span></td>
                  <td>${esc(day.lunch)}</td>
                  <td>${esc(day.dinner)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="footer">
          ${esc(t('nutrition.pdf.generatedBy'))} Xtramys · Pág 2 / 4
        </div>
      </div>

      <!-- PAGINA 3: TEMPORADA -->
      <div class="pdf-page">
        <div class="page-header">
          <span class="page-header-title">${esc(pdfTitle)}</span>
          <span class="page-header-subtitle">Pág 3 / 4</span>
        </div>

        <h2>⚽ ${esc(t('nutrition.tabs.season').toUpperCase())} - ${esc(seasonData.title)}</h2>

        <h3>${esc(t('nutrition.sections.contextMenus'))}</h3>
        <div class="two-columns" style="flex: 1; min-height: 0; margin-top: 10px;">
          ${(seasonData.menu_options || []).map(ctx => `
            <div class="column">
              <div class="meal-section" style="border-left-color: #475569; height: 100%; margin: 0;">
                <div class="meal-title" style="color:#1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 8px; font-size: 10px; font-weight:800;">${esc(ctx.context)}</div>
                <h4>${esc(t('nutrition.meals.lunch'))}:</h4>
                <ul style="margin-bottom: 8px;">
                  ${(ctx.lunches || []).map(l => `<li>${esc(l)}</li>`).join('')}
                </ul>
                <h4>${esc(t('nutrition.meals.dinner'))}:</h4>
                <ul>
                  ${(ctx.dinners || []).map(d => `<li>${esc(d)}</li>`).join('')}
                </ul>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="footer">
          ${esc(t('nutrition.pdf.generatedBy'))} Xtramys · Pág 3 / 4
        </div>
      </div>

      <!-- PAGINA 4: REFERENCIA -->
      <div class="pdf-page">
        <div class="page-header">
          <span class="page-header-title">${esc(pdfTitle)}</span>
          <span class="page-header-subtitle">Pág 4 / 4</span>
        </div>

        <h2>📊 ${esc(t('nutrition.tabs.reference').toUpperCase())}</h2>

        <h3>${esc(t('nutrition.reference.quantitiesTitle'))}</h3>
        <div class="two-columns">
          <div class="column">
            <h4>🍞 ${esc(t('nutrition.reference.carbohydrates'))}</h4>
            <table>
              <thead>
                <tr>
                  <th>${esc(t('nutrition.reference.food'))}</th>
                  <th>${esc(t('nutrition.meals.lunch'))}</th>
                  <th>${esc(t('nutrition.meals.dinner'))}</th>
                </tr>
              </thead>
              <tbody>
                ${(referenceData.quantities_gr?.carbohydrates || []).map(item => `
                  <tr>
                    <td><strong>${esc(item.name)}</strong>${item.note ? ` <span class="note">(${esc(item.note)})</span>` : ''}</td>
                    <td style="font-weight:600; color:#1e293b;">${esc(item.lunch)}g</td>
                    <td style="font-weight:600; color:#64748b;">${item.dinner === 0 ? '-' : esc(item.dinner) + 'g'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="column">
            <h4>🥩 ${esc(t('nutrition.reference.proteins'))}</h4>
            <table>
              <thead>
                <tr>
                  <th>${esc(t('nutrition.reference.food'))}</th>
                  <th>${esc(t('nutrition.meals.lunch'))}</th>
                  <th>${esc(t('nutrition.meals.dinner'))}</th>
                </tr>
              </thead>
              <tbody>
                ${(referenceData.quantities_gr?.proteins || []).map(item => `
                  <tr>
                    <td><strong>${esc(item.name)}</strong></td>
                    <td style="font-weight:600; color:#1e293b;">${esc(item.lunch)}${esc(item.unit || 'g')}</td>
                    <td style="font-weight:600; color:#64748b;">${esc(item.dinner)}${esc(item.unit || 'g')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <h3>💊 ${esc(t('nutrition.reference.supplements'))}</h3>
        <ul style="margin: 4px 0 4px 14px;">
          ${(referenceData.supplements || []).map(s => `
            <li style="margin-bottom: 4px;">
              <strong style="color: #1e293b; font-size: 8.5px;">${esc(s.name)}:</strong> <span style="color:#475569; font-size: 8.5px;">${esc(s.description)}</span>
            </li>
          `).join('')}
        </ul>

        <h3>⏱️ ${esc(t('nutrition.reference.matchProtocol'))}</h3>
        <div style="display:flex; flex-direction:column; gap:4px;">
          ${((referenceData.match_day_protocol?.steps) || []).map(step => `
            <div class="protocol-step">
              <span class="protocol-time">${esc(step.time)}</span>
              <span style="font-weight: 500; color: #334155; font-size: 8.5px;">${esc(step.description)}</span>
            </div>
          `).join('')}
        </div>

        <h3>💧 ${esc(t('nutrition.reference.hydration'))}</h3>
        <ul style="margin: 4px 0 4px 14px;">
          ${(referenceData.hydration_tips || []).map(tip => `
            <li style="margin-bottom: 4px; font-weight: 500; font-size: 8.5px; color: #334155;">
              ${esc(tip)}
            </li>
          `).join('')}
        </ul>

        <div class="footer">
          ${esc(t('nutrition.pdf.generatedBy'))} Xtramys · Pág 4 / 4
        </div>
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
