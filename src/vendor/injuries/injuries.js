import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {
  fetchInjuriesByTeam,
  createInjury,
  updateInjury,
  deleteInjury,
} from '@/store/slices/injury/injuryThunks';
import { fetchJugadoresEquipo } from '@/store/slices/player/playerThunks';
import { clearPlayers } from '@/store/slices/player/playerSlice';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';
import AppLayout from '@/vendor/shared/appLayout';
import { useTheme } from 'styled-components';
import { getPlayerFullName } from '@/utils/playerHelpers';

const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

// Colores por posición (consistentes con jugadores.js)
const getPositionColor = (position) => {
  switch(position?.toLowerCase()) {
    case 'portero': return ['#10b981', '#059669'];
    case 'central': return ['#3b82f6', '#2563eb'];
    case 'lateral': return ['#8b5cf6', '#7c3aed'];
    case 'centrocampista': return ['#f59e0b', '#d97706'];
    case 'extremo': return ['#ec4899', '#db2777'];
    case 'delantero': return ['#ef4444', '#dc2626'];
    default: return ['#6366f1', '#4f46e5'];
  }
};

export default function InjuriesManagement({ navigation }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const injuries = useSelector(state => state.injury.injuries);
  const loading = useSelector(state => state.injury.loading);
  const temporada = useSelector(state => state.season.season);
  const equipos = useSelector(state => state.team.teams);
  const jugadores = useSelector(state => state.player.players);

  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedInjury, setSelectedInjury] = useState(null);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [showZoneSelector, setShowZoneSelector] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [datePickerVisibleStart, setDatePickerVisibleStart] = useState(false);
  const [datePickerVisibleEnd, setDatePickerVisibleEnd] = useState(false);
  const [datePickerVisibleEndPrevista, setDatePickerVisibleEndPrevista] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [startDateFilter, setStartDateFilter] = useState(null);
  const [endDateFilter, setEndDateFilter] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showPositionFilter, setShowPositionFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [dateFilterVisible, setDateFilterVisible] = useState(false);
  const [dateFilterType, setDateFilterType] = useState(null); // 'start' or 'end'
  const [sortByDuration, setSortByDuration] = useState(''); // '' | 'asc' | 'desc'

  const [formData, setFormData] = useState({
    jugador: '',
    zona: { label: '', value: '' },
    tipo: { label: '', value: '' },
    fechaInicio: '',
    fechaInicioDate: null,
    fechaFin: '',
    fechaFinDate: null,
    fechaFinPrevista: '',
    fechaFinPrevistaDate: null,
    recaida: false,
    lesionEspecifica: '',
  });

  const zoneOptions = useMemo(() => [
    { label: t('injury.zones.cadera'), value: 'cadera' },
    { label: t('injury.zones.rodilla'), value: 'rodilla' },
    { label: t('injury.zones.tobillo'), value: 'tobillo' },
    { label: t('injury.zones.hombro'), value: 'hombro' },
    { label: t('injury.zones.muneca'), value: 'muneca' },
    { label: t('injury.zones.espalda'), value: 'espalda' },
    { label: t('injury.zones.cuadriceps'), value: 'cuadriceps' },
    { label: t('injury.zones.aductor'), value: 'aductor' },
    { label: t('injury.zones.isquio'), value: 'isquio' },
    { label: t('injury.zones.gemelo'), value: 'gemelo' },
    { label: t('injury.zones.gluteo'), value: 'gluteo' },
    { label: t('injury.zones.psoas'), value: 'psoas' }
  ], [t]);

  const typeOptions = useMemo(() => [
    { label: t('injury.types.muscular'), value: 'muscular' },
    { label: t('injury.types.ligamentosa'), value: 'ligamentosa' },
    { label: t('injury.types.osea'), value: 'osea' },
    { label: t('injury.types.otra'), value: 'otra' },
  ], [t]);

  const positionOptions = useMemo(() => [
    { label: t('injury.positions.portero'), value: 'portero' },
    { label: t('injury.positions.lateral'), value: 'lateral' },
    { label: t('injury.positions.central'), value: 'central' },
    { label: t('injury.positions.centrocampista'), value: 'centrocampista' },
    { label: t('injury.positions.extremo'), value: 'extremo' },
    { label: t('injury.positions.delantero'), value: 'delantero' },
  ], [t]);

  const statusOptions = useMemo(() => [
    { label: t('injury.statuses.activa'), value: 'activa', color: '#ef4444' },
    { label: t('injury.statuses.recuperacion'), value: 'recuperacion', color: '#f59e0b' },
    { label: t('injury.statuses.recuperado'), value: 'recuperado', color: '#10b981' },
  ], [t]);

  useEffect(() => {
    if (temporada?._id) {
      dispatch(clearPlayers()); // Clear previous players when season changes
      dispatch(fetchEquiposTemporada({ season: temporada._id }));
    }
  }, [temporada, dispatch]);

  useEffect(() => {
    if (equipos && equipos.length > 0) {
      // Find the team with seleccionado=true
      const selectedTeam = equipos.find(team => team.seleccionado === true);
      if (selectedTeam?._id) {
        // Load injuries for selected team
        dispatch(fetchInjuriesByTeam({ team: selectedTeam._id }));
        // Load players from selected team
        dispatch(fetchJugadoresEquipo({ team: selectedTeam._id }));
      }
    }
  }, [equipos, dispatch]);

  const openCreateModal = () => {
    const selectedTeam = equipos?.find(team => team.seleccionado === true);
    if (!selectedTeam) {
      Alert.alert(t('message.error'), t('season.noActiveSeason'));
      return;
    }
    setEditMode(false);
    setSelectedInjury(null);
    setFormData({
      jugador: '',
      zona: { label: '', value: '' },
      tipo: { label: '', value: '' },
      fechaInicio: '',
      fechaInicioDate: null,
      fechaFin: '',
      fechaFinDate: null,
      fechaFinPrevista: '',
      fechaFinPrevistaDate: null,
      recaida: false,
      lesionEspecifica: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (injury) => {
    setEditMode(true);
    setSelectedInjury(injury);
    const fechaInicioDate = injury.fechaInicio ? new Date(injury.fechaInicio) : null;
    const fechaFinDate = injury.fechaFin ? new Date(injury.fechaFin) : null;
    const fechaFinPrevistaDate = injury.fechaFinPrevista ? new Date(injury.fechaFinPrevista) : null;
    setFormData({
      jugador: injury.jugador?._id || injury.jugador || '',
      zona: injury.zona || { label: '', value: '' },
      tipo: injury.tipo || { label: '', value: '' },
      fechaInicio: injury.fechaInicio ? injury.fechaInicio.split('T')[0] : '',
      fechaInicioDate: fechaInicioDate,
      fechaFin: injury.fechaFin ? injury.fechaFin.split('T')[0] : '',
      fechaFinDate: fechaFinDate,
      fechaFinPrevista: injury.fechaFinPrevista ? injury.fechaFinPrevista.split('T')[0] : '',
      fechaFinPrevistaDate: fechaFinPrevistaDate,
      recaida: injury.recaida || false,
      lesionEspecifica: injury.lesionEspecifica || '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setShowPlayerSelector(false);
    setShowZoneSelector(false);
    setShowTypeSelector(false);
    setDatePickerVisibleStart(false);
    setDatePickerVisibleEnd(false);
    setDatePickerVisibleEndPrevista(false);
  };

  const clearStartDate = () => {
    setFormData({ ...formData, fechaInicio: '', fechaInicioDate: null });
  };

  const clearEndDate = () => {
    setFormData({ ...formData, fechaFin: '', fechaFinDate: null });
  };

  const clearEstimatedEndDate = () => {
    setFormData({ ...formData, fechaFinPrevista: '', fechaFinPrevistaDate: null });
  };

  const handleSubmit = async () => {
    const missing = [];
    if (!formData.jugador) missing.push(t('player.player'));
    if (!formData.zona.value) missing.push(t('injury.zone'));
    if (!formData.tipo.value) missing.push(t('injury.type'));
    if (!formData.fechaInicio) missing.push(t('injury.startDate'));
    if (missing.length > 0) {
      Alert.alert(t('message.error'), t('message.missingFields', { fields: missing.join(', ') }));
      return;
    }

    // Validar que la fecha de fin sea posterior a la fecha de inicio
    if (formData.fechaFinDate && formData.fechaInicioDate && formData.fechaFinDate <= formData.fechaInicioDate) {
      Alert.alert(t('message.error'), t('injury.endDateAfterStart'));
      return;
    }

    // Validar que la fecha fin prevista sea posterior a la fecha de inicio
    if (formData.fechaFinPrevistaDate && formData.fechaInicioDate && formData.fechaFinPrevistaDate <= formData.fechaInicioDate) {
      Alert.alert(t('message.error'), t('injury.estimatedEndDateAfterStart'));
      return;
    }

    try {
      const injuryData = {
        jugador: formData.jugador,
        zona: formData.zona,
        tipo: formData.tipo,
        fechaInicio: new Date(formData.fechaInicio).toISOString(),
        fechaFin: formData.fechaFin ? new Date(formData.fechaFin).toISOString() : null,
        fechaFinPrevista: formData.fechaFinPrevista ? new Date(formData.fechaFinPrevista).toISOString() : null,
        recaida: formData.recaida,
        lesionEspecifica: formData.lesionEspecifica,
      };

      if (editMode && selectedInjury) {
        await dispatch(updateInjury({ id: selectedInjury._id, data: injuryData }));
        Alert.alert(t('message.success'), t('injury.editInjurySuccess'));
      } else {
        await dispatch(createInjury(injuryData));
        Alert.alert(t('message.success'), t('injury.addInjurySuccess'));
      }
      closeModal();
      const selectedTeam = equipos?.find(team => team.seleccionado === true);
      if (selectedTeam?._id) {
        dispatch(fetchInjuriesByTeam({ team: selectedTeam._id }));
      }
    } catch (error) {
      Alert.alert(t('message.error'), t('injury.addInjuryError'));
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      t('injury.confirmDelete'),
      t('injury.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteInjury(id));
              Alert.alert(t('message.success'), t('edition.deleteSuccess'));
              const selectedTeam = equipos?.find(team => team.seleccionado === true);
              if (selectedTeam?._id) {
                dispatch(fetchInjuriesByTeam({ team: selectedTeam._id }));
              }
            } catch (error) {
              Alert.alert(t('message.error'), t('injury.deleteInjuryError'));
            }
          },
        },
      ]
    );
  };

  const getPlayerName = (playerId) => {
    const player = jugadores?.find(p => p._id === playerId);
    if (player) {
      return getPlayerFullName(player);
    }
    // If playerId is an object, try to extract the name directly
    if (typeof playerId === 'object' && playerId !== null) {
      return getPlayerFullName(playerId) || t('injury.unknownPlayer');
    }
    return t('injury.unknownPlayer');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getInjuryStatus = (injury) => {
    if (!injury.fechaFin) return { label: t('injury.statuses.activa'), value: 'activa', color: '#ef4444' };
    const endDate = new Date(injury.fechaFin);
    const today = new Date();
    if (endDate > today) return { label: t('injury.statuses.recuperacion'), value: 'recuperacion', color: '#f59e0b' };
    return { label: t('injury.statuses.recuperado'), value: 'recuperado', color: '#10b981' };
  };

  const getInjuryDuration = (injury) => {
    if (!injury.fechaInicio) return { label: t('common.noData'), value: 'sin-datos' };

    // If no end date, duration is unknown
    if (!injury.fechaFin) return { label: t('injury.duration.ongoing'), value: 'en-curso' };

    const startDate = new Date(injury.fechaInicio);
    const endDate = new Date(injury.fechaFin);

    // Calculate difference in milliseconds
    const diffTime = Math.abs(endDate - startDate);
    // Convert to days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Calculate months (approximating 30 days per month)
    const diffMonths = diffDays / 30;

    if (diffMonths < 1) {
      return { label: t('injury.duration.lessThanMonth'), value: 'corta', days: diffDays };
    } else {
      return { label: t('injury.duration.months', { count: Math.round(diffMonths) }), value: 'larga', days: diffDays };
    }
  };

  const getPlayerPosition = (playerId) => {
    const player = jugadores?.find(p => p._id === (playerId?._id || playerId));
    return player?.posicion || '';
  };

  const getFilteredInjuries = () => {
    if (!injuries) return [];

    let result = injuries.filter(injury => {
      // Search by player name
      if (searchQuery) {
        const playerName = getPlayerName(injury.jugador).toLowerCase();
        if (!playerName.includes(searchQuery.toLowerCase())) {
          return false;
        }
      }

      // Filter by position
      if (selectedPositions.length > 0) {
        const playerPosition = getPlayerPosition(injury.jugador);
        if (!selectedPositions.includes(playerPosition)) {
          return false;
        }
      }

      // Filter by status
      if (selectedStatuses.length > 0) {
        const status = getInjuryStatus(injury);
        if (!selectedStatuses.includes(status.value)) {
          return false;
        }
      }

      // Filter by start date range
      if (startDateFilter || endDateFilter) {
        const injuryStartDate = new Date(injury.fechaInicio);
        const startFilter = startDateFilter ? new Date(startDateFilter) : null;
        const endFilter = endDateFilter ? new Date(endDateFilter) : null;

        if (startFilter && injuryStartDate < startFilter) {
          return false;
        }
        if (endFilter && injuryStartDate > endFilter) {
          return false;
        }
      }

      return true;
    });

    // Sort by duration
    if (sortByDuration) {
      result = [...result].sort((a, b) => {
        const durationA = getInjuryDuration(a);
        const durationB = getInjuryDuration(b);
        // Injuries without end date (ongoing) go to end
        const daysA = durationA.days != null ? durationA.days : (sortByDuration === 'asc' ? Infinity : -Infinity);
        const daysB = durationB.days != null ? durationB.days : (sortByDuration === 'asc' ? Infinity : -Infinity);
        return sortByDuration === 'asc' ? daysA - daysB : daysB - daysA;
      });
    }

    return result;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPositions([]);
    setSelectedStatuses([]);
    setStartDateFilter(null);
    setEndDateFilter(null);
    setSortByDuration('');
    // Mantener el equipo seleccionado
  };

  const togglePositionFilter = (position) => {
    setSelectedPositions(prev =>
      prev.includes(position)
        ? prev.filter(p => p !== position)
        : [...prev, position]
    );
  };

  const toggleStatusFilter = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  if (loading && injuries.length === 0) {
    return (
      <AppLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('injury.loading')}</Text>
        </View>
      </AppLayout>
    );
  }

  // Si no hay equipo seleccionado
  const selectedTeamForCheck = equipos?.find(team => team.seleccionado === true);
  if (!selectedTeamForCheck) {
    return (
      <AppLayout>
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateCard}>
            <Ionicons name="people-circle-outline" size={64} color={theme.colors.border} />
            <Text style={styles.emptyStateTitle}>{t('injury.noTeam')}</Text>
            <Text style={styles.emptyStateSubtitle}>
              {t('injury.noTeamSubtitle')}
            </Text>
          </View>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <KeyboardAwareScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header con Gradiente */}
        <View style={styles.headerSection}>
          <LinearGradient
            colors={['#1a237e', '#3949ab', '#5c6bc0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <MaterialIcons name="medical-services" size={24} color="#fff" />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerTitle}>{t('injury.management')}</Text>
                  <Text style={styles.headerSubtitle}>
                    {getFilteredInjuries().length || 0} {getFilteredInjuries().length === 1 ? t('injury.injury_one') : t('injury.injury_other')}
                    {getFilteredInjuries().length !== injuries?.length && ` ${t('common.of')} ${injuries?.length || 0} ${t('common.total')}`}
                    {(() => {
                      const selectedTeam = equipos?.find(t => t.seleccionado === true);
                      return selectedTeam ? ` • ${selectedTeam.nombre}` : '';
                    })()}
                  </Text>
                </View>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity style={styles.addButton} onPress={openCreateModal} activeOpacity={0.7}>
                  <Ionicons name="add" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Injuries List */}
        <View style={styles.sectionContainer}>
          {/* Filters Section - Estilo como jugadores.js */}
          <View style={styles.filtersSection}>
            <View style={styles.filterBarRow}>
              <View style={styles.searchBarContainer}>
                <Ionicons name="search" size={18} color={theme.colors.textMuted} />
                <TextInput
                  style={styles.searchBarInput}
                  placeholder={t('injury.playerNamePlaceholder')}
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.filterToggleBtn}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Ionicons name="filter" size={isMobileDevice() ? 18 : 20} color={theme.colors.primary} />
                <Text style={styles.filterToggleBtnText}>{t('injury.filters')}</Text>
                {(selectedPositions.length > 0 || selectedStatuses.length > 0 || startDateFilter || endDateFilter || sortByDuration) && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {(selectedPositions.length > 0 ? 1 : 0) + (selectedStatuses.length > 0 ? 1 : 0) + (startDateFilter || endDateFilter ? 1 : 0) + (sortByDuration ? 1 : 0)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {showFilters && (
              <View style={styles.chipFiltersPanel}>
                {/* Filtro por posición - chips horizontales */}
                <View style={styles.chipFilterSection}>
                  <Text style={styles.chipFilterLabel}>{t('injury.position')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    <TouchableOpacity
                      style={[styles.chipFilterItem, selectedPositions.length === 0 && styles.chipFilterItemActive]}
                      onPress={() => setSelectedPositions([])}
                    >
                      <Text style={[styles.chipFilterItemText, selectedPositions.length === 0 && styles.chipFilterItemTextActive]}>
                        {t('injury.allPositions')}
                      </Text>
                    </TouchableOpacity>
                    {positionOptions.map((option) => {
                      const isActive = selectedPositions.includes(option.value);
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.chipFilterItem, isActive && styles.chipFilterItemActive]}
                          onPress={() => togglePositionFilter(option.value)}
                        >
                          <Text style={[styles.chipFilterItemText, isActive && styles.chipFilterItemTextActive]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Filtro por estado - chips horizontales */}
                <View style={styles.chipFilterSection}>
                  <Text style={styles.chipFilterLabel}>{t('injury.status')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    <TouchableOpacity
                      style={[styles.chipFilterItem, selectedStatuses.length === 0 && styles.chipFilterItemActive]}
                      onPress={() => setSelectedStatuses([])}
                    >
                      <Text style={[styles.chipFilterItemText, selectedStatuses.length === 0 && styles.chipFilterItemTextActive]}>
                        {t('injury.allStatuses')}
                      </Text>
                    </TouchableOpacity>
                    {statusOptions.map((option) => {
                      const isActive = selectedStatuses.includes(option.value);
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.chipFilterItem,
                            isActive && styles.chipFilterItemActive,
                            isActive && option.color && { backgroundColor: option.color, borderColor: option.color }
                          ]}
                          onPress={() => toggleStatusFilter(option.value)}
                        >
                          <View style={[styles.statusDot, { backgroundColor: option.color || theme.colors.textSecondary }]} />
                          <Text style={[styles.chipFilterItemText, isActive && styles.chipFilterItemTextActive]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Filtro por fecha */}
                <View style={styles.chipFilterSection}>
                  <Text style={styles.chipFilterLabel}>{t('injury.injuryStartDate')}</Text>
                  <View style={styles.dateChipRow}>
                    <TouchableOpacity
                      style={styles.dateChipBtn}
                      onPress={() => { setDateFilterType('start'); setDateFilterVisible(true); }}
                    >
                      <MaterialIcons name="calendar-today" size={16} color={theme.colors.primary} />
                      <Text style={startDateFilter ? styles.dateChipText : styles.dateChipPlaceholder}>
                        {startDateFilter
                          ? new Date(startDateFilter).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' })
                          : t('injury.from')
                        }
                      </Text>
                      {startDateFilter && (
                        <TouchableOpacity onPress={() => setStartDateFilter(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                    <Ionicons name="arrow-forward" size={14} color={theme.colors.border} />
                    <TouchableOpacity
                      style={styles.dateChipBtn}
                      onPress={() => { setDateFilterType('end'); setDateFilterVisible(true); }}
                    >
                      <MaterialIcons name="calendar-today" size={16} color={theme.colors.primary} />
                      <Text style={endDateFilter ? styles.dateChipText : styles.dateChipPlaceholder}>
                        {endDateFilter
                          ? new Date(endDateFilter).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' })
                          : t('injury.to')
                        }
                      </Text>
                      {endDateFilter && (
                        <TouchableOpacity onPress={() => setEndDateFilter(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Ordenar por duración - chips horizontales */}
                <View style={styles.chipFilterSection}>
                  <Text style={styles.chipFilterLabel}>{t('injury.sortByDuration')}</Text>
                  <View style={styles.chipFilterRow}>
                    <TouchableOpacity
                      style={[styles.chipFilterItem, !sortByDuration && styles.chipFilterItemActive]}
                      onPress={() => setSortByDuration('')}
                    >
                      <Text style={[styles.chipFilterItemText, !sortByDuration && styles.chipFilterItemTextActive]}>
                        {t('injury.durationDefault')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chipFilterItem, sortByDuration === 'asc' && styles.chipFilterItemActive]}
                      onPress={() => setSortByDuration(sortByDuration === 'asc' ? '' : 'asc')}
                    >
                      <Ionicons name="arrow-up" size={14} color={sortByDuration === 'asc' ? '#fff' : theme.colors.primary} />
                      <Text style={[styles.chipFilterItemText, sortByDuration === 'asc' && styles.chipFilterItemTextActive]}>
                        {t('injury.durationShortest')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chipFilterItem, sortByDuration === 'desc' && styles.chipFilterItemActive]}
                      onPress={() => setSortByDuration(sortByDuration === 'desc' ? '' : 'desc')}
                    >
                      <Ionicons name="arrow-down" size={14} color={sortByDuration === 'desc' ? '#fff' : theme.colors.primary} />
                      <Text style={[styles.chipFilterItemText, sortByDuration === 'desc' && styles.chipFilterItemTextActive]}>
                        {t('injury.durationLongest')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Limpiar filtros + contador resultados */}
                <View style={styles.chipFilterFooter}>
                  <Text style={styles.chipFilterResultsText}>
                    {getFilteredInjuries().length} {getFilteredInjuries().length === 1 ? t('injury.injury_one') : t('injury.injury_other')}
                  </Text>
                  {(searchQuery || selectedPositions.length > 0 || selectedStatuses.length > 0 || startDateFilter || endDateFilter || sortByDuration) && (
                    <TouchableOpacity style={styles.chipClearFiltersBtn} onPress={clearFilters}>
                      <MaterialIcons name="clear" size={18} color={theme.colors.textSecondary} />
                      <Text style={styles.chipClearFiltersBtnText}>{t('injury.clearFilters')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
          {getFilteredInjuries() && getFilteredInjuries().length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyStateCard}>
                <MaterialIcons name="medical-services" size={64} color={theme.colors.border} />
                <Text style={styles.emptyStateTitle}>
                  {injuries?.length === 0 ? t('injury.noInjuries') : t('injury.noResults')}
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  {injuries?.length === 0
                    ? t('injury.startRegistering')
                    : t('injury.adjustFilters')
                  }
                </Text>
                {injuries?.length > 0 && (
                  <TouchableOpacity style={styles.emptyStateButton} onPress={clearFilters}>
                    <Ionicons name="refresh" size={20} color="#ffffff" />
                    <Text style={styles.emptyStateButtonText}>{t('injury.clearFilters')}</Text>
                  </TouchableOpacity>
                )}
                {injuries?.length === 0 && (
                  <TouchableOpacity style={styles.emptyStateButton} onPress={openCreateModal}>
                    <Ionicons name="add-circle" size={20} color="#ffffff" />
                    <Text style={styles.emptyStateButtonText}>{t('injury.registerInjury')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.injuriesList}>
              {getFilteredInjuries()?.map(injury => {
                const status = getInjuryStatus(injury);
                const posColor = getPositionColor(getPlayerPosition(injury.jugador));
                return (
                  <TouchableOpacity
                    key={injury._id}
                    style={styles.injuryCard}
                    onPress={() => openEditModal(injury)}
                  >
                    <LinearGradient colors={posColor} style={styles.injuryCardColorBar} />
                    <View style={styles.injuryCardInner}>
                      <View style={styles.injuryCardHeader}>
                        <View style={styles.injuryCardLeft}>
                          <View style={styles.injuryCardPlayerRow}>
                            <View style={[styles.injuryPlayerAvatar, { backgroundColor: posColor[0] + '20' }]}>
                              <Ionicons name="person" size={isMobileDevice() ? 18 : 20} color={posColor[1]} />
                            </View>
                            <View style={styles.injuryPlayerInfo}>
                              <Text style={styles.playerName}>{getPlayerName(injury.jugador)}</Text>
                              <View style={styles.injuryPlayerTags}>
                                <View style={[styles.positionTag, { backgroundColor: posColor[0] + '20' }]}>
                                  <Text style={[styles.positionTagText, { color: posColor[1] }]}>
                                    {getPlayerPosition(injury.jugador) ?
                                      positionOptions.find(p => p.value === getPlayerPosition(injury.jugador))?.label ||
                                      getPlayerPosition(injury.jugador) :
                                      t('injury.unspecifiedPosition')
                                    }
                                  </Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                                  <Text style={styles.statusText}>{status.label}</Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDelete(injury._id);
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>

                    <View style={styles.injuryDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="body" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.detailLabel}>{t('injury.zone')}:</Text>
                        <Text style={styles.detailValue}>{injury.zona?.value ? t('injury.zones.' + injury.zona.value, injury.zona.label) : '-'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <MaterialIcons name="healing" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.detailLabel}>{t('injury.type')}:</Text>
                        <Text style={styles.detailValue}>{injury.tipo?.value ? t('injury.types.' + injury.tipo.value, injury.tipo.label) : '-'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
                        <Text style={styles.detailLabel}>{t('injury.durationLabel')}:</Text>
                        <Text style={styles.detailValue}>
                          {getInjuryDuration(injury).label}
                          {getInjuryDuration(injury).days ? ` (${getInjuryDuration(injury).days} ${t('injury.days')})` : ''}
                        </Text>
                      </View>
                      {injury.lesionEspecifica && (
                        <View style={styles.detailRow}>
                          <Ionicons name="information-circle" size={16} color={theme.colors.textSecondary} />
                          <Text style={styles.detailLabel}>{t('injury.details')}:</Text>
                          <Text style={styles.detailValue}>{injury.lesionEspecifica}</Text>
                        </View>
                      )}
                      <View style={styles.dateRow}>
                        <View style={styles.dateItem}>
                          <Text style={styles.dateLabel}>{t('injury.start')}</Text>
                          <Text style={styles.dateValue}>{formatDate(injury.fechaInicio)}</Text>
                        </View>
                        {injury.fechaFinPrevista && (
                          <>
                            <Ionicons name="arrow-forward" size={16} color={theme.colors.border} />
                            <View style={styles.dateItem}>
                              <Text style={[styles.dateLabel, { color: theme.colors.warning }]}>{t('injury.estimatedEnd')}</Text>
                              <Text style={styles.dateValue}>{formatDate(injury.fechaFinPrevista)}</Text>
                            </View>
                          </>
                        )}
                        {injury.fechaFin && (
                          <>
                            <Ionicons name="arrow-forward" size={16} color={theme.colors.border} />
                            <View style={styles.dateItem}>
                              <Text style={[styles.dateLabel, { color: theme.colors.success }]}>{t('injury.actualEnd')}</Text>
                              <Text style={styles.dateValue}>{formatDate(injury.fechaFin)}</Text>
                            </View>
                          </>
                        )}
                        {!injury.fechaFinPrevista && !injury.fechaFin && (
                          <>
                            <Ionicons name="arrow-forward" size={16} color={theme.colors.border} />
                            <View style={styles.dateItem}>
                              <Text style={styles.dateLabel}>{t('injury.endEstimated')}</Text>
                              <Text style={styles.dateValue}>-</Text>
                            </View>
                          </>
                        )}
                      </View>
                      {injury.recaida && (
                        <View style={styles.relapseBadge}>
                          <Ionicons name="warning" size={14} color={theme.colors.warning} />
                          <Text style={styles.relapseText}>{t('injury.relapse')}</Text>
                        </View>
                      )}
                    </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Create/Edit Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editMode ? t('injury.editInjury') : t('injury.registerInjuryTitle')}
                </Text>
                <TouchableOpacity onPress={closeModal} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <KeyboardAwareScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Player Selector */}
                <Text style={styles.inputLabel}>{t('injury.playerRequired')}</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowPlayerSelector(!showPlayerSelector)}
                >
<Text style={formData.jugador ? styles.selectInputText : styles.selectInputPlaceholder}>
                    {formData.jugador
                      ? (() => {
                        const player = jugadores?.find(p => p._id === formData.jugador);
                        return player ? getPlayerFullName(player) : t('injury.selectPlayer');
                      })()
                      : t('injury.selectPlayer')}
                  </Text>
                  <Ionicons name={showPlayerSelector ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {showPlayerSelector && (
                  <View style={styles.optionsContainer}>
                    <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
                      {jugadores?.map((player) => (
                        <TouchableOpacity
                          key={player._id}
                          style={[
                            styles.option,
                            formData.jugador === player._id && styles.optionSelected
                          ]}
                          onPress={() => {
                            setFormData({ ...formData, jugador: player._id });
                            setShowPlayerSelector(false);
                          }}
                        >
<Text style={[
                            styles.optionText,
                            formData.jugador === player._id && styles.optionTextSelected
                          ]}>
                            {getPlayerFullName(player)}
                          </Text>
                          {formData.jugador === player._id && (
                            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Zone Selector */}
                <Text style={styles.inputLabel}>{t('injury.bodyZoneRequired')}</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowZoneSelector(!showZoneSelector)}
                >
                  <Text style={formData.zona.value ? styles.selectInputText : styles.selectInputPlaceholder}>
                    {formData.zona.value ? t('injury.zones.' + formData.zona.value, formData.zona.label) : t('injury.selectZone')}
                  </Text>
                  <Ionicons name={showZoneSelector ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {showZoneSelector && (
                  <View style={styles.optionsContainer}>
                    <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
                      {zoneOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.option,
                            formData.zona.value === option.value && styles.optionSelected
                          ]}
                          onPress={() => {
                            setFormData({ ...formData, zona: option });
                            setShowZoneSelector(false);
                          }}
                        >
                          <Text style={[
                            styles.optionText,
                            formData.zona.value === option.value && styles.optionTextSelected
                          ]}>
                            {option.label}
                          </Text>
                          {formData.zona.value === option.value && (
                            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Type Selector */}
                <Text style={styles.inputLabel}>{t('injury.injuryTypeRequired')}</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowTypeSelector(!showTypeSelector)}
                >
                  <Text style={formData.tipo.value ? styles.selectInputText : styles.selectInputPlaceholder}>
                    {formData.tipo.value ? t('injury.types.' + formData.tipo.value, formData.tipo.label) : t('injury.selectType')}
                  </Text>
                  <Ionicons name={showTypeSelector ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {showTypeSelector && (
                  <View style={styles.optionsContainer}>
                    <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
                      {typeOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.option,
                            formData.tipo.value === option.value && styles.optionSelected
                          ]}
                          onPress={() => {
                            setFormData({ ...formData, tipo: option });
                            setShowTypeSelector(false);
                          }}
                        >
                          <Text style={[
                            styles.optionText,
                            formData.tipo.value === option.value && styles.optionTextSelected
                          ]}>
                            {option.label}
                          </Text>
                          {formData.tipo.value === option.value && (
                            <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Specific Injury Details */}
                <Text style={styles.inputLabel}>{t('injury.specificDetails')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('injury.example')}
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  value={formData.lesionEspecifica}
                  onChangeText={(text) => setFormData({ ...formData, lesionEspecifica: text })}
                  multiline
                  numberOfLines={3}
                />

                {/* Start Date */}
                <Text style={styles.inputLabel}>{t('injury.startDateRequired')}</Text>
                <View style={styles.datePickerContainer}>
                  <TouchableOpacity
                    style={[styles.datePickerButton, { flex: 0.8 }]}
                    onPress={() => setDatePickerVisibleStart(true)}
                  >
                    <View style={styles.datePickerContent}>
                      <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
                      <Text style={formData.fechaInicioDate ? styles.datePickerText : styles.datePickerPlaceholder}>
                        {formData.fechaInicioDate
                          ? formData.fechaInicioDate.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                          : t('injury.selectStartDate')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  {formData.fechaInicioDate && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={clearStartDate}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* End Date */}
                <Text style={styles.inputLabel}>{t('injury.endDateOptional')}</Text>
                <View style={styles.datePickerContainer}>
                  <TouchableOpacity
                    style={[styles.datePickerButton, { flex: 0.8 }]}
                    onPress={() => setDatePickerVisibleEnd(true)}
                  >
                    <View style={styles.datePickerContent}>
                      <MaterialIcons name="calendar-today" size={20} color={theme.colors.primary} />
                      <Text style={formData.fechaFinDate ? styles.datePickerText : styles.datePickerPlaceholder}>
                        {formData.fechaFinDate
                          ? formData.fechaFinDate.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                          : t('injury.selectEndDateOptional')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  {formData.fechaFinDate && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={clearEndDate}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Estimated End Date */}
                <Text style={styles.inputLabel}>{t('injury.estimatedEndDateOptional')}</Text>
                <View style={styles.datePickerContainer}>
                <View style={styles.datePickerContainer}>
                  <TouchableOpacity
                    style={[styles.datePickerButton, { flex: 0.8 }]}
                    onPress={() => setDatePickerVisibleEndPrevista(true)}
                  >
                    <View style={styles.datePickerContent}>
                      <MaterialIcons name="schedule" size={20} color={theme.colors.warning} />
                      <Text style={formData.fechaFinPrevistaDate ? styles.datePickerText : styles.datePickerPlaceholder}>
                        {formData.fechaFinPrevistaDate
                          ? formData.fechaFinPrevistaDate.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })
                          : t('injury.selectEstimatedEndDateOptional')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  {formData.fechaFinPrevistaDate && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={clearEstimatedEndDate}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
                </View>

                {/* Relapse Checkbox */}
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setFormData({ ...formData, recaida: !formData.recaida })}
                >
                  <View style={[styles.checkbox, formData.recaida && styles.checkboxChecked]}>
                    {formData.recaida && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                  </View>
                  <Text style={styles.checkboxLabel}> {t('injury.isRelapse')}</Text>
                </TouchableOpacity>
              </KeyboardAwareScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={closeModal}>
                  <Text style={styles.modalCancelText}>{t('injury.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={handleSubmit}>
                  <Text style={styles.modalConfirmText}>
                    {editMode ? t('injury.update') : t('injury.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* DateTimePicker modals */}
            <DateTimePickerModal
              isVisible={datePickerVisibleStart}
              mode="date"
              date={formData.fechaInicioDate || new Date()}
              onConfirm={(date) => {
                const formattedDate = date.toISOString().split('T')[0];
                setFormData({ ...formData, fechaInicio: formattedDate, fechaInicioDate: date });
                setDatePickerVisibleStart(false);
              }}
              onCancel={() => setDatePickerVisibleStart(false)}
              locale={i18n.language === 'es' ? 'es-ES' : 'en-US'}
              confirmTextIOS={t('common.confirm')}
              cancelTextIOS={t('common.cancel')}
              headerTextIOS={t('injury.selectStartDateHeader')}
            />

            <DateTimePickerModal
              isVisible={datePickerVisibleEnd}
              mode="date"
              date={formData.fechaFinDate || (formData.fechaInicioDate ? new Date(formData.fechaInicioDate.getTime() + 24 * 60 * 60 * 1000) : new Date())}
              minimumDate={formData.fechaInicioDate ? new Date(formData.fechaInicioDate.getTime() + 24 * 60 * 60 * 1000) : undefined}
              onConfirm={(date) => {
                // Validar que la fecha de fin sea mayor a la fecha de inicio
                if (formData.fechaInicioDate && date <= formData.fechaInicioDate) {
                  Alert.alert(
                    t('message.error'),
                    t('injury.endDateAfterStart')
                  );
                  return;
                }
                const formattedDate = date.toISOString().split('T')[0];
                setFormData({ ...formData, fechaFin: formattedDate, fechaFinDate: date });
                setDatePickerVisibleEnd(false);
              }}
              onCancel={() => setDatePickerVisibleEnd(false)}
              locale={i18n.language === 'es' ? 'es-ES' : 'en-US'}
              confirmTextIOS={t('common.confirm')}
              cancelTextIOS={t('common.cancel')}
              headerTextIOS={t('injury.selectEndDateHeader')}
            />

            <DateTimePickerModal
              isVisible={datePickerVisibleEndPrevista}
              mode="date"
              date={formData.fechaFinPrevistaDate || (formData.fechaInicioDate ? new Date(formData.fechaInicioDate.getTime() + 7 * 24 * 60 * 60 * 1000) : new Date())}
              minimumDate={formData.fechaInicioDate ? new Date(formData.fechaInicioDate.getTime() + 24 * 60 * 60 * 1000) : undefined}
              onConfirm={(date) => {
                // Validar que la fecha fin prevista sea mayor a la fecha de inicio
                if (formData.fechaInicioDate && date <= formData.fechaInicioDate) {
                  Alert.alert(
                    t('message.error'),
                    t('injury.estimatedEndDateAfterStart')
                  );
                  return;
                }
                const formattedDate = date.toISOString().split('T')[0];
                setFormData({ ...formData, fechaFinPrevista: formattedDate, fechaFinPrevistaDate: date });
                setDatePickerVisibleEndPrevista(false);
              }}
              onCancel={() => setDatePickerVisibleEndPrevista(false)}
              locale={i18n.language === 'es' ? 'es-ES' : 'en-US'}
              confirmTextIOS={t('common.confirm')}
              cancelTextIOS={t('common.cancel')}
              headerTextIOS={t('injury.selectEstimatedEndDateHeader')}
            />

          </View>
        </Modal>

        {/* Date filter picker */}
        <DateTimePickerModal
          isVisible={dateFilterVisible}
          mode="date"
          date={
            dateFilterType === 'start'
              ? (startDateFilter ? new Date(startDateFilter) : new Date())
              : (endDateFilter ? new Date(endDateFilter) : new Date())
          }
          minimumDate={dateFilterType === 'end' && startDateFilter ? new Date(startDateFilter) : undefined}
          onConfirm={(date) => {
            const formattedDate = date.toISOString().split('T')[0];
            if (dateFilterType === 'start') {
              setStartDateFilter(formattedDate);
              // Si hay una fecha "hasta" anterior, la limpiamos
              if (endDateFilter && new Date(formattedDate) > new Date(endDateFilter)) {
                setEndDateFilter(null);
              }
            } else {
              // Validar que la fecha "hasta" no sea anterior a "desde"
              if (startDateFilter && new Date(formattedDate) < new Date(startDateFilter)) {
                Alert.alert(
                  t('injury.invalidDateRange'),
                  t('injury.endDateBeforeStart')
                );
                return;
              }
              setEndDateFilter(formattedDate);
            }
            setDateFilterVisible(false);
            setDateFilterType(null);
          }}
          onCancel={() => {
            setDateFilterVisible(false);
            setDateFilterType(null);
          }}
          locale={i18n.language === 'es' ? 'es-ES' : 'en-US'}
          confirmTextIOS={t('common.confirm')}
          cancelTextIOS={t('common.cancel')}
          headerTextIOS={dateFilterType === 'start' ? t('injury.dateFrom') : t('injury.dateTo')}
        />
      </KeyboardAwareScrollView>
    </AppLayout>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  headerSection: {
    marginBottom: isMobileDevice() ? 20 : 24,
    marginTop: isMobileDevice() ? 12 : 16,
  },
  headerGradient: {
    borderRadius: 20,
    marginHorizontal: isMobileDevice() ? 12 : 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobileDevice() ? 18 : 22,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  headerTitle: {
    fontSize: isMobileDevice() ? 20 : 22,
    color: '#ffffff',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: isMobileDevice() ? 13 : 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statsButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  emptyStateContainer: {
    paddingHorizontal: 16,
  },
  emptyStateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  injuriesList: {
    paddingHorizontal: 16,
  },
  injuryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 14 : 16,
    padding: isMobileDevice() ? 12 : 18,
    paddingLeft: isMobileDevice() ? 16 : 22,
    marginBottom: isMobileDevice() ? 10 : 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  injuryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  injuryCardLeft: {
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: isMobileDevice() ? 7 : 10,
    paddingVertical: isMobileDevice() ? 3 : 5,
    borderRadius: 8,
    marginBottom: 10,
    minHeight: isMobileDevice() ? 22 : 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#ffffff',
    fontSize: isMobileDevice() ? 10 : 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playerName: {
    fontSize: isMobileDevice() ? 15 : 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.errorSoft,
  },
  injuryDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: isMobileDevice() ? 'flex-start' : 'center',
    gap: isMobileDevice() ? 6 : 10,
  },
  detailLabel: {
    fontSize: isMobileDevice() ? 12 : 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: isMobileDevice() ? 12 : 14,
    color: theme.colors.text,
    fontWeight: '600',
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: isMobileDevice() ? 8 : 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexWrap: isMobileDevice() ? 'wrap' : 'nowrap',
    gap: isMobileDevice() ? 4 : 0,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  relapseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  relapseText: {
    fontSize: 12,
    color: theme.colors.warningSoftText,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 10 : 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobileDevice() ? 16 : 20,
    width: '100%',
    maxWidth: isMobileDevice() ? 400 : 500,
    maxHeight: isMobileDevice() ? '95%' : '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isMobileDevice() ? 16 : 20,
    paddingVertical: isMobileDevice() ? 14 : 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: isMobileDevice() ? 16 : 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: isMobileDevice() ? 16 : 20,
    maxHeight: isMobileDevice() ? 400 : 500,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectInputText: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  selectInputPlaceholder: {
    fontSize: 14,
    color: theme.colors.inputPlaceholder,
    flex: 1,
  },
  optionsContainer: {
    maxHeight: 180,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionsScroll: {
    maxHeight: 180,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionSelected: {
    backgroundColor: theme.colors.primarySoft,
  },
  optionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: theme.colors.primarySoftText,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  datePickerButton: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  datePickerText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  datePickerPlaceholder: {
    fontSize: 14,
    color: theme.colors.inputPlaceholder,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearDateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: theme.colors.errorSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Filter styles
  filtersSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filtersToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  filtersContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  multiSelectButton: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  multiSelectText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  multiSelectPlaceholder: {
    fontSize: 14,
    color: theme.colors.inputPlaceholder,
  },
  multiSelectOptions: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 8,
    maxHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  multiSelectScroll: {
    maxHeight: 150,
  },
  multiSelectOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  multiSelectOptionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateFilterButton: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dateFilterText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  dateFilterPlaceholder: {
    fontSize: 14,
    color: theme.colors.inputPlaceholder,
  },
  dateFiltersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateFiltersColumn: {
    gap: 12,
  },
  dateFilterItem: {
    flex: 1,
  },
  dateFilterItemTablet: {
    flex: 1,
  },
  dateFilterSubLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: theme.colors.errorSoft,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 6,
  },
  clearFiltersText: {
    fontSize: 14,
    color: theme.colors.errorSoftText,
    fontWeight: '600',
  },
  durationSortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  durationSortChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  durationSortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  durationSortChipTextActive: {
    color: '#fff',
  },
  playerPosition: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  // Chip-based filter styles
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.primarySoft,
  },
  filterToggleBtnText: {
    marginLeft: 7,
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
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
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chipFiltersPanel: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  chipFilterSection: {
    gap: 6,
  },
  chipFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  chipFilterScroll: {
    flexGrow: 0,
  },
  chipFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  chipFilterItemActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipFilterItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipFilterItemTextActive: {
    color: '#fff',
  },
  chipFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipFilterFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  chipFilterResultsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  chipClearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  chipClearFiltersBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dateChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateChipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  dateChipText: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  dateChipPlaceholder: {
    fontSize: 13,
    color: theme.colors.inputPlaceholder,
  },
  // Updated injury card styles
  injuryCardColorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  injuryCardInner: {
    flex: 1,
  },
  injuryCardPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  injuryPlayerAvatar: {
    width: isMobileDevice() ? 38 : 42,
    height: isMobileDevice() ? 38 : 42,
    borderRadius: isMobileDevice() ? 19 : 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  injuryPlayerInfo: {
    flex: 1,
    gap: 4,
  },
  injuryPlayerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isMobileDevice() ? 4 : 6,
    marginTop: 2,
    alignItems: 'center',
  },
  positionTag: {
    paddingHorizontal: isMobileDevice() ? 6 : 8,
    paddingVertical: isMobileDevice() ? 3 : 4,
    borderRadius: 6,
    minHeight: isMobileDevice() ? 22 : 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionTagText: {
    fontSize: isMobileDevice() ? 10 : 11,
    fontWeight: '600',
  },
});
