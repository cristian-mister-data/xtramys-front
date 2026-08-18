import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  baseStyles,
  COLORS,
  PdfHeader,
  PdfFooter,
  renderPdf,
} from '@/utils/pdfDesign';
import { buildActiveCalendarMonths } from './calendarPdfData';

const MATCH_COLOR = '#2563eb';
const TRAINING_COLOR = '#16a34a';
const SCOUTING_COLOR = '#7c3aed';

const s = StyleSheet.create({
  page: {
    ...baseStyles.pageLandscape,
    paddingTop: 20,
    paddingBottom: 42,
    paddingHorizontal: 26,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 7, color: COLORS.textSecondary, fontFamily: 'Helvetica-Bold' },
  totals: { flexDirection: 'row', gap: 6 },
  totalBadge: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 7,
    color: COLORS.textSecondary,
    fontFamily: 'Helvetica-Bold',
  },
  weekdays: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  weekday: {
    width: '14.2857%',
    paddingVertical: 6,
    textAlign: 'center',
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    letterSpacing: 0.6,
  },
  grid: {
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.bgCard,
  },
  week: { flexDirection: 'row' },
  day: {
    width: '14.2857%',
    height: 60,
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderDark,
    backgroundColor: COLORS.bgCard,
  },
  emptyDay: { backgroundColor: '#f1f5f9' },
  today: { backgroundColor: '#eff6ff' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  dayNumber: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.primary },
  eventCount: { fontSize: 5, color: COLORS.textMuted },
  event: {
    borderLeftWidth: 2,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 3,
    marginBottom: 2,
  },
  matchEvent: { borderLeftColor: MATCH_COLOR, backgroundColor: '#eff6ff' },
  trainingEvent: { borderLeftColor: TRAINING_COLOR, backgroundColor: '#f0fdf4' },
  scoutingEvent: { borderLeftColor: SCOUTING_COLOR, backgroundColor: '#faf5ff' },
  eventTitle: { fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: COLORS.text, lineHeight: 1.15 },
  eventMeta: { fontSize: 4.8, color: COLORS.textSecondary, lineHeight: 1.1, marginTop: 1 },
});

const dateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const formatTime = (date, locale) => date.toLocaleTimeString(locale, {
  hour: '2-digit',
  minute: '2-digit',
});

const MatchEvent = ({ event, locale, t }) => {
  const match = event.item;
  const played = event.date < new Date();
  const rival = match?.rival || t('season.rival', 'Rival');
  const location = match?.ubicacion || t('season.toBeDefined', 'Por definir');
  const result = `${match?.golesFavor ?? 0}-${match?.golesContra ?? 0}`;
  const tournament = match?.torneoId && typeof match.torneoId === 'object'
    ? match.torneoId.nombre
    : match?.competicion === 'amistoso'
      ? t('matchSheet.friendly', 'Amistoso')
      : t('season.match', 'Partido');

  return (
    <View style={[s.event, s.matchEvent]} wrap={false}>
      <Text style={s.eventTitle} maxLines={1}>
        {played ? `${t('season.calendarPdfFinal', 'Final')} ${result}` : formatTime(event.date, locale)} · {rival}
      </Text>
      <Text style={s.eventMeta} maxLines={1}>{tournament} · {location}</Text>
    </View>
  );
};

const TrainingEvent = ({ event, t }) => {
  const session = event.item;
  const time = session?.horaInicio || session?.horaFin
    ? `${session?.horaInicio || '--:--'}-${session?.horaFin || '--:--'}`
    : '';
  const place = session?.lugar || t('season.noLocation', 'Sin ubicación');

  return (
    <View style={[s.event, s.trainingEvent]} wrap={false}>
      <Text style={s.eventTitle} maxLines={1}>
        {t('season.training', 'Entrenamiento')}{time ? ` · ${time}` : ''}
      </Text>
      <Text style={s.eventMeta} maxLines={1}>
        {place}{session?.duracion ? ` · ${session.duracion} min` : ''}
      </Text>
    </View>
  );
};

const ScoutingEvent = ({ event, locale, t }) => {
  const report = event.item;
  const home = report?.teamA?.name || t('opponentMatch.teamA');
  const away = report?.teamB?.name || t('opponentMatch.teamB');
  const competition = report?.tournamentId?.nombre
    || report?.competitionName
    || t(`opponentMatch.competitionTypes.${report?.competitionType || 'other'}`);
  return (
    <View style={[s.event, s.scoutingEvent]} wrap={false}>
      <Text style={s.eventTitle} maxLines={1}>
        {formatTime(event.date, locale)} · {home} - {away}
      </Text>
      <Text style={s.eventMeta} maxLines={1}>
        {competition}{report?.venue ? ` · ${report.venue}` : ''}
      </Text>
    </View>
  );
};

const MonthPage = ({ data, teamName, seasonName, locale, t }) => {
  const firstDay = new Date(data.year, data.month, 1).getDay();
  const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(data.year, data.month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - mondayOffset + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
    .format(new Date(data.year, data.month, 1));
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    .map((day) => t(`season.weekdaysShort.${day}`).slice(0, 3).toUpperCase());
  const allEvents = [...data.days.values()].flat();
  const matchCount = allEvents.filter((event) => event.type === 'match').length;
  const trainingCount = allEvents.filter((event) => event.type === 'training').length;
  const scoutingCount = allEvents.filter((event) => event.type === 'scouting').length;
  const todayKey = dateKey(new Date());

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <PdfHeader
        title={t('season.calendarPdfTitle', 'Calendario de temporada')}
        subtitle={monthLabel}
        right={teamName}
        date={seasonName ? `${t('season.season', 'Temporada')} ${seasonName}` : ''}
      />

      <View style={s.summary}>
        <View style={s.legend}>
          <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: MATCH_COLOR }]} /><Text style={s.legendText}>{t('season.match', 'Partido')}</Text></View>
          <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: TRAINING_COLOR }]} /><Text style={s.legendText}>{t('season.training', 'Entrenamiento')}</Text></View>
          <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: SCOUTING_COLOR }]} /><Text style={s.legendText}>{t('opponentMatch.calendar.event')}</Text></View>
        </View>
        <View style={s.totals}>
          <Text style={s.totalBadge}>{matchCount} {t('season.calendarPdfMatches', 'partidos')}</Text>
          <Text style={s.totalBadge}>{trainingCount} {t('season.calendarPdfTrainings', 'entrenamientos')}</Text>
          <Text style={s.totalBadge}>{scoutingCount} {t('opponentMatch.calendar.title').toLowerCase()}</Text>
        </View>
      </View>

      <View style={s.weekdays}>{weekdays.map((day) => <Text key={day} style={s.weekday}>{day}</Text>)}</View>
      <View style={s.grid}>
        {Array.from({ length: 6 }, (_, weekIndex) => (
          <View key={weekIndex} style={s.week} wrap={false}>
            {cells.slice(weekIndex * 7, weekIndex * 7 + 7).map((day, dayIndex) => {
              const events = day ? data.days.get(day) || [] : [];
              const currentKey = day ? `${data.year}-${data.month}-${day}` : '';
              return (
                <View key={`${weekIndex}-${dayIndex}`} style={[s.day, !day && s.emptyDay, currentKey === todayKey && s.today]}>
                  {day ? (
                    <>
                      <View style={s.dayHeader}>
                        <Text style={s.dayNumber}>{day}</Text>
                        {events.length > 1 ? <Text style={s.eventCount}>{events.length}</Text> : null}
                      </View>
                      {events.map((event, index) => event.type === 'match'
                        ? <MatchEvent key={`m-${index}`} event={event} locale={locale} t={t} />
                        : event.type === 'scouting'
                          ? <ScoutingEvent key={`s-${index}`} event={event} locale={locale} t={t} />
                          : <TrainingEvent key={`t-${index}`} event={event} t={t} />)}
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <PdfFooter text={t('season.calendarPdfFooter', 'Xtramys · Planificación de temporada')} />
    </Page>
  );
};

const CalendarDocument = ({ months, teamName, seasonName, locale, t }) => (
  <Document>
    {months.map((month) => (
      <MonthPage
        key={month.key}
        data={month}
        teamName={teamName}
        seasonName={seasonName}
        locale={locale}
        t={t}
      />
    ))}
  </Document>
);

export async function generateSeasonCalendarPdf({ matchSheets, trainingSessions, scoutingMatches, team, season, locale, t }) {
  const months = buildActiveCalendarMonths(matchSheets, trainingSessions, scoutingMatches);
  if (!months.length) throw new Error(t('season.calendarPdfEmpty', 'No hay eventos para exportar.'));

  const teamName = team?.nombre || t('season.myTeam', 'Mi equipo');
  const seasonName = season?.año || '';
  const fileName = `${t('season.calendarPdfFile', 'Calendario_Temporada')}_${teamName}_${seasonName || months[0].year}`;
  await renderPdf(
    <CalendarDocument months={months} teamName={teamName} seasonName={seasonName} locale={locale} t={t} />,
    fileName,
  );
}
