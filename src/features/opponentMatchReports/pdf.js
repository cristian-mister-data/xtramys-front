import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  baseStyles,
  COLORS,
  PdfFooter,
  PdfHeader,
  PdfSection,
  renderPdf,
} from '@/utils/pdfDesign';

const styles = StyleSheet.create({
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  teamName: { flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 13, color: COLORS.primary },
  teamNameRight: { textAlign: 'right' },
  score: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: COLORS.primary, color: COLORS.white, fontFamily: 'Helvetica-Bold', fontSize: 18, marginHorizontal: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, gap: 6 },
  meta: { paddingVertical: 4, paddingHorizontal: 7, borderRadius: 5, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, color: COLORS.textSecondary, fontSize: 8 },
  columns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  miniTitle: { fontFamily: 'Helvetica-Bold', color: COLORS.primary, fontSize: 10, marginBottom: 6 },
  lineup: { paddingLeft: 8 },
  lineupRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  lineupNumber: { width: 18, paddingVertical: 2, textAlign: 'center', borderRadius: 3, backgroundColor: COLORS.accentLight, color: COLORS.accent, fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  lineupText: { flex: 1, fontSize: 8.5, color: COLORS.text, lineHeight: 1.45 },
  noInfo: { color: COLORS.textMuted, fontFamily: 'Helvetica-Oblique', fontSize: 8.5 },
  statHeader: { flexDirection: 'row', backgroundColor: COLORS.primary, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  statRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bgCard },
  statValue: { width: 70, padding: 6, textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 8.5 },
  statLabel: { flex: 1, padding: 6, textAlign: 'center', fontSize: 8, color: COLORS.textSecondary },
  statHeaderText: { color: COLORS.white, fontFamily: 'Helvetica-Bold' },
  eventRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bgCard },
  eventMinute: { width: 35, fontFamily: 'Helvetica-Bold', color: COLORS.accent, fontSize: 8.5 },
  eventType: { width: 75, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  eventDetail: { flex: 1, fontSize: 8, color: COLORS.text },
  textBlock: { marginBottom: 7 },
  textLabel: { fontFamily: 'Helvetica-Bold', color: COLORS.textSecondary, textTransform: 'uppercase', fontSize: 7, letterSpacing: .5, marginBottom: 2 },
  text: { fontSize: 8.5, color: COLORS.text, lineHeight: 1.45 },
  conclusion: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, borderLeftColor: COLORS.accent, borderRadius: 7, padding: 10, marginBottom: 8 },
  link: { color: COLORS.accent, fontSize: 8, marginTop: 5 },
});

const hasValues = (object = {}) => Object.values(object).some((value) => value !== '' && value != null);
const safeName = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
const normalizeLineup = (team = {}) => (Array.isArray(team.lineup) && team.lineup.length
  ? team.lineup
  : String(team.lineupText || team.alineacion || team.lineup || '').split('\n'))
  .map((player) => {
    if (typeof player === 'string') return player;
    const name = player?.name || player?.nombre || player?.player || '';
    const number = player?.number || player?.shirtNumber || player?.dorsal || '';
    return name ? `${number ? `${number}. ` : ''}${name}` : number;
  })
  .map((player) => String(player).trim())
  .filter(Boolean);
const splitLineupPlayer = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/^\s*(\d{1,2})\s*[.)\-:]?\s*(.+)$/);
  return { number: match?.[1] || '', name: (match?.[2] || text).trim() };
};
const sectionValues = (data = {}, fields = []) => fields.map((field) => data[field]).filter(Boolean);
// ponytail: react-pdf cannot measure before layout; keep normal sections whole and let oversized ones wrap.
const keepSectionTogether = (values, rows = values.length) => (
  values.reduce((total, value) => total + String(value || '').length, 0) + rows * 120 <= 2600
);

function TextRows({ data, fields, prefix, t }) {
  return fields.filter((field) => data?.[field]).map((field) => (
    <View key={field} style={styles.textBlock} wrap={false}>
      <Text style={styles.textLabel}>{t(`opponentMatch.${prefix}.${field}`)}</Text>
      <Text style={styles.text}>{data[field]}</Text>
    </View>
  ));
}

function OpponentMatchReportDocument({ report, t, language }) {
  const date = report.dateTime
    ? new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(report.dateTime))
    : t('opponentMatch.noDate');
  const competition = report.tournamentId?.nombre || report.competitionName || t(`opponentMatch.competitionTypes.${report.competitionType || 'other'}`);
  const focus = report.focusTeam === 'A' ? report.teamA.name : report.focusTeam === 'B' ? report.teamB.name : t('opponentMatch.bothTeams');
  const lineupA = normalizeLineup(report.teamA);
  const lineupB = normalizeLineup(report.teamB);
  const statFields = ['possession', 'shots', 'shotsOnTarget', 'corners', 'fouls', 'offsides'];
  const tacticalFields = ['inPossession', 'outOfPossession', 'transitions', 'pressing', 'keyPlayers', 'strengths', 'weaknesses'];
  const setPieceFields = ['corners', 'freeKicks', 'throwIns', 'penalties'];
  const statValue = (letter, field) => {
    const value = report[`stats${letter}`]?.[field];
    return value == null ? '–' : `${value}${field === 'possession' ? '%' : ''}`;
  };

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PdfHeader
          title={t('opponentMatch.pdf.title')}
          subtitle={`${competition}${report.stage ? ` · ${report.stage}` : ''}`}
          date={date}
          right={`${report.teamA.score ?? '–'} : ${report.teamB.score ?? '–'}`}
        />

        <View style={styles.scoreRow}>
          <Text style={styles.teamName}>{report.teamA.name}</Text>
          <Text style={styles.score}>{report.teamA.score ?? '–'} : {report.teamB.score ?? '–'}</Text>
          <Text style={[styles.teamName, styles.teamNameRight]}>{report.teamB.name}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{t('opponentMatch.focus')}: {focus}</Text>
          <Text style={styles.meta}>{t('opponentMatch.fields.watchedVia')}: {t(`opponentMatch.watchedVia.${report.watchedVia || 'other'}`)}</Text>
          {report.venue ? <Text style={styles.meta}>{t('opponentMatch.fields.venue')}: {report.venue}</Text> : null}
          <Text style={styles.meta}>{t(`opponentMatch.status.${report.status || 'draft'}`)}</Text>
        </View>

        <PdfSection
          title={t('opponentMatch.pdf.lineups')}
          keepTogether={keepSectionTogether(
            [report.teamA.name, report.teamA.coach, ...lineupA, report.teamB.name, report.teamB.coach, ...lineupB],
            Math.max(lineupA.length, lineupB.length),
          )}
        >
          <View style={styles.columns}>
            {['A', 'B'].map((letter) => {
              const team = report[`team${letter}`];
              return (
                <View style={[baseStyles.card, styles.column]} key={letter}>
                  <Text style={styles.miniTitle}>{team.name}{team.formation ? ` · ${team.formation}` : ''}</Text>
                  {team.coach ? <Text style={[styles.lineupText, { marginBottom: 5 }]}>{t('opponentMatch.fields.coach')}: {team.coach}</Text> : null}
                  {normalizeLineup(team).length ? (
                    <View style={styles.lineup}>{normalizeLineup(team).map((player, index) => {
                      const parsed = splitLineupPlayer(player);
                      return <View key={`${player}-${index}`} style={styles.lineupRow}><Text style={styles.lineupNumber}>{parsed.number || '–'}</Text><Text style={styles.lineupText}>{parsed.name}</Text></View>;
                    })}</View>
                  ) : <Text style={styles.noInfo}>{t('opponentMatch.noLineup')}</Text>}
                </View>
              );
            })}
          </View>
        </PdfSection>

        {(hasValues(report.statsA) || hasValues(report.statsB)) ? (
          <PdfSection title={t('opponentMatch.sections.stats')} keepTogether>
            <View style={styles.statHeader}>
              <Text style={[styles.statValue, styles.statHeaderText]}>{report.teamA.name}</Text>
              <Text style={[styles.statLabel, styles.statHeaderText]}>{t('opponentMatch.pdf.comparison')}</Text>
              <Text style={[styles.statValue, styles.statHeaderText]}>{report.teamB.name}</Text>
            </View>
            {statFields.map((field) => (
              <View style={styles.statRow} key={field} wrap={false}>
                <Text style={styles.statValue}>{statValue('A', field)}</Text>
                <Text style={styles.statLabel}>{t(`opponentMatch.stats.${field}`)}</Text>
                <Text style={styles.statValue}>{statValue('B', field)}</Text>
              </View>
            ))}
          </PdfSection>
        ) : null}

        {report.events?.length ? (
          <PdfSection
            title={t('opponentMatch.sections.timeline')}
            keepTogether={keepSectionTogether(report.events.map((event) => `${event.minute} ${event.player} ${event.note}`))}
          >
            {report.events.map((event, index) => (
              <View style={styles.eventRow} key={event._id || index} wrap={false}>
                <Text style={styles.eventMinute}>{event.minute ? `${event.minute}'` : '–'}</Text>
                <Text style={styles.eventType}>{t(`opponentMatch.eventTypes.${event.type}`)}</Text>
                <Text style={styles.eventDetail}>{event.team ? `${event.team === 'A' ? report.teamA.name : report.teamB.name} · ` : ''}{event.player ? `${event.player} · ` : ''}{event.note}</Text>
              </View>
            ))}
          </PdfSection>
        ) : null}

        {['A', 'B'].map((letter) => hasValues(report[`tactics${letter}`]) ? (
          <PdfSection
            key={`tactics-${letter}`}
            title={t('opponentMatch.sections.tacticsTeam', { team: report[`team${letter}`].name })}
            keepTogether={keepSectionTogether(sectionValues(report[`tactics${letter}`], tacticalFields))}
          >
            <View style={baseStyles.card}>
              <TextRows data={report[`tactics${letter}`]} fields={tacticalFields} prefix="tactics" t={t} />
            </View>
          </PdfSection>
        ) : null)}

        {['A', 'B'].map((letter) => hasValues(report[`setPieces${letter}`]) ? (
          <PdfSection
            key={`set-pieces-${letter}`}
            title={t('opponentMatch.sections.setPiecesTeam', { team: report[`team${letter}`].name })}
            keepTogether={keepSectionTogether(sectionValues(report[`setPieces${letter}`], setPieceFields))}
          >
            <View style={baseStyles.card}>
              <TextRows data={report[`setPieces${letter}`]} fields={setPieceFields} prefix="setPieces" t={t} />
            </View>
          </PdfSection>
        ) : null)}

        {(report.summary || report.gamePlan) ? (
          <PdfSection
            title={t('opponentMatch.sections.conclusions')}
            keepTogether={keepSectionTogether([report.summary, report.gamePlan, report.videoUrl].filter(Boolean))}
          >
            {report.summary ? <View style={styles.conclusion}><Text style={styles.textLabel}>{t('opponentMatch.fields.summary')}</Text><Text style={styles.text}>{report.summary}</Text></View> : null}
            {report.gamePlan ? <View style={styles.conclusion}><Text style={styles.textLabel}>{t('opponentMatch.fields.gamePlan')}</Text><Text style={styles.text}>{report.gamePlan}</Text></View> : null}
            {report.videoUrl ? <Link href={report.videoUrl} style={styles.link}>{t('opponentMatch.actions.openVideo')}: {report.videoUrl}</Link> : null}
          </PdfSection>
        ) : null}

        <PdfFooter text={t('opponentMatch.pdf.generatedWith')} />
      </Page>
    </Document>
  );
}

export function generateOpponentMatchReportPdf(report, t, language) {
  const fileName = `${t('opponentMatch.pdf.fileName')}_${safeName(report.teamA.name)}_${safeName(report.teamB.name)}`;
  return renderPdf(<OpponentMatchReportDocument report={report} t={t} language={language} />, fileName);
}
