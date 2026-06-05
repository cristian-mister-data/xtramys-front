import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Dimensions,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import i18n from '@/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { 
  listVideos as apiListVideos,
  deleteVideo as apiDeleteVideo,
  createVideoFolder,
  listVideoFolders,
  getVideoFolderById,
  deleteVideoFolder,
  updateVideoFolder,
  moveVideoToFolder,
  duplicateVideoToFolder,
  getAllVideoFoldersFlat,
  getAllExercises,
  getAllStrategies,
  linkVideoToExercise,
  linkVideoToStrategy,
  getVideoForEdit,
  duplicateVideoForEdit,
  listGlobalVideos,
  toggleFavoriteVideo,
  batchDeleteVideos,
  batchMoveVideos,
} from '@/utils/api';
import { downloadResolvedVideo, resolvePlayableVideoUrl } from '@/utils/videoPlayback';
import VideoPoster from '@/components/shared/VideoPoster';
import { getFieldById } from '@/utils/fieldTypes';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import LinkSelectorModal from '@/vendor/shared/LinkSelectorModal';

export default function MyVideos() {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [videos, setVideos] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingAction, setLoadingAction] = useState('video');
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' });
  const [filter, setFilter] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuVideo, setMenuVideo] = useState(null);
  
  // Source filter: 'all' | 'mine' | 'global' | 'favorites'
  const [sourceFilter, setSourceFilter] = useState('all');

  // Estado de selección múltiple
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchMoving, setBatchMoving] = useState(false);

  // Estado para navegación de carpetas
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);

  // User role (detectar desde AsyncStorage como en createExerciseForm)
  const [isAdmin, setIsAdmin] = useState(false);
  const lang = i18n.language;

  useEffect(() => {
    const detectAdmin = async () => {
      try {
        const str = await AsyncStorage.getItem('usuario');
        if (str) {
          const parsed = JSON.parse(str);
          if (parsed?.role === 'admin') { setIsAdmin(true); return; }
        }
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const parts = token.split('.');
          if (parts.length === 3) {
            const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
              + '='.repeat((4 - parts[1].length % 4) % 4);
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            let decoded = ''; let idx = 0;
            while (idx < b64.length) {
              const e1 = chars.indexOf(b64[idx++]), e2 = chars.indexOf(b64[idx++]);
              const e3 = chars.indexOf(b64[idx++]), e4 = chars.indexOf(b64[idx++]);
              decoded += String.fromCharCode((e1 << 2) | (e2 >> 4));
              if (e3 !== 64) decoded += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));
              if (e4 !== 64) decoded += String.fromCharCode(((e3 & 3) << 6) | e4);
            }
            const payload = JSON.parse(decoded);
            if (payload?.role === 'admin') setIsAdmin(true);
          }
        }
      } catch {}
    };
    detectAdmin();
  }, []);

  useEffect(() => {
    if (global.pendingVideoEditSuccess) {
      global.pendingVideoEditSuccess = false;
      setNotification({ visible: true, message: t('videoRecorder.videoUpdatedSuccess'), type: 'success' });
      const timer = setTimeout(() => {
        setNotification({ visible: false, message: '', type: 'success' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [t]);
  
  // Modal para crear carpeta
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderNameEn, setNewFolderNameEn] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#1d4ed8');
  
  // Modal para mover/duplicar video
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveAction, setMoveAction] = useState('move'); // 'move' o 'duplicate'
  const [allFolders, setAllFolders] = useState([]);
  const [selectedDestFolder, setSelectedDestFolder] = useState(null);
  
  // Menú de carpeta
  const [folderMenuVisible, setFolderMenuVisible] = useState(false);
  const [menuFolder, setMenuFolder] = useState(null);

  // Editar carpeta
  const [editFolderModalVisible, setEditFolderModalVisible] = useState(false);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderNameEn, setEditFolderNameEn] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('#1d4ed8');

  // Modal para asociar video a ejercicio/estrategia
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkType, setLinkType] = useState('exercise'); // 'exercise' o 'strategy'
  const [allExercises, setAllExercises] = useState([]);
  const [allStrategies, setAllStrategies] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [linkSearchFilter, setLinkSearchFilter] = useState('');

  const player = useVideoPlayer(videoUrl || '', player => {
    if (videoUrl) {
      player.loop = true;
      player.play();
    }
  });

  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;
  const IS_TABLET = screenWidth >= 700;

  const getLocalizedVideoName = (video) => {
    if (lang === 'en' && video.translations?.en?.nombre) {
      return video.translations.en.nombre;
    }
    return video.nombre || t('myVideos.video');
  };

  const folderColors = [
    '#1d4ed8', '#8B5CF6', '#EC4899', '#F43F5E', 
    '#F97316', '#EAB308', '#22C55E', '#14B8A6',
    '#06B6D4', '#3B82F6', '#64748B', '#78716C'
  ];

  // Recargar contenido cuando la pantalla recibe el foco
  useFocusEffect(
    useCallback(() => {
      loadContent();
    }, [currentFolder, sourceFilter])
  );

  const loadContent = async () => {
    try {
      setLoading(true);
      
      // Cargar carpetas del nivel actual (ya incluye globales desde el backend)
      const foldersResult = await listVideoFolders(currentFolder || 'null', lang);
      let loadedFolders = foldersResult.success ? (foldersResult.folders || []) : [];
      
      // Filtrar por sourceFilter
      if (sourceFilter === 'global') {
        loadedFolders = loadedFolders.filter(f => f.isGlobal);
      } else if (sourceFilter === 'mine') {
        loadedFolders = loadedFolders.filter(f => !f.isGlobal);
      }
      setFolders(loadedFolders);
      
      // Cargar videos del nivel actual
      if (sourceFilter === 'global') {
        const videosResult = await listGlobalVideos(currentFolder || 'root');
        setVideos(videosResult.success ? (videosResult.videos || []) : []);
      } else if (sourceFilter === 'mine') {
        const videosResult = await apiListVideos({ folderId: currentFolder || 'root' });
        setVideos(videosResult.success ? (videosResult.videos || []) : []);
      } else if (sourceFilter === 'favorites') {
        // Fetch all to filter favorites if not in a folder, otherwise fetch current folder
        const videosResult = await apiListVideos({ folderId: currentFolder || 'root', includeGlobal: 'true' });
        setVideos(videosResult.success ? (videosResult.videos || []).filter(v => v.favorito) : []);
      } else {
        // 'all': user + global
        const videosResult = await apiListVideos({ folderId: currentFolder || 'root', includeGlobal: 'true' });
        setVideos(videosResult.success ? (videosResult.videos || []) : []);
      }
    } catch (error) {
      console.error('Error cargando contenido:', error);
      showNotification(t('myVideos.couldNotLoad'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ visible: true, message, type });
    setTimeout(() => {
      setNotification({ visible: false, message: '', type: 'success' });
    }, 3000);
  };

  const openFolder = async (folder) => {
    const fid = folder.id || folder._id;
    setFolderPath(prev => [...prev, { id: fid, nombre: folder.nombre }]);
    setCurrentFolder(fid);
  };

  const goBack = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      newPath.pop();
      setFolderPath(newPath);
      setCurrentFolder(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
    }
  };

  const goToRoot = () => {
    setFolderPath([]);
    setCurrentFolder(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showNotification(t('myVideos.folderNameRequired'), 'error');
      return;
    }

    try {
      const folderData = {
        nombre: newFolderName.trim(),
        parentFolder: currentFolder,
        color: newFolderColor,
      };
      // Admin siempre crea carpetas globales (consistente con ejercicios)
      if (isAdmin) {
        folderData.isGlobal = true;
        if (newFolderNameEn.trim()) {
          folderData.translations = { en: { nombre: newFolderNameEn.trim() } };
        }
      }
      const result = await createVideoFolder(folderData);

      if (result.success) {
        showNotification(t('myVideos.folderCreated'), 'success');
        setShowCreateFolderModal(false);
        setNewFolderName('');
        setNewFolderNameEn('');
        setNewFolderColor('#1d4ed8');
        loadContent();
      }
    } catch (error) {
      console.error('Error creando carpeta:', error);
      const errorMsg = error.response?.data?.message || t('myVideos.couldNotCreateFolder');
      showNotification(errorMsg, 'error');
    }
  };

  const [folderToDelete, setFolderToDelete] = useState(null);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const handleDeleteFolder = async (folder) => {
    setFolderToDelete(folder);
    setShowDeleteFolderModal(true);
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
        : { moveVideosTo: null, deleteContents: false };
      
      await deleteVideoFolder(folderToDelete.id, options);
      showNotification(t('myVideos.folderDeleted'), 'success');
      loadContent();
      setShowDeleteFolderModal(false);
      setShowDeleteConfirmModal(false);
      setFolderToDelete(null);
    } catch (error) {
      console.error('Error eliminando carpeta:', error);
      showNotification(t('myVideos.couldNotDeleteFolder'), 'error');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteFolderModal(false);
    setShowDeleteConfirmModal(false);
    setFolderToDelete(null);
  };

  const handleEditFolder = (folder) => {
    setMenuFolder(folder);
    setEditFolderName(folder.nombreEs || folder.nombre);
    setEditFolderNameEn(folder.translations?.en?.nombre || '');
    setEditFolderColor(folder.color || '#1d4ed8');
    setEditFolderModalVisible(true);
  };

  const handleUpdateFolder = async () => {
    if (!editFolderName.trim()) {
      showNotification(t('folders.nameRequired'), 'error');
      return;
    }
    try {
      const updateData = { nombre: editFolderName.trim(), color: editFolderColor };
      if (menuFolder?.isGlobal && isAdmin && editFolderNameEn.trim()) {
        updateData.translations = { en: { nombre: editFolderNameEn.trim() } };
      }
      await updateVideoFolder(menuFolder.id, updateData);
      showNotification(t('folders.folderUpdated'), 'success');
      setEditFolderModalVisible(false);
      loadContent();
    } catch (error) {
      showNotification(t('folders.updateError'), 'error');
    }
  };

  const openMoveModal = async (action) => {
    setMoveAction(action);
    setMenuVisible(false);
    
    try {
      const result = await getAllVideoFoldersFlat(lang);
      if (result.success) {
        setAllFolders((result.folders || []).filter(folder => !folder.isGlobal));
      }
    } catch (error) {
      console.error('Error cargando carpetas:', error);
    }
    
    setSelectedDestFolder(null);
    setShowMoveModal(true);
  };

  const handleMoveOrDuplicate = async () => {
    if (!menuVideo) return;
    
    try {
      const videoId = menuVideo._id || menuVideo.id;
      
      if (moveAction === 'move') {
        await moveVideoToFolder(videoId, selectedDestFolder);
        showNotification(t('myVideos.videoMoved'), 'success');
      } else {
        await duplicateVideoToFolder(videoId, selectedDestFolder);
        showNotification(t('myVideos.videoDuplicated'), 'success');
      }
      
      setShowMoveModal(false);
      setMenuVideo(null);
      loadContent();
    } catch (error) {
      console.error('Error:', error);
      const actionLabel = t(moveAction === 'move' ? 'myVideos.move' : 'myVideos.duplicate').toLowerCase();
      showNotification(t('myVideos.couldNotMoveOrDuplicate', { action: actionLabel }), 'error');
    }
  };

  // Abrir modal para asociar video a ejercicio/estrategia
  const openLinkModal = (type) => {
    setLinkType(type);
    setMenuVisible(false);
    setShowLinkModal(true);
  };

  // Asociar video a ejercicio/estrategia
  const handleLinkVideo = async (itemId) => {
    if (!menuVideo || !itemId) return;
    
    try {
      const videoId = menuVideo._id || menuVideo.id;
      
      if (linkType === 'exercise') {
        await linkVideoToExercise({ videoId, exerciseId: itemId });
        showNotification(t('myVideos.videoLinkedToExercise'), 'success');
      } else {
        await linkVideoToStrategy({ videoId, strategyId: itemId });
        showNotification(t('myVideos.videoLinkedToStrategy'), 'success');
      }
      
      setShowLinkModal(false);
      setMenuVideo(null);
    } catch (error) {
      console.error('Error asociando video:', error);
      showNotification(t('myVideos.couldNotLinkVideo'), 'error');
    }
  };

  // Función para editar video - navega a Field con los datos del video
  // Para videos globales y usuario no-admin: duplica primero (consistente con ejercicios)
  const editVideo = async (video) => {
    try {
      setIsGenerating(true);
      setMenuVisible(false);
      
      const videoId = video._id || video.id;
      const mustDuplicate = video?.isGlobal && !isAdmin;

      let editableVideoId = videoId;
      let result = null;

      if (mustDuplicate) {
        // Duplicar video antes de editar (igual que ejercicios)
        const lang = i18n.language;
        const duplicateSuffix = lang === 'en' ? 'duplicate' : 'duplicado';
        const duplicateName = `${getLocalizedVideoName(video).trim()}_${duplicateSuffix}`;
        const duplicated = await duplicateVideoForEdit(videoId, {
          lang,
          nombre: duplicateName,
        });
        editableVideoId = duplicated?.video?.id;

        if (!editableVideoId) {
          throw new Error('No se pudo crear el duplicado para edición');
        }
        result = await getVideoForEdit(editableVideoId);
        showNotification(t('myVideos.cloneToEdit'), 'success');
      } else {
        result = await getVideoForEdit(editableVideoId);
      }
      
      if (result.success && result.video) {
        const videoData = result.video;
        
        // Guardar datos en global para que Field los pueda leer
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
        
        // Navegar a la pizarra táctica para editar
        navigation.navigate('TacticalBoard');
      } else {
        showNotification(t('myVideos.couldNotLoadVideo'), 'error');
      }
    } catch (error) {
      console.error('Error cargando video para edición:', error);
      showNotification(t('myVideos.couldNotLoadVideo'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const viewVideo = async (video) => {
    try {
      setLoadingAction('video');
      setIsGenerating(true);
      setSelectedVideo(video);

      const resolvedUrl = await resolvePlayableVideoUrl(video);
      if (!resolvedUrl) throw new Error('No se pudo resolver la URL del vídeo');
      setVideoUrl(resolvedUrl);
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Error cargando video:', error);
      showNotification(t('myVideos.couldNotLoadVideo'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadVideo = async (videoOrId, videoUrl = null) => {
    try {
      setLoadingAction('download');
      setIsGenerating(true);
      showNotification(t('myVideos.downloadingStarted'), 'success');
      const video = typeof videoOrId === 'object' && videoOrId
        ? videoOrId
        : { id: videoOrId, videoUrl };
      await downloadResolvedVideo(video, getLocalizedVideoName(video));
      showNotification(t('myVideos.downloadStarted'), 'success');
    } catch (error) {
      console.error('Error descargando video:', error);
      showNotification(t('myVideos.downloadError'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteVideo = async (videoId) => {
    Alert.alert(
      t('myVideos.deleteVideoConfirm'),
      t('myVideos.deleteVideoMessage'),
      [
        { text: t('myVideos.cancel'), style: 'cancel' },
        {
          text: t('myVideos.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDeleteVideo(videoId);
              showNotification(t('myVideos.videoDeleted'), 'success');
              await loadContent();
            } catch (error) {
              console.error('Error eliminando video:', error);
              showNotification(t('myVideos.couldNotDeleteVideo'), 'error');
            }
          }
        }
      ]
    );
  };

  // ---- Selecci\u00f3n m\u00faltiple ----
  const handleVideoLongPress = (video) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedIds(new Set([video.id || video._id]));
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
    // Si hay un filtro de texto, seleccionamos los filtrados. Sino todos los listados en 'videos'
    const listToSelect = filter
      ? videos.filter(v => getLocalizedVideoName(v).toLowerCase().includes(filter.toLowerCase()))
      : videos;
    const allIds = listToSelect.map(v => v.id || v._id);
    setSelectedIds(new Set(allIds));
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleToggleFavorite = async (videoId) => {
    try {
      await toggleFavoriteVideo(videoId);
      loadContent();
    } catch (err) {
      showNotification(t('message.error'), 'error');
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      t('message.warning'),
      `\u00bfEliminar ${selectedIds.size} video(s)?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('edition.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await batchDeleteVideos([...selectedIds]);
              showNotification(t('strategy.strategyDeleted') || 'Eliminados', 'success');
              loadContent();
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
      await batchMoveVideos([...selectedIds], folderId || null);
      showNotification(t('folders.moveToFolder') || 'Movidos', 'success');
      loadContent();
      setShowBatchMoveModal(false);
      handleCancelSelection();
    } catch (err) {
      showNotification(t('message.error'), 'error');
    } finally {
      setBatchMoving(false);
    }
  };
  // ---- Fin selecci\u00f3n m\u00faltiple ----

  const filteredContent = useCallback(() => {
    const filterLower = filter.toLowerCase();
    const filteredFolders = folders.filter(f => f.nombre.toLowerCase().includes(filterLower));
    const filteredVideos = videos.filter(v => v.nombre.toLowerCase().includes(filterLower));
    return { filteredFolders, filteredVideos };
  }, [folders, videos, filter]);

  const { filteredFolders, filteredVideos } = filteredContent();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('myVideos.today');
    if (diffDays === 1) return t('myVideos.yesterday');
    if (diffDays < 7) return t('myVideos.daysAgo', { days: diffDays });
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderFolderItem = (folder) => (
    <TouchableOpacity 
      key={folder.id || folder._id} 
      style={styles.folderCard}
      onPress={() => openFolder(folder)}
      onLongPress={() => { setMenuFolder(folder); setFolderMenuVisible(true); }}
      activeOpacity={0.7}
    >
      <View style={[styles.folderIconContainer, { backgroundColor: folder.color || '#1d4ed8' }]}>
        <Feather name="folder" size={28} color="#fff" />
      </View>
      <View style={styles.folderContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.folderName} numberOfLines={1}>{folder.nombre}</Text>
          {folder.isGlobal && <Ionicons name="globe-outline" size={13} color={theme.colors.primary} />}
        </View>
        <View style={styles.folderStats}>
          <Feather name="film" size={12} color={theme.colors.textMuted} />
          <Text style={styles.folderStatsText}> {folder.videoCount || 0}</Text>
          {folder.subfolderCount > 0 && (
            <>
              <Text style={styles.folderStatsText}>  •  </Text>
              <Feather name="folder" size={12} color={theme.colors.textMuted} />
              <Text style={styles.folderStatsText}> {folder.subfolderCount}</Text>
            </>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.cardMenuButton}
        onPress={() => { setMenuFolder(folder); setFolderMenuVisible(true); }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="more-vertical" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderVideoItem = (video) => {
    const isSelected = selectedIds.has(video.id || video._id);
    return (
    <TouchableOpacity 
      key={video._id || video.id} 
      style={[styles.videoCard, isSelected && { borderColor: '#3578e5', borderWidth: 2, backgroundColor: theme?.colors?.primarySoft || '#EEF2FF' }]}
      onPress={() => selectionMode ? handleToggleSelect(video.id || video._id) : viewVideo(video)}
      onLongPress={() => handleVideoLongPress(video)}
      delayLongPress={400}
      activeOpacity={0.7}
    >
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
          onPress={() => handleToggleSelect(video.id || video._id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isSelected && <Feather name="check" size={13} color="#fff" />}
        </TouchableOpacity>
      )}
      {/* Botón estrella favorito */}
      <TouchableOpacity
        style={{
          position: 'absolute', top: 6, right: 38, zIndex: 10,
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: video.favorito ? '#FEF3C7' : 'rgba(255,255,255,0.9)',
          borderWidth: 1, borderColor: video.favorito ? '#FDE68A' : '#E2E8F0',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
        }}
        onPress={() => handleToggleFavorite(video.id || video._id)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={video.favorito ? 'star' : 'star-outline'}
          size={16}
          color={video.favorito ? '#F59E0B' : '#94A3B8'}
        />
      </TouchableOpacity>
      <View style={styles.videoThumbnail}>
        <VideoPoster
          video={video}
          poster={video.thumbnailUrl || video.thumbnail}
          fallback={<Feather name="play-circle" size={32} color="#fff" />}
          playSize={34}
          alt={getLocalizedVideoName(video)}
        />
      </View>
      <View style={styles.videoContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.videoTitle} numberOfLines={1}>{getLocalizedVideoName(video)}</Text>
          {video.isGlobal && <Ionicons name="globe-outline" size={13} color={theme.colors.primary} />}
        </View>
        {video.descripcion && (
          <Text style={styles.videoDescription} numberOfLines={2}>
            {video.descripcion}
          </Text>
        )}
        <View style={styles.videoMeta}>
          <Feather name="calendar" size={12} color={theme.colors.textMuted} />
          <Text style={styles.videoDate}>{formatDate(video.createdAt)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.cardMenuButton}
        onPress={() => { setMenuVideo(video); setMenuVisible(true); }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="more-vertical" size={18} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {folderPath.length < 2 && !(sourceFilter === 'global' && !isAdmin) && (
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.addFolderButton}
              onPress={() => setShowCreateFolderModal(true)}
              activeOpacity={0.7}
            >
              <Feather name="folder-plus" size={20} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
          <TouchableOpacity 
            onPress={goToRoot} 
            style={[styles.breadcrumbItem, folderPath.length === 0 && styles.breadcrumbItemActive]}
          >
            <Feather name="home" size={16} color={folderPath.length === 0 ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.breadcrumbText, folderPath.length === 0 && styles.breadcrumbTextActive]}>{t('myVideos.home')}</Text>
          </TouchableOpacity>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <Feather name="chevron-right" size={16} color="#CBD5E1" style={styles.breadcrumbSeparator} />
              <TouchableOpacity 
                onPress={() => {
                  const newPath = folderPath.slice(0, index + 1);
                  setFolderPath(newPath);
                  setCurrentFolder(folder.id);
                }}
                style={[styles.breadcrumbItem, index === folderPath.length - 1 && styles.breadcrumbItemActive]}
              >
                <Text 
                  style={[styles.breadcrumbText, index === folderPath.length - 1 && styles.breadcrumbTextActive]} 
                  numberOfLines={1}
                >
                  {folder.nombre}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
        <View style={[styles.searchBar, { flex: 1 }]}>
          <Feather name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('myVideos.searchPlaceholder')}
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={filter}
            onChangeText={setFilter}
          />
          {filter.length > 0 && (
            <TouchableOpacity onPress={() => setFilter('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={18} color={theme.colors.textMuted} />
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
          {(!theme.IS_MOBILE && screenWidth >= 430) && <Text style={{ color: selectionMode ? (theme.mode === 'dark' ? '#60a5fa' : '#3578e5') : (theme.mode === 'dark' ? '#94A3B8' : '#64748B'), fontWeight: '600', fontSize: 13 }}>{selectionMode ? (t('common.cancelSelection') || 'Cancelar selección') : (t('common.select') || 'Seleccionar')}</Text>}
        </TouchableOpacity>
      </View>

      {/* Source Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sourceFilterBar}
        style={styles.sourceFilterScroll}
      >
        {[
          { key: 'all', label: t('myVideos.allVideos') || 'Todos' },
          { key: 'mine', label: t('myVideos.myVideosOnly') || 'Míos' },
          { key: 'global', label: t('myVideos.appVideos') || 'App' },
          { key: 'favorites', label: t('common.favorites') || 'Favoritos', icon: 'star' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.sourceTab, 
              sourceFilter === tab.key && styles.sourceTabActive,
              tab.icon && { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', paddingHorizontal: 16 }
            ]}
            onPress={() => { setSourceFilter(tab.key); setCurrentFolder(null); setFolderPath([]); }}
            activeOpacity={0.8}
          >
            {tab.icon && (
              <Ionicons
                name={sourceFilter === tab.key ? tab.icon : `${tab.icon}-outline`}
                size={14}
                color={sourceFilter === tab.key ? '#fff' : (theme.mode === 'dark' ? '#94A3B8' : '#64748B')}
                style={{ marginRight: 6 }}
              />
            )}
            <Text
              numberOfLines={1}
              style={[
                styles.sourceTabTxt, 
                sourceFilter === tab.key && styles.sourceTabTxtActive,
                { flexShrink: 1 }
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('myVideos.loading')}</Text>
        </View>
      ) : (filteredFolders.length === 0 && filteredVideos.length === 0) ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Feather name="film" size={48} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyTitle}>
            {filter ? t('myVideos.noResults') : currentFolder ? t('myVideos.emptyFolder') : t('myVideos.noVideosYet')}
          </Text>
          <Text style={styles.emptySubtitle}>
            {filter 
              ? t('myVideos.tryOtherSearch')
              : t('myVideos.videosWillAppearHere')
            }
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.contentList}
          contentContainerStyle={styles.contentListInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Folders Section */}
          {filteredFolders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="folder" size={16} color={theme.colors.textMuted} />
                <Text style={styles.sectionTitle}>{t('myVideos.folders')}</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{filteredFolders.length}</Text>
                </View>
              </View>
              <View style={styles.itemsContainer}>
                {filteredFolders.map(renderFolderItem)}
              </View>
            </View>
          )}
          
          {/* Videos Section */}
          {filteredVideos.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="film" size={16} color={theme.colors.textMuted} />
                <Text style={styles.sectionTitle}>{t('myVideos.videos')}</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{filteredVideos.length}</Text>
                </View>
              </View>
              <View style={styles.itemsContainer}>
                {filteredVideos.map(renderVideoItem)}
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
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{t('edition.delete') || 'Eliminar'}</Text>
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
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowBatchMoveModal(false)}
        >
          <View style={[styles.actionSheet, { maxHeight: '75%' }]}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>
                {t('folders.moveToFolder') || 'Mover a carpeta'} ({selectedIds.size})
              </Text>
              <Text style={styles.actionSheetSubtitle}>
                {t('folders.selectDestination') || 'Selecciona la carpeta destino'}
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 350 }}>
              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => handleBatchMove(null)}
                disabled={batchMoving}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#F1F5F9' }]}>
                  <Feather name="home" size={20} color="#64748B" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>{t('folders.root') || 'Raíz'}</Text>
                  <Text style={styles.actionSubtitle}>{t('folders.noFolder') || 'Sin carpeta'}</Text>
                </View>
              </TouchableOpacity>
              {allFolders.map(folder => (
                <TouchableOpacity
                  key={folder._id || folder.id}
                  style={styles.actionOption}
                  onPress={() => handleBatchMove(folder._id || folder.id)}
                  disabled={batchMoving}
                >
                  <View style={[styles.actionIcon, { backgroundColor: folder.color || '#3B82F6' }]}>
                    <Feather name="folder" size={20} color="#fff" />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle} numberOfLines={1}>{folder.nombre}</Text>
                  </View>
                  {batchMoving && <ActivityIndicator size="small" color="#3578e5" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Video Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.actionSheet}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle} numberOfLines={1}>
                {menuVideo ? getLocalizedVideoName(menuVideo) : ''}
              </Text>
              <Text style={styles.actionSheetSubtitle}>{t('myVideos.videoOptions')}</Text>
            </View>
            
            <View style={styles.actionSheetBody}>
              {/* Botón favorito */}
              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => {
                  setMenuVisible(false);
                  handleToggleFavorite(menuVideo?.id || menuVideo?._id);
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: menuVideo?.favorito ? '#FEF3C7' : '#F8FAFC' }]}>
                  <Ionicons
                    name={menuVideo?.favorito ? 'star' : 'star-outline'}
                    size={20}
                    color={menuVideo?.favorito ? '#F59E0B' : '#94A3B8'}
                  />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>
                    {menuVideo?.favorito
                      ? (t('common.removeFromFavorites') || 'Quitar de favoritos')
                      : (t('common.addToFavorites') || 'Añadir a favoritos')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => {
                  setMenuVisible(false);
                  if (menuVideo) viewVideo(menuVideo);
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
                  <Feather name="play" size={20} color="#1d4ed8" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>{t('myVideos.play')}</Text>
                  <Text style={styles.actionSubtitle}>{t('myVideos.playSubtitle')}</Text>
                </View>
              </TouchableOpacity>
              
              {/* Editar: siempre visible. Non-admin en video global duplica primero (consistente con ejercicios) */}
              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => {
                  if (menuVideo) editVideo(menuVideo);
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Feather name="edit-3" size={20} color="#D97706" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>{t('myVideos.edit')}</Text>
                  <Text style={styles.actionSubtitle}>
                    {menuVideo?.isGlobal && !isAdmin
                      ? t('myVideos.editCopySubtitle')
                      : t('myVideos.editSubtitle')}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => {
                  setMenuVisible(false);
                  if (menuVideo) downloadVideo(menuVideo);
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Feather name="download" size={20} color="#10B981" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>{t('myVideos.download')}</Text>
                  <Text style={styles.actionSubtitle}>{t('myVideos.downloadSubtitle')}</Text>
                </View>
              </TouchableOpacity>
              
              {!(menuVideo?.isGlobal && !isAdmin) && (
                <>
                  <TouchableOpacity
                    style={styles.actionOption}
                    onPress={() => openMoveModal('move')}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
                      <Feather name="folder" size={20} color="#F97316" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>{t('myVideos.moveToFolder')}</Text>
                      <Text style={styles.actionSubtitle}>{t('myVideos.moveSubtitle')}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionOption}
                    onPress={() => openMoveModal('duplicate')}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: '#F0F9FF' }]}>
                      <Feather name="copy" size={20} color="#0EA5E9" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>{t('myVideos.duplicate')}</Text>
                      <Text style={styles.actionSubtitle}>{t('myVideos.duplicateSubtitle')}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.actionDivider} />
                  
                  <TouchableOpacity
                    style={styles.actionOption}
                    onPress={() => openLinkModal('exercise')}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
                      <Ionicons name="fitness-outline" size={20} color="#0284C7" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>{t('myVideos.linkToExercise')}</Text>
                      <Text style={styles.actionSubtitle}>{t('myVideos.linkToExerciseSubtitle')}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionOption}
                    onPress={() => openLinkModal('strategy')}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: '#FDF4FF' }]}>
                      <Ionicons name="football-outline" size={20} color="#A855F7" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>{t('myVideos.linkToStrategy')}</Text>
                      <Text style={styles.actionSubtitle}>{t('myVideos.linkToStrategySubtitle')}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.actionDivider} />
                  
                  <TouchableOpacity
                    style={styles.actionOption}
                    onPress={() => {
                      setMenuVisible(false);
                      if (menuVideo) deleteVideo(menuVideo._id || menuVideo.id);
                    }}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
                      <Feather name="trash-2" size={20} color="#EF4444" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={[styles.actionTitle, { color: '#EF4444' }]}>{t('myVideos.delete')}</Text>
                      <Text style={styles.actionSubtitle}>{t('myVideos.deleteSubtitle')}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.actionSheetCancel}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.actionSheetCancelText}>{t('myVideos.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Folder Menu Modal */}
      <Modal
        visible={folderMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setFolderMenuVisible(false)}
        >
          <View style={styles.actionSheet}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle} numberOfLines={1}>{menuFolder?.nombre}</Text>
              <Text style={styles.actionSheetSubtitle}>{t('myVideos.folderOptions')}</Text>
            </View>
            
            <View style={styles.actionSheetBody}>
              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => {
                  setFolderMenuVisible(false);
                  if (menuFolder) openFolder(menuFolder);
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
                  <Feather name="folder" size={20} color="#1d4ed8" />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>{t('myVideos.openFolder')}</Text>
                  <Text style={styles.actionSubtitle}>{t('myVideos.openFolderSubtitle')}</Text>
                </View>
              </TouchableOpacity>
              
              {!(menuFolder?.isGlobal && !isAdmin) && (
                <>
                  <View style={styles.actionDivider} />

                  <TouchableOpacity
                    style={styles.actionOption}
                    onPress={() => {
                      setFolderMenuVisible(false);
                      if (menuFolder) handleEditFolder(menuFolder);
                    }}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
                      <Feather name="edit-2" size={20} color="#F97316" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>{t('folders.editFolder')}</Text>
                      <Text style={styles.actionSubtitle}>{t('folders.editFolderSubtitle')}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.actionDivider} />
                  
                  <TouchableOpacity
                    style={styles.actionOption}
                    onPress={() => {
                      setFolderMenuVisible(false);
                      if (menuFolder) handleDeleteFolder(menuFolder);
                    }}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
                      <Feather name="trash-2" size={20} color="#EF4444" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={[styles.actionTitle, { color: '#EF4444' }]}>{t('myVideos.deleteFolder')}</Text>
                      <Text style={styles.actionSubtitle}>{t('myVideos.deleteFolderSubtitle')}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.actionSheetCancel}
              onPress={() => setFolderMenuVisible(false)}
            >
              <Text style={styles.actionSheetCancelText}>{t('myVideos.cancel')}</Text>
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
        <View style={styles.createModalOverlay}>
          <View style={IS_MOBILE ? styles.createModalContainerMobile : IS_TABLET ? styles.createModalContainerTablet : styles.createModalContainer}>
            {/* Header */}
            <View style={styles.createModalHeader}>
              <View style={IS_MOBILE ? styles.createModalHeaderLeftMobile : styles.createModalHeaderLeft}>
                <View style={[styles.createModalIconContainer, { backgroundColor: '#FFF7ED' }]}>
                  <Feather name="edit-2" size={IS_MOBILE ? 18 : 24} color="#F97316" />
                </View>
                <View>
                  <Text style={IS_MOBILE ? styles.createModalTitleMobile : styles.createModalTitle}>{t('folders.editFolder')}</Text>
                  <Text style={IS_MOBILE ? styles.createModalSubtitleMobile : styles.createModalSubtitle}>{t('folders.editFolderSubtitle')}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setEditFolderModalVisible(false)} style={styles.createModalCloseBtn}>
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <KeyboardAwareScrollView
              style={styles.createModalBody}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={IS_MOBILE ? styles.createModalContentMobile : styles.createModalContent}
            >
              <View style={IS_MOBILE ? styles.createCardMobile : styles.createCard}>
                <View style={styles.createCardHeader}>
                  <Feather name="folder" size={24} color="#F97316" />
                  <Text style={styles.createCardTitle}>{t('myVideos.folderData')}</Text>
                </View>

                <View style={styles.createCardContent}>
                  <Text style={styles.createInputLabel}>{t('myVideos.folderNameLabel')}</Text>
                  <TextInput
                    style={styles.createInput}
                    value={editFolderName}
                    onChangeText={setEditFolderName}
                    placeholder={t('myVideos.folderNamePlaceholder')}
                    placeholderTextColor="#94A3B8"
                    autoFocus
                    maxLength={50}
                  />

                  {/* Traducción inglés (admin + carpeta global) */}
                  {menuFolder?.isGlobal && isAdmin && (
                    <View style={{ marginTop: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Ionicons name="language-outline" size={14} color="#1e40af" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 }}>English</Text>
                      </View>
                      <TextInput
                        style={styles.createInput}
                        value={editFolderNameEn}
                        onChangeText={setEditFolderNameEn}
                        placeholder="Folder name (English)"
                        placeholderTextColor="#94A3B8"
                        maxLength={50}
                      />
                    </View>
                  )}

                  <Text style={[styles.createInputLabel, { marginTop: 16 }]}>{t('myVideos.folderColorLabel')}</Text>
                  <View style={styles.colorGridNew}>
                    {folderColors.map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorCircleNew,
                          { backgroundColor: color },
                          editFolderColor === color && styles.colorCircleSelectedNew
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
            </KeyboardAwareScrollView>

            {/* Footer */}
            <View style={styles.createModalFooter}>
              <TouchableOpacity
                style={styles.createCancelButton}
                onPress={() => setEditFolderModalVisible(false)}
              >
                <Feather name="x" size={18} color="#64748b" />
                <Text style={styles.createCancelButtonText}>{t('myVideos.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createSaveButton, !editFolderName.trim() && styles.createSaveButtonDisabled]}
                onPress={handleUpdateFolder}
                disabled={!editFolderName.trim()}
              >
                <Feather name="check" size={18} color="#fff" />
                <Text style={styles.createSaveButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        visible={showCreateFolderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateFolderModal(false)}
      >
        <View style={styles.createModalOverlay}>
          <View style={IS_MOBILE ? styles.createModalContainerMobile : IS_TABLET ? styles.createModalContainerTablet : styles.createModalContainer}>
            {/* Header */}
            <View style={styles.createModalHeader}>
              <View style={IS_MOBILE ? styles.createModalHeaderLeftMobile : styles.createModalHeaderLeft}>
                <View style={styles.createModalIconContainer}>
                  <Feather name="folder-plus" size={28} color="#1d4ed8" />
                </View>
                <View>
                  <Text style={IS_MOBILE ? styles.createModalTitleMobile : styles.createModalTitle}>
                    {t('myVideos.newFolder')}
                  </Text>
                  <Text style={IS_MOBILE ? styles.createModalSubtitleMobile : styles.createModalSubtitle}>
                    {t('myVideos.newFolderSubtitle')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.createModalCloseBtn}
                onPress={() => {
                  setShowCreateFolderModal(false);
                  setNewFolderName('');
                  setNewFolderNameEn('');
                }}
              >
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <KeyboardAwareScrollView
              style={styles.createModalBody}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={IS_MOBILE ? styles.createModalContentMobile : styles.createModalContent}
            >
              {/* Card de Datos de la Carpeta */}
              <View style={IS_MOBILE ? styles.createCardMobile : styles.createCard}>
                <View style={styles.createCardHeader}>
                  <Feather name="folder" size={24} color="#1d4ed8" />
                  <Text style={styles.createCardTitle}>{t('myVideos.folderData')}</Text>
                </View>

                <View style={styles.createCardContent}>
                  <Text style={styles.createInputLabel}>{t('myVideos.folderNameLabel')}</Text>
                  <TextInput
                    style={styles.createInput}
                    placeholder={t('myVideos.folderNamePlaceholder')}
                    placeholderTextColor="#94A3B8"
                    value={newFolderName}
                    onChangeText={setNewFolderName}
                    maxLength={50}
                  />

                  {/* Traducción inglés (admin) */}
                  {isAdmin && (
                    <View style={{ marginTop: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Ionicons name="language-outline" size={14} color="#1e40af" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 }}>English</Text>
                      </View>
                      <TextInput
                        style={styles.createInput}
                        placeholder="Folder name (English)"
                        placeholderTextColor="#94A3B8"
                        value={newFolderNameEn}
                        onChangeText={setNewFolderNameEn}
                        maxLength={50}
                      />
                    </View>
                  )}
                  
                  <Text style={[styles.createInputLabel, { marginTop: 16 }]}>{t('myVideos.folderColorLabel')}</Text>
                  <View style={styles.colorGridNew}>
                    {folderColors.map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorCircleNew,
                          { backgroundColor: color },
                          newFolderColor === color && styles.colorCircleSelectedNew
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
            </KeyboardAwareScrollView>

            {/* Footer */}
            <View style={styles.createModalFooter}>
              <TouchableOpacity 
                style={styles.createCancelButton}
                onPress={() => {
                  setShowCreateFolderModal(false);
                  setNewFolderName('');
                  setNewFolderNameEn('');
                }}
              >
                <Feather name="x" size={18} color="#64748b" />
                <Text style={styles.createCancelButtonText}>{t('myVideos.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.createSaveButton, !newFolderName.trim() && styles.createSaveButtonDisabled]}
                onPress={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                <Feather name="plus" size={18} color="#fff" />
                <Text style={styles.createSaveButtonText}>{t('myVideos.createFolder')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move/Duplicate Modal */}
      <Modal
        visible={showMoveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoveModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.formModal}>
            <View style={styles.formModalHeader}>
              <View style={[styles.formModalIcon, { backgroundColor: moveAction === 'move' ? '#FFF7ED' : '#F0F9FF' }]}>
                <Feather 
                  name={moveAction === 'move' ? 'folder' : 'copy'} 
                  size={24} 
                  color={moveAction === 'move' ? '#F97316' : '#0EA5E9'} 
                />
              </View>
              <Text style={styles.formModalTitle}>
                {moveAction === 'move' ? t('myVideos.moveVideo') : t('myVideos.duplicateVideo')}
              </Text>
              <Text style={styles.formModalSubtitle}>
                {t('myVideos.selectDestination')}
              </Text>
            </View>
            
            <ScrollView style={styles.folderSelectList} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.folderSelectItem,
                  selectedDestFolder === null && styles.folderSelectItemActive
                ]}
                onPress={() => setSelectedDestFolder(null)}
              >
                <View style={[styles.folderSelectIcon, { backgroundColor: '#F1F5F9' }]}>
                  <Feather name="home" size={18} color="#64748B" />
                </View>
                <Text style={styles.folderSelectText}>{t('myVideos.rootNoFolder')}</Text>
                {selectedDestFolder === null && (
                  <Feather name="check-circle" size={20} color="#1d4ed8" />
                )}
              </TouchableOpacity>
              
              {allFolders.map(folder => (
                <TouchableOpacity
                  key={folder.id}
                  style={[
                    styles.folderSelectItem,
                    selectedDestFolder === folder.id && styles.folderSelectItemActive,
                    folder.level === 1 && { marginLeft: 16 }
                  ]}
                  onPress={() => setSelectedDestFolder(folder.id)}
                >
                  <View style={[styles.folderSelectIcon, { backgroundColor: folder.color || '#1d4ed8' }]}>
                    <Feather name="folder" size={16} color="#fff" />
                  </View>
                  <Text style={styles.folderSelectText}>{folder.nombre}</Text>
                  {selectedDestFolder === folder.id && (
                    <Feather name="check-circle" size={20} color="#1d4ed8" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.formModalFooter}>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => setShowMoveModal(false)}
              >
                <Text style={styles.secondaryButtonText}>{t('myVideos.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={handleMoveOrDuplicate}
              >
                <Feather name={moveAction === 'move' ? 'folder' : 'copy'} size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {moveAction === 'move' ? t('myVideos.moveHere') : t('myVideos.duplicateHere')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Link to Exercise/Strategy Modal */}
      <LinkSelectorModal
        type={linkType}
        visible={showLinkModal}
        onClose={() => { setShowLinkModal(false); setMenuVideo(null); }}
        onSelect={(id) => handleLinkVideo(id)}
      />

      {/* Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.previewBackdrop}>
          {/* Notification dentro del Preview Modal */}
          {notification.visible && (
            <View style={styles.previewNotificationContainer}>
              <View style={[
                styles.notification, 
                notification.type === 'success' ? styles.notificationSuccess : styles.notificationError
              ]}>
                <Feather 
                  name={notification.type === 'success' ? 'check-circle' : 'alert-circle'} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.notificationText}>{notification.message}</Text>
              </View>
            </View>
          )}
          
          <View style={styles.previewModal}>
            <View style={styles.previewHeader}>
              <Text style={styles.videoModalTitle} numberOfLines={1}>
                {selectedVideo ? getLocalizedVideoName(selectedVideo) : t('myVideos.video')}
              </Text>
              <TouchableOpacity
                style={styles.previewCloseButton}
                onPress={() => {
                  setShowPreviewModal(false);
                  setVideoUrl(null);
                }}
              >
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.videoContainer}>
              <VideoView
                style={styles.videoPlayer}
                player={player}
                fullscreenOptions={{}}
                allowsPictureInPicture
                nativeControls
              />
            </View>
            
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewAction}
                onPress={() => {
                  if (selectedVideo) downloadVideo(selectedVideo);
                }}
              >
                <Feather name="download" size={20} color="#fff" />
                <Text style={styles.previewActionText}>{t('myVideos.download')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      <Modal visible={isGenerating} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#1d4ed8" />
            <Text style={styles.loadingTitle}>
              {loadingAction === 'download'
                ? t('myVideos.downloading')
                : t('myVideos.loadingVideo')}
            </Text>
            <Text style={styles.loadingSubtitle}>
              {loadingAction === 'download'
                ? t('myVideos.downloadingSubtitle')
                : t('myVideos.loadingVideoSubtitle')}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Notification Toast - Posicionado de forma absoluta sin bloquear la pantalla */}
      {notification.visible && (
        <View style={styles.notificationFloatingContainer} pointerEvents="none">
          <View style={[
            styles.notification, 
            notification.type === 'success' ? styles.notificationSuccess : styles.notificationError
          ]}>
            <Feather 
              name={notification.type === 'success' ? 'check-circle' : 'alert-circle'} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.notificationText}>{notification.message}</Text>
          </View>
        </View>
      )}

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
                {t('myVideos.deleteFolderConfirm')}
              </Text>
              <Text style={styles.deleteModalSubtitle}>
                {t('myVideos.deleteFolderMessage', { name: folderToDelete?.nombre })}
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
                    {t('myVideos.deleteFolderMoveToRoot', 'Mover videos a raíz')}
                  </Text>
                  <Text style={styles.deleteOptionSubtitle}>
                    {t('myVideos.deleteFolderMoveToRootDesc', 'La carpeta se eliminará pero los videos se moverán a la raíz')}
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
                    {t('myVideos.deleteFolderAndContents', 'Eliminar todo')}
                  </Text>
                  <Text style={styles.deleteOptionSubtitle}>
                    {t('myVideos.deleteFolderAndContentsDesc', 'Se eliminará la carpeta, subcarpetas y todos los videos permanentemente')}
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
                  {t('myVideos.cancel')}
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
                {t('myVideos.deleteFolderAndContentsConfirm', 'Confirmar eliminación')}
              </Text>
              <Text style={styles.deleteModalSubtitle}>
                {t('myVideos.deleteFolderAndContentsMessage', 'Esta acción no se puede deshacer. Se eliminarán permanentemente la carpeta, subcarpetas y todos los videos.')}
              </Text>
            </View>

            <View style={styles.deleteModalFooter}>
              <TouchableOpacity
                style={styles.deleteSecondaryButton}
                onPress={handleCancelDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteSecondaryButtonText}>
                  {t('myVideos.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteDangerButton}
                onPress={() => performDeleteFolder('delete')}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteDangerButtonText}>
                  {t('myVideos.delete', 'Eliminar')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  // Notification
  notificationFloatingContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  notificationModalContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 50,
    backgroundColor: 'transparent',
  },
  notification: {
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
  notificationSuccess: {
    backgroundColor: '#10B981',
  },
  notificationError: {
    backgroundColor: '#EF4444',
  },
  notificationText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Header
  header: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.mode === 'dark' ? 0.18 : 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  addFolderButton: {
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
  
  // Breadcrumb
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    flexWrap: 'wrap',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  breadcrumbItemActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  breadcrumbText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '500',
    maxWidth: 120,
  },
  breadcrumbTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  breadcrumbSeparator: {
    marginHorizontal: 2,
  },
  
  // Search
  searchContainer: {
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Content List
  contentList: {
    flex: 1,
  },
  contentListInner: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    backgroundColor: theme.colors.backgroundAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  itemsContainer: {
    gap: 10,
  },
  
  // Folder Card
  folderCard: {
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
  folderIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderContent: {
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  folderStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderStatsText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  cardMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Video Card
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    gap: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.mode === 'dark' ? 0.18 : 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  videoThumbnail: {
    width: 80,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbnailGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContent: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  
  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  
  // Action Sheet
  actionSheet: {
    backgroundColor: theme.mode === 'dark' ? theme.colors.surface : '#eaf2ff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionSheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
    maxWidth: '80%',
  },
  actionSheetSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  actionSheetBody: {
    paddingVertical: 8,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  actionDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
    marginHorizontal: 20,
  },
  actionSheetCancel: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.mode === 'dark' ? theme.colors.surfaceAlt : '#F1F5F9',
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  
  // Form Modal
  formModal: {
    backgroundColor: theme.mode === 'dark' ? theme.colors.surface : '#eaf2ff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  formModalHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  formModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  formModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  formModalSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  formModalBody: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: theme.mode === 'dark' ? theme.colors.inputBg : '#eaf2ff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: theme.colors.text,
  },
  formModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Folder Select List
  folderSelectList: {
    maxHeight: 280,
    paddingHorizontal: 24,
  },
  folderSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    backgroundColor: theme.mode === 'dark' ? theme.colors.backgroundAlt : '#eaf2ff',
  },
  folderSelectItemActive: {
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  folderSelectIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderSelectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  
  // Preview Modal
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewNotificationContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  previewModal: {
    width: '95%',
    maxWidth: 600,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  previewTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 16,
  },
  previewCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 16,
  },
  previewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  previewActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Loading Overlay
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: theme.mode === 'dark' ? theme.colors.surface : '#eaf2ff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  loadingTitle: {
    marginTop: 20,
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  
  // Create Folder Modal - Estilo similar a crear ficha de partido
  createModalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModalContainer: {
    backgroundColor: theme.mode === 'dark' ? theme.colors.surface : '#eaf2ff',
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
  createModalContainerMobile: {
    backgroundColor: theme.mode === 'dark' ? theme.colors.surface : '#eaf2ff',
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
  createModalContainerTablet: {
    backgroundColor: theme.mode === 'dark' ? theme.colors.surface : '#eaf2ff',
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
  createModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  createModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  createModalHeaderLeftMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createModalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  createModalTitleMobile: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  createModalSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  createModalSubtitleMobile: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  createModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.mode === 'dark' ? theme.colors.surfaceAlt : '#eaf2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createModalBody: {
    flex: 1,
    minHeight: 200,
  },
  createModalContent: {
    padding: 24,
    paddingBottom: 10,
  },
  createModalContentMobile: {
    padding: 20,
    paddingBottom: 10,
  },
  createCard: {
    backgroundColor: theme.mode === 'dark' ? theme.colors.backgroundAlt : '#eaf2ff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createCardMobile: {
    backgroundColor: theme.mode === 'dark' ? theme.colors.backgroundAlt : '#eaf2ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.text,
    flex: 1,
  },
  createCardContent: {
    gap: 8,
  },
  createInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  createInput: {
    backgroundColor: theme.mode === 'dark' ? theme.colors.inputBg : '#eaf2ff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  colorGridNew: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorCircleNew: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelectedNew: {
    borderWidth: 3,
    borderColor: theme.colors.text,
  },
  createModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  createCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.mode === 'dark' ? theme.colors.backgroundAlt : '#eaf2ff',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  createSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createSaveButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  createSaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // --- Estilos para Link Modal ---
  linkSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eaf2ff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  linkSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    marginLeft: 10,
    paddingVertical: 4,
  },
  linkLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  linkLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  linkEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  linkEmptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  linkItemDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  primaryButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },

  // Source filter tabs
  sourceFilterScroll: {
    flexGrow: 0,
    backgroundColor: theme.colors.surface,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sourceFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  sourceTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundAlt,
    flexShrink: 0,
  },
  sourceTabActive: {
    backgroundColor: theme.colors.primary,
  },
  sourceTabTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  sourceTabTxtActive: {
    color: theme.colors.onPrimary,
  },

  // Delete Modal Styles
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
  deleteOptionHover: {
    // Web hover will be handled via CSS, but React Native uses activeOpacity
  },
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

