import React from 'react';
import { Document, Page, Text, View, Image } from '@/utils/pdfDesign';
import { getContentImage } from '@/utils/contentVisual';
import { getEntityId } from '@/utils/sessionExercises';
import { getPlayerFullName } from '@/utils/playerHelpers';

const ink = '#172B35';
const muted = '#52616A';
const line = '#CED6DA';
const styles = {
  page: {
    minHeight: 595.28,
    maxHeight: 595.28,
    padding: 28,
    paddingBottom: 34,
    fontFamily: 'Helvetica',
    color: ink,
    backgroundColor: '#FFFFFF',
    fontSize: 10,
  },
  masthead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: ink,
  },
  eyebrow: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  context: { fontSize: 8, color: muted, maxWidth: '65%', textAlign: 'right' },
  heading: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 10, gap: 12 },
  number: {
    width: 34,
    paddingVertical: 7,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: ink,
    borderRadius: 4,
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  title: { flex: 1, fontFamily: 'Helvetica-Bold', fontSize: 19 },
  metrics: {
    flexDirection: 'row',
    gap: 22,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: line,
  },
  label: {
    fontSize: 7,
    color: muted,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  value: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  info: { flexDirection: 'row', gap: 20, paddingTop: 10, paddingBottom: 8 },
  descriptionColumn: { width: '68%' },
  descriptionColumnFull: { width: '100%' },
  detailsColumn: { width: '32%' },
  field: { marginBottom: 7 },
  visual: {
    height: 300,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    borderTopWidth: 1,
    borderTopColor: line,
    paddingTop: 8,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  notes: { flex: 1, paddingTop: 12 },
  rule: { borderBottomWidth: 0.5, borderBottomColor: line, marginTop: 25 },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: muted,
  },
};

function sourceImage(exercise, imageDataUris) {
  const image = imageDataUris[`ex_${exercise._id}`] || getContentImage(exercise);
  if (!image || typeof image !== 'string') return null;
  return /^(https?:|data:|blob:)/.test(image) ? image : `data:image/png;base64,${image}`;
}

function teamNotes(assignments, players, t) {
  return (assignments || [])
    .slice()
    .sort((a, b) => (a.teamNumber || 0) - (b.teamNumber || 0))
    .map((team) => {
      const names = [...(team.players || []), ...(team.extraPlayers || [])]
        .map((value) => {
          const player = players.find((item) => getEntityId(item) === getEntityId(value));
          return player
            ? getPlayerFullName(player)
            : typeof value === 'object'
              ? getPlayerFullName(value)
              : '';
        })
        .filter(Boolean);
      if (team.comodines > 0)
        names.push(`${team.comodines} ${t('session.comodines', 'Comodines')}`);
      if (!names.length) return null;
      const label = team.teamNumber
        ? `${t('session.teamAbbr', 'Eq.')} ${team.teamNumber}`
        : t('session.comodines', 'Comodines');
      return `${label}: ${names.join(', ')}`;
    })
    .filter(Boolean)
    .join('\n');
}

// Estimate wrapped lines before layout so long instructions leave room for the diagram.
function informationLayout(columns) {
  let fontSize = 10;
  const height = () =>
    Math.max(
      ...columns.map((fields, columnIndex) =>
        fields.reduce((sum, [, text]) => {
          const availableWidth =
            columnIndex === 0 && columns[1].length === 0 ? 540 : columnIndex === 0 ? 460 : 210;
          const charsPerLine = Math.floor(availableWidth / (fontSize * 0.52));
          const lines = String(text)
            .split('\n')
            .reduce((count, part) => count + Math.max(1, Math.ceil(part.length / charsPerLine)), 0);
          return sum + 19 + lines * fontSize * 1.3;
        }, 0),
      ),
    );
  while (fontSize > 7 && height() > 165) fontSize -= 0.5;
  return { fontSize, lineHeight: 1.3 };
}

export default function SessionPrintDocument({
  data,
  players = [],
  strengthExercises = [],
  i18n,
  title,
  imageDataUris = {},
}) {
  const { t } = data;
  const tasks = [
    ...data.ejerciciosOrdenados,
    ...strengthExercises
      .slice()
      .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      .map((exercise, index) => ({
        _id: `strength-${index}`,
        nombre:
          i18n?.t(exercise.i18nKey, { defaultValue: exercise.nombre || exercise.id }) ||
          exercise.nombre ||
          exercise.id,
        objetivo: t('session.strengthExercises', 'Ejercicios de fuerza'),
        tiempoDescanso: exercise.tiempoDescanso,
        descripcion: exercise.descripcion,
        observacionesPersonalizadas: [exercise.observacion].filter(Boolean),
        imagen: imageDataUris[exercise.image],
      })),
  ];

  return (
    <Document title={title} author="Xtramys">
      {(tasks.length ? tasks : [null]).map((exercise, index) => {
        const detail = data.detalleMap[exercise?._id] || {};
        const image = exercise ? sourceImage(exercise, imageDataUris) : null;
        const columns = exercise
          ? [
              [
                [t('session.objective', 'Objetivo'), exercise.objetivo],
                [t('session.description', 'Descripción'), exercise.descripcion],
              ],
              [
                [t('exercise.materialNeeded', 'Material necesario'), exercise.materialNecesario],
                [
                  t('session.observations', 'Observaciones'),
                  [detail.observacion, ...(exercise.observacionesPersonalizadas || [])]
                    .filter(Boolean)
                    .join('\n'),
                ],
                [
                  t('session.teamAssignments', 'Asignación de equipos'),
                  teamNotes(detail.teamAssignments, players, t),
                ],
              ],
            ].map((fields) => fields.filter(([, value]) => Boolean(value)))
          : [[], []];
        const infoStyle = informationLayout(columns);
        const hasDetails = columns[1].length > 0;
        const metrics = exercise
          ? [
              [
                t('session.duration', 'Duración'),
                exercise.tiempo
                  ? `${exercise.tiempo}${/(?:min|['’])$/i.test(String(exercise.tiempo).trim()) ? '' : ' min'}`
                  : null,
              ],
              [t('session.players', 'Jugadores'), exercise.numeroJugadores],
              [t('session.teams', 'Equipos'), exercise.equipos],
              [t('session.dimensions', 'Espacio'), exercise.dimensiones],
              [
                t('session.rest', 'Descanso'),
                detail.tiempoDescanso || exercise.tiempoDescanso
                  ? `${detail.tiempoDescanso || exercise.tiempoDescanso} min`
                  : null,
              ],
            ].filter(([, value]) => Boolean(value))
          : [];
        return (
          <Page
            key={exercise?._id || 'empty'}
            size="A4"
            orientation="landscape"
            style={styles.page}
            wrap={false}
          >
            <View style={styles.masthead}>
              <Text style={styles.eyebrow}>
                {data.teamName} / {t('session.pdfFieldLabel', 'Guía de campo')}
              </Text>
              <Text style={styles.context}>
                {[
                  data.fechaFormateada,
                  [data.horaInicio, data.horaFin]
                    .filter((value) => value && value !== '--:--')
                    .join(' - '),
                ]
                  .filter(Boolean)
                  .join(' | ')}
              </Text>
            </View>
            <View style={styles.heading}>
              <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={styles.title}>
                {exercise?.nombre || t('session.pdfNoExercises', 'Esta sesión no tiene ejercicios')}
              </Text>
            </View>
            <View style={styles.metrics}>
              {metrics.map(([label, value]) => (
                <View key={label}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.value}>{String(value)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.info}>
              {columns.map((fields, column) =>
                column === 0 || fields.length > 0 ? (
                  <View
                    key={column}
                    style={
                      column === 0
                        ? hasDetails
                          ? styles.descriptionColumn
                          : styles.descriptionColumnFull
                        : styles.detailsColumn
                    }
                  >
                    {fields.map(([label, value]) => (
                      <View key={label} style={styles.field}>
                        <Text style={styles.label}>{label}</Text>
                        <Text style={infoStyle}>{value}</Text>
                      </View>
                    ))}
                  </View>
                ) : null,
              )}
            </View>
            <View style={styles.visual}>
              {image ? (
                <Image src={image} style={styles.image} />
              ) : (
                <View style={styles.notes}>
                  <Text style={styles.label}>{t('session.pdfFieldNotes', 'Notas de campo')}</Text>
                  {[0, 1, 2, 3].map((row) => (
                    <View key={row} style={styles.rule} />
                  ))}
                </View>
              )}
            </View>
            <View style={styles.footer} fixed>
              <Text>XTRAMYS | {t('session.pdfFieldLabel', 'Guía de campo')}</Text>
              <Text>
                {index + 1} / {Math.max(1, tasks.length)}
              </Text>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
