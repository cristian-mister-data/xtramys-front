import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, Alert, FlatList, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, ScrollView, BackHandler, Platform, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLayout from '@/vendor/shared/appLayout';
import CreateStrategyForm from './createStrategyForm';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEstrategiasUsuario, createEstrategia, updateEstrategia, deleteEstrategia } from '@/store/slices/strategy/strategyThunks';
import { fetchStrategyFolders, fetchStrategyFolderById, createStrategyFolder, updateStrategyFolder, deleteStrategyFolder, moveStrategyToFolder, fetchStrategyFoldersFlat } from '@/store/slices/strategy/strategyThunks';
import { clearCurrentFolder } from '@/store/slices/strategy/strategySlice';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Base64ImagePreview from '@/vendor/tacticalBoard/imagePreview';
import ImageZoom from 'react-native-image-pan-zoom';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { savePdfToDownloads } from '@/utils/pdfDownload';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { getVideosByStrategy, getVideoStreamUrl, getVideoDownloadUrl, regenerateVideoWithField, unlinkVideoFromStrategy } from '@/utils/api';
import { downloadResolvedVideo, resolvePlayableVideoUrl, revokeVideoObjectUrl } from '@/utils/videoPlayback';
import { downloadImageSource } from '@/utils/imageDownload';
import { getFieldById } from '@/utils/fieldTypes';
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

function StrategyDetail({ strategy, onBack, navigation, onEdit, onDelete }) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;
  const IS_TABLET = screenWidth > 700;
  // Mostrar imagen si existe
  const showField = (strategy.elementosCampo && strategy.elementosCampo.length > 0 && strategy.tipoCampo) || strategy.imagen;
  const dispatch = useDispatch();

  // Zoom modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const { width, height } = useWindowDimensions();
  
  // Video states
  const [strategyVideos, setStrategyVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
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

  // Función para obtener el nombre de la carpeta
  const getFolderName = () => {
    if (!strategy.folder) return null;
    if (typeof strategy.folder === 'object') return strategy.folder.nombre;
    return null;
  };
  
  // Cargar videos de la estrategia
  useEffect(() => {
    const loadVideos = async () => {
      if (strategy?._id) {
        setLoadingVideos(true);
        try {
          const videos = await getVideosByStrategy(strategy._id);
          setStrategyVideos(videos || []);
        } catch (error) {
          console.error('Error cargando videos:', error);
          setStrategyVideos([]);
        } finally {
          setLoadingVideos(false);
        }
      }
    };
    loadVideos();
  }, [strategy?._id]);
  
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
          const assetUri = normalizeImageSource(asset, { cacheBust: false });
          if (assetUri) {
            const response = await fetch(assetUri);
            const blob = await response.blob();
            const reader = new FileReader();
            fieldImageData = await new Promise((resolve, reject) => {
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        } catch (err) {
          console.warn('Error cargando imagen del campo:', err);
        }
      }
      
      // Regenerar el video con la imagen del campo
      const result = await regenerateVideoWithField(video._id, fieldImageData);
      
      if (result.success && result.videoId) {
        const streamUrl = Platform.OS === 'web'
          ? await resolvePlayableVideoUrl(result.videoId)
          : getVideoStreamUrl(result.videoId);
        setVideoUrl(streamUrl);
      }
    } catch (error) {
      console.error('Error reproduciendo video:', error);
      Alert.alert(t('message.error'), t('strategy.videoPlayError'));
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
        if (Platform.OS === 'web') {
          await downloadResolvedVideo(result.videoId, video.nombre || t('strategy.video'));
          return;
        }

        const downloadUrl = getVideoDownloadUrl(result.videoId);
        const fileName = `${video.nombre || 'video'}.mp4`;
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
  
  // Desasociar video de la estrategia
  const handleUnlinkVideo = async (video) => {
Alert.alert(
      t('strategy.unlinkVideoTitle'),
      t('strategy.unlinkVideoMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.unlink'),
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkVideoFromStrategy(video._id, strategy._id);
              // Recargar la lista de videos
              const result = await getVideosByStrategy(strategy._id);
              if (result.success) {
                setStrategyVideos(result.videos || []);
              }
              Alert.alert(t('message.success'), t('strategy.videoUnlinked'));
            } catch (error) {
              console.error('Error desasociando video:', error);
              Alert.alert(t('message.error'), t('strategy.unlinkVideoError'));
            }
          }
        }
      ]
    );
  };
  
  // Cerrar modal de video
  const closeVideoModal = () => {
    if (Platform.OS === 'web' && videoUrl) {
      revokeVideoObjectUrl(videoUrl);
    }
    setShowVideoModal(false);
    setSelectedVideo(null);
    setVideoUrl(null);
  };

  // Función para generar y compartir PDF
  // Función para generar PDF con campo a página completa (landscape)
  const generatePDF = async () => {
    try {
      // Preparar la imagen
      let imageBase64 = '';
      if (strategy.imagen) {
        if (strategy.imagen.startsWith('http')) {
          // Si es URL, intentar descargar
          try {
            const response = await fetch(strategy.imagen);
            const blob = await response.blob();
            const reader = new FileReader();
            imageBase64 = await new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          } catch (error) {
            console.error('Error descargando imagen:', error);
          }
        } else if (strategy.imagen.startsWith('data:image')) {
          imageBase64 = strategy.imagen;
        } else {
          // Es base64 sin prefijo
          imageBase64 = `data:image/png;base64,${strategy.imagen}`;
        }
      }

      // Crear HTML para el PDF - Campo grande con información de la estrategia
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
            .header-badge {
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
              gap: 10px;
              max-width: 280px;
              overflow-y: auto;
            }
            .info-card {
              background: white;
              border-radius: 8px;
              padding: 12px 14px;
              box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            }
            .info-card-title {
              font-size: 10px;
              font-weight: bold;
              color: #666;
              text-transform: uppercase;
              margin-bottom: 6px;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .info-card-content {
              font-size: 13px;
              color: #333;
              line-height: 1.5;
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
            <div class="title">${strategy.nombre || t('strategy.strategy')}</div>
            ${getFolderName() ? `<div class="header-badge">${getFolderName()}</div>` : ''}
          </div>
          
          <div class="main-content">
            <div class="image-container">
              ${imageBase64 ? `<img src="${imageBase64}" alt="Diagrama de estrategia" />` : '<p style="color:#999">Sin imagen</p>'}
            </div>
            
            <div class="info-panel">
              ${getFolderName() ? `
              <div class="info-card">
                <div class="info-card-title">📁 ${t('folders.folder')}</div>
                <div class="info-card-content"><span class="type-badge">${getFolderName()}</span></div>
              </div>` : ''}
              
              ${strategy.descripcion ? `
              <div class="info-card">
                <div class="info-card-title">📝 ${t('strategy.description')}</div>
                <div class="info-card-content">${strategy.descripcion}</div>
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
      
      // Copiar el archivo con el nombre de la estrategia
      const fileName = `${(strategy.nombre || 'Estrategia').replace(/[/\?%*:|"<>]/g, '-')}.pdf`;
      await savePdfToDownloads(tempUri, fileName);
    } catch (error) {
      console.error('Error generando PDF:', error);
      Alert.alert(t('message.error'), t('strategy.pdfGenerateError'));
    }
  };

  // Función para guardar la imagen del campo en la galería
  const saveImageToGallery = async () => {
    try {
      if (!strategy.imagen) {
        Alert.alert(t('message.error'), t('strategy.imageSaveError'));
        return;
      }

      // Web: descargar como archivo, evitando lecturas CORS del CDN.
      if (Platform.OS === 'web') {
        await downloadImageSource(strategy.imagen, `strategy_${strategy.nombre || 'image'}_${Date.now()}`);
        return;
      }

      let imageUri = '';
      
      if (strategy.imagen.startsWith('http')) {
        // Si es URL, descargar primero
        const fileName = `strategy_${strategy.nombre || 'image'}_${Date.now()}.png`;
        const fileUri = FileSystem.documentDirectory + fileName;
        
        const downloadResult = await FileSystem.downloadAsync(
          strategy.imagen,
          fileUri
        );
        imageUri = downloadResult.uri;
      } else {
        // Si es base64, convertir a archivo
        const fileName = `strategy_${strategy.nombre || 'image'}_${Date.now()}.png`;
        const fileUri = FileSystem.documentDirectory + fileName;
        
        let base64Data = strategy.imagen;
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
          Alert.alert(t('message.success'), t('strategy.imageSaved'));
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
        Alert.alert(t('message.success'), t('strategy.imageSaved'));
      }
    } catch (error) {
      console.error('Error guardando imagen:', error);
      Alert.alert(t('message.error'), t('strategy.imageSaveError'));
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
            <Text style={styles.modalTitle}>{t('strategy.strategyDetails')}</Text>
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
                onPress={() => onEdit(strategy)}
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
                <MaterialIcons name="flag" size={24} color="#3578e5" />
                <Text style={styles.exerciseDetailTitle}>{strategy.nombre}</Text>
              </View>
            </View>

            {/* Imagen del campo */}
            {showField && (
              <View style={styles.detailSection}>
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedImage(strategy?.imagen);
                    setModalVisible(true);
                  }}
                  style={styles.fieldImageWrapper}
                >
                  <Base64ImagePreview
                    imageUrl={strategy?.imagen}
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
              <View style={styles.detailsSection}>
                {getFolderName() && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="folder-outline" size={18} color="#2196F3" />
                      <Text style={styles.detailCardTitle}>{t('folders.folder')}</Text>
                    </View>
                    <Text style={styles.detailCardContent}>
                      {getFolderName()}
                    </Text>
                  </View>
                )}

                {strategy.descripcion && (
                  <View style={{...styles.detailCard, marginBottom: strategyVideos.length > 0 ? 16 : 30}}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="document-text-outline" size={18} color="#9C27B0" />
                      <Text style={styles.detailCardTitle}>Descripción</Text>
                    </View>
                    <Text style={styles.detailCardContent}>{strategy.descripcion}</Text>
                  </View>
                )}
                
                {/* Sección de Videos de la Estrategia */}
                <View style={{...styles.detailCard, marginBottom: 30}}>
                    <View style={styles.detailCardHeader}>
                      <Feather name="video" size={18} color="#E91E63" />
                      <Text style={styles.detailCardTitle}>{t('strategy.videos') || 'Videos'}</Text>
                      {loadingVideos && <ActivityIndicator size="small" color="#E91E63" style={{ marginLeft: 8 }} />}
                    </View>
                    {!loadingVideos && strategyVideos.length > 0 && (
                      <View style={styles.videosGrid}>
                        {strategyVideos.map((video) => (
                          <View key={video._id} style={styles.videoCard}>
                            {/* Botón de desasociar */}
                            <TouchableOpacity
                              style={styles.videoUnlinkBtn}
                              onPress={() => handleUnlinkVideo(video)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Feather name="x" size={16} color="#EF4444" />
                            </TouchableOpacity>
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
                                style={[styles.videoActionBtn, styles.videoPlayBtn]}
                                onPress={() => handlePlayVideo(video)}
                              >
                                <Feather name="play" size={16} color="#fff" />
                                <Text style={styles.videoActionText}>{t('strategy.play') || 'Ver'}</Text>
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
                                    <Text style={styles.videoActionText}>{t('strategy.download') || 'Descargar'}</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                    {!loadingVideos && strategyVideos.length === 0 && (
                      <Text style={styles.noVideosText}>{t('strategy.noVideos') || 'No hay videos asociados'}</Text>
                    )}
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

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
                  if (selectedImage?.startsWith('http')) {
                    const timestamp = new Date().getTime();
                    return selectedImage.includes('?') 
                      ? `${selectedImage}&t=${timestamp}` 
                      : `${selectedImage}?t=${timestamp}`;
                  }
                  return `data:image/png;base64,${selectedImage}`;
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
            {t('strategy.zoomHint')}
          </Text>
        </View>
      </Modal>
      
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
                {selectedVideo?.nombre || t('strategy.video')}
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
                <Text style={styles.videoLoadingText}>{t('strategy.generatingVideo') || 'Generando video...'}</Text>
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
                    <Text style={styles.videoModalBtnText}>{t('strategy.saveToGallery') || 'Guardar en galería'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function FolderManagement({ folders, foldersFlat, onBack, dispatch, createFolder, updateFolder, deleteFolder, idUsuario, IS_MOBILE }) {
  const { t } = useTranslation();
  const [editingFolder, setEditingFolder] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [editingFolderColor, setEditingFolderColor] = useState('#2196F3');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#2196F3');

  // Navegación de subcarpetas
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]); // [{_id, nombre, color}]
  const currentDepth = folderPath.length;
  
  const FOLDER_COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'];

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
    if (!newFolderName.trim()) { Alert.alert(t('message.error'), t('folders.nameRequired')); return; }
    try {
      await dispatch(createFolder({ nombre: newFolderName.trim(), parentFolder: currentFolderId, color: newFolderColor })).unwrap();
      setCreatingFolder(false); setNewFolderName(''); setNewFolderColor('#2196F3');
      dispatch(fetchStrategyFolders());
      dispatch(fetchStrategyFoldersFlat());
    } catch (e) { Alert.alert(t('message.error'), e.message || t('folders.createError')); }
  };

  const handleUpdate = async () => {
    if (!editingFolderName.trim()) { Alert.alert(t('message.error'), t('folders.nameRequired')); return; }
    try {
      await dispatch(updateFolder({ id: editingFolder._id, nombre: editingFolderName.trim(), color: editingFolderColor })).unwrap();
      setEditingFolder(null); setEditingFolderName(''); setEditingFolderColor('#2196F3');
      dispatch(fetchStrategyFolders());
      dispatch(fetchStrategyFoldersFlat());
    } catch (e) { Alert.alert(t('message.error'), e.message || t('folders.updateError')); }
  };

  const handleDeleteFolder = (folder) => {
    Alert.alert(t('message.warning'), t('folders.deleteConfirmation', { name: folder.nombre }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try {
          await dispatch(deleteFolder(folder._id)).unwrap();
          dispatch(fetchStrategyFolders());
          dispatch(fetchStrategyFoldersFlat());
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
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#333', flex: 1 }}>{t('folders.manageFolders')}</Text>
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
              <TextInput style={{ borderWidth: 2, borderColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff', marginBottom: 12 }}
                value={newFolderName} onChangeText={setNewFolderName} placeholder={t('folders.folderNamePlaceholder')} autoFocus={true} />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {FOLDER_COLORS.map(color => (
                  <TouchableOpacity key={color} onPress={() => setNewFolderColor(color)}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, borderWidth: newFolderColor === color ? 3 : 0, borderColor: '#333' }} />
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

          {displayedFolders.map((folder, index) => (
            <View key={folder._id || index} style={{ backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, padding: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: editingFolder?._id === folder._id ? '#2196F3' : (folder.color || '#2196F3') }}>
              {editingFolder?._id === folder._id ? (
                <View>
                  <TextInput style={{ borderWidth: 2, borderColor: '#2196F3', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 12 }}
                    value={editingFolderName} onChangeText={setEditingFolderName} autoFocus={true} />
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {FOLDER_COLORS.map(color => (
                      <TouchableOpacity key={color} onPress={() => setEditingFolderColor(color)}
                        style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, borderWidth: editingFolderColor === color ? 3 : 0, borderColor: '#333' }} />
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                    <TouchableOpacity onPress={() => setEditingFolder(null)} style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12 }}>
                      <Ionicons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleUpdate} style={{ backgroundColor: '#2196F3', borderRadius: 8, padding: 12 }}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  onPress={() => { if (currentDepth < 2) navigateToFolder(folder); }}
                  activeOpacity={currentDepth < 2 ? 0.7 : 1}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: (folder.color || '#2196F3') + '18', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="folder" size={26} color={folder.color || '#2196F3'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: IS_MOBILE ? 16 : 18, color: '#333', fontWeight: '500' }}>{folder.nombre}</Text>
                      <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                        {folder.exerciseCount || folder.strategyCount || 0} {t('folders.items')} {folder.subfolderCount > 0 ? `· ${folder.subfolderCount} ${t('folders.subfolders')}` : ''}
                      </Text>
                    </View>
                    {currentDepth < 2 && <Ionicons name="chevron-forward" size={18} color="#ccc" style={{ marginRight: 8 }} />}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); setEditingFolder(folder); setEditingFolderName(folder.nombre); setEditingFolderColor(folder.color || '#2196F3'); }}
                      style={{ backgroundColor: '#e3f2fd', borderRadius: 8, padding: 10 }}>
                      <Ionicons name="pencil" size={18} color="#2196F3" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }} style={{ backgroundColor: '#ffebee', borderRadius: 8, padding: 10 }}>
                      <Ionicons name="trash" size={18} color="#f44336" />
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

function StrategyCard({ strategy, onPress, IS_MOBILE, isGrid = false, forceWidth = null, forceHeight = null, onOpenOptions }) {
  
  // Función para obtener el nombre de la carpeta
  const getFolderName = () => {
    if (!strategy.folder) return null;
    if (typeof strategy.folder === 'object') return strategy.folder.nombre;
    return null;
  };
  
  // Mostrar imagen si existe
  const showField = (strategy.elementosCampo && strategy.elementosCampo.length > 0 && strategy.tipoCampo) || strategy.imagen;

  return (
    <View style={[
      styles.exerciseCard, 
      IS_MOBILE && styles.exerciseCardMobile,
      isGrid && styles.exerciseCardGrid,
      isGrid && IS_MOBILE && styles.exerciseCardGridMobile
    ]}>
      <Pressable
        onPress={() => onPress(strategy)}
        style={({ pressed }) => [
          styles.exerciseCardContent,
          pressed && styles.exerciseCardPressed,
          isGrid && { flexDirection: 'column', alignItems: 'center' }
        ]}
      >
        {showField && (
          <View style={{
            width: forceWidth || (isGrid ? (IS_MOBILE ? 100 : 130) : (IS_MOBILE ? FIELD_WIDTH_MOBILE : FIELD_WIDTH)),
            height: forceHeight || (isGrid ? (IS_MOBILE ? 60 : 78) : (IS_MOBILE ? FIELD_HEIGHT_MOBILE : FIELD_HEIGHT)),
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: isGrid ? 0 : 12,
            marginBottom: isGrid ? 8 : 0,
          }}>
            <Base64ImagePreview 
              imageUrl={strategy?.imagen} 
              forceWidth={forceWidth || (isGrid ? (IS_MOBILE ? 100 : 130) : (IS_MOBILE ? FIELD_WIDTH_MOBILE : FIELD_WIDTH))}
              forceHeight={forceHeight || (isGrid ? (IS_MOBILE ? 60 : 78) : (IS_MOBILE ? FIELD_HEIGHT_MOBILE : FIELD_HEIGHT))}
            />
          </View>
        )}
        
        <View style={[styles.cardInfo, isGrid && styles.cardInfoGrid]}>
          <Text 
            style={[
              styles.cardTitle, 
              IS_MOBILE && styles.cardTitleMobile,
              isGrid && styles.cardTitleGrid
            ]} 
            numberOfLines={isGrid ? 2 : 1} 
            ellipsizeMode="tail"
          >
            {strategy.nombre}
          </Text>
          
          {getFolderName() && (
            <View style={[styles.infoTagsContainer, isGrid && styles.infoTagsContainerGrid]}>
              <View style={[styles.infoTag, isGrid && styles.infoTagGrid, { backgroundColor: '#e8f5e9' }]}>
                <Ionicons name="folder" size={isGrid ? 10 : 12} color="#388e3c" />
                <Text style={[styles.infoTagText, isGrid && styles.infoTagTextGrid, { color: '#388e3c' }]}>
                  {getFolderName()}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Pressable>
      
      {!isGrid && (
        <View style={styles.exerciseCardActions}>
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={() => onOpenOptions && onOpenOptions(strategy)}
          >
            <MaterialIcons name="more-vert" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function StrategyList({ navigation: navigationProp }) {
  // Fallback: en web la pantalla se renderiza desde una page wrapper que no
  // pasa `navigation`, así que tomamos el del shim cuando falta.
  const navigationFromHook = useNavigation();
  const navigation = navigationProp || navigationFromHook;
  const strategies = useSelector(state => state.strategy.strategies) || [];
  const strategyFolders = useSelector(state => state.strategy.folders) || [];
  const strategyFoldersFlat = useSelector(state => state.strategy.foldersFlat) || [];
  const currentFolder = useSelector(state => state.strategy.currentFolder);
  const currentFolderStrategies = useSelector(state => state.strategy.currentFolderStrategies) || [];
  const currentFolderSubfolders = useSelector(state => state.strategy.currentFolderSubfolders) || [];
  const loading = useSelector(state => state.strategy.loading);
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const [creating, setCreating] = useState(() => {
    // En web esta lista se desmonta al navegar al editor del campo y se
    // remonta al volver. Restauramos el modo edición/creación para que el
    // formulario reaparezca con su borrador.
    const s = loadFormDraft(STORAGE_KEYS.STRATEGY_LIST, { remove: false });
    return !!s?.creating;
  });
  const [editingStrategy, setEditingStrategy] = useState(() => {
    const s = loadFormDraft(STORAGE_KEYS.STRATEGY_LIST, { remove: false });
    return s?.editingStrategy || null;
  });
  const [viewingStrategy, setViewingStrategy] = useState(null);
  const [idUsuario, setIdUsuario] = useState("");
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  // Estados para modal de opciones en cada tarjeta
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedStrategyForOptions, setSelectedStrategyForOptions] = useState(null);
  const [filters, setFilters] = useState({
    titulo: ''
  });

  // Estados para navegación de carpetas
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [showMoveToFolder, setShowMoveToFolder] = useState(false);
  const [strategyToMove, setStrategyToMove] = useState(null);

  // Modal para crear carpeta (estilo myVideos)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#8B5CF6');

  // Menú de carpeta (estilo myVideos)
  const [folderMenuVisible, setFolderMenuVisible] = useState(false);
  const [menuFolder, setMenuFolder] = useState(null);

  // Editar carpeta
  const [editFolderModalVisible, setEditFolderModalVisible] = useState(false);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('#8B5CF6');

  // Notificaciones
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' });

  const folderColors = [
    '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', 
    '#F43F5E', '#F97316', '#EAB308', '#22C55E', 
    '#14B8A6', '#06B6D4', '#64748B', '#78716C'
  ];

  const { width: screenWidth } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;
  const IS_TABLET = screenWidth > 700;
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

  // Manejar botón de back del dispositivo
  useEffect(() => {
    const backHandler = () => {
      if (viewingStrategy) {
        setViewingStrategy(null);
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
  }, [viewingStrategy, currentFolderId, folderPath]);

  useEffect(() => {
    const loadUser = async () => {
      const usuario = await AsyncStorage.getItem('usuario');
      const u = JSON.parse(usuario)?._id;
      setIdUsuario(u);
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (idUsuario) {
      dispatch(fetchEstrategiasUsuario({ user: idUsuario }));
      dispatch(fetchStrategyFolders());
      dispatch(fetchStrategyFoldersFlat());
    }
  }, [idUsuario, dispatch]);

  // Efecto para navegación de carpetas
  useEffect(() => {
    if (currentFolderId && idUsuario) {
      dispatch(fetchStrategyFolderById({ id: currentFolderId }));
    } else {
      dispatch(clearCurrentFolder());
    }
  }, [currentFolderId, idUsuario, dispatch]);

  // Persistir el modo edición/creación para sobrevivir al desmontaje en web
  // cuando el usuario navega al editor del campo táctico.
  useEffect(() => {
    if (creating) {
      saveFormDraft(STORAGE_KEYS.STRATEGY_LIST, { creating, editingStrategy });
    } else {
      clearFormDraft(STORAGE_KEYS.STRATEGY_LIST);
    }
  }, [creating, editingStrategy]);

  const handleSave = async (strategy) => {
    if (!strategy._id) {
      const { _id, ...strategySinId } = strategy;
      await dispatch(createEstrategia(strategySinId));
    } else {
      await dispatch(updateEstrategia(strategy));
    }
    setCreating(false);
    setEditingStrategy(null);
    clearFormDraft(STORAGE_KEYS.STRATEGY_LIST);
    clearFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT);
    clearFormDraft(STORAGE_KEYS.FIELD_RESULT);
    // Recargar datos para reflejar cambios
    dispatch(fetchEstrategiasUsuario({ user: idUsuario }));
    if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId }));
  };

  const handleCancel = () => {
    setCreating(false);
    setEditingStrategy(null);
    clearFormDraft(STORAGE_KEYS.STRATEGY_LIST);
    clearFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT);
    clearFormDraft(STORAGE_KEYS.FIELD_RESULT);
  };

  const filteredStrategies = strategies.filter(strategy => {
    const tituloMatch = !filters.titulo || 
      strategy.nombre.toLowerCase().includes(filters.titulo.toLowerCase());
    
    return tituloMatch;
  });

  // Lógica de visualización basada en carpetas
  const displayedStrategies = currentFolderId
    ? currentFolderStrategies.filter(strategy => {
        const tituloMatch = !filters.titulo ||
          strategy.nombre.toLowerCase().includes(filters.titulo.toLowerCase());
        return tituloMatch;
      })
    : filteredStrategies.filter(s => !s.folder);

  const displayedSubfolders = currentFolderId
    ? currentFolderSubfolders
    : strategyFolders.filter(f => !f.parentFolder);

  // Funciones de navegación de carpetas
  const navigateToFolder = (folder) => {
    setFolderPath(prev => [...prev, { id: folder._id, name: folder.nombre }]);
    setCurrentFolderId(folder._id);
  };

  const navigateBack = () => {
    if (folderPath.length > 1) {
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1].id);
    } else {
      setFolderPath([]);
      setCurrentFolderId(null);
    }
  };

  const navigateToRoot = () => {
    setFolderPath([]);
    setCurrentFolderId(null);
  };

  const navigateToBreadcrumb = (index) => {
    if (index < 0) {
      navigateToRoot();
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath[newPath.length - 1].id);
    }
  };

  const handleMoveToFolder = async (targetFolderId) => {
    if (!strategyToMove) return;
    try {
      await dispatch(moveStrategyToFolder({
        strategyId: strategyToMove._id,
        folderId: targetFolderId
      })).unwrap();
      
      // Refresh data
      dispatch(fetchEstrategiasUsuario({ user: idUsuario }));
      dispatch(fetchStrategyFolders());
      if (currentFolderId) {
        dispatch(fetchStrategyFolderById({ id: currentFolderId }));
      }
      
      setShowMoveToFolder(false);
      setStrategyToMove(null);
    } catch (error) {
      Alert.alert(t('message.error'), t('folders.moveError'));
    }
  };

const handleDelete = (strategy) => {
    Alert.alert(
      t('strategy.deleteStrategy'),
      t('strategy.deleteStrategyConfirmationName', { name: strategy.nombre }),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('common.delete'),
          style: "destructive",
          onPress: async () => {
            await dispatch(deleteEstrategia(strategy._id));
            showNotification(t('strategy.strategyDeleted', 'Estrategia eliminada'), 'success');
            // Recargar datos para reflejar cambios
            dispatch(fetchEstrategiasUsuario({ user: idUsuario }));
            if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId }));
          }
        }
      ]
    );
  };

  const handleStrategyPress = (strategy) => {
    setViewingStrategy(strategy);
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
      await dispatch(createStrategyFolder({ 
        nombre: newFolderName.trim(), 
        parentFolder: currentFolderId, 
        color: newFolderColor 
      })).unwrap();
      showNotification(t('folders.folderCreated'), 'success');
      setShowCreateFolderModal(false);
      setNewFolderName('');
      setNewFolderColor('#8B5CF6');
      dispatch(fetchStrategyFolders());
      dispatch(fetchStrategyFoldersFlat());
      if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId }));
    } catch (error) {
      const errorMsg = error?.message || t('folders.createError');
      showNotification(errorMsg, 'error');
    }
  };

  // Eliminar carpeta estilo myVideos
  const handleDeleteFolder = (folder) => {
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
              await dispatch(deleteStrategyFolder({ id: folder._id })).unwrap();
              showNotification(t('folders.folderDeleted'), 'success');
              dispatch(fetchStrategyFolders());
              dispatch(fetchStrategyFoldersFlat());
              if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId }));
            } catch (error) {
              showNotification(t('folders.deleteError'), 'error');
            }
          }
        }
      ]
    );
  };

  const handleEditFolder = (folder) => {
    setMenuFolder(folder);
    setEditFolderName(folder.nombre);
    setEditFolderColor(folder.color || '#8B5CF6');
    setEditFolderModalVisible(true);
  };

  const handleUpdateFolder = async () => {
    if (!editFolderName.trim()) {
      showNotification(t('folders.nameRequired'), 'error');
      return;
    }
    try {
      await dispatch(updateStrategyFolder({ id: menuFolder._id, nombre: editFolderName.trim(), color: editFolderColor })).unwrap();
      showNotification(t('folders.folderUpdated'), 'success');
      setEditFolderModalVisible(false);
      dispatch(fetchStrategyFolders());
      dispatch(fetchStrategyFoldersFlat());
      if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId }));
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
      <View style={[styles.mvFolderIconContainer, { backgroundColor: folder.color || '#8B5CF6' }]}>
        <Feather name="folder" size={28} color="#fff" />
      </View>
      <View style={styles.mvFolderContent}>
        <Text style={styles.mvFolderName} numberOfLines={1}>{folder.nombre}</Text>
        <View style={styles.mvFolderStats}>
          <Ionicons name="football-outline" size={12} color="#94A3B8" />
          <Text style={styles.mvFolderStatsText}> {folder.strategiesCount || 0}</Text>
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
          <Text style={{ marginTop: 16, color: '#2474E5', fontWeight: 'bold', fontSize: 16 }}>{t('strategy.loadingStrategies')}</Text>
        </View>
      </AppLayout>
    );
  }

  if (viewingStrategy) {
    return (
      <StrategyDetail
        strategy={viewingStrategy}
        onBack={() => setViewingStrategy(null)}
        navigation={navigation}
        onEdit={(strategy) => {
          setEditingStrategy(strategy);
          setCreating(true);
          setViewingStrategy(null);
        }}
        onDelete={handleDelete}
      />
    );
  }

  if (creating || editingStrategy) {
    return (
      <CreateStrategyForm
        navigation={navigation}
        onSave={handleSave}
        onCancel={handleCancel}
        editingStrategy={editingStrategy}
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
                  onPress={() => setShowCreateFolderModal(true)}
                  activeOpacity={0.7}
                >
                  <Feather name="folder-plus" size={20} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => { setCreating(true); setEditingStrategy(null); }}
                style={styles.mvCreateButton}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#fff" />
                {!IS_MOBILE && <Text style={styles.mvCreateButtonText}>{t('strategy.createStrategy')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Breadcrumb estilo myVideos */}
          <View style={styles.mvBreadcrumb}>
            <TouchableOpacity 
              onPress={navigateToRoot} 
              style={[styles.mvBreadcrumbItem, folderPath.length === 0 && styles.mvBreadcrumbItemActive]}
            >
              <Feather name="home" size={16} color={folderPath.length === 0 ? "#8B5CF6" : "#64748B"} />
              <Text style={[styles.mvBreadcrumbText, folderPath.length === 0 && styles.mvBreadcrumbTextActive]}>{t('folders.root')}</Text>
            </TouchableOpacity>
            {folderPath.map((crumb, index) => (
              <React.Fragment key={crumb.id}>
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
                    {crumb.name}
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
              placeholder={t('strategy.searchForTitle')}
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
        {loading ? (
          <View style={styles.mvLoadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.mvLoadingText}>{t('common.loading')}</Text>
          </View>
        ) : (displayedSubfolders.length === 0 && displayedStrategies.length === 0) ? (
          <View style={styles.mvEmptyContainer}>
            <View style={styles.mvEmptyIconContainer}>
              <Ionicons name="football-outline" size={48} color="#CBD5E1" />
            </View>
            <Text style={styles.mvEmptyTitle}>
              {filters.titulo ? t('strategy.noStrategiesFiltered') : currentFolderId ? t('folders.emptyFolder') : t('strategy.noStrategiesCreated')}
            </Text>
            <Text style={styles.mvEmptySubtitle}>
              {filters.titulo 
                ? t('strategy.clearFiltersText')
                : t('strategy.createFirstStrategy')
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
            
            {/* Estrategias */}
            {displayedStrategies.length > 0 && (
              <View style={styles.mvSection}>
                <View style={styles.mvSectionHeader}>
                  <Ionicons name="football-outline" size={16} color="#64748B" />
                  <Text style={styles.mvSectionTitle}>{t('strategy.strategies')}</Text>
                  <View style={styles.mvSectionBadge}>
                    <Text style={styles.mvSectionBadgeText}>{displayedStrategies.length}</Text>
                  </View>
                </View>
                <View style={styles.mvItemsContainer}>
                  {displayedStrategies.map(item => (
                    <View key={item._id || item.id} style={{ width: '100%' }}>
                      <StrategyCard
                        strategy={item}
                        onPress={handleStrategyPress}
                        onOpenOptions={(s) => { setSelectedStrategyForOptions(s); setOptionsModalVisible(true); }}
                        IS_MOBILE={IS_MOBILE}
                        isGrid={false}
                        forceWidth={null}
                        forceHeight={null}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Strategy Options Modal - Action Sheet estilo myVideos */}
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
                <Text style={styles.mvActionSheetTitle} numberOfLines={1}>{selectedStrategyForOptions?.nombre}</Text>
                <Text style={styles.mvActionSheetSubtitle}>{t('strategy.strategyOptions')}</Text>
              </View>
              
              <View style={styles.mvActionSheetBody}>
                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    handleStrategyPress(selectedStrategyForOptions);
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: '#F3E8FF' }]}>
                    <Feather name="eye" size={20} color="#8B5CF6" />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={styles.mvActionTitle}>{t('strategy.lookDetails')}</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    setEditingStrategy(selectedStrategyForOptions);
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
                  onPress={() => {
                    setOptionsModalVisible(false);
                    setStrategyToMove(selectedStrategyForOptions);
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
                    handleDelete(selectedStrategyForOptions);
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
                  <View style={[styles.mvActionIcon, { backgroundColor: '#F3E8FF' }]}>
                    <Feather name="folder" size={20} color="#8B5CF6" />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={styles.mvActionTitle}>{t('folders.openFolder')}</Text>
                  </View>
                </TouchableOpacity>
                
                <View style={styles.mvActionDivider} />

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
                  <View style={[styles.mvCreateModalIconContainer, { backgroundColor: '#F3E8FF' }]}>
                    <Feather name="folder-plus" size={28} color="#8B5CF6" />
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
                    <Feather name="folder" size={24} color="#8B5CF6" />
                    <Text style={styles.mvCreateCardTitle}>{t('folders.folderData')}</Text>
                  </View>

                  <View style={styles.mvCreateCardContent}>
                    <Text style={styles.mvCreateInputLabel}>{t('folders.folderNameLabel')}</Text>
                    <TextInput
                      style={styles.mvCreateInput}
                      placeholder={t('folders.folderNamePlaceholder')}
                      placeholderTextColor="#94A3B8"
                      value={newFolderName}
                      onChangeText={setNewFolderName}
                      maxLength={50}
                    />
                    
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
          onRequestClose={() => { setShowMoveToFolder(false); setStrategyToMove(null); }}
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
                
                {strategyFoldersFlat.map(folder => (
                  <TouchableOpacity
                    key={folder._id}
                    style={[
                      styles.mvFolderSelectItem,
                      folder.parentFolder && { marginLeft: 16 }
                    ]}
                    onPress={() => handleMoveToFolder(folder._id)}
                  >
                    <View style={[styles.mvFolderSelectIcon, { backgroundColor: folder.color || '#8B5CF6' }]}>
                      <Feather name="folder" size={16} color="#fff" />
                    </View>
                    <Text style={styles.mvFolderSelectText}>{folder.nombre}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.mvFormModalFooter}>
                <TouchableOpacity 
                  style={styles.mvSecondaryButton}
                  onPress={() => { setShowMoveToFolder(false); setStrategyToMove(null); }}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f6fc',
  },
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
    maxWidth: 36,
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
    paddingVertical: 8,
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
  manageTypesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#f5f5f5",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 8,
  },
  manageTypesButtonMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  manageTypesButtonText: {
    marginLeft: 7,
    color: "#666",
    fontWeight: "600",
    fontSize: 14,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
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
    paddingBottom: 34,
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
  filtersContainer: {
    marginBottom: 16,
    paddingHorizontal: 14,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  closeButton: {
    padding: 4,
  },
  modalTitleMobile: {
    fontSize: 18,
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
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  exerciseCardGridMobile: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  exerciseCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    minHeight: 50,
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
    textShadowColor: '#e6eefc',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
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
  exerciseCardActions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  cardActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContentTablet: {
    width: '70%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  modalEditButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff3cd',
    marginRight: 8,
  },
  modalPdfButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffebee',
    marginRight: 8,
  },
  modalImageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    marginRight: 8,
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  modalBody: {
    padding: 16,
  },
  // --- Modal de opciones (igual que en ejercicios) ---
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
  exerciseDetailCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  exerciseDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  detailSection: {
    marginBottom: 16,
  },
  fieldImageWrapper: {
    position: 'relative',
    alignSelf: 'center',
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  detailsSection: {
    gap: 12,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3578e5',
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
  },
  detailCardContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  
  // --- Estilos para Videos de la Estrategia ---
  videosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  videoCard: {
    backgroundColor: '#fef7f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fce4ec',
    padding: 12,
    minWidth: 140,
    flex: 1,
    maxWidth: '100%',
    position: 'relative',
  },
  videoUnlinkBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  videoCardContent: {
    alignItems: 'center',
    marginBottom: 12,
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
    gap: 8,
  },
  videoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  videoPlayBtn: {
    backgroundColor: '#E91E63',
  },
  videoDownloadBtn: {
    backgroundColor: '#4CAF50',
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
    aspectRatio: 16 / 9,
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
    gap: 8,
  },
  videoModalDownloadBtn: {
    backgroundColor: '#4CAF50',
  },
  videoModalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // --- Estilos de carpetas ---
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
    fontSize: 13,
    color: '#2474E5',
    fontWeight: '500',
  },
  breadcrumbTextActive: {
    color: '#333',
    fontWeight: '700',
  },
  foldersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  folderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  folderIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  folderCardName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  folderCardCount: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },

  // ===== Estilos myVideos para StrategyList =====
  mvContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header
  mvHeader: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'web' ? 16 : 10,
    paddingBottom: Platform.OS === 'web' ? 12 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mvHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 12,
    marginBottom: Platform.OS === 'web' ? 12 : 8,
  },
  mvHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mvHeaderTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  mvAddFolderButton: {
    backgroundColor: '#8B5CF6',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
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
    gap: 6,
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
    backgroundColor: '#8B5CF6',
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
    gap: 6,
  },
  mvBreadcrumbItemActive: {
    backgroundColor: '#F3E8FF',
  },
  mvBreadcrumbText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    maxWidth: 120,
  },
  mvBreadcrumbTextActive: {
    color: '#8B5CF6',
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
    backgroundColor: '#F3E8FF',
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
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#8B5CF6',
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
