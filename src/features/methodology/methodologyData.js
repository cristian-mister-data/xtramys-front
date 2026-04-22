// Datos predeterminados de metodología por categorías
// Basado en planificación de entrenamientos profesional v4.0

// Función para obtener los datos de metodología traducidos
export const getDefaultMethodologyData = (t) => ({
  metadata: {
    version: "4.0",
    description: t('methodology.data.description'),
    source_file: "Planes de Entrenamiento.pdf"
  },
  categories: {
    fundamentos: {
      id: "fundamentos",
      name: t('methodology.categoryNames.fundamentos'),
      plans: {
        "2_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.individualDevelopment'),
            objective: t('methodology.data.objectives.techniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.smallSpaces'),
            game_situation: "1x0 - 2x2",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession')], constraint: t('methodology.data.constraints.minTwoTasks') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.groupDevelopment'),
            objective: t('methodology.data.objectives.techniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.smallLargeSpaces'),
            game_situation: "1x1 - 4x4",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          }
        ]
      }
    },
    benjamines: {
      id: "benjamines",
      name: t('methodology.categoryNames.benjamines'),
      plans: {
        "3_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.individualDevelopment'),
            objective: t('methodology.data.objectives.technique'),
            dimensions: t('methodology.data.dimensions.smallSpaces'),
            game_situation: "1x0 - 3x3",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.groupDevelopment'),
            objective: t('methodology.data.objectives.relationalTechniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.mediumLargeSpaces'),
            game_situation: "3x3 - 5x5",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 3,
            orientation: t('methodology.data.orientations.individualGroupDevelopment'),
            objective: t('methodology.data.objectives.techniqueRelationalTechnique'),
            dimensions: t('methodology.data.dimensions.largeSpaces'),
            game_situation: "1x0 - 5x5",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          }
        ],
        "4_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.individualDevelopment'),
            objective: t('methodology.data.objectives.technique'),
            dimensions: t('methodology.data.dimensions.smallSpaces'),
            game_situation: "1x0 - 3x3",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.rondo')], constraint: t('methodology.data.constraints.optionalNoRestriction') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.groupDevelopment'),
            objective: t('methodology.data.objectives.workshops'),
            dimensions: t('methodology.data.dimensions.variableCurriculum'),
            game_situation: t('methodology.data.gameSituations.assessCurriculum'),
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 3,
            orientation: t('methodology.data.orientations.groupDevelopment'),
            objective: t('methodology.data.objectives.relationalTechniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.mediumLargeSpaces'),
            game_situation: "3x3 - 5x5",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 4,
            orientation: t('methodology.data.orientations.individualGroupDevelopmentAlt'),
            objective: t('methodology.data.objectives.techniqueRelationalTechnique'),
            dimensions: t('methodology.data.dimensions.largeSpaces'),
            game_situation: "1x0 - 5x5",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          }
        ]
      }
    },
    alevines: {
      id: "alevines",
      name: t('methodology.categoryNames.alevines'),
      plans: {
        "3_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.individualDevelopment'),
            objective: t('methodology.data.objectives.technique'),
            dimensions: t('methodology.data.dimensions.smallSpaces'),
            game_situation: "1x0 - 3x3",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.groupDevelopment'),
            objective: t('methodology.data.objectives.relationalTechniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.mediumLargeSpaces'),
            game_situation: "3x3 - 5x5",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 3,
            orientation: t('methodology.data.orientations.collectiveDevelopment'),
            objective: t('methodology.data.objectives.individualCollectiveTactics'),
            dimensions: t('methodology.data.dimensions.largeSpaces'),
            game_situation: "5x5 - 7x7",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          }
        ],
        "4_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.individualDevelopment'),
            objective: t('methodology.data.objectives.technique'),
            dimensions: t('methodology.data.dimensions.smallSpaces'),
            game_situation: "1x0 - 3x3",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.rondo')], constraint: t('methodology.data.constraints.optional') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.groupDevelopment'),
            objective: t('methodology.data.objectives.workshops'),
            dimensions: t('methodology.data.dimensions.variableCurriculum'),
            game_situation: t('methodology.data.gameSituations.assessCurriculum'),
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 3,
            orientation: t('methodology.data.orientations.groupDevelopment'),
            objective: t('methodology.data.objectives.relationalTechniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.mediumLargeSpaces'),
            game_situation: "3x3 - 5x5",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 4,
            orientation: t('methodology.data.orientations.collectiveDevelopment'),
            objective: t('methodology.data.objectives.individualCollectiveTactics'),
            dimensions: t('methodology.data.dimensions.largeSpaces'),
            game_situation: "5x5 - 7x7",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          }
        ]
      }
    },
    infantiles: {
      id: "infantiles",
      name: t('methodology.categoryNames.infantiles'),
      plans: {
        "3_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.individualDevelopment'),
            objective: t('methodology.data.objectives.techniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.smallSpaces'),
            game_situation: "1x0 - 4x4",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc'), t('methodology.data.taskTypes.rondo')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.optional') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.groupDevelopment'),
            objective: t('methodology.data.objectives.individualTacticsCollective'),
            dimensions: t('methodology.data.dimensions.mediumLargeSpaces'),
            game_situation: "3x3 - 6x6",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 3,
            orientation: t('methodology.data.orientations.collectiveDevelopment'),
            objective: t('methodology.data.objectives.collectiveIndividualTactics'),
            dimensions: t('methodology.data.dimensions.largeSpaces'),
            game_situation: "6x6 - 9x9",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          }
        ],
        "4_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.individualDevelopment'),
            objective: t('methodology.data.objectives.techniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.smallSpaces'),
            game_situation: "1x0 - 4x4",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc'), t('methodology.data.taskTypes.rondo')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.optional') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.groupDevelopment'),
            objective: t('methodology.data.objectives.workshops'),
            dimensions: t('methodology.data.dimensions.variableCurriculum'),
            game_situation: t('methodology.data.gameSituations.assessCurriculum'),
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 3,
            orientation: t('methodology.data.orientations.groupDevelopment'),
            objective: t('methodology.data.objectives.individualTacticsCollective'),
            dimensions: t('methodology.data.dimensions.mediumLargeSpaces'),
            game_situation: "3x3 - 6x6",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 4,
            orientation: t('methodology.data.orientations.collectiveDevelopment'),
            objective: t('methodology.data.objectives.collectiveIndividualTactics'),
            dimensions: t('methodology.data.dimensions.largeSpaces'),
            game_situation: "6x6 - 9x9",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          }
        ]
      }
    },
    cadetes: {
      id: "cadetes",
      name: t('methodology.categoryNames.cadetes'),
      plans: {
        "3_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.individualGroupDevelopmentHyphen'),
            objective: t('methodology.data.objectives.techniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.smallMediumSpaces'),
            game_situation: "2x2 - 5x5",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc'), t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.groupCollectiveDevelopment'),
            objective: t('methodology.data.objectives.individualCollectiveTactics'),
            dimensions: t('methodology.data.dimensions.mediumLargeSpaces'),
            game_situation: "4x4 - 9x9",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 3,
            orientation: t('methodology.data.orientations.matchPreparation'),
            objective: t('methodology.data.objectives.collectiveIndividualTactics'),
            dimensions: t('methodology.data.dimensions.largeSpaces'),
            game_situation: "8x8 - 11x11",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.system'), t('methodology.data.taskTypes.rondo')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          }
        ],
        "4_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.individualGroupDevelopmentHyphen'),
            objective: t('methodology.data.objectives.techniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.smallMediumSpaces'),
            game_situation: "2x2 - 5x5",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc'), t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.collectiveDevelopment'),
            objective: t('methodology.data.objectives.individualTacticsCollective'),
            dimensions: t('methodology.data.dimensions.smallSpaces'),
            game_situation: "6x6 - 9x9",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 3,
            orientation: t('methodology.data.orientations.matchPreparation'),
            objective: t('methodology.data.objectives.collectiveIndividualTactics'),
            dimensions: t('methodology.data.dimensions.largeSpaces'),
            game_situation: "8x8 - 11x11",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 4,
            orientation: t('methodology.data.orientations.groupCollectiveDevelopment'),
            objective: t('methodology.data.objectives.individualTacticsCollective'),
            dimensions: t('methodology.data.dimensions.mediumLargeSpaces'),
            game_situation: "4x4 - 9x9",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          }
        ],
        "5_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.individualGroupDevelopmentHyphen'),
            objective: t('methodology.data.objectives.techniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.smallMediumSpaces'),
            game_situation: "2x2 - 5x5",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc'), t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.collectiveDevelopment'),
            objective: t('methodology.data.objectives.collectiveIndividualTactics'),
            dimensions: t('methodology.data.dimensions.smallSpaces'),
            game_situation: "6x6 - 9x9",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 3,
            orientation: t('methodology.data.orientations.matchPreparation'),
            objective: t('methodology.data.objectives.individualTacticsCollective'),
            dimensions: t('methodology.data.dimensions.largeSpaces'),
            game_situation: "8x8 - 11x11",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.system'), t('methodology.data.taskTypes.rondo')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 4,
            orientation: t('methodology.data.orientations.groupCollectiveDevelopment'),
            objective: t('methodology.data.objectives.individualTacticsCollective'),
            dimensions: t('methodology.data.dimensions.mediumLargeSpaces'),
            game_situation: "4x4 - 9x9",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing'), t('methodology.data.taskTypes.positionalFinishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 5,
            orientation: t('methodology.data.orientations.individualDevelopment'),
            objective: t('methodology.data.objectives.preventiveStabilityMobility'),
            dimensions: t('methodology.data.dimensions.variableActivation'),
            game_situation: t('methodology.data.gameSituations.activation'),
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.preventive'), t('methodology.data.taskTypes.stability'), t('methodology.data.taskTypes.mobility')], constraint: t('methodology.data.constraints.mainTask') },
                { tasks: [t('methodology.data.taskTypes.rondo')], constraint: t('methodology.data.constraints.optional') }
              ]
            }
          }
        ]
      }
    },
    juveniles: {
      id: "juveniles",
      name: t('methodology.categoryNames.juveniles'),
      plans: {
        "3_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.specificStrengthIndividual'),
            objective: t('methodology.data.objectives.techniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.smallSpaces'),
            game_situation: "2x2 - 5x5",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.rondo'), t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.specificEnduranceCollective'),
            objective: t('methodology.data.objectives.collectiveTactics'),
            dimensions: t('methodology.data.dimensions.mediumSpaces'),
            game_situation: "6x6 - 9x9",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession'), t('methodology.data.taskTypes.positionGame')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.atc')], constraint: t('methodology.data.constraints.asDoubleTask') },
                { tasks: [t('methodology.data.taskTypes.modifiedMatch'), t('methodology.data.taskTypes.realGame'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 3,
            orientation: t('methodology.data.orientations.speedCompetition'),
            objective: t('methodology.data.objectives.matchPreparation'),
            dimensions: t('methodology.data.dimensions.largeSpaces'),
            game_situation: "8x8 - 11x11",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.system'), t('methodology.data.taskTypes.rondo')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.realMatch'), t('methodology.data.taskTypes.combinedActions')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          }
        ],
        "4_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.mixedRecovery'),
            objective: t('methodology.data.objectives.techniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.smallMediumSpaces'),
            game_situation: "2x2 - 5x5",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical'), t('methodology.data.taskTypes.rondo')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.acquisitionStrength'),
            objective: t('methodology.data.objectives.individualCollectiveTactics'),
            dimensions: t('methodology.data.dimensions.smallSpaces'),
            game_situation: "6x6 - 9x9",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 3,
            orientation: t('methodology.data.orientations.transferEndurance'),
            objective: t('methodology.data.objectives.collectiveTactics'),
            dimensions: t('methodology.data.dimensions.largeSpaces'),
            game_situation: "8x8 - 11x11",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.system')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 4,
            orientation: t('methodology.data.orientations.activationSpeed'),
            objective: t('methodology.data.objectives.individualCollectiveTactics'),
            dimensions: t('methodology.data.dimensions.mediumLargeSpaces'),
            game_situation: "4x4 - 9x9",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.system'), t('methodology.data.taskTypes.speed')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.match')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          }
        ],
        "5_days_week": [
          {
            day_number: 1,
            orientation: t('methodology.data.orientations.mixed'),
            objective: t('methodology.data.objectives.techniqueIndividualTactics'),
            dimensions: t('methodology.data.dimensions.smallMediumSpaces'),
            game_situation: "2x2 - 5x5",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.analytical')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 2,
            orientation: t('methodology.data.orientations.strength'),
            objective: t('methodology.data.objectives.collectiveIndividualTactics'),
            dimensions: t('methodology.data.dimensions.smallSpaces'),
            game_situation: "6x6 - 9x9",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.possession')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 3,
            orientation: t('methodology.data.orientations.endurance'),
            objective: t('methodology.data.objectives.individualTacticsCollective'),
            dimensions: t('methodology.data.dimensions.largeSpaces'),
            game_situation: "8x8 - 11x11",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.system')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 4,
            orientation: t('methodology.data.orientations.speed'),
            objective: t('methodology.data.objectives.individualTacticsCollective'),
            dimensions: t('methodology.data.dimensions.mediumLargeSpaces'),
            game_situation: "4x4 - 9x9",
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.system')], constraint: t('methodology.data.constraints.maxOneTask') },
                { tasks: [t('methodology.data.taskTypes.match'), t('methodology.data.taskTypes.finishing')], constraint: t('methodology.data.constraints.minTwoTasks') }
              ]
            }
          },
          {
            day_number: 5,
            orientation: t('methodology.data.orientations.activation'),
            objective: t('methodology.data.objectives.preventiveStability'),
            dimensions: t('methodology.data.dimensions.variableActivation'),
            game_situation: t('methodology.data.gameSituations.activation'),
            main_part: {
              instruction: t('methodology.data.instructions.choose2Tasks'),
              options: [
                { tasks: [t('methodology.data.taskTypes.preventive')], constraint: t('methodology.data.constraints.main') },
                { tasks: [t('methodology.data.taskTypes.rondo')], constraint: t('methodology.data.constraints.optional') }
              ]
            }
          }
        ]
      }
    }
  }
});

// Fallback para español (usado cuando no hay función t disponible)
const spanishFallback = (key) => {
  const fallbacks = {
    'methodology.data.description': 'Planificación completa con estructura detallada de Parte Principal y reglas de selección',
    'methodology.categoryNames.fundamentos': 'Fundamentos (Escuela)',
    'methodology.categoryNames.benjamines': 'Talentos Benjamines',
    'methodology.categoryNames.alevines': 'Talentos Alevines',
    'methodology.categoryNames.infantiles': 'Formación Infantiles',
    'methodology.categoryNames.cadetes': 'Formación Cadetes',
    'methodology.categoryNames.juveniles': 'Formación Juveniles (Alto Rendimiento)',
    'methodology.data.orientations.individualDevelopment': 'Desarrollo Individual',
    'methodology.data.orientations.groupDevelopment': 'Desarrollo Grupal',
    'methodology.data.orientations.collectiveDevelopment': 'Desarrollo Colectivo',
    'methodology.data.orientations.individualGroupDevelopment': 'Desarrollo Individual/Grupal',
    'methodology.data.orientations.individualGroupDevelopmentAlt': 'Desarrollo Indiv/Grupal',
    'methodology.data.orientations.groupCollectiveDevelopment': 'Desarrollo Grupal-Colectivo',
    'methodology.data.orientations.individualGroupDevelopmentHyphen': 'Desarrollo Individual-Grupal',
    'methodology.data.orientations.matchPreparation': 'Preparación de Partido',
    'methodology.data.orientations.specificStrengthIndividual': 'Fuerza Específica / Individual',
    'methodology.data.orientations.specificEnduranceCollective': 'Resistencia Específica / Colectiva',
    'methodology.data.orientations.speedCompetition': 'Velocidad / Competición',
    'methodology.data.orientations.mixedRecovery': 'Mixta / Recuperación',
    'methodology.data.orientations.acquisitionStrength': 'Adquisición (Fuerza)',
    'methodology.data.orientations.transferEndurance': 'Transferencia (Resistencia)',
    'methodology.data.orientations.activationSpeed': 'Activación (Velocidad)',
    'methodology.data.orientations.mixed': 'Mixta',
    'methodology.data.orientations.strength': 'Fuerza',
    'methodology.data.orientations.endurance': 'Resistencia',
    'methodology.data.orientations.speed': 'Velocidad',
    'methodology.data.orientations.activation': 'Activación',
    'methodology.data.objectives.technique': 'Técnica',
    'methodology.data.objectives.techniqueIndividualTactics': 'Técnica / Táctica Individual',
    'methodology.data.objectives.relationalTechniqueIndividualTactics': 'Técnica Relacional / Táctica Individual',
    'methodology.data.objectives.individualCollectiveTactics': 'Táctica Individual / Colectiva',
    'methodology.data.objectives.collectiveIndividualTactics': 'Táctica Colectiva / Táctica Individual',
    'methodology.data.objectives.individualTacticsCollective': 'Táctica Individual / Táctica Colectiva',
    'methodology.data.objectives.workshops': 'Talleres',
    'methodology.data.objectives.preventiveStabilityMobility': 'Preventivo / Estabilidad / Movilidad',
    'methodology.data.objectives.matchPreparation': 'Preparación de Partido',
    'methodology.data.objectives.collectiveTactics': 'Táctica Colectiva',
    'methodology.data.objectives.preventiveStability': 'Preventivo / Estabilidad',
    'methodology.data.objectives.techniqueRelationalTechnique': 'Técnica / Técnica Relacional',
    'methodology.data.dimensions.smallSpaces': 'Espacios reducidos',
    'methodology.data.dimensions.mediumSpaces': 'Espacios medios',
    'methodology.data.dimensions.largeSpaces': 'Espacios amplios',
    'methodology.data.dimensions.smallLargeSpaces': 'Espacios reducidos-amplios',
    'methodology.data.dimensions.mediumLargeSpaces': 'Espacios medios-amplios',
    'methodology.data.dimensions.smallMediumSpaces': 'Espacios reducidos-medios',
    'methodology.data.dimensions.variableCurriculum': 'Variable / Valorar Currículum',
    'methodology.data.dimensions.variableActivation': 'Variable / Activación',
    'methodology.data.gameSituations.assessCurriculum': 'Valorar Currículum',
    'methodology.data.gameSituations.activation': 'Activación',
    'methodology.data.instructions.choose2Tasks': 'ELIGE 2 DE LAS SIGUIENTES TAREAS',
    'methodology.data.constraints.maxOneTask': 'Diseña como máximo 1 tarea de esa tipología',
    'methodology.data.constraints.minTwoTasks': 'Diseña mínimo 2 tareas de esa tipología',
    'methodology.data.constraints.asDoubleTask': 'Como tarea doblada de las anteriores',
    'methodology.data.constraints.optionalNoRestriction': 'Opcional / Sin restricción explícita',
    'methodology.data.constraints.optional': 'Opcional',
    'methodology.data.constraints.main': 'Principal',
    'methodology.data.constraints.mainTask': 'Tarea principal',
    'methodology.data.taskTypes.analytical': 'ANALÍTICO',
    'methodology.data.taskTypes.atc': 'ATC',
    'methodology.data.taskTypes.rondo': 'RONDO',
    'methodology.data.taskTypes.possession': 'CONSERVACIÓN',
    'methodology.data.taskTypes.positionGame': 'JUEGO DE POSICIÓN',
    'methodology.data.taskTypes.match': 'PARTIDO',
    'methodology.data.taskTypes.finishing': 'FINALIZACIÓN',
    'methodology.data.taskTypes.modifiedMatch': 'PARTIDO MODIFICADO',
    'methodology.data.taskTypes.positionalFinishing': 'FINALIZACIÓN POSICIONAL',
    'methodology.data.taskTypes.system': 'SISTEMA',
    'methodology.data.taskTypes.realGame': 'JUEGO REAL',
    'methodology.data.taskTypes.realMatch': 'PARTIDO REAL',
    'methodology.data.taskTypes.combinedActions': 'ACCIONES COMBINADAS',
    'methodology.data.taskTypes.preventive': 'PREVENTIVO',
    'methodology.data.taskTypes.stability': 'ESTABILIDAD',
    'methodology.data.taskTypes.mobility': 'MOVILIDAD',
    'methodology.data.taskTypes.speed': 'VELOCIDAD'
  };
  return fallbacks[key] || key;
};

// Mantener constante para compatibilidad (fallback en español)
export const DEFAULT_METHODOLOGY_DATA = getDefaultMethodologyData(spanishFallback);

// Colores por categoría
export const CATEGORY_COLORS = {
  fundamentos: {
    primary: '#4CAF50',
    secondary: '#81C784',
    gradient: ['#4CAF50', '#81C784']
  },
  benjamines: {
    primary: '#2196F3',
    secondary: '#64B5F6',
    gradient: ['#2196F3', '#64B5F6']
  },
  alevines: {
    primary: '#9C27B0',
    secondary: '#BA68C8',
    gradient: ['#9C27B0', '#BA68C8']
  },
  infantiles: {
    primary: '#FF9800',
    secondary: '#FFB74D',
    gradient: ['#FF9800', '#FFB74D']
  },
  cadetes: {
    primary: '#F44336',
    secondary: '#E57373',
    gradient: ['#F44336', '#E57373']
  },
  juveniles: {
    primary: '#607D8B',
    secondary: '#90A4AE',
    gradient: ['#607D8B', '#90A4AE']
  }
};

// Iconos por categoría
export const CATEGORY_ICONS = {
  fundamentos: 'child-care',
  benjamines: 'directions-run',
  alevines: 'sports-soccer',
  infantiles: 'emoji-events',
  cadetes: 'fitness-center',
  juveniles: 'star'
};

// Función para obtener el label de días por semana
export const getDaysLabel = (planKey, t) => {
  const match = planKey.match(/(\d+)_days_week/);
  if (match) {
    if (t) {
      return t('methodology.daysPerWeek', { count: parseInt(match[1]) });
    }
    return `${match[1]} días/semana`;
  }
  return planKey;
};

// Orden de categorías
export const CATEGORY_ORDER = ['fundamentos', 'benjamines', 'alevines', 'infantiles', 'cadetes', 'juveniles'];
