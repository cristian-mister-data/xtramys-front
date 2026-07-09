// data/strengthExercises.js
// Catálogo completo de ejercicios de fuerza (Entrenamiento Coadyuvante - Progresiones)
// Cada ejercicio tiene un id basado en su código, sección, nivel y archivo de imagen/video

// imageMap mapea filename → URL bundleada por Vite (import.meta.glob).
// Si una imagen no está localmente, caemos al fallback URL remoto (R2).
import imageMap from '../images/fuerza/imageMap';
import { R2_PUBLIC_URL } from '../config';

const R2_BASE_URL = `${R2_PUBLIC_URL}/fuerza`;

/**
 * Categorías principales de ejercicios de fuerza
 * Cada categoría contiene secciones con niveles progresivos
 */
export const STRENGTH_CATEGORIES = [
  {
    id: 'mobility',
    i18nKey: 'strengthExercises.categories.mobility',
    icon: '🦵',
    color: '#8b5cf6',
    sections: [
      {
        id: 'hip_mobility',
        i18nKey: 'strengthExercises.sections.hipMobility',
        prefix: 'MC',
        color: '#a78bfa',
      },
      {
        id: 'ankle_mobility',
        i18nKey: 'strengthExercises.sections.ankleMobility',
        prefix: 'MT',
        color: '#7c3aed',
      },
    ],
  },
  {
    id: 'core',
    i18nKey: 'strengthExercises.categories.core',
    icon: '🏋️',
    color: '#f59e0b',
    sections: [
      {
        id: 'core_antiextension',
        i18nKey: 'strengthExercises.sections.coreAntiExtension',
        prefix: 'CAE',
        color: '#fbbf24',
      },
      {
        id: 'core_antilateral',
        i18nKey: 'strengthExercises.sections.coreAntiLateralFlexion',
        prefix: 'CAF',
        color: '#f59e0b',
      },
      {
        id: 'core_antirotation',
        i18nKey: 'strengthExercises.sections.coreAntiRotation',
        prefix: 'CAR',
        color: '#d97706',
      },
    ],
  },
  {
    id: 'lower_body',
    i18nKey: 'strengthExercises.categories.lowerBody',
    icon: '🦿',
    color: '#10b981',
    sections: [
      {
        id: 'knee_dominant_bilateral',
        i18nKey: 'strengthExercises.sections.kneeDominantBilateral',
        prefix: 'DR',
        color: '#34d399',
      },
      {
        id: 'knee_dominant_unilateral',
        i18nKey: 'strengthExercises.sections.kneeDominantUnilateral',
        prefix: 'DDRR',
        color: '#10b981',
      },
      {
        id: 'hip_dominant_bilateral',
        i18nKey: 'strengthExercises.sections.hipDominantBilateral',
        prefix: 'DC',
        color: '#059669',
      },
      {
        id: 'hip_dominant_unilateral',
        i18nKey: 'strengthExercises.sections.hipDominantUnilateral',
        prefix: 'DDCC',
        color: '#047857',
      },
    ],
  },
  {
    id: 'upper_body',
    i18nKey: 'strengthExercises.categories.upperBody',
    icon: '💪',
    color: '#3b82f6',
    sections: [
      {
        id: 'horizontal_push',
        i18nKey: 'strengthExercises.sections.horizontalPush',
        prefix: 'EH',
        color: '#60a5fa',
      },
      {
        id: 'vertical_push',
        i18nKey: 'strengthExercises.sections.verticalPush',
        prefix: 'EV',
        color: '#3b82f6',
      },
      {
        id: 'horizontal_pull',
        i18nKey: 'strengthExercises.sections.horizontalPull',
        prefix: 'TH',
        color: '#2563eb',
      },
      {
        id: 'vertical_pull',
        i18nKey: 'strengthExercises.sections.verticalPull',
        prefix: 'TV',
        color: '#1d4ed8',
      },
    ],
  },
  {
    id: 'plyometrics',
    i18nKey: 'strengthExercises.categories.plyometrics',
    icon: '⚡',
    color: '#ef4444',
    sections: [
      {
        id: 'vertical_plyometrics',
        i18nKey: 'strengthExercises.sections.verticalPlyometrics',
        prefix: 'PV',
        color: '#f87171',
      },
      {
        id: 'frontal_plyometrics',
        i18nKey: 'strengthExercises.sections.frontalPlyometrics',
        prefix: 'PF',
        color: '#ef4444',
      },
      {
        id: 'lateral_plyometrics',
        i18nKey: 'strengthExercises.sections.lateralPlyometrics',
        prefix: 'PL',
        color: '#dc2626',
      },
    ],
  },
  {
    id: 'speed',
    i18nKey: 'strengthExercises.categories.speed',
    icon: '🏃',
    color: '#06b6d4',
    sections: [
      {
        id: 'acceleration',
        i18nKey: 'strengthExercises.sections.acceleration',
        prefix: 'AC',
        color: '#22d3ee',
      },
      {
        id: 'deceleration',
        i18nKey: 'strengthExercises.sections.deceleration',
        prefix: 'DEC',
        color: '#06b6d4',
      },
      {
        id: 'change_of_direction',
        i18nKey: 'strengthExercises.sections.changeOfDirection',
        prefix: 'CDD',
        color: '#0891b2',
      },
    ],
  },
];

/**
 * Lista completa de ejercicios de fuerza
 * El número después del prefijo indica el nivel de progresión (mayor = más difícil)
 */
export const STRENGTH_EXERCISES = [
  // ==========================================
  // MOVILIDAD DE CADERA (MC)
  // ==========================================
  { id: 'MC01', i18nKey: 'strengthExercises.exercises.MC01', section: 'hip_mobility', level: 1, image: 'MC01. FLEX-EXT BALÍSTICA.webp' },
  { id: 'MC02', i18nKey: 'strengthExercises.exercises.MC02', section: 'hip_mobility', level: 2, image: 'MC02. ROCK BACK.webp' },
  { id: 'MC03', i18nKey: 'strengthExercises.exercises.MC03', section: 'hip_mobility', level: 3, image: 'MC03. FLEX-EXT CABALLERO.webp' },
  { id: 'MC04', i18nKey: 'strengthExercises.exercises.MC04', section: 'hip_mobility', level: 4, image: 'MC04. SENTADILLA PROFUNDA TRX.webp' },
  { id: 'MC05', i18nKey: 'strengthExercises.exercises.MC05', section: 'hip_mobility', level: 5, image: 'MC05. FLEX-EXT (MINI-BAND).webp' },
  { id: 'MC06', i18nKey: 'strengthExercises.exercises.MC06', section: 'hip_mobility', level: 6, image: 'MC06. EXTENSIÓN DESDE CUADRUPEDIA.webp' },
  { id: 'MC07', i18nKey: 'strengthExercises.exercises.MC07', section: 'hip_mobility', level: 7, image: 'MC07. FLEXIÓN DESDE CABALLERO.webp' },
  { id: 'MC08', i18nKey: 'strengthExercises.exercises.MC08', section: 'hip_mobility', level: 8, image: 'MC08. PERRO BOCA-ABAJO.webp' },
  { id: 'MC09', i18nKey: 'strengthExercises.exercises.MC09', section: 'hip_mobility', level: 9, image: 'MC09. ROCK BACK PIERNA ESTIRADA.webp' },
  { id: 'MC10', i18nKey: 'strengthExercises.exercises.MC10', section: 'hip_mobility', level: 10, image: 'MC10. ROTACIÓN INTERNA TUMBADO.webp' },
  { id: 'MC11', i18nKey: 'strengthExercises.exercises.MC11', section: 'hip_mobility', level: 11, image: 'MC11. 90-90 UNILATERAL.webp' },
  { id: 'MC12', i18nKey: 'strengthExercises.exercises.MC12', section: 'hip_mobility', level: 12, image: 'MC12. 90-90 BILATERAL.webp' },
  { id: 'MC13', i18nKey: 'strengthExercises.exercises.MC13', section: 'hip_mobility', level: 13, image: 'MC13.  ROTACIÓN INTERNA RESISTIDA.webp' },
  { id: 'MC14', i18nKey: 'strengthExercises.exercises.MC14', section: 'hip_mobility', level: 14, image: 'MC14. RI RESISTIDA DESDE SENTADO.webp' },
  { id: 'MC15', i18nKey: 'strengthExercises.exercises.MC15', section: 'hip_mobility', level: 15, image: 'MC15. ABDUCCIÓN RESISTIDA DE PIE.webp' },
  { id: 'MC16', i18nKey: 'strengthExercises.exercises.MC16', section: 'hip_mobility', level: 16, image: 'MC16. LATERAL DESDE CABALLERO.webp' },
  { id: 'MC17', i18nKey: 'strengthExercises.exercises.MC17', section: 'hip_mobility', level: 17, image: 'MC17. ADDUCIÓN ISOMÉTRICA FITBALL.webp' },
  { id: 'MC18', i18nKey: 'strengthExercises.exercises.MC18', section: 'hip_mobility', level: 18, image: 'MC18. ABDUCCIÓN CUADRUPEDIA.webp' },
  { id: 'MC19', i18nKey: 'strengthExercises.exercises.MC19', section: 'hip_mobility', level: 19, image: 'MC19. ADD-ABD BALÍSTICA.webp' },

  // ==========================================
  // MOVILIDAD DE TOBILLO (MT)
  // ==========================================
  { id: 'MT01', i18nKey: 'strengthExercises.exercises.MT01', section: 'ankle_mobility', level: 1, image: 'MT01. DORSIFLEXIÓN (CABALLERO).webp' },
  { id: 'MT02', i18nKey: 'strengthExercises.exercises.MT02', section: 'ankle_mobility', level: 2, image: 'MT02. D.FLX ASTRAGALO (GOMA).webp' },
  { id: 'MT03', i18nKey: 'strengthExercises.exercises.MT03', section: 'ankle_mobility', level: 3, image: 'MT03. PRONACIÓN RESISTIDA (GOMA).webp' },
  { id: 'MT04', i18nKey: 'strengthExercises.exercises.MT04', section: 'ankle_mobility', level: 4, image: 'MT04. SUPINACIÓN RESISTIDA (GOMA).webp' },
  { id: 'MT05', i18nKey: 'strengthExercises.exercises.MT05', section: 'ankle_mobility', level: 5, image: 'MT05. ESTIRAMIENTO GEMELO (STEP).webp' },
  { id: 'MT06', i18nKey: 'strengthExercises.exercises.MT06', section: 'ankle_mobility', level: 6, image: 'MT06. SQUATTY (PASOS).webp' },
  { id: 'MT07', i18nKey: 'strengthExercises.exercises.MT07', section: 'ankle_mobility', level: 7, image: 'MT07. EXCÉNTRICO (GEMELO-SÓLEO).webp' },
  { id: 'MT08', i18nKey: 'strengthExercises.exercises.MT08', section: 'ankle_mobility', level: 8, image: 'MT08. TOBILLO BIL TRX.webp' },
  { id: 'MT09', i18nKey: 'strengthExercises.exercises.MT09', section: 'ankle_mobility', level: 9, image: 'MT09. TOBILLO UL TRX.webp' },
  { id: 'MT10', i18nKey: 'strengthExercises.exercises.MT10', section: 'ankle_mobility', level: 10, image: 'MT10. SENT BIL TALONES ELEVADOS.webp' },
  { id: 'MT11', i18nKey: 'strengthExercises.exercises.MT11', section: 'ankle_mobility', level: 11, image: 'MT11. SENT UL TALÓN ELEVADO.webp' },
  { id: 'MT12', i18nKey: 'strengthExercises.exercises.MT12', section: 'ankle_mobility', level: 12, image: 'MT12. ESTABILIDAD ANTIPRO.webp' },
  { id: 'MT13', i18nKey: 'strengthExercises.exercises.MT13', section: 'ankle_mobility', level: 13, image: 'MT13.  ESTABILIDAD ANTISUP.webp' },
  { id: 'MT14', i18nKey: 'strengthExercises.exercises.MT14', section: 'ankle_mobility', level: 14, image: 'MT14. ANDAR TALÓN -PUNTERA.webp' },

  // ==========================================
  // CORE - ANTIEXTENSIÓN (CAE)
  // ==========================================
  { id: 'CAE01', i18nKey: 'strengthExercises.exercises.CAE01', section: 'core_antiextension', level: 1, image: 'CAE01. PLANCHA FRONTAL “RODILLAS”.webp' },
  { id: 'CAE02', i18nKey: 'strengthExercises.exercises.CAE02', section: 'core_antiextension', level: 2, image: 'CAE02. PLANCHA FRONTAL.webp' },
  { id: 'CAE03', i18nKey: 'strengthExercises.exercises.CAE03', section: 'core_antiextension', level: 3, image: 'CAE03. ESCALADOR.webp' },
  { id: 'CAE04', i18nKey: 'strengthExercises.exercises.CAE04', section: 'core_antiextension', level: 4, image: 'CAE04. BEAR CRAWL “ISOMÉTRICO”.webp' },
  { id: 'CAE05', i18nKey: 'strengthExercises.exercises.CAE05', section: 'core_antiextension', level: 5, image: 'CAE05. BEAR CRAWL “DINÁMICO”.webp' },
  { id: 'CAE06', i18nKey: 'strengthExercises.exercises.CAE06', section: 'core_antiextension', level: 6, image: 'CAE06. ANTIEXTENSIÓN RODILLAS.webp' },
  { id: 'CAE07', i18nKey: 'strengthExercises.exercises.CAE07', section: 'core_antiextension', level: 7, image: 'CAE07. ANTIEXTENSIÓN DE PIE.webp' },
  { id: 'CAE08', i18nKey: 'strengthExercises.exercises.CAE08', section: 'core_antiextension', level: 8, image: 'CAE08. DEAD BUG.webp' },
  { id: 'CAE09', i18nKey: 'strengthExercises.exercises.CAE09', section: 'core_antiextension', level: 9, image: 'CAE09. DEAD BUG (CARGA).webp' },
  { id: 'CAE10', i18nKey: 'strengthExercises.exercises.CAE10', section: 'core_antiextension', level: 10, image: 'CAE10. PLANCHA FRONTAL (FITBALL).webp' },
  { id: 'CAE11', i18nKey: 'strengthExercises.exercises.CAE11', section: 'core_antiextension', level: 11, image: 'CAE11. ROLL OUT (FITBALL).webp' },
  { id: 'CAE12', i18nKey: 'strengthExercises.exercises.CAE12', section: 'core_antiextension', level: 12, image: 'CAE12. ROLL OUT (BARRA).webp' },
  { id: 'CAE13', i18nKey: 'strengthExercises.exercises.CAE13', section: 'core_antiextension', level: 13, image: 'CAE13.  FALL OUT RODILLAS (TRX).webp' },

  // ==========================================
  // CORE - ANTIFLEXIÓN LATERAL (CAF)
  // ==========================================
  { id: 'CAF01', i18nKey: 'strengthExercises.exercises.CAF01', section: 'core_antilateral', level: 1, image: 'CAF01. PLANCHA LATERAL “RODILLAS”.webp' },
  { id: 'CAF02', i18nKey: 'strengthExercises.exercises.CAF02', section: 'core_antilateral', level: 2, image: 'CAF02. PLANCHA LATERAL.webp' },
  { id: 'CAF03', i18nKey: 'strengthExercises.exercises.CAF03', section: 'core_antilateral', level: 3, image: 'CAF03. PLANCHA LATERAL “REBOTE”.webp' },
  { id: 'CAF04', i18nKey: 'strengthExercises.exercises.CAF04', section: 'core_antilateral', level: 4, image: 'CAF04. PLANCHA LATERAL “ROTACIÓN”.webp' },
  { id: 'CAF05', i18nKey: 'strengthExercises.exercises.CAF05', section: 'core_antilateral', level: 5, image: 'CAF05. PLANCHA LAT “ABDUCCIÓN”.webp' },
  { id: 'CAF06', i18nKey: 'strengthExercises.exercises.CAF06', section: 'core_antilateral', level: 6, image: 'CAF06. PLANCHA LATERAL “MARCHA”.webp' },
  { id: 'CAF07', i18nKey: 'strengthExercises.exercises.CAF07', section: 'core_antilateral', level: 7, image: 'CAF07. PL. LATERAL “BRAZO ESTIRADO”.webp' },
  { id: 'CAF08', i18nKey: 'strengthExercises.exercises.CAF08', section: 'core_antilateral', level: 8, image: 'CAF08. PLANCHA LATERAL “BANCO”.webp' },
  { id: 'CAF09', i18nKey: 'strengthExercises.exercises.CAF09', section: 'core_antilateral', level: 9, image: 'CAF09. PLANCHA LATERAL “TRACCIÓN”.webp' },
  { id: 'CAF10', i18nKey: 'strengthExercises.exercises.CAF10', section: 'core_antilateral', level: 10, image: 'CAF10. PLANCHA LATERAL “ROTACIÓN”.webp' },
  { id: 'CAF11', i18nKey: 'strengthExercises.exercises.CAF11', section: 'core_antilateral', level: 11, image: 'CAF11. PLANCHA LATERAL “BOSU”.webp' },
  { id: 'CAF12', i18nKey: 'strengthExercises.exercises.CAF12', section: 'core_antilateral', level: 12, image: 'CAF12. PLANCHA LAT “COPENHAGUE”.webp' },
  { id: 'CAF13', i18nKey: 'strengthExercises.exercises.CAF13', section: 'core_antilateral', level: 13, image: 'CAF13. PL DINÁMICA “COPENHAGUE”.webp' },
  { id: 'CAF14', i18nKey: 'strengthExercises.exercises.CAF14', section: 'core_antilateral', level: 14, image: 'CAF14. FARMER BILATERAL (KTB).webp' },
  { id: 'CAF15', i18nKey: 'strengthExercises.exercises.CAF15', section: 'core_antilateral', level: 15, image: 'CAF15.  FARMER UNILATERAL (KTB).webp' },
  { id: 'CAF16', i18nKey: 'strengthExercises.exercises.CAF16', section: 'core_antilateral', level: 16, image: 'CAF16. ESTABILIDAD UNIP CONT (KTB).webp' },
  { id: 'CAF17', i18nKey: 'strengthExercises.exercises.CAF17', section: 'core_antilateral', level: 17, image: 'CAF17. ESTABILIDAD UNIP HOMOL (KTB).webp' },
  { id: 'CAF18', i18nKey: 'strengthExercises.exercises.CAF18', section: 'core_antilateral', level: 18, image: 'CAF18.  ANTIFLEXIÓN DE PIE.webp' },
  { id: 'CAF19', i18nKey: 'strengthExercises.exercises.CAF19', section: 'core_antilateral', level: 19, image: 'CAF19. ANTIFLEXIÓN DE PIE CONT.webp' },
  { id: 'CAF20', i18nKey: 'strengthExercises.exercises.CAF20', section: 'core_antilateral', level: 20, image: 'CAF20. ANTIFLEXIÓN DE PIE HOMOLAT.webp' },

  // ==========================================
  // CORE - ANTIRROTACIÓN (CAR)
  // ==========================================
  { id: 'CAR01', i18nKey: 'strengthExercises.exercises.CAR01', section: 'core_antirotation', level: 1, image: 'CAR01. BIRD DOG “PIERNAS”.webp' },
  { id: 'CAR02', i18nKey: 'strengthExercises.exercises.CAR02', section: 'core_antirotation', level: 2, image: 'CAR02. BIRD DOG.webp' },
  { id: 'CAR03', i18nKey: 'strengthExercises.exercises.CAR03', section: 'core_antirotation', level: 3, image: 'CAR03. BIRD DOG “SIN RODILLAS”.webp' },
  { id: 'CAR04', i18nKey: 'strengthExercises.exercises.CAR04', section: 'core_antirotation', level: 4, image: 'CAR04. BIRD DOG ROW.webp' },
  { id: 'CAR05', i18nKey: 'strengthExercises.exercises.CAR05', section: 'core_antirotation', level: 5, image: 'CAR05. PLANCHA FRONTAL ”UNIPODAL.webp' },
  { id: 'CAR06', i18nKey: 'strengthExercises.exercises.CAR06', section: 'core_antirotation', level: 6, image: 'CAR06. SHOULDER TAP.webp' },
  { id: 'CAR07', i18nKey: 'strengthExercises.exercises.CAR07', section: 'core_antirotation', level: 7, image: 'CAR07. BEAL CRAWL TAP.webp' },
  { id: 'CAR08', i18nKey: 'strengthExercises.exercises.CAR08', section: 'core_antirotation', level: 8, image: 'CAR08. P.FRONTAL “REMO”.webp' },
  { id: 'CAR09', i18nKey: 'strengthExercises.exercises.CAR09', section: 'core_antirotation', level: 9, image: 'CAR09. P.FRONTAL  “OSCILACIONES”.webp' },
  { id: 'CAR10', i18nKey: 'strengthExercises.exercises.CAR10', section: 'core_antirotation', level: 10, image: 'CAR10. PRESS PALLOF “RODILLAS”.webp' },
  { id: 'CAR11', i18nKey: 'strengthExercises.exercises.CAR11', section: 'core_antirotation', level: 11, image: 'CAR11. PRESS PALLOF “CABALLERO”.webp' },
  { id: 'CAR12', i18nKey: 'strengthExercises.exercises.CAR12', section: 'core_antirotation', level: 12, image: 'CAR12. PRESS PALLOF “ZANCADA”.webp' },
  { id: 'CAR13', i18nKey: 'strengthExercises.exercises.CAR13', section: 'core_antirotation', level: 13, image: 'CAR13. PRESS PALLOF DE PIE.webp' },
  { id: 'CAR14', i18nKey: 'strengthExercises.exercises.CAR14', section: 'core_antirotation', level: 14, image: 'CAR14. PRESS PALLOF UNIPODAL.webp' },
  { id: 'CAR15', i18nKey: 'strengthExercises.exercises.CAR15', section: 'core_antirotation', level: 15, image: 'CAR15. ROTACIONES DIAGONALES.webp' },
  { id: 'CAR16', i18nKey: 'strengthExercises.exercises.CAR16', section: 'core_antirotation', level: 16, image: 'CAR16. ROTAC DIAGONALES ZANCADA.webp' },

  // ==========================================
  // DOMINANTE RODILLA - BILATERAL (DR)
  // ==========================================
  { id: 'DR01', i18nKey: 'strengthExercises.exercises.DR01', section: 'knee_dominant_bilateral', level: 1, image: 'DR01. SENTADILLA ISOMÉTRICA (PARED).webp' },
  { id: 'DR02', i18nKey: 'strengthExercises.exercises.DR02', section: 'knee_dominant_bilateral', level: 2, image: 'DR02. SENTADILLA (TRX).webp' },
  { id: 'DR03', i18nKey: 'strengthExercises.exercises.DR03', section: 'knee_dominant_bilateral', level: 3, image: 'DR03. SENTADILLA (FITBALL).webp' },
  { id: 'DR04', i18nKey: 'strengthExercises.exercises.DR04', section: 'knee_dominant_bilateral', level: 4, image: 'DR04. SENTADILLA OVERHEAD (PICA).webp' },
  { id: 'DR05', i18nKey: 'strengthExercises.exercises.DR05', section: 'knee_dominant_bilateral', level: 5, image: 'DR05. SENTADILLA SUMO (MKTB).webp' },
  { id: 'DR06', i18nKey: 'strengthExercises.exercises.DR06', section: 'knee_dominant_bilateral', level: 6, image: 'DR06. SENTADILLA SISSY.webp' },
  { id: 'DR07', i18nKey: 'strengthExercises.exercises.DR07', section: 'knee_dominant_bilateral', level: 7, image: 'DR07. SENTADILLA GOBLET (MKTB).webp' },
  { id: 'DR08', i18nKey: 'strengthExercises.exercises.DR08', section: 'knee_dominant_bilateral', level: 8, image: 'DR08. SENTADILLA TRASERA (BARRA).webp' },
  { id: 'DR09', i18nKey: 'strengthExercises.exercises.DR09', section: 'knee_dominant_bilateral', level: 9, image: 'DR09. SENTADILLA FRONTAL (BARRA).webp' },
  { id: 'DR10', i18nKey: 'strengthExercises.exercises.DR10', section: 'knee_dominant_bilateral', level: 10, image: 'DR10. SENTADILLA ISOMÉTRICA UL (PARED).webp' },
  { id: 'DR11', i18nKey: 'strengthExercises.exercises.DR11', section: 'knee_dominant_bilateral', level: 11, image: 'DR11. SENTADILLA ASIMÉTRICA (M-KTB-BARRA).webp' },
  { id: 'DR12', i18nKey: 'strengthExercises.exercises.DR12', section: 'knee_dominant_bilateral', level: 12, image: 'DR12. SENTADILLA PISTOL (TRX).webp' },
  { id: 'DR13', i18nKey: 'strengthExercises.exercises.DR13', section: 'knee_dominant_bilateral', level: 13, image: 'DR13. SENTADILLA PISTOL (FITBALL).webp' },
  { id: 'DR14', i18nKey: 'strengthExercises.exercises.DR14', section: 'knee_dominant_bilateral', level: 14, image: 'DR14. SENTADILLA PISTOL (CAJÓN).webp' },
  { id: 'DR15', i18nKey: 'strengthExercises.exercises.DR15', section: 'knee_dominant_bilateral', level: 15, image: 'DR15. STEP UP (M-KTB-BARRA).webp' },
  { id: 'DR16', i18nKey: 'strengthExercises.exercises.DR16', section: 'knee_dominant_bilateral', level: 16, image: 'DR16. LATERAL STEP UP (M-KTB-BARRA).webp' },
  { id: 'DR17', i18nKey: 'strengthExercises.exercises.DR17', section: 'knee_dominant_bilateral', level: 17, image: 'DR17. STEP DOWN (M-KTB-BARRA).webp' },
  { id: 'DR18', i18nKey: 'strengthExercises.exercises.DR18', section: 'knee_dominant_bilateral', level: 18, image: 'DR18. SENTADILLA PATINADOR (M).webp' },
  { id: 'DR19', i18nKey: 'strengthExercises.exercises.DR19', section: 'knee_dominant_bilateral', level: 19, image: 'DR19. SQUAT JERK (BARRA).webp' },

  // ==========================================
  // DOMINANTE RODILLA - UNILATERAL (DDRR)
  // ==========================================
  { id: 'DDRR01', i18nKey: 'strengthExercises.exercises.DDRR01', section: 'knee_dominant_unilateral', level: 1, image: 'DDRR01. SENTADILLA SPLIT (TRX).webp' },
  { id: 'DDRR02', i18nKey: 'strengthExercises.exercises.DDRR02', section: 'knee_dominant_unilateral', level: 2, image: 'DDRR02. SENTADILLA SPLIT (STEP).webp' },
  { id: 'DDRR03', i18nKey: 'strengthExercises.exercises.DDRR03', section: 'knee_dominant_unilateral', level: 3, image: 'DDRR03. SENTADILLA SPLIT.webp' },
  { id: 'DDRR04', i18nKey: 'strengthExercises.exercises.DDRR04', section: 'knee_dominant_unilateral', level: 4, image: 'DDRR04. SQ SPLIT CONTRALATERAL (M-KTB).webp' },
  { id: 'DDRR05', i18nKey: 'strengthExercises.exercises.DDRR05', section: 'knee_dominant_unilateral', level: 5, image: 'DDRR05. SQ SPLIT HOMOLATERAL (M-KTB).webp' },
  { id: 'DDRR06', i18nKey: 'strengthExercises.exercises.DDRR06', section: 'knee_dominant_unilateral', level: 6, image: 'DDRR06. SENTADILLA SPLIT (BARRA).webp' },
  { id: 'DDRR07', i18nKey: 'strengthExercises.exercises.DDRR07', section: 'knee_dominant_unilateral', level: 7, image: 'DDRR07. SENTADILLA BULGARA (M-KTB-BARRA) .webp' },
  { id: 'DDRR08', i18nKey: 'strengthExercises.exercises.DDRR08', section: 'knee_dominant_unilateral', level: 8, image: 'DDRR08. ZANCADA FRONTAL.webp' },
  { id: 'DDRR09', i18nKey: 'strengthExercises.exercises.DDRR09', section: 'knee_dominant_unilateral', level: 9, image: 'DDRR09. ZANCADA FRONTAL (GOMA).webp' },
  { id: 'DDRR10', i18nKey: 'strengthExercises.exercises.DDRR10', section: 'knee_dominant_unilateral', level: 10, image: 'DDRR10. ZANCADA ATRÁS.webp' },
  { id: 'DDRR11', i18nKey: 'strengthExercises.exercises.DDRR11', section: 'knee_dominant_unilateral', level: 11, image: 'DDRR11. ZANCADA ATRÁS (SLIDER).webp' },
  { id: 'DDRR12', i18nKey: 'strengthExercises.exercises.DDRR12', section: 'knee_dominant_unilateral', level: 12, image: 'DDRR12. ZANCADA LATERAL (SLIDER).webp' },
  { id: 'DDRR13', i18nKey: 'strengthExercises.exercises.DDRR13', section: 'knee_dominant_unilateral', level: 13, image: 'DDRR13. ZANCADA FR CONTRALATERAL (M-KTB).webp' },
  { id: 'DDRR14', i18nKey: 'strengthExercises.exercises.DDRR14', section: 'knee_dominant_unilateral', level: 14, image: 'DDRR14. ZANCADA FR HOMOLATERAL (M-KTB).webp' },
  { id: 'DDRR15', i18nKey: 'strengthExercises.exercises.DDRR15', section: 'knee_dominant_unilateral', level: 15, image: 'DDRR15. ZANCADA FRONTAL (BARRA).webp' },
  { id: 'DDRR16', i18nKey: 'strengthExercises.exercises.DDRR16', section: 'knee_dominant_unilateral', level: 16, image: 'DDRR16. ZANCADA FR DINÁMICA (M-KTB-BARRA).webp' },
  { id: 'DDRR17', i18nKey: 'strengthExercises.exercises.DDRR17', section: 'knee_dominant_unilateral', level: 17, image: 'DDRR17. ZANC LAT DINÁMICA.webp' },
  { id: 'DDRR18', i18nKey: 'strengthExercises.exercises.DDRR18', section: 'knee_dominant_unilateral', level: 18, image: 'DDRR18. ZANC LAT DINÁMICA (M-KTB-BARRA).webp' },
  { id: 'DDRR19', i18nKey: 'strengthExercises.exercises.DDRR19', section: 'knee_dominant_unilateral', level: 19, image: 'DDRR19. SQ SPLIT SALTO UNIP (M-KTB-BARRA).webp' },
  { id: 'DDRR20', i18nKey: 'strengthExercises.exercises.DDRR20', section: 'knee_dominant_unilateral', level: 20, image: 'DDRR20. SPLIT JERK (BARRA).webp' },

  // ==========================================
  // DOMINANTE CADERA - BILATERAL (DC)
  // ==========================================
  { id: 'DC01', i18nKey: 'strengthExercises.exercises.DC01', section: 'hip_dominant_bilateral', level: 1, image: 'DC01. BISAGRA CADERA RODILLAS (PICA).webp' },
  { id: 'DC02', i18nKey: 'strengthExercises.exercises.DC02', section: 'hip_dominant_bilateral', level: 2, image: 'DC02. BISAGRA CADERA DE PIE (PICA).webp' },
  { id: 'DC03', i18nKey: 'strengthExercises.exercises.DC03', section: 'hip_dominant_bilateral', level: 3, image: 'DC03. BISAGRA CADERA RODILLAS (GOMA).webp' },
  { id: 'DC04', i18nKey: 'strengthExercises.exercises.DC04', section: 'hip_dominant_bilateral', level: 4, image: 'DC04. BISAGRA CADERA DE PIE (GOMA).webp' },
  { id: 'DC05', i18nKey: 'strengthExercises.exercises.DC05', section: 'hip_dominant_bilateral', level: 5, image: 'DC05. PESO MUERTO (GOMA).webp' },
  { id: 'DC06', i18nKey: 'strengthExercises.exercises.DC06', section: 'hip_dominant_bilateral', level: 6, image: 'DC06. PESO MUERTO (M-KTB-BARRA) .webp' },
  { id: 'DC07', i18nKey: 'strengthExercises.exercises.DC07', section: 'hip_dominant_bilateral', level: 7, image: 'DC07. KETTLEBELL SWING.webp' },
  { id: 'DC08', i18nKey: 'strengthExercises.exercises.DC08', section: 'hip_dominant_bilateral', level: 8, image: 'DC08. KETTLEBELL SWING (GOMA).webp' },
  { id: 'DC09', i18nKey: 'strengthExercises.exercises.DC09', section: 'hip_dominant_bilateral', level: 9, image: 'DC09. PESO MUERTO ASIMÉTR (M-KTB-BARRA).webp' },
  { id: 'DC10', i18nKey: 'strengthExercises.exercises.DC10', section: 'hip_dominant_bilateral', level: 10, image: 'DC10. PESO MUERTO ASM CAJÓN (M-KTB-BARRA) .webp' },
  { id: 'DC11', i18nKey: 'strengthExercises.exercises.DC11', section: 'hip_dominant_bilateral', level: 11, image: 'DC11. PESO MUERTO UNILATERAL (PICA).webp' },
  { id: 'DC12', i18nKey: 'strengthExercises.exercises.DC12', section: 'hip_dominant_bilateral', level: 12, image: 'DC12. PESO MUERTO UNILAT (M-KTB-BARRA).webp' },
  { id: 'DC13', i18nKey: 'strengthExercises.exercises.DC13', section: 'hip_dominant_bilateral', level: 13, image: 'DC13. PESO MUERTO UL + TRACCIÓN (GOMA).webp' },
  { id: 'DC14', i18nKey: 'strengthExercises.exercises.DC14', section: 'hip_dominant_bilateral', level: 14, image: 'DC14. PESO MUERTO UNILATERAL (LANDMINE).webp' },
  { id: 'DC15', i18nKey: 'strengthExercises.exercises.DC15', section: 'hip_dominant_bilateral', level: 15, image: 'DC15. PESO MUERTO UL (BARRA).webp' },
  { id: 'DC16', i18nKey: 'strengthExercises.exercises.DC16', section: 'hip_dominant_bilateral', level: 16, image: 'DC16. PESO MUERTO UL CON GOMA (PESO).webp' },
  { id: 'DC17', i18nKey: 'strengthExercises.exercises.DC17', section: 'hip_dominant_bilateral', level: 17, image: 'DC17. PESO MUERTO UL TRACCIÓN (POLEA).webp' },
  { id: 'DC18', i18nKey: 'strengthExercises.exercises.DC18', section: 'hip_dominant_bilateral', level: 18, image: 'DC18. PESO MUERTO UL (CAJÓN).webp' },
  { id: 'DC19', i18nKey: 'strengthExercises.exercises.DC19', section: 'hip_dominant_bilateral', level: 19, image: 'DC19. PESO MUERTO UL CAJON (GOMA).webp' },

  // ==========================================
  // DOMINANTE CADERA - UNILATERAL (DDCC)
  // ==========================================
  { id: 'DDCC01', i18nKey: 'strengthExercises.exercises.DDCC01', section: 'hip_dominant_unilateral', level: 1, image: 'DDCC01. PUENTE GLÚTEO (BILATERAL).webp' },
  { id: 'DDCC02', i18nKey: 'strengthExercises.exercises.DDCC02', section: 'hip_dominant_unilateral', level: 2, image: 'DDCC02. PUENTE GLÚTEO CAJON (BIL).webp' },
  { id: 'DDCC03', i18nKey: 'strengthExercises.exercises.DDCC03', section: 'hip_dominant_unilateral', level: 3, image: 'DDCC03. PUENTE GLÚTEO (FITBALL).webp' },
  { id: 'DDCC04', i18nKey: 'strengthExercises.exercises.DDCC04', section: 'hip_dominant_unilateral', level: 4, image: 'DDCC04. PUENTE GLÚTEO (SLIDERS).webp' },
  { id: 'DDCC05', i18nKey: 'strengthExercises.exercises.DDCC05', section: 'hip_dominant_unilateral', level: 5, image: 'DDCC05. PUENTE GLÚTEO UL ALTERNO.webp' },
  { id: 'DDCC06', i18nKey: 'strengthExercises.exercises.DDCC06', section: 'hip_dominant_unilateral', level: 6, image: 'DDCC06. PUENTE GLÚTEO UNILATERAL.webp' },
  { id: 'DDCC07', i18nKey: 'strengthExercises.exercises.DDCC07', section: 'hip_dominant_unilateral', level: 7, image: 'DDCC07. PUENTE GLÚTEO UL (CAJON) .webp' },
  { id: 'DDCC08', i18nKey: 'strengthExercises.exercises.DDCC08', section: 'hip_dominant_unilateral', level: 8, image: 'DDCC08. PUENTE GLÚTEO UL (FITBALL).webp' },
  { id: 'DDCC09', i18nKey: 'strengthExercises.exercises.DDCC09', section: 'hip_dominant_unilateral', level: 9, image: 'DDCC09. PUENTE GLÚTEO UL (SLIDER).webp' },
  { id: 'DDCC10', i18nKey: 'strengthExercises.exercises.DDCC10', section: 'hip_dominant_unilateral', level: 10, image: 'DDCC10. HIP THRUST.webp' },
  { id: 'DDCC11', i18nKey: 'strengthExercises.exercises.DDCC11', section: 'hip_dominant_unilateral', level: 11, image: 'DDCC11. HIP THRUST (FITBALL).webp' },
  { id: 'DDCC12', i18nKey: 'strengthExercises.exercises.DDCC12', section: 'hip_dominant_unilateral', level: 12, image: 'DDCC12. HIP THRUST (M-KTB).webp' },
  { id: 'DDCC13', i18nKey: 'strengthExercises.exercises.DDCC13', section: 'hip_dominant_unilateral', level: 13, image: 'DDCC13. HIP THRUST (BARRA).webp' },
  { id: 'DDCC14', i18nKey: 'strengthExercises.exercises.DDCC14', section: 'hip_dominant_unilateral', level: 14, image: 'DDCC14. HIP THRUST ASM (M-KTB-B).webp' },
  { id: 'DDCC15', i18nKey: 'strengthExercises.exercises.DDCC15', section: 'hip_dominant_unilateral', level: 15, image: 'DDCC15. HIP THRUST UL (M-KTB-B).webp' },
  { id: 'DDCC16', i18nKey: 'strengthExercises.exercises.DDCC16', section: 'hip_dominant_unilateral', level: 16, image: 'DDCC16. HIP THRUST SALTO BIL.webp' },
  { id: 'DDCC17', i18nKey: 'strengthExercises.exercises.DDCC17', section: 'hip_dominant_unilateral', level: 17, image: 'DDCC17. HIP THRUST SALTO A CAJÓN BILATERAL.webp' },
  { id: 'DDCC18', i18nKey: 'strengthExercises.exercises.DDCC18', section: 'hip_dominant_unilateral', level: 18, image: 'DDCC18. HIP THRUST SALTO EN CAJÓN BILATERAL.webp' },
  { id: 'DDCC19', i18nKey: 'strengthExercises.exercises.DDCC19', section: 'hip_dominant_unilateral', level: 19, image: 'DDCC19. HIP THRUST SALTO A CAJÓN UNILATERAL.webp' },
  { id: 'DDCC20', i18nKey: 'strengthExercises.exercises.DDCC20', section: 'hip_dominant_unilateral', level: 20, image: 'DDCC20. HIP THRUST SALTO EN CAJÓN UNILATERAL.webp' },

  // ==========================================
  // EMPUJE HORIZONTAL (EH)
  // ==========================================
  { id: 'EH01', i18nKey: 'strengthExercises.exercises.EH01', section: 'horizontal_push', level: 1, image: 'EH01. EMPUJE EN PARED.webp' },
  { id: 'EH02', i18nKey: 'strengthExercises.exercises.EH02', section: 'horizontal_push', level: 2, image: 'EH02. FLEXIONES INCLINADAS EN BANCO.webp' },
  { id: 'EH03', i18nKey: 'strengthExercises.exercises.EH03', section: 'horizontal_push', level: 3, image: 'EH03. FLEXIONES RODILLAS.webp' },
  { id: 'EH04', i18nKey: 'strengthExercises.exercises.EH04', section: 'horizontal_push', level: 4, image: 'EH04. FLEXIONES.webp' },
  { id: 'EH05', i18nKey: 'strengthExercises.exercises.EH05', section: 'horizontal_push', level: 5, image: 'EH05. FLEXIONES ASIMÉTRICAS.webp' },
  { id: 'EH06', i18nKey: 'strengthExercises.exercises.EH06', section: 'horizontal_push', level: 6, image: 'EH06. FLEXIONES (LASTRE).webp' },
  { id: 'EH07', i18nKey: 'strengthExercises.exercises.EH07', section: 'horizontal_push', level: 7, image: 'EH07. FLEXIONES (TRX).webp' },
  { id: 'EH08', i18nKey: 'strengthExercises.exercises.EH08', section: 'horizontal_push', level: 8, image: 'EH08. PRESS BANCA (MANCUERNA).webp' },
  { id: 'EH09', i18nKey: 'strengthExercises.exercises.EH09', section: 'horizontal_push', level: 9, image: 'EH09. PRESS BANCA (BARRA).webp' },

  // ==========================================
  // EMPUJE VERTICAL (EV)
  // ==========================================
  { id: 'EV01', i18nKey: 'strengthExercises.exercises.EV01', section: 'vertical_push', level: 1, image: 'EV01. PRESS MILITAR (PICA).webp' },
  { id: 'EV02', i18nKey: 'strengthExercises.exercises.EV02', section: 'vertical_push', level: 2, image: 'EV02. PRESS MILITAR DE PIE (M).webp' },
  { id: 'EV03', i18nKey: 'strengthExercises.exercises.EV03', section: 'vertical_push', level: 3, image: 'EV03. PRESS MILITAR DE PIE (BARRA).webp' },
  { id: 'EV04', i18nKey: 'strengthExercises.exercises.EV04', section: 'vertical_push', level: 4, image: 'EV04.  PRESS MILITAR SENTADO (M).webp' },
  { id: 'EV05', i18nKey: 'strengthExercises.exercises.EV05', section: 'vertical_push', level: 5, image: 'EV05. PRESS MILITAR SENTADO (B).webp' },
  { id: 'EV06', i18nKey: 'strengthExercises.exercises.EV06', section: 'vertical_push', level: 6, image: 'EV06 PRESS MILITAR CABALLERO (M-KTB-B).webp' },
  { id: 'EV07', i18nKey: 'strengthExercises.exercises.EV07', section: 'vertical_push', level: 7, image: 'EV07 PRESS MILITAR ZANCADA (M-KTB-B).webp' },
  { id: 'EV08', i18nKey: 'strengthExercises.exercises.EV08', section: 'vertical_push', level: 8, image: 'EV08. PRESS MILITAR UP (M-KTB-B).webp' },
  { id: 'EV09', i18nKey: 'strengthExercises.exercises.EV09', section: 'vertical_push', level: 9, image: 'EV09. PUSH JERK (M-KTB-B).webp' },
  { id: 'EV10', i18nKey: 'strengthExercises.exercises.EV10', section: 'vertical_push', level: 10, image: 'EV10. SPLIT JERK (M-KTB-B).webp' },

  // ==========================================
  // TRACCIÓN HORIZONTAL (TH)
  // ==========================================
  { id: 'TH01', i18nKey: 'strengthExercises.exercises.TH01', section: 'horizontal_pull', level: 1, image: 'TH01. TRACCIÓN BIL ST (GOMA-POLEA).webp' },
  { id: 'TH02', i18nKey: 'strengthExercises.exercises.TH02', section: 'horizontal_pull', level: 2, image: 'TH02. TRACCIÓN BIL PIE (GOMA-POLEA).webp' },
  { id: 'TH03', i18nKey: 'strengthExercises.exercises.TH03', section: 'horizontal_pull', level: 3, image: 'TH03. REMO CERRADO (TRX).webp' },
  { id: 'TH04', i18nKey: 'strengthExercises.exercises.TH04', section: 'horizontal_pull', level: 4, image: 'TH04. REMO ABIERTO (TRX).webp' },
  { id: 'TH05', i18nKey: 'strengthExercises.exercises.TH05', section: 'horizontal_pull', level: 5, image: 'TH05. REMO PIES ELEVADOS (TRX).webp' },
  { id: 'TH06', i18nKey: 'strengthExercises.exercises.TH06', section: 'horizontal_pull', level: 6, image: 'TH06. REMO INVERTIDO (B).webp' },
  { id: 'TH07', i18nKey: 'strengthExercises.exercises.TH07', section: 'horizontal_pull', level: 7, image: 'TH07. REMO INVERTIDO P.E (B).webp' },
  { id: 'TH08', i18nKey: 'strengthExercises.exercises.TH08', section: 'horizontal_pull', level: 8, image: 'TH08. REMO UNILATERAL (TRX).webp' },
  { id: 'TH09', i18nKey: 'strengthExercises.exercises.TH09', section: 'horizontal_pull', level: 9, image: 'TH09. SEAL ROW (M-KTB-B).webp' },
  { id: 'TH10', i18nKey: 'strengthExercises.exercises.TH10', section: 'horizontal_pull', level: 10, image: 'TH10. REMO (M-KTB-B).webp' },

  // ==========================================
  // TRACCIÓN VERTICAL (TV)
  // ==========================================
  { id: 'TV01', i18nKey: 'strengthExercises.exercises.TV01', section: 'vertical_pull', level: 1, image: 'TV01. JALÓN SUPINO ST (G-P).webp' },
  { id: 'TV02', i18nKey: 'strengthExercises.exercises.TV02', section: 'vertical_pull', level: 2, image: 'TV02. JALÓN PRONO ST  (G-P).webp' },
  { id: 'TV03', i18nKey: 'strengthExercises.exercises.TV03', section: 'vertical_pull', level: 3, image: 'TV03. JALÓN SUPINO UL ST (G-P).webp' },
  { id: 'TV04', i18nKey: 'strengthExercises.exercises.TV04', section: 'vertical_pull', level: 4, image: 'TV04.  JALÓN PRONO UL ST (G-P).webp' },
  { id: 'TV05', i18nKey: 'strengthExercises.exercises.TV05', section: 'vertical_pull', level: 5, image: 'TV05. DOMINADA SUPINA (GOMA).webp' },
  { id: 'TV06', i18nKey: 'strengthExercises.exercises.TV06', section: 'vertical_pull', level: 6, image: 'TV06. DOMINADA PRONA (GOMA).webp' },
  { id: 'TV07', i18nKey: 'strengthExercises.exercises.TV07', section: 'vertical_pull', level: 7, image: 'TV07. DOMINADA SUPINA.webp' },
  { id: 'TV08', i18nKey: 'strengthExercises.exercises.TV08', section: 'vertical_pull', level: 8, image: 'TV08. DOMINADA NEUTRA.webp' },
  { id: 'TV09', i18nKey: 'strengthExercises.exercises.TV09', section: 'vertical_pull', level: 9, image: 'TV09. DOMINADA PRONA.webp' },
  { id: 'TV10', i18nKey: 'strengthExercises.exercises.TV10', section: 'vertical_pull', level: 10, image: 'TV10. DOMINADA LASTRADA.webp' },

  // ==========================================
  // PLIOMETRÍA VERTICAL (PV)
  // ==========================================
  { id: 'PV01', i18nKey: 'strengthExercises.exercises.PV01', section: 'vertical_plyometrics', level: 1, image: 'PV01. ATERRIZAJE 2P.webp' },
  { id: 'PV02', i18nKey: 'strengthExercises.exercises.PV02', section: 'vertical_plyometrics', level: 2, image: 'PV02. ATERRIZAJE 1P.webp' },
  { id: 'PV03', i18nKey: 'strengthExercises.exercises.PV03', section: 'vertical_plyometrics', level: 3, image: 'PV03. CAÍDA 2P.webp' },
  { id: 'PV04', i18nKey: 'strengthExercises.exercises.PV04', section: 'vertical_plyometrics', level: 4, image: 'PV04. CAÍDA 1P.webp' },
  { id: 'PV05', i18nKey: 'strengthExercises.exercises.PV05', section: 'vertical_plyometrics', level: 5, image: 'PV05. SALTO A CAJÓN 2P-2P.webp' },
  { id: 'PV06', i18nKey: 'strengthExercises.exercises.PV06', section: 'vertical_plyometrics', level: 6, image: 'PV06. JUMP VERTICAL 2P-2P.webp' },
  { id: 'PV07', i18nKey: 'strengthExercises.exercises.PV07', section: 'vertical_plyometrics', level: 7, image: 'PV07. DROP JUMP VERTICAL 2P-2P.webp' },
  { id: 'PV08', i18nKey: 'strengthExercises.exercises.PV08', section: 'vertical_plyometrics', level: 8, image: 'PV08. BOUND VERTICAL.webp' },
  { id: 'PV09', i18nKey: 'strengthExercises.exercises.PV09', section: 'vertical_plyometrics', level: 9, image: 'PV09.  SALTO A CAJÓN 2P-1P.webp' },
  { id: 'PV10', i18nKey: 'strengthExercises.exercises.PV10', section: 'vertical_plyometrics', level: 10, image: 'PV10.  BOUND VERTICAL A CAJÓN.webp' },
  { id: 'PV11', i18nKey: 'strengthExercises.exercises.PV11', section: 'vertical_plyometrics', level: 11, image: 'PV11. JUMP VERTICAL 2P-1P.webp' },
  { id: 'PV12', i18nKey: 'strengthExercises.exercises.PV12', section: 'vertical_plyometrics', level: 12, image: 'PV12. DROP JUMP VERTICAL 2P-1P.webp' },
  { id: 'PV13', i18nKey: 'strengthExercises.exercises.PV13', section: 'vertical_plyometrics', level: 13, image: 'PV13.  SALTO A CAJÓN 1P-1P.webp' },
  { id: 'PV14', i18nKey: 'strengthExercises.exercises.PV14', section: 'vertical_plyometrics', level: 14, image: 'PV14. POGO JUMPS.webp' },
  { id: 'PV15', i18nKey: 'strengthExercises.exercises.PV15', section: 'vertical_plyometrics', level: 15, image: 'PV15.  JUMP VERTICAL 2P DESDE SENTADO.webp' },
  { id: 'PV16', i18nKey: 'strengthExercises.exercises.PV16', section: 'vertical_plyometrics', level: 16, image: 'PV16. JUMPS ASISTIDOS.webp' },
  { id: 'PV17', i18nKey: 'strengthExercises.exercises.PV17', section: 'vertical_plyometrics', level: 17, image: 'PV17. DROP JUMP CAJÓN-CAJÓN 2P-2P.webp' },
  { id: 'PV18', i18nKey: 'strengthExercises.exercises.PV18', section: 'vertical_plyometrics', level: 18, image: 'PV18. DROP JUMP CAJÓN-CAJÓN 2P-1P.webp' },
  { id: 'PV19', i18nKey: 'strengthExercises.exercises.PV19', section: 'vertical_plyometrics', level: 19, image: 'PV19. HOP VERTICAL 1P-1P.webp' },
  { id: 'PV20', i18nKey: 'strengthExercises.exercises.PV20', section: 'vertical_plyometrics', level: 20, image: 'PV20. DROP JUMP VERTICAL 1P-1P.webp' },

  // ==========================================
  // PLIOMETRÍA FRONTAL (PF)
  // ==========================================
  { id: 'PF01', i18nKey: 'strengthExercises.exercises.PF01', section: 'frontal_plyometrics', level: 1, image: 'PF01. JUMP FRONTAL 2P-2P.webp' },
  { id: 'PF02', i18nKey: 'strengthExercises.exercises.PF02', section: 'frontal_plyometrics', level: 2, image: 'PF02. JUMP FRONTAL 2P-2P RESISTIDO.webp' },
  { id: 'PF03', i18nKey: 'strengthExercises.exercises.PF03', section: 'frontal_plyometrics', level: 3, image: 'PF03. JUMP FRONTAL CONTINUO 2P.webp' },
  { id: 'PF04', i18nKey: 'strengthExercises.exercises.PF04', section: 'frontal_plyometrics', level: 4, image: 'PF04. JUMP FRONTAL 2P-1P.webp' },
  { id: 'PF05', i18nKey: 'strengthExercises.exercises.PF05', section: 'frontal_plyometrics', level: 5, image: 'PF05. JUMP FRONTAL 2P-1P RESISTIDO.webp' },
  { id: 'PF06', i18nKey: 'strengthExercises.exercises.PF06', section: 'frontal_plyometrics', level: 6, image: 'PF06. BOUND FRONTAL.webp' },
  { id: 'PF07', i18nKey: 'strengthExercises.exercises.PF07', section: 'frontal_plyometrics', level: 7, image: 'PF07. BOUND FRONTAL RESISTIDO.webp' },
  { id: 'PF08', i18nKey: 'strengthExercises.exercises.PF08', section: 'frontal_plyometrics', level: 8, image: 'PF08. BOUND FRONTAL CONTINUO.webp' },
  { id: 'PF09', i18nKey: 'strengthExercises.exercises.PF09', section: 'frontal_plyometrics', level: 9, image: 'PF09. HOP FRONTAL 1P.webp' },
  { id: 'PF10', i18nKey: 'strengthExercises.exercises.PF10', section: 'frontal_plyometrics', level: 10, image: 'PF10. HOP FRONTAL CONTINUO 1P.webp' },
  { id: 'PF11', i18nKey: 'strengthExercises.exercises.PF11', section: 'frontal_plyometrics', level: 11, image: 'PF11. SALTO VALLA 2P.webp' },
  { id: 'PF12', i18nKey: 'strengthExercises.exercises.PF12', section: 'frontal_plyometrics', level: 12, image: 'PF12. SALTO VALLA CONTINUO 2P.webp' },
  { id: 'PF13', i18nKey: 'strengthExercises.exercises.PF13', section: 'frontal_plyometrics', level: 13, image: 'PF13. SALTO VALLA 1P.webp' },
  { id: 'PF14', i18nKey: 'strengthExercises.exercises.PF14', section: 'frontal_plyometrics', level: 14, image: 'PF14. SALTO VALLA CONTINUO 1P.webp' },
  { id: 'PF15', i18nKey: 'strengthExercises.exercises.PF15', section: 'frontal_plyometrics', level: 15, image: 'PF15. DROP JUMP + JUMP FRONTAL 2P.webp' },
  { id: 'PF16', i18nKey: 'strengthExercises.exercises.PF16', section: 'frontal_plyometrics', level: 16, image: 'PF16. DROP JUMP + JUMP FRONTAL 2P-1P.webp' },

  // ==========================================
  // PLIOMETRÍA LATERAL (PL)
  // ==========================================
  { id: 'PL01', i18nKey: 'strengthExercises.exercises.PL01', section: 'lateral_plyometrics', level: 1, image: 'PL01. DESACELERACIÓN LATERAL 2P.webp' },
  { id: 'PL02', i18nKey: 'strengthExercises.exercises.PL02', section: 'lateral_plyometrics', level: 2, image: 'PL02. DESACELERACIÓN LATERAL 1P.webp' },
  { id: 'PL03', i18nKey: 'strengthExercises.exercises.PL03', section: 'lateral_plyometrics', level: 3, image: 'PL03. CAÍDA LATERAL 2P.webp' },
  { id: 'PL04', i18nKey: 'strengthExercises.exercises.PL04', section: 'lateral_plyometrics', level: 4, image: 'PL04. CAÍDA LATERAL 1P.webp' },
  { id: 'PL05', i18nKey: 'strengthExercises.exercises.PL05', section: 'lateral_plyometrics', level: 5, image: 'PL05. PASOS LATERALES STEP.webp' },
  { id: 'PL06', i18nKey: 'strengthExercises.exercises.PL06', section: 'lateral_plyometrics', level: 6, image: 'PL06. JUMP LATERAL 2P-2P.webp' },
  { id: 'PL07', i18nKey: 'strengthExercises.exercises.PL07', section: 'lateral_plyometrics', level: 7, image: 'PL07. JUMP LATERAL 2P-1P.webp' },
  { id: 'PL08', i18nKey: 'strengthExercises.exercises.PL08', section: 'lateral_plyometrics', level: 8, image: 'PL08. SALTO LATERAL A CAJÓN 2P-2P.webp' },
  { id: 'PL09', i18nKey: 'strengthExercises.exercises.PL09', section: 'lateral_plyometrics', level: 9, image: 'PL09. SALTO LATERAL A CAJÓN 2P-1P.webp' },
  { id: 'PL10', i18nKey: 'strengthExercises.exercises.PL10', section: 'lateral_plyometrics', level: 10, image: 'PL10. BOUND LATERAL CONTINUO.webp' },
  { id: 'PL11', i18nKey: 'strengthExercises.exercises.PL11', section: 'lateral_plyometrics', level: 11, image: 'PL11. DROP JUMP LATERAL 2P-2P.webp' },
  { id: 'PL12', i18nKey: 'strengthExercises.exercises.PL12', section: 'lateral_plyometrics', level: 12, image: 'PL12. DROP JUMP LATERAL 2P-1P.webp' },
  { id: 'PL13', i18nKey: 'strengthExercises.exercises.PL13', section: 'lateral_plyometrics', level: 13, image: 'PL13. HOP LATERAL .webp' },
  { id: 'PL14', i18nKey: 'strengthExercises.exercises.PL14', section: 'lateral_plyometrics', level: 14, image: 'PL14. DROP JUMP LATERAL 1P-1P.webp' },
  { id: 'PL15', i18nKey: 'strengthExercises.exercises.PL15', section: 'lateral_plyometrics', level: 15, image: 'PL15. BOUND REACTIVO CAJÓN.webp' },
  { id: 'PL16', i18nKey: 'strengthExercises.exercises.PL16', section: 'lateral_plyometrics', level: 16, image: 'PL16. HOP LATERAL CONTINUO .webp' },
  { id: 'PL17', i18nKey: 'strengthExercises.exercises.PL17', section: 'lateral_plyometrics', level: 17, image: 'PL17. SALTO A CAJÓN 1P (LEJANA).webp' },
  { id: 'PL18', i18nKey: 'strengthExercises.exercises.PL18', section: 'lateral_plyometrics', level: 18, image: 'PL18. SALTO A CAJÓN 1P (CERCANA).webp' },
  { id: 'PL19', i18nKey: 'strengthExercises.exercises.PL19', section: 'lateral_plyometrics', level: 19, image: 'PL19. HOP REACTIVO CAJÓN.webp' },
  { id: 'PL20', i18nKey: 'strengthExercises.exercises.PL20', section: 'lateral_plyometrics', level: 20, image: 'PL20. SINGLE LEG LATERAL PUSHOFF.webp' },

  // ==========================================
  // ACELERACIÓN (AC)
  // ==========================================
  { id: 'AC01', i18nKey: 'strengthExercises.exercises.AC01', section: 'acceleration', level: 1, image: 'AC01. TRIPLE EXT DESDE SENTADO.webp' },
  { id: 'AC02', i18nKey: 'strengthExercises.exercises.AC02', section: 'acceleration', level: 2, image: 'AC02. WALL DRILLS.webp' },
  { id: 'AC03', i18nKey: 'strengthExercises.exercises.AC03', section: 'acceleration', level: 3, image: 'AC03. ACELERACIÓN DESDE CABALLERO.webp' },
  { id: 'AC04', i18nKey: 'strengthExercises.exercises.AC04', section: 'acceleration', level: 4, image: 'AC04. SKIP FRONTAL DINÁMICO.webp' },
  { id: 'AC05', i18nKey: 'strengthExercises.exercises.AC05', section: 'acceleration', level: 5, image: 'AC05. SKIP LATERAL DINÁMICO.webp' },
  { id: 'AC06', i18nKey: 'strengthExercises.exercises.AC06', section: 'acceleration', level: 6, image: 'AC06. FLEXIÓN CADERA + ACELERACIÓN.webp' },
  { id: 'AC07', i18nKey: 'strengthExercises.exercises.AC07', section: 'acceleration', level: 7, image: 'AC07. EMPUJE DE TRINEO.webp' },
  { id: 'AC08', i18nKey: 'strengthExercises.exercises.AC08', section: 'acceleration', level: 8, image: 'AC08. ACELERACIÓN CAMBIO DE PLANO.webp' },
  { id: 'AC09', i18nKey: 'strengthExercises.exercises.AC09', section: 'acceleration', level: 9, image: 'AC09. ACEL. RESIS CAMBIO DE PLANO.webp' },
  { id: 'AC10', i18nKey: 'strengthExercises.exercises.AC10', section: 'acceleration', level: 10, image: 'AC10. ACEL. FRONTAL RESISTIDA.webp' },

  // ==========================================
  // DESACELERACIÓN (DEC)
  // ==========================================
  { id: 'DEC01', i18nKey: 'strengthExercises.exercises.DEC01', section: 'deceleration', level: 1, image: 'DEC01. LANDING BILATERAL.webp' },
  { id: 'DEC02', i18nKey: 'strengthExercises.exercises.DEC02', section: 'deceleration', level: 2, image: 'DEC02. ZANCADA FRONTAL INESTABLE.webp' },
  { id: 'DEC03', i18nKey: 'strengthExercises.exercises.DEC03', section: 'deceleration', level: 3, image: 'DEC03. DESACELERACIÓN LATERAL.webp' },
  { id: 'DEC04', i18nKey: 'strengthExercises.exercises.DEC04', section: 'deceleration', level: 4, image: 'DEC04. DESAC. CAMBIO DE PLANO.webp' },
  { id: 'DEC05', i18nKey: 'strengthExercises.exercises.DEC05', section: 'deceleration', level: 5, image: 'DEC05. FRENAR TRAS ACELERAR.webp' },
  { id: 'DEC06', i18nKey: 'strengthExercises.exercises.DEC06', section: 'deceleration', level: 6, image: 'DEC06. CAÍDA LATERAL UL RESISTIDA.webp' },
  { id: 'DEC07', i18nKey: 'strengthExercises.exercises.DEC07', section: 'deceleration', level: 7, image: 'DEC07. ZANCADA DESACELERATIVA.webp' },
  { id: 'DEC08', i18nKey: 'strengthExercises.exercises.DEC08', section: 'deceleration', level: 8, image: 'DEC08. CAÍDA LAT UL + CAMBIO  PLANO.webp' },
  { id: 'DEC09', i18nKey: 'strengthExercises.exercises.DEC09', section: 'deceleration', level: 9, image: 'DEC09. DESACELERACIÓN BIL FRONTAL.webp' },
  { id: 'DEC10', i18nKey: 'strengthExercises.exercises.DEC10', section: 'deceleration', level: 10, image: 'DEC10. DESACELERACIÓN UL FRONTAL.webp' },

  // ==========================================
  // CAMBIO DE DIRECCIÓN (CDD)
  // ==========================================
  { id: 'CDD01', i18nKey: 'strengthExercises.exercises.CDD01', section: 'change_of_direction', level: 1, image: 'CDD01. SHUFFLE CORTO.webp' },
  { id: 'CDD02', i18nKey: 'strengthExercises.exercises.CDD02', section: 'change_of_direction', level: 2, image: 'CDD02. SHUFFLE LARGO.webp' },
  { id: 'CDD03', i18nKey: 'strengthExercises.exercises.CDD03', section: 'change_of_direction', level: 3, image: 'CDD03. ZANCADA LATERAL CON PARADA.webp' },
  { id: 'CDD04', i18nKey: 'strengthExercises.exercises.CDD04', section: 'change_of_direction', level: 4, image: 'CDD04. SHUFFLE LIFT & LOAD.webp' },
  { id: 'CDD05', i18nKey: 'strengthExercises.exercises.CDD05', section: 'change_of_direction', level: 5, image: 'CDD05. SALIDA LATERAL.webp' },
  { id: 'CDD06', i18nKey: 'strengthExercises.exercises.CDD06', section: 'change_of_direction', level: 6, image: 'CDD06. CAÍDA DE CAJÓN UL + SHUFFLE.webp' },
  { id: 'CDD07', i18nKey: 'strengthExercises.exercises.CDD07', section: 'change_of_direction', level: 7, image: 'CDD07. SALIDA LATERAL RESISTIDA.webp' },
  { id: 'CDD08', i18nKey: 'strengthExercises.exercises.CDD08', section: 'change_of_direction', level: 8, image: 'CDD08. BOUND LATERAL REACTIVO.webp' },
  { id: 'CDD09', i18nKey: 'strengthExercises.exercises.CDD09', section: 'change_of_direction', level: 9, image: 'CDD09. SALTO A VALLA + CDD.webp' },
  { id: 'CDD10', i18nKey: 'strengthExercises.exercises.CDD10', section: 'change_of_direction', level: 10, image: 'CDD10. BOUND LATERAL RESISTIDO.webp' },
  { id: 'CDD11', i18nKey: 'strengthExercises.exercises.CDD11', section: 'change_of_direction', level: 11, image: 'CDD11. CROSSOVER ISOMÉTRICO.webp' },
  { id: 'CDD12', i18nKey: 'strengthExercises.exercises.CDD12', section: 'change_of_direction', level: 12, image: 'CDD12. CROSSOVER LIFT & LOAD.webp' },
  { id: 'CDD13', i18nKey: 'strengthExercises.exercises.CDD13', section: 'change_of_direction', level: 13, image: 'CDD13. DESACELERACIÓN LATERAL + CDD.webp' },
  { id: 'CDD14', i18nKey: 'strengthExercises.exercises.CDD14', section: 'change_of_direction', level: 14, image: 'CDD14. DESACELERACIÓN FRONTAL + CDD.webp' },
  { id: 'CDD15', i18nKey: 'strengthExercises.exercises.CDD15', section: 'change_of_direction', level: 15, image: 'CDD15. CROSSOVER CON VALLA.webp' },
  { id: 'CDD16', i18nKey: 'strengthExercises.exercises.CDD16', section: 'change_of_direction', level: 16, image: 'CDD16. CROSSOVER TRANSVERSAL CON VALLA.webp' },
  { id: 'CDD17', i18nKey: 'strengthExercises.exercises.CDD17', section: 'change_of_direction', level: 17, image: 'CDD17. CROSSOVER.webp' },
  { id: 'CDD18', i18nKey: 'strengthExercises.exercises.CDD18', section: 'change_of_direction', level: 18, image: 'CDD18. CROSSOVER RESISTIDO.webp' },
  { id: 'CDD19', i18nKey: 'strengthExercises.exercises.CDD19', section: 'change_of_direction', level: 19, image: 'CDD19. BOUND LATERAL CON PARADA.webp' },
  { id: 'CDD20', i18nKey: 'strengthExercises.exercises.CDD20', section: 'change_of_direction', level: 20, image: 'CDD20. BOUNDS LATERALES CONTINUOS.webp' },
];

/**
 * Obtener la fuente de imagen local de un ejercicio de fuerza
 * Devuelve el resultado de require() para usar con <Image source={...} />
 */
export const getStrengthExerciseImage = (exerciseOrImageName) => {
  const imageName = typeof exerciseOrImageName === 'string' ? exerciseOrImageName : exerciseOrImageName.image;
  return imageMap[imageName] || null;
};


/**
 * Obtener la URL de la imagen de un ejercicio de fuerza (para uso en HTML/PDF)
 * NOTA: Las imágenes NO están en R2, esta función se mantiene solo para compatibilidad
 */
export const getStrengthExerciseImageUrl = (exerciseOrImageName) => {
  const imageName = typeof exerciseOrImageName === 'string' ? exerciseOrImageName : exerciseOrImageName.image;
  return `${R2_BASE_URL}/${encodeURIComponent(imageName)}`;
};

// IDs de ejercicios cuyos videos no existen en el servidor R2
export const MISSING_VIDEO_IDS = new Set([
  'MC14', 'MT05', 'MT08', 'MT09', 'MT12', 'MT13', 'CAE01', 'CAE02', 'CAE04',
  'CAE06', 'CAE07', 'CAE10', 'CAF01', 'CAF02', 'CAF05', 'CAF07', 'CAF08',
  'CAF11', 'CAF12', 'CAF16', 'CAF17', 'CAF18', 'CAF19', 'CAF20', 'CAR05',
  'CDD11'
]);

// Mapeos explícitos para nombres incorrectos o desplazados de R2
export const VIDEO_NAME_MAPPINGS = {
  'CAE05': 'CAE06. BEAR CRAWL “DINÁMICO”.mp4',
  'CAE08': 'CAE09. DEAD BUG.mp4',
  'CAE09': 'CAE10. DEAD BUG (CARGA).mp4',
  'CAE11': 'CAE12. ROLL OUT (FITBALL).mp4',
  'CAE12': 'CAE13. ROLL OUT (BARRA).mp4',
  'CAE13': 'CAE14.  FALL OUT RODILLAS (TRX).mp4',
  'CDD08': 'DD08. BOUND LATERAL REACTIVO.mp4',
  'MT07': 'MT07. EXCÉNTRICO GEMELO-SÓLEO.mp4',
  'DDRR17': 'DDRR17. ZANC LAT DINÁMICA (M-KTB-BARRA).mp4',
  'DDRR18': 'DDRR17. ZANC LAT DINÁMICA (M-KTB-BARRA).mp4',
  'DDRR19': 'DDRR18. SQ SPLIT SALTO UNIP (M-KTB-BARRA).mp4',
  'EV06': 'EV06. PRESS MILITAR CABALLERO (M-KTB-B).mp4',
  'EV07': 'EV07. PRESS MILITAR ZANCADA (M-KTB-B).mp4',
  'DR05': 'DR05. SENTADILLA SUMO (M-KTB).mp4',
  'DR07': 'DR07. SENTADILLA GOBLET (M-KTB).mp4',
};

const extractId = (str) => {
  if (!str) return '';
  const match = str.match(/^([A-Z0-9]+)[\.\s]/i);
  return match ? match[1] : '';
};

/**
 * Obtener la URL del video de un ejercicio de fuerza en Cloudflare R2
 */
export const getStrengthExerciseVideoUrl = (exerciseOrImageName) => {
  const urls = getStrengthExerciseVideoUrls(exerciseOrImageName);
  return urls.length ? urls[0] : '';
};

export const getStrengthExerciseVideoUrls = (exerciseOrImageName) => {
  if (!exerciseOrImageName) return [];
  
  let id = '';
  let imageName = '';
  if (typeof exerciseOrImageName === 'string') {
    imageName = exerciseOrImageName;
    id = extractId(imageName);
  } else {
    imageName = exerciseOrImageName.image || '';
    id = exerciseOrImageName.id || extractId(imageName);
  }

  if (MISSING_VIDEO_IDS.has(id)) {
    return [];
  }

  // 1. Si existe mapeo explícito en VIDEO_NAME_MAPPINGS
  if (id && VIDEO_NAME_MAPPINGS[id]) {
    return [`${R2_BASE_URL}/${encodeURIComponent(VIDEO_NAME_MAPPINGS[id])}`];
  }

  const baseName = imageName.replace(/\.webp$/i, '');
  const cleanSpaces = (str) => str.replace(/\s+/g, ' ').trim();
  const underscoreSpaces = (str) => str.replace(/\s+/g, '_');
  const removeAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const candidates = [];
  
  const transforms = [
    (s) => s,
    (s) => cleanSpaces(s),
    (s) => underscoreSpaces(s),
    (s) => removeAccents(s),
    (s) => cleanSpaces(removeAccents(s)),
    (s) => underscoreSpaces(removeAccents(s)),
  ];

  for (const transform of transforms) {
    const transformed = transform(baseName);
    const nfc = transformed.normalize('NFC');
    const nfd = transformed.normalize('NFD');
    
    candidates.push(nfc);
    candidates.push(nfd);
    candidates.push(nfc.toLowerCase());
    candidates.push(nfd.toLowerCase());
  }

  const uniqueCandidates = [...new Set(candidates)];
  const names = [];
  for (const cand of uniqueCandidates) {
    names.push(`${cand}.mp4`);
    names.push(`${cand}.MP4`);
    names.push(`${cand}.mov`);
    names.push(`${cand}.MOV`);
  }

  return [...new Set(names)].map((videoName) => `${R2_BASE_URL}/${encodeURIComponent(videoName)}`);
};

/**
 * Caché de disponibilidad de videos en R2
 * Valores: true (confirmado disponible) | { available: false, time: number } (no disponible con TTL)
 */
const videoAvailabilityCache = {};

/**
 * Verificar si un video existe en R2 (HEAD request con caché)
 * - Éxitos (200) se cachean permanentemente
 * - Fallos (404) se cachean con TTL de 2 minutos
 * - Errores de red NO se cachean y devuelven true (optimista) para mostrar el botón
 */
export const checkVideoAvailability = async (exerciseOrImageName) => {
  if (!exerciseOrImageName) return false;

  let id = '';
  let imageName = '';
  if (typeof exerciseOrImageName === 'string') {
    imageName = exerciseOrImageName;
    id = extractId(imageName);
  } else {
    imageName = exerciseOrImageName.image || '';
    id = exerciseOrImageName.id || extractId(imageName);
  }

  if (MISSING_VIDEO_IDS.has(id)) {
    return false;
  }

  // Web: omitir el HEAD preflight. R2 puede no permitir HEAD CORS y eso bloquea
  // la aparición del botón de play. Devolvemos true optimista; si el archivo no
  // existe el <video> emitirá `error` y el visor ya muestra fallback.
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return true;
  }

  const videoUrls = getStrengthExerciseVideoUrls(exerciseOrImageName);
  if (videoUrls.length === 0) return false;
  const videoName = videoUrls[0];

  const cached = videoAvailabilityCache[videoName];
  if (cached === true) return true;
  if (cached && typeof cached === 'object') {
    if (Date.now() - cached.time < 120000) return false;
    delete videoAvailabilityCache[videoName];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    for (const url of videoUrls) {
      const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
      if (response.ok) {
        clearTimeout(timeoutId);
        videoAvailabilityCache[videoName] = true;
        return true;
      }
    }
    clearTimeout(timeoutId);
    videoAvailabilityCache[videoName] = { available: false, time: Date.now() };
    return false;
  } catch {
    return true;
  }
};

/**
 * Obtener ejercicios por sección
 */
export const getExercisesBySection = (sectionId) => {
  return STRENGTH_EXERCISES.filter(ex => ex.section === sectionId).sort((a, b) => a.level - b.level);
};

/**
 * Obtener la información de sección para un ejercicio
 */
export const getSectionForExercise = (exerciseOrId) => {
  let exercise = exerciseOrId;
  if (typeof exerciseOrId === 'string') {
    exercise = STRENGTH_EXERCISES.find(e => e.id === exerciseOrId);
    if (!exercise) return null;
  }
  for (const category of STRENGTH_CATEGORIES) {
    const section = category.sections.find(s => s.id === exercise.section);
    if (section) return { category, section };
  }
  return null;
};

/**
 * Mapa de imágenes locales para los ejercicios de fuerza
 * Importado desde imageMap.js generado automáticamente
 */
export const STRENGTH_IMAGE_MAP = imageMap;
