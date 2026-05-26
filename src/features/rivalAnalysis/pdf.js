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
                <span class="formation-badge-inline" style="background: #f0f9ff; border-color: #bae6fd; color: #0369a1;">📹 ${t('rivalAnalysis.actions.videoSaved')}</span>
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
                <div class="player-item" style="border-left-color: ${iconColor}">
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
              <span class="formation-badge-inline" style="background: #f0f9ff; border-color: #bae6fd; color: #0369a1;">📹 ${t('rivalAnalysis.actions.videoSaved')}</span>
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
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 11px;
          line-height: 1.5;
          color: #1e293b;
          padding: 24px;
          background: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e2e8f0;
        }
        .header-title {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }
        .section { margin-bottom: 20px; }
        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .section-icon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-size: 12px;
        }
        .question-row {
          display: flex;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .question-row:last-child { border-bottom: none; }
        .question-label {
          flex: 1;
          font-weight: 500;
          color: #475569;
          font-size: 11px;
        }
        .question-value {
          flex: 1;
          font-weight: 600;
          color: #1e293b;
          text-align: right;
        }
        .question-value.no-value {
          color: #94a3b8;
          font-style: italic;
          font-weight: 400;
        }
        .formation-badge {
          display: inline-block;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 4px 12px;
          border-radius: 16px;
          font-weight: 600;
          font-size: 12px;
          color: #475569;
        }
        .formation-badge-inline {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 11px;
          color: #166534;
        }
        .players-section { margin-top: 12px; }
        .players-section h4 {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
        }
        .players-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .player-item {
          display: flex;
          flex-direction: column;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 6px;
          border-left: 3px solid #3b82f6;
        }
        .player-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 11px;
        }
        .player-note {
          font-size: 10px;
          color: #64748b;
          margin-top: 2px;
        }
        .observations-box {
          background: #f8fafc;
          padding: 12px;
          border-radius: 8px;
          border-left: 3px solid #3b82f6;
          margin-top: 8px;
        }
        .observations-text {
          font-size: 11px;
          line-height: 1.6;
          color: #475569;
        }
        .footer {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #94a3b8;
          font-size: 9px;
        }
        @media print { body { padding: 16px; } @page { size: A4 portrait; margin: 12mm; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-title">${t('rivalAnalysis.pdf.title')} ${rivalAnalysis.rival}</div>
      </div>

      ${rivalAnalysis.alineacion ? `
        <div class="section">
          <div class="section-header">
            <div class="section-title">${t('matchSheet.fields.rivalFormation')}</div>
          </div>
          <div class="formation-badge">${normalizeFormation(rivalAnalysis.alineacion)}</div>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-header">
          <div class="section-title">${t('rivalAnalysis.pdf.tacticalSection')}</div>
        </div>
        ${renderDynamicQuestions()}
      </div>

      ${renderDynamicPlayersSection()}

      <div class="footer">
        ${t('rivalAnalysis.pdf.generatedBy')}
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
