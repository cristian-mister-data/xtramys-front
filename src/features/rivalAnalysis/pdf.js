import React from 'react';
import {
  Document, Page, Text, View, Image,
  baseStyles, COLORS, SPACING, FONT_SIZE,
  PdfHeader, PdfFooter, PdfSection, PdfQuestionRow,
  renderPdf,
} from '@/utils/pdfDesign';
import { normalizeFormation } from './rivalAnalysisData';
import { getPlayerFullName } from '@/utils/playerHelpers';
import { resolvePlayableVideoUrl } from '@/utils/videoPlayback';

// ── Styles ─────────────────────────────────────────────────────────
const s = {
  formationBadge: {
    backgroundColor: COLORS.accent,
    color: COLORS.white,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Helvetica-Bold',
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
  },
  formationBadgeInline: {
    backgroundColor: COLORS.accentLight,
    color: COLORS.accent,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: FONT_SIZE.base,
    fontFamily: 'Helvetica-Bold',
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    textAlign: 'center',
  },
  playersSection: { marginTop: SPACING.sm, marginBottom: SPACING.sm },
  playersTitle: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  graphicContainer: { alignItems: 'center', marginVertical: SPACING.sm },
  graphicImg: { maxHeight: 250, maxWidth: '100%', objectFit: 'contain', borderRadius: 6 },
  videoBadge: {
    backgroundColor: '#f1f5f9',
    color: COLORS.text,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: FONT_SIZE.base,
    fontFamily: 'Helvetica-Bold',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    textAlign: 'center',
  },
};

// ── Document Component ─────────────────────────────────────────────
const RivalAnalysisDocument = ({ rivalAnalysis, t, userTemplates }) => {
  const translateValue = (value) => {
    if (!value) return '';
    const map = {
      RIGHT: t('rivalAnalysis.options.right'),
      LEFT: t('rivalAnalysis.options.left'),
      COMBINATIVE: t('rivalAnalysis.options.combinative'),
      DIRECT: t('rivalAnalysis.options.direct'),
      HIGH: t('rivalAnalysis.options.high'),
      MEDIUM: t('rivalAnalysis.options.medium'),
      LOW: t('rivalAnalysis.options.low'),
    };
    return map[value] || value;
  };

  const analysisTemplate = userTemplates?.find(
    (tmpl) => tmpl._id === rivalAnalysis.templateId,
  );
  const templateQuestions = analysisTemplate?.questions
    ? [...analysisTemplate.questions].sort((a, b) => a.order - b.order)
    : [];

  const getAnswerValue = (question) => {
    const knownFields = [
      'ladoDebilSalidaBalon', 'generanPeligroPorDonde', 'combinativoDirecto',
      'pressingAltura', 'pressingPuntas', 'pressingSaltanLineas',
      'ortjDefendiendo', 'zonaSaquePortero', 'cambioSistemaDerrota',
      'observaciones', 'jugadoresDestacados', 'jugadoresDebiles', 'alineacion',
    ];
    if (knownFields.includes(question.id)) return rivalAnalysis[question.id];
    return rivalAnalysis.customAnswers?.[question.id];
  };

  const getQuestionText = (question) => {
    if (question.questionKey) return t(question.questionKey);
    return question.questionText || '';
  };

  const formatAnswerValue = (question, answer) => {
    if (!answer) return t('rivalAnalysis.pdf.noInfo');
    if (question.type === 'select') {
      const opt = question.options?.find((o) => o.key === answer);
      if (opt) {
        return opt.label.startsWith('rivalAnalysis.') ? t(opt.label) : opt.label;
      }
      return translateValue(answer) || answer;
    }
    if (question.type === 'formation') return normalizeFormation(answer);
    return translateValue(answer) || answer;
  };

  const title = `${t('rivalAnalysis.pdf.title')} — ${rivalAnalysis.rival}`;
  const noInfo = t('rivalAnalysis.pdf.noInfo');

  // ── Render helpers ───────────────────────────────────────────────
  const QuestionRow = ({ label, value, translated }) => {
    const display =
      value && String(value).trim() !== ''
        ? translated
          ? translateValue(value)
          : value
        : noInfo;
    const hasValue = value && String(value).trim() !== '';
    return (
      <PdfQuestionRow label={label} value={display} noValue={!hasValue} />
    );
  };

  const PlayerBlock = ({ players, sectionTitle }) => {
    if (!players || players.length === 0) return null;
    return (
      <View style={s.playersSection}>
        <Text style={s.playersTitle}>
          {sectionTitle} ({players.length})
        </Text>
        <View style={s.playersList}>
          {players.map((p, idx) => (
            <View style={baseStyles.playerItem} key={idx} wrap={false}>
              <Text style={baseStyles.playerName}>
                {getPlayerFullName(p) || t('player.player')}
              </Text>
              {p.observacion ? (
                <Text style={baseStyles.playerNote}>{p.observacion}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const ObservationBlock = ({ text, questionText }) => {
    if (!text) return null;
    return (
      <PdfSection title={questionText}>
        <View style={baseStyles.obsBox}>
          <Text style={baseStyles.obsText}>{text}</Text>
        </View>
      </PdfSection>
    );
  };

  const GraphicBlock = ({ imageBase64, blockTitle }) => {
    if (!imageBase64) return null;
    return (
      <View style={baseStyles.section} wrap={false}>
        <View style={baseStyles.sectionHeader}>
          <Text style={baseStyles.sectionTitle}>{blockTitle}</Text>
        </View>
        <View style={s.graphicContainer}>
          <Image src={imageBase64} style={s.graphicImg} />
        </View>
      </View>
    );
  };

  const VideoBlock = ({ blockTitle, videoUrl }) => (
    <View style={baseStyles.questionRow} wrap={false}>
      <Text style={baseStyles.questionLabel}>{blockTitle}</Text>
      <Text style={[baseStyles.questionValue, { color: COLORS.accent }]}>
        {videoUrl ? `📹 ${videoUrl}` : `📹 ${t('rivalAnalysis.actions.videoSaved')}`}
      </Text>
    </View>
  );

  // ── Content blocks ───────────────────────────────────────────────
  const renderContent = () => {
    const blocks = [];
    let key = 0;

    // Formation badge
    if (rivalAnalysis.alineacion) {
      blocks.push(
        <View style={baseStyles.section} wrap={false} key={key++}>
          <View style={baseStyles.sectionHeader}>
            <Text style={baseStyles.sectionTitle}>
              {t('matchSheet.fields.rivalFormation')}
            </Text>
          </View>
          <View style={{ marginTop: 4 }}>
            <Text style={s.formationBadge}>
              {normalizeFormation(rivalAnalysis.alineacion)}
            </Text>
          </View>
        </View>,
      );
    }

    if (!templateQuestions.length) {
      // Legacy questions
      const legacyQs = [
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
      legacyQs.forEach((q) => {
        blocks.push(<QuestionRow {...q} key={key++} />);
      });

      // Custom answers (video/graphic)
      if (rivalAnalysis.customAnswers) {
        Object.entries(rivalAnalysis.customAnswers).forEach(([, v]) => {
          if (v?.videoId || v?.url)
            blocks.push(<VideoBlock blockTitle={t('rivalAnalysis.actions.video')} videoUrl={v.resolvedUrl || v.url} key={key++} />);
          if (v?.imageBase64)
            blocks.push(
              <GraphicBlock imageBase64={v.imageBase64} blockTitle={t('rivalAnalysis.actions.graphic')} key={key++} />,
            );
        });
      }

      // Players
      blocks.push(
        <PlayerBlock
          players={rivalAnalysis.jugadoresDestacados}
          sectionTitle={t('rivalAnalysis.pdf.keyPlayers')}
          key={key++}
        />,
      );
      blocks.push(
        <PlayerBlock
          players={rivalAnalysis.jugadoresDebiles}
          sectionTitle={t('rivalAnalysis.pdf.weakPlayers')}
          key={key++}
        />,
      );
    } else {
      // Template-driven questions
      const coveredKeys = templateQuestions.map((q) => q.id);

      templateQuestions.forEach((question) => {
        const answer = getAnswerValue(question);
        const questionText = getQuestionText(question);

        if (question.type === 'players') {
          if (answer && answer.length > 0) {
            blocks.push(
              <PlayerBlock players={answer} sectionTitle={questionText} key={key++} />,
            );
          }
          return;
        }

        if (question.type === 'text' && question.id === 'observaciones') {
          if (answer) {
            blocks.push(
              <ObservationBlock text={answer} questionText={questionText} key={key++} />,
            );
          }
          return;
        }

        if (question.type === 'graphic') {
          let graphicAnswer = answer;
          if (!graphicAnswer?.imageBase64 && rivalAnalysis.customAnswers) {
            const entry = Object.entries(rivalAnalysis.customAnswers).find(
              ([k, v]) => v?.imageBase64 && !coveredKeys.includes(k),
            );
            if (entry) {
              graphicAnswer = entry[1];
              coveredKeys.push(entry[0]);
            }
          }
          if (graphicAnswer?.imageBase64) {
            blocks.push(
              <GraphicBlock
                imageBase64={graphicAnswer.imageBase64}
                blockTitle={questionText}
                key={key++}
              />,
            );
          }
          return;
        }

        if (question.type === 'video') {
          let videoAnswer = answer;
          if (!videoAnswer?.videoId && !videoAnswer?.url && rivalAnalysis.customAnswers) {
            const entry = Object.entries(rivalAnalysis.customAnswers).find(
              ([k, v]) => (v?.videoId || v?.url) && !coveredKeys.includes(k),
            );
            if (entry) {
              videoAnswer = entry[1];
              coveredKeys.push(entry[0]);
            }
          }
          if (videoAnswer?.videoId || videoAnswer?.url) {
            blocks.push(
              <VideoBlock
                blockTitle={questionText}
                videoUrl={videoAnswer.resolvedUrl || videoAnswer.url}
                key={key++}
              />,
            );
          }
          return;
        }

        if (question.type === 'formation') {
          const displayValue = answer
            ? normalizeFormation(answer)
            : noInfo;
          const hasValue = !!answer;
          blocks.push(
            <View style={baseStyles.questionRow} wrap={false} key={key++}>
              <Text style={baseStyles.questionLabel}>{questionText}</Text>
              {hasValue ? (
                <Text style={s.formationBadgeInline}>{displayValue}</Text>
              ) : (
                <Text style={[baseStyles.questionValue, baseStyles.noValue]}>
                  {displayValue}
                </Text>
              )}
            </View>,
          );
          return;
        }

        // Default: select / text
        const displayValue = formatAnswerValue(question, answer);
        const hasValue = answer && String(answer).trim() !== '';
        blocks.push(
          <QuestionRow
            label={questionText}
            value={hasValue ? displayValue : ''}
            key={key++}
          />,
        );
      });

      // Uncovered custom answers
      if (rivalAnalysis.customAnswers) {
        Object.entries(rivalAnalysis.customAnswers).forEach(([k, v]) => {
          if (coveredKeys.includes(k)) return;
          if (v?.videoId || v?.url)
            blocks.push(<VideoBlock blockTitle={t('rivalAnalysis.actions.video')} videoUrl={v.resolvedUrl || v.url} key={key++} />);
          if (v?.imageBase64)
            blocks.push(
              <GraphicBlock
                imageBase64={v.imageBase64}
                blockTitle={t('rivalAnalysis.actions.graphic')}
                key={key++}
              />,
            );
        });
      }
    }

    return blocks;
  };

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PdfHeader
          title={title}
          subtitle="Xtramys Performance Report"
        />

        <View style={baseStyles.sectionHeader}>
          <Text style={baseStyles.sectionTitle}>
            {t('rivalAnalysis.pdf.tacticalSection')}
          </Text>
        </View>

        {renderContent()}

        <PdfFooter text={`${t('rivalAnalysis.pdf.generatedBy')} Xtramys`} />
      </Page>
    </Document>
  );
};

// ── Public API ─────────────────────────────────────────────────────
export async function generateRivalAnalysisPdf(
  rivalAnalysis,
  template,
  t,
  selectedTeam,
) {
  if (!rivalAnalysis) return;
  const userTemplates = template ? [template] : [];

  const clonedAnalysis = JSON.parse(JSON.stringify(rivalAnalysis));

  if (clonedAnalysis.customAnswers) {
    for (const [key, value] of Object.entries(clonedAnalysis.customAnswers)) {
      if (value && (value.videoId || value.url)) {
        let resolvedUrl = value.url || '';
        if (value.videoId) {
          try {
            resolvedUrl = await resolvePlayableVideoUrl(value.videoId, { objectUrl: false });
          } catch (err) {
            console.error('Error resolving video url for pdf', err);
          }
        }
        clonedAnalysis.customAnswers[key] = {
          ...value,
          resolvedUrl,
        };
      }
    }
  }

  await renderPdf(
    <RivalAnalysisDocument
      rivalAnalysis={clonedAnalysis}
      selectedTeam={selectedTeam}
      t={t}
      userTemplates={userTemplates}
    />,
    `rival-analysis-${clonedAnalysis.rival || 'report'}`,
  );
}
