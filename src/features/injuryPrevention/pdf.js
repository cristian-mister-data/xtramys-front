// PDF de protocolos de prevención de lesiones — versión web (window.print).
// Equivalente al flujo expo-print del proyecto RN original.

const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export async function generateProtocolPdf(protocol, lang, t) {
  const protocolColor = protocol.color || '#3b82f6';
  
  let riskFactorsHtml = '';
  if (protocol.introduction?.risk_factors?.length > 0) {
    riskFactorsHtml = `
      <div class="intro-block">
        <h3>⚠️ ${escapeHtml(t('injuryPrevention.riskFactors'))}</h3>
        <ul>
          ${protocol.introduction.risk_factors.map((f) => `<li>${escapeHtml(f[lang])}</li>`).join('')}
        </ul>
      </div>`;
  }

  let objectivesHtml = '';
  if (protocol.introduction?.objectives?.length > 0) {
    objectivesHtml = `
      <div class="intro-block">
        <h3>🎯 ${escapeHtml(t('injuryPrevention.objectives'))}</h3>
        <ul>
          ${protocol.introduction.objectives.map((o) => `<li>${escapeHtml(o[lang])}</li>`).join('')}
        </ul>
      </div>`;
  }

  const totalExercises = protocol.sections.reduce((acc, s) => acc + s.exercises.length, 0);

  // Group sections and exercises into pages to prevent mid-card page cuts
  const pages = [];
  let currentPageItems = [];
  let currentExercisesInPage = 0;
  const maxExercisesFirstPage = 4;
  const maxExercisesSubsequentPages = 5;

  protocol.sections.forEach((section, sectionIndex) => {
    section.exercises.forEach((exercise, exerciseIndex) => {
      const isFirstPage = pages.length === 0;
      const maxLimit = isFirstPage ? maxExercisesFirstPage : maxExercisesSubsequentPages;

      if (currentExercisesInPage >= maxLimit) {
        pages.push(currentPageItems);
        currentPageItems = [];
        currentExercisesInPage = 0;
      }

      currentPageItems.push({
        sectionIndex,
        sectionTitle: section.title[lang],
        exerciseIndex,
        exercise
      });
      currentExercisesInPage++;
    });
  });
  if (currentPageItems.length > 0) {
    pages.push(currentPageItems);
  }

  let pagesHtml = '';
  pages.forEach((pageItems, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    
    let pageContentHtml = '';

    // Group items on this page by sectionIndex
    const groupsOnPage = [];
    pageItems.forEach(item => {
      let group = groupsOnPage.find(g => g.sectionIndex === item.sectionIndex);
      if (!group) {
        group = { sectionIndex: item.sectionIndex, title: item.sectionTitle, exercises: [] };
        groupsOnPage.push(group);
      }
      group.exercises.push({ index: item.exerciseIndex, data: item.exercise });
    });

    groupsOnPage.forEach(group => {
      pageContentHtml += `
        <div class="section">
          <h2>${group.sectionIndex + 1}. ${escapeHtml(group.title)}</h2>
          <div class="exercises">
      `;
      group.exercises.forEach(ex => {
        const setupOk = ex.data.setup?.[lang] && ex.data.setup[lang] !== 'N/A';
        const tipsOk = ex.data.tips?.[lang] && ex.data.tips[lang].trim() !== '';
        pageContentHtml += `
          <div class="exercise">
            <h3>${group.sectionIndex + 1}.${ex.index + 1}. ${escapeHtml(ex.data.name[lang])}</h3>
            ${setupOk ? `<div class="detail"><span class="label">${escapeHtml(t('injuryPrevention.setup'))}:</span> <span class="value">${escapeHtml(ex.data.setup[lang])}</span></div>` : ''}
            <div class="detail"><span class="label">${escapeHtml(t('injuryPrevention.execution'))}:</span> <span class="value">${escapeHtml(ex.data.execution[lang])}</span></div>
            <div class="detail"><span class="label">${escapeHtml(t('injuryPrevention.dosage'))}:</span> <span class="value">${escapeHtml(ex.data.dosage[lang])}</span></div>
            ${tipsOk ? `<div class="detail tips"><span class="label">${escapeHtml(t('injuryPrevention.tips'))}:</span> <span class="value">${escapeHtml(ex.data.tips[lang])}</span></div>` : ''}
          </div>
        `;
      });
      pageContentHtml += `</div></div>`;
    });

    pagesHtml += `
      <div class="pdf-page">
        ${isFirstPage ? `
          <div class="header">
            <h1>${escapeHtml(protocol.title[lang])}</h1>
            <div class="stats">${protocol.sections.length} ${escapeHtml(t('injuryPrevention.blocks'))} | ${totalExercises} ${escapeHtml(t('injuryPrevention.exercises'))}</div>
          </div>
          ${(riskFactorsHtml || objectivesHtml) ? `
            <div class="intro-section">
              <h2>${escapeHtml(protocol.introduction?.title?.[lang] || t('injuryPrevention.introduction'))}</h2>
              <div class="intro-cols">
                ${riskFactorsHtml}
                ${objectivesHtml}
              </div>
            </div>` : ''}
        ` : `
          <div class="page-header">
            <span class="page-header-title">${escapeHtml(protocol.title[lang])}</span>
            <span class="page-header-subtitle">Pág ${pageIdx + 1} / ${pages.length}</span>
          </div>
        `}

        <div style="flex: 1;">
          ${pageContentHtml}
        </div>

        <div class="footer">${escapeHtml(t('injuryPrevention.pdfGeneratedBy'))} Xtramys - Pág ${pageIdx + 1} / ${pages.length}</div>
      </div>
    `;
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(protocol.title[lang])}</title>
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

    @page {
      size: A4;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
      color: var(--text-main);
      background: var(--bg-main);
      padding: 0;
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
      color: white;
      border-radius: 12px;
      padding: 18px 24px;
      margin-bottom: 12px;
      text-align: center;
      box-shadow: 0 4px 15px rgba(15, 23, 42, 0.05);
    }
    .header h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 16pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 3px;
    }
    .header .stats {
      font-size: 8pt;
      opacity: 0.85;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .page-header {
      border-bottom: 1.5px solid var(--border-dark);
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .page-header-title {
      font-family: 'Outfit', sans-serif;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--primary);
      letter-spacing: 1px;
    }
    .page-header-subtitle {
      font-size: 8px;
      color: var(--text-muted);
      font-weight: 500;
    }
    .intro-section {
      margin-bottom: 12px;
      padding: 0;
    }
    .intro-section h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 10.5pt;
      font-weight: 850;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .intro-cols {
      display: flex;
      gap: 12px;
    }
    .intro-block {
      flex: 1;
      padding: 12px 14px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .intro-block h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 9.5px;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .intro-block ul {
      list-style-type: none;
    }
    .intro-block li {
      margin-bottom: 4px;
      font-size: 8.5px;
      color: var(--text-main);
      position: relative;
      padding-left: 12px;
    }
    .intro-block li::before {
      content: "•";
      color: var(--accent);
      font-weight: bold;
      position: absolute;
      left: 0;
      top: 0;
    }
    .section {
      margin-bottom: 12px;
    }
    .section h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 10.5pt;
      font-weight: 850;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .exercises {
      padding-left: 0;
    }
    .exercise {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-left: 3.5px solid var(--accent);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      page-break-inside: avoid;
    }
    .exercise:last-child {
      margin-bottom: 0;
    }
    .exercise h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 9.5pt;
      font-weight: 750;
      color: var(--primary);
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .detail {
      margin-bottom: 3px;
      font-size: 8pt;
      color: var(--text-main);
    }
    .detail .label {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.5px;
      margin-right: 4px;
    }
    .detail.tips {
      margin-top: 6px;
      padding: 6px 8px;
      background: #fffbeb;
      border-left: 2.5px solid #d97706;
      border-radius: 4px;
      color: #78350f;
    }
    .detail.tips .label {
      color: #b45309;
    }
    .footer {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 8px;
      color: var(--text-muted);
      font-weight: 500;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

  const Print = await import('expo-print');
  const { savePdfToDownloads } = await import('@/utils/pdfDownload');
  const { uri } = await Print.printToFileAsync({ html });
  await savePdfToDownloads(uri, `injury-prevention-${protocol.name || 'protocol'}`);
}
