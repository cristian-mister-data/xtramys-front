// Generador de PDF para Rival Analysis. Sigue el patrón de
// features/methodology/pdf.js: construye un HTML completo y lo abre en una
// ventana para usar el "Guardar como PDF" del navegador.
import {
  KNOWN_FIELDS,
  normalizeFormation,
  translateEnum,
  resolveOptionLabel,
  getQuestionText,
} from './rivalAnalysisData';

const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function getAnswerValue(rivalAnalysis, question) {
  if (!question) return undefined;
  if (KNOWN_FIELDS.includes(question.id)) return rivalAnalysis[question.id];
  return rivalAnalysis.customAnswers?.[question.id];
}

function formatAnswerValue(question, answer, t) {
  if (answer == null || answer === '') return null;
  if (question.type === 'select') {
    const opt = question.options?.find((o) => o.key === answer);
    if (opt) return resolveOptionLabel(opt, t);
    return translateEnum(answer, t);
  }
  if (question.type === 'formation') return normalizeFormation(answer);
  return translateEnum(answer, t);
}

function renderQuestionRow(label, value, noInfo) {
  const has = value != null && String(value).trim() !== '';
  return `
    <div class="row">
      <div class="row-label">${esc(label)}</div>
      <div class="row-value ${has ? '' : 'no-value'}">${has ? esc(value) : esc(noInfo)}</div>
    </div>
  `;
}

function renderPlayers(players, title) {
  if (!Array.isArray(players) || players.length === 0) return '';
  return `
    <div class="players">
      <h4>${esc(title)} (${players.length})</h4>
      ${players
        .map(
          (p) => `
        <div class="player">
          <span class="player-name">${esc(p.nombre || p.name || '')}</span>
          ${p.observacion ? `<span class="player-note">${esc(p.observacion)}</span>` : ''}
        </div>`
        )
        .join('')}
    </div>
  `;
}

function renderQuestions(rivalAnalysis, template, t) {
  const noInfo = t('rivalAnalysis.pdf.noInfo', 'Sin información');
  const questions = template?.questions
    ? [...template.questions].sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];

  if (questions.length === 0) {
    // fallback: render KNOWN_FIELDS si no hay plantilla
    return KNOWN_FIELDS.filter((k) => k !== 'jugadoresDestacados' && k !== 'jugadoresDebiles')
      .map((k) => renderQuestionRow(t(`rivalAnalysis.fields.${k}`, k), rivalAnalysis[k], noInfo))
      .join('');
  }

  return questions
    .map((q) => {
      const label = getQuestionText(q, t);
      const value = getAnswerValue(rivalAnalysis, q);

      if (q.type === 'players') {
        return renderPlayers(Array.isArray(value) ? value : [], label);
      }
      if (q.type === 'graphic') {
        if (value?.imageBase64) {
          return `
            <div class="section">
              <div class="section-title">${esc(label)}</div>
              <div style="text-align:center;margin:8px 0;">
                <img src="${value.imageBase64}" style="max-width:100%;max-height:420px;border-radius:8px;border:1px solid #e2e8f0;" />
              </div>
            </div>`;
        }
        return renderQuestionRow(label, '', noInfo);
      }
      if (q.type === 'video') {
        const has = value?.videoId || value?.url;
        return `
          <div class="row">
            <div class="row-label">${esc(label)}</div>
            <div class="row-value">
              ${
                has
                  ? `<span class="badge">📹 ${esc(t('rivalAnalysis.actions.videoSaved', 'Vídeo guardado'))}</span>`
                  : `<span class="no-value">${esc(noInfo)}</span>`
              }
            </div>
          </div>`;
      }
      if (q.type === 'text' && q.id === 'observaciones') {
        return `
          <div class="section">
            <div class="section-title">${esc(label)}</div>
            <div class="observations">${esc(value || noInfo)}</div>
          </div>`;
      }
      const formatted = formatAnswerValue(q, value, t);
      return renderQuestionRow(label, formatted ?? '', noInfo);
    })
    .join('');
}

export function generateRivalAnalysisPdf(rivalAnalysis, template, t, selectedTeam) {
  if (!rivalAnalysis) return;

  const title = t('rivalAnalysis.pdf.title', 'Análisis del Rival');
  const generatedBy = t('rivalAnalysis.pdf.generatedBy', 'Generado por Xtramys');
  const formation = normalizeFormation(rivalAnalysis.alineacion);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} - ${esc(rivalAnalysis.rival || '')}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      margin: 0; padding: 24px; background: #fff; color: #1f2937; }
    .header { background: linear-gradient(135deg, #1a237e, #3949ab); color: #fff;
      padding: 22px 26px; border-radius: 12px; margin-bottom: 18px; }
    .header h1 { margin: 0 0 4px; font-size: 22px; }
    .header .meta { font-size: 13px; opacity: 0.9; }
    .formation-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 14px 18px; margin-bottom: 14px; display: flex; align-items: center;
      justify-content: space-between; }
    .formation-badge { background: #eef2ff; color: #3949ab; padding: 6px 14px;
      border-radius: 999px; font-weight: 700; font-size: 14px; }
    .section { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 14px 18px; margin-bottom: 12px; }
    .section-title { font-weight: 700; color: #1a237e; margin-bottom: 8px; font-size: 14px; }
    .observations { white-space: pre-wrap; line-height: 1.45; font-size: 13px; }
    .row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .row:last-child { border-bottom: 0; }
    .row-label { flex: 1; color: #475569; font-size: 13px; }
    .row-value { flex: 1.2; font-weight: 600; font-size: 13px; color: #0f172a; }
    .row-value.no-value { color: #94a3b8; font-style: italic; font-weight: 400; }
    .badge { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd;
      padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .players { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 14px 18px; margin-bottom: 12px; }
    .players h4 { margin: 0 0 8px; color: #1a237e; font-size: 14px; }
    .player { padding: 6px 0; border-bottom: 1px solid #f1f5f9;
      display: flex; gap: 8px; align-items: baseline; }
    .player:last-child { border-bottom: 0; }
    .player-name { font-weight: 600; }
    .player-note { color: #64748b; font-size: 12px; }
    .footer { margin-top: 22px; text-align: center; color: #94a3b8; font-size: 11px; }
    @media print {
      @page { size: A4 portrait; margin: 12mm; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${esc(title)}</h1>
    <div class="meta">${esc(rivalAnalysis.rival || '')}${selectedTeam?.nombre ? ' &middot; ' + esc(selectedTeam.nombre) : ''}</div>
  </div>

  ${
    formation
      ? `<div class="formation-card">
          <span>${esc(t('rivalAnalysis.fields.alineacion', 'Alineación'))}</span>
          <span class="formation-badge">${esc(formation)}</span>
        </div>`
      : ''
  }

  ${renderQuestions(rivalAnalysis, template, t)}

  <div class="footer">${esc(generatedBy)} &middot; ${new Date().toLocaleDateString()}</div>

  <script>window.onload = function () { setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
