/**
 * Mapa path → factory de import dinámico, espejo del usado en AppRouter.
 * Permite "warm-up" de chunks (preload on hover/focus) desde el Sidebar/Header.
 *
 * IMPORTANTE: las rutas/factories deben mantenerse sincronizadas con AppRouter.
 */
const preloaders = {
  '/': () => import('@/pages/Home'),
  '/season': () => import('@/pages/Season'),
  '/season/create': () => import('@/pages/CreateSeason'),
  '/tournaments': () => import('@/pages/Tournaments'),
  '/players': () => import('@/pages/Players'),
  '/exercises': () => import('@/pages/Exercises'),
  '/strategies': () => import('@/pages/Strategies'),
  '/set-pieces': () => import('@/pages/SetPieces'),
  '/training': () => import('@/pages/Training'),
  '/my-videos': () => import('@/pages/MyVideos'),
  '/video-editor': () => import('@/pages/VideoEditor'),
  '/methodology': () => import('@/pages/Methodology'),
  '/goalkeeper-methodology': () => import('@/pages/GoalkeeperMethodology'),
  '/wellness': () => import('@/pages/WellnessManagement'),
  '/wellness/templates': () => import('@/pages/WellnessTemplates'),
  '/rivals': () => import('@/pages/Rivals'),
  '/match-sheets': () => import('@/pages/MatchSheets'),
  '/injuries': () => import('@/pages/Injuries'),
  '/injuries/statistics': () => import('@/pages/InjuryStatistics'),
  '/injury-prevention': () => import('@/pages/InjuryPrevention'),
  '/rival-analysis': () => import('@/pages/RivalAnalysis'),
  '/anthropometry': () => import('@/pages/Anthropometry'),
  '/statistics': () => import('@/pages/Statistics'),
  '/nutrition': () => import('@/pages/Nutrition'),
  '/profile': () => import('@/pages/Profile'),
  '/tactical-board': () => import('@/pages/TacticalBoard'),
};

const warmed = new Set();

export function preloadRoute(path) {
  if (!path || warmed.has(path)) return;
  const factory = preloaders[path];
  if (!factory) return;
  warmed.add(path);
  // Disparo y olvido — errores de red se reintentarán cuando el usuario navegue.
  factory().catch(() => warmed.delete(path));
}
