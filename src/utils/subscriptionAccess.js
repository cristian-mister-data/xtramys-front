export function hasPaidSubscriptionAccess(user, subscriptionStatus) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'club_admin') return true;
  if (user.clubId && user.clubMemberStatus === 'active') return true;

  const status = subscriptionStatus || user.subscriptionStatus;
  if (status === 'active') return true;

  const periodEnd = user.subscriptionCurrentPeriodEnd;
  if (!periodEnd) return false;

  const hasFuturePeriod = new Date() < new Date(periodEnd);
  return hasFuturePeriod && (
    user.subscriptionCancelAtPeriodEnd ||
    status === 'canceled' ||
    status === 'cancelled'
  );
}
