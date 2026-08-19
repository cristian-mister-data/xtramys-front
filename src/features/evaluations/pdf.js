import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  baseStyles,
  COLORS,
  SPACING,
  FONT_SIZE,
  PdfHeader,
  PdfFooter,
  PdfSection,
  PdfQuestionRow,
  renderPdf,
} from '@/utils/pdfDesign';

const s = StyleSheet.create({
  scoreCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: FONT_SIZE.header,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
});

export async function generateEvaluationPdf(evaluation, template, t, teamName = 'Xtramys') {
  if (!evaluation) return;

  const isGeneral = evaluation.scope === 'GENERAL';
  const title = isGeneral
    ? 'EVALUACIÓN GENERAL DE EQUIPO'
    : `INFORME DE EVALUACIÓN: ${evaluation.playerName || 'JUGADOR'}`;

  const subtitle = `${evaluation.templateName || 'Plantilla de Evaluación'} · ${teamName}`;
  const dateStr = evaluation.date || new Date().toISOString().split('T')[0];

  const questions = template?.questions || [];
  const scoreVal = evaluation.overallScore !== null && evaluation.overallScore !== undefined
    ? `${evaluation.overallScore} / 10`
    : 'Sin Nota';

  const doc = (
    <Document title={`Evaluación - ${evaluation.playerName || 'General'} - ${dateStr}`}>
      <Page size="A4" style={baseStyles.page}>
        <PdfHeader
          title={title}
          subtitle={subtitle}
          date={`Fecha: ${dateStr}`}
          right={scoreVal}
        />

        {/* General Summary Grid */}
        <View style={s.metaGrid}>
          <View style={baseStyles.statCard}>
            <Text style={baseStyles.statLabel}>Ámbito</Text>
            <Text style={baseStyles.statValue}>
              {isGeneral ? 'GENERAL' : 'INDIVIDUAL'}
            </Text>
            <Text style={baseStyles.statSub}>{isGeneral ? 'Equipo / Grupo' : 'Por Jugador'}</Text>
          </View>

          <View style={baseStyles.statCard}>
            <Text style={baseStyles.statLabel}>Evaluado / Sujeto</Text>
            <Text style={baseStyles.statValue}>
              {evaluation.playerName || 'Equipo'}
            </Text>
            {evaluation.playerDorsal ? (
              <Text style={baseStyles.statSub}>Dorsal #{evaluation.playerDorsal}</Text>
            ) : null}
          </View>

          <View style={baseStyles.statCard}>
            <Text style={baseStyles.statLabel}>Nota Ponderada</Text>
            <Text style={[baseStyles.statValue, { color: COLORS.accent }]}>
              {scoreVal}
            </Text>
            <Text style={baseStyles.statSub}>Escala 1 al 10</Text>
          </View>
        </View>

        {/* Questions and Answers Section */}
        <PdfSection title="Cuestionario de Evaluación">
          {questions.map((q, idx) => {
            const val = evaluation.answers?.[q.id];
            let displayVal = 'Sin responder';

            if (val !== undefined && val !== null && val !== '') {
              if (q.type === 'rating10') {
                displayVal = `${val} / 10`;
              } else if (q.type === 'stars5') {
                displayVal = `${val} / 5 Estrellas`;
              } else if (q.type === 'boolean') {
                displayVal = val ? 'Sí / Afirmativo' : 'No / Negativo';
              } else if (q.type === 'select') {
                const optMatch = (q.options || []).find((o) => (typeof o === 'object' ? o.key : o) === val);
                displayVal = optMatch ? (optMatch.label || optMatch.key || val) : val;
              } else if (q.type === 'multiSelect' && Array.isArray(val)) {
                const selectedLabels = val.map((k) => {
                  const optMatch = (q.options || []).find((o) => (typeof o === 'object' ? o.key : o) === k);
                  return optMatch ? (optMatch.label || optMatch.key || k) : k;
                });
                displayVal = selectedLabels.join(', ');
              } else {
                displayVal = String(val);
              }
            }

            return (
              <PdfQuestionRow
                key={q.id || idx}
                label={`${idx + 1}. ${q.questionText}`}
                value={displayVal}
                noValue={val === undefined || val === null || val === ''}
              />
            );
          })}
        </PdfSection>

        {/* General Notes Section */}
        {evaluation.generalNotes ? (
          <PdfSection title="Observaciones Adicionales">
            <View style={baseStyles.obsBox}>
              <Text style={baseStyles.obsText}>{evaluation.generalNotes}</Text>
            </View>
          </PdfSection>
        ) : null}

        <PdfFooter text="Xtramys Performance · Informe Oficial de Evaluación" />
      </Page>
    </Document>
  );

  const safeFileName = `evaluacion_${evaluation.playerName || 'general'}_${dateStr}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_');

  await renderPdf(doc, safeFileName);
}
