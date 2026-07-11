import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  baseStyles,
  COLORS,
  SPACING,
  FONT_SIZE,
  PdfHeader,
  PdfFooter,
  PdfSection,
  renderPdf,
} from '@/utils/pdfDesign';
import { getPlayerBaseName } from '@/utils/playerHelpers';
import { translatePosition } from '@/components/player/playerHelpers';
import { format } from 'date-fns';

const s = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 34,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: FONT_SIZE.base,
    color: '#1f2937',
  },
  grid2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  grid3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  grid4: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  personalGrid: {
    marginBottom: SPACING.md,
  },
  personalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  personalCard: {
    width: '48.5%',
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  personalCardFull: {
    width: '100%',
  },
  personalLabelText: {
    fontSize: 7.5,
    lineHeight: 9,
    color: '#64748b',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  personalValueText: {
    fontSize: 11,
    lineHeight: 13,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
  },
  profileHero: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    borderBottomWidth: 4,
    borderBottomColor: '#2563eb',
  },
  playerHeroInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profilePhoto: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profilePhotoEmpty: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  heroTextContainer: {
    flexDirection: 'column',
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  profileMetaRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  numberBadge: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
  },
  positionBadge: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  footBadge: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  teamBadge: {
    backgroundColor: '#475569',
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
  },
  heroDetails: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  heroDetailRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 6,
  },
  heroDetailLabel: {
    fontSize: FONT_SIZE.sm,
    color: '#94a3b8',
    fontFamily: 'Helvetica',
  },
  heroDetailValue: {
    fontSize: FONT_SIZE.sm,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  table: {
    width: '100%',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  th: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  td: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: '#374151',
  },
  card: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: '#64748b',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  injuryPdfCard: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 6,
  },
  injuryPdfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  injuryPdfTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    flex: 1,
  },
  injuryPdfMeta: {
    fontSize: FONT_SIZE.xs,
    color: '#64748b',
    marginBottom: 3,
  },
  injuryPdfDetail: {
    fontSize: FONT_SIZE.xs,
    color: '#374151',
    lineHeight: 1.35,
  },
});

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy');
  } catch (e) {
    return dateStr;
  }
};

const optionLabel = (option, prefix, t, fallback = '-') => {
  if (!option) return fallback;
  if (typeof option === 'string') return option;
  return option.value
    ? t(`${prefix}.${option.value}`, option.label || option.value)
    : option.label || option.name || option.es || fallback;
};

const injuryStatus = (injury) => {
  if (!injury?.fechaFin) return { label: 'ACTIVA', color: COLORS.danger };
  return new Date(injury.fechaFin) > new Date()
    ? { label: 'RECUPERACION', color: '#f59e0b' }
    : { label: 'RECUPERADA', color: COLORS.success };
};

const playerInjuryList = (injuries, player) => (
  (injuries || [])
    .filter((i) => (typeof i.jugador === 'object' ? i.jugador._id : i.jugador) === player?._id)
    .sort((a, b) => new Date(b.fechaInicio || 0) - new Date(a.fechaInicio || 0))
);

// --- Perfil General ---
const playerBirthDate = (player) => (
  player?.fechaNacimiento || player?.fecha_nacimiento || player?.birthDate || player?.birthday
);

const translateFoot = (pierna, t) => {
  if (pierna === 'right') return t('player.footRight', 'Derecha');
  if (pierna === 'left') return t('player.footLeft', 'Izquierda');
  if (pierna === 'both') return t('player.footBoth', 'Ambidiestro');
  return pierna || '-';
};

const playerAgeText = (player, t) => {
  const yearsStr = t ? t('player.yearsOld', 'años') : 'años';
  if (player?.edad) return `${player.edad} ${yearsStr}`;
  const birth = playerBirthDate(player);
  if (!birth) return '-';
  const date = new Date(birth);
  if (Number.isNaN(date.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) age -= 1;
  return `${age} ${yearsStr}`;
};

// --- Perfil General ---
const ProfileGeneralPage = ({
  player,
  team,
  fotoBase64,
  stats,
  anthropometryData,
  injuries,
  t,
}) => {
  const name = getPlayerBaseName(player);
  const teamName = team?.nombre || '';
  const latestAntro =
    anthropometryData && anthropometryData.length > 0 ? anthropometryData[0] : null;
  const displayWeight = latestAntro?.peso || player.peso;
  const profileInjuries = playerInjuryList(injuries, player);
  const personalItems = [
    player.apodo ? [t('player.nickname', 'Apodo'), player.apodo] : null,
    [t('player.height', 'Altura'), player.altura ? `${player.altura} cm` : '-'],
    [t('player.profile.weight', 'Peso'), displayWeight ? `${displayWeight} kg` : '-'],
    [t('player.sex', 'Sexo'), player.sexo || '-'],
    [
      t('player.profile.type', 'Tipo'),
      player.esExtra || player.extra
        ? t('player.profile.extraPlayer', 'Extra')
        : t('player.profile.rosterPlayer', 'Plantilla'),
    ],
    (player.extra || player.esExtra) && player.procedenciaExtra
      ? [t('player.extraOrigin', 'Procedencia del jugador extra'), player.procedenciaExtra]
      : null,
    (player.extra || player.esExtra) && player.categoriaExtra
      ? [t('player.extraCategory', 'Categoría de procedencia'), player.categoriaExtra]
      : null,
  ].filter(Boolean);

  return (
    <Page size="A4" style={s.page}>
      <PdfHeader title={t('player.profile.title')} transparent={true} />
      <View style={baseStyles.content}>
        <View style={s.profileHero} wrap={false}>
          <View style={s.playerHeroInfo}>
            {fotoBase64 ? (
              <Image src={fotoBase64} style={s.profilePhoto} />
            ) : (              <View style={s.profilePhotoEmpty}>
                <Text style={{ color: '#94a3b8', fontSize: 10 }}>{t('player.profile.noPhoto', 'Sin foto')}</Text>
              </View>
            )}
            <View style={s.heroTextContainer}>
              <Text style={s.profileName}>{name}</Text>
              <View style={s.profileMetaRow}>
                {player.dorsal ? <Text style={s.numberBadge}>#{player.dorsal}</Text> : null}
                {player.posicion ? <Text style={s.positionBadge}>{translatePosition(player.posicion, t)}</Text> : null}
                {player.pierna ? (
                   <Text style={s.footBadge}>{translateFoot(player.pierna, t)}</Text>
                ) : null}
                {teamName ? <Text style={s.teamBadge}>{teamName}</Text> : null}
              </View>
            </View>
          </View>
          <View style={s.heroDetails}>
            <View style={s.heroDetailRow}>
              <Text style={s.heroDetailLabel}>{t('player.birthDate')}:</Text>
              <Text style={s.heroDetailValue}>{formatDate(playerBirthDate(player))}</Text>
            </View>
            <View style={s.heroDetailRow}>
              <Text style={s.heroDetailLabel}>{t('player.age')}:</Text>
              <Text style={s.heroDetailValue}>{playerAgeText(player, t)}</Text>
            </View>
          </View>
        </View>

        <View wrap={false}>
          <PdfSection title={t('player.profile.personalInfo', 'Información personal')}>
            <View style={s.personalGrid} wrap={false}>
              {Array.from({ length: Math.ceil(personalItems.length / 2) }).map((_, rowIndex) => {
                const rowItems = personalItems.slice(rowIndex * 2, rowIndex * 2 + 2);
                return (
                  <View key={`personal-row-${rowIndex}`} style={s.personalRow}>
                    {rowItems.map(([label, value]) => (
                      <View
                        key={`${label}-${rowIndex}`}
                        style={[
                          s.personalCard,
                          rowItems.length === 1 ? s.personalCardFull : null,
                        ]}
                      >
                        <Text style={s.personalLabelText}>{label}</Text>
                        <Text style={s.personalValueText}>{value}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          </PdfSection>
        </View>

        {stats && (
          <View wrap={false}>
            <PdfSection title={t('player.profile.matchStats', 'Estadísticas de Partidos')}>
              <View style={s.grid4}>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#2563eb' }]}>{stats.matches?.total || 0}</Text>
                  <Text style={s.statLabel}>{t('player.profile.played', 'Jugados')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{stats.matches?.starter || 0}</Text>
                  <Text style={s.statLabel}>{t('player.profile.starter', 'Titular')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{stats.matches?.substitute || 0}</Text>
                  <Text style={s.statLabel}>{t('player.profile.substitute', 'Suplente')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{stats.matches?.minutesPlayed || 0}'</Text>
                  <Text style={s.statLabel}>{t('player.profile.minutes', 'Minutos')}</Text>
                </View>
              </View>
              <View style={s.grid4}>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#10b981' }]}>
                    {stats.goals?.total || 0}
                  </Text>
                  <Text style={s.statLabel}>{t('player.profile.goalsShort', 'Goles')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#10b981' }]}>
                    {stats.goals?.assists || 0}
                  </Text>
                  <Text style={s.statLabel}>{t('player.profile.assistsShort', 'Asistencias')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#f59e0b' }]}>
                    {stats.cards?.yellow || 0}
                  </Text>
                  <Text style={s.statLabel}>{t('player.profile.yellowCardsAbbr', 'T. Amarillas')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#ef4444' }]}>
                    {stats.cards?.red || 0}
                  </Text>
                  <Text style={s.statLabel}>{t('player.profile.redCardsAbbr', 'T. Rojas')}</Text>
                </View>
              </View>
            </PdfSection>
          </View>
        )}

        {stats && stats.trainings && (
          <View wrap={false}>
            <PdfSection title={t('player.profile.attendanceReport')}>
              <View style={s.grid4}>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{stats.trainings.total || 0}</Text>
                  <Text style={s.statLabel}>{t('player.profile.total', 'Total')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#10b981' }]}>
                    {stats.trainings.attended || 0}
                  </Text>
                  <Text style={s.statLabel}>{t('player.profile.attended', 'Asistió')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#ef4444' }]}>
                    {stats.trainings.missed || 0}
                  </Text>
                  <Text style={s.statLabel}>{t('player.profile.missed', 'Faltó')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#2563eb' }]}>
                    {stats.trainings.percentage || 0}%
                  </Text>
                  <Text style={s.statLabel}>{t('player.profile.attendance', 'Asistencia')}</Text>
                </View>
              </View>
            </PdfSection>
          </View>
        )}

        {latestAntro && (
          <View wrap={false}>
            <PdfSection
              title={`${t('anthropometry.latestMeasurement')} (${formatDate(latestAntro.fecha)})`}
            >
              <View style={s.grid3}>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#2563eb' }]}>{latestAntro.peso || '-'} kg</Text>
                  <Text style={s.statLabel}>{t('anthropometry.weight')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#2563eb' }]}>
                    {latestAntro.porcentajeGrasa ? latestAntro.porcentajeGrasa.toFixed(1) : '-'}%
                  </Text>
                  <Text style={s.statLabel}>{t('anthropometry.fatPercentage')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#2563eb' }]}>
                    {latestAntro.sumaPliegues ? latestAntro.sumaPliegues.toFixed(1) : '-'} mm
                  </Text>
                  <Text style={s.statLabel}>{t('anthropometry.sumOfFolds')}</Text>
                </View>
              </View>
            </PdfSection>
          </View>
        )}

        {stats && stats.injuries && stats.injuries.total > 0 && (
          <View wrap={false}>
            <PdfSection title={t('player.profile.injuryHistory')}>
              <View style={s.grid4}>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{stats.injuries.total || 0}</Text>
                  <Text style={s.statLabel}>{t('player.profile.total', 'Total')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#ef4444' }]}>
                    {stats.injuries.active || 0}
                  </Text>
                  <Text style={s.statLabel}>{t('player.profile.active', 'Activas')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: '#10b981' }]}>
                    {stats.injuries.recovered || 0}
                  </Text>
                  <Text style={s.statLabel}>{t('player.profile.recovered', 'Recuperadas')}</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statValue}>{stats.injuries.daysMissed || 0}</Text>
                  <Text style={s.statLabel}>{t('player.profile.daysOff', 'Días Baja')}</Text>
                </View>
              </View>
              <View style={{ marginTop: 6 }}>
                {profileInjuries.map((inj, index) => {
                  const status = injuryStatus(inj);
                  const zone = optionLabel(inj.zona, 'injury.zones', t);
                  const type = optionLabel(inj.tipo, 'injury.types', t, 'Lesion');
                  return (
                    <View key={index} style={[s.injuryPdfCard, { borderLeftWidth: 4, borderLeftColor: status.color }]} wrap={false}>
                      <View style={s.injuryPdfHeader}>
                        <Text style={s.injuryPdfTitle}>
                          {type} - {zone}
                          {inj.lado
                            ? ` (${inj.lado === 'derecha' ? t('injury.sideRight', 'Derecha') : t('injury.sideLeft', 'Izquierda')})`
                            : ''}
                        </Text>
                        <Text style={[s.badge, { backgroundColor: status.color }]}>{status.label}</Text>
                      </View>
                      <Text style={s.injuryPdfMeta}>
                        {t('player.profile.injuryDetailStart', 'Inicio')}: {formatDate(inj.fechaInicio)}
                        {inj.fechaFinPrevista ? ` - ${t('player.profile.injuryDetailEstimated', 'Prevista')}: ${formatDate(inj.fechaFinPrevista)}` : ''}
                        {inj.fechaFin ? ` - ${t('player.profile.injuryDetailEnd', 'Fin')}: ${formatDate(inj.fechaFin)}` : ''}
                      </Text>
                      {Boolean(inj.lesionEspecifica) && (
                        <Text style={s.injuryPdfDetail}>{t('player.profile.injuryDetailDesc', 'Detalle')}: {inj.lesionEspecifica}</Text>
                      )}
                      {inj.recaida && <Text style={s.injuryPdfMeta}>{t('player.profile.relapseRegistered', 'Recaída registrada')}</Text>}
                    </View>
                  );
                })}
              </View>
            </PdfSection>
          </View>
        )}
      </View>
      <PdfFooter />
    </Page>
  );
};

// --- Antropometría ---
const AnthropometryPage = ({ player, team, data, t }) => {
  const latest = data && data.length > 0 ? data[0] : null;
  return (
    <Page size="A4" style={s.page}>
      <PdfHeader title={t('anthropometry.title')} subtitle={getPlayerBaseName(player)} transparent={true} />
      <View style={baseStyles.content}>
        {latest ? (
          <PdfSection
            title={`${t('anthropometry.latestMeasurement')} (${formatDate(latest.fecha)})`}
          >
            <View style={s.grid3}>
              <View style={s.statCard}>
                <Text style={s.statValue}>{latest.peso || '-'} kg</Text>
                <Text style={s.statLabel}>{t('anthropometry.weight')}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>
                  {latest.porcentajeGrasa ? latest.porcentajeGrasa.toFixed(1) : '-'}%
                </Text>
                <Text style={s.statLabel}>{t('anthropometry.fatPercentage')}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>
                  {latest.sumaPliegues ? latest.sumaPliegues.toFixed(1) : '-'} mm
                </Text>
                <Text style={s.statLabel}>{t('anthropometry.sumOfFolds')}</Text>
              </View>
            </View>

            <Text style={[s.cardTitle, { marginTop: SPACING.md, marginBottom: 4 }]}>
              {t('anthropometry.skinfolds')} (
              {t(
                latest.sistema_pliegues === '8'
                  ? 'anthropometry.systemBadgeEight'
                  : 'anthropometry.systemBadgeSix',
              )}
              )
            </Text>
            <View style={s.grid3}>
              <View style={s.card}>
                <Text style={s.statLabel}>{t('anthropometry.tricipital', 'Tricipital')}</Text>
                <Text style={s.statValue}>
                  {latest.pliegues?.tricipital != null
                    ? `${Number(latest.pliegues.tricipital).toFixed(1)} mm`
                    : '-'}
                </Text>
              </View>
              <View style={s.card}>
                <Text style={s.statLabel}>{t('anthropometry.bicipital', 'Bicipital')}</Text>
                <Text style={s.statValue}>
                  {latest.pliegues?.bicipital != null
                    ? `${Number(latest.pliegues.bicipital).toFixed(1)} mm`
                    : '-'}
                </Text>
              </View>
              <View style={s.card}>
                <Text style={s.statLabel}>{t('anthropometry.subescapular', 'Subescapular')}</Text>
                <Text style={s.statValue}>
                  {latest.pliegues?.subescapular != null
                    ? `${Number(latest.pliegues.subescapular).toFixed(1)} mm`
                    : '-'}
                </Text>
              </View>
            </View>
            <View style={s.grid3}>
              <View style={s.card}>
                <Text style={s.statLabel}>{t('anthropometry.suprailiaco', 'Suprailíaco')}</Text>
                <Text style={s.statValue}>
                  {latest.pliegues?.suprailiaco != null
                    ? `${Number(latest.pliegues.suprailiaco).toFixed(1)} mm`
                    : '-'}
                </Text>
              </View>
              <View style={s.card}>
                <Text style={s.statLabel}>{t('anthropometry.musloFrontal', 'Muslo Frontal')}</Text>
                <Text style={s.statValue}>
                  {latest.pliegues?.muslo_frontal != null
                    ? `${Number(latest.pliegues.muslo_frontal).toFixed(1)} mm`
                    : '-'}
                </Text>
              </View>
              <View style={s.card}>
                <Text style={s.statLabel}>{t('anthropometry.piernaMedial', 'Pierna Medial')}</Text>
                <Text style={s.statValue}>
                  {latest.pliegues?.pierna_medial != null
                    ? `${Number(latest.pliegues.pierna_medial).toFixed(1)} mm`
                    : '-'}
                </Text>
              </View>
            </View>

            {(latest.sistema_pliegues === '8' ||
              latest.pliegues?.abdominal != null ||
              latest.pliegues?.cresta_iliaca != null) && (
              <View style={s.grid3}>
                <View style={s.card}>
                  <Text style={s.statLabel}>{t('anthropometry.abdominal', 'Abdominal')}</Text>
                  <Text style={s.statValue}>
                    {latest.pliegues?.abdominal != null
                      ? `${Number(latest.pliegues.abdominal).toFixed(1)} mm`
                      : '-'}
                  </Text>
                </View>
                <View style={s.card}>
                  <Text style={s.statLabel}>{t('anthropometry.crestaIliaca', 'Cresta Ilíaca')}</Text>
                  <Text style={s.statValue}>
                    {latest.pliegues?.cresta_iliaca != null
                      ? `${Number(latest.pliegues.cresta_iliaca).toFixed(1)} mm`
                      : '-'}
                  </Text>
                </View>
                <View
                  style={[s.card, { borderColor: 'transparent', backgroundColor: 'transparent' }]}
                >
                  <Text style={s.statLabel}></Text>
                  <Text style={s.statValue}></Text>
                </View>
              </View>
            )}
          </PdfSection>
        ) : (
          <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>
            {t('player.profile.noMeasurements', 'No hay mediciones registradas.')}
          </Text>
        )}

        {data && data.length > 1 && (
          <PdfSection title={t('anthropometry.playerHistory')}>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={s.th}>{t('anthropometry.date')}</Text>
                <Text style={s.th}>{t('anthropometry.weight')}</Text>
                <Text style={s.th}>{t('anthropometry.skinfolds', 'Pliegues')}</Text>
                <Text style={s.th}>% {t('player.profile.goalsShort', 'Grasa') || 'Grasa'}</Text>
              </View>
              {data.map((m, i) => (
                <View key={i} style={s.tableRow}>
                  <Text style={s.td}>{formatDate(m.fecha)}</Text>
                  <Text style={s.td}>{m.peso || '-'} kg</Text>
                  <Text style={s.td}>{m.sumaPliegues ? m.sumaPliegues.toFixed(1) : '-'} mm</Text>
                  <Text style={s.td}>
                    {m.porcentajeGrasa ? m.porcentajeGrasa.toFixed(1) : '-'}%
                  </Text>
                </View>
              ))}
            </View>
          </PdfSection>
        )}
      </View>
      <PdfFooter />
    </Page>
  );
};

// --- Asistencia ---
const AttendancePage = ({ player, stats, t }) => {
  const missed = stats?.trainings?.missedSessions || [];
  return (
    <Page size="A4" style={s.page}>
      <PdfHeader
        title={t('player.profile.attendanceReport')}
        subtitle={getPlayerBaseName(player)}
        transparent={true}
      />
      <View style={baseStyles.content}>
        <View style={s.grid4}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats?.trainings?.total || 0}</Text>
            <Text style={s.statLabel}>{t('player.profile.total', 'Total')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: COLORS.success }]}>
              {stats?.trainings?.attended || 0}
            </Text>
            <Text style={s.statLabel}>{t('player.profile.attended', 'Asistió')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: COLORS.danger }]}>
              {stats?.trainings?.missed || 0}
            </Text>
            <Text style={s.statLabel}>{t('player.profile.missed', 'Faltó')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: COLORS.accent }]}>
              {stats?.trainings?.percentage || 0}%
            </Text>
            <Text style={s.statLabel}>{t('player.profile.attendance', 'Asistencia')}</Text>
          </View>
        </View>

        <PdfSection title={t('player.profile.missedTrainingsList')}>
          {missed.length > 0 ? (
            missed.map((session, i) => (
              <View
                key={i}
                style={[s.card, { flexDirection: 'row', alignItems: 'center' }]}
                wrap={false}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: COLORS.danger,
                    marginRight: 10,
                  }}
                />
                <View>
                  <Text style={s.cardTitle}>
                    {formatDate(session.fecha)}{' '}
                    {session.horaInicio ? `- ${session.horaInicio}` : ''}
                  </Text>
                  <Text style={s.cardSubtitle}>{session.nombre || t('player.profile.trainingSession', 'Sesión de Entrenamiento')}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>
              {t('player.profile.noMissedTrainings', 'No hay faltas registradas.')}
            </Text>
          )}
        </PdfSection>
      </View>
      <PdfFooter />
    </Page>
  );
};

// --- Lesiones ---
const InjuryPage = ({ player, stats, injuries, t }) => {
  const playerInjuries = playerInjuryList(injuries, player);

  return (
    <Page size="A4" style={s.page}>
      <PdfHeader title={t('player.profile.injuryHistory')} subtitle={getPlayerBaseName(player)} transparent={true} />
      <View style={baseStyles.content}>
        <View style={s.grid4}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats?.injuries?.total || 0}</Text>
            <Text style={s.statLabel}>{t('player.profile.total', 'Total')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: COLORS.danger }]}>
              {stats?.injuries?.active || 0}
            </Text>
            <Text style={s.statLabel}>{t('player.profile.active', 'Activas')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: COLORS.success }]}>
              {stats?.injuries?.recovered || 0}
            </Text>
            <Text style={s.statLabel}>{t('player.profile.recovered', 'Recuperadas')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{stats?.injuries?.daysMissed || 0}</Text>
            <Text style={s.statLabel}>{t('player.profile.daysOff', 'Días Baja')}</Text>
          </View>
        </View>

        <PdfSection title={t('player.profile.injuryDetails')}>
          {playerInjuries.length > 0 ? (
            playerInjuries.map((inj, i) => {
              const status = injuryStatus(inj);
              return (
                <View key={i} style={s.card} wrap={false}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <Text style={s.cardTitle}>{optionLabel(inj.tipo, 'injury.types', t, t('player.profile.unknown'))}</Text>
                    <Text
                      style={[
                        s.badge,
                        { backgroundColor: status.color },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </View>
                  <Text style={s.cardSubtitle}>
                    {t('player.profile.injuryDetailStart', 'Inicio')}: {formatDate(inj.fechaInicio)}{' '}
                    {inj.fechaFinPrevista ? `| ${t('player.profile.injuryDetailEstimated', 'Prevista')}: ${formatDate(inj.fechaFinPrevista)} ` : ''}
                    {inj.fechaFin ? `| ${t('player.profile.injuryDetailEnd', 'Fin')}: ${formatDate(inj.fechaFin)}` : ''}
                  </Text>
                  {Boolean(inj.zona) && (
                    <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text }}>
                      {t('player.profile.injuryLocation', 'Ubicación')}: {optionLabel(inj.zona, 'injury.zones', t, t('player.profile.unknownLocation'))}
                      {inj.lado
                        ? ` (${inj.lado === 'derecha' ? t('injury.sideRight', 'Derecha') : t('injury.sideLeft', 'Izquierda')})`
                        : ''}
                    </Text>
                  )}
                  {Boolean(inj.lesionEspecifica) && (
                    <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text }}>
                      {t('player.profile.specificInjury', 'Lesión')}: {inj.lesionEspecifica}
                    </Text>
                  )}
                  {Boolean(inj.descripcion) && (
                    <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text, marginTop: 4 }}>
                      {inj.descripcion}
                    </Text>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>
              {t('player.profile.noInjuries', 'No hay lesiones registradas.')}
            </Text>
          )}
        </PdfSection>
      </View>
      <PdfFooter />
    </Page>
  );
};

// --- Wellness ---
const WellnessPage = ({ player, wellnessData, isPreWellness, t }) => {
  const history = wellnessData?.history || [];
  const title = isPreWellness
    ? t('player.profile.preWellnessHistory')
    : t('player.profile.wellnessHistory');

  return (
    <Page size="A4" style={s.page}>
      <PdfHeader title={title} subtitle={getPlayerBaseName(player)} transparent={true} />
      <View style={baseStyles.content}>
        <View style={s.grid2}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{wellnessData?.totalResponses || 0}</Text>
            <Text style={s.statLabel}>{t('player.profile.totalReports', 'Total Reportes')}</Text>
          </View>
          {!isPreWellness && (
            <View style={s.statCard}>
              <Text style={[s.statValue, { color: COLORS.primary }]}>
                {wellnessData?.averageWellness ? wellnessData.averageWellness.toFixed(1) : '-'}
              </Text>
              <Text style={s.statLabel}>{t('player.profile.averageScore', 'Puntuación Media')}</Text>
            </View>
          )}
        </View>

        <PdfSection title={t('player.profile.completeHistory')}>
          {history.length > 0 ? (
            history.map((item, i) => {
              const score = item.wellness || 0;
              const scoreColor =
                score >= 8 ? COLORS.success : score >= 6 ? COLORS.accent : COLORS.danger;

              return (
                <View key={i} style={s.card} wrap={false}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <Text style={s.cardTitle}>
                      {formatDate(item.sessionDate || item.session?.fecha)}
                    </Text>
                    {!isPreWellness && (
                      <Text style={[s.badge, { backgroundColor: scoreColor, fontSize: 10 }]}>
                        {score}/10
                      </Text>
                    )}
                  </View>

                  {item.questionResponses &&
                    item.questionResponses.map((qr, qI) => (
                      <View key={qI} style={{ flexDirection: 'row', marginBottom: 2 }}>
                        <Text
                          style={{
                            fontSize: FONT_SIZE.xs,
                            fontFamily: 'Helvetica-Bold',
                            color: COLORS.text,
                            marginRight: 4,
                          }}
                        >
                          {qr.question}:
                        </Text>
                        <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text }}>
                          {qr.answer || qr.response || ''}
                        </Text>
                      </View>
                    ))}

                  {Boolean(item.comment) && (
                    <Text
                      style={{
                        fontSize: FONT_SIZE.xs,
                        color: COLORS.textMuted,
                        marginTop: 4,
                        fontStyle: 'italic',
                      }}
                    >
                      "{item.comment}"
                    </Text>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>
              {t('player.profile.noRecords', 'No hay registros.')}
            </Text>
          )}
        </PdfSection>
      </View>
      <PdfFooter />
    </Page>
  );
};

// ── EXPORTACIÓN ASÍNCRONA ──────────────────────────────────────────

export const generateProfilePdf = async ({
  player,
  team,
  fotoBase64,
  stats,
  anthropometryData,
  injuries,
  t,
}) => {
  const fileName = `perfil_${getPlayerBaseName(player).replace(/\s+/g, '_')}`;
  await renderPdf(
    <Document>
      <ProfileGeneralPage
        player={player}
        team={team}
        fotoBase64={fotoBase64}
        stats={stats}
        anthropometryData={anthropometryData}
        injuries={injuries}
        t={t}
      />
    </Document>,
    fileName,
  );
};

export const generateAnthropometryPdf = async ({ player, team, data, t }) => {
  const fileName = `antropometria_${getPlayerBaseName(player).replace(/\\s+/g, '_')}`;
  await renderPdf(
    <Document>
      <AnthropometryPage player={player} team={team} data={data} t={t} />
    </Document>,
    fileName,
  );
};

export const generateAttendancePdf = async ({ player, team, stats, t }) => {
  const fileName = `asistencia_${getPlayerBaseName(player).replace(/\\s+/g, '_')}`;
  await renderPdf(
    <Document>
      <AttendancePage player={player} stats={stats} t={t} />
    </Document>,
    fileName,
  );
};

export const generateInjuryPdf = async ({ player, team, stats, injuries, t }) => {
  const fileName = `lesiones_${getPlayerBaseName(player).replace(/\\s+/g, '_')}`;
  await renderPdf(
    <Document>
      <InjuryPage player={player} stats={stats} injuries={injuries} t={t} />
    </Document>,
    fileName,
  );
};

export const generateWellnessPdf = async ({ player, team, wellnessData, t }) => {
  const fileName = `wellness_${getPlayerBaseName(player).replace(/\\s+/g, '_')}`;
  await renderPdf(
    <Document>
      <WellnessPage player={player} wellnessData={wellnessData} isPreWellness={false} t={t} />
    </Document>,
    fileName,
  );
};

export const generatePreWellnessPdf = async ({ player, team, preWellnessData, t }) => {
  const fileName = `prewellness_${getPlayerBaseName(player).replace(/\\s+/g, '_')}`;
  await renderPdf(
    <Document>
      <WellnessPage player={player} wellnessData={preWellnessData} isPreWellness={true} t={t} />
    </Document>,
    fileName,
  );
};
