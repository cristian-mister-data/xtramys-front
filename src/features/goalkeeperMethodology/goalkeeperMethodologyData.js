// Datos predeterminados de metodología de porteros
// Basado en microciclos de 3, 4 y 5 días

export const getDefaultGoalkeeperMethodologyData = (t) => ({
  metadata: {
    version: "1.0",
    description: t('goalkeeperMethodology.data.description'),
  },
  plans: {
    "5_days": [
      {
        day_label: "+1",
        day_number: 1,
        main_objective: t('goalkeeperMethodology.data.objectives.recoveryAnalysis'),
        practical_content: t('goalkeeperMethodology.data.content.day5_1'),
        intensity: t('goalkeeperMethodology.data.intensity.low'),
      },
      {
        day_label: "-4",
        day_number: 2,
        main_objective: t('goalkeeperMethodology.data.objectives.explosiveStrengthTechnique'),
        practical_content: t('goalkeeperMethodology.data.content.day5_2'),
        intensity: t('goalkeeperMethodology.data.intensity.medium'),
      },
      {
        day_label: "-3",
        day_number: 3,
        main_objective: t('goalkeeperMethodology.data.objectives.advancedTechniqueTactics'),
        practical_content: t('goalkeeperMethodology.data.content.day5_3'),
        intensity: t('goalkeeperMethodology.data.intensity.high'),
      },
      {
        day_label: "-2",
        day_number: 4,
        main_objective: t('goalkeeperMethodology.data.objectives.rivalFocusReal'),
        practical_content: t('goalkeeperMethodology.data.content.day5_4'),
        intensity: t('goalkeeperMethodology.data.intensity.mediumLow'),
      },
      {
        day_label: "-1",
        day_number: 5,
        main_objective: t('goalkeeperMethodology.data.objectives.preMatchActivation'),
        practical_content: t('goalkeeperMethodology.data.content.day5_5'),
        intensity: t('goalkeeperMethodology.data.intensity.low'),
      },
    ],
    "4_days": [
      {
        day_label: "+1",
        day_number: 1,
        main_objective: t('goalkeeperMethodology.data.objectives.recoveryAnalysis'),
        practical_content: t('goalkeeperMethodology.data.content.day4_1'),
        intensity: t('goalkeeperMethodology.data.intensity.low'),
      },
      {
        day_label: "-3",
        day_number: 2,
        main_objective: t('goalkeeperMethodology.data.objectives.explosiveStrengthConcurrentTechnique'),
        practical_content: t('goalkeeperMethodology.data.content.day4_2'),
        intensity: t('goalkeeperMethodology.data.intensity.mediumHigh'),
      },
      {
        day_label: "-2",
        day_number: 3,
        main_objective: t('goalkeeperMethodology.data.objectives.advancedTechniqueTacticsRival'),
        practical_content: t('goalkeeperMethodology.data.content.day4_3'),
        intensity: t('goalkeeperMethodology.data.intensity.medium'),
      },
      {
        day_label: "-1",
        day_number: 4,
        main_objective: t('goalkeeperMethodology.data.objectives.preMatchActivation'),
        practical_content: t('goalkeeperMethodology.data.content.day4_4'),
        intensity: t('goalkeeperMethodology.data.intensity.low'),
      },
    ],
    "3_days": [
      {
        day_label: "+1",
        day_number: 1,
        main_objective: t('goalkeeperMethodology.data.objectives.recoveryExplosiveTechniqueAnalysis'),
        practical_content: t('goalkeeperMethodology.data.content.day3_1'),
        intensity: t('goalkeeperMethodology.data.intensity.medium'),
      },
      {
        day_label: "-2",
        day_number: 2,
        main_objective: t('goalkeeperMethodology.data.objectives.advancedTechniqueTacticsRealConcurrent'),
        practical_content: t('goalkeeperMethodology.data.content.day3_2'),
        intensity: t('goalkeeperMethodology.data.intensity.mediumHigh'),
      },
      {
        day_label: "-1",
        day_number: 3,
        main_objective: t('goalkeeperMethodology.data.objectives.preMatchActivation'),
        practical_content: t('goalkeeperMethodology.data.content.day3_3'),
        intensity: t('goalkeeperMethodology.data.intensity.low'),
      },
    ],
  }
});

// Colores para intensidades
export const INTENSITY_COLORS = {
  low: '#4CAF50',
  medium: '#FF9800',
  mediumLow: '#8BC34A',
  mediumHigh: '#FF5722',
  high: '#F44336',
};

export const getIntensityColor = (intensityText, t) => {
  if (intensityText === t('goalkeeperMethodology.data.intensity.low')) return INTENSITY_COLORS.low;
  if (intensityText === t('goalkeeperMethodology.data.intensity.medium')) return INTENSITY_COLORS.medium;
  if (intensityText === t('goalkeeperMethodology.data.intensity.mediumLow')) return INTENSITY_COLORS.mediumLow;
  if (intensityText === t('goalkeeperMethodology.data.intensity.mediumHigh')) return INTENSITY_COLORS.mediumHigh;
  if (intensityText === t('goalkeeperMethodology.data.intensity.high')) return INTENSITY_COLORS.high;
  return '#9E9E9E';
};

// Label para planes
export const getPlanLabel = (planKey, t) => {
  const match = planKey.match(/(\d+)_days/);
  if (match) {
    return t('goalkeeperMethodology.daysPerWeek', { count: parseInt(match[1]) });
  }
  return planKey;
};

// Color primario del módulo
export const GK_PRIMARY_COLOR = '#00796B';
export const GK_SECONDARY_COLOR = '#26A69A';
export const GK_GRADIENT = ['#00796B', '#26A69A'];
