import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  Alert
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'styled-components';
import { getPlayerFullName } from '@/utils/playerHelpers';
import { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';

// Brand gradient stops (kept literal per migration rules — brand identity).
const BRAND_GRADIENT = ['#1a237e', '#3949ab', '#5c6bc0'];
const BRAND_PRIMARY = '#1a237e';
const BRAND_PRIMARY_LIGHT = '#3949ab';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';
import { fetchJugadoresEquipo } from '@/store/slices/player/playerThunks';
import { fetchInjuriesByTeam } from '@/store/slices/injury/injuryThunks';
import { fetchEntrenamientosPorEquipo, updateEntrenamiento, deleteEntrenamiento } from '@/store/slices/session/sessionThunks';
import { fetchEjerciciosUsuario, fetchGlobalExercises } from '@/store/slices/exercise/exerciseThunks';
import { mergeExercises, getSessionExerciseIds, getEntityId } from '@/utils/sessionExercises';
import { loadFormDraft, saveFormDraft, STORAGE_KEYS } from '@/utils/formPersistence';
import { fetchTemporadaUsuarioSeleccionada } from '@/store/slices/season/seasonThunks';
import { fetchMatchSheetsByTeam, updateMatchSheet, deleteMatchSheet } from '@/store/slices/matchSheet/matchSheetThunks';
import { fetchTournamentsByTeam } from '@/store/slices/tournament/tournamentThunks';
import { fetchRivalsByTeam } from '@/store/slices/rival/rivalThunks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '@/config';
import TrainingSessionDetailModal from '@/vendor/season/TrainingSessionDetailModal';
import MatchSheetDetailModal from '@/vendor/season/MatchSheetDetailModal';
import EditMatchSheetModal from '@/vendor/season/EditMatchSheetModal';
import EditSessionModal from '@/vendor/season/EditSessionModal';
import { toast } from '@/ui/toast';

// Función para detectar si es móvil
const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

// Función helper para formatear el año como "2025-2026"
const formatSeasonYear = (year) => {
  if (!year) return '';
  const currentYear = parseInt(year);
  const nextYear = currentYear + 1;
  return `${currentYear}-${nextYear}`;
};

const EMPTY_ARRAY = [];

const selectTeams = state => state.team.teams || EMPTY_ARRAY;
const selectPlayers = state => state.player.players || EMPTY_ARRAY;
const selectInjuries = state => state.injury.injuries || EMPTY_ARRAY;
const selectSessions = state => state.session.session || EMPTY_ARRAY;
const selectExercises = state => state.exercise.exercises || EMPTY_ARRAY;
const selectGlobalExercises = state => state.exercise.globalExercises || EMPTY_ARRAY;
const selectMatchSheets = state => state.matchSheet.matchSheets || EMPTY_ARRAY;
const selectExerciseTypes = state => state.exercise.exerciseTypes || EMPTY_ARRAY;

// Mapeo de rondas a claves i18n
const ROUND_I18N_KEYS = {
  final: 'tournaments.roundFinal',
  semifinal: 'tournaments.roundSemifinal',
  cuartos: 'tournaments.roundQuarters',
  octavos: 'tournaments.roundRound16',
  dieciseisavos: 'tournaments.roundRound32',
  treintaydosavos: 'tournaments.roundRound64',
};

export default function Home({ navigation: navigationProp }) {
  // Fallback: en web la pantalla se renderiza desde una page wrapper que no
  // pasa `navigation`, así que tomamos el del shim cuando falta.
  const navigationFromHook = useNavigation();
  const navigation = navigationProp || navigationFromHook;
  const route = useRoute();
  const addedExerciseFromRouteRef = useRef(null);
  const routerNavigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Redux state
  const temporada = useSelector(state => state.season.season);
  const seasonLoading = useSelector(state => state.season.loading);
  const user = useSelector(state => state.usuario.user);
  const equipos = useSelector(selectTeams);
  const jugadores = useSelector(selectPlayers);
  const lesiones = useSelector(selectInjuries);
  const sesiones = useSelector(selectSessions);
  const ejerciciosDisponibles = useSelector(selectExercises);
  const globalExercises = useSelector(selectGlobalExercises);
  const allExercises = useMemo(() => mergeExercises(ejerciciosDisponibles, globalExercises), [ejerciciosDisponibles, globalExercises]);
  const partidos = useSelector(selectMatchSheets);
  const tournaments = useSelector(state => state.tournament?.tournaments) || [];
  const rivals = useSelector(state => state.rival?.rivals) || [];

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [idUsuario, setIdUsuario] = useState("");
  const [initialSeasonLoaded, setInitialSeasonLoaded] = useState(false);
  
  // Estados para modales de detalle
  const [detailSessionVisible, setDetailSessionVisible] = useState(false);
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState(null);
  const [detailMatchVisible, setDetailMatchVisible] = useState(false);
  const [selectedMatchForDetail, setSelectedMatchForDetail] = useState(null);
  
  // Estados para modales de edición
  const [editSessionModalVisible, setEditSessionModalVisible] = useState(false);
  const [editMatchModalVisible, setEditMatchModalVisible] = useState(false);

  // Get selected team (memoizado para evitar re-cálculos)
  const equipoSeleccionado = useMemo(() =>
    equipos.find(equipo => equipo.seleccionado === true),
    [equipos]
  );

  // Obtener usuario desde Redux y fallback a AsyncStorage para pantallas vendor.
  useEffect(() => {
    const reduxUserId = user?._id || user?.id;
    if (reduxUserId) {
      setIdUsuario(reduxUserId);
      return;
    }

    (async () => {
      const stored = await AsyncStorage.getItem('usuario');
      const parsed = JSON.parse(stored || '{}');
      const u = parsed?._id || parsed?.id;
      if (u) setIdUsuario(u);
    })();
  }, [user?._id, user?.id]);

  // Cargar temporada seleccionada solo una vez al inicio
  useEffect(() => {
    let cancelled = false;

    if (idUsuario && !initialSeasonLoaded && !temporada) {
      (async () => {
        try {
          await dispatch(fetchTemporadaUsuarioSeleccionada({ usuario: idUsuario })).unwrap();
        } catch (error) {
          console.warn('Error loading selected season:', error);
        } finally {
          if (!cancelled) setInitialSeasonLoaded(true);
        }
      })();
    } else if (temporada && !initialSeasonLoaded) {
      setInitialSeasonLoaded(true);
    }

    return () => { cancelled = true; };
  }, [idUsuario, initialSeasonLoaded, temporada, dispatch]);

  useEffect(() => {
    if (idUsuario && initialSeasonLoaded && !seasonLoading && !temporada) {
      routerNavigate('/season/create', { replace: true });
    }
  }, [idUsuario, initialSeasonLoaded, seasonLoading, temporada, routerNavigate]);

  const handleCreateExerciseFromSession = useCallback(() => {
    saveFormDraft(STORAGE_KEYS.EXERCISE_LIST, { creating: true, editingExercise: null, addToTrainingDraft: true });
    saveFormDraft(STORAGE_KEYS.FIELD_RESULT, { kind: 'exercise', editingId: null });
    navigation.navigate('/exercises');
  }, [navigation]);

  useEffect(() => {
    const addExerciseId = route?.params?.addExerciseId;
    if (!addExerciseId || addedExerciseFromRouteRef.current === addExerciseId) return;
    const draft = loadFormDraft(STORAGE_KEYS.TRAINING_SESSION_DRAFT, { remove: false });
    if (!draft) return;
    saveFormDraft(STORAGE_KEYS.TRAINING_SESSION_DRAFT, { ...draft, addExerciseId });
    addedExerciseFromRouteRef.current = addExerciseId;
    if (draft.mode === 'edit') {
      setSelectedSessionForDetail(draft.session || null);
      setEditSessionModalVisible(true);
    }
  }, [route?.params?.addExerciseId]);

  // Cargar equipos cuando hay temporada
  useEffect(() => {
    if (temporada?._id) {
      dispatch(fetchEquiposTemporada({ season: temporada._id }));
    }
  }, [temporada?._id, dispatch]);

  // Cargar datos del equipo cuando hay equipo seleccionado
  useEffect(() => {
    if (equipoSeleccionado?._id && idUsuario) {
      loadTeamData();
    }
  }, [equipoSeleccionado?._id, idUsuario]);

  const loadTeamData = async () => {
    if (!equipoSeleccionado?._id || !idUsuario) return;

    try {
      await Promise.all([
        dispatch(fetchJugadoresEquipo({ team: equipoSeleccionado._id })),
        dispatch(fetchInjuriesByTeam({ team: equipoSeleccionado._id })),
        dispatch(fetchEntrenamientosPorEquipo({ team: equipoSeleccionado._id })),
        dispatch(fetchEjerciciosUsuario({ user: idUsuario })),
        dispatch(fetchGlobalExercises({ lang: i18n.language })),
        dispatch(fetchMatchSheetsByTeam(equipoSeleccionado._id)),
        dispatch(fetchTournamentsByTeam(equipoSeleccionado._id)),
        dispatch(fetchRivalsByTeam({ team: equipoSeleccionado._id }))
      ]);
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTeamData();
    setRefreshing(false);
  };

  // Calculate statistics (memoizado)
  const stats = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const lesionesActivas = lesiones.filter(lesion => {
      const fechaInicio = lesion.fechaInicio ? new Date(lesion.fechaInicio) : null;
      const fechaFin = lesion.fechaFin ? new Date(lesion.fechaFin) : null;

      if (!fechaInicio) return false;

      fechaInicio.setHours(0, 0, 0, 0);
      if (fechaFin) fechaFin.setHours(0, 0, 0, 0);

      return fechaInicio <= hoy && (!fechaFin || fechaFin >= hoy);
    }).length;

    const jugadoresLesionados = lesiones
      .filter(lesion => {
        const fechaInicio = lesion.fechaInicio ? new Date(lesion.fechaInicio) : null;
        const fechaFin = lesion.fechaFin ? new Date(lesion.fechaFin) : null;

        if (!fechaInicio) return false;

        fechaInicio.setHours(0, 0, 0, 0);
        if (fechaFin) fechaFin.setHours(0, 0, 0, 0);

        return fechaInicio <= hoy && (!fechaFin || fechaFin >= hoy);
      })
      .map(l => l.jugador?._id || l.jugador)
      .filter((value, index, self) => value && self.indexOf(value) === index)
      .length;

    // Calculate match statistics (only already played matches)
    const ahora = new Date();
    const partidosDisputados = partidos.filter(p => {
      const fechaPartido = p.fechaHora ? new Date(p.fechaHora) : null;
      return fechaPartido && fechaPartido <= ahora;
    });
    const partidosJugados = partidosDisputados.filter(p => p.resultado).length;
    const partidosGanados = partidosDisputados.filter(p => p.resultado === 'Victoria').length;
    const partidosEmpatados = partidosDisputados.filter(p => p.resultado === 'Empate').length;
    const partidosPerdidos = partidosDisputados.filter(p => p.resultado === 'Derrota').length;

    // Stats por torneo
    const torneoStats = {};
    const amistososList = [];
    partidosDisputados.forEach(p => {
      const tId = p.torneoId?._id || p.torneoId || null;
      if (!tId || p.competicion === 'amistoso') {
        amistososList.push(p);
        return;
      }
      if (!torneoStats[tId]) {
        torneoStats[tId] = { jugados: 0, ganados: 0, empatados: 0, perdidos: 0 };
      }
      if (p.resultado) torneoStats[tId].jugados++;
      if (p.resultado === 'Victoria') torneoStats[tId].ganados++;
      if (p.resultado === 'Empate') torneoStats[tId].empatados++;
      if (p.resultado === 'Derrota') torneoStats[tId].perdidos++;
    });

    // Amistosos stats
    const amistososStats = {
      jugados: amistososList.filter(p => p.resultado).length,
      ganados: amistososList.filter(p => p.resultado === 'Victoria').length,
      empatados: amistososList.filter(p => p.resultado === 'Empate').length,
      perdidos: amistososList.filter(p => p.resultado === 'Derrota').length,
    };

    return {
      lesionesActivas,
      jugadoresLesionados,
      partidosJugados,
      partidosGanados,
      partidosEmpatados,
      partidosPerdidos,
      torneoStats,
      amistososStats,
    };
  }, [lesiones, partidos]);

  // Get next and last session (memoizado)
  const { proximaSesion, ultimaSesion } = useMemo(() => {
    if (!sesiones || sesiones.length === 0) {
      return { proximaSesion: null, ultimaSesion: null };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Comparar solo por fecha, no hora

    const sesionesOrdenadas = sesiones
      .filter(sesion => {
        const fechaSesion = new Date(sesion.fecha);
        fechaSesion.setHours(0, 0, 0, 0);
        return fechaSesion >= now;
      })
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const sesionesPasadas = sesiones
      .filter(sesion => {
        const fechaSesion = new Date(sesion.fecha);
        fechaSesion.setHours(0, 0, 0, 0);
        return fechaSesion < now;
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    return {
      proximaSesion: sesionesOrdenadas[0] || null,
      ultimaSesion: sesionesPasadas[0] || null
    };
  }, [sesiones]);

  // Exercise previews for session cards
  const proximaSesionExercises = useMemo(() => {
    if (!proximaSesion) return EMPTY_ARRAY;
    const ids = getSessionExerciseIds(proximaSesion);
    return ids.map(id => allExercises.find(e => getEntityId(e) === id)).filter(Boolean);
  }, [proximaSesion, allExercises]);

  const ultimaSesionExercises = useMemo(() => {
    if (!ultimaSesion) return EMPTY_ARRAY;
    const ids = getSessionExerciseIds(ultimaSesion);
    return ids.map(id => allExercises.find(e => getEntityId(e) === id)).filter(Boolean);
  }, [ultimaSesion, allExercises]);

  // Get next and last match (memoizado)
  const { proximoPartido, ultimoPartido } = useMemo(() => {
    if (!partidos || partidos.length === 0) {
      return { proximoPartido: null, ultimoPartido: null };
    }

    const now = new Date();

    // Partidos futuros: fecha >= ahora, ordenados ascendente (el más cercano primero)
    const partidosFuturos = partidos
      .filter(partido => {
        const fechaPartido = partido.fechaHora ? new Date(partido.fechaHora) : null;
        if (!fechaPartido) return false;
        return fechaPartido >= now;
      })
      .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

    // Partidos pasados: fecha < ahora, ordenados descendente (el más reciente primero)
    const partidosPasados = partidos
      .filter(partido => {
        const fechaPartido = partido.fechaHora ? new Date(partido.fechaHora) : null;
        if (!fechaPartido) return false;
        return fechaPartido < now;
      })
      .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));

    return {
      proximoPartido: partidosFuturos[0] || null,
      ultimoPartido: partidosPasados[0] || null
    };
  }, [partidos]);

  const formatFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    const locale = i18n?.language && i18n.language.startsWith('es') ? 'es-ES' : 'en-US';
    return fecha.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const openSessionDetail = (session) => {
    if (!session || !session._id) return;
    setSelectedSessionForDetail(session);
    setDetailSessionVisible(true);
  };

  const openMatchDetail = (match) => {
    if (!match) return;
    setSelectedMatchForDetail(match);
    setDetailMatchVisible(true);
  };

  // Handler para guardar edición de ficha de partido
  const handleSaveMatchEdit = async (matchData) => {
    if (!equipoSeleccionado?._id || !matchData._id) return;
    await dispatch(updateMatchSheet({ id: matchData._id, data: matchData })).unwrap();
    dispatch(fetchMatchSheetsByTeam(equipoSeleccionado._id));
    Alert.alert(t('message.success'), t('season.matchSheetUpdated'));
  };

  // Handler para eliminar ficha de partido
  const handleDeleteMatch = async (matchId) => {
    if (!equipoSeleccionado?._id || !matchId) return;
    try {
      await dispatch(deleteMatchSheet(matchId)).unwrap();
      setEditMatchModalVisible(false);
      setDetailMatchVisible(false);
      setSelectedMatchForDetail(null);
      dispatch(fetchMatchSheetsByTeam(equipoSeleccionado._id));
      Alert.alert(t('message.success'), t('season.matchSheetDeleted'));
    } catch (error) {
      Alert.alert(t('message.error'), t('season.matchSheetDeleteError'));
    }
  };

  // Handler para guardar edición de sesión
  const handleSaveSessionEdit = async (sessionData) => {
    if (!equipoSeleccionado?._id || !sessionData._id) return;
    const ejerciciosIds = sessionData.ejercicios?.map(e =>
      typeof e === 'object' && e.ejercicio ? e.ejercicio : e
    ) || [];
    const ejerciciosDetalle = sessionData.ejercicios?.map((e, index) => ({
      ejercicio: typeof e === 'object' && e.ejercicio ? e.ejercicio : e,
      orden: index + 1,
      tiempoDescanso: typeof e === 'object' ? (e.tiempoDescanso || 0) : 0,
      teamAssignments: typeof e === 'object' ? (e.teamAssignments || []) : [],
    })) || [];
    const observaciones = sessionData.ejercicios?.filter(e => typeof e === 'object' && e.observacion).map(e => ({
      ejercicioId: e.ejercicio,
      observacion: e.observacion || '',
    })) || [];
    const result = await dispatch(updateEntrenamiento({
      id: sessionData._id,
      data: {
        fecha: sessionData.fecha,
        horaInicio: sessionData.horaInicio,
        horaFin: sessionData.horaFin,
        observaciones,
        ejercicios: ejerciciosIds,
        ejerciciosDetalle,
        jugadores: sessionData.jugadores || [],
        jugadoresExtras: sessionData.jugadoresExtras || [],
        expectedWellness: sessionData.expectedWellness,
        manualAverageWellness: sessionData.manualAverageWellness,
        ejerciciosFuerza: sessionData.ejerciciosFuerza || [],
      },
    }));
    if (result.error) throw new Error(result.error.message);
    dispatch(fetchEntrenamientosPorEquipo({ team: equipoSeleccionado._id }));
    toast.success(t('season.sessionUpdated'));
  };

  // Handler para eliminar sesión
  const handleDeleteSession = async (sessionId) => {
    if (!equipoSeleccionado?._id || !sessionId) return;
    try {
      await dispatch(deleteEntrenamiento(sessionId)).unwrap();
      setEditSessionModalVisible(false);
      setDetailSessionVisible(false);
      setSelectedSessionForDetail(null);
      dispatch(fetchEntrenamientosPorEquipo({ team: equipoSeleccionado._id }));
      toast.success(t('season.sessionDeleted'));
    } catch (error) {
      toast.error(t('season.sessionDeleteError'));
    }
  };

  // Obtener exerciseTypes del store para el modal de detalle
  const exerciseTypes = useSelector(selectExerciseTypes);

  // Calcular el porcentaje de victorias
  const winPercentage = stats.partidosJugados > 0 
    ? Math.round((stats.partidosGanados / stats.partidosJugados) * 100) 
    : 0;

  const [statsTab, setStatsTab] = useState('total'); // 'total' | 'amistosos' | tournamentId

  // Stats del torneo seleccionado
  const selectedTournamentStats = statsTab === 'amistosos'
    ? stats.amistososStats
    : (statsTab !== 'total' && stats.torneoStats[statsTab]
        ? stats.torneoStats[statsTab]
        : null);

  const currentWinPercentage = statsTab === 'total'
    ? winPercentage
    : (selectedTournamentStats && selectedTournamentStats.jugados > 0
        ? Math.round((selectedTournamentStats.ganados / selectedTournamentStats.jugados) * 100)
        : 0);

  // porcentaje de plantel lesionado
  const injuryPercentage = jugadores.length > 0
    ? Math.round((stats.jugadoresLesionados / jugadores.length) * 100)
    : 0;

  if (!temporada) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconContainer}>
            <Ionicons name="football" size={48} color={theme.colors.primary} />
          </View>
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>{t('home.loadingSeason')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
      }
    >
      {/* ========== HERO HEADER ========== */}
      <View style={styles.heroContainer}>
        <View style={styles.heroContent}>
          <Text style={styles.heroWelcome}>{t("home.welcome")}</Text>
          <Text style={styles.heroSeason}>
            {temporada.año ? formatSeasonYear(temporada.año) : temporada.nombre}
          </Text>
          
          {equipoSeleccionado && (
            <TouchableOpacity 
              style={styles.heroTeamCard}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('JugadoresDrawer')}
            >
              <View style={styles.heroTeamContent}>
                <View style={styles.heroTeamIcon}>
                  {equipoSeleccionado.escudo ? (
                    <Image 
                      source={{ uri: equipoSeleccionado.escudo }} 
                      style={styles.heroTeamBadge} 
                    />
                  ) : (
                    <Ionicons name="shield" size={20} color={theme.colors.primary} />
                  )}
                </View>
                <View style={styles.heroTeamInfo}>
                  <Text style={styles.heroTeamName}>{equipoSeleccionado.nombre}</Text>
                  <Text style={styles.heroTeamCategory}>{equipoSeleccionado.categoria}</Text>
                </View>
                <View style={styles.heroTeamArrow}>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ========== QUICK STATS FLOATING CARDS ========== */}
      <View style={styles.quickStatsContainer}>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatCard}>
            <View style={styles.quickStatContent}>
              <View style={[styles.quickStatIconBg, { backgroundColor: theme.colors.primarySoft }]}>
                <Ionicons name="people" size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.quickStatNumber}>{jugadores.length}</Text>
              <Text style={styles.quickStatLabel}>{t('player.players')}</Text>
            </View>
          </View>

          <View style={styles.quickStatCard}>
            <View style={styles.quickStatContent}>
              <View style={[styles.quickStatIconBg, { backgroundColor: theme.colors.purpleSoft }]}>
                <Ionicons name="fitness" size={20} color={theme.colors.purple} />
              </View>
              <Text style={styles.quickStatNumber}>{sesiones.length}</Text>
              <Text style={styles.quickStatLabel}>{t('home.sessions')}</Text>
            </View>
          </View>

          <View style={styles.quickStatCard}>
            <View style={styles.quickStatContent}>
              <View style={[styles.quickStatIconBg, { backgroundColor: theme.colors.successSoft }]}>
                <Ionicons name="football" size={20} color={theme.colors.success} />
              </View>
              <Text style={styles.quickStatNumber}>{stats.partidosJugados}</Text>
              <Text style={styles.quickStatLabel}>{t('home.played')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ========== MATCH PERFORMANCE CARD ========== */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderModern}>
          <View style={[styles.sectionIconContainer, { backgroundColor: theme.colors.primarySoft }]}>
            <Ionicons name="stats-chart" size={18} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.sectionTitleModern}>{t('home.matchStats')}</Text>
          </View>
        </View>

        {/* Stats tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsTabs} contentContainerStyle={{ paddingHorizontal: 4 }}>
          {[
            { key: 'total', label: t('home.total') || 'Total' },
            ...tournaments.map(tr => ({ key: tr._id, label: tr.nombre })),
            { key: 'amistosos', label: t('matchSheet.friendlies') || 'Amistosos' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.statsTab, statsTab === tab.key && styles.statsTabActive]}
              onPress={() => setStatsTab(tab.key)}
            >
              <Text style={[styles.statsTabText, statsTab === tab.key && styles.statsTabTextActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.performanceCard}>
          <View style={styles.performanceGradient}>
            {/* Win Rate Circle */}
            <View style={styles.winRateSection}>
              <View style={[styles.winRateCircle, { 
                backgroundColor: currentWinPercentage >= 50 ? theme.colors.successSoft : theme.colors.warningSoft 
              }]}>
                <Text style={[styles.winRateNumber, { 
                  color: currentWinPercentage >= 50 ? theme.colors.success : theme.colors.warning 
                }]}>
                  {currentWinPercentage}%
                </Text>
                <Text style={[styles.winRateLabel, { 
                  color: currentWinPercentage >= 50 ? theme.colors.successSoftText : theme.colors.warningSoftText 
                }]}>{t('home.wins')}</Text>
              </View>
            </View>

            {/* Match Stats Grid */}
            <View style={styles.matchGridContainer}>
              <View style={styles.matchGridRow}>
                <View style={[styles.matchGridItem, { backgroundColor: theme.colors.background }]}>
                  <View style={[styles.matchGridIconBg, { backgroundColor: theme.colors.successSoft }]}>
                    <Ionicons name="trophy" size={16} color={theme.colors.success} />
                  </View>
                  <Text style={styles.matchGridNumber}>
                    {statsTab === 'total' ? stats.partidosGanados : (selectedTournamentStats?.ganados || 0)}
                  </Text>
                  <Text style={styles.matchGridLabel}>{t('home.won')}</Text>
                </View>

                <View style={[styles.matchGridItem, { backgroundColor: theme.colors.background }]}>
                  <View style={[styles.matchGridIconBg, { backgroundColor: theme.colors.warningSoft }]}>
                    <Ionicons name="remove-circle" size={16} color={theme.colors.warning} />
                  </View>
                  <Text style={styles.matchGridNumber}>
                    {statsTab === 'total' ? stats.partidosEmpatados : (selectedTournamentStats?.empatados || 0)}
                  </Text>
                  <Text style={styles.matchGridLabel}>{t('home.drawn')}</Text>
                </View>

                <View style={[styles.matchGridItem, { backgroundColor: theme.colors.background }]}>
                  <View style={[styles.matchGridIconBg, { backgroundColor: theme.colors.errorSoft }]}>
                    <Ionicons name="close-circle" size={16} color={theme.colors.error} />
                  </View>
                  <Text style={styles.matchGridNumber}>
                    {statsTab === 'total' ? stats.partidosPerdidos : (selectedTournamentStats?.perdidos || 0)}
                  </Text>
                  <Text style={styles.matchGridLabel}>{t('home.lost')}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ========== PRÓXIMO PARTIDO ========== */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderModern}>
          <View style={[styles.sectionIconContainer, { backgroundColor: theme.colors.primarySoft }]}>
            <Ionicons name="football" size={18} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.sectionTitleModern}>{t('home.nextMatch')}</Text>
          </View>
        </View>

        {proximoPartido ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openMatchDetail(proximoPartido)}
          >
            <View style={styles.matchCardModern}>
              <View style={styles.matchCardContent}>
                <View style={styles.matchCardHeader}>
                  {proximoPartido.fechaHora && (
                    <View style={styles.matchDateContainer}>
                      <View style={[styles.matchDateBadge, { backgroundColor: theme.colors.backgroundAlt }]}>
                        <Text style={[styles.matchDateWeekday, { color: theme.colors.textMuted }]}>
                          {new Date(proximoPartido.fechaHora).toLocaleDateString(i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US', { weekday: 'short' }).toUpperCase()}
                        </Text>
                        <Text style={[styles.matchDateDay, { color: theme.colors.text }]}>
                          {new Date(proximoPartido.fechaHora).getDate()}
                        </Text>
                        <Text style={[styles.matchDateMonth, { color: theme.colors.textSecondary }]}>
                          {new Date(proximoPartido.fechaHora).toLocaleDateString(i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US', { month: 'short' }).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  <View style={styles.matchMainInfo}>
                    <Text style={[styles.matchRivalText, { color: theme.colors.text }]} numberOfLines={1}>
                      vs {proximoPartido.rival || t('home.rivalToBeDetermined')}
                    </Text>
                    <View style={styles.matchInfoRow}>
                      {(proximoPartido.fase === 'eliminatoria' && proximoPartido.ronda) ? (
                        <View style={[styles.matchInfoChip, { backgroundColor: theme.colors.backgroundAlt }]}>
                          <Ionicons name="trophy" size={12} color={theme.colors.textSecondary} />
                          <Text style={[styles.matchInfoChipText, { color: theme.colors.textSecondary }]}>
                            {t(ROUND_I18N_KEYS[proximoPartido.ronda] || proximoPartido.ronda)}
                            {proximoPartido.pierna === 'ida' ? ` (${t('matchSheet.fields.legFirst')})` : proximoPartido.pierna === 'vuelta' ? ` (${t('matchSheet.fields.legSecond')})` : proximoPartido.pierna === 'unico' ? ` (${t('matchSheet.fields.legSingle')})` : ''}
                          </Text>
                        </View>
                      ) : (proximoPartido.fase === 'grupos' && proximoPartido.grupo) ? (
                        <View style={[styles.matchInfoChip, { backgroundColor: theme.colors.backgroundAlt }]}>
                          <Ionicons name="flag" size={12} color={theme.colors.textSecondary} />
                          <Text style={[styles.matchInfoChipText, { color: theme.colors.textSecondary }]}>
                            {t('matchSheet.fields.groupN', { n: proximoPartido.grupo })}{proximoPartido.jornada ? ` · ${t('matchSheet.fields.matchday')} ${proximoPartido.jornada}` : ''}
                          </Text>
                        </View>
                      ) : proximoPartido.jornada ? (
                        <View style={[styles.matchInfoChip, { backgroundColor: theme.colors.backgroundAlt }]}>
                          <Ionicons name="flag" size={12} color={theme.colors.textSecondary} />
                          <Text style={[styles.matchInfoChipText, { color: theme.colors.textSecondary }]}>{t('season.matchday')} {proximoPartido.jornada}</Text>
                        </View>
                      ) : null}
                      {proximoPartido.ubicacion && (
                        <View style={[styles.matchInfoChip, { backgroundColor: theme.colors.backgroundAlt }]}>
                          <Ionicons name={['Casa','local'].includes(proximoPartido.ubicacion) ? 'home' : 'airplane'} size={12} color={theme.colors.textSecondary} />
                          <Text style={[styles.matchInfoChipText, { color: theme.colors.textSecondary }]}>
                            {['Casa','local'].includes(proximoPartido.ubicacion) ? t('matchSheet.modals.home') : ['Fuera','visitante'].includes(proximoPartido.ubicacion) ? t('matchSheet.modals.away') : t('matchSheet.modals.neutral')}
                          </Text>
                        </View>
                      )}
                      {proximoPartido.torneoId && typeof proximoPartido.torneoId === 'object' && proximoPartido.torneoId.nombre && (
                        <View style={[styles.matchInfoChip, { backgroundColor: theme.colors.backgroundAlt }]}>
                          <Ionicons name="trophy" size={12} color={theme.colors.textSecondary} />
                          <Text style={[styles.matchInfoChipText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{proximoPartido.torneoId.nombre}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={[styles.matchPendingBadge, { backgroundColor: theme.colors.primarySoft }]}>
                    <Ionicons name="time" size={14} color={theme.colors.primary} />
                    <Text style={[styles.matchPendingText, { color: theme.colors.primary }]}>{t('home.pending')}</Text>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.emptyMatchCard} activeOpacity={0.8} onPress={() => navigation.navigate('FichasPartidoDrawer')} accessibilityRole="button" accessibilityLabel="Ir a fichas de partido">
            <View style={styles.emptyMatchIcon}>
              <Ionicons name="football-outline" size={40} color={theme.colors.textDisabled} />
            </View>
            <Text style={styles.emptyMatchTitle}>{t('home.noMatchesScheduled')}</Text>
            <Text style={styles.emptyMatchSubtitle}>{t('home.createMatchSheet')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ========== ÚLTIMO PARTIDO ========== */}
      {ultimoPartido && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderModern}>
            <View style={[styles.sectionIconContainer, {
              backgroundColor: 
                ultimoPartido.resultado === 'Victoria' ? theme.colors.successSoft :
                ultimoPartido.resultado === 'Empate' ? theme.colors.warningSoft : theme.colors.errorSoft
            }]}>
              <Ionicons 
                name={
                  ultimoPartido.resultado === 'Victoria' ? 'trophy' :
                  ultimoPartido.resultado === 'Empate' ? 'remove-circle' : 'close-circle'
                } 
                size={18} 
                color={
                  ultimoPartido.resultado === 'Victoria' ? theme.colors.success :
                  ultimoPartido.resultado === 'Empate' ? theme.colors.warning : theme.colors.error
                } 
              />
            </View>
            <View>
              <Text style={styles.sectionTitleModern}>{t('home.lastMatch')}</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openMatchDetail(ultimoPartido)}
          >
            <View style={styles.lastMatchCardModern}>
              <View style={[
                styles.lastMatchResultIndicator,
                { backgroundColor: 
                  ultimoPartido.resultado === 'Victoria' ? theme.colors.success :
                  ultimoPartido.resultado === 'Empate' ? theme.colors.warning : theme.colors.error
                }
              ]} />
              
              <View style={styles.lastMatchContent}>
                <View style={styles.lastMatchLeft}>
                  {ultimoPartido.fechaHora && (
                    <View style={styles.lastMatchDateBadge}>
                      <Text style={styles.lastMatchDateWeekday}>
                        {new Date(ultimoPartido.fechaHora).toLocaleDateString(i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US', { weekday: 'short' }).toUpperCase()}
                      </Text>
                      <Text style={styles.lastMatchDateDay}>
                        {new Date(ultimoPartido.fechaHora).getDate()}
                      </Text>
                      <Text style={styles.lastMatchDateMonth}>
                        {new Date(ultimoPartido.fechaHora).toLocaleDateString(i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US', { month: 'short' }).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.lastMatchMiddle}>
                  <Text style={styles.lastMatchRivalText} numberOfLines={1}>
                    vs {ultimoPartido.rival}
                  </Text>
                  
                  <View style={styles.lastMatchScoreContainer}>
                    <Text style={[
                      styles.lastMatchScore,
                      { color: 
                        ultimoPartido.resultado === 'Victoria' ? theme.colors.success :
                        ultimoPartido.resultado === 'Empate' ? theme.colors.warning : theme.colors.error
                      }
                    ]}>
                      {ultimoPartido.ubicacion === 'Casa' || ultimoPartido.ubicacion === 'local'
                        ? `${ultimoPartido.golesFavor ?? '-'} - ${ultimoPartido.golesContra ?? '-'}`
                        : `${ultimoPartido.golesContra ?? '-'} - ${ultimoPartido.golesFavor ?? '-'}`
                      }
                    </Text>
                  </View>
                  
                  <View style={styles.lastMatchTags}>
                    {(ultimoPartido.fase === 'eliminatoria' && ultimoPartido.ronda) ? (
                      <View style={styles.lastMatchTag}>
                        <Text style={styles.lastMatchTagText}>
                          {t(ROUND_I18N_KEYS[ultimoPartido.ronda] || ultimoPartido.ronda)}
                          {ultimoPartido.pierna === 'ida' ? ` (${t('matchSheet.fields.legFirst')})` : ultimoPartido.pierna === 'vuelta' ? ` (${t('matchSheet.fields.legSecond')})` : ultimoPartido.pierna === 'unico' ? ` (${t('matchSheet.fields.legSingle')})` : ''}
                        </Text>
                      </View>
                    ) : (ultimoPartido.fase === 'grupos' && ultimoPartido.grupo) ? (
                      <View style={styles.lastMatchTag}>
                        <Text style={styles.lastMatchTagText}>
                          {t('matchSheet.fields.groupN', { n: ultimoPartido.grupo })}{ultimoPartido.jornada ? ` · ${t('matchSheet.fields.matchday')} ${ultimoPartido.jornada}` : ''}
                        </Text>
                      </View>
                    ) : ultimoPartido.jornada ? (
                      <View style={styles.lastMatchTag}>
                        <Text style={styles.lastMatchTagText}>{t('matchSheet.fields.matchday')} {ultimoPartido.jornada}</Text>
                      </View>
                    ) : null}
                    {ultimoPartido.ubicacion && (
                      <View style={styles.lastMatchTag}>
                        <Ionicons name={['Casa','local'].includes(ultimoPartido.ubicacion) ? 'home-outline' : ['Fuera','visitante'].includes(ultimoPartido.ubicacion) ? 'airplane-outline' : 'location-outline'} size={10} color={theme.colors.textSecondary} />
                        <Text style={styles.lastMatchTagText}>
                          {['Casa','local'].includes(ultimoPartido.ubicacion) ? t('matchSheet.modals.home') : ['Fuera','visitante'].includes(ultimoPartido.ubicacion) ? t('matchSheet.modals.away') : t('matchSheet.modals.neutral')}
                        </Text>
                      </View>
                    )}
                    {ultimoPartido.torneoId && typeof ultimoPartido.torneoId === 'object' && ultimoPartido.torneoId.nombre && (
                      <View style={styles.lastMatchTag}>
                        <Ionicons name="trophy" size={10} color={ultimoPartido.torneoId.color || theme.colors.textSecondary} />
                        <Text style={[styles.lastMatchTagText, { color: ultimoPartido.torneoId.color || theme.colors.textSecondary }]} numberOfLines={1}>{ultimoPartido.torneoId.nombre}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.lastMatchRight}>
                  <View style={[
                    styles.lastMatchResultBadge,
                    { backgroundColor: 
                      ultimoPartido.resultado === 'Victoria' ? theme.colors.successSoft :
                      ultimoPartido.resultado === 'Empate' ? theme.colors.warningSoft : theme.colors.errorSoft
                    }
                  ]}>
                    <Ionicons 
                      name={
                        ultimoPartido.resultado === 'Victoria' ? 'trophy' :
                        ultimoPartido.resultado === 'Empate' ? 'remove-circle' : 'close-circle'
                      } 
                      size={18} 
                      color={
                        ultimoPartido.resultado === 'Victoria' ? theme.colors.success :
                        ultimoPartido.resultado === 'Empate' ? theme.colors.warning : theme.colors.error
                      }
                    />
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textDisabled} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ========== INJURY STATUS CARD ========== */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderModern}>
          <View style={[styles.sectionIconContainer, {
            backgroundColor: stats.lesionesActivas > 0 ? theme.colors.errorSoft : theme.colors.successSoft
          }]}>
            <Ionicons name={stats.lesionesActivas > 0 ? 'bandage' : 'heart'} size={18} color={stats.lesionesActivas > 0 ? theme.colors.error : theme.colors.success} />
          </View>
          <View>
            <Text style={styles.sectionTitleModern}>{t('home.injuryState')}</Text>
          </View>
        </View>

        {stats.lesionesActivas > 0 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('LesionesDrawer')}
          >
            <View style={styles.injuryCardModern}>
              <View style={styles.injuryCardContent}>
                <View style={[styles.injuryIconContainer, { backgroundColor: theme.colors.error }]}>
                  <Ionicons name="warning" size={24} color="#fff" />
                </View>
                
                <View style={styles.injuryInfoContainer}>
                  <Text style={styles.injuryTitle}>
                    {t('home.activeInjuriesCount', { count: stats.lesionesActivas })}
                  </Text>
                  <Text style={styles.injurySubtext}>
                    {t('home.affectedPlayersCount', { count: stats.jugadoresLesionados })}
                  </Text>
                </View>

                <View style={styles.injuryArrow}>
                  <Ionicons name="chevron-forward" size={24} color={theme.colors.error} />
                </View>
              </View>

              <View style={styles.injuryProgressBar}>
                <View style={[styles.injuryProgressFill, { width: `${Math.min(injuryPercentage, 100)}%` }]} />
              </View>
              <Text style={styles.injuryProgressText}>
                {t('home.affectedPercentage', { percent: injuryPercentage })}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.healthyCardModern}>
            <View style={styles.healthyCardContent}>
              <View style={[styles.healthyIconContainer, { backgroundColor: theme.colors.successSoft }]}>
                <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
              </View>
              <View style={styles.healthyInfoContainer}>
                <Text style={styles.healthyTitle}>{t('home.noActiveInjuries')}</Text>
                <Text style={styles.healthySubtext}>{t('home.allAvailable')}</Text>
              </View>
            </View>
            <View style={styles.healthyBadge}>
              <Ionicons name="shield-checkmark" size={14} color={theme.colors.success} />
              <Text style={styles.healthyBadgeText}>100% disponible</Text>
            </View>
          </View>
        )}
      </View>

      {/* ========== UPCOMING SESSION CARD ========== */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderModern}>
          <View style={[styles.sectionIconContainer, { backgroundColor: theme.colors.primarySoft }]}>
            <Ionicons name="calendar" size={18} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={styles.sectionTitleModern}>{t('session.upcomingSession')}</Text>
          </View>
        </View>

        {proximaSesion ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openSessionDetail(proximaSesion)}
          >
            <View style={styles.sessionCardModern}>
              <View style={styles.sessionCardContent}>
                <View style={styles.sessionCardHeader}>
                  <View style={styles.sessionDateContainer}>
                    <View style={[styles.sessionDateBadge, { backgroundColor: theme.colors.backgroundAlt }]}>
                      <Text style={[styles.sessionDateDay, { color: theme.colors.text }]}>
                        {new Date(proximaSesion.fecha).getDate()}
                      </Text>
                      <Text style={[styles.sessionDateMonth, { color: theme.colors.textSecondary }]}>
                        {new Date(proximaSesion.fecha).toLocaleDateString(i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US', { month: 'short' }).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.sessionMainInfo}>
                    <Text style={[styles.sessionDateText, { color: theme.colors.text }]} numberOfLines={1}>
                      {formatFecha(proximaSesion.fecha)}
                    </Text>
                    <View style={styles.sessionTimeContainer}>
                      <Ionicons name="time" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.sessionTimeText, { color: theme.colors.textSecondary }]}>
                        {proximaSesion.horaInicio} - {proximaSesion.horaFin}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.sessionStatusBadge, { backgroundColor: theme.colors.successSoft }]}>
                    <View style={styles.sessionStatusDot} />
                    <Text style={[styles.sessionStatusText, { color: theme.colors.success }]}>{t('session.upcoming')}</Text>
                  </View>
                </View>

                <View style={styles.sessionCardDivider} />

                <View style={styles.sessionCardFooter}>
                  {proximaSesionExercises.length > 0 && (
                    <View style={styles.sessionExercisePreview}>
                      {proximaSesionExercises.slice(0, 4).map((ejercicio, index) => (
                        <View key={getEntityId(ejercicio) + index} style={[styles.sessionExerciseMini, { marginLeft: index > 0 ? -8 : 0, zIndex: 4 - index }]}>
                          {ejercicio?.imagen ? (
                            <Image
                              source={{ uri: normalizeImageSource(ejercicio.imagen) }}
                              style={styles.sessionExerciseMiniImage}
                            />
                          ) : (
                            <View style={styles.sessionExerciseMiniPlaceholder}>
                              <MaterialIcons name="fitness-center" size={10} color={theme.colors.textSecondary} />
                            </View>
                          )}
                        </View>
                      ))}
                      {proximaSesionExercises.length > 4 && (
                        <View style={[styles.sessionExerciseMoreBadge, { marginLeft: -8 }]}>
                          <Text style={styles.sessionExerciseMoreText}>+{proximaSesionExercises.length - 4}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {proximaSesion.jugadores && proximaSesion.jugadores.length > 0 && (
                    <View style={[styles.sessionInfoChip, { backgroundColor: theme.colors.backgroundAlt }]}>
                      <Ionicons name="people" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.sessionInfoChipText, { color: theme.colors.textSecondary }]}>
                        {t('session.playersCount', { count: proximaSesion.jugadores.length })}
                      </Text>
                    </View>
                  )}

                  <View style={styles.sessionTapHint}>
                    <Text style={styles.sessionTapText}>{t('home.touchForDetails')}</Text>
                    <Ionicons name="arrow-forward" size={14} color={theme.colors.textSecondary} />
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.emptySessionCard} activeOpacity={0.8} onPress={() => navigation.navigate('EntrenamientoDrawer')} accessibilityRole="button" accessibilityLabel="Ir a entrenamientos">
            <View style={styles.emptySessionIcon}>
              <Ionicons name="calendar-outline" size={40} color={theme.colors.textDisabled} />
            </View>
            <Text style={styles.emptySessionTitle}>{t('session.noSessions')}</Text>
            <Text style={styles.emptySessionSubtitle}>Programa tu próximo entrenamiento</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ========== LAST SESSION CARD ========== */}
      {ultimaSesion && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderModern}>
            <View style={[styles.sectionIconContainer, { backgroundColor: theme.colors.backgroundAlt }]}>
              <Ionicons name="time" size={18} color={theme.colors.textSecondary} />
            </View>
            <View>
              <Text style={styles.sectionTitleModern}>{t('session.lastSession')}</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openSessionDetail(ultimaSesion)}
          >
            <View style={styles.lastSessionCardModern}>
              <View style={styles.lastSessionContent}>
                <View style={styles.lastSessionLeft}>
                  <View style={styles.lastSessionDateBadge}>
                    <Text style={styles.lastSessionDateDay}>
                      {new Date(ultimaSesion.fecha).getDate()}
                    </Text>
                    <Text style={styles.lastSessionDateMonth}>
                      {new Date(ultimaSesion.fecha).toLocaleDateString(i18n?.language?.startsWith('es') ? 'es-ES' : 'en-US', { month: 'short' }).toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.lastSessionMiddle}>
                  <Text style={styles.lastSessionDateText} numberOfLines={1}>
                    {formatFecha(ultimaSesion.fecha)}
                  </Text>
                  <Text style={styles.lastSessionTimeText}>
                    {ultimaSesion.horaInicio} - {ultimaSesion.horaFin}
                  </Text>
                  
                  <View style={styles.lastSessionStats}>
                    {ultimaSesionExercises.length > 0 && (
                      <View style={styles.lastSessionExercisePreview}>
                        {ultimaSesionExercises.slice(0, 4).map((ejercicio, index) => (
                          <View key={getEntityId(ejercicio) + index} style={[styles.lastSessionExerciseMini, { marginLeft: index > 0 ? -8 : 0, zIndex: 4 - index }]}>
                            {ejercicio?.imagen ? (
                              <Image
                                source={{ uri: normalizeImageSource(ejercicio.imagen) }}
                                style={styles.lastSessionExerciseMiniImage}
                              />
                            ) : (
                              <View style={styles.lastSessionExerciseMiniPlaceholder}>
                                <MaterialIcons name="fitness-center" size={10} color={theme.colors.textDisabled} />
                              </View>
                            )}
                          </View>
                        ))}
                        {ultimaSesionExercises.length > 4 && (
                          <View style={[styles.lastSessionExerciseMoreBadge, { marginLeft: -8 }]}>
                            <Text style={styles.lastSessionExerciseMoreText}>+{ultimaSesionExercises.length - 4}</Text>
                          </View>
                        )}
                      </View>
                    )}
                    {ultimaSesion.jugadores && ultimaSesion.jugadores.length > 0 && (
                      <View style={styles.lastSessionStat}>
                        <Ionicons name="people-outline" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.lastSessionStatText}>{ultimaSesion.jugadores.length}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.lastSessionRight}>
                  <View style={styles.lastSessionCompletedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textDisabled} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Spacer for bottom */}
      <View style={{ height: 40 }} />
    </ScrollView>

    {/* Modales de detalle - componentes compartidos */}
    <TrainingSessionDetailModal
      visible={detailSessionVisible}
      session={selectedSessionForDetail}
      team={equipoSeleccionado}
      players={jugadores}
      exercises={allExercises}
      exerciseTypes={exerciseTypes}
      onClose={() => {
        setDetailSessionVisible(false);
        setSelectedSessionForDetail(null);
      }}
      onEdit={(session) => {
        setDetailSessionVisible(false);
        setEditSessionModalVisible(true);
      }}
      onDelete={() => handleDeleteSession(selectedSessionForDetail?._id)}
      onWellnessUpdate={() => {
        if (equipoSeleccionado?._id) {
          dispatch(fetchEntrenamientosPorEquipo({ team: equipoSeleccionado._id }));
        }
      }}
    />

    <MatchSheetDetailModal
      visible={detailMatchVisible}
      matchSheet={selectedMatchForDetail}
      team={equipoSeleccionado}
      players={jugadores}
      onClose={() => {
        setDetailMatchVisible(false);
        setSelectedMatchForDetail(null);
      }}
      onEdit={(match) => {
        setDetailMatchVisible(false);
        setEditMatchModalVisible(true);
      }}
      onDelete={() => handleDeleteMatch(selectedMatchForDetail?._id)}
    />

    <EditSessionModal
      visible={editSessionModalVisible}
      session={selectedSessionForDetail}
      players={jugadores}
      exercises={allExercises}
      exerciseTypes={exerciseTypes}
      injuries={lesiones}
      onClose={() => {
        setEditSessionModalVisible(false);
        setSelectedSessionForDetail(null);
      }}
      onSave={async (sessionData) => {
        await handleSaveSessionEdit(sessionData);
        setEditSessionModalVisible(false);
        setSelectedSessionForDetail(null);
      }}
      onCreateExerciseFromSession={handleCreateExerciseFromSession}
    />

    <EditMatchSheetModal
      visible={editMatchModalVisible}
      matchSheet={selectedMatchForDetail}
      rivals={rivals}
      players={jugadores}
      injuries={lesiones}
      team={equipoSeleccionado}
      matchSheets={partidos}
      onClose={() => {
        setEditMatchModalVisible(false);
        setSelectedMatchForDetail(null);
      }}
      onSave={async (matchData) => {
        await handleSaveMatchEdit(matchData);
        setEditMatchModalVisible(false);
        setSelectedMatchForDetail(null);
      }}
    />
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.mode === 'dark' ? theme.colors.background : theme.colors.backgroundAlt,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.mode === 'dark' ? theme.colors.background : theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  // ========== HERO HEADER ==========
  heroContainer: {
    paddingTop: isMobileDevice() ? 50 : 60,
    paddingBottom: isMobileDevice() ? 40 : 50,
    paddingHorizontal: isMobileDevice() ? 20 : 30,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroWelcome: {
    fontSize: isMobileDevice() ? 28 : 34,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSeason: {
    fontSize: isMobileDevice() ? 16 : 18,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 20,
  },
  heroTeamCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  heroTeamContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  heroTeamIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroTeamBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  heroTeamInfo: {
    flex: 1,
  },
  heroTeamName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  heroTeamCategory: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  heroTeamArrow: {
    padding: 4,
  },
  // ========== QUICK STATS ==========
  quickStatsContainer: {
    marginTop: 24,
    paddingHorizontal: isMobileDevice() ? 16 : 24,
    marginBottom: 8,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickStatContent: {
    paddingVertical: isMobileDevice() ? 16 : 20,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  quickStatIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickStatNumber: {
    fontSize: isMobileDevice() ? 24 : 28,
    fontWeight: '800',
    color: theme.colors.text,
  },
  quickStatLabel: {
    fontSize: isMobileDevice() ? 11 : 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  // ========== SECTIONS ==========
  section: {
    marginHorizontal: isMobileDevice() ? 16 : 24,
    marginTop: 24,
  },
  sectionHeaderModern: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleModern: {
    fontSize: isMobileDevice() ? 18 : 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  // ========== STATS TABS ==========
  statsTabs: {
    flexDirection: 'row',
    backgroundColor: theme.mode === 'dark' ? theme.colors.backgroundAlt : theme.colors.border,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  statsTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statsTabActive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.mode === 'dark' ? 'transparent' : theme.colors.borderStrong,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statsTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  statsTabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  // ========== PERFORMANCE CARD ==========
  performanceCard: {
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  performanceGradient: {
    padding: isMobileDevice() ? 20 : 24,
  },
  winRateSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  winRateCircle: {
    width: isMobileDevice() ? 100 : 120,
    height: isMobileDevice() ? 100 : 120,
    borderRadius: isMobileDevice() ? 50 : 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  winRateNumber: {
    fontSize: isMobileDevice() ? 28 : 32,
    fontWeight: '800',
  },
  winRateLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  matchGridContainer: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 16,
    padding: 8,
  },
  matchGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  matchGridItem: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  matchGridIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  matchGridNumber: {
    fontSize: isMobileDevice() ? 22 : 26,
    fontWeight: '800',
    color: theme.colors.text,
  },
  matchGridLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  // ========== MATCH CARDS (PRÓXIMO/ÚLTIMO PARTIDO) ==========
  matchCardModern: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  matchCardContent: {
    padding: isMobileDevice() ? 18 : 22,
  },
  matchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isMobileDevice() ? 12 : 16,
  },
  matchDateContainer: {},
  matchDateBadge: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 56,
  },
  matchDateWeekday: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 1,
    letterSpacing: 0.5,
  },
  matchDateDay: {
    fontSize: isMobileDevice() ? 22 : 26,
    fontWeight: '800',
    lineHeight: 28,
  },
  matchDateMonth: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  matchMainInfo: {
    flex: 1,
  },
  matchRivalText: {
    fontSize: isMobileDevice() ? 17 : 19,
    fontWeight: '800',
  },
  matchInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  matchInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  matchInfoChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  matchPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  matchPendingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyMatchCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyMatchIcon: {
    marginBottom: 12,
  },
  emptyMatchTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyMatchSubtitle: {
    fontSize: 13,
    color: theme.colors.textDisabled,
    marginTop: 4,
    textAlign: 'center',
  },
  // Last Match Card
  lastMatchCardModern: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
  },
  lastMatchResultIndicator: {
    width: 5,
  },
  lastMatchContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  lastMatchLeft: {},
  lastMatchDateBadge: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 50,
  },
  lastMatchDateWeekday: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textDisabled,
    marginBottom: 1,
    letterSpacing: 0.5,
  },
  lastMatchDateDay: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  lastMatchDateMonth: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textDisabled,
    marginTop: 1,
  },
  lastMatchMiddle: {
    flex: 1,
  },
  lastMatchRivalText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  lastMatchScoreContainer: {
    marginTop: 4,
  },
  lastMatchScore: {
    fontSize: 22,
    fontWeight: '800',
  },
  lastMatchTags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  lastMatchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  lastMatchTagText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  lastMatchRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastMatchResultBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ========== INJURY CARDS ==========
  injuryCardModern: {
    backgroundColor: theme.colors.errorSoft,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.error + '20',
  },
  injuryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  injuryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  injuryInfoContainer: {
    flex: 1,
  },
  injuryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.error,
  },
  injurySubtext: {
    fontSize: 13,
    color: theme.colors.errorSoftText,
    marginTop: 2,
  },
  injuryArrow: {
    padding: 4,
  },
  injuryProgressBar: {
    height: 6,
    backgroundColor: theme.colors.error + '20',
    borderRadius: 3,
    marginTop: 14,
    overflow: 'hidden',
  },
  injuryProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.error,
    borderRadius: 3,
  },
  injuryProgressText: {
    fontSize: 11,
    color: theme.colors.errorSoftText,
    marginTop: 6,
    textAlign: 'center',
  },
  // Healthy Card
  healthyCardModern: {
    backgroundColor: theme.colors.successSoft,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.success + '20',
  },
  healthyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  healthyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthyInfoContainer: {
    flex: 1,
  },
  healthyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.success,
  },
  healthySubtext: {
    fontSize: 13,
    color: theme.colors.successSoftText,
    marginTop: 2,
  },
  healthyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    marginTop: 12,
  },
  healthyBadgeText: {
    fontSize: 11,
    color: theme.colors.success,
    fontWeight: '600',
  },
  // ========== SESSION CARDS ==========
  sessionCardModern: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sessionCardContent: {
    padding: isMobileDevice() ? 18 : 22,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isMobileDevice() ? 12 : 16,
  },
  sessionDateContainer: {},
  sessionDateBadge: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 56,
  },
  sessionDateDay: {
    fontSize: isMobileDevice() ? 22 : 26,
    fontWeight: '800',
    lineHeight: 28,
  },
  sessionDateMonth: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  sessionMainInfo: {
    flex: 1,
  },
  sessionDateText: {
    fontSize: isMobileDevice() ? 15 : 17,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  sessionTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  sessionTimeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sessionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  sessionStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.success,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sessionCardDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 16,
  },
  sessionCardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  sessionInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  sessionInfoChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  sessionTapText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  // Empty Session
  emptySessionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptySessionIcon: {
    marginBottom: 12,
  },
  emptySessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptySessionSubtitle: {
    fontSize: 13,
    color: theme.colors.textDisabled,
    marginTop: 4,
    textAlign: 'center',
  },
  // ========== LAST SESSION ==========
  lastSessionCardModern: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lastSessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  lastSessionLeft: {},
  lastSessionDateBadge: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 50,
  },
  lastSessionDateDay: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
  },
  lastSessionDateMonth: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textDisabled,
    marginTop: 1,
  },
  lastSessionMiddle: {
    flex: 1,
  },
  lastSessionDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  lastSessionTimeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  lastSessionStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  lastSessionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastSessionStatText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  // Exercise previews — upcoming session card (dark gradient background)
  sessionExercisePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionExerciseMini: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.surface,
    backgroundColor: theme.colors.backgroundAlt,
  },
  sessionExerciseMiniImage: {
    width: '100%',
    height: '100%',
  },
  sessionExerciseMiniPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionExerciseMoreBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  sessionExerciseMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  // Exercise previews — last session card (light surface background)
  lastSessionExercisePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastSessionExerciseMini: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.background,
    backgroundColor: theme.colors.backgroundAlt || '#f1f5f9',
  },
  lastSessionExerciseMiniImage: {
    width: '100%',
    height: '100%',
  },
  lastSessionExerciseMiniPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  lastSessionExerciseMoreBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  lastSessionExerciseMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  lastSessionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastSessionCompletedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
