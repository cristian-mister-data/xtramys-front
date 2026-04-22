// Pure helpers for tournament detail (standings, brackets, sanctions display).

const ROUND_ORDER = [
  'treintaydosavos',
  'dieciseisavos',
  'octavos',
  'cuartos',
  'semifinal',
  'final',
];

const ROUND_LABELS = {
  treintaydosavos: '1/32',
  dieciseisavos: '1/16',
  octavos: 'Octavos',
  cuartos: 'Cuartos',
  semifinal: 'Semifinal',
  final: 'Final',
};

export function getRoundLabel(round) {
  return ROUND_LABELS[round] || round || '';
}

export function isMatchPlayed(m) {
  if (m?.golesPropios != null && m?.golesRival != null) return true;
  if (m?.resultado && m.resultado !== '') return true;
  return false;
}

export function computeStandings(matches, tournamentId) {
  if (!Array.isArray(matches) || !tournamentId) return [];
  const tid = String(tournamentId);
  const table = new Map();

  matches.forEach((m) => {
    const torneoId = m?.torneoId?._id || m?.torneoId;
    if (!torneoId || String(torneoId) !== tid) return;
    if (m.fase && m.fase !== 'liga' && m.fase !== 'grupos') return;
    if (!isMatchPlayed(m)) return;

    const rival = m.rival || '—';
    const ownTeam = m?.equipoNombre || 'Mi equipo';
    const gf = Number(m.golesPropios ?? m.golesFavor ?? 0);
    const gc = Number(m.golesRival ?? m.golesContra ?? 0);
    let resultado = m.resultado;
    if (!resultado) {
      if (gf > gc) resultado = 'Victoria';
      else if (gf < gc) resultado = 'Derrota';
      else resultado = 'Empate';
    }

    const ensure = (name) => {
      if (!table.has(name)) {
        table.set(name, { equipo: name, J: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0, DG: 0, Pts: 0 });
      }
      return table.get(name);
    };

    const own = ensure(ownTeam);
    const opp = ensure(rival);

    own.J += 1; opp.J += 1;
    own.GF += gf; own.GC += gc;
    opp.GF += gc; opp.GC += gf;

    if (resultado === 'Victoria') { own.G += 1; own.Pts += 3; opp.P += 1; }
    else if (resultado === 'Derrota') { own.P += 1; opp.G += 1; opp.Pts += 3; }
    else { own.E += 1; own.Pts += 1; opp.E += 1; opp.Pts += 1; }
  });

  const arr = Array.from(table.values()).map((row) => ({ ...row, DG: row.GF - row.GC }));
  arr.sort((a, b) => (
    b.Pts - a.Pts || b.DG - a.DG || b.GF - a.GF || a.equipo.localeCompare(b.equipo)
  ));
  return arr;
}

export function groupKnockoutMatches(matches, tournamentId) {
  if (!Array.isArray(matches) || !tournamentId) return [];
  const tid = String(tournamentId);
  const buckets = {};
  matches.forEach((m) => {
    const torneoId = m?.torneoId?._id || m?.torneoId;
    if (!torneoId || String(torneoId) !== tid) return;
    if (m.fase && m.fase !== 'eliminatoria') return;
    const round = m.ronda || 'otros';
    if (!buckets[round]) buckets[round] = [];
    buckets[round].push(m);
  });
  const order = [...ROUND_ORDER, 'otros'];
  return order
    .filter((r) => buckets[r] && buckets[r].length > 0)
    .map((r) => ({
      round: r,
      label: getRoundLabel(r),
      matches: buckets[r].sort((a, b) => new Date(a.fechaHora || 0) - new Date(b.fechaHora || 0)),
    }));
}

export function summarizeSanction(s) {
  if (!s) return '';
  if (s.tipo === 'cicloAmarillas') return `Ciclo de amarillas (${s.partidosSancion || 1})`;
  if (s.tipo === 'rojaDirecta') return 'Tarjeta roja directa';
  if (s.tipo === 'dobleAmarilla') return 'Doble amarilla';
  return s.tipo || '';
}
