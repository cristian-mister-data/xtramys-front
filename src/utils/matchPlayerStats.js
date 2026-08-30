export const idOf = (value) => String(value?._id || value?.id || value || '');

export function getMatchPlayerContributions(match) {
  const result = new Map();
  const add = (player, field, amount = 1) => {
    const id = idOf(player);
    if (!id) return;
    const stats = result.get(id) || {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      doubleYellowCards: 0,
    };
    stats[field] += Number(amount) || 0;
    result.set(id, stats);
  };

  const goals = match?.goles || [];
  const events = match?.eventos || [];
  if (goals.length) {
    goals.forEach((goal) => add(goal.jugador, 'goals'));
  } else {
    events.forEach((event) => add(event.player, 'goals', event.goles));
  }
  const detailedAssists = goals.filter((goal) => goal.asistente);
  if (detailedAssists.length) detailedAssists.forEach((goal) => add(goal.asistente, 'assists'));
  else events.forEach((event) => add(event.player, 'assists', event.asistencias));

  const yellowCards = match?.tarjetasAmarillas || [];
  const redCards = match?.tarjetasRojas || [];
  if (yellowCards.length) yellowCards.forEach((card) => add(card.jugador, 'yellowCards'));
  else events.forEach((event) => {
    if (event.tarjetaAmarilla) add(event.player, 'yellowCards');
  });
  if (redCards.length) {
    redCards.forEach((card) => {
      add(card.jugador, 'redCards');
      if (card.motivo === 'Doble amarilla') add(card.jugador, 'doubleYellowCards');
    });
  } else {
    events.forEach((event) => {
      if (event.tarjetaRoja) add(event.player, 'redCards');
    });
  }

  return result;
}

const parseMinute = (value, fallback) => {
  const match = String(value ?? '').match(/^(\d+)(?:\+(\d+))?/);
  return match ? Number(match[1]) + (Number(match[2]) || 0) : fallback;
};

export function getPlayerMatchStats(matches, player, team) {
  const playerId = idOf(player);
  const stats = {
    matches: { total: 0, starter: 0, substitute: 0, notCalled: 0, bench: 0, minutesPlayed: 0 },
    goals: { total: 0, assists: 0 },
    cards: { yellow: 0, red: 0, doubleYellow: 0 },
  };

  (matches || [])
    .filter((match) => match.fechaHora && new Date(match.fechaHora) < new Date())
    .forEach((match) => {
      const half = match.tiempoPorParte || team?.tiempoPorParte || 45;
      const firstHalf = half + (match.descuentoPrimerTiempo || 0);
      const secondHalf = half + (match.descuentoSegundoTiempo || 0);
      const totalTime = firstHalf + secondHalf;
      const starters = (match.alineacionTitulares || []).map(idOf);
      const substitutes = (match.alineacionSuplentes || []).map(idOf);
      const notCalled = (match.noConvocados || []).map(idOf);
      const played = new Set(starters);
      let subbedOut = false;

      (match.cambios || []).forEach((change) => {
        const outId = idOf(change.sale);
        const inId = idOf(change.entra);
        played.add(inId);
        if (outId === playerId) {
          subbedOut = true;
          const minute = parseMinute(change.minuto, totalTime);
          if (starters.includes(playerId)) stats.matches.minutesPlayed += minute <= half ? minute : firstHalf + minute - half;
        }
        if (inId === playerId) {
          const minute = parseMinute(change.minuto, totalTime);
          stats.matches.substitute++;
          stats.matches.total++;
          stats.matches.minutesPlayed += minute <= half
            ? half - minute + (match.descuentoPrimerTiempo || 0) + secondHalf
            : secondHalf - (minute - half);
        }
      });

      if (starters.includes(playerId)) {
        stats.matches.starter++;
        stats.matches.total++;
        if (!subbedOut) stats.matches.minutesPlayed += totalTime;
      }
      if (substitutes.includes(playerId) && !played.has(playerId)) stats.matches.bench++;
      if (notCalled.includes(playerId) || !new Set([...starters, ...substitutes, ...notCalled]).has(playerId)) {
        stats.matches.notCalled++;
      }

      const contribution = getMatchPlayerContributions(match).get(playerId);
      if (contribution) {
        stats.goals.total += contribution.goals;
        stats.goals.assists += contribution.assists;
        stats.cards.yellow += contribution.yellowCards;
        stats.cards.red += contribution.redCards;
        stats.cards.doubleYellow += contribution.doubleYellowCards;
      }
    });

  return stats;
}
