// Componente compartido para selección de jugadores
// Usado en: AddEventModal, EditSessionModal, training.js
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getPlayerInjuryStatus } from './helpers';
import { getPlayerFullName } from '@/utils/playerHelpers';
import THEME_DEFAULT from './theme';

/**
 * Modal para seleccionar jugadores con soporte para:
 * - Filtros por estado de lesión (todos/disponibles/lesionados)
 * - Búsqueda por nombre/apellidos/posición
 * - Vista móvil (lista vertical) y tablet/desktop (grid con panel lateral)
 * - Paginación en tablet/desktop
 * - Selección múltiple
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Si el modal está visible
 * @param {Function} props.onClose - Callback al cerrar el modal
 * @param {string} props.title - Título del modal (opcional)
 * @param {Array} props.players - Lista de jugadores disponibles (alias: jugadores)
 * @param {Array} props.selectedIds - IDs de jugadores seleccionados
 * @param {Function} props.onConfirm - Callback con los IDs seleccionados (modo batch)
 * @param {Function} props.setSelectedIds - Callback para actualizar IDs en tiempo real (modo directo)
 * @param {Array} props.injuries - Lista de lesiones (opcional)
 * @param {number} props.maxSelection - Límite máximo de selección (opcional)
 * @param {Array} props.onlyIncludeIds - Si se proporciona, solo mostrar estos jugadores (opcional)
 * 
 * Modos de uso:
 * - Con onConfirm: Los cambios se aplican solo al presionar "Hecho"
 * - Con setSelectedIds: Los cambios se aplican en tiempo real
 */
export default function PlayerSelectionModal({ 
  visible, 
  onClose, 
  title, 
  players,
  jugadores, // Alias para compatibilidad con training.js
  selectedIds = [], 
  excludeIds = [], // IDs de jugadores a excluir de la lista
  onlyIncludeIds = null, // Si se proporciona, solo mostrar estos jugadores
  onConfirm,
  setSelectedIds, // Alternativa para actualización en tiempo real
  injuries = [],
  sanctionedPlayerIds = [], // IDs de jugadores sancionados en torneo actual
  maxSelection = null 
}) {
  const { t } = useTranslation();
  const themeSC = useTheme();
  const THEME = useMemo(() => {
    const c = themeSC?.colors || {};
    return {
      primary: c.primary || THEME_DEFAULT.primary,
      primaryLight: c.primaryHover || c.primary || THEME_DEFAULT.primaryLight,
      primaryDark: c.primaryActive || c.primary || THEME_DEFAULT.primaryDark,
      success: c.success || THEME_DEFAULT.success,
      warning: c.warning || THEME_DEFAULT.warning,
      danger: c.error || THEME_DEFAULT.danger,
      background: c.background || THEME_DEFAULT.background,
      backgroundAlt: c.backgroundAlt || c.background || THEME_DEFAULT.background,
      surface: c.surface || THEME_DEFAULT.surface,
      surfaceAlt: c.surfaceAlt || c.surface || THEME_DEFAULT.surface,
      text: c.text || THEME_DEFAULT.text,
      textSecondary: c.textSecondary || THEME_DEFAULT.textSecondary,
      textMuted: c.textMuted || THEME_DEFAULT.textMuted,
      border: c.border || THEME_DEFAULT.border,
      inputBg: c.inputBg || THEME_DEFAULT.inputBg,
      onPrimary: c.onPrimary || '#ffffff',
      primarySoft: c.primarySoft || (c.primary ? c.primary + '20' : '#eff6ff'),
      errorSoft: c.errorSoft || (c.error ? c.error + '20' : '#fee2e2'),
      errorSoftText: c.errorSoftText || c.error || '#dc2626',
      gradient: THEME_DEFAULT.gradient,
    };
  }, [themeSC]);
  const styles = useMemo(() => makeStyles(THEME), [THEME]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isPortrait = height >= width;
  const isWide = width > 900;
  const isMobile = width < 500;
  
  // Usar players o jugadores (para compatibilidad)
  const playersList = players || jugadores || [];
  
  // Filtrar jugadores: primero por onlyIncludeIds, luego excluir los de excludeIds
  const availablePlayers = useMemo(() => {
    let filtered = playersList;
    
    // Si hay onlyIncludeIds, filtrar solo esos jugadores
    if (onlyIncludeIds && onlyIncludeIds.length > 0) {
      filtered = filtered.filter(p => onlyIncludeIds.includes(p._id));
    }
    
    // Excluir los de excludeIds
    if (excludeIds && excludeIds.length > 0) {
      filtered = filtered.filter(p => !excludeIds.includes(p._id));
    }
    
    return filtered;
  }, [playersList, excludeIds, onlyIncludeIds]);
  
  // Modo de operación: 
  // - 'batch': usa tempSelected interno y aplica con onConfirm
  // - 'direct': actualiza directamente con setSelectedIds
  const isDirectMode = !!setSelectedIds && !onConfirm;
  
  const [tempSelected, setTempSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [injuryFilter, setInjuryFilter] = useState('todos');

  // En modo directo, usamos selectedIds directamente
  // En modo batch, usamos tempSelected interno
  const currentSelected = isDirectMode ? selectedIds : tempSelected;

  useEffect(() => {
    if (visible) {
      if (!isDirectMode) {
        setTempSelected([...selectedIds]);
      }
      setSearch('');
      setInjuryFilter('todos');
    }
  }, [visible, selectedIds, isDirectMode]);

  const lower = search.trim().toLowerCase();

  const baseList = useMemo(() => {
    let filtered = (availablePlayers || []).slice();

    if (lower) {
      filtered = filtered.filter(j =>
        (j.nombre || '').toLowerCase().includes(lower) ||
        (j.apellidos || '').toLowerCase().includes(lower) ||
        (j.posicion || '').toLowerCase().includes(lower)
      );
    }

    if (injuryFilter === 'disponibles') {
      filtered = filtered.filter(j => !getPlayerInjuryStatus(j._id, injuries));
    } else if (injuryFilter === 'lesionados') {
      filtered = filtered.filter(j => getPlayerInjuryStatus(j._id, injuries));
    }

    return filtered.sort((a, b) => {
      if (injuryFilter === 'todos') {
        const injuryA = getPlayerInjuryStatus(a._id, injuries);
        const injuryB = getPlayerInjuryStatus(b._id, injuries);
        if (!injuryA && injuryB) return -1;
        if (injuryA && !injuryB) return 1;
      }
      const nombreA = getPlayerFullName(a);
      const nombreB = getPlayerFullName(b);
      return nombreA.localeCompare(nombreB);
    });
  }, [availablePlayers, lower, injuryFilter, injuries]);

  const healthyPlayers = useMemo(() =>
    baseList.filter(j => !getPlayerInjuryStatus(j._id, injuries)),
    [baseList, injuries]
  );

  const selectedObjs = useMemo(
    () => (availablePlayers || []).filter(j => currentSelected.includes(j._id)).sort((a, b) => {
      const nombreA = getPlayerFullName(a);
      const nombreB = getPlayerFullName(b);
      return nombreA.localeCompare(nombreB);
    }),
    [currentSelected, availablePlayers]
  );

  // Función para actualizar selección (soporta ambos modos)
  const updateSelection = useCallback((newSelection) => {
    if (isDirectMode) {
      setSelectedIds(newSelection);
    } else {
      setTempSelected(newSelection);
    }
  }, [isDirectMode, setSelectedIds]);

  const togglePlayer = useCallback((id) => {
    if (currentSelected.includes(id)) {
      updateSelection(currentSelected.filter(i => i !== id));
    } else {
      // Verificar límite de selección
      if (maxSelection && currentSelected.length >= maxSelection) {
        return;
      }
      updateSelection([...currentSelected, id]);
    }
  }, [currentSelected, maxSelection, updateSelection]);

  const deselect = useCallback((id) => {
    updateSelection(currentSelected.filter(i => i !== id));
  }, [currentSelected, updateSelection]);

  // Seleccionar todos según el filtro activo (añade sin duplicar)
  const selectAll = useCallback(() => {
    let playersToAdd = baseList.map(p => p._id);
    
    // Si hay límite, respetar el máximo
    if (maxSelection) {
      const remaining = maxSelection - currentSelected.length;
      const newPlayers = playersToAdd.filter(id => !currentSelected.includes(id));
      updateSelection([...currentSelected, ...newPlayers.slice(0, remaining)]);
    } else {
      updateSelection([...new Set([...currentSelected, ...playersToAdd])]);
    }
  }, [baseList, currentSelected, maxSelection, updateSelection]);

  // Deseleccionar según el filtro activo (quita solo los del filtro actual)
  const deselectAll = useCallback(() => {
    const playersToRemove = baseList.map(p => p._id);
    updateSelection(currentSelected.filter(id => !playersToRemove.includes(id)));
  }, [baseList, currentSelected, updateSelection]);

  // Handler para confirmar (solo en modo batch)
  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm(currentSelected);
    }
    onClose();
  }, [currentSelected, onConfirm, onClose]);

  if (!visible) return null;

  const selectedPanelWidth = isWide ? 200 : 150;
  const modalTitle = title || t('session.selectPlayersTitle', 'Seleccionar jugadores');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            {
              paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 18 : 14),
              paddingBottom: Math.max(insets.bottom, 14),
              paddingLeft: 12 + Math.max(insets.left, 0),
              paddingRight: 12 + Math.max(insets.right, 0),
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{modalTitle}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.filterRow, isMobile && styles.filterRowMobile]}>
            <TouchableOpacity
              style={[styles.filterBtn, isMobile && styles.filterBtnMobile, injuryFilter === 'todos' && styles.filterBtnActive]}
              onPress={() => setInjuryFilter('todos')}
            >
              <Text style={[styles.filterBtnText, injuryFilter === 'todos' && styles.filterBtnTextActive]}>
                {t('common.all', 'Todos')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, isMobile && styles.filterBtnMobile, injuryFilter === 'disponibles' && styles.filterBtnActive]}
              onPress={() => setInjuryFilter('disponibles')}
            >
              <Text style={[styles.filterBtnText, injuryFilter === 'disponibles' && styles.filterBtnTextActive]}>
                {t('common.available', 'Disponibles')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, isMobile && styles.filterBtnMobile, injuryFilter === 'lesionados' && styles.filterBtnActive]}
              onPress={() => setInjuryFilter('lesionados')}
            >
              <Text style={[styles.filterBtnText, injuryFilter === 'lesionados' && styles.filterBtnTextActive]}>
                {t('common.injured', 'Lesionados')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.searchRow, isMobile && styles.searchRowMobile]}>
            {(() => {
              const currentFilterIds = baseList.map(p => p._id);
              const allCurrentSelected = currentFilterIds.length > 0 && currentFilterIds.every(id => currentSelected.includes(id));
              return (
                <TouchableOpacity
                  style={[styles.selectAllBtn, isMobile && styles.selectAllBtnMobile]}
                  onPress={allCurrentSelected ? deselectAll : selectAll}
                >
                  <MaterialIcons
                    name={allCurrentSelected ? "check-box" : "check-box-outline-blank"}
                    size={20}
                    color={THEME.primaryDark}
                  />
                  <Text style={styles.selectAllText}>
                    {allCurrentSelected ? t('session.deselectAll', 'Deseleccionar todos') : t('session.selectAll', 'Seleccionar todos')}
                  </Text>
                </TouchableOpacity>
              );
            })()}
            {!isMobile && <View style={{ flex: 1 }} />}
            <TextInput
              style={[
                styles.searchInput,
                isMobile ? styles.searchInputMobile : { minWidth: isPortrait ? 140 : 220 },
              ]}
              placeholder={t('session.searchPlayer', 'Buscar jugador...')}
              placeholderTextColor="#7b8aa5"
              value={search}
              onChangeText={setSearch}
              enterKeyHint="search"
            />
          </View>

          <Text style={styles.metaInfo}>
            {lower || injuryFilter !== 'todos'
              ? `${t('session.results', 'Resultados')}: ${baseList.length}${injuryFilter !== 'todos' ? ` (${t(injuryFilter === 'disponibles' ? 'common.available' : 'common.injured')})` : ''}`
              : `${t('common.total', 'Total')}: ${baseList.length}`
            }
            {maxSelection && ` | ${t('session.maxSelection', 'Máximo')}: ${currentSelected.length}/${maxSelection}`}
          </Text>

          {/* Layout móvil: lista vertical con scroll */}
          {isMobile ? (
            <View style={{ flex: 1 }}>
              {/* Panel de seleccionados compacto en móvil */}
              {currentSelected.length > 0 && (
                <View style={styles.selectedPanelMobile}>
                  <Text style={styles.selectedPanelTitleMobile}>
                    {t('session.selectedCount', { count: currentSelected.length }, `Seleccionados: ${currentSelected.length}`)}
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {selectedObjs.map(j => (
                      <TouchableOpacity 
                        key={j._id} 
                        style={styles.selectedChipMobile}
                        onPress={() => deselect(j._id)}
                      >
                        <Text style={styles.selectedChipTextMobile} numberOfLines={1}>
                          {getPlayerFullName(j)}
                        </Text>
                        <Text style={styles.selectedChipRemoveMobile}>×</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              {/* Lista de jugadores con scroll */}
              <ScrollView 
                style={{ flex: 1 }} 
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
              >
                {baseList.length === 0 ? (
                  <View style={styles.emptyGrid}>
                    <Text style={styles.emptyGridTxt}>{t('common.noResults', 'Sin resultados')}</Text>
                  </View>
                ) : baseList.map(j => {
                  const status = getPlayerInjuryStatus(j._id, injuries);
                  const isSelected = currentSelected.includes(j._id);
                  const isDisabled = !isSelected && maxSelection && currentSelected.length >= maxSelection;
                  
                  const isSanctioned = sanctionedPlayerIds.includes(j._id);
                  
                  return (
                    <TouchableOpacity
                      key={j._id}
                      style={[
                        styles.playerRowMobile,
                        isSelected && styles.playerRowMobileSelected,
                        isDisabled && styles.playerRowMobileDisabled
                      ]}
                      onPress={() => togglePlayer(j._id)}
                      activeOpacity={isDisabled ? 1 : 0.7}
                    >
                      <View style={[
                        styles.playerCheckMobile,
                        isSelected && styles.playerCheckMobileSelected
                      ]}>
                        {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                      <View style={styles.playerAvatarMobile}>
                        <Ionicons name="person" size={20} color={isSelected ? THEME.primary : THEME.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[
                          styles.playerNameMobile,
                          isSelected && styles.playerNameMobileSelected
                        ]} numberOfLines={1}>
                          {getPlayerFullName(j)}
                        </Text>
                        {j.posicion && (
                          <Text style={styles.playerPositionMobile} numberOfLines={1}>
                            {j.posicion}
                          </Text>
                        )}
                      </View>
                      {isSanctioned && (
                        <View style={[styles.statusBadgeMobile, { backgroundColor: THEME.errorSoft }]}>
                          <MaterialIcons name="block" size={12} color="#dc2626" />
                          <Text style={[styles.statusTextMobile, { color: THEME.errorSoftText }]}>{t('tournaments.sanctioned', 'Sancionado')}</Text>
                        </View>
                      )}
                      {status && (
                        <View style={[styles.statusBadgeMobile, status.status === 'injured' ? { backgroundColor: THEME.errorSoft } : { backgroundColor: status.color }]}>
                          <Text style={[styles.statusTextMobile, status.status === 'injured' ? { color: THEME.errorSoftText } : null]}>{t(`common.${status.status}`, status.status)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            /* Layout tablet/desktop: grid con panel lateral */
            <View style={[styles.mainContent, { flexDirection: isPortrait ? 'column' : 'row', gap: isPortrait ? 12 : 16 }]}>
              <View style={[
                styles.selectedPanel,
                {
                  width: isPortrait ? '100%' : selectedPanelWidth,
                  flex: isPortrait ? 0 : undefined,
                  maxHeight: isPortrait ? 140 : undefined
                }
              ]}>
                <Text style={styles.selectedPanelTitle}>{t('session.selectedCount', { count: currentSelected.length }, `Seleccionados: ${currentSelected.length}`)}</Text>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 6 }} showsVerticalScrollIndicator>
                  {selectedObjs.length === 0 && <Text style={styles.selectedEmpty}>{t('common.empty', 'Vacío')}</Text>}
                  {selectedObjs.map(j => {
                    const status = getPlayerInjuryStatus(j._id, injuries);
                    const isSanctioned = sanctionedPlayerIds.includes(j._id);
                    return (
                      <View key={j._id} style={styles.selectedItemRow}>
                        <TouchableOpacity onPress={() => deselect(j._id)} style={styles.removeSelBtn}>
                          <Text style={styles.removeSelTxt}>×</Text>
                        </TouchableOpacity>
                        <View style={styles.selImgPlaceholder}>
                          <Ionicons name="person" size={20} color={THEME.textMuted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.selItemName} numberOfLines={1}>
                            {getPlayerFullName(j)}
                          </Text>
                          {isSanctioned && (
                            <View style={[styles.statusBadge, { backgroundColor: THEME.errorSoft }]}>
                              <Text style={[styles.statusText, { color: THEME.errorSoftText }]}>{t('tournaments.sanctioned', 'Sancionado')}</Text>
                            </View>
                          )}
                          {status && (
                            <View style={[styles.statusBadge, status.status === 'injured' ? { backgroundColor: THEME.errorSoft } : { backgroundColor: status.color }]}>
                              <Text style={[styles.statusText, status.status === 'injured' ? { color: THEME.errorSoftText } : null]}>{t(`common.${status.status}`, status.status)}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={[styles.mainArea, { flex: 1 }]}>
                <ScrollView contentContainerStyle={styles.gridWrapper}>
                  {baseList.length === 0 ? (
                    <View style={styles.emptyGrid}>
                      <Text style={styles.emptyGridTxt}>{t('common.noResults', 'Sin resultados')}</Text>
                    </View>
                  ) : baseList.map(j => {
                    const status = getPlayerInjuryStatus(j._id, injuries);
                    const isSelected = currentSelected.includes(j._id);
                    const isDisabled = !isSelected && maxSelection && currentSelected.length >= maxSelection;
                    const isSanctioned = sanctionedPlayerIds.includes(j._id);
                    
                    return (
                      <TouchableOpacity
                        key={j._id}
                        style={[
                          styles.playerCard, 
                          isSelected && styles.playerCardSel,
                          isDisabled && styles.playerCardDisabled
                        ]}
                        onPress={() => togglePlayer(j._id)}
                        activeOpacity={isDisabled ? 1 : 0.75}
                      >
                        <View style={styles.playerCardIcon}>
                          <Ionicons name="person" size={36} color={isSelected ? THEME.primary : THEME.textMuted} />
                        </View>
                          <Text style={[styles.playerName, isSelected && styles.playerNameSel]} numberOfLines={2}>
                            {getPlayerFullName(j)}
                          </Text>
                        {j.posicion && (
                          <Text style={styles.playerPosition} numberOfLines={1}>
                            {j.posicion}
                          </Text>
                        )}
                        {isSanctioned && (
                          <View style={[styles.cardStatusBadge, { backgroundColor: THEME.errorSoft }]}>
                            <Text style={[styles.cardStatusText, { color: THEME.errorSoftText }]}>{t('tournaments.sanctioned', 'Sancionado')}</Text>
                          </View>
                        )}
                        {status && (
                          <View style={[styles.cardStatusBadge, status.status === 'injured' ? { backgroundColor: THEME.errorSoft } : { backgroundColor: status.color }]}>
                            <Text style={[styles.cardStatusText, status.status === 'injured' ? { color: THEME.errorSoftText } : null]}>{t(`common.${status.status}`, status.status)}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneBtn} onPress={handleConfirm}>
              <Text style={styles.doneBtnText}>{t('common.done', 'Hecho')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (THEME) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: THEME.surface,
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 24,
    color: THEME.textSecondary,
    lineHeight: 26,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterRowMobile: {
    flexWrap: 'wrap',
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: THEME.backgroundAlt,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterBtnMobile: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.textSecondary,
  },
  filterBtnTextActive: {
    color: THEME.onPrimary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  searchRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectAllBtnMobile: {
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: THEME.backgroundAlt,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.primaryDark,
  },
  searchInput: {
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: THEME.text,
  },
  searchInputMobile: {
    width: '100%',
  },
  metaInfo: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginBottom: 12,
  },
  mainContent: {
    flex: 1,
    minHeight: 300,
  },
  selectedPanel: {
    backgroundColor: THEME.inputBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  selectedPanelTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 8,
  },
  selectedEmpty: {
    fontSize: 12,
    color: THEME.textMuted,
    fontStyle: 'italic',
  },
  selectedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  removeSelBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.errorSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeSelTxt: {
    fontSize: 14,
    color: THEME.danger,
    fontWeight: '600',
  },
  selImgPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selItemName: {
    fontSize: 13,
    color: THEME.text,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  statusText: {
    fontSize: 10,
    color: THEME.onPrimary,
    fontWeight: '600',
  },
  mainArea: {
    backgroundColor: THEME.surface,
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  emptyGrid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  emptyGridTxt: {
    fontSize: 14,
    color: THEME.textMuted,
  },
  playerCard: {
    width: 100,
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  playerCardSel: {
    borderColor: THEME.primary,
    backgroundColor: THEME.primarySoft,
  },
  playerCardDisabled: {
    opacity: 0.5,
  },
  playerCardIcon: {
    marginBottom: 8,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  playerNameSel: {
    color: THEME.primary,
  },
  playerPosition: {
    fontSize: 10,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  cardStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  cardStatusText: {
    fontSize: 9,
    color: THEME.onPrimary,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.text,
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    alignItems: 'flex-end',
  },
  doneBtn: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  doneBtnText: {
    color: THEME.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  
  // ============ ESTILOS MÓVIL PARA SELECTOR DE JUGADORES ============
  selectedPanelMobile: {
    backgroundColor: THEME.primarySoft,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.primary + '30',
  },
  selectedPanelTitleMobile: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.primary,
    marginBottom: 8,
  },
  selectedChipMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  selectedChipTextMobile: {
    fontSize: 12,
    color: THEME.onPrimary,
    fontWeight: '500',
    maxWidth: 100,
  },
  selectedChipRemoveMobile: {
    fontSize: 16,
    color: THEME.onPrimary,
    fontWeight: '600',
  },
  playerRowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 10,
  },
  playerRowMobileSelected: {
    backgroundColor: THEME.primarySoft,
    borderColor: THEME.primary,
  },
  playerRowMobileDisabled: {
    opacity: 0.5,
  },
  playerCheckMobile: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCheckMobileSelected: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  playerAvatarMobile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNameMobile: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  playerNameMobileSelected: {
    color: THEME.primary,
  },
  playerPositionMobile: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  statusBadgeMobile: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTextMobile: {
    fontSize: 10,
    color: THEME.onPrimary,
    fontWeight: '600',
  },
});
