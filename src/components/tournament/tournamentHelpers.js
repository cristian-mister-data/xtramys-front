// Constantes y opciones para la sección de torneos.
export const TOURNAMENT_TYPES = [
  { value: 'liga', labelKey: 'tournaments.league', color: '#3B82F6', icon: '📊' },
  { value: 'copa', labelKey: 'tournaments.copa', color: '#F59E0B', icon: '🏆' },
  { value: 'torneo', labelKey: 'tournaments.tournament', color: '#8B5CF6', icon: '🎖️' },
  { value: 'amistoso', labelKey: 'tournaments.friendly', color: '#10B981', icon: '🤝' },
  { value: 'otro', labelKey: 'tournaments.other', color: '#6B7280', icon: '⚽' },
];

export const FORMATO_OPTIONS = [
  { value: 'liga', labelKey: 'tournaments.formatLeague' },
  { value: 'eliminatoria', labelKey: 'tournaments.formatKnockout' },
  { value: 'grupos+eliminatoria', labelKey: 'tournaments.formatGroupsKnockout' },
];

export const RONDAS_OPTIONS = [
  { value: 'final', labelKey: 'tournaments.roundFinal' },
  { value: 'semifinal', labelKey: 'tournaments.roundSemifinal' },
  { value: 'cuartos', labelKey: 'tournaments.roundQuarters' },
  { value: 'octavos', labelKey: 'tournaments.roundRound16' },
  { value: 'dieciseisavos', labelKey: 'tournaments.roundRound32' },
  { value: 'treintaydosavos', labelKey: 'tournaments.roundRound64' },
];

export const TOURNAMENT_COLORS = [
  '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#3B82F6',
  '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#84CC16',
];

export function tournamentTypeInfo(value) {
  return TOURNAMENT_TYPES.find((t) => t.value === value) || TOURNAMENT_TYPES[1];
}

export function formatDateShort(dateStr, locale = 'es-ES') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
}
