import React, { useState, useEffect, useCallback } from 'react';
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
} from '@/utils/api';
import { downloadResolvedVideo, resolvePlayableVideoUrl } from '@/utils/videoPlayback';
import VideoPoster from '@/components/shared/VideoPoster';
import { getFieldById } from '@/utils/fieldTypes';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import LinkSelectorModal from '@/vendor/shared/LinkSelectorModal';

export default function MyVideos() {
  const navigation = useNavigation();
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
  
  // Source filter: 'all' | 'mine' | 'global'
  const [sourceFilter, setSourceFilter] = useState('all');

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
  const [newFolderColor, setNewFolderColor] = useState('#6366F1');
  
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
  const [editFolderColor, setEditFolderColor] = useState('#6366F1');

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

  const folderColors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', 
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
        setNewFolderColor('#6366F1');
        loadContent();
      }
    } catch (error) {
      console.error('Error creando carpeta:', error);
      const errorMsg = error.response?.data?.message || t('myVideos.couldNotCreateFolder');
      showNotification(errorMsg, 'error');
    }
  };

  const handleDeleteFolder = async (folder) => {
    Alert.alert(
      t('myVideos.deleteFolderConfirm'),
      t('myVideos.deleteFolderMessage', { name: folder.nombre }),
      [
        { text: t('myVideos.cancel'), style: 'cancel' },
        {
          text: t('myVideos.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVideoFolder(folder.id);
              showNotification(t('myVideos.folderDeleted'), 'success');
              loadContent();
            } catch (error) {
              console.error('Error eliminando carpeta:', error);
              showNotification(t('myVideos.couldNotDeleteFolder'), 'error');
            }
          }
        }
      ]
    );
  };

  const handleEditFolder = (folder) => {
    setMenuFolder(folder);
    setEditFolderName(folder.nombreEs || folder.nombre);
    setEditFolderNameEn(folder.translations?.en?.nombre || '');
    setEditFolderColor(folder.color || '#6366F1');
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
        setAllFolders(result.folders || []);
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
      showNotification(`No se pudo ${moveAction === 'move' ? 'mover' : 'duplicar'} el video`, 'error');
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
        const duplicateName = `${(video.nombre || 'video').trim()}_${duplicateSuffix}`;
        const duplicated = await duplicateVideoForEdit(videoId, {
          lang,
          nombre: duplicateName,
        });
        editableVideoId = duplicated?.video?.id;

        if (!editableVideoId) {
          throw new Error('No se pudo crear el duplicado para edición');
        }
        result = await getVideoForEdit(editableVideoId);
        showNotification(t('myVideos.cloneToEdit') || t('exercise.cloneToEdit'), 'success');
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
        
        // Navegar al editor de video
        navigation.navigate('VideoEditorDrawer');
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
      showNotification('No se pudo cargar el video', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadVideo = async (videoOrId, videoUrl = null) => {
    try {
      setLoadingAction('download');
      setIsGenerating(true);
      showNotification('Descargando video...', 'success');
      const video = typeof videoOrId === 'object' && videoOrId
        ? videoOrId
        : { id: videoOrId, videoUrl };
      await downloadResolvedVideo(video, video.nombre || 'video');
      showNotification(t('myVideos.downloadStarted') || 'Descarga iniciada', 'success');
    } catch (error) {
      console.error('Error descargando video:', error);
      showNotification(t('myVideos.downloadError') || 'No se pudo descargar el vídeo', 'error');
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
      <View style={[styles.folderIconContainer, { backgroundColor: folder.color || '#6366F1' }]}>
        <Feather name="folder" size={28} color="#fff" />
      </View>
      <View style={styles.folderContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.folderName} numberOfLines={1}>{folder.nombre}</Text>
          {folder.isGlobal && <Ionicons name="globe-outline" size={13} color="#6366F1" />}
        </View>
        <View style={styles.folderStats}>
          <Feather name="film" size={12} color="#94A3B8" />
          <Text style={styles.folderStatsText}> {folder.videoCount || 0}</Text>
          {folder.subfolderCount > 0 && (
            <>
              <Text style={styles.folderStatsText}>  •  </Text>
              <Feather name="folder" size={12} color="#94A3B8" />
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
        <Feather name="more-vertical" size={18} color="#94A3B8" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderVideoItem = (video) => (
    <TouchableOpacity 
      key={video._id || video.id} 
      style={styles.videoCard}
      onPress={() => viewVideo(video)}
      activeOpacity={0.7}
    >
      <View style={styles.videoThumbnail}>
        <VideoPoster
          video={video}
          poster={video.thumbnailUrl || video.thumbnail}
          fallback={<Feather name="play-circle" size={32} color="#fff" />}
          playSize={34}
          alt={video.nombre || 'Video'}
        />
      </View>
      <View style={styles.videoContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.videoTitle} numberOfLines={1}>{video.nombre}</Text>
          {video.isGlobal && <Ionicons name="globe-outline" size={13} color="#6366F1" />}
        </View>
        {video.descripcion && (
          <Text style={styles.videoDescription} numberOfLines={2}>
            {video.descripcion}
          </Text>
        )}
        <View style={styles.videoMeta}>
          <Feather name="calendar" size={12} color="#94A3B8" />
          <Text style={styles.videoDate}>{formatDate(video.createdAt)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.cardMenuButton}
        onPress={() => { setMenuVideo(video); setMenuVisible(true); }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="more-vertical" size={18} color="#94A3B8" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
              <Feather name="folder-plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
          <TouchableOpacity 
            onPress={goToRoot} 
            style={[styles.breadcrumbItem, folderPath.length === 0 && styles.breadcrumbItemActive]}
          >
            <Feather name="home" size={16} color={folderPath.length === 0 ? "#6366F1" : "#64748B"} />
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
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('myVideos.searchPlaceholder')}
            placeholderTextColor="#94A3B8"
            value={filter}
            onChangeText={setFilter}
          />
          {filter.length > 0 && (
            <TouchableOpacity onPress={() => setFilter('')}>
              <Feather name="x" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Source Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sourceFilterBar}
        style={styles.sourceFilterScroll}
      >
        {[
          { key: 'all', label: t('myVideos.allVideos') },
          { key: 'mine', label: t('myVideos.myVideosOnly') },
          { key: 'global', label: t('myVideos.appVideos') },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.sourceTab, sourceFilter === tab.key && styles.sourceTabActive]}
            onPress={() => { setSourceFilter(tab.key); setCurrentFolder(null); setFolderPath([]); }}
            activeOpacity={0.8}
          >
            <Text
              numberOfLines={1}
              style={[styles.sourceTabTxt, sourceFilter === tab.key && styles.sourceTabTxtActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
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
                <Feather name="folder" size={16} color="#64748B" />
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
                <Feather name="film" size={16} color="#64748B" />
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
              <Text style={styles.actionSheetTitle} numberOfLines={1}>{menuVideo?.nombre}</Text>
              <Text style={styles.actionSheetSubtitle}>{t('myVideos.videoOptions')}</Text>
            </View>
            
            <View style={styles.actionSheetBody}>
              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => {
                  setMenuVisible(false);
                  if (menuVideo) viewVideo(menuVideo);
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Feather name="play" size={20} color="#6366F1" />
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
                      ? t('myVideos.editCopySubtitle') || t('myVideos.editSubtitle')
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
                <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Feather name="folder" size={20} color="#6366F1" />
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
                  <Feather name="folder-plus" size={28} color="#6366F1" />
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
                  <Feather name="folder" size={24} color="#6366F1" />
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
                  <Feather name="check-circle" size={20} color="#6366F1" />
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
                  <View style={[styles.folderSelectIcon, { backgroundColor: folder.color || '#6366F1' }]}>
                    <Feather name="folder" size={16} color="#fff" />
                  </View>
                  <Text style={styles.folderSelectText}>{folder.nombre}</Text>
                  {selectedDestFolder === folder.id && (
                    <Feather name="check-circle" size={20} color="#6366F1" />
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
              <Text style={styles.previewTitle} numberOfLines={1}>{selectedVideo?.nombre}</Text>
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
                <Text style={styles.previewActionText}>{t('myVideos.download', 'Descargar')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      <Modal visible={isGenerating} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingTitle}>
              {loadingAction === 'download'
                ? t('myVideos.downloading')
                : t('myVideos.loadingVideo', 'Cargando vídeo...')}
            </Text>
            <Text style={styles.loadingSubtitle}>
              {loadingAction === 'download'
                ? t('myVideos.downloadingSubtitle')
                : t('myVideos.loadingVideoSubtitle', 'Preparando reproducción...')}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
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
    backgroundColor: '#6366F1',
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Breadcrumb
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    backgroundColor: '#EEF2FF',
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    maxWidth: 120,
  },
  breadcrumbTextActive: {
    color: '#6366F1',
    fontWeight: '600',
  },
  breadcrumbSeparator: {
    marginHorizontal: 2,
  },
  
  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBar: {
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
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
    color: '#64748B',
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
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Content List
  contentList: {
    flex: 1,
  },
  contentListInner: {
    padding: 20,
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
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  itemsContainer: {
    gap: 10,
  },
  
  // Folder Card
  folderCard: {
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
    color: '#1E293B',
    marginBottom: 4,
  },
  folderStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderStatsText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  cardMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Video Card
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    gap: 14,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
    color: '#1E293B',
    marginBottom: 4,
  },
  videoDescription: {
    fontSize: 13,
    color: '#64748B',
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
    color: '#94A3B8',
  },
  
  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  
  // Action Sheet
  actionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionSheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    maxWidth: '80%',
  },
  actionSheetSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
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
    color: '#1E293B',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  actionSheetCancel: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  
  // Form Modal
  formModal: {
    backgroundColor: '#fff',
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
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  formModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  formModalSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  formModalBody: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    borderColor: '#1E293B',
  },
  formModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#6366F1',
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
    backgroundColor: '#F8FAFC',
  },
  folderSelectItemActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
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
    color: '#1E293B',
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
    backgroundColor: '#fff',
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
    color: '#1E293B',
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  
  // Create Folder Modal - Estilo similar a crear ficha de partido
  createModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModalContainer: {
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
  createModalContainerMobile: {
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
  createModalContainerTablet: {
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
  createModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  createModalTitleMobile: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  createModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  createModalSubtitleMobile: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  createModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  createCardMobile: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
    gap: 8,
  },
  createInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  createInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    borderColor: '#1E293B',
  },
  createModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  createCancelButton: {
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
  createCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  createSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#6366F1',
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
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#fff',
  },
  sourceFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  sourceTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    flexShrink: 0,
  },
  sourceTabActive: {
    backgroundColor: '#6366F1',
  },
  sourceTabTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  sourceTabTxtActive: {
    color: '#fff',
  },
});

