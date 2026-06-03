import { normalizeFormation } from './rivalAnalysisData';
import { getPlayerFullName } from '@/utils/playerHelpers';

const PAGE = {
  height: 1123,
  paddingY: 113,
  header: 68,
  footer: 32,
  get available() { return this.height - this.paddingY - this.header - this.footer; },
};

const H = {
  questionRow: 36,
  questionBase: 18,
  questionLine: 12,
  sectionHeader: 29,
  sectionMargin: 16,
  playerHeader: 22,
  playerGridGap: 8,
  playerItemRow: 40,
  obsPad: 22,
  obsLine: 14.25,
  formationBadge: 27,
};

function lineCount(text, charsPerLine = 120) {
  if (!text) return 0;
  const lines = text.split('\n');
  let total = 0;
  for (const line of lines) {
    total += Math.max(1, Math.ceil((line.length || 1) / charsPerLine));
  }
  return total;
}

function splitTextByLines(text, maxLines, charsPerLine = 95) {
  const source = String(text || '').trim();
  if (!source) return { first: '', second: '' };
  const words = source.split(/\s+/);
  let usedLines = 0;
  let take = 0;

  for (let i = 0; i < words.length; i++) {
    const wordLines = lineCount(words[i], charsPerLine);
    if (usedLines + wordLines > maxLines && take > 0) break;
    usedLines += Math.max(1, wordLines);
    take = i + 1;
    if (usedLines >= maxLines) break;
  }

  return {
    first: words.slice(0, take).join(' '),
    second: words.slice(take).join(' '),
  };
}

function distributeBlocks(blocks) {
  const pages = [];
  let page = [];
  let used = 0;
  const queue = blocks.filter(b => b && b.html);

  while (queue.length > 0) {
    const block = queue.shift();

    if (used + block.height <= PAGE.available) {
      page.push({ html: block.html, height: 0 });
      used += block.height;
      continue;
    }

    const canSplit = block.splittable && block.split && block.minHeight != null;
    const fitsAlone = block.height <= PAGE.available;
    const emptyPage = page.length === 0;

    if (!fitsAlone && canSplit) {
      const space = emptyPage ? PAGE.available : PAGE.available - used;
      if (emptyPage || space >= block.minHeight) {
        const { first, second } = block.split(space);
        if (first) {
          page.push({ html: first.html, height: 0 });
          used = PAGE.available;
        }
        pages.push(page);
        page = [];
        used = 0;
        if (second) queue.unshift(second);
        continue;
      }
    }

    if (emptyPage) {
      page.push({ html: block.html, height: 0 });
      used += block.height;
      continue;
    }

    pages.push(page);
    page = [];
    used = 0;
    queue.unshift(block);
  }

  if (page.length > 0) pages.push(page);
  return pages;
}

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

  const renderQuestionRow = (label, value, isTranslated = false) => {
    const displayValue = value && String(value).trim() !== ''
      ? (isTranslated ? translateValue(value) : value)
      : t('rivalAnalysis.pdf.noInfo');
    const hasValue = value && String(value).trim() !== '';

    const makeBlock = (remainingValue, cont) => {
      const valueText = String(remainingValue || '');
      const labelLines = cont ? 0 : lineCount(label, 52);
      const valueLines = lineCount(valueText, cont ? 112 : 72);
      const rowLines = Math.max(1, labelLines, valueLines);
      const height = Math.max(H.questionRow, H.questionBase + rowLines * H.questionLine);
      const minLines = Math.max(1, cont ? 1 : labelLines);
      const minHeight = Math.max(H.questionRow, H.questionBase + minLines * H.questionLine);

      return {
        html: cont
          ? `
            <div class="question-continuation ${!hasValue ? 'no-value' : ''}">${valueText}</div>
          `
          : `
            <div class="question-row">
              <div class="question-label">${label}</div>
              <div class="question-value ${!hasValue ? 'no-value' : ''}">${valueText}</div>
            </div>
          `,
        height,
        minHeight,
        splittable: hasValue && valueLines > 1,
        split: (remaining) => {
          const availableLines = Math.max(1, Math.floor((remaining - H.questionBase) / H.questionLine));
          const { first, second } = splitTextByLines(valueText, availableLines, cont ? 112 : 72);
          if (!first) return { first: null, second: null };
          return {
            first: makeBlock(first, cont),
            second: second ? makeBlock(second, true) : null,
          };
        },
      };
    };

    return makeBlock(displayValue, false);
  };

  const makePlayerGrid = (players) => players.map(p => `
    <div class="player-item">
      <span class="player-name">${getPlayerFullName(p) || t('player.player')}</span>
      ${p.observacion ? `<span class="player-note">${p.observacion}</span>` : ''}
    </div>
  `).join('');

  const buildPlayerBlock = (players, sectionTitle, totalCount) => {
    const perRow = 2;

    const makeBlock = (slice, cont) => {
      if (!slice || slice.length === 0) return null;
      const rows = Math.ceil(slice.length / perRow);
      const gridH = 4 + rows * (H.playerItemRow + H.playerGridGap);

      if (cont) {
        return {
          html: `
            <div class="players-section continuation">
              <div class="players-list">
                ${makePlayerGrid(slice)}
              </div>
            </div>
          `,
          height: gridH,
          minHeight: 4 + H.playerItemRow + H.playerGridGap,
          splittable: true,
          split: (remaining) => {
            const rowH = H.playerItemRow + H.playerGridGap;
            const availRows = Math.max(1, Math.floor((remaining - 4) / rowH));
            const take = availRows * perRow;
            const firstSlice = slice.slice(0, take);
            const rest = slice.slice(take);
            if (firstSlice.length === 0) return { first: null, second: null };
            return {
              first: makeBlock(firstSlice, true),
              second: rest.length > 0 ? makeBlock(rest, true) : null,
            };
          },
        };
      }

      return {
        html: `
          <div class="players-section">
            <h4>${sectionTitle} (${totalCount})</h4>
            <div class="players-list">
              ${makePlayerGrid(slice)}
            </div>
          </div>
        `,
        height: 26 + rows * (H.playerItemRow + H.playerGridGap),
        minHeight: 26 + H.playerItemRow + H.playerGridGap,
        splittable: true,
        split: (remaining) => {
          const rowH = H.playerItemRow + H.playerGridGap;
          const availRows = Math.max(1, Math.floor((remaining - 26) / rowH));
          const take = availRows * perRow;
          const firstSlice = slice.slice(0, take);
          const rest = slice.slice(take);
          if (firstSlice.length === 0) return { first: null, second: null };
          return {
            first: makeBlock(firstSlice, false),
            second: rest.length > 0 ? makeBlock(rest, true) : null,
          };
        },
      };
    };

    return makeBlock(players, false);
  };

  const buildObservationBlock = (text, questionText) => {
    const makeBlock = (remainingText, cont) => {
      if (!remainingText) return null;
      const lines = lineCount(remainingText);
      const textH = H.obsPad + lines * H.obsLine;

      if (cont) {
        return {
          html: `
            <div class="observations-box continuation">
              <div class="observations-text">${remainingText}</div>
            </div>
          `,
          height: textH,
          minHeight: H.obsPad + H.obsLine,
          splittable: true,
          split: (remaining) => {
            const lineH = H.obsLine;
            const availLines = Math.max(1, Math.floor((remaining - H.obsPad) / lineH));
            const words = remainingText.split(' ');
            let splitIdx = 0;
            let lineCountAcc = 0;
            for (let i = 0; i < words.length; i++) {
              const wl = lineCount(words[i]);
              if (lineCountAcc + wl > availLines) break;
              lineCountAcc += wl;
              splitIdx = i;
            }
            const firstText = words.slice(0, splitIdx + 1).join(' ');
            const secondText = words.slice(splitIdx + 1).join(' ');
            if (!firstText) return { first: null, second: null };
            return {
              first: makeBlock(firstText, true),
              second: secondText ? makeBlock(secondText, true) : null,
            };
          },
        };
      }

      return {
        html: `
          <div class="section">
            <div class="section-header">
              <div class="section-title">${questionText}</div>
            </div>
            <div class="observations-box">
              <div class="observations-text">${remainingText}</div>
            </div>
          </div>
        `,
        height: H.sectionHeader + H.sectionMargin + textH,
        minHeight: H.sectionHeader + H.sectionMargin + H.obsPad + H.obsLine,
        splittable: true,
        split: (remaining) => {
          const lineH = H.obsLine;
          const availLines = Math.max(1, Math.floor((remaining - H.sectionHeader - H.sectionMargin - H.obsPad) / lineH));
          const words = remainingText.split(' ');
          let splitIdx = 0;
          let lineCountAcc = 0;
          for (let i = 0; i < words.length; i++) {
            const wl = lineCount(words[i]);
            if (lineCountAcc + wl > availLines) break;
            lineCountAcc += wl;
            splitIdx = i;
          }
          const firstText = words.slice(0, splitIdx + 1).join(' ');
          const secondText = words.slice(splitIdx + 1).join(' ');
          if (!firstText) return { first: null, second: null };
          return {
            first: makeBlock(firstText, false),
            second: secondText ? makeBlock(secondText, true) : null,
          };
        },
      };
    };

    return makeBlock(text, false);
  };

  const renderGraphicBlock = (imageBase64, title) => ({
    html: `
      <div class="section">
        <div class="section-header">
          <div class="section-title">${title}</div>
        </div>
        <div class="graphic-container">
          <img src="${imageBase64}" class="graphic-img" />
        </div>
      </div>
    `,
    height: H.sectionHeader + H.sectionMargin + 300,
  });

  const renderVideoBlock = (title) => ({
    html: `
      <div class="question-row">
        <div class="question-label">${title}</div>
        <div class="question-value">
          <span class="formation-badge-inline" style="background: #f1f5f9; border-color: #cbd5e1; color: #334155;">📹 ${t('rivalAnalysis.actions.videoSaved')}</span>
        </div>
      </div>
    `,
    height: H.questionRow,
  });

  const contentBlocks = [];

  if (rivalAnalysis.alineacion) {
    contentBlocks.push({
      html: `
        <div class="section">
          <div class="section-header">
            <div class="section-title">${t('matchSheet.fields.rivalFormation')}</div>
          </div>
          <div style="margin-top: 4px;">
            <span class="formation-badge">${normalizeFormation(rivalAnalysis.alineacion)}</span>
          </div>
        </div>
      `,
      height: H.sectionHeader + H.sectionMargin + H.formationBadge + 4,
    });
  }

  if (!templateQuestions.length) {
    const legacyQuestions = [
      { label: t('rivalAnalysis.questions.q1'), value: rivalAnalysis.ladoDebilSalidaBalon, translated: true },
      { label: t('rivalAnalysis.questions.q2'), value: rivalAnalysis.generanPeligroPorDonde, translated: true },
      { label: t('rivalAnalysis.questions.q3'), value: rivalAnalysis.combinativoDirecto, translated: true },
      { label: t('rivalAnalysis.questions.q4'), value: rivalAnalysis.pressingAltura, translated: true },
      { label: t('rivalAnalysis.questions.q5'), value: rivalAnalysis.pressingPuntas },
      { label: t('rivalAnalysis.questions.q6'), value: rivalAnalysis.pressingSaltanLineas },
      { label: t('rivalAnalysis.questions.q7'), value: rivalAnalysis.ortjDefendiendo },
      { label: t('rivalAnalysis.questions.q10'), value: rivalAnalysis.zonaSaquePortero },
      { label: t('rivalAnalysis.questions.q11'), value: rivalAnalysis.cambioSistemaDerrota },
    ];
    for (const q of legacyQuestions) {
      contentBlocks.push(renderQuestionRow(q.label, q.value, q.translated));
    }

    const customAnswers = rivalAnalysis.customAnswers;
    if (customAnswers && typeof customAnswers === 'object') {
      for (const [, value] of Object.entries(customAnswers)) {
        if (value?.videoId) contentBlocks.push(renderVideoBlock(t('rivalAnalysis.actions.video')));
        if (value?.imageBase64) contentBlocks.push(renderGraphicBlock(value.imageBase64, t('rivalAnalysis.actions.graphic')));
      }
    }

    const d = rivalAnalysis.jugadoresDestacados;
    if (d && d.length > 0) {
      contentBlocks.push(buildPlayerBlock(d, t('rivalAnalysis.pdf.keyPlayers'), d.length));
    }
    const w = rivalAnalysis.jugadoresDebiles;
    if (w && w.length > 0) {
      contentBlocks.push(buildPlayerBlock(w, t('rivalAnalysis.pdf.weakPlayers'), w.length));
    }
  } else {
    const coveredKeys = templateQuestions.map(q => q.id);

    for (const question of templateQuestions) {
      const answer = getAnswerValue(question);
      const questionText = getQuestionText(question);

      if (question.type === 'players') {
        if (!answer || answer.length === 0) continue;
        contentBlocks.push(buildPlayerBlock(answer, questionText, answer.length));
        continue;
      }

      if (question.type === 'text' && question.id === 'observaciones') {
        if (!answer) continue;
        contentBlocks.push(buildObservationBlock(answer, questionText));
        continue;
      }

      if (question.type === 'graphic') {
        let graphicAnswer = answer;
        if (!graphicAnswer?.imageBase64 && rivalAnalysis.customAnswers) {
          const entry = Object.entries(rivalAnalysis.customAnswers).find(
            ([k, v]) => v?.imageBase64 && !coveredKeys.includes(k)
          );
          if (entry) {
            graphicAnswer = entry[1];
            coveredKeys.push(entry[0]);
          }
        }
        if (!graphicAnswer?.imageBase64) continue;
        contentBlocks.push(renderGraphicBlock(graphicAnswer.imageBase64, questionText));
        continue;
      }

      if (question.type === 'video') {
        let videoAnswer = answer;
        if (!videoAnswer?.videoId && rivalAnalysis.customAnswers) {
          const entry = Object.entries(rivalAnalysis.customAnswers).find(
            ([k, v]) => v?.videoId && !coveredKeys.includes(k)
          );
          if (entry) {
            videoAnswer = entry[1];
            coveredKeys.push(entry[0]);
          }
        }
        if (!videoAnswer?.videoId) continue;
        contentBlocks.push(renderVideoBlock(questionText));
        continue;
      }

      if (question.type === 'formation') {
        const displayValue = answer ? normalizeFormation(answer) : t('rivalAnalysis.pdf.noInfo');
        const hasValue = !!answer;
        contentBlocks.push({
          html: `
            <div class="question-row">
              <div class="question-label">${questionText}</div>
              <div class="question-value ${!hasValue ? 'no-value' : ''}">
                ${hasValue ? `<span class="formation-badge-inline">${displayValue}</span>` : displayValue}
              </div>
            </div>
          `,
          height: H.questionRow,
        });
        continue;
      }

      const displayValue = formatAnswerValue(question, answer);
      const hasValue = answer && String(answer).trim() !== '';
      contentBlocks.push(renderQuestionRow(questionText, hasValue ? displayValue : ''));
    }

    const customAnswers = rivalAnalysis.customAnswers;
    if (customAnswers && typeof customAnswers === 'object') {
      for (const [key, value] of Object.entries(customAnswers)) {
        if (coveredKeys.includes(key)) continue;
        if (value?.videoId) contentBlocks.push(renderVideoBlock(t('rivalAnalysis.actions.video')));
        if (value?.imageBase64) contentBlocks.push(renderGraphicBlock(value.imageBase64, t('rivalAnalysis.actions.graphic')));
      }
    }
  }

  const sectionHeaderBlock = {
    html: `
      <div class="section-header">
        <div class="section-title">${t('rivalAnalysis.pdf.tacticalSection')}</div>
      </div>
    `,
    height: H.sectionHeader,
  };

  const allBlocks = [sectionHeaderBlock, ...contentBlocks];
  const pages = distributeBlocks(allBlocks);

  const title = `${t('rivalAnalysis.pdf.title')} — ${rivalAnalysis.rival}`;
  const footerText = t('rivalAnalysis.pdf.generatedBy');

  const pageHtmls = pages.map((pageBlocks, pageIdx) => `
    <div class="pdf-page">
      <div class="header">
        <div class="header-left">
          <h1 class="header-title">${title}</h1>
          <span class="header-subtitle">Xtramys Performance Report</span>
        </div>
        ${pages.length > 1 ? `<span class="header-page">${pageIdx + 1}/${pages.length}</span>` : ''}
      </div>

      <div class="content">
        ${pageBlocks.map(b => b.html).join('')}
      </div>

      <div class="footer">
        ${footerText} Xtramys ${pages.length > 1 ? `— ${pageIdx + 1}/${pages.length}` : ''}
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-main: #f8fafc;
          --bg-card: #ffffff;
          --primary: #0f172a;
          --secondary: #1e293b;
          --accent: #2563eb;
          --text-main: #334155;
          --text-muted: #475569;
          --border: #e2e8f0;
          --border-dark: #cbd5e1;
        }

        @page {
          size: A4;
          margin: 0;
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
          letter-spacing: 0.2px;
        }

        .pdf-page {
          width: 210mm;
          height: 297mm;
          padding: 15mm 16mm;
          box-sizing: border-box;
          position: relative;
          display: flex;
          flex-direction: column;
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
          flex-shrink: 0;
        }
        .header-left {
          display: flex;
          flex-direction: column;
          text-align: left;
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
        .header-page {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 800;
          color: #60a5fa;
          text-transform: uppercase;
          letter-spacing: 1.2px;
        }

        .content {
          flex: 1;
        }

        .section { margin-bottom: 16px; }
        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 5px;
          border-bottom: 2px solid var(--primary);
        }
        .section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 900;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .question-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          margin-bottom: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          page-break-inside: avoid;
        }
        .question-label {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          color: var(--text-main);
          font-size: 9px;
          flex: 1;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .question-value {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          color: var(--primary);
          text-align: right;
          font-size: 9px;
          flex-shrink: 0;
          max-width: 60%;
          margin-left: 12px;
          overflow-wrap: anywhere;
        }
        .question-value.no-value,
        .question-continuation.no-value {
          color: var(--text-muted);
          font-style: italic;
          font-weight: 400;
        }
        .question-continuation {
          padding: 10px 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          margin-bottom: 8px;
          font-weight: 700;
          color: var(--primary);
          font-size: 9px;
          line-height: 1.5;
          overflow-wrap: anywhere;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          page-break-inside: avoid;
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

        .players-section { margin-top: 12px; }
        .players-section h4 {
          font-family: 'Outfit', sans-serif;
          font-size: 9.5px;
          font-weight: 800;
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
          border-left: 4px solid var(--accent);
          border-radius: 8px;
          padding: 10px 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          page-break-inside: avoid;
        }
        .player-name {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          color: var(--primary);
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .player-note {
          font-family: 'Inter', sans-serif;
          font-size: 8.5px;
          color: var(--text-muted);
          margin-top: 3px;
          line-height: 1.4;
        }

        .observations-box {
          margin-top: 8px;
          padding: 12px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          page-break-inside: avoid;
        }
        .observations-text {
          font-family: 'Inter', sans-serif;
          font-size: 9.5px;
          line-height: 1.5;
          color: var(--text-main);
          white-space: pre-wrap;
          letter-spacing: 0.2px;
        }

        .graphic-container {
          text-align: center;
          margin: 8px 0;
        }
        .graphic-img {
          max-width: 100%;
          max-height: 350px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .footer {
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid var(--border);
          text-align: center;
          color: var(--text-muted);
          font-size: 8.5px;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          flex-shrink: 0;
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      ${pageHtmls}
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
