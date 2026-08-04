import React from 'react';
import {
  COLORS,
  Document,
  FONT_SIZE,
  Page,
  PdfFooter,
  PdfHeader,
  StyleSheet,
  Text,
  View,
  renderPdf,
} from '@/utils/pdfDesign';

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 45,
    paddingHorizontal: 28,
    backgroundColor: COLORS.bgMain,
    fontFamily: 'Helvetica',
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
  },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.primary },
  summaryLabel: { marginTop: 2, fontSize: 7, color: COLORS.textSecondary, textTransform: 'uppercase' },
  table: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 7, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, minHeight: 27 },
  headerRow: { backgroundColor: COLORS.primary, borderBottomWidth: 0 },
  cell: { justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 7 },
  headerText: { color: COLORS.white, fontFamily: 'Helvetica-Bold', fontSize: 7, textTransform: 'uppercase' },
  cellText: { color: COLORS.text, fontSize: 8, lineHeight: 1.25 },
  result: { fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  played: { color: COLORS.success },
  pending: { color: COLORS.textSecondary },
  colDate: { width: '13%' },
  colRound: { width: '22%' },
  colRival: { flex: 1 },
  colLocation: { width: '14%' },
  colResult: { width: '14%' },
});

const formatDate = (value, locale) => value
  ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
  : '-';

const ROUND_LABELS = {
  final: ['Final', 'Final'],
  semifinal: ['Semifinal', 'Semifinal'],
  cuartos: ['Quarters', 'Cuartos de final'],
  octavos: ['Round16', 'Octavos de final'],
  dieciseisavos: ['Round32', 'Dieciseisavos de final'],
  treintaydosavos: ['Round64', 'Treintaidosavos de final'],
};

const matchRound = (match, t) => {
  if (match.fase === 'grupos' && match.grupo) {
    return `${t('tournaments.group', 'Grupo')} ${match.grupo}${match.jornada ? ` · ${t('tournaments.matchday', 'Jornada')} ${match.jornada}` : ''}`;
  }
  if (match.ronda) {
    const [key, fallback] = ROUND_LABELS[match.ronda] || ['', match.ronda];
    return key ? t(`tournaments.round${key}`, fallback) : fallback;
  }
  return match.jornada ? `${t('tournaments.matchday', 'Jornada')} ${match.jornada}` : '-';
};

const matchLocation = (match, t) => {
  if (['Casa', 'local'].includes(match.ubicacion)) return t('matchSheet.modals.home', 'Local');
  if (['Fuera', 'visitante'].includes(match.ubicacion)) return t('matchSheet.modals.away', 'Visitante');
  return match.ubicacion || t('matchSheet.modals.neutral', 'Neutral');
};

const matchResult = (match, t) => {
  if (match.golesFavor != null && match.golesContra != null) return `${match.golesFavor} - ${match.golesContra}`;
  return match.resultado || t('tournaments.pendingResult', 'Pendiente');
};

const MatchRow = ({ match, locale, t }) => {
  const played = Boolean(match.resultado || (match.golesFavor != null && match.golesContra != null));
  return (
    <View style={styles.row} wrap={false}>
      <View style={[styles.cell, styles.colDate]}><Text style={styles.cellText}>{formatDate(match.fechaHora, locale)}</Text></View>
      <View style={[styles.cell, styles.colRound]}><Text style={styles.cellText}>{matchRound(match, t)}</Text></View>
      <View style={[styles.cell, styles.colRival]}><Text style={styles.cellText}>{match.rival || t('season.rival', 'Rival')}</Text></View>
      <View style={[styles.cell, styles.colLocation]}><Text style={styles.cellText}>{matchLocation(match, t)}</Text></View>
      <View style={[styles.cell, styles.colResult]}>
        <Text style={[styles.cellText, styles.result, played ? styles.played : styles.pending]}>{matchResult(match, t)}</Text>
      </View>
    </View>
  );
};

const TournamentDocument = ({ tournament, matches, team, locale, t }) => {
  const played = matches.filter((match) => Boolean(match.resultado || (match.golesFavor != null && match.golesContra != null)));
  const wins = matches.filter((match) => match.resultado === 'Victoria').length;
  const draws = matches.filter((match) => match.resultado === 'Empate').length;
  const losses = matches.filter((match) => match.resultado === 'Derrota').length;
  const sortedMatches = [...matches].sort((a, b) => new Date(a.fechaHora || 0) - new Date(b.fechaHora || 0));

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <PdfHeader
          title={t('tournaments.pdfTitle', 'Informe del torneo')}
          subtitle={tournament.nombre}
          right={team?.nombre || t('season.myTeam', 'Mi equipo')}
          date={`${matches.length} ${t('tournaments.matches', 'partidos')}`}
        />

        <View style={styles.summary}>
          {[
            [matches.length, t('tournaments.matches', 'Partidos')],
            [played.length, t('tournaments.played', 'Jugados')],
            [wins, t('tournaments.wins', 'Victorias')],
            [draws, t('tournaments.draws', 'Empates')],
            [losses, t('tournaments.losses', 'Derrotas')],
          ].map(([value, label]) => (
            <View key={label} style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{value}</Text>
              <Text style={styles.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]} wrap={false}>
            <View style={[styles.cell, styles.colDate]}><Text style={styles.headerText}>{t('tournaments.date', 'Fecha')}</Text></View>
            <View style={[styles.cell, styles.colRound]}><Text style={styles.headerText}>{t('tournaments.phase', 'Fase / Jornada')}</Text></View>
            <View style={[styles.cell, styles.colRival]}><Text style={styles.headerText}>{t('tournaments.rival', 'Rival')}</Text></View>
            <View style={[styles.cell, styles.colLocation]}><Text style={styles.headerText}>{t('tournaments.location', 'Ubicación')}</Text></View>
            <View style={[styles.cell, styles.colResult]}><Text style={styles.headerText}>{t('tournaments.result', 'Resultado')}</Text></View>
          </View>
          {sortedMatches.map((match, index) => <MatchRow key={match._id || index} match={match} locale={locale} t={t} />)}
        </View>
        <PdfFooter text={`Xtramys · ${tournament.nombre}`} />
      </Page>
    </Document>
  );
};

export async function generateTournamentPdf({ tournament, matches, team, locale, t }) {
  if (!matches?.length) throw new Error(t('tournaments.pdfEmpty', 'No hay partidos para exportar.'));
  const safeName = String(tournament?.nombre || 'torneo').replace(/[\\/:*?"<>|]+/g, '-');
  await renderPdf(
    <TournamentDocument tournament={tournament} matches={matches} team={team} locale={locale} t={t} />,
    `torneo_${safeName}`,
  );
}
