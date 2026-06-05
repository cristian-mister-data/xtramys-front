import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, Alert, FlatList, TouchableOpacity, Image, ActivityIndicator, Modal, TextInput, ScrollView, BackHandler, Platform, Dimensions } from 'react-native';
import { useTheme } from 'styled-components';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLayout from '@/vendor/shared/appLayout';
import CreateStrategyForm from './createStrategyForm';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchEstrategiasUsuario,
  createEstrategia,
  updateEstrategia,
  deleteEstrategia,
  duplicateGlobalStrategy,
  duplicateStrategyToFolder,
  fetchGlobalStrategies,
  fetchGlobalFolders,
  toggleFavoriteStrategy,
  batchDeleteStrategies,
  batchMoveStrategies,
} from '@/store/slices/strategy/strategyThunks';
import {
  fetchStrategyFolders,
  fetchStrategyFolderById,
  createStrategyFolder,
  updateStrategyFolder,
  deleteStrategyFolder,
  moveStrategyToFolder,
  fetchStrategyFoldersFlat,
} from '@/store/slices/strategy/strategyThunks';
import { clearCurrentFolder } from '@/store/slices/strategy/strategySlice';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Base64ImagePreview, { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';
import ImageZoom from 'react-native-image-pan-zoom';
import { generateStrategyPdf } from '@/vendor/strategy/pdf';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { savePdfToDownloads } from '@/utils/pdfDownload';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { getVideosByStrategy, getVideoStreamUrl, getVideoDownloadUrl, regenerateVideoWithField, unlinkVideoFromStrategy, getVideoForEdit, duplicateVideoForEdit } from '@/utils/api';
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

function StrategyDetail({ strategy, onBack, navigation, onEdit, onDelete, onEditVideo, userRole }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width: screenWidth } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;
  const IS_TABLET = screenWidth > 700;
  // Mostrar imagen si existe
  const showField = (strategy.elementosCampo && strategy.elementosCampo.length > 0 && strategy.tipoCampo) || strategy.imagen;
  const dispatch = useDispatch();

  const getLocalizedName = () => {
    if (i18n.language === 'en' && strategy.translations?.en?.nombre) {
      return strategy.translations.en.nombre;
    }
    return strategy.nombre;
  };

  const getLocalizedDescription = () => {
    if (i18n.language === 'en' && strategy.translations?.en?.descripcion) {
      return strategy.translations.en.descripcion;
    }
    return strategy.descripcion;
  };

  const getLocalizedObjective = () => {
    if (i18n.language === 'en' && strategy.translations?.en?.objetivo) {
      return strategy.translations.en.objetivo;
    }
    return strategy.objetivo;
  };

  const getLocalizedVideoName = (video) => {
    if (i18n.language === 'en' && video?.translations?.en?.nombre) {
      return video.translations.en.nombre;
    }
    return video?.nombre || t('strategy.video');
  };

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
  
  // Función para reproducir video - misma lógica que myVideos
  const handlePlayVideo = async (video) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
    setIsGenerating(true);

    try {
      const resolvedUrl = await resolvePlayableVideoUrl(video);
      if (!resolvedUrl) throw new Error('No se pudo resolver la URL del vídeo');
      setVideoUrl(resolvedUrl);
    } catch (error) {
      console.error('Error reproduciendo video:', error);
      Alert.alert(t('message.error'), t('strategy.videoPlayError'));
      setShowVideoModal(false);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Función para descargar video - misma lógica que myVideos
  const handleDownloadVideo = async (video) => {
    if (downloadingVideo) return;
    
    setDownloadingVideo(true);
    try {
      const videoObj = typeof video === 'object' && video ? video : { id: video };
      await downloadResolvedVideo(videoObj, getLocalizedVideoName(videoObj));
      Alert.alert(t('message.success'), t('video.savedToGallery'));
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

      await generateStrategyPdf(strategy, getFolderName(), imageBase64, t);
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
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="picture-as-pdf" size={20} color={theme.colors.errorSoftText} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalImageButton}
                    onPress={saveImageToGallery}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="image" size={20} color={theme.colors.successSoftText} />
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={styles.modalEditButton}
                onPress={() => onEdit(strategy)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="edit" size={20} color={theme.colors.warningSoftText} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={onBack}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.exerciseDetailCard}>
              <View style={styles.exerciseDetailHeader}>
                <MaterialIcons name="flag" size={24} color="#3578e5" />
                <Text style={styles.exerciseDetailTitle}>{getLocalizedName()}</Text>
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
                      <Text style={styles.detailCardTitle}>{t('strategy.description')}</Text>
                    </View>
                    <Text style={styles.detailCardContent}>{getLocalizedDescription()}</Text>
                  </View>
                )}

                {strategy.objetivo && (
                  <View style={{...styles.detailCard, marginBottom: strategyVideos.length > 0 ? 16 : 30}}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="flag-outline" size={18} color="#E91E63" />
                      <Text style={styles.detailCardTitle}>{t('strategy.objective')}</Text>
                    </View>
                    <Text style={styles.detailCardContent}>{getLocalizedObjective()}</Text>
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
                                {getLocalizedVideoName(video)}
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
                                style={[styles.videoActionBtn, { backgroundColor: '#F59E0B' }]}
                                onPress={() => onEditVideo && onEditVideo(video, strategy)}
                              >
                                <Feather name="edit-3" size={14} color="#fff" />
                                <Text style={styles.videoActionText}>{t('edition.edit') || 'Editar'}</Text>
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
              backgroundColor: theme.colors.surfaceAlt,
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
            <Text style={{ fontSize: 26, color: theme.colors.text, fontWeight: 'bold' }}>×</Text>
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
            position: 'absolute', bottom: 24, color: theme.colors.onPrimary, textAlign: 'center', width: '100%', fontWeight: 'bold'
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
                {selectedVideo ? getLocalizedVideoName(selectedVideo) : t('strategy.video')}
              </Text>
              <TouchableOpacity
                style={styles.videoModalCloseBtn}
                onPress={closeVideoModal}
              >
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
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
          <TouchableOpacity onPress={handleBack} style={{ marginRight: 16, padding: 8, borderRadius: 8, backgroundColor: theme.colors.surfaceAlt, elevation: 2 }}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.colors.text, flex: 1 }}>{t('folders.manageFolders')}</Text>
          {currentDepth < 2 && (
            <TouchableOpacity onPress={() => setCreatingFolder(true)} style={{ backgroundColor: theme.colors.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 2 }}>
              <Ionicons name="add" size={20} color={theme.colors.onPrimary} />
              <Text style={{ color: theme.colors.onPrimary, fontWeight: '600', fontSize: IS_MOBILE ? 14 : 16 }}>
                {currentFolderId ? t('folders.createSubfolder') : t('common.create')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Breadcrumbs */}
        {folderPath.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingVertical: 8, paddingHorizontal: 8, backgroundColor: theme.colors.surfaceAlt, borderRadius: 10, marginBottom: 12, gap: 4, elevation: 1 }}>
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
            <View style={{ marginBottom: 20, backgroundColor: theme.colors.surfaceAlt, borderRadius: 12, padding: 16, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#4CAF50' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 12 }}>
                {currentFolderId ? t('folders.createSubfolder') : t('folders.createFolder')}
              </Text>
              <TextInput style={{ borderWidth: 2, borderColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: theme.colors.surfaceAlt, marginBottom: 12 }}
                value={newFolderName} onChangeText={setNewFolderName} placeholder={t('folders.folderNamePlaceholder')} autoFocus={true} />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {FOLDER_COLORS.map(color => (
                  <TouchableOpacity key={color} onPress={() => setNewFolderColor(color)}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, borderWidth: newFolderColor === color ? 3 : 0, borderColor: '#333' }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                <TouchableOpacity onPress={() => { setCreatingFolder(false); setNewFolderName(''); }} style={{ backgroundColor: theme.colors.surface, borderRadius: 8, padding: 12 }}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreate} style={{ backgroundColor: theme.colors.primary, borderRadius: 8, padding: 12 }}>
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
              {!currentFolderId && <Text style={{ color: theme.colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>{t('folders.useCreateButton')}</Text>}
            </View>
          )}

          {displayedFolders.map((folder, index) => (
            <View key={folder._id || index} style={{ backgroundColor: theme.colors.surfaceAlt, borderRadius: 12, marginBottom: 12, padding: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: editingFolder?._id === folder._id ? '#2196F3' : (folder.color || '#2196F3') }}>
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
                    <TouchableOpacity onPress={() => setEditingFolder(null)} style={{ backgroundColor: theme.colors.surface, borderRadius: 8, padding: 12 }}>
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
                      <Ionicons name="folder" size={26} color={theme.mode === 'dark' ? theme.colors.text : '#000'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: IS_MOBILE ? 16 : 18, color: theme.mode === 'dark' ? theme.colors.text : '#000', fontWeight: '500' }}>{folder.nombre}</Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
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
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }} style={{ backgroundColor: theme.colors.errorSoft, borderRadius: 8, padding: 10 }}>
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

function StrategyCard({ strategy, onPress, onLongPress, IS_MOBILE, isGrid = false, forceWidth = null, forceHeight = null, onOpenOptions, styles, isSelected = false, selectionMode = false, onToggleSelect, onToggleFavorite }) {
  const { i18n } = useTranslation();
  const theme = useTheme();
  const lang = i18n.language;

  const getLocalizedName = () => {
    if (lang === 'en' && strategy.translations?.en?.nombre) {
      return strategy.translations.en.nombre;
    }
    return strategy.nombre;
  };
  
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
      isGrid && IS_MOBILE && styles.exerciseCardGridMobile,
      isSelected && { borderColor: '#3578e5', borderWidth: 2, backgroundColor: theme?.colors?.primarySoft || '#EEF2FF' }
    ]}>
      {/* Checkbox de selección */}
      {selectionMode && (
        <TouchableOpacity
          style={{
            position: 'absolute', top: 6, left: 6, zIndex: 10,
            width: 22, height: 22, borderRadius: 11,
            backgroundColor: isSelected ? '#3578e5' : 'rgba(255,255,255,0.9)',
            borderWidth: 2, borderColor: isSelected ? '#3578e5' : '#CBD5E1',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
          }}
          onPress={() => onToggleSelect && onToggleSelect(strategy._id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isSelected && <Feather name="check" size={13} color="#fff" />}
        </TouchableOpacity>
      )}
      {/* Botón estrella favorito */}
      <TouchableOpacity
        style={{
          position: 'absolute', top: 6, right: isGrid ? 6 : 38, zIndex: 10,
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: strategy.favorito ? '#FEF3C7' : 'rgba(255,255,255,0.9)',
          borderWidth: 1, borderColor: strategy.favorito ? '#FDE68A' : '#E2E8F0',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
        }}
        onPress={() => onToggleFavorite && onToggleFavorite(strategy._id)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={strategy.favorito ? 'star' : 'star-outline'}
          size={16}
          color={strategy.favorito ? '#F59E0B' : '#94A3B8'}
        />
      </TouchableOpacity>
      <Pressable
        onPress={() => selectionMode ? (onToggleSelect && onToggleSelect(strategy._id)) : onPress(strategy)}
        onLongPress={() => {
          if (!selectionMode) { onLongPress && onLongPress(strategy); }
        }}
        delayLongPress={400}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
            <Text 
              style={[
                styles.cardTitle, 
                IS_MOBILE && styles.cardTitleMobile,
                isGrid && styles.cardTitleGrid,
                { flex: 1 },
              ]} 
              numberOfLines={isGrid ? 2 : 1} 
              ellipsizeMode="tail"
            >
              {getLocalizedName()}
            </Text>
            {strategy.isGlobal && (
              <Ionicons name="globe-outline" size={14} color="#16a34a" />
            )}
          </View>
          
          {getFolderName() && (
            <View style={[styles.infoTagsContainer, isGrid && styles.infoTagsContainerGrid]}>
              <View style={[styles.infoTag, isGrid && styles.infoTagGrid, { backgroundColor: theme.colors.successSoft }]}>
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
  const globalStrategies = useSelector(state => state.strategy.globalStrategies) || [];
  const globalFolders = useSelector(state => state.strategy.globalFolders) || [];
  const strategyFolders = useSelector(state => state.strategy.folders) || [];
  const strategyFoldersFlat = useSelector(state => state.strategy.foldersFlat) || [];
  const currentFolder = useSelector(state => state.strategy.currentFolder);
  const currentFolderStrategies = useSelector(state => state.strategy.currentFolderStrategies) || [];
  const currentFolderSubfolders = useSelector(state => state.strategy.currentFolderSubfolders) || [];
  const loading = useSelector(state => state.strategy.loading);
  const foldersLoading = useSelector(state => state.strategy.foldersLoading);
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation();

  const getStrategyLocalizedName = (strategy) => {
    if (i18n.language === 'en' && strategy?.translations?.en?.nombre) {
      return strategy.translations.en.nombre;
    }
    return strategy?.nombre || '';
  };
  const [creating, setCreating] = useState(() => {
    const s = loadFormDraft(STORAGE_KEYS.STRATEGY_LIST, { remove: false });
    const fieldResult = loadFormDraft(STORAGE_KEYS.FIELD_RESULT, { remove: false });
    return fieldResult?.kind === 'strategy' && !!s?.creating;
  });
  const [editingStrategy, setEditingStrategy] = useState(() => {
    const s = loadFormDraft(STORAGE_KEYS.STRATEGY_LIST, { remove: false });
    const fieldResult = loadFormDraft(STORAGE_KEYS.FIELD_RESULT, { remove: false });
    return fieldResult?.kind === 'strategy' ? (s?.editingStrategy || null) : null;
  });
  
  const [viewingStrategy, setViewingStrategy] = useState(null);
  const [idUsuario, setIdUsuario] = useState("");
  const [userRole, setUserRole] = useState('user');
  const [listFilter, setListFilter] = useState('all'); // 'all' | 'mine' | 'global' | 'favorites'
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  // Estados para modal de opciones en cada tarjeta
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedStrategyForOptions, setSelectedStrategyForOptions] = useState(null);
  const [filters, setFilters] = useState({
    titulo: ''
  });

  // Estado de selección múltiple
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchMoving, setBatchMoving] = useState(false);

  // Estados para navegación de carpetas
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [showMoveToFolder, setShowMoveToFolder] = useState(false);
  const [strategyToMove, setStrategyToMove] = useState(null);

  // Modal para crear carpeta (estilo myVideos)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderNameEn, setNewFolderNameEn] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3B82F6');
  const [newFolderIsGlobal, setNewFolderIsGlobal] = useState(false);

  // Menú de carpeta (estilo myVideos)
  const [folderMenuVisible, setFolderMenuVisible] = useState(false);
  const [menuFolder, setMenuFolder] = useState(null);

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

  const getDuplicateSuffix = useCallback(() => (i18n.language === 'en' ? 'duplicate' : 'duplicado'), [i18n.language]);
  const buildDuplicateName = useCallback((baseName) => `${(baseName || '').trim()}_${getDuplicateSuffix()}`, [getDuplicateSuffix]);

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
      const parsed = JSON.parse(usuario);
      const u = parsed?._id;
      setIdUsuario(u);
      setUserRole(parsed?.role || 'user');
    }
    loadUser();
  }, []);

  const lang = i18n.language;

  useEffect(() => {
    if (idUsuario) {
      dispatch(fetchEstrategiasUsuario({ user: idUsuario, lang }));
      dispatch(fetchStrategyFolders({ lang }));
      dispatch(fetchStrategyFoldersFlat({ lang }));
      dispatch(fetchGlobalStrategies({ lang }));
      dispatch(fetchGlobalFolders({ lang }));
    }
  }, [idUsuario, dispatch, lang]);

  useEffect(() => {
    if (global.pendingVideoEditSuccess) {
      global.pendingVideoEditSuccess = false;
      setTimeout(() => {
        setNotification({ visible: true, message: t('videoRecorder.videoUpdatedSuccess'), type: 'success' });
        setTimeout(() => setNotification({ visible: false, message: '', type: 'success' }), 3000);
      }, 300);
    }
  }, [t]);

  // Efecto para navegación de carpetas
  useEffect(() => {
    if (currentFolderId && idUsuario) {
      dispatch(fetchStrategyFolderById({ id: currentFolderId, lang }));
    } else {
      dispatch(clearCurrentFolder());
    }
  }, [currentFolderId, idUsuario, dispatch, lang]);

  // Persistir el modo edición/creación para sobrevivir al desmontaje en web
  // cuando el usuario navega al editor del campo táctico.
  useEffect(() => {
    if (creating || editingStrategy) {
      saveFormDraft(STORAGE_KEYS.STRATEGY_LIST, { creating: true, editingStrategy });
    } else {
      clearFormDraft(STORAGE_KEYS.STRATEGY_LIST);
    }
  }, [creating, editingStrategy]);

  const handleSave = async (strategy) => {
    if (!strategy._id) {
      const { _id, ...strategySinId } = strategy;
      await dispatch(createEstrategia(strategySinId));
      if (strategySinId.isGlobal) dispatch(fetchGlobalStrategies({ lang }));
    } else {
      await dispatch(updateEstrategia(strategy));
      if (strategy.isGlobal) dispatch(fetchGlobalStrategies({ lang }));
    }
    setCreating(false);
    setEditingStrategy(null);
    clearFormDraft(STORAGE_KEYS.STRATEGY_LIST);
    clearFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT);
    clearFormDraft(STORAGE_KEYS.FIELD_RESULT);
    // Recargar datos para reflejar cambios
    dispatch(fetchEstrategiasUsuario({ user: idUsuario, lang }));
    dispatch(fetchStrategyFolders({ lang }));
    dispatch(fetchStrategyFoldersFlat({ lang }));
    if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId, lang }));
  };

  const handleCancel = () => {
    setCreating(false);
    setEditingStrategy(null);
    clearFormDraft(STORAGE_KEYS.STRATEGY_LIST);
    clearFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT);
    clearFormDraft(STORAGE_KEYS.FIELD_RESULT);
  };

  const displayedStrategies = (() => {
    const hasFolder = (st) => st.folder !== null && st.folder !== undefined && st.folder !== '';
    if (listFilter === 'global') {
      if (currentFolderId) return currentFolderStrategies;
      const rootGlobal = globalStrategies.filter((s) => !hasFolder(s));
      const q = filters.titulo
        ? rootGlobal.filter((s) => s.nombre.toLowerCase().includes(filters.titulo.toLowerCase()))
        : rootGlobal;
      return q;
    }
    if (listFilter === 'favorites') {
      const favs = strategies.filter(ex => ex.favorito);
      return currentFolderId ? currentFolderStrategies.filter(e => e.favorito) : favs.filter(ex => !hasFolder(ex));
    }
    const base = listFilter === 'mine'
      ? strategies.filter((st) => !st.isGlobal)
      : strategies;
    return currentFolderId ? currentFolderStrategies : base.filter((st) => !hasFolder(st));
  })();

  const filteredStrategies = listFilter === 'global'
    ? displayedStrategies
    : displayedStrategies.filter((strategy) => {
      const tituloMatch = !filters.titulo
        || strategy.nombre.toLowerCase().includes(filters.titulo.toLowerCase());
      return tituloMatch;
    });

  const displayedSubfolders = (() => {
    if (currentFolderId) return currentFolderSubfolders;
    if (listFilter === 'global') return globalFolders.filter((f) => !f.parentFolder);
    if (listFilter === 'mine') return strategyFolders.filter((f) => !f.parentFolder && !f.isGlobal);
    return strategyFolders.filter((f) => !f.parentFolder);
  })();

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
      dispatch(fetchEstrategiasUsuario({ user: idUsuario, lang }));
      dispatch(fetchStrategyFolders({ lang }));
      if (currentFolderId) {
        dispatch(fetchStrategyFolderById({ id: currentFolderId, lang }));
      }
      
      setShowMoveToFolder(false);
      setStrategyToMove(null);
    } catch (error) {
      Alert.alert(t('message.error'), t('folders.moveError'));
    }
  };

const handleDelete = (strategy) => {
    if (strategy.isGlobal && userRole !== 'admin') {
      Alert.alert(t('message.info'), t('strategy.cannotDeleteGlobal'));
      return;
    }
    Alert.alert(
      t('strategy.deleteStrategy'),
      t('strategy.deleteStrategyConfirmationName', { name: getStrategyLocalizedName(strategy) }),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('common.delete'),
          style: "destructive",
          onPress: async () => {
            await dispatch(deleteEstrategia(strategy._id));
            showNotification(t('strategy.strategyDeleted', 'Estrategia eliminada'), 'success');
            // Recargar datos para reflejar cambios
            dispatch(fetchEstrategiasUsuario({ user: idUsuario, lang }));
            dispatch(fetchStrategyFolders({ lang }));
            dispatch(fetchStrategyFoldersFlat({ lang }));
            if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId, lang }));
          }
        }
      ]
    );
  };

  // ---- Selecci\u00f3n m\u00faltiple ----
  const handleStrategyLongPress = (strategy) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedIds(new Set([strategy._id]));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = filteredStrategies.map(e => e._id);
    setSelectedIds(new Set(allIds));
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleToggleFavorite = useCallback(async (strategyId) => {
    try {
      await dispatch(toggleFavoriteStrategy(strategyId)).unwrap();
    } catch (err) {
      showNotification(t('message.error'), 'error');
    }
  }, [dispatch, t]);

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      t('message.warning'),
      t('strategy.deleteStrategyConfirmationName', { count: selectedIds.size, name: selectedIds.size }) || `\u00bfEliminar ${selectedIds.size} estrategia(s)?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('edition.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(batchDeleteStrategies([...selectedIds])).unwrap();
              showNotification(t('strategy.strategyDeleted') || 'Eliminadas', 'success');
              dispatch(fetchEstrategiasUsuario({ user: idUsuario, lang }));
              dispatch(fetchStrategyFolders({ lang }));
              if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId, lang }));
              handleCancelSelection();
            } catch (err) {
              showNotification(t('message.error'), 'error');
            }
          }
        }
      ]
    );
  };

  const handleBatchMove = async (folderId) => {
    if (selectedIds.size === 0) return;
    setBatchMoving(true);
    try {
      await dispatch(batchMoveStrategies({ ids: [...selectedIds], folderId: folderId || null })).unwrap();
      showNotification(t('folders.moveToFolder') || 'Movidas', 'success');
      dispatch(fetchEstrategiasUsuario({ user: idUsuario, lang }));
      dispatch(fetchStrategyFolders({ lang }));
      if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId, lang }));
      setShowBatchMoveModal(false);
      handleCancelSelection();
    } catch (err) {
      showNotification(t('message.error'), 'error');
    } finally {
      setBatchMoving(false);
    }
  };
  // ---- Fin selecci\u00f3n m\u00faltiple ----

  const handleStrategyPress = (strategy) => {
    setViewingStrategy(strategy);
  };


  const duplicateGlobalStrategyForEdit = useCallback(async (strategy) => {
    const duplicateName = buildDuplicateName(strategy?.nombre || t('strategy.strategyName'));
    const duplicated = await dispatch(
      duplicateGlobalStrategy({
        strategyId: strategy._id,
        folderId: null,
        duplicateName,
        lang: i18n.language,
      })
    ).unwrap();
    return duplicated;
  }, [dispatch, buildDuplicateName, i18n.language, t]);

  const handleEditAssociatedVideo = useCallback(async (video, parentStrategy) => {
    try {
      let editableVideoId = video?._id || video?.id;

      if (!editableVideoId) {
        Alert.alert(t('message.error'), t('myVideos.couldNotLoadVideo'));
        return;
      }

      const mustDuplicate = parentStrategy?.isGlobal && userRole !== 'admin';
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
        setNotification({ visible: true, message: t('strategy.cloneToEdit'), type: 'success' });
        setTimeout(() => setNotification({ visible: false, message: '', type: 'success' }), 3000);
      } else {
        result = await getVideoForEdit(editableVideoId);
        if (!result?.success || !result?.video) {
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

      saveFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT, {
        kind: 'strategy',
        editingId: null,
        name: '',
        description: '',
        objective: '',
        folderId: '',
        nameEn: '',
        descriptionEn: '',
        objectiveEn: '',
        isGlobal: false,
        fieldElements: [],
        fieldType: '',
        imagen: '',
        pendingVideoIds: [],
      });

      const fieldResult = {
        kind: 'strategy',
        editingId: null,
        fieldElements: videoData.elementosCampo || [],
        fieldType: videoData.tipoCampo || 'full',
        imagen: videoData.imagen || '',
        pendingVideoIds: [],
        videoEditId: videoData._id || editableVideoId,
      };
      saveFormDraft(STORAGE_KEYS.FIELD_RESULT, fieldResult);

      navigation.navigate('Field', {
        initialElements: videoData.elementosCampo || [],
        initialFieldType: videoData.tipoCampo || 'full',
        isEditing: true,
        fieldImages: [],
        isStrategyMode: true,
        sandbox: false,
        estrategiaId: null,
        isGlobalStrategy: false,
        videoId: videoData._id || editableVideoId,
        isVideoEdit: true,
      });
    } catch (error) {
      console.error('Error editando video:', error);
      Alert.alert(t('message.error'), error.message || t('myVideos.couldNotLoadVideo'));
    }
  }, [userRole, buildDuplicateName, i18n.language, t, navigation]);

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
      await dispatch(createStrategyFolder(folderData)).unwrap();
      showNotification(t('folders.folderCreated'), 'success');
      setShowCreateFolderModal(false);
      setNewFolderName('');
      setNewFolderNameEn('');
      setNewFolderColor('#3B82F6');
      setNewFolderIsGlobal(false);
      dispatch(fetchStrategyFolders({ lang }));
      dispatch(fetchStrategyFoldersFlat({ lang }));
      if (folderData.isGlobal) dispatch(fetchGlobalFolders({ lang }));
      if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId, lang }));
    } catch (error) {
      const errorMsg = error?.message || t('folders.createError');
      showNotification(errorMsg, 'error');
    }
  };

  // Eliminación avanzada de carpetas
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const handleDeleteFolder = (folder) => {
    if (folder.isGlobal && userRole !== 'admin') {
      Alert.alert(t('message.info'), t('folders.cannotDeleteGlobal'));
      return;
    }
    setFolderToDelete(folder);
    setShowDeleteFolderModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteFolderModal(false);
    setShowDeleteConfirmModal(false);
    setFolderToDelete(null);
  };

  const handleDeleteModeSelect = (mode) => {
    if (mode === 'delete') {
      setShowDeleteFolderModal(false);
      setTimeout(() => setShowDeleteConfirmModal(true), 100);
    } else {
      performDeleteFolder(mode);
    }
  };

  const performDeleteFolder = async (mode) => {
    if (!folderToDelete) return;
    
    try {
      const options = mode === 'delete' 
        ? { deleteContents: true } 
        : { moveStrategiesTo: null, deleteContents: false };
      
      await dispatch(deleteStrategyFolder({ id: folderToDelete._id, ...options })).unwrap();
      showNotification(t('folders.folderDeleted'), 'success');
      
      dispatch(fetchStrategyFolders({ lang }));
      dispatch(fetchStrategyFoldersFlat({ lang }));
      dispatch(fetchEstrategiasUsuario({ user: idUsuario, lang }));
      if (folderToDelete.isGlobal) dispatch(fetchGlobalFolders({ lang }));
      if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId, lang }));
      
      setShowDeleteFolderModal(false);
      setShowDeleteConfirmModal(false);
      setFolderToDelete(null);
    } catch (error) {
      console.error('Error eliminando carpeta:', error);
      showNotification(t('folders.deleteError'), 'error');
    }
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
      await dispatch(updateStrategyFolder(updateData)).unwrap();
      showNotification(t('folders.folderUpdated'), 'success');
      setEditFolderModalVisible(false);
      dispatch(fetchStrategyFolders({ lang }));
      dispatch(fetchStrategyFoldersFlat({ lang }));
      if (menuFolder.isGlobal) dispatch(fetchGlobalFolders({ lang }));
      if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId, lang }));
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
        <Feather name="folder" size={28} color={theme.mode === 'dark' ? theme.colors.text : '#000'} />
      </View>
      <View style={styles.mvFolderContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.mvFolderName} numberOfLines={1}>{folder.nombre}</Text>
          {folder.isGlobal && (
            <Ionicons name="globe-outline" size={12} color="#16a34a" />
          )}
        </View>
        <View style={styles.mvFolderStats}>
          <Ionicons name="football-outline" size={12} color="#94A3B8" />
          <Text style={styles.mvFolderStatsText}> {folder.strategyCount || folder.strategiesCount || 0}</Text>
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={{ marginTop: 16, color: theme.colors.text, fontWeight: 'bold', fontSize: 16 }}>{t('strategy.loadingStrategies')}</Text>
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
        onEdit={async (strategy) => {
          
          if (strategy.isGlobal && userRole !== 'admin') {
            try {
              const result = await duplicateGlobalStrategyForEdit(strategy);
              if (!result || !result._id) {
                Alert.alert(t('message.error'), t('strategy.cloneError') || 'Error');
                return;
              }
              showNotification(t('strategy.cloneToEdit'), 'success');
              setEditingStrategy(result);
            } catch (err) {
              Alert.alert(t('message.error'), err?.message || 'Error');
              return;
            }
          } else {
            
            setEditingStrategy(strategy);
          }
          setCreating(true);
          setViewingStrategy(null);
        }}
        onDelete={handleDelete}
        onEditVideo={handleEditAssociatedVideo}
        userRole={userRole}
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
                  onPress={() => {
                    setNewFolderIsGlobal(listFilter === 'global' && userRole === 'admin');
                    setShowCreateFolderModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Feather name="folder-plus" size={20} color={theme.colors.onPrimary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => { setCreating(true); setEditingStrategy(null); }}
                style={styles.mvCreateButton}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={theme.colors.onPrimary} />
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
              <Feather name="home" size={16} color={folderPath.length === 0 ? "#3578e5" : "#64748B"} />
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
        <View style={[styles.mvSearchContainer, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
          <View style={[styles.mvSearchBar, { flex: 1 }]}>
            <Feather name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.mvSearchInput}
              placeholder={t('strategy.searchForTitle')}
              placeholderTextColor="#94A3B8"
              value={filters.titulo}
              onChangeText={(text) => setFilters(prev => ({ ...prev, titulo: text }))}
            />
            {filters.titulo.length > 0 && (
              <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, titulo: '' }))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={{
              paddingHorizontal: 12, height: 42,
              backgroundColor: selectionMode 
                ? (theme.mode === 'dark' ? '#1e3a8a' : '#EEF2FF') 
                : (theme.mode === 'dark' ? (theme.colors?.surfaceAlt || '#1e293b') : '#FFFFFF'),
              borderRadius: 10,
              borderWidth: 1, 
              borderColor: selectionMode 
                ? '#3578e5' 
                : (theme.mode === 'dark' ? (theme.colors?.border || '#334155') : '#E2E8F0'),
              flexDirection: 'row', alignItems: 'center', gap: 6,
              shadowColor: '#000', shadowOpacity: theme.mode === 'dark' ? 0.2 : 0.03, 
              shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1,
            }}
            onPress={() => {
              if (selectionMode) handleCancelSelection();
              else setSelectionMode(true);
            }}
            activeOpacity={0.7}
          >
            <Feather name={selectionMode ? "check-square" : "square"} size={16} color={selectionMode ? (theme.mode === 'dark' ? '#60a5fa' : '#3578e5') : (theme.mode === 'dark' ? '#94A3B8' : '#64748B')} />
            {!IS_MOBILE && <Text style={{ color: selectionMode ? (theme.mode === 'dark' ? '#60a5fa' : '#3578e5') : (theme.mode === 'dark' ? '#94A3B8' : '#64748B'), fontWeight: '600', fontSize: 13 }}>{selectionMode ? (t('common.cancelSelection') || 'Cancelar selección') : (t('common.select') || 'Seleccionar')}</Text>}
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mvFilterBar}
          style={styles.mvFilterScroll}
        >
          {[
            { key: 'all', label: t('strategy.allStrategies') || 'Todas' },
            { key: 'mine', label: t('strategy.myStrategies') || 'Mías' },
            { key: 'global', label: t('strategy.appStrategies') || 'App' },
            { key: 'favorites', label: t('common.favorites') || 'Favoritos', icon: 'star' },
          ].map(tab => {
            const isActive = listFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  setListFilter(tab.key);
                  navigateToRoot();
                }}
                style={[
                  styles.mvFilterTab, 
                  isActive && styles.mvFilterTabActive,
                  tab.icon && { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', paddingHorizontal: 16 }
                ]}
                activeOpacity={0.8}
              >
                {tab.icon && (
                  <Ionicons
                    name={isActive ? tab.icon : `${tab.icon}-outline`}
                    size={14}
                    color={isActive ? '#fff' : (theme.mode === 'dark' ? '#94A3B8' : '#64748B')}
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text 
                  numberOfLines={1} 
                  style={[
                    styles.mvFilterTabText, 
                    isActive && styles.mvFilterTabTextActive,
                    { flexShrink: 1 }
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Content */}
        {(loading || foldersLoading) ? (
          <View style={styles.mvLoadingContainer}>
            <ActivityIndicator size="large" color="#3578e5" />
            <Text style={styles.mvLoadingText}>{t('common.loading')}</Text>
          </View>
        ) : (displayedSubfolders.length === 0 && filteredStrategies.length === 0) ? (
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
            {filteredStrategies.length > 0 && (
              <View style={styles.mvSection}>
                <View style={styles.mvSectionHeader}>
                  <Ionicons name="football-outline" size={16} color="#64748B" />
                  <Text style={styles.mvSectionTitle}>{t('strategy.strategies')}</Text>
                  <View style={styles.mvSectionBadge}>
                    <Text style={styles.mvSectionBadgeText}>{filteredStrategies.length}</Text>
                  </View>
                </View>
                <View style={styles.mvItemsContainer}>
                  {filteredStrategies.map(item => (
                    <View key={item._id || item.id} style={{ width: '100%' }}>
                      <StrategyCard
                        strategy={item}
                        onPress={handleStrategyPress}
                        onLongPress={handleStrategyLongPress}
                        onOpenOptions={(s) => { setSelectedStrategyForOptions(s); setOptionsModalVisible(true); }}
                        IS_MOBILE={IS_MOBILE}
                        isGrid={false}
                        forceWidth={null}
                        forceHeight={null}
                        styles={styles}
                        selectionMode={selectionMode}
                        isSelected={selectedIds.has(item._id)}
                        onToggleSelect={handleToggleSelect}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* ---- Barra flotante de selección múltiple ---- */}
        {selectionMode && (
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
            backgroundColor: theme.colors.surface || '#1E293B',
            borderTopWidth: 1, borderTopColor: theme.colors.border || '#334155',
            paddingHorizontal: 16, paddingVertical: 10,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 20,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text || '#F8FAFC', fontWeight: '700', fontSize: 14 }}>
                {selectedIds.size} {t('common.selected') || 'seleccionados'}
              </Text>
              <TouchableOpacity onPress={handleSelectAll}>
                <Text style={{ color: '#3578e5', fontSize: 12, marginTop: 2 }}>
                  {t('common.selectAll') || 'Seleccionar todo'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setShowBatchMoveModal(true)}
              disabled={selectedIds.size === 0}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#3578e5', borderRadius: 10,
                paddingHorizontal: 14, paddingVertical: 8, opacity: selectedIds.size === 0 ? 0.4 : 1,
              }}
            >
              <Feather name="folder" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{t('folders.moveToFolder') || 'Mover'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleBatchDelete}
              disabled={selectedIds.size === 0}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: '#EF4444', borderRadius: 10,
                paddingHorizontal: 14, paddingVertical: 8, opacity: selectedIds.size === 0 ? 0.4 : 1,
              }}
            >
              <Feather name="trash-2" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{t('edition.delete')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCancelSelection}
              style={{
                backgroundColor: theme.colors.card || '#334155', borderRadius: 10,
                padding: 8,
              }}
            >
              <Feather name="x" size={18} color={theme.colors.textMuted || '#94A3B8'} />
            </TouchableOpacity>
          </View>
        )}

        {/* ---- Modal para mover selección a carpeta ---- */}
        <Modal
          visible={showBatchMoveModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBatchMoveModal(false)}
        >
          <TouchableOpacity
            style={styles.mvModalBackdrop}
            activeOpacity={1}
            onPress={() => setShowBatchMoveModal(false)}
          >
            <View style={[styles.mvActionSheet, { maxHeight: '75%' }]}>
              <View style={styles.mvActionSheetHeader}>
                <Text style={styles.mvActionSheetTitle}>
                  {t('folders.moveToFolder') || 'Mover a carpeta'} ({selectedIds.size})
                </Text>
                <Text style={styles.mvActionSheetSubtitle}>
                  {t('folders.selectDestination') || 'Selecciona la carpeta destino'}
                </Text>
              </View>
              <ScrollView style={{ maxHeight: 350 }}>
                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={() => handleBatchMove(null)}
                  disabled={batchMoving}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: '#F1F5F9' }]}>
                    <Feather name="home" size={20} color="#64748B" />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={styles.mvActionTitle}>{t('folders.root') || 'Raíz'}</Text>
                    <Text style={styles.mvActionSubtitle}>{t('folders.noFolder') || 'Sin carpeta'}</Text>
                  </View>
                </TouchableOpacity>
                {strategyFoldersFlat.filter(f => !f.isGlobal).map(folder => (
                  <TouchableOpacity
                    key={folder._id}
                    style={styles.mvActionOption}
                    onPress={() => handleBatchMove(folder._id)}
                    disabled={batchMoving}
                  >
                    <View style={[styles.mvActionIcon, { backgroundColor: folder.color || '#3B82F6' }]}>
                      <Feather name="folder" size={20} color="#fff" />
                    </View>
                    <View style={styles.mvActionTextContainer}>
                      <Text style={styles.mvActionTitle} numberOfLines={1}>{folder.nombre}</Text>
                    </View>
                    {batchMoving && <ActivityIndicator size="small" color="#3578e5" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

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
                {/* Botón favorito */}
                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    handleToggleFavorite(selectedStrategyForOptions?._id);
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: selectedStrategyForOptions?.favorito ? '#FEF3C7' : '#F8FAFC' }]}>
                    <Ionicons
                      name={selectedStrategyForOptions?.favorito ? 'star' : 'star-outline'}
                      size={20}
                      color={selectedStrategyForOptions?.favorito ? '#F59E0B' : '#94A3B8'}
                    />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={styles.mvActionTitle}>
                      {selectedStrategyForOptions?.favorito
                        ? (t('common.removeFromFavorites') || 'Quitar de favoritos')
                        : (t('common.addToFavorites') || 'Añadir a favoritos')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={() => {
                    setOptionsModalVisible(false);
                    handleStrategyPress(selectedStrategyForOptions);
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Feather name="eye" size={20} color="#3578e5" />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={styles.mvActionTitle}>{t('strategy.lookDetails')}</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={async () => {
                    const st = selectedStrategyForOptions;
                    setOptionsModalVisible(false);
                    if (st?.isGlobal && userRole !== 'admin') {
                      try {
                        const result = await duplicateGlobalStrategyForEdit(st);
                        if (!result || !result._id) {
                          Alert.alert(t('message.error'), t('strategy.cloneError') || 'Error');
                          return;
                        }
                        showNotification(t('strategy.cloneToEdit'), 'success');
                        setEditingStrategy(result);
                      } catch (err) {
                        Alert.alert(t('message.error'), err?.message || 'Error');
                        return;
                      }
                    } else {
                      setEditingStrategy(st);
                    }
                    setCreating(true);
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: theme.colors.warningSoft }]}>
                    <Feather name="edit-3" size={20} color="#D97706" />
                  </View>
                  <View style={styles.mvActionTextContainer}>
                    <Text style={styles.mvActionTitle}>{t('edition.edit')}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mvActionOption}
                  onPress={async () => {
                    const st = selectedStrategyForOptions;
                    setOptionsModalVisible(false);
                    if (!st) return;
                    try {
                      const duplicateName = buildDuplicateName(st.nombre || t('strategy.strategyName'));
                      if (st.isGlobal) {
                        await dispatch(duplicateGlobalStrategy({
                          strategyId: st._id,
                          folderId: null,
                          duplicateName,
                          lang: i18n.language,
                        })).unwrap();
                      } else {
                        await dispatch(duplicateStrategyToFolder({
                          strategyId: st._id,
                          folderId: st.folder || null,
                          duplicateName,
                          lang: i18n.language,
                        })).unwrap();
                      }
                      showNotification(t('strategy.cloneCreated'), 'success');
      dispatch(fetchEstrategiasUsuario({ user: idUsuario, lang }));
                      dispatch(fetchGlobalStrategies({ lang }));
                      if (currentFolderId) dispatch(fetchStrategyFolderById({ id: currentFolderId, lang }));
                    } catch (err) {
                      Alert.alert(t('message.error'), err?.message || 'Error');
                    }
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: theme.colors.infoSoft }]}>
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
                    setStrategyToMove(selectedStrategyForOptions);
                    setShowMoveToFolder(true);
                  }}
                >
                  <View style={[styles.mvActionIcon, { backgroundColor: theme.colors.warningSoft }]}>
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
                  <View style={[styles.mvActionIcon, { backgroundColor: theme.colors.errorSoft }]}>
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
                      <View style={[styles.mvActionIcon, { backgroundColor: theme.colors.warningSoft }]}>
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
                  <View style={[styles.mvActionIcon, { backgroundColor: theme.colors.errorSoft }]}>
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
                  <View style={[styles.mvCreateModalIconContainer, { backgroundColor: theme.colors.warningSoft }]}>
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
                          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primaryHover, textTransform: 'uppercase', letterSpacing: 0.5 }}>English</Text>
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
                  <View style={[styles.mvCreateModalIconContainer, { backgroundColor: theme.colors.purpleSoft }]}>
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
                    <Feather name="folder" size={24} color="#8B5CF6" />
                    <Text style={styles.mvCreateCardTitle}>{t('folders.folderData')}</Text>
                  </View>

                  <View style={styles.mvCreateCardContent}>
                    {userRole === 'admin' && (
                      <View style={{ marginBottom: 14 }}>
                        <Text style={styles.mvCreateInputLabel}>Visibilidad</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: !newFolderIsGlobal ? '#1e40af' : '#e2e8f0', borderWidth: 2, borderColor: !newFolderIsGlobal ? '#1e40af' : 'transparent' }}
                            onPress={() => setNewFolderIsGlobal(false)}
                          >
                            <Ionicons name="person-outline" size={16} color={!newFolderIsGlobal ? '#fff' : '#64748b'} />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: !newFolderIsGlobal ? '#fff' : '#64748b' }}>{t('strategy.myStrategies')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: newFolderIsGlobal ? '#16a34a' : '#e2e8f0', borderWidth: 2, borderColor: newFolderIsGlobal ? '#16a34a' : 'transparent' }}
                            onPress={() => setNewFolderIsGlobal(true)}
                          >
                            <Ionicons name="globe-outline" size={16} color={newFolderIsGlobal ? '#fff' : '#64748b'} />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: newFolderIsGlobal ? '#fff' : '#64748b' }}>{t('strategy.appStrategies')}</Text>
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

                    {userRole === 'admin' && newFolderIsGlobal && (
                      <View style={{ marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Ionicons name="language-outline" size={14} color="#1e40af" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primaryHover, textTransform: 'uppercase', letterSpacing: 0.5 }}>English</Text>
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
          onRequestClose={() => { setShowMoveToFolder(false); setStrategyToMove(null); }}
        >
          <View style={styles.mvModalBackdrop}>
            <View style={styles.mvFormModal}>
              <View style={styles.mvFormModalHeader}>
                <View style={[styles.mvFormModalIcon, { backgroundColor: theme.colors.warningSoft }]}>
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
                  <View style={[styles.mvFolderSelectIcon, { backgroundColor: theme.colors.backgroundAlt }]}>
                    <Feather name="home" size={18} color="#64748B" />
                  </View>
                  <Text style={styles.mvFolderSelectText}>{t('folders.root')}</Text>
                </TouchableOpacity>
                
                {(userRole === 'admin' ? strategyFoldersFlat : strategyFoldersFlat.filter(f => !f.isGlobal)).map(folder => (
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

        {/* Delete Folder Choice Modal */}
        <Modal
          visible={showDeleteFolderModal}
          transparent
          animationType="fade"
          onRequestClose={handleCancelDelete}
        >
          <View style={styles.deleteModalOverlay}>
            <View style={styles.deleteModalContainer}>
              <View style={styles.deleteModalHeader}>
                <View style={styles.deleteModalIconContainer}>
                  <Feather name="trash-2" size={28} color="#EF4444" />
                </View>
                <Text style={styles.deleteModalTitle}>
                  {t('folders.deleteFolderConfirm', 'Eliminar Carpeta')}
                </Text>
                <Text style={styles.deleteModalSubtitle}>
                  {t('folders.deleteFolderMessage', { name: folderToDelete?.nombre })}
                </Text>
              </View>

              <View style={styles.deleteModalBody}>
                <TouchableOpacity
                  style={[styles.deleteOption, styles.deleteOptionHover]}
                  onPress={() => handleDeleteModeSelect('move')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.deleteOptionIcon, { backgroundColor: '#DBEAFE' }]}>
                    <Feather name="folder" size={24} color="#2563EB" />
                  </View>
                  <View style={styles.deleteOptionText}>
                    <Text style={styles.deleteOptionTitle}>
                      {t('folders.deleteFolderMoveToRoot', 'Mover estrategias a raíz')}
                    </Text>
                    <Text style={styles.deleteOptionSubtitle}>
                      {t('folders.deleteFolderMoveToRootDesc', 'La carpeta se eliminará pero las estrategias se moverán a la raíz')}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#94A3B8" />
                </TouchableOpacity>

                <View style={styles.deleteOptionDivider} />

                <TouchableOpacity
                  style={[styles.deleteOption, styles.deleteOptionHover]}
                  onPress={() => handleDeleteModeSelect('delete')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.deleteOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Feather name="alert-triangle" size={24} color="#EF4444" />
                  </View>
                  <View style={styles.deleteOptionText}>
                    <Text style={[styles.deleteOptionTitle, { color: '#EF4444' }]}>
                      {t('folders.deleteFolderAndContents', 'Eliminar todo')}
                    </Text>
                    <Text style={styles.deleteOptionSubtitle}>
                      {t('folders.deleteFolderAndContentsDesc', 'Se eliminará la carpeta, subcarpetas y todas las estrategias permanentemente')}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.deleteModalFooter}>
                <TouchableOpacity
                  style={styles.deleteCancelButton}
                  onPress={handleCancelDelete}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteCancelButtonText}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={handleCancelDelete}
        >
          <View style={styles.deleteModalOverlay}>
            <View style={[styles.deleteModalContainer, { maxWidth: 420 }]}>
              <View style={styles.deleteModalHeader}>
                <View style={[styles.deleteModalIconContainer, { backgroundColor: '#FEE2E2' }]}>
                  <Feather name="alert-triangle" size={28} color="#EF4444" />
                </View>
                <Text style={[styles.deleteModalTitle, { color: '#EF4444' }]}>
                  {t('folders.deleteFolderAndContentsConfirm', 'Confirmar eliminación')}
                </Text>
                <Text style={styles.deleteModalSubtitle}>
                  {t('folders.deleteFolderAndContentsMessage', 'Esta acción no se puede deshacer. Se eliminarán permanentemente la carpeta, subcarpetas y todas las estrategias.')}
                </Text>
              </View>

              <View style={styles.deleteModalFooter}>
                <TouchableOpacity
                  style={styles.deleteSecondaryButton}
                  onPress={handleCancelDelete}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteSecondaryButtonText}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteDangerButton}
                  onPress={() => performDeleteFolder('delete')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteDangerButtonText}>
                    {t('common.delete', 'Eliminar')}
                  </Text>
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

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
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
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
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
    color: theme.colors.primary,
    fontWeight: "bold",
    width: 120,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    shadowColor: theme.colors.primaryHover,
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
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.25,
  },
  createButtonTextMobile: {
    fontSize: 14,
  },
  viewModeSwitch: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundAlt,
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
    backgroundColor: theme.colors.primaryHover,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
    marginRight: 8,
  },
  filterButtonMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  filterButtonText: {
    marginLeft: 7,
    color: theme.colors.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
  manageTypesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  manageTypesButtonMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  manageTypesButtonText: {
    marginLeft: 7,
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
  },
  mobileMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mobileMenuContainer: {
    backgroundColor: theme.colors.surfaceAlt,
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
    color: theme.colors.text,
    marginLeft: 16,
    fontWeight: '500',
  },
  mobileMenuDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  mobileMenuBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMenuBadgeText: {
    color: theme.colors.onPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  mobileMenuItemBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  mobileMenuItemBadgeText: {
    color: theme.colors.onPrimary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  filtersContainer: {
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  filterBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  filterBadgeText: {
    color: theme.colors.onPrimary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  filtersSection: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.text,
  },
  resultsCount: {
    fontSize: 14,
    color: theme.colors.textMuted,
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
    color: theme.colors.textMuted,
    marginBottom: 6,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  clearFiltersText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  closeFiltersButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeFiltersText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  typeSelectorButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeSelectorText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeSelectorModal: {
    backgroundColor: theme.colors.surfaceAlt,
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
    borderBottomColor: theme.colors.border,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  typeItemText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  clearTypesButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  clearTypesText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  confirmTypesButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmTypesText: {
    color: theme.colors.onPrimary,
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
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 74,
    marginBottom: 8,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.mode === 'dark' ? 0.18 : 0.05,
    shadowRadius: 6,
    elevation: 1,
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
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primarySoft,
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
    color: theme.colors.text,
    marginBottom: 2,
    letterSpacing: 0.25,
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
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContentTablet: {
    width: '70%',
    maxHeight: '85%',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  modalEditButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPdfButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 16,
  },
  // --- Modal de opciones (igual que en ejercicios) ---
  optionsModalContent: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 20,
    width: '80%',
    maxWidth: 320,
    elevation: 10,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
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
    borderBottomColor: theme.colors.backgroundAlt,
  },
  optionsModalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  optionsModalOptionDanger: {
    borderBottomWidth: 0,
  },
  optionsModalOptionTextDanger: {
    color: theme.colors.error,
  },
  optionsModalOptionCancel: {
    borderBottomWidth: 0,
  },
  optionsModalOptionTextCancel: {
    color: theme.colors.textMuted,
  },
  exerciseDetailCard: {
    backgroundColor: theme.colors.backgroundAlt,
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
    color: theme.colors.text,
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
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
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
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  detailCardContent: {
    fontSize: 16,
    color: theme.colors.text,
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
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.errorSoft,
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
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: theme.colors.text,
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
    color: theme.colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  videoCardDescription: {
    fontSize: 12,
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.error,
  },
  videoDownloadBtn: {
    backgroundColor: theme.colors.success,
  },
  videoActionText: {
    color: theme.colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  noVideosText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surfaceAlt,
  },
  videoModalTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  videoModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLoadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLoadingText: {
    color: theme.colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  videoPlayerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.success,
  },
  videoModalBtnText: {
    color: theme.colors.onPrimary,
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
    color: theme.colors.primary,
    fontWeight: '500',
  },
  breadcrumbTextActive: {
    color: theme.colors.text,
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
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: 100,
    shadowColor: theme.colors.text,
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
    color: theme.colors.text,
    textAlign: 'center',
  },
  folderCardCount: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // ===== Estilos myVideos para StrategyList =====
  mvContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  // Header
  mvHeader: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomColor: theme.colors.border,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.mode === 'dark' ? 0.18 : 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  mvHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  mvHeaderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mvHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  mvAddFolderButton: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mvCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: theme.mode === 'dark' ? 1 : 0,
    borderColor: theme.mode === 'dark' ? theme.colors.primarySoft : 'transparent',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.mode === 'dark' ? 0.16 : 0.28,
    shadowRadius: theme.mode === 'dark' ? 6 : 8,
    elevation: theme.mode === 'dark' ? 3 : 4,
  },
  mvCreateButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  
  // View mode switch
  mvViewModeSwitch: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundAlt,
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
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  
  // Breadcrumb
  mvBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
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
    backgroundColor: theme.colors.primarySoft,
  },
  mvBreadcrumbText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '500',
    maxWidth: 120,
    minWidth: 0,
  },
  mvBreadcrumbTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  
  // Search
  mvSearchContainer: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.mode === 'dark' ? 0.18 : 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  mvSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mvSearchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },

  mvFilterScroll: {
    flexGrow: 0,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mvFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  mvFilterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundAlt,
    flexShrink: 0,
  },
  mvFilterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  mvFilterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  mvFilterTabTextActive: {
    color: theme.colors.onPrimary,
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
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  mvEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  mvEmptySubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Content List
  mvContentList: {
    flex: 1,
  },
  mvContentListInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
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
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mvSectionBadge: {
    backgroundColor: theme.colors.backgroundAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mvSectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  mvItemsContainer: {
    gap: 10,
  },
  
  // Folder Card
  mvFolderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.mode === 'dark' ? 0.18 : 0.05,
    shadowRadius: 6,
    elevation: 1,
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
    color: theme.colors.text,
    marginBottom: 4,
  },
  mvFolderStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mvFolderStatsText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  mvCardMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
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
    backgroundColor: theme.colors.surfaceAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  mvActionSheetHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.backgroundAlt,
  },
  mvActionSheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    maxWidth: '80%',
  },
  mvActionSheetSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
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
    color: theme.colors.text,
    marginBottom: 2,
  },
  mvActionDivider: {
    height: 1,
    backgroundColor: theme.colors.backgroundAlt,
    marginVertical: 8,
    marginHorizontal: 20,
  },
  mvActionSheetCancel: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundAlt,
    alignItems: 'center',
  },
  mvActionSheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  
  // Form Modal
  mvFormModal: {
    backgroundColor: theme.colors.surfaceAlt,
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
    backgroundColor: theme.colors.purpleSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mvFormModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  mvFormModalSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  mvFormModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.backgroundAlt,
  },
  mvSecondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mvSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.surfaceAlt,
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
    color: theme.colors.text,
  },
  
  // Create Folder Modal
  mvCreateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mvCreateModalContainer: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 20,
    width: '96%',
    maxWidth: 500,
    minHeight: 400,
    maxHeight: '85%',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
    overflow: 'hidden',
  },
  mvCreateModalContainerMobile: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 20,
    width: '92%',
    maxWidth: 400,
    minHeight: 450,
    maxHeight: '80%',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
    overflow: 'hidden',
  },
  mvCreateModalContainerTablet: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 20,
    width: '94%',
    maxWidth: 900,
    minHeight: 700,
    maxHeight: '92%',
    shadowColor: theme.colors.text,
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
    borderBottomColor: theme.colors.backgroundAlt,
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
    color: theme.colors.text,
  },
  mvCreateModalTitleMobile: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  mvCreateModalSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  mvCreateModalSubtitleMobile: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  mvCreateModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceAlt,
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
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mvCreateCardMobile: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.text,
    flex: 1,
  },
  mvCreateCardContent: {
    gap: 8,
  },
  mvCreateInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  mvCreateInput: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    borderColor: theme.colors.text,
  },
  mvCreateModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.backgroundAlt,
    gap: 12,
  },
  mvCreateCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mvCreateCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  mvCreateSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.purple,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: theme.colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mvCreateSaveButtonDisabled: {
    backgroundColor: theme.colors.borderStrong,
    shadowOpacity: 0,
    elevation: 0,
  },
  mvCreateSaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onPrimary,
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
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    marginHorizontal: 16,
    maxWidth: 400,
  },
  mvNotificationSuccess: {
    backgroundColor: theme.colors.success,
  },
  mvNotificationError: {
    backgroundColor: theme.colors.error,
  },
  mvNotificationText: {
    flex: 1,
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  deleteModalHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  deleteModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteModalBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  deleteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  deleteOptionHover: {},
  deleteOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  deleteOptionText: {
    flex: 1,
  },
  deleteOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  deleteOptionSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  deleteOptionDivider: {
    height: 12,
  },
  deleteModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  deleteSecondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSecondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  deleteDangerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteDangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});