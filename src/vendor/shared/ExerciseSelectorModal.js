// ExerciseSelectorModal.js
// Selector de ejercicios con navegación por carpetas idéntica al listado principal
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import {
  getVideosByExercise,
  getVideoStreamUrl,
  getVideoDownloadUrl,
  regenerateVideoWithField,
  getReadyDownloadUrl,
} from '@/utils/api';
import { downloadResolvedVideo, resolvePlayableVideoUrl } from '@/utils/videoPlayback';
import { toast } from '@/ui/toast';
import { getFieldById } from '@/utils/fieldTypes';
import Base64ImagePreview from '@/vendor/tacticalBoard/imagePreview';
import {
  fetchExerciseFolders,
  fetchExerciseFoldersFlat,
  fetchGlobalExercises,
  toggleFavoriteExercise,
} from '@/store/slices/exercise/exerciseThunks';
import { setExerciseFavorite } from '@/store/slices/exercise/exerciseSlice';
import {
  applyFavoritePrefsToItems,
  getItemId,
  persistFavoriteState,
  readFavoritePrefs,
  sameId,
} from '@/utils/favoritePersistence';
import { getContentImage } from '@/utils/contentVisual';
import { getSharedWithMe } from '@/api/sharedContent';

const THEME_DEFAULT = {
  primary: '#2474E5',
  primaryLight: '#5b93ea',
  primaryDark: '#1a5bb8',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  bg: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textSec: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  surfaceAlt: '#f1f5f9',
  primarySoft: '#eff6ff',
  primarySoftBorder: '#bfdbfe',
  primarySoftText: '#1e40af',
  onPrimary: '#ffffff',
};

const buildTheme = (sc) => {
  const c = sc?.colors || {};
  return {
    primary: c.primary || THEME_DEFAULT.primary,
    primaryLight: c.primaryHover || c.primary || THEME_DEFAULT.primaryLight,
    primaryDark: c.primaryActive || c.primary || THEME_DEFAULT.primaryDark,
    success: c.success || THEME_DEFAULT.success,
    warning: c.warning || THEME_DEFAULT.warning,
    danger: c.error || THEME_DEFAULT.danger,
    bg: c.background || THEME_DEFAULT.bg,
    surface: c.surface || THEME_DEFAULT.surface,
    surfaceAlt: c.surfaceAlt || c.backgroundAlt || THEME_DEFAULT.surfaceAlt,
    text: c.text || THEME_DEFAULT.text,
    textSec: c.textSecondary || THEME_DEFAULT.textSec,
    textMuted: c.textMuted || THEME_DEFAULT.textMuted,
    border: c.border || THEME_DEFAULT.border,
    primarySoft: c.primarySoft || THEME_DEFAULT.primarySoft,
    primarySoftBorder: c.primarySoft || THEME_DEFAULT.primarySoftBorder,
    primarySoftText: c.primarySoftText || THEME_DEFAULT.primarySoftText,
    onPrimary: c.onPrimary || THEME_DEFAULT.onPrimary,
  };
};

/* ======================== MAIN COMPONENT ======================== */
export default function ExerciseSelectorModal({
  visible,
  onClose,
  ejercicios,
  selectedIds,
  setSelectedIds,
  multiSelect = true,
  onSelectSingle = null,
  onCreateExercise = null,
}) {
  const { t, i18n } = useTranslation();
  const themeSC = useTheme();
  const THEME = useMemo(() => buildTheme(themeSC), [themeSC]);
  const s = useMemo(() => makeS(THEME), [THEME]);
  const dispatch = useDispatch();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isPortrait = height >= width;
  const isWide = width > 900;
  const isMobile = width < 500;

  // ── Redux folder data (igual que el listado principal) ──
  const reduxFolders = useSelector((s) => s.exercise.folders) || [];
  const reduxFoldersFlat = useSelector((s) => s.exercise.foldersFlat) || [];
  const globalExercises = useSelector((s) => s.exercise.globalExercises) || [];
  const user = useSelector((s) => s.usuario.user);
  const isDemo = user?.plan === 'demo' || user?.accessMode === 'demo';

  // ── States ──
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [titleFilter, setTitleFilter] = useState('');
  const [playersFilter, setPlayersFilter] = useState('');
  const [teamsFilter, setTeamsFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'mine' | 'club' | 'shared' | 'global' | 'favorites'
  const [sharedExercises, setSharedExercises] = useState([]);
  const [favoritePrefs, setFavoritePrefs] = useState(null);

  // Navegación carpetas
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]); // [{_id, nombre, color}]

  // Video
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [exerciseForVideo, setExerciseForVideo] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoAvailability, setVideoAvailability] = useState({});

  // ── Cargar folders y globales al abrir ──
  useEffect(() => {
    if (visible) {
      const lang = i18n.language;
      dispatch(fetchExerciseFolders({ lang }));
      dispatch(fetchExerciseFoldersFlat({ lang }));
      dispatch(fetchGlobalExercises({ lang }));
      readFavoritePrefs('exercise').then(setFavoritePrefs).catch(() => setFavoritePrefs(null));
      if (!isDemo) {
        getSharedWithMe('exercise')
          .then(({ data }) => setSharedExercises(Array.isArray(data) ? data : []))
          .catch(() => setSharedExercises([]));
      } else {
        setSharedExercises([]);
      }
    }
  }, [visible, dispatch, i18n.language]);

  // ── Reset al cerrar ──
  useEffect(() => {
    if (!visible) {
      setSearch('');
      setShowFilters(false);
      setTitleFilter('');
      setPlayersFilter('');
      setTeamsFilter('');
      setSourceFilter('all');
      setCurrentFolderId(null);
      setFolderPath([]);
      closeVideoModal();
      setVideoAvailability({});
    }
  }, [visible]);

  // ── Cargar disponibilidad video ──
  useEffect(() => {
    const allEx = [...(ejercicios || []), ...globalExercises];
    if (!visible || !allEx.length) return;
    const load = async () => {
      const avail = {};
      const batch = 10;
      for (let i = 0; i < allEx.length; i += batch) {
        const slice = allEx.slice(i, i + batch);
        await Promise.all(
          slice.map(async (ej) => {
            try {
              const vids = await getVideosByExercise(ej._id);
              avail[ej._id] = vids && vids.length > 0;
            } catch {
              avail[ej._id] = false;
            }
          }),
        );
        setVideoAvailability((prev) => ({ ...prev, ...avail }));
      }
    };
    load();
  }, [visible, ejercicios, globalExercises]);

  // ═══════════════════════════════════════════════
  //  Lista combinada de ejercicios (usuario + globales sin duplicados)
  // ═══════════════════════════════════════════════
  const allExercises = useMemo(() => {
    const byId = new Map();
    [...(ejercicios || []), ...sharedExercises, ...globalExercises].filter(Boolean).forEach((exercise) => {
      const id = getItemId(exercise);
      if (!id) return;
      const prev = byId.get(String(id));
      byId.set(String(id), {
        ...prev,
        ...exercise,
        favorito: Boolean(prev?.favorito || exercise.favorito),
      });
    });
    const merged = Array.from(byId.values());
    return favoritePrefs ? applyFavoritePrefsToItems(merged, favoritePrefs) : merged;
  }, [ejercicios, sharedExercises, globalExercises, favoritePrefs]);

  // ═══════════════════════════════════════════════
  //  Contar ejercicios y subcarpetas por carpeta
  //  (usa datos del servidor cuando están disponibles)
  // ═══════════════════════════════════════════════
  const exerciseCountByFolder = useMemo(() => {
    if (reduxFolders.length > 0) {
      const counts = {};
      reduxFolders.forEach((f) => {
        if (f.exerciseCount !== undefined) counts[f._id] = f.exerciseCount;
      });
      return counts;
    }
    const counts = {};
    (ejercicios || []).forEach((e) => {
      const fId = typeof e.folder === 'object' ? e.folder?._id : e.folder;
      if (fId) counts[fId] = (counts[fId] || 0) + 1;
    });
    return counts;
  }, [ejercicios, reduxFolders]);

  const subfolderCountByFolder = useMemo(() => {
    if (reduxFolders.length > 0) {
      const counts = {};
      reduxFolders.forEach((f) => {
        if (f.subfolderCount !== undefined) counts[f._id] = f.subfolderCount;
      });
      return counts;
    }
    const counts = {};
    const all = reduxFoldersFlat.length > 0 ? reduxFoldersFlat : reduxFolders;
    all.forEach((f) => {
      const pid =
        typeof f.parentFolder === 'object' ? f.parentFolder?._id || f.parentFolder : f.parentFolder;
      if (pid) counts[pid] = (counts[pid] || 0) + 1;
    });
    return counts;
  }, [reduxFolders, reduxFoldersFlat]);

  // Helper: nombre limpio (flat endpoint añade prefijo └─)
  const getFolderName = useCallback((folder) => {
    return folder.displayName || (folder.nombre || '').replace(/^\s*└─\s*/, '');
  }, []);

  // ═══════════════════════════════════════════════
  //  CARPETAS — usando Redux (igual que exerciseList)
  //  Filtra por sourceFilter: global→solo isGlobal, mine→solo !isGlobal
  // ═══════════════════════════════════════════════
  const currentLevelFolders = useMemo(() => {
    const all = reduxFoldersFlat.length > 0 ? reduxFoldersFlat : reduxFolders;
    let candidates;
    if (!currentFolderId) {
      candidates = all.filter((f) => !f.parentFolder);
    } else {
      candidates = all.filter((f) => {
        const pid =
          typeof f.parentFolder === 'object'
            ? f.parentFolder?._id || f.parentFolder
            : f.parentFolder;
        return pid === currentFolderId;
      });
    }
    if (sourceFilter === 'global') {
      candidates = candidates.filter((f) => f.isGlobal);
    } else if (sourceFilter === 'mine') {
      candidates = candidates.filter((f) => !f.isGlobal);
    } else if (sourceFilter === 'club' || sourceFilter === 'shared') {
      candidates = [];
    } else if (sourceFilter === 'favorites') {
      candidates = [];
    }
    return candidates.sort((a, b) => getFolderName(a).localeCompare(getFolderName(b)));
  }, [reduxFolders, reduxFoldersFlat, currentFolderId, getFolderName, sourceFilter]);

  // ═══════════════════════════════════════════════
  //  EJERCICIOS del nivel actual (respetando sourceFilter)
  //  Los globales también navegan por carpetas
  // ═══════════════════════════════════════════════
  const currentLevelExercises = useMemo(() => {
    let source;
    if (sourceFilter === 'global') {
      source = globalExercises;
    } else if (sourceFilter === 'mine') {
      source = ejercicios || [];
    } else if (sourceFilter === 'club') {
      source = allExercises.filter((e) => e.visibility === 'CLUB' || e.clubId);
    } else if (sourceFilter === 'shared') {
      source = allExercises.filter((e) => e.sharedByFriend);
    } else if (sourceFilter === 'favorites') {
      source = allExercises.filter((e) => e.favorito);
    } else {
      source = allExercises;
    }

    if (sourceFilter === 'favorites') {
      return source;
    }

    if (!currentFolderId) return source.filter((e) => !e.folder);
    return source.filter((e) => {
      if (!e.folder) return false;
      const fId = typeof e.folder === 'object' ? e.folder._id : e.folder;
      return fId === currentFolderId;
    });
  }, [ejercicios, globalExercises, allExercises, currentFolderId, sourceFilter]);

  // Filtros avanzados
  const uniquePlayers = useMemo(() => {
    const s = new Set();
    currentLevelExercises.forEach((e) => {
      if (e.numeroJugadores) s.add(e.numeroJugadores);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [currentLevelExercises]);

  const uniqueTeams = useMemo(() => {
    const s = new Set();
    currentLevelExercises.forEach((e) => {
      if (e.equipos) s.add(e.equipos);
    });
    return Array.from(s).sort();
  }, [currentLevelExercises]);

  const lower = search.trim().toLowerCase();
  const titleLower = titleFilter.trim().toLowerCase();
  const isSearching = !!(lower || titleLower || playersFilter || teamsFilter);

  // Lista final filtrada — cuando se busca, buscar en TODOS los ejercicios (global)
  const baseList = useMemo(() => {
    const allSource =
      sourceFilter === 'global'
        ? globalExercises
        : sourceFilter === 'mine'
          ? ejercicios || []
          : sourceFilter === 'club'
            ? allExercises.filter((e) => e.visibility === 'CLUB' || e.clubId)
            : sourceFilter === 'shared'
              ? allExercises.filter((e) => e.sharedByFriend)
          : sourceFilter === 'favorites'
            ? allExercises.filter((e) => e.favorito)
            : allExercises;
    let source = isSearching ? allSource : currentLevelExercises;
    let filtered = source.slice();
    if (lower) filtered = filtered.filter((e) => (e.nombre || '').toLowerCase().includes(lower));
    if (titleLower)
      filtered = filtered.filter((e) => (e.nombre || '').toLowerCase().includes(titleLower));
    if (playersFilter)
      filtered = filtered.filter(
        (e) => e.numeroJugadores && e.numeroJugadores.toString() === playersFilter,
      );
    if (teamsFilter) filtered = filtered.filter((e) => e.equipos && e.equipos === teamsFilter);
    return filtered.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [
    ejercicios,
    globalExercises,
    allExercises,
    currentLevelExercises,
    lower,
    titleLower,
    playersFilter,
    teamsFilter,
    isSearching,
    sourceFilter,
  ]);

  const selectedObjs = useMemo(
    () =>
      allExercises
        .filter((e) => selectedIds.includes(e._id))
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')),
    [selectedIds, allExercises],
  );

  // ── Navegación ──
  const navigateToFolder = useCallback(
    (folder) => {
      setFolderPath((prev) => [
        ...prev,
        { _id: folder._id, nombre: getFolderName(folder), color: folder.color },
      ]);
      setCurrentFolderId(folder._id);
      setSearch('');
    },
    [getFolderName],
  );

  const navigateBack = useCallback(() => {
    if (folderPath.length > 0) {
      const np = folderPath.slice(0, -1);
      setFolderPath(np);
      setCurrentFolderId(np.length > 0 ? np[np.length - 1]._id : null);
    }
    setSearch('');
  }, [folderPath]);

  const navigateToRoot = useCallback(() => {
    setFolderPath([]);
    setCurrentFolderId(null);
    setSearch('');
  }, []);

  const navigateToBreadcrumb = useCallback(
    (index) => {
      if (index < 0) {
        navigateToRoot();
        return;
      }
      const np = folderPath.slice(0, index + 1);
      setFolderPath(np);
      setCurrentFolderId(np[np.length - 1]._id);
      setSearch('');
    },
    [folderPath, navigateToRoot],
  );

  // ── Video ──
  const handlePlayVideo = async (exercise) => {
    setExerciseForVideo(exercise);
    setShowVideoModal(true);
    setIsGeneratingVideo(true);
    try {
      const videos = await getVideosByExercise(exercise._id);
      if (videos?.length > 0) {
        const video = videos[0];
        setSelectedVideo(video);
        const url = await resolvePlayableVideoUrl(video);
        if (url) setVideoUrl(url);
        else {
          Alert.alert(t('message.info'), t('exercise.noVideos'));
          setShowVideoModal(false);
        }
      } else {
        Alert.alert(t('message.info'), t('exercise.noVideos'));
        setShowVideoModal(false);
      }
    } catch (err) {
      console.error(err);
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
  const handleOpenImagePreview = useCallback((image) => {
    if (!image) return;
    setSelectedImage(image);
    setShowImageModal(true);
  }, []);
  const closeImageModal = useCallback(() => {
    setShowImageModal(false);
    setSelectedImage(null);
  }, []);
  const downloadVideo = async () => {
    if (!selectedVideo) return;
    try {
      setIsDownloading(true);
      toast.success(t('myVideos.downloadingStarted', 'Preparando el video para guardarlo...'));
      await downloadResolvedVideo(selectedVideo, selectedVideo.nombre || 'video');
      toast.success(t('myVideos.downloadStarted', 'Video guardado en la galeria.'));
      return;
      const url = await resolvePlayableVideoUrl(selectedVideo);
      if (!url) throw new Error('No se pudo obtener el vídeo');
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const blob = await resp.blob();
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${selectedVideo.nombre || 'video'}.mp4`;
        a.click();
        URL.revokeObjectURL(a.href);
      } else {
        const fileUri = FileSystem.documentDirectory + `${selectedVideo.nombre || 'video'}.mp4`;
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          try {
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            await MediaLibrary.createAlbumAsync('xtramys', asset, false);
            Alert.alert(t('message.success'), t('video.savedToGallery'));
          } catch {
            const ok = await Sharing.isAvailableAsync();
            if (ok) await Sharing.shareAsync(fileUri, { mimeType: 'video/mp4' });
          }
        };
        reader.readAsDataURL(blob);
      }
    } catch {
      toast.error(t('myVideos.downloadError', 'No se pudo guardar el video. Intentalo de nuevo.'));
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Selección ──
  const toggle = useCallback(
    (id) => {
      if (!multiSelect && onSelectSingle) {
        onSelectSingle(id);
        onClose();
      } else
        setSelectedIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    },
    [setSelectedIds, multiSelect, onSelectSingle, onClose],
  );
  const deselect = useCallback(
    (id) => {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    },
    [setSelectedIds],
  );

  // ── Favoritos ──
  const handleToggleFavorite = useCallback(
    async (exerciseId) => {
      const currentExercise = allExercises.find((ex) => sameId(getItemId(ex), exerciseId));
      const previousFavorite = !!currentExercise?.favorito;
      const optimisticFavorite = !previousFavorite;
      dispatch(setExerciseFavorite({ exerciseId, favorito: optimisticFavorite }));
      setFavoritePrefs((prev) => {
        const favorites = new Set(prev?.favorites || []);
        const unfavorites = new Set(prev?.unfavorites || []);
        const id = String(exerciseId || '');
        if (optimisticFavorite) {
          favorites.add(id);
          unfavorites.delete(id);
        } else {
          favorites.delete(id);
          unfavorites.add(id);
        }
        return { favorites, unfavorites };
      });
      persistFavoriteState('exercise', exerciseId, optimisticFavorite).catch(() => { });
      try {
        await dispatch(
          toggleFavoriteExercise({ exerciseId, favorito: optimisticFavorite }),
        ).unwrap();
      } catch {
        dispatch(setExerciseFavorite({ exerciseId, favorito: previousFavorite }));
        setFavoritePrefs((prev) => {
          const favorites = new Set(prev?.favorites || []);
          const unfavorites = new Set(prev?.unfavorites || []);
          const id = String(exerciseId || '');
          if (previousFavorite) {
            favorites.add(id);
            unfavorites.delete(id);
          } else {
            favorites.delete(id);
            unfavorites.add(id);
          }
          return { favorites, unfavorites };
        });
        persistFavoriteState('exercise', exerciseId, previousFavorite).catch(() => { });
      }
    },
    [dispatch, allExercises],
  );

  const clearFilters = () => {
    setTitleFilter('');
    setPlayersFilter('');
    setTeamsFilter('');
  };
  const hasActiveFilters = [titleFilter, playersFilter, teamsFilter].filter(Boolean).length;

  if (!visible) return null;

  const showFolders = !isSearching && currentLevelFolders.length > 0;

  // ══════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={currentFolderId ? navigateBack : onClose}
    >
      <View style={s.backdrop}>
        <View
          style={[
            s.container,
            {
              paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 18 : 14),
              paddingBottom: Math.max(insets.bottom, 14),
              paddingLeft: 16 + Math.max(insets.left, 0),
              paddingRight: 16 + Math.max(insets.right, 0),
            },
            isWide && { alignSelf: 'center', maxWidth: 1100 },
          ]}
        >
          {/* ─── HEADER ─── */}
          <View style={s.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {currentFolderId ? (
                <TouchableOpacity onPress={navigateBack} style={s.backBtn}>
                  <Ionicons name="arrow-back" size={20} color={THEME.primary} />
                </TouchableOpacity>
              ) : null}
              <View>
                <Text style={s.title}>{t('exercise.selectExercises')}</Text>
                {currentFolderId && folderPath.length > 0 && (
                  <Text style={s.subtitle} numberOfLines={1}>
                    {folderPath[folderPath.length - 1].nombre}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={THEME.text} />
            </TouchableOpacity>
          </View>

          {/* ─── BREADCRUMBS ─── */}
          {folderPath.length > 0 && (
            <View style={s.breadcrumbs}>
              <TouchableOpacity onPress={navigateToRoot} style={s.crumbItem}>
                <Ionicons name="home" size={14} color={THEME.primary} />
                <Text style={s.crumbText}>{t('folders.root')}</Text>
              </TouchableOpacity>
              {folderPath.map((c, i) => (
                <View key={c._id} style={s.crumbItem}>
                  <Ionicons name="chevron-forward" size={12} color="#94a3b8" />
                  <TouchableOpacity
                    onPress={() => (i < folderPath.length - 1 ? navigateToBreadcrumb(i) : null)}
                    disabled={i === folderPath.length - 1}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                  >
                    <Ionicons name="folder" size={12} color={c.color || THEME.primary} />
                    <Text
                      style={[s.crumbText, i === folderPath.length - 1 && s.crumbActive]}
                      numberOfLines={1}
                    >
                      {c.nombre}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* ─── SEARCH + FILTER BAR ─── */}
          <View style={[s.searchBar, isMobile && s.searchBarMobile]}>
            <View style={[s.searchInputWrap, { flex: 1 }, isMobile && s.searchInputWrapMobile]}>
              <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
              <TextInput
                style={s.searchInput}
                placeholder={t('common.search') + '...'}
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
                enterKeyHint="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
                )}
              </View>
            <View style={[s.searchActions, isMobile && s.searchActionsMobile]}>
              <TouchableOpacity
                style={[s.filterBtn, hasActiveFilters > 0 && s.filterBtnActive]}
                onPress={() => setShowFilters(!showFilters)}
              >
                <MaterialIcons
                  name="filter-list"
                  size={18}
                  color={hasActiveFilters > 0 ? THEME.onPrimary : THEME.primary}
                />
                {hasActiveFilters > 0 && <Text style={s.filterBtnBadge}>{hasActiveFilters}</Text>}
              </TouchableOpacity>
              {onCreateExercise && (
                <TouchableOpacity
                  style={[s.createExerciseBtn, isMobile && s.createExerciseBtnMobile]}
                  onPress={onCreateExercise}
                >
                  <Ionicons name="add" size={18} color={THEME.onPrimary} />
                  <Text style={s.createExerciseBtnText}>{t('exercise.createExercise')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ─── FILTROS EXPANDIBLES ─── */}
          {showFilters && (
            <View style={s.filtersPanel}>
              <View style={s.filtersPanelHeader}>
                <Text style={s.filtersPanelTitle}>{t('session.advancedFilters')}</Text>
                {hasActiveFilters > 0 && (
                  <TouchableOpacity onPress={clearFilters} style={s.clearFiltersBtn}>
                    <Text style={s.clearFiltersTxt}>{t('common.clear')}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={s.filtersRow}>
                <View style={s.filterField}>
                  <Text style={s.filterLabel}>{t('common.title')}</Text>
                  <TextInput
                    style={s.filterInput}
                    placeholder={t('session.searchByTitle')}
                    placeholderTextColor="#94a3b8"
                    value={titleFilter}
                    onChangeText={setTitleFilter}
                  />
                </View>
                <View style={s.filterField}>
                  <Text style={s.filterLabel}>{t('session.playersLabel')}</Text>
                  <TextInput
                    style={s.filterInput}
                    placeholder={t('common.all')}
                    placeholderTextColor="#94a3b8"
                    value={playersFilter}
                    onChangeText={setPlayersFilter}
                    keyboardType="number-pad"
                    autoComplete="off"
                  />
                </View>
                <View style={s.filterField}>
                  <Text style={s.filterLabel}>{t('session.teamsLabel')}</Text>
                  <TextInput
                    style={s.filterInput}
                    placeholder={t('common.all')}
                    placeholderTextColor="#94a3b8"
                    value={teamsFilter}
                    onChangeText={setTeamsFilter}
                  />
                </View>
              </View>
            </View>
          )}

          {/* ─── SOURCE FILTER TABS ─── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.sourceFilterScroll}
            contentContainerStyle={s.sourceFilterBar}
          >
            {[
              { key: 'favorites', label: t('common.favorites', 'Favoritos'), icon: 'star' },
              { key: 'all', label: t('exercise.allExercises') },
              { key: 'mine', label: t('exercise.myExercises') },
              ...(!isDemo ? [{ key: 'shared', label: t('friends.sharedByFriends', 'Compartidos') }] : []),
              ...(user?.clubId && !isDemo ? [{ key: 'club', label: t('club.sharedLibrary', 'Compartido por mi club') }] : []),
              ...(!isDemo ? [{ key: 'global', label: t('exercise.appExercises') }] : []),
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[s.sourceTab, sourceFilter === tab.key && s.sourceTabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: sourceFilter === tab.key }}
                accessibilityLabel={tab.label}
                onPress={() => {
                  setSourceFilter(tab.key);
                  setCurrentFolderId(null);
                  setFolderPath([]);
                }}
              >
                {tab.icon && (
                  <Ionicons
                    name={sourceFilter === tab.key ? 'star' : 'star-outline'}
                    size={13}
                    color={sourceFilter === tab.key ? THEME.onPrimary : '#f59e0b'}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text
                  numberOfLines={1}
                  style={[s.sourceTabTxt, sourceFilter === tab.key && s.sourceTabTxtActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ─── INFO BAR ─── */}
          <View style={s.infoBar}>
            <Text style={s.infoText}>
              {isSearching
                ? `${baseList.length} ${t('session.results').toLowerCase()}`
                : `${baseList.length} ${t('folders.items')}${showFolders ? ` · ${currentLevelFolders.length} ${t('folders.subfolders')}` : ''}`}
            </Text>
            {multiSelect && selectedIds.length > 0 && (
              <View style={s.selBadge}>
                <Text style={s.selBadgeTxt}>
                  {t('session.selectedCount', { count: selectedIds.length })}
                </Text>
              </View>
            )}
          </View>

          {/* ══════════ MOBILE ══════════ */}
          {isMobile ? (
            <View style={{ flex: 1 }}>
              {/* Selected chips */}
              {multiSelect && selectedIds.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={s.chipsScroll}
                  contentContainerStyle={{ gap: 6, paddingRight: 8 }}
                >
                  {selectedObjs.map((e) => (
                    <TouchableOpacity key={e._id} style={s.chip} onPress={() => deselect(e._id)}>
                      <Text style={s.chipTxt} numberOfLines={1}>
                        {e.nombre}
                      </Text>
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator
              >
                {/* Carpetas */}
                {showFolders && (
                  <View style={s.folderListMobile}>
                    {currentLevelFolders.map((folder) => (
                      <TouchableOpacity
                        key={folder._id}
                        style={s.folderRowMobile}
                        onPress={() => navigateToFolder(folder)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            s.folderIcon,
                            { backgroundColor: (folder.color || '#2196F3') + '18' },
                          ]}
                        >
                          <Ionicons name="folder" size={22} color={folder.color || '#2196F3'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.folderName} numberOfLines={1}>
                            {getFolderName(folder)}
                          </Text>
                          <Text style={s.folderMeta}>
                            {exerciseCountByFolder[folder._id] || 0} {t('folders.items')}
                            {(subfolderCountByFolder[folder._id] || 0) > 0
                              ? ` · ${subfolderCountByFolder[folder._id]} ${t('folders.subfolders')}`
                              : ''}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                      </TouchableOpacity>
                    ))}
                    {baseList.length > 0 && <View style={s.divider} />}
                  </View>
                )}
                {/* Ejercicios */}
                {baseList.length === 0 && !showFolders ? (
                  <View style={s.emptyState}>
                    <Ionicons
                      name={isSearching ? 'search' : 'folder-open-outline'}
                      size={48}
                      color="#cbd5e1"
                    />
                    <Text style={s.emptyTxt}>
                      {isSearching
                        ? t('common.noResults')
                        : currentFolderId
                          ? t('folders.emptyFolder')
                          : t('exercise.noExercises')}
                    </Text>
                  </View>
                ) : (
                  baseList.map((e) => {
                    const sel = selectedIds.includes(e._id);
                    const hasVid = videoAvailability[e._id] === true;
                    const folderName =
                      isSearching && e.folder && typeof e.folder === 'object'
                        ? e.folder.nombre
                        : null;
                    return (
                      <View key={e._id} style={[s.exRowMobile, sel && s.exRowMobileSel]}>
                        <TouchableOpacity
                          style={s.exRowMobileSelectArea}
                          onPress={() => toggle(e._id)}
                          activeOpacity={0.7}
                        >
                          <View style={[s.exCheck, sel && s.exCheckSel]}>
                            {sel && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </View>
                          {getContentImage(e) ? (
                            <View style={s.exThumb}>
                              <Base64ImagePreview
                                imageUrl={getContentImage(e)}
                                forceWidth={46}
                                forceHeight={46}
                              />
                            </View>
                          ) : (
                            <View style={s.exThumbEmpty}>
                              <Ionicons name="fitness" size={22} color="#94a3b8" />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                              <Text style={[s.exName, sel && s.exNameSel]} numberOfLines={2}>
                                {e.nombre}
                              </Text>
                              {e.isGlobal && (
                                <Ionicons name="globe-outline" size={13} color={THEME.primary} />
                              )}
                            </View>
                            {folderName && (
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 3,
                                  marginTop: 2,
                                }}
                              >
                                <Ionicons
                                  name="folder"
                                  size={10}
                                  color={e.folder?.color || THEME.textSec}
                                />
                                <Text style={s.exFolderTag}>{folderName}</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                        <View style={s.exRowActions}>
                          <TouchableOpacity
                            style={[
                              s.exRowActionBtn,
                              { backgroundColor: e.favorito ? '#FEF3C7' : THEME.surfaceAlt },
                            ]}
                            onPress={() => handleToggleFavorite(e._id)}
                          >
                            <Ionicons
                              name={e.favorito ? 'star' : 'star-outline'}
                              size={16}
                              color={e.favorito ? '#F59E0B' : '#94A3B8'}
                            />
                          </TouchableOpacity>
                          {getContentImage(e) && (
                            <TouchableOpacity
                              style={s.exRowActionBtn}
                              onPress={() => handleOpenImagePreview(getContentImage(e))}
                            >
                              <Ionicons name="image-outline" size={18} color={THEME.primary} />
                            </TouchableOpacity>
                          )}
                          {hasVid && (
                            <TouchableOpacity
                              style={s.exRowActionBtn}
                              onPress={() => handlePlayVideo(e)}
                            >
                              <Feather name="play-circle" size={18} color="#E91E63" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          ) : (
            /* ══════════ TABLET / DESKTOP ══════════ */
            <View style={[{ flex: 1, flexDirection: isPortrait ? 'column' : 'row', gap: 12 }]}>
              {/* Panel seleccionados */}
              {multiSelect && (
                <View
                  style={[
                    s.selPanel,
                    isPortrait ? { maxHeight: 120 } : { width: isWide ? 200 : 160 },
                  ]}
                >
                  <Text style={s.selPanelTitle}>
                    {t('session.selectedCount', { count: selectedIds.length })}
                  </Text>
                  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator>
                    {selectedObjs.length === 0 && (
                      <Text style={s.selPanelEmpty}>{t('common.empty')}</Text>
                    )}
                    {selectedObjs.map((e) => (
                      <View key={e._id} style={s.selItem}>
                        <TouchableOpacity onPress={() => deselect(e._id)} style={s.selItemRemove}>
                          <Ionicons name="close" size={12} color="#fff" />
                        </TouchableOpacity>
                        {getContentImage(e) ? (
                          <Base64ImagePreview
                            imageUrl={getContentImage(e)}
                            forceWidth={36}
                            forceHeight={36}
                          />
                        ) : (
                          <View style={s.selItemImgEmpty} />
                        )}
                        <Text style={s.selItemName} numberOfLines={1}>
                          {e.nombre}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
              {/* Main area */}
              <View style={[s.mainArea, { flex: 1 }]}>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 12 }}
                  showsVerticalScrollIndicator
                >
                  {/* Carpetas */}
                  {showFolders && (
                    <View style={{ marginBottom: 12 }}>
                      <View style={s.folderSectionHeader}>
                        <Ionicons name="folder" size={15} color={THEME.primary} />
                        <Text style={s.folderSectionTitle}>{t('folders.folders')}</Text>
                      </View>
                      <View style={s.foldersGrid}>
                        {currentLevelFolders.map((folder) => (
                          <TouchableOpacity
                            key={folder._id}
                            style={s.folderCard}
                            onPress={() => navigateToFolder(folder)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                s.folderCardIcon,
                                { backgroundColor: (folder.color || '#2196F3') + '18' },
                              ]}
                            >
                              <Ionicons name="folder" size={24} color={folder.color || '#2196F3'} />
                            </View>
                            <View style={s.folderCardInfo}>
                              <Text style={s.folderCardName} numberOfLines={1}>
                                {getFolderName(folder)}
                              </Text>
                              <Text style={s.folderCardMeta}>
                                {exerciseCountByFolder[folder._id] || 0} {t('folders.items')}
                                {(subfolderCountByFolder[folder._id] || 0) > 0
                                  ? ` · ${subfolderCountByFolder[folder._id]} ${t('folders.subfolders')}`
                                  : ''}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#ccc" />
                          </TouchableOpacity>
                        ))}
                      </View>
                      {baseList.length > 0 && <View style={s.divider} />}
                    </View>
                  )}
                  {/* Ejercicios grid */}
                  {baseList.length === 0 && !showFolders ? (
                    <View style={s.emptyState}>
                      <Ionicons
                        name={isSearching ? 'search' : 'folder-open-outline'}
                        size={56}
                        color="#cbd5e1"
                      />
                      <Text style={s.emptyTxt}>
                        {isSearching
                          ? t('common.noResults')
                          : currentFolderId
                            ? t('folders.emptyFolder')
                            : t('exercise.noExercises')}
                      </Text>
                    </View>
                  ) : (
                    <View style={s.exGrid}>
                      {baseList.map((e) => {
                        const sel = selectedIds.includes(e._id);
                        const hasVid = videoAvailability[e._id] === true;
                        const folderName =
                          isSearching && e.folder && typeof e.folder === 'object'
                            ? e.folder.nombre
                            : null;
                        return (
                          <View key={e._id} style={[s.exCard, sel && s.exCardSel]}>
                            <TouchableOpacity
                              style={s.exCardSelectArea}
                              onPress={() => toggle(e._id)}
                              activeOpacity={0.75}
                            >
                              {sel && (
                                <View style={s.exSelBadge}>
                                  <Ionicons name="checkmark" size={12} color="#fff" />
                                </View>
                              )}
                              {getContentImage(e) ? (
                                <View style={s.exCardImgWrap}>
                                  <Base64ImagePreview
                                    imageUrl={getContentImage(e)}
                                    forceWidth={56}
                                    forceHeight={56}
                                  />
                                </View>
                              ) : (
                                <View style={s.exCardImgEmpty}>
                                  <Ionicons name="fitness" size={28} color="#cbd5e1" />
                                </View>
                              )}
                              <Text
                                style={[s.exCardName, sel && s.exCardNameSel]}
                                numberOfLines={2}
                              >
                                {e.nombre}
                              </Text>
                              {e.isGlobal && (
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 2,
                                    marginTop: 2,
                                  }}
                                >
                                  <Ionicons name="globe-outline" size={9} color={THEME.primary} />
                                  <Text
                                    style={{ fontSize: 9, color: THEME.primary, fontWeight: '600' }}
                                  >
                                    {t('exercise.globalExercise')}
                                  </Text>
                                </View>
                              )}
                              {folderName && (
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 2,
                                    marginTop: 2,
                                  }}
                                >
                                  <Ionicons
                                    name="folder"
                                    size={9}
                                    color={e.folder?.color || '#94a3b8'}
                                  />
                                  <Text
                                    style={{ fontSize: 9, color: THEME.textMuted }}
                                    numberOfLines={1}
                                  >
                                    {folderName}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                            <View style={s.exCardActions}>
                              <TouchableOpacity
                                style={[
                                  s.exCardActionBtn,
                                  { backgroundColor: e.favorito ? '#FEF3C7' : 'transparent' },
                                ]}
                                onPress={() => handleToggleFavorite(e._id)}
                              >
                                <Ionicons
                                  name={e.favorito ? 'star' : 'star-outline'}
                                  size={13}
                                  color={e.favorito ? '#F59E0B' : '#94A3B8'}
                                />
                              </TouchableOpacity>
                              {getContentImage(e) && (
                                <TouchableOpacity
                                  style={s.exCardActionBtn}
                                  onPress={() => handleOpenImagePreview(getContentImage(e))}
                                >
                                  <Ionicons name="image-outline" size={13} color={THEME.primary} />
                                  <Text style={s.exCardActionTxt}>
                                    {t('exercise.seeImage', 'Imagen')}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              {hasVid && (
                                <TouchableOpacity
                                  style={[
                                    s.exCardActionBtn,
                                    getContentImage(e) ? s.exCardActionBtnSep : null,
                                  ]}
                                  onPress={() => handlePlayVideo(e)}
                                >
                                  <Feather name="play-circle" size={13} color="#E91E63" />
                                  <Text style={[s.exCardActionTxt, { color: '#E91E63' }]}>
                                    {t('exercise.seeVideo', 'Video')}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          )}

          {/* ─── FOOTER ─── */}
          <View style={s.footer}>
            <TouchableOpacity style={s.doneBtn} onPress={onClose}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={s.doneTxt}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>

          {/* ─── IMAGE PREVIEW MODAL ─── */}
          <Modal
            visible={showImageModal}
            transparent
            animationType="fade"
            onRequestClose={closeImageModal}
          >
            <View style={s.imageBg}>
              <View style={[s.imageContent, { maxWidth: Math.min(width - 40, 900) }]}>
                <View style={s.imageHeader}>
                  <Text style={s.imageTitle}>{t('exercise.previewImage', 'Imagen')}</Text>
                  <TouchableOpacity onPress={closeImageModal} style={s.imageCloseBtn}>
                    <Feather name="x" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={s.imageScrollWrapper}
                  contentContainerStyle={s.imageScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <Base64ImagePreview
                    imageUrl={selectedImage}
                    forceWidth={Math.min(width - 64, 840)}
                    forceHeight={Math.min(height - 220, 580)}
                  />
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* ─── VIDEO MODAL ─── */}
          <Modal
            visible={showVideoModal}
            transparent
            animationType="fade"
            onRequestClose={closeVideoModal}
          >
            <View style={s.vidBg}>
              <View style={s.vidContent}>
                <View style={s.vidHeader}>
                  <Text style={s.vidTitle} numberOfLines={1}>
                    {exerciseForVideo?.nombre || t('exercise.video')}
                  </Text>
                  <TouchableOpacity onPress={closeVideoModal} style={{ padding: 8 }}>
                    <Feather name="x" size={24} color="#f1f5f9" />
                  </TouchableOpacity>
                </View>
                {isGeneratingVideo ? (
                  <View style={s.vidLoading}>
                    <ActivityIndicator size="large" color="#E91E63" />
                    <Text style={s.vidLoadTxt}>{t('exercise.generatingVideo')}</Text>
                  </View>
                ) : videoUrl ? (
                  <>
                    <View style={{ aspectRatio: 16 / 9, width: '100%' }}>
                      <VideoPlayerView url={videoUrl} />
                    </View>
                    <TouchableOpacity
                      style={s.vidDlBtn}
                      onPress={downloadVideo}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Feather name="download" size={18} color="#fff" />
                      )}
                      <Text style={s.vidDlTxt}>
                        {isDownloading ? t('video.downloading') : t('video.download')}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const makeS = (THEME) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15,23,42,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      flex: 1,
      width: '100%',
      backgroundColor: THEME.surface,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: THEME.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: THEME.primarySoftBorder,
    },
    title: { fontSize: 18, fontWeight: '800', color: THEME.text, letterSpacing: -0.3 },
    subtitle: { fontSize: 12, color: THEME.primary, fontWeight: '600', marginTop: 1 },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: THEME.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Breadcrumbs
    breadcrumbs: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      paddingVertical: 6,
      paddingHorizontal: 8,
      backgroundColor: THEME.bg,
      borderRadius: 10,
      marginBottom: 6,
      gap: 2,
    },
    crumbItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
      paddingHorizontal: 3,
    },
    crumbText: { fontSize: 12, color: THEME.primary, fontWeight: '600' },
    crumbActive: { color: THEME.text, fontWeight: '700' },

    // Search bar
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    searchBarMobile: { alignItems: 'stretch' },
    searchInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.bg,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: THEME.border,
      paddingHorizontal: 12,
      height: 42,
    },
    searchInputWrapMobile: { flexBasis: '100%' },
    searchInput: { flex: 1, fontSize: 14, color: THEME.text, paddingVertical: 0 },
    searchActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchActionsMobile: { justifyContent: 'flex-end' },
    filterBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: THEME.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: THEME.primarySoftBorder,
    },
    filterBtnActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
    filterBtnBadge: { fontSize: 10, color: THEME.surface, fontWeight: '700', marginTop: -2 },
    createExerciseBtn: {
      height: 42,
      borderRadius: 12,
      backgroundColor: THEME.primary,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    createExerciseBtnMobile: { flexShrink: 1 },
    createExerciseBtnText: { color: THEME.onPrimary, fontSize: 13, fontWeight: '700' },

    // Filters panel
    filtersPanel: {
      backgroundColor: THEME.bg,
      borderRadius: 14,
      padding: 14,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: THEME.border,
    },
    filtersPanelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    filtersPanelTitle: { fontSize: 14, fontWeight: '700', color: THEME.text },
    clearFiltersBtn: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      backgroundColor: THEME.danger,
      borderRadius: 8,
    },
    clearFiltersTxt: { color: THEME.surface, fontSize: 12, fontWeight: '600' },
    filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    filterField: { flex: 1, minWidth: 120 },
    filterLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: THEME.textSec,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    filterInput: {
      borderWidth: 1.5,
      borderColor: THEME.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: THEME.text,
      backgroundColor: THEME.surface,
    },

    // Source filter tabs
    sourceFilterScroll: {
      flexGrow: 0,
      maxHeight: 42,
      marginBottom: 8,
    },
    sourceFilterBar: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 2,
      paddingRight: 12,
    },
    sourceTab: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 36,
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: THEME.surfaceAlt,
      borderWidth: 1,
      borderColor: THEME.border,
    },
    sourceTabActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
    sourceTabTxt: { fontSize: 12, fontWeight: '700', color: THEME.textSec },
    sourceTabTxtActive: { color: THEME.surface },

    // Info bar
    infoBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    infoText: { fontSize: 11, color: THEME.textSec, fontWeight: '600' },
    selBadge: {
      backgroundColor: THEME.primary + '15',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
    },
    selBadgeTxt: { fontSize: 11, color: THEME.primary, fontWeight: '700' },

    // Chips (mobile selected)
    chipsScroll: { maxHeight: 36, marginBottom: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.primary,
      borderRadius: 14,
      paddingVertical: 5,
      paddingHorizontal: 10,
      gap: 5,
    },
    chipTxt: { fontSize: 11, color: THEME.surface, fontWeight: '500', maxWidth: 90 },

    // ── Folder cards (mobile) ──
    folderListMobile: { marginBottom: 4 },
    folderRowMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.surface,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 6,
      borderWidth: 1.5,
      borderColor: THEME.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    folderIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    folderName: { fontSize: 14, fontWeight: '700', color: THEME.text },
    folderMeta: { fontSize: 11, color: THEME.textMuted, marginTop: 1 },

    // ── Folder cards (desktop) ──
    folderSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    folderSectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: THEME.textSec,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    foldersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    folderCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.surface,
      borderRadius: 12,
      padding: 12,
      minWidth: 200,
      maxWidth: 280,
      borderWidth: 1.5,
      borderColor: THEME.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 2,
    },
    folderCardIcon: {
      width: 42,
      height: 42,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    folderCardInfo: { flex: 1 },
    folderCardName: { fontSize: 14, fontWeight: '700', color: THEME.text },
    folderCardMeta: { fontSize: 11, color: THEME.textMuted, marginTop: 1 },
    divider: { height: 1, backgroundColor: THEME.border, marginVertical: 10 },

    // Empty state
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, flex: 1 },
    emptyTxt: {
      fontSize: 14,
      color: THEME.textMuted,
      fontWeight: '600',
      marginTop: 10,
      textAlign: 'center',
    },

    // ── Exercise rows (mobile) ──
    exRowMobile: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.surface,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: THEME.border,
      gap: 10,
      minHeight: 78,
    },
    exRowMobileSel: { backgroundColor: THEME.primarySoft, borderColor: THEME.primary },
    exCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: '#d1d5db',
      alignItems: 'center',
      justifyContent: 'center',
    },
    exCheckSel: { backgroundColor: THEME.primary, borderColor: THEME.primary },
    exThumbButton: { position: 'relative' },
    exThumb: { width: 46, height: 46, borderRadius: 8, overflow: 'hidden' },
    exThumbEmpty: {
      width: 46,
      height: 46,
      borderRadius: 8,
      backgroundColor: THEME.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exCardImageWrapper: { position: 'relative' },
    imageThumbBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(15,23,42,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    exName: { fontSize: 14, fontWeight: '700', color: THEME.text },
    exNameSel: { color: THEME.primarySoftText || THEME.primary },
    exFolderTag: { fontSize: 10, color: THEME.textSec },

    // ── Exercise grid cards (desktop) ──
    exGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    exCard: {
      width: 158,
      backgroundColor: THEME.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: THEME.border,
      padding: 12,
      alignItems: 'center',
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    exCardSel: { backgroundColor: THEME.primarySoft, borderColor: THEME.primary, borderWidth: 2 },
    exCardSelectArea: { width: '100%', alignItems: 'center' },
    exCardImgWrap: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', marginBottom: 6 },
    exCardImgEmpty: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: THEME.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    exCardName: {
      fontSize: 12,
      fontWeight: '700',
      textAlign: 'center',
      color: THEME.text,
      marginTop: 4,
      minHeight: 32,
    },
    exCardNameSel: { color: THEME.primarySoftText || THEME.primary || '#1e40af', fontWeight: '700' },
    exCardActions: {
      flexDirection: 'row',
      width: '100%',
      borderTopWidth: 1,
      borderTopColor: THEME.border,
      marginTop: 8,
      paddingTop: 2,
      gap: 1,
    },
    exCardActionBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      borderRadius: 6,
    },
    exCardActionBtnSep: { borderLeftWidth: 1, borderLeftColor: THEME.border, borderRadius: 0 },
    exCardActionTxt: { fontSize: 10, fontWeight: '600', color: THEME.primary },
    exSelBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: THEME.primary,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    exRowMobileSelectArea: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    exRowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingLeft: 4,
    },
    exRowActionBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Selected panel (desktop)
    selPanel: {
      backgroundColor: THEME.bg,
      borderRadius: 14,
      padding: 8,
      borderWidth: 1,
      borderColor: THEME.border,
    },
    selPanelTitle: { fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 6 },
    selPanelEmpty: { fontSize: 11, color: THEME.textMuted, textAlign: 'center', marginTop: 12 },
    selItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.surface,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 4,
      marginBottom: 4,
      gap: 6,
    },
    selItemRemove: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: THEME.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selItemImgEmpty: { width: 36, height: 36, borderRadius: 8, backgroundColor: THEME.border },
    selItemName: { flex: 1, fontSize: 11, color: THEME.text, fontWeight: '600' },

    // Main area (desktop)
    mainArea: {
      backgroundColor: THEME.surface,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: THEME.border,
    },

    // Footer
    footer: { marginTop: 8, alignItems: 'flex-end' },
    doneBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.primary,
      paddingVertical: 11,
      paddingHorizontal: 22,
      borderRadius: 12,
      shadowColor: THEME.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    doneTxt: { color: THEME.surface, fontSize: 14, fontWeight: '700' },

    // Image preview modal
    imageBg: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    imageContent: {
      width: '100%',
      maxHeight: '90%',
      backgroundColor: '#0f172a',
      borderRadius: 18,
      padding: 16,
      alignItems: 'center',
    },
    imageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    imageTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    imageCloseBtn: { padding: 6 },
    imageScrollWrapper: { flex: 1, width: '100%' },
    imageScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },

    // Video modal
    vidBg: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    vidContent: {
      width: '95%',
      maxWidth: 800,
      backgroundColor: '#1a1a1a',
      borderRadius: 16,
      overflow: 'hidden',
    },
    vidHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#2a2a2a',
    },
    vidTitle: { fontSize: 16, fontWeight: '600', color: '#f1f5f9', flex: 1 },
    vidLoading: { padding: 40, alignItems: 'center' },
    vidLoadTxt: { marginTop: 12, color: '#f1f5f9', fontSize: 14 },
    vidDlBtn: {
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
    vidDlTxt: { color: THEME.surface, fontSize: 14, fontWeight: '600' },
  });

// Componente aislado para el player de video — se recrea cuando cambia la URL
function VideoPlayerView({ url }) {
  const player = useVideoPlayer(url || '', (p) => {
    if (url) {
      p.loop = false;
      p.play();
    }
  });
  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />;
}
