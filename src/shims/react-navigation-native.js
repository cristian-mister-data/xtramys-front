/**
 * Shim mínimo de @react-navigation/native para componentes RN reutilizados en web.
 * Sustituye useNavigation, useRoute, useFocusEffect por adaptadores a react-router-dom.
 *
 * Registro nombre→path: las páginas wrapper llaman `registerScreens({ Field: '/tactical-board' })`.
 * Cuando código vendor llama navigation.navigate('Field'), se resuelve vía registry.
 */
import { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

const screenRegistry = Object.create(null);
export function registerScreens(map) {
  Object.assign(screenRegistry, map || {});
}

// Mapeo global nombres RN → rutas web. Centralizado para coherencia entre páginas.
registerScreens({
  // App
  Home: '/',
  Inicio: '/',
  Season: '/season',
  CreateSeason: '/season/create',
  CreateSeasonAndTeam: '/season/create',
  Tournaments: '/tournaments',
  Torneos: '/tournaments',
  Players: '/players',
  Jugadores: '/players',
  PlayerProfile: '/players',
  Profile: '/profile',
  Perfil: '/profile',
  // Exercises stack
  Exercises: '/exercises',
  ExercisesList: '/exercises',
  ExerciseList: '/exercises',
  CreateExerciseForm: '/exercises/create',
  // Strategies stack
  Strategies: '/strategies',
  StrategiesList: '/strategies',
  StrategyList: '/strategies',
  CreateStrategyForm: '/strategies/create',
  // Tactical board
  Field: '/tactical-board',
  TacticalBoard: '/tactical-board',
  // Training
  Training: '/training',
  Entrenamientos: '/training',
  OrganizeSeasonForm: '/training/organize',
  // Videos / editor
  MyVideos: '/my-videos',
  VideoEditor: '/video-editor',
  VideoPreview: '/video-editor',
  // Methodology
  Methodology: '/methodology',
  Metodologia: '/methodology',
  GoalkeeperMethodology: '/goalkeeper-methodology',
  // Wellness
  Wellness: '/wellness',
  WellnessManagement: '/wellness',
  WellnessTemplates: '/wellness/templates',
  // Rivals / analysis
  Rivals: '/rivals',
  Rivales: '/rivals',
  RivalAnalysis: '/rival-analysis',
  // Match sheets
  MatchSheets: '/match-sheets',
  MatchSheetList: '/match-sheets',
  // Injuries
  Injuries: '/injuries',
  Lesiones: '/injuries',
  InjuryStatistics: '/injuries/statistics',
  InjuryPrevention: '/injury-prevention',
  // Anthropometry
  Anthropometry: '/anthropometry',
  AnthropometryForm: '/anthropometry/form',
  AnthropometryDetail: '/anthropometry/detail',
  // Statistics
  Statistics: '/statistics',
  Estadisticas: '/statistics',
  // Nutrition
  Nutrition: '/nutrition',
  // Drawer aliases (RN drawer route names usados por el código vendor)
  InicioDrawer: '/',
  TemporadaDrawer: '/season',
  CrearTemporadaDrawer: '/season/create',
  TorneosDrawer: '/tournaments',
  JugadoresDrawer: '/players',
  EntrenamientoDrawer: '/training',
  FichasPartidoDrawer: '/match-sheets',
  LesionesDrawer: '/injuries',
  PrevencionLesionesDrawer: '/injury-prevention',
  EjerciciosDrawer: '/exercises',
  EstrategiasDrawer: '/strategies',
  PizarraDrawer: '/tactical-board',
  RivalesDrawer: '/rivals',
  AnalisisRivalDrawer: '/rival-analysis',
  MisVideosDrawer: '/my-videos',
  VideoEditorDrawer: '/video-editor',
  MetodologiaDrawer: '/methodology',
  MetodologiaPorterosDrawer: '/goalkeeper-methodology',
  WellnessDrawer: '/wellness',
  AntropometriaDrawer: '/anthropometry',
  EstadisticasDrawer: '/statistics',
  NutricionDrawer: '/nutrition',
});
export function resolveScreen(name) {
  if (typeof name !== 'string') return '/';
  if (name.startsWith('/')) return name;
  if (screenRegistry[name]) return screenRegistry[name];
  // Fallback: convierte CamelCase → /kebab-case
  return '/' + name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

// Contador in-app de navegaciones desde el arranque. Más fiable que
// window.history.length (que cuenta entradas externas del navegador).
let inAppNavCount = 0;

export function useNavigation() {
  const navigate = useNavigate();
  const trackedNavigate = (target, opts) => {
    inAppNavCount++;
    return navigate(target, opts);
  };
  return {
    navigate: (name, params) => trackedNavigate(resolveScreen(name), { state: params }),
    goBack: () => {
      // Si no hubo navegaciones in-app (usuario entró directo por URL),
      // navigate(-1) no haría nada útil. Fallback a home.
      if (inAppNavCount <= 0) {
        navigate('/', { replace: true });
        return;
      }
      inAppNavCount--;
      navigate(-1);
    },
    push: (name, params) => trackedNavigate(resolveScreen(name), { state: params }),
    replace: (name, params) => navigate(resolveScreen(name), { replace: true, state: params }),
    setOptions: () => {},
    addListener: () => () => {},
    canGoBack: () => true,
    dispatch: () => {},
    getState: () => ({ routes: [], index: 0 }),
  };
}

export function useRoute() {
  const location = useLocation();
  const params = useParams();
  return {
    name: location.pathname,
    params: { ...(params || {}), ...(location.state || {}) },
    key: location.key,
  };
}

export function useFocusEffect(callback) {
  // RN's useFocusEffect refires whenever the (memoised) callback identity
  // changes, since vendor code wraps it with useCallback(fn, [deps]). On web
  // we don't have focus events, so re-running on callback identity is the
  // closest equivalent — and it's what makes folder navigation in MyVideos
  // (and similar pages) actually reload content when currentFolder changes.
  useEffect(() => {
    const cleanup = callback();
    return typeof cleanup === 'function' ? cleanup : undefined;
  }, [callback]);
}

export function useIsFocused() { return true; }

export const NavigationContainer = ({ children }) => children;

export const CommonActions = {
  navigate: (name, params) => ({ type: 'NAVIGATE', payload: { name, params } }),
  goBack: () => ({ type: 'GO_BACK' }),
  reset: (state) => ({ type: 'RESET', payload: state }),
};

export default {
  useNavigation, useRoute, useFocusEffect, useIsFocused, NavigationContainer, CommonActions,
  registerScreens, resolveScreen,
};
