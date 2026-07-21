export function getPlayerRenderMetrics(element, scale) {
  const baseSize = element?.baseSize || element?.size || 24;
  const size = baseSize * scale;
  return {
    size,
    radius: size / 2,
    nameFontSize: size * 0.36,
  };
}

export function getPlayerKitRenderState(
  element,
  {
    isGoalkeeper = element?.isGoalkeeper === true,
    differentiateGoalkeeper = element?.differentiateGoalkeeper !== false,
    goalkeeperStripeColor = element?.goalkeeperStripeColor || '#ffffff',
  } = {},
) {
  const kitPattern = element?.kitPattern || (element?.hasStripes === true ? 'vertical' : 'solid');
  const playerStripeColor = element?.stripeColor || '#ffffff';
  const kitSecondaryColor = element?.kitSecondaryColor || playerStripeColor;
  const drawGoalkeeperVerticalStripes = isGoalkeeper && differentiateGoalkeeper;
  const drawPlayerPattern =
    (element?.hasStripes === true || kitPattern !== 'solid') &&
    !drawGoalkeeperVerticalStripes;
  const drawPattern =
    kitPattern === 'vertical'
      ? drawPlayerPattern || drawGoalkeeperVerticalStripes
      : drawPlayerPattern && kitPattern !== 'solid';

  return {
    isJersey: element?.shape === 'jersey',
    kitPattern,
    kitSecondaryColor,
    drawPattern,
    drawPlayerPattern,
    drawVerticalStripes: drawPlayerPattern || drawGoalkeeperVerticalStripes,
    verticalStripeColor: drawPlayerPattern ? playerStripeColor : goalkeeperStripeColor,
  };
}
