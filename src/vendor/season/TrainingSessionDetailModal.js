// components/pages/season/TrainingSessionDetailModal.js
// Modal de detalle de sesión de entrenamiento con PDF
import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Image,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { generateSessionPDF } from '@/vendor/training/SessionPDF';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { getVideosByExercise, getVideoStreamUrl, getVideoDownloadUrl, regenerateVideoWithField, getSessionWellnessStats, getSessionPreWellnessStats } from '@/utils/api';
import { getFieldById } from '@/utils/fieldTypes';
import ImageZoom from 'react-native-image-pan-zoom';
import WellnessDetailModal from './WellnessDetailModal';
import PreWellnessDetailModal from './PreWellnessDetailModal';
import { getPlayerFullName } from '@/utils/playerHelpers';
import { STRENGTH_EXERCISES, getStrengthExerciseImage, getStrengthExerciseVideoUrl, getSectionForExercise } from '@/data/strengthExercises';
import StrengthExerciseViewer from '@/vendor/shared/StrengthExerciseViewer';
import {
  getEntityId,
  getSessionExerciseIds,
  getSessionExercises,
} from '@/utils/sessionExercises';

// Tema consistente con el resto de la aplicación
// NOTE: Colores ahora vienen del ThemeProvider de styled-components.
// TEAM_COLORS se mantiene literal porque son datos semánticos (identidad de equipo).

// Colores para los equipos
const TEAM_COLORS = ['#3578e5', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const getTeamColor = (teamNumber) => TEAM_COLORS[(teamNumber - 1) % TEAM_COLORS.length];

export default function TrainingSessionDetailModal({
  visible,
  session,
  team,
  players = [],
  exercises = [],
  onClose,
  onEdit,
  onDelete,
  onWellnessUpdate, // Callback para cuando se actualice el wellness
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;
  const IS_TABLET = screenWidth > 700;
  
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Estados para video
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [exerciseForVideo, setExerciseForVideo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [exerciseVideoAvailability, setExerciseVideoAvailability] = useState({});
  
  // Estados para wellness
  const [showWellnessDetail, setShowWellnessDetail] = useState(false);
  const [wellnessStats, setWellnessStats] = useState(null);
  const [loadingWellness, setLoadingWellness] = useState(false);
  
  // Estados para pre-wellness
  const [showPreWellnessDetail, setShowPreWellnessDetail] = useState(false);
  const [preWellnessStats, setPreWellnessStats] = useState(null);
  const [loadingPreWellness, setLoadingPreWellness] = useState(false);
  
  // Video player para el modal
  const videoPlayer = useVideoPlayer(videoUrl, player => {
    if (videoUrl) {
      player.loop = false;
      player.play();
    }
  });

  // Cargar estadísticas de wellness
  const loadWellnessStats = async () => {
    if (!session?._id) return;
    setLoadingWellness(true);
    try {
      const stats = await getSessionWellnessStats(session._id);
      setWellnessStats(stats);
    } catch (error) {
      console.error('Error loading wellness stats:', error);
    } finally {
      setLoadingWellness(false);
    }
  };

  // Cargar estadísticas de pre-wellness
  const loadPreWellnessStats = async () => {
    if (!session?._id) return;
    setLoadingPreWellness(true);
    try {
      const stats = await getSessionPreWellnessStats(session._id);
      setPreWellnessStats(stats);
    } catch (error) {
      console.error('Error loading pre-wellness stats:', error);
    } finally {
      setLoadingPreWellness(false);
    }
  };

  useEffect(() => {
    if (visible && session?._id) {
      loadWellnessStats();
      loadPreWellnessStats();
    }
  }, [visible, session?._id]);

  // Cargar disponibilidad de videos para cada ejercicio
  useEffect(() => {
    const loadVideoAvailability = async () => {
      const ejerciciosIds = getSessionExerciseIds(session);
      if (ejerciciosIds.length === 0) return;

      const availability = {};
      
      await Promise.all(
        ejerciciosIds.map(async (ejercicioId) => {
          try {
            const videos = await getVideosByExercise(ejercicioId);
            availability[ejercicioId] = videos && videos.length > 0;
          } catch (error) {
            availability[ejercicioId] = false;
          }
        })
      );
      setExerciseVideoAvailability(availability);
    };
    
    if (visible && session) {
      loadVideoAvailability();
    }
  }, [visible, session]);

  const sessionExercises = useMemo(() => getSessionExercises(session, exercises), [session, exercises]);

  // Mapa de observaciones
  const observacionesMap = useMemo(() => {
    if (!session?.observaciones) return {};
    return Object.fromEntries(
      session.observaciones.map(o => [getEntityId(o.ejercicioId || o.ejercicio), o.observacion])
    );
  }, [session?.observaciones]);

  // Mapa de detalles (orden, descanso y teamAssignments)
  const detalleMap = useMemo(() => {
    if (!session?.ejerciciosDetalle) return {};
    const map = {};
    session.ejerciciosDetalle.forEach(det => {
      const ejercicioId = getEntityId(det.ejercicio);
      if (ejercicioId) {
        map[ejercicioId] = { 
          orden: det.orden || 0, 
          tiempoDescanso: det.tiempoDescanso || 0,
          teamAssignments: det.teamAssignments || []
        };
      }
    });
    return map;
  }, [session?.ejerciciosDetalle]);

  // Ejercicios ordenados
  const orderedExercises = useMemo(() => {
    return [...sessionExercises].sort((a, b) => {
      const ordenA = detalleMap[a._id]?.orden || 0;
      const ordenB = detalleMap[b._id]?.orden || 0;
      return ordenA - ordenB;
    });
  }, [sessionExercises, detalleMap]);

  // Ejercicios de fuerza de la sesión
  const sessionStrengthExercises = useMemo(() => {
    if (!session?.ejerciciosFuerza || session.ejerciciosFuerza.length === 0) return [];
    return session.ejerciciosFuerza.map(ef => {
      const exerciseData = STRENGTH_EXERCISES.find(e => e.id === ef.id);
      if (!exerciseData) return null;
      return {
        ...exerciseData,
        observacion: ef.observacion || '',
        tiempoDescanso: ef.tiempoDescanso || 0,
        orden: ef.orden || 0,
      };
    }).filter(Boolean);
  }, [session?.ejerciciosFuerza]);

  // Estado para visor de ejercicio de fuerza
  const [strengthViewerExercise, setStrengthViewerExercise] = useState(null);

  // Obtener jugadores extras de la sesión
  const sessionExtraPlayers = useMemo(() => {
    if (!session?.jugadoresExtras || !players.length) return [];
    const extraIds = new Set(session.jugadoresExtras.map(getEntityId).filter(Boolean));
    return players.filter(p => 
      extraIds.has(getEntityId(p))
    );
  }, [session?.jugadoresExtras, players]);

  // Obtener jugadores de la sesión
  const sessionPlayers = useMemo(() => {
    if (!session?.jugadores || !players.length) return [];
    const playerIds = new Set(session.jugadores.map(getEntityId).filter(Boolean));
    return players.filter(p => 
      playerIds.has(getEntityId(p))
    );
  }, [session?.jugadores, players]);

  // Early return DESPUÉS de todos los hooks
  if (!session) return null;

  // Formatear fecha
  const currentLang = i18n.language || 'es';
  const formatDate = (dateStr) => {
    if (!dateStr) return t('session.noDate');
    const fecha = new Date(dateStr);
    if (isNaN(fecha.getTime())) return t('session.invalidDate');
    
    const locale = currentLang === 'en' ? 'en-US' : 'es-ES';
    return fecha.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Obtener nombre de carpeta del ejercicio
  const getFolderName = (ejercicio) => {
    if (!ejercicio.folder) return null;
    if (typeof ejercicio.folder === 'object') return ejercicio.folder.nombre;
    return null;
  };

  // Generar PDF de la sesión usando la función compartida
  const handleGeneratePDF = async () => {
    try {
      setGeneratingPDF(true);

      // Usar la función compartida de SessionPDF.js
      await generateSessionPDF({
        session,
        exercises: orderedExercises,
        strengthExercises: sessionStrengthExercises,
        team,
        players,
        i18n,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert(t('message.error'), t('session.pdfGenerateError'));
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleImagePress = (imagen) => {
    setSelectedImage(imagen);
    setImageModalVisible(true);
  };
  
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
        
        const field = getFieldById(video.fieldType);
        let fieldImageData = null;
        
        if (field && field.image) {
          try {
            const asset = field.image;
            const assetUri = Image.resolveAssetSource(asset).uri;
            const response = await fetch(assetUri);
            const blob = await response.blob();
            const reader = new FileReader();
            fieldImageData = await new Promise((resolve, reject) => {
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            console.warn('Error cargando imagen del campo:', err);
          }
        }
        
        const result = await regenerateVideoWithField(video._id, fieldImageData);
        
        if (result.success && result.videoId) {
          const streamUrl = getVideoStreamUrl(result.videoId);
          setVideoUrl(streamUrl);
        }
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

  const modalImageWidth = Math.round(screenWidth * 0.95);
  const modalImageHeight = Math.round(screenHeight * 0.8);
  const modalImageCenter = {
    x: Math.round(modalImageWidth / 2),
    y: Math.round(modalImageHeight / 2),
    scale: 1,
  };

  // Función para descargar video
  const downloadVideo = async () => {
    if (!selectedVideo?._id) return;
    
    try {
      setIsDownloading(true);

      const downloadUrl = getVideoDownloadUrl(selectedVideo._id);
      const fileName = `${selectedVideo.nombre || 'video'}.mp4`;
      const fileUri = FileSystem.documentDirectory + fileName;

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / (downloadProgress.totalBytesExpectedToWrite || 1);
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (!result || !result.uri) {
        throw new Error('No se pudo descargar el archivo');
      }

      if (Platform.OS === 'android') {
        try {
          const asset = await MediaLibrary.createAssetAsync(result.uri);
          await MediaLibrary.createAlbumAsync('xtramys', asset, false);
          Alert.alert(t('message.success'), t('video.savedToGallery'));
        } catch (saveErr) {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(result.uri, { mimeType: 'video/mp4' });
          } else {
            throw saveErr;
          }
        }
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('message.error'), t('video.permissionRequired'));
          return;
        }
        const asset = await MediaLibrary.createAssetAsync(result.uri);
        await MediaLibrary.createAlbumAsync('xtramys', asset, false);
        Alert.alert(t('message.success'), t('video.savedToGallery'));
      }
    } catch (error) {
      console.error('Error descargando video:', error);
      Alert.alert(t('message.error'), t('video.saveFailed'));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
     
      onRequestClose={onClose}
    >
      <View style={styles.modalBg}>
        <View style={IS_TABLET ? styles.viewModalContentTablet : styles.viewModalContent}>
          {/* Header - igual que training.js */}
          <View style={[styles.modalHeader, IS_MOBILE && { padding: 14 }]}>
            <Text style={[styles.modalTitle, IS_MOBILE && { fontSize: 16 }]}>{t('session.detailsTitle')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Botón PDF */}
              <TouchableOpacity
                style={styles.headerSecondaryButton}
                onPress={handleGeneratePDF}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <ActivityIndicator size="small" color="#d32f2f" />
                ) : (
                  <MaterialIcons name="picture-as-pdf" size={20} color="#d32f2f" />
                )}
              </TouchableOpacity>
              {onEdit && (
                <TouchableOpacity
                  style={styles.headerSecondaryButton}
                  onPress={() => onEdit(session)}
                >
                  <MaterialIcons name="edit" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={onClose}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={[styles.modalBody, IS_MOBILE && { padding: 14 }]} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* Session Detail Card - Header con fecha */}
            <View style={styles.sessionDetailCard}>
              <View style={styles.sessionDetailHeader}>
                <MaterialIcons name="event" size={24} color={theme.colors.primary} />
                <Text style={styles.sessionDetailTitle}>
                  {formatDate(session.fecha)} • {session.horaInicio || '--:--'} - {session.horaFin || '--:--'}
                </Text>
              </View>
            </View>

            {/* Información General - igual que training.js */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>{t('session.generalInformation')}</Text>
              
              <View style={styles.detailRow}>
                <MaterialIcons name="schedule" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.detailLabel}>{t('session.scheduleLabel')}:</Text>
                <Text style={styles.detailValue}>
                  {session.horaInicio || '--:--'} - {session.horaFin || '--:--'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <MaterialIcons name="fitness-center" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.detailLabel}>{t('session.exercisesLabel')}:</Text>
                <Text style={styles.detailValue}>
                  {t('session.exercisesCount', { count: orderedExercises.length })}
                </Text>
              </View>
              
              {(sessionPlayers.length > 0 || (session.jugadoresExtras && session.jugadoresExtras.length > 0)) && (
                <View style={styles.detailRow}>
                  <Ionicons name="people" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.detailLabel}>{t('session.playersLabel')}:</Text>
                  <Text style={styles.detailValue}>
                    {sessionPlayers.length + (session.jugadoresExtras?.length || 0)} {t('session.availableCount', { count: sessionPlayers.length + (session.jugadoresExtras?.length || 0) })}
                  </Text>
                </View>
              )}
              
              {/* Lista de jugadores del equipo */}
              {sessionPlayers.length > 0 && (
                <View style={styles.detailPlayersRow}>
                  <Text style={styles.detailPlayersLabel}>{t('session.availablePlayersLabel')}:</Text>
                  <Text style={styles.detailPlayersText}>
                    {sessionPlayers.map(j => getPlayerFullName(j)).join(', ')}
                  </Text>
                </View>
              )}
              
              {/* Lista de jugadores extras */}
              {sessionExtraPlayers.length > 0 && (
                <View style={styles.detailPlayersRow}>
                  <Text style={styles.detailPlayersLabelExtra}>{t('session.extrasLabel')}:</Text>
                  <Text style={styles.detailPlayersText}>
                    {sessionExtraPlayers.map(j => getPlayerFullName(j)).join(', ')}
                  </Text>
                </View>
              )}
            </View>

            {/* Sección de Pre-Wellness */}
            <View style={styles.detailSection}>
              <View style={styles.wellnessSectionHeader}>
                <View style={styles.preWellnessTitleRow}>
                  <Text style={styles.detailSectionTitle}>{t('preWellness.title')}</Text>
                  <View style={styles.preWellnessBadge}>
                    <Text style={styles.preWellnessBadgeText}>{t('session.preBadge')}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.wellnessDetailBtn}
                  onPress={() => setShowPreWellnessDetail(true)}
                >
                  <MaterialIcons name="open-in-new" size={16} color={theme.colors.onPrimary} />
                  <Text style={styles.wellnessDetailBtnText}>
                    {t('preWellness.manage')}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {loadingPreWellness ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 12 }} />
              ) : (
                <View style={styles.wellnessStatsContainer}>
                  {/* Response Count */}
                  <View style={styles.wellnessStatBox}>
                    <Text style={styles.wellnessStatLabel}>{t('preWellness.responses')}</Text>
                    <Text style={[styles.wellnessStatValue, { color: theme.colors.textSecondary }]}>
                      {preWellnessStats?.responseCount || 0}
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Link status indicator */}
              {preWellnessStats?.hasActiveLink && (
                <View style={styles.wellnessLinkActive}>
                  <Ionicons name="link" size={14} color={theme.colors.success} />
                  <Text style={styles.wellnessLinkActiveText}>
                    {t('preWellness.linkActive')}
                  </Text>
                </View>
              )}
            </View>

            {/* Sección de Wellness */}
            <View style={styles.detailSection}>
              <View style={styles.wellnessSectionHeader}>
                <View style={styles.preWellnessTitleRow}>
                  <Text style={styles.detailSectionTitle}>{t('session.wellness')}</Text>
                  <View style={[styles.preWellnessBadge, { backgroundColor: theme.colors.success }]}>
                    <Text style={styles.preWellnessBadgeText}>{t('session.postBadge')}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.wellnessDetailBtn}
                  onPress={() => setShowWellnessDetail(true)}
                >
                  <MaterialIcons name="open-in-new" size={16} color={theme.colors.onPrimary} />
                  <Text style={styles.wellnessDetailBtnText}>
                    {t('session.manageWellness')}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {loadingWellness ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 12 }} />
              ) : (
                <View style={styles.wellnessStatsContainer}>
                  {/* Expected Wellness */}
                  <View style={styles.wellnessStatBox}>
                    <Text style={styles.wellnessStatLabel}>{t('session.expectedWellness')}</Text>
                    <Text style={[styles.wellnessStatValue, { color: theme.colors.success }]}>
                      {wellnessStats?.expectedWellness || '-'}
                    </Text>
                  </View>
                  {/* Average Wellness */}
                  <View style={styles.wellnessStatBox}>
                    <Text style={styles.wellnessStatLabel}>{t('session.averageWellness')}</Text>
                    <Text style={[styles.wellnessStatValue, { color: theme.colors.info }]}>
                      {wellnessStats?.averageWellness?.toFixed(1) || '-'}
                    </Text>
                  </View>
                  {/* Response Count */}
                  <View style={styles.wellnessStatBox}>
                    <Text style={styles.wellnessStatLabel}>{t('session.responses')}</Text>
                    <Text style={[styles.wellnessStatValue, { color: theme.colors.textSecondary }]}>
                      {wellnessStats?.responseCount || 0}
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Link status indicator */}
              {wellnessStats?.hasActiveLink && (
                <View style={styles.wellnessLinkActive}>
                  <Ionicons name="link" size={14} color={theme.colors.success} />
                  <Text style={styles.wellnessLinkActiveText}>
                    {t('session.wellnessLinkActive')}
                  </Text>
                </View>
              )}
            </View>

            {/* Sección de Ejercicios - igual que training.js */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>{t('session.trainingExercises')}</Text>
              
              {orderedExercises.length === 0 ? (
                <Text style={styles.emptyText}>{t('session.noExercises')}</Text>
              ) : (
                orderedExercises.map((ejercicio, index) => {
                  const detalle = detalleMap[ejercicio._id] || {};
                  const orden = detalle.orden || (index + 1);
                  const tiempoDescanso = detalle.tiempoDescanso || 0;
                  const teamAssignments = detalle.teamAssignments || [];
                  const isLast = index === orderedExercises.length - 1;
                  
                  // Helper para obtener nombre de jugador por ID o por nombre (para extras)
                  const getPlayerName = (playerIdOrName) => {
                    const id = getEntityId(playerIdOrName);
                    const allPlayers = [...new Map(
                      [...sessionPlayers, ...sessionExtraPlayers, ...players]
                        .map((p) => [getEntityId(p), p])
                    ).values()];
                    const player = allPlayers.find(p => getEntityId(p) === id);

                    if (player) {
                      return getPlayerFullName(player) || id || '';
                    }
                    if (typeof playerIdOrName === 'object' && playerIdOrName) {
                      const name = getPlayerFullName(playerIdOrName);
                      if (name) return name;
                      if (playerIdOrName.nombre) return playerIdOrName.nombre;
                      if (playerIdOrName.apellidos) return playerIdOrName.apellidos;
                      if (playerIdOrName.name) return playerIdOrName.name;
                      if (playerIdOrName.fullName) return playerIdOrName.fullName;
                    }
                    if (typeof playerIdOrName === 'string' && playerIdOrName.trim()) {
                      return playerIdOrName;
                    }
                    return '';
                  };
                  
                  return (
                    <View key={ejercicio._id}>
                      <View style={styles.exerciseCard}>
                        <View style={styles.exerciseOrderBadge}>
                          <Text style={styles.exerciseOrderText}>{orden}</Text>
                        </View>
                        
                        {ejercicio.imagen && (
                          <TouchableOpacity
                            style={styles.exerciseImageContainer}
                            onPress={() => handleImagePress(ejercicio.imagen)}
                          >
                            <Image
                              source={{
                                uri: ejercicio.imagen.startsWith('http')
                                  ? `${ejercicio.imagen}?t=${Date.now()}`
                                  : `data:image/png;base64,${ejercicio.imagen}`
                              }}
                              style={styles.exerciseImage}
                              resizeMode="cover"
                            />
                            <View style={styles.zoomBadgeWithText}>
                              <MaterialIcons name="fullscreen" size={18} color={theme.colors.primary} />
                              <Text style={styles.zoomBadgeText}>{t('common.zoom')}</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseName}>{ejercicio.nombre}</Text>
                          
                          {/* Tags informativos - igual que en training.js */}
                          <View style={styles.exerciseTags}>
                            {getFolderName(ejercicio) && (
                              <View style={[styles.exerciseTag, { backgroundColor: theme.colors.successSoft }]}>
                                <Ionicons name="folder" size={14} color={theme.colors.successSoftText} />
                                <Text style={[styles.exerciseTagText, { color: theme.colors.successSoftText }]}>{getFolderName(ejercicio)}</Text>
                              </View>
                            )}
                            {ejercicio.numeroJugadores && (
                              <View style={[styles.exerciseTag, { backgroundColor: theme.colors.infoSoft }]}>
                                <Ionicons name="people" size={14} color={theme.colors.infoSoftText} />
                                <Text style={[styles.exerciseTagText, { color: theme.colors.infoSoftText }]}>{ejercicio.numeroJugadores}</Text>
                              </View>
                            )}
                            {ejercicio.equipos && (
                              <View style={[styles.exerciseTag, { backgroundColor: theme.colors.purpleSoft }]}>
                                <Ionicons name="flag" size={14} color={theme.colors.purpleSoftText} />
                                <Text style={[styles.exerciseTagText, { color: theme.colors.purpleSoftText }]}>{ejercicio.equipos}</Text>
                              </View>
                            )}
                            {ejercicio.dimensiones && (
                              <View style={[styles.exerciseTag, { backgroundColor: theme.colors.purpleSoft }]}>
                                <Ionicons name="resize-outline" size={14} color={theme.colors.purpleSoftText} />
                                <Text style={[styles.exerciseTagText, { color: theme.colors.purpleSoftText }]}>{ejercicio.dimensiones}</Text>
                              </View>
                            )}
                            {tiempoDescanso > 0 && (
                              <View style={[styles.exerciseTag, { backgroundColor: theme.colors.successSoft }]}>
                                <Ionicons name="time-outline" size={14} color={theme.colors.successSoftText} />
                                <Text style={[styles.exerciseTagText, { color: theme.colors.successSoftText }]}>{t('session.restTimeShort')}: {tiempoDescanso}min</Text>
                              </View>
                            )}
                            
                            {/* Botón de video - solo mostrar si hay videos disponibles */}
                            {exerciseVideoAvailability[ejercicio._id] && (
                              <TouchableOpacity
                                style={styles.exerciseVideoBtn}
                                onPress={() => handlePlayExerciseVideo(ejercicio)}
                              >
                                <Feather name="play-circle" size={14} color="#fff" />
                                <Text style={styles.exerciseVideoBtnText}>{t('exercise.video')}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          
                          {/* Información detallada - igual que en training.js */}
                          <View style={styles.exerciseDetailsSection}>
                            {ejercicio.descripcion && (
                              <Text style={styles.exerciseDetailText}>
                                <Text style={styles.exerciseDetailLabel}>{t('exercise.description')}: </Text>
                                <Text>{ejercicio.descripcion}</Text>
                              </Text>
                            )}
                            {ejercicio.objetivo && (
                              <Text style={styles.exerciseDetailText}>
                                <Text style={styles.exerciseDetailLabel}>{t('exercise.objective')}: </Text>
                                <Text>{ejercicio.objetivo}</Text>
                              </Text>
                            )}
                            {ejercicio.tiempo && (
                              <Text style={styles.exerciseDetailText}>
                                <Text style={styles.exerciseDetailLabel}>{t('session.duration')}: </Text>
                                <Text>{ejercicio.tiempo} min</Text>
                              </Text>
                            )}
                          </View>
                          
                          {/* Observación específica de la sesión */}
                          {observacionesMap[ejercicio._id] && (
                            <View style={styles.observacionContainer}>
                              <Ionicons name="chatbubble-ellipses" size={14} color={theme.colors.textSecondary} />
                              <Text style={styles.observacionText}>
                                <Text style={{ fontWeight: 'bold' }}>{t('session.observation')}: </Text>
                                {observacionesMap[ejercicio._id]}
                              </Text>
                            </View>
                          )}
                          
                          {/* Equipos asignados al ejercicio */}
                          {teamAssignments && teamAssignments.length > 0 && teamAssignments.some(ta => (ta.players?.length > 0 || ta.extraPlayers?.length > 0)) && (
                            <View style={styles.teamAssignmentsContainer}>
                              <View style={styles.teamAssignmentsHeader}>
                                <Ionicons name="people" size={16} color={theme.colors.primary} />
                                <Text style={styles.teamAssignmentsTitle}>
                                  {t('session.teamAssignments')}
                                </Text>
                              </View>
                              <View style={styles.teamsGrid}>
                                {teamAssignments.map((team, teamIdx) => {
                                  const teamPlayers = (team.players || []).map(id => getPlayerName(id)).filter(n => n);
                                  // extraPlayers almacena IDs de jugadores extras (ObjectId ref a Player)
                                  const teamExtras = (team.extraPlayers || []).map(id => getPlayerName(id)).filter(n => n);
                                  const allNames = [...teamPlayers, ...teamExtras];
                                  
                                  if (allNames.length === 0) return null;
                                  
                                  return (
                                    <View key={teamIdx} style={styles.teamBox}>
                                      <View style={[styles.teamBoxHeader, { backgroundColor: getTeamColor(team.teamNumber) }]}>
                                        <Text style={styles.teamBoxTitle}>
                                          {t('session.team')} {team.teamNumber}
                                        </Text>
                                        <Text style={styles.teamBoxCount}>
                                          {allNames.length}
                                        </Text>
                                      </View>
                                      <View style={styles.teamBoxPlayers}>
                                        {allNames.map((name, nameIdx) => (
                                          <Text key={nameIdx} style={styles.teamPlayerName}>
                                            • {name}
                                          </Text>
                                        ))}
                                      </View>
                                    </View>
                                  );
                                })}
                              </View>
                            </View>
                          )}
                        </View>
                      </View>
                      
                      {/* Indicador de tiempo de descanso entre ejercicios */}
                      {!isLast && tiempoDescanso > 0 && (
                        <View style={styles.restTimeCard}>
                          <Ionicons name="time-outline" size={16} color={theme.colors.warningSoftText} />
                          <Text style={styles.restTimeText}>{t('session.restTime')}: {tiempoDescanso} min</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {/* Sección de Ejercicios de Fuerza */}
            {sessionStrengthExercises.length > 0 && (
              <View style={[styles.section, { marginBottom: 24 }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="barbell" size={20} color={theme.colors.purple} />
                  <Text style={styles.sectionTitle}>{t('session.strengthExercises')}</Text>
                  <View style={styles.exerciseCount}>
                    <Text style={styles.exerciseCountText}>{sessionStrengthExercises.length}</Text>
                  </View>
                </View>
                
                {(() => {
                  // Calcular ancho disponible dentro del modal
                  const modalWidth = IS_TABLET ? Math.min(screenWidth * 0.8, 700) : screenWidth * 0.95;
                  const sectionPadding = 16 * 2; // padding del section
                  const modalPadding = 20 * 2; // padding del modalBody
                  const availableWidth = modalWidth - sectionPadding - modalPadding;
                  const gap = 10;
                  const minCardWidth = 120;
                  const cols = Math.max(2, Math.min(4, Math.floor((availableWidth + gap) / (minCardWidth + gap))));
                  const cardW = (availableWidth - gap * (cols - 1)) / cols;
                  
                  return (
                    <View style={styles.strengthGrid}>
                      {sessionStrengthExercises.map((exercise, index) => {
                        const sectionInfo = getSectionForExercise(exercise.id);
                        
                        return (
                          <TouchableOpacity 
                            key={exercise.id}
                            style={[styles.strengthGridCard, { width: cardW }]}
                            onPress={() => setStrengthViewerExercise(exercise)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.strengthGridImageContainer}>
                              <Image
                                source={getStrengthExerciseImage(exercise.image)}
                                style={styles.strengthGridImage}
                                resizeMode="contain"
                              />
                            </View>
                            <View style={styles.strengthGridInfo}>
                              <Text style={styles.strengthGridName} numberOfLines={2}>{t(exercise.i18nKey)}</Text>
                              <View style={styles.strengthGridTagsRow}>
                                {sectionInfo && (
                                  <View style={[styles.strengthGridTag, { backgroundColor: theme.colors.purpleSoft }]}>
                                    <Text style={[styles.strengthGridTagText, { color: theme.colors.purpleSoftText }]}>{t(sectionInfo.section.i18nKey)}</Text>
                                  </View>
                                )}
                                <View style={[styles.strengthGridTag, { backgroundColor: theme.colors.infoSoft }]}>
                                  <Text style={[styles.strengthGridTagText, { color: theme.colors.infoSoftText }]}>Nv {exercise.level}</Text>
                                </View>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })()}
              </View>
            )}

            {/* Botón Eliminar */}
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  Alert.alert(
                    t('session.deleteSession'),
                    t('session.confirmDeleteMessage'),
                    [
                      { text: t('message.cancel'), style: 'cancel' },
                      {
                        text: t('edition.delete'),
                        style: 'destructive',
                        onPress: () => onDelete(session),
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash" size={20} color={theme.colors.error} />
                <Text style={styles.deleteButtonText}>{t('session.deleteSession')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Modal de imagen ampliada con zoom */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
       
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalBg}>
          <TouchableOpacity
            style={styles.closeImageBtn}
            onPress={() => setImageModalVisible(false)}
          >
            <Text style={styles.closeImageText}>×</Text>
          </TouchableOpacity>
          {selectedImage && (
            <ImageZoom
              cropWidth={screenWidth}
              cropHeight={screenHeight}
              imageWidth={modalImageWidth}
              imageHeight={modalImageHeight}
              style={styles.imageZoomWrapper}
              enableCenterFocus={true}
              centerOn={modalImageCenter}
              minScale={1}
              maxScale={4}
              enableSwipeDown={true}
              onSwipeDown={() => setImageModalVisible(false)}
            >
              <Image
                source={{
                  uri: selectedImage.startsWith('http')
                    ? `${selectedImage}?t=${Date.now()}`
                    : `data:image/png;base64,${selectedImage}`
                }}
                style={[styles.fullImage, { alignSelf: 'center' }]}
                resizeMode="contain"
              />
            </ImageZoom>
          )}
        </View>
      </Modal>
      
      {/* Modal de Video */}
      <Modal
        visible={showVideoModal}
        transparent
        animationType="fade"
       
        onRequestClose={closeVideoModal}
      >
        <View style={styles.videoModalBg}>
          <View style={styles.videoModalContent}>
            <View style={styles.videoModalHeader}>
              <Text style={styles.videoModalTitle} numberOfLines={1}>
                {exerciseForVideo?.nombre || t('exercise.video')}
              </Text>
              <TouchableOpacity onPress={closeVideoModal} style={styles.videoModalCloseBtn}>
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {isGeneratingVideo ? (
              <View style={styles.videoGeneratingContainer}>
                <ActivityIndicator size="large" color="#E91E63" />
                <Text style={styles.videoGeneratingText}>{t('exercise.generatingVideo')}</Text>
              </View>
            ) : videoUrl ? (
              <>
                <View style={styles.videoPlayerContainer}>
                  <VideoView
                    player={videoPlayer}
                    style={styles.videoPlayer}
                    contentFit="contain"
                    nativeControls
                  />
                </View>
                {/* Botón de descarga */}
                <TouchableOpacity
                  style={styles.videoDownloadBtn}
                  onPress={downloadVideo}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Feather name="download" size={20} color="#fff" />
                  )}
                  <Text style={styles.videoDownloadBtnText}>
                    {isDownloading ? t('video.downloading') : t('video.download')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
      
      {/* Pre-Wellness Detail Modal */}
      <PreWellnessDetailModal
        visible={showPreWellnessDetail}
        session={session}
        onClose={() => {
          setShowPreWellnessDetail(false);
          loadPreWellnessStats(); // Recargar stats cuando se cierre
        }}
        onUpdate={(newExpectedPreWellness) => {
          loadPreWellnessStats(); // Recargar stats
        }}
      />
      
      {/* Wellness Detail Modal */}
      <WellnessDetailModal
        visible={showWellnessDetail}
        session={session}
        onClose={() => {
          setShowWellnessDetail(false);
          loadWellnessStats(); // Recargar stats cuando se cierre
        }}
        onUpdate={(newExpectedWellness) => {
          loadWellnessStats(); // Recargar stats
          if (onWellnessUpdate) onWellnessUpdate(newExpectedWellness); // Notificar al padre
        }}
      />

      {/* Visor de ejercicio de fuerza */}
      <StrengthExerciseViewer
        visible={!!strengthViewerExercise}
        onClose={() => setStrengthViewerExercise(null)}
        exercise={strengthViewerExercise}
      />
    </Modal>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '95%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  viewModalContentTablet: {
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
  modalEditButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  modalCloseBtn: {
    padding: 4,
  },
  headerSecondaryButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  modalBody: {
    padding: 20,
  },
  
  // Session Detail Card (header con fecha) - igual que training.js
  sessionDetailCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sessionDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionDetailTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  
  // Detail Section - igual que training.js
  detailSection: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '50',
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  detailPlayersRow: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  detailPlayersLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.success,
    marginBottom: 6,
  },
  detailPlayersLabelExtra: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.warning,
    marginBottom: 6,
  },
  detailPlayersText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  
  // Session Info Card
  sessionInfoCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sessionInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sessionInfoTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sessionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sessionInfoItem: {
    alignItems: 'center',
    gap: 4,
  },
  sessionInfoLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  sessionInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  
  // Section Card
  sectionCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sectionContent: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  
  // Exercise Card
  exerciseCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  exerciseOrderBadge: {
    position: 'absolute',
    top: -8,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  exerciseOrderText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseImageContainer: {
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  exerciseImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  // Strength exercises grid
  strengthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
    justifyContent: 'center',
  },
  strengthGridCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  strengthGridImageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strengthGridImage: {
    width: '100%',
    height: '100%',
  },
  strengthGridInfo: {
    padding: 6,
  },
  strengthGridName: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 14,
    marginBottom: 4,
  },
  strengthGridTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  strengthGridTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  strengthGridTagText: {
    fontSize: 9,
    fontWeight: '600',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 4,
  },
  zoomBadgeWithText: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoomBadgeText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  exerciseInfo: {
    marginTop: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  exerciseTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  exerciseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  exerciseTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  exerciseDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  // Sección de detalles del ejercicio (descripción, objetivo, duración)
  exerciseDetailsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  exerciseDetailText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },
  exerciseDetailLabel: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  observacionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    padding: 10,
    backgroundColor: theme.colors.warningSoft,
    borderRadius: 8,
  },
  observacionText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  
  // Rest Time Card
  restTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
    marginBottom: 12,
    backgroundColor: theme.colors.warningSoft,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.warning + '60',
  },
  restTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.warningSoftText,
  },
  
  // PDF Button
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  pdfButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Delete Button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
    gap: 8,
    marginTop: 24,
    marginBottom: 20,
  },
  deleteButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Image Modal (fullscreen image viewer - dark backdrop kept literal intentionally)
  imageModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeImageText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
  },
  fullImage: {
    width: '95%',
    height: '80%',
    borderRadius: 12,
  },
  imageZoomWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Estilos para botón de video en ejercicio (brand pink kept literal)
  exerciseVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E91E63',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  exerciseVideoBtnInactive: {
    backgroundColor: theme.colors.textMuted,
  },
  exerciseVideoBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Modal de video (dark video player UI - colors kept literal intentionally)
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
  videoDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  videoDownloadBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Wellness styles
  wellnessSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  wellnessDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  wellnessDetailBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  wellnessStatsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  wellnessStatBox: {
    flex: 1,
    backgroundColor: theme.colors.inputBg,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  wellnessStatLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  wellnessStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  wellnessLinkActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.successSoft,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  wellnessLinkActiveText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '500',
  },
  preWellnessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preWellnessBadge: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  preWellnessBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  
  // Team Assignments styles
  teamAssignmentsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  teamAssignmentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  teamAssignmentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  teamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teamBox: {
    minWidth: 160,
    flex: 1,
    maxWidth: '100%',
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  teamBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  teamBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  teamBoxCount: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  teamBoxPlayers: {
    padding: 10,
  },
  teamPlayerName: {
    fontSize: 13,
    color: theme.colors.text,
    paddingVertical: 3,
    lineHeight: 18,
  },
});
