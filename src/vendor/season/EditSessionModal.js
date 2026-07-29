// components/pages/season/EditSessionModal.js
// Modal para editar sesiones de entrenamiento desde temporadas
import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';

import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { getVideosByExercise, getVideoStreamUrl, regenerateVideoWithField } from '@/utils/api';
import { resolvePlayableVideoUrl } from '@/utils/videoPlayback';
import { getFieldById } from '@/utils/fieldTypes';
import { getPlayerFullName, getPlayerInitials } from '@/utils/playerHelpers';
import ExerciseSelectorModal from '@/vendor/shared/ExerciseSelectorModal';
import StrengthExerciseSelectorModal from '@/vendor/shared/StrengthExerciseSelectorModal';
import { STRENGTH_EXERCISES, getStrengthExerciseImage, getSectionForExercise } from '@/data/strengthExercises';

// Componentes y helpers compartidos
import { PlayerSelectionModal, getPlayerInjuryStatus } from '@/vendor/shared/training';
import {
  buildExerciseMap,
  getEmbeddedSessionExercises,
  getEntityId,
  getSessionExerciseId,
  mergeExercises,
} from '@/utils/sessionExercises';
import { clearFormDraft, loadFormDraft, saveFormDraft, STORAGE_KEYS } from '@/utils/formPersistence';
import { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';
import CustomTrainingTaskModal from './CustomTrainingTaskModal';
import {
  customTaskAsExercise,
  getCustomTaskSelectionId,
  isCustomTaskSelectionId,
} from '@/utils/sessionCustomTasks';

const IS_MOBILE_DEVICE = Dimensions.get('window').width < 430;


// NOTA: PlayerSelectionModal ahora se importa desde ../../shared/training
// Los helpers getPlayerInjuryStatus y THEME también vienen de allí

export default function EditSessionModal({
  visible,
  session,
  players = [],
  exercises = [],
  injuries = [],
  onClose,
  onSave,
  canMutate = true,
  onCreateExerciseFromSession,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'es';
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [loading, setLoading] = useState(false);

  // Detectar dispositivo móvil
  const { width } = useWindowDimensions();
  const isMobile = width < 500;
  const IS_MOBILE = width < 430;
  const IS_TABLET = width > 700;

  // Estados del formulario
  const [fecha, setFecha] = useState(new Date());
  const [horaInicio, setHoraInicio] = useState('17:00');
  const [horaFin, setHoraFin] = useState('18:30');
  const [observaciones, setObservaciones] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [customTasks, setCustomTasks] = useState([]);
  const [customTaskModal, setCustomTaskModal] = useState({ visible: false, task: null });
  const [exerciseObservations, setExerciseObservations] = useState({});
  const [exerciseRestTimes, setExerciseRestTimes] = useState({});
  const [exerciseTeamAssignments, setExerciseTeamAssignments] = useState({});
  const [showTeamAssignmentModal, setShowTeamAssignmentModal] = useState(false);
  const [currentExerciseForTeams, setCurrentExerciseForTeams] = useState(null);

  // Estados para ejercicios de fuerza
  const [selectedStrengthExercises, setSelectedStrengthExercises] = useState([]);
  const [strengthExerciseObservations, setStrengthExerciseObservations] = useState({});
  const [strengthExerciseRestTimes, setStrengthExerciseRestTimes] = useState({});
  const [showStrengthExerciseSelectorModal, setShowStrengthExerciseSelectorModal] = useState(false);

  // Estados para jugadores extras
  const [extraPlayers, setExtraPlayers] = useState([]);

  // Filtrar jugadores de plantilla y extras disponibles
  const rosterPlayers = useMemo(() =>
    (players || []).filter(p => !p.extra && (p.activo !== false || session?.jugadores?.includes(p._id) || session?.jugadores?.some(j => (j._id || j) === p._id))),
    [players, session]
  );

  const extraPlayersAvailable = useMemo(() =>
    (players || []).filter(p => p.extra === true && (p.activo !== false || session?.jugadoresExtras?.includes(p._id) || session?.jugadoresExtras?.some(j => (j._id || j) === p._id))),
    [players, session]
  );

  // Estados para wellness
  const [expectedWellness, setExpectedWellness] = useState(null);
  const [manualAverageWellness, setManualAverageWellness] = useState('');

  // Pickers y modales
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showPlayerSelectorModal, setShowPlayerSelectorModal] = useState(false);
  const [showExerciseSelectorModal, setShowExerciseSelectorModal] = useState(false);

  // Estados para video de ejercicio
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [exerciseForVideo, setExerciseForVideo] = useState(null);
  const [exerciseVideoAvailability, setExerciseVideoAvailability] = useState({});

  const availableExercises = useMemo(() => (
    mergeExercises(exercises, getEmbeddedSessionExercises(session))
  ), [exercises, session]);

  const exerciseMap = useMemo(
    () => buildExerciseMap([...availableExercises, ...customTasks.map(customTaskAsExercise)]),
    [availableExercises, customTasks],
  );

  // Cargar disponibilidad de videos para todos los ejercicios
  useEffect(() => {
    const loadVideoAvailability = async () => {
      if (!availableExercises || availableExercises.length === 0) return;

      const availability = {};
      await Promise.all(
        availableExercises.filter((exercise) => !exercise.isCustomTask).map(async (exercise) => {
          try {
            const exerciseId = getEntityId(exercise);
            const videos = await getVideosByExercise(exerciseId);
            availability[exerciseId] = videos && videos.length > 0;
          } catch (error) {
            const exerciseId = getEntityId(exercise);
            if (exerciseId) availability[exerciseId] = false;
          }
        })
      );
      setExerciseVideoAvailability(availability);
    };

    if (visible && availableExercises?.length > 0) {
      loadVideoAvailability();
    }
  }, [visible, availableExercises]);
  // Función para ver videos del ejercicio
  const handlePlayExerciseVideo = async (exercise) => {
    setExerciseForVideo(exercise);
    setShowVideoModal(true);
    setIsGeneratingVideo(true);

    try {
      const videos = await getVideosByExercise(exercise._id);

      if (videos && videos.length > 0) {
        const video = videos[0];
        setSelectedVideo(video);
        const url = await resolvePlayableVideoUrl(video);
        if (url) setVideoUrl(url);
        else { Alert.alert(t('message.info'), t('exercise.noVideos')); setShowVideoModal(false); }
      } else {
        Alert.alert(t('message.info'), t('exercise.noVideos'));
        setShowVideoModal(false);
      }
    } catch (error) {
      console.error('Error cargando videos:', error);
      Alert.alert(t('message.error'), t('exercise.videoPlayError'));
      setShowVideoModal(false);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
    setVideoUrl(null);
    setExerciseForVideo(null);
  };

  // Cargar datos al abrir
  useEffect(() => {
    if (visible && session) {
      setFecha(session.fecha ? new Date(session.fecha) : new Date());
      setHoraInicio(session.horaInicio || '17:00');
      setHoraFin(session.horaFin || '18:30');
      const generalObservationFromArray = Array.isArray(session.observaciones)
        ? (session.observaciones.find((item) => {
          if (!item || typeof item !== 'object') return false;
          const exerciseId = getEntityId(item.ejercicioId || item.ejercicio);
          if (exerciseId) return false;
          const text = item.observacion || item.text || item.note || '';
          return typeof text === 'string' && text.trim();
        })?.observacion
          || session.observaciones.find((item) => {
            if (!item || typeof item !== 'object') return false;
            const exerciseId = getEntityId(item.ejercicioId || item.ejercicio);
            if (exerciseId) return false;
            return typeof item.text === 'string' && item.text.trim();
          })?.text
          || session.observaciones.find((item) => {
            if (!item || typeof item !== 'object') return false;
            const exerciseId = getEntityId(item.ejercicioId || item.ejercicio);
            if (exerciseId) return false;
            return typeof item.note === 'string' && item.note.trim();
          })?.note
          || '')
        : '';
      setObservaciones(session.observacionesGenerales || (typeof session.observaciones === 'string' ? session.observaciones : '') || generalObservationFromArray || '');

      // Cargar jugadores (extraer IDs)
      const playerIds = (session.jugadores || []).map(j => typeof j === 'object' ? j._id : j);
      setSelectedPlayers(playerIds);

      // Cargar jugadores extras (extraer IDs - ahora son ObjectIds)
      const extraPlayerIds = (session.jugadoresExtras || []).map(j => typeof j === 'object' ? j._id : j);
      setExtraPlayers(extraPlayerIds);

      // Cargar wellness esperado
      setExpectedWellness(session.expectedWellness || null);
      setManualAverageWellness(session.manualAverageWellness ?? '');

      // Cargar ejercicios - manejar diferentes formatos
      const exerciseIds = [];
      const obs = {};
      const rest = {};
      const teams = {};

      // Primero intentar cargar desde ejerciciosDetalle (estructura nueva con orden y descanso)
      if (session.ejerciciosDetalle && session.ejerciciosDetalle.length > 0) {
        session.ejerciciosDetalle.forEach(ej => {
          const exId = getSessionExerciseId(ej);
          if (exId) {
            exerciseIds.push(exId);
            rest[exId] = ej.tiempoDescanso !== undefined ? ej.tiempoDescanso : 0;
            teams[exId] = ej.teamAssignments || [];
          }
        });
      }
      // Si no hay ejerciciosDetalle, cargar desde ejercicios (array de IDs o objetos populados)
      else if (session.ejercicios && session.ejercicios.length > 0) {
        session.ejercicios.forEach(ej => {
          const exId = getSessionExerciseId(ej);
          if (exId) {
            exerciseIds.push(exId);
            rest[exId] = ej.tiempoDescanso !== undefined ? ej.tiempoDescanso : 0;
          }
        });
      }

      // Cargar observaciones si vienen en el formato array de objetos {ejercicioId, observacion}
      if (Array.isArray(session.observaciones)) {
        session.observaciones.forEach(o => {
          const exerciseId = getEntityId(o.ejercicioId || o.ejercicio);
          if (exerciseId) {
            obs[exerciseId] = o.observacion || '';
          }
        });
      }

      const sessionCustomTasks = session.tareasPersonalizadas || [];
      const exerciseOrder = new Map(
        (session.ejerciciosDetalle || []).map((detail, index) => [
          getSessionExerciseId(detail),
          Number(detail.orden) || index + 1,
        ]),
      );
      const orderedSelection = [
        ...exerciseIds.map((id, index) => ({ id, orden: exerciseOrder.get(id) || index + 1 })),
        ...sessionCustomTasks.map((task) => ({
          id: getCustomTaskSelectionId(task),
          orden: Number(task.orden) || exerciseIds.length + 1,
        })),
      ].sort((a, b) => a.orden - b.orden).map((item) => item.id);

      setCustomTasks(sessionCustomTasks);
      setSelectedExercises(orderedSelection);
      setExerciseObservations(obs);
      setExerciseRestTimes(rest);
      setExerciseTeamAssignments(teams);

      // Cargar ejercicios de fuerza
      const strengthIds = [];
      const strengthObs = {};
      const strengthRest = {};
      if (session.ejerciciosFuerza && session.ejerciciosFuerza.length > 0) {
        session.ejerciciosFuerza.forEach(ef => {
          strengthIds.push(ef.id);
          strengthObs[ef.id] = ef.observacion || '';
          strengthRest[ef.id] = ef.tiempoDescanso !== undefined ? ef.tiempoDescanso : 0;
        });
      }
      setSelectedStrengthExercises(strengthIds);
      setStrengthExerciseObservations(strengthObs);
      setStrengthExerciseRestTimes(strengthRest);
    }
  }, [visible, session]);

  useEffect(() => {
    if (!visible) return;
    const draft = loadFormDraft(STORAGE_KEYS.TRAINING_SESSION_DRAFT);
    if (!draft || draft.mode !== 'edit') return;
    const addExerciseId = draft.addExerciseId;
    if (draft.fecha) setFecha(new Date(draft.fecha));
    if (draft.horaInicio) setHoraInicio(draft.horaInicio);
    if (draft.horaFin) setHoraFin(draft.horaFin);
    setObservaciones(draft.observaciones || '');
    setSelectedPlayers(draft.selectedPlayers || []);
    setExtraPlayers(draft.extraPlayers || []);
    setExerciseObservations(draft.exerciseObservations || {});
    setExerciseRestTimes(draft.exerciseRestTimes || {});
    setExerciseTeamAssignments(draft.exerciseTeamAssignments || {});
    setCustomTasks(draft.customTasks || []);
    setSelectedStrengthExercises(draft.selectedStrengthExercises || []);
    setStrengthExerciseObservations(draft.strengthExerciseObservations || {});
    setStrengthExerciseRestTimes(draft.strengthExerciseRestTimes || {});
    setExpectedWellness(draft.expectedWellness ?? null);
    setManualAverageWellness(draft.manualAverageWellness ?? '');
    setSelectedExercises([...new Set([...(draft.selectedExercises || []), ...(addExerciseId ? [addExerciseId] : [])])]);
  }, [visible]);

  const createExerciseFromSession = () => {
    saveFormDraft(STORAGE_KEYS.TRAINING_SESSION_DRAFT, {
      mode: 'edit',
      session,
      fecha,
      horaInicio,
      horaFin,
      observaciones,
      selectedPlayers,
      extraPlayers,
      selectedExercises,
      exerciseObservations,
      exerciseRestTimes,
      exerciseTeamAssignments,
      customTasks,
      selectedStrengthExercises,
      strengthExerciseObservations,
      strengthExerciseRestTimes,
      expectedWellness,
      manualAverageWellness,
      originPath: window.location.pathname,
    });
    setShowExerciseSelectorModal(false);
    onCreateExerciseFromSession?.();
  };

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return '';
    const locale = currentLang === 'en' ? 'en-US' : 'es-ES';
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Handler para fecha
  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android' || Platform.OS === 'web') {
      setShowDatePicker(false);
    }
    if (date) {
      setFecha(date);
    }
  };

  // Parsear hora string a Date
  const parseTimeString = (timeStr) => {
    const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  };

  // Handler para hora de inicio
  const handleStartTimeChange = (event, date) => {
    if (Platform.OS === 'android' || Platform.OS === 'web') {
      setShowStartTimePicker(false);
    }
    if (date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setHoraInicio(`${hours}:${minutes}`);
    }
  };

  // Handler para hora de fin
  const handleEndTimeChange = (event, date) => {
    if (Platform.OS === 'android' || Platform.OS === 'web') {
      setShowEndTimePicker(false);
    }
    if (date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setHoraFin(`${hours}:${minutes}`);
    }
  };

  // Helper para obtener nombre de ejercicio
  const getExerciseName = (exId) => {
    const ex = exerciseMap.get(getEntityId(exId));
    return ex ? ex.nombre : 'Ejercicio';
  };

  // Helper para obtener carpeta de ejercicio
  const getExerciseFolderName = (exercise) => {
    if (exercise.folder && typeof exercise.folder === 'object') return exercise.folder.nombre;
    return '';
  };

  // Helper para obtener nombre de jugador
  const getPlayerName = (playerId) => {
    const player = players.find(p => p._id === playerId);
    return player ? getPlayerFullName(player) : '';
  };

  const getExerciseComodines = (exerciseId) => {
    const specialAssignment = (exerciseTeamAssignments[exerciseId] || []).find(ta => ta.teamNumber === 0);
    return Math.max(0, specialAssignment?.comodines || 0);
  };

  const getComodinesAssignment = (exerciseId) => (
    (exerciseTeamAssignments[exerciseId] || []).find(ta => ta.teamNumber === 0) || { teamNumber: 0, players: [], extraPlayers: [], comodines: 0 }
  );

  const updateExerciseComodines = (exerciseId, nextValue) => {
    const teamAssignments = exerciseTeamAssignments[exerciseId] || [];
    const newAssignments = teamAssignments.map(ta => ({
      ...ta,
      players: [...(ta.players || [])],
      extraPlayers: [...(ta.extraPlayers || [])]
    }));
    let assignmentIndex = newAssignments.findIndex(ta => ta.teamNumber === 0);
    if (assignmentIndex === -1) {
      newAssignments.push({ teamNumber: 0, players: [], extraPlayers: [], comodines: 0 });
      assignmentIndex = newAssignments.length - 1;
    }
    newAssignments[assignmentIndex].comodines = Math.max(0, nextValue);
    setExerciseTeamAssignments(prev => ({
      ...prev,
      [exerciseId]: newAssignments
    }));
  };

  const normalizeTextValue = (value) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value
        .map(item => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') return item.observacion || item.text || JSON.stringify(item);
          return '';
        })
        .filter(Boolean)
        .join('\n');
    }
    if (value && typeof value === 'object') {
      return value.observacion || value.text || JSON.stringify(value);
    }
    return '';
  };

  // Añadir ejercicio
  const handleAddExercise = (exerciseId) => {
    const id = getEntityId(exerciseId);
    if (id && !selectedExercises.includes(id)) {
      setSelectedExercises([...selectedExercises, id]);
      setExerciseObservations(prev => ({ ...prev, [id]: '' }));
      setExerciseRestTimes(prev => ({ ...prev, [id]: 0 }));
    }
  };

  // Eliminar ejercicio
  const handleRemoveExercise = (exerciseId) => {
    const id = getEntityId(exerciseId);
    setSelectedExercises(selectedExercises.filter(item => item !== id));
    if (isCustomTaskSelectionId(id)) {
      setCustomTasks((current) => current.filter((task) => getCustomTaskSelectionId(task) !== id));
    }
    const newObs = { ...exerciseObservations };
    const newRest = { ...exerciseRestTimes };
    delete newObs[id];
    delete newRest[id];
    setExerciseObservations(newObs);
    setExerciseRestTimes(newRest);
  };

  const handleSaveCustomTask = (task) => {
    const selectionId = getCustomTaskSelectionId(task);
    setCustomTasks((current) => {
      const exists = current.some((item) => item.id === task.id);
      return exists ? current.map((item) => item.id === task.id ? task : item) : [...current, task];
    });
    setSelectedExercises((current) => current.includes(selectionId) ? current : [...current, selectionId]);
  };

  // Guardar cambios
  const handleSave = async () => {
    setLoading(true);
    try {
      // Preparar ejercicios con observaciones, tiempos y asignaciones de equipos
      const ejerciciosConDatos = selectedExercises.flatMap((exId, index) => (
        isCustomTaskSelectionId(exId) ? [] : [{
          ejercicio: exId,
          orden: index + 1,
          observacion: exerciseObservations[exId] || '',
          tiempoDescanso: exerciseRestTimes[exId] || 0,
          teamAssignments: exerciseTeamAssignments[exId] || [],
        }]
      ));
      const tareasPersonalizadas = customTasks.map((task) => ({
        ...task,
        orden: selectedExercises.indexOf(getCustomTaskSelectionId(task)) + 1,
      }));

      // Preparar ejercicios de fuerza
      const ejerciciosFuerzaConDatos = selectedStrengthExercises.map((seId, index) => ({
        id: seId,
        orden: index,
        observacion: strengthExerciseObservations[seId] || '',
        tiempoDescanso: strengthExerciseRestTimes[seId] || 0,
      }));

      await onSave({
        ...session,
        fecha: fecha.toISOString(),
        horaInicio,
        horaFin,
        observaciones,
        ejercicios: ejerciciosConDatos,
        tareasPersonalizadas,
        ejerciciosFuerza: ejerciciosFuerzaConDatos,
        jugadores: selectedPlayers,
        jugadoresExtras: extraPlayers,
        expectedWellness,
        manualAverageWellness: manualAverageWellness === '' ? null : Number(manualAverageWellness),
      });
      clearFormDraft(STORAGE_KEYS.TRAINING_SESSION_DRAFT);
      onClose();
    } catch (error) {
      Alert.alert(t('message.error'), t('session.saveChangesError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalBg,
          {
            paddingTop: Math.max(insets.top, isMobile ? 8 : 0),
            paddingBottom: Math.max(insets.bottom, isMobile ? 8 : 0),
          },
        ]}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={[styles.modalHeader, IS_MOBILE && { padding: 14 }]}>
            <View style={styles.headerIcon}>
              <Ionicons name="fitness" size={24} color={theme.colors.success} />
            </View>
            <Text style={[styles.modalTitle, IS_MOBILE && { fontSize: 16 }]}>{t('session.editSessionTitle')}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView style={[styles.modalBody, IS_MOBILE && { padding: 14 }]} showsVerticalScrollIndicator={false}>
            {/* Fecha */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('common.date')}</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={theme.colors.success} style={{ marginRight: 12 }} />
                <Text style={styles.selectText}>{formatDate(fecha)}</Text>
              </TouchableOpacity>
            </View>

            {/* Horario */}
            <View style={styles.timeSection}>
              <Text style={styles.sectionTitle}>{t('session.schedule')}</Text>

              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>{t('session.startTimeTitle')}</Text>
                  <TouchableOpacity
                    style={styles.timeInput}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Ionicons name="time" size={20} color={theme.colors.success} />
                    <Text style={styles.timeText}>{horaInicio}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.timeDivider}>
                  <Ionicons name="arrow-forward" size={20} color={theme.colors.textMuted} />
                </View>

                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>{t('session.endTimeTitle')}</Text>
                  <TouchableOpacity
                    style={styles.timeInput}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={theme.colors.success} />
                    <Text style={styles.timeText}>{horaFin}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Duración calculada */}
              {horaInicio && horaFin && (
                <View style={styles.durationBadge}>
                  <Ionicons name="hourglass-outline" size={16} color={theme.colors.success} />
                  <Text style={styles.durationText}>
                    {t('session.duration')}: {(() => {
                      const [h1, m1] = horaInicio.split(':').map(Number);
                      const [h2, m2] = horaFin.split(':').map(Number);
                      const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
                      if (totalMinutes <= 0) return '--';
                      const hours = Math.floor(totalMinutes / 60);
                      const mins = totalMinutes % 60;
                      return hours > 0
                        ? `${hours}h ${mins > 0 ? mins + 'min' : ''}`
                        : `${mins} min`;
                    })()}
                  </Text>
                </View>
              )}
            </View>

            {/* Sección de Jugadores */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('common.players')}</Text>

              <TouchableOpacity
                style={styles.playerSelectorBtn}
                onPress={() => setShowPlayerSelectorModal(true)}
              >
                <View style={styles.playerSelectorLeft}>
                  <Ionicons name="people" size={20} color={theme.colors.success} />
                  <Text style={styles.playerSelectorText}>
                    {t('session.selectPlayersCount', { count: selectedPlayers.length })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>

              {/* Chips de jugadores seleccionados */}
              {selectedPlayers.length > 0 && (
                <View style={styles.selectedPlayersChips}>
                  {selectedPlayers.slice(0, 8).map(playerId => {
                    const playerName = getPlayerName(playerId);
                    if (!playerName) return null;
                    return (
                      <View key={playerId} style={styles.playerChipSmall}>
                        <Text style={styles.playerChipSmallText}>{playerName}</Text>
                      </View>
                    );
                  })}
                  {selectedPlayers.length > 8 && (
                    <View style={styles.playerChipMore}>
                      <Text style={styles.playerChipMoreText}>+{selectedPlayers.length - 8}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Jugadores Extras */}
              <Text style={styles.formSectionSubtitle}>{t('session.extraPlayers') || 'Jugadores Extras'}</Text>
              <Text style={styles.extraPlayersSubtitle}>{t('schedule.extraPlayersSubtitleNew') || 'Selecciona jugadores extras de la lista'}</Text>

              {extraPlayersAvailable.length === 0 ? (
                <View style={styles.noExtraPlayersInfo}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.colors.textMuted} />
                  <Text style={styles.noExtraPlayersText}>
                    {t('schedule.noExtraPlayersAvailable') || 'No hay jugadores extras disponibles. Puedes crearlos en la sección de Jugadores marcándolos como "extra".'}
                  </Text>
                </View>
              ) : (
                <View style={styles.extraPlayersGrid}>
                  {extraPlayersAvailable.map(player => {
                    const isSelected = extraPlayers.includes(player._id);
                    const initials = getPlayerInitials(player);
                    return (
                      <TouchableOpacity
                        key={player._id}
                        style={[styles.extraPlayerChip, isSelected && styles.extraPlayerChipSelected]}
                        onPress={() => {
                          if (isSelected) {
                            setExtraPlayers(extraPlayers.filter(id => id !== player._id));
                          } else {
                            setExtraPlayers([...extraPlayers, player._id]);
                          }
                        }}
                      >
                        {player.foto ? (
                          <Image source={{ uri: player.foto }} style={styles.extraPlayerChipPhoto} />
                        ) : (
                          <View style={[styles.extraPlayerChipAvatar, isSelected && styles.extraPlayerChipAvatarSelected]}>
                            <Text style={styles.extraPlayerChipInitials}>{initials}</Text>
                          </View>
                        )}
                        <Text style={[styles.extraPlayerChipText, isSelected && styles.extraPlayerChipTextSelected]} numberOfLines={1}>
                          {getPlayerFullName(player)}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={16} color={theme.colors.warning} style={{ marginLeft: 4 }} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Sección de Ejercicios */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('common.exercises')}</Text>

              {/* Botón añadir ejercicio */}
              <TouchableOpacity
                style={styles.addExerciseBtn}
                onPress={() => setShowExerciseSelectorModal(true)}
              >
                <Ionicons name="add" size={22} color={theme.colors.success} />
                <Text style={styles.addExerciseBtnText}>{t('session.addExercise')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addExerciseBtn, { borderColor: theme.colors.primary, marginTop: 9 }]}
                onPress={() => setCustomTaskModal({ visible: true, task: null })}
              >
                <Ionicons name="image-outline" size={21} color={theme.colors.primary} />
                <Text style={[styles.addExerciseBtnText, { color: theme.colors.primary }]}>
                  {t('session.addCustomTask', 'Añadir tarea personalizada')}
                </Text>
              </TouchableOpacity>

              {/* Lista de ejercicios seleccionados */}
              {selectedExercises.length > 0 ? (
                <View style={styles.exercisesList}>
                  {selectedExercises.map((exId, index) => {
                    const exercise = exerciseMap.get(getEntityId(exId));
                    if (!exercise) return null;

                    const handleMoveUp = () => {
                      if (index === 0) return;
                      const newOrder = [...selectedExercises];
                      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                      setSelectedExercises(newOrder);
                    };

                    const handleMoveDown = () => {
                      if (index === selectedExercises.length - 1) return;
                      const newOrder = [...selectedExercises];
                      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                      setSelectedExercises(newOrder);
                    };

                    return (
                      <View key={exId} style={styles.exerciseItem}>
                        {/* Layout móvil: todo apilado verticalmente */}
                        {isMobile ? (
                          <>
                            {/* Fila superior: Número + Nombre + Eliminar */}
                            <View style={styles.exerciseItemHeaderMobile}>
                              <View style={styles.exerciseNumber}>
                                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                              </View>
                              <Text style={styles.exerciseItemNameMobile} numberOfLines={2}>{exercise.nombre}</Text>
                              {exercise.isCustomTask && (
                                <TouchableOpacity
                                  style={styles.removeExerciseBtnMobile}
                                  onPress={() => setCustomTaskModal({
                                    visible: true,
                                    task: customTasks.find((task) => getCustomTaskSelectionId(task) === exId),
                                  })}
                                >
                                  <MaterialIcons name="edit" size={19} color={theme.colors.primary} />
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={styles.removeExerciseBtnMobile}
                                onPress={() => handleRemoveExercise(exId)}
                              >
                                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                              </TouchableOpacity>
                            </View>

                            {/* Imagen y tipo */}
                            <View style={styles.exerciseImageRowMobile}>
                              {exercise.imagen ? (
                                <Image
                                  source={{ uri: normalizeImageSource(exercise.imagen) }}
                                  style={styles.exerciseItemImageMobile}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.exerciseItemImagePlaceholderMobile}>
                                  <Ionicons name="fitness" size={24} color={theme.colors.textMuted} />
                                </View>
                              )}
                              <View style={styles.exerciseMetaMobile}>
                                {exercise.folder && (
                                  <Text style={styles.exerciseItemType}>
                                    {getExerciseFolderName(exercise)}
                                  </Text>
                                )}
                                {exercise.isCustomTask && (
                                  <Text style={[styles.exerciseItemType, { color: theme.colors.primary }]}>
                                    {t('session.customTask', 'Tarea personalizada')}
                                  </Text>
                                )}
                                {/* Controles de orden en móvil */}
                                <View style={styles.exerciseOrderControlsMobile}>
                                  <TouchableOpacity
                                    style={[styles.orderBtnMobile, index === 0 && styles.orderBtnDisabled]}
                                    onPress={handleMoveUp}
                                    disabled={index === 0}
                                  >
                                    <Ionicons name="arrow-up" size={16} color={index === 0 ? theme.colors.textMuted : theme.colors.primary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.orderBtnMobile, index === selectedExercises.length - 1 && styles.orderBtnDisabled]}
                                    onPress={handleMoveDown}
                                    disabled={index === selectedExercises.length - 1}
                                  >
                                    <Ionicons name="arrow-down" size={16} color={index === selectedExercises.length - 1 ? theme.colors.textMuted : theme.colors.primary} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          </>
                        ) : (
                          /* Layout tablet/desktop: original */
                          <View style={styles.exerciseItemHeader}>
                            <View style={styles.exerciseItemLeft}>
                              {/* Imagen del ejercicio */}
                              {exercise.imagen ? (
                                <Image
                                  source={{ uri: normalizeImageSource(exercise.imagen) }}
                                  style={styles.exerciseItemImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.exerciseItemImagePlaceholder}>
                                  <Ionicons name="fitness" size={20} color={theme.colors.textMuted} />
                                </View>
                              )}
                              <View style={styles.exerciseInfo}>
                                <View style={styles.exerciseNameRow}>
                                  <View style={styles.exerciseNumber}>
                                    <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                                  </View>
                                  <Text style={styles.exerciseItemName}>{exercise.nombre}</Text>
                                </View>
                                {exercise.folder && (
                                  <Text style={styles.exerciseItemType}>
                                    {getExerciseFolderName(exercise)}
                                  </Text>
                                )}
                                {exercise.isCustomTask && (
                                  <Text style={[styles.exerciseItemType, { color: theme.colors.primary }]}>
                                    {t('session.customTask', 'Tarea personalizada')}
                                  </Text>
                                )}
                              </View>
                            </View>

                            {/* Controles de orden */}
                            <View style={styles.exerciseOrderControls}>
                              {exercise.isCustomTask && (
                                <TouchableOpacity
                                  style={styles.orderBtn}
                                  onPress={() => setCustomTaskModal({
                                    visible: true,
                                    task: customTasks.find((task) => getCustomTaskSelectionId(task) === exId),
                                  })}
                                >
                                  <MaterialIcons name="edit" size={18} color={theme.colors.primary} />
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={[styles.orderBtn, index === 0 && styles.orderBtnDisabled]}
                                onPress={handleMoveUp}
                                disabled={index === 0}
                              >
                                <Ionicons name="arrow-up" size={18} color={index === 0 ? theme.colors.textMuted : theme.colors.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.orderBtn, index === selectedExercises.length - 1 && styles.orderBtnDisabled]}
                                onPress={handleMoveDown}
                                disabled={index === selectedExercises.length - 1}
                              >
                                <Ionicons name="arrow-down" size={18} color={index === selectedExercises.length - 1 ? theme.colors.textMuted : theme.colors.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.removeExerciseBtn}
                                onPress={() => handleRemoveExercise(exId)}
                              >
                                <Ionicons name="close-circle" size={22} color={theme.colors.error} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}

                        {/* Tiempo de descanso - solo si no es el último ejercicio */}
                        {!exercise.isCustomTask && index < selectedExercises.length - 1 && (
                          <View style={[styles.exerciseField, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 4 }]}>
                            <Text style={styles.exerciseFieldLabel}>{t('session.restMinutes')}:</Text>
                            <TextInput
                              style={[styles.exerciseFieldInput, isMobile && { flex: undefined }]}
                              value={exerciseRestTimes[exId] !== undefined ? String(exerciseRestTimes[exId]) : ''}
                              onChangeText={(text) => {
                                const val = text.replace(/[^0-9]/g, '');
                                setExerciseRestTimes(prev => ({ ...prev, [exId]: val === '' ? 0 : parseInt(val) }));
                              }}
                              keyboardType="number-pad"
                              autoComplete="off"
                              placeholder="0"
                              placeholderTextColor={theme.colors.textMuted}
                            />
                          </View>
                        )}

                        {/* Botón de asignación de equipos - solo si el ejercicio tiene equipos */}
                        {exercise.equipos > 0 && (
                          <TouchableOpacity
                            style={styles.teamAssignmentButton}
                            onPress={() => {
                              setCurrentExerciseForTeams(exercise);
                              setShowTeamAssignmentModal(true);
                            }}
                          >
                            <Ionicons name="people" size={18} color={theme.colors.primary} />
                            <Text style={styles.teamAssignmentButtonText}>
                              {t('session.assignTeams')} ({exercise.equipos} {t('session.teams')})
                            </Text>
                            {exerciseTeamAssignments[exId] && exerciseTeamAssignments[exId].some(ta => (ta.players?.length > 0 || ta.extraPlayers?.length > 0 || (ta.comodines || 0) > 0)) && (
                              <View style={styles.teamAssignmentBadge}>
                                <MaterialIcons name="check" size={14} color="#fff" />
                              </View>
                            )}
                          </TouchableOpacity>
                        )}

                        {/* Observaciones del ejercicio */}
                        {!exercise.isCustomTask && <View style={styles.exerciseObsField}>
                          <Text style={styles.exerciseFieldLabel}>{t('common.observations')}:</Text>
                          <TextInput
                            style={styles.exerciseObsInput}
                            value={exerciseObservations[exId] || ''}
                            onChangeText={(text) => {
                              setExerciseObservations(prev => ({ ...prev, [exId]: text }));
                            }}
                            placeholder={t('session.exerciseNotesPlaceholder')}
                            placeholderTextColor={theme.colors.textMuted}
                            multiline
                            numberOfLines={2}
                          />
                        </View>}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyExercises}>
                  <Ionicons name="fitness-outline" size={32} color={theme.colors.textMuted} />
                  <Text style={styles.emptyExercisesText}>{t('session.noExercisesAdded')}</Text>
                </View>
              )}
            </View>

            {/* Sección de Ejercicios de Fuerza */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('session.strengthExercises')}</Text>

              {/* Botón añadir ejercicio de fuerza */}
              <TouchableOpacity
                style={[styles.addExerciseBtn, { borderColor: theme.colors.purple }]}
                onPress={() => setShowStrengthExerciseSelectorModal(true)}
              >
                <Ionicons name="barbell" size={22} color={theme.colors.purple} />
                <Text style={[styles.addExerciseBtnText, { color: theme.colors.purple }]}>{t('session.addStrengthExercise')}</Text>
              </TouchableOpacity>

              {/* Lista de ejercicios de fuerza seleccionados */}
              {selectedStrengthExercises.length > 0 ? (
                <View style={styles.exercisesList}>
                  {selectedStrengthExercises.map((seId, index) => {
                    const exercise = STRENGTH_EXERCISES.find(e => e.id === seId);
                    if (!exercise) return null;
                    const sectionInfo = getSectionForExercise(seId);

                    const handleMoveUpStrength = () => {
                      if (index === 0) return;
                      const newOrder = [...selectedStrengthExercises];
                      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                      setSelectedStrengthExercises(newOrder);
                    };

                    const handleMoveDownStrength = () => {
                      if (index === selectedStrengthExercises.length - 1) return;
                      const newOrder = [...selectedStrengthExercises];
                      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                      setSelectedStrengthExercises(newOrder);
                    };

                    const handleRemoveStrengthExercise = (id) => {
                      setSelectedStrengthExercises(prev => prev.filter(x => x !== id));
                      const newObs = { ...strengthExerciseObservations };
                      const newRest = { ...strengthExerciseRestTimes };
                      delete newObs[id];
                      delete newRest[id];
                      setStrengthExerciseObservations(newObs);
                      setStrengthExerciseRestTimes(newRest);
                    };

                    return (
                      <View key={seId} style={styles.exerciseItem}>
                        {isMobile ? (
                          <>
                            <View style={styles.exerciseItemHeaderMobile}>
                              <View style={styles.exerciseNumber}>
                                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                              </View>
                              <Text style={styles.exerciseItemNameMobile} numberOfLines={2}>{t(exercise.i18nKey)}</Text>
                              <TouchableOpacity
                                style={styles.removeExerciseBtnMobile}
                                onPress={() => handleRemoveStrengthExercise(seId)}
                              >
                                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                              </TouchableOpacity>
                            </View>
                            <View style={styles.exerciseImageRowMobile}>
                              <Image
                                source={getStrengthExerciseImage(exercise.image)}
                                style={styles.exerciseItemImageMobile}
                                resizeMode="cover"
                              />
                              <View style={styles.exerciseMetaMobile}>
                                {sectionInfo && (
                                  <Text style={styles.exerciseItemType}>{t(sectionInfo.section.i18nKey)}</Text>
                                )}
                                <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>Nivel: {exercise.level}</Text>
                                <View style={styles.exerciseOrderControlsMobile}>
                                  <TouchableOpacity
                                    style={[styles.orderBtnMobile, index === 0 && styles.orderBtnDisabled]}
                                    onPress={handleMoveUpStrength}
                                    disabled={index === 0}
                                  >
                                    <Ionicons name="arrow-up" size={16} color={index === 0 ? theme.colors.textMuted : theme.colors.primary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.orderBtnMobile, index === selectedStrengthExercises.length - 1 && styles.orderBtnDisabled]}
                                    onPress={handleMoveDownStrength}
                                    disabled={index === selectedStrengthExercises.length - 1}
                                  >
                                    <Ionicons name="arrow-down" size={16} color={index === selectedStrengthExercises.length - 1 ? theme.colors.textMuted : theme.colors.primary} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            </View>
                          </>
                        ) : (
                          <View style={styles.exerciseItemHeader}>
                            <View style={styles.exerciseItemLeft}>
                              <Image
                                source={getStrengthExerciseImage(exercise.image)}
                                style={styles.exerciseItemImage}
                                resizeMode="cover"
                              />
                              <View style={styles.exerciseInfo}>
                                <View style={styles.exerciseNameRow}>
                                  <View style={styles.exerciseNumber}>
                                    <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                                  </View>
                                  <Text style={styles.exerciseItemName}>{t(exercise.i18nKey)}</Text>
                                </View>
                                {sectionInfo && (
                                  <Text style={styles.exerciseItemType}>{t(sectionInfo.section.i18nKey)} — Nivel {exercise.level}</Text>
                                )}
                              </View>
                            </View>
                            <View style={styles.exerciseOrderControls}>
                              <TouchableOpacity
                                style={[styles.orderBtn, index === 0 && styles.orderBtnDisabled]}
                                onPress={handleMoveUpStrength}
                                disabled={index === 0}
                              >
                                <Ionicons name="arrow-up" size={18} color={index === 0 ? theme.colors.textMuted : theme.colors.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.orderBtn, index === selectedStrengthExercises.length - 1 && styles.orderBtnDisabled]}
                                onPress={handleMoveDownStrength}
                                disabled={index === selectedStrengthExercises.length - 1}
                              >
                                <Ionicons name="arrow-down" size={18} color={index === selectedStrengthExercises.length - 1 ? theme.colors.textMuted : theme.colors.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.removeExerciseBtn}
                                onPress={() => handleRemoveStrengthExercise(seId)}
                              >
                                <Ionicons name="close-circle" size={22} color={theme.colors.error} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}

                        {/* Tiempo de descanso */}
                        {index < selectedStrengthExercises.length - 1 && (
                          <View style={[styles.exerciseField, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 4 }]}>
                            <Text style={styles.exerciseFieldLabel}>{t('session.restMinutes')}:</Text>
                            <TextInput
                              style={[styles.exerciseFieldInput, isMobile && { flex: undefined }]}
                              value={strengthExerciseRestTimes[seId] !== undefined ? String(strengthExerciseRestTimes[seId]) : ''}
                              onChangeText={(text) => {
                                const val = text.replace(/[^0-9]/g, '');
                                setStrengthExerciseRestTimes(prev => ({ ...prev, [seId]: val === '' ? 0 : parseInt(val) }));
                              }}
                              keyboardType="number-pad"
                              autoComplete="off"
                              placeholder="0"
                              placeholderTextColor={theme.colors.textMuted}
                            />
                          </View>
                        )}

                        {/* Observaciones */}
                        <View style={styles.exerciseObsField}>
                          <Text style={styles.exerciseFieldLabel}>{t('common.observations')}:</Text>
                          <TextInput
                            style={styles.exerciseObsInput}
                            value={strengthExerciseObservations[seId] || ''}
                            onChangeText={(text) => {
                              setStrengthExerciseObservations(prev => ({ ...prev, [seId]: text }));
                            }}
                            placeholder={t('session.exerciseNotesPlaceholder')}
                            placeholderTextColor={theme.colors.textMuted}
                            multiline
                            numberOfLines={2}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyExercises}>
                  <Ionicons name="barbell-outline" size={32} color={theme.colors.textMuted} />
                  <Text style={styles.emptyExercisesText}>{t('session.noStrengthExercisesAdded')}</Text>
                </View>
              )}
            </View>

            {/* Observaciones generales */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('session.generalObservations')}</Text>
              <TextInput
                style={styles.observationsInput}
                value={observaciones}
                onChangeText={setObservaciones}
                placeholder={t('session.sessionNotesPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                rows={4}
                textAlignVertical="top"
              />
            </View>

            {/* Sección de Wellness */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('session.wellnessControl')}</Text>
              <Text style={styles.wellnessSubtitle}>{t('session.wellnessSubtitle')}</Text>

              {/* Wellness Esperado */}
              <View style={styles.wellnessSelector}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.wellnessOption,
                      expectedWellness === num && styles.wellnessOptionSelected,
                      num <= 3 && expectedWellness === num && { backgroundColor: '#ef4444', borderColor: '#ef4444' },
                      num > 3 && num <= 5 && expectedWellness === num && { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
                      num > 5 && num <= 7 && expectedWellness === num && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
                      num > 7 && expectedWellness === num && { backgroundColor: '#10b981', borderColor: '#10b981' },
                    ]}
                    onPress={() => setExpectedWellness(expectedWellness === num ? null : num)}
                  >
                    <Text style={[
                      styles.wellnessOptionText,
                      expectedWellness === num && styles.wellnessOptionTextSelected
                    ]}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.wellnessLabel, { marginTop: 12 }]}>{t('session.manualAverageWellness')}</Text>
              <TextInput
                style={styles.exerciseFieldInput}
                value={String(manualAverageWellness)}
                onChangeText={setManualAverageWellness}
                placeholder={t('session.manualAverageWellnessPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            {/* Botones */}
          </KeyboardAwareScrollView>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>{t('session.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, (loading || canMutate === false) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={loading || canMutate === false}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name={canMutate === false ? 'lock-closed' : 'checkmark'} size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>
                    {canMutate === false ? t('subscription.availableWithSubscription', 'Disponible con suscripción') : t('session.save')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Date/Time Pickers */}
          {Platform.OS === 'ios' ? (
            <>
              {/* iOS: Modal para Date Picker */}
              <Modal
                visible={showDatePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.datePickerModalBg}>
                  <View style={[styles.datePickerModalContent, { paddingBottom: Math.max(insets.bottom, 30) }]}>
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.datePickerCancel}>{t('session.cancel')}</Text>
                      </TouchableOpacity>
                      <Text style={styles.datePickerTitle}>{t('session.selectDateTitle')}</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.datePickerDone}>{t('session.done')}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={fecha}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      style={{ height: 200 }}
                      textColor="#000000"
                    />
                  </View>
                </View>
              </Modal>

              {/* iOS: Modal para Start Time Picker */}
              <Modal
                visible={showStartTimePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowStartTimePicker(false)}
              >
                <View style={styles.datePickerModalBg}>
                  <View style={[styles.datePickerModalContent, { paddingBottom: Math.max(insets.bottom, 30) }]}>
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                        <Text style={styles.datePickerCancel}>{t('session.cancel')}</Text>
                      </TouchableOpacity>
                      <Text style={styles.datePickerTitle}>{t('session.startTimeTitle')}</Text>
                      <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                        <Text style={styles.datePickerDone}>{t('session.done')}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={parseTimeString(horaInicio)}
                      mode="time"
                      is24Hour={true}
                      display="spinner"
                      onChange={handleStartTimeChange}
                      style={{ height: 200 }}
                      textColor="#000000"
                    />
                  </View>
                </View>
              </Modal>

              {/* iOS: Modal para End Time Picker */}
              <Modal
                visible={showEndTimePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEndTimePicker(false)}
              >
                <View style={styles.datePickerModalBg}>
                  <View style={[styles.datePickerModalContent, { paddingBottom: Math.max(insets.bottom, 30) }]}>
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                        <Text style={styles.datePickerCancel}>{t('session.cancel')}</Text>
                      </TouchableOpacity>
                      <Text style={styles.datePickerTitle}>{t('session.endTimeTitle')}</Text>
                      <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                        <Text style={styles.datePickerDone}>{t('session.done')}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={parseTimeString(horaFin)}
                      mode="time"
                      is24Hour={true}
                      display="spinner"
                      onChange={handleEndTimeChange}
                      style={{ height: 200 }}
                      textColor="#000000"
                    />
                  </View>
                </View>
              </Modal>
            </>
          ) : (
            <>
              {/* Android: DateTimePicker nativo */}
              {showDatePicker && (
                <DateTimePicker
                  value={fecha}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
              {showStartTimePicker && (
                <DateTimePicker
                  value={parseTimeString(horaInicio)}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={handleStartTimeChange}
                />
              )}
              {showEndTimePicker && (
                <DateTimePicker
                  value={parseTimeString(horaFin)}
                  mode="time"
                  is24Hour={true}
                  display="default"
                  onChange={handleEndTimeChange}
                />
              )}
            </>
          )}

          {/* Modal selector de ejercicios profesional */}
          <ExerciseSelectorModal
            visible={showExerciseSelectorModal}
            onClose={() => setShowExerciseSelectorModal(false)}
            ejercicios={availableExercises}
            selectedIds={selectedExercises}
            setSelectedIds={(newIds) => {
              // Actualizar los ejercicios seleccionados
              if (typeof newIds === 'function') {
                setSelectedExercises(prev => {
                  const updated = newIds(prev);
                  // Inicializar observaciones y tiempos para nuevos ejercicios
                  updated.forEach(id => {
                    if (!exerciseObservations[id]) {
                      setExerciseObservations(prevObs => ({ ...prevObs, [id]: '' }));
                    }
                    if (exerciseRestTimes[id] === undefined) {
                      setExerciseRestTimes(prevRest => ({ ...prevRest, [id]: 0 }));
                    }
                  });
                  return updated;
                });
              } else {
                setSelectedExercises(newIds);
                // Inicializar observaciones y tiempos para nuevos ejercicios
                newIds.forEach(id => {
                  if (!exerciseObservations[id]) {
                    setExerciseObservations(prev => ({ ...prev, [id]: '' }));
                  }
                  if (exerciseRestTimes[id] === undefined) {
                    setExerciseRestTimes(prev => ({ ...prev, [id]: 0 }));
                  }
                });
              }
            }}
            onCreateExercise={createExerciseFromSession}
          />

          {/* Modal selector de ejercicios de fuerza */}
          <StrengthExerciseSelectorModal
            visible={showStrengthExerciseSelectorModal}
            onClose={() => setShowStrengthExerciseSelectorModal(false)}
            selectedIds={selectedStrengthExercises}
            setSelectedIds={(newIds) => {
              if (typeof newIds === 'function') {
                setSelectedStrengthExercises(prev => {
                  const updated = newIds(prev);
                  updated.forEach(id => {
                    if (!strengthExerciseObservations[id]) {
                      setStrengthExerciseObservations(prevObs => ({ ...prevObs, [id]: '' }));
                    }
                    if (strengthExerciseRestTimes[id] === undefined) {
                      setStrengthExerciseRestTimes(prevRest => ({ ...prevRest, [id]: 0 }));
                    }
                  });
                  return updated;
                });
              } else {
                setSelectedStrengthExercises(newIds);
                newIds.forEach(id => {
                  if (!strengthExerciseObservations[id]) {
                    setStrengthExerciseObservations(prev => ({ ...prev, [id]: '' }));
                  }
                  if (strengthExerciseRestTimes[id] === undefined) {
                    setStrengthExerciseRestTimes(prev => ({ ...prev, [id]: 0 }));
                  }
                });
              }
            }}
            multiSelect={true}
          />

          {/* Modal selector de jugadores */}
          <PlayerSelectionModal
            visible={showPlayerSelectorModal}
            onClose={() => setShowPlayerSelectorModal(false)}
            title={t('session.selectPlayersTitle')}
            players={rosterPlayers}
            selectedIds={selectedPlayers}
            onConfirm={(ids) => {
              setSelectedPlayers(ids);
              setShowPlayerSelectorModal(false);
            }}
            injuries={injuries}
          />

          <CustomTrainingTaskModal
            visible={customTaskModal.visible}
            initialTask={customTaskModal.task}
            onClose={() => setCustomTaskModal({ visible: false, task: null })}
            onSave={handleSaveCustomTask}
          />

          {/* Modal de asignación de equipos */}
          {showTeamAssignmentModal && currentExerciseForTeams && (
            <Modal
              visible={showTeamAssignmentModal}
              animationType="slide"
              transparent
              onRequestClose={() => setShowTeamAssignmentModal(false)}
            >
              <View style={styles.teamAssignmentModalOverlay}>
                <View style={styles.teamAssignmentModalContainer}>
                  <View style={styles.teamAssignmentModalHeader}>
                    <View style={styles.teamAssignmentModalHeaderLeft}>
                      <Ionicons name="people" size={24} color={theme.colors.primary} />
                      <View style={{ marginLeft: 10 }}>
                        <Text style={styles.teamAssignmentModalTitle}>{t('session.assignTeams')}</Text>
                        <Text style={styles.teamAssignmentModalSubtitle}>{currentExerciseForTeams.nombre}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.teamAssignmentModalCloseBtn}
                      onPress={() => setShowTeamAssignmentModal(false)}
                    >
                      <MaterialIcons name="close" size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.teamAssignmentModalBody}>
                    <View style={styles.teamAssignmentTeamSection}>
                      {(() => {
                        const exId = currentExerciseForTeams._id;
                        const currentAssignment = getComodinesAssignment(exId);
                        const rosterForTeams = selectedPlayers.length > 0
                          ? players.filter(p => !p.extra && selectedPlayers.includes(p._id))
                          : players.filter(p => !p.extra);
                        const allAvailable = [
                          ...rosterForTeams.map(p => ({
                            id: p._id,
                            name: getPlayerFullName(p) || p.dorsal?.toString() || 'Sin nombre',
                            dorsal: p.dorsal,
                            isExtra: false
                          })),
                          ...extraPlayers.map(extraId => {
                            const extraPlayer = extraPlayersAvailable.find(p => p._id === extraId);
                            return {
                              id: `extra_${extraId}`,
                              name: extraPlayer ? getPlayerFullName(extraPlayer) : extraId,
                              extraPlayerId: extraId,
                              dorsal: extraPlayer?.dorsal || null,
                              isExtra: true
                            };
                          })
                        ];
                        const assignedElsewhere = [];
                        (exerciseTeamAssignments[exId] || []).forEach(ta => {
                          if (ta.teamNumber !== 0) {
                            ta.players?.forEach(pid => assignedElsewhere.push(pid));
                            ta.extraPlayers?.forEach(epId => assignedElsewhere.push(`extra_${epId}`));
                          }
                        });
                        return (
                          <>
                            <View style={styles.teamAssignmentTeamHeader}>
                              <View style={[styles.teamAssignmentTeamBadge, { backgroundColor: '#0f766e' }]}>
                                <Ionicons name="swap-horizontal" size={14} color="#fff" />
                              </View>
                              <Text style={styles.teamAssignmentTeamTitle}>{t('session.comodines', 'Comodines')}</Text>
                              <Text style={styles.teamAssignmentTeamCount}>
                                ({(currentAssignment.players?.length || 0) + (currentAssignment.extraPlayers?.length || 0) + getExerciseComodines(exId)})
                              </Text>
                            </View>

                            <View style={styles.teamAssignmentComodinesRow}>
                              <View style={styles.teamAssignmentComodinesLabel}>
                                <Ionicons name="swap-horizontal" size={16} color="#0f766e" />
                                <Text style={styles.teamAssignmentComodinesText}>{t('session.comodines', 'Comodines')}</Text>
                              </View>
                              <View style={styles.teamAssignmentComodinesStepper}>
                                <TouchableOpacity
                                  style={[styles.teamAssignmentComodinesBtn, getExerciseComodines(currentExerciseForTeams._id) === 0 && styles.teamAssignmentComodinesBtnDisabled]}
                                  disabled={getExerciseComodines(currentExerciseForTeams._id) === 0}
                                  onPress={() => updateExerciseComodines(currentExerciseForTeams._id, getExerciseComodines(currentExerciseForTeams._id) - 1)}
                                >
                                  <Feather name="minus" size={16} color={getExerciseComodines(currentExerciseForTeams._id) === 0 ? theme.colors.textMuted : '#0f766e'} />
                                </TouchableOpacity>
                                <Text style={styles.teamAssignmentComodinesValue}>{getExerciseComodines(currentExerciseForTeams._id)}</Text>
                                <TouchableOpacity
                                  style={styles.teamAssignmentComodinesBtn}
                                  onPress={() => updateExerciseComodines(currentExerciseForTeams._id, getExerciseComodines(currentExerciseForTeams._id) + 1)}
                                >
                                  <Feather name="plus" size={16} color="#0f766e" />
                                </TouchableOpacity>
                              </View>
                            </View>
                            <View style={styles.teamAssignmentPlayersList}>
                              {allAvailable.map(player => {
                                const isSelected = player.isExtra
                                  ? currentAssignment.extraPlayers?.includes(player.extraPlayerId)
                                  : currentAssignment.players?.includes(player.id);
                                const isDisabled = assignedElsewhere.includes(player.id);
                                return (
                                  <TouchableOpacity
                                    key={player.id}
                                    style={[
                                      styles.teamAssignmentPlayerChip,
                                      isSelected && styles.teamAssignmentPlayerChipSelected,
                                      isDisabled && styles.teamAssignmentPlayerChipDisabled,
                                      player.isExtra && styles.teamAssignmentPlayerChipExtra,
                                      isSelected && player.isExtra && styles.teamAssignmentPlayerChipExtraSelected
                                    ]}
                                    disabled={isDisabled}
                                    onPress={() => {
                                      const newAssignments = (exerciseTeamAssignments[exId] || []).map(ta => ({
                                        ...ta,
                                        players: [...(ta.players || [])],
                                        extraPlayers: [...(ta.extraPlayers || [])]
                                      }));
                                      let assignmentIndex = newAssignments.findIndex(ta => ta.teamNumber === 0);
                                      if (assignmentIndex === -1) {
                                        newAssignments.push({ teamNumber: 0, players: [], extraPlayers: [], comodines: 0 });
                                        assignmentIndex = newAssignments.length - 1;
                                      }
                                      if (player.isExtra) {
                                        const currentExtras = newAssignments[assignmentIndex].extraPlayers || [];
                                        newAssignments[assignmentIndex].extraPlayers = currentExtras.includes(player.extraPlayerId)
                                          ? currentExtras.filter(n => n !== player.extraPlayerId)
                                          : [...currentExtras, player.extraPlayerId];
                                      } else {
                                        const currentPlayers = newAssignments[assignmentIndex].players || [];
                                        newAssignments[assignmentIndex].players = currentPlayers.includes(player.id)
                                          ? currentPlayers.filter(id => id !== player.id)
                                          : [...currentPlayers, player.id];
                                      }
                                      setExerciseTeamAssignments(prev => ({ ...prev, [exId]: newAssignments }));
                                    }}
                                  >
                                    {player.dorsal && (
                                      <Text style={[
                                        styles.teamAssignmentPlayerDorsal,
                                        isSelected && styles.teamAssignmentPlayerDorsalSelected
                                      ]}>
                                        {player.dorsal}
                                      </Text>
                                    )}
                                    {player.isExtra && (
                                      <Ionicons name="person-add-outline" size={14} color={isSelected ? "#fff" : theme.colors.warning} style={{ marginRight: 4 }} />
                                    )}
                                    <Text style={[
                                      styles.teamAssignmentPlayerName,
                                      isSelected && styles.teamAssignmentPlayerNameSelected,
                                      isDisabled && styles.teamAssignmentPlayerNameDisabled
                                    ]} numberOfLines={1}>
                                      {player.name}
                                    </Text>
                                    {isSelected && (
                                      <MaterialIcons name="check" size={16} color="#fff" style={{ marginLeft: 4 }} />
                                    )}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </>
                        );
                      })()}
                    </View>

                    {Array.from({ length: currentExerciseForTeams.equipos || 0 }, (_, teamIndex) => {
                      const teamNumber = teamIndex + 1;
                      const exId = currentExerciseForTeams._id;
                      const teamAssignments = exerciseTeamAssignments[exId] || [];
                      const currentAssignment = teamAssignments.find(ta => ta.teamNumber === teamNumber) || { teamNumber, players: [], extraPlayers: [] };

                      // Combinar jugadores y extras disponibles
                      const rosterForTeams = selectedPlayers.length > 0
                        ? players.filter(p => !p.extra && selectedPlayers.includes(p._id))
                        : players.filter(p => !p.extra);
                      const allAvailable = [
                        ...rosterForTeams.map(p => ({
                          id: p._id,
                          name: getPlayerFullName(p) || p.dorsal?.toString() || 'Sin nombre',
                          dorsal: p.dorsal,
                          isExtra: false
                        })),
                        ...extraPlayers.map(extraId => {
                          // Buscar el jugador extra por su ID en la lista de jugadores extras disponibles
                          const extraPlayer = extraPlayersAvailable.find(p => p._id === extraId);
                          const playerName = extraPlayer ? getPlayerFullName(extraPlayer) : extraId;
                          return {
                            id: `extra_${extraId}`,
                            name: playerName,
                            extraPlayerId: extraId,
                            dorsal: extraPlayer?.dorsal || null,
                            isExtra: true
                          };
                        })
                      ];

                      // Jugadores ya asignados a otros equipos
                      const assignedElsewhere = [];
                      teamAssignments.forEach(ta => {
                        if (ta.teamNumber !== teamNumber) {
                          ta.players?.forEach(pid => assignedElsewhere.push(pid));
                          ta.extraPlayers?.forEach(epId => assignedElsewhere.push(`extra_${epId}`));
                        }
                      });

                      const getTeamColor = (num) => {
                        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
                        return colors[(num - 1) % colors.length];
                      };

                      return (
                        <View key={teamNumber} style={styles.teamAssignmentTeamSection}>
                          <View style={styles.teamAssignmentTeamHeader}>
                            <View style={[styles.teamAssignmentTeamBadge, { backgroundColor: getTeamColor(teamNumber) }]}>
                              <Text style={styles.teamAssignmentTeamBadgeText}>{teamNumber}</Text>
                            </View>
                            <Text style={styles.teamAssignmentTeamTitle}>{t('session.team')} {teamNumber}</Text>
                            <Text style={styles.teamAssignmentTeamCount}>
                              ({(currentAssignment.players?.length || 0) + (currentAssignment.extraPlayers?.length || 0)} jugadores)
                            </Text>
                          </View>

                          <View style={styles.teamAssignmentPlayersList}>
                            {allAvailable.map(player => {
                              const isSelected = player.isExtra
                                ? currentAssignment.extraPlayers?.includes(player.extraPlayerId)
                                : currentAssignment.players?.includes(player.id);
                              const isDisabled = assignedElsewhere.includes(player.id);

                              return (
                                <TouchableOpacity
                                  key={player.id}
                                  style={[
                                    styles.teamAssignmentPlayerChip,
                                    isSelected && styles.teamAssignmentPlayerChipSelected,
                                    isDisabled && styles.teamAssignmentPlayerChipDisabled,
                                    player.isExtra && styles.teamAssignmentPlayerChipExtra,
                                    isSelected && player.isExtra && styles.teamAssignmentPlayerChipExtraSelected
                                  ]}
                                  disabled={isDisabled}
                                  onPress={() => {
                                    // Hacer copia profunda para evitar mutar el estado de Redux
                                    const newAssignments = teamAssignments.map(ta => ({
                                      ...ta,
                                      players: [...(ta.players || [])],
                                      extraPlayers: [...(ta.extraPlayers || [])]
                                    }));
                                    let assignmentIndex = newAssignments.findIndex(ta => ta.teamNumber === teamNumber);

                                    if (assignmentIndex === -1) {
                                      newAssignments.push({ teamNumber, players: [], extraPlayers: [] });
                                      assignmentIndex = newAssignments.length - 1;
                                    }

                                    if (player.isExtra) {
                                      const currentExtras = newAssignments[assignmentIndex].extraPlayers || [];
                                      if (currentExtras.includes(player.extraPlayerId)) {
                                        newAssignments[assignmentIndex].extraPlayers = currentExtras.filter(n => n !== player.extraPlayerId);
                                      } else {
                                        newAssignments[assignmentIndex].extraPlayers = [...currentExtras, player.extraPlayerId];
                                      }
                                    } else {
                                      const currentPlayers = newAssignments[assignmentIndex].players || [];
                                      if (currentPlayers.includes(player.id)) {
                                        newAssignments[assignmentIndex].players = currentPlayers.filter(id => id !== player.id);
                                      } else {
                                        newAssignments[assignmentIndex].players = [...currentPlayers, player.id];
                                      }
                                    }

                                    setExerciseTeamAssignments(prev => ({
                                      ...prev,
                                      [exId]: newAssignments
                                    }));
                                  }}
                                >
                                  {player.dorsal && (
                                    <Text style={[
                                      styles.teamAssignmentPlayerDorsal,
                                      isSelected && styles.teamAssignmentPlayerDorsalSelected
                                    ]}>
                                      {player.dorsal}
                                    </Text>
                                  )}
                                  {player.isExtra && (
                                    <Ionicons
                                      name="person-add-outline"
                                      size={14}
                                      color={isSelected ? "#fff" : theme.colors.warning}
                                      style={{ marginRight: 4 }}
                                    />
                                  )}
                                  <Text
                                    style={[
                                      styles.teamAssignmentPlayerName,
                                      isSelected && styles.teamAssignmentPlayerNameSelected,
                                      isDisabled && styles.teamAssignmentPlayerNameDisabled
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {player.name}
                                  </Text>
                                  {isSelected && (
                                    <MaterialIcons name="check" size={16} color="#fff" style={{ marginLeft: 4 }} />
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>

                  <View style={[styles.teamAssignmentModalFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <TouchableOpacity
                      style={styles.teamAssignmentClearBtn}
                      onPress={() => {
                        setExerciseTeamAssignments(prev => ({
                          ...prev,
                          [currentExerciseForTeams._id]: []
                        }));
                      }}
                    >
                      <MaterialIcons name="clear-all" size={20} color={theme.colors.textSecondary} />
                      <Text style={styles.teamAssignmentClearBtnText}>{t('session.clearAllTeams')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.teamAssignmentConfirmBtn}
                      onPress={() => setShowTeamAssignmentModal(false)}
                    >
                      <MaterialIcons name="check" size={20} color="#fff" />
                      <Text style={styles.teamAssignmentConfirmBtnText}>{t('common.confirm')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: IS_MOBILE_DEVICE ? 12 : 20,
    width: IS_MOBILE_DEVICE ? '100%' : '95%',
    maxWidth: IS_MOBILE_DEVICE ? undefined : 700,
    flex: 1,
    maxHeight: '96%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },

  // Form
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },

  // Time Section
  timeSection: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  timeDivider: {
    paddingHorizontal: 16,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.successSoft,
    borderRadius: 20,
    alignSelf: 'center',
  },
  durationText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.success,
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },

  // Summary Box
  summaryBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.error,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Section styles
  section: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  // Exercise styles
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: theme.colors.successSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.success,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  addExerciseBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.success,
  },
  exercisesList: {
    gap: 12,
  },
  exerciseItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  exerciseItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  exerciseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  exerciseItemType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  removeExerciseBtn: {
    padding: 4,
  },
  exerciseField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  exerciseFieldLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    minWidth: 100,
  },
  exerciseFieldInput: {
    flex: 1,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
  },
  exerciseObsField: {
    gap: 6,
  },
  exerciseObsInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
    minHeight: 60,
  },
  emptyExercises: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  emptyExercisesText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
  },

  // Player styles
  playerSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  playerSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerSelectorText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  selectedPlayersChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  playerChipSmall: {
    backgroundColor: theme.colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  playerChipSmallText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '500',
  },
  playerChipMore: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  playerChipMoreText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },

  // Jugadores Extras
  formSectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.warning,
    marginTop: 16,
    marginBottom: 8,
  },
  extraPlayersSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  noExtraPlayersInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noExtraPlayersText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  extraPlayersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  extraPlayerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  extraPlayerChipSelected: {
    backgroundColor: theme.colors.warningSoft,
    borderColor: theme.colors.warning,
  },
  extraPlayerChipPhoto: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  extraPlayerChipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraPlayerChipAvatarSelected: {
    backgroundColor: theme.colors.warningSoft,
  },
  extraPlayerChipInitials: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  extraPlayerChipText: {
    fontSize: 12,
    color: theme.colors.text,
    maxWidth: 100,
  },
  extraPlayerChipTextSelected: {
    color: theme.colors.warning,
    fontWeight: '500',
  },

  // Observations
  observationsInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
    minHeight: 100,
  },

  // Selector Modal
  selectorModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  selectorModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  selectorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectorModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  selectorList: {
    padding: 8,
  },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginVertical: 2,
  },
  selectorItemActive: {
    backgroundColor: theme.colors.successSoft,
  },
  selectorItemText: {
    fontSize: 15,
    color: theme.colors.text,
  },
  selectorItemTextActive: {
    color: theme.colors.success,
    fontWeight: '500',
  },
  exerciseTypeGroup: {
    marginBottom: 8,
  },
  exerciseTypeHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.inputBg,
    borderRadius: 8,
    marginBottom: 4,
  },
  exerciseSelectorItemLeft: {
    flex: 1,
  },
  exerciseSelectorDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
  },

  // Estilos para modal de DateTimePicker en iOS
  datePickerModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  datePickerCancel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  // Estilos para imagen de ejercicio
  exerciseImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: theme.colors.inputBg,
  },
  exerciseImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseSelectorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Badge de video en ejercicio
  exerciseVideoBadge: {
    backgroundColor: '#E91E63',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  exerciseVideoBadgeInactive: {
    backgroundColor: theme.colors.textMuted,
    shadowColor: theme.colors.textMuted,
  },

  // Modal de video
  videoModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContent: {
    width: '95%',
    maxWidth: 800,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
  },
  videoModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  videoModalCloseBtn: {
    padding: 4,
  },
  videoGeneratingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoGeneratingText: {
    marginTop: 12,
    color: '#fff',
    fontSize: 14,
  },
  videoPlayerContainer: {
    aspectRatio: 16 / 9,
    width: '100%',
  },
  videoPlayer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  // Estilos para ejercicio en lista de seleccionados
  exerciseItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: theme.colors.inputBg,
  },
  exerciseItemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseOrderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnDisabled: {
    opacity: 0.5,
  },

  // ============ ESTILOS MÓVIL PARA TARJETAS DE EJERCICIOS ============
  exerciseItemHeaderMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  exerciseItemNameMobile: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  removeExerciseBtnMobile: {
    padding: 6,
    backgroundColor: theme.colors.errorSoft,
    borderRadius: 8,
  },
  exerciseImageRowMobile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  exerciseItemImageMobile: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: theme.colors.inputBg,
  },
  exerciseItemImagePlaceholderMobile: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseMetaMobile: {
    flex: 1,
    justifyContent: 'space-between',
  },
  exerciseOrderControlsMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  orderBtnMobile: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  // ============ FIN ESTILOS MÓVIL ============

  // Estilos para la sección de Wellness
  wellnessSectionHeader: {
    marginBottom: 16,
  },
  wellnessSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  wellnessLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 10,
  },
  wellnessSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  wellnessOption: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellnessOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  wellnessOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  wellnessOptionTextSelected: {
    color: '#fff',
  },
  wellnessDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  wellnessDetailBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },

  // --- Team Assignment Styles ---
  teamAssignmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
  },
  teamAssignmentButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  teamAssignmentBadge: {
    backgroundColor: theme.colors.success,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAssignmentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  teamAssignmentModalContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    height: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
  },
  teamAssignmentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  teamAssignmentModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamAssignmentModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  teamAssignmentModalSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  teamAssignmentModalCloseBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.inputBg,
  },
  teamAssignmentModalBody: {
    flex: 1,
    padding: 16,
  },
  teamAssignmentTeamSection: {
    marginBottom: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  teamAssignmentTeamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  teamAssignmentTeamBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAssignmentTeamBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  teamAssignmentTeamTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 10,
    flex: 1,
  },
  teamAssignmentTeamCount: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  teamAssignmentComodinesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.successSoft || '#f0fdfa',
  },
  teamAssignmentComodinesLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamAssignmentComodinesText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f766e',
  },
  teamAssignmentComodinesStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 18,
    overflow: 'hidden',
  },
  teamAssignmentComodinesBtn: {
    width: 34,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAssignmentComodinesBtnDisabled: {
    backgroundColor: theme.colors.inputBg,
  },
  teamAssignmentComodinesValue: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#134e4a',
  },
  teamAssignmentPlayersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  teamAssignmentPlayerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  teamAssignmentPlayerChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  teamAssignmentPlayerChipDisabled: {
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  teamAssignmentPlayerChipExtra: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warning + '15',
  },
  teamAssignmentPlayerChipExtraSelected: {
    backgroundColor: theme.colors.warning,
    borderColor: theme.colors.warning,
  },
  teamAssignmentPlayerDorsal: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginRight: 6,
    backgroundColor: theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  teamAssignmentPlayerDorsalSelected: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    color: '#ffffff',
  },
  teamAssignmentPlayerName: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  teamAssignmentPlayerNameSelected: {
    color: '#ffffff',
  },
  teamAssignmentPlayerNameDisabled: {
    color: theme.colors.textMuted,
  },
  teamAssignmentModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  teamAssignmentClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  teamAssignmentClearBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  teamAssignmentConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  teamAssignmentConfirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

