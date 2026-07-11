export const KIT_PATTERNS = ['solid', 'vertical', 'horizontal', 'halves', 'diagonal', 'sash'];

export const DEFAULT_KITS = Object.freeze({
  first: { shape: 'shirt', pattern: 'solid', primaryColor: '#2563eb', secondaryColor: '#ffffff', shortsColor: '#1d4ed8' },
  second: { shape: 'shirt', pattern: 'solid', primaryColor: '#ffffff', secondaryColor: '#2563eb', shortsColor: '#ffffff' },
  goalkeeperFirst: { shape: 'shirt', pattern: 'solid', primaryColor: '#16a34a', secondaryColor: '#ffffff', shortsColor: '#15803d' },
  goalkeeperSecond: { shape: 'shirt', pattern: 'solid', primaryColor: '#f59e0b', secondaryColor: '#111827', shortsColor: '#d97706' },
});

export const DEFAULT_RIVAL_KITS = Object.freeze({
  ...DEFAULT_KITS,
  first: { ...DEFAULT_KITS.first, primaryColor: '#dc2626', shortsColor: '#991b1b' },
  second: { ...DEFAULT_KITS.second, secondaryColor: '#dc2626' },
});

export function normalizeKits(kits) {
  return Object.fromEntries(
    Object.entries(DEFAULT_KITS).map(([key, fallback]) => [key, { ...fallback, ...(kits?.[key] || {}) }]),
  );
}

export function normalizeRivalKits(kits) {
  return Object.fromEntries(
    Object.entries(DEFAULT_RIVAL_KITS).map(([key, fallback]) => [key, { ...fallback, ...(kits?.[key] || {}) }]),
  );
}

export function kitToBoardStyle(kit, goalkeeperKit) {
  const main = { ...DEFAULT_KITS.first, ...(kit || {}) };
  const goalkeeper = { ...DEFAULT_KITS.goalkeeperFirst, ...(goalkeeperKit || {}) };
  return {
    color: main.primaryColor,
    goalkeeperColor: goalkeeper.primaryColor,
    numberColor: '#ffffff',
    shape: main.shape === 'circle' ? 'circle' : 'jersey',
    hasStripes: main.pattern !== 'solid',
    stripeColor: main.secondaryColor,
    goalkeeperStripeColor: goalkeeper.secondaryColor,
    differentiateGoalkeeper: true,
    showPhotos: false,
  };
}
