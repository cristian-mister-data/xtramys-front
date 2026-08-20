export function hasDemoAccess(user) {
  return user?.plan === 'demo' || user?.accessMode === 'demo';
}

export function hasFullAccess(user, subscriptionStatus) {
  if (!user) return false;
  if (hasDemoAccess(user) || user.plan === 'demo' || user.plan === 'free') return false;
  if (user.role === 'admin') return true;
  if (user.role === 'club_admin') return true;
  if (user.clubId && user.clubMemberStatus === 'active') return true;
  if (user.plan === 'pro' || user.plan === 'club') return true;

  const status = subscriptionStatus || user.subscriptionStatus;
  const activeStatuses = new Set(['active', 'trialing']);
  if (activeStatuses.has(status)) return true;

  const periodEnd = user.subscriptionCurrentPeriodEnd;
  if (!periodEnd) return false;

  const periodEndTime = new Date(periodEnd).getTime();
  if (!Number.isFinite(periodEndTime)) return false;

  const hasFuturePeriod = Date.now() < periodEndTime;
  const cancelledButStillPaid =
    user.subscriptionCancelAtPeriodEnd || status === 'canceled' || status === 'cancelled';

  return hasFuturePeriod && cancelledButStillPaid;
}

export function hasAppAccess(user, subscriptionStatus) {
  return hasFullAccess(user, subscriptionStatus) || hasDemoAccess(user);
}

export function getAccessMode(user, subscriptionStatus) {
  if (hasFullAccess(user, subscriptionStatus)) return 'full';
  if (hasDemoAccess(user)) return 'demo';
  return 'none';
}

export const hasPaidSubscriptionAccess = hasFullAccess;

export function isSubscriptionScheduledToCancel(user, subscriptionStatus) {
  if (!user) return false;

  const status = subscriptionStatus || user.subscriptionStatus;
  const periodEnd = user.subscriptionCurrentPeriodEnd;
  const periodEndTime = periodEnd ? new Date(periodEnd).getTime() : NaN;
  const hasFuturePeriod = Number.isFinite(periodEndTime) && Date.now() < periodEndTime;

  return Boolean(
    hasFuturePeriod &&
    (user.subscriptionCancelAtPeriodEnd || status === 'canceled' || status === 'cancelled'),
  );
}
