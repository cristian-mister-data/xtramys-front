// components/StrengthExerciseViewer.js
// Componente para ver un ejercicio de fuerza individual con video, imagen y opciones de descarga
// Optimizado con caché de video para minimizar recursos
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { ensureMp4Blob } from '@/utils/videoUtils';
import {
  getStrengthExerciseImage,
  getStrengthExerciseVideoUrl,
  getSectionForExercise,
  checkVideoAvailability,
} from '@/data/strengthExercises';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Caché de videos en el sistema de archivos local
const VIDEO_CACHE_DIR = `${FileSystem.cacheDirectory}strength_videos/`;

const ensureCacheDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(VIDEO_CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(VIDEO_CACHE_DIR, { intermediates: true });
  }
};

const getCachedVideoPath = (exerciseId) => `${VIDEO_CACHE_DIR}${exerciseId}.mp4`;

const getOrCacheVideo = async (exercise) => {
  // En web no podemos cachear videos en localStorage (límite ~5MB) y un URI
  // `webfs://...` no es reproducible por el `<video>`. Usamos directamente
  // la URL remota — el navegador hace streaming y caché HTTP nativos.
  if (Platform.OS === 'web') {
    return getStrengthExerciseVideoUrl(exercise);
  }

  await ensureCacheDir();
  const cachedPath = getCachedVideoPath(exercise.id);
  const fileInfo = await FileSystem.getInfoAsync(cachedPath);
  
  if (fileInfo.exists && fileInfo.size > 0) {
    return cachedPath;
  }
  
  const remoteUrl = getStrengthExerciseVideoUrl(exercise);
  const downloadResult = await FileSystem.downloadAsync(remoteUrl, cachedPath);
  
  if (downloadResult.status === 200) {
    return cachedPath;
  }
  
  // Si falla la descarga, usar URL remota directamente
  return remoteUrl;
};

const THEME = {
  primary: '#3b82f6',
  primaryDark: '#1d4ed8',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  overlay: 'rgba(0,0,0,0.6)',
};

export default function StrengthExerciseViewer({ visible, onClose, exercise }) {
  const { t } = useTranslation();
  const [showVideo, setShowVideo] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [checkingVideo, setCheckingVideo] = useState(false);
  const playerRef = useRef(null);

  const imageSource = exercise ? getStrengthExerciseImage(exercise) : null;
  const sectionInfo = exercise ? getSectionForExercise(exercise) : null;

  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    playerRef.current = p;
    if (videoUri) {
      p.play();
    }
  });

  // Verificar disponibilidad de video al abrir
  useEffect(() => {
    if (visible && exercise) {
      setCheckingVideo(true);
      checkVideoAvailability(exercise).then(available => {
        setHasVideo(available);
        setCheckingVideo(false);
      });
    }
  }, [visible, exercise?.id]);

  useEffect(() => {
    if (!visible) {
      setShowVideo(false);
      setVideoUri(null);
      setLoadingVideo(false);
      setHasVideo(false);
    }
  }, [visible]);

  const handlePlayVideo = useCallback(async () => {
    if (!exercise) return;
    setLoadingVideo(true);
    try {
      const uri = await getOrCacheVideo(exercise);
      setVideoUri(uri);
      setShowVideo(true);
    } catch (error) {
      console.error('Error loading video:', error);
      // Fallback: usar URL directa
      const remoteUrl = getStrengthExerciseVideoUrl(exercise);
      setVideoUri(remoteUrl);
      setShowVideo(true);
    } finally {
      setLoadingVideo(false);
    }
  }, [exercise]);

  const handleCloseVideo = useCallback(() => {
    try { playerRef.current?.pause(); } catch {}
    setShowVideo(false);
    setVideoUri(null);
  }, []);

  const handleDownloadVideo = useCallback(async () => {
    if (!exercise) return;
    setDownloading(true);
    setDownloadProgress(0);
    try {
      // Web: descargar como archivo .mp4 normal del navegador.
      if (Platform.OS === 'web') {
        const remoteUrl = getStrengthExerciseVideoUrl(exercise);
        const res = await fetch(remoteUrl);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        let blob = await res.blob();
        try {
          blob = await ensureMp4Blob(blob);
        } catch (conversionError) {
          console.warn('StrengthExerciseViewer: no se pudo convertir a MP4, usando blob original', conversionError);
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exercise.id || 'video'}.mp4`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try { document.body.removeChild(a); } catch {}
          try { URL.revokeObjectURL(url); } catch {}
        }, 1500);
        return;
      }
      await ensureCacheDir();
      const cachedPath = getCachedVideoPath(exercise.id);
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      
      let fileUri;
      if (fileInfo.exists && fileInfo.size > 0) {
        fileUri = cachedPath;
      } else {
        const remoteUrl = getStrengthExerciseVideoUrl(exercise);
        const callback = (dp) => {
          const progress = dp.totalBytesWritten / dp.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        };
        const downloadResumable = FileSystem.createDownloadResumable(remoteUrl, cachedPath, {}, callback);
        const result = await downloadResumable.downloadAsync();
        fileUri = result.uri;
      }
      
      if (Platform.OS === 'android') {
        try {
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          Alert.alert(t('message.success'), t('strengthExercises.savedToGallery'));
        } catch (saveErr) {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(fileUri, { mimeType: 'video/mp4' });
          } else {
            throw saveErr;
          }
        }
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('message.error'), t('strengthExercises.saveError'));
          return;
        }
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        Alert.alert(t('message.success'), t('strengthExercises.savedToGallery'));
      }
    } catch (error) {
      console.error('Download video error:', error);
      Alert.alert(t('message.error'), t('strengthExercises.downloadError'));
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  }, [exercise, t]);

  const handleDownloadImage = useCallback(async () => {
    if (!exercise || !imageSource) return;
    setDownloading(true);
    try {
      // Web: descargar la imagen como PNG en alta calidad (2x upscale,
      // suavizado de alta calidad). PNG es lossless: sin pérdida sobre el
      // .webp original, y al 2x se ve más nítido al imprimir / compartir.
      if (Platform.OS === 'web') {
        const url = typeof imageSource === 'string' ? imageSource : imageSource?.uri;
        if (!url) throw new Error('No image URL');

        const img = await new Promise((resolve, reject) => {
          const image = new window.Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error('image load failed'));
          image.src = url;
        });

        // Escalado 4x con suavizado de alta calidad. Algunas imágenes
        // originales tienen poca resolución, así que limitamos el lado mayor
        // a 4096 px para que no saquemos un PNG inflado sin ganancia real.
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;
        const MAX_DIMENSION = 4096;
        const SCALE = Math.min(4, MAX_DIMENSION / Math.max(naturalW, naturalH));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(naturalW * SCALE);
        canvas.height = Math.round(naturalH * SCALE);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in ctx) {
          ctx.imageSmoothingQuality = 'high';
        }
        // Fondo blanco por si la imagen tuviese transparencia (las fotos de
        // ejercicio normalmente son opacas, pero garantizamos export limpio).
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
            'image/png'
          );
        });

        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${exercise.id || 'image'}.png`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try { document.body.removeChild(a); } catch {}
          try { URL.revokeObjectURL(blobUrl); } catch {}
        }, 1500);
        return;
      }
      // Obtener la imagen local desde el bundle usando expo-asset
      const asset = Asset.fromModule(imageSource);
      try {
        await asset.downloadAsync();
      } catch (downloadErr) {
        // Fallback para nombres con caracteres especiales
        if (asset.hash && asset.type) {
          const safePath = `${FileSystem.cacheDirectory}ExponentAsset-${asset.hash}.${asset.type}`;
          const info = await FileSystem.getInfoAsync(safePath);
          if (!info.exists && asset.uri) {
            await FileSystem.downloadAsync(encodeURI(asset.uri), safePath);
          }
          asset.localUri = safePath;
        }
      }
      
      if (asset.localUri) {
        // Copiar a un archivo temporal con extensión correcta
        const tempPath = `${FileSystem.cacheDirectory}${exercise.id}.webp`;
        await FileSystem.copyAsync({ from: asset.localUri, to: tempPath });

        if (Platform.OS === 'android') {
          try {
            await MediaLibrary.createAssetAsync(tempPath);
            Alert.alert(t('message.success'), t('strengthExercises.savedToGallery'));
          } catch (saveErr) {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              await Sharing.shareAsync(tempPath, { mimeType: 'image/webp' });
            } else {
              throw saveErr;
            }
          }
        } else {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(t('message.error'), t('strengthExercises.saveError'));
            return;
          }
          await MediaLibrary.createAssetAsync(tempPath);
          Alert.alert(t('message.success'), t('strengthExercises.savedToGallery'));
        }
      } else {
        throw new Error('Could not resolve local image URI');
      }
    } catch (error) {
      console.error('Download image error:', error);
      Alert.alert(t('message.error'), t('strengthExercises.downloadError'));
    } finally {
      setDownloading(false);
    }
  }, [exercise, imageSource, t]);

  const handleShareVideo = useCallback(async () => {
    if (!exercise) return;
    try {
      const cachedPath = getCachedVideoPath(exercise.id);
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      
      let fileUri;
      if (fileInfo.exists) {
        fileUri = cachedPath;
      } else {
        const remoteUrl = getStrengthExerciseVideoUrl(exercise);
        const result = await FileSystem.downloadAsync(remoteUrl, cachedPath);
        fileUri = result.uri;
      }
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, { mimeType: 'video/mp4' });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [exercise]);

  if (!exercise) return null;

  const exerciseName = t(exercise.i18nKey, exercise.id);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{exerciseName}</Text>
            {sectionInfo && (
              <Text style={styles.headerSubtitle}>
                {t(sectionInfo.section.i18nKey)} • {t('strengthExercises.level')} {exercise.level}
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShareVideo} style={styles.headerBtn}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {/* Imagen del ejercicio */}
          {!showVideo ? (
            <View style={styles.imageSection}>
              {imageSource ? (
                <Image
                  source={imageSource}
                  style={styles.exerciseImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.exerciseImage, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="fitness-outline" size={64} color={THEME.textMuted} />
                </View>
              )}
              {/* Botón de play sobre la imagen - solo si hay video */}
              {hasVideo && (
                <TouchableOpacity
                  style={styles.playOverlay}
                  onPress={handlePlayVideo}
                  disabled={loadingVideo}
                >
                  {loadingVideo ? (
                    <ActivityIndicator size="large" color="#fff" />
                  ) : (
                    <View style={styles.playButton}>
                      <Ionicons name="play" size={40} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.videoSection}>
              <View style={styles.videoWrapper}>
                <VideoView
                  player={player}
                  style={styles.videoPlayer}
                  fullscreenOptions={{}}
                  allowsPictureInPicture
                  contentFit="contain"
                />
              </View>
              <TouchableOpacity style={styles.closeVideoBtn} onPress={handleCloseVideo}>
                <Ionicons name="close-circle" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Info del ejercicio */}
          <View style={styles.infoSection}>
            {/* Nombre y nivel */}
            <View style={styles.nameRow}>
              <Text style={styles.exerciseName}>{exerciseName}</Text>
              <View style={[styles.levelBadge, { backgroundColor: sectionInfo?.section?.color || THEME.primary }]}>
                <Text style={styles.levelBadgeText}>{t('strengthExercises.levelShort')} {exercise.level}</Text>
              </View>
            </View>

            {/* Categoría y sección */}
            {sectionInfo && (
              <View style={styles.metaRow}>
                <View style={[styles.metaBadge, { backgroundColor: sectionInfo.category.color + '20' }]}>
                  <Text style={styles.metaIcon}>{sectionInfo.category.icon}</Text>
                  <Text style={[styles.metaBadgeText, { color: sectionInfo.category.color }]}>
                    {t(sectionInfo.category.i18nKey)}
                  </Text>
                </View>
                <View style={[styles.metaBadge, { backgroundColor: sectionInfo.section.color + '20' }]}>
                  <Text style={[styles.metaBadgeText, { color: sectionInfo.section.color }]}>
                    {t(sectionInfo.section.i18nKey)}
                  </Text>
                </View>
              </View>
            )}

            {/* Barra de progresión */}
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>{t('strengthExercises.progression')}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((exercise.level / 20) * 100, 100)}%`,
                      backgroundColor: sectionInfo?.section?.color || THEME.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{exercise.level}/20</Text>
            </View>
          </View>

          {/* Acciones de descarga */}
          <View style={styles.actionsSection}>
            {/* Botón de video - solo si hay video disponible */}
            {hasVideo && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnVideo]}
                onPress={showVideo ? handleCloseVideo : handlePlayVideo}
                disabled={loadingVideo}
              >
                {loadingVideo ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name={showVideo ? 'pause-circle' : 'play-circle'} size={22} color="#fff" />
                )}
                <Text style={styles.actionBtnText}>
                  {showVideo ? 'Pause' : t('strengthExercises.playVideo')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Botón descargar video - solo si hay video */}
            {hasVideo && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDownload]}
                onPress={handleDownloadVideo}
                disabled={downloading}
              >
                {downloading && downloadProgress > 0 ? (
                  <Text style={styles.actionBtnText}>{Math.round(downloadProgress * 100)}%</Text>
                ) : downloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={22} color="#fff" />
                    <Text style={styles.actionBtnText}>{t('strengthExercises.downloadVideo')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Botón descargar imagen - siempre visible */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnImage]}
              onPress={handleDownloadImage}
              disabled={downloading}
            >
              <Ionicons name="image-outline" size={22} color="#fff" />
              <Text style={styles.actionBtnText}>{t('strengthExercises.downloadImage')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primaryDark,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 30,
  },
  imageSection: {
    position: 'relative',
    backgroundColor: '#000',
    aspectRatio: 4 / 3,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59,130,246,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  videoSection: {
    position: 'relative',
    backgroundColor: '#111',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  closeVideoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  infoSection: {
    padding: 16,
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.textPrimary,
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  progressLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: '600',
    width: 75,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textPrimary,
    width: 35,
    textAlign: 'right',
  },
  actionsSection: {
    paddingHorizontal: 16,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnVideo: {
    backgroundColor: THEME.primary,
  },
  actionBtnDownload: {
    backgroundColor: THEME.success,
  },
  actionBtnImage: {
    backgroundColor: '#8b5cf6',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
