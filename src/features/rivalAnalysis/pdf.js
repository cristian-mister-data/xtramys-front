// PDF de Análisis del Rival - Port 1:1 desde misterdata (móvil) para que el
// documento generado en web sea idéntico al de iOS/Android.
// Ver: misterdata/src/components/pages/rivalAnalysis/rivalAnalysisList.js
//      -> generateRivalAnalysisPDFHTML
import { normalizeFormation } from './rivalAnalysisData';
import { getPlayerFullName } from '@/utils/playerHelpers';

function generateRivalAnalysisPDFHTML(rivalAnalysis, selectedTeam, t, userTemplates = []) {
  const translateValue = (value) => {
    if (!value) return '';
    const translations = {
      'RIGHT': t('rivalAnalysis.options.right'),
      'LEFT': t('rivalAnalysis.options.left'),
      'COMBINATIVE': t('rivalAnalysis.options.combinative'),
      'DIRECT': t('rivalAnalysis.options.direct'),
      'HIGH': t('rivalAnalysis.options.high'),
      'MEDIUM': t('rivalAnalysis.options.medium'),
      'LOW': t('rivalAnalysis.options.low'),
    };
    return translations[value] || value;
  };

  const analysisTemplate = userTemplates.find(tmpl => tmpl._id === rivalAnalysis.templateId);
  const templateQuestions = analysisTemplate?.questions
    ? [...analysisTemplate.questions].sort((a, b) => a.order - b.order)
    : [];

  const getAnswerValue = (question) => {
    const knownFields = [
      'ladoDebilSalidaBalon', 'generanPeligroPorDonde', 'combinativoDirecto',
      'pressingAltura', 'pressingPuntas', 'pressingSaltanLineas',
      'ortjDefendiendo', 'zonaSaquePortero', 'cambioSistemaDerrota',
      'observaciones', 'jugadoresDestacados', 'jugadoresDebiles', 'alineacion'
    ];
    if (knownFields.includes(question.id)) {
      return rivalAnalysis[question.id];
    }
    return rivalAnalysis.customAnswers?.[question.id];
  };

  const getQuestionText = (question) => {
    if (question.questionKey) return t(question.questionKey);
    return question.questionText || '';
  };

  const formatAnswerValue = (question, answer) => {
    if (!answer) return t('rivalAnalysis.pdf.noInfo');
    if (question.type === 'select') {
      const selectedOption = question.options?.find(opt => opt.key === answer);
      if (selectedOption) {
        return selectedOption.label.startsWith('rivalAnalysis.')
          ? t(selectedOption.label)
          : selectedOption.label;
      }
      return translateValue(answer) || answer;
    }
    if (question.type === 'formation') return normalizeFormation(answer);
    return translateValue(answer) || answer;
  };

  const renderQuestionAnswer = (questionLabel, answer, isTranslated = false) => {
    const displayValue = answer && String(answer).trim() !== ''
      ? (isTranslated ? translateValue(answer) : answer)
      : t('rivalAnalysis.pdf.noInfo');
    const hasValue = answer && String(answer).trim() !== '';
    return `
      <div class="question-row">
        <div class="question-label">${questionLabel}</div>
        <div class="question-value ${!hasValue ? 'no-value' : ''}">${displayValue}</div>
      </div>
    `;
  };

  const renderPlayersSection = (players, title) => {
    if (!players || players.length === 0) return '';
    return `
      <div class="players-section">
        <h4>${title} (${players.length})</h4>
        <div class="players-list">
${players.map(player => `
            <div class="player-item">
              <span class="player-name">${getPlayerFullName(player) || t('player.player')}</span>
              ${player.observacion ? `<span class="player-note">${player.observacion}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const renderOrphanedCustomAnswersPDF = (coveredKeys = []) => {
    const customAnswers = rivalAnalysis.customAnswers;
    if (!customAnswers || typeof customAnswers !== 'object') return '';
    return Object.entries(customAnswers)
      .filter(([key]) => !coveredKeys.includes(key))
      .map(([, value]) => {
        if (value?.videoId) {
          return `
            <div class="question-row">
              <div class="question-label">${t('rivalAnalysis.actions.video')}</div>
              <div class="question-value">
                <span class="formation-badge-inline" style="background: #f1f5f9; border-color: #cbd5e1; color: #334155;">📹 ${t('rivalAnalysis.actions.videoSaved')}</span>
              </div>
            </div>
          `;
        }
        if (value?.imageBase64) {
          return `
            <div class="section">
              <div class="section-header">
                <div class="section-title">${t('rivalAnalysis.actions.graphic')}</div>
              </div>
              <div style="text-align: center; margin: 8px 0;">
                <img src="${value.imageBase64}" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #e2e8f0;" />
              </div>
            </div>
          `;
        }
        return '';
      }).join('');
  };

  const renderDynamicQuestions = () => {
    if (!templateQuestions.length) {
      return `
        ${renderQuestionAnswer(t('rivalAnalysis.questions.q1'), rivalAnalysis.ladoDebilSalidaBalon, true)}
        ${renderQuestionAnswer(t('rivalAnalysis.questions.q2'), rivalAnalysis.generanPeligroPorDonde, true)}
        ${renderQuestionAnswer(t('rivalAnalysis.questions.q3'), rivalAnalysis.combinativoDirecto, true)}
        ${renderQuestionAnswer(t('rivalAnalysis.questions.q4'), rivalAnalysis.pressingAltura, true)}
        ${renderQuestionAnswer(t('rivalAnalysis.questions.q5'), rivalAnalysis.pressingPuntas)}
        ${renderQuestionAnswer(t('rivalAnalysis.questions.q6'), rivalAnalysis.pressingSaltanLineas)}
        ${renderQuestionAnswer(t('rivalAnalysis.questions.q7'), rivalAnalysis.ortjDefendiendo)}
        ${renderQuestionAnswer(t('rivalAnalysis.questions.q10'), rivalAnalysis.zonaSaquePortero)}
        ${renderQuestionAnswer(t('rivalAnalysis.questions.q11'), rivalAnalysis.cambioSistemaDerrota)}
        ${renderOrphanedCustomAnswersPDF([])}
      `;
    }

    const coveredKeys = templateQuestions.map(q => q.id);
    const questionsHtml = templateQuestions.map(question => {
      const answer = getAnswerValue(question);
      const questionText = getQuestionText(question);

      if (question.type === 'players') {
        if (!answer || answer.length === 0) return '';
        const iconColor = question.iconColor || '#3b82f6';
        return `
          <div class="players-section">
            <h4>${questionText} (${answer.length})</h4>
            <div class="players-list">
${answer.map(player => `
                <div class="player-item" style="border-left-color: #475569;">
                  <span class="player-name">${getPlayerFullName(player) || t('player.player')}</span>
                  ${player.observacion ? `<span class="player-note">${player.observacion}</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      if (question.type === 'text' && question.id === 'observaciones') {
        if (!answer) return '';
        return `
          <div class="section">
            <div class="section-header">
              <div class="section-title">${questionText}</div>
            </div>
            <div class="observations-box">
              <div class="observations-text">${answer}</div>
            </div>
          </div>
        `;
      }

      if (question.type === 'formation') {
        const displayValue = answer ? normalizeFormation(answer) : t('rivalAnalysis.pdf.noInfo');
        const hasValue = !!answer;
        return `
          <div class="question-row">
            <div class="question-label">${questionText}</div>
            <div class="question-value ${!hasValue ? 'no-value' : ''}">
              ${hasValue ? `<span class="formation-badge-inline">${displayValue}</span>` : displayValue}
            </div>
          </div>
        `;
      }

      if (question.type === 'graphic') {
        let graphicAnswer = answer;
        if (!graphicAnswer?.imageBase64 && rivalAnalysis.customAnswers) {
          const graphicEntry = Object.entries(rivalAnalysis.customAnswers).find(
            ([key, v]) => v?.imageBase64 && !coveredKeys.includes(key)
          );
          if (graphicEntry) {
            graphicAnswer = graphicEntry[1];
            coveredKeys.push(graphicEntry[0]);
          }
        }
        if (!graphicAnswer?.imageBase64) return '';
        return `
          <div class="section">
            <div class="section-header">
              <div class="section-title">${questionText}</div>
            </div>
            <div style="text-align: center; margin: 8px 0;">
              <img src="${graphicAnswer.imageBase64}" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #e2e8f0;" />
            </div>
          </div>
        `;
      }

      if (question.type === 'video') {
        let videoAnswer = answer;
        if (!videoAnswer?.videoId && rivalAnalysis.customAnswers) {
          const videoEntry = Object.entries(rivalAnalysis.customAnswers).find(
            ([key, v]) => v?.videoId && !coveredKeys.includes(key)
          );
          if (videoEntry) {
            videoAnswer = videoEntry[1];
            coveredKeys.push(videoEntry[0]);
          }
        }
        if (!videoAnswer?.videoId) return '';
        return `
          <div class="question-row">
            <div class="question-label">${questionText}</div>
            <div class="question-value">
              <span class="formation-badge-inline" style="background: #f1f5f9; border-color: #cbd5e1; color: #334155;">📹 ${t('rivalAnalysis.actions.videoSaved')}</span>
            </div>
          </div>
        `;
      }

      const displayValue = formatAnswerValue(question, answer);
      const hasValue = answer && String(answer).trim() !== '';
      return `
        <div class="question-row">
          <div class="question-label">${questionText}</div>
          <div class="question-value ${!hasValue ? 'no-value' : ''}">${displayValue}</div>
        </div>
      `;
    }).join('');

    return questionsHtml + renderOrphanedCustomAnswersPDF(coveredKeys);
  };

  const renderDynamicPlayersSection = () => {
    if (!templateQuestions.length) {
      return `
        ${renderPlayersSection(rivalAnalysis.jugadoresDestacados, t('rivalAnalysis.pdf.keyPlayers'))}
        ${renderPlayersSection(rivalAnalysis.jugadoresDebiles, t('rivalAnalysis.pdf.weakPlayers'))}
      `;
    }
    return '';
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${t('rivalAnalysis.pdf.title')} - ${rivalAnalysis.rival}</title>
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
          padding: 18px 24px;
          color: #ffffff;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.05);
        }
        .header-title {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        .section { margin-bottom: 16px; page-break-inside: avoid; }
        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 2px solid var(--primary);
        }
        .section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 800;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        
        .question-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
          margin-bottom: 6px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.01);
        }
        .question-label {
          font-weight: 600;
          color: var(--text-main);
          font-size: 9px;
        }
        .question-value {
          font-weight: 700;
          color: var(--primary);
          text-align: right;
          font-size: 9px;
        }
        .question-value.no-value {
          color: var(--text-muted);
          font-style: italic;
          font-weight: 400;
        }
        
        .formation-badge {
          display: inline-block;
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 13px;
          color: #ffffff;
          background: var(--accent);
          padding: 5px 12px;
          border-radius: 6px;
          text-transform: uppercase;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .formation-badge-inline {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 9px;
          color: var(--accent);
          background: #eff6ff;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid #bfdbfe;
        }
        
        .players-section { margin-top: 12px; page-break-inside: avoid; }
        .players-section h4 {
          font-family: 'Outfit', sans-serif;
          font-size: 9.5px;
          font-weight: 700;
          color: var(--secondary);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .players-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .player-item {
          display: flex;
          flex-direction: column;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-left: 3px solid var(--accent);
          border-radius: 6px;
          padding: 8px 10px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.01);
        }
        .player-name {
          font-weight: 700;
          color: var(--primary);
          font-size: 9.5px;
        }
        .player-note {
          font-size: 8.5px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        
        .observations-box {
          margin-top: 6px;
          padding: 10px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.01);
        }
        .observations-text {
          font-size: 9.5px;
          line-height: 1.5;
          color: var(--text-main);
        }
        
        .footer {
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid var(--border);
          text-align: center;
          color: var(--text-muted);
          font-size: 8px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="pdf-page">
        <div class="header">
          <h1 class="header-title">${t('rivalAnalysis.pdf.title')} — ${rivalAnalysis.rival}</h1>
        </div>

        ${rivalAnalysis.alineacion ? `
          <div class="section">
            <div class="section-header">
              <div class="section-title">${t('matchSheet.fields.rivalFormation')}</div>
            </div>
            <div style="margin-top: 4px;">
              <span class="formation-badge">${normalizeFormation(rivalAnalysis.alineacion)}</span>
            </div>
          </div>
        ` : ''}

        <div class="section">
          <div class="section-header">
            <div class="section-title">${t('rivalAnalysis.pdf.tacticalSection')}</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${renderDynamicQuestions()}
          </div>
        </div>

        ${renderDynamicPlayersSection()}

        <div class="footer">
          ${t('rivalAnalysis.pdf.generatedBy')} Xtramys
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function generateRivalAnalysisPdf(rivalAnalysis, template, t, selectedTeam) {
  if (!rivalAnalysis) return;
  const userTemplates = template ? [template] : [];
  const html = generateRivalAnalysisPDFHTML(rivalAnalysis, selectedTeam, t, userTemplates);
  const Print = await import('expo-print');
  const { savePdfToDownloads } = await import('@/utils/pdfDownload');
  const { uri } = await Print.printToFileAsync({ html });
  await savePdfToDownloads(uri, `rival-analysis-${rivalAnalysis.rival || 'report'}`);
}

