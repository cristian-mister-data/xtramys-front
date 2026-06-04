// src/vendor/wellness/pdf.js
import React from 'react';
import {
  Document, Page, Text, View, StyleSheet,
  baseStyles, COLORS, SPACING, FONT_SIZE, PdfHeader, PdfFooter, PdfSection, renderPdf
} from '@/utils/pdfDesign';

const s = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryItem: {
    flex: 1,
    padding: SPACING.base,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  summarySub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  th: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  td: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
  },
  scoreCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
  },
  qaList: {
    flexDirection: 'column',
    gap: 4,
  },
  qaItem: {
    borderLeftWidth: 1.5,
    borderLeftColor: COLORS.borderDark,
    paddingLeft: 6,
    marginBottom: 2,
  },
  qText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    fontFamily: 'Helvetica-Oblique',
  },
  aText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  noAnswersText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontFamily: 'Helvetica-Oblique',
  },
  sessionSectionHeader: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
});

const getLocaleDateString = (dateStr, lang) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getLocaleDateTimeString = (dateStr, lang) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// --- SINGLE SESSION REPORT DOCUMENT ---
const WellnessSessionDocument = ({ session, expectedScore, data, t, lang, isPreWellness }) => {
  const dateStr = getLocaleDateString(session?.fecha, lang);
  const teamName = session?.equipo?.nombre || session?.teamName || '';
  const reportTitle = isPreWellness
    ? (t('session.preWellnessReport') || 'INFORME PRE-WELLNESS')
    : (t('session.wellnessReport') || 'INFORME WELLNESS');

  const diffScore = expectedScore && data.averageWellness
    ? (data.averageWellness - expectedScore).toFixed(1)
    : null;

  const diffLabel = diffScore
    ? (Math.abs(diffScore) <= 0.5
      ? (t('session.objectiveMet') || 'Cumplido')
      : (parseFloat(diffScore) > 0
        ? (t('session.above') || 'Por arriba')
        : (t('session.below') || 'Por debajo')))
    : '';

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PdfHeader
          title={reportTitle}
          subtitle={`${t('session.trainingOf') || 'Entrenamiento de'} ${dateStr}`}
          right={teamName}
        />

        {/* Metrics Grid */}
        <View style={s.summaryGrid}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('session.expectedWellness') || 'Esperado'}</Text>
            <Text style={s.summaryVal}>{expectedScore || '-'}</Text>
            <Text style={s.summarySub}>{t('session.coachObjective') || 'Objetivo Entrenador'}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('session.averageObtained') || 'Media'}</Text>
            <Text style={s.summaryVal}>{data.averageWellness?.toFixed(1) || '-'}</Text>
            <Text style={s.summarySub}>{t('session.averageResponses') || 'Media Respuestas'}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('session.totalResponses') || 'Respuestas'}</Text>
            <Text style={s.summaryVal}>{data.totalResponses || 0}</Text>
            <Text style={s.summarySub}>{t('session.players') || 'Jugadores'}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('session.difference') || 'Diferencia'}</Text>
            <Text style={s.summaryVal}>{diffScore ? `${parseFloat(diffScore) > 0 ? '+' : ''}${diffScore}` : '-'}</Text>
            <Text style={s.summarySub}>{diffLabel}</Text>
          </View>
        </View>

        {/* Responses Table */}
        <PdfSection title={t('session.responses') || 'RESPUESTAS DE JUGADORES'}>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: '25%' }]}>{t('session.player') || 'JUGADOR'}</Text>
              <Text style={[s.th, { width: '15%', textAlign: 'center' }]}>{isPreWellness ? 'PRE-WELLNESS' : 'WELLNESS'}</Text>
              <Text style={[s.th, { width: '45%' }]}>{t('session.responses') || 'RESPUESTAS'}</Text>
              <Text style={[s.th, { width: '15%', textAlign: 'right' }]}>{t('session.date') || 'FECHA'}</Text>
            </View>
            {(data.responses || []).map((r, idx) => (
              <View key={idx} style={s.tableRow} wrap={false}>
                <Text style={[s.td, { width: '25%', fontFamily: 'Helvetica-Bold' }]}>{r.playerName}</Text>
                <View style={[s.scoreCell, { width: '15%' }]}>
                  <Text style={s.scoreText}>{r.preWellnessScore ?? r.wellness ?? '-'}</Text>
                </View>
                <View style={[s.td, { width: '45%' }]}>
                  {r.questionResponses && r.questionResponses.length > 0 ? (
                    <View style={s.qaList}>
                      {r.questionResponses.filter(qr => qr.answer).map((qr, qIdx) => (
                        <View key={qIdx} style={s.qaItem}>
                          <Text style={s.qText}>{qr.question}</Text>
                          <Text style={s.aText}>{qr.answer}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={s.noAnswersText}>{t('session.noAdditionalResponses') || 'Sin respuestas adicionales'}</Text>
                  )}
                </View>
                <Text style={[s.td, { width: '15%', textAlign: 'right', fontSize: 7, color: COLORS.textSecondary }]}>
                  {getLocaleDateTimeString(r.submittedAt, lang)}
                </Text>
              </View>
            ))}
          </View>
        </PdfSection>

        <PdfFooter text={`Xtramys Performance · ${t('player.profile.generatedAt')}: ${getLocaleDateTimeString(new Date(), lang)}`} />
      </Page>
    </Document>
  );
};

// --- RANGE REPORT DOCUMENT ---
const WellnessRangeDocument = ({ sessions, fromStr, toStr, teamName, totalResponses, avgScore, t, lang, isPreWellness }) => {
  const reportTitle = isPreWellness
    ? (t('session.preWellnessReport') || 'INFORME PRE-WELLNESS')
    : (t('session.wellnessReport') || 'INFORME WELLNESS');

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PdfHeader
          title={reportTitle}
          subtitle={`${fromStr} - ${toStr}`}
          right={teamName}
        />

        {/* Metrics Grid */}
        <View style={s.summaryGrid}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('wellness.sessionsCount') || 'Sesiones'}</Text>
            <Text style={s.summaryVal}>{sessions.length}</Text>
            <Text style={s.summarySub}>{t('wellness.sessions') || 'Sesiones evaluadas'}</Text>
          </View>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('session.totalResponses') || 'Respuestas Totales'}</Text>
            <Text style={s.summaryVal}>{totalResponses || 0}</Text>
            <Text style={s.summarySub}>{t('session.players') || 'Jugadores'}</Text>
          </View>
          {!isPreWellness && avgScore ? (
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>{t('session.averageWellness') || 'Media Wellness'}</Text>
              <Text style={s.summaryVal}>{avgScore}</Text>
              <Text style={s.summarySub}>{t('session.averageObtained') || 'Media General'}</Text>
            </View>
          ) : null}
        </View>

        {/* Render Session Tables */}
        {sessions.map((session, sIdx) => {
          const sessionDateStr = getLocaleDateString(session.fecha, lang);
          const avg = isPreWellness ? session.averageScore : session.averageWellness;
          const sectionTitle = `📅 ${sessionDateStr} ${session.horaInicio ? `(${session.horaInicio}${session.horaFin ? ' - ' + session.horaFin : ''})` : ''} ${avg ? ` — ${t('session.average') || 'Media'}: ${avg}` : ''}`;
          
          return (
            <View key={sIdx} wrap={false} style={{ marginBottom: SPACING.md }}>
              <Text style={s.sessionSectionHeader}>{sectionTitle}</Text>
              <View style={s.table}>
                <View style={s.tableHeader}>
                  <Text style={[s.th, { width: isPreWellness ? '30%' : '25%' }]}>{t('session.player') || 'JUGADOR'}</Text>
                  {!isPreWellness ? <Text style={[s.th, { width: '12%', textAlign: 'center' }]}>WELLNESS</Text> : null}
                  <Text style={[s.th, { width: isPreWellness ? '70%' : '63%' }]}>{t('session.responses') || 'RESPUESTAS'}</Text>
                </View>
                {(session.responses || []).map((r, rIdx) => {
                  const score = isPreWellness ? r.preWellnessScore : r.wellness;
                  return (
                    <View key={rIdx} style={s.tableRow} wrap={false}>
                      <Text style={[s.td, { width: isPreWellness ? '30%' : '25%', fontFamily: 'Helvetica-Bold' }]}>{r.playerName}</Text>
                      {!isPreWellness ? (
                        <View style={[s.scoreCell, { width: '12%' }]}>
                          <Text style={s.scoreText}>{score || '-'}</Text>
                        </View>
                      ) : null}
                      <View style={[s.td, { width: isPreWellness ? '70%' : '63%' }]}>
                        {r.questionResponses && r.questionResponses.length > 0 ? (
                          <View style={s.qaList}>
                            {r.questionResponses.filter(qr => qr.answer).map((qr, qIdx) => (
                              <View key={qIdx} style={s.qaItem}>
                                <Text style={s.qText}>{qr.question}</Text>
                                <Text style={s.aText}>{qr.answer}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={s.noAnswersText}>-</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        <PdfFooter text={`Xtramys Performance · ${t('player.profile.generatedAt')}: ${getLocaleDateTimeString(new Date(), lang)}`} />
      </Page>
    </Document>
  );
};

// --- PUBLIC METHODS ---

export async function generateWellnessSessionPdf(session, expectedScore, data, t, lang, isPreWellness) {
  const dateStr = getLocaleDateString(session?.fecha, lang);
  const filePrefix = isPreWellness ? 'prewellness_entrenamiento' : 'wellness_entrenamiento';
  const fileName = `${filePrefix}_${dateStr.replace(/\//g, '-')}`;
  
  await renderPdf(
    <WellnessSessionDocument
      session={session}
      expectedScore={expectedScore}
      data={data}
      t={t}
      lang={lang}
      isPreWellness={isPreWellness}
    />,
    fileName
  );
}

export async function generateWellnessRangePdf(sessions, fromStr, toStr, teamName, totalResponses, avgScore, t, lang, isPreWellness) {
  const filePrefix = isPreWellness ? 'prewellness' : 'wellness';
  const fileName = `${filePrefix}_${fromStr.replace(/\//g, '-')}_${toStr.replace(/\//g, '-')}`;

  await renderPdf(
    <WellnessRangeDocument
      sessions={sessions}
      fromStr={fromStr}
      toStr={toStr}
      teamName={teamName}
      totalResponses={totalResponses}
      avgScore={avgScore}
      t={t}
      lang={lang}
      isPreWellness={isPreWellness}
    />,
    fileName
  );
}
