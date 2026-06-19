// LinkSelectorModal.js
// Selector de ejercicios/estrategias con navegación por carpetas para vincular videos
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Ionicons, Feather } from '@expo/vector-icons';
import i18n from '@/i18n';
import { getAllExercises, getAllStrategies } from '@/utils/api';
import {
  fetchExerciseFolders,
  fetchExerciseFoldersFlat,
  fetchGlobalFolders as fetchExerciseGlobalFolders,
} from '@/store/slices/exercise/exerciseThunks';
import {
  fetchStrategyFolders,
  fetchStrategyFoldersFlat,
  fetchGlobalFolders as fetchStrategyGlobalFolders,
} from '@/store/slices/strategy/strategyThunks';

/* ─────────────── Theme ─────────────── */
const THEME_DEFAULT = {
  primary: '#2474E5',
  bg: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textSec: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  surfaceAlt: '#f1f5f9',
  primarySoft: '#eff6ff',
  primarySoftBorder: '#bfdbfe',
};
const buildTheme = (sc) => {
  const c = sc?.colors || {};
  return {
    primary: c.primary || THEME_DEFAULT.primary,
    bg: c.background || THEME_DEFAULT.bg,
    surface: c.surface || THEME_DEFAULT.surface,
    surfaceAlt: c.surfaceAlt || c.backgroundAlt || THEME_DEFAULT.surfaceAlt,
    text: c.text || THEME_DEFAULT.text,
    textSec: c.textSecondary || THEME_DEFAULT.textSec,
    textMuted: c.textMuted || THEME_DEFAULT.textMuted,
    border: c.border || THEME_DEFAULT.border,
    primarySoft: c.primarySoft || THEME_DEFAULT.primarySoft,
    primarySoftBorder: c.primarySoft || THEME_DEFAULT.primarySoftBorder,
  };
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   Props:
     type       - 'exercise' | 'strategy'
     visible    - bool
     onClose    - () => void
     onSelect   - (id: string, item: object) => void
   ═══════════════════════════════════════════════════════════ */
export default function LinkSelectorModal({ type, visible, onClose, onSelect }) {
  const { t } = useTranslation();
  const themeSC = useTheme();
  const THEME = useMemo(() => buildTheme(themeSC), [themeSC]);
  const s = useMemo(() => makeStyles(THEME), [THEME]);
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const isWide = width > 700;

  const isExercise = type === 'exercise';

  /* ── Redux folder data ── */
  const exFolders = useSelector((st) => st.ejercicio?.folders) || [];
  const exFoldersFlat = useSelector((st) => st.ejercicio?.foldersFlat) || [];
  const exGlobalFolders = useSelector((st) => st.ejercicio?.globalFolders) || [];
  const stFolders = useSelector((st) => st.estrategia?.folders) || [];
  const stFoldersFlat = useSelector((st) => st.estrategia?.foldersFlat) || [];
  const stGlobalFolders = useSelector((st) => st.estrategia?.globalFolders) || [];

  const reduxFolders = isExercise ? exFolders : stFolders;
  const reduxFoldersFlat = isExercise ? exFoldersFlat : stFoldersFlat;
  const reduxGlobalFolders = isExercise ? exGlobalFolders : stGlobalFolders;

  /* ── Local state ── */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);

  /* ── Load data when opening ── */
  useEffect(() => {
    if (!visible) return;
    const lang = i18n.language;

    // Load folders from Redux
    if (isExercise) {
      dispatch(fetchExerciseFolders({ lang }));
      dispatch(fetchExerciseFoldersFlat({ lang }));
      dispatch(fetchExerciseGlobalFolders({ lang }));
    } else {
      dispatch(fetchStrategyFolders({}));
      dispatch(fetchStrategyFoldersFlat());
      dispatch(fetchStrategyGlobalFolders({}));
    }

    // Load items via API
    const loadItems = async () => {
      setLoading(true);
      try {
        const result = isExercise ? await getAllExercises() : await getAllStrategies();
        if (Array.isArray(result)) {
          setItems(result);
        } else {
          const user = isExercise
            ? result?.userExercises || result?.exercises || []
            : result?.userStrategies || result?.strategies || [];
          const global = isExercise
            ? result?.globalExercises || []
            : result?.globalStrategies || [];
          // Merge, deduplicate
          const userIds = new Set(user.map((x) => x._id));
          setItems([...user, ...global.filter((g) => !userIds.has(g._id))]);
        }
      } catch (err) {
        console.warn('[LinkSelectorModal] Error loading items:', err);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, [visible, isExercise]);

  /* ── Reset on close ── */
  useEffect(() => {
    if (!visible) {
      setSearch('');
      setCurrentFolderId(null);
      setFolderPath([]);
    }
  }, [visible]);

  /* ── Folder helper ── */
  const getFolderName = useCallback(
    (folder) => folder.displayName || (folder.nombre || '').replace(/^\s*└─\s*/, ''),
    [],
  );

  /* ── Current level folders (user + global) ── */
  const currentLevelFolders = useMemo(() => {
    const base = reduxFoldersFlat.length > 0 ? reduxFoldersFlat : reduxFolders;
    const merged = new Map();
    base.forEach((f) => merged.set(f._id, f));
    reduxGlobalFolders.forEach((f) => {
      if (!merged.has(f._id)) merged.set(f._id, f);
    });
    const all = Array.from(merged.values());

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
    return candidates.sort((a, b) => getFolderName(a).localeCompare(getFolderName(b)));
  }, [reduxFolders, reduxFoldersFlat, reduxGlobalFolders, currentFolderId, getFolderName]);

  /* ── Items in current folder ── */
  const currentLevelItems = useMemo(() => {
    if (!currentFolderId) {
      return items;
    }
    return items.filter((e) => {
      if (!e.folder) return false;
      const fId = typeof e.folder === 'object' ? e.folder._id : e.folder;
      return fId === currentFolderId;
    });
  }, [items, currentFolderId]);

  /* ── Search / filtered list ── */
  const lower = search.trim().toLowerCase();
  const isSearching = !!lower;
  const displayItems = useMemo(() => {
    const source = isSearching ? items : currentLevelItems;
    if (!lower)
      return source.slice().sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    return source
      .filter((e) => (e.nombre || '').toLowerCase().includes(lower))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [items, currentLevelItems, lower, isSearching]);

  /* ── Navigation ── */
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
    setFolderPath((prev) => {
      const np = prev.slice(0, -1);
      setCurrentFolderId(np.length > 0 ? np[np.length - 1]._id : null);
      return np;
    });
    setSearch('');
  }, []);

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

  /* ── Item selection ── */
  const handleSelectItem = useCallback(
    (item) => {
      onSelect(item._id, item);
      onClose();
    },
    [onSelect, onClose],
  );

  const showFolders = !isSearching && currentLevelFolders.length > 0;
  const accentColor = isExercise ? '#0284C7' : '#A855F7';
  const iconName = isExercise ? 'fitness-outline' : 'football-outline';

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={currentFolderId ? navigateBack : onClose}
    >
      <View style={s.backdrop}>
        <View style={[s.container, isWide && { alignSelf: 'center', maxWidth: 700 }]}>
          {/* ─── HEADER ─── */}
          <View style={s.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {currentFolderId ? (
                <TouchableOpacity onPress={navigateBack} style={s.backBtn}>
                  <Ionicons name="arrow-back" size={20} color={THEME.primary} />
                </TouchableOpacity>
              ) : null}
              <View style={[s.headerIcon, { backgroundColor: isExercise ? '#E0F2FE' : '#FDF4FF' }]}>
                <Ionicons name={iconName} size={20} color={accentColor} />
              </View>
              <View>
                <Text style={s.title}>
                  {isExercise
                    ? t('myVideos.linkToExerciseTitle')
                    : t('myVideos.linkToStrategyTitle')}
                </Text>
                {currentFolderId && folderPath.length > 0 && (
                  <Text style={s.subtitle} numberOfLines={1}>
                    {folderPath[folderPath.length - 1].nombre}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={THEME.textMuted} />
            </TouchableOpacity>
          </View>

          {/* ─── BREADCRUMBS ─── */}
          {folderPath.length > 0 && (
            <View style={s.breadcrumbs}>
              <TouchableOpacity onPress={navigateToRoot} style={s.crumbItem}>
                <Ionicons name="home" size={13} color={THEME.primary} />
                <Text style={s.crumbText}>{t('folders.root', 'Inicio')}</Text>
              </TouchableOpacity>
              {folderPath.map((c, i) => (
                <View key={c._id} style={s.crumbItem}>
                  <Ionicons name="chevron-forward" size={11} color="#94a3b8" />
                  <TouchableOpacity
                    onPress={() => (i < folderPath.length - 1 ? navigateToBreadcrumb(i) : null)}
                    disabled={i === folderPath.length - 1}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
                  >
                    <Ionicons name="folder" size={11} color={c.color || THEME.primary} />
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

          {/* ─── SEARCH ─── */}
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
            <TextInput
              style={s.searchInput}
              placeholder={`${t('common.search', 'Buscar')}...`}
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              enterKeyHint="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={17} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* ─── INFO BAR ─── */}
          <Text style={s.infoText}>
            {isSearching
              ? `${displayItems.length} ${t('session.results', 'resultados').toLowerCase()}`
              : `${displayItems.length} ${t('folders.items', 'elementos')}${showFolders ? ` · ${currentLevelFolders.length} ${t('folders.subfolders', 'carpetas')}` : ''}`}
          </Text>

          {/* ─── CONTENT ─── */}
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={THEME.primary} />
              <Text style={s.loadingTxt}>{t('myVideos.loading', 'Cargando...')}</Text>
            </View>
          ) : (
            <ScrollView
              style={s.list}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator
            >
              {/* Folders */}
              {showFolders && (
                <View style={{ marginBottom: 8 }}>
                  {isWide ? (
                    // Desktop: grid
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
                              { backgroundColor: (folder.color || THEME.primary) + '1A' },
                            ]}
                          >
                            <Ionicons
                              name="folder"
                              size={22}
                              color={folder.color || THEME.primary}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.folderCardName} numberOfLines={1}>
                              {getFolderName(folder)}
                            </Text>
                            {folder.isGlobal && (
                              <Text style={[s.folderCardMeta, { color: THEME.primary }]}>
                                {t('exercise.appExercises', 'Global')}
                              </Text>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={15} color="#ccc" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    // Mobile: list rows
                    currentLevelFolders.map((folder) => (
                      <TouchableOpacity
                        key={folder._id}
                        style={s.folderRow}
                        onPress={() => navigateToFolder(folder)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            s.folderRowIcon,
                            { backgroundColor: (folder.color || THEME.primary) + '1A' },
                          ]}
                        >
                          <Ionicons name="folder" size={20} color={folder.color || THEME.primary} />
                        </View>
                        <Text style={s.folderRowName} numberOfLines={1}>
                          {getFolderName(folder)}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                      </TouchableOpacity>
                    ))
                  )}
                  {displayItems.length > 0 && <View style={s.divider} />}
                </View>
              )}

              {/* Items */}
              {displayItems.length === 0 && !showFolders ? (
                <View style={s.emptyState}>
                  <Ionicons
                    name={isSearching ? 'search' : 'folder-open-outline'}
                    size={44}
                    color="#cbd5e1"
                  />
                  <Text style={s.emptyTxt}>
                    {isSearching
                      ? t('common.noResults', 'Sin resultados')
                      : currentFolderId
                        ? t('folders.emptyFolder', 'Carpeta vacía')
                        : isExercise
                          ? t('myVideos.noExercises', 'Sin ejercicios')
                          : t('myVideos.noStrategies', 'Sin estrategias')}
                  </Text>
                </View>
              ) : (
                displayItems.map((item) => {
                  const folderName =
                    !currentFolderId && item.folder && typeof item.folder === 'object'
                      ? item.folder.nombre
                      : isSearching && item.folder && typeof item.folder === 'object'
                        ? item.folder.nombre
                        : null;
                  return (
                    <TouchableOpacity
                      key={item._id}
                      style={s.itemRow}
                      onPress={() => handleSelectItem(item)}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          s.itemIcon,
                          { backgroundColor: isExercise ? '#E0F2FE' : '#FDF4FF' },
                        ]}
                      >
                        <Ionicons name={iconName} size={18} color={accentColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={s.itemName} numberOfLines={2}>
                            {item.nombre}
                          </Text>
                          {item.isGlobal && (
                            <Ionicons name="globe-outline" size={12} color={THEME.primary} />
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
                              color={item.folder?.color || THEME.textSec}
                            />
                            <Text style={s.itemFolderTag}>{folderName}</Text>
                          </View>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* ─── FOOTER ─── */}
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelTxt}>{t('myVideos.cancel', 'Cancelar')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const makeStyles = (THEME) =>
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
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: THEME.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: THEME.primarySoftBorder,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: THEME.text,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 11,
      color: THEME.primary,
      fontWeight: '600',
      marginTop: 1,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: THEME.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    breadcrumbs: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      paddingVertical: 6,
      paddingHorizontal: 8,
      backgroundColor: THEME.bg,
      borderRadius: 10,
      marginBottom: 8,
      gap: 2,
    },
    crumbItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingVertical: 2,
      paddingHorizontal: 2,
    },
    crumbText: {
      fontSize: 11,
      color: THEME.primary,
      fontWeight: '600',
    },
    crumbActive: {
      color: THEME.text,
      fontWeight: '700',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.bg,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: THEME.border,
      paddingHorizontal: 12,
      height: 42,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: THEME.text,
      paddingVertical: 0,
    },
    infoText: {
      fontSize: 11,
      color: THEME.textSec,
      fontWeight: '600',
      marginBottom: 8,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 40,
    },
    loadingTxt: {
      fontSize: 13,
      color: THEME.textSec,
      fontWeight: '600',
    },
    list: {
      flex: 1,
    },
    // Folders (desktop)
    foldersGrid: {
      gap: 6,
    },
    folderCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 6,
      borderWidth: 1.5,
      borderColor: THEME.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
      gap: 10,
    },
    folderCardIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    folderCardName: {
      fontSize: 13,
      fontWeight: '700',
      color: THEME.text,
    },
    folderCardMeta: {
      fontSize: 10,
      color: THEME.textMuted,
      marginTop: 1,
    },
    // Folders (mobile)
    folderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.surface,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 13,
      marginBottom: 6,
      borderWidth: 1.5,
      borderColor: THEME.border,
      gap: 10,
    },
    folderRowIcon: {
      width: 36,
      height: 36,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    folderRowName: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: THEME.text,
    },
    divider: {
      height: 1,
      backgroundColor: THEME.border,
      marginVertical: 8,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyTxt: {
      fontSize: 13,
      color: THEME.textMuted,
      fontWeight: '600',
      marginTop: 10,
      textAlign: 'center',
    },
    // Items
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: THEME.surface,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 13,
      marginBottom: 6,
      borderWidth: 1.5,
      borderColor: THEME.border,
      gap: 10,
    },
    itemIcon: {
      width: 36,
      height: 36,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemName: {
      fontSize: 13,
      fontWeight: '600',
      color: THEME.text,
    },
    itemFolderTag: {
      fontSize: 10,
      color: THEME.textSec,
    },
    cancelBtn: {
      marginTop: 8,
      alignSelf: 'center',
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 12,
      backgroundColor: THEME.surfaceAlt,
      borderWidth: 1.5,
      borderColor: THEME.border,
    },
    cancelTxt: {
      fontSize: 13,
      fontWeight: '700',
      color: THEME.textSec,
    },
  });
