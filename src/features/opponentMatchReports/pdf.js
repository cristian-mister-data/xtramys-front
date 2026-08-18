import React from 'react';
import { Svg, Rect, Line, Circle, Path, G } from '@react-pdf/renderer';
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
  campColumns: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 4 },
  campColumn: { width: 232, alignItems: 'center' },
  campTeam: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: COLORS.primary, marginBottom: 3, textAlign: 'center' },
  campFormation: { fontSize: 8, color: COLORS.textSecondary, marginBottom: 7, textAlign: 'center' },
  campPitch: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#2f7a2f' },
});

const hasValues = (object = {}) => Object.values(object).some((value) => value !== '' && value != null);
const safeName = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
const sectionValues = (data = {}, fields = []) => fields.map((field) => data[field]).filter(Boolean);
// ponytail: react-pdf cannot measure before layout; keep normal sections whole and let oversized ones wrap.
const keepSectionTogether = (values, rows = values.length) => (
  values.reduce((total, value) => total + String(value || '').length, 0) + rows * 120 <= 2600
);

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

function PdfCampPitch({ team = {}, color }) {
  const players = Array.isArray(team.players) ? team.players : [];
  return (
    <View style={styles.campPitch} wrap={false}>
      <Svg width={232} height={329.44} viewBox="0 0 100 142">
        {Array.from({ length: 14 }, (_, index) => (
          <Rect key={index} x="0" y={(index * 142) / 14} width="100" height={142 / 14} fill={index % 2 ? '#2f7a2f' : '#3a8a3a'} />
        ))}
        <Rect x="0.5" y="0.5" width="99" height="141" fill="none" stroke="#fff" strokeWidth="0.45" />
        <Line x1="0" y1="71" x2="100" y2="71" stroke="#fff" strokeWidth="0.45" />
        <Circle cx="50" cy="71" r="13.5" fill="none" stroke="#fff" strokeWidth="0.45" />
        <Circle cx="50" cy="71" r="0.7" fill="#fff" />
        <Rect x="22.5" y="0" width="55" height="15.5" fill="none" stroke="#fff" strokeWidth="0.45" />
        <Rect x="38" y="0" width="24" height="5.5" fill="none" stroke="#fff" strokeWidth="0.45" />
        <Circle cx="50" cy="10" r="0.55" fill="#fff" />
        <Path d="M42.69 15.5 A9.15 9.15 0 0 0 57.31 15.5" fill="none" stroke="#fff" strokeWidth="0.45" />
        <Rect x="22.5" y="126.5" width="55" height="15.5" fill="none" stroke="#fff" strokeWidth="0.45" />
        <Rect x="38" y="136.5" width="24" height="5.5" fill="none" stroke="#fff" strokeWidth="0.45" />
        <Circle cx="50" cy="132" r="0.55" fill="#fff" />
        <Path d="M42.69 126.5 A9.15 9.15 0 0 1 57.31 126.5" fill="none" stroke="#fff" strokeWidth="0.45" />
        {players.map((player, index) => {
          const x = clamp(player.x, 5, 95);
          const y = clamp(player.y, 5, 95) * 1.42;
          const labelX = clamp(x, 14, 86);
          return (
            <G key={index}>
              <Circle cx={x} cy={y} r="5.1" fill={color} stroke="#fff" strokeWidth="0.9" />
              <Text x={x} y={y + 1.7} textAnchor="middle" fill="#fff" fontFamily="Helvetica-Bold" fontSize="4.5">{player.number || player.position || '–'}</Text>
              {player.name ? <>
                <Rect x={labelX - 13} y={y + 5.5} width="26" height="5" rx="1.5" fill="#0f172a" fillOpacity="0.86" />
                <Text x={labelX} y={y + 9} textAnchor="middle" fill="#fff" fontFamily="Helvetica-Bold" fontSize="2.8">{String(player.name).slice(0, 18)}</Text>
              </> : null}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function CampogramPage({ phase, index, report, t }) {
  const title = phase.label || (index === 0
    ? t('opponentMatch.campogram.initial')
    : t('opponentMatch.pdf.campogramPhase', { number: index + 1 }));
  return (
    <Page size="A4" orientation="portrait" style={baseStyles.page} wrap={false}>
      <PdfHeader
        title={t('opponentMatch.pdf.campograms')}
        subtitle={`${phase.minute ? `${phase.minute}' · ` : ''}${title}`}
        right={`${report.teamA.score ?? '–'} : ${report.teamB.score ?? '–'}`}
      />
      <View style={styles.campColumns} wrap={false}>
        {['A', 'B'].map((letter) => {
          const team = phase[`team${letter}`] || {};
          return (
            <View style={styles.campColumn} key={letter} wrap={false}>
              <Text style={styles.campTeam}>{report[`team${letter}`].name}</Text>
              <Text style={styles.campFormation}>{t('opponentMatch.fields.formation')}: {team.formation || '—'}</Text>
              <PdfCampPitch team={team} color={letter === 'A' ? '#2563eb' : '#dc2626'} />
            </View>
          );
        })}
      </View>
      <PdfFooter text={t('opponentMatch.pdf.generatedWith')} />
    </Page>
  );
}

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
        </View>

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
      {(Array.isArray(report.campograms) ? report.campograms : []).map((phase, index) => (
        <CampogramPage key={index} phase={phase} index={index} report={report} t={t} />
      ))}
    </Document>
  );
}

export function generateOpponentMatchReportPdf(report, t, language) {
  const fileName = `${t('opponentMatch.pdf.fileName')}_${safeName(report.teamA.name)}_${safeName(report.teamB.name)}`;
  return renderPdf(<OpponentMatchReportDocument report={report} t={t} language={language} />, fileName);
}
