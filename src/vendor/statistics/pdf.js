import React from 'react';
import {
  Document, Page, Text, View,
  baseStyles, COLORS, SPACING, FONT_SIZE,
  PdfHeader, PdfFooter, PdfSection,
  renderPdf,
} from '@/utils/pdfDesign';

// ── Shared Styles ──────────────────────────────────────────────────
const s = {
  grid2: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
  grid3: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.base },
  grid4: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  halfColumn: { width: '48%', marginBottom: SPACING.md },
  col3: { width: '31%', marginBottom: SPACING.sm },
  col4: { width: '23%', marginBottom: SPACING.sm },
  
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    textTransform: 'uppercase',
  },
  
  // Bar List
  barListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  barListLabel: {
    width: 60,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontFamily: 'Helvetica-Bold',
  },
  barListTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.bgSoft,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: SPACING.sm,
  },
  barListFill: {
    height: '100%',
    borderRadius: 4,
  },
  barListVal: {
    width: 20,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    textAlign: 'right',
  },

  // Metric Box
  metricBox: {
    alignItems: 'center',
    padding: SPACING.base,
    borderRadius: 6,
    borderWidth: 1,
  },
  metricVal: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  metricLbl: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerCell: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  headerText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    textAlign: 'center',
  },
  cellBold: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    alignSelf: 'center',
  },
};

// ── Helper ─────────────────────────────────────────────────────────
const getPlayerFullName = (player) => {
  if (!player) return 'Desconocido';
  const name = player.nombre || '';
  const surname = player.apellidos || '';
  return `${name} ${surname}`.trim() || 'Desconocido';
};

// ── Components ─────────────────────────────────────────────────────

const TeamStatsPage = ({ stats, t, title, date, hideHeader = false }) => {
  if (!stats) return null;
  const team = stats.team;

  // Formations
  const formationsList = Object.entries(team.formations || {}).sort((a, b) => b[1] - a[1]);
  const maxFormationCount = formationsList.length > 0 ? Math.max(...formationsList.map((f) => f[1]), 1) : 1;

  // Rival Goal Stats
  let rivalStats = team.rivalGoalStats || {};
  let buckets = rivalStats.buckets || {};
  const maxBucketCount = Object.keys(buckets).length > 0 ? Math.max(...Object.values(buckets), 1) : 1;

  return (
    <Page size="A4" style={baseStyles.page}>
      {!hideHeader && <PdfHeader title={title} subtitle={t('statistics.tabs.team')} date={date} />}
      <PdfFooter />
      
      <PdfSection title={t('statistics.teamPerformance', 'Rendimiento del Equipo')}>
        
        {/* Main Team Stats */}
        <View style={s.grid2}>
          {/* Win Rate Card */}
          <View style={[s.halfColumn, s.card, { flexDirection: 'row', alignItems: 'center' }]}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.base }}>
              <Text style={{ color: COLORS.white, fontSize: 16, fontFamily: 'Helvetica-Bold' }}>{team.winRate}%</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 7 }}>{t('statistics.wins')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 4, marginBottom: 4 }}>
                <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textSecondary }}>{t('statistics.matchesPlayed', 'Partidos Jugados')}</Text>
                <Text style={{ fontSize: FONT_SIZE.md, fontFamily: 'Helvetica-Bold', color: COLORS.primary }}>{team.matches}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.success, fontFamily: 'Helvetica-Bold' }}>• {t('statistics.wins', 'Victorias')}</Text>
                <Text style={{ fontSize: FONT_SIZE.sm, fontFamily: 'Helvetica-Bold' }}>{team.wins}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.warning, fontFamily: 'Helvetica-Bold' }}>• {t('statistics.draws', 'Empates')}</Text>
                <Text style={{ fontSize: FONT_SIZE.sm, fontFamily: 'Helvetica-Bold' }}>{team.draws}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.danger, fontFamily: 'Helvetica-Bold' }}>• {t('statistics.losses', 'Derrotas')}</Text>
                <Text style={{ fontSize: FONT_SIZE.sm, fontFamily: 'Helvetica-Bold' }}>{team.losses}</Text>
              </View>
            </View>
          </View>

          {/* Goal Balance */}
          <View style={[s.halfColumn, s.card]}>
            <Text style={s.cardTitle}>{t('statistics.goalsBalance', 'Balance de Goles')}</Text>
            <View style={s.grid2}>
              <View style={[s.halfColumn, s.metricBox, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                <Text style={[s.metricLbl, { color: '#166534' }]}>{t('statistics.goalsFor')}</Text>
                <Text style={[s.metricVal, { color: '#15803d' }]}>{team.goalsFor}</Text>
                <Text style={{ fontSize: 7, color: '#166534' }}>Avg: {(team.matches > 0 ? team.goalsFor / team.matches : 0).toFixed(1)} / p</Text>
              </View>
              <View style={[s.halfColumn, s.metricBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                <Text style={[s.metricLbl, { color: '#991b1b' }]}>{t('statistics.goalsAgainst')}</Text>
                <Text style={[s.metricVal, { color: '#b91c1c' }]}>{team.goalsAgainst}</Text>
                <Text style={{ fontSize: 7, color: '#991b1b' }}>Avg: {(team.matches > 0 ? team.goalsAgainst / team.matches : 0).toFixed(1)} / p</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.bgSoft, padding: 6, borderRadius: 4, marginTop: 4 }}>
              <Text style={{ fontSize: FONT_SIZE.xs, fontFamily: 'Helvetica-Bold' }}>Dif: <Text style={{ color: team.goalsFor >= team.goalsAgainst ? COLORS.success : COLORS.danger }}>{team.goalsFor - team.goalsAgainst > 0 ? '+' : ''}{team.goalsFor - team.goalsAgainst}</Text></Text>
              <Text style={{ fontSize: FONT_SIZE.xs, fontFamily: 'Helvetica-Bold' }}>Porterías a 0: <Text style={{ color: COLORS.accent }}>{team.cleanSheets}</Text></Text>
            </View>
          </View>
        </View>

        {/* Second Row: Formations & Rival Goals */}
        <View style={s.grid2}>
          {/* Formations */}
          <View style={[s.halfColumn, s.card]}>
            <Text style={s.cardTitle}>{t('statistics.preferredFormation', 'Formaciones Utilizadas')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.bgSoft, padding: 8, borderRadius: 6, marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 7, color: COLORS.textSecondary, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' }}>Más Usada</Text>
                <Text style={{ fontSize: FONT_SIZE.lg, color: COLORS.accent, fontFamily: 'Helvetica-Bold' }}>{team.mostUsedFormation || '-'}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 7, color: COLORS.textSecondary, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' }}>Avg Cambios / P.</Text>
                <Text style={{ fontSize: FONT_SIZE.lg, color: '#7c3aed', fontFamily: 'Helvetica-Bold' }}>{team.avgSubs || '-'}</Text>
              </View>
            </View>
            
            {formationsList.length > 0 ? formationsList.map(([formation, count], i) => (
              <View style={s.barListItem} key={i}>
                <Text style={s.barListLabel}>{formation}</Text>
                <View style={s.barListTrack}>
                  <View style={[s.barListFill, { width: `${(count / maxFormationCount) * 100}%`, backgroundColor: COLORS.accent }]} />
                </View>
                <Text style={s.barListVal}>{count}</Text>
              </View>
            )) : <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontStyle: 'italic' }}>{t('statistics.noData')}</Text>}
          </View>

          {/* Rival Goals */}
          <View style={[s.halfColumn, s.card]}>
            <Text style={s.cardTitle}>{t('statistics.team.rivalGoalStats', 'Goles del Rival por Periodos')}</Text>
            {rivalStats.hasData ? (
              <>
                <View style={[s.grid3, { marginBottom: SPACING.md }]}>
                  <View style={[s.col3, s.metricBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca', padding: 4 }]}>
                    <Text style={[s.metricVal, { color: '#dc2626', fontSize: 16 }]}>{rivalStats.avgFirstGoal}'</Text>
                    <Text style={[s.metricLbl, { color: '#991b1b', fontSize: 6 }]}>Min. 1º Gol</Text>
                  </View>
                  <View style={[s.col3, s.metricBox, { backgroundColor: COLORS.bgSoft, borderColor: COLORS.border, padding: 4 }]}>
                    <Text style={[s.metricVal, { color: COLORS.primary, fontSize: 16 }]}>{rivalStats.avgPerMatch}</Text>
                    <Text style={[s.metricLbl, { fontSize: 6 }]}>Goles / P</Text>
                  </View>
                  <View style={[s.col3, s.metricBox, { backgroundColor: '#fffbeb', borderColor: '#fde68a', padding: 4 }]}>
                    <Text style={[s.metricVal, { color: '#d97706', fontSize: 16 }]}>{rivalStats.mostDangerousPeriod}'</Text>
                    <Text style={[s.metricLbl, { color: '#b45309', fontSize: 6 }]}>Crítico</Text>
                  </View>
                </View>
                
                {Object.entries(buckets).map(([period, count], i) => (
                  <View style={s.barListItem} key={i}>
                    <Text style={s.barListLabel}>{period}'</Text>
                    <View style={s.barListTrack}>
                      <View style={[s.barListFill, { width: `${Math.max((count / maxBucketCount) * 100, count > 0 ? 5 : 0)}%`, backgroundColor: period === rivalStats.mostDangerousPeriod ? COLORS.danger : COLORS.textMuted }]} />
                    </View>
                    <Text style={s.barListVal}>{count}</Text>
                  </View>
                ))}
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8, paddingTop: 6 }}>
                  <Text style={{ fontSize: 8, color: COLORS.textSecondary }}>1ª: <Text style={{ color: COLORS.primary, fontFamily: 'Helvetica-Bold' }}>{rivalStats.firstHalfGoals}</Text></Text>
                  <Text style={{ fontSize: 8, color: COLORS.textSecondary }}>2ª: <Text style={{ color: COLORS.primary, fontFamily: 'Helvetica-Bold' }}>{rivalStats.secondHalfGoals}</Text></Text>
                  <Text style={{ fontSize: 8, color: COLORS.textSecondary }}>Min: <Text style={{ color: COLORS.primary, fontFamily: 'Helvetica-Bold' }}>{rivalStats.earliest}'</Text></Text>
                  <Text style={{ fontSize: 8, color: COLORS.textSecondary }}>Max: <Text style={{ color: COLORS.primary, fontFamily: 'Helvetica-Bold' }}>{rivalStats.latest}'</Text></Text>
                </View>
              </>
            ) : <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontStyle: 'italic' }}>{t('statistics.noData')}</Text>}
          </View>
        </View>

      </PdfSection>
    </Page>
  );
};

const PlayersStatsPage = ({ stats, t, title, date, hideHeader = false }) => {
  if (!stats || !stats.players) return null;

  const sortedPlayers = [...stats.players].sort((a, b) => b.minutes - a.minutes);
  const totalGoals = stats.players.reduce((acc, p) => acc + p.goals, 0);
  const totalAssists = stats.players.reduce((acc, p) => acc + p.assists, 0);
  const totalPlayers = stats.players.length;

  return (
    <Page size="A4" style={baseStyles.page}>
      {!hideHeader && <PdfHeader title={title} subtitle={t('statistics.tabs.players')} date={date} />}
      <PdfFooter />
      
      <PdfSection title={t('statistics.playersPerformance', 'Estadísticas Individuales')}>
        <View style={s.grid3}>
          <View style={[s.col3, s.metricBox, { backgroundColor: COLORS.bgSoft, borderColor: COLORS.border }]}>
            <Text style={[s.metricVal, { color: COLORS.primary }]}>{totalPlayers}</Text>
            <Text style={s.metricLbl}>{t('statistics.playersCount', 'Plantilla')}</Text>
          </View>
          <View style={[s.col3, s.metricBox, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <Text style={[s.metricVal, { color: '#15803d' }]}>{totalGoals}</Text>
            <Text style={s.metricLbl}>{t('statistics.goals', 'Goles Totales')}</Text>
          </View>
          <View style={[s.col3, s.metricBox, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}>
            <Text style={[s.metricVal, { color: '#7c3aed' }]}>{totalAssists}</Text>
            <Text style={s.metricLbl}>{t('statistics.assists', 'Asistencias Totales')}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.row}>
            <View style={[s.headerCell, { width: '8%' }]}><Text style={s.headerText}>#</Text></View>
            <View style={[s.headerCell, { width: '28%' }]}><Text style={[s.headerText, { textAlign: 'left' }]}>{t('statistics.weeklyAttendance.player', 'Jugador')}</Text></View>
            <View style={[s.headerCell, { width: '15%' }]}><Text style={s.headerText}>{t('statistics.sortLabels.position', 'Posición')}</Text></View>
            <View style={[s.headerCell, { width: '8%' }]}><Text style={s.headerText}>PJ</Text></View>
            <View style={[s.headerCell, { width: '10%' }]}><Text style={s.headerText}>{t('statistics.fullTable.minutes', 'Min')}</Text></View>
            <View style={[s.headerCell, { width: '7%' }]}><Text style={s.headerText}>G</Text></View>
            <View style={[s.headerCell, { width: '7%' }]}><Text style={s.headerText}>A</Text></View>
            <View style={[s.headerCell, { width: '7%' }]}><Text style={s.headerText}>TA</Text></View>
            <View style={[s.headerCell, { width: '7%' }]}><Text style={s.headerText}>TR</Text></View>
            <View style={[s.headerCell, { width: '13%' }]}><Text style={s.headerText}>% Asis.</Text></View>
          </View>
          
          {sortedPlayers.map((player, idx) => {
            const attendanceColor = player.attendancePercentage >= 80 ? COLORS.success : player.attendancePercentage >= 60 ? COLORS.warning : COLORS.danger;
            return (
              <View style={s.row} key={idx} wrap={false}>
                <View style={[s.cell, { width: '8%' }]}><Text style={[s.cellText, { color: COLORS.textSecondary }]} >{player.number}</Text></View>
                <View style={[s.cell, { width: '28%' }]}><Text style={[s.cellBold, { textAlign: 'left' }]}>{player.name}</Text></View>
                <View style={[s.cell, { width: '15%' }]}><Text style={[s.cellText, { fontSize: 7, textTransform: 'uppercase' }]}>{player.position}</Text></View>
                <View style={[s.cell, { width: '8%' }]}><Text style={s.cellText}>{player.matches}</Text></View>
                <View style={[s.cell, { width: '10%' }]}><Text style={[s.cellBold, { color: COLORS.accent }]}>{player.minutes}'</Text></View>
                <View style={[s.cell, { width: '7%' }]}><Text style={[s.cellBold, { color: player.goals > 0 ? COLORS.success : COLORS.textMuted }]}>{player.goals}</Text></View>
                <View style={[s.cell, { width: '7%' }]}><Text style={[s.cellBold, { color: player.assists > 0 ? '#7c3aed' : COLORS.textMuted }]}>{player.assists}</Text></View>
                <View style={[s.cell, { width: '7%' }]}><Text style={[s.cellBold, { color: player.yellowCards > 0 ? '#fbbf24' : COLORS.textMuted }]}>{player.yellowCards}</Text></View>
                <View style={[s.cell, { width: '7%' }]}><Text style={[s.cellBold, { color: player.redCards > 0 ? '#ef4444' : COLORS.textMuted }]}>{player.redCards}</Text></View>
                <View style={[s.cell, { width: '13%' }]}><Text style={[s.cellBold, { color: attendanceColor }]}>{player.attendancePercentage}%</Text></View>
              </View>
            );
          })}
        </View>

      </PdfSection>
    </Page>
  );
};

const InjuriesStatsPage = ({ injuries = [], players = [], t, title, date, hideHeader = false }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activas = injuries.filter((inj) => !inj.fechaFin).length;
  const enRecuperacion = injuries.filter((inj) => inj.fechaFin && new Date(inj.fechaFin) > today).length;
  const recuperadas = injuries.filter((inj) => inj.fechaFin && new Date(inj.fechaFin) <= today).length;
  const total = injuries.length;

  const withRelapse = injuries.filter((inj) => inj.recaida).length;
  const withoutRelapse = total - withRelapse;

  // Zones
  const zoneCounts = {};
  injuries.forEach((injury) => {
    const zone = injury.zona?.value ? t('injury.zones.' + injury.zona.value, injury.zona.label) : t('common.unknown', 'Desconocido');
    zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
  });
  const zoneList = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1]);
  const maxZoneCount = zoneList.length > 0 ? Math.max(...zoneList.map((z) => z[1]), 1) : 1;

  // Types
  const typeCounts = {};
  injuries.forEach((injury) => {
    const type = injury.tipo?.value ? t('injury.types.' + injury.tipo.value, injury.tipo.label) : t('common.unknown', 'Desconocido');
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  const typeList = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const maxTypeCount = typeList.length > 0 ? Math.max(...typeList.map((t) => t[1]), 1) : 1;

  // Duration
  const durationCounts = { corta: 0, media: 0, larga: 0 };
  injuries.forEach((injury) => {
    if (!injury.fechaInicio || !injury.fechaFin) return;
    const startDate = new Date(injury.fechaInicio);
    const endDate = new Date(injury.fechaFin);
    const diffMonths = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) / 30;
    if (diffMonths < 1) durationCounts.corta++;
    else if (diffMonths <= 3) durationCounts.media++;
    else durationCounts.larga++;
  });
  const totalWithDuration = durationCounts.corta + durationCounts.media + durationCounts.larga || 1;

  // Active Injuries list
  const activeInjuries = injuries.filter((inj) => !inj.fechaFin || new Date(inj.fechaFin) > today);

  const getLocale = () => 'es-ES'; // Can be improved

  return (
    <Page size="A4" style={baseStyles.page}>
      {!hideHeader && <PdfHeader title={title} subtitle={t('statistics.tabs.injuries')} date={date} />}
      <PdfFooter />
      
      <PdfSection title={t('statistics.injuriesSummary', 'Resumen y Distribución de Lesiones')}>
        <View style={s.grid4}>
          <View style={[s.col4, s.metricBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <Text style={[s.metricVal, { color: '#b91c1c' }]}>{activas}</Text>
            <Text style={[s.metricLbl, { color: '#991b1b' }]}>{t('injuryStats.summary.active', 'Activas')}</Text>
          </View>
          <View style={[s.col4, s.metricBox, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
            <Text style={[s.metricVal, { color: '#d97706' }]}>{enRecuperacion}</Text>
            <Text style={[s.metricLbl, { color: '#b45309' }]}>{t('injuryStats.status.recovered', 'En Recuperación')}</Text>
          </View>
          <View style={[s.col4, s.metricBox, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <Text style={[s.metricVal, { color: '#15803d' }]}>{recuperadas}</Text>
            <Text style={[s.metricLbl, { color: '#166534' }]}>{t('injuryStats.summary.recovered', 'Recuperadas')}</Text>
          </View>
          <View style={[s.col4, s.metricBox, { backgroundColor: COLORS.bgSoft, borderColor: COLORS.border }]}>
            <Text style={[s.metricVal, { color: COLORS.primary }]}>{total}</Text>
            <Text style={s.metricLbl}>Total Histórico</Text>
          </View>
        </View>

        <View style={s.grid2}>
          <View style={[s.halfColumn, s.card]}>
            <Text style={s.cardTitle}>{t('injuryStats.zones.label', 'Zonas Afectadas')}</Text>
            {zoneList.length > 0 ? zoneList.map(([name, count], i) => (
              <View style={s.barListItem} key={i}>
                <Text style={s.barListLabel}>{name}</Text>
                <View style={s.barListTrack}>
                  <View style={[s.barListFill, { width: `${(count / maxZoneCount) * 100}%`, backgroundColor: '#ef4444' }]} />
                </View>
                <Text style={s.barListVal}>{count}</Text>
              </View>
            )) : <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontStyle: 'italic' }}>{t('common.noData', 'No hay datos')}</Text>}
          </View>
          
          <View style={[s.halfColumn, s.card]}>
            <Text style={s.cardTitle}>{t('injuryStats.types.label', 'Tipos de Lesiones')}</Text>
            {typeList.length > 0 ? typeList.map(([name, count], i) => (
              <View style={s.barListItem} key={i}>
                <Text style={s.barListLabel}>{name}</Text>
                <View style={s.barListTrack}>
                  <View style={[s.barListFill, { width: `${(count / maxTypeCount) * 100}%`, backgroundColor: COLORS.accent }]} />
                </View>
                <Text style={s.barListVal}>{count}</Text>
              </View>
            )) : <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontStyle: 'italic' }}>{t('common.noData', 'No hay datos')}</Text>}
          </View>
        </View>

        <View style={s.grid2}>
          <View style={[s.halfColumn, s.card]}>
            <Text style={s.cardTitle}>{t('injuryStats.duration.label', 'Duración de Lesiones')}</Text>
            <View style={s.barListItem}>
              <Text style={s.barListLabel}>{t('injuryStats.duration.short', 'Corta (< 1 mes)')}</Text>
              <View style={s.barListTrack}><View style={[s.barListFill, { width: `${(durationCounts.corta / totalWithDuration) * 100}%`, backgroundColor: '#10b981' }]} /></View>
              <Text style={s.barListVal}>{durationCounts.corta}</Text>
            </View>
            <View style={s.barListItem}>
              <Text style={s.barListLabel}>{t('injuryStats.duration.medium', 'Media (1-3 meses)')}</Text>
              <View style={s.barListTrack}><View style={[s.barListFill, { width: `${(durationCounts.media / totalWithDuration) * 100}%`, backgroundColor: '#f59e0b' }]} /></View>
              <Text style={s.barListVal}>{durationCounts.media}</Text>
            </View>
            <View style={s.barListItem}>
              <Text style={s.barListLabel}>{t('injuryStats.duration.long', 'Larga (> 3 meses)')}</Text>
              <View style={s.barListTrack}><View style={[s.barListFill, { width: `${(durationCounts.larga / totalWithDuration) * 100}%`, backgroundColor: '#ef4444' }]} /></View>
              <Text style={s.barListVal}>{durationCounts.larga}</Text>
            </View>
          </View>
          <View style={[s.halfColumn, s.card, { justifyContent: 'center' }]}>
            <Text style={s.cardTitle}>Relación de Recaídas</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: COLORS.bgSoft, padding: SPACING.lg, borderRadius: 6 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: COLORS.textSecondary, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' }}>Nuevas</Text>
                <Text style={{ fontSize: 24, color: COLORS.success, fontFamily: 'Helvetica-Bold' }}>{withoutRelapse}</Text>
              </View>
              <View style={{ width: 1, height: 30, backgroundColor: COLORS.border }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: COLORS.textSecondary, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' }}>Recaídas</Text>
                <Text style={{ fontSize: 24, color: COLORS.warning, fontFamily: 'Helvetica-Bold' }}>{withRelapse}</Text>
              </View>
              <View style={{ width: 1, height: 30, backgroundColor: COLORS.border }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: COLORS.textSecondary, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' }}>Tasa</Text>
                <Text style={{ fontSize: 24, color: COLORS.danger, fontFamily: 'Helvetica-Bold' }}>{total > 0 ? Math.round((withRelapse / total) * 100) : 0}%</Text>
              </View>
            </View>
          </View>
        </View>

        {activeInjuries.length > 0 ? (
          <View style={s.table}>
            <View style={s.row}>
              <View style={[s.headerCell, { width: '24%' }]}><Text style={[s.headerText, { textAlign: 'left' }]}>{t('statistics.weeklyAttendance.player', 'Jugador')}</Text></View>
              <View style={[s.headerCell, { width: '20%' }]}><Text style={s.headerText}>{t('injury.types.label', 'Tipo')}</Text></View>
              <View style={[s.headerCell, { width: '16%' }]}><Text style={s.headerText}>{t('injury.zones.label', 'Zona')}</Text></View>
              <View style={[s.headerCell, { width: '10%' }]}><Text style={s.headerText}>Inicio</Text></View>
              <View style={[s.headerCell, { width: '10%' }]}><Text style={s.headerText}>Pronost.</Text></View>
              <View style={[s.headerCell, { width: '10%' }]}><Text style={s.headerText}>Estado</Text></View>
              <View style={[s.headerCell, { width: '10%' }]}><Text style={s.headerText}>Recaída</Text></View>
            </View>
            
            {activeInjuries.map((inj, idx) => {
              const playerId = inj.jugador?._id || inj.jugador;
              const player = players.find((p) => p._id === playerId);
              const playerName = player ? getPlayerFullName(player) : (inj.jugador?.nombre || t('common.unknown', 'Desconocido'));
              const type = inj.tipo?.value ? t('injury.types.' + inj.tipo.value, inj.tipo.label) : t('common.unknown', 'Desconocido');
              const zone = inj.zona?.value ? t('injury.zones.' + inj.zona.value, inj.zona.label) : t('common.unknown', 'Desconocido');
              const startDateStr = inj.fechaInicio ? new Date(inj.fechaInicio).toLocaleDateString(getLocale()) : '-';
              const endDateStr = inj.fechaFin ? new Date(inj.fechaFin).toLocaleDateString(getLocale()) : (inj.fechaFinPrevista ? new Date(inj.fechaFinPrevista).toLocaleDateString(getLocale()) : '-');
              const statusLabel = inj.fechaFin ? t('injuryStats.status.recovered', 'Recup.') : t('injuryStats.summary.active', 'Activa');
              const relapseLabel = inj.recaida ? t('injuryStats.relapse.relapse', 'Recaída') : t('injuryStats.relapse.new', 'Nueva');

              return (
                <View style={s.row} key={idx} wrap={false}>
                  <View style={[s.cell, { width: '24%' }]}><Text style={[s.cellBold, { textAlign: 'left' }]}>{playerName}</Text></View>
                  <View style={[s.cell, { width: '20%' }]}><Text style={[s.cellText, { fontSize: 7 }]}>{type}</Text></View>
                  <View style={[s.cell, { width: '16%' }]}><Text style={[s.cellText, { color: COLORS.textSecondary, fontSize: 7 }]}>{zone}</Text></View>
                  <View style={[s.cell, { width: '10%' }]}><Text style={s.cellBold}>{startDateStr}</Text></View>
                  <View style={[s.cell, { width: '10%' }]}><Text style={s.cellBold}>{endDateStr}</Text></View>
                  <View style={[s.cell, { width: '10%' }]}><Text style={[s.badge, { backgroundColor: inj.fechaFin ? '#fef3c7' : '#fee2e2', color: inj.fechaFin ? '#b45309' : '#b91c1c' }]}>{statusLabel}</Text></View>
                  <View style={[s.cell, { width: '10%' }]}><Text style={[s.badge, { backgroundColor: inj.recaida ? '#fef3c7' : '#dcfce3', color: inj.recaida ? '#b45309' : '#166534' }]}>{relapseLabel}</Text></View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 6, padding: SPACING.md, marginTop: SPACING.sm }}>
            <Text style={{ textAlign: 'center', color: '#15803d', fontFamily: 'Helvetica-Bold', fontSize: FONT_SIZE.sm }}>✓ {t('injuryStats.noActiveInjuries', 'No hay lesiones activas en la plantilla.')}</Text>
          </View>
        )}
      </PdfSection>
    </Page>
  );
};

const CombinedStatsDocument = ({ stats, injuries, players, t, title, date }) => {
  return (
    <Document>
      <TeamStatsPage stats={stats} t={t} title={title} date={date} hideHeader={false} />
      <PlayersStatsPage stats={stats} t={t} title={title} date={date} hideHeader={true} />
      <InjuriesStatsPage injuries={injuries} players={players} t={t} title={title} date={date} hideHeader={true} />
    </Document>
  );
};

// ── Public API ─────────────────────────────────────────────────────

export async function generateTeamStatsPdf(stats, teamName, dateStr, t) {
  const title = `${t('statistics.pdfPrefixTeam', 'Estadisticas_Equipo')} - ${teamName}`;
  await renderPdf(
    <Document>
      <TeamStatsPage stats={stats} t={t} title={title} date={dateStr} hideHeader={false} />
    </Document>,
    `Estadisticas_Equipo_${teamName.replace(/\s+/g, '_')}`
  );
}

export async function generatePlayersStatsPdf(stats, teamName, dateStr, t) {
  const title = `${t('statistics.pdfPrefixPlayers', 'Estadisticas_Jugadores')} - ${teamName}`;
  await renderPdf(
    <Document>
      <PlayersStatsPage stats={stats} t={t} title={title} date={dateStr} hideHeader={false} />
    </Document>,
    `Estadisticas_Jugadores_${teamName.replace(/\s+/g, '_')}`
  );
}

export async function generateInjuriesStatsPdf(injuries, players, teamName, dateStr, t) {
  const title = `${t('statistics.pdfPrefixInjuries', 'Estadisticas_Lesiones')} - ${teamName}`;
  await renderPdf(
    <Document>
      <InjuriesStatsPage injuries={injuries} players={players} t={t} title={title} date={dateStr} hideHeader={false} />
    </Document>,
    `Estadisticas_Lesiones_${teamName.replace(/\s+/g, '_')}`
  );
}

export async function generateCombinedStatsPdf(stats, injuries, players, teamName, dateStr, t) {
  const title = `${t('statistics.pdfPrefixCombined', 'Reporte_Estadisticas_Completo')} - ${teamName}`;
  await renderPdf(
    <CombinedStatsDocument stats={stats} injuries={injuries} players={players} t={t} title={title} date={dateStr} />,
    `Reporte_Estadisticas_Completo_${teamName.replace(/\s+/g, '_')}`
  );
}
