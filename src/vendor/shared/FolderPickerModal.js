/**
 * FolderPickerModal - Selector de carpetas profesional estilo explorador de archivos.
 * Reutilizable para ejercicios, estrategias, etc.
 * 
 * Props:
 * - visible: boolean
 * - onClose: () => void
 * - onSelect: (folderId, folderName) => void
 * - folders: array (flat list con parentFolder)
 * - selectedFolderId: string | null
 * - title: string
 * - accentColor: string (default '#6366F1')
 * - onCreateFolder: ({ nombre, parentFolder, color }) => Promise
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import KeyboardAwareScrollView from './KeyboardAwareScrollView';

const FOLDER_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#06B6D4', '#3B82F6', '#64748B', '#78716C'
];

export default function FolderPickerModal({
  visible,
  onClose,
  onSelect,
  folders = [],
  selectedFolderId,
  title,
  accentColor = '#6366F1',
  onCreateFolder,
  isAdmin = false,
  defaultIsGlobal = false,
}) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;

  // Estado de navegación dentro del picker
  const [currentParentId, setCurrentParentId] = useState(null);
  const [navPath, setNavPath] = useState([]); // [{_id, nombre}]
  const [searchFilter, setSearchFilter] = useState('');
  
  // Estado para crear carpeta inline
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderNameEn, setNewFolderNameEn] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(accentColor);
  const [newFolderIsGlobal, setNewFolderIsGlobal] = useState(defaultIsGlobal);
  const [creating, setCreating] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentParentId(null);
      setNavPath([]);
      setSearchFilter('');
      setShowCreateForm(false);
      setNewFolderName('');
      setNewFolderNameEn('');
      setNewFolderColor(accentColor);
      setNewFolderIsGlobal(defaultIsGlobal);
    }
  }, [visible]);

  // Build tree structure from flat list
  const folderTree = useMemo(() => {
    const getChildren = (parentId) => {
      return folders.filter(f => {
        const pid = typeof f.parentFolder === 'object'
          ? (f.parentFolder?._id || f.parentFolder)
          : f.parentFolder;
        if (parentId === null) return !pid;
        return pid === parentId;
      });
    };
    return { getChildren };
  }, [folders]);

  // Current level folders
  const currentFolders = useMemo(() => {
    let items = folderTree.getChildren(currentParentId);
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      // When searching, search ALL folders
      items = folders.filter(f => f.nombre?.toLowerCase().includes(q));
    }
    return items;
  }, [folderTree, currentParentId, searchFilter, folders]);

  // Check if a folder has children
  const hasChildren = useCallback((folderId) => {
    return folders.some(f => {
      const pid = typeof f.parentFolder === 'object'
        ? (f.parentFolder?._id || f.parentFolder)
        : f.parentFolder;
      return pid === folderId;
    });
  }, [folders]);

  // Navigate into a folder
  const navigateToFolder = (folder) => {
    setNavPath(prev => [...prev, { _id: folder._id, nombre: folder.nombre, color: folder.color }]);
    setCurrentParentId(folder._id);
    setSearchFilter('');
  };

  // Navigate back
  const navigateBack = () => {
    const newPath = navPath.slice(0, -1);
    setNavPath(newPath);
    setCurrentParentId(newPath.length > 0 ? newPath[newPath.length - 1]._id : null);
  };

  // Navigate to breadcrumb
  const navigateToBreadcrumb = (index) => {
    if (index < 0) {
      setNavPath([]);
      setCurrentParentId(null);
    } else {
      const newPath = navPath.slice(0, index + 1);
      setNavPath(newPath);
      setCurrentParentId(newPath[newPath.length - 1]._id);
    }
  };

  // Handle folder creation
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    if (!onCreateFolder) return;

    setCreating(true);
    try {
      const folderData = {
        nombre: newFolderName.trim(),
        parentFolder: currentParentId,
        color: newFolderColor,
      };
      if (isAdmin && newFolderIsGlobal) {
        folderData.isGlobal = true;
        if (newFolderNameEn.trim()) {
          folderData.translations = { en: { nombre: newFolderNameEn.trim() } };
        }
      }
      await onCreateFolder(folderData);
      setShowCreateForm(false);
      setNewFolderName('');
      setNewFolderNameEn('');
      setNewFolderColor(accentColor);
      setNewFolderIsGlobal(defaultIsGlobal);
    } catch (e) {
      Alert.alert(t('message.error'), e.message || t('folders.createError'));
    } finally {
      setCreating(false);
    }
  };

  // Get folder path string for display
  const getSelectedFolderPath = () => {
    if (!selectedFolderId) return t('folders.noFolder');
    const folder = folders.find(f => f._id === selectedFolderId);
    if (!folder) return t('folders.noFolder');
    
    // Build path
    const parts = [];
    let current = folder;
    while (current) {
      parts.unshift(current.nombre);
      if (current.parentFolder) {
        const parentId = typeof current.parentFolder === 'object'
          ? current.parentFolder._id
          : current.parentFolder;
        current = folders.find(f => f._id === parentId);
      } else {
        current = null;
      }
    }
    return parts.join(' / ');
  };

  // Current depth for limiting creation
  const currentDepth = navPath.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.container,
          IS_MOBILE ? styles.containerMobile : styles.containerDesktop
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: accentColor + '20' }]}>
                <Feather name="folder" size={24} color={accentColor} />
              </View>
              <View>
                <Text style={styles.headerTitle}>{title || t('folders.selectFolder')}</Text>
                <Text style={styles.headerSubtitle}>
                  {getSelectedFolderPath()}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Breadcrumb Navigation */}
          <View style={styles.breadcrumbBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbScroll}>
              <TouchableOpacity
                onPress={() => navigateToBreadcrumb(-1)}
                style={[styles.breadcrumbItem, navPath.length === 0 && styles.breadcrumbItemActive]}
              >
                <Feather name="home" size={14} color={navPath.length === 0 ? accentColor : '#64748B'} />
                <Text style={[styles.breadcrumbText, navPath.length === 0 && { color: accentColor, fontWeight: '700' }]}>
                  {t('folders.root') || 'Raíz'}
                </Text>
              </TouchableOpacity>
              {navPath.map((crumb, index) => (
                <React.Fragment key={crumb._id}>
                  <Feather name="chevron-right" size={14} color="#CBD5E1" style={{ marginHorizontal: 2 }} />
                  <TouchableOpacity
                    onPress={() => navigateToBreadcrumb(index)}
                    style={[styles.breadcrumbItem, index === navPath.length - 1 && styles.breadcrumbItemActive]}
                  >
                    <Feather name="folder" size={12} color={crumb.color || accentColor} />
                    <Text
                      style={[
                        styles.breadcrumbText,
                        index === navPath.length - 1 && { color: '#1E293B', fontWeight: '700' }
                      ]}
                      numberOfLines={1}
                    >
                      {crumb.nombre}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </ScrollView>
          </View>

          {/* Search */}
          <View style={styles.searchBar}>
            <Feather name="search" size={16} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('myVideos.searchPlaceholder') || 'Buscar...'}
              placeholderTextColor="#94A3B8"
              value={searchFilter}
              onChangeText={setSearchFilter}
            />
            {searchFilter.length > 0 && (
              <TouchableOpacity onPress={() => setSearchFilter('')}>
                <Feather name="x" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          <KeyboardAwareScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Root option (Sin carpeta) */}
            {navPath.length === 0 && !searchFilter && (
              <TouchableOpacity
                style={[
                  styles.folderRow,
                  !selectedFolderId && styles.folderRowSelected,
                ]}
                onPress={() => {
                  onSelect(null, '');
                  onClose();
                }}
              >
                <View style={[styles.folderRowIcon, { backgroundColor: '#F1F5F9' }]}>
                  <Feather name="inbox" size={18} color="#64748B" />
                </View>
                <View style={styles.folderRowContent}>
                  <Text style={styles.folderRowName}>{t('folders.noFolder') || 'Sin carpeta'}</Text>
                  <Text style={styles.folderRowMeta}>{t('folders.rootDescription') || 'Guardar en raíz'}</Text>
                </View>
                {!selectedFolderId && (
                  <Feather name="check-circle" size={20} color={accentColor} />
                )}
              </TouchableOpacity>
            )}

            {/* Create folder inline */}
            {showCreateForm && (
              <View style={styles.createFormCard}>
                <View style={styles.createFormHeader}>
                  <Feather name="folder-plus" size={18} color={accentColor} />
                  <Text style={styles.createFormTitle}>
                    {currentParentId ? t('folders.createSubfolder') || 'Nueva subcarpeta' : t('folders.createFolder') || 'Nueva carpeta'}
                  </Text>
                </View>

                {/* Toggle visibilidad (solo admin) */}
                {isAdmin && (
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 8, backgroundColor: !newFolderIsGlobal ? '#1e40af' : '#f1f5f9', borderWidth: 1.5, borderColor: !newFolderIsGlobal ? '#1e40af' : '#e2e8f0' }}
                      onPress={() => setNewFolderIsGlobal(false)}
                    >
                      <Ionicons name="person-outline" size={14} color={!newFolderIsGlobal ? '#fff' : '#64748b'} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: !newFolderIsGlobal ? '#fff' : '#64748b' }}>{t('exercise.myExercises')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 8, backgroundColor: newFolderIsGlobal ? '#16a34a' : '#f1f5f9', borderWidth: 1.5, borderColor: newFolderIsGlobal ? '#16a34a' : '#e2e8f0' }}
                      onPress={() => setNewFolderIsGlobal(true)}
                    >
                      <Ionicons name="globe-outline" size={14} color={newFolderIsGlobal ? '#fff' : '#64748b'} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: newFolderIsGlobal ? '#fff' : '#64748b' }}>{t('exercise.appExercises')}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TextInput
                  style={styles.createFormInput}
                  placeholder={t('folders.folderNamePlaceholder') || 'Nombre de la carpeta'}
                  placeholderTextColor="#94A3B8"
                  value={newFolderName}
                  onChangeText={setNewFolderName}
                  autoFocus
                />

                {/* Traducción inglés (solo admin + global) */}
                {isAdmin && newFolderIsGlobal && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <Ionicons name="language-outline" size={14} color="#1e40af" />
                    <TextInput
                      style={[styles.createFormInput, { flex: 1, marginTop: 0 }]}
                      placeholder="Name (English)"
                      placeholderTextColor="#94A3B8"
                      value={newFolderNameEn}
                      onChangeText={setNewFolderNameEn}
                    />
                  </View>
                )}

                <View style={styles.colorRow}>
                  {FOLDER_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorDot,
                        { backgroundColor: color },
                        newFolderColor === color && styles.colorDotSelected,
                      ]}
                      onPress={() => setNewFolderColor(color)}
                    >
                      {newFolderColor === color && (
                        <Feather name="check" size={12} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.createFormActions}>
                  <TouchableOpacity
                    style={styles.createFormCancel}
                    onPress={() => { setShowCreateForm(false); setNewFolderName(''); setNewFolderNameEn(''); setNewFolderIsGlobal(defaultIsGlobal); }}
                  >
                    <Text style={styles.createFormCancelText}>{t('common.cancel') || 'Cancelar'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.createFormConfirm, { backgroundColor: accentColor }, !newFolderName.trim() && { opacity: 0.5 }]}
                    onPress={handleCreateFolder}
                    disabled={!newFolderName.trim() || creating}
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="plus" size={16} color="#fff" />
                        <Text style={styles.createFormConfirmText}>{t('common.create') || 'Crear'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Folder list */}
            {currentFolders.map(folder => {
              const isSelected = selectedFolderId === folder._id;
              const hasSub = hasChildren(folder._id);
              return (
                <View key={folder._id} style={[styles.folderRow, isSelected && styles.folderRowSelected]}>
                  <TouchableOpacity
                    style={styles.folderRowMain}
                    onPress={() => {
                      onSelect(folder._id, folder.nombre);
                      onClose();
                    }}
                  >
                    <View style={[styles.folderRowIcon, { backgroundColor: (folder.color || accentColor) + '20' }]}>
                      <Feather name="folder" size={18} color={folder.color || accentColor} />
                    </View>
                    <View style={styles.folderRowContent}>
                      <Text style={styles.folderRowName}>{folder.nombre}</Text>
                      <Text style={styles.folderRowMeta}>
                        {folder.exerciseCount || folder.strategyCount || folder.videoCount || 0} {t('folders.items') || 'elementos'}
                        {folder.subfolderCount > 0 && ` · ${folder.subfolderCount} ${t('folders.subfolders') || 'subcarpetas'}`}
                      </Text>
                    </View>
                    {isSelected && (
                      <Feather name="check-circle" size={20} color={accentColor} />
                    )}
                  </TouchableOpacity>
                  {hasSub && !searchFilter && (
                    <TouchableOpacity
                      style={styles.folderExpandBtn}
                      onPress={() => navigateToFolder(folder)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="chevron-right" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {currentFolders.length === 0 && !showCreateForm && (
              <View style={styles.emptyState}>
                <Feather name="folder" size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>
                  {searchFilter
                    ? t('myVideos.noResults') || 'Sin resultados'
                    : currentParentId
                      ? t('folders.emptyFolder') || 'Carpeta vacía'
                      : t('folders.noFolders') || 'No hay carpetas'}
                </Text>
              </View>
            )}
          </KeyboardAwareScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {onCreateFolder && currentDepth < 2 && !showCreateForm && (
              <TouchableOpacity
                style={[styles.createBtn, { borderColor: accentColor }]}
                onPress={() => setShowCreateForm(true)}
              >
                <Feather name="folder-plus" size={16} color={accentColor} />
                <Text style={[styles.createBtnText, { color: accentColor }]}>
                  {t('folders.createFolder') || 'Nueva carpeta'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel') || 'Cancelar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  containerMobile: {
    width: '92%',
    maxHeight: '85%',
    minHeight: 400,
  },
  containerDesktop: {
    width: '94%',
    maxWidth: 520,
    maxHeight: '80%',
    minHeight: 450,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    maxWidth: 200,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Breadcrumb
  breadcrumbBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFBFC',
  },
  breadcrumbScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  breadcrumbItemActive: {
    backgroundColor: '#EEF2FF',
  },
  breadcrumbText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    maxWidth: 100,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 0,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Folder row
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
    paddingRight: 8,
  },
  folderRowSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  folderRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  folderRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderRowContent: {
    flex: 1,
  },
  folderRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  folderRowMeta: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  folderExpandBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Create form
  createFormCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  createFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  createFormTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  createFormInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  createFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  createFormCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  createFormCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  createFormConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  createFormConfirmText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
    marginRight: 'auto',
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
