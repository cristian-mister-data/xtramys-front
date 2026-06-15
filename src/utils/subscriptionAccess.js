export function hasPaidSubscriptionAccess(user, subscriptionStatus) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'club_admin') return true;
  if (user.clubId && user.clubMemberStatus === 'active') return true;

  const status = subscriptionStatus || user.subscriptionStatus;
  const activeStatuses = new Set(['active', 'trialing']);
  if (activeStatuses.has(status)) return true;

  const periodEnd = user.subscriptionCurrentPeriodEnd;
  if (!periodEnd) return false;

  const periodEndTime = new Date(periodEnd).getTime();
  if (!Number.isFinite(periodEndTime)) return false;

  const hasFuturePeriod = Date.now() < periodEndTime;
  const cancelledButStillPaid =
    user.subscriptionCancelAtPeriodEnd ||
    status === 'canceled' ||
    status === 'cancelled';

  return hasFuturePeriod && cancelledButStillPaid;
}

export function isSubscriptionScheduledToCancel(user, subscriptionStatus) {
  if (!user) return false;

  const status = subscriptionStatus || user.subscriptionStatus;
  const periodEnd = user.subscriptionCurrentPeriodEnd;
  const periodEndTime = periodEnd ? new Date(periodEnd).getTime() : NaN;
  const hasFuturePeriod = Number.isFinite(periodEndTime) && Date.now() < periodEndTime;

  return Boolean(
    hasFuturePeriod &&
    (user.subscriptionCancelAtPeriodEnd || status === 'canceled' || status === 'cancelled')
  );
}
