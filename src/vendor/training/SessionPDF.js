import React from 'react';
import {
  Document, Page, Text, View, Image,
  baseStyles, COLORS, SPACING, FONT_SIZE,
  renderPdf, PdfHeader, PdfFooter, PdfSection
} from '@/utils/pdfDesign';
import { savePdfToDownloads } from '@/utils/pdfDownload';
import { getPlayerFullName } from '@/utils/playerHelpers';
import { getEntityId } from '@/utils/sessionExercises';
import { getSectionForExercise, getStrengthExerciseImage } from '@/data/strengthExercises';
import api from '@/api/client';

// ── Shared Styles ──────────────────────────────────────────────────
const s = {
  page: {
    ...baseStyles.page,
    backgroundColor: COLORS.bgMain,
    color: COLORS.text,
  },
  grid2: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md },
  grid4: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  halfColumn: { width: '48%' },
  col4: { width: '23%' },

  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: SPACING.base,
    marginBottom: SPACING.md,
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

  metricBox: {
    alignItems: 'center',
    padding: SPACING.base,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  metricVal: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  metricLbl: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  rosterName: {
    fontSize: 8,
    color: COLORS.text,
    backgroundColor: COLORS.bgSoft,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  rosterNameExtra: {
    fontSize: 8,
    color: COLORS.warning,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },

  // Exercises
  exCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.bgCard,
    minHeight: 128,
    overflow: 'hidden',
  },
  exImgCol: {
    width: '40%',
    backgroundColor: COLORS.bgSoft,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    minHeight: 128,
  },
  exImg: {
    width: '100%',
    height: 112,
    objectFit: 'contain',
  },
  exInfoCol: {
    width: '60%',
    padding: SPACING.base,
  },
  exHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  exName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    width: '85%',
  },
  exNum: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textMuted,
  },
  exPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  exPill: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
    backgroundColor: COLORS.bgSoft,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  exSection: {
    marginBottom: 6,
  },
  exSectionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  exSectionText: {
    fontSize: 8,
    color: COLORS.text,
    lineHeight: 1.4,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  teamTag: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    borderRadius: 4,
    marginRight: 6,
    textTransform: 'uppercase',
  },

  // Strength Exercises
  stGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  stCard: {
    width: '23%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.bgCard,
    marginBottom: SPACING.sm,
  },
  stImg: {
    width: '100%',
    height: 70,
    backgroundColor: COLORS.bgSoft,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  stBody: {
    padding: 6,
  },
  stName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    lineHeight: 1.2,
    marginBottom: 4,
    height: 20,
  },
  stFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  stSection: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
    textTransform: 'uppercase',
  },
  stLevel: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textMuted,
  },
};
// ── Helpers ────────────────────────────────────────────────────────
const chunkArray = (array, size) => {
  if (!array) return [];
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

const truncateText = (text, maxLength = 300) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const getTeamTheme = (teamNumber) => {
  if ((teamNumber || 0) === 0) {
    return {
      bg: '#f0fdfa', // Teal 50
      border: '#99f6e4', // Teal 200
      text: '#0f766e', // Teal 700
    };
  }
  const themes = [
    { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c' }, // Eq. 1: Red/Crimson
    { bg: '#dbeafe', border: '#bfdbfe', text: '#1d4ed8' }, // Eq. 2: Blue/Navy
    { bg: '#d1fae5', border: '#a7f3d0', text: '#065f46' }, // Eq. 3: Green/Emerald
    { bg: '#fef3c7', border: '#fde68a', text: '#92400e' }, // Eq. 4: Amber/Orange
    { bg: '#ede9fe', border: '#ddd6fe', text: '#5b21b6' }, // Eq. 5: Violet/Purple
    { bg: '#fce7f3', border: '#fbcfe8', text: '#9d174d' }, // Eq. 6: Pink/Rose
    { bg: '#e0f2fe', border: '#bae6fd', text: '#0369a1' }, // Eq. 7: Cyan/Sky
    { bg: '#f5f5f4', border: '#e7e5e4', text: '#374151' }  // Eq. 8: Stone/Gray
  ];
  return themes[(teamNumber - 1) % themes.length];
};

const formatTimeStr = (t) => {
  if (t === null || t === undefined) return '--:--';
  const s = String(t).trim();
  if (!s) return '--:--';
  if (s.includes(':')) return s;
  if (s.length === 3) return `0${s[0]}:${s.slice(1)}`;
  if (s.length === 4) return `${s.slice(0, 2)}:${s.slice(2)}`;
  return s;
};

const parseClock = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

// ── Parsing Logic ──────────────────────────────────────────────────
const parseSessionData = ({ session, exercises, strengthExercises, team, players, i18n, imageDataUris }) => {
  const t = (key, fallback, options = {}) => {
    if (i18n) return i18n.t(key, { defaultValue: fallback, ...options });
    return fallback;
  };

  const locale = i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US';
  const fecha = new Date(session.fecha);
  const fechaFormateada = fecha.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const resolvePlayerName = (playerLike) => {
    const id = getEntityId(playerLike);
    const playerFromStore = players.find((p) => getEntityId(p) === id);
    if (playerFromStore) return getPlayerFullName(playerFromStore);
    if (playerLike && typeof playerLike === 'object') return getPlayerFullName(playerLike) || playerLike.nombre || playerLike.name || id;
    return id;
  };

  const jugadoresNombres = (session.jugadores || []).map(resolvePlayerName).filter(n => typeof n === 'string' && n.trim());
  const jugadoresExtrasNombres = (session.jugadoresExtras || []).map(resolvePlayerName).filter(n => typeof n === 'string' && n.trim());

  // Observaciones
  const exerciseObservationsMap = {};
  let generalObservationsText = '';

  const addGeneralObservation = (value) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (trimmed) generalObservationsText = generalObservationsText ? `${generalObservationsText}\n${trimmed}` : trimmed;
  };

  const setExerciseObservation = (exerciseId, value) => {
    const id = getEntityId(exerciseId);
    if (id && typeof value === 'string' && value.trim()) exerciseObservationsMap[id] = value.trim();
  };

  const ingestObservationItem = (item) => {
    if (!item) return;
    if (typeof item === 'string') return addGeneralObservation(item);
    if (typeof item !== 'object') return;
    const observationValue = item.observacion || item.observaciones || item.text || item.note || item.value || '';
    const exerciseId = item.ejercicioId || item.ejercicio || item.exerciseId || item.exercise;
    if (exerciseId) setExerciseObservation(exerciseId, observationValue);
    else addGeneralObservation(observationValue);
  };

  addGeneralObservation(session.observacionesGenerales);
  addGeneralObservation(session.notasGenerales);
  addGeneralObservation(session.notas);

  const rawObservations = session.observaciones;
  if (typeof rawObservations === 'string') addGeneralObservation(rawObservations);
  else if (Array.isArray(rawObservations)) rawObservations.forEach(ingestObservationItem);
  else if (rawObservations && typeof rawObservations === 'object') {
    addGeneralObservation(rawObservations.general || rawObservations.generales || rawObservations.observacionesGenerales || rawObservations.notes || rawObservations.notas || rawObservations.text);
    const grouped = rawObservations.porEjercicio || rawObservations.ejercicios || rawObservations.byExercise || rawObservations.items;
    if (Array.isArray(grouped)) grouped.forEach(ingestObservationItem);
    else ingestObservationItem(rawObservations);
  }

  // Detalle Map
  const detalleMap = {};
  if (session.ejerciciosDetalle && session.ejerciciosDetalle.length > 0) {
    session.ejerciciosDetalle.forEach((det) => {
      const ejercicioId = typeof det.ejercicio === 'string' ? det.ejercicio : det.ejercicio?._id || det.ejercicio;
      if (ejercicioId) {
        detalleMap[ejercicioId] = {
          orden: det.orden || 0,
          tiempoDescanso: det.tiempoDescanso || 0,
          observacion: det.observacion || exerciseObservationsMap[ejercicioId] || '',
          teamAssignments: det.teamAssignments || [],
        };
      }
    });
  }

  const ejerciciosOrdenados = [...exercises].sort((a, b) => (detalleMap[a._id]?.orden || 0) - (detalleMap[b._id]?.orden || 0));

  const exerciseObservationItems = ejerciciosOrdenados.map((ejercicio) => {
    const detalle = detalleMap[ejercicio._id] || {};
    const text = typeof detalle.observacion === 'string' ? detalle.observacion.trim() : '';
    return text ? { title: ejercicio?.nombre || 'Ejercicio sin nombre', text } : null;
  }).filter(Boolean);

  const horaInicio = formatTimeStr(session.horaInicio);
  const horaFin = formatTimeStr(session.horaFin);
  const startMinutes = parseClock(horaInicio);
  const endMinutes = parseClock(horaFin);
  const computedDurationMinutes = (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) ? endMinutes - startMinutes : null;
  const rawDuration = Number(session.duracion);
  const durationMinutes = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : computedDurationMinutes;
  const duracionLabel = durationMinutes ? `${durationMinutes} min` : '';

  return {
    t, locale, fechaFormateada,
    jugadoresNombres, jugadoresExtrasNombres,
    generalObservationsText, exerciseObservationItems,
    ejerciciosOrdenados, detalleMap,
    horaInicio, horaFin, duracionLabel,
    teamName: team?.nombre || 'Equipo',
    teamLogo: team?.escudo || null,
    lang: i18n?.language,
  };
};

// ── Components ─────────────────────────────────────────────────────


const SessionCoverPage = ({ data, title }) => {
  const { t, fechaFormateada, jugadoresNombres, jugadoresExtrasNombres, generalObservationsText, exerciseObservationItems, ejerciciosOrdenados, horaInicio, horaFin, duracionLabel, teamName } = data;

  const generalObservationsPreview = generalObservationsText ? truncateText(generalObservationsText, 520) : '';
  const exerciseObservationsPreview = exerciseObservationItems.slice(0, 5).map(item => ({ title: item.title, text: truncateText(item.text, 140) }));

  return (
    <Page size="A4" style={s.page}>
      <PdfHeader title={title} subtitle={t('session.pdfTitle', 'Sesión de Entrenamiento')} date={fechaFormateada} right={teamName} />
      <PdfFooter />

      <PdfSection title={t('session.summaryTitle', 'Resumen de la Sesión')}>
        <View style={[s.grid4, { marginBottom: SPACING.md }]}>
          <View style={s.metricBox}>
            <Text style={s.metricVal}>{horaInicio} - {horaFin}</Text>
            <Text style={s.metricLbl}>{t('session.scheduleLabelPdf', 'Horario')} ({duracionLabel})</Text>
          </View>
          <View style={s.metricBox}>
            <Text style={s.metricVal}>{ejerciciosOrdenados.length}</Text>
            <Text style={s.metricLbl}>{t('session.fieldExercises', 'Ejercicios de Campo')}</Text>
          </View>
          <View style={s.metricBox}>
            <Text style={s.metricVal}>{jugadoresNombres.length + jugadoresExtrasNombres.length}</Text>
            <Text style={s.metricLbl}>{t('session.totalPlayers', 'Jugadores Totales')}</Text>
          </View>
        </View>

        <View style={s.grid2}>
          <View style={[s.halfColumn, s.card]}>
            <Text style={s.cardTitle}>{t('session.availablePlayers', 'Jugadores Disponibles')} ({jugadoresNombres.length + jugadoresExtrasNombres.length})</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {jugadoresNombres.length > 0 ? (
                jugadoresNombres.map((n, i) => <Text key={i} style={s.rosterName}>{n}</Text>)
              ) : <Text style={{ fontSize: 9, color: COLORS.textMuted, fontStyle: 'italic' }}>{t('session.noPlayersLoaded', 'Sin jugadores cargados')}</Text>}
            </View>
            
            {jugadoresExtrasNombres.length > 0 && (
              <>
                <Text style={[s.cardTitle, { marginTop: SPACING.md, fontSize: FONT_SIZE.sm }]}>{t('session.extraPlayers', 'Jugadores Extras')} ({jugadoresExtrasNombres.length})</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {jugadoresExtrasNombres.map((n, i) => <Text key={i} style={s.rosterNameExtra}>{n}</Text>)}
                </View>
              </>
            )}
          </View>

          <View style={[s.halfColumn, s.card]}>
            <Text style={s.cardTitle}>{t('session.observations', 'Observaciones')}</Text>
            {generalObservationsPreview ? (
              <Text style={{ fontSize: 9, color: COLORS.text, lineHeight: 1.5, marginBottom: SPACING.sm }}>{generalObservationsPreview}</Text>
            ) : <Text style={{ fontSize: 9, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: SPACING.sm }}>{t('session.noGeneralObservations', 'Sin observaciones generales')}</Text>}
            
            {exerciseObservationsPreview.length > 0 && (
              <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.borderLight }}>
                {exerciseObservationsPreview.map((item, i) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.primary, textTransform: 'uppercase', marginBottom: 2 }}>{item.title}</Text>
                    <Text style={{ fontSize: 8, color: COLORS.text, lineHeight: 1.4 }}>{item.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </PdfSection>
    </Page>
  );
};

const ExerciseCard = ({ ejercicio, index, data, players, imageDataUris }) => {
  const { detalleMap, t } = data;
  const detalle = detalleMap[ejercicio._id] || {};
  const ordenNumero = detalle.orden || index + 1;
  const isLastExercise = index === data.ejerciciosOrdenados.length - 1;

  let imagenSrc = imageDataUris[`ex_${ejercicio._id}`];
  if (!imagenSrc && ejercicio.imagen) {
    if (typeof ejercicio.imagen === 'string' && (ejercicio.imagen.startsWith('http') || ejercicio.imagen.startsWith('data:'))) {
      imagenSrc = ejercicio.imagen;
    } else if (typeof ejercicio.imagen === 'string') {
      imagenSrc = `data:image/png;base64,${ejercicio.imagen}`;
    }
  }

  const pills = [];
  if (ejercicio.numeroJugadores) pills.push(`${ejercicio.numeroJugadores} ${t('session.players', 'Jugadores')}`);
  if (ejercicio.equipos) pills.push(`${ejercicio.equipos} ${t('session.teams', 'Equipos')}`);
  if (ejercicio.dimensiones) pills.push(ejercicio.dimensiones);
  if (ejercicio.tiempo) pills.push(`${ejercicio.tiempo} min`);
  if (!isLastExercise && detalle.tiempoDescanso > 0) pills.push(`${t('session.rest', 'Descanso')}: ${detalle.tiempoDescanso} min`);

  const teamAssignmentsData = (detalle.teamAssignments || [])
    .filter(ta => (ta.players && ta.players.length > 0) || (ta.extraPlayers && ta.extraPlayers.length > 0) || (ta.comodines || 0) > 0)
    .sort((a, b) => (a.teamNumber || 0) - (b.teamNumber || 0));

  return (
    <View style={s.exCard} wrap={false}>
      <View style={s.exImgCol}>
        {imagenSrc ? <Image src={imagenSrc} style={s.exImg} /> : <Text style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: 'Helvetica-Bold' }}>{t('session.noImage', 'Sin Imagen')}</Text>}
      </View>
      <View style={s.exInfoCol}>
        <View style={s.exHeader}>
          <Text style={s.exNum}>#{ordenNumero}</Text>
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Text style={s.exName}>{ejercicio.nombre || t('session.unnamedExercise', 'Ejercicio sin nombre')}</Text>
            {pills.length > 0 && (
              <View style={s.exPills}>
                {pills.map((p, i) => <Text key={i} style={s.exPill}>{p}</Text>)}
              </View>
            )}
          </View>
        </View>

        {Boolean(ejercicio.objetivo) && (
          <View style={s.exSection}>
            <Text style={s.exSectionLabel}>{t('session.objective', 'Objetivo')}</Text>
            <Text style={s.exSectionText}>{ejercicio.objetivo}</Text>
          </View>
        )}
        {Boolean(ejercicio.descripcion) && (
          <View style={s.exSection}>
            <Text style={s.exSectionLabel}>{t('session.description', 'Descripción')}</Text>
            <Text style={s.exSectionText}>{truncateText(ejercicio.descripcion, 340)}</Text>
          </View>
        )}
        {Boolean(detalle.observacion) && (
          <View style={s.exSection}>
            <Text style={s.exSectionLabel}>{t('session.observation', 'Observación')}</Text>
            <Text style={s.exSectionText}>{detalle.observacion}</Text>
          </View>
        )}
        {Boolean(ejercicio.materialNecesario) && (
          <View style={s.exSection}>
            <Text style={s.exSectionLabel}>{t('exercise.materialNeeded', 'Material necesario')}</Text>
            <Text style={s.exSectionText}>
              {data.lang?.startsWith('en') && ejercicio.translations?.en?.materialNecesario
                ? ejercicio.translations.en.materialNecesario
                : ejercicio.materialNecesario}
            </Text>
          </View>
        )}

        {teamAssignmentsData.length > 0 && (
          <View style={{ marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.borderLight }}>
            <Text style={[s.exSectionLabel, { marginBottom: 4 }]}>{t('session.teamAssignments', 'Asignación de equipos')}</Text>
            {teamAssignmentsData.map((ta, i) => {
              const names = [];
              (ta.players || []).forEach((pid) => {
                const id = getEntityId(pid);
                const p = players.find((j) => getEntityId(j) === id);
                if (p) names.push(getPlayerFullName(p));
                else if (typeof pid === 'object' && pid) names.push(getPlayerFullName(pid) || id);
              });
              (ta.extraPlayers || []).forEach((epId) => {
                const id = getEntityId(epId);
                const p = players.find((j) => getEntityId(j) === id);
                const nombre = p ? getPlayerFullName(p) : typeof epId === 'object' ? getPlayerFullName(epId) : id;
                if (nombre) names.push(`* ${nombre}`);
              });
              if ((ta.teamNumber || 0) === 0) {
                if (names.length === 0 && !(ta.comodines > 0)) return null;
                const theme = getTeamTheme(0);
                return (
                  <View key={i} style={s.teamRow}>
                    <Text style={[s.teamTag, { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, color: theme.text }]}>
                      {t('session.comodines', 'Comodines')}
                    </Text>
                    <Text style={{ fontSize: 8, color: COLORS.text, flex: 1, lineHeight: 1.3, marginTop: 1 }}>
                      {[...names, ta.comodines > 0 ? `${t('session.comodines', 'Comodines')}: ${ta.comodines}` : null].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                );
              }
              const theme = getTeamTheme(ta.teamNumber);
              return (
                <View key={i} style={s.teamRow}>
                  <Text style={[s.teamTag, { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, color: theme.text }]}>{t('session.teamAbbr', 'Eq.')} {ta.teamNumber}</Text>
                  <Text style={{ fontSize: 8, color: COLORS.text, flex: 1, lineHeight: 1.3, marginTop: 1 }}>{names.join(', ')}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const ExercisesPage = ({ data, players, imageDataUris, title }) => {
  const { t, fechaFormateada, ejerciciosOrdenados } = data;
  if (ejerciciosOrdenados.length === 0) return null;

  return (
    <Page size="A4" style={s.page}>
      <PdfHeader title={title} subtitle={t('session.exercisesTitle', 'Ejercicios de la Sesión')} date={fechaFormateada} />
      <PdfFooter />
      <PdfSection title={t('session.tacticalTechnicalDev', 'Desarrollo Táctico / Técnico')}>
        {ejerciciosOrdenados.map((ej, idx) => (
          <ExerciseCard key={idx} ejercicio={ej} index={idx} data={data} players={players} imageDataUris={imageDataUris} />
        ))}
      </PdfSection>
    </Page>
  );
};

const StrengthExercisesPage = ({ strengthExercises, i18n, title, data, imageDataUris }) => {
  if (!strengthExercises || strengthExercises.length === 0) return null;
  const { t, fechaFormateada } = data;

  const chunks = chunkArray(strengthExercises, 12);

  return chunks.map((chunk, pageIdx) => (
    <Page size="A4" style={s.page} key={pageIdx}>
      <PdfHeader title={title} subtitle={`${t('session.strengthExercisesTitle', 'Ejercicios de Fuerza')} (${t('session.page', 'Pág')} ${pageIdx + 1}/${chunks.length})`} date={fechaFormateada} />
      <PdfFooter />
      <PdfSection title={t('session.gymRoutinePrevention', 'Rutina de Gimnasio / Prevención')}>
        <View style={s.stGrid}>
          {chunk.map((exercise, idx) => {
            const globalIdx = pageIdx * 12 + idx;
            const imagenSrc = imageDataUris[exercise.image];
            const exerciseName = i18n ? i18n.t(exercise.i18nKey) : exercise.id;
            const sectionResult = getSectionForExercise(exercise.id || exercise);
            const sectionName = sectionResult ? (i18n ? i18n.t(sectionResult.section.i18nKey) : sectionResult.section.id) : '';

            return (
              <View key={idx} style={s.stCard} wrap={false}>
                {imagenSrc ? (
                  <Image src={imagenSrc} style={s.stImg} />
                ) : (
                  <View style={[s.stImg, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 20 }}>💪</Text>
                  </View>
                )}
                <View style={s.stBody}>
                  <Text style={s.stName}>{globalIdx + 1}. {exerciseName}</Text>
                  <View style={s.stFooter}>
                    <Text style={s.stSection}>{sectionName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={s.stLevel}>{t('session.levelAbbr', 'NV')} {exercise.level}</Text>
                      {exercise.tiempoDescanso > 0 && (
                        <Text style={[s.stLevel, { marginLeft: 4, color: COLORS.primary }]}>• {t('session.restAbbr', 'DESC:')} {exercise.tiempoDescanso}'</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </PdfSection>
    </Page>
  ));
};

const SessionDocument = ({ data, players, strengthExercises, i18n, title, imageDataUris }) => (
  <Document>
    <SessionCoverPage data={data} title={title} />
    <ExercisesPage data={data} players={players} imageDataUris={imageDataUris} title={title} />
    <StrengthExercisesPage strengthExercises={strengthExercises} i18n={i18n} title={title} data={data} imageDataUris={imageDataUris} />
  </Document>
);

// ── Public API ─────────────────────────────────────────────────────

export const generateSessionPDF = async ({
  session,
  exercises,
  strengthExercises = [],
  team,
  players = [],
  i18n = null,
}) => {
  try {
    const t = (key, fallback) => i18n?.t(key) || fallback;
    const locale = i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US';

    // Pre-resolver imágenes
    const imageDataUris = {};
    const toDataUrl = async (url) => {
      let blob;
      try {
        const res = await api.get('/media/image-download', { params: { url }, responseType: 'blob', timeout: 15000 });
        blob = res.data;
      } catch (err) {
        const res = await fetch(url);
        if (!res.ok) throw new Error('fetch failed');
        blob = await res.blob();
      }

      if (blob.type === 'image/webp' || url.endsWith('.webp')) {
        return await new Promise((resolve, reject) => {
          const img = new window.Image();
          const objectUrl = URL.createObjectURL(blob);
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
            URL.revokeObjectURL(objectUrl);
          };
          img.onerror = (e) => reject(e);
          img.src = objectUrl;
        });
      }

      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    };

    if (strengthExercises && strengthExercises.length > 0) {
      await Promise.all(strengthExercises.map(async (exercise) => {
        try {
          const imageSource = getStrengthExerciseImage(exercise.image);
          if (!imageSource) return;
          const url = typeof imageSource === 'string' ? imageSource : imageSource?.uri;
          if (url) imageDataUris[exercise.image] = await toDataUrl(url);
        } catch (e) {
          console.warn('Failed to resolve image for PDF:', exercise.id, e);
        }
      }));
    }

    if (exercises && exercises.length > 0) {
      await Promise.all(exercises.map(async (exercise) => {
        try {
          if (exercise.imagen && typeof exercise.imagen === 'string' && exercise.imagen.startsWith('http')) {
            imageDataUris[`ex_${exercise._id}`] = await toDataUrl(exercise.imagen);
          }
        } catch (e) {
          console.warn('Failed to resolve image for exercise PDF:', exercise._id, e);
        }
      }));
    }

    const data = parseSessionData({ session, exercises, strengthExercises, team, players, i18n, imageDataUris });
    const title = `${t('session.pdfTitle', 'Sesión de Entrenamiento')} - ${data.teamName}`;

    const fecha = new Date(session.fecha);
    const diasKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const diaSemana = t(`weekdays.${diasKeys[fecha.getDay()]}`, diasKeys[fecha.getDay()]);
    const fechaStr = fecha.toLocaleDateString(locale).replace(/\//g, '-');
    const pdfPrefix = t('session.pdfFilePrefix', 'Sesion_Entrenamiento');
    const fileName = `${pdfPrefix}_${diaSemana}_${fechaStr}.pdf`;

    await renderPdf(
      <SessionDocument data={data} players={players} strengthExercises={strengthExercises} i18n={i18n} title={title} imageDataUris={imageDataUris} />,
      fileName.replace('.pdf', '')
    );

    return fileName;
  } catch (error) {
    console.error('Error generating session PDF:', error);
    throw error;
  }
};
