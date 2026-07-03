import {
  MdHome,
  MdCalendarMonth,
  MdEmojiEvents,
  MdPeople,
  MdSportsSoccer,
  MdFitnessCenter,
  MdVideoLibrary,
  MdLibraryBooks,
  MdSportsHandball,
  MdTimer,
  MdFavorite,
  MdShield,
  MdDescription,
  MdMedicalServices,
  MdAnalytics,
  MdAccessibility,
  MdBarChart,
  MdRestaurant,
  MdHealthAndSafety,
  MdOutlineAssignment,
  MdMap,
  MdPerson,
  MdPersonSearch,
} from 'react-icons/md';

/**
 * Items de navegación de la app.
 * `keywords` se usan SOLO para el buscador (no se muestran).
 * Función para que las traducciones se evalúen en cada render.
 */
export function getNavSections(t, options = {}) {
  const sections = [
    {
      items: [
        {
          to: '/app', label: t('menu.home', 'Inicio'), end: true, Icon: MdHome,
          keywords: ['inicio', 'home', 'dashboard', 'panel']
        },
        {
          to: '/season', label: t('menu.season', 'Temporada'), Icon: MdCalendarMonth,
          keywords: ['temporada', 'season', 'calendario', 'eventos', 'partidos']
        },
        {
          to: '/tournaments', label: t('menu.tournaments', 'Torneos'), Icon: MdEmojiEvents,
          keywords: ['torneos', 'tournaments', 'competiciones', 'liga', 'copa']
        },
        {
          to: '/players', label: t('menu.players', 'Jugadores'), Icon: MdPeople,
          keywords: ['jugadores', 'players', 'plantilla', 'equipo']
        },
        ...(!options.isDemo ? [{
          to: '/friends', label: t('friends.title', 'Amigos'), Icon: MdPeople,
          keywords: ['amigos', 'friends', 'solicitudes', 'compartido']
        }] : []),
      ],
    },
    {
      title: t('menu.tools', 'Herramientas'),
      items: [
        {
          to: '/tactical-board', label: t('menu.tacticalBoard', 'Pizarra táctica'), Icon: MdMap,
          keywords: ['pizarra', 'tactica', 'tactical', 'board', 'campo', 'jugadas']
        },
        {
          to: '/exercises', label: t('menu.exercises', 'Ejercicios'), Icon: MdSportsSoccer,
          keywords: ['ejercicios', 'exercises', 'rondos', 'drill']
        },
        {
          to: '/strength-exercises', label: t('menu.strengthExercises', 'Ejercicios de Fuerza'), Icon: MdFitnessCenter,
          keywords: ['fuerza', 'strength', 'entrenamiento', 'coadyuvante', 'musculacion']
        },
        {
          to: '/strategies', label: t('menu.strategies', 'Estrategias'), Icon: MdOutlineAssignment,
          keywords: ['estrategias', 'strategies', 'aboc', 'jugadas']
        },
        {
          to: '/set-pieces', label: t('menu.setPieces', 'ABP'), Icon: MdSportsSoccer,
          keywords: ['abp', 'acciones a balon parado', 'set pieces', 'corner', 'corners', 'faltas', 'jugadas']
        },
        {
          to: '/my-videos', label: t('menu.myVideos', 'Mis Videos'), Icon: MdVideoLibrary,
          keywords: ['videos', 'mis videos', 'grabaciones', 'clips']
        },
      ],
    },
    {
      title: t('menu.management', 'Gestión'),
      items: [
        {
          to: '/methodology', label: t('menu.methodology', 'Metodología'), Icon: MdLibraryBooks,
          keywords: ['metodologia', 'methodology', 'plan']
        },
        {
          to: '/goalkeeper-methodology', label: t('menu.goalkeeperMethodology', 'Metodología porteros'), Icon: MdSportsHandball,
          keywords: ['porteros', 'goalkeeper', 'metodologia porteros', 'arquero']
        },
        {
          to: '/training', label: t('menu.training', 'Entrenamientos'), Icon: MdTimer,
          keywords: ['entrenamientos', 'training', 'sesiones', 'sesion']
        },
        {
          to: '/wellness', label: t('menu.wellness', 'Wellness'), Icon: MdFavorite,
          keywords: ['wellness', 'bienestar', 'salud', 'pre wellness']
        },
        {
          to: '/rivals', label: t('menu.rivals', 'Rivales'), Icon: MdShield,
          keywords: ['rivales', 'rivals', 'oponentes']
        },
        {
          to: '/match-sheets', label: t('menu.matchSheets', 'Fichas de partido'), Icon: MdDescription,
          keywords: ['fichas', 'match sheets', 'partido', 'lineup', 'alineacion', 'jornada']
        },
      ],
    },
    {
      title: t('menu.analysis', 'Análisis'),
      items: [
        {
          to: '/injuries', label: t('menu.injuries', 'Lesiones'), Icon: MdMedicalServices,
          keywords: ['lesiones', 'injuries', 'salud', 'lesionados']
        },
        {
          to: '/rival-analysis', label: t('menu.rivalAnalysis', 'Análisis rival'), Icon: MdAnalytics,
          keywords: ['analisis rival', 'rival analysis', 'scouting', 'rivales']
        },
        {
          to: '/scouting', label: t('menu.scouting', 'Scouting'), Icon: MdPersonSearch,
          keywords: ['scouting', 'ojeador', 'jugadores rivales', 'seguimiento', 'informes']
        },
        {
          to: '/anthropometry', label: t('menu.anthropometry', 'Antropometría'), Icon: MdAccessibility,
          keywords: ['antropometria', 'anthropometry', 'medidas', 'peso', 'altura']
        },
        {
          to: '/statistics', label: t('menu.statistics', 'Estadísticas'), Icon: MdBarChart,
          keywords: ['estadisticas', 'statistics', 'stats', 'metricas', 'datos']
        },
        {
          to: '/nutrition', label: t('menu.nutrition', 'Nutrición'), Icon: MdRestaurant,
          keywords: ['nutricion', 'nutrition', 'dieta', 'alimentacion']
        },
        {
          to: '/injury-prevention', label: t('menu.injuryPrevention', 'Prevención de lesiones'), Icon: MdHealthAndSafety,
          keywords: ['prevencion', 'injury prevention', 'lesiones']
        },
      ],
    },
    {
      title: t('menu.account', 'Cuenta'),
      items: [
        {
          to: '/profile', label: t('menu.profile', 'Perfil'), Icon: MdPerson,
          keywords: ['perfil', 'profile', 'cuenta', 'ajustes', 'usuario']
        },
      ],
      // No la mostramos en sidebar (el footer ya tiene la card con el avatar),
      // pero queremos que aparezca en el buscador.
      hiddenInSidebar: true,
    },
  ];

  return sections;
}

/**
 * Aplana las secciones a una lista de items para el buscador.
 */
export function getFlatNavItems(t, options = {}) {
  return getNavSections(t, options).flatMap((s) =>
    s.items.map((it) => ({
      ...it,
      section: s.title || '',
    }))
  );
}

/**
 * Normaliza string para búsqueda (quita acentos, lowercase).
 */
export function normalize(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Busca en items por label / keywords / section.
 * Devuelve los matches ordenados (label > keywords > section).
 */
export function searchNav(items, query, limit = 8) {
  const q = normalize(query).trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = items
    .map((it) => {
      const hayLabel = normalize(it.label);
      const hayKeywords = (it.keywords || []).map(normalize).join(' ');
      const haySection = normalize(it.section);

      let score = 0;
      for (const tk of tokens) {
        if (hayLabel.startsWith(tk)) score += 10;
        else if (hayLabel.includes(tk)) score += 6;
        else if (hayKeywords.includes(tk)) score += 3;
        else if (haySection.includes(tk)) score += 1;
        else return null; // requerimos que TODOS los tokens matcheen
      }
      return { item: it, score };
    })
    .filter(Boolean);

  scored.sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));
  return scored.slice(0, limit).map((s) => s.item);
}
