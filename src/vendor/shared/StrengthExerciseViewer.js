// components/StrengthExerciseViewer.js
// Componente para ver un ejercicio de fuerza individual con video, imagen y opciones de descarga
// Optimizado con caché de video para minimizar recursos
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { downloadResolvedVideo } from '@/utils/videoPlayback';
import { toast } from '@/ui/toast';
import {
  getStrengthExerciseImage,
  getStrengthExerciseVideoUrl,
  getStrengthExerciseVideoUrls,
  getSectionForExercise,
  checkVideoAvailability,
} from '@/data/strengthExercises';

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

const THEME_DEFAULT = {
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
  surfaceAlt: '#f1f5f9',
  border: '#e2e8f0',
  overlay: 'rgba(0,0,0,0.6)',
};

const buildTheme = (sc) => {
  const c = sc?.colors || {};
  return {
    primary: c.primary || THEME_DEFAULT.primary,
    primaryDark: c.primaryActive || c.primary || THEME_DEFAULT.primaryDark,
    success: c.success || THEME_DEFAULT.success,
    danger: c.error || THEME_DEFAULT.danger,
    warning: c.warning || THEME_DEFAULT.warning,
    textPrimary: c.text || THEME_DEFAULT.textPrimary,
    textSecondary: c.textSecondary || THEME_DEFAULT.textSecondary,
    textMuted: c.textMuted || THEME_DEFAULT.textMuted,
    background: c.background || THEME_DEFAULT.background,
    surface: c.surface || THEME_DEFAULT.surface,
    surfaceAlt: c.surfaceAlt || c.backgroundAlt || THEME_DEFAULT.surfaceAlt,
    border: c.border || THEME_DEFAULT.border,
    overlay: THEME_DEFAULT.overlay,
  };
};

export default function StrengthExerciseViewer({ visible, onClose, exercise }) {
  const { t } = useTranslation();
  const themeSC = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const THEME = useMemo(() => buildTheme(themeSC), [themeSC]);
  const isWide = screenWidth >= 900;
  const mediaHeight = Math.max(220, Math.min(screenHeight * 0.44, isWide ? 420 : 320));
  const contentMaxWidth = isWide ? 1040 : undefined;
  const styles = useMemo(() => makeStyles(THEME, mediaHeight), [THEME, mediaHeight]);
  const [showVideo, setShowVideo] = useState(false);
  const [videoUri, setVideoUri] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [checkingVideo, setCheckingVideo] = useState(false);
  const [videoFallbackIndex, setVideoFallbackIndex] = useState(0);
  const playerRef = useRef(null);

  const imageSource = exercise ? getStrengthExerciseImage(exercise) : null;
  const sectionInfo = exercise ? getSectionForExercise(exercise) : null;
  const videoUrls = useMemo(() => exercise ? getStrengthExerciseVideoUrls(exercise) : [], [exercise?.id, exercise?.image]);

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
      setVideoFallbackIndex(0);
    }
  }, [visible]);

  const handlePlayVideo = useCallback(async () => {
    if (!exercise) return;
    setLoadingVideo(true);
    try {
      setVideoFallbackIndex(0);
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

  const handleVideoError = useCallback(() => {
    setVideoFallbackIndex((index) => {
      const nextIndex = index + 1;
      if (nextIndex < videoUrls.length) {
        setVideoUri(videoUrls[nextIndex]);
        return nextIndex;
      }
      toast.error(t('exercise.videoPlayError', 'No se pudo reproducir el video.'));
      setShowVideo(false);
      setVideoUri(null);
      return index;
    });
  }, [t, videoUrls]);

  const handleDownloadVideo = useCallback(async () => {
    if (!exercise) return;

    setDownloading(true);
    try {
      toast.success(t('myVideos.downloadingStarted', 'Preparando el video para guardarlo...'));
      let lastError;
      for (const remoteUrl of videoUrls.length ? videoUrls : [getStrengthExerciseVideoUrl(exercise)]) {
        try {
          await downloadResolvedVideo({ videoUrl: remoteUrl }, exercise.nombre || exercise.id || 'video');
          toast.success(t('myVideos.downloadStarted', 'Video guardado en la galeria.'));
          return;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    } catch (error) {
      console.error('Download video error:', error);
      toast.error(t('myVideos.downloadError', 'No se pudo guardar el video. Intentalo de nuevo.'));
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  }, [exercise, t]);

  const handleDownloadImage = useCallback(async () => {
    if (!exercise || !imageSource) return;

    const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
    if (isCapacitor) {
      setDownloading(true);
      try {
        toast.success(t('strengthExercises.imageDownloadStarted', 'Preparando la imagen para guardarla...'));
        const asset = Asset.fromModule(imageSource);
        await asset.downloadAsync();
        const localUri = asset.localUri || asset.uri;

        if (!localUri) throw new Error('No se pudo resolver la ruta local de la imagen');

        const response = await fetch(localUri);
        const blob = await response.blob();
        const filename = `${exercise.id || 'image'}.png`;
        const mimeType = blob.type || 'image/png';

        const { registerPlugin } = await import('@capacitor/core');
        const VideoSaver = registerPlugin('VideoSaver');
        const blobToBase64 = (b) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = reject;
          reader.onload = () => resolve(String(reader.result || '').split(',')[1]);
          reader.readAsDataURL(b);
        });
        const base64Data = await blobToBase64(blob);

        if (window.Capacitor.getPlatform() === 'android') {
          await VideoSaver.saveImageToGallery({
            data: base64Data,
            fileName: filename,
            mimeType
          });
          toast.success(t('strengthExercises.imageSavedToGallery', 'Imagen guardada en la galeria.'));
        } else {
          // iOS
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const { Media } = await import('@capacitor-community/media');
          const writeResult = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Cache
          });
          try {
            await Media.requestPermissions();
            await Media.savePhoto({ path: writeResult.uri });
            toast.success(t('strengthExercises.imageSavedToGallery', 'Imagen guardada en la galeria.'));
          } catch (iosMediaErr) {
            console.warn('iOS Media.savePhoto failed, saving to Documents:', iosMediaErr);
            await Filesystem.writeFile({
              path: filename,
              data: base64Data,
              directory: Directory.Documents
            });
            toast.success(t('strengthExercises.imageSavedToDocuments', 'Imagen guardada en Documentos.'));
          }
        }
      } catch (error) {
        console.error('Download image error:', error);
        toast.error(t('strengthExercises.imageDownloadError', 'No se pudo guardar la imagen. Intentalo de nuevo.'));
      } finally {
        setDownloading(false);
      }
      return;
    }

    setDownloading(true);
    try {
      toast.success(t('strengthExercises.imageDownloadStarted', 'Preparando la imagen para guardarla...'));
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
        toast.success(t('strengthExercises.imageSavedToGallery', 'Imagen guardada en la galeria.'));
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
            toast.success(t('strengthExercises.imageSavedToGallery', 'Imagen guardada en la galeria.'));
          } catch (saveErr) {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
              await Sharing.shareAsync(tempPath, { mimeType: 'image/webp' });
              toast.success(t('strengthExercises.imageSavedToGallery', 'Imagen guardada en la galeria.'));
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
          toast.success(t('strengthExercises.imageSavedToGallery', 'Imagen guardada en la galeria.'));
        }
      } else {
        throw new Error('Could not resolve local image URI');
      }
    } catch (error) {
      console.error('Download image error:', error);
      toast.error(t('strengthExercises.imageDownloadError', 'No se pudo guardar la imagen. Intentalo de nuevo.'));
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
        let lastError;
        for (const remoteUrl of videoUrls.length ? videoUrls : [getStrengthExerciseVideoUrl(exercise)]) {
          try {
            const result = await FileSystem.downloadAsync(remoteUrl, cachedPath);
            fileUri = result.uri;
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (!fileUri) throw lastError;
      }
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, { mimeType: 'video/mp4' });
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  }, [exercise, videoUrls]);

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
            <Ionicons name="arrow-back" size={24} color={THEME.textPrimary} />
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
              <Ionicons name="share-outline" size={22} color={THEME.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={[styles.bodyContent, { maxWidth: contentMaxWidth }]}>
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
                  onError={handleVideoError}
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
                  <Text style={[styles.actionBtnText, { color: THEME.background }]}>{Math.round(downloadProgress * 100)}%</Text>
                ) : downloading ? (
                  <ActivityIndicator size="small" color={THEME.background} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={22} color={THEME.background} />
                    <Text style={[styles.actionBtnText, { color: THEME.background }]}>{t('strengthExercises.downloadVideo')}</Text>
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
              <Ionicons name="image-outline" size={22} color={THEME.textPrimary} />
              <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>{t('strengthExercises.downloadImage')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const makeStyles = (THEME, mediaHeight) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: THEME.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: THEME.textSecondary,
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
    width: '100%',
    alignSelf: 'center',
  },
  imageSection: {
    position: 'relative',
    backgroundColor: THEME.surface,
    height: mediaHeight,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
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
    backgroundColor: THEME.background,
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoWrapper: {
    width: '100%',
    maxWidth: 860,
    height: mediaHeight,
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  closeVideoBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
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
    backgroundColor: THEME.border,
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
    backgroundColor: THEME.textPrimary,
    borderWidth: 1,
    borderColor: THEME.textPrimary,
  },
  actionBtnDownloadText: {
    color: THEME.background,
  },
  actionBtnImage: {
    backgroundColor: THEME.surfaceAlt,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  actionBtnTextSecondary: {
    color: THEME.textPrimary,
  },
});
