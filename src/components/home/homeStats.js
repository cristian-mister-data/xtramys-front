// Estadísticas derivadas para la Home — fiel a misterdata mobile.

const setStartOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export function computeMatchStats(partidos = []) {
  const ahora = new Date();
  const disputados = partidos.filter((p) => {
    const f = p.fechaHora ? new Date(p.fechaHora) : null;
    return f && f <= ahora;
  });

  const partidosJugados = disputados.filter((p) => p.resultado).length;
  const partidosGanados = disputados.filter((p) => p.resultado === 'Victoria').length;
  const partidosEmpatados = disputados.filter((p) => p.resultado === 'Empate').length;
  const partidosPerdidos = disputados.filter((p) => p.resultado === 'Derrota').length;

  const torneoStats = {};
  const amistosos = [];
  for (const p of disputados) {
    const tId = p.torneoId?._id || p.torneoId || null;
    if (!tId || p.competicion === 'amistoso') {
      amistosos.push(p);
      continue;
    }
    if (!torneoStats[tId]) {
      torneoStats[tId] = { jugados: 0, ganados: 0, empatados: 0, perdidos: 0 };
    }
    if (p.resultado) torneoStats[tId].jugados++;
    if (p.resultado === 'Victoria') torneoStats[tId].ganados++;
    if (p.resultado === 'Empate') torneoStats[tId].empatados++;
    if (p.resultado === 'Derrota') torneoStats[tId].perdidos++;
  }

  const amistososStats = {
    jugados: amistosos.filter((p) => p.resultado).length,
    ganados: amistosos.filter((p) => p.resultado === 'Victoria').length,
    empatados: amistosos.filter((p) => p.resultado === 'Empate').length,
    perdidos: amistosos.filter((p) => p.resultado === 'Derrota').length,
  };

  return {
    partidosJugados,
    partidosGanados,
    partidosEmpatados,
    partidosPerdidos,
    torneoStats,
    amistososStats,
  };
}

export function computeInjuryStats(lesiones = []) {
  const hoy = setStartOfDay(new Date());
  const activas = lesiones.filter((l) => {
    if (!l.fechaInicio) return false;
    const inicio = setStartOfDay(l.fechaInicio);
    if (l.fechaFin) {
      const fin = setStartOfDay(l.fechaFin);
      return inicio <= hoy && fin >= hoy;
    }
    return inicio <= hoy;
  });

  const jugadoresLesionados = new Set(
    activas.map((l) => l.jugador?._id || l.jugador).filter(Boolean),
  ).size;

  return { lesionesActivas: activas.length, jugadoresLesionados };
}

export function getNextAndLast(items, dateField) {
  if (!Array.isArray(items) || !items.length) return { next: null, last: null };
  const now = new Date();
  const futuros = items
    .filter((it) => it[dateField] && new Date(it[dateField]) >= now)
    .sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
  const pasados = items
    .filter((it) => it[dateField] && new Date(it[dateField]) < now)
    .sort((a, b) => new Date(b[dateField]) - new Date(a[dateField]));
  return { next: futuros[0] || null, last: pasados[0] || null };
}

export function formatLongDate(value, locale = 'es-ES') {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatTime(value, locale = 'es-ES') {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}
