// Shared by goals scored and conceded; missing minutes must not become minute zero.
export function getGoalMinuteStats(matches, goalField, scoreField, halfLength = 45) {
  const buckets = { '1-15': 0, '16-30': 0, '31-45': 0, '46-60': 0, '61-75': 0, '76-90+': 0 };
  const recorded = [];
  const firstGoals = [];
  let firstHalfGoals = 0;
  let totalGoals = 0;
  for (const match of matches) {
    const goals = Array.isArray(match[goalField]) ? match[goalField] : [];
    const score = match[scoreField];
    totalGoals += score !== null && score !== undefined && score !== '' && Number.isFinite(Number(score))
      ? Math.max(0, Number(score)) : goals.length;
    const minutes = [];
    const half = Number(match.tiempoPorParte || match.equipo?.tiempoPorParte || halfLength) || 45;
    for (const goal of goals) {
      const value = String(goal.minuto ?? '').trim();
      if (!/^\d+(?:\+\d+)?$/.test(value)) continue;
      const [base, extra = 0] = value.split('+').map(Number);
      const minute = base + extra;
      if (!Number.isSafeInteger(minute)) continue;
      recorded.push(minute); minutes.push(minute);
      if (base <= half) firstHalfGoals++;
      const bucketMinute = extra > 0 && base <= half ? Math.min(base, half) : minute;
      const period = bucketMinute <= 15 ? '1-15' : bucketMinute <= 30 ? '16-30' : bucketMinute <= 45 ? '31-45'
        : bucketMinute <= 60 ? '46-60' : bucketMinute <= 75 ? '61-75' : '76-90+';
      buckets[period]++;
    }
    if (minutes.length) firstGoals.push(Math.min(...minutes));
  }
  const mostDangerousPeriod = Object.keys(buckets).reduce((best, period) => buckets[period] > buckets[best] ? period : best, '1-15');
  return {
    hasData: recorded.length > 0, matchesWithData: firstGoals.length, totalGoals, totalTimedGoals: recorded.length,
    totalRivalGoals: recorded.length,
    avgFirstGoal: firstGoals.length ? (firstGoals.reduce((sum, minute) => sum + minute, 0) / firstGoals.length).toFixed(1) : null,
    buckets, mostDangerousPeriod, mostDangerousCount: buckets[mostDangerousPeriod],
    firstHalfGoals, secondHalfGoals: recorded.length - firstHalfGoals,
    avgPerMatch: matches.length ? (totalGoals / matches.length).toFixed(1) : '0.0',
    earliest: recorded.length ? Math.min(...recorded) : null,
    latest: recorded.length ? Math.max(...recorded) : null,
  };
}
