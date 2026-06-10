export const SITE_URL = 'https://xtramys.com';
export const BRAND = 'Xtramys';

export const defaultSeo = {
  es: {
    title: 'Xtramys | App para entrenadores de futbol y gestion de equipos',
    description:
      'Xtramys es la plataforma para entrenadores de futbol que centraliza entrenamientos, ejercicios, tactica, wellness, lesiones, fichas de partido, analisis rival y gestion de equipos.',
    keywords:
      'xtramys, app entrenador futbol, software entrenador futbol, gestion equipo futbol, planificador entrenamientos futbol, pizarra tactica, analisis rival, wellness futbol, fichas de partido',
  },
  en: {
    title: 'Xtramys | Football coaching app and team management software',
    description:
      'Xtramys helps football coaches manage training sessions, drills, tactics, wellness, injuries, match sheets, opponent analysis and complete team workflows in one platform.',
    keywords:
      'xtramys, football coaching app, soccer coaching software, team management app, football training planner, tactical board, opponent analysis, football wellness, match sheets',
  },
};

export const publicPages = [
  { path: '/', lang: 'es', changefreq: 'weekly', priority: '1.0' },
  { path: '/es', lang: 'es', changefreq: 'weekly', priority: '1.0' },
  { path: '/en', lang: 'en', changefreq: 'weekly', priority: '1.0' },
  { path: '/blog', lang: 'es', changefreq: 'weekly', priority: '0.8' },
  { path: '/es/blog', lang: 'es', changefreq: 'weekly', priority: '0.8' },
  { path: '/en/blog', lang: 'en', changefreq: 'weekly', priority: '0.8' },
];

export const blogPosts = [
  {
    slug: 'app-entrenador-futbol-gestion-equipo',
    date: '2026-06-10',
    es: {
      title: 'App para entrenador de futbol: como centralizar la gestion del equipo',
      description:
        'Guia para entrenadores que quieren organizar jugadores, sesiones, ejercicios, tactica, lesiones y partidos desde una sola plataforma.',
      category: 'Gestion de equipo',
      readingTime: '5 min',
      body: [
        'Un entrenador de futbol necesita tomar decisiones con informacion dispersa: asistencia, cargas, lesiones, convocatorias, analisis rival, tareas tacticas y evolucion individual de jugadores.',
        'Xtramys ordena ese trabajo diario en un entorno unico para que el cuerpo tecnico pueda planificar, ejecutar y revisar cada semana con menos friccion.',
        'La clave no es solo guardar datos, sino conectar las areas importantes del equipo: entrenamientos, fichas de partido, wellness, ejercicios, pizarra tactica y seguimiento medico-deportivo.',
      ],
    },
    en: {
      title: 'Football coaching app: how to centralize team management',
      description:
        'A practical guide for coaches who want to manage players, sessions, drills, tactics, injuries and matches from one platform.',
      category: 'Team management',
      readingTime: '5 min',
      body: [
        'A football coach makes decisions with information that is often scattered across notes, spreadsheets and messaging apps: attendance, workload, injuries, match squads, opponent analysis and tactical tasks.',
        'Xtramys brings that daily work into one professional workspace so staff can plan, execute and review every week with less friction.',
        'The value is not only storing data, but connecting the areas that matter: training sessions, match sheets, wellness, drills, tactical boards and player monitoring.',
      ],
    },
  },
  {
    slug: 'pizarra-tactica-online-futbol',
    date: '2026-06-10',
    es: {
      title: 'Pizarra tactica online para futbol: del dibujo al video',
      description:
        'Como una pizarra tactica digital ayuda a preparar tareas, automatizar videos y explicar ideas de juego al equipo.',
      category: 'Tactica',
      readingTime: '4 min',
      body: [
        'La pizarra tactica digital permite representar movimientos, roles, trayectorias y espacios de una forma mas clara que una imagen estatica.',
        'En Xtramys puedes crear graficos tacticos, guardar ejercicios, generar recursos visuales y utilizar videos para explicar tareas o comportamientos colectivos.',
        'Esto facilita que jugadores y cuerpo tecnico compartan una misma idea antes de saltar al campo.',
      ],
    },
    en: {
      title: 'Online tactical board for football: from diagram to video',
      description:
        'How a digital tactical board helps coaches prepare drills, create videos and explain game ideas to the squad.',
      category: 'Tactics',
      readingTime: '4 min',
      body: [
        'A digital tactical board makes movements, roles, trajectories and spaces easier to explain than a static image.',
        'With Xtramys, coaches can create tactical graphics, store drills, generate visual resources and use videos to communicate team behaviours.',
        'That helps players and staff share the same idea before going onto the pitch.',
      ],
    },
  },
  {
    slug: 'planificar-entrenamientos-futbol',
    date: '2026-06-10',
    es: {
      title: 'Planificar entrenamientos de futbol con ejercicios, cargas y seguimiento',
      description:
        'Buenas practicas para planificar sesiones de entrenamiento, controlar asistencia y conectar ejercicios con objetivos semanales.',
      category: 'Entrenamiento',
      readingTime: '5 min',
      body: [
        'Planificar un entrenamiento de futbol exige equilibrar objetivos tacticos, fisicos, tecnicos y competitivos.',
        'Una herramienta de planificacion permite construir sesiones, seleccionar ejercicios, ordenar tiempos de descanso y registrar observaciones para revisar el proceso.',
        'Con Xtramys, el entrenador puede transformar la planificacion semanal en informacion reutilizable para el equipo y para el analisis posterior.',
      ],
    },
    en: {
      title: 'Plan football training sessions with drills, workload and monitoring',
      description:
        'Best practices to plan training sessions, track attendance and connect drills with weekly objectives.',
      category: 'Training',
      readingTime: '5 min',
      body: [
        'Planning a football training session means balancing tactical, physical, technical and competitive objectives.',
        'A planning tool helps coaches build sessions, select drills, organize rest times and record notes for later review.',
        'Xtramys turns weekly planning into reusable information for the team and for post-session analysis.',
      ],
    },
  },
  {
    slug: 'analisis-rival-futbol',
    date: '2026-06-10',
    es: {
      title: 'Analisis rival en futbol: informes, videos y tareas para competir mejor',
      description:
        'Como organizar el analisis rival con plantillas, clips, patrones tacticos y documentos utiles para preparar partidos.',
      category: 'Analisis rival',
      readingTime: '4 min',
      body: [
        'El analisis rival no deberia quedarse en archivos sueltos. Para que sea util necesita estructura, criterios y una forma sencilla de compartir conclusiones.',
        'Xtramys permite organizar rivales, plantillas de analisis, videos, informes y tareas tacticas para que la preparacion del partido sea mas clara.',
        'Cuando el analisis esta conectado con la planificacion semanal, las ideas se transforman mejor en tareas de entrenamiento.',
      ],
    },
    en: {
      title: 'Opponent analysis in football: reports, videos and tasks to compete better',
      description:
        'How to organize opponent analysis with templates, clips, tactical patterns and practical match preparation documents.',
      category: 'Opponent analysis',
      readingTime: '4 min',
      body: [
        'Opponent analysis should not live in disconnected files. To be useful, it needs structure, criteria and a simple way to share conclusions.',
        'Xtramys helps organize opponents, analysis templates, videos, reports and tactical tasks so match preparation becomes clearer.',
        'When analysis connects with weekly planning, ideas become easier to turn into training tasks.',
      ],
    },
  },
];

export const getPostBySlug = (slug) => blogPosts.find((post) => post.slug === slug);

export const localizedPath = (path, lang) => {
  if (lang === 'en') {
    if (path === '/') return '/en';
    if (path.startsWith('/blog')) return `/en${path}`;
    return `/en${path}`;
  }
  if (path === '/') return '/';
  return path.startsWith('/es') ? path : `/es${path}`;
};
