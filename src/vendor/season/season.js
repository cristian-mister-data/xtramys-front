import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  useWindowDimensions,
  Image,
  Platform
} from 'react-native';
import { useTheme } from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { fetchEquiposTemporada, updateEquipo, createEquipoWithPlayers, fetchPreviousSeason, deleteEquipoWithData } from '@/store/slices/team/teamThunks';
import { clearTeams } from '@/store/slices/team/teamSlice';
import AppLayout from '@/vendor/shared/appLayout';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchTemporadaUsuarioSeleccionada, fetchTemporadasUsuario, updateTemporadaSeleccionada, createTemporada } from '@/store/slices/season/seasonThunks';
import { fetchMatchSheetsByTeam, createMatchSheet, updateMatchSheet, deleteMatchSheet } from '@/store/slices/matchSheet/matchSheetThunks';
import { clearMatchSheets } from '@/store/slices/matchSheet/matchSheetSlice';
import { fetchEntrenamientosPorEquipo, createEntrenamiento, updateEntrenamiento, deleteEntrenamiento } from '@/store/slices/session/sessionThunks';
import { clearSessions } from '@/store/slices/session/sessionSlice';
import { fetchJugadoresEquipo } from '@/store/slices/player/playerThunks';
import { clearPlayers } from '@/store/slices/player/playerSlice';
import { fetchEjerciciosUsuario, fetchExerciseFolders, fetchGlobalExercises } from '@/store/slices/exercise/exerciseThunks';
import { fetchRivalsByTeam } from '@/store/slices/rival/rivalThunks';
import { clearRivals } from '@/store/slices/rival/rivalSlice';
import { fetchInjuriesByTeam } from '@/store/slices/injury/injuryThunks';
import { clearInjuries } from '@/store/slices/injury/injurySlice';
import { fetchTournamentsByTeam, fetchTournamentSanctions } from '@/store/slices/tournament/tournamentThunks';
import { clearTournaments, clearSanctions } from '@/store/slices/tournament/tournamentSlice';
import SeasonCalendar from './SeasonCalendar';
import MatchSheetDetailModal from './MatchSheetDetailModal';
import TrainingSessionDetailModal from './TrainingSessionDetailModal';
import AddEventModal from './AddEventModal';
import EditMatchSheetModal from './EditMatchSheetModal';
import EditSessionModal from './EditSessionModal';
import { mergeExercises } from '@/utils/sessionExercises';

// Mapeo de rondas a claves i18n
const ROUND_I18N_KEYS = {
  final: 'tournaments.roundFinal',
  semifinal: 'tournaments.roundSemifinal',
  cuartos: 'tournaments.roundQuarters',
  octavos: 'tournaments.roundRound16',
  dieciseisavos: 'tournaments.roundRound32',
  treintaydosavos: 'tournaments.roundRound64',
};

// Función para detectar si es móvil
const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 430;
};

export default function GestionEquipos() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const temporada = useSelector(state => state.season.season);
  const temporadas = useSelector(state => state.season.seasons);
  const equipos = useSelector(state => state.team.teams);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;
  const IS_TABLET = screenWidth > 700;
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [seasonSelectorVisible, setSeasonSelectorVisible] = useState(false);
  const [createSeasonModalVisible, setCreateSeasonModalVisible] = useState(false);
  const [showYearOptions, setShowYearOptions] = useState(false);
  const [newSeason, setNewSeason] = useState({ año: new Date().getFullYear().toString(), nombre: '' });
  
  // Estados para gestión de equipos
  const [editTeamModalVisible, setEditTeamModalVisible] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState(null);
  const [showEditCategoryOptions, setShowEditCategoryOptions] = useState(false);
  const [showEditTimeOptions, setShowEditTimeOptions] = useState(false);
  const [showEditPlayersPerTeamOptions, setShowEditPlayersPerTeamOptions] = useState(false);
  
  // Estados para modal de detalles del equipo
  const [teamDetailModalVisible, setTeamDetailModalVisible] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(false);

  // Estados para calendario
  const matchSheets = useSelector(state => state.matchSheet.matchSheets) || [];
  const trainingSessions = useSelector(state => state.session.session) || [];
  const players = useSelector(state => state.player.players) || [];
  const userExercises = useSelector(state => state.exercise.exercises) || [];
  const globalExercises = useSelector(state => state.exercise.globalExercises) || [];
  const exercises = useMemo(
    () => mergeExercises(userExercises, globalExercises),
    [userExercises, globalExercises]
  );
  const exerciseTypes = useSelector(state => state.exercise.exerciseTypes) || [];
  const rivals = useSelector(state => state.rival.rivals) || [];
  const injuries = useSelector(state => state.injury.injuries) || [];
  const sanctions = useSelector(state => state.tournament.sanctions) || [];
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [dayEventsModalVisible, setDayEventsModalVisible] = useState(false);
  
  // Estados para modales de detalle
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchDetailVisible, setMatchDetailVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetailVisible, setSessionDetailVisible] = useState(false);
  
  // Estado para modal de añadir evento
  const [addEventModalVisible, setAddEventModalVisible] = useState(false);
  const [addEventSelectedDate, setAddEventSelectedDate] = useState(null);
  
  // Estados para modales de edición
  const [editMatchModalVisible, setEditMatchModalVisible] = useState(false);
  const [editSessionModalVisible, setEditSessionModalVisible] = useState(false);

  // Fetch sanctions when editing a tournament match
  useEffect(() => {
    if (editMatchModalVisible && selectedMatch) {
      const torneoId = selectedMatch.torneoId?._id || selectedMatch.torneoId;
      if (torneoId) {
        dispatch(fetchTournamentSanctions(torneoId));
      } else {
        dispatch(clearSanctions());
      }
    } else if (!editMatchModalVisible) {
      dispatch(clearSanctions());
    }
  }, [editMatchModalVisible, selectedMatch, dispatch]);

  // Estados para crear equipo
  const [createTeamModalVisible, setCreateTeamModalVisible] = useState(false);
  const [newTeam, setNewTeam] = useState({
    nombre: '',
    categoriaKey: 'otro',
    categoriaCustom: '',
    tiempoPorParte: 45,
    jugadoresPorEquipo: 11,
    escudo: null
  });
  const [showCreateCategoryOptions, setShowCreateCategoryOptions] = useState(false);
  const [showCreateTimeOptions, setShowCreateTimeOptions] = useState(false);
  const [showCreatePlayersPerTeamOptions, setShowCreatePlayersPerTeamOptions] = useState(false);
  const [previousSeasonInfo, setPreviousSeasonInfo] = useState(null);
  const [importPlayers, setImportPlayers] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Opciones de categoría
  const categoryOptions = [
    { label: t('team.categories.prebenjamin'), value: 'prebenjamin' },
    { label: t('team.categories.benjamin'), value: 'benjamin' },
    { label: t('team.categories.alevin'), value: 'alevin' },
    { label: t('team.categories.infantil'), value: 'infantil' },
    { label: t('team.categories.cadete'), value: 'cadete' },
    { label: t('team.categories.juvenil'), value: 'juvenil' },
    { label: t('team.categories.senior'), value: 'senior' },
    { label: t('team.categories.otro'), value: 'otro' }
  ];

  // Opciones de tiempo por parte
  const timePerHalfOptions = [10, 15, 20, 25, 30, 35, 40, 45];

  // Opciones de jugadores por equipo
  const playersPerTeamOptions = [7, 8, 11];

  // Función helper para formatear el año como "2025-2026"
  const formatSeasonYear = (year) => {
    const currentYear = parseInt(year);
    const nextYear = currentYear + 1;
    return `${currentYear}-${nextYear}`;
  };

  // Generar opciones de años para el select (desde 2000 hasta año actual)
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let year = 2000; year <= currentYear; year++) {
    yearOptions.push({
      label: formatSeasonYear(year.toString()),
      value: year.toString()
    });
  }

  const [idUsuario, setIdUsuario] = useState(null);
  const [ready, setReady] = useState(false);
  const [loadingTemporada, setLoadingTemporada] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('usuario').then(str => {
      const u = JSON.parse(str);
      setIdUsuario(u?._id ?? null);
      setReady(true);
    });
  }, []);

  // Reiniciar estado de nueva temporada cuando se abre el modal
  useEffect(() => {
    if (createSeasonModalVisible) {
      const currentYear = new Date().getFullYear().toString();
      setNewSeason({ año: currentYear, nombre: '' });
    }
  }, [createSeasonModalVisible]);

  // Cargar temporadas del usuario si no hay temporada
  useEffect(() => {
    if (ready && idUsuario && !temporada) {
      const fetchTemporadas = async () => {
        setLoadingTemporada(true);
        try {
          await dispatch(fetchTemporadasUsuario({ usuario: idUsuario }));
          await dispatch(fetchTemporadaUsuarioSeleccionada({ usuario: idUsuario }));
        } catch (error) {
          console.warn(error);
        }
        setLoadingTemporada(false);
      };
      fetchTemporadas();
    }
  }, [ready, idUsuario, temporada, dispatch]);

  // Cargar equipos cuando hay temporada
  useEffect(() => {
    if (temporada && temporada._id) {
      setLoadingTeam(true);
      dispatch(fetchEquiposTemporada({ season: temporada._id })).finally(() => {
        setLoadingTeam(false);
      });
    }
  }, [temporada?._id, dispatch]);

  // Auto-select the team marked as seleccionado in the database
  useEffect(() => {
    if (equipos && equipos.length > 0) {
      const selectedTeam = equipos.find(e => e.seleccionado === true);
      if (selectedTeam) {
        setEquipoSeleccionado(selectedTeam);
      }
    }
  }, [equipos]);

  // Cargar eventos del calendario cuando se seleccione un equipo
  useEffect(() => {
    if (equipoSeleccionado && equipoSeleccionado._id && idUsuario) {
      setCalendarLoading(true);
      Promise.all([
        dispatch(fetchMatchSheetsByTeam(equipoSeleccionado._id)),
        dispatch(fetchEntrenamientosPorEquipo({ team: equipoSeleccionado._id })),
        dispatch(fetchJugadoresEquipo({ team: equipoSeleccionado._id })),
        dispatch(fetchEjerciciosUsuario({ user: idUsuario })),
        dispatch(fetchGlobalExercises({ lang: i18n.language })),
        dispatch(fetchExerciseFolders()),
        dispatch(fetchRivalsByTeam({ teamId: equipoSeleccionado._id })),
        dispatch(fetchInjuriesByTeam({ team: equipoSeleccionado._id })),
        dispatch(fetchTournamentsByTeam(equipoSeleccionado._id))
      ]).finally(() => {
        setCalendarLoading(false);
      });
    }
  }, [equipoSeleccionado, idUsuario, dispatch]);

  // Handler para cuando se selecciona un día en el calendario
  const handleDayPress = (dayData) => {
    if (dayData.hasEvents) {
      setSelectedDayEvents({
        date: dayData.date,
        matches: dayData.events?.matches || [],
        sessions: dayData.events?.sessions || [],
      });
      setDayEventsModalVisible(true);
    }
  };

  // Handler para crear ficha de partido desde calendario
  const handleCreateMatchFromCalendar = async (matchData) => {
    if (!equipoSeleccionado?._id) return;
    
    await dispatch(createMatchSheet({
      ...matchData,
      equipo: equipoSeleccionado._id,
    })).unwrap();
    
    // Recargar fichas de partido
    dispatch(fetchMatchSheetsByTeam(equipoSeleccionado._id));
    Alert.alert(t('message.success'), t('season.matchSheetCreated'));
  };

  // Handler para crear sesión de entrenamiento desde calendario
  const handleCreateSessionFromCalendar = async (sessionData) => {
    if (!equipoSeleccionado?._id) return;
    
    // Extraer IDs de ejercicios y construir ejerciciosDetalle
    const ejerciciosIds = sessionData.ejercicios?.map(e => 
      typeof e === 'object' ? e.ejercicio : e
    ) || [];
    
    const ejerciciosDetalle = sessionData.ejercicios?.map((e, index) => ({
      ejercicio: typeof e === 'object' ? e.ejercicio : e,
      orden: index + 1,
      tiempoDescanso: typeof e === 'object' ? (e.tiempoDescanso || 0) : 0,
      teamAssignments: typeof e === 'object' ? (e.teamAssignments || []) : [],
    })) || [];
    
    const observaciones = sessionData.ejercicios?.filter(e => typeof e === 'object' && e.observacion).map(e => ({
      ejercicioId: e.ejercicio,
      observacion: e.observacion || '',
    })) || [];
    
    const result = await dispatch(createEntrenamiento({
      fecha: sessionData.fecha,
      horaInicio: sessionData.horaInicio,
      horaFin: sessionData.horaFin,
      equipo: equipoSeleccionado._id,
      ejercicios: ejerciciosIds,
      ejerciciosDetalle,
      observaciones,
      jugadores: sessionData.jugadores || [],
      jugadoresExtras: sessionData.jugadoresExtras || [],
      expectedWellness: sessionData.expectedWellness,
      ejerciciosFuerza: sessionData.ejerciciosFuerza || [],
    }));
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    // Recargar sesiones
    dispatch(fetchEntrenamientosPorEquipo({ team: equipoSeleccionado._id }));
    Alert.alert(t('message.success'), t('season.sessionCreated'));
  };

  // Handler para guardar edición de ficha de partido
  const handleSaveMatchEdit = async (matchData) => {
    if (!equipoSeleccionado?._id || !matchData._id) return;
    
    await dispatch(updateMatchSheet({
      id: matchData._id,
      data: matchData,
    })).unwrap();
    
    // Recargar fichas de partido
    dispatch(fetchMatchSheetsByTeam(equipoSeleccionado._id));
    
    // Actualizar el match seleccionado si sigue visible
    if (selectedMatch && selectedMatch._id === matchData._id) {
      setSelectedMatch({ ...selectedMatch, ...matchData });
    }
    
    Alert.alert(t('message.success'), t('season.matchSheetUpdated'));
  };

  // Handler para guardar edición de sesión de entrenamiento
  const handleSaveSessionEdit = async (sessionData) => {
    if (!equipoSeleccionado?._id || !sessionData._id) return;
    
    // Extraer IDs de ejercicios si vienen en formato complejo
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
        ejerciciosFuerza: sessionData.ejerciciosFuerza || [],
      },
    }));
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    // Recargar sesiones
    dispatch(fetchEntrenamientosPorEquipo({ team: equipoSeleccionado._id }));
    
    // Actualizar la sesión seleccionada si sigue visible
    if (selectedSession && selectedSession._id === sessionData._id) {
      setSelectedSession({ ...selectedSession, ...sessionData });
    }
    
    Alert.alert(t('message.success'), t('season.sessionUpdated'));
  };

  // Handler para eliminar sesión de entrenamiento
  const handleDeleteSession = async (sessionId) => {
    if (!equipoSeleccionado?._id || !sessionId) return;
    
    try {
      const result = await dispatch(deleteEntrenamiento(sessionId));
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      // Cerrar modales
      setEditSessionModalVisible(false);
      setSessionDetailVisible(false);
      setSelectedSession(null);
      
      // Recargar sesiones
      dispatch(fetchEntrenamientosPorEquipo({ team: equipoSeleccionado._id }));
      
      Alert.alert(t('message.success'), t('season.sessionDeleted'));
    } catch (error) {
      Alert.alert(t('message.error'), t('season.sessionDeleteError') + ': ' + error.message);
    }
  };

  // Handler para eliminar ficha de partido
  const handleDeleteMatch = async (matchId) => {
    if (!equipoSeleccionado?._id || !matchId) return;
    
    try {
      const result = await dispatch(deleteMatchSheet(matchId));
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      // Cerrar modales
      setEditMatchModalVisible(false);
      setMatchDetailVisible(false);
      setSelectedMatch(null);
      
      // Recargar fichas de partido
      dispatch(fetchMatchSheetsByTeam(equipoSeleccionado._id));
      
      Alert.alert(t('message.success'), t('season.matchSheetDeleted'));
    } catch (error) {
      Alert.alert(t('message.error'), t('season.matchSheetDeleteError') + ': ' + error.message);
    }
  };

  // Add function to handle season selection
  const handleSelectSeason = async (selectedSeason) => {
    if (loadingTemporada) return; // Prevent multiple calls
    
    try {
      // Start loading and clear UI state immediately
      setLoadingTemporada(true);
      setLoadingTeam(true);
      setEquipoSeleccionado(null);
      setSeasonSelectorVisible(false); // Close modal right away
      
      // Limpiar datos de la temporada anterior
      dispatch(clearTeams());
      dispatch(clearSessions());
      dispatch(clearMatchSheets());
      dispatch(clearPlayers());
      dispatch(clearInjuries());
      dispatch(clearRivals());
      dispatch(clearTournaments());
      
      // First update local storage
      await AsyncStorage.setItem('selectedSeason', selectedSeason._id);
      
      // Update the selected season
      await dispatch(updateTemporadaSeleccionada({
        id: selectedSeason._id, 
        usuario: idUsuario
      }));
      
      // Cargar los equipos de la nueva temporada
      await dispatch(fetchEquiposTemporada({ season: selectedSeason._id }));
    } catch (error) {
      console.error('Error selecting season:', error);
      Alert.alert(
        t('message.error'), 
        t('season.changeSeasonError', { msg: error.message || 'Unknown error' })
      );
    } finally {
      // Always reset loading state
      setLoadingTemporada(false);
      setLoadingTeam(false);
    }
  };

  // Add this function to create a new season
  const handleCreateSeason = async () => {
    try {
      if (!newSeason.año) {
        Alert.alert(t('message.error'), t('season.yearRequired'));
        return;
      }
      
      setLoadingTemporada(true);
      setLoadingTeam(true);
      setEquipoSeleccionado(null);
      setCreateSeasonModalVisible(false);
      
      // Limpiar datos de la temporada anterior
      dispatch(clearTeams());
      dispatch(clearSessions());
      dispatch(clearMatchSheets());
      dispatch(clearPlayers());
      dispatch(clearInjuries());
      dispatch(clearRivals());
      dispatch(clearTournaments());
      
      const result = await dispatch(createTemporada({
        año: parseInt(newSeason.año),
        usuario: idUsuario
      })).unwrap();
      
      // Guardar la nueva temporada como seleccionada
      if (result?._id) {
        await AsyncStorage.setItem('selectedSeason', result._id);
        await dispatch(fetchEquiposTemporada({ season: result._id }));
      }
      
      setNewSeason({ año: new Date().getFullYear().toString(), nombre: '' });
      Alert.alert(t('message.success'), t('season.createSeasonSuccess'));
    } catch (error) {
      console.error('Error creating season:', error);
      Alert.alert(t('message.error'), t('season.seasonCreateError'));
    } finally {
      setLoadingTemporada(false);
      setLoadingTeam(false);
    }
  };

  // Función para seleccionar imagen del escudo
  const pickBadgeImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(t('message.error'), t('season.galleryPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType ? [ImagePicker.MediaType.Images] : ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (teamToEdit) {
          setTeamToEdit(prev => ({ ...prev, escudo: base64Image }));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('message.error'), t('season.imageSelectError'));
    }
  };

  // Función para abrir el modal de editar equipo
  const openEditTeamModal = (team) => {
    setTeamToEdit({
      _id: team._id,
      nombre: team.nombre,
      categoriaKey: team.categoriaKey || 'otro',
      categoriaCustom: team.categoriaCustom || team.categoria || '',
      tiempoPorParte: team.tiempoPorParte || 45,
      jugadoresPorEquipo: team.jugadoresPorEquipo || 11,
      escudo: team.escudo || null
    });
    setEditTeamModalVisible(true);
  };

  // Función para actualizar un equipo
  const handleUpdateTeam = async () => {
    try {
      if (!teamToEdit?.nombre || teamToEdit.nombre.trim() === '') {
        Alert.alert(t('message.error'), t('message.missingFields', { fields: t('team.teamName') }));
        return;
      }

      if (!teamToEdit.categoriaKey) {
        Alert.alert(t('message.error'), t('message.missingFields', { fields: t('team.category') }));
        return;
      }

      if (teamToEdit.categoriaKey === 'otro' && !teamToEdit.categoriaCustom?.trim()) {
        Alert.alert(t('message.error'), t('message.missingFields', { fields: t('team.customCategory') }));
        return;
      }

      const categoriaLegacy = teamToEdit.categoriaKey === 'otro' 
        ? teamToEdit.categoriaCustom 
        : teamToEdit.categoriaKey;

      await dispatch(updateEquipo({
        id: teamToEdit._id,
        data: {
          nombre: teamToEdit.nombre,
          categoriaKey: teamToEdit.categoriaKey,
          categoriaCustom: teamToEdit.categoriaCustom || '',
          categoria: categoriaLegacy,
          tiempoPorParte: teamToEdit.tiempoPorParte,
          jugadoresPorEquipo: teamToEdit.jugadoresPorEquipo,
          escudo: teamToEdit.escudo
        }
      })).unwrap();

      // Recargar equipos
      await dispatch(fetchEquiposTemporada({ season: temporada._id }));
      
      setEditTeamModalVisible(false);
      setTeamToEdit(null);
      Alert.alert(t('message.success'), t('team.updateTeamSuccess'));
    } catch (error) {
      console.error('Error updating team:', error);
      Alert.alert(t('message.error'), t('team.updateTeamError'));
    }
  };

  // Función para eliminar equipo con todos sus datos
  const handleDeleteTeamWithData = async () => {
    if (!equipoSeleccionado) return;
    
    // Verificar que el texto de confirmación sea correcto
    if (deleteConfirmationText.trim() !== equipoSeleccionado.nombre.trim()) {
      Alert.alert(t('message.error'), t('team.deleteConfirmationMismatch'));
      return;
    }
    
    try {
      setDeletingTeam(true);
      
      await dispatch(deleteEquipoWithData(equipoSeleccionado._id)).unwrap();
      
      // Limpiar estados
      setEquipoSeleccionado(null);
      setTeamDetailModalVisible(false);
      setShowDeleteConfirmation(false);
      setDeleteConfirmationText('');
      
      // Recargar equipos
      await dispatch(fetchEquiposTemporada({ season: temporada._id }));
      
      Alert.alert(t('message.success'), t('team.deleteTeamSuccess'));
    } catch (error) {
      console.error('Error deleting team:', error);
      Alert.alert(t('message.error'), t('team.deleteTeamError'));
    } finally {
      setDeletingTeam(false);
    }
  };

  // Función para abrir el modal de crear equipo
  const handleOpenCreateTeamModal = async () => {
    // Resetear el formulario
    setNewTeam({
      nombre: '',
      categoriaKey: 'otro',
      categoriaCustom: '',
      tiempoPorParte: 45,
      escudo: null
    });
    setImportPlayers(false);
    setPreviousSeasonInfo(null);
    setShowCreateCategoryOptions(false);
    setShowCreateTimeOptions(false);
    
    // Verificar si hay temporada anterior con jugadores
    if (temporada && temporada._id && idUsuario) {
      try {
        const result = await dispatch(fetchPreviousSeason({ 
          seasonId: temporada._id, 
          userId: idUsuario 
        })).unwrap();
        
        if (result.previousSeason && result.hasPlayers) {
          setPreviousSeasonInfo(result);
        }
      } catch (error) {
        console.error('Error fetching previous season:', error);
      }
    }
    
    setCreateTeamModalVisible(true);
  };

  // Función para seleccionar imagen del escudo para nuevo equipo
  const pickNewTeamBadgeImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(t('message.error'), t('season.galleryPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType ? [ImagePicker.MediaType.Images] : ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setNewTeam(prev => ({ ...prev, escudo: base64Image }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('message.error'), t('season.imageSelectError'));
    }
  };

  // Función para crear un nuevo equipo
  const handleCreateTeam = async () => {
    try {
      if (!newTeam.nombre || newTeam.nombre.trim() === '') {
        Alert.alert(t('message.error'), t('message.missingFields', { fields: t('team.teamName') }));
        return;
      }

      if (!newTeam.categoriaKey) {
        Alert.alert(t('message.error'), t('message.missingFields', { fields: t('team.category') }));
        return;
      }

      if (newTeam.categoriaKey === 'otro' && !newTeam.categoriaCustom?.trim()) {
        Alert.alert(t('message.error'), t('message.missingFields', { fields: t('team.customCategory') }));
        return;
      }

      setCreatingTeam(true);

      await dispatch(createEquipoWithPlayers({
        temporada: temporada._id,
        nombre: newTeam.nombre,
        categoriaKey: newTeam.categoriaKey,
        categoriaCustom: newTeam.categoriaCustom || '',
        tiempoPorParte: newTeam.tiempoPorParte,
        jugadoresPorEquipo: newTeam.jugadoresPorEquipo,
        escudo: newTeam.escudo,
        importFromSeasonId: importPlayers && previousSeasonInfo?.previousSeason?._id 
          ? previousSeasonInfo.previousSeason._id 
          : null
      })).unwrap();

      // Recargar equipos
      await dispatch(fetchEquiposTemporada({ season: temporada._id }));
      
      setCreateTeamModalVisible(false);
      setNewTeam({
        nombre: '',
        categoriaKey: 'otro',
        categoriaCustom: '',
        tiempoPorParte: 45,
        jugadoresPorEquipo: 11,
        escudo: null
      });
      setPreviousSeasonInfo(null);
      setImportPlayers(false);
      
      Alert.alert(t('message.success'), t('team.createTeamSuccess'));
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert(t('message.error'), t('team.createTeamError'));
    } finally {
      setCreatingTeam(false);
    }
  };

  return (
    <AppLayout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {(!temporada || !temporada._id) ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>
                {t('home.loadingSeason')}
              </Text>
            </View>
          </View>
        ) : (
          <>
            {/* Header Section con Gradiente */}
            <View style={styles.headerSection}>
              <LinearGradient
                colors={['#1a237e', '#3949ab', '#5c6bc0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
              >
                <View style={styles.headerContent}>
                  <View style={styles.headerLeft}>
                    <View style={styles.headerIconContainer}>
                      <Ionicons name="calendar" size={isMobileDevice() ? 20 : 24} color="#ffffff" />
                    </View>
                    <View style={styles.headerTextContainer}>
                      <Text style={styles.headerTitle}>{t("season.currentSeason")}</Text>
                      <Text style={styles.headerSubtitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        {formatSeasonYear(temporada.año)}
                        {(() => {
                          const selectedTeam = equipos?.find(t => t.seleccionado === true);
                          return selectedTeam ? ` • ${selectedTeam.nombre}` : '';
                        })()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.changeSeasonButton}
                    onPress={() => setSeasonSelectorVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.changeSeasonText}>{t('season.season')}</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {/* Teams Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={22} color={theme.colors.textSecondary} />
                <Text style={styles.sectionTitle}>{t('season.team')}</Text>
              </View>

              {!equipoSeleccionado ? (
                <View style={styles.emptyStateContainer}>
                  <View style={styles.emptyStateCard}>
                    <Ionicons name="people-circle-outline" size={64} color={theme.colors.textDisabled} />
                    <Text style={styles.emptyStateTitle}>{t('season.noSelectedTeam')}</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      {t('season.noSelectedTeamSubtitle')}
                    </Text>
                    <TouchableOpacity
                      style={styles.createTeamButton}
                      onPress={() => handleOpenCreateTeamModal()}
                    >
                      <Ionicons name="add-circle" size={20} color="#ffffff" />
                      <Text style={styles.createTeamButtonText}>{t('team.createTeam')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.teamsGrid}>
                  <TouchableOpacity
                    key={equipoSeleccionado._id}
                    style={[
                      styles.teamCard,
                      styles.teamCardSelected,
                    ]}
                    onPress={() => setTeamDetailModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.teamCardHeader}>
                      <View style={styles.teamIconContainer}>
                        {equipoSeleccionado.escudo ? (
                          <Image source={{ uri: equipoSeleccionado.escudo }} style={styles.teamBadgeSmall} />
                        ) : (
                          <Ionicons name="shield" size={24} color="#ffffff" />
                        )}
                      </View>
                      <View style={styles.teamInfo}>
                        <Text style={[styles.teamName, styles.teamNameSelected]}>
                          {equipoSeleccionado.nombre}
                        </Text>
                        <Text style={[styles.teamCategory, styles.teamCategorySelected]}>
                          {equipoSeleccionado.categoria}
                        </Text>
                      </View>
                      <View style={styles.teamDetailChevron}>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.primaryLight} />
                      </View>
                    </View>
                  </TouchableOpacity>

                </View>
              )}
            </View>

            {/* Calendar Section */}
            {equipoSeleccionado && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar" size={22} color={theme.colors.textSecondary} />
                  <Text style={styles.sectionTitle}>{t('season.eventsCalendar')}</Text>
                </View>
                
                <SeasonCalendar
                  matchSheets={matchSheets}
                  trainingSessions={trainingSessions}
                  team={equipoSeleccionado}
                  onDayPress={handleDayPress}
                  onMatchPress={(match) => {
                    setSelectedMatch(match);
                    setMatchDetailVisible(true);
                  }}
                  onSessionPress={(session) => {
                    setSelectedSession(session);
                    setSessionDetailVisible(true);
                  }}
                  onAddEvent={(date) => {
                    setAddEventSelectedDate(date || new Date());
                    setAddEventModalVisible(true);
                  }}
                  loading={calendarLoading}
                />
              </View>
            )}
          </>
        )}

        {/* Day Events Selection Modal */}
        <Modal
          visible={dayEventsModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDayEventsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={IS_TABLET ? styles.modalContentTablet : styles.modalContent}>
              <View style={[styles.modalHeader, IS_MOBILE && { padding: 14 }]}>
                <Text style={[styles.modalTitle, IS_MOBILE && { fontSize: 16 }]}>
                  {selectedDayEvents?.date ? 
                    selectedDayEvents.date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    }) : t('season.dayEvents')}
                </Text>
                <TouchableOpacity
                  onPress={() => setDayEventsModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={[styles.modalBody, IS_MOBILE && { padding: 14 }]} showsVerticalScrollIndicator={false}>
                {/* Fichas de Partido */}
                {selectedDayEvents?.matches?.length > 0 && (
                  <View style={styles.eventSection}>
                    <View style={styles.eventSectionHeader}>
                      <Ionicons name="football" size={20} color={theme.colors.primary} />
                      <Text style={styles.eventSectionTitle}>
                        {t('season.matchSheets')} ({selectedDayEvents.matches.length})
                      </Text>
                    </View>
                    {selectedDayEvents.matches.map((match, index) => (
                      <TouchableOpacity
                        key={match._id || index}
                        style={styles.eventItem}
                        onPress={() => {
                          setDayEventsModalVisible(false);
                          setSelectedMatch(match);
                          setMatchDetailVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.eventItemIcon}>
                          <Ionicons name="trophy" size={18} color={match.torneoId && typeof match.torneoId === 'object' && match.torneoId.color ? match.torneoId.color : theme.colors.primary} />
                        </View>
                        <View style={styles.eventItemContent}>
                          <Text style={styles.eventItemTitle}>vs {match.rival}</Text>
                          <Text style={styles.eventItemSubtitle}>
                            {match.torneoId && typeof match.torneoId === 'object' && match.torneoId.nombre
                              ? match.torneoId.nombre + ' • '
                              : match.competicion === 'amistoso' ? t('matchSheet.friendly') + ' • ' : ''}
                            {(match.ubicacion === 'local' ? t('matchSheet.modals.home') :
                              match.ubicacion === 'visitante' ? t('matchSheet.modals.away') :
                              match.ubicacion === 'neutral' ? t('matchSheet.modals.neutral') :
                              match.ubicacion) || t('season.noLocation')}
                            {match.fase === 'eliminatoria' && match.ronda
                              ? ` • ${t(ROUND_I18N_KEYS[match.ronda] || match.ronda)}${match.pierna === 'ida' ? ` (${t('matchSheet.fields.legFirst')})` : match.pierna === 'vuelta' ? ` (${t('matchSheet.fields.legSecond')})` : match.pierna === 'unico' ? ` (${t('matchSheet.fields.legSingle')})` : ''}`
                              : match.fase === 'grupos' && match.grupo
                                ? ` • ${t('matchSheet.fields.groupN', { n: match.grupo })}${match.jornada ? ` ${t('matchSheet.fields.matchday')} ${match.jornada}` : ''}`
                                : match.jornada ? ` • ${t('season.matchday')} ${match.jornada}` : ''}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Sesiones de Entrenamiento */}
                {selectedDayEvents?.sessions?.length > 0 && (
                  <View style={styles.eventSection}>
                    <View style={styles.eventSectionHeader}>
                      <Ionicons name="fitness" size={20} color={theme.colors.success} />
                      <Text style={styles.eventSectionTitle}>
                        {t('season.trainingSessions')} ({selectedDayEvents.sessions.length})
                      </Text>
                    </View>
                    {selectedDayEvents.sessions.map((session, index) => (
                      <TouchableOpacity
                        key={session._id || index}
                        style={styles.eventItem}
                        onPress={() => {
                          setDayEventsModalVisible(false);
                          setSelectedSession(session);
                          setSessionDetailVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.eventItemIcon, { backgroundColor: theme.colors.successSoft }]}>
                          <Ionicons name="barbell" size={18} color={theme.colors.success} />
                        </View>
                        <View style={styles.eventItemContent}>
                          <Text style={styles.eventItemTitle}>
                            {t('season.training')} {session.horaInicio ? `- ${session.horaInicio}` : ''}
                          </Text>
                          <Text style={styles.eventItemSubtitle}>
                            {t('season.exercisesCount', { count: session.ejercicios?.length || 0 })}
                            {session.horaFin ? ` • ${t('season.until')} ${session.horaFin}` : ''}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Season Selector Modal */}
        <Modal
          visible={seasonSelectorVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSeasonSelectorVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={IS_TABLET ? styles.modalContentTablet : styles.modalContent}>
              <View style={[styles.modalHeader, IS_MOBILE && { padding: 14 }]}>
                <Text style={[styles.modalTitle, IS_MOBILE && { fontSize: 16 }]}>{t("season.selectSeason")}</Text>
                <TouchableOpacity
                  onPress={() => setSeasonSelectorVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={[styles.modalBody, IS_MOBILE && { padding: 14 }]} showsVerticalScrollIndicator={false}>
                {temporadas && temporadas.length > 0 ? (
                  temporadas.map(season => (
                    <TouchableOpacity
                      key={season._id}
                      style={[
                        styles.seasonItem,
                        temporada?._id === season._id && styles.seasonItemActive
                      ]}
                      onPress={() => handleSelectSeason(season)}
                    >
                      <View style={styles.seasonItemContent}>
                        <Ionicons name="calendar" size={20} color={temporada?._id === season._id ? theme.colors.primary : theme.colors.textMuted} />
                        <View style={styles.seasonItemTextContainer}>
                          <Text style={[
                            styles.seasonItemText,
                            temporada?._id === season._id && styles.seasonItemTextActive
                          ]}>
                            {formatSeasonYear(season.año)}
                          </Text>
                          <Text style={[
                            styles.seasonItemSubtext,
                            temporada?._id === season._id && styles.seasonItemSubtextActive
                          ]}>
                            {season.nombre || t("season.season")}
                          </Text>
                        </View>
                      </View>
                      {temporada?._id === season._id && (
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyModalContent}>
                    <Ionicons name="calendar-outline" size={48} color={theme.colors.textDisabled} />
                    <Text style={styles.emptyModalText}>{t("season.noSeasonsAvailable")}</Text>
                  </View>
                )}
              </ScrollView>
              
              {/* Botón crear temporada dentro del modal */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.createSeasonInModalButton}
                  onPress={() => {
                    setSeasonSelectorVisible(false);
                    setCreateSeasonModalVisible(true);
                  }}
                >
                  <Ionicons name="add-circle" size={20} color="#ffffff" />
                  <Text style={styles.createSeasonInModalButtonText}>{t('season.createNewSeason')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Create Season Modal */}
        <Modal
          visible={createSeasonModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setCreateSeasonModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={IS_TABLET ? styles.modalContentTablet : styles.modalContent}>
              <View style={[styles.modalHeader, IS_MOBILE && { padding: 14 }]}>
                <Text style={[styles.modalTitle, IS_MOBILE && { fontSize: 16 }]}>{t("season.createNewSeason")}</Text>
                <TouchableOpacity
                  onPress={() => setCreateSeasonModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.modalBody, IS_MOBILE && { padding: 14 }]}>
                {/* Year Select */}
                <TouchableOpacity
                  style={styles.modalInput}
                  onPress={() => setShowYearOptions(!showYearOptions)}
                >
                  <Text style={newSeason.año ? styles.modalInputText : styles.modalInputPlaceholder}>
                    {newSeason.año ? formatSeasonYear(newSeason.año) : t("season.year")}
                  </Text>
                  <Ionicons name={showYearOptions ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>

                {/* Year Options */}
                {showYearOptions && (
                  <View style={styles.yearOptionsContainer}>
                    <ScrollView style={styles.yearOptionsScroll} showsVerticalScrollIndicator={false}>
                      {yearOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.yearOption,
                            newSeason.año === option.value && styles.yearOptionSelected
                          ]}
                          onPress={() => {
                            setNewSeason({ ...newSeason, año: option.value });
                            setShowYearOptions(false);
                          }}
                        >
                          <Text style={[
                            styles.yearOptionText,
                            newSeason.año === option.value && styles.yearOptionTextSelected
                          ]}>
                            {option.label}
                          </Text>
                          {newSeason.año === option.value && (
                            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setCreateSeasonModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={handleCreateSeason}
                  >
                    <Text style={styles.modalConfirmText}>{t("common.create")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Team Modal */}
        <Modal
          visible={editTeamModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setEditTeamModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={IS_TABLET ? styles.modalContentTablet : styles.modalContent}>
              <View style={[styles.modalHeader, IS_MOBILE && { padding: 14 }]}>
                <Text style={[styles.modalTitle, IS_MOBILE && { fontSize: 16 }]}>{t('team.editTeam')}</Text>
                <TouchableOpacity
                  onPress={() => setEditTeamModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <KeyboardAwareScrollView style={[styles.modalBody, IS_MOBILE && { padding: 14 }]} showsVerticalScrollIndicator={false}>
                {/* Nombre del equipo */}
                <TextInput
                  style={styles.teamNameInput}
                  placeholder={t('team.teamName')}
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  value={teamToEdit?.nombre || ''}
                  onChangeText={(text) => setTeamToEdit(prev => ({ ...prev, nombre: text }))}
                />

                {/* Selector de categoría */}
                <Text style={styles.inputLabel}>{t('team.category')}</Text>
                <TouchableOpacity
                  style={styles.teamNameInput}
                  onPress={() => setShowEditCategoryOptions(!showEditCategoryOptions)}
                >
                  <View style={styles.selectContent}>
                    <Text style={teamToEdit?.categoriaKey ? styles.selectText : styles.selectPlaceholder}>
                      {teamToEdit?.categoriaKey 
                        ? categoryOptions.find(c => c.value === teamToEdit.categoriaKey)?.label 
                        : t('team.selectCategory')}
                    </Text>
                    <Ionicons name={showEditCategoryOptions ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {showEditCategoryOptions && (
                  <View style={styles.optionsContainer}>
                    <ScrollView style={styles.optionsScroll} nestedScrollEnabled={true}>
                      {categoryOptions.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.optionItem,
                            teamToEdit?.categoriaKey === option.value && styles.optionItemSelected
                          ]}
                          onPress={() => {
                            setTeamToEdit(prev => ({ ...prev, categoriaKey: option.value }));
                            setShowEditCategoryOptions(false);
                          }}
                        >
                          <Text style={[
                            styles.optionText,
                            teamToEdit?.categoriaKey === option.value && styles.optionTextSelected
                          ]}>
                            {option.label}
                          </Text>
                          {teamToEdit?.categoriaKey === option.value && (
                            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Categoría personalizada si es "otro" */}
                {teamToEdit?.categoriaKey === 'otro' && (
                  <TextInput
                    style={styles.teamNameInput}
                    placeholder={t('team.customCategoryPlaceholder')}
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    value={teamToEdit?.categoriaCustom || ''}
                    onChangeText={(text) => setTeamToEdit(prev => ({ ...prev, categoriaCustom: text }))}
                  />
                )}

                {/* Selector de tiempo por parte */}
                <Text style={styles.inputLabel}>{t('team.timePerHalf')}</Text>
                <TouchableOpacity
                  style={styles.teamNameInput}
                  onPress={() => setShowEditTimeOptions(!showEditTimeOptions)}
                >
                  <View style={styles.selectContent}>
                    <Text style={styles.selectText}>
                      {t('team.timePerHalfMinutes', { minutes: teamToEdit?.tiempoPorParte || 45 })}
                    </Text>
                    <Ionicons name={showEditTimeOptions ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {showEditTimeOptions && (
                  <View style={styles.optionsContainer}>
                    <ScrollView style={styles.optionsScroll} nestedScrollEnabled={true}>
                      {timePerHalfOptions.map(time => (
                        <TouchableOpacity
                          key={time}
                          style={[
                            styles.optionItem,
                            teamToEdit?.tiempoPorParte === time && styles.optionItemSelected
                          ]}
                          onPress={() => {
                            setTeamToEdit(prev => ({ ...prev, tiempoPorParte: time }));
                            setShowEditTimeOptions(false);
                          }}
                        >
                          <Text style={[
                            styles.optionText,
                            teamToEdit?.tiempoPorParte === time && styles.optionTextSelected
                          ]}>
                            {t('team.timePerHalfMinutes', { minutes: time })}
                          </Text>
                          {teamToEdit?.tiempoPorParte === time && (
                            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Selector de jugadores por equipo */}
                <Text style={styles.inputLabel}>{t('team.playersPerTeam')}</Text>
                <TouchableOpacity
                  style={styles.teamNameInput}
                  onPress={() => setShowEditPlayersPerTeamOptions(!showEditPlayersPerTeamOptions)}
                >
                  <View style={styles.selectContent}>
                    <Text style={styles.selectText}>
                      {t('team.playersPerTeamCount', { count: teamToEdit?.jugadoresPorEquipo || 11 })}
                    </Text>
                    <Ionicons name={showEditPlayersPerTeamOptions ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {showEditPlayersPerTeamOptions && (
                  <View style={styles.optionsContainer}>
                    <ScrollView style={styles.optionsScroll} nestedScrollEnabled={true}>
                      {playersPerTeamOptions.map(count => (
                        <TouchableOpacity
                          key={count}
                          style={[
                            styles.optionItem,
                            teamToEdit?.jugadoresPorEquipo === count && styles.optionItemSelected
                          ]}
                          onPress={() => {
                            setTeamToEdit(prev => ({ ...prev, jugadoresPorEquipo: count }));
                            setShowEditPlayersPerTeamOptions(false);
                          }}
                        >
                          <Text style={[
                            styles.optionText,
                            teamToEdit?.jugadoresPorEquipo === count && styles.optionTextSelected
                          ]}>
                            {t('team.playersPerTeamCount', { count })}
                          </Text>
                          {teamToEdit?.jugadoresPorEquipo === count && (
                            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Selector de escudo */}
                <Text style={styles.inputLabel}>{t('team.badge')}</Text>
                <TouchableOpacity
                  style={styles.badgeContainer}
                  onPress={pickBadgeImage}
                >
                  {teamToEdit?.escudo ? (
                    <View style={styles.badgePreview}>
                      <Image source={{ uri: teamToEdit.escudo }} style={styles.badgeImage} />
                      <TouchableOpacity
                        style={styles.removeBadgeButton}
                        onPress={() => setTeamToEdit(prev => ({ ...prev, escudo: null }))}
                      >
                        <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.badgePlaceholder}>
                      <Ionicons name="image-outline" size={40} color={theme.colors.inputPlaceholder} />
                      <Text style={styles.badgePlaceholderText}>{t('team.tapToUpload')}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={[styles.modalActions, { marginBottom: 32 }]}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setEditTeamModalVisible(false);
                      setTeamToEdit(null);
                      setShowEditCategoryOptions(false);
                      setShowEditTimeOptions(false);
                      setShowEditPlayersPerTeamOptions(false);
                    }}
                  >
                    <Text style={styles.modalCancelText}>{t('message.cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalConfirmButton}
                    onPress={handleUpdateTeam}
                  >
                    <Text style={styles.modalConfirmText}>{t('matchSheet.actions.save')}</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAwareScrollView>
            </View>
          </View>
        </Modal>

        {/* Create Team Modal */}
        <Modal
          visible={createTeamModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setCreateTeamModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={IS_TABLET ? styles.modalContentTablet : styles.modalContent}>
              <View style={[styles.modalHeader, IS_MOBILE && { padding: 14 }]}>
                <Text style={[styles.modalTitle, IS_MOBILE && { fontSize: 16 }]}>{t('team.createTeam')}</Text>
                <TouchableOpacity
                  onPress={() => setCreateTeamModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <KeyboardAwareScrollView style={[styles.modalBody, IS_MOBILE && { padding: 14 }]} showsVerticalScrollIndicator={false}>
                {/* Nombre del equipo */}
                <TextInput
                  style={styles.teamNameInput}
                  placeholder={t('team.teamName')}
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  value={newTeam.nombre}
                  onChangeText={(text) => setNewTeam(prev => ({ ...prev, nombre: text }))}
                />

                {/* Selector de categoría */}
                <Text style={styles.inputLabel}>{t('team.category')}</Text>
                <TouchableOpacity
                  style={styles.teamNameInput}
                  onPress={() => setShowCreateCategoryOptions(!showCreateCategoryOptions)}
                >
                  <View style={styles.selectContent}>
                    <Text style={newTeam.categoriaKey ? styles.selectText : styles.selectPlaceholder}>
                      {newTeam.categoriaKey 
                        ? categoryOptions.find(c => c.value === newTeam.categoriaKey)?.label 
                        : t('team.selectCategory')}
                    </Text>
                    <Ionicons name={showCreateCategoryOptions ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {showCreateCategoryOptions && (
                  <View style={styles.optionsContainer}>
                    <ScrollView style={styles.optionsScroll} nestedScrollEnabled={true}>
                      {categoryOptions.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.optionItem,
                            newTeam.categoriaKey === option.value && styles.optionItemSelected
                          ]}
                          onPress={() => {
                            setNewTeam(prev => ({ ...prev, categoriaKey: option.value }));
                            setShowCreateCategoryOptions(false);
                          }}
                        >
                          <Text style={[
                            styles.optionText,
                            newTeam.categoriaKey === option.value && styles.optionTextSelected
                          ]}>
                            {option.label}
                          </Text>
                          {newTeam.categoriaKey === option.value && (
                            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Categoría personalizada si es "otro" */}
                {newTeam.categoriaKey === 'otro' && (
                  <TextInput
                    style={styles.teamNameInput}
                    placeholder={t('team.customCategoryPlaceholder')}
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    value={newTeam.categoriaCustom}
                    onChangeText={(text) => setNewTeam(prev => ({ ...prev, categoriaCustom: text }))}
                  />
                )}

                {/* Selector de tiempo por parte */}
                <Text style={styles.inputLabel}>{t('team.timePerHalf')}</Text>
                <TouchableOpacity
                  style={styles.teamNameInput}
                  onPress={() => setShowCreateTimeOptions(!showCreateTimeOptions)}
                >
                  <View style={styles.selectContent}>
                    <Text style={styles.selectText}>
                      {t('team.timePerHalfMinutes', { minutes: newTeam.tiempoPorParte })}
                    </Text>
                    <Ionicons name={showCreateTimeOptions ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {showCreateTimeOptions && (
                  <View style={styles.optionsContainer}>
                    <ScrollView style={styles.optionsScroll} nestedScrollEnabled={true}>
                      {timePerHalfOptions.map(time => (
                        <TouchableOpacity
                          key={time}
                          style={[
                            styles.optionItem,
                            newTeam.tiempoPorParte === time && styles.optionItemSelected
                          ]}
                          onPress={() => {
                            setNewTeam(prev => ({ ...prev, tiempoPorParte: time }));
                            setShowCreateTimeOptions(false);
                          }}
                        >
                          <Text style={[
                            styles.optionText,
                            newTeam.tiempoPorParte === time && styles.optionTextSelected
                          ]}>
                            {t('team.timePerHalfMinutes', { minutes: time })}
                          </Text>
                          {newTeam.tiempoPorParte === time && (
                            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Selector de jugadores por equipo */}
                <Text style={styles.inputLabel}>{t('team.playersPerTeam')}</Text>
                <TouchableOpacity
                  style={styles.teamNameInput}
                  onPress={() => setShowCreatePlayersPerTeamOptions(!showCreatePlayersPerTeamOptions)}
                >
                  <View style={styles.selectContent}>
                    <Text style={styles.selectText}>
                      {t('team.playersPerTeamCount', { count: newTeam.jugadoresPorEquipo })}
                    </Text>
                    <Ionicons name={showCreatePlayersPerTeamOptions ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textMuted} />
                  </View>
                </TouchableOpacity>

                {showCreatePlayersPerTeamOptions && (
                  <View style={styles.optionsContainer}>
                    <ScrollView style={styles.optionsScroll} nestedScrollEnabled={true}>
                      {playersPerTeamOptions.map(count => (
                        <TouchableOpacity
                          key={count}
                          style={[
                            styles.optionItem,
                            newTeam.jugadoresPorEquipo === count && styles.optionItemSelected
                          ]}
                          onPress={() => {
                            setNewTeam(prev => ({ ...prev, jugadoresPorEquipo: count }));
                            setShowCreatePlayersPerTeamOptions(false);
                          }}
                        >
                          <Text style={[
                            styles.optionText,
                            newTeam.jugadoresPorEquipo === count && styles.optionTextSelected
                          ]}>
                            {t('team.playersPerTeamCount', { count })}
                          </Text>
                          {newTeam.jugadoresPorEquipo === count && (
                            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Selector de escudo */}
                <Text style={styles.inputLabel}>{t('team.badge')}</Text>
                <TouchableOpacity
                  style={styles.badgeContainer}
                  onPress={pickNewTeamBadgeImage}
                >
                  {newTeam.escudo ? (
                    <View style={styles.badgePreview}>
                      <Image source={{ uri: newTeam.escudo }} style={styles.badgeImage} />
                      <TouchableOpacity
                        style={styles.removeBadgeButton}
                        onPress={() => setNewTeam(prev => ({ ...prev, escudo: null }))}
                      >
                        <Ionicons name="close-circle" size={24} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.badgePlaceholder}>
                      <Ionicons name="image-outline" size={40} color={theme.colors.inputPlaceholder} />
                      <Text style={styles.badgePlaceholderText}>{t('team.tapToUpload')}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Opción de importar jugadores de temporada anterior */}
                {previousSeasonInfo && previousSeasonInfo.hasPlayers && (
                  <View style={styles.importPlayersSection}>
                    <Text style={styles.inputLabel}>{t('team.importPlayers')}</Text>
                    <TouchableOpacity
                      style={[
                        styles.importPlayersOption,
                        importPlayers && styles.importPlayersOptionSelected
                      ]}
                      onPress={() => setImportPlayers(!importPlayers)}
                    >
                      <View style={styles.importPlayersContent}>
                        <Ionicons 
                          name={importPlayers ? "checkbox" : "square-outline"} 
                          size={24} 
                          color={importPlayers ? theme.colors.primary : theme.colors.textMuted} 
                        />
                        <View style={styles.importPlayersTextContainer}>
                          <Text style={[
                            styles.importPlayersText,
                            importPlayers && styles.importPlayersTextSelected
                          ]}>
                            {t('team.importFromPreviousSeason', { 
                              season: formatSeasonYear(previousSeasonInfo.previousSeason.año) 
                            })}
                          </Text>
                          <Text style={styles.importPlayersSubtext}>
                            {t('team.playersToImport', { count: previousSeasonInfo.playersCount })}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => {
                      setCreateTeamModalVisible(false);
                      setNewTeam({
                        nombre: '',
                        categoriaKey: 'otro',
                        categoriaCustom: '',
                        tiempoPorParte: 45,
                        jugadoresPorEquipo: 11,
                        escudo: null
                      });
                      setShowCreateCategoryOptions(false);
                      setShowCreateTimeOptions(false);
                      setShowCreatePlayersPerTeamOptions(false);
                      setPreviousSeasonInfo(null);
                      setImportPlayers(false);
                    }}
                  >
                    <Text style={styles.modalCancelText}>{t('message.cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalConfirmButton, creatingTeam && styles.modalConfirmButtonDisabled]}
                    onPress={handleCreateTeam}
                    disabled={creatingTeam}
                  >
                    {creatingTeam ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.modalConfirmText}>{t('common.create')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </KeyboardAwareScrollView>
            </View>
          </View>
        </Modal>

        {/* Match Sheet Detail Modal */}
        <MatchSheetDetailModal
          visible={matchDetailVisible}
          matchSheet={selectedMatch}
          team={equipoSeleccionado}
          players={players}
          onClose={() => {
            setMatchDetailVisible(false);
            setSelectedMatch(null);
          }}
          onEdit={(match) => {
            // Cerrar modal de detalle y abrir modal de edición
            setMatchDetailVisible(false);
            // No poner selectedMatch a null para que el modal de edición lo use
            setEditMatchModalVisible(true);
          }}
          onDelete={() => handleDeleteMatch(selectedMatch?._id)}
        />

        {/* Training Session Detail Modal */}
        <TrainingSessionDetailModal
          visible={sessionDetailVisible}
          session={selectedSession}
          team={equipoSeleccionado}
          players={players}
          exercises={exercises}
          exerciseTypes={exerciseTypes}
          onClose={() => {
            setSessionDetailVisible(false);
            setSelectedSession(null);
          }}
          onEdit={(session) => {
            // Cerrar modal de detalle y abrir modal de edición
            setSessionDetailVisible(false);
            // No poner selectedSession a null para que el modal de edición lo use
            setEditSessionModalVisible(true);
          }}
          onDelete={() => handleDeleteSession(selectedSession?._id)}
          onWellnessUpdate={() => {
            // Recargar sesiones cuando se actualice el wellness
            if (equipoSeleccionado?._id) {
              dispatch(fetchEntrenamientosPorEquipo({ team: equipoSeleccionado._id }));
            }
          }}
        />

        {/* Add Event Modal */}
        <AddEventModal
          visible={addEventModalVisible}
          onClose={() => {
            setAddEventModalVisible(false);
            setAddEventSelectedDate(null);
          }}
          onCreateMatchSheet={handleCreateMatchFromCalendar}
          onCreateTrainingSession={handleCreateSessionFromCalendar}
          rivals={rivals}
          selectedDate={addEventSelectedDate}
          players={players}
          exercises={exercises}
          exerciseTypes={exerciseTypes}
          team={equipoSeleccionado}
          matchSheets={matchSheets}
          injuries={injuries}
        />

        {/* Edit Match Sheet Modal */}
        <EditMatchSheetModal
          visible={editMatchModalVisible}
          matchSheet={selectedMatch}
          rivals={rivals}
          players={players}
          injuries={injuries}
          team={equipoSeleccionado}
          matchSheets={matchSheets}
          sanctionedPlayerIds={sanctions.filter(s => s.sancionado).map(s => s.playerId)}
          onClose={() => {
            setEditMatchModalVisible(false);
            setSelectedMatch(null);
          }}
          onSave={async (matchData) => {
            await handleSaveMatchEdit(matchData);
            setEditMatchModalVisible(false);
            setSelectedMatch(null);
          }}
        />

        {/* Edit Training Session Modal */}
        <EditSessionModal
          visible={editSessionModalVisible}
          session={selectedSession}
          players={players}
          exercises={exercises}
          exerciseTypes={exerciseTypes}
          injuries={injuries}
          onClose={() => {
            setEditSessionModalVisible(false);
            setSelectedSession(null);
          }}
          onSave={async (sessionData) => {
            await handleSaveSessionEdit(sessionData);
            setEditSessionModalVisible(false);
            setSelectedSession(null);
          }}
        />

        {/* Team Detail Modal */}
        <Modal
          visible={teamDetailModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setTeamDetailModalVisible(false);
            setShowDeleteConfirmation(false);
            setDeleteConfirmationText('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={IS_TABLET ? styles.modalContentTablet : styles.modalContent}>
              <View style={[styles.modalHeader, IS_MOBILE && { padding: 14 }]}>
                <Text style={[styles.modalTitle, IS_MOBILE && { fontSize: 16 }]}>{t('team.teamDetails')}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setTeamDetailModalVisible(false);
                    setShowDeleteConfirmation(false);
                    setDeleteConfirmationText('');
                  }}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={[styles.modalBody, IS_MOBILE && { padding: 14 }]} showsVerticalScrollIndicator={false}>
                {equipoSeleccionado && (
                  <>
                    {/* Información del equipo */}
                    <View style={styles.teamDetailCard}>
                      <View style={styles.teamDetailHeader}>
                        <View style={styles.teamDetailBadgeContainer}>
                          {equipoSeleccionado.escudo ? (
                            <Image source={{ uri: equipoSeleccionado.escudo }} style={styles.teamDetailBadge} />
                          ) : (
                            <View style={styles.teamDetailBadgePlaceholder}>
                              <Ionicons name="shield" size={40} color={theme.colors.primary} />
                            </View>
                          )}
                        </View>
                        <View style={styles.teamDetailInfo}>
                          <Text style={styles.teamDetailName}>{equipoSeleccionado.nombre}</Text>
                          <Text style={styles.teamDetailCategory}>{equipoSeleccionado.categoria}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.teamDetailStats}>
                        <View style={styles.teamDetailStatItem}>
                          <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                          <Text style={styles.teamDetailStatLabel}>{t('team.timePerHalf')}</Text>
                          <Text style={styles.teamDetailStatValue}>
                            {t('team.timePerHalfMinutes', { minutes: equipoSeleccionado.tiempoPorParte || 45 })}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Botón editar */}
                    <TouchableOpacity
                      style={styles.teamDetailEditButton}
                      onPress={() => {
                        setTeamDetailModalVisible(false);
                        openEditTeamModal(equipoSeleccionado);
                      }}
                    >
                      <Ionicons name="pencil" size={20} color={theme.colors.primary} />
                      <Text style={styles.teamDetailEditButtonText}>{t('team.editTeam')}</Text>
                    </TouchableOpacity>

                    {/* Sección de eliminación */}
                    <View style={styles.dangerZone}>
                      <View style={styles.dangerZoneHeader}>
                        <Ionicons name="warning" size={24} color={theme.colors.error} />
                        <Text style={styles.dangerZoneTitle}>{t('team.dangerZone')}</Text>
                      </View>
                      
                      {!showDeleteConfirmation ? (
                        <TouchableOpacity
                          style={styles.deleteTeamButton}
                          onPress={() => setShowDeleteConfirmation(true)}
                        >
                          <Ionicons name="trash" size={20} color={theme.colors.error} />
                          <Text style={styles.deleteTeamButtonText}>{t('team.deleteTeam')}</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.deleteConfirmationContainer}>
                          <View style={styles.deleteWarningBox}>
                            <Ionicons name="alert-circle" size={32} color={theme.colors.error} />
                            <Text style={styles.deleteWarningTitle}>{t('team.deleteWarningTitle')}</Text>
                            <Text style={styles.deleteWarningText}>{t('team.deleteWarningMessage')}</Text>
                            <Text style={styles.deleteWarningList}>
                              • {t('team.deleteWarningPlayers')}{'\n'}
                              • {t('team.deleteWarningMatches')}{'\n'}
                              • {t('team.deleteWarningSessions')}{'\n'}
                              • {t('team.deleteWarningInjuries')}{'\n'}
                              • {t('team.deleteWarningStats')}{'\n'}
                              • {t('team.deleteWarningRivals')}
                            </Text>
                          </View>
                          
                          <Text style={styles.deleteConfirmationLabel}>
                            {t('team.deleteConfirmationInstruction', { teamName: equipoSeleccionado.nombre })}
                          </Text>
                          <TextInput
                            style={styles.deleteConfirmationInput}
                            placeholder={equipoSeleccionado.nombre}
                            placeholderTextColor={theme.colors.inputPlaceholder}
                            value={deleteConfirmationText}
                            onChangeText={setDeleteConfirmationText}
                          />
                          
                          <View style={styles.deleteConfirmationButtons}>
                            <TouchableOpacity
                              style={styles.deleteCancelButton}
                              onPress={() => {
                                setShowDeleteConfirmation(false);
                                setDeleteConfirmationText('');
                              }}
                            >
                              <Text style={styles.deleteCancelButtonText}>{t('message.cancel')}</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              style={[
                                styles.deleteConfirmButton,
                                deleteConfirmationText.trim() !== equipoSeleccionado.nombre.trim() && styles.deleteConfirmButtonDisabled
                              ]}
                              onPress={handleDeleteTeamWithData}
                              disabled={deleteConfirmationText.trim() !== equipoSeleccionado.nombre.trim() || deletingTeam}
                            >
                              {deletingTeam ? (
                                <ActivityIndicator size="small" color={theme.colors.error} />
                              ) : (
                                <>
                                  <Ionicons name="trash" size={16} color={theme.colors.error} style={{ marginRight: 6 }} />
                                  <Text style={styles.deleteConfirmButtonText}>{t('edition.delete')}</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </AppLayout>
  );
}
const makeStyles = (theme) => StyleSheet.create({
  // Container and Layout
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 32 : 40,
  },
  loadingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: isMobileDevice() ? 28 : 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loadingText: {
    marginTop: 18,
    fontSize: isMobileDevice() ? 15 : 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },

  // Header Section
  headerSection: {
    marginBottom: isMobileDevice() ? 20 : 24,
    marginTop: isMobileDevice() ? 12 : 16,
  },
  headerGradient: {
    borderRadius: 20,
    marginHorizontal: isMobileDevice() ? 12 : 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobileDevice() ? 18 : 22,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  headerIconContainer: {
    width: isMobileDevice() ? 40 : 48,
    height: isMobileDevice() ? 40 : 48,
    borderRadius: isMobileDevice() ? 12 : 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: isMobileDevice() ? 10 : 14,
    flex: 1,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: isMobileDevice() ? 12 : 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: isMobileDevice() ? 16 : 24,
    color: '#ffffff',
    fontWeight: '700',
    marginTop: isMobileDevice() ? 2 : 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  changeSeasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    paddingVertical: isMobileDevice() ? 8 : 10,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  changeSeasonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: isMobileDevice() ? 12 : 14,
    marginLeft: 6,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    marginBottom: isMobileDevice() ? 24 : 32,
    gap: isMobileDevice() ? 10 : 14,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: isMobileDevice() ? 14 : 16,
    paddingHorizontal: isMobileDevice() ? 16 : 20,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  primaryActionText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: isMobileDevice() ? 13 : 14,
    marginLeft: 8,
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: isMobileDevice() ? 14 : 16,
    paddingHorizontal: isMobileDevice() ? 16 : 20,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.success,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  secondaryActionText: {
    color: theme.colors.success,
    fontWeight: '700',
    fontSize: isMobileDevice() ? 13 : 14,
    marginLeft: 8,
  },

  // Section Styles
  sectionContainer: {
    marginBottom: isMobileDevice() ? 24 : 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    marginBottom: isMobileDevice() ? 14 : 18,
  },
  sectionTitle: {
    fontSize: isMobileDevice() ? 17 : 19,
    fontWeight: '700',
    color: theme.colors.text,
    marginLeft: 10,
  },

  // Teams Grid
  teamsGrid: {
    paddingHorizontal: isMobileDevice() ? 12 : 16,
  },

  // Team Cards
  teamCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: isMobileDevice() ? 14 : 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  teamCardSelected: {
    backgroundColor: theme.colors.primary + '12',
    borderColor: theme.colors.primary,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.15,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 3,
  },
  teamNameSelected: {
    color: theme.colors.primary,
  },
  teamCategory: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  teamCategorySelected: {
    color: theme.colors.primaryLight,
  },
  teamActions: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  teamActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  teamActionText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Add Team Card
  addTeamCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 28,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  addTeamText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginTop: 10,
  },

  // Empty States
  emptyStateContainer: {
    paddingHorizontal: 16,
  },
  emptyStateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 18,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  createTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 14,
    marginTop: 22,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  createTeamButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 10,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 14,
    marginTop: 22,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 10,
  },

  // Team Details
  teamDetailsContainer: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  teamDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  teamDetailsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginLeft: 10,
  },
  addPlayerHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addPlayerHeaderText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Players List
  playersList: {
    padding: 16,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  playerInitials: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 3,
  },
  playerDetails: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  playerCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    marginBottom: 6,
  },
  playerAvatarCompact: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playerInitialsCompact: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  playerInfoCompact: {
    flex: 1,
  },
  playerNameCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  playerDetailsCompact: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 14,
    gap: 10,
  },
  playerCardGrid: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    width: isMobileDevice() ? '31%' : '23.5%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    minHeight: 110,
  },
  playerAvatarGrid: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  playerInitialsGrid: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  playerInfoGrid: {
    alignItems: 'center',
    flex: 1,
  },
  playerNameGrid: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 2,
    lineHeight: 14,
  },
  playerPositionGrid: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 1,
  },
  playerDetailsGrid: {
    fontSize: 10,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 12,
  },

  // Empty Players
  emptyPlayersContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyPlayersText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },

  // Add Player Form
  addPlayerContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  addPlayerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  addPlayerForm: {
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  inputHalf: {
    flex: 1,
  },
  addPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addPlayerButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },

  // Premium CTA
  premiumContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  premiumCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: theme.colors.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  modalContentTablet: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '80%',
    maxWidth: 700,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  teamNameInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
  },
  emptyModalSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },

  // Season Items
  seasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: theme.colors.inputBg,
  },
  seasonItemActive: {
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  seasonItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  seasonItemTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  seasonItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  seasonItemTextActive: {
    color: theme.colors.primary,
  },
  seasonItemSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  seasonItemSubtextActive: {
    color: theme.colors.primaryLight,
  },

  // Empty Modal
  emptyModalContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyModalText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },

  // Organization Modal
  orgModalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 8 : 20,
  },
  orgModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 14 : 20,
    width: '100%',
    height: isMobileDevice() ? '95%' : '90%',
    maxWidth: 800,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  // Player Modal
  playerModalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  playerModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  playerModalContentTablet: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '80%',
    maxWidth: 700,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  playerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  playerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  playerModalClose: {
    padding: 4,
  },
  playerModalBody: {
    padding: 20,
  },
  playerModalInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 12,
  },
  playerModalActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  playerModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  playerModalButtonDelete: {
    backgroundColor: theme.colors.error,
    shadowColor: theme.colors.error,
  },
  playerModalButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 8,
  },

  // Select Styles
  selectModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 14 : 16,
    margin: isMobileDevice() ? 12 : 20,
    maxHeight: isMobileDevice() ? '80%' : '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  selectModalBody: {
    padding: 16,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: theme.colors.inputBg,
  },
  selectOptionSelected: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  selectOptionText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  selectOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalInputText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  modalInputPlaceholder: {
    fontSize: 16,
    color: theme.colors.textMuted,
    flex: 1,
  },
  yearOptionsContainer: {
    maxHeight: 200,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: -8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  yearOptionsScroll: {
    maxHeight: 200,
  },
  yearOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  yearOptionSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  yearOptionText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  yearOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Position Select Styles (Create Player)
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  selectInputPlaceholder: {
    fontSize: 14,
    color: theme.colors.textMuted,
    flex: 1,
  },
  positionOptionsContainer: {
    maxHeight: 180,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  positionOptionsScroll: {
    maxHeight: 180,
  },
  positionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  positionOptionSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  positionOptionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  positionOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Position Select Styles (Edit Player Modal)
  playerModalSelect: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerModalSelectText: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  playerModalSelectPlaceholder: {
    fontSize: 16,
    color: theme.colors.textMuted,
    flex: 1,
  },
  editPositionOptionsContainer: {
    maxHeight: 150,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  editPositionOptionsScroll: {
    maxHeight: 150,
  },
  editPositionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  editPositionOptionSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  editPositionOptionText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  editPositionOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Add Player Modal
  addPlayerModalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 12 : 20,
  },
  addPlayerModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 14 : 16,
    width: '100%',
    maxWidth: isMobileDevice() ? 380 : 400,
    maxHeight: isMobileDevice() ? '85%' : '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  addPlayerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isMobileDevice() ? 16 : 20,
    paddingVertical: isMobileDevice() ? 14 : 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  addPlayerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  addPlayerModalCloseButton: {
    padding: 4,
  },
  addPlayerModalBody: {
    padding: isMobileDevice() ? 16 : 20,
    maxHeight: isMobileDevice() ? 280 : 300,
  },
  addPlayerModalActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  addPlayerModalCancelButton: {
    flex: 1,
    backgroundColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addPlayerModalCancelText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  addPlayerModalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addPlayerModalDeleteButton: {
    backgroundColor: theme.colors.error,
    shadowColor: theme.colors.error,
  },
  addPlayerModalConfirmText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  
  // Team Form Styles
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  selectText: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  selectPlaceholder: {
    fontSize: 16,
    color: theme.colors.textMuted,
    flex: 1,
  },
  optionsContainer: {
    maxHeight: 200,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: -8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionsScroll: {
    maxHeight: 200,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionItemSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  optionText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    backgroundColor: theme.colors.backgroundAlt,
  },
  badgePreview: {
    position: 'relative',
    alignItems: 'center',
  },
  badgeImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeBadgeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  badgePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  badgePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  // Import Players Section
  importPlayersSection: {
    marginTop: 16,
  },
  importPlayersOption: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  importPlayersOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  importPlayersContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  importPlayersTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  importPlayersText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  importPlayersTextSelected: {
    color: theme.colors.primary,
  },
  importPlayersSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.7,
  },

  teamItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamEditButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.border,
  },
  
  // Event Section Styles (for day events modal)
  eventSection: {
    marginBottom: 20,
  },
  eventSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  eventSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  eventItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventItemContent: {
    flex: 1,
  },
  eventItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  eventItemSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  
  // Modal Footer para crear temporada
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
    marginTop: 8,
        display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createSeasonInModalButton: {
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    width: '90%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
  },
  createSeasonInModalButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  
  // Team Detail Modal
  teamDetailCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  teamDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamDetailBadgeContainer: {
    marginRight: 16,
  },
  teamDetailBadge: {
    width: 70,
    height: 70,
    borderRadius: 16,
  },
  teamDetailBadgePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamDetailInfo: {
    flex: 1,
  },
  teamDetailName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  teamDetailCategory: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  teamDetailStats: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  teamDetailStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamDetailStatLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  teamDetailStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  teamDetailEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary + '10',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  teamDetailEditButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  teamBadgeSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  teamDetailChevron: {
    marginLeft: 8,
  },
  
  // Danger Zone
  dangerZone: {
    backgroundColor: theme.colors.error + '08',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.error + '25',
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.error,
    marginLeft: 10,
  },
  deleteTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.error + '40',
  },
  deleteTeamButtonText: {
    color: theme.colors.error,
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  deleteConfirmationContainer: {
    marginTop: 8,
  },
  deleteWarningBox: {
    backgroundColor: theme.colors.error + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  deleteWarningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.error,
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteWarningText: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  deleteWarningList: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'left',
    lineHeight: 22,
  },
  deleteConfirmationLabel: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 10,
    fontWeight: '500',
  },
  deleteConfirmationInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.error + '40',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
  },
  deleteConfirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deleteCancelButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  deleteConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.error,
  },
  deleteConfirmButtonDisabled: {
    backgroundColor: theme.colors.error + '40',
  },
  deleteConfirmButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});