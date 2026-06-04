import React from 'react';
import {
  Document, Page, Text, View, Image, StyleSheet,
  baseStyles, COLORS, SPACING, FONT_SIZE,
  PdfHeader, PdfFooter, PdfSection,
  renderPdf
} from '@/utils/pdfDesign';
import { getPlayerFullName } from '@/utils/playerHelpers';
import { format } from 'date-fns';

const s = StyleSheet.create({
  grid2: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, marginBottom: SPACING.md },
  grid3: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.md },
  grid4: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: {
    flex: 1,
    padding: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: SPACING.sm,
  },
  playerName: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
  },
  teamName: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  table: {
    width: '100%',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgHeader,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  th: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  td: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
  },
  card: {
    padding: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
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

// --- Perfil General ---
const ProfileGeneralPage = ({ player, team, fotoBase64, stats, anthropometryData, injuries, t }) => {
  const name = getPlayerFullName(player);
  const teamName = team?.nombre || '';
  const latestAntro = anthropometryData && anthropometryData.length > 0 ? anthropometryData[0] : null;

  return (
    <Page size="A4" style={baseStyles.page}>
      <PdfHeader title={t('player.profile.title')} subtitle={name} />
      <View style={baseStyles.content}>
        
        <View style={s.avatarContainer}>
          {fotoBase64 ? (
            <Image src={fotoBase64} style={s.avatar} />
          ) : (
            <View style={[s.avatar, { backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: COLORS.textMuted, fontSize: FONT_SIZE.sm }}>Sin Foto</Text>
            </View>
          )}
          <Text style={s.playerName}>{name}</Text>
          <Text style={s.teamName}>{teamName}</Text>
        </View>

        <PdfSection title="Información Personal">
          <View style={s.grid4}>
            <View style={s.statCard}><Text style={s.statLabel}>Posición</Text><Text style={[s.statValue, { fontSize: FONT_SIZE.md, marginTop: 4 }]}>{player.posicion || '-'}</Text></View>
            <View style={s.statCard}><Text style={s.statLabel}>Dorsal</Text><Text style={[s.statValue, { fontSize: FONT_SIZE.md, marginTop: 4 }]}>{player.dorsal || '-'}</Text></View>
            <View style={s.statCard}><Text style={s.statLabel}>Altura</Text><Text style={[s.statValue, { fontSize: FONT_SIZE.md, marginTop: 4 }]}>{player.altura ? `${player.altura} cm` : '-'}</Text></View>
            <View style={s.statCard}><Text style={s.statLabel}>Peso</Text><Text style={[s.statValue, { fontSize: FONT_SIZE.md, marginTop: 4 }]}>{player.peso ? `${player.peso} kg` : '-'}</Text></View>
          </View>
        </PdfSection>

        {stats && (
          <View wrap={false}>
            <PdfSection title="Estadísticas de Partidos">
              <View style={s.grid4}>
                <View style={s.statCard}><Text style={s.statValue}>{stats.matches?.total || 0}</Text><Text style={s.statLabel}>Jugados</Text></View>
                <View style={s.statCard}><Text style={s.statValue}>{stats.matches?.starter || 0}</Text><Text style={s.statLabel}>Titular</Text></View>
                <View style={s.statCard}><Text style={s.statValue}>{stats.matches?.substitute || 0}</Text><Text style={s.statLabel}>Suplente</Text></View>
                <View style={s.statCard}><Text style={s.statValue}>{stats.matches?.minutesPlayed || 0}</Text><Text style={s.statLabel}>Minutos</Text></View>
              </View>
              <View style={s.grid4}>
                <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.success}]}>{stats.goals?.total || 0}</Text><Text style={s.statLabel}>Goles</Text></View>
                <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.success}]}>{stats.goals?.assists || 0}</Text><Text style={s.statLabel}>Asistencias</Text></View>
                <View style={s.statCard}><Text style={[s.statValue, {color: '#eab308'}]}>{stats.cards?.yellow || 0}</Text><Text style={s.statLabel}>T. Amarillas</Text></View>
                <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.danger}]}>{stats.cards?.red || 0}</Text><Text style={s.statLabel}>T. Rojas</Text></View>
              </View>
            </PdfSection>
          </View>
        )}

        {stats && stats.trainings && (
          <View wrap={false}>
            <PdfSection title={t('player.profile.attendanceReport')}>
              <View style={s.grid4}>
                <View style={s.statCard}><Text style={s.statValue}>{stats.trainings.total || 0}</Text><Text style={s.statLabel}>Total</Text></View>
                <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.success}]}>{stats.trainings.attended || 0}</Text><Text style={s.statLabel}>Asistió</Text></View>
                <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.danger}]}>{stats.trainings.missed || 0}</Text><Text style={s.statLabel}>Faltó</Text></View>
                <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.accent}]}>{stats.trainings.percentage || 0}%</Text><Text style={s.statLabel}>Asistencia</Text></View>
              </View>
            </PdfSection>
          </View>
        )}

        {latestAntro && (
          <View wrap={false}>
            <PdfSection title={`${t('anthropometry.latestMeasurement')} (${formatDate(latestAntro.fecha)})`}>
              <View style={s.grid3}>
                <View style={s.statCard}><Text style={s.statValue}>{latestAntro.peso || '-'} kg</Text><Text style={s.statLabel}>{t('anthropometry.weight')}</Text></View>
                <View style={s.statCard}><Text style={s.statValue}>{latestAntro.porcentajeGrasa ? latestAntro.porcentajeGrasa.toFixed(1) : '-'}%</Text><Text style={s.statLabel}>{t('anthropometry.fatPercentage')}</Text></View>
                <View style={s.statCard}><Text style={s.statValue}>{latestAntro.sumaPliegues ? latestAntro.sumaPliegues.toFixed(1) : '-'} mm</Text><Text style={s.statLabel}>{t('anthropometry.sumOfFolds')}</Text></View>
              </View>
            </PdfSection>
          </View>
        )}

        {stats && stats.injuries && stats.injuries.total > 0 && (
          <View wrap={false}>
            <PdfSection title={t('player.profile.injuryHistory')}>
              <View style={s.grid4}>
                <View style={s.statCard}><Text style={s.statValue}>{stats.injuries.total || 0}</Text><Text style={s.statLabel}>Total</Text></View>
                <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.danger}]}>{stats.injuries.active || 0}</Text><Text style={s.statLabel}>Activas</Text></View>
                <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.success}]}>{stats.injuries.recovered || 0}</Text><Text style={s.statLabel}>Recuperadas</Text></View>
                <View style={s.statCard}><Text style={s.statValue}>{stats.injuries.daysMissed || 0}</Text><Text style={s.statLabel}>Días Baja</Text></View>
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
    <Page size="A4" style={baseStyles.page}>
      <PdfHeader title={t('anthropometry.title')} subtitle={getPlayerFullName(player)} />
      <View style={baseStyles.content}>
        {latest ? (
          <PdfSection title={`${t('anthropometry.latestMeasurement')} (${formatDate(latest.fecha)})`}>
            <View style={s.grid3}>
              <View style={s.statCard}>
                <Text style={s.statValue}>{latest.peso || '-'} kg</Text>
                <Text style={s.statLabel}>{t('anthropometry.weight')}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>{latest.porcentajeGrasa ? latest.porcentajeGrasa.toFixed(1) : '-'}%</Text>
                <Text style={s.statLabel}>{t('anthropometry.fatPercentage')}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>{latest.sumaPliegues ? latest.sumaPliegues.toFixed(1) : '-'} mm</Text>
                <Text style={s.statLabel}>{t('anthropometry.sumOfFolds')}</Text>
              </View>
            </View>
            
            <Text style={[s.cardTitle, { marginTop: SPACING.md }]}>{t('anthropometry.skinfolds')}</Text>
            <View style={s.grid3}>
              <View style={s.card}><Text style={s.statLabel}>Tricipital</Text><Text style={s.statValue}>{latest.pliegues?.tricipital || '-'} mm</Text></View>
              <View style={s.card}><Text style={s.statLabel}>Subescapular</Text><Text style={s.statValue}>{latest.pliegues?.subescapular || '-'} mm</Text></View>
              <View style={s.card}><Text style={s.statLabel}>Suprailíaco</Text><Text style={s.statValue}>{latest.pliegues?.suprailiaco || '-'} mm</Text></View>
            </View>
            <View style={s.grid3}>
              <View style={s.card}><Text style={s.statLabel}>Abdominal</Text><Text style={s.statValue}>{latest.pliegues?.abdominal || '-'} mm</Text></View>
              <View style={s.card}><Text style={s.statLabel}>Muslo Frontal</Text><Text style={s.statValue}>{latest.pliegues?.muslo_frontal || '-'} mm</Text></View>
              <View style={s.card}><Text style={s.statLabel}>Pierna Medial</Text><Text style={s.statValue}>{latest.pliegues?.pierna_medial || '-'} mm</Text></View>
            </View>
          </PdfSection>
        ) : (
          <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>No hay mediciones registradas.</Text>
        )}

        {data && data.length > 1 && (
          <PdfSection title={t('anthropometry.playerHistory')}>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={s.th}>{t('anthropometry.date')}</Text>
                <Text style={s.th}>{t('anthropometry.weight')}</Text>
                <Text style={s.th}>Pliegues</Text>
                <Text style={s.th}>% Grasa</Text>
              </View>
              {data.map((m, i) => (
                <View key={i} style={s.tableRow}>
                  <Text style={s.td}>{formatDate(m.fecha)}</Text>
                  <Text style={s.td}>{m.peso || '-'} kg</Text>
                  <Text style={s.td}>{m.sumaPliegues ? m.sumaPliegues.toFixed(1) : '-'} mm</Text>
                  <Text style={s.td}>{m.porcentajeGrasa ? m.porcentajeGrasa.toFixed(1) : '-'}%</Text>
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
    <Page size="A4" style={baseStyles.page}>
      <PdfHeader title={t('player.profile.attendanceReport')} subtitle={getPlayerFullName(player)} />
      <View style={baseStyles.content}>
        <View style={s.grid4}>
          <View style={s.statCard}><Text style={s.statValue}>{stats?.trainings?.total || 0}</Text><Text style={s.statLabel}>Total</Text></View>
          <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.success}]}>{stats?.trainings?.attended || 0}</Text><Text style={s.statLabel}>Asistió</Text></View>
          <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.danger}]}>{stats?.trainings?.missed || 0}</Text><Text style={s.statLabel}>Faltó</Text></View>
          <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.accent}]}>{stats?.trainings?.percentage || 0}%</Text><Text style={s.statLabel}>Asistencia</Text></View>
        </View>

        <PdfSection title={t('player.profile.missedTrainingsList')}>
          {missed.length > 0 ? missed.map((session, i) => (
            <View key={i} style={[s.card, { flexDirection: 'row', alignItems: 'center' }]} wrap={false}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.danger, marginRight: 10 }} />
              <View>
                <Text style={s.cardTitle}>{formatDate(session.fecha)} {session.horaInicio ? `- ${session.horaInicio}` : ''}</Text>
                <Text style={s.cardSubtitle}>{session.nombre || 'Sesión de Entrenamiento'}</Text>
              </View>
            </View>
          )) : (
            <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>No hay faltas registradas.</Text>
          )}
        </PdfSection>
      </View>
      <PdfFooter />
    </Page>
  );
};

// --- Lesiones ---
const InjuryPage = ({ player, stats, injuries, t }) => {
  const playerInjuries = injuries
    .filter(i => (typeof i.jugador === 'object' ? i.jugador._id : i.jugador) === player._id)
    .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));

  return (
    <Page size="A4" style={baseStyles.page}>
      <PdfHeader title={t('player.profile.injuryHistory')} subtitle={getPlayerFullName(player)} />
      <View style={baseStyles.content}>
        <View style={s.grid4}>
          <View style={s.statCard}><Text style={s.statValue}>{stats?.injuries?.total || 0}</Text><Text style={s.statLabel}>Total</Text></View>
          <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.danger}]}>{stats?.injuries?.active || 0}</Text><Text style={s.statLabel}>Activas</Text></View>
          <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.success}]}>{stats?.injuries?.recovered || 0}</Text><Text style={s.statLabel}>Recuperadas</Text></View>
          <View style={s.statCard}><Text style={s.statValue}>{stats?.injuries?.daysMissed || 0}</Text><Text style={s.statLabel}>Días Baja</Text></View>
        </View>

        <PdfSection title={t('player.profile.injuryDetails')}>
          {playerInjuries.length > 0 ? playerInjuries.map((inj, i) => {
            const isActive = inj.estado === 'activa' || !inj.fechaFin;
            return (
              <View key={i} style={s.card} wrap={false}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={s.cardTitle}>{inj.tipo || 'Desconocido'}</Text>
                  <Text style={[s.badge, { backgroundColor: isActive ? COLORS.danger : COLORS.success }]}>
                    {isActive ? 'ACTIVA' : 'RECUPERADO'}
                  </Text>
                </View>
                <Text style={s.cardSubtitle}>Inicio: {formatDate(inj.fechaInicio)} {inj.fechaFin ? `| Fin: ${formatDate(inj.fechaFin)}` : ''}</Text>
                {Boolean(inj.zona) && <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text }}>Zona: {inj.zona} {inj.lado ? `(${inj.lado})` : ''}</Text>}
                {Boolean(inj.lesionEspecifica) && <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text }}>Lesión: {inj.lesionEspecifica}</Text>}
                {Boolean(inj.descripcion) && <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text, marginTop: 4 }}>{inj.descripcion}</Text>}
              </View>
            );
          }) : (
            <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>No hay lesiones registradas.</Text>
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
  const title = isPreWellness ? t('player.profile.preWellnessHistory') : t('player.profile.wellnessHistory');
  
  return (
    <Page size="A4" style={baseStyles.page}>
      <PdfHeader title={title} subtitle={getPlayerFullName(player)} />
      <View style={baseStyles.content}>
        <View style={s.grid2}>
          <View style={s.statCard}><Text style={s.statValue}>{wellnessData?.totalResponses || 0}</Text><Text style={s.statLabel}>Total Reportes</Text></View>
          {!isPreWellness && (
            <View style={s.statCard}><Text style={[s.statValue, {color: COLORS.primary}]}>{wellnessData?.averageWellness ? wellnessData.averageWellness.toFixed(1) : '-'}</Text><Text style={s.statLabel}>Puntuación Media</Text></View>
          )}
        </View>

        <PdfSection title={t('player.profile.completeHistory')}>
          {history.length > 0 ? history.map((item, i) => {
            const score = item.wellness || 0;
            const scoreColor = score >= 8 ? COLORS.success : score >= 6 ? COLORS.accent : COLORS.danger;
            
            return (
              <View key={i} style={s.card} wrap={false}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={s.cardTitle}>{formatDate(item.sessionDate || item.session?.fecha)}</Text>
                  {!isPreWellness && (
                    <Text style={[s.badge, { backgroundColor: scoreColor, fontSize: 10 }]}>{score}/10</Text>
                  )}
                </View>
                
                {item.questionResponses && item.questionResponses.map((qr, qI) => (
                  <View key={qI} style={{ flexDirection: 'row', marginBottom: 2 }}>
                    <Text style={{ fontSize: FONT_SIZE.xs, fontFamily: 'Helvetica-Bold', color: COLORS.text, marginRight: 4 }}>{qr.question}:</Text>
                    <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.text }}>{qr.answer || qr.response || ''}</Text>
                  </View>
                ))}
                
                {Boolean(item.comment) && (
                  <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 4, fontStyle: 'italic' }}>"{item.comment}"</Text>
                )}
              </View>
            );
          }) : (
            <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>No hay registros.</Text>
          )}
        </PdfSection>
      </View>
      <PdfFooter />
    </Page>
  );
};


// ── EXPORTACIÓN ASÍNCRONA ──────────────────────────────────────────

export const generateProfilePdf = async ({ player, team, fotoBase64, stats, anthropometryData, injuries, t }) => {
  const fileName = `perfil_${getPlayerFullName(player).replace(/\s+/g, '_')}`;
  await renderPdf(<Document><ProfileGeneralPage player={player} team={team} fotoBase64={fotoBase64} stats={stats} anthropometryData={anthropometryData} injuries={injuries} t={t} /></Document>, fileName);
};

export const generateAnthropometryPdf = async ({ player, team, data, t }) => {
  const fileName = `antropometria_${getPlayerFullName(player).replace(/\\s+/g, '_')}`;
  await renderPdf(<Document><AnthropometryPage player={player} team={team} data={data} t={t} /></Document>, fileName);
};

export const generateAttendancePdf = async ({ player, team, stats, t }) => {
  const fileName = `asistencia_${getPlayerFullName(player).replace(/\\s+/g, '_')}`;
  await renderPdf(<Document><AttendancePage player={player} stats={stats} t={t} /></Document>, fileName);
};

export const generateInjuryPdf = async ({ player, team, stats, injuries, t }) => {
  const fileName = `lesiones_${getPlayerFullName(player).replace(/\\s+/g, '_')}`;
  await renderPdf(<Document><InjuryPage player={player} stats={stats} injuries={injuries} t={t} /></Document>, fileName);
};

export const generateWellnessPdf = async ({ player, team, wellnessData, t }) => {
  const fileName = `wellness_${getPlayerFullName(player).replace(/\\s+/g, '_')}`;
  await renderPdf(<Document><WellnessPage player={player} wellnessData={wellnessData} isPreWellness={false} t={t} /></Document>, fileName);
};

export const generatePreWellnessPdf = async ({ player, team, preWellnessData, t }) => {
  const fileName = `prewellness_${getPlayerFullName(player).replace(/\\s+/g, '_')}`;
  await renderPdf(<Document><WellnessPage player={player} wellnessData={preWellnessData} isPreWellness={true} t={t} /></Document>, fileName);
};
