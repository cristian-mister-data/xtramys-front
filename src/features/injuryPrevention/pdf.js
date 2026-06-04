import React from 'react';
import {
  Document, Page, Text, View,
  baseStyles, COLORS, SPACING, FONT_SIZE,
  PdfHeader, PdfFooter, PdfSection,
  renderPdf,
} from '@/utils/pdfDesign';

// ── Styles ─────────────────────────────────────────────────────────
const s = {
  introCols: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.base,
  },
  introBlock: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: SPACING.md,
    flex: 1,
  },
  introTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  introItem: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 1.5,
    marginBottom: 4,
    paddingLeft: SPACING.sm,
  },
  introBullet: {
    fontSize: FONT_SIZE.md,
    color: COLORS.accent,
    fontFamily: 'Helvetica-Bold',
    marginRight: 4,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  exerciseCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    borderRadius: 6,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  exerciseTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.3,
  },
  detailRow: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipsBox: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
    borderRadius: 4,
  },
  tipsLabel: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Helvetica-Bold',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipsText: {
    fontSize: FONT_SIZE.md,
    color: '#78350F',
    lineHeight: 1.5,
  },
};

// ── Document Component ─────────────────────────────────────────────
const InjuryPreventionDocument = ({ protocol, lang, t }) => {
  const title = protocol.title[lang];
  const totalExercises = protocol.sections.reduce(
    (acc, sec) => acc + sec.exercises.length,
    0,
  );
  const subtitle = `${protocol.sections.length} ${t('injuryPrevention.blocks')} | ${totalExercises} ${t('injuryPrevention.exercises')}`;
  const date = new Date().toLocaleDateString(
    lang === 'en' ? 'en-US' : 'es-ES',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );

  const hasRiskFactors = protocol.introduction?.risk_factors?.length > 0;
  const hasObjectives = protocol.introduction?.objectives?.length > 0;

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PdfHeader title={title} subtitle={subtitle} date={date} />
        <PdfFooter text="Xtramys Performance" />

        {/* Introduction */}
        {(hasRiskFactors || hasObjectives) && (
          <PdfSection
            title={
              protocol.introduction?.title?.[lang] ||
              t('injuryPrevention.introduction')
            }
          >
            <View style={s.introCols}>
              {hasRiskFactors && (
                <View style={s.introBlock}>
                  <Text style={s.introTitle}>
                    {t('injuryPrevention.riskFactors')}
                  </Text>
                  {protocol.introduction.risk_factors.map((f, i) => (
                    <View style={s.introRow} key={i}>
                      <Text style={s.introBullet}>•</Text>
                      <Text style={s.introItem}>{f[lang]}</Text>
                    </View>
                  ))}
                </View>
              )}
              {hasObjectives && (
                <View style={s.introBlock}>
                  <Text style={s.introTitle}>
                    {t('injuryPrevention.objectives')}
                  </Text>
                  {protocol.introduction.objectives.map((o, i) => (
                    <View style={s.introRow} key={i}>
                      <Text style={s.introBullet}>•</Text>
                      <Text style={s.introItem}>{o[lang]}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </PdfSection>
        )}

        {/* Sections & exercises */}
        {protocol.sections.map((section, sIdx) => (
          <PdfSection
            title={`${sIdx + 1}. ${section.title[lang]}`}
            key={sIdx}
          >
            {section.exercises.map((exercise, eIdx) => {
              const setupOk =
                exercise.setup?.[lang] && exercise.setup[lang] !== 'N/A';
              const tipsOk =
                exercise.tips?.[lang] && exercise.tips[lang].trim() !== '';

              return (
                <View style={s.exerciseCard} key={eIdx} wrap={false}>
                  <Text style={s.exerciseTitle}>
                    {sIdx + 1}.{eIdx + 1}. {exercise.name[lang]}
                  </Text>

                  {setupOk && (
                    <Text style={s.detailRow}>
                      <Text style={s.detailLabel}>
                        {t('injuryPrevention.setup')}:{' '}
                      </Text>
                      {exercise.setup[lang]}
                    </Text>
                  )}

                  <Text style={s.detailRow}>
                    <Text style={s.detailLabel}>
                      {t('injuryPrevention.execution')}:{' '}
                    </Text>
                    {exercise.execution[lang]}
                  </Text>

                  <Text style={s.detailRow}>
                    <Text style={s.detailLabel}>
                      {t('injuryPrevention.dosage')}:{' '}
                    </Text>
                    {exercise.dosage[lang]}
                  </Text>

                  {tipsOk && (
                    <View style={s.tipsBox}>
                      <Text style={s.tipsText}>
                        <Text style={s.tipsLabel}>
                          {t('injuryPrevention.tips')}:{' '}
                        </Text>
                        {exercise.tips[lang]}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </PdfSection>
        ))}
      </Page>
    </Document>
  );
};

// ── Public API ─────────────────────────────────────────────────────
export async function generateProtocolPdf(protocol, lang, t) {
  await renderPdf(
    <InjuryPreventionDocument protocol={protocol} lang={lang} t={t} />,
    `injury-prevention-${protocol.name || 'protocol'}`,
  );
}
