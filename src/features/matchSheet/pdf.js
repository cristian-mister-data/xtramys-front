// Adaptadores que delegan en los generadores de PDF del vendor (puerto exacto
// de la app móvil), de modo que las descargas web sean idénticas a las de
// iOS/Android para alineación, convocatoria y ficha completa.
//
// Mantenemos las firmas posicionales que ya consumen los componentes UI:
//   - generateMatchSheetPDF(matchSheet, players, team, t)
//   - generateLineupPDF(matchSheet, players, team, options, t)
//   - generateCallUpPDF(matchSheet, players, team, callupData, t)
import i18n from '@/i18n';
import {
  generateLineupPDF as vendorLineupPDF,
  generateCallUpPDF as vendorCallUpPDF,
  generateMatchSheetPDF as vendorMatchSheetPDF,
} from '@/vendor/matchSheet/MatchSheetPDF';

// Traducciones de posiciones igual que useMatchSheetPDF en móvil
function getPositionTranslations(t) {
  const POS = ['POR', 'DFC', 'LI', 'LD', 'CAI', 'CAD', 'MC', 'MCO', 'MCD', 'MI', 'MD', 'DC', 'EI', 'ED', 'SD'];
  const out = {};
  POS.forEach((k) => { out[k] = t(`matchSheet.positions.${k}`, k); });
  return out;
}

function getRoundLabels(t) {
  return {
    final: t('tournaments.roundFinal', 'Final'),
    semifinal: t('tournaments.roundSemifinal', 'Semifinal'),
    cuartos: t('tournaments.roundQuarters', 'Cuartos de Final'),
    octavos: t('tournaments.roundRound16', 'Octavos de Final'),
    dieciseisavos: t('tournaments.roundRound32', 'Dieciseisavos'),
    treintaydosavos: t('tournaments.roundRound64', 'Treintaidosavos'),
  };
}

function normalizeIds(arr) {
  return (arr || []).map((p) => (typeof p === 'object' && p ? p._id : p)).filter(Boolean);
}

export async function generateLineupPDF(matchSheet, players, team, options = {}, t) {
  const lang = i18n.language || 'es';
  const titulares = normalizeIds(matchSheet?.alineacionTitulares);
  const lineup = options?.lineup || [];
  return vendorLineupPDF({
    matchSheet: { ...matchSheet, alineacionTitulares: titulares, alineacionSuplentes: normalizeIds(matchSheet?.alineacionSuplentes) },
    team,
    players,
    lineup,
    formation: matchSheet?.alineacion || '1-4-4-2',
    showPhotos: options?.showPhotos !== false,
    showNames: options?.showNames !== false,
    translations: {
      lang,
      noDate: t('matchSheet.fields.noDate', 'Sin fecha'),
      generatedWith: t('matchSheet.pdf.generatedWith', 'Generado con Xtramys'),
      lineupFileName: t('matchSheet.pdf.lineupFileName', 'alineacion'),
      shareLineup: t('matchSheet.pdf.shareLineup', 'Compartir alineación'),
      team: t('matchSheet.pdf.team', 'Equipo'),
      substitutes: t('matchSheet.pdf.substitutes', 'Suplentes'),
      lineupHeader: t('matchSheet.pdf.lineupHeader', 'ALINEACIÓN'),
      matchdayFileLabel: t('matchSheet.pdf.matchdayFileLabel', 'jornada'),
      positions: getPositionTranslations(t),
      roundLabels: getRoundLabels(t),
      legFirst: t('matchSheet.fields.legFirst', 'Ida'),
      legSecond: t('matchSheet.fields.legSecond', 'Vuelta'),
      group: t('matchSheet.fields.group', 'Grupo'),
    },
  });
}

export async function generateCallUpPDF(matchSheet, players, team, callupData = {}, t) {
  const lang = i18n.language || 'es';
  const convocados = normalizeIds(matchSheet?.convocados);
  const noConvocados = normalizeIds(matchSheet?.noConvocados);
  return vendorCallUpPDF({
    matchSheet,
    team,
    players,
    convocados,
    noConvocados,
    horaQuedada: callupData?.horaQuedada || matchSheet?.convocatoriaHoraQuedada || '',
    lugarQuedada: callupData?.lugarQuedada || matchSheet?.convocatoriaLugar || '',
    observaciones: callupData?.observaciones || matchSheet?.convocatoriaObservaciones || '',
    fechaQuedada: callupData?.fechaQuedada,
    showPhotos: callupData?.showPhotos !== false,
    translations: {
      lang,
      noDate: t('matchSheet.fields.noDate', 'Sin fecha'),
      generatedWith: t('matchSheet.pdf.generatedWith', 'Generado con Xtramys'),
      callupFileName: t('matchSheet.pdf.callupFileName', 'convocatoria'),
      shareCallup: t('matchSheet.pdf.shareCallup', 'Compartir convocatoria'),
      callupHeader: t('matchSheet.pdf.callupHeader', 'CONVOCATORIA'),
      team: t('matchSheet.pdf.team', 'Equipo'),
      date: t('matchSheet.pdf.date', 'Fecha'),
      time: t('matchSheet.pdf.time', 'Hora'),
      meeting: t('matchSheet.pdf.meeting', 'Quedada'),
      meetingTime: t('matchSheet.pdf.meetingTime', 'Hora de quedada'),
      location: t('matchSheet.pdf.location', 'Lugar'),
      called: t('matchSheet.pdf.called', 'Convocados'),
      notCalled: t('matchSheet.pdf.notCalled', 'No convocados'),
      observations: t('matchSheet.pdf.observations', 'Observaciones'),
      matchdayFileLabel: t('matchSheet.pdf.matchdayFileLabel', 'jornada'),
    },
  });
}

export async function generateMatchSheetPDF(matchSheet, players, team, t) {
  const lang = i18n.language || 'es';
  return vendorMatchSheetPDF({
    matchSheet,
    team,
    players,
    lineup: [],
    locale: lang,
    showPhotos: true,
    showNames: true,
    translations: {
      matchSheetTitle: t('matchSheet.pdf.matchSheetHeader', 'FICHA DE PARTIDO'),
      matchSheetFileName: t('matchSheet.pdf.matchSheetFileName', 'ficha_partido'),
      shareMatchSheet: t('matchSheet.pdf.shareMatchSheet', 'Compartir ficha'),
      generatedWith: t('matchSheet.pdf.generatedWith', 'Generado con Xtramys'),
      team: t('matchSheet.pdf.team', 'Equipo'),
      matchDay: t('matchSheet.pdf.matchDay', 'Jornada'),
      matchdayFileLabel: t('matchSheet.pdf.matchdayFileLabel', 'jornada'),
      location: t('matchSheet.pdf.location', 'Ubicación'),
      lineup: t('matchSheet.lineup.starters', 'Titulares'),
      substitutes: t('matchSheet.pdf.substitutes', 'Suplentes'),
      goals: t('matchSheet.pdf.goals', 'Goles'),
      yellowCards: t('matchSheet.pdf.yellowCards', 'Tarjetas amarillas'),
      redCards: t('matchSheet.pdf.redCards', 'Tarjetas rojas'),
      substitutions: t('matchSheet.pdf.substitutions', 'Cambios'),
      coachNotes: t('matchSheet.pdf.coachNotes', 'Notas del entrenador'),
      result: t('matchSheet.pdf.result', 'Resultado'),
      rivalFormation: t('matchSheet.pdf.rivalFormation', 'Formación rival'),
      called: t('matchSheet.pdf.called', 'Convocados'),
      local: t('schedule.local', 'Local'),
      visitor: t('schedule.visitor', 'Visitante'),
      neutral: t('schedule.neutral', 'Neutral'),
      victoria: t('matchSheet.fields.win', 'Victoria'),
      empate: t('matchSheet.fields.draw', 'Empate'),
      derrota: t('matchSheet.fields.loss', 'Derrota'),
      casa: t('matchSheet.fields.home', 'Casa'),
      fuera: t('matchSheet.fields.away', 'Fuera'),
      assist: t('matchSheet.pdf.assist', 'Asist'),
      rivalGoals: t('matchSheet.pdf.rivalGoals', 'Goles del Rival'),
      rivalGoalMinute: t('matchSheet.pdf.rivalGoalMinute', 'Min'),
      roundLabels: getRoundLabels(t),
      legFirst: t('matchSheet.fields.legFirst', 'Ida'),
      legSecond: t('matchSheet.fields.legSecond', 'Vuelta'),
      group: t('matchSheet.fields.group', 'Grupo'),
      date: t('matchSheet.pdf.date', 'Fecha'),
      time: t('matchSheet.pdf.time', 'Hora'),
      player: t('matchSheet.pdf.player', 'Jugador'),
      position: t('matchSheet.pdf.position', 'Pos'),
      enters: t('matchSheet.modals.playerEntering', 'Entra'),
      leaves: t('matchSheet.modals.playerLeaving', 'Sale'),
      yellowCard: t('matchSheet.cardTypes.yellow', 'Tarjeta Amarilla'),
      redCard: t('matchSheet.cardTypes.red', 'Tarjeta Roja'),
      goal: t('matchSheet.pdf.goals', 'Gol'),
      matchEvents: t('matchSheet.matchEvents', 'Eventos del Partido'),
      generalObservations: t('matchSheet.pdf.observations', 'Observaciones Generales'),
    },
    positionTranslations: getPositionTranslations(t),
  });
}
