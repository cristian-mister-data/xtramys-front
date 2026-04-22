// Datos de Nutrición para Xtramys - Con soporte i18n

// Función para obtener los datos de comidas compartidos con traducción
export const getSharedMeals = (t) => ({
  breakfast: [
    {
      type: t('nutrition.breakfastTypes.type1'),
      items: [
        t('nutrition.dietItems.breakfast.type1.item1'),
        t('nutrition.dietItems.breakfast.type1.item2'),
        t('nutrition.dietItems.breakfast.type1.item3')
      ]
    },
    {
      type: t('nutrition.breakfastTypes.type2'),
      items: [
        t('nutrition.dietItems.breakfast.type2.item1'),
        t('nutrition.dietItems.breakfast.type2.item2'),
        t('nutrition.dietItems.breakfast.type2.item3'),
        t('nutrition.dietItems.breakfast.type2.item4')
      ]
    },
    {
      type: t('nutrition.breakfastTypes.type3'),
      items: [
        t('nutrition.dietItems.breakfast.type3.item1'),
        t('nutrition.dietItems.breakfast.type3.item2'),
        t('nutrition.dietItems.breakfast.type3.item3')
      ]
    }
  ],
  mid_morning: [
    {
      condition: t('nutrition.conditions.postTraining'),
      options: [
        t('nutrition.dietItems.midMorning.postTraining.opt1'),
        t('nutrition.dietItems.midMorning.postTraining.opt2'),
        t('nutrition.dietItems.midMorning.postTraining.opt3'),
        t('nutrition.dietItems.midMorning.postTraining.opt4')
      ]
    },
    {
      condition: t('nutrition.conditions.noTraining'),
      options: [
        t('nutrition.dietItems.midMorning.noTraining.opt1'),
        t('nutrition.dietItems.midMorning.noTraining.opt2'),
        t('nutrition.dietItems.midMorning.noTraining.opt3'),
        t('nutrition.dietItems.midMorning.noTraining.opt4')
      ]
    }
  ],
  snacks: [
    {
      condition: t('nutrition.conditions.afternoonTraining'),
      options: [
        t('nutrition.dietItems.snacks.afternoonTraining.opt1'),
        t('nutrition.dietItems.snacks.afternoonTraining.opt2'),
        t('nutrition.dietItems.snacks.afternoonTraining.opt3'),
        t('nutrition.dietItems.snacks.afternoonTraining.opt4')
      ]
    },
    {
      condition: t('nutrition.conditions.morningTraining'),
      options: [
        t('nutrition.dietItems.snacks.morningTraining.opt1'),
        t('nutrition.dietItems.snacks.morningTraining.opt2'),
        t('nutrition.dietItems.snacks.morningTraining.opt3'),
        t('nutrition.dietItems.snacks.morningTraining.opt4')
      ]
    },
    {
      condition: t('nutrition.conditions.restDay'),
      options: [
        t('nutrition.dietItems.snacks.restDay.opt1'),
        t('nutrition.dietItems.snacks.restDay.opt2'),
        t('nutrition.dietItems.snacks.restDay.opt3'),
        t('nutrition.dietItems.snacks.restDay.opt4')
      ]
    }
  ]
});

// Función para obtener los datos de comidas compartidos Opción 2
export const getSharedMealsOption2 = (t) => ({
  breakfast: [
    {
      type: t('nutrition.breakfastTypes.type1'),
      items: [
        t('nutrition.dietItemsOption2.breakfast.type1.item1'),
        t('nutrition.dietItemsOption2.breakfast.type1.item2'),
        t('nutrition.dietItemsOption2.breakfast.type1.item3')
      ]
    },
    {
      type: t('nutrition.breakfastTypes.type2'),
      items: [
        t('nutrition.dietItemsOption2.breakfast.type2.item1'),
        t('nutrition.dietItemsOption2.breakfast.type2.item2'),
        t('nutrition.dietItemsOption2.breakfast.type2.item3'),
        t('nutrition.dietItemsOption2.breakfast.type2.item4')
      ]
    },
    {
      type: t('nutrition.breakfastTypes.type3'),
      items: [
        t('nutrition.dietItemsOption2.breakfast.type3.item1'),
        t('nutrition.dietItemsOption2.breakfast.type3.item2'),
        t('nutrition.dietItemsOption2.breakfast.type3.item3')
      ]
    }
  ],
  mid_morning: [
    {
      condition: t('nutrition.conditions.postTraining'),
      options: [
        t('nutrition.dietItemsOption2.midMorning.postTraining.opt1'),
        t('nutrition.dietItemsOption2.midMorning.postTraining.opt2'),
        t('nutrition.dietItemsOption2.midMorning.postTraining.opt3'),
        t('nutrition.dietItemsOption2.midMorning.postTraining.opt4')
      ]
    },
    {
      condition: t('nutrition.conditions.noTraining'),
      options: [
        t('nutrition.dietItemsOption2.midMorning.noTraining.opt1'),
        t('nutrition.dietItemsOption2.midMorning.noTraining.opt2'),
        t('nutrition.dietItemsOption2.midMorning.noTraining.opt3'),
        t('nutrition.dietItemsOption2.midMorning.noTraining.opt4')
      ]
    }
  ],
  snacks: [
    {
      condition: t('nutrition.conditions.afternoonTraining'),
      options: [
        t('nutrition.dietItemsOption2.snacks.afternoonTraining.opt1'),
        t('nutrition.dietItemsOption2.snacks.afternoonTraining.opt2'),
        t('nutrition.dietItemsOption2.snacks.afternoonTraining.opt3'),
        t('nutrition.dietItemsOption2.snacks.afternoonTraining.opt4')
      ]
    },
    {
      condition: t('nutrition.conditions.morningTraining'),
      options: [
        t('nutrition.dietItemsOption2.snacks.morningTraining.opt1'),
        t('nutrition.dietItemsOption2.snacks.morningTraining.opt2'),
        t('nutrition.dietItemsOption2.snacks.morningTraining.opt3'),
        t('nutrition.dietItemsOption2.snacks.morningTraining.opt4')
      ]
    },
    {
      condition: t('nutrition.conditions.restDay'),
      options: [
        t('nutrition.dietItemsOption2.snacks.restDay.opt1'),
        t('nutrition.dietItemsOption2.snacks.restDay.opt2'),
        t('nutrition.dietItemsOption2.snacks.restDay.opt3'),
        t('nutrition.dietItemsOption2.snacks.restDay.opt4')
      ]
    }
  ]
});

// Función para hacer deep copy de las comidas
const cloneMeals = (meals) => JSON.parse(JSON.stringify(meals));

export const getPreSeasonData = (t) => ({
  title: t('nutrition.titles.preseason'),
  meals: getSharedMeals(t),
  weekly_menu: [
    {
      day: t('nutrition.days.monday'),
      tag: t('nutrition.tags.training'),
      lunch: t('nutrition.weeklyMenu.preseason.monday.lunch'),
      dinner: t('nutrition.weeklyMenu.preseason.monday.dinner')
    },
    {
      day: t('nutrition.days.tuesday'),
      tag: t('nutrition.tags.training'),
      lunch: t('nutrition.weeklyMenu.preseason.tuesday.lunch'),
      dinner: t('nutrition.weeklyMenu.preseason.tuesday.dinner')
    },
    {
      day: t('nutrition.days.wednesday'),
      tag: t('nutrition.tags.training'),
      lunch: t('nutrition.weeklyMenu.preseason.wednesday.lunch'),
      dinner: t('nutrition.weeklyMenu.preseason.wednesday.dinner')
    },
    {
      day: t('nutrition.days.thursday'),
      tag: t('nutrition.tags.training'),
      lunch: t('nutrition.weeklyMenu.preseason.thursday.lunch'),
      dinner: t('nutrition.weeklyMenu.preseason.thursday.dinner')
    },
    {
      day: t('nutrition.days.friday'),
      tag: t('nutrition.tags.training'),
      lunch: t('nutrition.weeklyMenu.preseason.friday.lunch'),
      dinner: t('nutrition.weeklyMenu.preseason.friday.dinner')
    },
    {
      day: t('nutrition.days.saturday'),
      tag: t('nutrition.tags.rest'),
      lunch: t('nutrition.weeklyMenu.preseason.saturday.lunch'),
      dinner: t('nutrition.weeklyMenu.preseason.saturday.dinner')
    },
    {
      day: t('nutrition.days.sunday'),
      tag: t('nutrition.tags.rest'),
      lunch: t('nutrition.free'),
      dinner: t('nutrition.free')
    }
  ]
});

export const getSeasonData = (t) => ({
  title: t('nutrition.titles.season'),
  meals: cloneMeals(getSharedMeals(t)),
  menu_options: [
    {
      context: t('nutrition.contexts.trainingDay'),
      icon: "fitness-center",
      color: "#10b981",
      lunches: [
        t('nutrition.weeklyMenu.season.trainingDay.lunch1'),
        t('nutrition.weeklyMenu.season.trainingDay.lunch2'),
        t('nutrition.weeklyMenu.season.trainingDay.lunch3'),
        t('nutrition.weeklyMenu.season.trainingDay.lunch4')
      ],
      dinners: [
        t('nutrition.weeklyMenu.season.trainingDay.dinner1'),
        t('nutrition.weeklyMenu.season.trainingDay.dinner2'),
        t('nutrition.weeklyMenu.season.trainingDay.dinner3'),
        t('nutrition.weeklyMenu.season.trainingDay.dinner4')
      ]
    },
    {
      context: t('nutrition.contexts.freeDay'),
      icon: "weekend",
      color: "#6366f1",
      lunches: [
        t('nutrition.free'),
        t('nutrition.weeklyMenu.season.freeDay.lunch1')
      ],
      dinners: [
        t('nutrition.weeklyMenu.season.freeDay.dinner1'),
        t('nutrition.weeklyMenu.season.freeDay.dinner2')
      ]
    },
    {
      context: t('nutrition.contexts.preMatch'),
      icon: "sports-soccer",
      color: "#f59e0b",
      lunches: [
        t('nutrition.weeklyMenu.season.preMatch.lunch1')
      ],
      dinners: [
        t('nutrition.weeklyMenu.season.preMatch.dinnerProtocol')
      ]
    }
  ]
});

export const getPreSeasonDataOption2 = (t) => ({
  title: t('nutrition.titles.preseason'),
  meals: getSharedMealsOption2(t),
  weekly_menu: [
    {
      day: t('nutrition.days.monday'),
      tag: t('nutrition.tags.training'),
      lunch: t('nutrition.weeklyMenuOption2.preseason.monday.lunch'),
      dinner: t('nutrition.weeklyMenuOption2.preseason.monday.dinner')
    },
    {
      day: t('nutrition.days.tuesday'),
      tag: t('nutrition.tags.training'),
      lunch: t('nutrition.weeklyMenuOption2.preseason.tuesday.lunch'),
      dinner: t('nutrition.weeklyMenuOption2.preseason.tuesday.dinner')
    },
    {
      day: t('nutrition.days.wednesday'),
      tag: t('nutrition.tags.training'),
      lunch: t('nutrition.weeklyMenuOption2.preseason.wednesday.lunch'),
      dinner: t('nutrition.weeklyMenuOption2.preseason.wednesday.dinner')
    },
    {
      day: t('nutrition.days.thursday'),
      tag: t('nutrition.tags.training'),
      lunch: t('nutrition.weeklyMenuOption2.preseason.thursday.lunch'),
      dinner: t('nutrition.weeklyMenuOption2.preseason.thursday.dinner')
    },
    {
      day: t('nutrition.days.friday'),
      tag: t('nutrition.tags.training'),
      lunch: t('nutrition.weeklyMenuOption2.preseason.friday.lunch'),
      dinner: t('nutrition.weeklyMenuOption2.preseason.friday.dinner')
    },
    {
      day: t('nutrition.days.saturday'),
      tag: t('nutrition.tags.rest'),
      lunch: t('nutrition.weeklyMenuOption2.preseason.saturday.lunch'),
      dinner: t('nutrition.weeklyMenuOption2.preseason.saturday.dinner')
    },
    {
      day: t('nutrition.days.sunday'),
      tag: t('nutrition.tags.rest'),
      lunch: t('nutrition.free'),
      dinner: t('nutrition.free')
    }
  ]
});

export const getSeasonDataOption2 = (t) => ({
  title: t('nutrition.titles.season'),
  meals: cloneMeals(getSharedMealsOption2(t)),
  menu_options: [
    {
      context: t('nutrition.contexts.trainingDay'),
      icon: "fitness-center",
      color: "#10b981",
      lunches: [
        t('nutrition.weeklyMenuOption2.season.trainingDay.lunch1'),
        t('nutrition.weeklyMenuOption2.season.trainingDay.lunch2'),
        t('nutrition.weeklyMenuOption2.season.trainingDay.lunch3'),
        t('nutrition.weeklyMenuOption2.season.trainingDay.lunch4')
      ],
      dinners: [
        t('nutrition.weeklyMenuOption2.season.trainingDay.dinner1'),
        t('nutrition.weeklyMenuOption2.season.trainingDay.dinner2'),
        t('nutrition.weeklyMenuOption2.season.trainingDay.dinner3'),
        t('nutrition.weeklyMenuOption2.season.trainingDay.dinner4')
      ]
    },
    {
      context: t('nutrition.contexts.freeDay'),
      icon: "weekend",
      color: "#6366f1",
      lunches: [
        t('nutrition.free'),
        t('nutrition.weeklyMenuOption2.season.freeDay.lunch1')
      ],
      dinners: [
        t('nutrition.weeklyMenuOption2.season.freeDay.dinner1'),
        t('nutrition.weeklyMenuOption2.season.freeDay.dinner2')
      ]
    },
    {
      context: t('nutrition.contexts.preMatch'),
      icon: "sports-soccer",
      color: "#f59e0b",
      lunches: [
        t('nutrition.weeklyMenuOption2.season.preMatch.lunch1')
      ],
      dinners: [
        t('nutrition.weeklyMenuOption2.season.preMatch.dinnerProtocol')
      ]
    }
  ]
});

export const getReferenceData = (t) => ({
  quantities_gr: {
    carbohydrates: [
      { name: t('nutrition.foods.pasta'), lunch: 60, dinner: 0 },
      { name: t('nutrition.foods.potato'), lunch: 240, dinner: 120 },
      { name: t('nutrition.foods.riceQuinoa'), lunch: 60, dinner: 0 },
      { name: t('nutrition.foods.gnocchi'), lunch: 150, dinner: 0 },
      { name: t('nutrition.foods.legumes'), lunch: 60, dinner: 0, note: t('nutrition.foods.legumesNote') }
    ],
    proteins: [
      { name: t('nutrition.foods.blueFish'), lunch: 140, dinner: 140 },
      { name: t('nutrition.foods.whiteFish'), lunch: 160, dinner: 160 },
      { name: t('nutrition.foods.whiteMeat'), lunch: 160, dinner: 160 },
      { name: t('nutrition.foods.redMeat'), lunch: 140, dinner: 140 },
      { name: t('nutrition.foods.eggs'), lunch: 3, dinner: 3, unit: t('nutrition.foods.units') }
    ]
  },
  supplements: [
    {
      name: t('nutrition.supplements.omega3'),
      description: t('nutrition.supplements.omega3Desc'),
      icon: "medical-services"
    },
    {
      name: t('nutrition.supplements.creatine'),
      description: t('nutrition.supplements.creatineDesc'),
      icon: "fitness-center"
    },
    {
      name: t('nutrition.supplements.magnesium'),
      description: t('nutrition.supplements.magnesiumDesc'),
      icon: "nights-stay"
    }
  ],
  match_day_protocol: {
    steps: [
      {
        time: t('nutrition.protocol.previousDinner'),
        icon: "nights-stay",
        color: "#6366f1",
        description: t('nutrition.protocol.previousDinnerDesc')
      },
      {
        time: t('nutrition.protocol.breakfast'),
        icon: "wb-sunny",
        color: "#f59e0b",
        description: t('nutrition.protocol.breakfastDesc')
      },
      {
        time: t('nutrition.protocol.preMatchMeal'),
        icon: "restaurant",
        color: "#10b981",
        description: t('nutrition.protocol.preMatchMealDesc')
      },
      {
        time: t('nutrition.protocol.warmup'),
        icon: "directions-run",
        color: "#ef4444",
        description: t('nutrition.protocol.warmupDesc')
      },
      {
        time: t('nutrition.protocol.duringMatch'),
        icon: "sports-soccer",
        color: "#3b82f6",
        description: t('nutrition.protocol.duringMatchDesc')
      },
      {
        time: t('nutrition.protocol.postMatch'),
        icon: "celebration",
        color: "#8b5cf6",
        description: t('nutrition.protocol.postMatchDesc')
      }
    ]
  },
  hydration_tips: [
    t('nutrition.hydrationTips.tip1'),
    t('nutrition.hydrationTips.tip2'),
    t('nutrition.hydrationTips.tip3'),
    t('nutrition.hydrationTips.tip4'),
    t('nutrition.hydrationTips.tip5')
  ]
});

export const MEAL_ICONS = {
  breakfast: "free-breakfast",
  mid_morning: "coffee",
  lunch: "restaurant",
  snacks: "fastfood",
  dinner: "dinner-dining"
};

export const MEAL_COLORS = {
  breakfast: "#f59e0b",
  mid_morning: "#8b5cf6",
  lunch: "#10b981",
  snacks: "#3b82f6",
  dinner: "#6366f1"
};

// Función para obtener estructura vacía del plan (para crear desde cero)
export const getEmptyPlanStructure = (t, userId) => ({
  user: userId,
  name: t('nutrition.titles.myNutritionalPlan'),
  isCustom: true,
  preseason: {
    title: t('nutrition.titles.myPreseason'),
    meals: { 
      breakfast: [{ type: '', items: [''] }],
      mid_morning: [{ condition: '', options: [''] }],
      snacks: [{ condition: '', options: [''] }]
    },
    weekly_menu: [
      { day: t('nutrition.days.monday'), tag: t('nutrition.tags.training'), lunch: '', dinner: '' },
      { day: t('nutrition.days.tuesday'), tag: t('nutrition.tags.training'), lunch: '', dinner: '' },
      { day: t('nutrition.days.wednesday'), tag: t('nutrition.tags.training'), lunch: '', dinner: '' },
      { day: t('nutrition.days.thursday'), tag: t('nutrition.tags.training'), lunch: '', dinner: '' },
      { day: t('nutrition.days.friday'), tag: t('nutrition.tags.training'), lunch: '', dinner: '' },
      { day: t('nutrition.days.saturday'), tag: t('nutrition.tags.rest'), lunch: '', dinner: '' },
      { day: t('nutrition.days.sunday'), tag: t('nutrition.tags.rest'), lunch: '', dinner: '' },
    ]
  },
  season: {
    title: t('nutrition.titles.mySeason'),
    meals: { 
      breakfast: [{ type: '', items: [''] }],
      mid_morning: [{ condition: '', options: [''] }],
      snacks: [{ condition: '', options: [''] }]
    },
    menu_options: [
      { context: t('nutrition.contexts.trainingDay'), icon: 'fitness-center', color: '#10b981', lunches: [''], dinners: [''] },
      { context: t('nutrition.contexts.freeDay'), icon: 'weekend', color: '#6366f1', lunches: [''], dinners: [''] },
      { context: t('nutrition.contexts.preMatch'), icon: 'sports-soccer', color: '#f59e0b', lunches: [''], dinners: [''] },
    ]
  },
  reference: {
    quantities_gr: { 
      carbohydrates: [{ name: '', lunch: 0, dinner: 0 }],
      proteins: [{ name: '', lunch: 0, dinner: 0 }]
    },
    supplements: [{ name: '', description: '', icon: 'medication' }],
    match_day_protocol: { 
      steps: [{ time: '', icon: 'schedule', color: '#6366f1', description: '' }]
    },
    hydration_tips: ['']
  }
});
