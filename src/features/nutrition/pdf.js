// PDF de Nutrición - Rediseño Premium
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

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
          font-size: 10px;
          line-height: 1.5;
          color: var(--text-main);
          background: var(--bg-main);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .pdf-page {
          width: 210mm;
          height: 297mm;
          padding: 15mm 16mm;
          box-sizing: border-box;
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg-main);
          page-break-after: always;
        }
        .pdf-page:last-child {
          page-break-after: avoid;
        }
        
        .header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 12px;
          padding: 20px 24px;
          color: #ffffff;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.05);
        }
        .header-left {
          display: flex;
          flex-direction: column;
        }
        .header-title {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .header-subtitle {
          font-family: 'Outfit', sans-serif;
          font-size: 8.5px;
          color: #94a3b8;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-top: 3px;
        }
        .header-right {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 800;
          color: #60a5fa;
          text-transform: uppercase;
          letter-spacing: 1.2px;
        }
        
        .page-header {
          border-bottom: 1.5px solid var(--border-dark);
          padding-bottom: 8px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-header-title {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--primary);
          letter-spacing: 1px;
        }
        .page-header-subtitle {
          font-size: 8.5px;
          color: var(--text-muted);
          font-weight: 600;
        }
        
        h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          margin: 14px 0 12px 0;
          color: var(--primary);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding-bottom: 5px;
          border-bottom: 2px solid var(--primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 10.5px;
          margin: 12px 0 8px 0;
          color: var(--primary);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        
        h4 {
          font-family: 'Outfit', sans-serif;
          font-size: 9px;
          margin: 8px 0 4px 0;
          color: var(--secondary);
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 8px 0;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--bg-card);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        th, td {
          padding: 8px 12px;
          text-align: left;
          font-size: 8.5px;
        }
        th {
          background: #1e293b;
          color: #ffffff;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 8px;
          letter-spacing: 0.8px;
        }
        td {
          border-bottom: 1px solid var(--border);
        }
        tr {
          page-break-inside: avoid;
        }
        tr:last-child td {
          border-bottom: none;
        }
        tr:nth-child(even) td {
          background: #f8fafc;
        }
        
        .meal-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          page-break-inside: avoid;
        }
        .meal-title {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          color: var(--primary);
          font-size: 9.5px;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 4px;
        }
        
        ul {
          margin: 4px 0 4px 14px;
        }
        li {
          margin: 2px 0;
          font-size: 8.5px;
          color: var(--text-main);
        }
        
        .protocol-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          page-break-inside: avoid;
        }
        .protocol-time {
          font-family: 'Outfit', sans-serif;
          font-weight: 850;
          color: var(--accent);
          font-size: 9.5px;
          white-space: nowrap;
          flex-shrink: 0;
          background: #eff6ff;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .protocol-desc {
          font-size: 8.5px;
          color: var(--text-main);
          font-weight: 500;
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
          font-size: 8px;
          color: var(--text-muted);
          font-style: italic;
        }
        
        .footer {
          margin-top: auto;
          text-align: center;
          color: var(--text-muted);
          font-size: 8.5px;
          border-top: 1px solid var(--border);
          padding-top: 10px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <!-- PAGINA 1: PRETEMPORADA - COMIDAS -->
      <div class="pdf-page">
        <div class="header">
          <div class="header-left">
            <h1 class="header-title">${esc(pdfTitle)}</h1>
            <span class="header-subtitle">Xtramys Performance Report</span>
          </div>
          <span class="header-right">${esc(t('nutrition.tabs.preseason'))}</span>
        </div>

        <h2>🏋️ ${esc(t('nutrition.tabs.preseason').toUpperCase())} — ${esc(preseasonData.title)}</h2>

        <div class="two-columns" style="flex: 1; min-height: 0; margin-top: 10px;">
          <div class="column">
            <h3 style="margin-top: 0;">${esc(t('nutrition.meals.breakfast'))}</h3>
            ${(preseasonData.meals?.breakfast || []).map(item => `
              <div class="meal-card">
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
              <div class="meal-card">
                <div class="meal-title">${esc(item.condition)}</div>
                <ul>
                  ${(item.options || []).map(i => `<li>${esc(i)}</li>`).join('')}
                </ul>
              </div>
            `).join('')}

            <h3>${esc(t('nutrition.meals.snacks'))}</h3>
            ${(preseasonData.meals?.snacks || []).map(item => `
              <div class="meal-card">
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
                <th style="width: 15%;">${esc(t('nutrition.days.monday').split(' ')[0])}</th>
                <th style="width: 15%;">Tipo</th>
                <th style="width: 35%;">${esc(t('nutrition.meals.lunch'))}</th>
                <th style="width: 35%;">${esc(t('nutrition.meals.dinner'))}</th>
              </tr>
            </thead>
            <tbody>
              ${(preseasonData.weekly_menu || []).map(day => `
                <tr>
                  <td><strong>${esc(day.day)}</strong></td>
                  <td><span style="font-weight: 700; font-size: 8.5px; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px;">${esc(day.tag)}</span></td>
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

        <h2>⚽ ${esc(t('nutrition.tabs.season').toUpperCase())} — ${esc(seasonData.title)}</h2>

        <h3>${esc(t('nutrition.sections.contextMenus'))}</h3>
        <div class="two-columns" style="flex: 1; min-height: 0; margin-top: 10px;">
          ${(seasonData.menu_options || []).map(ctx => `
            <div class="column">
              <div class="meal-card" style="height: 100%; margin: 0; display: flex; flex-direction: column;">
                <div class="meal-title" style="color: var(--accent); border-bottom: 2px solid var(--accent); padding-bottom: 6px; margin-bottom: 10px; font-size: 11px; font-weight:800;">${esc(ctx.context)}</div>
                
                <div style="flex: 1;">
                  <h4 style="color: var(--primary); font-weight: 700; font-size: 9px; margin-bottom: 6px;">📋 ${esc(t('nutrition.meals.lunch'))}:</h4>
                  <ul style="margin-bottom: 12px; margin-left: 14px;">
                    ${(ctx.lunches || []).map(l => `<li>${esc(l)}</li>`).join('')}
                  </ul>
                  
                  <h4 style="color: var(--primary); font-weight: 700; font-size: 9px; margin-bottom: 6px;">📋 ${esc(t('nutrition.meals.dinner'))}:</h4>
                  <ul style="margin-left: 14px;">
                    ${(ctx.dinners || []).map(d => `<li>${esc(d)}</li>`).join('')}
                  </ul>
                </div>
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

        <div class="two-columns" style="margin-top: 10px;">
          <div class="column">
            <h3>🍞 ${esc(t('nutrition.reference.carbohydrates'))}</h3>
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
                    <td style="font-weight:600; color:var(--primary);">${esc(item.lunch)}g</td>
                    <td style="font-weight:600; color:var(--text-muted);">${item.dinner === 0 ? '-' : esc(item.dinner) + 'g'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="column">
            <h3>🥩 ${esc(t('nutrition.reference.proteins'))}</h3>
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
                    <td style="font-weight:600; color:var(--primary);">${esc(item.lunch)}${esc(item.unit || 'g')}</td>
                    <td style="font-weight:600; color:var(--text-muted);">${esc(item.dinner)}${esc(item.unit || 'g')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="two-columns" style="margin-top: 12px; flex: 1;">
          <div class="column">
            <h3>💊 ${esc(t('nutrition.reference.supplements'))}</h3>
            <div class="meal-card" style="height: calc(100% - 24px); margin: 0; overflow-y: auto;">
              <ul style="margin: 0; list-style-type: none;">
                ${(referenceData.supplements || []).map(s => `
                  <li style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid var(--border); font-size: 8.5px; line-height: 1.4;">
                    <strong style="color: var(--primary); display: block; margin-bottom: 2px;">${esc(s.name)}</strong>
                    <span style="color: var(--text-main);">${esc(s.description)}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>
          
          <div class="column" style="display: flex; flex-direction: column; gap: 10px;">
            <div>
              <h3>⏱️ ${esc(t('nutrition.reference.matchProtocol'))}</h3>
              <div style="display:flex; flex-direction:column; gap:4px; margin-top: 4px;">
                ${((referenceData.match_day_protocol?.steps) || []).map(step => `
                  <div class="protocol-card">
                    <span class="protocol-time">${esc(step.time)}</span>
                    <span class="protocol-desc">${esc(step.description)}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div>
              <h3>💧 ${esc(t('nutrition.reference.hydration'))}</h3>
              <div class="meal-card" style="margin: 0;">
                <ul style="margin: 0; list-style-type: none;">
                  ${(referenceData.hydration_tips || []).map(tip => `
                    <li style="margin-bottom: 4px; font-weight: 500; font-size: 8.5px; color: var(--text-main); display: flex; align-items: start; gap: 6px;">
                      <span style="color: var(--accent);">•</span>
                      <span>${esc(tip)}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
          </div>
        </div>

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
