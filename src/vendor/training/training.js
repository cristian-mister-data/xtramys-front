import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  Pressable,
  useWindowDimensions,
  Dimensions,
  PanResponder,
  Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchEntrenamientosTemporada,
  fetchEntrenamientosPorEquipo,
  updateEntrenamiento,
  createEntrenamiento,
  deleteEntrenamiento,
  createEntrenamientoBulk,
  uploadEntrenamientoPdf,
} from '@/store/slices/session/sessionThunks';
import { fetchEjerciciosUsuario, fetchGlobalExercises } from '@/store/slices/exercise/exerciseThunks';
import { fetchJugadoresEquipo } from '@/store/slices/player/playerThunks';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';
import { fetchInjuriesByTeam } from '@/store/slices/injury/injuryThunks';
import { fetchMatchSheetsByTeam } from '@/store/slices/matchSheet/matchSheetThunks';
import OrganizeSeasonForm from './organizeSeasonForm';
import Base64ImagePreview, { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import ImageZoom from 'react-native-image-pan-zoom';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Linking } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { generateSessionPDF } from './SessionPDF';
import { VideoView, useVideoPlayer } from 'expo-video';
import { getVideosByExercise, getVideoStreamUrl, regenerateVideoWithField } from '@/utils/api';
import { downloadResolvedVideo, resolvePlayableVideoUrl } from '@/utils/videoPlayback';
import { toast } from '@/ui/toast';
import { getFieldById } from '@/utils/fieldTypes';
import ExerciseSelectorModal from '@/vendor/shared/ExerciseSelectorModal';
import { STRENGTH_EXERCISES, getStrengthExerciseImage, getSectionForExercise } from '@/data/strengthExercises';
// NOTE: WellnessDetailModal and PreWellnessDetailModal now used only in TrainingSessionDetailModal
import { getPlayerFullName, getPlayerInitials } from '@/utils/playerHelpers';
import { loadFormDraft, saveFormDraft, STORAGE_KEYS } from '@/utils/formPersistence';

// Componentes compartidos
import { PlayerSelectionModal, THEME, getPlayerInjuryStatus } from '@/vendor/shared/training';
import AddEventModal from '@/vendor/season/AddEventModal';
import TrainingSessionDetailModal from '@/vendor/season/TrainingSessionDetailModal';
import EditSessionModal from '@/vendor/season/EditSessionModal';
import TrainingSessionPdfUploadModal from '@/components/season/TrainingSessionPdfUploadModal';
import TrainingSessionPdfViewerModal from '@/components/season/TrainingSessionPdfViewerModal';
import { mergeExercises } from '@/utils/sessionExercises';
import { getContentImage } from '@/utils/contentVisual';

const isMobileDevice = () => {
  const { width } = Dimensions.get('window');
  return width < 500;
};

/* ---------------- Helpers ---------------- */
function formatFechaSesion(fechaStr, horaInicio, horaFin, t) {
  const fecha = new Date(fechaStr);
  if (isNaN(fecha.getTime())) return '';
  const dias = t ? [
    t('weekdays.sunday'),
    t('weekdays.monday'),
    t('weekdays.tuesday'),
    t('weekdays.wednesday'),
    t('weekdays.thursday'),
    t('weekdays.friday'),
    t('weekdays.saturday')
  ] : ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return `${dias[fecha.getDay()]} ${fecha.toLocaleDateString()} - ${horaInicio || '--:--'}h - ${horaFin || '--:--'}h`;
}
function formatDateToYMD(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

const HOURS = Array.from({ length: 24 }, (_, i) => i + 1);
const MINUTES_ALL = Array.from({ length: 60 }, (_, i) => i);

// NOTA: getInjuryStatus y getPlayerInjuryStatus ahora vienen de ../../shared/training

function isValidTime(str) {
  if (!/^([0][1-9]|1\d|2[0-4]):[0-5]\d$/.test(str)) return false;
  if (str.startsWith('24') && str !== '24:00') return false;
  return true;
}

function compareTimes(a, b) {
  const [ha, ma] = a.split(':').map(Number);
  const [hb, mb] = b.split(':').map(Number);
  return ha * 60 + ma - (hb * 60 + mb);
}

function parseTimeToHM(str) {
  if (isValidTime(str)) {
    const [h, m] = str.split(':').map(Number);
    return { h, m };
  }
  return { h: 1, m: 0 };
}

/* ---------------- Componente de Ejercicio Draggable ---------------- */
function DraggableExerciseItem({
  ejercicio,
  index,
  tiempoDescanso,
  observacion,
  onUpdateDescanso,
  onUpdateObservacion,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  totalItems,
  onPlayVideo,
  hasVideo, // Nueva prop para indicar si tiene video real
  // Nuevos props para equipos
  teamAssignments,
  onUpdateTeamAssignments,
  availablePlayers,
  extraPlayers
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [descansoLocal, setDescansoLocal] = useState(String(tiempoDescanso || 0));
  const [showTeamAssignmentModal, setShowTeamAssignmentModal] = useState(false);
  const numEquipos = ejercicio.equipos || 0;

  const getExerciseComodines = () => {
    const specialAssignment = (teamAssignments || []).find(ta => ta.teamNumber === 0);
    return Math.max(0, specialAssignment?.comodines || 0);
  };

  const getComodinesAssignment = () => (
    (teamAssignments || []).find(ta => ta.teamNumber === 0) || { teamNumber: 0, players: [], extraPlayers: [], comodines: 0 }
  );

  const updateExerciseComodines = (nextValue) => {
    const newAssignments = (teamAssignments || []).map(ta => ({
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
    onUpdateTeamAssignments(newAssignments);
  };

  return (
    <View style={styles.draggableExerciseItem}>
      {/* Header con nombre y controles de orden */}
      <View style={styles.draggableExerciseHeader}>
        <View style={styles.draggableExerciseHeaderLeft}>
          <View style={styles.draggableExerciseNumber}>
            <Text style={styles.draggableExerciseNumberText}>{index + 1}</Text>
          </View>
          <View style={styles.draggableExerciseTitleContainer}>
            <Text style={styles.draggableExerciseTitle} numberOfLines={1}>
              {ejercicio.nombre}
            </Text>
            <Text style={styles.draggableExerciseSubtitle}>
              {ejercicio.tiempo} min
            </Text>
          </View>
        </View>
        <View style={styles.draggableExerciseControls}>
          {/* Botón de video - solo mostrar si tiene video */}
          {onPlayVideo && hasVideo && (
            <TouchableOpacity
              style={styles.draggableVideoBtnContainer}
              onPress={() => onPlayVideo(ejercicio)}
            >
              <Feather
                name="play-circle"
                size={20}
                color={theme.colors.error || '#E91E63'}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.draggableControlBtn, isFirst && styles.draggableControlBtnDisabled]}
            onPress={onMoveUp}
            disabled={isFirst}
          >
            <Ionicons name="arrow-up" size={18} color={isFirst ? theme.colors.border : theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.draggableControlBtn, isLast && styles.draggableControlBtnDisabled]}
            onPress={onMoveDown}
            disabled={isLast}
          >
            <Ionicons name="arrow-down" size={18} color={isLast ? theme.colors.border : theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tiempo de descanso con diseño mejorado */}
      {index < totalItems - 1 && (
        <View style={styles.restTimeContainer}>
          <View style={styles.restTimeLabel}>
            <Ionicons name="time-outline" size={16} color="#f59e0b" />
            <Text style={styles.restTimeLabelText}>{t('session.restTimeBetween')}</Text>
          </View>
          <View style={styles.restTimeInputWrapper}>
            <TextInput
              style={styles.restTimeInput}
              placeholder="0"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              autoComplete="off"
              value={descansoLocal}
              onChangeText={setDescansoLocal}
              onBlur={() => onUpdateDescanso(parseInt(descansoLocal) || 0)}
              maxLength={3}
            />
            <Text style={styles.restTimeUnit}>min</Text>
          </View>
        </View>
      )}

      {/* Botón de asignación de equipos - solo si el ejercicio tiene equipos */}
      {numEquipos > 0 && (
        <TouchableOpacity
          style={styles.teamAssignmentButton}
          onPress={() => setShowTeamAssignmentModal(true)}
        >
          <Ionicons name="people" size={18} color={theme.colors.primary} />
          <Text style={styles.teamAssignmentButtonText}>
            {t('session.assignTeams')} ({numEquipos} {t('session.teams')})
          </Text>
          {teamAssignments && teamAssignments.some(ta => (ta.players?.length > 0 || ta.extraPlayers?.length > 0 || (ta.comodines || 0) > 0)) && (
            <View style={styles.teamAssignmentBadge}>
              <MaterialIcons name="check" size={14} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Modal de asignación de equipos */}
      {numEquipos > 0 && (
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
                    <Text style={styles.teamAssignmentModalSubtitle}>{ejercicio.nombre}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.teamAssignmentModalCloseBtn}
                  onPress={() => setShowTeamAssignmentModal(false)}
                >
                  <MaterialIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.teamAssignmentModalBody}>
                <View style={styles.teamAssignmentTeamSection}>
                  {(() => {
                    const currentAssignment = getComodinesAssignment();
                    const allAvailable = [
                      ...(availablePlayers || []).map(p => ({
                        id: p._id,
                        name: getPlayerFullName(p) || p.dorsal?.toString() || 'Sin nombre',
                        dorsal: p.dorsal,
                        isExtra: false
                      })),
                      ...(extraPlayers || []).map(ep => ({
                        id: `extra_${typeof ep === 'object' ? ep._id : ep}`,
                        name: typeof ep === 'object' ? (getPlayerFullName(ep) || ep._id) : ep,
                        extraPlayerId: typeof ep === 'object' ? ep._id : ep,
                        dorsal: typeof ep === 'object' ? ep.dorsal : null,
                        isExtra: true
                      }))
                    ];
                    const assignedElsewhere = [];
                    (teamAssignments || []).forEach(ta => {
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
                            ({(currentAssignment.players?.length || 0) + (currentAssignment.extraPlayers?.length || 0) + getExerciseComodines()})
                          </Text>
                        </View>

                        <View style={styles.teamAssignmentComodinesRow}>
                          <View style={styles.teamAssignmentComodinesLabel}>
                            <Ionicons name="swap-horizontal" size={16} color="#0f766e" />
                            <Text style={styles.teamAssignmentComodinesText}>{t('session.comodines', 'Comodines')}</Text>
                          </View>
                          <View style={styles.teamAssignmentComodinesStepper}>
                            <TouchableOpacity
                              style={[styles.teamAssignmentComodinesBtn, getExerciseComodines() === 0 && styles.teamAssignmentComodinesBtnDisabled]}
                              disabled={getExerciseComodines() === 0}
                              onPress={() => updateExerciseComodines(getExerciseComodines() - 1)}
                            >
                              <Feather name="minus" size={16} color={getExerciseComodines() === 0 ? '#94a3b8' : '#0f766e'} />
                            </TouchableOpacity>
                            <Text style={styles.teamAssignmentComodinesValue}>{getExerciseComodines()}</Text>
                            <TouchableOpacity
                              style={styles.teamAssignmentComodinesBtn}
                              onPress={() => updateExerciseComodines(getExerciseComodines() + 1)}
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
                                  const newAssignments = (teamAssignments || []).map(ta => ({
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
                                  onUpdateTeamAssignments(newAssignments);
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
                                  <Ionicons name="person-add-outline" size={14} color={isSelected ? "#fff" : "#f59e0b"} style={{ marginRight: 4 }} />
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

                {Array.from({ length: numEquipos }, (_, teamIndex) => {
                  const teamNumber = teamIndex + 1;
                  const currentAssignment = teamAssignments?.find(ta => ta.teamNumber === teamNumber) || { teamNumber, players: [], extraPlayers: [] };

                  // Combinar jugadores y extras disponibles
                  const allAvailable = [
                    ...(availablePlayers || []).map(p => ({
                      id: p._id,
                      name: getPlayerFullName(p) || p.dorsal?.toString() || 'Sin nombre',
                      dorsal: p.dorsal,
                      isExtra: false
                    })),
                    ...(extraPlayers || []).map(ep => ({
                      id: `extra_${typeof ep === 'object' ? ep._id : ep}`,
                      name: typeof ep === 'object' ? (getPlayerFullName(ep) || ep._id) : ep,
                      extraPlayerId: typeof ep === 'object' ? ep._id : ep,
                      dorsal: typeof ep === 'object' ? ep.dorsal : null,
                      isExtra: true
                    }))
                  ];

                  // Jugadores ya asignados a otros equipos
                  const assignedElsewhere = [];
                  (teamAssignments || []).forEach(ta => {
                    if (ta.teamNumber !== teamNumber) {
                      ta.players?.forEach(pid => assignedElsewhere.push(pid));
                      ta.extraPlayers?.forEach(epId => assignedElsewhere.push(`extra_${epId}`));
                    }
                  });

                  return (
                    <View key={teamNumber} style={styles.teamAssignmentTeamSection}>
                      <View style={styles.teamAssignmentTeamHeader}>
                        <View style={[styles.teamAssignmentTeamBadge, { backgroundColor: getTeamColor(teamNumber) }]}>
                          <Text style={styles.teamAssignmentTeamBadgeText}>{teamNumber}</Text>
                        </View>
                        <Text style={styles.teamAssignmentTeamTitle}>{t('session.team')} {teamNumber}</Text>
                        <Text style={styles.teamAssignmentTeamCount}>
                          ({(currentAssignment.players?.length || 0) + (currentAssignment.extraPlayers?.length || 0)} {t('players.title')})
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
                                const newAssignments = (teamAssignments || []).map(ta => ({
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

                                onUpdateTeamAssignments(newAssignments);
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
                                  color={isSelected ? "#fff" : "#f59e0b"}
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
                  onPress={() => onUpdateTeamAssignments([])}
                >
                  <MaterialIcons name="clear-all" size={20} color="#64748b" />
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

      {/* Observaciones */}
      <TextInput
        style={styles.draggableObservationInput}
        placeholder={t('session.addObservations')}
        placeholderTextColor="#94a3b8"
        value={observacion || ''}
        onChangeText={onUpdateObservacion}
        multiline
        rows={2}
      />
    </View>
  );
}

// Helper function para colores de equipos
function getTeamColor(teamNumber) {
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  return colors[(teamNumber - 1) % colors.length];
}

function ObservacionEjercicio({ eid, nombre, value, onChange }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(!!value);

  function handleBlur() {
    setShow(false);
    Keyboard.dismiss();
  }

  return (
    <View style={{ marginTop: 15, width: '95%' }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%'
      }}>
        <TouchableOpacity
          onPress={() => setShow(s => !s)}
          style={{
            backgroundColor: '#74be1eff',
            borderRadius: 12,
            paddingVertical: 4,
            paddingHorizontal: 10,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '600', marginBottom: 2, flex: 1 }}>{nombre}</Text>
          <MaterialIcons name={value ? "comment" : "add-comment"} size={18} color={"#fff"} />
          <Text style={{ marginLeft: 2, color: "#fff", fontWeight: 'bold', fontSize: 12 }}>
            {t('common.add')}
          </Text>
        </TouchableOpacity>
      </View>
      {show && (
        <TextInput
          style={[styles.inputBox, { minHeight: 38, marginTop: 6 }]}
          placeholderText={t('session.observationsFor', { nombre })}
          placeholderTextColor={"#000"}
          value={value}
          onChangeText={txt => onChange(txt)}
          multiline
          blurOnSubmit={true}
          enterKeyHint="done"
          onBlur={handleBlur}
          onSubmitEditing={handleBlur}
        />
      )}
    </View>
  );
}

/* ---------------- Overlay Hora ---------------- */
function TimeOverlay({ visible, onClose, onConfirm, initialTime, title = 'Selecciona hora' }) {
  const { t } = useTranslation();
  // Always declare hooks in the same order regardless of `visible` to avoid broken hooks order
  const { h: initH, m: initM } = parseTimeToHM(initialTime || '');
  const [hour, setHour] = useState(initH);
  const [minute, setMinute] = useState(initM);

  useEffect(() => {
    // When overlay becomes visible, reset hour/minute from `initialTime`
    if (visible) {
      const { h, m } = parseTimeToHM(initialTime || '');
      setHour(h);
      setMinute(m);
    }
  }, [visible, initialTime]);

  const minutes = hour === 24 ? [0] : MINUTES_ALL;
  function confirm() {
    const val = `${pad2(hour)}:${pad2(minute)}`;
    if (!isValidTime(val)) {
      Alert.alert(t('message.error'), t('session.invalidHourMessage'));
      return;
    }
    onConfirm(val);
  }

  if (!visible) return null;

  return (
    <View style={styles.timeOverlayBg}>
      <View style={styles.timeOverlayContent}>
        <Text style={styles.timeOverlayTitle}>{title || t('session.selectHour')}</Text>
        <View style={styles.timeColumns}>
          <View style={styles.timeColumn}>
            <Text style={styles.timeColumnLabel}>{t('session.hourLabel')}</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {HOURS.map(h => (
                <TouchableOpacity
                  key={h}
                  style={[styles.timeItem, hour === h && styles.timeItemSelected]}
                  onPress={() => { setHour(h); if (h === 24) setMinute(0); }}
                >
                  <Text style={[styles.timeItemText, hour === h && styles.timeItemTextSel]}>{pad2(h)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.timeColumn}>
            <Text style={styles.timeColumnLabel}>{t('session.minutesLabel')}</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {minutes.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.timeItem, minute === m && styles.timeItemSelected]}
                  onPress={() => setMinute(m)}
                >
                  <Text style={[styles.timeItemText, minute === m && styles.timeItemTextSel]}>{pad2(m)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        <Text style={styles.timeHint}>{t('session.timeFormatHint')}</Text>
        <View style={styles.timeButtonsRow}>
          <TouchableOpacity style={[styles.timeBtn, styles.timeCancel]} onPress={onClose}>
            <Text style={styles.timeBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.timeBtn, styles.timeOk]} onPress={confirm}>
            <Text style={styles.timeBtnText}>{t('common.ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ---------------- Chip resumen ---------------- */
function ExerciseSelectionSummary({ selectedIds, ejercicios, onOpen, disabled }) {
  const { t } = useTranslation();
  const selected = useMemo(
    () => ejercicios.filter(e => selectedIds.includes(e._id)).slice(0, 3),
    [selectedIds, ejercicios]
  );
  return (
    <Pressable
      style={[styles.summaryChip, disabled && { opacity: 0.4 }]}
      onPress={() => { if (!disabled) onOpen(); }}
    >
      <View style={styles.summaryThumbsRow}>
        {selected.map(e => (
          <View key={e._id} style={styles.thumbWrapper}>
            {getContentImage(e)
              ? <Base64ImagePreview imageUrl={getContentImage(e)} forceWidth={60} forceHeight={60} />
              : <View style={styles.thumbPlaceholder} />
            }
          </View>
        ))}
        {selectedIds.length === 0 && <Text style={styles.placeholderText}>+</Text>}
        {selectedIds.length > 3 && (
          <View style={styles.moreMini}>
            <Text style={styles.moreMiniText}>+{selectedIds.length - 3}</Text>
          </View>
        )}
      </View>
      <Text style={styles.summaryLabel}>
        {selectedIds.length === 0 ? t('exercise.selectExercises') : t('exercises.selectedCount', { count: selectedIds.length })}
      </Text>
    </Pressable>
  );
}

/* ---------------- Custom Dropdown Component ---------------- */
function CustomDropdown({ value, onValueChange, options, placeholder }) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : (placeholder || t('common.selectPlaceholder'));

  return (
    <>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setShowModal(true)}
      >
        <Text style={[styles.dropdownText, !selectedOption && styles.dropdownPlaceholder]}>
          {displayText}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={20} color="#64748b" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.dropdownModalBg}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.dropdownModalContent}>
            <Text style={styles.dropdownModalTitle}>{t('common.selectOption')}</Text>
            <ScrollView style={styles.dropdownOptionsList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    value === option.value && styles.dropdownOptionSelected
                  ]}
                  onPress={() => {
                    onValueChange(option.value);
                    setShowModal(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    value === option.value && styles.dropdownOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <MaterialIcons name="check" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
function PlayerGridPage({ items, selectedIds, onToggle, injuries }) {
  const { t } = useTranslation();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 8 }}
      showsVerticalScrollIndicator
    >
      <View style={styles.gridWrapper}>
        {items.length === 0 ? (
          <View style={styles.emptyGrid}>
            <Text style={styles.emptyGridTxt}>{t('common.noResults')}</Text>
          </View>
        ) : items.map(j => {
          const status = getPlayerInjuryStatus(j._id, injuries);
          return (
            <TouchableOpacity
              key={j._id}
              style={[styles.exerciseCard, selectedIds.includes(j._id) && styles.exerciseCardSel]}
              onPress={() => onToggle(j._id)}
              activeOpacity={0.75}
            >
              <View style={styles.playerCardIcon}>
                <Ionicons name="person" size={40} color={selectedIds.includes(j._id) ? "#3578e5" : "#94a3b8"} />
              </View>
              <Text style={[styles.exerciseName, selectedIds.includes(j._id) && styles.exerciseNameSel]} numberOfLines={2}>
                {getPlayerFullName(j)}
              </Text>
              {j.posicion && (
                <Text style={styles.playerPosition} numberOfLines={1}>
                  {j.posicion}
                </Text>
              )}
              {status && (
                <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                  <Text style={styles.statusText}>{t(`common.${status.status}`)}</Text>
                </View>
              )}
              {selectedIds.includes(j._id) && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkBadgeTxt}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

function GridPage({ items, selectedIds, onToggle, onPlayVideo }) {
  const { t } = useTranslation();
  return (
    <View style={styles.gridPageWrap}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator
      >
        <View style={styles.gridWrapper}>
          {items.length === 0 ? (
            <View style={styles.emptyGrid}>
              <Text style={styles.emptyGridTxt}>{t('common.noResults')}</Text>
            </View>
          ) : items.map(e => (
            <TouchableOpacity
              key={e._id}
              style={[styles.exerciseCard, selectedIds.includes(e._id) && styles.exerciseCardSel]}
              onPress={() => onToggle(e._id)}
              activeOpacity={0.75}
            >
              {/* Botón de video - siempre visible para verificar si hay videos */}
              {onPlayVideo && (
                <TouchableOpacity
                  style={[
                    styles.exerciseVideoBadge,
                    (!e.videos || e.videos.length === 0) && styles.exerciseVideoBadgeInactive
                  ]}
                  onPress={(event) => {
                    event.stopPropagation();
                    onPlayVideo(e);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="play-circle" size={18} color="#fff" />
                </TouchableOpacity>
              )}
              {getContentImage(e)
                ? <Base64ImagePreview imageUrl={getContentImage(e)} forceWidth={60} forceHeight={60} />
                : <View style={styles.exerciseImgPlaceholder} />
              }
              <Text style={[styles.exerciseName, selectedIds.includes(e._id) && styles.exerciseNameSel]} numberOfLines={2}>
                {e.nombre}
              </Text>
              {selectedIds.includes(e._id) && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkBadgeTxt}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function CategoryPage({ catPageItems, onOpenCategory }) {
  const { t } = useTranslation();
  return (
    <View style={styles.gridPageWrap}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator
      >
        {catPageItems.length === 0 ? (
          <View style={styles.emptyGrid}>
            <Text style={styles.emptyGridTxt}>{t('exercise.noCategories')}</Text>
          </View>
        ) : (
          <View style={styles.categoriesWrapper}>
            {catPageItems.map(c => (
              <TouchableOpacity
                key={c.cat}
                style={styles.categoryChip}
                onPress={() => onOpenCategory(c.cat)}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryChipText} numberOfLines={1}>{c.cat}</Text>
                <Text style={styles.categoryChipCount}>{c.items.length}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ---------------- Componente principal Training ---------------- */
export default function Training({ canMutate }) {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const temporada = useSelector(s => s.season.season);
  const sesiones = useSelector(s => s.session.session);
  const loading = useSelector(s => s.session.loading);
  const userExercises = useSelector(s => s.exercise.exercises || []);
  const globalExercises = useSelector(s => s.exercise.globalExercises || []);
  const ejerciciosDisponibles = useMemo(
    () => mergeExercises(userExercises, globalExercises),
    [userExercises, globalExercises]
  );
  const jugadoresDisponibles = useSelector(s => s.player.players || []);
  // Separar jugadores de plantilla y extras
  const jugadoresPlantilla = useMemo(() => jugadoresDisponibles.filter(j => !j.extra), [jugadoresDisponibles]);
  const jugadoresExtrasDisponibles = useMemo(() => jugadoresDisponibles.filter(j => j.extra), [jugadoresDisponibles]);
  const equipos = useSelector(s => s.team.teams || []);
  const injuries = useSelector(state => state.injury.injuries);
  const matchSheets = useSelector(state => state.matchSheet.matchSheets || []);
  const { width } = useWindowDimensions();
  const isMobile = width < 430;
  const isTablet = width > 700;
  const [tab, setTab] = useState('futuros');
  const [addEventModalVisible, setAddEventModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [pdfUploadVisible, setPdfUploadVisible] = useState(false);
  const [pdfUploadSession, setPdfUploadSession] = useState(null);
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [pdfViewerSession, setPdfViewerSession] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [repeatedSessionId, setRepeatedSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [timeOverlayVisible, setTimeOverlayVisible] = useState(false);
  const [timeOverlayTarget, setTimeOverlayTarget] = useState(null);
  const [iosDatePickerVisible, setIosDatePickerVisible] = useState(false);
  const [datePickerVisibleStart, setDatePickerVisibleStart] = useState(false);
  const [datePickerVisibleEnd, setDatePickerVisibleEnd] = useState(false);
  const [idUsuario, setIdUsuario] = useState("");
  const [dateFilter, setDateFilter] = useState(null); // null = sin filtro, {startDate, endDate} = rango de fechas
  const [dateRangeModalVisible, setDateRangeModalVisible] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState(() => new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const fetchedRef = useRef({ season: false, exercises: false, user: false, teams: false, players: false });

  // Estados para reproducción de videos
  const [showExerciseVideoModal, setShowExerciseVideoModal] = useState(false);
  const [exerciseForVideoMain, setExerciseForVideoMain] = useState(null);
  const [selectedVideoMain, setSelectedVideoMain] = useState(null);
  const [videoUrlMain, setVideoUrlMain] = useState(null);
  const [isGeneratingVideoMain, setIsGeneratingVideoMain] = useState(false);
  const [mainExerciseVideoAvailability, setMainExerciseVideoAvailability] = useState({});
  const videoOpenedFromModalRef = useRef(null); // 'editar' | 'crear' | null
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
  const openedSessionFromRouteRef = useRef(null);
  const addedExerciseFromRouteRef = useRef(null);

  // NOTE: Wellness states and functions moved to TrainingSessionDetailModal

  // Función para reproducir video de ejercicio en el main component
  useEffect(() => {
    const openSessionId = route?.params?.openSessionId;
    if (!openSessionId || openedSessionFromRouteRef.current === openSessionId) return;
    const routedSession = route?.params?.updatedSession;
    const session = String(routedSession?._id || '') === String(openSessionId)
      ? routedSession
      : (sesiones || []).find(s => String(s?._id) === String(openSessionId));
    if (!session) return;
    openedSessionFromRouteRef.current = openSessionId;
    setSelectedSession(session);
    setDetailModalVisible(true);
  }, [route?.params?.openSessionId, route?.params?.updatedSession, sesiones]);

  useEffect(() => {
    const addExerciseId = route?.params?.addExerciseId;
    if (!addExerciseId || addedExerciseFromRouteRef.current === addExerciseId) return;
    const draft = loadFormDraft(STORAGE_KEYS.TRAINING_SESSION_DRAFT, { remove: false });
    if (!draft) return;
    saveFormDraft(STORAGE_KEYS.TRAINING_SESSION_DRAFT, { ...draft, addExerciseId });
    addedExerciseFromRouteRef.current = addExerciseId;
    if (draft.mode === 'edit') {
      setSelectedSession(draft.session || null);
      setEditModalVisible(true);
    } else {
      setAddEventModalVisible(true);
    }
  }, [route?.params?.addExerciseId]);

  const handlePlayExerciseVideoMain = async (exercise) => {
    videoOpenedFromModalRef.current = null;

    setTimeout(async () => {
      setExerciseForVideoMain(exercise);
      setShowExerciseVideoModal(true);
      setIsGeneratingVideoMain(true);

      try {
        const videos = await getVideosByExercise(exercise._id);

        if (videos && videos.length > 0) {
          const video = videos[0];
          setSelectedVideoMain(video);
          const url = await resolvePlayableVideoUrl(video);
          if (url) setVideoUrlMain(url);
          else { Alert.alert(t('message.info'), t('exercise.noVideos')); setShowExerciseVideoModal(false); }
        } else {
          Alert.alert(t('message.info'), t('exercise.noVideos'));
          setShowExerciseVideoModal(false);
          videoOpenedFromModalRef.current = null;
        }
      } catch (error) {
        console.error('Error cargando videos:', error);
        Alert.alert(t('message.error'), t('exercise.videoPlayError'));
        setShowExerciseVideoModal(false);
        videoOpenedFromModalRef.current = null;
      } finally {
        setIsGeneratingVideoMain(false);
      }
    }, 100);
  };

  const closeExerciseVideoModal = () => {
    setShowExerciseVideoModal(false);
    setSelectedVideoMain(null);
    setVideoUrlMain(null);
    setExerciseForVideoMain(null);
    videoOpenedFromModalRef.current = null;
  };

  // Función para descargar video
  const handleDownloadVideo = async () => {
    if (!selectedVideoMain) return;

    try {
      setIsDownloadingVideo(true);
      toast.success(t('myVideos.downloadingStarted', 'Preparando el video para guardarlo...'));
      const downloadName = exerciseForVideoMain?.nombre || selectedVideoMain.nombre || 'video';
      await downloadResolvedVideo(selectedVideoMain, downloadName);
      toast.success(t('myVideos.downloadStarted', 'Video guardado en la galeria.'));
    } catch (error) {
      console.error('Error descargando video:', error);
      toast.error(t('myVideos.downloadError', 'No se pudo guardar el video. Intentalo de nuevo.'));
    } finally {
      setIsDownloadingVideo(false);
    }
  };

  // NOTE: Wellness loading functions (loadWellnessStats, loadPreWellnessStats) moved to TrainingSessionDetailModal

  useEffect(() => {
    (async () => {
      if (!fetchedRef.current.user) {
        const stored = await AsyncStorage.getItem('usuario');
        const u = JSON.parse(stored || '{}')?._id;
        setIdUsuario(u);
        fetchedRef.current.user = true;
      }
    })();
  }, []);

  // Cargar sesiones cuando cambie el equipo seleccionado
  useEffect(() => {
    const selectedTeam = equipos.find(e => e.seleccionado === true);
    if (selectedTeam?._id) {
      dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id }));
      dispatch(fetchMatchSheetsByTeam(selectedTeam._id)); // Cargar partidos para validación
      fetchedRef.current.season = true;
    }
  }, [equipos, dispatch]);

  useEffect(() => {
    if (idUsuario && !fetchedRef.current.exercises) {
      dispatch(fetchEjerciciosUsuario({ user: idUsuario }));
      fetchedRef.current.exercises = true;
    }
  }, [idUsuario, dispatch]);

  useEffect(() => {
    if (idUsuario) {
      dispatch(fetchGlobalExercises({ lang: i18n.language }));
    }
  }, [idUsuario, i18n.language, dispatch]);

  useEffect(() => {
    if (temporada?._id && !fetchedRef.current.teams) {
      dispatch(fetchEquiposTemporada({ season: temporada._id }));
      fetchedRef.current.teams = true;
    }
  }, [temporada, dispatch]);

  useEffect(() => {
    const selectedTeam = equipos.find(e => e.seleccionado === true);
    const teamId = selectedTeam?._id;
    if (teamId && !fetchedRef.current.players) {
      dispatch(fetchJugadoresEquipo({ team: teamId }));
      fetchedRef.current.players = true;
    }
  }, [equipos, dispatch]);

  // Cargar lesiones cuando cambie el equipo seleccionado
  useEffect(() => {
    const selectedTeam = equipos.find(e => e.seleccionado === true);
    if (selectedTeam?._id) {
      dispatch(fetchInjuriesByTeam({ team: selectedTeam._id }));
    }
  }, [equipos, dispatch]);

  // NOTE: Video availability for edit modal is now handled by EditSessionModal internally

  // Crear entrenamientos múltiples (organizar temporada por equipo)
  async function handleBulkSubmit(formState) {
    setLoadingOrg(true);
    try {
      // Obtener el equipo seleccionado
      const selectedTeam = equipos.find(e => e.seleccionado === true);
      if (!selectedTeam || !selectedTeam._id) {
        Alert.alert(t('message.error'), t('session.noTeamSelected'));
        setLoadingOrg(false);
        return;
      }

      // Crear sesiones con el equipo seleccionado
      await dispatch(createEntrenamientoBulk({ ...formState, equipo: selectedTeam._id }));

      setShowOrgModal(false);

      // Recargar las sesiones después de crear
      dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id }));

      Alert.alert(t('message.success'), t('session.bulkCreated', { name: selectedTeam.nombre }));
    } catch (err) {
      Alert.alert(t('message.error'), t('session.bulkCreateError'));
    }
    setLoadingOrg(false);
  }

  // NOTE: openVistaSesion replaced by handleSessionPress
  // NOTE: openLongPressModal no longer needed - using shared modals

  async function handleEliminarSesion(sesion) {
    if (!sesion?._id) return;
    Alert.alert(
      t('session.deleteConfirmationTitle'),
      t('session.deleteConfirmationMessage'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('common.delete'),
          style: "destructive",
          onPress: async () => {
            try {
              const selectedTeam = equipos.find(e => e.seleccionado === true);
              await dispatch(deleteEntrenamiento(sesion._id)).unwrap();
              if (selectedTeam?._id) {
                dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id }));
              }
              Alert.alert(t('message.success'), t('session.deleteSuccess'));
            } catch {
              Alert.alert(t('message.error'), t('session.deleteError'));
            }
          }
        }
      ]
    );
  }

  // Función para generar PDF de la sesión
  async function handleDescargarPDF(sesion) {
    try {
      // Verificar que la sesión tenga datos básicos
      if (!sesion) {
        throw new Error('No se proporcionó información de la sesión');
      }

      // Obtener los ejercicios completos de la sesión
      const sessionExerciseIds = (sesion.ejercicios || []).map(e => typeof e === 'string' ? e : e._id);
      const ejerciciosSesion = (ejerciciosDisponibles || []).filter(e =>
        sessionExerciseIds.includes(e._id)
      );

      // Obtener información del equipo
      const equipoSesion = equipos.find(e => e._id === sesion.equipo);

      // Obtener ejercicios de fuerza de la sesión
      const strengthExercisesData = (sesion.ejerciciosFuerza || []).map(ef => {
        const exerciseData = STRENGTH_EXERCISES.find(e => e.id === ef.id);
        if (!exerciseData) return null;
        return {
          ...exerciseData,
          observacion: ef.observacion || '',
          tiempoDescanso: ef.tiempoDescanso || 0,
          orden: ef.orden || 0,
        };
      }).filter(Boolean);

      // Usar la función compartida de SessionPDF.js
      await generateSessionPDF({
        session: sesion,
        exercises: ejerciciosSesion,
        strengthExercises: strengthExercisesData,
        team: equipoSesion,
        players: jugadoresDisponibles,
        i18n,
      });
    } catch (error) {
      Alert.alert(t('message.error'), t('session.pdfGenerateError'));
    }
  }

  function showTimeOverlay(target) {
    setTimeOverlayTarget(target);
    setTimeOverlayVisible(true);
  }

  function handleTimeConfirm(val) {
    // NOTE: 'editInicio'/'editFin' targets removed - now handled by EditSessionModal
    setTimeOverlayVisible(false);
    setTimeOverlayTarget(null);
  }

  function addJugadorExtra(setter, currentExtras, nombre, setText) {
    const trimmed = nombre.trim();
    if (trimmed && !currentExtras.includes(trimmed)) {
      setter([...currentExtras, trimmed]);
      if (setText) setText('');
    }
  }

  function handleAddExtraPlayer(text, setter, currentExtras, setText) {
    addJugadorExtra(setter, currentExtras, text, setText);
  }

  function removeJugadorExtra(setter, currentExtras, nombre) {
    setter(currentExtras.filter(j => j !== nombre));
  }

  function validateTimes(start, end, setErrEnd) {
    if (start && !isValidTime(start)) return false;
    if (end && !isValidTime(end)) return false;
    if (start && end && compareTimes(start, end) >= 0) {
      setErrEnd('Debe ser mayor que inicio');
      return false;
    }
    return true;
  }

  // NOTE: handleUpdateSesion replaced by handleSaveSession which uses EditSessionModal

  // Helper para verificar si hay partido en una fecha
  function checkMatchOnDate(dateToCheck) {
    if (!dateToCheck) return null;
    const checkDateStr = new Date(dateToCheck).toISOString().split('T')[0];
    return matchSheets.find(match => {
      if (!match.fechaHora) return false;
      const matchDate = new Date(match.fechaHora);
      const matchDateStr = matchDate.toISOString().split('T')[0];
      return matchDateStr === checkDateStr;
    });
  }

  // Función adaptadora para crear sesión desde AddEventModal
  async function handleCreateFromAddEventModal(sessionData) {
    const selectedTeam = equipos.find(e => e.seleccionado === true);
    if (!selectedTeam?._id) {
      Alert.alert(t('message.error'), t('session.noTeamSelected'));
      return;
    }

    // Transformar datos del formato de AddEventModal al formato esperado por el thunk
    const ejerciciosIds = sessionData.ejercicios.map(e => e.ejercicio);
    const ejerciciosDetalle = sessionData.ejercicios.map((e, index) => ({
      ejercicio: e.ejercicio,
      orden: e.orden || index + 1,
      tiempoDescanso: e.tiempoDescanso || 0,
      teamAssignments: e.teamAssignments || []
    }));
    const observaciones = sessionData.ejercicios.map(e => ({
      ejercicioId: e.ejercicio,
      observacion: e.observacion || ''
    })).filter((item) => typeof item.observacion === 'string' && item.observacion.trim());
    const observacionGeneral = (sessionData.observaciones || sessionData.observacionesGenerales || '').trim();
    if (observacionGeneral) {
      observaciones.push({ observacion: observacionGeneral, tipo: 'general' });
    }

    await dispatch(createEntrenamiento({
      equipo: selectedTeam._id,
      ejercicios: ejerciciosIds,
      ejerciciosDetalle,
      tareasPersonalizadas: sessionData.tareasPersonalizadas || [],
      observaciones,
      ejerciciosFuerza: sessionData.ejerciciosFuerza || [],
      jugadores: sessionData.jugadores || [],
      jugadoresExtras: sessionData.jugadoresExtras || [],
      horaInicio: sessionData.horaInicio || null,
      horaFin: sessionData.horaFin || null,
      fecha: sessionData.fecha,
      expectedWellness: sessionData.expectedWellness,
      manualAverageWellness: sessionData.manualAverageWellness
    }));

    dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id }));
    toast.success(t('session.createSuccess'));
    setAddEventModalVisible(false);
  }

  function EjerciciosVista({ ejerciciosIds }) {
    const vista = ejerciciosDisponibles.filter(e => ejerciciosIds.includes(e._id));
    if (vista.length === 0) return <Text style={styles.emptyInner}>{t('exercises.noExercises')}</Text>;
    return (
      <View style={styles.ejerciciosVistaContainer}>
        {vista.map(ej => (
          <View key={ej._id} style={styles.ejercicioVista}>
            {getContentImage(ej)
              ? <Base64ImagePreview imageUrl={getContentImage(ej)} forceWidth={48} forceHeight={48} />
              : <View style={styles.ejercicioImgVistaPlaceholder} />
            }
            <Text style={styles.ejercicioNombreVista} numberOfLines={2}>{ej.nombre}</Text>
          </View>
        ))}
      </View>
    );
  }

  // NOTE: EjerciciosVistaCompleto was removed - functionality now in TrainingSessionDetailModal

  function openCrearModal() {
    // Usar AddEventModal en lugar del modal antiguo
    setAddEventModalVisible(true);
  }

  function openPdfUpload(session = null) {
    setDetailModalVisible(false);
    setPdfUploadSession(session);
    setPdfUploadVisible(true);
  }

  function openPdfViewer(session) {
    setDetailModalVisible(false);
    setPdfViewerSession(session);
    setPdfViewerVisible(true);
  }

  function closePdfViewer() {
    const sessionToRestore = pdfViewerSession;
    setPdfViewerVisible(false);
    setPdfViewerSession(null);
    if (sessionToRestore) {
      setSelectedSession(sessionToRestore);
      setDetailModalVisible(true);
    }
  }

  async function handlePdfUpload({ file, filename, fecha, horaInicio, horaFin }) {
    const selectedTeam = equipos.find(e => e.seleccionado === true);
    if (!selectedTeam?._id) throw new Error(t('session.noTeamSelected'));

    let createdSessionId = null;
    try {
      let targetSession = pdfUploadSession;
      if (!targetSession?._id) {
        const created = await dispatch(createEntrenamiento({
          equipo: selectedTeam._id,
          fecha: new Date(`${fecha}T${horaInicio || '00:00'}:00`).toISOString(),
          horaInicio: horaInicio || null,
          horaFin: horaFin || null,
          ejercicios: [],
          ejerciciosDetalle: [],
          tareasPersonalizadas: [],
          observaciones: [],
          jugadores: [],
          jugadoresExtras: [],
        })).unwrap();
        targetSession = Array.isArray(created) ? created[0] : created;
        createdSessionId = targetSession?._id;
      }

      const saved = await dispatch(uploadEntrenamientoPdf({ id: targetSession._id, file, filename })).unwrap();
      await dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id }));
      setPdfUploadVisible(false);
      setPdfUploadSession(null);
      setSelectedSession(saved);
      setDetailModalVisible(true);
      toast.success(t('session.pdfUploadSuccess', 'PDF guardado correctamente'));
    } catch (error) {
      if (createdSessionId) {
        await dispatch(deleteEntrenamiento(createdSessionId)).unwrap().catch(() => {});
      }
      throw new Error(error?.response?.data?.message || error?.message || t('session.pdfUploadError', 'No se pudo guardar el PDF.'));
    }
  }

  function handleSessionPress(session) {
    setSelectedSession(session);
    setDetailModalVisible(true);
  }

  function handleEditSession(session) {
    setSelectedSession(session);
    setDetailModalVisible(false);
    setEditModalVisible(true);
  }

  async function handleRepeatSession(session) {
    const selectedTeam = equipos.find(e => e.seleccionado === true);
    if (!selectedTeam?._id || !session) return;
    try {
      const created = await dispatch(createEntrenamiento({
        equipo: selectedTeam._id,
        fecha: new Date().toISOString(),
        horaInicio: session.horaInicio || null,
        horaFin: session.horaFin || null,
        ejercicios: session.ejercicios || [],
        ejerciciosDetalle: session.ejerciciosDetalle || [],
        ejerciciosFuerza: session.ejerciciosFuerza || [],
        tareasPersonalizadas: session.tareasPersonalizadas || [],
        jugadores: session.jugadores || [],
        jugadoresExtras: session.jugadoresExtras || [],
        observaciones: session.observaciones || [],
        expectedWellness: session.expectedWellness,
        manualAverageWellness: session.manualAverageWellness,
      })).unwrap();
      const repeated = Array.isArray(created) ? created[0] : created;
      await dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id }));
      setSelectedSession(repeated);
      setRepeatedSessionId(repeated?._id || null);
      setDetailModalVisible(false);
      setEditModalVisible(true);
      toast.success(t('session.repeatSuccess', 'Sesión repetida. Revisa y guarda el nuevo entrenamiento.'));
    } catch (error) {
      toast.error(t('session.repeatError', 'No se pudo repetir la sesión'));
    }
  }

  const handleCreateExerciseFromSession = useCallback(() => {
    saveFormDraft(STORAGE_KEYS.EXERCISE_LIST, { creating: true, editingExercise: null, addToTrainingDraft: true });
    saveFormDraft(STORAGE_KEYS.FIELD_RESULT, { kind: 'exercise', editingId: null });
    navigation.navigate('/exercises');
  }, [navigation]);

  async function handleSaveSession(updatedData) {
    const selectedTeam = equipos.find(e => e.seleccionado === true);
    if (!selectedTeam?._id) return;

    try {
      // Transformar datos del formato de EditSessionModal al formato del thunk
      const ejerciciosIds = updatedData.ejercicios?.map(e => e.ejercicio) || [];
      const ejerciciosDetalle = updatedData.ejercicios?.map((e, index) => ({
        ejercicio: e.ejercicio,
        orden: e.orden || index + 1,
        tiempoDescanso: e.tiempoDescanso || 0,
        teamAssignments: e.teamAssignments || []
      })) || [];
      const observaciones = updatedData.ejercicios?.map(e => ({
        ejercicioId: e.ejercicio,
        observacion: e.observacion || ''
      })).filter((item) => typeof item.observacion === 'string' && item.observacion.trim()) || [];
      const observacionGeneral = (updatedData.observaciones || updatedData.observacionesGenerales || '').trim();
      if (observacionGeneral) {
        observaciones.push({ observacion: observacionGeneral, tipo: 'general' });
      }

      await dispatch(updateEntrenamiento({
        id: updatedData._id,
        data: {
          fecha: updatedData.fecha,
          horaInicio: updatedData.horaInicio,
          horaFin: updatedData.horaFin,
          ejercicios: ejerciciosIds,
          ejerciciosDetalle,
          tareasPersonalizadas: updatedData.tareasPersonalizadas || [],
          observaciones,
          ejerciciosFuerza: updatedData.ejerciciosFuerza || [],
          jugadores: updatedData.jugadores || [],
          jugadoresExtras: updatedData.jugadoresExtras || [],
          expectedWellness: updatedData.expectedWellness,
          manualAverageWellness: updatedData.manualAverageWellness
        }
      }));

      dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id }));
      toast.success(t('session.updateSuccess'));
      setEditModalVisible(false);
      setSelectedSession(null);
      setRepeatedSessionId(null);
    } catch (error) {
      toast.error(t('session.updateError'));
    }
  }

  async function handleCloseEditSession() {
    if (repeatedSessionId) {
      try {
        await dispatch(deleteEntrenamiento(repeatedSessionId)).unwrap();
        const selectedTeam = equipos.find(e => e.seleccionado === true);
        if (selectedTeam?._id) dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id }));
      } catch { /* keep the draft visible if cleanup fails */ }
      setRepeatedSessionId(null);
    }
    setEditModalVisible(false);
    setSelectedSession(null);
  }

  async function handleDeleteSession(session) {
    if (!session?._id) return;
    const selectedTeam = equipos.find(e => e.seleccionado === true);
    if (!selectedTeam?._id) return;

    try {
      await dispatch(deleteEntrenamiento(session._id)).unwrap();
      dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id }));
      toast.success(t('session.deleteSuccess'));
      setDetailModalVisible(false);
      setSelectedSession(null);
    } catch (error) {
      toast.error(t('session.deleteError'));
    }
  }

  async function handleWellnessUpdate() {
    const selectedTeam = equipos.find(e => e.seleccionado === true);
    if (selectedTeam?._id) {
      dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id }));
    }
  }

  // NOTE: Old renderSession removed - using the enhanced version below

  const modalPadding = isMobile ? 8 : 18;
  // LOGICA EVENTOS FUTUROS Y PASADOS
  const now = new Date();
  function buildStartDateTime(fechaStr, horaStr) {
    if (!fechaStr) return null;
    let y, m, d;
    const mFecha = fechaStr.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (mFecha) {
      y = Number(mFecha[1]);
      m = Number(mFecha[2]) - 1;
      d = Number(mFecha[3]);
    } else {
      const tmp = new Date(fechaStr);
      if (isNaN(tmp.getTime())) return null;
      y = tmp.getFullYear();
      m = tmp.getMonth();
      d = tmp.getDate();
    }
    let hh = 0, mm = 0;
    if (horaStr && typeof horaStr === 'string') {
      const clean = horaStr.trim();
      const sep = clean.includes(':') ? ':' : (clean.includes('-') ? '-' : null);
      if (sep) {
        const parts = clean.split(sep);
        if (parts.length === 2) {
          let H = Number(parts[0]);
          let M = Number(parts[1]);
          if (Number.isInteger(H) && Number.isInteger(M) && H >= 0 && H <= 24 && M >= 0 && M <= 59) {
            if (H === 24 && M === 0) {
              return new Date(y, m, d + 1, 0, 0, 0, 0);
            }
            if (!(H === 24 && M !== 0)) {
              hh = H; mm = M;
            }
          }
        }
      }
    }
    return new Date(y, m, d, hh, mm, 0, 0);
  }
  const eventosPasados = [];
  const eventosFuturos = [];
  (sesiones || []).forEach(e => {
    const start = buildStartDateTime(e.fecha, e.horaInicio);
    if (!start) {
      eventosFuturos.push(e);
      return;
    }

    if (start < now) {
      eventosPasados.push(e);
    } else {
      eventosFuturos.push(e);
    }
  });

  // Aplicar filtro de fecha dinámicamente
  const eventosFuturosFiltrados = dateFilter
    ? eventosFuturos.filter(e => {
      const sessionDate = new Date(e.fecha);
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      return sessionDate >= startDate && sessionDate <= endDate;
    })
    : eventosFuturos;

  const eventosPasadosFiltrados = dateFilter
    ? eventosPasados.filter(e => {
      const sessionDate = new Date(e.fecha);
      const startDate = new Date(dateFilter.startDate);
      const endDate = new Date(dateFilter.endDate);
      return sessionDate >= startDate && sessionDate <= endDate;
    })
    : eventosPasados;
  const selectedTeam = equipos.find(e => e.seleccionado === true);
  const visibleSessions = tab === 'futuros' ? eventosFuturosFiltrados : eventosPasadosFiltrados;
  const visibleSessionIds = visibleSessions.map((s) => s._id).filter(Boolean);
  const selectedCount = selectedSessionIds.size;
  const allVisibleSelected = visibleSessionIds.length > 0 && visibleSessionIds.every((id) => selectedSessionIds.has(id));

  useEffect(() => {
    setSelectionMode(false);
    setSelectedSessionIds(new Set());
  }, [tab, dateFilter]);

  function toggleSessionSelection(id) {
    if (!id) return;
    setSelectionMode(true);
    setSelectedSessionIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }

  function handleSelectAllVisible() {
    setSelectedSessionIds(allVisibleSelected ? new Set() : new Set(visibleSessionIds));
    setSelectionMode(!allVisibleSelected && visibleSessionIds.length > 0);
  }

  function handleCancelSelection() {
    setSelectionMode(false);
    setSelectedSessionIds(new Set());
  }

  function handleBulkDeleteSessions() {
    if (selectedSessionIds.size === 0) return;
    Alert.alert(
      t('session.bulkDeleteTitle'),
      t('session.bulkDeleteMessage', { count: selectedSessionIds.size }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsBulkDeleting(true);
              await Promise.all([...selectedSessionIds].map((id) => dispatch(deleteEntrenamiento(id)).unwrap()));
              if (selectedTeam?._id) dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id }));
              handleCancelSelection();
              Alert.alert(t('message.success'), t('session.bulkDeleteSuccess', { count: selectedSessionIds.size }));
            } catch {
              Alert.alert(t('message.error'), t('session.bulkDeleteError'));
            } finally {
              setIsBulkDeleting(false);
            }
          },
        },
      ]
    );
  }

  if (!selectedTeam && loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={theme.colors.primary} size="large" style={{ marginTop: 32 }} />
        <Text style={styles.emptyText}>{t('session.loadingTeam')}</Text>
      </View>
    );
  }
  if (!selectedTeam && !loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.colors.background }]}>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 36, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6, maxWidth: 400, width: '100%' }}>
          <Ionicons name="people-circle-outline" size={64} color={theme.colors.border} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: 18, textAlign: 'center' }}>{t('injury.noTeam')}</Text>
          <Text style={{ fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 21 }}>{t('injury.noTeamSubtitle')}</Text>
        </View>
      </View>
    );
  }

  function renderSession(session, type) {
    const isPast = type === 'pasado';
    const isSelected = selectedSessionIds.has(session._id);
    const sessionDate = new Date(session.fecha);
    const formattedDate = formatFechaSesion(session.fecha, session.horaInicio, session.horaFin, t);

    // Día del mes y día de la semana
    const dayNumber = sessionDate.getDate();
    const dayName = sessionDate.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', { weekday: 'short' }).toUpperCase();
    const monthName = sessionDate.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', { month: 'short' }).toUpperCase();

    // Obtener nombres de jugadores
    const jugadoresSesion = (session.jugadores || []).map(jid => {
      const jugador = jugadoresDisponibles.find(j => j._id === (typeof jid === 'string' ? jid : jid._id));
      return jugador ? getPlayerFullName(jugador) : null;
    }).filter(Boolean);

    // Obtener jugadores extras
    const jugadoresExtrasSesion = session.jugadoresExtras || [];

    // Total de jugadores
    const totalJugadores = jugadoresSesion.length + jugadoresExtrasSesion.length;

    // Calcular duración
    const calcDuration = () => {
      if (!session.horaInicio || !session.horaFin) return null;
      const [h1, m1] = session.horaInicio.split(':').map(Number);
      const [h2, m2] = session.horaFin.split(':').map(Number);
      const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (totalMinutes <= 0) return null;
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
      if (hours > 0) return `${hours}h`;
      return `${mins}m`;
    };
    const duration = calcDuration();
    const hasPdf = Boolean(session.pdf?.key);
    const taskCount = (session.ejercicios?.length || 0) + (session.tareasPersonalizadas?.length || 0) + (session.ejerciciosFuerza?.length || 0);
    const hasStructuredData = taskCount > 0 || totalJugadores > 0;

    return (
      <TouchableOpacity
        key={session._id}
        style={[
          styles.proSessionCard,
          isPast ? styles.proSessionCardPast : styles.proSessionCardFuture,
          isSelected && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft }
        ]}
        onPress={() => selectionMode ? toggleSessionSelection(session._id) : handleSessionPress(session)}
        onLongPress={() => canMutate !== false && toggleSessionSelection(session._id)}
        activeOpacity={0.85}
      >
        {/* Indicador lateral de estado */}
        <View style={[styles.proSessionIndicator, isPast ? styles.proSessionIndicatorPast : styles.proSessionIndicatorFuture]} />

        {/* Contenido principal */}
        <View style={styles.proSessionContent}>
          {selectionMode && (
            <View style={[styles.bulkSelectBox, { borderColor: isSelected ? theme.colors.primary : theme.colors.border, backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface }]}>
              {isSelected && <MaterialIcons name="check" size={16} color={theme.colors.onPrimary} />}
            </View>
          )}
          {/* Fecha destacada */}
          <View style={[styles.proDateBadge, isPast ? styles.proDateBadgePast : styles.proDateBadgeFuture]}>
            <Text style={[styles.proDateDay, isPast && styles.proDateDayPast]}>{dayNumber}</Text>
            <Text style={[styles.proDateMonth, isPast && styles.proDateMonthPast]}>{monthName}</Text>
            <Text style={[styles.proDateWeekday, isPast && styles.proDateWeekdayPast]}>{dayName}</Text>
          </View>

          {/* Información de la sesión */}
          <View style={styles.proSessionInfo}>
            {/* Header con hora y duración */}
            <View style={styles.proSessionHeader}>
              <View style={styles.proTimeContainer}>
                <MaterialIcons name="schedule" size={16} color={isPast ? theme.colors.textSecondary : theme.colors.primary} />
                <Text style={[styles.proTimeText, isPast && styles.proTimeTextPast]}>
                  {session.horaInicio} - {session.horaFin}
                </Text>
              </View>
              {duration && (
                <View style={[styles.proDurationBadge, isPast && styles.proDurationBadgePast]}>
                  <Text style={[styles.proDurationText, isPast && styles.proDurationTextPast]}>{duration}</Text>
                </View>
              )}
            </View>

            {/* Stats row */}
            {(!hasPdf || hasStructuredData) && <View style={styles.proStatsRow}>
              {/* Ejercicios */}
              <View style={styles.proStatItem}>
                <View style={[styles.proStatIcon, { backgroundColor: theme.colors.warningSoft || '#fef3c7' }]}>
                  <MaterialIcons name="fitness-center" size={14} color={theme.colors.warning || '#d97706'} />
                </View>
                <Text style={styles.proStatValue}>
                  {taskCount}
                </Text>
                <Text style={styles.proStatLabel}>{t('session.exercises')}</Text>
              </View>

              {/* Jugadores */}
              <View style={styles.proStatItem}>
                <View style={[styles.proStatIcon, { backgroundColor: theme.colors.primarySoft || '#dbeafe' }]}>
                  <Ionicons name="people" size={14} color={theme.colors.primary} />
                </View>
                <Text style={styles.proStatValue}>{totalJugadores}</Text>
                <Text style={styles.proStatLabel}>{t('session.players')}</Text>
              </View>

              {/* Extras si hay */}
              {jugadoresExtrasSesion.length > 0 && (
                <View style={styles.proStatItem}>
                  <View style={[styles.proStatIcon, { backgroundColor: '#f3e8ff' }]}>
                    <MaterialIcons name="person-add" size={14} color="#9333ea" />
                  </View>
                  <Text style={styles.proStatValue}>{jugadoresExtrasSesion.length}</Text>
                  <Text style={styles.proStatLabel}>{t('session.extrasLabel')}</Text>
                </View>
              )}
            </View>}

            {/* Preview de ejercicios */}
            {!hasPdf && session.ejercicios && session.ejercicios.length > 0 && (
              <View style={styles.proExercisePreview}>
                {session.ejercicios.slice(0, 4).map((ejercicioId, index) => {
                  const ejercicio = ejerciciosDisponibles.find(e => e._id === ejercicioId);
                  return (
                    <View key={`${ejercicioId}-${index}`} style={[styles.proExerciseMini, { zIndex: 4 - index, marginLeft: index > 0 ? -8 : 0 }]}>
                      {getContentImage(ejercicio) ? (
                        <Image
                          source={{
                            uri: normalizeImageSource(getContentImage(ejercicio), { cacheBust: true })
                          }}
                          style={styles.proExerciseMiniImage}
                        />
                      ) : (
                        <View style={styles.proExerciseMiniPlaceholder}>
                          <MaterialIcons name="fitness-center" size={12} color="#64748b" />
                        </View>
                      )}
                    </View>
                  );
                })}
                {session.ejercicios.length > 4 && (
                  <View style={[styles.proMoreBadge, { marginLeft: -8 }]}>
                    <Text style={styles.proMoreText}>+{session.ejercicios.length - 4}</Text>
                  </View>
                )}
              </View>
            )}
            {hasPdf && (
              <View style={styles.proPdfOnlyPreview}>
                <MaterialIcons name="picture-as-pdf" size={22} color="#d32f2f" />
                <View style={styles.proPdfOnlyText}>
                  <Text style={styles.proPdfOnlyTitle}>{t('session.pdfSectionTitle', 'Sesión personalizada')}</Text>
                  <Text style={styles.proPdfOnlyName} numberOfLines={1}>{session.pdf.originalName || t('session.pdfFile', 'Documento PDF')}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.proHeader, { paddingTop: Math.max(insets.top, 10) + 2, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.proHeaderTop}>
          {selectedTeam?.nombre ? (
            <View style={[styles.proHeaderTeamPill, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.border }]}>
              <MaterialIcons name="groups" size={18} color={theme.colors.primary} />
              <Text style={[styles.proHeaderTeamPillText, { color: theme.colors.primary }]} numberOfLines={1}>{selectedTeam.nombre}</Text>
            </View>
          ) : <View style={styles.proHeaderTeamPillSpacer} />}
          {canMutate !== false && (
            <View style={styles.proHeaderActions}>
              <TouchableOpacity
                style={[styles.proUploadButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}
                onPress={() => openPdfUpload()}
                activeOpacity={0.85}
                accessibilityLabel={t('session.uploadPdf', 'Subir PDF')}
              >
                <MaterialIcons name="upload-file" size={20} color={theme.colors.primary} />
                {!isMobile && <Text style={[styles.proUploadButtonText, { color: theme.colors.primary }]}>{t('session.uploadPdf', 'Subir PDF')}</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.proCreateButton, { backgroundColor: theme.colors.primary }]}
                onPress={openCrearModal}
                activeOpacity={0.85}
              >
                <MaterialIcons name="add" size={22} color={theme.colors.onPrimary} />
                {!isMobile && <Text style={[styles.proCreateButtonText, { color: theme.colors.onPrimary }]}>{t('session.new')}</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs mejorados */}
        <View style={styles.proTabsContainer}>
          <View style={[styles.proTabs, { backgroundColor: theme.mode === 'dark' ? theme.colors.surfaceAlt : theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.proTab, tab === 'futuros' && [styles.proTabActive, { backgroundColor: theme.colors.surface }]]}
              onPress={() => setTab('futuros')}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name="upcoming"
                size={18}
                color={tab === 'futuros' ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={[styles.proTabText, tab === 'futuros' && [styles.proTabTextActive, { color: theme.colors.primary }]]}>
                {t('session.upcoming')}
              </Text>
              {eventosFuturosFiltrados.length > 0 && (
                <View style={[styles.proTabBadge, { backgroundColor: theme.mode === 'dark' ? theme.colors.border : theme.colors.surface }, tab === 'futuros' && [styles.proTabBadgeActive, { backgroundColor: theme.colors.primarySoft }]]}>
                  <Text style={[styles.proTabBadgeText, { color: theme.colors.textSecondary }, tab === 'futuros' && [styles.proTabBadgeTextActive, { color: theme.colors.primary }]]}>
                    {eventosFuturosFiltrados.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.proTab, tab === 'pasados' && [styles.proTabActive, { backgroundColor: theme.colors.surface }]]}
              onPress={() => setTab('pasados')}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name="history"
                size={18}
                color={tab === 'pasados' ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={[styles.proTabText, tab === 'pasados' && [styles.proTabTextActive, { color: theme.colors.primary }]]}>
                {t('session.completed')}
              </Text>
              {eventosPasadosFiltrados.length > 0 && (
                <View style={[styles.proTabBadge, { backgroundColor: theme.mode === 'dark' ? theme.colors.border : theme.colors.surface }, tab === 'pasados' && [styles.proTabBadgeActive, { backgroundColor: theme.colors.primarySoft }]]}>
                  <Text style={[styles.proTabBadgeText, { color: theme.colors.textSecondary }, tab === 'pasados' && [styles.proTabBadgeTextActive, { color: theme.colors.primary }]]}>
                    {eventosPasadosFiltrados.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Barra de filtros */}
      <View style={styles.proFiltersBar}>
        {canMutate !== false && (
          <TouchableOpacity
            style={[styles.proFilterButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setShowOrgModal(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="auto-fix-high" size={18} color={theme.colors.primary} />
            <Text style={[styles.proFilterButtonText, { color: theme.colors.text }]}>{t('session.planTrainings')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.proFilterButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            dateFilter && [styles.proFilterButtonActive, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]
          ]}
          onPress={() => {
            setTempStartDate(dateFilter?.startDate || null);
            setTempEndDate(dateFilter?.endDate || null);
            setDateRangeModalVisible(true);
          }}
        >
          <MaterialIcons
            name="date-range"
            size={18}
            color={dateFilter ? theme.colors.onPrimary : theme.colors.textSecondary}
          />
          <Text style={[
            styles.proFilterButtonText,
            { color: theme.colors.textSecondary },
            dateFilter && [styles.proFilterButtonTextActive, { color: theme.colors.onPrimary }]
          ]}>
            {dateFilter
              ? `${new Date(dateFilter.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${new Date(dateFilter.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
              : t('common.filterByDate')
            }
          </Text>
          {dateFilter && (
            <TouchableOpacity
              style={styles.proClearFilterBtn}
              onPress={() => setDateFilter(null)}
            >
              <MaterialIcons name="close" size={14} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.proContentContainer}>
        {loading ? (
          <View style={styles.proLoadingContainer}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.proLoadingText}>{t('common.loading')}...</Text>
          </View>
        ) : tab === 'futuros' ? (
          eventosFuturosFiltrados.length === 0 ? (
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
              <View style={styles.proEmptyState}>
                <View style={styles.proEmptyIcon}>
                  <MaterialIcons name="event-note" size={48} color={theme.colors.primary} />
                </View>
                <Text style={styles.proEmptyTitle}>{t('session.noUpcomingSessionsTitle')}</Text>
                <Text style={styles.proEmptyText}>
                  {t('session.noUpcomingSessionsSubtitle')}
                </Text>
                {canMutate !== false && (
                  <TouchableOpacity style={styles.proEmptyButton} onPress={openCrearModal}>
                    <MaterialIcons name="add" size={20} color={"white"} />
                    <Text style={styles.proEmptyButtonText}>{t('session.createFirst')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={[...eventosFuturosFiltrados].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))}
              keyExtractor={item => {
                if (item._id) return item._id;
                const fallback = `${item.equipo || 'noeq'}-${item.fecha || 'nofecha'}-${item.horaInicio || ''}-${item.horaFin || ''}`;
                return fallback;
              }}
              renderItem={({ item }) => renderSession(item, 'futuro')}
              contentContainerStyle={styles.proListContent}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
          eventosPasadosFiltrados.length === 0 ? (
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
              <View style={styles.proEmptyState}>
                <View style={styles.proEmptyIconPast}>
                  <MaterialIcons name="history" size={48} color="#94a3b8" />
                </View>
                <Text style={styles.proEmptyTitle}>{t('session.noPastSessionsTitle')}</Text>
                <Text style={styles.proEmptyText}>
                  {t('session.noPastSessionsSubtitle')}
                </Text>
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={[...eventosPasadosFiltrados].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))}
              keyExtractor={item => {
                if (item._id) return item._id;
                const fallback = `${item.equipo || 'noeq'}-${item.fecha || 'nofecha'}-${item.horaInicio || ''}-${item.horaFin || ''}`;
                return fallback;
              }}
              renderItem={({ item }) => renderSession(item, 'pasado')}
              contentContainerStyle={styles.proListContent}
              showsVerticalScrollIndicator={false}
            />
          )
        )}
      </View>

      {selectionMode && canMutate !== false && (
        <View style={[styles.bulkActionBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <View style={styles.bulkActionInfo}>
            <Text style={[styles.bulkActionTitle, { color: theme.colors.text }]}>
              {t('session.selectedTrainings', { count: selectedCount })}
            </Text>
            <TouchableOpacity onPress={handleSelectAllVisible} disabled={visibleSessionIds.length === 0}>
              <Text style={[styles.bulkSelectAllText, { color: theme.colors.primary }]}>
                {allVisibleSelected ? t('session.deselectAll') : t('session.selectAllVisible')}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.bulkDeleteButton, { opacity: selectedCount === 0 || isBulkDeleting ? 0.5 : 1 }]}
            onPress={handleBulkDeleteSessions}
            disabled={selectedCount === 0 || isBulkDeleting}
          >
            {isBulkDeleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="trash-2" size={16} color="#fff" />
            )}
            <Text style={styles.bulkDeleteButtonText}>{t('common.delete')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkCancelButton, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
            onPress={handleCancelSelection}
            disabled={isBulkDeleting}
          >
            <Feather name="x" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de Video - A nivel de componente principal para funcionar desde cualquier modal */}
      <Modal
        visible={showExerciseVideoModal}
        transparent={false}
        animationType="slide"
        onRequestClose={closeExerciseVideoModal}
      >
        <View style={styles.videoModalBg}>
          <View style={styles.videoModalContent}>
            <View style={styles.videoModalHeader}>
              <Text style={styles.videoModalTitle} numberOfLines={1}>
                {exerciseForVideoMain?.nombre || t('exercise.video')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {/* Botón de descarga */}
                {selectedVideoMain && !isGeneratingVideoMain && (
                  <TouchableOpacity
                    onPress={handleDownloadVideo}
                    style={styles.videoDownloadBtn}
                    disabled={isDownloadingVideo}
                  >
                    {isDownloadingVideo ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Feather name="download" size={22} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeExerciseVideoModal} style={styles.videoModalCloseBtn}>
                  <Feather name="x" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {isGeneratingVideoMain ? (
              <View style={styles.videoGeneratingContainer}>
                <ActivityIndicator size="large" color={theme.colors.error || '#E91E63'} />
                <Text style={styles.videoGeneratingText}>{t('exercise.generatingVideo')}</Text>
              </View>
            ) : videoUrlMain ? (
              <View style={styles.videoPlayerContainer}>
                <VideoPlayerView url={videoUrlMain} />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <TimeOverlay
        visible={timeOverlayVisible && !['newInicio', 'newFin', 'editInicio', 'editFin'].includes(timeOverlayTarget)}
        onClose={() => { setTimeOverlayVisible(false); setTimeOverlayTarget(null); }}
        initialTime=""
        onConfirm={() => { setTimeOverlayVisible(false); setTimeOverlayTarget(null); }}
        title={t('session.selectHour')}
      />

      {/* Modal de selección de rango de fechas */}
      <Modal
        visible={dateRangeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setDateRangeModalVisible(false);
          setTempStartDate(null);
          setTempEndDate(null);
          setDatePickerVisibleStart(false);
          setDatePickerVisibleEnd(false);
        }}
      >
        <View style={styles.dateRangeModalBg}>
          <View style={[styles.dateRangeModalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
            <View style={[styles.dateRangeModalHeader, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}>
              <Text style={[styles.dateRangeModalTitle, { color: theme.colors.text }]}>{t('session.filterByDateRange')}</Text>
              <TouchableOpacity
                style={[styles.dateRangeModalCloseBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => {
                  setDateRangeModalVisible(false);
                  setTempStartDate(null);
                  setTempEndDate(null);
                  setDatePickerVisibleStart(false);
                  setDatePickerVisibleEnd(false);
                }}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.dateRangeModalBody, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.dateRangeSection}>
                <Text style={[styles.dateRangeSectionTitle, { color: theme.colors.textSecondary }]}>{t('session.selectDates')}</Text>

                <TouchableOpacity
                  style={[styles.createDatePicker, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
                  onPress={() => setDatePickerVisibleStart(true)}
                >
                  <View style={styles.createDatePickerContent}>
                    <MaterialIcons name="calendar-today" size={24} color={theme.colors.primary} />
                    <View style={styles.createDateTextContainer}>
                      <Text style={[styles.createDateLabel, { color: theme.colors.textSecondary }]}>{t('session.startDate')}</Text>
                      <Text style={[styles.createDateValue, { color: theme.colors.text }]}>
                        {tempStartDate
                          ? tempStartDate.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                          : t('session.selectDate')
                        }
                      </Text>
                    </View>
                    <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.textSecondary} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.createDatePicker, { marginTop: 12, backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
                  onPress={() => setDatePickerVisibleEnd(true)}
                >
                  <View style={styles.createDatePickerContent}>
                    <MaterialIcons name="event" size={24} color={theme.colors.primary} />
                    <View style={styles.createDateTextContainer}>
                      <Text style={[styles.createDateLabel, { color: theme.colors.textSecondary }]}>{t('session.endDate')}</Text>
                      <Text style={[styles.createDateValue, { color: theme.colors.text }]}>
                        {tempEndDate
                          ? tempEndDate.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                          : t('session.selectDate')
                        }
                      </Text>
                    </View>
                    <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </View>

              {tempStartDate && tempEndDate && (
                <View style={[styles.dateRangePreview, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
                  <Text style={[styles.dateRangePreviewTitle, { color: theme.colors.primary }]}>{t('session.selectedRange')}</Text>
                  <Text style={[styles.dateRangePreviewText, { color: theme.colors.text }]}>
                    {(() => {
                      const start = new Date(tempStartDate);
                      start.setHours(0, 0, 0, 0);
                      const end = new Date(tempEndDate);
                      end.setHours(0, 0, 0, 0);
                      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
                      return t('session.daysCount', { count: diffDays });
                    })()}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.dateRangeModalFooter, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}>
              <TouchableOpacity
                style={[styles.dateRangeCancelBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => {
                  setDateRangeModalVisible(false);
                  setTempStartDate(null);
                  setTempEndDate(null);
                  setDatePickerVisibleStart(false);
                  setDatePickerVisibleEnd(false);
                }}
              >
                <Text style={[styles.dateRangeCancelText, { color: theme.colors.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              {/* Botón para limpiar filtro de fecha */}
              {dateFilter && (
                <TouchableOpacity
                  style={[styles.dateRangeCancelBtn, { backgroundColor: theme.colors.surface, borderColor: '#ef4444' }]}
                  onPress={() => {
                    setDateFilter(null);
                    setDateRangeModalVisible(false);
                    setTempStartDate(null);
                    setTempEndDate(null);
                    setDatePickerVisibleStart(false);
                    setDatePickerVisibleEnd(false);
                  }}
                >
                  <MaterialIcons name="filter-alt-off" size={18} color={theme.colors.error} style={{ marginRight: 4 }} />
                  <Text style={[styles.dateRangeCancelText, { color: '#ef4444' }]}>{t('session.clearDateFilter')}</Text>
                </TouchableOpacity>
              )}

              {tempStartDate && tempEndDate && (
                <TouchableOpacity
                  style={[styles.dateRangeApplyBtn, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}
                  onPress={() => {
                    // Ajustar fechas para incluir todo el día
                    const startDate = new Date(tempStartDate);
                    startDate.setHours(0, 0, 0, 0); // Inicio del día

                    const endDate = new Date(tempEndDate);
                    endDate.setHours(23, 59, 59, 999); // Fin del día

                    setDateFilter({
                      startDate: startDate,
                      endDate: endDate
                    });
                    setDateRangeModalVisible(false);
                    setTempStartDate(null);
                    setTempEndDate(null);
                    setDatePickerVisibleStart(false);
                    setDatePickerVisibleEnd(false);
                  }}
                >
                  <Text style={styles.dateRangeApplyText}>{t('session.applyFilter')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* DateTimePicker modals */}
            <DateTimePickerModal
              isVisible={datePickerVisibleStart}
              mode="date"
              date={tempStartDate || new Date()}
              onConfirm={(date) => {
                setTempStartDate(date);
                setDatePickerVisibleStart(false);
              }}
              onCancel={() => setDatePickerVisibleStart(false)}
              locale={i18n.language === 'es' ? 'es-ES' : 'en-US'}
              confirmTextIOS={t('common.confirm')}
              cancelTextIOS={t('common.cancel')}
              headerTextIOS={t('session.selectStartDate')}
            />

            <DateTimePickerModal
              isVisible={datePickerVisibleEnd}
              mode="date"
              date={tempEndDate || tempStartDate || new Date()}
              onConfirm={(date) => {
                setTempEndDate(date);
                setDatePickerVisibleEnd(false);
              }}
              onCancel={() => setDatePickerVisibleEnd(false)}
              locale={i18n.language === 'es' ? 'es-ES' : 'en-US'}
              confirmTextIOS={t('common.confirm')}
              cancelTextIOS={t('common.cancel')}
              headerTextIOS={t('session.selectEndDate')}
            />
          </View>
        </View>
      </Modal>

      {/* Modal de menú móvil */}
      <Modal
        visible={mobileMenuVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMobileMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.mobileMenuOverlay}
          activeOpacity={1}
          onPress={() => setMobileMenuVisible(false)}
        >
          <View style={styles.mobileMenuContainer}>
            <View style={styles.mobileMenuContent}>
              {/* Filtros */}
              <TouchableOpacity
                style={styles.mobileMenuItem}
                onPress={() => {
                  setMobileMenuVisible(false);
                  setTempStartDate(dateFilter?.startDate || null);
                  setTempEndDate(dateFilter?.endDate || null);
                  setDateRangeModalVisible(true);
                }}
              >
                <MaterialIcons name="filter-list" size={24} color={theme.colors.primary} />
                <Text style={styles.mobileMenuItemText}>{t('common.filters')}</Text>
                {dateFilter && (
                  <View style={styles.mobileMenuItemBadge}>
                    <Text style={styles.mobileMenuItemBadgeText}>1</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Limpiar filtros - solo visible si hay filtro activo */}
              {dateFilter && (
                <>
                  <View style={styles.mobileMenuDivider} />
                  <TouchableOpacity
                    style={styles.mobileMenuItem}
                    onPress={() => {
                      setDateFilter(null);
                      setMobileMenuVisible(false);
                    }}
                  >
                    <MaterialIcons name="clear" size={24} color={theme.colors.error} />
                    <Text style={[styles.mobileMenuItemText, { color: '#ef4444' }]}>{t('common.clear')} {t('common.filters')}</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.mobileMenuDivider} />

              {canMutate !== false && (
                <TouchableOpacity
                  style={styles.mobileMenuItem}
                  onPress={() => {
                    setMobileMenuVisible(false);
                    setShowOrgModal(true);
                  }}
                >
                  <MaterialIcons name="calendar-today" size={24} color={theme.colors.primary} />
                  <Text style={styles.mobileMenuItemText}>{t('session.planTrainings')}</Text>
                </TouchableOpacity>
              )}

              <View style={styles.mobileMenuDivider} />

              {/* Crear sesión */}
              {canMutate !== false && (
                <TouchableOpacity
                  style={styles.mobileMenuItem}
                  onPress={() => {
                    setMobileMenuVisible(false);
                    openCrearModal();
                  }}
                >
                  <MaterialIcons name="add" size={24} color={theme.colors.primary} />
                  <Text style={styles.mobileMenuItemText}>{t('session.createSession')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* Espacio adicional con fondo blanco para cubrir área segura */}
            <View style={[styles.mobileMenuSafeArea, { height: Math.max(insets.bottom, 16) + 8 }]} />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Organization Modal */}
      <Modal visible={showOrgModal} animationType="slide" transparent>
        <View style={styles.orgModalOverlay}>
          <View style={styles.orgModalContent}>
            <OrganizeSeasonForm
              onSubmit={handleBulkSubmit}
              onCancel={() => setShowOrgModal(false)}
              loading={loadingOrg}
            />
          </View>
        </View>
      </Modal>

      {/* Modal para crear nueva sesión (usa AddEventModal del calendario) */}
      <AddEventModal
        visible={addEventModalVisible}
        onClose={() => setAddEventModalVisible(false)}
        onCreateTrainingSession={handleCreateFromAddEventModal}
        onCreateMatchSheet={() => { }}
        players={jugadoresDisponibles}
        exercises={ejerciciosDisponibles}
        team={equipos.find(e => e.seleccionado === true)}
        matchSheets={matchSheets}
        injuries={injuries}
        defaultEventType="session"
        canMutate={canMutate}
        onCreateExerciseFromSession={handleCreateExerciseFromSession}
      />

      {/* Modal para ver detalles de sesión (igual que en calendario) */}
      <TrainingSessionDetailModal
        visible={detailModalVisible}
        session={selectedSession}
        team={equipos.find(e => e.seleccionado === true)}
        players={jugadoresDisponibles}
        exercises={ejerciciosDisponibles}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedSession(null);
        }}
        onEdit={handleEditSession}
        onDelete={handleDeleteSession}
        onRepeat={canMutate !== false ? handleRepeatSession : undefined}
        onWellnessUpdate={handleWellnessUpdate}
        canMutate={canMutate}
        onViewPdf={openPdfViewer}
        onUploadPdf={openPdfUpload}
      />

      <TrainingSessionPdfUploadModal
        open={pdfUploadVisible}
        session={pdfUploadSession}
        loading={pdfUploading}
        onClose={() => { setPdfUploadVisible(false); setPdfUploadSession(null); }}
        onSubmit={async (payload) => {
          setPdfUploading(true);
          try {
            await handlePdfUpload(payload);
          } finally {
            setPdfUploading(false);
          }
        }}
      />

      <TrainingSessionPdfViewerModal
        open={pdfViewerVisible}
        session={pdfViewerSession}
        onClose={closePdfViewer}
      />

      {/* Modal para editar sesión (igual que en calendario) */}
      <EditSessionModal
        visible={editModalVisible}
        session={selectedSession}
        players={jugadoresDisponibles}
        exercises={ejerciciosDisponibles}
        injuries={injuries}
        onClose={handleCloseEditSession}
        onSave={handleSaveSession}
        canMutate={canMutate}
        onCreateExerciseFromSession={handleCreateExerciseFromSession}
      />

    </View>
  );
}

function getStyles(theme) {
  return StyleSheet.create({
    // --- General containers ---
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      paddingTop: 0,
    },

    // ==========================================
    // NUEVOS ESTILOS PROFESIONALES
    // ==========================================

    // --- Draggable Exercise Item ---
    draggableExerciseItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      shadowColor: '#1e3a5a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    draggableExerciseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    draggableExerciseHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    draggableExerciseNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    draggableExerciseNumberText: {
      color: theme.colors.onPrimary || '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },
    draggableExerciseTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
    },
    draggableExerciseSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    draggableExerciseControls: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    draggableVideoBtnContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.errorSoft || '#fef7f9',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.errorSoft || '#fce4ec',
    },
    draggableVideoBtnInactive: {
      backgroundColor: theme.colors.backgroundAlt,
      borderColor: theme.colors.border,
    },
    draggableControlBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.primarySoft || '#f0f9ff',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.primarySoft || '#bfdbfe',
    },
    draggableControlBtnDisabled: {
      backgroundColor: theme.colors.backgroundAlt,
      borderColor: theme.colors.border,
      opacity: 0.4,
    },
    restTimeContainer: {
      backgroundColor: theme.colors.warningSoft || '#fef3c7',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: '#fde047',
    },
    restTimeLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    restTimeLabelText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#854d0e',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    restTimeInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    restTimeInput: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: '#fbbf24',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
      fontSize: 15,
      color: theme.colors.text,
      fontWeight: '600',
    },
    restTimeUnit: {
      fontSize: 14,
      fontWeight: '700',
      color: '#854d0e',
    },
    draggableObservationInput: {
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.backgroundAlt,
      fontSize: 14,
      color: theme.colors.text,
      minHeight: 80,
      padding: 10,
      verticalAlign: 'top',
    },

    // --- Pro Header ---
    proHeader: {
      backgroundColor: theme.colors.surface,
      paddingBottom: 14,
      marginHorizontal: isMobileDevice() ? 10 : 16,
      marginTop: isMobileDevice() ? 10 : 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    proHeaderTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: isMobileDevice() ? 12 : 16,
      marginBottom: 14,
    },
    proHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    proHeaderTitleSection: {
      flex: 1,
    },
    proHeaderTitle: {
      fontSize: isMobileDevice() ? 22 : 28,
      fontWeight: '800',
      color: theme.colors.text,
      letterSpacing: -0.5,
    },
    proHeaderTeam: {
      fontSize: isMobileDevice() ? 13 : 15,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      marginTop: 4,
    },
    proHeaderTeamPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      minWidth: 0,
      marginRight: 12,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.primarySoft || '#eff6ff',
      borderWidth: 1,
      borderColor: theme.colors.primarySoft || '#bfdbfe',
    },
    proHeaderTeamPillText: {
      flex: 1,
      minWidth: 0,
      color: theme.colors.primary,
      fontSize: isMobileDevice() ? 13 : 14,
      fontWeight: '700',
    },
    proHeaderTeamPillSpacer: {
      flex: 1,
    },
    proCreateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 14,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
      gap: 6,
    },
    proCreateButtonText: {
      color: theme.colors.onPrimary || '#ffffff',
      fontSize: 15,
      fontWeight: '700',
    },
    proUploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 13,
      borderRadius: 14,
      borderWidth: 1,
      gap: 6,
    },
    proUploadButtonText: {
      fontSize: 14,
      fontWeight: '700',
    },

    // --- Pro Stats Cards ---
    proStatsCards: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      gap: 12,
      marginBottom: 20,
    },
    proStatCard: {
      flex: 1,
      backgroundColor: theme.colors.backgroundAlt,
      borderRadius: 16,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    proStatCardFuture: {
      backgroundColor: theme.colors.primarySoft || '#eff6ff',
      borderColor: theme.colors.primarySoft || '#bfdbfe',
    },
    proStatCardPast: {
      backgroundColor: theme.colors.backgroundAlt,
      borderColor: theme.colors.border,
    },
    proStatCardTotal: {
      backgroundColor: theme.colors.warningSoft || '#fefce8',
      borderColor: '#fde047',
    },
    proStatCardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.primarySoft || '#dbeafe',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    proStatCardIconPast: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.backgroundAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    proStatCardIconTotal: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.warningSoft || '#fef3c7',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    proStatCardValue: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    proStatCardValuePast: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.textSecondary,
    },
    proStatCardValueTotal: {
      fontSize: 24,
      fontWeight: '800',
      color: '#d97706',
    },
    proStatCardLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 2,
    },
    proStatCardLabelPast: {
      fontSize: 12,
      fontWeight: '600',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 2,
    },
    proStatCardLabelTotal: {
      fontSize: 12,
      fontWeight: '600',
      color: '#b45309',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 2,
    },

    // --- Pro Tabs ---
    proTabsContainer: {
      paddingHorizontal: 16,
    },
    proTabs: {
      flexDirection: 'row',
      backgroundColor: theme.colors.backgroundAlt,
      borderRadius: 16,
      padding: 4,
    },
    proTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    proTabActive: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.mode === 'dark' ? 'transparent' : theme.colors.borderStrong,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.mode === 'dark' ? 0.2 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    proTabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    proTabTextActive: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    proTabBadge: {
      backgroundColor: theme.colors.border,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 24,
      alignItems: 'center',
    },
    proTabBadgeActive: {
      backgroundColor: theme.colors.primarySoft || '#dbeafe',
    },
    proTabBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    proTabBadgeTextActive: {
      color: theme.colors.primary,
    },

    // --- Pro Filters Bar ---
    proFiltersBar: {
      flexDirection: 'row',
      paddingHorizontal: isMobileDevice() ? 12 : 16,
      paddingVertical: isMobileDevice() ? 10 : 16,
      gap: isMobileDevice() ? 8 : 12,
      flexWrap: 'wrap',
    },
    proFilterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingVertical: isMobileDevice() ? 8 : 10,
      paddingHorizontal: isMobileDevice() ? 12 : 16,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
      flexShrink: 1,
    },
    proFilterButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    proFilterButtonText: {
      fontSize: isMobileDevice() ? 13 : 14,
      fontWeight: '600',
      color: theme.colors.text,
      flexShrink: 1,
    },
    proFilterButtonTextActive: {
      color: theme.colors.onPrimary || '#ffffff',
    },
    proClearFilterBtn: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // --- Pro Content ---
    proContentContainer: {
      flex: 1,
    },
    proLoadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    proLoadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    proListContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 100,
    },

    // --- Pro Empty State ---
    proEmptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      paddingVertical: 60,
    },
    proEmptyIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.primarySoft || '#eff6ff',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    proEmptyIconPast: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.backgroundAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    proEmptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    proEmptyText: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    proEmptyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 14,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    proEmptyButtonText: {
      color: theme.colors.onPrimary || '#ffffff',
      fontSize: 16,
      fontWeight: '700',
    },
    proEmptyIconPast: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    proEmptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1e293b',
      textAlign: 'center',
      marginBottom: 8,
    },
    proEmptyText: {
      fontSize: 15,
      color: '#64748b',
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    proEmptyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#2474E5',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 14,
      gap: 8,
      shadowColor: '#2474E5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    proEmptyButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '700',
    },

    // --- Pro Session Card ---
    proSessionCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.backgroundAlt,
      borderRadius: 20,
      marginBottom: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: '#1e3a5a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6,
    },
    proSessionCardFuture: {
      borderLeftWidth: 0,
    },
    proSessionCardPast: {
      opacity: 0.85,
    },
    proSessionIndicator: {
      width: 5,
    },
    proSessionIndicatorFuture: {
      backgroundColor: theme.colors.primary,
    },
    proSessionIndicatorPast: {
      backgroundColor: theme.colors.border,
    },
    proSessionContent: {
      flex: 1,
      flexDirection: 'row',
      padding: isMobileDevice() ? 12 : 16,
      gap: isMobileDevice() ? 10 : 16,
    },
    bulkSelectBox: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    bulkActionBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 18,
    },
    bulkActionInfo: {
      flex: 1,
      minWidth: 0,
    },
    bulkActionTitle: {
      fontSize: 14,
      fontWeight: '800',
    },
    bulkSelectAllText: {
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },
    bulkDeleteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#dc2626',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    bulkDeleteButtonText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
    },
    bulkCancelButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // --- Pro Date Badge ---
    proDateBadge: {
      width: isMobileDevice() ? 54 : 65,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primarySoft || '#eff6ff',
      borderRadius: 14,
      paddingVertical: isMobileDevice() ? 8 : 12,
    },
    proDateBadgePast: {
      backgroundColor: theme.colors.backgroundAlt,
    },
    proDateBadgeFuture: {
      backgroundColor: theme.colors.primarySoft || '#eff6ff',
    },
    proDateDay: {
      fontSize: isMobileDevice() ? 22 : 28,
      fontWeight: '800',
      color: theme.colors.primary,
      lineHeight: isMobileDevice() ? 26 : 32,
    },
    proDateDayPast: {
      color: theme.colors.textSecondary,
    },
    proDateMonth: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    proDateMonthPast: {
      color: '#94a3b8',
    },
    proDateWeekday: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    proDateWeekdayPast: {
      color: '#94a3b8',
    },

    // --- Pro Session Info ---
    proSessionInfo: {
      flex: 1,
    },
    proSessionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      flexWrap: 'wrap',
      gap: 4,
    },
    proTimeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    proTimeText: {
      fontSize: isMobileDevice() ? 14 : 16,
      fontWeight: '700',
      color: theme.colors.text,
      flexShrink: 1,
    },
    proTimeTextPast: {
      color: theme.colors.textSecondary,
    },
    proDurationBadge: {
      backgroundColor: theme.colors.successSoft || '#f0fdf4',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.successSoft || '#bbf7d0',
    },
    proDurationBadgePast: {
      backgroundColor: theme.colors.backgroundAlt,
      borderColor: theme.colors.border,
    },
    proDurationText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.success,
    },
    proDurationTextPast: {
      color: theme.colors.textSecondary,
    },

    // --- Pro Stats Row ---
    proStatsRow: {
      flexDirection: 'row',
      gap: isMobileDevice() ? 10 : 16,
      marginBottom: 10,
      flexWrap: 'wrap',
    },
    proStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    proStatIcon: {
      width: 26,
      height: 26,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    proStatValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
    proStatLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },

    // --- Pro Exercise Preview ---
    proExercisePreview: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    proPdfOnlyPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.errorSoft || '#fef2f2',
      borderWidth: 1,
      borderColor: theme.colors.error + '40',
    },
    proPdfOnlyText: {
      flex: 1,
      minWidth: 0,
    },
    proPdfOnlyTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.colors.text,
    },
    proPdfOnlyName: {
      marginTop: 2,
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    proExerciseMini: {
      width: 36,
      height: 36,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: theme.colors.surface,
      backgroundColor: theme.colors.backgroundAlt,
    },
    proExerciseMiniImage: {
      width: '100%',
      height: '100%',
    },
    proExerciseMiniPlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.backgroundAlt,
    },
    proMoreBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    proMoreText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },

    // --- Pro Action Button ---
    proActionButton: {
      paddingHorizontal: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ==========================================
    // FIN NUEVOS ESTILOS PROFESIONALES
    // ==========================================
    header: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.colors.text,
      marginBottom: 6,
      letterSpacing: 0.3,
    },
    headerSubtitle: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      lineHeight: 22,
    },
    actionBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    mainActionBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      marginBottom: 20,
    },
    filterSection: {
      alignItems: 'flex-end',
    },
    primarySection: {
      alignItems: 'flex-start',
    },
    primaryButton: {
      backgroundColor: '#2856a2',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      paddingHorizontal: 28,
      borderRadius: 20,
      shadowColor: '#2856a2',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: '#1e40af',
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    secondaryButton: {
      backgroundColor: '#10b981',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 16,
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
      marginTop: 12,
    },
    secondaryButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
      marginLeft: 8,
    },
    // --- Blue Header Container ---
    blueHeaderContainer: {
      backgroundColor: '#2474E5',
      paddingTop: 20,
      paddingBottom: 20,
      paddingHorizontal: 20,
      marginTop: 0,
    },
    blueHeaderTabs: {
      flexDirection: 'row',
      gap: 8,
    },
    blueTab: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#3a8aeb',
    },
    blueTabActive: {
      backgroundColor: '#ffffff',
    },
    blueTabText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#ffffff',
    },
    blueTabTextActive: {
      color: '#2474E5',
      fontWeight: '700',
    },

    // --- Mobile Sub Header ---
    mobileSubHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    mobileSubHeaderTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1e293b',
      flex: 1,
      letterSpacing: 0.2,
    },

    // --- Tablet Actions Bar ---
    tabletActionsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    tabletLeftActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    tabletActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0f9ff',
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#bfdbfe',
      gap: 8,
      shadowColor: '#2474E5',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 1,
    },
    tabletActionButtonText: {
      color: '#1d4ed8',
      fontWeight: '600',
      fontSize: 14,
      letterSpacing: 0.2,
    },
    tabletCreateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#2474E5',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 14,
      shadowColor: '#1e40af',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
      gap: 8,
    },
    tabletCreateButtonText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 15,
      letterSpacing: 0.3,
    },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 12,
      justifyContent: 'space-between',
      gap: 8,
    },
    topBarMobile: {
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 14,
      gap: 8,
      flexWrap: 'wrap',
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#2474E5',
      paddingVertical: Platform.OS === 'ios' ? 10 : 9,
      paddingHorizontal: 18,
      borderRadius: 22,
      shadowColor: '#2856a2',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.16,
      shadowRadius: 8,
      elevation: 3,
    },
    createButtonMobile: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      width: '100%',
      justifyContent: 'center',
    },
    createButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
      letterSpacing: 0.25,
      marginLeft: 6,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: "#eaf2fb",
      borderRadius: 18,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: "#b5d6fa",
      marginRight: 0,
    },
    secondaryButtonMobile: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginRight: 0,
      width: '100%',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      marginLeft: 8,
      color: "#2474E5",
      fontWeight: "bold",
      fontSize: 14,
    },

    // --- Tabs ---
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: '#f8fafc',
      marginHorizontal: 12,
      borderRadius: 16,
      padding: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },

    // --- Mobile Header ---
    mobileHeader: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 12,
    },
    mobileHeaderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    mobileHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    mobileHeaderTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#1e293b',
    },
    switchTabBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#eaf2fb',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
      borderWidth: 1,
      borderColor: '#b5d6fa',
    },
    switchTabText: {
      color: '#2474E5',
      fontSize: 13,
      fontWeight: '600',
    },
    mobileMenuButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#eaf2fb',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#b5d6fa',
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 11,
      backgroundColor: 'transparent',
      marginHorizontal: 2,
    },
    tabActive: {
      backgroundColor: '#3578e5',
      shadowColor: '#3578e5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 1,
      borderColor: '#2563eb',
    },
    tabText: {
      color: '#64748b',
      fontWeight: '600',
      fontSize: 15,
      marginLeft: 6,
      letterSpacing: 0.2,
    },
    tabTextActive: {
      color: '#fff',
      fontWeight: '700',
    },

    // --- Content ---
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 20,
      fontSize: 16,
      color: '#64748b',
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
    },
    emptyStateTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#374151',
      marginTop: 20,
      marginBottom: 10,
      textAlign: 'center',
      letterSpacing: 0.2,
    },
    emptyStateText: {
      fontSize: 15,
      color: '#94a3b8',
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 300,
      letterSpacing: 0.2,
    },
    listContent: {
      paddingBottom: 30,
      paddingTop: 8,
    },

    // --- Session Cards ---
    futureSessionCard: {
      borderLeftWidth: 5,
      borderLeftColor: '#2474E5',
      backgroundColor: '#ffffff',
    },
    pastSessionCard: {
      borderLeftWidth: 5,
      borderLeftColor: '#94a3b8',
      backgroundColor: '#fafbfc',
    },
    sessionDateContainer: {
      flex: 1,
    },
    pastSessionDate: {
      color: '#94a3b8',
    },
    sessionStatusIndicator: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    futureIndicator: {
      backgroundColor: '#2474E5',
    },
    pastIndicator: {
      backgroundColor: '#94a3b8',
    },
    sessionContent: {
      paddingHorizontal: 0,
      paddingBottom: 4,
    },
    sessionInfo: {
      marginBottom: 16,
    },
    sessionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: 8,
      letterSpacing: 0.2,
    },
    sessionExercises: {
      flexDirection: 'column',
      gap: 12,
      marginBottom: 14,
    },
    exercisesCount: {
      fontSize: 14,
      color: '#475569',
      fontWeight: '700',
      marginBottom: 10,
      letterSpacing: 0.2,
    },
    exercisesPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
    },
    exerciseMini: {
      width: 60,
      height: 60,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: '#f8fafc',
      elevation: 3,
      shadowColor: '#1e3a5a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    exerciseMiniImage: {
      width: 52,
      height: 52,
      borderRadius: 10,
      resizeMode: 'cover',
      alignSelf: 'center',
      marginTop: 4,
    },
    exerciseMiniPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f1f5f9',
    },
    exerciseMiniText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#64748b',
    },
    moreExercisesBadge: {
      width: 52,
      height: 52,
      borderRadius: 12,
      backgroundColor: '#2856a2',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 6,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    moreExercisesText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#fff',
    },
    sessionCardActions: {
      flexDirection: 'row',
      gap: 8,
      alignSelf: 'flex-end',
    },
    cardActionBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    sessionPlayers: {
      marginTop: 12,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
    },
    playersHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    playersCount: {
      fontSize: 13,
      fontWeight: '600',
      color: '#64748b',
    },
    playersNames: {
      fontSize: 13,
      color: '#475569',
      lineHeight: 20,
    },
    playersList: {
      marginTop: 6,
      gap: 6,
    },
    playersLabel: {
      fontSize: 13,
      color: '#64748b',
      fontWeight: '600',
    },
    cardActionBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#f8fafc',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },

    // --- Modals ---
    modalBg: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContentUnused: {
      backgroundColor: '#fff',
      borderRadius: 20,
      width: '95%',
      maxWidth: 500,
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    modalContentTablet: {
      backgroundColor: '#fff',
      borderRadius: 20,
      width: '80%',
      maxWidth: 700,
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    modalHeaderUnused: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    modalHeaderContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    modalTitleUnused: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1e293b',
      marginLeft: 12,
    },
    modalBodyUnused: {
      padding: 20,
    },
    formSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: 16,
    },
    formRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    formField: {
      flex: 1,
    },
    label: {
      fontWeight: '600',
      marginBottom: 8,
      color: '#374151',
      fontSize: 15,
    },
    inputBox: {
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      backgroundColor: '#f9fafb',
      fontSize: 16,
      color: '#111827',
    },
    timeSelectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f1f5f9',
      padding: 14,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    timeSelectText: {
      color: '#2856a2',
      fontWeight: '600',
      fontSize: 16,
      marginLeft: 8,
    },
    dateBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f1f5f9',
      padding: 14,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    dateText: {
      color: '#2856a2',
      fontWeight: '600',
      fontSize: 16,
      marginLeft: 8,
    },
    selectedExercisesList: {
      marginTop: 16,
    },
    selectedExercisesTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#374151',
      marginBottom: 12,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      paddingHorizontal: isMobileDevice() ? 16 : 24,
      paddingBottom: isMobileDevice() ? 16 : 24,
    },
    secondaryButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: '#f1f5f9',
      borderWidth: 1,
      borderColor: '#d1d5db',
    },
    secondaryButtonText: {
      color: '#374151',
      fontSize: 16,
      fontWeight: '600',
    },
    dangerButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: '#dc2626',
    },
    dangerButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },

    // --- Ejercicios Vista ---
    ejerciciosVistaContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, width: '100%' },
    ejercicioVista: { alignItems: 'center', marginRight: 8, width: 72, marginBottom: 8 },
    ejercicioImgVistaPlaceholder: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#eee', marginBottom: 4 },
    ejercicioNombreVista: { fontSize: 10, textAlign: 'center', color: '#444' },

    // --- Vista completa sesión ---
    fullBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.22)', justifyContent: 'center', alignItems: 'center', padding: 5 },
    fullContent: {
      backgroundColor: '#fff',
      borderRadius: 24,
      padding: Platform.OS === 'ios' ? 8 : 4,
      width: '98%',
      maxHeight: '98%',
      alignSelf: 'center'
    },
    fullTitle: { fontSize: 19, fontWeight: 'bold', color: '#2856a2', marginBottom: 8, textAlign: 'center' },
    fullLabel: { fontWeight: '600', color: '#2856a2', marginTop: 8, fontSize: 14 },
    fullValor: { color: '#3c4c6a', fontSize: 14, marginTop: 2 },
    fullCloseBtn: { backgroundColor: '#e4eaf4', borderRadius: 19, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    fullCloseTxt: { fontSize: 24, color: '#2856a2', marginTop: -3 },
    fullEditBtn: { backgroundColor: '#2856a2', borderRadius: 19, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', height: 34, marginLeft: 6 },
    fullEditTxt: { color: '#fff', fontWeight: '600', fontSize: 14 },

    // --- Modal opciones long-press ---
    lpBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
    lpContent: { backgroundColor: '#fff', borderRadius: 16, padding: 12, width: '90%', alignItems: 'center' },
    lpTitle: { fontSize: 15, fontWeight: 'bold', color: '#2856a2', marginBottom: 10 },
    lpBtn: { backgroundColor: '#e4eaf4', borderRadius: 13, paddingVertical: 10, paddingHorizontal: 22, marginTop: 8, width: '95%', alignItems: 'center' },
    lpBtnText: { color: '#2856a2', fontWeight: 'bold', fontSize: 14 },

    // --- Summary Chip ---
    summaryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#eef5ff',
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 10,
      marginTop: 4,
      width: '95%'
    },
    summaryThumbsRow: { flexDirection: 'row', alignItems: 'center' },
    thumbWrapper: { width: 44, height: 44, borderRadius: 13, overflow: 'hidden', marginRight: 3, backgroundColor: '#d7e3f2' },
    thumbPlaceholder: { flex: 1, backgroundColor: '#cbd6e2' },
    moreMini: { width: 44, height: 44, borderRadius: 13, backgroundColor: '#2856a2', alignItems: 'center', justifyContent: 'center' },
    moreMiniText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    placeholderText: { fontSize: 17, color: '#2856a2', fontWeight: '700', width: 28, textAlign: 'center' },
    summaryLabel: { marginLeft: 6, fontWeight: '600', color: '#2856a2', fontSize: 12 },

    /* --- Selector Full Screen --- */
    selectorFSBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectorCardFull: {
      flex: 1,
      width: '100%',
      backgroundColor: '#ffffff',
      borderRadius: 0,
      padding: Platform.OS === 'ios' ? 8 : 4
    },
    selectorTopBarFS: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4
    },
    selectorTitleFS: { fontSize: 17, fontWeight: '800', color: '#183047' },
    closeBtnFS: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: '#eef3f9', alignItems: 'center', justifyContent: 'center'
    },
    closeBtnTxt: { fontSize: 24, color: '#183047', marginTop: -5 },

    modeRowFS: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    modeSwitch: { flexDirection: 'row', backgroundColor: '#e6edf5', borderRadius: 12, overflow: 'hidden' },
    modeBtn: { paddingVertical: 6, paddingHorizontal: 10 },
    modeBtnActive: { backgroundColor: '#2856a2' },
    modeBtnText: { color: '#2856a2', fontWeight: '600', fontSize: 11 },
    modeBtnTextActive: { color: '#fff' },

    metaInfoFS: { marginTop: 4, fontSize: 10, color: '#5b6b7a', fontWeight: '600' },

    flexFill: { flex: 1 },

    selectedPanelFS: {
      backgroundColor: '#f5f9fe',
      borderRadius: 14,
      padding: 7,
      borderWidth: 1,
      borderColor: '#dce6f1'
    },
    selectedPanelTitle: { fontSize: 10, fontWeight: '700', color: '#27456b', marginBottom: 5 },
    selectedEmpty: { fontSize: 10, color: '#7a8b9b', textAlign: 'center', marginTop: 10 },

    mainAreaFS: {
      backgroundColor: '#ffffff',
      borderRadius: 20,
      padding: 16,
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },

    gridPageWrap: { flex: 1 },
    gridWrapper: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8, minHeight: 180, paddingHorizontal: 4 },
    exerciseCard: {
      width: Dimensions.get('window').width < 430 ? '47%' : '30%',
      backgroundColor: '#ffffff',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      marginBottom: 14,
      padding: 10,
      alignItems: 'center',
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
    },
    exerciseCardSel: { backgroundColor: '#eff6ff', borderColor: '#2474E5', borderWidth: 2 },
    exerciseImgPlaceholder: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', marginBottom: 8 },
    exerciseName: { fontSize: 11, fontWeight: '600', textAlign: 'center', color: '#1e293b', minHeight: 22, paddingHorizontal: 4 },
    exerciseNameSel: { color: '#1e40af', fontWeight: '700' },
    checkBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      backgroundColor: '#2474E5',
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#2474E5',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 3,
      elevation: 3,
    },
    checkBadgeTxt: { color: '#ffffff', fontSize: 11, fontWeight: '700' },

    // Badge de video en tarjeta de ejercicio
    exerciseVideoBadge: {
      position: 'absolute',
      top: 6,
      left: 6,
      backgroundColor: '#E91E63',
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      shadowColor: '#E91E63',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 3,
      elevation: 3,
    },
    exerciseVideoBadgeInactive: {
      backgroundColor: '#94a3b8',
      shadowColor: '#94a3b8',
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
    videoDownloadBtn: {
      padding: 4,
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

    emptyGrid: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
    emptyGridTxt: { fontWeight: '600', color: '#64748b', fontSize: 14 },

    categoriesWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0f9ff',
      borderRadius: 16,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: '#bfdbfe',
    },
    categoryChipText: { fontSize: 12, fontWeight: '700', color: '#1e40af', maxWidth: 80 },
    categoryChipCount: {
      marginLeft: 8,
      fontSize: 11,
      color: '#2474E5',
      backgroundColor: '#dbeafe',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      fontWeight: '700'
    },
    backCatBtn: {
      backgroundColor: '#f0f9ff',
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#bfdbfe',
    },
    backCatTxt: { color: '#2474E5', fontWeight: '700', fontSize: 12 },

    paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, backgroundColor: '#fff' },
    navBtn: {
      backgroundColor: '#f1f5f9',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    navBtnDisabled: { opacity: 0.35 },
    navBtnText: { fontSize: 14, color: '#1e293b', fontWeight: '700' },
    dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1' },
    dotActive: { backgroundColor: '#2474E5', width: 16 },

    footerRowFS: {
      marginTop: 12,
      alignItems: 'flex-end'
    },
    doneBtnFS: {
      backgroundColor: '#2474E5',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 14,
      shadowColor: '#2474E5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    doneBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

    // ============ ESTILOS MÓVIL PARA SELECTOR DE JUGADORES ============
    selectedPanelMobile: {
      backgroundColor: '#f0f9ff',
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#3578e530',
    },
    selectedPanelTitleMobile: {
      fontSize: 12,
      fontWeight: '600',
      color: '#3578e5',
      marginBottom: 8,
    },
    selectedChipMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#3578e5',
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 12,
      gap: 6,
    },
    selectedChipTextMobile: {
      fontSize: 12,
      color: '#fff',
      fontWeight: '500',
      maxWidth: 100,
    },
    selectedChipRemoveMobile: {
      fontSize: 16,
      color: '#fff',
      fontWeight: '600',
    },
    playerRowMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      gap: 10,
    },
    playerRowMobileSelected: {
      backgroundColor: '#eff6ff',
      borderColor: '#3578e5',
    },
    playerCheckMobile: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#e2e8f0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    playerCheckMobileSelected: {
      backgroundColor: '#3578e5',
      borderColor: '#3578e5',
    },
    playerAvatarMobile: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    playerNameMobile: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1e293b',
    },
    playerNameMobileSelected: {
      color: '#3578e5',
    },
    playerPositionMobile: {
      fontSize: 12,
      color: '#64748b',
      marginTop: 2,
    },
    statusBadgeMobile: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusTextMobile: {
      fontSize: 10,
      color: '#fff',
      fontWeight: '600',
    },
    // ============ FIN ESTILOS MÓVIL SELECTOR ============

    /* --- Hora overlay --- */
    timeOverlayBg: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    timeOverlayContent: {
      backgroundColor: '#ffffff',
      width: '90%',
      maxWidth: 400,
      borderRadius: 24,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 25,
      elevation: 15,
    },
    timeOverlayTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 20,
      color: '#1e293b',
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    timeColumns: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    timeColumn: { flex: 1 },
    timeColumnLabel: {
      fontWeight: '700',
      marginBottom: 12,
      textAlign: 'center',
      color: '#64748b',
      fontSize: 13,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    timeItem: {
      paddingVertical: 12,
      marginVertical: 3,
      marginHorizontal: 2,
      borderRadius: 12,
      backgroundColor: '#f1f5f9',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
    },
    timeItemSelected: {
      backgroundColor: '#2474E5',
      borderColor: '#2474E5',
      shadowColor: '#2474E5',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    timeItemText: { fontSize: 15, color: '#475569', fontWeight: '600' },
    timeItemTextSel: { color: '#ffffff', fontWeight: '700' },
    timeHint: { marginTop: 16, fontSize: 12, color: '#64748b', textAlign: 'center' },
    timeButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 },
    timeBtn: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 14,
      minWidth: 100,
      alignItems: 'center',
    },
    timeCancel: {
      backgroundColor: '#929292ff',
      borderWidth: 1.5,
      borderColor: '#929292ff',
    },
    timeOk: {
      backgroundColor: '#2474E5',
      shadowColor: '#2474E5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    timeBtnText: { color: '#ffffffff', fontWeight: '700', fontSize: 15 },
    errorText: { color: '#dc2626', fontSize: 12, marginBottom: 4, fontWeight: '500' },
    dateBox: {
      backgroundColor: '#f0f9ff',
      padding: 12,
      borderRadius: 12,
      width: 120,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#bfdbfe',
    },
    timeSelectBtn: {
      backgroundColor: '#f0f9ff',
      padding: 12,
      borderRadius: 12,
      marginBottom: 4,
      width: 120,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#bfdbfe',
    },
    timeSelectText: { color: '#2474E5', fontWeight: '700', fontSize: 15 },
    // Fila principal
    ejercicioFila: {
      backgroundColor: '#fff',
      marginVertical: 8,
      borderRadius: 12,
      elevation: 3,
      padding: 12,
      alignItems: 'center',
      flexWrap: 'wrap',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    // NOTE: Mobile/Tablet specific styles removed - now handled by shared modals
    // Imagen
    ejercicioImgContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    ejercicioDesc: {
      marginVertical: 2,
      fontSize: 14,
      color: "#374151",
      lineHeight: 18,
    },
    label: {
      fontWeight: 'bold',
    },
    emptyInner: {
      textAlign: 'center',
      color: '#888',
      fontSize: 18,
      marginTop: 20,
    },
    // Modal
    modalBackground: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBg: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: '#ffffff',
      borderRadius: 20,
      width: '95%',
      maxWidth: 500,
      maxHeight: '90%',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      backgroundColor: '#f8fafc',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1f2937',
    },
    modalCloseBtn: {
      padding: 8,
      borderRadius: 8,
      // backgroundColor: '#f1f5f9',
    },
    modalBody: {
      padding: 20,
    },
    sessionDetailCard: {
      backgroundColor: '#f8fafc',
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#e5e7eb',
    },
    sessionDetailHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sessionDetailTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1f2937',
      flex: 1,
    },
    detailSection: {
      marginBottom: 24,
    },
    detailSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#374151',
      marginBottom: 12,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      gap: 12,
    },
    detailLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: '#6b7280',
      minWidth: 80,
    },
    detailValue: {
      fontSize: 14,
      color: '#1f2937',
      flex: 1,
    },
    detailPlayersRow: {
      paddingLeft: 32,
      paddingVertical: 8,
    },
    detailPlayersLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: '#6b7280',
      marginBottom: 4,
    },
    detailPlayersText: {
      fontSize: 14,
      color: '#1f2937',
      lineHeight: 20,
    },
    // NOTE: Wellness and Pre-Wellness styles removed - now in TrainingSessionDetailModal
    // NOTE: longPress modal styles removed - now using shared modals
    fullImage: {
      width: '95%',
      height: '80%',
      resizeMode: 'contain',
      borderRadius: 20,
      backgroundColor: 'transparent',
      display: "flex",
      justifyContent: "center",
      alignContent: "center",
      marginLeft: 5
    },
    closeModalBtn: {
      position: 'absolute',
      top: 20,
      right: 20,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(30, 41, 59, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    closeModalTxt: {
      color: '#ffffff',
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: -1,
    },

    // --- Filtros avanzados ---
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      gap: 10,
    },
    filterButtonContainer: {
      position: 'relative',
      marginRight: 8,
    },
    filterToggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ffffff',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    filterToggleText: {
      color: '#2474E5',
      fontSize: 14,
      fontWeight: '700',
      marginLeft: 8,
    },
    filterBadge: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: '#ef4444',
      borderRadius: 12,
      minWidth: 22,
      height: 22,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#ffffff',
    },
    filterBadgeText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    filtersPanel: {
      backgroundColor: '#ffffff',
      borderRadius: 16,
      padding: 20,
      marginTop: 12,
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    filtersHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    filtersTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: '#1e293b',
      letterSpacing: -0.2,
    },
    clearFiltersBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#ef4444',
      borderRadius: 10,
      shadowColor: '#ef4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    clearFiltersText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    filtersGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    filterField: {
      flex: 1,
      minWidth: 150,
    },
    filterLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: '#475569',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    filterInput: {
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: '#ffffff',
      fontSize: 15,
      color: '#1e293b',
    },
    searchInput: {
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: '#ffffff',
      fontSize: 15,
      color: '#1e293b',
      minHeight: 44,
    },

    // --- Custom Dropdown ---
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: '#ffffff',
      minHeight: 48,
    },
    dropdownText: {
      fontSize: 15,
      color: '#1e293b',
      flex: 1,
      fontWeight: '500',
    },
    dropdownPlaceholder: {
      color: '#94a3b8',
      fontWeight: '400',
    },
    dropdownModalBg: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    dropdownModalContent: {
      backgroundColor: '#ffffff',
      borderRadius: 20,
      width: '100%',
      maxWidth: 340,
      maxHeight: '70%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 15,
      overflow: 'hidden',
    },
    dropdownModalTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: '#1e293b',
      textAlign: 'center',
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      backgroundColor: '#f8fafc',
      letterSpacing: -0.2,
    },
    dropdownOptionsList: {
      maxHeight: 320,
    },
    dropdownOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
    },
    dropdownOptionSelected: {
      backgroundColor: '#eff6ff',
    },
    dropdownOptionText: {
      fontSize: 16,
      color: '#374151',
      flex: 1,
      fontWeight: '500',
    },
    dropdownOptionTextSelected: {
      color: '#2474E5',
      fontWeight: '700',
    },

    // --- Modal Crear Sesión Profesional ---
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    createModalContainer: {
      backgroundColor: '#ffffff',
      borderRadius: 24,
      width: '95%',
      maxWidth: 520,
      maxHeight: '92%',
      flex: 1,
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 25 },
      shadowOpacity: 0.3,
      shadowRadius: 30,
      elevation: 30,
    },
    createModalContainerMobile: {
      width: '100%',
      maxWidth: '100%',
      maxHeight: '100%',
      borderRadius: 0,
      margin: 0,
    },
    createModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      backgroundColor: '#ffffff',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    createModalHeaderMobile: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 54 : 16,
      paddingBottom: 14,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    },
    createModalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      flex: 1,
    },
    createModalHeaderLeftMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    createModalIconContainer: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: '#eff6ff',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#dbeafe',
    },
    createModalIconContainerMobile: {
      width: 44,
      height: 44,
      borderRadius: 14,
    },
    createModalTitle: {
      fontSize: 21,
      fontWeight: '700',
      color: '#1e293b',
      letterSpacing: 0.2,
    },
    createModalTitleMobile: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1e293b',
      letterSpacing: 0.2,
    },
    createModalSubtitle: {
      fontSize: 14,
      color: '#64748b',
      marginTop: 3,
    },
    createModalSubtitleMobile: {
      fontSize: 13,
      color: '#64748b',
      marginTop: 2,
    },
    createModalCloseBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    createModalBody: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    createModalBodyMobile: {
      flex: 1,
      paddingBottom: Platform.OS === 'ios' ? 24 : 0,
    },
    createModalContent: {
      padding: 24,
    },
    createModalContentMobile: {
      padding: 14,
    },
    createCard: {
      backgroundColor: '#ffffff',
      borderRadius: 18,
      padding: 20,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    createCardMobile: {
      backgroundColor: '#ffffff',
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    createCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 12,
    },
    createCardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1e293b',
      flex: 1,
    },
    createCardContent: {
      gap: 16,
    },
    createFieldGroup: {
      gap: 8,
    },
    createFieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#374151',
    },
    createDatePicker: {
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderRadius: 12,
      backgroundColor: '#fff',
      padding: 16,
    },
    createDatePickerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    createDateTextContainer: {
      flex: 1,
    },
    createDateLabel: {
      fontSize: 12,
      color: '#64748b',
      marginBottom: 2,
    },
    createDateValue: {
      fontSize: 16,
      color: '#1e293b',
      fontWeight: '500',
    },
    createTimeContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    createTimeField: {
      flex: 1,
      gap: 8,
    },
    createTimePicker: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderRadius: 12,
      backgroundColor: '#fff',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    createTimePickerMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderRadius: 12,
      backgroundColor: '#fff',
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    createTimePickerError: {
      borderColor: '#ef4444',
    },
    createTimeText: {
      fontSize: 16,
      color: '#1e293b',
      fontWeight: '500',
      flex: 1,
    },
    createErrorText: {
      fontSize: 12,
      color: '#ef4444',
      fontWeight: '500',
    },
    createExerciseSelector: {
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderRadius: 12,
      backgroundColor: '#fff',
      padding: 16,
    },
    createExerciseSelectorMobile: {
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderRadius: 12,
      backgroundColor: '#fff',
      padding: 12,
    },
    createExerciseSelectorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    createExerciseSelectorText: {
      fontSize: 16,
      color: '#1e293b',
      fontWeight: '500',
      flex: 1,
      marginLeft: 12,
    },
    createExerciseSelectorTextMobile: {
      fontSize: 14,
      color: '#1e293b',
      fontWeight: '500',
      flex: 1,
      marginLeft: 8,
    },
    createExercisesCount: {
      backgroundColor: '#ef4444',
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createExercisesCountText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    createSelectedExercises: {
      gap: 8,
    },
    createExerciseItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    createExerciseItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    createExerciseImage: {
      width: 40,
      height: 40,
      borderRadius: 8,
    },
    createExercisePlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    createExerciseName: {
      fontSize: 14,
      color: '#1e293b',
      fontWeight: '500',
      flex: 1,
    },
    createExerciseRemove: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#fef2f2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    createExercisesMore: {
      fontSize: 12,
      color: '#64748b',
      textAlign: 'center',
      marginTop: 8,
    },
    createObservationsSection: {
      marginTop: 16,
      gap: 12,
    },
    createObservationsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#374151',
    },
    createObservationItem: {
      gap: 8,
    },
    createObservationLabel: {
      fontSize: 14,
      color: '#1e293b',
      fontWeight: '500',
    },
    createObservationInput: {
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderRadius: 8,
      backgroundColor: '#fff',
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: '#1e293b',
      minHeight: 40,
    },
    createModalFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 20,
      borderTopWidth: 1,
      borderTopColor: '#f1f5f9',
      gap: 14,
      backgroundColor: '#ffffff',
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    createModalFooterMobile: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      paddingBottom: Platform.OS === 'ios' ? 34 : 14,
      borderTopWidth: 1,
      borderTopColor: '#f1f5f9',
      gap: 10,
      backgroundColor: '#ffffff',
    },
    createCancelBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f1f5f9',
      borderRadius: 14,
      paddingVertical: 14,
      gap: 8,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    createCancelText: {
      fontSize: 15,
      color: '#64748b',
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    createCancelTextMobile: {
      fontSize: 14,
    },
    createSubmitBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2474E5',
      borderRadius: 14,
      paddingVertical: 14,
      gap: 8,
      shadowColor: '#1e40af',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    createSubmitBtnDisabled: {
      backgroundColor: '#94a3b8',
      shadowOpacity: 0,
      elevation: 0,
    },
    createSubmitText: {
      fontSize: 15,
      color: '#ffffff',
      fontWeight: '700',
      letterSpacing: 0.3,
    },

    // --- Filtros y vista de sesiones ---
    filtersBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#f8fafc',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
    },
    filtersBarMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: '#f8fafc',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
    },
    filtersLeft: {
      flex: 1,
    },
    filtersRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 10,
      gap: 10,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    filterButtonMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      gap: 6,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      width: '100%',
      justifyContent: 'center',
    },
    filterButtonActive: {
      backgroundColor: '#2856a2',
      borderColor: '#1e40af',
      shadowColor: '#2856a2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    filterButtonText: {
      fontSize: 15,
      color: '#475569',
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    filterButtonTextActive: {
      color: '#fff',
      fontWeight: '700',
    },
    clearFilterBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    viewModeSwitch: {
      flexDirection: 'row',
      backgroundColor: '#e6edf5',
      borderRadius: 20,
      overflow: 'hidden',
    },
    viewModeBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewModeBtnActive: {
      backgroundColor: '#2856a2',
    },

    // NOTE: Old session card styles removed - now using pro styles (proSessionCard, etc.)

    // --- Date Range Filter Styles ---
    dateRangeModalBg: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobileDevice() ? 12 : 24,
    },
    dateRangeModalContent: {
      backgroundColor: '#ffffff',
      borderRadius: isMobileDevice() ? 18 : 24,
      width: '100%',
      maxWidth: isMobileDevice() ? '100%' : 420,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 15,
      overflow: 'hidden',
    },
    dateRangeModalHeader: {
      position: 'relative',
      padding: isMobileDevice() ? 16 : 24,
      paddingBottom: isMobileDevice() ? 14 : 20,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      backgroundColor: '#f8fafc',
    },
    dateRangeModalCloseBtn: {
      position: 'absolute',
      top: isMobileDevice() ? 10 : 16,
      right: isMobileDevice() ? 10 : 16,
      padding: isMobileDevice() ? 8 : 10,
      borderRadius: 14,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    dateRangeModalTitle: {
      fontSize: isMobileDevice() ? 16 : 22,
      fontWeight: '700',
      color: '#1e293b',
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    dateRangeModalBody: {
      padding: isMobileDevice() ? 14 : 24,
      backgroundColor: '#ffffff',
    },
    dateRangeSection: {
      marginBottom: isMobileDevice() ? 16 : 24,
      gap: isMobileDevice() ? 12 : 0,
    },
    dateRangeSectionTitle: {
      fontSize: isMobileDevice() ? 12 : 14,
      fontWeight: '700',
      color: '#64748b',
      marginBottom: isMobileDevice() ? 10 : 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dateRangeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      padding: 18,
      borderRadius: 14,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
    },
    dateRangeButtonSelected: {
      backgroundColor: '#eff6ff',
      borderColor: '#2474E5',
      borderWidth: 2,
    },
    dateRangeButtonText: {
      color: '#1e293b',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 14,
    },
    dateRangeButtonTextSelected: {
      color: '#2474E5',
      fontWeight: '700',
    },
    dateRangeButtonSubtext: {
      fontSize: 14,
      color: '#64748b',
      marginTop: 3,
    },
    dateRangeClearBtn: {
      padding: 4,
    },
    dateRangePreview: {
      backgroundColor: '#f0f9ff',
      borderRadius: isMobileDevice() ? 12 : 16,
      padding: isMobileDevice() ? 14 : 20,
      marginTop: isMobileDevice() ? 12 : 20,
      borderWidth: 1.5,
      borderColor: '#bfdbfe',
    },
    dateRangePreviewTitle: {
      fontSize: isMobileDevice() ? 11 : 13,
      fontWeight: '700',
      color: '#1e40af',
      marginBottom: isMobileDevice() ? 6 : 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dateRangePreviewText: {
      fontSize: isMobileDevice() ? 14 : 17,
      color: '#1e293b',
      fontWeight: '600',
    },
    dateRangeModalFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: isMobileDevice() ? 12 : 24,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      backgroundColor: '#ffffff',
      flexWrap: 'wrap',
      gap: isMobileDevice() ? 8 : 0,
    },
    dateRangeCancelBtn: {
      paddingVertical: isMobileDevice() ? 10 : 14,
      paddingHorizontal: isMobileDevice() ? 14 : 24,
      borderRadius: 14,
      backgroundColor: '#f1f5f9',
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateRangeCancelText: {
      color: '#475569',
      fontSize: isMobileDevice() ? 13 : 16,
      fontWeight: '700',
    },
    dateRangeApplyBtn: {
      paddingVertical: isMobileDevice() ? 10 : 14,
      paddingHorizontal: isMobileDevice() ? 18 : 28,
      borderRadius: 14,
      backgroundColor: '#2474E5',
      shadowColor: '#2474E5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 5,
    },
    dateRangeApplyText: {
      color: '#ffffff',
      fontSize: isMobileDevice() ? 13 : 16,
      fontWeight: '700',
    },

    // --- Player Selector Styles ---
    selectAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0f9ff',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#bfdbfe',
    },
    selectAllText: {
      marginLeft: 8,
      fontSize: 14,
      color: '#2474E5',
      fontWeight: '700',
    },
    playerCardIcon: {
      marginBottom: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playerPosition: {
      fontSize: 12,
      color: '#64748b',
      textAlign: 'center',
      marginTop: 4,
      fontWeight: '500',
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      marginTop: 6,
      alignSelf: 'center',
    },
    statusText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },

    // --- Extra Players Styles ---
    addExtraPlayerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      gap: 10,
    },
    addExtraPlayerInput: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      backgroundColor: '#ffffff',
      color: '#1e293b',
    },
    addExtraPlayerBtn: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: '#f0f9ff',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#bfdbfe',
      shadowColor: '#2474E5',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },

    // --- Filter Styles ---
    filterRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
      marginVertical: 16,
      paddingHorizontal: 20,
    },
    filterBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 24,
      backgroundColor: '#ffffff',
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    filterBtnActive: {
      backgroundColor: '#2474E5',
      borderColor: '#2474E5',
      shadowColor: '#2474E5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    filterBtnText: {
      fontSize: 14,
      color: '#64748b',
      fontWeight: '600',
    },
    filterBtnTextActive: {
      color: '#ffffff',
      fontWeight: '700',
    },
    // --- Organization Modal ---
    orgModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    orgModalContent: {
      backgroundColor: '#ffffff',
      borderRadius: 24,
      width: '100%',
      height: '90%',
      maxWidth: 800,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 15,
      overflow: 'hidden',
    },

    // --- Mobile Menu ---
    mobileMenuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    mobileMenuContainer: {
      backgroundColor: '#ffffff',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 20,
    },
    mobileMenuSafeArea: {
      backgroundColor: '#ffffff',
      height: 50,
    },
    mobileMenuContent: {
      padding: 24,
      paddingTop: 16,
    },
    mobileMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: '#f8fafc',
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#f1f5f9',
    },
    mobileMenuItemText: {
      flex: 1,
      fontSize: 16,
      color: '#1f2937',
      marginLeft: 14,
      fontWeight: '600',
    },
    mobileMenuDivider: {
      height: 1,
      backgroundColor: '#e2e8f0',
      marginVertical: 12,
    },
    mobileMenuBadge: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: '#ef4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#ffffff',
    },
    mobileMenuBadgeText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: 'bold',
    },
    mobileMenuItemBadge: {
      backgroundColor: '#ef4444',
      borderRadius: 12,
      minWidth: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    mobileMenuItemBadgeText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: 'bold',
    },

    // --- Team Assignment Styles ---
    teamAssignmentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0f9ff',
      borderWidth: 1.5,
      borderColor: '#bfdbfe',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginTop: 10,
      marginBottom: 4,
    },
    teamAssignmentButtonText: {
      color: '#3578e5',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
      flex: 1,
    },
    teamAssignmentBadge: {
      backgroundColor: '#10b981',
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
      backgroundColor: '#ffffff',
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
      borderBottomColor: '#e2e8f0',
      backgroundColor: '#f8fafc',
    },
    teamAssignmentModalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    teamAssignmentModalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1e293b',
    },
    teamAssignmentModalSubtitle: {
      fontSize: 13,
      color: '#64748b',
      marginTop: 2,
    },
    teamAssignmentModalCloseBtn: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: '#f1f5f9',
    },
    teamAssignmentModalBody: {
      flex: 1,
      padding: 16,
    },
    teamAssignmentTeamSection: {
      marginBottom: 20,
      backgroundColor: '#ffffff',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      overflow: 'hidden',
    },
    teamAssignmentTeamHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: '#f8fafc',
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
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
      color: '#1e293b',
      marginLeft: 10,
      flex: 1,
    },
    teamAssignmentTeamCount: {
      fontSize: 13,
      color: '#64748b',
      fontWeight: '500',
    },
    teamAssignmentComodinesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      backgroundColor: '#f0fdfa',
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
      backgroundColor: '#ffffff',
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
      backgroundColor: '#f8fafc',
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
      backgroundColor: '#f8fafc',
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    teamAssignmentPlayerChipSelected: {
      backgroundColor: '#3578e5',
      borderColor: '#3578e5',
    },
    teamAssignmentPlayerChipDisabled: {
      backgroundColor: '#f1f5f9',
      borderColor: '#e2e8f0',
      opacity: 0.5,
    },
    teamAssignmentPlayerChipExtra: {
      borderColor: '#fcd34d',
      backgroundColor: '#fffbeb',
    },
    teamAssignmentPlayerChipExtraSelected: {
      backgroundColor: '#f59e0b',
      borderColor: '#f59e0b',
    },
    teamAssignmentPlayerDorsal: {
      fontSize: 12,
      fontWeight: '700',
      color: '#64748b',
      marginRight: 6,
      backgroundColor: '#e2e8f0',
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
      color: '#1e293b',
      fontWeight: '500',
    },
    teamAssignmentPlayerNameSelected: {
      color: '#ffffff',
    },
    teamAssignmentPlayerNameDisabled: {
      color: '#94a3b8',
    },
    teamAssignmentModalFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
      backgroundColor: '#f8fafc',
    },
    teamAssignmentClearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    teamAssignmentClearBtnText: {
      color: '#64748b',
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
      backgroundColor: '#3578e5',
    },
    teamAssignmentConfirmBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 6,
    },
    // Estilos para selector de jugadores extras
    noExtraPlayersInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      padding: 16,
      borderRadius: 12,
      gap: 12,
    },
    noExtraPlayersText: {
      flex: 1,
      fontSize: 14,
      color: '#64748b',
      lineHeight: 20,
    },
    extraPlayersSubtitle: {
      fontSize: 13,
      color: '#64748b',
      marginBottom: 12,
    },
    extraPlayersGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    extraPlayerChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f1f5f9',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      gap: 8,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    extraPlayerChipSelected: {
      backgroundColor: '#dcfce7',
      borderColor: '#22c55e',
    },
    extraPlayerChipPhoto: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    extraPlayerChipAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#e2e8f0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    extraPlayerChipAvatarSelected: {
      backgroundColor: '#bbf7d0',
    },
    extraPlayerChipInitials: {
      fontSize: 11,
      fontWeight: '600',
      color: '#64748b',
    },
    extraPlayerChipText: {
      fontSize: 14,
      color: '#334155',
      fontWeight: '500',
      maxWidth: 150,
    },
    extraPlayerChipTextSelected: {
      color: '#166534',
    },

    // NOTE: Team assignment view styles removed - now in TrainingSessionDetailModal
  });
}

function VideoPlayerView({ url }) {
  const player = useVideoPlayer(url || '', p => {
    if (url) { p.loop = false; p.play(); }
  });
  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />;
}

