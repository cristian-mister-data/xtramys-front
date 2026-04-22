// Injury Prevention Protocols Data
// All protocols with translations for Spanish and English

export const INJURY_PREVENTION_PROTOCOLS = [
  {
    id: "itbs_protocol",
    title: {
      es: "Síndrome de la Banda Iliotibial (SFBI)",
      en: "Iliotibial Band Syndrome (ITBS)"
    },
    icon: "accessibility-new",
    color: "#6366f1",
    introduction: {
      title: {
        es: "Factores de Riesgo y Objetivos",
        en: "Risk Factors and Objectives"
      },
      risk_factors: [
        {
          es: "Debilidad del glúteo medio como estabilizador pélvico en apoyo monopodal.",
          en: "Gluteus medius weakness as a pelvic stabilizer in single-leg stance."
        },
        {
          es: "Aumento de aducción y rotación interna de cadera durante la fase de apoyo.",
          en: "Increased hip adduction and internal rotation during the stance phase."
        },
        {
          es: "Pronación excesiva del pie con rotación tibial asociada.",
          en: "Excessive foot pronation with associated tibial rotation."
        },
        {
          es: "Incrementos bruscos del volumen de carrera y baja variabilidad de entrenamiento.",
          en: "Sudden increases in running volume and low training variability."
        }
      ],
      objectives: [
        {
          es: "Incrementar la fuerza y resistencia del glúteo medio.",
          en: "Increase gluteus medius strength and endurance."
        },
        {
          es: "Mejorar el control motor de la pelvis en tareas dinámicas.",
          en: "Improve pelvic motor control in dynamic tasks."
        },
        {
          es: "Gestionar la carga de entrenamiento para evitar picos.",
          en: "Manage training load to avoid spikes."
        },
        {
          es: "Introducir variabilidad en superficie, velocidad y volumen.",
          en: "Introduce variability in surface, speed, and volume."
        }
      ]
    },
    sections: [
      {
        section_id: "block_1",
        title: {
          es: "BLOQUE 1 — Fortalecimiento del Glúteo Medio",
          en: "BLOCK 1 — Gluteus Medius Strengthening"
        },
        exercises: [
          {
            name: {
              es: "Abducción de cadera en decúbito lateral",
              en: "Side-lying Hip Abduction"
            },
            setup: {
              es: "Acostado de lado, pelvis neutra.",
              en: "Lying on side, neutral pelvis."
            },
            execution: {
              es: "Elevar la pierna superior manteniéndola extendida.",
              en: "Lift the top leg while keeping it extended."
            },
            dosage: {
              es: "3–4×/semana, 3×15–20 repeticiones por lado.",
              en: "3–4×/week, 3×15–20 reps per side."
            },
            tips: {
              es: "Evitar rotación pélvica, punta del pie ligeramente hacia abajo.",
              en: "Avoid pelvic rotation, toe pointing slightly downwards."
            }
          },
          {
            name: {
              es: "Clamshell con banda",
              en: "Banded Clamshell"
            },
            setup: {
              es: "Decúbito lateral, rodillas flexionadas, pies juntos.",
              en: "Side-lying, knees bent, feet together."
            },
            execution: {
              es: "Separar rodillas manteniendo pelvis estable.",
              en: "Separate knees while maintaining a stable pelvis."
            },
            dosage: {
              es: "3–4×/semana, 3×20–25 repeticiones por lado.",
              en: "3–4×/week, 3×20–25 reps per side."
            },
            tips: {
              es: "No rotar la pelvis, banda ligera–moderada.",
              en: "Do not rotate the pelvis, light-moderate band."
            }
          },
          {
            name: {
              es: "Puente a una pierna",
              en: "Single Leg Bridge"
            },
            setup: {
              es: "Decúbito supino, un pie apoyado.",
              en: "Supine position, one foot on the ground."
            },
            execution: {
              es: "Elevar cadera manteniendo pelvis nivelada.",
              en: "Lift hips while keeping pelvis level."
            },
            dosage: {
              es: "3×/semana, 3×12–15 repeticiones por lado.",
              en: "3×/week, 3×12–15 reps per side."
            },
            tips: {
              es: "Activar glúteo de la pierna de apoyo.",
              en: "Activate the glute of the supporting leg."
            }
          }
        ]
      },
      {
        section_id: "block_2",
        title: {
          es: "BLOQUE 2 — Control Motor Pélvico en Carga",
          en: "BLOCK 2 — Weight-bearing Pelvic Motor Control"
        },
        exercises: [
          {
            name: {
              es: "Sentadilla a una pierna asistida",
              en: "Assisted Single Leg Squat"
            },
            setup: {
              es: "Apoyo monopodal con soporte ligero.",
              en: "Single-leg stance with light support."
            },
            execution: {
              es: "Flexionar cadera y rodilla manteniendo pelvis estable.",
              en: "Flex hip and knee while maintaining a stable pelvis."
            },
            dosage: {
              es: "2–3×/semana, 3×8–10 repeticiones por lado.",
              en: "2–3×/week, 3×8–10 reps per side."
            },
            tips: {
              es: "Evitar valgo de rodilla y caída pélvica.",
              en: "Avoid knee valgus and pelvic drop."
            }
          },
          {
            name: {
              es: "Hip Hike en step",
              en: "Hip Hike on step"
            },
            setup: {
              es: "De pie sobre un escalón con una pierna.",
              en: "Standing on a step with one leg."
            },
            execution: {
              es: "Bajar y subir la pelvis usando el glúteo medio.",
              en: "Lower and raise the pelvis using the gluteus medius."
            },
            dosage: {
              es: "3–4×/semana, 3×15 repeticiones por lado.",
              en: "3–4×/week, 3×15 reps per side."
            },
            tips: {
              es: "Movimiento controlado, sin impulso.",
              en: "Controlled movement, no momentum."
            }
          }
        ]
      }
    ]
  },
  {
    id: "achilles_protocol",
    title: {
      es: "Tendinopatía Aquílea",
      en: "Achilles Tendinopathy"
    },
    icon: "directions-run",
    color: "#ec4899",
    introduction: {
      title: {
        es: "Fundamentación y Objetivos",
        en: "Foundation and Objectives"
      },
      risk_factors: [
        {
          es: "Trastorno degenerativo no inflamatorio (Cook & Purdam).",
          en: "Non-inflammatory degenerative disorder (Cook & Purdam)."
        },
        {
          es: "El principal factor de riesgo es la carga excesiva y mal dosificada.",
          en: "The main risk factor is excessive and poorly dosed load."
        },
        {
          es: "El sóleo es el principal modulador de carga del tendón de Aquiles.",
          en: "The soleus is the main load modulator of the Achilles tendon."
        },
        {
          es: "Limitación de dorsiflexión de tobillo aumenta el estrés tendinoso.",
          en: "Limited ankle dorsiflexion increases tendon stress."
        }
      ],
      objectives: [
        {
          es: "Incrementar la capacidad de carga del tendón.",
          en: "Increase tendon load capacity."
        },
        {
          es: "Fortalecer específicamente el músculo sóleo.",
          en: "Specifically strengthen the soleus muscle."
        },
        {
          es: "Mejorar o mantener la dorsiflexión de tobillo.",
          en: "Improve or maintain ankle dorsiflexion."
        },
        {
          es: "Educar al jugador en la autogestión de la carga.",
          en: "Educate the player on load self-management."
        }
      ]
    },
    sections: [
      {
        section_id: "exercises",
        title: {
          es: "Ejercicios Principales",
          en: "Main Exercises"
        },
        exercises: [
          {
            name: {
              es: "Fortalecimiento Excéntrico de Sóleo",
              en: "Eccentric Soleus Strengthening"
            },
            setup: {
              es: "Sentado, rodillas a 90°, carga sobre muslos (Elevación de talón).",
              en: "Seated, knees at 90°, load on thighs (Heel raise)."
            },
            execution: {
              es: "Subida controlada, bajada lenta (≈3 s).",
              en: "Controlled rise, slow descent (≈3 s)."
            },
            dosage: {
              es: "2–3×/semana, 3×12–15 repeticiones.",
              en: "2–3×/week, 3×12–15 reps."
            },
            tips: {
              es: "Rodilla fija a 90°, rango completo, sin dolor agudo.",
              en: "Knee fixed at 90°, full range, no acute pain."
            }
          },
          {
            name: {
              es: "Fortalecimiento Excéntrico de Gemelo",
              en: "Eccentric Gastrocnemius Strengthening"
            },
            setup: {
              es: "Apoyo monopodal en step (de pie).",
              en: "Single-leg stance on step (standing)."
            },
            execution: {
              es: "Subida asistida, bajada lenta y controlada.",
              en: "Assisted rise, slow and controlled descent."
            },
            dosage: {
              es: "2×/semana, 3×10–12 repeticiones por pierna.",
              en: "2×/week, 3×10–12 reps per leg."
            },
            tips: {
              es: "Rodilla extendida, control excéntrico total.",
              en: "Knee extended, total eccentric control."
            }
          },
          {
            name: {
              es: "Movilidad de Tobillo (Dorsiflexión)",
              en: "Ankle Mobility (Dorsiflexion)"
            },
            setup: {
              es: "Movilización de tobillo con banda.",
              en: "Ankle mobilization with band."
            },
            execution: {
              es: "Sentadilla manteniendo talón apoyado.",
              en: "Squat movement keeping heel flat."
            },
            dosage: {
              es: "Diaria, 3×10–15 repeticiones.",
              en: "Daily, 3×10–15 reps."
            },
            tips: {
              es: "Rodilla sobrepasa punta del pie, mantener 2 s en el final del rango.",
              en: "Knee passes toe, hold 2s at end range."
            }
          }
        ]
      }
    ]
  },
  {
    id: "pubalgia_protocol",
    title: {
      es: "Pubalgia en Futbolistas",
      en: "Pubalgia / Groin Pain in Footballers"
    },
    icon: "sports-soccer",
    color: "#14b8a6",
    introduction: {
      title: {
        es: "Factores de Riesgo",
        en: "Risk Factors"
      },
      risk_factors: [
        {
          es: "Desequilibrio de fuerzas entre aductores y musculatura abdominal/glútea.",
          en: "Force imbalance between adductors and abdominal/gluteal muscles."
        },
        {
          es: "Déficit de fuerza de aducción o abdominal.",
          en: "Adduction or abdominal strength deficit."
        },
        {
          es: "Limitación de rotación interna de cadera.",
          en: "Hip internal rotation limitation."
        },
        {
          es: "Incrementos bruscos de carga (chut, cambios de dirección, sprint).",
          en: "Sudden load increases (shooting, change of direction, sprinting)."
        }
      ],
      objectives: []
    },
    sections: [
      {
        section_id: "pillar_1",
        title: {
          es: "PILAR 1 — Optimización de la Carga",
          en: "PILLAR 1 — Load Optimization"
        },
        exercises: [
          {
            name: {
              es: "Monitorización de Volumen",
              en: "Volume Monitoring"
            },
            setup: {
              es: "N/A",
              en: "N/A"
            },
            execution: {
              es: "Monitorizar volumen de chuts, cambios de dirección y sprints.",
              en: "Monitor volume of shooting, changes of direction, and sprints."
            },
            dosage: {
              es: "Evitar aumentos semanales > 10%.",
              en: "Avoid weekly increases > 10%."
            },
            tips: {
              es: "Individualizar la carga en jugadores con historial.",
              en: "Individualize load for players with history."
            }
          }
        ]
      },
      {
        section_id: "pillar_2",
        title: {
          es: "PILAR 2 — Fuerza Excéntrica y Estabilidad Pélvica",
          en: "PILLAR 2 — Eccentric Strength and Pelvic Stability"
        },
        exercises: [
          {
            name: {
              es: "Copenhagen Adduction",
              en: "Copenhagen Adduction"
            },
            setup: {
              es: "Plancha lateral con apoyo del muslo superior.",
              en: "Side plank with top thigh supported."
            },
            execution: {
              es: "Descenso excéntrico controlado del tronco.",
              en: "Controlled eccentric descent of the trunk."
            },
            dosage: {
              es: "3×5–8 repeticiones por lado.",
              en: "3×5–8 reps per side."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Plancha lateral con aducción isométrica",
              en: "Side Plank with Isometric Adduction"
            },
            setup: {
              es: "Plancha lateral apretando balón entre tobillos.",
              en: "Side plank squeezing ball between ankles."
            },
            execution: {
              es: "Co-activación aductores–oblicuos.",
              en: "Adductor-oblique co-activation."
            },
            dosage: {
              es: "3×30–45 s por lado.",
              en: "3×30–45 s per side."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Bowler Squat",
              en: "Bowler Squat"
            },
            setup: {
              es: "Sentadilla a una pierna con alcance contralateral.",
              en: "Single-leg squat with contralateral reach."
            },
            execution: {
              es: "Mantener pelvis estable durante el movimiento.",
              en: "Maintain stable pelvis during movement."
            },
            dosage: {
              es: "3×8–10 repeticiones por lado.",
              en: "3×8–10 reps per side."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "RDL Unilateral",
              en: "Single Leg RDL"
            },
            setup: {
              es: "Unilateral.",
              en: "Unilateral."
            },
            execution: {
              es: "Flexión de cadera controlada.",
              en: "Controlled hip flexion."
            },
            dosage: {
              es: "3×8 repeticiones por lado.",
              en: "3×8 reps per side."
            },
            tips: {
              es: "Estabilidad pélvica durante todo el movimiento.",
              en: "Pelvic stability throughout the movement."
            }
          }
        ]
      },
      {
        section_id: "pillar_3",
        title: {
          es: "PILAR 3 — Movilidad de Cadera",
          en: "PILLAR 3 — Hip Mobility"
        },
        exercises: [
          {
            name: {
              es: "Estiramiento 90/90 con inclinación anterior",
              en: "90/90 Stretch with anterior lean"
            },
            setup: {
              es: "Posición 90/90 en suelo.",
              en: "90/90 position on floor."
            },
            execution: {
              es: "Inclinarse hacia delante para mejorar rotación interna.",
              en: "Lean forward to improve internal rotation."
            },
            dosage: {
              es: "2–3×30–45 s por lado.",
              en: "2–3×30–45 s per side."
            },
            tips: {
              es: "Mejora de rotación interna de cadera.",
              en: "Hip internal rotation improvement."
            }
          }
        ]
      },
      {
        section_id: "pillar_4",
        title: {
          es: "PILAR 4 — Modificación Técnica",
          en: "PILLAR 4 — Technical Modification"
        },
        exercises: [
          {
            name: {
              es: "Drills de técnica",
              en: "Technical Drills"
            },
            setup: {
              es: "Campo.",
              en: "Field."
            },
            execution: {
              es: "Drills de chut a media intensidad.",
              en: "Shooting drills at medium intensity."
            },
            dosage: {
              es: "Volumen bajo.",
              en: "Low volume."
            },
            tips: {
              es: "Enfoque en estabilidad pélvica, core activo y énfasis técnico.",
              en: "Focus on pelvic stability, active core, and technical emphasis."
            }
          }
        ]
      }
    ]
  },
  {
    id: "shoulder_protocol",
    title: {
      es: "Luxaciones e Inestabilidad de Hombro",
      en: "Shoulder Dislocations and Instability"
    },
    icon: "fitness-center",
    color: "#f59e0b",
    introduction: {
      title: {
        es: "Mecanismos de Riesgo",
        en: "Risk Mechanisms"
      },
      risk_factors: [
        {
          es: "Caídas sobre el hombro o brazo extendido.",
          en: "Falls on the shoulder or outstretched arm."
        },
        {
          es: "Contacto directo en disputas aéreas (abducción + rotación externa).",
          en: "Direct contact in aerial duels (abduction + external rotation)."
        },
        {
          es: "Gestos explosivos de lanzamiento (porteros).",
          en: "Explosive throwing gestures (goalkeepers)."
        },
        {
          es: "Desequilibrio muscular (pectoral/dorsal > rotadores externos).",
          en: "Muscle imbalance (pectoral/latissimus > external rotators)."
        }
      ],
      objectives: []
    },
    sections: [
      {
        section_id: "pillar_1",
        title: {
          es: "PILAR 1 — Estabilización Escapular",
          en: "PILLAR 1 — Scapular Stabilization"
        },
        exercises: [
          {
            name: {
              es: "Retracción y elevación escapular en cuadrupedia",
              en: "Quadruped Scapular Retraction/Elevation"
            },
            setup: {
              es: "Cuadrupedia.",
              en: "Quadruped position."
            },
            execution: {
              es: "Control de escápulas sin encoger hombros.",
              en: "Scapular control without shrugging shoulders."
            },
            dosage: {
              es: "3×15 rep.",
              en: "3×15 reps."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Wall slides con retracción escapular",
              en: "Wall Slides with Scapular Retraction"
            },
            setup: {
              es: "De pie contra pared.",
              en: "Standing against wall."
            },
            execution: {
              es: "Deslizar brazos manteniendo escápulas hacia abajo y juntas.",
              en: "Slide arms keeping scapulae down and together."
            },
            dosage: {
              es: "3×12 rep.",
              en: "3×12 reps."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Protracción–retracción escapular en plancha alta",
              en: "High Plank Scapular Protraction/Retraction"
            },
            setup: {
              es: "Plancha alta.",
              en: "High plank."
            },
            execution: {
              es: "Movimiento controlado sin flexionar codos.",
              en: "Controlled movement without bending elbows."
            },
            dosage: {
              es: "3×10 rep.",
              en: "3×10 reps."
            },
            tips: {
              es: "",
              en: ""
            }
          }
        ]
      },
      {
        section_id: "pillar_2",
        title: {
          es: "PILAR 2 — Fuerza Excéntrica Rotadores Externos",
          en: "PILLAR 2 — Eccentric External Rotator Strength"
        },
        exercises: [
          {
            name: {
              es: "Rotación externa excéntrica con banda",
              en: "Eccentric Band External Rotation"
            },
            setup: {
              es: "Banda pesada.",
              en: "Heavy band."
            },
            execution: {
              es: "Concéntrico asistido y excéntrico lento (≈4 s).",
              en: "Assisted concentric and slow eccentric (≈4 s)."
            },
            dosage: {
              es: "4×10–12 rep por lado.",
              en: "4×10–12 reps per side."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Arm Bar con Kettlebell",
              en: "Kettlebell Arm Bar"
            },
            setup: {
              es: "Posición supina.",
              en: "Supine position."
            },
            execution: {
              es: "Mantener estabilidad escapular bajo carga ligera.",
              en: "Maintain scapular stability under light load."
            },
            dosage: {
              es: "3×30 s por lado.",
              en: "3×30 s per side."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Prone Y Extension",
              en: "Prone Y Extension"
            },
            setup: {
              es: "Prono (boca abajo).",
              en: "Prone (face down)."
            },
            execution: {
              es: "Fortalecimiento selectivo de infraespinoso y redondo menor.",
              en: "Selective strengthening of infraspinatus and teres minor."
            },
            dosage: {
              es: "3×12 rep.",
              en: "3×12 reps."
            },
            tips: {
              es: "",
              en: ""
            }
          }
        ]
      },
      {
        section_id: "pillar_3",
        title: {
          es: "PILAR 3 — Control Neuromuscular y Propiocepción",
          en: "PILLAR 3 — Neuromuscular Control & Proprioception"
        },
        exercises: [
          {
            name: {
              es: "Perturbaciones en cuadrupedia",
              en: "Quadruped Perturbations"
            },
            setup: {
              es: "Cuadrupedia.",
              en: "Quadruped."
            },
            execution: {
              es: "Compañero aplica empujes suaves e impredecibles.",
              en: "Partner applies gentle, unpredictable pushes."
            },
            dosage: {
              es: "3×30 s.",
              en: "3×30 s."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Plancha inestable",
              en: "Unstable Plank"
            },
            setup: {
              es: "Manos sobre balón medicinal o plato inestable.",
              en: "Hands on medicine ball or unstable plate."
            },
            execution: {
              es: "Progresar a apoyo unilateral.",
              en: "Progress to unilateral support."
            },
            dosage: {
              es: "3×20–30 s.",
              en: "3×20–30 s."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Lanzamientos de balón medicinal contra pared",
              en: "Wall Med Ball Throws"
            },
            setup: {
              es: "Desde rotación externa.",
              en: "From external rotation."
            },
            execution: {
              es: "Énfasis en frenado excéntrico.",
              en: "Emphasis on eccentric braking."
            },
            dosage: {
              es: "3×8 rep.",
              en: "3×8 reps."
            },
            tips: {
              es: "",
              en: ""
            }
          }
        ]
      },
      {
        section_id: "pillar_4",
        title: {
          es: "PILAR 4 — Fuerza Integrada de Core",
          en: "PILLAR 4 — Integrated Core Strength"
        },
        exercises: [
          {
            name: {
              es: "Pallof Press",
              en: "Pallof Press"
            },
            setup: {
              es: "De pie con banda/cable lateral.",
              en: "Standing with lateral band/cable."
            },
            execution: {
              es: "Anti-rotación, estabilidad frente a fuerzas laterales.",
              en: "Anti-rotation, stability against lateral forces."
            },
            dosage: {
              es: "3×10 rep por lado.",
              en: "3×10 reps per side."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Farmer's Walk Unilateral",
              en: "Unilateral Farmer's Walk"
            },
            setup: {
              es: "Carga asimétrica.",
              en: "Asymmetrical load."
            },
            execution: {
              es: "Estabilización escapular caminando.",
              en: "Scapular stabilization while walking."
            },
            dosage: {
              es: "3×20 m por lado.",
              en: "3×20 m per side."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Rotaciones con banda desde el core",
              en: "Core Band Rotations"
            },
            setup: {
              es: "De pie.",
              en: "Standing."
            },
            execution: {
              es: "Transferencia de fuerza cadera–tronco–hombro.",
              en: "Force transfer hip-trunk-shoulder."
            },
            dosage: {
              es: "3×12 rep por lado.",
              en: "3×12 reps per side."
            },
            tips: {
              es: "",
              en: ""
            }
          }
        ]
      },
      {
        section_id: "pillar_5",
        title: {
          es: "PILAR 5 — Técnica de Caída",
          en: "PILLAR 5 — Falling Technique"
        },
        exercises: [
          {
            name: {
              es: "Rodamiento de hombro",
              en: "Shoulder Roll"
            },
            setup: {
              es: "Sobre colchoneta.",
              en: "On mat."
            },
            execution: {
              es: "Caer rodando sobre hombro y dorsal, evitando apoyar brazo extendido.",
              en: "Fall rolling over shoulder and lat, avoiding outstretched arm."
            },
            dosage: {
              es: "2×5 rep por lado.",
              en: "2×5 reps per side."
            },
            tips: {
              es: "Integrar en calentamientos.",
              en: "Integrate into warm-ups."
            }
          }
        ]
      }
    ]
  },
  {
    id: "ankle_protocol",
    title: {
      es: "Lesiones de Tobillo",
      en: "Ankle Injuries"
    },
    icon: "directions-walk",
    color: "#8b5cf6",
    introduction: {
      title: {
        es: "Fases de Prevención",
        en: "Prevention Phases"
      },
      risk_factors: [],
      objectives: []
    },
    sections: [
      {
        section_id: "phase_1",
        title: {
          es: "FASE 1 — Activación y Movilidad (5–7 min)",
          en: "PHASE 1 — Activation & Mobility (5–7 min)"
        },
        exercises: [
          {
            name: {
              es: "Carrera suave multidireccional",
              en: "Multidirectional light jogging"
            },
            setup: {
              es: "Campo.",
              en: "Field."
            },
            execution: {
              es: "Carrera suave.",
              en: "Light jog."
            },
            dosage: {
              es: "2 minutos.",
              en: "2 minutes."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Movilidad activa de tobillo",
              en: "Active Ankle Mobility"
            },
            setup: {
              es: "De pie.",
              en: "Standing."
            },
            execution: {
              es: "Círculos por dirección (flexión dorsal, plantar, inversión, eversión).",
              en: "Circles per direction (dorsiflexion, plantarflexion, inversion, eversion)."
            },
            dosage: {
              es: "10 círculos por dirección.",
              en: "10 circles per direction."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Skipping + Talón a glúteo",
              en: "Skipping + Butt Kicks"
            },
            setup: {
              es: "Movimiento.",
              en: "Moving."
            },
            execution: {
              es: "Combinación.",
              en: "Combination."
            },
            dosage: {
              es: "1 minuto.",
              en: "1 minute."
            },
            tips: {
              es: "",
              en: ""
            }
          }
        ]
      },
      {
        section_id: "phase_2",
        title: {
          es: "FASE 2 — Propiocepción y Control Postural",
          en: "PHASE 2 — Proprioception & Postural Control"
        },
        exercises: [
          {
            name: {
              es: "Equilibrio monopodal (Suelo estable)",
              en: "Single-leg Balance (Stable floor)"
            },
            setup: {
              es: "Un pie.",
              en: "One foot."
            },
            execution: {
              es: "Mantener equilibrio.",
              en: "Maintain balance."
            },
            dosage: {
              es: "3 × 30 s por pierna (30s descanso).",
              en: "3 × 30 s per leg (30s rest)."
            },
            tips: {
              es: "Progresar cerrando ojos.",
              en: "Progress by closing eyes."
            }
          },
          {
            name: {
              es: "Equilibrio monopodal (Estrella)",
              en: "Star Excursion Balance"
            },
            setup: {
              es: "Un pie.",
              en: "One foot."
            },
            execution: {
              es: "Movimiento de MMII contrario en forma de estrella.",
              en: "Movement of opposite leg in star pattern."
            },
            dosage: {
              es: "2 × 20–30 s por pierna.",
              en: "2 × 20–30 s per leg."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Equilibrio monopodal (Inestable)",
              en: "Single-leg Balance (Unstable)"
            },
            setup: {
              es: "Superficie inestable (BOSU, etc).",
              en: "Unstable surface (BOSU, etc)."
            },
            execution: {
              es: "Mantener equilibrio.",
              en: "Maintain balance."
            },
            dosage: {
              es: "3 × 30–40 s por pierna.",
              en: "3 × 30–40 s per leg."
            },
            tips: {
              es: "",
              en: ""
            }
          }
        ]
      },
      {
        section_id: "phase_3",
        title: {
          es: "FASE 3 — Fuerza Específica",
          en: "PHASE 3 — Specific Strength"
        },
        exercises: [
          {
            name: {
              es: "Elevaciones de talón",
              en: "Heel Raises"
            },
            setup: {
              es: "Bilateral o Unilateral.",
              en: "Bilateral or Unilateral."
            },
            execution: {
              es: "Elevar talón, pausa 3s arriba.",
              en: "Raise heel, 3s pause at top."
            },
            dosage: {
              es: "3 × 12–15 repeticiones.",
              en: "3 × 12–15 reps."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Dorsiflexión con banda",
              en: "Banded Dorsiflexion"
            },
            setup: {
              es: "Banda elástica.",
              en: "Elastic band."
            },
            execution: {
              es: "Traer punta del pie hacia la espinilla.",
              en: "Bring toe towards shin."
            },
            dosage: {
              es: "3 × 12–15 por lado.",
              en: "3 × 12–15 per side."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Eversión con banda",
              en: "Banded Eversion"
            },
            setup: {
              es: "Banda elástica.",
              en: "Elastic band."
            },
            execution: {
              es: "Trabajo de peroneos.",
              en: "Peroneal work."
            },
            dosage: {
              es: "3 × 12–15 por lado.",
              en: "3 × 12–15 per side."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Inversión con banda",
              en: "Banded Inversion"
            },
            setup: {
              es: "Banda elástica.",
              en: "Elastic band."
            },
            execution: {
              es: "Mover pie hacia adentro.",
              en: "Move foot inwards."
            },
            dosage: {
              es: "2 × 12–15 por lado.",
              en: "2 × 12–15 per side."
            },
            tips: {
              es: "",
              en: ""
            }
          }
        ]
      },
      {
        section_id: "phase_4",
        title: {
          es: "FASE 4 — Control Dinámico",
          en: "PHASE 4 — Dynamic Control"
        },
        exercises: [
          {
            name: {
              es: "Saltos laterales monopodales",
              en: "Single-leg Lateral Hops"
            },
            setup: {
              es: "Un pie.",
              en: "One foot."
            },
            execution: {
              es: "Salto lateral y recepción.",
              en: "Lateral jump and landing."
            },
            dosage: {
              es: "3 × 10–12 por lado (45s descanso).",
              en: "3 × 10–12 per side (45s rest)."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Saltos adelante–atrás monopodales",
              en: "Single-leg Forward-Backward Hops"
            },
            setup: {
              es: "Un pie.",
              en: "One foot."
            },
            execution: {
              es: "Salto frontal y posterior.",
              en: "Front and back jump."
            },
            dosage: {
              es: "2 × 8–12 por lado.",
              en: "2 × 8–12 per side."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Agilidad con conos",
              en: "Cone Agility"
            },
            setup: {
              es: "5–7 conos.",
              en: "5–7 cones."
            },
            execution: {
              es: "Circuito de agilidad.",
              en: "Agility circuit."
            },
            dosage: {
              es: "2 rondas (descanso 1 min).",
              en: "2 rounds (1 min rest)."
            },
            tips: {
              es: "Transferencia al juego.",
              en: "Transfer to game."
            }
          }
        ]
      }
    ]
  },
  {
    id: "hamstring_protocol",
    title: {
      es: "Lesiones de Isquiosurales",
      en: "Hamstring Injuries"
    },
    icon: "speed",
    color: "#ef4444",
    introduction: {
      title: {
        es: "Fundamentación Científica",
        en: "Scientific Foundation"
      },
      risk_factors: [
        {
          es: "La mayoría de las lesiones ocurren durante el sprint de alta velocidad (>90–95 % Vmax).",
          en: "Most injuries occur during high-speed sprinting (>90–95% Vmax)."
        },
        {
          es: "Mecanismo principal: trabajo excéntrico en longitudes largas.",
          en: "Main mechanism: eccentric work at long lengths."
        },
        {
          es: "El Nordic Hamstring Exercise reduce incidencia entre 50–70%.",
          en: "Nordic Hamstring Exercise reduces incidence by 50–70%."
        },
        {
          es: "Estrategia más eficaz: Fuerza excéntrica + sprint progresivo.",
          en: "Most effective strategy: Eccentric strength + progressive sprinting."
        }
      ],
      objectives: []
    },
    sections: [
      {
        section_id: "pillar_1",
        title: {
          es: "PILAR 1 — Fuerza Excéntrica",
          en: "PILLAR 1 — Eccentric Strength"
        },
        exercises: [
          {
            name: {
              es: "Nordic Hamstring Exercise (NHE)",
              en: "Nordic Hamstring Exercise (NHE)"
            },
            setup: {
              es: "Arrodillado, tronco recto, cadera extendida.",
              en: "Kneeling, straight trunk, hips extended."
            },
            execution: {
              es: "Descenso lento (≈3s) resistiendo caída. Retorno asistido.",
              en: "Slow descent (≈3s) resisting fall. Assisted return."
            },
            dosage: {
              es: "2–3 sesiones/semana, 3–5 series de 4–8 rep.",
              en: "2–3 sessions/week, 3–5 sets of 4–8 reps."
            },
            tips: {
              es: "Objetivo: Aumentar fuerza excéntrica.",
              en: "Objective: Increase eccentric strength."
            }
          },
          {
            name: {
              es: "Peso Muerto Rumano Unilateral (RDL)",
              en: "Single Leg Romanian Deadlift (RDL)"
            },
            setup: {
              es: "Apoyo a una pierna, espalda neutra.",
              en: "Single-leg stance, neutral back."
            },
            execution: {
              es: "Flexión de cadera controlada manteniendo alineación.",
              en: "Controlled hip flexion maintaining alignment."
            },
            dosage: {
              es: "3–4 series de 6–8 rep por pierna.",
              en: "3–4 sets of 6–8 reps per leg."
            },
            tips: {
              es: "Mejorar estabilidad y fuerza excéntrica.",
              en: "Improve stability and eccentric strength."
            }
          }
        ]
      },
      {
        section_id: "pillar_2",
        title: {
          es: "PILAR 2 — Fuerza Explosiva y Transferencia",
          en: "PILLAR 2 — Explosive Strength & Transfer"
        },
        exercises: [
          {
            name: {
              es: "Kettlebell Swing",
              en: "Kettlebell Swing"
            },
            setup: {
              es: "Dominancia de cadera, rodillas ligeramente flexionadas.",
              en: "Hip dominance, knees slightly bent."
            },
            execution: {
              es: "Balanceo explosivo desde cadera. Fuerza generada por cadera, no espalda.",
              en: "Explosive swing from hips. Force generated by hips, not back."
            },
            dosage: {
              es: "3–4 series de 10–12 rep.",
              en: "3–4 sets of 10–12 reps."
            },
            tips: {
              es: "Mejorar potencia extensora de cadera.",
              en: "Improve hip extensor power."
            }
          },
          {
            name: {
              es: "Hip Thrust con barra",
              en: "Barbell Hip Thrust"
            },
            setup: {
              es: "Espalda apoyada en banco, barra en cadera.",
              en: "Back on bench, bar on hips."
            },
            execution: {
              es: "Extensión completa de cadera con control.",
              en: "Full hip extension with control."
            },
            dosage: {
              es: "3–4 series de 6–10 rep.",
              en: "3–4 sets of 6–10 reps."
            },
            tips: {
              es: "Reforzar sinergia glúteo–isquios.",
              en: "Reinforce glute-hamstring synergy."
            }
          }
        ]
      },
      {
        section_id: "pillar_3",
        title: {
          es: "PILAR 3 — Control Neuromuscular y Sprint",
          en: "PILLAR 3 — Neuromuscular Control & Sprint"
        },
        exercises: [
          {
            name: {
              es: "Sprint progresivo / resistido",
              en: "Progressive / Resisted Sprint"
            },
            setup: {
              es: "Pista o campo (Trineo opcional 10-20% peso corporal).",
              en: "Track or field (Optional sled 10-20% BW)."
            },
            execution: {
              es: "Sprints progresivos.",
              en: "Progressive sprints."
            },
            dosage: {
              es: "20–30 metros. 4–6 repeticiones con recuperación completa.",
              en: "20–30 meters. 4–6 reps with full recovery."
            },
            tips: {
              es: "Aumentar tolerancia a altas velocidades.",
              en: "Increase tolerance to high speeds."
            }
          }
        ]
      }
    ]
  },
  {
    id: "knee_protocol",
    title: {
      es: "Lesiones de Rodilla",
      en: "Knee Injuries"
    },
    icon: "accessibility",
    color: "#0ea5e9",
    introduction: {
      title: {
        es: "Mecanismos Lesionales",
        en: "Injury Mechanisms"
      },
      risk_factors: [
        {
          es: "LCA: Sin contacto (desaceleración + cambio dirección + valgo dinámico).",
          en: "ACL: Non-contact (deceleration + change of direction + dynamic valgus)."
        },
        {
          es: "Meniscos: Torsiones bajo carga (flexión profunda).",
          en: "Meniscus: Torsional load (deep flexion)."
        },
        {
          es: "MCL/LCL: Valgo o varo forzado (contacto).",
          en: "MCL/LCL: Forced valgus or varus (contact)."
        },
        {
          es: "Inestabilidad rotuliana: Valgo dinámico + rotación tibial + contracción brusca cuádriceps.",
          en: "Patellar instability: Dynamic valgus + tibial rotation + sudden quad contraction."
        }
      ],
      objectives: []
    },
    sections: [
      {
        section_id: "pillar_1",
        title: {
          es: "PILAR 1 — Control Neuromuscular y Valgo Dinámico",
          en: "PILLAR 1 — Neuromuscular Control & Dynamic Valgus"
        },
        exercises: [
          {
            name: {
              es: "Drop jump + estabilización",
              en: "Drop Jump + Stabilization"
            },
            setup: {
              es: "Salto desde 30–40 cm.",
              en: "Jump from 30–40 cm."
            },
            execution: {
              es: "Aterrizar suave, rodillas alineadas con el segundo dedo del pie.",
              en: "Soft landing, knees aligned with second toe."
            },
            dosage: {
              es: "3×6 por pierna.",
              en: "3×6 per leg."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Hop & stop lateral",
              en: "Lateral Hop & Stop"
            },
            setup: {
              es: "Salto lateral.",
              en: "Lateral jump."
            },
            execution: {
              es: "Parada controlada en uno o dos apoyos antes de repetir.",
              en: "Controlled stop on one or two feet before repeating."
            },
            dosage: {
              es: "3×8 por pierna.",
              en: "3×8 per leg."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Desaceleración desde sprint",
              en: "Sprint Deceleration"
            },
            setup: {
              es: "Carrera 10m.",
              en: "10m run."
            },
            execution: {
              es: "Frenar en máximo 3 pasos manteniendo cadera baja.",
              en: "Stop in max 3 steps keeping hips low."
            },
            dosage: {
              es: "5×5 repeticiones.",
              en: "5×5 reps."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Monster walk con banda",
              en: "Banded Monster Walk"
            },
            setup: {
              es: "Banda en rodillas/tobillos.",
              en: "Band around knees/ankles."
            },
            execution: {
              es: "Pasos laterales manteniendo tensión constante.",
              en: "Lateral steps maintaining constant tension."
            },
            dosage: {
              es: "3×15 pasos por lado.",
              en: "3×15 steps per side."
            },
            tips: {
              es: "Fortalecimiento estabilizadores cadera.",
              en: "Hip stabilizer strengthening."
            }
          },
          {
            name: {
              es: "Clamshell con banda",
              en: "Banded Clamshell"
            },
            setup: {
              es: "Decúbito lateral.",
              en: "Side-lying."
            },
            execution: {
              es: "Apertura controlada de cadera evitando rotación pélvica.",
              en: "Controlled hip opening avoiding pelvic rotation."
            },
            dosage: {
              es: "3×15 por pierna.",
              en: "3×15 per leg."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Puente lateral con abducción",
              en: "Side Plank with Abduction"
            },
            setup: {
              es: "Puente lateral.",
              en: "Side plank."
            },
            execution: {
              es: "Mantener alineación hombro/cadera/rodilla.",
              en: "Maintain shoulder/hip/knee alignment."
            },
            dosage: {
              es: "3×12 por pierna.",
              en: "3×12 per leg."
            },
            tips: {
              es: "",
              en: ""
            }
          }
        ]
      },
      {
        section_id: "pillar_2",
        title: {
          es: "PILAR 2 — Fuerza y Estabilidad",
          en: "PILLAR 2 — Strength & Stability"
        },
        exercises: [
          {
            name: {
              es: "Sentadilla búlgara excéntrica",
              en: "Eccentric Bulgarian Split Squat"
            },
            setup: {
              es: "Pie trasero elevado.",
              en: "Rear foot elevated."
            },
            execution: {
              es: "Descenso lento (4s) manteniendo rodilla alineada.",
              en: "Slow descent (4s) keeping knee aligned."
            },
            dosage: {
              es: "3×8 por pierna.",
              en: "3×8 per leg."
            },
            tips: {
              es: "Cuádriceps.",
              en: "Quadriceps."
            }
          },
          {
            name: {
              es: "Step-down excéntrico",
              en: "Eccentric Step-down"
            },
            setup: {
              es: "Desde 20 cm.",
              en: "From 20 cm."
            },
            execution: {
              es: "Controlar el descenso evitando valgo.",
              en: "Control descent avoiding valgus."
            },
            dosage: {
              es: "3×10 por pierna.",
              en: "3×10 per leg."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Nordic Hamstring",
              en: "Nordic Hamstring"
            },
            setup: {
              es: "Rodillas.",
              en: "Kneeling."
            },
            execution: {
              es: "Control excéntrico del descenso.",
              en: "Eccentric control of descent."
            },
            dosage: {
              es: "2–3 sesiones/semana.",
              en: "2–3 sessions/week."
            },
            tips: {
              es: "Isquiotibiales.",
              en: "Hamstrings."
            }
          },
          {
            name: {
              es: "RDL Unilateral",
              en: "Single Leg RDL"
            },
            setup: {
              es: "Unilateral.",
              en: "Unilateral."
            },
            execution: {
              es: "Énfasis en control de cadera y estabilidad.",
              en: "Emphasis on hip control and stability."
            },
            dosage: {
              es: "3×8 por pierna.",
              en: "3×8 per leg."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Elevación de talón sentado (Sóleo)",
              en: "Seated Heel Raise (Soleus)"
            },
            setup: {
              es: "Sentado.",
              en: "Seated."
            },
            execution: {
              es: "Elevación de talón.",
              en: "Heel raise."
            },
            dosage: {
              es: "4×15 repeticiones.",
              en: "4×15 reps."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Elevación de talón de pie (Gemelo)",
              en: "Standing Heel Raise (Gastrocnemius)"
            },
            setup: {
              es: "De pie.",
              en: "Standing."
            },
            execution: {
              es: "Elevación de talón.",
              en: "Heel raise."
            },
            dosage: {
              es: "3×12 repeticiones.",
              en: "3×12 reps."
            },
            tips: {
              es: "",
              en: ""
            }
          }
        ]
      },
      {
        section_id: "pillar_3",
        title: {
          es: "PILAR 3 — Propiocepción Avanzada y Transferencia",
          en: "PILLAR 3 — Advanced Proprioception & Transfer"
        },
        exercises: [
          {
            name: {
              es: "Sentadilla a una pierna en BOSU",
              en: "Single Leg Squat on BOSU"
            },
            setup: {
              es: "Sobre BOSU.",
              en: "On BOSU."
            },
            execution: {
              es: "Mantener estabilidad, progresar con balón.",
              en: "Maintain stability, progress with ball."
            },
            dosage: {
              es: "3×8 por pierna.",
              en: "3×8 per leg."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Recepciones desde salto (Inestable)",
              en: "Jump Receptions (Unstable)"
            },
            setup: {
              es: "Superficie inestable.",
              en: "Unstable surface."
            },
            execution: {
              es: "Aterrizaje estable antes de repetir.",
              en: "Stable landing before repeating."
            },
            dosage: {
              es: "3×6 por pierna.",
              en: "3×6 per leg."
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Ejercicios con balón",
              en: "Ball Drills"
            },
            setup: {
              es: "Con balón.",
              en: "With ball."
            },
            execution: {
              es: "Giros, cambios de dirección, remates tras salto.",
              en: "Turns, changes of direction, headers after jumping."
            },
            dosage: {
              es: "Variable.",
              en: "Variable."
            },
            tips: {
              es: "Énfasis en control de rodilla.",
              en: "Emphasis on knee control."
            }
          }
        ]
      },
      {
        section_id: "pillar_4",
        title: {
          es: "PILAR 4 — Movilidad y Flexibilidad",
          en: "PILLAR 4 — Mobility & Flexibility"
        },
        exercises: [
          {
            name: {
              es: "Movilidad de tobillo (Dorsiflexión)",
              en: "Ankle Mobility (Dorsiflexion)"
            },
            setup: {
              es: "Con banda.",
              en: "With band."
            },
            execution: {
              es: "Movilización para evitar compensaciones en rodilla.",
              en: "Mobilization to avoid knee compensations."
            },
            dosage: {
              es: "N/A",
              en: "N/A"
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Flexibilidad de isquiotibiales",
              en: "Hamstring Flexibility"
            },
            setup: {
              es: "Dinámico.",
              en: "Dynamic."
            },
            execution: {
              es: "Trabajo dinámico y controlado.",
              en: "Dynamic and controlled work."
            },
            dosage: {
              es: "N/A",
              en: "N/A"
            },
            tips: {
              es: "",
              en: ""
            }
          },
          {
            name: {
              es: "Movilidad de cadera",
              en: "Hip Mobility"
            },
            setup: {
              es: "Rotación interna y externa.",
              en: "Internal and external rotation."
            },
            execution: {
              es: "Clave para gestos de giro.",
              en: "Key for turning gestures."
            },
            dosage: {
              es: "N/A",
              en: "N/A"
            },
            tips: {
              es: "",
              en: ""
            }
          }
        ]
      }
    ]
  }
];
