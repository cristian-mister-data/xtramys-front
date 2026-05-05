import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, Alert, TouchableOpacity, Image, Platform, ActivityIndicator, Modal, TextInput, ScrollView, BackHandler, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLayout from '@/vendor/shared/appLayout';
import CreateExerciseForm from './createExerciseForm';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEjerciciosUsuario, createEjercicio, updateEjercicio, deleteEjercicio, duplicateGlobalExercise, fetchGlobalExercises, fetchGlobalFolders } from '@/store/slices/exercise/exerciseThunks';
import { fetchExerciseFolders, fetchExerciseFolderById, createExerciseFolder, updateExerciseFolder, deleteExerciseFolder, moveExerciseToFolder, duplicateExerciseToFolder, fetchExerciseFoldersFlat } from '@/store/slices/exercise/exerciseThunks';
import { clearCurrentFolder } from '@/store/slices/exercise/exerciseSlice';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Base64ImagePreview, { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';
import ImageZoom from 'react-native-image-pan-zoom';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getVideosByExercise, getVideoStreamUrl, getVideoDownloadUrl, regenerateVideoWithField, unlinkVideoFromExercise, getVideoForEdit, duplicateVideoForEdit } from '@/utils/api';
import { savePdfToDownloads } from '@/utils/pdfDownload';
import { getFieldById } from '@/utils/fieldTypes';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import {
  saveFormDraft,
  loadFormDraft,
  clearFormDraft,
  STORAGE_KEYS,
} from '@/utils/formPersistence';

// Tamaños de campo para móvil/tablet
const FIELD_WIDTH_MOBILE = 80;
const FIELD_HEIGHT_MOBILE = 48;
const FIELD_WIDTH = 110;
const FIELD_HEIGHT = 66;
const DETAIL_FIELD_WIDTH_MOBILE = 160;
const DETAIL_FIELD_HEIGHT_MOBILE = 96;
const DETAIL_FIELD_WIDTH = 220;
const DETAIL_FIELD_HEIGHT = 132;

function ExerciseDetail({ exercise, onBack, navigation, onEdit, onDelete, onEditVideo, userRole }) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;
  const IS_TABLET = screenWidth > 700;
  const showField = (exercise.elementosCampo && exercise.elementosCampo.length > 0 && exercise.tipoCampo) || exercise.imagen;
  const dispatch = useDispatch();

  // Zoom modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const { width, height } = useWindowDimensions();
  
  // Video states
  const [exerciseVideos, setExerciseVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const visibleVideos = exerciseVideos.slice(0, 1);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  
  // Video player hook
  const player = useVideoPlayer(videoUrl || '', player => {
    if (videoUrl) {
      player.loop = true;
      player.play();
    }
  });
  
  // Cargar videos del ejercicio
  useEffect(() => {
    const loadVideos = async () => {
      if (exercise?._id) {
        setLoadingVideos(true);
        try {
          const videos = await getVideosByExercise(exercise._id);
          setExerciseVideos(videos || []);
        } catch (error) {
          console.error('Error cargando videos:', error);
          setExerciseVideos([]);
        } finally {
          setLoadingVideos(false);
        }
      }
    };
    loadVideos();
  }, [exercise?._id]);
  
  // Función para reproducir video
  const handlePlayVideo = async (video) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
    setIsGenerating(true);
    
    try {
      // Obtener la imagen del campo basada en fieldType
      const field = getFieldById(video.fieldType);
      let fieldImageData = null;
      
      if (field && field.image) {
        // Convertir la imagen a base64
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
      
      // Regenerar el video con la imagen del campo
      const result = await regenerateVideoWithField(video._id, fieldImageData);
      
      if (result.success && result.videoId) {
        const streamUrl = getVideoStreamUrl(result.videoId);
        setVideoUrl(streamUrl);
      }
    } catch (error) {
      console.error('Error reproduciendo video:', error);
      Alert.alert(t('message.error'), t('exercise.videoPlayError'));
      setShowVideoModal(false);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Función para descargar video
  const handleDownloadVideo = async (video) => {
    if (downloadingVideo) return;
    
    setDownloadingVideo(true);
    try {
      // Primero regenerar el video
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
        const downloadUrl = getVideoDownloadUrl(result.videoId);
        const fileName = `${video.nombre || t('exercise.video')}.mp4`;
        const fileUri = FileSystem.documentDirectory + fileName;
        
        const downloadResumable = FileSystem.createDownloadResumable(
          downloadUrl,
          fileUri
        );
        
        const downloadResult = await downloadResumable.downloadAsync();
        if (downloadResult && downloadResult.uri) {
          if (Platform.OS === 'android') {
            try {
              const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
              await MediaLibrary.createAlbumAsync('xtramys', asset, false);
              Alert.alert(t('message.success'), t('video.savedToGallery'));
            } catch (saveErr) {
              const isAvailable = await Sharing.isAvailableAsync();
              if (isAvailable) {
                await Sharing.shareAsync(downloadResult.uri, { mimeType: 'video/mp4' });
              } else {
                throw saveErr;
              }
            }
          } else {
            const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
            await MediaLibrary.createAlbumAsync('xtramys', asset, false);
            Alert.alert(t('message.success'), t('video.savedToGallery'));
          }
        }
      }
    } catch (error) {
      console.error('Error descargando video:', error);
      Alert.alert(t('message.error'), t('video.downloadError'));
    } finally {
      setDownloadingVideo(false);
    }
  };
  
  // Desasociar video del ejercicio
  const handleUnlinkVideo = async (video) => {
Alert.alert(
      t('exercise.unlinkVideoTitle'),
      t('exercise.unlinkVideoMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.unlink'),
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkVideoFromExercise(video._id, exercise._id);
              // Recargar la lista de videos
              const videos = await getVideosByExercise(exercise._id);
              setExerciseVideos(videos || []);
              Alert.alert(t('message.success'), t('exercise.videoUnlinked'));
            } catch (error) {
              console.error('Error desasociando video:', error);
              Alert.alert(t('message.error'), t('exercise.unlinkVideoError'));
            }
          }
        }
      ]
    );
  };
  
  // Cerrar modal de video
  const closeVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
    setVideoUrl(null);
  };

  // Función para generar y compartir PDF con campo a página completa
  const generatePDF = async () => {
    try {
      // Preparar la imagen
      let imageBase64 = '';
      if (exercise.imagen) {
        const normalizedImage = normalizeImageSource(exercise.imagen, { cacheBust: false });
        if (normalizedImage.startsWith('http')) {
          // Si es URL, intentar descargar
          try {
            const response = await fetch(normalizedImage);
            const blob = await response.blob();
            const reader = new FileReader();
            imageBase64 = await new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          } catch (error) {
            console.error('Error descargando imagen:', error);
          }
        } else {
          imageBase64 = normalizedImage;
        }
      }

      // Crear HTML para el PDF - Campo grande con información del ejercicio
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @page {
              size: A4 landscape;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              height: 100vh;
              background: #f8f9fa;
            }
            .header {
              background: linear-gradient(135deg, #2e7d32 0%, #4CAF50 100%);
              color: white;
              padding: 10px 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .title {
              font-size: 20px;
              font-weight: bold;
            }
            .duration {
              font-size: 14px;
              background: rgba(255,255,255,0.2);
              padding: 5px 12px;
              border-radius: 20px;
            }
            .main-content {
              flex: 1;
              display: flex;
              padding: 10px;
              gap: 15px;
              overflow: hidden;
            }
            .image-container {
              flex: 2;
              display: flex;
              justify-content: center;
              align-items: center;
              background: white;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              padding: 10px;
            }
            .image-container img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              border-radius: 6px;
            }
            .info-panel {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 8px;
              max-width: 280px;
              overflow-y: auto;
            }
            .info-card {
              background: white;
              border-radius: 8px;
              padding: 10px 12px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            }
            .info-card-title {
              font-size: 10px;
              font-weight: bold;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 4px;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .info-card-content {
              font-size: 13px;
              color: #333;
              line-height: 1.4;
            }
            .stats-row {
              display: flex;
              gap: 8px;
            }
            .stat-item {
              flex: 1;
              background: white;
              border-radius: 8px;
              padding: 8px 10px;
              text-align: center;
              box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            }
            .stat-value {
              font-size: 18px;
              font-weight: bold;
              color: #2e7d32;
            }
            .stat-label {
              font-size: 9px;
              color: #666;
              text-transform: uppercase;
            }
            .type-badge {
              display: inline-block;
              background: #fff3e0;
              color: #f57c00;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
            }
            .footer {
              background: #333;
              color: white;
              padding: 6px 20px;
              font-size: 10px;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${exercise.nombre || t('exercise.exercise')}</div>
            ${exercise.tiempo ? `<div class="duration">${exercise.tiempo} min</div>` : ''}
          </div>
          
          <div class="main-content">
            <div class="image-container">
              ${imageBase64 ? `<img src="${imageBase64}" alt="${t('exercise.diagramAlt')}" />` : `<p style=\"color:#999\">${t('exercise.noImage')}</p>`}
            </div>
            
            <div class="info-panel">
              ${(exercise.numeroJugadores || exercise.equipos || exercise.dimensiones) ? `
              <div class="stats-row">
                ${exercise.numeroJugadores ? `
                <div class="stat-item">
                  <div class="stat-value">${exercise.numeroJugadores}</div>
                  <div class="stat-label">${t('exercise.players')}</div>
                </div>` : ''}
                ${exercise.equipos ? `
                <div class="stat-item">
                  <div class="stat-value">${exercise.equipos}</div>
                  <div class="stat-label">${t('exercise.teams')}</div>
                </div>` : ''}
              </div>` : ''}
              
              ${exercise.dimensiones ? `
              <div class="info-card">
                <div class="info-card-title">📐 ${t('exercise.fieldDimensions')}</div>
                <div class="info-card-content">${exercise.dimensiones}</div>
              </div>` : ''}
              
              ${exercise.objetivo ? `
              <div class="info-card">
                <div class="info-card-title">🎯 ${t('exercise.objective')}</div>
                <div class="info-card-content">${exercise.objetivo}</div>
              </div>` : ''}
              
              ${exercise.descripcion ? `
              <div class="info-card">
                <div class="info-card-title">📝 ${t('exercise.description')}</div>
                <div class="info-card-content">${exercise.descripcion}</div>
              </div>` : ''}
            </div>
          </div>
          
          <div class="footer">
            <span>Xtramys</span>
            <span>${new Date().toLocaleDateString()}</span>
          </div>
        </body>
        </html>
      `;

      // Generar PDF en landscape
      const { uri: tempUri } = await Print.printToFileAsync({ 
        html: htmlContent,
        orientation: Print.Orientation.landscape
      });
      
      // Copiar el archivo con el nombre del ejercicio
      const fileName = `${(exercise.nombre || t('exercise.exercise')).replace(/[/\?%*:|"<>]/g, '-')}.pdf`;
      await savePdfToDownloads(tempUri, fileName);
    } catch (error) {
      console.error('Error generando PDF:', error);
      Alert.alert(t('message.error'), t('exercise.pdfGenerateError'));
    }
  };

  // Función para guardar la imagen del campo en la galería
  const saveImageToGallery = async () => {
    try {
      if (!exercise.imagen) {
        Alert.alert(t('message.error'), t('exercise.imageSaveError'));
        return;
      }

      let imageUri = '';
      
      if (exercise.imagen.startsWith('http')) {
        // Si es URL, descargar primero
        const fileName = `exercise_${exercise.nombre || t('exercise.imageLabel')}_${Date.now()}.png`;
        const fileUri = FileSystem.documentDirectory + fileName;
        
        const downloadResult = await FileSystem.downloadAsync(
          exercise.imagen,
          fileUri
        );
        imageUri = downloadResult.uri;
      } else {
        // Si es base64, convertir a archivo
        const fileName = `exercise_${exercise.nombre || t('exercise.imageLabel')}_${Date.now()}.png`;
        const fileUri = FileSystem.documentDirectory + fileName;
        
        let base64Data = exercise.imagen;
        if (base64Data.startsWith('data:image')) {
          base64Data = base64Data.split(',')[1];
        }
        
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        imageUri = fileUri;
      }

      if (Platform.OS === 'android') {
        try {
          const asset = await MediaLibrary.createAssetAsync(imageUri);
          await MediaLibrary.createAlbumAsync('xtramys', asset, false);
          Alert.alert(t('message.success'), t('exercise.imageSaved'));
        } catch (saveErr) {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(imageUri, { mimeType: 'image/png' });
          } else {
            throw saveErr;
          }
        }
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('video.permissionTitle'), t('video.permissionRequired'));
          return;
        }
        const asset = await MediaLibrary.createAssetAsync(imageUri);
        await MediaLibrary.createAlbumAsync('xtramys', asset, false);
        Alert.alert(t('message.success'), t('exercise.imageSaved'));
      }
    } catch (error) {
      console.error('Error guardando imagen:', error);
      Alert.alert(t('message.error'), t('exercise.imageSaveError'));
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent
      onRequestClose={onBack}
    >
      <View style={styles.modalBg}>
        <View style={IS_TABLET ? styles.modalContentTablet : styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('exercise.detailsTitle')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {showField && (
                <>
                  <TouchableOpacity
                    style={styles.modalPdfButton}
                    onPress={generatePDF}
                  >
                    <MaterialIcons name="picture-as-pdf" size={20} color="#d32f2f" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalImageButton}
                    onPress={saveImageToGallery}
                  >
                    <MaterialIcons name="image" size={20} color="#4CAF50" />
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={styles.modalEditButton}
                onPress={() => onEdit(exercise)}
              >
                <MaterialIcons name="edit" size={20} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={onBack}
              >
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.exerciseDetailCard}>
              <View style={styles.exerciseDetailHeader}>
                <MaterialIcons name="fitness-center" size={24} color="#3578e5" />
                <Text style={styles.exerciseDetailTitle}>{exercise.nombre}</Text>
                <View style={styles.exerciseDurationBadge}>
                  <Ionicons name="time-outline" size={16} color="#3578e5" />
                  <Text style={styles.exerciseDurationText}>{exercise.tiempo} min</Text>
                </View>
              </View>
            </View>

            {/* Imagen del campo */}
            {showField && (
              <View style={styles.detailSection}>
              <TouchableOpacity 
                onPress={() => {
                  setSelectedImage(exercise?.imagen);
                  setModalVisible(true);
                }}
                style={styles.fieldImageWrapper}
              >
                <Base64ImagePreview
                  imageUrl={exercise?.imagen}
                  forceWidth={IS_MOBILE ? DETAIL_FIELD_WIDTH_MOBILE : DETAIL_FIELD_WIDTH}
                  forceHeight={IS_MOBILE ? DETAIL_FIELD_HEIGHT_MOBILE : DETAIL_FIELD_HEIGHT}
                />
                <View style={styles.zoomOverlay}>
                  <MaterialIcons name="zoom-in" size={24} color="#fff" />
                </View>
              </TouchableOpacity>
              </View>
            )}

            <View style={styles.detailSection}>
              {/* Stats superiores con iconos */}
              <View style={styles.statsRow}>
                {exercise.numeroJugadores && (
                  <View style={[styles.statCard, styles.playersStat]}>
                    <Ionicons name="people" size={20} color="#4CAF50" />
                    <View style={styles.statContent}>
                      <Text style={styles.statValue}>{exercise.numeroJugadores}</Text>
                      <Text style={styles.statLabel}>{t('exercise.players')}</Text>
                    </View>
                  </View>
                )}
                {exercise.equipos && (
                  <View style={[styles.statCard, styles.teamsStat]}>
                    <Ionicons name="flag" size={20} color="#FF9800" />
                    <View style={styles.statContent}>
                      <Text style={styles.statValue}>{exercise.equipos}</Text>
                      <Text style={styles.statLabel}>{t('exercise.teams')}</Text>
                    </View>
                  </View>
                )}
                {exercise.dimensiones && (
                  <View style={[styles.statCard, styles.dimensionsStat]}>
                    <Ionicons name="resize-outline" size={20} color="#673AB7" />
                    <View style={styles.statContent}>
                      <Text style={styles.statValue}>{exercise.dimensiones}</Text>
                      <Text style={styles.statLabel}>{t('exercise.fieldDimensions')}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Información detallada con nuevo diseño */}
              <View style={styles.detailsSection}>

              {exercise.objetivo && (
                <View style={styles.detailCard}>
                  <View style={styles.detailCardHeader}>
                    <Ionicons name="radio-button-on" size={18} color="#2196F3" />
                    <Text style={styles.detailCardTitle}>Objetivo</Text>
                  </View>
                  <Text style={styles.detailCardContent}>{exercise.objetivo}</Text>
                </View>
              )}

              {exercise.descripcion && (
                <View style={{...styles.detailCard, marginBottom: exerciseVideos.length > 0 ? 16 : 40}}>
                  <View style={styles.detailCardHeader}>
                    <Ionicons name="document-text-outline" size={18} color="#9C27B0" />
                    <Text style={styles.detailCardTitle}>{t('exercise.description')}</Text>
                  </View>
                  <Text style={styles.detailCardContent}>{exercise.descripcion}</Text>
                </View>
              )}
              
              {/* Sección de Videos del Ejercicio */}
              <View style={{...styles.detailCard, marginBottom: 40}}>
                  <View style={styles.detailCardHeader}>
                    <Feather name="video" size={18} color="#E91E63" />
                    <Text style={styles.detailCardTitle}>{t('exercise.videos')}</Text>
                    {loadingVideos && <ActivityIndicator size="small" color="#E91E63" style={{ marginLeft: 8 }} />}
                  </View>
                  {!loadingVideos && exerciseVideos.length > 0 && (
                    <View style={styles.videosGrid}>
                      {visibleVideos.map((video) => (
                        <View key={video._id} style={[styles.videoCard, IS_MOBILE && styles.videoCardMobile]}>
                          {/* Botón de desasociar */}
                          {!(exercise?.isGlobal && userRole !== 'admin') && (
                            <TouchableOpacity
                              style={styles.videoUnlinkBtn}
                              onPress={() => handleUnlinkVideo(video)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Feather name="x" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                          <View style={styles.videoCardContent}>
                            <Feather name="film" size={28} color="#E91E63" />
                            <Text style={styles.videoCardTitle} numberOfLines={1}>
                              {video.nombre}
                            </Text>
                            {video.descripcion && (
                              <Text style={styles.videoCardDescription} numberOfLines={2}>
                                {video.descripcion}
                              </Text>
                            )}
                          </View>
                          <View style={styles.videoCardActions}>
                            <TouchableOpacity
                              style={[styles.videoActionBtn, styles.videoEditBtn]}
                              onPress={() => onEditVideo && onEditVideo(video, exercise)}
                            >
                              <Feather name="edit-3" size={16} color="#fff" />
                              <Text style={styles.videoActionText}>{t('edition.edit')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.videoActionBtn, styles.videoPlayBtn]}
                              onPress={() => handlePlayVideo(video)}
                            >
                              <Feather name="play" size={16} color="#fff" />
                              <Text style={styles.videoActionText}>{t('exercise.play')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.videoActionBtn, styles.videoDownloadBtn]}
                              onPress={() => handleDownloadVideo(video)}
                              disabled={downloadingVideo}
                            >
                              {downloadingVideo ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Feather name="download" size={16} color="#fff" />
                                  <Text style={styles.videoActionText}>{t('exercise.download')}</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {!loadingVideos && exerciseVideos.length === 0 && (
                    <Text style={styles.noVideosText}>{t('exercise.noVideos')}</Text>
                  )}
              </View>
              </View>
            </View>

          </ScrollView>
        </View>
      </View>

      {/* Modal de reproducción de video */}
      <Modal
        visible={showVideoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeVideoModal}
      >
        <View style={styles.videoModalBg}>
          <View style={styles.videoModalContent}>
            <View style={styles.videoModalHeader}>
              <Text style={styles.videoModalTitle} numberOfLines={1}>
                {selectedVideo?.nombre || t('exercise.video')}
              </Text>
              <TouchableOpacity
                style={styles.videoModalCloseBtn}
                onPress={closeVideoModal}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {isGenerating ? (
              <View style={styles.videoLoadingContainer}>
                <ActivityIndicator size="large" color="#E91E63" />
                <Text style={styles.videoLoadingText}>{t('exercise.generatingVideo')}</Text>
              </View>
            ) : videoUrl ? (
              <View style={styles.videoPlayerContainer}>
                <VideoView
                  player={player}
                  style={styles.videoPlayer}
                  contentFit="contain"
                  nativeControls={true}
                />
              </View>
            ) : null}
            
            <View style={styles.videoModalActions}>
              <TouchableOpacity
                style={[styles.videoModalBtn, styles.videoModalDownloadBtn]}
                onPress={() => selectedVideo && handleDownloadVideo(selectedVideo)}
                disabled={downloadingVideo || isGenerating}
              >
                {downloadingVideo ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="download" size={18} color="#fff" />
                    <Text style={styles.videoModalBtnText}>{t('exercise.saveToGallery')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de imagen grande con zoom */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.9)',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 40,
              right: 32,
              zIndex: 20,
              backgroundColor: '#fff',
              borderRadius: 24,
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              elevation: 8,
            }}
            onPress={() => setModalVisible(false)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 26, color: '#333', fontWeight: 'bold' }}>×</Text>
          </TouchableOpacity>
          {selectedImage &&
            <ImageZoom
              cropWidth={width}
              cropHeight={height}
              imageWidth={width * 0.95}
              imageHeight={height * 0.8}
              enableCenterFocus={true}
              minScale={1}
              maxScale={4}
            >
              <Image
                source={{ uri: (() => {
                  return normalizeImageSource(selectedImage);
                })() }}
                style={{
                  width: width * 0.95,
                  height: height * 0.8,
                  resizeMode: 'contain',
                  borderRadius: 20,
                  backgroundColor: 'transparent',
                }}
              />
            </ImageZoom>
          }
          <Text style={{
            position: 'absolute', bottom: 24, color: '#fff', textAlign: 'center', width: '100%', fontWeight: 'bold'
          }}>
            {t('exercise.zoomHint')}
          </Text>
        </View>
      </Modal>
    </Modal>
  );
}

function FolderManagement({ 
  folders,
  foldersFlat,
  onBack,
  dispatch,
  createFolder,
  updateFolder,
  deleteFolder,
  fetchFolders,
  fetchFoldersFlat,
  idUsuario,
  IS_MOBILE,
}) {
  const { t } = useTranslation();
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#2196F3');
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [editingFolderColor, setEditingFolderColor] = useState('#2196F3');

  // Navegación de subcarpetas
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]); // [{_id, nombre, color}]
  const currentDepth = folderPath.length; // 0 = root, 1 = subfolder (max 2 levels)

  const FOLDER_COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B'];

  // Carpetas del nivel actual
  const displayedFolders = useMemo(() => {
    const all = foldersFlat || folders || [];
    if (!currentFolderId) {
      return all.filter(f => !f.parentFolder);
    }
    return all.filter(f => {
      const pid = typeof f.parentFolder === 'object' ? (f.parentFolder?._id || f.parentFolder) : f.parentFolder;
      return pid === currentFolderId;
    });
  }, [folders, foldersFlat, currentFolderId]);

  const navigateToFolder = (folder) => {
    setFolderPath(prev => [...prev, { _id: folder._id, nombre: folder.nombre, color: folder.color }]);
    setCurrentFolderId(folder._id);
    setCreatingFolder(false);
    setEditingFolder(null);
  };

  const navigateBackFolder = () => {
    const newPath = folderPath.slice(0, -1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1]._id : null);
    setCreatingFolder(false);
    setEditingFolder(null);
  };

  const navigateToRoot = () => {
    setFolderPath([]);
    setCurrentFolderId(null);
    setCreatingFolder(false);
    setEditingFolder(null);
  };

  const navigateToBreadcrumb = (index) => {
    if (index < 0) { navigateToRoot(); return; }
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath[newPath.length - 1]._id);
    setCreatingFolder(false);
    setEditingFolder(null);
  };

  const handleCreate = async () => {
    if (!newFolderName.trim()) {
      Alert.alert(t('message.error'), t('folders.nameRequired'));
      return;
    }
    try {
      await dispatch(createFolder({ nombre: newFolderName.trim(), parentFolder: currentFolderId, color: newFolderColor })).unwrap();
      setNewFolderName('');
      setNewFolderColor('#2196F3');
      setCreatingFolder(false);
      // Recargar para reflejar cambios
      if (fetchFolders) dispatch(fetchFolders());
      if (fetchFoldersFlat) dispatch(fetchFoldersFlat());
    } catch (e) { Alert.alert(t('message.error'), e.message || t('folders.createError')); }
  };

  const handleUpdate = async () => {
    if (!editingFolderName.trim()) {
      Alert.alert(t('message.error'), t('folders.nameRequired'));
      return;
    }
    try {
      await dispatch(updateFolder({ id: editingFolder._id, nombre: editingFolderName.trim(), color: editingFolderColor })).unwrap();
      setEditingFolder(null);
      setEditingFolderName('');
      if (fetchFolders) dispatch(fetchFolders());
      if (fetchFoldersFlat) dispatch(fetchFoldersFlat());
    } catch (e) { Alert.alert(t('message.error'), e.message || t('folders.updateError')); }
  };

  const handleDeleteFolder = (folder) => {
    Alert.alert(t('message.warning'), t('folders.deleteConfirmation', { name: folder.nombre }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try {
          await dispatch(deleteFolder(folder._id)).unwrap();
          if (fetchFolders) dispatch(fetchFolders());
          if (fetchFoldersFlat) dispatch(fetchFoldersFlat());
        } catch (e) { Alert.alert(t('message.error'), e.message); }
      }}
    ]);
  };

  const handleBack = () => {
    if (currentFolderId) {
      navigateBackFolder();
    } else {
      onBack();
    }
  };

  return (
    <AppLayout scrollEnabled={false}>
      <View style={{ flex: 1, backgroundColor: '#f8f9fa', padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
          <TouchableOpacity onPress={handleBack} style={{ marginRight: 16, padding: 8, borderRadius: 8, backgroundColor: '#fff', elevation: 2 }}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#333', flex: 1 }}>
            {t('folders.manageFolders')}
          </Text>
          {/* Ocultar botón crear subcarpeta si estamos en depth >= 2 (max 2 niveles) */}
          {currentDepth < 2 && (
            <TouchableOpacity onPress={() => setCreatingFolder(true)} style={{ backgroundColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 2 }}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: IS_MOBILE ? 14 : 16 }}>
                {currentFolderId ? t('folders.createSubfolder') : t('common.create')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Breadcrumbs */}
        {folderPath.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingVertical: 8, paddingHorizontal: 8, backgroundColor: '#fff', borderRadius: 10, marginBottom: 12, gap: 4, elevation: 1 }}>
            <TouchableOpacity onPress={navigateToRoot} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6 }}>
              <Ionicons name="home" size={14} color="#3578e5" />
              <Text style={{ fontSize: 12, color: '#3578e5', fontWeight: '600' }}>{t('folders.root')}</Text>
            </TouchableOpacity>
            {folderPath.map((crumb, index) => (
              <View key={crumb._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="chevron-forward" size={12} color="#94a3b8" />
                <TouchableOpacity
                  onPress={() => index < folderPath.length - 1 ? navigateToBreadcrumb(index) : null}
                  disabled={index === folderPath.length - 1}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6 }}>
                  <Ionicons name="folder" size={12} color={crumb.color || '#3578e5'} />
                  <Text style={{ fontSize: 12, color: index === folderPath.length - 1 ? '#1e293b' : '#3578e5', fontWeight: index === folderPath.length - 1 ? '700' : '600' }} numberOfLines={1}>
                    {crumb.nombre}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Info depth máximo */}
        {currentDepth >= 2 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF3E0', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <Ionicons name="information-circle" size={20} color="#FF9800" />
            <Text style={{ fontSize: 13, color: '#E65100', fontWeight: '500', flex: 1 }}>{t('folders.maxDepthReached')}</Text>
          </View>
        )}

        <KeyboardAwareScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {creatingFolder && (
            <View style={{ marginBottom: 20, backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#4CAF50' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 }}>
                {currentFolderId ? t('folders.createSubfolder') : t('folders.createFolder')}
              </Text>
              <TextInput
                style={{ borderWidth: 2, borderColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff', marginBottom: 12 }}
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder={t('folders.folderNamePlaceholder')}
                autoFocus={true}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {FOLDER_COLORS.map((color) => (
                  <TouchableOpacity key={color} onPress={() => setNewFolderColor(color)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, borderWidth: newFolderColor === color ? 3 : 0, borderColor: '#333' }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                <TouchableOpacity onPress={() => { setCreatingFolder(false); setNewFolderName(''); }} style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12 }}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreate} style={{ backgroundColor: '#4CAF50', borderRadius: 8, padding: 12 }}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {displayedFolders.length === 0 && !creatingFolder && (
            <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="folder-open-outline" size={64} color="#ccc" />
              <Text style={{ color: '#666', fontSize: 18, fontStyle: 'italic', marginTop: 16, textAlign: 'center' }}>
                {currentFolderId ? t('folders.emptyFolder') : t('folders.noFolders')}
              </Text>
              {!currentFolderId && <Text style={{ color: '#999', fontSize: 14, marginTop: 8, textAlign: 'center' }}>{t('folders.useCreateButton')}</Text>}
            </View>
          )}

          {displayedFolders.map((folder) => (
            <View key={folder._id} style={{ marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 3, borderLeftWidth: 4, borderLeftColor: folder.color || '#2196F3' }}>
              {editingFolder?._id === folder._id ? (
                <View>
                  <TextInput
                    style={{ borderWidth: 2, borderColor: '#2196F3', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 12 }}
                    value={editingFolderName}
                    onChangeText={setEditingFolderName}
                    placeholder={t('folders.folderNamePlaceholder')}
                    autoFocus={true}
                  />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    {FOLDER_COLORS.map((color) => (
                      <TouchableOpacity key={color} onPress={() => setEditingFolderColor(color)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, borderWidth: editingFolderColor === color ? 3 : 0, borderColor: '#333' }} />
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                    <TouchableOpacity onPress={() => setEditingFolder(null)} style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12 }}>
                      <Ionicons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleUpdate} style={{ backgroundColor: '#4CAF50', borderRadius: 8, padding: 12 }}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  onPress={() => { if (currentDepth < 2) navigateToFolder(folder); }}
                  activeOpacity={currentDepth < 2 ? 0.7 : 1}
                >
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: (folder.color || '#2196F3') + '18', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="folder" size={26} color={folder.color || '#2196F3'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>{folder.nombre}</Text>
                      <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                        {folder.exerciseCount || 0} {t('folders.items')} {folder.subfolderCount > 0 ? `· ${folder.subfolderCount} ${t('folders.subfolders')}` : ''}
                      </Text>
                    </View>
                    {currentDepth < 2 && <Ionicons name="chevron-forward" size={18} color="#ccc" style={{ marginRight: 8 }} />}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); setEditingFolder(folder); setEditingFolderName(folder.nombre); setEditingFolderColor(folder.color || '#2196F3'); }} style={{ backgroundColor: '#E3F2FD', borderRadius: 8, padding: 12 }}>
                      <Ionicons name="pencil" size={18} color="#2196F3" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }} style={{ backgroundColor: '#FFEBEE', borderRadius: 8, padding: 12 }}>
                      <Ionicons name="trash" size={18} color="#FF5722" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </KeyboardAwareScrollView>
      </View>
    </AppLayout>
  );
}

// Mejorada: solo muestra el campo si hay elementosCampo y tipoCampo
function ExerciseCard({ exercise, onPress, onLongPress, forceWidth = null, forceHeight = null, isGrid = false, onOpenOptions }) {
  const { width: screenWidth } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;
  const showField = (exercise.elementosCampo && exercise.elementosCampo.length > 0 && exercise.tipoCampo) || exercise.imagen;
  
  return (
    <View style={[
      styles.exerciseCard,
      IS_MOBILE && styles.exerciseCardMobile,
      isGrid && styles.exerciseCardGrid,
      isGrid && IS_MOBILE && styles.exerciseCardGridMobile,
      { minHeight: forceHeight || (IS_MOBILE ? 60 : 74) }
    ]}>
      <Pressable
        onPress={() => onPress(exercise)}
        style={({ pressed }) => [
          styles.exerciseCardContent,
          pressed && styles.exerciseCardPressed,
        ]}
      >
      {/* En modo grid: SIEMPRE mostrar contenedor de imagen arriba con tags debajo, luego info */}
      {isGrid && (
        <View
          style={{
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
            minHeight: IS_MOBILE ? 120 : 150, // Altura fija total para imagen + tags
          }}
        >
          <View style={{ marginBottom: 2, alignItems: 'center', justifyContent: 'center', width: '100%', height: IS_MOBILE ? 80 : 100, backgroundColor: 'transparent' }}>
            {showField && (
              <Base64ImagePreview
                imageUrl={exercise?.imagen}
                forceWidth={IS_MOBILE ? 110 : 140}
                forceHeight={IS_MOBILE ? 66 : 84}
              />
            )}
          </View>

          {/* Contenedor de tags con altura fija */}
          <View style={{ height: IS_MOBILE ? 32 : 40, justifyContent: 'center', alignItems: 'center' }}>
            {(exercise.numeroJugadores || exercise.equipos) && (
              <View style={[styles.infoTagsContainer, styles.infoTagsContainerGrid]}>
                {exercise.numeroJugadores && (
                  <View style={[styles.infoTag, styles.infoTagGrid, { backgroundColor: '#e3f2fd' }]}>
                    <Ionicons name="people" size={11} color="#1976d2" />
                    <Text style={[styles.infoTagText, styles.infoTagTextGrid, { color: '#1976d2' }]}>{exercise.numeroJugadores}</Text>
                  </View>
                )}
                {exercise.equipos && (
                  <View style={[styles.infoTag, styles.infoTagGrid, { backgroundColor: '#f3e5f5' }]}>
                    <Ionicons name="flag" size={11} color="#7b1fa2" />
                    <Text style={[styles.infoTagText, styles.infoTagTextGrid, { color: '#7b1fa2' }]}>{exercise.equipos}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {/* En modo lista: imagen a la izquierda, info a la derecha */}
      {!isGrid && showField && (
        <View
          style={{
            width: forceWidth || (IS_MOBILE ? FIELD_WIDTH_MOBILE : FIELD_WIDTH),
            height: forceHeight || (IS_MOBILE ? FIELD_HEIGHT_MOBILE : FIELD_HEIGHT),
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Base64ImagePreview imageUrl={exercise?.imagen} forceWidth={forceWidth || (IS_MOBILE ? FIELD_WIDTH_MOBILE : FIELD_WIDTH)} forceHeight={forceHeight || (IS_MOBILE ? FIELD_HEIGHT_MOBILE : FIELD_HEIGHT)}/>
        </View>
      )}
      
      <View style={[styles.cardInfo, isGrid && styles.cardInfoGrid]}>
        {/* Titulo SIEMPRE visible */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
          <Text style={[styles.cardTitle, IS_MOBILE && styles.cardTitleMobile, isGrid && styles.cardTitleGrid, { flex: 1 }]} numberOfLines={isGrid ? 2 : 1} ellipsizeMode="tail">{exercise.nombre}</Text>
          {exercise.isGlobal && (
            <Ionicons name="globe-outline" size={14} color="#16a34a" />
          )}
        </View>
        {/* Duración SIEMPRE visible */}
        <Text style={[styles.cardDuration, IS_MOBILE && { fontSize: 12 }, isGrid && styles.cardDurationGrid]}>{exercise.tiempo} min</Text>
        
        {/* Información adicional de jugadores y equipos SOLO EN VISTA LISTA */}
        {!isGrid && (exercise.numeroJugadores || exercise.equipos) && (
          <View style={styles.infoTagsContainer}>
            {exercise.numeroJugadores && (
              <View style={[styles.infoTag, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name="people" size={12} color="#1976d2" />
                <Text style={[styles.infoTagText, { color: '#1976d2' }]}>{exercise.numeroJugadores}</Text>
              </View>
            )}
            {exercise.equipos && (
              <View style={[styles.infoTag, { backgroundColor: '#f3e5f5' }]}>
                <Ionicons name="flag" size={12} color="#7b1fa2" />
                <Text style={[styles.infoTagText, { color: '#7b1fa2' }]}>{exercise.equipos}</Text>
              </View>
            )}
          </View>
        )}
        
        {exercise.image && (
          <Image
            source={{ uri: exercise.image }}
            style={[styles.cardImage, IS_MOBILE && styles.cardImageMobile]}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Botones de acción (solo en modo lista) */}
      {!isGrid && (
        <View style={styles.exerciseCardActions}>
          <TouchableOpacity 
            style={styles.cardActionBtn}
            onPress={(e) => { e.stopPropagation && e.stopPropagation(); onOpenOptions(exercise); }}
          >
            <MaterialIcons name="more-vert" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      )}
      </Pressable>
    </View>
  );
}

export default function ExerciseList({ navigation: navigationProp }) {
  // Fallback: en web la pantalla se renderiza desde una page wrapper que no
  // pasa `navigation`, así que tomamos el del shim cuando falta.
  const navigationFromHook = useNavigation();
  const navigation = navigationProp || navigationFromHook;
  const { t, i18n } = useTranslation();
  const ejercicios = useSelector(state => state.exercise.exercises) || [];
  const globalExercises = useSelector(state => state.exercise.globalExercises) || [];
  const globalFolders = useSelector(state => state.exercise.globalFolders) || [];
  const exerciseFolders = useSelector(state => state.exercise.folders) || [];
  const exerciseFoldersFlat = useSelector(state => state.exercise.foldersFlat) || [];
  const currentFolder = useSelector(state => state.exercise.currentFolder);
  const currentFolderExercises = useSelector(state => state.exercise.currentFolderExercises) || [];
  const currentFolderSubfolders = useSelector(state => state.exercise.currentFolderSubfolders) || [];
  const loading = useSelector(state => state.exercise.loading);
  const foldersLoading = useSelector(state => state.exercise.foldersLoading);
  const dispatch = useDispatch();
  const [creating, setCreating] = useState(() => {
    // En web esta lista se desmonta al navegar al editor del campo y se
    // remonta al volver. Restauramos modo edición/creación para que el
    // formulario reaparezca con su borrador.
    const s = loadFormDraft(STORAGE_KEYS.EXERCISE_LIST, { remove: false });
    return !!(s?.creating || s?.editingExercise);
  });
  const [editingExercise, setEditingExercise] = useState(() => {
    const s = loadFormDraft(STORAGE_KEYS.EXERCISE_LIST, { remove: false });
    return s?.editingExercise || null;
  });
  const [viewingExercise, setViewingExercise] = useState(null);
  const [idUsuario, setIdUsuario] = useState("");
  const [userRole, setUserRole] = useState('user');
  const [listFilter, setListFilter] = useState('all'); // 'all' | 'mine' | 'global' (admin only)
  const [viewMode, setViewMode] = useState("list");
  const [scrollEnabled, setScrollEnabled] = useState(true);
  
  // Estados para modal de opciones
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedExerciseForOptions, setSelectedExerciseForOptions] = useState(null);
  
  // Estado de navegación de carpetas
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]); // breadcrumb: [{_id, nombre}, ...]
  
  // Estado para mover ejercicio a carpeta
  const [showMoveToFolder, setShowMoveToFolder] = useState(false);
  const [exerciseToMove, setExerciseToMove] = useState(null);

  // Estados para filtros
  const [filters, setFilters] = useState({
    titulo: '',
    numeroJugadores: '',
    equipos: ''
  });
  
  // Modal para crear carpeta (estilo myVideos)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderNameEn, setNewFolderNameEn] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3B82F6');
  const [newFolderIsGlobal, setNewFolderIsGlobal] = useState(false);
  
  // Menú de carpeta (estilo myVideos)
  const [folderMenuVisible, setFolderMenuVisible] = useState(false);
  const [menuFolder, setMenuFolder] = useState(null);

  const getDuplicateSuffix = useCallback(() => (i18n.language === 'en' ? 'duplicate' : 'duplicado'), [i18n.language]);
  const buildDuplicateName = useCallback((baseName) => `${(baseName || '').trim()}_${getDuplicateSuffix()}`, [getDuplicateSuffix]);

  // Editar carpeta
  const [editFolderModalVisible, setEditFolderModalVisible] = useState(false);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderNameEn, setEditFolderNameEn] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('#3B82F6');
  
  // Notificaciones
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' });

  const folderColors = [
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', 
    '#F43F5E', '#F97316', '#EAB308', '#22C55E', 
    '#14B8A6', '#06B6D4', '#64748B', '#78716C'
  ];

  const { width: screenWidth } = useWindowDimensions();
  const IS_TABLET = screenWidth > 700;
  const IS_MOBILE = screenWidth < 430;
  const numColumns = viewMode === "grid"
    ? (IS_TABLET ? 4 : 2)
    : 1;

  // Para grid, todos del mismo tamaño
  const cardWidth = viewMode === "grid"
    ? (screenWidth - (IS_MOBILE ? 24 : 48)) / numColumns
    : screenWidth - 32;
  const cardHeight = viewMode === "grid"
    ? (IS_MOBILE ? 140 : IS_TABLET ? 160 : 110)
    : undefined;

  // Manejar botón de back del dispositivo cuando se está viendo detalle o navegando carpetas
  useEffect(() => {
    const backHandler = () => {
      if (viewingExercise) {
        setViewingExercise(null);
        return true;
      }
      if (currentFolderId) {
        navigateBack();
        return true;
      }
      return false;
    };

    const backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', backHandler);

    return () => {
      backHandlerSubscription.remove();
    };
  }, [viewingExercise, currentFolderId]);

  useEffect(() => {
    const loadUser = async () => {
      const usuario = await AsyncStorage.getItem('usuario');
      const parsed = JSON.parse(usuario);
      const u = parsed?._id;
      setIdUsuario(u);
      setUserRole(parsed?.role || 'user');
    }
    loadUser();
  }, []);

  // Mostrar notificación de éxito cuando se regresa tras editar un video en la pizarra
  useEffect(() => {
    if (global.pendingVideoEditSuccess) {
      global.pendingVideoEditSuccess = false;
      setTimeout(() => {
        setNotification({ visible: true, message: t('videoRecorder.videoUpdatedSuccess'), type: 'success' });
        setTimeout(() => setNotification({ visible: false, message: '', type: 'success' }), 3000);
      }, 300);
    }
  }, [t]);


  const lang = i18n.language;

  useEffect(() => {
    if (idUsuario) {
      dispatch(fetchEjerciciosUsuario({ user: idUsuario }));
      dispatch(fetchExerciseFolders({ lang }));
      dispatch(fetchExerciseFoldersFlat({ lang }));
      dispatch(fetchGlobalExercises({ lang }));
      dispatch(fetchGlobalFolders({ lang }));
    }
  }, [idUsuario, dispatch, lang]);

  // Navegar a carpeta: cargar contenido
  useEffect(() => {
    if (currentFolderId) {
      dispatch(fetchExerciseFolderById({ id: currentFolderId, lang }));
    } else {
      dispatch(clearCurrentFolder());
    }
  }, [currentFolderId, dispatch, lang]);

  // Persistir el modo edición/creación para sobrevivir al desmontaje en web
  // cuando el usuario navega al editor del campo táctico. Persistimos
  // siempre que esté en modo crear o editando, para que al remontar se
  // restaure el formulario incluso si solo `editingExercise` quedó set.
  useEffect(() => {
    if (creating || editingExercise) {
      saveFormDraft(STORAGE_KEYS.EXERCISE_LIST, { creating: true, editingExercise });
    } else {
      clearFormDraft(STORAGE_KEYS.EXERCISE_LIST);
    }
  }, [creating, editingExercise]);

  const handleSave = async (exercise) => {
    if (!exercise._id) {
      // Es un nuevo ejercicio
      const { _id, ...exerciseSinId } = exercise;
      await dispatch(createEjercicio(exerciseSinId));
      if (exerciseSinId.isGlobal) dispatch(fetchGlobalExercises({ lang }));
    } else {
      // Es una actualización
      await dispatch(updateEjercicio(exercise));
      if (exercise.isGlobal) dispatch(fetchGlobalExercises({ lang }));
    }
    setCreating(false);
    setEditingExercise(null);
    clearFormDraft(STORAGE_KEYS.EXERCISE_LIST);
    clearFormDraft(STORAGE_KEYS.EXERCISE_FORM_DRAFT);
    clearFormDraft(STORAGE_KEYS.FIELD_RESULT);
    // Recargar datos para reflejar cambios
    dispatch(fetchEjerciciosUsuario({ user: idUsuario }));
    if (currentFolderId) dispatch(fetchExerciseFolderById({ id: currentFolderId, lang }));
  };

  const handleCancel = () => {
    setCreating(false);
    setEditingExercise(null);
    clearFormDraft(STORAGE_KEYS.EXERCISE_LIST);
    clearFormDraft(STORAGE_KEYS.EXERCISE_FORM_DRAFT);
    clearFormDraft(STORAGE_KEYS.FIELD_RESULT);
  };

  // Funciones de navegación de carpetas
  const navigateToFolder = (folder) => {
    setFolderPath(prev => [...prev, { _id: folder._id, nombre: folder.nombre }]);
    setCurrentFolderId(folder._id);
  };

  const navigateBack = () => {
    const newPath = [...folderPath];
    newPath.pop();
    setFolderPath(newPath);
    setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1]._id : null);
  };

  const navigateToRoot = () => {
    setFolderPath([]);
    setCurrentFolderId(null);
  };

  const navigateToBreadcrumb = (index) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath[newPath.length - 1]._id);
  };

  // Funciones para mover ejercicio a carpeta
  const handleMoveToFolder = async (folderId) => {
    if (!exerciseToMove) return;
    try {
      await dispatch(moveExerciseToFolder({ 
        exerciseId: exerciseToMove._id, 
        folderId: folderId || null 
      })).unwrap();
      setShowMoveToFolder(false);
      setExerciseToMove(null);
      // Recargar datos
      dispatch(fetchEjerciciosUsuario({ user: idUsuario }));
      dispatch(fetchExerciseFolders({ lang }));
      if (currentFolderId) dispatch(fetchExerciseFolderById({ id: currentFolderId, lang }));
    } catch (error) {
      Alert.alert(t('message.error'), t('folders.moveError'));
    }
  };

  // Función para filtrar ejercicios
  const displayedExercises = (() => {
    if (listFilter === 'global') {
      // If inside a global folder, show folder exercises; else show root global exercises
      if (currentFolderId) return currentFolderExercises;
      const rootGlobal = globalExercises.filter(e => !e.folder);
      const q = filters.titulo ? rootGlobal.filter(e => e.nombre.toLowerCase().includes(filters.titulo.toLowerCase())) : rootGlobal;
      return q;
    }
    const base = listFilter === 'mine'
      ? ejercicios.filter(ex => !ex.isGlobal)
      : ejercicios;
    return currentFolderId ? currentFolderExercises : base.filter(ex => !ex.folder);
  })();
  
  const filteredEjercicios = listFilter === 'global'
    ? displayedExercises  // already filtered above
    : displayedExercises.filter(exercise => {
    const tituloMatch = !filters.titulo || 
      exercise.nombre.toLowerCase().includes(filters.titulo.toLowerCase());
    
    const jugadoresMatch = !filters.numeroJugadores || 
      (exercise.numeroJugadores && exercise.numeroJugadores.toString().includes(filters.numeroJugadores));
    
    const equiposMatch = !filters.equipos || 
      (exercise.equipos && exercise.equipos.toString().includes(filters.equipos));
    
    return tituloMatch && jugadoresMatch && equiposMatch;
  });

  const displayedSubfolders = (() => {
    if (currentFolderId) return currentFolderSubfolders;
    if (listFilter === 'global') return globalFolders.filter(f => !f.parentFolder);
    if (listFilter === 'mine') return exerciseFolders.filter(f => !f.parentFolder && !f.isGlobal);
    return exerciseFolders.filter(f => !f.parentFolder); // 'all' shows both
  })();

  const handleDelete = (exercise) => {
    // No permitir eliminar ejercicios globales a usuarios no-admin
    if (exercise.isGlobal && userRole !== 'admin') {
      Alert.alert(t('message.info'), t('exercise.cannotDeleteGlobal'));
      return;
    }
    Alert.alert(
      t('message.warning'),
      t('exercise.deleteExerciseConfirmationName', { name: exercise.nombre }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('edition.delete'),
          style: 'destructive',
          onPress: async () => {
            await dispatch(deleteEjercicio(exercise._id));
            showNotification(t('exercise.exerciseDeleted', 'Ejercicio eliminado'), 'success');
            // Recargar datos para reflejar cambios
            dispatch(fetchEjerciciosUsuario({ user: idUsuario }));
            if (currentFolderId) dispatch(fetchExerciseFolderById({ id: currentFolderId, lang }));
          }
        }
      ]
    );
  };

  const handleExercisePress = (exercise) => {
    setViewingExercise(exercise);
  };

  const duplicateGlobalExerciseForEdit = useCallback(async (exercise) => {
    const duplicateName = buildDuplicateName(exercise?.nombre || t('exercise.exerciseName'));
    const duplicated = await dispatch(
      duplicateGlobalExercise({
        exerciseId: exercise._id,
        folderId: null,
        duplicateName,
        lang: i18n.language,
      })
    ).unwrap();
    return duplicated;
  }, [dispatch, buildDuplicateName, i18n.language, t]);

  const handleEditAssociatedVideo = useCallback(async (video, parentExercise) => {
    try {
      let editableVideoId = video?._id || video?.id;

      if (!editableVideoId) {
        Alert.alert(t('message.error'), t('myVideos.couldNotLoadVideo'));
        return;
      }

      const mustDuplicate = parentExercise?.isGlobal && userRole !== 'admin';
      let result = null;

      if (mustDuplicate) {
        const duplicateName = buildDuplicateName(video?.nombre || t('myVideos.video'));
        const duplicated = await duplicateVideoForEdit(editableVideoId, {
          lang: i18n.language,
          nombre: duplicateName,
        });
        editableVideoId = duplicated?.video?.id;

        if (!editableVideoId) {
          throw new Error('No se pudo crear el duplicado para edición');
        }
        result = await getVideoForEdit(editableVideoId);
        // Notificar al usuario que se creó una copia
        setNotification({ visible: true, message: t('exercise.cloneToEdit'), type: 'success' });
        setTimeout(() => setNotification({ visible: false, message: '', type: 'success' }), 3000);
      } else {
        result = await getVideoForEdit(editableVideoId);
        if (!result?.success || !result?.video) {
          // Si no se puede editar directo (por permisos), duplicar y abrir el duplicado
          const duplicateName = buildDuplicateName(video?.nombre || t('myVideos.video'));
          const duplicated = await duplicateVideoForEdit(editableVideoId, {
            lang: i18n.language,
            nombre: duplicateName,
          });
          editableVideoId = duplicated?.video?.id;

          if (!editableVideoId) {
            throw new Error('No se pudo crear el duplicado para edición');
          }
          result = await getVideoForEdit(editableVideoId);
        }
      }

      if (!result?.success || !result?.video) {
        throw new Error(result?.message || t('myVideos.couldNotLoadVideo'));
      }

      const videoData = result.video;
      global.editVideoData = {
        videoId: videoData.id,
        nombre: videoData.nombre,
        descripcion: videoData.descripcion,
        fieldType: videoData.fieldType,
        keyframes: videoData.keyframes,
        config: videoData.config,
        ejercicioId: videoData.ejercicio?._id || videoData.ejercicio || null,
        estrategiaId: videoData.estrategia?._id || videoData.estrategia || null,
        folderId: videoData.folder?._id || videoData.folder || null,
      };

      setViewingExercise(null);
      navigation.navigate('TacticalBoard');
    } catch (error) {
      Alert.alert(t('message.error'), error?.message || t('myVideos.couldNotLoadVideo'));
    }
  }, [buildDuplicateName, i18n.language, navigation, t, userRole]);

  const handleExerciseLongPress = (exercise) => {
    // Esta función ya no se usa, pero la mantenemos por compatibilidad
  };

  const openOptionsModal = (exercise) => {
    setSelectedExerciseForOptions(exercise);
    setOptionsModalVisible(true);
  };

  // Notificaciones estilo myVideos
  const showNotification = (message, type = 'success') => {
    setNotification({ visible: true, message, type });
    setTimeout(() => {
      setNotification({ visible: false, message: '', type: 'success' });
    }, 3000);
  };

  // Crear carpeta estilo myVideos
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showNotification(t('folders.nameRequired'), 'error');
      return;
    }
    try {
      const folderData = { 
        nombre: newFolderName.trim(), 
        parentFolder: currentFolderId, 
        color: newFolderColor,
        isGlobal: newFolderIsGlobal && userRole === 'admin'
      };
      if (newFolderIsGlobal && userRole === 'admin' && newFolderNameEn.trim()) {
        folderData.translations = { en: { nombre: newFolderNameEn.trim() } };
      }
      await dispatch(createExerciseFolder(folderData)).unwrap();
      showNotification(t('folders.folderCreated'), 'success');
      setShowCreateFolderModal(false);
      setNewFolderName('');
      setNewFolderNameEn('');
      setNewFolderColor('#3B82F6');
      setNewFolderIsGlobal(false);
      dispatch(fetchExerciseFolders({ lang }));
      dispatch(fetchExerciseFoldersFlat({ lang }));
      if (folderData.isGlobal) dispatch(fetchGlobalFolders({ lang }));
      if (currentFolderId) dispatch(fetchExerciseFolderById({ id: currentFolderId, lang }));
    } catch (error) {
      const errorMsg = error?.message || t('folders.createError');
      showNotification(errorMsg, 'error');
    }
  };

  // Eliminar carpeta estilo myVideos
  const handleDeleteFolder = (folder) => {
    if (folder.isGlobal && userRole !== 'admin') {
      Alert.alert(t('message.info'), t('folders.cannotDeleteGlobal'));
      return;
    }
    Alert.alert(
      t('folders.deleteConfirmation', { name: folder.nombre }),
      t('folders.deleteFolderMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteExerciseFolder({ id: folder._id })).unwrap();
              showNotification(t('folders.folderDeleted'), 'success');
              dispatch(fetchExerciseFolders({ lang }));
              dispatch(fetchExerciseFoldersFlat({ lang }));
              if (folder.isGlobal) dispatch(fetchGlobalFolders({ lang }));
              if (currentFolderId) dispatch(fetchExerciseFolderById({ id: currentFolderId, lang }));
            } catch (error) {
              showNotification(t('folders.deleteError'), 'error');
            }
          }
        }
      ]
    );
  };

  const handleEditFolder = (folder) => {
    if (folder.isGlobal && userRole !== 'admin') {
      Alert.alert(t('message.info'), t('folders.cannotEditGlobal'));
      return;
    }
    setMenuFolder(folder);
    setEditFolderName(folder.nombreEs || folder.translations?.es?.nombre || folder.nombre);
    setEditFolderColor(folder.color || '#3B82F6');
    setEditFolderNameEn(folder.translations?.en?.nombre || '');
    setEditFolderModalVisible(true);
  };

  const handleUpdateFolder = async () => {
    if (!editFolderName.trim()) {
      showNotification(t('folders.nameRequired'), 'error');
      return;
    }
    try {
      const updateData = { id: menuFolder._id, nombre: editFolderName.trim(), color: editFolderColor };
      if (menuFolder.isGlobal && userRole === 'admin' && editFolderNameEn.trim()) {
        updateData.translations = { en: { nombre: editFolderNameEn.trim() } };
      }
      await dispatch(updateExerciseFolder(updateData)).unwrap();
      showNotification(t('folders.folderUpdated'), 'success');
      setEditFolderModalVisible(false);
      dispatch(fetchExerciseFolders({ lang }));
      dispatch(fetchExerciseFoldersFlat({ lang }));
      if (menuFolder.isGlobal) dispatch(fetchGlobalFolders({ lang }));
      if (currentFolderId) dispatch(fetchExerciseFolderById({ id: currentFolderId, lang }));
    } catch (error) {
      showNotification(t('folders.updateError'), 'error');
    }
  };

  // Render folder card estilo myVideos
  const renderFolderItem = (folder) => (
    <TouchableOpacity 
      key={folder._id} 
      style={styles.mvFolderCard}
      onPress={() => navigateToFolder(folder)}
      onLongPress={() => { setMenuFolder(folder); setFolderMenuVisible(true); }}
      activeOpacity={0.7}
    >
      <View style={[styles.mvFolderIconContainer, { backgroundColor: folder.color || '#3B82F6' }]}>
        <Feather name="folder" size={28} color="#fff" />
      </View>
      <View style={styles.mvFolderContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.mvFolderName} numberOfLines={1}>{folder.nombre}</Text>
          {folder.isGlobal && (
            <Ionicons name="globe-outline" size={12} color="#16a34a" />
          )}
        </View>
        <View style={styles.mvFolderStats}>
          <Ionicons name="fitness" size={12} color="#94A3B8" />
          <Text style={styles.mvFolderStatsText}> {folder.exerciseCount || 0}</Text>
          {folder.subfolderCount > 0 && (
            <>
              <Text style={styles.mvFolderStatsText}>  •  </Text>
              <Feather name="folder" size={12} color="#94A3B8" />
              <Text style={styles.mvFolderStatsText}> {folder.subfolderCount}</Text>
            </>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.mvCardMenuButton}
        onPress={() => { setMenuFolder(folder); setFolderMenuVisible(true); }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="more-vertical" size={18} color="#94A3B8" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <AppLayout>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor:'#f2f6fc' }}>
          <ActivityIndicator color="#2474E5" size="large" />
          <Text style={{ marginTop: 16, color: '#2474E5', fontWeight: 'bold', fontSize: 16 }}>{t('exercise.loading')}</Text>
        </View>
      </AppLayout>
    );
  }

  if (viewingExercise) {
    return (
      <ExerciseDetail
        exercise={viewingExercise}
        onBack={() => setViewingExercise(null)}
        navigation={navigation}
        userRole={userRole}
        onEditVideo={handleEditAssociatedVideo}
        onEdit={async (exercise) => {
          // Si el ejercicio es global y el usuario no es admin, duplicar primero
          if (exercise.isGlobal && userRole !== 'admin') {
            try {
              const result = await duplicateGlobalExerciseForEdit(exercise);
              if (!result || !result._id) {
                Alert.alert(t('message.error'), t('exercise.cloneError') || 'Error');
                return;
              }
              showNotification(t('exercise.cloneToEdit'), 'success');
              setEditingExercise(result);
            } catch (err) {
              Alert.alert(t('message.error'), err?.message || 'Error');
              return;
            }
          } else {
            setEditingExercise(exercise);
          }
          setCreating(true);
          setViewingExercise(null);
        }}
        onDelete={handleDelete}
      />
    );
  }

  if (creating || editingExercise) {
    // Usar key fija basada en modo crear/editar para evitar re-montajes.
    // Condición OR (en lugar de sólo `creating`) replica el patrón de
    // strategyList: si tras volver del editor del campo `creating` no se
    // restauró pero sí `editingExercise`, igualmente mostramos el form.
    const formKey = editingExercise ? `edit-${editingExercise._id}` : 'create-new';
    
    return (
        <CreateExerciseForm
          key={formKey}
          navigation={navigation}
          onSave={handleSave}
          onCancel={() => {
            setCreating(false);
            setEditingExercise(null);
          }}
          editingExercise={editingExercise}
          setScrollEnabled={setScrollEnabled}
        />
    );
  }

  return (
    <AppLayout>
      <View style={styles.mvContainer}>
        <View style={styles.mvHeader}>
          <View style={styles.mvHeaderTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {folderPath.length < 2 && (
                <TouchableOpacity 
                  style={styles.mvAddFolderButton}
                  onPress={() => {
                    setNewFolderIsGlobal(listFilter === 'global' && userRole === 'admin');
                    setShowCreateFolderModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="folder-plus" size={20} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => { setCreating(true); setEditingExercise(null); }}
                style={styles.mvCreateButton}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#fff" />
                {!IS_MOBILE && <Text style={styles.mvCreateButtonText}>{t('exercise.exercise')}</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter tabs */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, paddingHorizontal: 2 }}>
            {[
              { key: 'all', label: t('exercise.allExercises'), icon: 'list', activeColor: '#3578e5' },
              { key: 'mine', label: t('exercise.myExercises'), icon: 'person-outline', activeColor: '#6366f1' },
              { key: 'global', label: t('exercise.appExercises'), icon: 'globe-outline', activeColor: '#16a34a' },
            ].map(tab => {
              const isActive = listFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => {
                    setListFilter(tab.key);
                    navigateToRoot();
                  }}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                    gap: 5, paddingVertical: 8, borderRadius: 12, marginBottom: 16,
                    backgroundColor: isActive ? tab.activeColor : 'rgba(255,255,255,0.22)',
                    borderWidth: isActive ? 0 : 1,
                    borderColor: 'rgba(255,255,255,0.3)'
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={tab.icon} size={14} color={isActive ? '#fff' : 'rgba(0, 2, 134, 0.9)'} />
                  <Text style={{ fontSize: IS_MOBILE ? 11 : 12, fontWeight: '700', color: isActive ? '#fff' : 'rgba(0, 0, 0, 0.9)' }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          {/* Breadcrumb estilo myVideos */}
          <View style={styles.mvBreadcrumb}>
            <TouchableOpacity 
              onPress={navigateToRoot} 
              style={[styles.mvBreadcrumbItem, folderPath.length === 0 && styles.mvBreadcrumbItemActive]}
            >
              <Feather name="home" size={16} color={folderPath.length === 0 ? "#3578e5" : "#64748B"} />
              <Text style={[styles.mvBreadcrumbText, folderPath.length === 0 && styles.mvBreadcrumbTextActive]}>{t('folders.root')}</Text>
            </TouchableOpacity>
            {folderPath.map((folder, index) => (
              <React.Fragment key={folder._id}>
                <Feather name="chevron-right" size={16} color="#CBD5E1" style={{ marginHorizontal: 2 }} />
                <TouchableOpacity 
                  onPress={() => {
                    if (index < folderPath.length - 1) {
                      navigateToBreadcrumb(index);
                    }
                  }}
                  style={[styles.mvBreadcrumbItem, index === folderPath.length - 1 && styles.mvBreadcrumbItemActive]}
                >
                  <Text 
                    style={[styles.mvBreadcrumbText, index === folderPath.length - 1 && styles.mvBreadcrumbTextActive]} 
                    numberOfLines={1}
                  >
                    {folder.nombre}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Search Bar estilo myVideos */}
        <View style={styles.mvSearchContainer}>
          <View style={styles.mvSearchBar}>
            <Feather name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.mvSearchInput}
              placeholder={t('exercise.searchForTitle')}
              placeholderTextColor="#94A3B8"
              value={filters.titulo}
              onChangeText={(text) => setFilters(prev => ({ ...prev, titulo: text }))}
            />
            {filters.titulo.length > 0 && (
              <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, titulo: '' }))}>
                <Feather name="x" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {(loading || foldersLoading) ? (
          <View style={styles.mvLoadingContainer}>
            <ActivityIndicator size="large" color="#3578e5" />
            <Text style={styles.mvLoadingText}>{t('common.loading')}</Text>
          </View>
        ) : (displayedSubfolders.length === 0 && filteredEjercicios.length === 0) ? (
          <View style={styles.mvEmptyContainer}>
            <View style={styles.mvEmptyIconContainer}>
              <Ionicons name="fitness-outline" size={48} color="#CBD5E1" />
            </View>
            <Text style={styles.mvEmptyTitle}>
              {filters.titulo ? t('exercise.noExercisesFiltered') : currentFolderId ? t('folders.emptyFolder') : t('exercise.noExercisesCreated')}
            </Text>
            <Text style={styles.mvEmptySubtitle}>
              {filters.titulo 
                ? t('exercise.clearFiltersText')
                : t('exercise.createFirstExercise')
              }
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.mvContentList}
            contentContainerStyle={styles.mvContentListInner}
            showsVerticalScrollIndicator={false}
          >
            {/* Carpetas */}
            {displayedSubfolders.length > 0 && (
              <View style={styles.mvSection}>
                <View style={styles.mvSectionHeader}>
                  <Feather name="folder" size={16} color="#64748B" />
                  <Text style={styles.mvSectionTitle}>{t('folders.folders')}</Text>
                  <View style={styles.mvSectionBadge}>
                    <Text style={styles.mvSectionBadgeText}>{displayedSubfolders.length}</Text>
                  </View>
                </View>
                <View style={styles.mvItemsContainer}>
                  {displayedSubfolders.map(renderFolderItem)}
                </View>
              </View>
            )}
            
            {/* Ejercicios */}
            {filteredEjercicios.length > 0 && (
              <View style={styles.mvSection}>
                <View style={styles.mvSectionHeader}>
                  <Ionicons name="fitness" size={16} color="#64748B" />
                  <Text style={styles.mvSectionTitle}>{t('exercise.exercises')}</Text>
                  <View style={styles.mvSectionBadge}>
                    <Text style={styles.mvSectionBadgeText}>{filteredEjercicios.length}</Text>
                  </View>
                </View>
                <View style={styles.mvItemsContainer}>
                  {filteredEjercicios.map(item => (
                    <View key={item._id || item.id} style={{ width: '100%' }}>
                      <ExerciseCard
                        exercise={item}
                        onPress={handleExercisePress}
                        onLongPress={() => {}}
                        isGrid={false}
                        onOpenOptions={openOptionsModal}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Exercise Options Modal - Action Sheet estilo myVideos */}
        <Modal
          visible={optionsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setOptionsModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.mvModalBackdrop} 
            activeOpacity={1} 
            onPress={() => setOptionsModalVisible(false)}
          >
            <View style={styles.mvActionSheet}>
              <View style={styles.mvActionSheetHeader}>
                <Text style={styles.mvActionSheetTitle} numberOfLines={1}>{selectedExerciseForOptions?.nombre}</Text>
                <Text style={styles.mvActionSheetSubtitle}>{t('exercise.exerciseOptions')}</Text>
              </View>
              
              <View style={styles.mvActionSheetBody}>
                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    setViewingExercise(selectedExerciseForOptions);
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Feather name="eye" size={20} color="#3578e5" />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={styles.mvActionTitle}>{t('exercise.lookDetails')}</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={async () => {
                    const ex = selectedExerciseForOptions;
                    setOptionsModalVisible(false);
                    if (ex?.isGlobal && userRole !== 'admin') {
                      try {
                        const result = await duplicateGlobalExerciseForEdit(ex);
                        if (!result || !result._id) {
                          Alert.alert(t('message.error'), t('exercise.cloneError') || 'Error');
                          return;
                        }
                        showNotification(t('exercise.cloneToEdit'), 'success');
                        setEditingExercise(result);
                      } catch (err) {
                        Alert.alert(t('message.error'), err?.message || 'Error');
                        return;
                      }
                    } else {
                      setEditingExercise(ex);
                    }
                    setCreating(true);
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Feather name="edit-3" size={20} color="#D97706" />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={styles.mvActionTitle}>{t('edition.edit')}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={async () => {
                    const ex = selectedExerciseForOptions;
                    setOptionsModalVisible(false);
                    if (!ex) return;
                    try {
                      const duplicateName = buildDuplicateName(ex.nombre || t('exercise.exerciseName'));
                      if (ex.isGlobal) {
                        await dispatch(duplicateGlobalExercise({
                          exerciseId: ex._id,
                          folderId: null,
                          duplicateName,
                          lang: i18n.language,
                        })).unwrap();
                      } else {
                        await dispatch(duplicateExerciseToFolder({
                          exerciseId: ex._id,
                          folderId: ex.folder || null,
                          duplicateName,
                          lang: i18n.language,
                        })).unwrap();
                      }
                      showNotification(t('exercise.cloneCreated'), 'success');
                      dispatch(fetchEjerciciosUsuario({ user: idUsuario }));
                      dispatch(fetchGlobalExercises({ lang }));
                      if (currentFolderId) dispatch(fetchExerciseFolderById({ id: currentFolderId, lang }));
                    } catch (err) {
                      Alert.alert(t('message.error'), err?.message || 'Error');
                    }
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: '#F0F9FF' }]}>
                    <Feather name="copy" size={20} color="#0EA5E9" />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={styles.mvActionTitle}>{t('myVideos.duplicate')}</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    setExerciseToMove(selectedExerciseForOptions);
                    setShowMoveToFolder(true);
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: '#FFF7ED' }]}>
                    <Feather name="folder" size={20} color="#F97316" />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={styles.mvActionTitle}>{t('folders.moveToFolder')}</Text>
                  </View>
                </TouchableOpacity>
                
                <View style={styles.mvActionDivider} />
                
                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    handleDelete(selectedExerciseForOptions);
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: '#FEF2F2' }]}>
                    <Feather name="trash-2" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={[styles.mvActionTitle, { color: '#EF4444' }]}>{t('edition.delete')}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.mvActionSheetCancel}
                onPress={() => setOptionsModalVisible(false)}
              >
                <Text style={styles.mvActionSheetCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Folder Menu Modal - Action Sheet estilo myVideos */}
        <Modal
          visible={folderMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFolderMenuVisible(false)}
        >
          <TouchableOpacity 
            style={styles.mvModalBackdrop} 
            activeOpacity={1} 
            onPress={() => setFolderMenuVisible(false)}
          >
            <View style={styles.mvActionSheet}>
              <View style={styles.mvActionSheetHeader}>
                <Text style={styles.mvActionSheetTitle} numberOfLines={1}>{menuFolder?.nombre}</Text>
                <Text style={styles.mvActionSheetSubtitle}>{t('folders.folderOptions')}</Text>
              </View>
              
              <View style={styles.mvActionSheetBody}>
                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={() => {
                    setFolderMenuVisible(false);
                    if (menuFolder) navigateToFolder(menuFolder);
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Feather name="folder" size={20} color="#3578e5" />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={styles.mvActionTitle}>{t('folders.openFolder')}</Text>
                  </View>
                </TouchableOpacity>
                
                <View style={styles.mvActionDivider} />

                {(!menuFolder?.isGlobal || userRole === 'admin') && (
                  <>
                    <TouchableOpacity
                      style={styles.mvActionOption}
                      onPress={() => {
                        setFolderMenuVisible(false);
                        if (menuFolder) handleEditFolder(menuFolder);
                      }}
                    >
                      <View style={[styles.mvActionIcon, { backgroundColor: '#FFF7ED' }]}>
                        <Feather name="edit-2" size={20} color="#F97316" />
                      </View>
                      <View style={styles.mvActionTextContainer}>
                        <Text style={styles.mvActionTitle}>{t('folders.editFolder')}</Text>
                      </View>
                    </TouchableOpacity>
                    
                    <View style={styles.mvActionDivider} />
                  </>
                )}
                
                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={() => {
                    setFolderMenuVisible(false);
                    if (menuFolder) handleDeleteFolder(menuFolder);
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: '#FEF2F2' }]}>
                    <Feather name="trash-2" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={[styles.mvActionTitle, { color: '#EF4444' }]}>{t('folders.deleteFolder')}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.mvActionSheetCancel}
                onPress={() => setFolderMenuVisible(false)}
              >
                <Text style={styles.mvActionSheetCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Edit Folder Modal */}
        <Modal
          visible={editFolderModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setEditFolderModalVisible(false)}
        >
          <View style={styles.mvCreateModalOverlay}>
            <View style={IS_MOBILE ? styles.mvCreateModalContainerMobile : IS_TABLET ? styles.mvCreateModalContainerTablet : styles.mvCreateModalContainer}>
              {/* Header */}
              <View style={styles.mvCreateModalHeader}>
                <View style={styles.mvCreateModalHeaderLeft}>
                  <View style={[styles.mvCreateModalIconContainer, { backgroundColor: '#FFF7ED' }]}>
                    <Feather name="edit-2" size={IS_MOBILE ? 18 : 24} color="#F97316" />
                  </View>
                  <View>
                    <Text style={IS_MOBILE ? styles.mvCreateModalTitleMobile : styles.mvCreateModalTitle}>{t('folders.editFolder')}</Text>
                    <Text style={IS_MOBILE ? styles.mvCreateModalSubtitleMobile : styles.mvCreateModalSubtitle}>{t('folders.editFolderSubtitle')}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setEditFolderModalVisible(false)} style={styles.mvCreateModalCloseBtn}>
                  <Feather name="x" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <ScrollView
                style={styles.mvCreateModalBody}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={IS_MOBILE ? styles.mvCreateModalContentMobile : styles.mvCreateModalContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={IS_MOBILE ? styles.mvCreateCardMobile : styles.mvCreateCard}>
                  <View style={styles.mvCreateCardHeader}>
                    <Feather name="folder" size={24} color="#F97316" />
                    <Text style={styles.mvCreateCardTitle}>{t('folders.folderData')}</Text>
                  </View>

                  <View style={styles.mvCreateCardContent}>
                    <Text style={styles.mvCreateInputLabel}>{t('folders.folderNameLabel')}</Text>
                    <TextInput
                      style={styles.mvCreateInput}
                      value={editFolderName}
                      onChangeText={setEditFolderName}
                      placeholder={t('folders.folderNamePlaceholder')}
                      placeholderTextColor="#94A3B8"
                      autoFocus
                      maxLength={50}
                    />

                    {menuFolder?.isGlobal && userRole === 'admin' && (
                      <View style={{ marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Ionicons name="language-outline" size={14} color="#1e40af" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 }}>English</Text>
                        </View>
                        <TextInput
                          style={styles.mvCreateInput}
                          value={editFolderNameEn}
                          onChangeText={setEditFolderNameEn}
                          placeholder="Folder name (English)"
                          placeholderTextColor="#94A3B8"
                          maxLength={50}
                        />
                      </View>
                    )}

                    <Text style={[styles.mvCreateInputLabel, { marginTop: 16 }]}>{t('folders.folderColorLabel')}</Text>
                    <View style={styles.mvColorGrid}>
                      {folderColors.map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.mvColorCircle,
                            { backgroundColor: color },
                            editFolderColor === color && styles.mvColorCircleSelected
                          ]}
                          onPress={() => setEditFolderColor(color)}
                        >
                          {editFolderColor === color && (
                            <Feather name="check" size={18} color="#fff" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.mvCreateModalFooter}>
                <TouchableOpacity
                  style={styles.mvCreateCancelButton}
                  onPress={() => setEditFolderModalVisible(false)}
                >
                  <Feather name="x" size={18} color="#64748b" />
                  <Text style={styles.mvCreateCancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mvCreateSaveButton, !editFolderName.trim() && styles.mvCreateSaveButtonDisabled]}
                  onPress={handleUpdateFolder}
                  disabled={!editFolderName.trim()}
                >
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.mvCreateSaveButtonText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Create Folder Modal estilo myVideos */}
        <Modal
          visible={showCreateFolderModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCreateFolderModal(false)}
        >
          <View style={styles.mvCreateModalOverlay}>
            <View style={IS_MOBILE ? styles.mvCreateModalContainerMobile : IS_TABLET ? styles.mvCreateModalContainerTablet : styles.mvCreateModalContainer}>
              {/* Header */}
              <View style={styles.mvCreateModalHeader}>
                <View style={styles.mvCreateModalHeaderLeft}>
                  <View style={[styles.mvCreateModalIconContainer, { backgroundColor: '#EFF6FF' }]}>
                    <Feather name="folder-plus" size={28} color="#3578e5" />
                  </View>
                  <View>
                    <Text style={IS_MOBILE ? styles.mvCreateModalTitleMobile : styles.mvCreateModalTitle}>
                      {t('folders.createFolder')}
                    </Text>
                    <Text style={IS_MOBILE ? styles.mvCreateModalSubtitleMobile : styles.mvCreateModalSubtitle}>
                      {t('folders.newFolderSubtitle')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.mvCreateModalCloseBtn}
                  onPress={() => {
                    setShowCreateFolderModal(false);
                    setNewFolderName('');
                    setNewFolderNameEn('');
                    setNewFolderIsGlobal(false);
                  }}
                >
                  <Feather name="x" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <ScrollView
                style={styles.mvCreateModalBody}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={IS_MOBILE ? styles.mvCreateModalContentMobile : styles.mvCreateModalContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={IS_MOBILE ? styles.mvCreateCardMobile : styles.mvCreateCard}>
                  <View style={styles.mvCreateCardHeader}>
                    <Feather name="folder" size={24} color="#3578e5" />
                    <Text style={styles.mvCreateCardTitle}>{t('folders.folderData')}</Text>
                  </View>

                  <View style={styles.mvCreateCardContent}>
                    {/* Toggle visibilidad (admin) */}
                    {userRole === 'admin' && (
                      <View style={{ marginBottom: 14 }}>
                        <Text style={styles.mvCreateInputLabel}>Visibilidad</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: !newFolderIsGlobal ? '#1e40af' : '#e2e8f0', borderWidth: 2, borderColor: !newFolderIsGlobal ? '#1e40af' : 'transparent' }}
                            onPress={() => setNewFolderIsGlobal(false)}
                          >
                            <Ionicons name="person-outline" size={16} color={!newFolderIsGlobal ? '#fff' : '#64748b'} />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: !newFolderIsGlobal ? '#fff' : '#64748b' }}>{t('exercise.myExercises')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: newFolderIsGlobal ? '#16a34a' : '#e2e8f0', borderWidth: 2, borderColor: newFolderIsGlobal ? '#16a34a' : 'transparent' }}
                            onPress={() => setNewFolderIsGlobal(true)}
                          >
                            <Ionicons name="globe-outline" size={16} color={newFolderIsGlobal ? '#fff' : '#64748b'} />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: newFolderIsGlobal ? '#fff' : '#64748b' }}>{t('exercise.appExercises')}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    <Text style={styles.mvCreateInputLabel}>{t('folders.folderNameLabel')}</Text>
                    <TextInput
                      style={styles.mvCreateInput}
                      placeholder={t('folders.folderNamePlaceholder')}
                      placeholderTextColor="#94A3B8"
                      value={newFolderName}
                      onChangeText={setNewFolderName}
                      maxLength={50}
                    />

                    {/* Traducción inglés (admin + global) */}
                    {userRole === 'admin' && newFolderIsGlobal && (
                      <View style={{ marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Ionicons name="language-outline" size={14} color="#1e40af" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 }}>English</Text>
                        </View>
                        <TextInput
                          style={styles.mvCreateInput}
                          placeholder="Folder name (English)"
                          placeholderTextColor="#94A3B8"
                          value={newFolderNameEn}
                          onChangeText={setNewFolderNameEn}
                          maxLength={50}
                        />
                      </View>
                    )}
                    
                    <Text style={[styles.mvCreateInputLabel, { marginTop: 16 }]}>{t('folders.folderColorLabel')}</Text>
                    <View style={styles.mvColorGrid}>
                      {folderColors.map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.mvColorCircle,
                            { backgroundColor: color },
                            newFolderColor === color && styles.mvColorCircleSelected
                          ]}
                          onPress={() => setNewFolderColor(color)}
                        >
                          {newFolderColor === color && (
                            <Feather name="check" size={18} color="#fff" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.mvCreateModalFooter}>
                <TouchableOpacity 
                  style={styles.mvCreateCancelButton}
                  onPress={() => {
                    setShowCreateFolderModal(false);
                    setNewFolderName('');
                    setNewFolderNameEn('');
                    setNewFolderIsGlobal(false);
                  }}
                >
                  <Feather name="x" size={18} color="#64748b" />
                  <Text style={styles.mvCreateCancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.mvCreateSaveButton, !newFolderName.trim() && styles.mvCreateSaveButtonDisabled]}
                  onPress={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                >
                  <Feather name="plus" size={18} color="#fff" />
                  <Text style={styles.mvCreateSaveButtonText}>{t('folders.createFolder')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Move to Folder Modal estilo myVideos */}
        <Modal
          visible={showMoveToFolder}
          transparent
          animationType="slide"
          onRequestClose={() => { setShowMoveToFolder(false); setExerciseToMove(null); }}
        >
          <View style={styles.mvModalBackdrop}>
            <View style={styles.mvFormModal}>
              <View style={styles.mvFormModalHeader}>
                <View style={[styles.mvFormModalIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Feather name="folder" size={24} color="#F97316" />
                </View>
                <Text style={styles.mvFormModalTitle}>{t('folders.moveToFolder')}</Text>
                <Text style={styles.mvFormModalSubtitle}>{t('folders.selectDestination')}</Text>
              </View>
              
              <ScrollView style={styles.mvFolderSelectList} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.mvFolderSelectItem}
                  onPress={() => handleMoveToFolder(null)}
                >
                  <View style={[styles.mvFolderSelectIcon, { backgroundColor: '#F1F5F9' }]}>
                    <Feather name="home" size={18} color="#64748B" />
                  </View>
                  <Text style={styles.mvFolderSelectText}>{t('folders.root')}</Text>
                </TouchableOpacity>
                
                {exerciseFoldersFlat.map(folder => (
                  <TouchableOpacity
                    key={folder._id}
                    style={[
                      styles.mvFolderSelectItem,
                      folder.parentFolder && { marginLeft: 16 }
                    ]}
                    onPress={() => handleMoveToFolder(folder._id)}
                  >
                    <View style={[styles.mvFolderSelectIcon, { backgroundColor: folder.color || '#3B82F6' }]}>
                      <Feather name="folder" size={16} color="#fff" />
                    </View>
                    <Text style={styles.mvFolderSelectText}>{folder.nombre}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.mvFormModalFooter}>
                <TouchableOpacity 
                  style={styles.mvSecondaryButton}
                  onPress={() => { setShowMoveToFolder(false); setExerciseToMove(null); }}
                >
                  <Text style={styles.mvSecondaryButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Notification Toast */}
        {notification.visible && (
          <View style={styles.mvNotificationFloatingContainer} pointerEvents="none">
            <View style={[
              styles.mvNotification, 
              notification.type === 'success' ? styles.mvNotificationSuccess : styles.mvNotificationError
            ]}>
              <Feather 
                name={notification.type === 'success' ? 'check-circle' : 'alert-circle'} 
                size={20} 
                color="#fff" 
              />
              <Text style={styles.mvNotificationText}>{notification.message}</Text>
            </View>
          </View>
        )}
      </View>
    </AppLayout>
  );
}

const isWeb = Platform.OS === 'web';
const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
    justifyContent: 'space-between',
    gap: 8,
  },
  topBarMobile: {
    paddingHorizontal: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#eaf2fb",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#b5d6fa",
    flex: 1,
    maxWidth: 200,
  },
  toggleButtonMobile: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 4,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 36, // Limitar ancho máximo
  },
  toggleButtonText: {
    marginLeft: 7,
    color: "#2474E5",
    fontWeight: "bold",
    width: 120,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2474E5',
    paddingVertical: Platform.OS === 'ios' ? 8 : 7,
    paddingHorizontal: 16,
    borderRadius: 22,
    shadowColor: '#2856a2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  createButtonMobile: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.25,
  },
  createButtonTextMobile: {
    fontSize: 14,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e3e8f0',
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 74,
    marginBottom: 8,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    transitionDuration: '150ms',
  },
  exerciseCardMobile: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    minHeight: 60,
  },
  exerciseCardGrid: {
    flexDirection: 'column', // Layout vertical para grid
    alignItems: 'center',
    height: '100%', // Ocupar todo el espacio disponible
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  exerciseCardGridMobile: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10, // Bordes más pequeños para móvil
  },
  exerciseCardPressed: {
    backgroundColor: '#eaf2fb',
    borderColor: '#b5d6fa',
    shadowOpacity: 0.18,
    elevation: 4,
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: 46,
    overflow: 'hidden',
    marginLeft: 2,
  },
  cardInfoGrid: {
    minHeight: 50, // Más altura para layout vertical
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingTop: 4,
    overflow: 'visible',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2856a2',
    marginBottom: 2,
    letterSpacing: 0.25,
    ...(Platform.OS === 'web'
      ? { textShadow: '0 1px 1px #e6eefc' }
      : { textShadowColor: '#e6eefc', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 }),
  },
  cardTitleMobile: {
    fontSize: 13,
    marginBottom: 1,
  },
  cardTitleGrid: {
    fontSize: 14,
    marginBottom: 1,
    lineHeight: 16,
  },
  cardDuration: {
    fontSize: 13,
    color: '#4f6882',
    marginTop: 0,
    fontWeight: '500',
  },
  cardDurationGrid: {
    fontSize: 11,
    marginTop: 0,
  },
  cardImage: {
    marginTop: 7,
    width: 50,
    height: 34,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#e3e8f0',
    backgroundColor: '#eee',
    alignSelf: 'flex-start'
  },
  cardImageMobile: {
    width: 36,
    height: 26,
    borderRadius: 5,
    marginTop: 3,
  },
  emptyText: {
    fontSize: 16,
    color: '#8fa0b8',
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f6fc',
    padding: 24,
  },
  
  // Nuevos estilos profesionales para el detalle
  detailBackground: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  detailCardMobile: {
    borderRadius: 16,
    margin: 8,
  },
  detailHeader: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  detailHeaderMobile: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerGradient: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 16,
  },
  detailTitleMobile: {
    fontSize: 20,
  },
  durationBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  fieldContainer: {
    backgroundColor: '#f1f5f9',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  fieldContainerMobile: {
    marginHorizontal: 16,
    padding: 12,
  },
  fieldImageWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  zoomOverlay: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 8,
  },
  contentSection: {
    padding: 24,
  },
  contentSectionMobile: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  playersStat: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  teamsStat: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  dimensionsStat: {
    borderLeftWidth: 4,
    borderLeftColor: '#673AB7',
  },
  statContent: {
    marginLeft: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  detailsSection: {
    gap: 16,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  detailCardContent: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  actionSection: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    flex: 1,
  },
  primaryButtonMobile: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    flex: 1,
  },
  secondaryButtonMobile: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonMobile: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Mantener estilos existentes necesarios
  detailContainer: {
    marginTop: 12,
    width: '100%',
    backgroundColor: '#f9fbfe',
    borderRadius: 18,
    padding: 26,
    shadowColor: '#2856a2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 2,
    maxWidth: 460,
  },
  detailContainerMobile: {
    padding: 12,
    maxWidth: '100%',
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 7,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#355179',
    minWidth: 100,
    fontSize: 16,
  },
  detailLabelMobile: {
    minWidth: 70,
    fontSize: 13,
  },
  detailValue: {
    color: '#333',
    fontSize: 16,
    flex: 1,
    flexWrap: 'wrap'
  },
  detailValueMobile: {
    fontSize: 13,
  },
  detailImage: {
    width: 200,
    height: 120,
    borderRadius: 14,
    marginTop: 16,
    marginBottom: 10,
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#e3e8f0',
    alignSelf: 'center'
  },
  detailImageMobile: {
    width: 110,
    height: 70,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  infoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 2,
  },
  infoTagGrid: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 2,
  },
  infoTagText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  infoTagTextGrid: {
    fontSize: 10,
    marginLeft: 2,
  },
  infoTagsContainer: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoTagsContainerGrid: {
    marginTop: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  // Estilos para gestión de tipos
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexShrink: 1,
  },
  manageTypesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  manageTypesButtonMobile: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  manageTypesButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    margin: 20,
  },
  modalContainerMobile: {
    width: '95%',
    maxHeight: '80%',
    margin: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalTitleMobile: {
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  emptyTypesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTypesText: {
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
  },
  typeItem: {
    marginBottom: 12,
  },
  editingTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  typeNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  typeNameInputMobile: {
    fontSize: 14,
    paddingVertical: 6,
  },
  editingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelEditButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 8,
  },
  saveEditButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    padding: 8,
  },
  typeItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  typeNameContainer: {
    flex: 1,
  },
  typeTag: {
    backgroundColor: '#FF5722',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  typeTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  typeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editTypeButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    padding: 8,
  },
  deleteTypeButton: {
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    padding: 8,
  },

  // Estilos para filtros
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#eaf2fb",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#b5d6fa",
    marginRight: 8,
  },
  filterButtonMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  filterButtonText: {
    marginLeft: 7,
    color: "#2474E5",
    fontWeight: "bold",
    fontSize: 14,
  },
  filterBadge: {
    backgroundColor: '#FF5722',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  filtersSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e3e8f0',
  },
  filtersSectionMobile: {
    marginHorizontal: 8,
    padding: 12,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filtersGridMobile: {
    gap: 8,
  },
  filterInputContainer: {
    flex: 1,
    minWidth: 200,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  clearFiltersText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  closeFiltersButton: {
    backgroundColor: '#2474E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeFiltersText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Estilos para selector de tipos
  typeSelectorButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeSelectorText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  typeSelectorModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    margin: 20,
  },
  typeSelectorModalMobile: {
    width: '95%',
    maxHeight: '80%',
    margin: 10,
  },
  typeList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  typeItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  clearTypesButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  clearTypesText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  confirmTypesButton: {
    backgroundColor: '#2474E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmTypesText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Estilos para menú móvil
  mobileMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eaf2fb",
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: "#b5d6fa",
  },
  mobileMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mobileMenuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Para el notch en iOS
  },
  mobileMenuContent: {
    padding: 20,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  mobileMenuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    fontWeight: '500',
  },
  mobileMenuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },

  // Badge para el botón del menú móvil
  mobileMenuBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF5722',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMenuBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Badge para items del menú móvil
  mobileMenuItemBadge: {
    backgroundColor: '#FF5722',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  mobileMenuItemBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // --- Vista de cuadrícula/lista ---
  viewModeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#e6edf5',
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 8,
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

  // --- Estilos de Modal (copiados de training.js) ---
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
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
    width: '90%',
    maxWidth: 800,
    maxHeight: '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  modalEditButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  modalPdfButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffebee',
  },
  modalImageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
  },

  // --- Estilos del detalle de ejercicio ---
  exerciseDetailCard: {
    marginBottom: 16,
  },
  exerciseDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  exerciseDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 12,
    flex: 1,
  },
  exerciseDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  exerciseDurationText: {
    color: '#3578e5',
    fontWeight: '600',
    fontSize: 14,
  },
  detailSection: {
    marginTop: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },

  // --- Botones de acción en tarjetas ---
  exerciseCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingLeft: 8,
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

  // --- Modal de opciones ---
  optionsModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '80%',
    maxWidth: 320,
    elevation: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  optionsModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionsModalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  optionsModalOptionDanger: {
    borderBottomWidth: 0,
  },
  optionsModalOptionTextDanger: {
    color: '#dc2626',
  },
  optionsModalOptionCancel: {
    borderBottomWidth: 0,
  },
  optionsModalOptionTextCancel: {
    color: '#64748b',
  },
  
  // --- Estilos para Videos del Ejercicio ---
  videosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  videoCard: {
    backgroundColor: '#fdf6f8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f6d6e1',
    padding: 18,
    flexBasis: '48%',
    maxWidth: '48%',
    minWidth: 240,
    flexGrow: 1,
  },
  videoCardMobile: {
    flexBasis: '100%',
    maxWidth: '100%',
  },
  videoCardContent: {
    alignItems: 'center',
    marginBottom: 14,
  },
  videoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  videoCardDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  videoCardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  videoActionBtn: {
    flex: 1,
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  videoPlayBtn: {
    backgroundColor: '#d81b60',
  },
  videoEditBtn: {
    backgroundColor: '#fb8c00',
  },
  videoDownloadBtn: {
    backgroundColor: '#388e3c',
  },
  videoActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noVideosText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  videoUnlinkBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  
  // --- Modal de Video ---
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
    backgroundColor: '#2d2d2d',
  },
  videoModalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  videoModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLoadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLoadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  videoPlayerContainer: {
    width: '100%',
    aspectRatio: 1.7778,
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoModalActions: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'center',
  },
  videoModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  videoModalDownloadBtn: {
    backgroundColor: '#4CAF50',
  },
  videoModalBtnText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  // Folder styles
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexWrap: 'wrap',
    gap: 4,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#2474E5',
    fontWeight: '500',
  },
  breadcrumbTextActive: {
    color: '#333',
    fontWeight: '700',
  },
  foldersGrid: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  folderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  folderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  folderCardInfo: {
    flex: 1,
  },
  folderCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  folderCardCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  // ===== Estilos myVideos para ExerciseList =====
  mvContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header
  mvHeader: {
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mvHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  mvHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mvHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  mvAddFolderButton: {
    backgroundColor: '#3578e5',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3578e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mvCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mvCreateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  
  // View mode switch
  mvViewModeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    overflow: 'hidden',
  },
  mvViewModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mvViewModeBtnActive: {
    backgroundColor: '#3578e5',
    borderRadius: 8,
  },
  
  // Breadcrumb
  mvBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    flexWrap: 'wrap',
  },
  mvBreadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  mvBreadcrumbItemActive: {
    backgroundColor: '#EFF6FF',
  },
  mvBreadcrumbText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    maxWidth: 120,
    minWidth: 0,
  },
  mvBreadcrumbTextActive: {
    color: '#3578e5',
    fontWeight: '600',
  },

  // Search
  mvSearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  mvSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mvSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
  },
  
  // Loading & Empty
  mvLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  mvLoadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  mvEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  mvEmptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  mvEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  mvEmptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Content List
  mvContentList: {
    flex: 1,
  },
  mvContentListInner: {
    padding: 20,
    paddingBottom: 40,
  },
  
  // Sections
  mvSection: {
    marginBottom: 24,
  },
  mvSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  mvSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mvSectionBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mvSectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  mvItemsContainer: {
    gap: 10,
  },
  
  // Folder Card
  mvFolderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  mvFolderIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mvFolderContent: {
    flex: 1,
  },
  mvFolderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  mvFolderStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mvFolderStatsText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  mvCardMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal Backdrop
  mvModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  
  // Action Sheet
  mvActionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  mvActionSheetHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mvActionSheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    maxWidth: '80%',
  },
  mvActionSheetSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  mvActionSheetBody: {
    paddingVertical: 8,
  },
  mvActionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  mvActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mvActionTextContainer: {
    flex: 1,
  },
  mvActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  mvActionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  mvActionSheetCancel: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  mvActionSheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  
  // Form Modal
  mvFormModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  mvFormModalHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  mvFormModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mvFormModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  mvFormModalSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  mvFormModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  mvSecondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mvSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  
  // Folder Select List
  mvFolderSelectList: {
    maxHeight: 280,
    paddingHorizontal: 24,
  },
  mvFolderSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  mvFolderSelectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mvFolderSelectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
  
  // Create Folder Modal
  mvCreateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mvCreateModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '96%',
    maxWidth: 500,
    minHeight: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
    overflow: 'hidden',
  },
  mvCreateModalContainerMobile: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '92%',
    maxWidth: 400,
    minHeight: 450,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
    overflow: 'hidden',
  },
  mvCreateModalContainerTablet: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '94%',
    maxWidth: 900,
    minHeight: 700,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
    overflow: 'hidden',
  },
  mvCreateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  mvCreateModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mvCreateModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mvCreateModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  mvCreateModalTitleMobile: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  mvCreateModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  mvCreateModalSubtitleMobile: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  mvCreateModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mvCreateModalBody: {
    flex: 1,
    minHeight: 200,
  },
  mvCreateModalContent: {
    padding: 24,
    paddingBottom: 10,
  },
  mvCreateModalContentMobile: {
    padding: 20,
    paddingBottom: 10,
  },
  mvCreateCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mvCreateCardMobile: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mvCreateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  mvCreateCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  mvCreateCardContent: {
    gap: 8,
  },
  mvCreateInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  mvCreateInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mvColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  mvColorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mvColorCircleSelected: {
    borderWidth: 3,
    borderColor: '#1E293B',
  },
  mvCreateModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  mvCreateCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mvCreateCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  mvCreateSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3578e5',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#3578e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mvCreateSaveButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  mvCreateSaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Notification
  mvNotificationFloatingContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  mvNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    marginHorizontal: 16,
    maxWidth: 400,
  },
  mvNotificationSuccess: {
    backgroundColor: '#10B981',
  },
  mvNotificationError: {
    backgroundColor: '#EF4444',
  },
  mvNotificationText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});