import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Platform,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {
  fetchAnthropometriesByTeam,
  fetchAnthropometriesByPlayer,
  deleteAnthropometry,
  createAnthropometry,
  updateAnthropometry,
  fetchAnthropometryById,
} from '@/store/slices/anthropometry/anthropometryThunks';
import { clearAnthropometries } from '@/store/slices/anthropometry/anthropometrySlice';
import AppLayout from '@/vendor/shared/appLayout';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components';
import { getPlayerFullName } from '@/utils/playerHelpers';

const IS_MOBILE_DEVICE = Dimensions.get('window').width < 430;

function AnthropometryCard({ item, onPress, onOpenOptions, IS_MOBILE, players, isGrid = false, t, styles, theme }) {
  const getPlayerName = (playerId) => {
    if (typeof playerId === 'object' && playerId.nombre) {
      return getPlayerFullName(playerId);
    }
    const player = players.find((p) => p._id === playerId);
    return player ? getPlayerFullName(player) : '-';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isGrid) {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    }
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Vista Grid - Diseño compacto tipo tarjeta
  if (isGrid) {
    return (
      <Pressable
        onPress={() => onPress(item)}
        style={({ pressed }) => [
          styles.gridCard,
          IS_MOBILE && styles.gridCardMobile,
          pressed && styles.gridCardPressed,
        ]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gridCardHeader}
        >
          <View style={styles.gridCardAvatar}>
            <Ionicons name="person" size={IS_MOBILE ? 12 : 14} color="#fff" />
          </View>
        </LinearGradient>
        
        <View style={styles.gridCardBody}>
          <Text style={[styles.gridCardTitle, IS_MOBILE && styles.gridCardTitleMobile]} numberOfLines={1}>
            {getPlayerName(item.jugador)}
          </Text>
          
          <View style={styles.gridCardStats}>
            <View style={styles.gridCardStat}>
              <Ionicons name="calendar-outline" size={8} color="#64748b" />
              <Text style={styles.gridCardStatText}>{formatDate(item.fecha)}</Text>
            </View>
            {item.peso && (
              <View style={[styles.gridCardStat, styles.gridCardStatHighlight]}>
                <Text style={styles.gridCardStatValue}>{item.peso}</Text>
                <Text style={styles.gridCardStatUnit}>kg</Text>
              </View>
            )}
          </View>
          
          {item.porcentaje_grasa && (
            <View style={styles.gridCardBadge}>
              <Text style={styles.gridCardBadgeText}>{item.porcentaje_grasa.toFixed(1)}%</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  // Vista Lista - Diseño horizontal expandido
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.listCard,
        IS_MOBILE && styles.listCardMobile,
        pressed && styles.listCardPressed,
      ]}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.listCardIndicator}
      />
      
      <View style={styles.listCardAvatar}>
        <Ionicons name="person" size={IS_MOBILE ? 18 : 22} color="#667eea" />
      </View>
      
      <View style={styles.listCardContent}>
        <Text style={[styles.listCardTitle, IS_MOBILE && styles.listCardTitleMobile]} numberOfLines={1}>
          {getPlayerName(item.jugador)}
        </Text>
        
        <View style={styles.listCardTags}>
          <View style={styles.listCardTag}>
            <Ionicons name="calendar-outline" size={12} color="#64748b" />
            <Text style={styles.listCardTagText}>{formatDate(item.fecha)}</Text>
          </View>
          
          {item.peso && (
            <View style={[styles.listCardTag, styles.listCardTagSuccess]}>
              <Ionicons name="fitness-outline" size={12} color={theme.colors.successSoftText} />
              <Text style={[styles.listCardTagText, { color: theme.colors.successSoftText }]}>{item.peso} kg</Text>
            </View>
          )}
          
          {item.porcentaje_grasa && (
            <View style={[styles.listCardTag, styles.listCardTagWarning]}>
              <Ionicons name="analytics-outline" size={12} color={theme.colors.warningSoftText} />
              <Text style={[styles.listCardTagText, { color: theme.colors.warningSoftText }]}>{item.porcentaje_grasa.toFixed(1)}%</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.listCardActions}>
        <TouchableOpacity 
          style={styles.listCardActionBtn}
          onPress={() => onPress(item)}
        >
          <Ionicons name="eye-outline" size={18} color="#667eea" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.listCardActionBtn}
          onPress={() => onOpenOptions(item)}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

const Anthropometry = ({ navigation }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;
  const IS_TABLET = screenWidth > 700;
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  
  const { anthropometries, loading } = useSelector((state) => state.anthropometry);
  const { players } = useSelector((state) => state.player);
  const equipos = useSelector((state) => state.team.teams);
  
  const selectedTeam = equipos?.find(e => e.seleccionado === true);
  
  // Estados de filtros
  const [filterPlayer, setFilterPlayer] = useState('all');
  const [dateFilter, setDateFilter] = useState(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  
  // Estados de modales
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedAnthropometryForOptions, setSelectedAnthropometryForOptions] = useState(null);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [dateRangeModalVisible, setDateRangeModalVisible] = useState(false);
  const [playerFilterModalVisible, setPlayerFilterModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingAnthropometry, setEditingAnthropometry] = useState(null);
  const [viewingAnthropometry, setViewingAnthropometry] = useState(null);
  
  // Estados para filtro de fechas
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);
  const [datePickerVisibleStart, setDatePickerVisibleStart] = useState(false);
  const [datePickerVisibleEnd, setDatePickerVisibleEnd] = useState(false);
  
  // Estados del formulario
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [fecha, setFecha] = useState(new Date());
  const [peso, setPeso] = useState('');
  // Sistema de 6 pliegues (Yuhasz)
  const [tricipital, setTricipital] = useState('');
  const [subescapular, setSubescapular] = useState('');
  const [suprailiaco, setSuprailiaco] = useState('');
  const [abdominal, setAbdominal] = useState('');
  const [muslo_frontal, setMuslo_frontal] = useState('');
  const [pierna_medial, setPierna_medial] = useState('');
  const [notas, setNotas] = useState('');
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  useEffect(() => {
    if (selectedTeam?._id) {
      dispatch(fetchAnthropometriesByTeam({ team: selectedTeam._id }));
    }
    
    return () => {
      dispatch(clearAnthropometries());
    };
  }, [selectedTeam?._id]);

  useEffect(() => {
    if (filterPlayer && filterPlayer !== 'all' && selectedTeam?._id) {
      dispatch(fetchAnthropometriesByPlayer({ playerId: filterPlayer }));
    } else if (filterPlayer === 'all' && selectedTeam?._id) {
      dispatch(fetchAnthropometriesByTeam({ team: selectedTeam._id }));
    }
  }, [filterPlayer]);

  const clearDateFilter = () => {
    setDateFilter(null);
  };

  const clearPlayerFilter = () => {
    setFilterPlayer('all');
  };

  const clearFilters = () => {
    setDateFilter(null);
    setFilterPlayer('all');
  };

  const activeFiltersCount = (dateFilter ? 1 : 0) + (filterPlayer !== 'all' ? 1 : 0);

  const handleDelete = (anthropometry) => {
    Alert.alert(
      t('anthropometry.deleteConfirmTitle'),
      t('anthropometry.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            dispatch(deleteAnthropometry(anthropometry._id));
            setOptionsModalVisible(false);
          },
        },
      ]
    );
  };

  const openOptionsModal = (anthropometry) => {
    setSelectedAnthropometryForOptions(anthropometry);
    setOptionsModalVisible(true);
  };

  const handleAnthropometryPress = (anthropometry) => {
    setViewingAnthropometry(anthropometry);
  };
  
  const openCreateModal = () => {
    setSelectedPlayer('');
    setFecha(new Date());
    setPeso('');
    setTricipital('');
    setSubescapular('');
    setSuprailiaco('');
    setAbdominal('');
    setMuslo_frontal('');
    setPierna_medial('');
    setNotas('');
    setEditingAnthropometry(null);
    setCreateModalVisible(true);
  };
  
  const openEditModal = (anthropometry) => {
    setSelectedPlayer(typeof anthropometry.jugador === 'object' ? anthropometry.jugador._id : anthropometry.jugador);
    setFecha(new Date(anthropometry.fecha));
    setPeso(anthropometry.peso?.toString() || '');
    setTricipital(anthropometry.pliegues?.tricipital?.toString() || '');
    setSubescapular(anthropometry.pliegues?.subescapular?.toString() || '');
    setSuprailiaco(anthropometry.pliegues?.suprailiaco?.toString() || '');
    setAbdominal(anthropometry.pliegues?.abdominal?.toString() || '');
    setMuslo_frontal(anthropometry.pliegues?.muslo_frontal?.toString() || '');
    setPierna_medial(anthropometry.pliegues?.pierna_medial?.toString() || '');
    setNotas(anthropometry.notas || '');
    setEditingAnthropometry(anthropometry);
    setCreateModalVisible(true);
  };
  
  const handleCancel = () => {
    setCreateModalVisible(false);
    setEditingAnthropometry(null);
    // Cerrar también los modales internos para evitar estados bloqueados
    setShowPlayerModal(false);
    setShowDateTimePicker(false);
  };
  
  const handleCreateAnthropometry = async () => {
    if (!selectedPlayer) {
      Alert.alert(t('common.error'), t('anthropometry.selectPlayerRequired'));
      return;
    }
    
    if (!selectedTeam?._id) {
      Alert.alert(t('common.error'), t('anthropometry.noTeamSelected'));
      return;
    }
    
    // Obtener el sexo del jugador para el cálculo
    const selectedPlayerObj = players.find(p => p._id === selectedPlayer);
    const sexo = selectedPlayerObj?.sexo || 'M';
    
    try {
      const anthropometryData = {
        jugador: selectedPlayer,
        equipo: selectedTeam._id,
        fecha: fecha,
        peso: peso ? Number(peso) : undefined,
        sexo: sexo, // Para el cálculo en backend
        pliegues: {
          tricipital: tricipital ? Number(tricipital) : undefined,
          subescapular: subescapular ? Number(subescapular) : undefined,
          suprailiaco: suprailiaco ? Number(suprailiaco) : undefined,
          abdominal: abdominal ? Number(abdominal) : undefined,
          muslo_frontal: muslo_frontal ? Number(muslo_frontal) : undefined,
          pierna_medial: pierna_medial ? Number(pierna_medial) : undefined,
        },
        notas: notas.trim() || undefined,
      };
      
      if (editingAnthropometry) {
        await dispatch(updateAnthropometry({ id: editingAnthropometry._id, data: anthropometryData }));
      } else {
        await dispatch(createAnthropometry(anthropometryData));
      }
      
      setCreateModalVisible(false);
      setEditingAnthropometry(null);
      
      if (selectedTeam?._id) {
        dispatch(fetchAnthropometriesByTeam({ team: selectedTeam._id }));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('anthropometry.saveError') + ': ' + (error.response?.data?.message || error.message));
    }
  };

  // Filtrar antropometrías por fecha
  const filteredAnthropometries = useMemo(() => {
    let filtered = [...anthropometries];
    
    if (dateFilter) {
      filtered = filtered.filter(a => {
        const anthropometryDate = new Date(a.fecha);
        // Establecer hora a inicio del día para startDate
        const startDate = new Date(dateFilter.startDate);
        startDate.setHours(0, 0, 0, 0);
        // Establecer hora a fin del día para endDate
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999);
        return anthropometryDate >= startDate && anthropometryDate <= endDate;
      });
    }
    
    // Ordenar por fecha descendente
    filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    return filtered;
  }, [anthropometries, dateFilter]);

  if (loading) {
    return (
      <AppLayout scrollEnabled={false}>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#2474E5" />
          <Text style={styles.emptyText}>{t('anthropometry.loading')}</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout scrollEnabled={false}>
      <View style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <View style={styles.topBarHeaderRow}>
            <View style={styles.headerActions}>
              {/* Filtro por fechas */}
              <TouchableOpacity
                onPress={() => {
                  setTempStartDate(dateFilter?.startDate || null);
                  setTempEndDate(dateFilter?.endDate || null);
                  setDateRangeModalVisible(true);
                }}
                style={[styles.headerIconBtn, dateFilter && styles.headerIconBtnActive]}
                accessibilityLabel={t('anthropometry.filters.filterByDates')}
              >
                <MaterialIcons name="event" size={20} color={dateFilter ? '#fff' : '#2474E5'} />
                {!IS_MOBILE && (
                  <Text style={[styles.headerIconBtnText, dateFilter && styles.headerIconBtnTextActive]}>
                    {t('anthropometry.filters.filterByDates')}
                  </Text>
                )}
                {dateFilter && (
                  <TouchableOpacity
                    style={styles.headerIconBtnClear}
                    onPress={(e) => { e.stopPropagation && e.stopPropagation(); clearDateFilter(); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Filtro por jugador */}
              <TouchableOpacity
                onPress={() => setPlayerFilterModalVisible(true)}
                style={[styles.headerIconBtn, filterPlayer !== 'all' && styles.headerIconBtnActive]}
                accessibilityLabel={t('anthropometry.filterByPlayer')}
              >
                <MaterialIcons name="person" size={20} color={filterPlayer !== 'all' ? '#fff' : '#2474E5'} />
                {!IS_MOBILE && (
                  <Text style={[styles.headerIconBtnText, filterPlayer !== 'all' && styles.headerIconBtnTextActive]}>
                    {filterPlayer === 'all'
                      ? t('anthropometry.filterByPlayer')
                      : (() => {
                          const p = players.find(p => p._id === filterPlayer);
                          return p ? getPlayerFullName(p) : t('player.player');
                        })()}
                  </Text>
                )}
                {filterPlayer !== 'all' && (
                  <TouchableOpacity
                    style={styles.headerIconBtnClear}
                    onPress={(e) => { e.stopPropagation && e.stopPropagation(); clearPlayerFilter(); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Botón primario: Nueva medición */}
              <TouchableOpacity
                onPress={openCreateModal}
                style={styles.headerPrimaryBtn}
                accessibilityLabel={t('anthropometry.newMeasurement')}
              >
                <MaterialIcons name="add" size={20} color="#fff" />
                {!IS_MOBILE && (
                  <Text style={styles.headerPrimaryBtnText}>{t('anthropometry.newMeasurement')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!selectedTeam ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#b5d6fa" />
            <Text style={styles.emptyText}>{t('anthropometry.noTeam')}</Text>
          </View>
) : filteredAnthropometries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={80} color="#b5d6fa" />
            <Text style={styles.emptyText}>
              {activeFiltersCount > 0 ? t('anthropometry.noFilteredResults') : t('anthropometry.noMeasurementsCreated')}
            </Text>
            {!activeFiltersCount && (
              <TouchableOpacity
                style={[styles.createButton, { marginTop: 20 }]}
                onPress={openCreateModal}
              >
                <MaterialIcons name="add" size={20} color="#fff" />
                <Text style={styles.createButtonText}>{t('anthropometry.createFirst')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredAnthropometries}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <AnthropometryCard
                item={item}
                onPress={handleAnthropometryPress}
                onOpenOptions={openOptionsModal}
                IS_MOBILE={IS_MOBILE}
                players={players}
                styles={styles}
                theme={theme}
              />
            )}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Modal de opciones */}
        <Modal
          visible={optionsModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setOptionsModalVisible(false)}
        >
          <Pressable 
            style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}
            onPress={() => setOptionsModalVisible(false)}
          >
            <View style={[styles.optionsModalContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
              {/* Handle bar */}
              <View style={styles.optionsModalHandle} />
              {/* Title */}
              <Text style={styles.optionsModalTitle}>{t('common.options') || 'Opciones'}</Text>

              <TouchableOpacity
                style={styles.optionsModalOption}
                onPress={() => {
                  setOptionsModalVisible(false);
                  openEditModal(selectedAnthropometryForOptions);
                }}
              >
                <View style={[styles.optionsModalIconBox, { backgroundColor: '#eff6ff' }]}>
                  <MaterialIcons name="edit" size={20} color="#2563eb" />
                </View>
                <Text style={styles.optionsModalOptionText}>{t('common.edit')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.optionsModalOption, styles.optionsModalOptionDanger]}
                onPress={() => handleDelete(selectedAnthropometryForOptions)}
              >
                <View style={[styles.optionsModalIconBox, { backgroundColor: '#fef2f2' }]}>
                  <MaterialIcons name="delete" size={20} color="#dc2626" />
                </View>
                <Text style={[styles.optionsModalOptionText, styles.optionsModalOptionTextDanger]}>
                  {t('common.delete')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionsModalCancelButton}
                onPress={() => setOptionsModalVisible(false)}
              >
                <Text style={styles.optionsModalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Modal de rango de fechas */}
        <Modal
          visible={dateRangeModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setDateRangeModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dateRangeModalContainer}>
              <View style={styles.dateRangeModalHeader}>
                <Text style={styles.dateRangeModalTitle}>{t('anthropometry.filters.title')}</Text>
                <TouchableOpacity
                  onPress={() => setDateRangeModalVisible(false)}
                  style={styles.dateRangeCloseBtn}
                >
                  <MaterialIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.dateRangeModalBody}>
                <TouchableOpacity
                  style={styles.createDatePicker}
                  onPress={() => setDatePickerVisibleStart(true)}
                >
                  <View style={styles.createDatePickerContent}>
                    <MaterialIcons name="event" size={24} color="#3578e5" />
                    <View style={styles.createDateTextContainer}>
                      <Text style={styles.createDateLabel}>{t('anthropometry.filters.startDate')}</Text>
                      <Text style={styles.createDateValue}>
                        {tempStartDate
                          ? tempStartDate.toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                          : t('anthropometry.filters.selectDate')
                        }
                      </Text>
                    </View>
                    <MaterialIcons name="arrow-drop-down" size={24} color="#64748b" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.createDatePicker}
                  onPress={() => setDatePickerVisibleEnd(true)}
                >
                  <View style={styles.createDatePickerContent}>
                    <MaterialIcons name="event" size={24} color="#3578e5" />
                    <View style={styles.createDateTextContainer}>
                      <Text style={styles.createDateLabel}>{t('anthropometry.filters.endDate')}</Text>
                      <Text style={styles.createDateValue}>
                        {tempEndDate
                          ? tempEndDate.toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                          : t('anthropometry.filters.selectDate')
                        }
                      </Text>
                    </View>
                    <MaterialIcons name="arrow-drop-down" size={24} color="#64748b" />
                  </View>
                </TouchableOpacity>
              </View>

              {tempStartDate && tempEndDate && (
                <View style={styles.dateRangePreview}>
                  <Text style={styles.dateRangePreviewTitle}>{t('anthropometry.filters.selectedRange')}</Text>
                  <Text style={styles.dateRangePreviewText}>
                    {Math.ceil((new Date(tempEndDate) - new Date(tempStartDate)) / (1000 * 60 * 60 * 24)) + 1} {Math.ceil((new Date(tempEndDate) - new Date(tempStartDate)) / (1000 * 60 * 60 * 24)) + 1 !== 1 ? t('anthropometry.filters.days') : t('anthropometry.filters.day')}
                  </Text>
                </View>
              )}

              <View style={styles.dateRangeModalFooter}>
                <TouchableOpacity
                  style={styles.dateRangeCancelBtn}
                  onPress={() => {
                    setDateRangeModalVisible(false);
                    setTempStartDate(null);
                    setTempEndDate(null);
                  }}
                >
                  <Text style={styles.dateRangeCancelText}>{t('anthropometry.filters.cancel')}</Text>
                </TouchableOpacity>

                {tempStartDate && tempEndDate && (
                  <TouchableOpacity
                    style={styles.dateRangeApplyBtn}
                    onPress={() => {
                      setDateFilter({
                        startDate: tempStartDate,
                        endDate: tempEndDate
                      });
                      setDateRangeModalVisible(false);
                      setTempStartDate(null);
                      setTempEndDate(null);
                    }}
                  >
                    <Text style={styles.dateRangeApplyText}>{t('anthropometry.filters.apply')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <DateTimePickerModal
                isVisible={datePickerVisibleStart}
                mode="date"
                date={tempStartDate || new Date()}
                onConfirm={(date) => {
                  setTempStartDate(date);
                  setDatePickerVisibleStart(false);
                }}
                onCancel={() => setDatePickerVisibleStart(false)}
                locale="es-ES"
                confirmTextIOS={t('anthropometry.filters.confirm')}
                cancelTextIOS={t('anthropometry.filters.cancel')}
                headerTextIOS={t('anthropometry.filters.startDate')}
              />

              <DateTimePickerModal
                isVisible={datePickerVisibleEnd}
                mode="date"
                date={tempEndDate || tempStartDate || new Date()}
                onConfirm={(date) => {
                  setTempEndDate(date);
                  setDatePickerVisibleEnd(false);
                }}
                onCancel={() => setDatePickerVisibleEnd(false)}
                locale="es-ES"
                confirmTextIOS={t('anthropometry.filters.confirm')}
                cancelTextIOS={t('anthropometry.filters.cancel')}
                headerTextIOS={t('anthropometry.filters.endDate')}
              />
            </View>
          </View>
        </Modal>

        {/* Modal de selección de jugador */}
        <Modal
          visible={playerFilterModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setPlayerFilterModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dateRangeModalContainer}>
              <View style={styles.dateRangeModalHeader}>
                <Text style={styles.dateRangeModalTitle}>{t('anthropometry.modal.selectPlayerTitle')}</Text>
                <TouchableOpacity
                  onPress={() => setPlayerFilterModalVisible(false)}
                  style={styles.dateRangeCloseBtn}
                >
                  <MaterialIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.playerListContainer}>
                <TouchableOpacity
                  style={[styles.playerItem, filterPlayer === 'all' && styles.playerItemSelected]}
                  onPress={() => {
                    setFilterPlayer('all');
                    setPlayerFilterModalVisible(false);
                  }}
                >
                  <Text style={[styles.playerItemText, filterPlayer === 'all' && styles.playerItemTextSelected]}>
                    {t('anthropometry.allPlayers')}
                  </Text>
                  {filterPlayer === 'all' && (
                    <MaterialIcons name="check" size={20} color="#2474E5" />
                  )}
                </TouchableOpacity>
                {players.map((player) => (
                  <TouchableOpacity
                    key={player._id}
                    style={[styles.playerItem, filterPlayer === player._id && styles.playerItemSelected]}
                    onPress={() => {
                      setFilterPlayer(player._id);
                      setPlayerFilterModalVisible(false);
                    }}
                  >
<Text style={[styles.playerItemText, filterPlayer === player._id && styles.playerItemTextSelected]}>
                      {getPlayerFullName(player)}
                    </Text>
                    {filterPlayer === player._id && (
                      <MaterialIcons name="check" size={20} color="#2474E5" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal de menú móvil */}
        <Modal
          visible={mobileMenuVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setMobileMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.mobileMenuOverlay}
            activeOpacity={1}
            onPress={() => setMobileMenuVisible(false)}
          >
            <View style={styles.mobileMenuContainer}>
              <View style={styles.mobileMenuContent}>
                {/* Filtro de fechas */}
                <View style={styles.mobileMenuItemRow}>
                  <TouchableOpacity
                    style={[styles.mobileMenuItem, { flex: 1 }]}
                    onPress={() => {
                      setMobileMenuVisible(false);
                      setTempStartDate(dateFilter?.startDate || null);
                      setTempEndDate(dateFilter?.endDate || null);
                      setDateRangeModalVisible(true);
                    }}
                  >
                    <MaterialIcons name="filter-list" size={24} color="#2474E5" />
                    <Text style={styles.mobileMenuItemText}>{t('anthropometry.filters.filterByDates')}</Text>
                    {dateFilter && (
                      <View style={styles.mobileMenuItemBadge}>
                        <Text style={styles.mobileMenuItemBadgeText}>1</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {dateFilter && (
                    <TouchableOpacity
                      style={styles.mobileMenuClearBtn}
                      onPress={() => { clearDateFilter(); setMobileMenuVisible(false); }}
                    >
                      <MaterialIcons name="close" size={20} color="#E53935" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Filtro de jugador */}
                <View style={styles.mobileMenuItemRow}>
                  <TouchableOpacity
                    style={[styles.mobileMenuItem, { flex: 1 }]}
                    onPress={() => {
                      setMobileMenuVisible(false);
                      setPlayerFilterModalVisible(true);
                    }}
                  >
                    <MaterialIcons name="person" size={24} color="#2474E5" />
                    <Text style={styles.mobileMenuItemText}>
{filterPlayer === 'all' 
                        ? t('anthropometry.filterByPlayer')
                        : (() => {
                            const p = players.find(p => p._id === filterPlayer);
                            return p ? getPlayerFullName(p) : t('player.player');
                          })()
                      }
                    </Text>
                    {filterPlayer !== 'all' && (
                      <View style={styles.mobileMenuItemBadge}>
                        <Text style={styles.mobileMenuItemBadgeText}>1</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {filterPlayer !== 'all' && (
                    <TouchableOpacity
                      style={styles.mobileMenuClearBtn}
                      onPress={() => { clearPlayerFilter(); setMobileMenuVisible(false); }}
                    >
                      <MaterialIcons name="close" size={20} color="#E53935" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Crear medición */}
                <TouchableOpacity
                  style={styles.mobileMenuItem}
                  onPress={() => {
                    setMobileMenuVisible(false);
                    openCreateModal();
                  }}
                >
                  <MaterialIcons name="add-circle" size={24} color="#2474E5" />
                  <Text style={styles.mobileMenuItemText}>{t('anthropometry.newMeasurement')}</Text>
                </TouchableOpacity>

                {/* Limpiar todos los filtros */}
                {(dateFilter || filterPlayer !== 'all') && (
                  <TouchableOpacity
                    style={[styles.mobileMenuItem, { borderTopWidth: 1, borderTopColor: '#E2E8F0' }]}
                    onPress={() => { clearFilters(); setMobileMenuVisible(false); }}
                  >
                    <MaterialIcons name="clear-all" size={24} color="#E53935" />
                    <Text style={[styles.mobileMenuItemText, { color: '#E53935' }]}>{t('anthropometry.filters.clear')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Modal de Creación/Edición */}
        <Modal
          visible={createModalVisible}
          animationType="slide"
          transparent
          onRequestClose={handleCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={IS_MOBILE ? styles.createModalContainerMobile : styles.createModalContainer}>
              {/* Header */}
              <View style={styles.createModalHeader}>
                <View style={IS_MOBILE ? styles.createModalHeaderLeftMobile : styles.createModalHeaderLeft}>
                  <View style={styles.createModalIconContainer}>
                    <Ionicons name="body" size={IS_MOBILE ? 22 : 28} color="#3578e5" />
                  </View>
                  <View style={{ flex: 1, flexShrink: 1 }}>
                    <Text style={IS_MOBILE ? styles.createModalTitleMobile : styles.createModalTitle} numberOfLines={1} adjustsFontSizeToFit>
                      {editingAnthropometry ? t('anthropometry.modal.editTitle') : t('anthropometry.modal.createTitle')}
                    </Text>
                    <Text style={IS_MOBILE ? styles.createModalSubtitleMobile : styles.createModalSubtitle} numberOfLines={1}>
                      {editingAnthropometry ? t('anthropometry.modal.editSubtitle') : t('anthropometry.modal.createSubtitle')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.createModalCloseBtn}
                  onPress={handleCancel}
                >
                  <Ionicons name="close" size={28} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <KeyboardAwareScrollView 
                style={styles.createModalBody}
                showsVerticalScrollIndicator={false}
              >
                {/* Card Datos Generales */}
                <View style={IS_MOBILE ? styles.createCardMobile : styles.createCard}>
                  <View style={styles.createCardHeader}>
                    <Ionicons name="person" size={24} color="#3578e5" />
                    <Text style={styles.createCardTitle}>{t('anthropometry.modal.generalData')}</Text>
                  </View>

                  <View style={styles.createCardContent}>
                    {/* Selector de Jugador */}
                    <TouchableOpacity 
                      style={styles.selector} 
                      onPress={() => setShowPlayerModal(true)}
                    >
                      <Text style={[styles.selectorText, selectedPlayer && styles.selectorTextSelected]}>
{selectedPlayer 
                          ? (() => {
                              const p = players.find(p => p._id === selectedPlayer);
                              return p ? getPlayerFullName(p) : t('anthropometry.modal.selectPlayer');
                            })()
                          : t('anthropometry.modal.selectPlayer')}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>

                    {/* Selector de Fecha */}
                    <TouchableOpacity 
                      style={styles.selector} 
                      onPress={() => setShowDateTimePicker(true)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="calendar-outline" size={20} color="#666" />
                        <Text style={[styles.selectorText, styles.selectorTextSelected]}>
                          {fecha.toLocaleDateString('es-ES', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>

                    {/* Peso */}
                    <View>
                      <Text style={styles.inputLabel}>{t('anthropometry.modal.weightKg')}</Text>
                      <TextInput
                        style={styles.input}
                        placeholder={t('anthropometry.modal.weightPlaceholder')}
                        placeholderTextColor="#bbb"
                        keyboardType="decimal-pad"
                        value={peso}
                        onChangeText={setPeso}
                      />
                    </View>
                  </View>
                </View>

                {/* Card Pliegues Cutáneos */}
                <View style={IS_MOBILE ? styles.createCardMobile : styles.createCard}>
                  <View style={styles.createCardHeader}>
                    <Ionicons name="analytics" size={24} color="#3578e5" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.createCardTitle}>{t('anthropometry.skinfolds')} (mm)</Text>
                      <Text style={styles.sixFoldsHint}>{t('anthropometry.sixFoldsSystem')}</Text>
                    </View>
                  </View>

                  <View style={styles.createCardContent}>
                    <View style={styles.row}>
                      <View style={styles.inputHalf}>
                        <Text style={styles.inputLabel}>{t('anthropometry.tricipital')}</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="0"
                          placeholderTextColor="#bbb"
                          keyboardType="decimal-pad"
                          value={tricipital}
                          onChangeText={setTricipital}
                        />
                      </View>
                      <View style={styles.inputHalf}>
                        <Text style={styles.inputLabel}>{t('anthropometry.subescapular')}</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="0"
                          placeholderTextColor="#bbb"
                          keyboardType="decimal-pad"
                          value={subescapular}
                          onChangeText={setSubescapular}
                        />
                      </View>
                    </View>

                    <View style={styles.row}>
                      <View style={styles.inputHalf}>
                        <Text style={styles.inputLabel}>{t('anthropometry.suprailiaco')}</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="0"
                          placeholderTextColor="#bbb"
                          keyboardType="decimal-pad"
                          value={suprailiaco}
                          onChangeText={setSuprailiaco}
                        />
                      </View>
                      <View style={styles.inputHalf}>
                        <Text style={styles.inputLabel}>{t('anthropometry.abdominal')}</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="0"
                          placeholderTextColor="#bbb"
                          keyboardType="decimal-pad"
                          value={abdominal}
                          onChangeText={setAbdominal}
                        />
                      </View>
                    </View>

                    <View style={styles.row}>
                      <View style={styles.inputHalf}>
                        <Text style={styles.inputLabel}>{t('anthropometry.musloFrontal')}</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="0"
                          placeholderTextColor="#bbb"
                          keyboardType="decimal-pad"
                          value={muslo_frontal}
                          onChangeText={setMuslo_frontal}
                        />
                      </View>
                      <View style={styles.inputHalf}>
                        <Text style={styles.inputLabel}>{t('anthropometry.piernaMedial')}</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="0"
                          placeholderTextColor="#bbb"
                          keyboardType="decimal-pad"
                          value={pierna_medial}
                          onChangeText={setPierna_medial}
                        />
                      </View>
                    </View>
                  </View>
                </View>

                {/* Card Notas */}
                <View style={IS_MOBILE ? styles.createCardMobile : styles.createCard}>
                  <View style={styles.createCardHeader}>
                    <Ionicons name="document-text" size={24} color="#3578e5" />
                    <Text style={styles.createCardTitle}>{t('anthropometry.notes')}</Text>
                  </View>

                  <View style={styles.createCardContent}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder={t('anthropometry.notesPlaceholder')}
                      placeholderTextColor="#bbb"
                      multiline
                      numberOfLines={4}
                      value={notas}
                      onChangeText={setNotas}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </KeyboardAwareScrollView>

              {/* Footer */}
              <View style={styles.createModalFooter}>
                <TouchableOpacity onPress={handleCancel} style={styles.createCancelButton}>
                  <Text style={styles.createCancelButtonText}>{t('anthropometry.modal.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateAnthropometry} style={styles.createSaveButton}>
                  <Text style={styles.createSaveButtonText}>
                    {editingAnthropometry ? t('anthropometry.modal.saveChanges') : t('anthropometry.modal.create')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Modal de Selector de Jugador - DENTRO del modal de creación */}
              <Modal
                visible={showPlayerModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPlayerModal(false)}
              >
                <TouchableOpacity 
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowPlayerModal(false)}
                >
                  <View style={styles.pickerModal}>
                    <View style={styles.pickerModalHeader}>
                      <Text style={styles.pickerModalTitle}>{t('anthropometry.modal.selectPlayerTitle')}</Text>
                      <TouchableOpacity onPress={() => setShowPlayerModal(false)}>
                        <Ionicons name="close" size={24} color="#666" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.pickerModalContent}>
                      {players.map(player => (
                        <TouchableOpacity
                          key={player._id}
                          style={styles.pickerModalItem}
                          onPress={() => {
                            setSelectedPlayer(player._id);
                            setShowPlayerModal(false);
                          }}
                        >
                          <Text style={styles.pickerModalItemText}>{getPlayerFullName(player)}</Text>
                          {selectedPlayer === player._id && (
                            <Ionicons name="checkmark" size={24} color="#2474E5" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableOpacity>
              </Modal>

              {/* DateTimePicker - DENTRO del modal de creación */}
              <DateTimePickerModal
                isVisible={showDateTimePicker}
                mode="date"
                onConfirm={(date) => {
                  setFecha(date);
                  setShowDateTimePicker(false);
                }}
                onCancel={() => setShowDateTimePicker(false)}
                date={fecha}
                locale="es-ES"
                confirmTextIOS={t('anthropometry.filters.confirm')}
                cancelTextIOS={t('anthropometry.filters.cancel')}
                headerTextIOS={t('anthropometry.filters.selectDate')}
              />
            </View>
          </View>
        </Modal>

        {/* Modal de Detalle */}
        <Modal
          visible={viewingAnthropometry !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setViewingAnthropometry(null)}
        >
          {viewingAnthropometry && (
            <View style={styles.modalBg}>
              <View style={IS_TABLET ? styles.viewModalContentTablet : styles.viewModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('anthropometry.modal.detailTitle')}</Text>
                  <View style={{ flexDirection: 'row', gap: IS_MOBILE ? 8 : 12 }}>
                    <TouchableOpacity
                      style={[styles.modalEditButton, IS_MOBILE && { padding: 6 }]}
                      onPress={() => {
                        openEditModal(viewingAnthropometry);
                        setViewingAnthropometry(null);
                      }}
                    >
                      <MaterialIcons name="edit" size={IS_MOBILE ? 18 : 24} color="#3578e5" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalCloseBtn, IS_MOBILE && { padding: 6 }]}
                      onPress={() => setViewingAnthropometry(null)}
                    >
                      <Ionicons name="close" size={IS_MOBILE ? 20 : 28} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Información del Jugador */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('anthropometry.modal.player')}</Text>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="person" size={20} color="#64748b" />
                      <Text style={styles.detailText}>
                        {viewingAnthropometry.jugador ? getPlayerFullName(viewingAnthropometry.jugador) : t('unknown')}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="calendar-today" size={20} color="#64748b" />
                      <Text style={styles.detailText}>
                        {new Date(viewingAnthropometry.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                  </View>

                  {/* Peso */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('anthropometry.weight')}</Text>
                    <View style={styles.detailCard}>
                      <Text style={styles.detailValueLarge}>{viewingAnthropometry.peso} kg</Text>
                    </View>
                  </View>

                  {/* Pliegues Cutáneos */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('anthropometry.skinfolds')}</Text>
                    <Text style={styles.sixFoldsHintSmall}>{t('anthropometry.sixFoldsSystem')}</Text>
                    <View style={styles.detailGrid}>
                      <View style={styles.detailGridItem}>
                        <Text style={styles.detailLabel}>{t('anthropometry.tricipital')}</Text>
                        <Text style={styles.detailValue}>{viewingAnthropometry.pliegues?.tricipital || '-'} mm</Text>
                      </View>
                      <View style={styles.detailGridItem}>
                        <Text style={styles.detailLabel}>{t('anthropometry.subescapular')}</Text>
                        <Text style={styles.detailValue}>{viewingAnthropometry.pliegues?.subescapular || '-'} mm</Text>
                      </View>
                      <View style={styles.detailGridItem}>
                        <Text style={styles.detailLabel}>{t('anthropometry.suprailiaco')}</Text>
                        <Text style={styles.detailValue}>{viewingAnthropometry.pliegues?.suprailiaco || '-'} mm</Text>
                      </View>
                      <View style={styles.detailGridItem}>
                        <Text style={styles.detailLabel}>{t('anthropometry.abdominal')}</Text>
                        <Text style={styles.detailValue}>{viewingAnthropometry.pliegues?.abdominal || '-'} mm</Text>
                      </View>
                      <View style={styles.detailGridItem}>
                        <Text style={styles.detailLabel}>{t('anthropometry.musloFrontal')}</Text>
                        <Text style={styles.detailValue}>{viewingAnthropometry.pliegues?.muslo_frontal || '-'} mm</Text>
                      </View>
                      <View style={styles.detailGridItem}>
                        <Text style={styles.detailLabel}>{t('anthropometry.piernaMedial')}</Text>
                        <Text style={styles.detailValue}>{viewingAnthropometry.pliegues?.pierna_medial || '-'} mm</Text>
                      </View>
                    </View>
                  </View>

                  {/* Resultados Calculados */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>{t('anthropometry.bodyComposition')}</Text>
                    <View style={styles.detailResultsGrid}>
                      <View style={styles.detailResultCard}>
                        <Text style={styles.detailResultLabel}>{t('anthropometry.sumOfFolds')}</Text>
                        <Text style={styles.detailResultValue}>{viewingAnthropometry.suma_pliegues?.toFixed(1) || '-'} mm</Text>
                      </View>
                      <View style={styles.detailResultCard}>
                        <Text style={styles.detailResultLabel}>{t('anthropometry.fatPercentage')}</Text>
                        <Text style={styles.detailResultValue}>{viewingAnthropometry.porcentaje_grasa?.toFixed(1) || '-'}%</Text>
                      </View>
                      {viewingAnthropometry.masa_grasa && (
                        <View style={styles.detailResultCard}>
                          <Text style={styles.detailResultLabel}>{t('anthropometry.fatMass')}</Text>
                          <Text style={styles.detailResultValue}>{viewingAnthropometry.masa_grasa?.toFixed(1)} kg</Text>
                        </View>
                      )}
                      {viewingAnthropometry.masa_magra && (
                        <View style={styles.detailResultCard}>
                          <Text style={styles.detailResultLabel}>{t('anthropometry.leanMass')}</Text>
                          <Text style={styles.detailResultValue}>{viewingAnthropometry.masa_magra?.toFixed(1)} kg</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Notas */}
                  {viewingAnthropometry.notas && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>{t('anthropometry.notes')}</Text>
                      <View style={styles.detailCard}>
                        <Text style={styles.detailText}>{viewingAnthropometry.notas}</Text>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          )}
        </Modal>
      </View>
    </AppLayout>
  );
};

const makeStyles = (theme) => StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  topBar: {
    backgroundColor: theme.colors.surface,
    paddingTop: Platform.OS === 'web' ? 16 : 10,
    paddingBottom: Platform.OS === 'web' ? 12 : 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  topBarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 12,
  },
  topBarTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topBarTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  topBarMobile: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'flex-end',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: theme.colors.onPrimary,
  },
  clearFilterBtn: {
    marginLeft: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: Platform.OS === 'ios' ? 8 : 7,
    paddingHorizontal: 16,
    borderRadius: 22,
    shadowColor: '#2856a2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
    gap: 4,
  },
  createButtonText: {
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.25,
  },
  mobileMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  // Acciones inline del header (estilo unificado, sin menú de 3 puntos)
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: IS_MOBILE_DEVICE ? 0 : 12,
    minWidth: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
  },
  headerIconBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  headerIconBtnText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 13,
    maxWidth: 140,
  },
  headerIconBtnTextActive: {
    color: theme.colors.onPrimary,
  },
  headerIconBtnClear: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  headerPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: IS_MOBILE_DEVICE ? 0 : 14,
    minWidth: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    shadowColor: '#2856a2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  headerPrimaryBtnText: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  mobileMenuBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileMenuBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  anthropometryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 74,
    marginBottom: 8,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  anthropometryCardMobile: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 64,
  },
  anthropometryCardContent: {
    flex: 1,
  },
  anthropometryCardPressed: {
    backgroundColor: theme.colors.backgroundAlt,
    borderColor: theme.colors.border,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 6,
    letterSpacing: 0.25,
  },
  cardTitleMobile: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  infoTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  anthropometryCardActions: {
    flexDirection: 'column',
    gap: 6,
    marginLeft: 8,
  },
  cardActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ========== NUEVOS ESTILOS PROFESIONALES ==========
  // Vista Grid - Tarjetas compactas
  gridCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    marginHorizontal: 4,
    flex: 1,
    maxHeight: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  gridCardMobile: {
    marginHorizontal: 3,
    marginBottom: 6,
    borderRadius: 10,
    maxHeight: 115,
  },
  gridCardPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.05,
  },
  gridCardHeader: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardBody: {
    padding: 8,
    alignItems: 'center',
  },
  gridCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 14,
  },
  gridCardTitleMobile: {
    fontSize: 10,
    marginBottom: 3,
    lineHeight: 12,
  },
  gridCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  gridCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  gridCardStatHighlight: {
    backgroundColor: theme.colors.successSoft,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  gridCardStatText: {
    fontSize: 9,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  gridCardStatValue: {
    fontSize: 10,
    color: theme.colors.successSoftText,
    fontWeight: '700',
  },
  gridCardStatUnit: {
    fontSize: 8,
    color: theme.colors.successSoftText,
    fontWeight: '500',
  },
  gridCardBadge: {
    marginTop: 4,
    backgroundColor: theme.colors.warningSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  gridCardBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.warningSoftText,
  },
  // Vista Lista - Tarjetas horizontales
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  listCardMobile: {
    borderRadius: 12,
    marginBottom: 8,
  },
  listCardPressed: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  listCardIndicator: {
    width: 4,
    height: '100%',
  },
  listCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 12,
  },
  listCardContent: {
    flex: 1,
    paddingVertical: 14,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  listCardTitleMobile: {
    fontSize: 14,
    marginBottom: 4,
  },
  listCardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  listCardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  listCardTagSuccess: {
    backgroundColor: theme.colors.successSoft,
  },
  listCardTagWarning: {
    backgroundColor: theme.colors.warningSoft,
  },
  listCardTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  listCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    gap: 4,
  },
  listCardActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ========== FIN NUEVOS ESTILOS ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 16,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  optionsModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  optionsModalTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  optionsModalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionsModalOptionDanger: {
    borderBottomWidth: 0,
  },
  optionsModalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  optionsModalOptionTextDanger: {
    color: '#dc2626',
  },
  optionsModalCancelButton: {
    marginTop: 8,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  optionsModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  dateRangeModalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 'auto',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  dateRangeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dateRangeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  dateRangeCloseBtn: {
    padding: 4,
  },
  dateRangeModalBody: {
    padding: 20,
    gap: 16,
  },
  createDatePicker: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createDatePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  createDateTextContainer: {
    flex: 1,
  },
  createDateLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  createDateValue: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '500',
  },
  dateRangePreview: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dateRangePreviewTitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  dateRangePreviewText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
  },
  dateRangeModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  dateRangeCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  dateRangeCancelText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  dateRangeApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  dateRangeApplyText: {
    fontSize: 16,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  mobileMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mobileMenuContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  mobileMenuContent: {
    paddingVertical: 8,
  },
  mobileMenuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileMenuClearBtn: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  mobileMenuItemText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
    flex: 1,
  },
  mobileMenuItemBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileMenuItemBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  playerListContainer: {
    maxHeight: 400,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  playerItemSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  playerItemText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  playerItemTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  // Estilos del modal de creación
  createModalContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight:'90%',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  createModalContainerMobile: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    maxHeight: '95%',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  createModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    paddingHorizontal: IS_MOBILE_DEVICE ? 16 : 24,
    paddingRight: IS_MOBILE_DEVICE ? 62 : 78,
    paddingVertical: IS_MOBILE_DEVICE ? 14 : 20,
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
    gap: 10,
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  createModalIconContainer: {
    width: IS_MOBILE_DEVICE ? 38 : 48,
    height: IS_MOBILE_DEVICE ? 38 : 48,
    borderRadius: IS_MOBILE_DEVICE ? 12 : 24,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  createModalTitleMobile: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    flexShrink: 1,
  },
  createModalSubtitleMobile: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  createModalSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  createModalCloseBtn: {
    position: 'absolute',
    right: IS_MOBILE_DEVICE ? 12 : 16,
    top: IS_MOBILE_DEVICE ? 12 : 16,
    width: IS_MOBILE_DEVICE ? 36 : 40,
    height: IS_MOBILE_DEVICE ? 36 : 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  createModalBody: {
    flex: 1,
    padding: IS_MOBILE_DEVICE ? 16 : 24,
  },
  createCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createCardMobile: {
    backgroundColor: theme.colors.surfaceAlt,
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
  sixFoldsHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  sixFoldsHintSmall: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  createCardContent: {
    gap: 16,
  },
  createModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: IS_MOBILE_DEVICE ? 14 : 24,
    paddingVertical: IS_MOBILE_DEVICE ? 14 : 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: IS_MOBILE_DEVICE ? 10 : 16,
  },
  createModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: IS_MOBILE_DEVICE ? 12 : 14,
    gap: 8,
  },
  createModalButtonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  createModalButtonSecondary: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  createModalButtonText: {
    fontSize: IS_MOBILE_DEVICE ? 14 : 16,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  createModalButtonTextSecondary: {
    fontSize: IS_MOBILE_DEVICE ? 14 : 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: IS_MOBILE_DEVICE ? 12 : 16,
    paddingVertical: IS_MOBILE_DEVICE ? 12 : 14,
    fontSize: IS_MOBILE_DEVICE ? 14 : 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  selector: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  selectorTextSelected: {
    color: theme.colors.text,
  },
  // Estilos del modal de detalle
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: IS_MOBILE_DEVICE ? 10 : 20,
  },
  viewModalContent: Platform.select({
    ios: {
      backgroundColor: theme.colors.surface,
      borderRadius: IS_MOBILE_DEVICE ? 16 : 20,
      width: '100%',
      maxWidth: 500,
      maxHeight: '95%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    android: {
      backgroundColor: theme.colors.surface,
      borderRadius: IS_MOBILE_DEVICE ? 16 : 20,
      width: '100%',
      maxWidth: 500,
      maxHeight: '95%',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    default: {
      backgroundColor: theme.colors.surface,
      borderRadius: IS_MOBILE_DEVICE ? 16 : 20,
      width: '100%',
      maxWidth: 500,
      maxHeight: '95%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
  }),
  viewModalContentTablet: Platform.select({
    ios: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      width: '90%',
      maxWidth: 800,
      maxHeight: '95%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    android: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      width: '90%',
      maxWidth: 800,
      maxHeight: '95%',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    default: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      width: '90%',
      maxWidth: 800,
      maxHeight: '95%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
  }),
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: IS_MOBILE_DEVICE ? 16 : 24,
    paddingTop: IS_MOBILE_DEVICE ? 16 : 24,
    paddingBottom: IS_MOBILE_DEVICE ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: IS_MOBILE_DEVICE ? 16 : 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: IS_MOBILE_DEVICE ? 14 : 24,
    paddingVertical: IS_MOBILE_DEVICE ? 14 : 20,
    paddingBottom: IS_MOBILE_DEVICE ? 24 : 40,
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceAlt,
  },
  modalEditButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceAlt,
  },
  detailSection: {
    marginBottom: IS_MOBILE_DEVICE ? 16 : 24,
  },
  detailSectionTitle: {
    fontSize: IS_MOBILE_DEVICE ? 14 : 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: IS_MOBILE_DEVICE ? 8 : 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  detailCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailValueLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_MOBILE_DEVICE ? 8 : 12,
  },
  detailGridItem: {
    flex: 1,
    minWidth: IS_MOBILE_DEVICE ? '42%' : '45%',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: IS_MOBILE_DEVICE ? 10 : 12,
    padding: IS_MOBILE_DEVICE ? 10 : 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: IS_MOBILE_DEVICE ? 11 : 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: IS_MOBILE_DEVICE ? 14 : 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  detailResultsGrid: {
    flexDirection: 'row',
    gap: IS_MOBILE_DEVICE ? 8 : 12,
    flexWrap: 'wrap',
  },
  detailResultCard: {
    flex: 1,
    minWidth: IS_MOBILE_DEVICE ? '42%' : undefined,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: IS_MOBILE_DEVICE ? 10 : 12,
    padding: IS_MOBILE_DEVICE ? 12 : 16,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
    alignItems: 'center',
  },
  detailResultLabel: {
    fontSize: IS_MOBILE_DEVICE ? 11 : 12,
    color: theme.colors.primarySoftText,
    marginBottom: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  detailResultValue: {
    fontSize: IS_MOBILE_DEVICE ? 16 : 20,
    fontWeight: '700',
    color: theme.colors.primarySoftText,
  },
  // Estilos del modal de jugador
  pickerModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    margin: 20,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  pickerModalContent: {
    maxHeight: 400,
  },
  pickerModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerModalItemText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  // Estilos para panel de filtros
  filtersPanel: {
    backgroundColor: theme.colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filtersPanelContent: {
    gap: 12,
  },
  filterInputContainer: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  filterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterInputActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  filterInputText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    flex: 1,
  },
  filterInputTextActive: {
    color: theme.colors.text,
  },
  clearInputBtn: {
    padding: 4,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  clearFiltersText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  closeFiltersButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  closeFiltersText: {
    fontSize: 14,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  // Badge de filtros
  filterBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  mobileMenuButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  // Estilos para vista Grid
  anthropometryCardGrid: {
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  anthropometryCardGridMobile: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  cardInfoGrid: {
    minHeight: 80,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingTop: 0,
    overflow: 'visible',
  },
  cardTitleGrid: {
    fontSize: 13,
    marginBottom: 1,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  infoTagGrid: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 0,
    minHeight: 18,
    justifyContent: 'center',
  },
  infoTagTextGrid: {
    fontSize: 9,
    marginLeft: 1,
    fontWeight: '500',
  },
  infoTagsContainerGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Estilos de botones del modal (idénticos a rivalAnalysis)
  createCancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: IS_MOBILE_DEVICE ? 10 : 12,
    paddingVertical: IS_MOBILE_DEVICE ? 10 : 14,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: IS_MOBILE_DEVICE ? 6 : 8,
  },
  createCancelButtonText: {
    fontSize: IS_MOBILE_DEVICE ? 13 : 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  createSaveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: IS_MOBILE_DEVICE ? 10 : 12,
    paddingVertical: IS_MOBILE_DEVICE ? 10 : 14,
    backgroundColor: theme.colors.primary,
    gap: IS_MOBILE_DEVICE ? 6 : 8,
  },
  createSaveButtonText: {
    fontSize: IS_MOBILE_DEVICE ? 13 : 16,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
});

export default Anthropometry;
