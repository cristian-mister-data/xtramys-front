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

export function generateProtocolPdf(protocol, lang, t) {
  let sectionsHtml = '';
  protocol.sections.forEach((section, sectionIndex) => {
    sectionsHtml += `
      <div class="section">
        <h2>${sectionIndex + 1}. ${escapeHtml(section.title[lang])}</h2>
        <div class="exercises">`;
    section.exercises.forEach((exercise, exerciseIndex) => {
      const setupOk = exercise.setup?.[lang] && exercise.setup[lang] !== 'N/A';
      const tipsOk = exercise.tips?.[lang] && exercise.tips[lang].trim() !== '';
      sectionsHtml += `
        <div class="exercise">
          <h3>${sectionIndex + 1}.${exerciseIndex + 1}. ${escapeHtml(exercise.name[lang])}</h3>
          ${setupOk ? `<div class="detail"><span class="label">${escapeHtml(t('injuryPrevention.setup'))}:</span> <span class="value">${escapeHtml(exercise.setup[lang])}</span></div>` : ''}
          <div class="detail"><span class="label">${escapeHtml(t('injuryPrevention.execution'))}:</span> <span class="value">${escapeHtml(exercise.execution[lang])}</span></div>
          <div class="detail"><span class="label">${escapeHtml(t('injuryPrevention.dosage'))}:</span> <span class="value">${escapeHtml(exercise.dosage[lang])}</span></div>
          ${tipsOk ? `<div class="detail tips"><span class="label">${escapeHtml(t('injuryPrevention.tips'))}:</span> <span class="value">${escapeHtml(exercise.tips[lang])}</span></div>` : ''}
        </div>`;
    });
    sectionsHtml += `</div></div>`;
  });

  let riskFactorsHtml = '';
  if (protocol.introduction?.risk_factors?.length > 0) {
    riskFactorsHtml = `<div class="intro-block"><h3>${escapeHtml(t('injuryPrevention.riskFactors'))}</h3><ul>${protocol.introduction.risk_factors.map((f) => `<li>${escapeHtml(f[lang])}</li>`).join('')}</ul></div>`;
  }

  let objectivesHtml = '';
  if (protocol.introduction?.objectives?.length > 0) {
    objectivesHtml = `<div class="intro-block"><h3>${escapeHtml(t('injuryPrevention.objectives'))}</h3><ul>${protocol.introduction.objectives.map((o) => `<li>${escapeHtml(o[lang])}</li>`).join('')}</ul></div>`;
  }

  const totalExercises = protocol.sections.reduce((acc, s) => acc + s.exercises.length, 0);

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${escapeHtml(protocol.title[lang])}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11pt;line-height:1.5;color:#1a1a1a;padding:40px;}
.header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #333;}
.header h1{font-size:22pt;font-weight:700;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;}
.header .stats{font-size:10pt;color:#555;}
.intro-section{margin-bottom:25px;padding:15px;background-color:#f9f9f9;border-left:3px solid #333;}
.intro-section h2{font-size:14pt;margin-bottom:12px;}
.intro-block{margin-bottom:15px;}
.intro-block:last-child{margin-bottom:0;}
.intro-block h3{font-size:11pt;font-weight:600;margin-bottom:8px;}
.intro-block ul{margin-left:20px;}
.intro-block li{margin-bottom:5px;}
.section{margin-bottom:25px;page-break-inside:avoid;}
.section h2{font-size:14pt;font-weight:700;padding:10px 0;border-bottom:1px solid #ccc;margin-bottom:15px;}
.exercises{padding-left:10px;}
.exercise{margin-bottom:18px;padding-bottom:15px;border-bottom:1px dotted #ddd;}
.exercise:last-child{border-bottom:none;}
.exercise h3{font-size:12pt;font-weight:600;margin-bottom:10px;}
.detail{margin-bottom:6px;padding-left:15px;}
.detail .label{font-weight:600;}
.detail.tips{font-style:italic;margin-top:8px;}
.footer{margin-top:30px;padding-top:15px;border-top:1px solid #ccc;text-align:center;font-size:9pt;color:#777;}
@media print{body{padding:20px;}.section{page-break-inside:avoid;}@page{size:A4;margin:14mm;}}
</style></head>
<body>
<div class="header">
  <h1>${escapeHtml(protocol.title[lang])}</h1>
  <div class="stats">${protocol.sections.length} ${escapeHtml(t('injuryPrevention.blocks'))} | ${totalExercises} ${escapeHtml(t('injuryPrevention.exercises'))}</div>
</div>
${(riskFactorsHtml || objectivesHtml) ? `<div class="intro-section"><h2>${escapeHtml(protocol.introduction?.title?.[lang] || t('injuryPrevention.introduction'))}</h2>${riskFactorsHtml}${objectivesHtml}</div>` : ''}
${sectionsHtml}
<div class="footer">${escapeHtml(t('injuryPrevention.pdfGeneratedBy'))} Xtramys - ${new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}</div>
<script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
