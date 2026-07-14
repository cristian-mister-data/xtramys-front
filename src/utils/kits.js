export const KIT_PATTERNS = ['solid', 'vertical', 'horizontal', 'halves', 'diagonal', 'sash'];

export const DEFAULT_KITS = Object.freeze({
  first: { shape: 'shirt', pattern: 'solid', primaryColor: '#2563eb', secondaryColor: '#ffffff', shortsColor: '#1d4ed8', numberColor: '#ffffff' },
  second: { shape: 'shirt', pattern: 'solid', primaryColor: '#ffffff', secondaryColor: '#2563eb', shortsColor: '#ffffff', numberColor: '#111827' },
  goalkeeperFirst: { shape: 'shirt', pattern: 'solid', primaryColor: '#16a34a', secondaryColor: '#ffffff', shortsColor: '#15803d', numberColor: '#ffffff' },
  goalkeeperSecond: { shape: 'shirt', pattern: 'solid', primaryColor: '#f59e0b', secondaryColor: '#111827', shortsColor: '#d97706', numberColor: '#111827' },
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
  const mainPattern = KIT_PATTERNS.includes(main.pattern) ? main.pattern : 'solid';
  const goalkeeperPattern = KIT_PATTERNS.includes(goalkeeper.pattern) ? goalkeeper.pattern : 'solid';
  return {
    color: main.primaryColor,
    goalkeeperColor: goalkeeper.primaryColor,
    numberColor: main.numberColor,
    shape: main.shape === 'circle' ? 'circle' : 'jersey',
    hasStripes: mainPattern !== 'solid',
    stripeColor: main.secondaryColor,
    kitPattern: mainPattern,
    kitSecondaryColor: main.secondaryColor,
    goalkeeperStripeColor: goalkeeper.secondaryColor,
    goalkeeperKitPattern: goalkeeperPattern,
    differentiateGoalkeeper: true,
    showPhotos: false,
  };
}

const SET_PIECE_ROLES = {
  icon1: 'own',
  'goalkeeper-1': 'ownGoalkeeper',
  icon2: 'rival',
  'goalkeeper-2': 'rivalGoalkeeper',
};

export function getSetPieceIconRole(element) {
  if (SET_PIECE_ROLES[element?.kitRole]) return SET_PIECE_ROLES[element.kitRole];
  if (Object.values(SET_PIECE_ROLES).includes(element?.kitRole)) return element.kitRole;

  const id = String(element?.idBase || element?.paletteIconId || element?.id || '');
  const sourceId = Object.keys(SET_PIECE_ROLES).find((key) => id === key || id.startsWith(`${key}-clone-`));
  if (sourceId) return SET_PIECE_ROLES[sourceId];

  if (element?.ownerType === 'team') return element?.isGoalkeeper ? 'ownGoalkeeper' : 'own';
  if (element?.ownerType === 'opponent') return element?.isGoalkeeper ? 'rivalGoalkeeper' : 'rival';

  // Compatibilidad con ABP guardadas antes de persistir el rol semántico.
  return ['own', 'rival', 'ownGoalkeeper', 'rivalGoalkeeper'][element?.paletteIndex] || null;
}

export function applySetPieceKitsToElements(elements = [], kitContext, showPhotos) {
  if (!kitContext) return elements;

  const styles = {
    own: kitContext.own && kitToBoardStyle(kitContext.own, kitContext.ownGoalkeeper),
    rival: kitContext.rival && kitToBoardStyle(kitContext.rival, kitContext.rivalGoalkeeper),
    ownGoalkeeper: kitContext.ownGoalkeeper && {
      ...kitToBoardStyle(kitContext.ownGoalkeeper, kitContext.ownGoalkeeper),
      differentiateGoalkeeper: false,
    },
    rivalGoalkeeper: kitContext.rivalGoalkeeper && {
      ...kitToBoardStyle(kitContext.rivalGoalkeeper, kitContext.rivalGoalkeeper),
      differentiateGoalkeeper: false,
    },
  };

  return elements.map((element) => {
    if (element?.type !== 'player') return element;
    const role = getSetPieceIconRole(element);
    const style = styles[role];
    if (!style) return element;
    return {
      ...element,
      ...style,
      kitRole: role,
      isGoalkeeper: role.endsWith('Goalkeeper'),
      isNeutral: false,
      hasBib: false,
      showPhotos: typeof showPhotos === 'boolean' ? showPhotos : element.showPhotos === true,
      preserveVisualStyle: true,
    };
  });
}

export function applySetPiecePlayerOverlays(elements = [], overlays = []) {
  if (!overlays.length) return elements;

  const result = elements.map((element) => ({ ...element }));
  const usedElements = new Set();
  const usedOverlays = new Set();
  const slot = (element) => String(element.id || element._id || '');
  const number = (element) => String(element.number || element.playerNumber || element.numero || element.text || element.label || '');
  const distance = (element, overlay) => {
    const values = [element.xRatio ?? element.x, element.yRatio ?? element.y, overlay.xRatio ?? overlay.x, overlay.yRatio ?? overlay.y].map(Number);
    return values.every(Number.isFinite)
      ? ((values[0] - values[2]) ** 2) + ((values[1] - values[3]) ** 2)
      : Number.POSITIVE_INFINITY;
  };
  const merge = (element, overlay) => ({
    ...element,
    ...overlay,
    id: element.id,
    type: element.type,
    x: element.x,
    y: element.y,
    xRatio: element.xRatio,
    yRatio: element.yRatio,
  });

  overlays.forEach((overlay, overlayIndex) => {
    const elementIndex = result.findIndex((element, index) =>
      !usedElements.has(index) && element?.type === 'player' && overlay.slotId && slot(element) === String(overlay.slotId)
    );
    if (elementIndex < 0) return;
    result[elementIndex] = merge(result[elementIndex], overlay);
    usedElements.add(elementIndex);
    usedOverlays.add(overlayIndex);
  });

  overlays.forEach((overlay, overlayIndex) => {
    if (usedOverlays.has(overlayIndex) || overlay.exactSlot || !overlay.number) return;
    const candidate = result
      .map((element, index) => ({ element, index }))
      .filter(({ element, index }) =>
        !usedElements.has(index) && element?.type === 'player' && number(element) === String(overlay.number)
      )
      .sort((a, b) => distance(a.element, overlay) - distance(b.element, overlay))[0];
    if (!candidate) return;
    result[candidate.index] = merge(candidate.element, overlay);
    usedElements.add(candidate.index);
  });

  return result;
}

export function getSetPieceVideoSignature(overlays = []) {
  const text = (value) => String(value ?? '');
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
  const media = (value) => text(value).replace(/\?.*$/, '');

  return JSON.stringify(overlays.map((overlay) => ({
    slotId: text(overlay.slotId),
    number: text(overlay.number),
    exactSlot: overlay.exactSlot === true,
    xRatio: number(overlay.xRatio),
    yRatio: number(overlay.yRatio),
    x: number(overlay.x),
    y: number(overlay.y),
    color: text(overlay.color),
    numberColor: text(overlay.numberColor),
    shape: text(overlay.shape),
    hasStripes: overlay.hasStripes === true,
    stripeColor: text(overlay.stripeColor),
    kitPattern: text(overlay.kitPattern),
    kitSecondaryColor: text(overlay.kitSecondaryColor),
    isGoalkeeper: overlay.isGoalkeeper === true,
    differentiateGoalkeeper: overlay.differentiateGoalkeeper === true,
    goalkeeperStripeColor: text(overlay.goalkeeperStripeColor),
    showPhotos: overlay.showPhotos === true,
    photoUrl: media(overlay.photoUrl),
    player: {
      id: text(overlay.playerData?._id || overlay.playerData?.id),
      name: text(overlay.playerData?.nombre || overlay.playerData?.name || overlay.playerData?.fullName),
      position: text(overlay.playerData?.demarcacion || overlay.playerData?.posicion || overlay.playerData?.position),
      photo: media(overlay.playerData?.foto),
    },
  })));
}
