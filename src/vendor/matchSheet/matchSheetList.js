// components/pages/matchSheet/matchSheetList.js
import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, Alert, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, TextInput, Platform, Switch, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/vendor/shared/appLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMatchSheetsByTeam, deleteMatchSheet, createMatchSheet, updateMatchSheet } from '@/store/slices/matchSheet/matchSheetThunks';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';
import { fetchJugadoresEquipo } from '@/store/slices/player/playerThunks';
import { fetchRivalsByTeam } from '@/store/slices/rival/rivalThunks';
import { fetchEntrenamientosPorEquipo } from '@/store/slices/session/sessionThunks';
import { fetchInjuriesByTeam } from '@/store/slices/injury/injuryThunks';
import { fetchTournamentSanctions } from '@/store/slices/tournament/tournamentThunks';
import { clearSanctions } from '@/store/slices/tournament/tournamentSlice';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useMatchSheetPDF from './useMatchSheetPDF';
import MatchSheetPDFModals, { MatchSheetPDFButtons } from './MatchSheetPDFModals';
import LineupField from './LineupField';
import LineupEditor from './LineupEditor';
import { getPlayerFullName } from '@/utils/playerHelpers';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import EditMatchSheetModal from '@/vendor/season/EditMatchSheetModal';
import MatchSheetDetailModal from '@/vendor/season/MatchSheetDetailModal';

// Mapa de ronda → clave i18n
const ROUND_I18N_KEYS = {
  final: 'tournaments.roundFinal',
  semifinal: 'tournaments.roundSemifinal',
  cuartos: 'tournaments.roundQuarters',
  octavos: 'tournaments.roundRound16',
  dieciseisavos: 'tournaments.roundRound32',
  treintaydosavos: 'tournaments.roundRound64',
};

// Constantes para las dimensiones de las tarjetas en grid
const FIELD_WIDTH_MOBILE = 120;
const FIELD_HEIGHT_MOBILE = 95;
const FIELD_WIDTH = 160;
const FIELD_HEIGHT = 115;

// Ubicaciones de partidos
// Las ubicaciones se traducirán dinámicamente usando las claves de i18n
const ubicacionesKeys = ['home', 'away', 'neutral'];

// Alineaciones importadas desde useMatchSheetForm.js (ALINEACIONES_BY_PLAYER_COUNT)
// Cada componente que necesita formaciones debe usar la cantidad de jugadores del equipo seleccionado

function normalizeFormation(value) {
  if (!value) return '';
  const v = String(value).trim();
  if (v.startsWith('1-')) return v;
  if (/^\d+-/.test(v)) return `1-${v}`;
  return v;
}

// Helper para parsear minuto string ("45+2" → 47, "60" → 60)
function parseMinuto(minuto) {
  if (typeof minuto === 'number') return minuto;
  if (typeof minuto === 'string') {
    if (minuto.includes('+')) {
      const parts = minuto.split('+');
      return (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0);
    }
    return parseInt(minuto) || 0;
  }
  return 0;
}

// Helper para ordenar eventos por minuto
function sortByMinuto(a, b) {
  return parseMinuto(a.minuto) - parseMinuto(b.minuto);
}

// REEMPLAZADO: ahora se usa MatchSheetDetailModal importado desde season/
// El componente MatchSheetDetail se eliminó y se reutiliza el modal de Temporadas

function MatchSheetCard({ matchSheet, onPress, onOpenOptions, IS_MOBILE, selectedTeam, isGrid = false }) {
  const { t } = useTranslation();
  const formatDate = (date) => {
    if (!date) return t('matchSheet.fields.noDate');
    const d = new Date(date);
    if (isGrid) {
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Check if match date/time is in the future
  const isMatchInFuture = () => {
    if (!matchSheet.fechaHora) return true;
    const matchDate = new Date(matchSheet.fechaHora);
    const now = new Date();
    return matchDate >= now;
  };

  const getResultColor = (result) => {
    // Si el partido es futuro, usar color gris/azulado para indicar pendiente
    if (isMatchInFuture() && !result) {
      return ['#818cf8', '#6366f1']; // Indigo para partidos pendientes
    }
    switch(result) {
      case 'Victoria': return ['#10b981', '#059669'];
      case 'Empate': return ['#f59e0b', '#d97706'];
      case 'Derrota': return ['#ef4444', '#dc2626'];
      default: return ['#94a3b8', '#64748b'];
    }
  };

  const getResultIcon = (result) => {
    switch(result) {
      case 'Victoria': return 'trophy';
      case 'Empate': return 'remove';
      case 'Derrota': return 'close';
      default: return 'help-circle';
    }
  };

  const getScore = () => {
    if (matchSheet.golesFavor == null || matchSheet.golesContra == null) return null;
    if (matchSheet.ubicacion === 'Casa') {
      return `${matchSheet.golesFavor} - ${matchSheet.golesContra}`;
    } else if (matchSheet.ubicacion === 'Fuera') {
      return `${matchSheet.golesContra} - ${matchSheet.golesFavor}`;
    }
    return `${matchSheet.golesFavor} - ${matchSheet.golesContra}`;
  };

  // ========== VISTA GRID - Diseño profesional compacto ==========
  if (isGrid) {
    return (
      <Pressable
        onPress={() => onPress(matchSheet)}
        style={({ pressed }) => [
          styles.gridCard,
          IS_MOBILE && styles.gridCardMobile,
          pressed && styles.gridCardPressed,
        ]}
      >
        <LinearGradient
          colors={getResultColor(matchSheet.resultado)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gridCardHeader}
        >
          {matchSheet.rivalEscudo ? (
            <Image
              source={{ uri: matchSheet.rivalEscudo }}
              style={styles.gridCardEscudo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.gridCardAvatar}>
              <Ionicons name="shield-outline" size={IS_MOBILE ? 12 : 14} color="#fff" />
            </View>
          )}
          
          {/* Icono de ubicación en esquina */}
          {matchSheet.ubicacion && (
            <View style={styles.gridCardUbicacionCorner}>
              <Ionicons 
                name={matchSheet.ubicacion === 'Casa' ? 'home' : matchSheet.ubicacion === 'Fuera' ? 'airplane' : 'location'} 
                size={10} 
                color="#fff" 
              />
            </View>
          )}
        </LinearGradient>

        <View style={styles.gridCardBody}>
          <Text style={[styles.gridCardTitle, IS_MOBILE && styles.gridCardTitleMobile]} numberOfLines={1}>
            {matchSheet.rival}
          </Text>

          {isMatchInFuture() ? (
            <View style={[styles.gridCardScoreBadge, { backgroundColor: '#eef2ff' }]}>
              <Text style={[styles.gridCardScoreText, { color: '#6366f1', fontSize: 9 }]}>
                {t('matchSheet.matchToBePlayed')}
              </Text>
            </View>
          ) : getScore() && (
            <View style={[styles.gridCardScoreBadge, { backgroundColor: getResultColor(matchSheet.resultado)[0] + '20' }]}>
              <Text style={[styles.gridCardScoreText, { color: getResultColor(matchSheet.resultado)[1] }]}>
                {getScore()}
              </Text>
            </View>
          )}

          <View style={styles.gridCardStats}>
            {matchSheet.fechaHora && (
              <View style={styles.gridCardStat}>
                <Ionicons name="calendar-outline" size={8} color="#64748b" />
                <Text style={styles.gridCardStatText}>
                  {formatDate(matchSheet.fechaHora)}{matchSheet.fase === 'eliminatoria' && matchSheet.ronda ? ` · ${t(ROUND_I18N_KEYS[matchSheet.ronda] || matchSheet.ronda)}${matchSheet.pierna === 'ida' ? ` (${t('matchSheet.fields.legFirst')})` : matchSheet.pierna === 'vuelta' ? ` (${t('matchSheet.fields.legSecond')})` : matchSheet.pierna === 'unico' ? ` (${t('matchSheet.fields.legSingle')})` : ''}` : matchSheet.jornada ? ` · J${matchSheet.jornada}` : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  // ========== VISTA LISTA - Diseño profesional horizontal ==========
  return (
    <Pressable
      onPress={() => onPress(matchSheet)}
      style={({ pressed }) => [
        styles.listCard,
        IS_MOBILE && styles.listCardMobile,
        pressed && styles.listCardPressed,
      ]}
    >
      <LinearGradient
        colors={getResultColor(matchSheet.resultado)}
        style={styles.listCardIndicator}
      />

      {matchSheet.rivalEscudo ? (
        <Image
          source={{ uri: matchSheet.rivalEscudo }}
          style={styles.listCardEscudo}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.listCardAvatar}>
          <Ionicons name="shield-outline" size={IS_MOBILE ? 20 : 24} color={getResultColor(matchSheet.resultado)[1]} />
        </View>
      )}

      <View style={styles.listCardContent}>
        <Text style={[styles.listCardTitle, IS_MOBILE && styles.listCardTitleMobile]} numberOfLines={1}>
          {matchSheet.rival}
        </Text>

        <View style={styles.listCardTags}>
          {isMatchInFuture() ? (
            <View style={[styles.listCardTag, { backgroundColor: '#eef2ff' }]}>
              <Ionicons name="time-outline" size={12} color="#6366f1" />
              <Text style={[styles.listCardTagText, { color: '#6366f1' }]}>{t('matchSheet.matchToBePlayed')}</Text>
            </View>
          ) : getScore() && (
            <View style={[styles.listCardTag, { backgroundColor: getResultColor(matchSheet.resultado)[0] + '20' }]}>
              <Ionicons name="football" size={12} color={getResultColor(matchSheet.resultado)[1]} />
              <Text style={[styles.listCardTagText, { color: getResultColor(matchSheet.resultado)[1] }]}>{getScore()}</Text>
            </View>
          )}
          {matchSheet.fechaHora && (
            <View style={styles.listCardTag}>
              <Ionicons name="calendar-outline" size={12} color="#64748b" />
              <Text style={styles.listCardTagText}>{formatDate(matchSheet.fechaHora)}</Text>
            </View>
          )}
          {(matchSheet.jornada || matchSheet.fase === 'eliminatoria') && (
            <View style={[styles.listCardTag, styles.listCardTagWarning]}>
              <Ionicons name="trophy-outline" size={12} color="#d97706" />
              <Text style={[styles.listCardTagText, { color: '#d97706' }]}>
                {matchSheet.fase === 'eliminatoria' && matchSheet.ronda
                  ? `${t(ROUND_I18N_KEYS[matchSheet.ronda] || matchSheet.ronda)}${matchSheet.pierna === 'ida' ? ` (${t('matchSheet.fields.legFirst')})` : matchSheet.pierna === 'vuelta' ? ` (${t('matchSheet.fields.legSecond')})` : matchSheet.pierna === 'unico' ? ` (${t('matchSheet.fields.legSingle')})` : ''}`
                  : matchSheet.fase === 'grupos' && matchSheet.grupo
                    ? `G${matchSheet.grupo}${matchSheet.jornada ? ` J${matchSheet.jornada}` : ''}`
                    : `J${matchSheet.jornada}`}
              </Text>
            </View>
          )}
          {matchSheet.ubicacion && (
            <View style={[styles.listCardTag, { backgroundColor: '#f3e8ff' }]}>
              <Ionicons name={matchSheet.ubicacion === 'Casa' ? 'home' : matchSheet.ubicacion === 'Fuera' ? 'airplane' : 'location'} size={12} color="#7c3aed" />
              <Text style={[styles.listCardTagText, { color: '#7c3aed' }]}>{matchSheet.ubicacion}</Text>
            </View>
          )}
          {matchSheet.torneoId && typeof matchSheet.torneoId === 'object' && matchSheet.torneoId.nombre && (
            <View style={[styles.listCardTag, { backgroundColor: (matchSheet.torneoId.color || '#F59E0B') + '20' }]}>
              <Ionicons name="trophy" size={12} color={matchSheet.torneoId.color || '#F59E0B'} />
              <Text style={[styles.listCardTagText, { color: matchSheet.torneoId.color || '#F59E0B' }]} numberOfLines={1}>
                {matchSheet.torneoId.nombre}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.listCardActions}>
        <TouchableOpacity 
          style={styles.listCardActionBtn}
          onPress={() => onPress(matchSheet)}
        >
          <Ionicons name="eye-outline" size={18} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.listCardActionBtn}
          onPress={() => onOpenOptions(matchSheet)}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

export default function MatchSheetList() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  
  // Current language for translations
  const currentLang = i18n.language?.split('-')[0] || 'es';
  
  // Ubicaciones traducidas dinámicamente
  const ubicaciones = useMemo(() => 
    ubicacionesKeys.map(key => t(`matchSheet.fields.${key}`))
  , [t]);
  
  const matchSheets = useSelector(state => state.matchSheet.matchSheets) || [];
  const loading = useSelector(state => state.matchSheet.loading);
  const teams = useSelector(state => state.team.teams) || [];
  const players = useSelector(state => state.player.players) || [];
  const temporada = useSelector(state => state.season.season);
  const trainingSessions = useSelector(state => state.session.session) || [];
  const injuries = useSelector(state => state.injury.injuries) || [];
  const sanctions = useSelector(state => state.tournament?.sanctions) || [];
  const rivals = useSelector(state => state.rival.rivals) || [];
  const dispatch = useDispatch();
  const [crearModalVisible, setCrearModalVisible] = useState(false);
  const [editingMatchSheet, setEditingMatchSheet] = useState(null);
  const [viewingMatchSheet, setViewingMatchSheet] = useState(null);
  
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedMatchSheetForOptions, setSelectedMatchSheetForOptions] = useState(null);
  
  // Estados para filtros
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filterRival, setFilterRival] = useState('');
  const [filterJornada, setFilterJornada] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [filterTorneo, setFilterTorneo] = useState('');
  const [filterResultado, setFilterResultado] = useState('');
  const [filterUbicacion, setFilterUbicacion] = useState('');
  const [sortDateOrder, setSortDateOrder] = useState('default');
  const [sortGoals, setSortGoals] = useState('');
  
  // Estado para menú móvil
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

  // Estados para creación/edición de ficha

  const { width: screenWidth } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;

  // Filtrar fichas de partido y ordenarlas: primeros los próximos (más cercanos → más lejanos),
  // luego los partidos pasados (más cercanos al presente → más lejanos). Las fichas sin fecha quedan al final.
  // Torneos únicos presentes en las fichas de partido
  const uniqueTournaments = useMemo(() => {
    const seen = new Set();
    const result = [];
    matchSheets.forEach(ms => {
      if (ms.torneoId && typeof ms.torneoId === 'object' && ms.torneoId._id) {
        const id = String(ms.torneoId._id);
        if (!seen.has(id)) { seen.add(id); result.push(ms.torneoId); }
      }
    });
    return result.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [matchSheets]);

  const filteredMatchSheets = useMemo(() => {
    const filtered = matchSheets.filter(matchSheet => {
      const matchesRival = !filterRival || matchSheet.rival?.toLowerCase().includes(filterRival.toLowerCase());
      const matchesJornada = !filterJornada || (matchSheet.jornada && String(matchSheet.jornada).includes(filterJornada));
      const matchesEquipo = !filterEquipo || (selectedTeam && selectedTeam.nombre?.toLowerCase().includes(filterEquipo.toLowerCase()));
      const matchesTorneo = !filterTorneo || (
        matchSheet.torneoId && typeof matchSheet.torneoId === 'object'
          ? String(matchSheet.torneoId._id) === filterTorneo
          : String(matchSheet.torneoId) === filterTorneo
      );
      
      // Filter by resultado
      const matchesResultado = !filterResultado || matchSheet.resultado === filterResultado;
      
      // Filter by ubicacion
      let matchesUbicacion = true;
      if (filterUbicacion) {
        const ubi = matchSheet.ubicacion;
        if (filterUbicacion === 'local') {
          matchesUbicacion = ubi === 'local' || ubi === 'Casa';
        } else if (filterUbicacion === 'visitante') {
          matchesUbicacion = ubi === 'visitante' || ubi === 'Fuera';
        } else if (filterUbicacion === 'neutral') {
          matchesUbicacion = ubi === 'neutral' || ubi === 'Neutral';
        }
      }
      
      return matchesRival && matchesJornada && matchesEquipo && matchesTorneo && matchesResultado && matchesUbicacion;
    });

    // Sort by goals if requested
    if (sortGoals) {
      filtered.sort((a, b) => {
        const aGF = a.golesFavor ?? -1;
        const bGF = b.golesFavor ?? -1;
        const aGC = a.golesContra ?? -1;
        const bGC = b.golesContra ?? -1;
        switch (sortGoals) {
          case 'goalsFor_desc': return bGF - aGF;
          case 'goalsFor_asc': return aGF - bGF;
          case 'goalsAgainst_desc': return bGC - aGC;
          case 'goalsAgainst_asc': return aGC - bGC;
          default: return 0;
        }
      });
      return filtered;
    }

    // Sort by date order
    if (sortDateOrder === 'asc') {
      filtered.sort((a, b) => {
        const dateA = a.fechaHora ? new Date(a.fechaHora).getTime() : Infinity;
        const dateB = b.fechaHora ? new Date(b.fechaHora).getTime() : Infinity;
        return dateA - dateB;
      });
      return filtered;
    }
    if (sortDateOrder === 'desc') {
      filtered.sort((a, b) => {
        const dateA = a.fechaHora ? new Date(a.fechaHora).getTime() : -Infinity;
        const dateB = b.fechaHora ? new Date(b.fechaHora).getTime() : -Infinity;
        return dateB - dateA;
      });
      return filtered;
    }

    // Default: upcoming first, then past, then undated
    const now = Date.now();
    const upcoming = [];
    const past = [];
    const undated = [];

    filtered.forEach(ms => {
      const date = ms.fechaHora ? new Date(ms.fechaHora) : null;
      if (date && !isNaN(date.getTime())) {
        if (date.getTime() >= now) upcoming.push(ms);
        else past.push(ms);
      } else {
        undated.push(ms);
      }
    });

    // Ordenar próximos de más cercanos a más lejanos (ascendente)
    upcoming.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

    // Ordenar pasados del más cercano al presente al más lejano (descendente)
    past.sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));

    return [...upcoming, ...past, ...undated];
  }, [matchSheets, filterRival, filterJornada, filterEquipo, filterTorneo, filterResultado, filterUbicacion, sortDateOrder, sortGoals, selectedTeam]);
  
  // Contar filtros activos
  const activeFiltersCount = [filterRival, filterJornada, filterEquipo, filterTorneo, filterResultado, filterUbicacion, sortGoals, sortDateOrder !== 'default' ? sortDateOrder : ''].filter(Boolean).length;
  
  // Limpiar filtros
  const clearFilters = () => {
    setFilterRival('');
    setFilterJornada('');
    setFilterEquipo('');
    setFilterTorneo('');
    setFilterResultado('');
    setFilterUbicacion('');
    setSortDateOrder('default');
    setSortGoals('');
  };

  useEffect(() => {
    if (temporada?._id) {
      dispatch(fetchEquiposTemporada({ season: temporada._id }));
    }
  }, [temporada, dispatch]);

  useEffect(() => {
    if (teams && teams.length > 0) {
      // Find the team with seleccionado=true
      const selectedTeam = teams.find(team => team.seleccionado === true);
      if (selectedTeam?._id) {
        dispatch(fetchJugadoresEquipo({ team: selectedTeam._id }));
      }
    }
  }, [teams, dispatch]);

  // Cargar fichas de partido cuando cambie el equipo seleccionado
  useEffect(() => {
    if (teams && teams.length > 0) {
      const selectedTeam = teams.find(team => team.seleccionado === true);
      if (selectedTeam?._id) {
        dispatch(fetchMatchSheetsByTeam(selectedTeam._id));
        dispatch(fetchRivalsByTeam(selectedTeam._id));
        dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id })); // Para validación
        dispatch(fetchInjuriesByTeam({ team: selectedTeam._id })); // Para mostrar lesionados
      }
    }
  }, [teams, dispatch]);
  
  const selectedTeam = teams.find(e => e.seleccionado === true);
  
  // Hook reutilizable para PDFs
  const pdfHook = useMatchSheetPDF({ 
    matchSheet: selectedMatchSheetForOptions, 
    team: selectedTeam, 
    players,
    onComplete: () => setOptionsModalVisible(false),
  });

  // Función para filtrar solo números
  const filterNumericInput = (text) => text.replace(/[^0-9]/g, '');

  // ─── Handlers para el modal compartido (EditMatchSheetModal) ───

  const handleCreateMatchFromModal = async (matchData) => {
    if (!selectedTeam?._id) {
      Alert.alert(t('message.error'), t('matchSheet.selectTeamFirst'));
      throw new Error('No team selected');
    }
    const data = {
      ...matchData,
      equipo: selectedTeam._id,
    };
    await dispatch(createMatchSheet(data)).unwrap();
    setCrearModalVisible(false);
    setEditingMatchSheet(null);
    if (selectedTeam?._id) {
      dispatch(fetchMatchSheetsByTeam(selectedTeam._id));
    }
  };

  const handleSaveMatchFromModal = async (matchData) => {
    await dispatch(updateMatchSheet({ id: matchData._id, data: matchData })).unwrap();
    setCrearModalVisible(false);
    setEditingMatchSheet(null);
    if (selectedTeam?._id) {
      dispatch(fetchMatchSheetsByTeam(selectedTeam._id));
    }
  };

  const openCreateModal = () => {
    setEditingMatchSheet(null);
    setCrearModalVisible(true);
  };

  const openEditModal = (matchSheet) => {
    setEditingMatchSheet(matchSheet);
    setCrearModalVisible(true);
    // Fetch sanctions for the tournament of this match sheet
    const torneoId = matchSheet?.torneoId?._id || matchSheet?.torneoId;
    if (torneoId && matchSheet?.competicion !== 'amistoso') {
      dispatch(fetchTournamentSanctions(torneoId));
    } else {
      dispatch(clearSanctions());
    }
  };


  const handleCancel = () => {
    setCrearModalVisible(false);
    setEditingMatchSheet(null);
    dispatch(clearSanctions());
  };

  const handleDelete = (matchSheet) => {
    Alert.alert(
      t('matchSheet.deleteConfirm'),
      t('matchSheet.deleteConfirmMessage', { rival: matchSheet.rival }),
      [
        { text: t('matchSheet.actions.cancel'), style: 'cancel' },
        {
          text: t('matchSheet.actions.delete'),
          style: 'destructive',
          onPress: () => {
            dispatch(deleteMatchSheet(matchSheet._id));
            setOptionsModalVisible(false);
          },
        },
      ]
    );
  };

  const handleMatchSheetPress = (matchSheet) => {
    setViewingMatchSheet(matchSheet);
  };

  const openOptionsModal = (matchSheet) => {
    setSelectedMatchSheetForOptions(matchSheet);
    setOptionsModalVisible(true);
  };

  if (loading) {
    return (
      <AppLayout scrollEnabled={false}>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#2474E5" />
          <Text style={styles.emptyText}>{t('matchSheet.loading')}</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout scrollEnabled={false}>
      <View style={{ flex: 1 }}>
        {/* Header estilo unificado */}
        <View style={styles.topBar}>
          <View style={styles.topBarHeaderRow}>
            <View style={styles.topBarTitleContainer}>
              <Ionicons name="document-text-outline" size={28} color="#2474E5" />
              <Text style={styles.topBarTitle}>{t('matchSheet.title')}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Botón de menú (3 puntos) */}
              <TouchableOpacity
                onPress={() => setMobileMenuVisible(true)}
                style={styles.mobileMenuButton}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#2474E5" />
                {activeFiltersCount > 0 && (
                  <View style={styles.mobileMenuBadge}>
                    <Text style={styles.mobileMenuBadgeText}>{activeFiltersCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!selectedTeam ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#b5d6fa" />
            <Text style={styles.emptyText}>{t('matchSheet.selectTeamFirst')}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredMatchSheets}
            keyExtractor={(item) => item._id}
            ListHeaderComponent={filtersVisible && !IS_MOBILE ? (
              <View style={[styles.filtersSection, IS_MOBILE && styles.filtersSectionMobile]}>
                <View style={styles.filtersHeader}>
                  <Text style={styles.filtersTitle}>{t('matchSheet.actions.filters')}</Text>
                  <Text style={styles.resultsCount}>
                    {t('matchSheet.filters.resultsCount', { count: filteredMatchSheets.length })}
                  </Text>
                </View>

                <View style={[styles.filtersGrid, IS_MOBILE && styles.filtersGridMobile]}>
                  <View style={styles.filterInputContainer}>
                    <Text style={styles.filterLabel}>{t('matchSheet.filters.searchRival')}</Text>
                    <TextInput
                      style={styles.filterInput}
                      placeholder={t('matchSheet.filters.rivalPlaceholder')}
                      placeholderTextColor="#999"
                      value={filterRival}
                      onChangeText={setFilterRival}
                    />
                  </View>

                  <View style={styles.filterInputContainer}>
                    <Text style={styles.filterLabel}>{t('matchSheet.filters.searchMatchday')}</Text>
                    <TextInput
                      style={styles.filterInput}
                      placeholder={t('matchSheet.filters.matchdayPlaceholder')}
                      placeholderTextColor="#999"
                      value={filterJornada}
                      onChangeText={(text) => setFilterJornada(filterNumericInput(text))}
                      keyboardType="number-pad"
                      autoComplete="off"
                    />
                  </View>
                </View>

                {/* Resultado filter chips */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.filterLabel}>{t('matchSheet.filters.resultFilter')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    <TouchableOpacity
                      style={[styles.filterChip, !filterResultado && styles.filterChipActive]}
                      onPress={() => setFilterResultado('')}
                    >
                      <Text style={[styles.filterChipText, !filterResultado && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.allResults')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, filterResultado === 'Victoria' && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
                      onPress={() => setFilterResultado(filterResultado === 'Victoria' ? '' : 'Victoria')}
                    >
                      <Ionicons name="trophy" size={14} color={filterResultado === 'Victoria' ? '#fff' : '#4CAF50'} />
                      <Text style={[styles.filterChipText, filterResultado === 'Victoria' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.wins')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, filterResultado === 'Empate' && { backgroundColor: '#FF9800', borderColor: '#FF9800' }]}
                      onPress={() => setFilterResultado(filterResultado === 'Empate' ? '' : 'Empate')}
                    >
                      <Ionicons name="remove" size={14} color={filterResultado === 'Empate' ? '#fff' : '#FF9800'} />
                      <Text style={[styles.filterChipText, filterResultado === 'Empate' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.draws')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, filterResultado === 'Derrota' && { backgroundColor: '#F44336', borderColor: '#F44336' }]}
                      onPress={() => setFilterResultado(filterResultado === 'Derrota' ? '' : 'Derrota')}
                    >
                      <Ionicons name="close-circle" size={14} color={filterResultado === 'Derrota' ? '#fff' : '#F44336'} />
                      <Text style={[styles.filterChipText, filterResultado === 'Derrota' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.losses')}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* Ubicación filter chips */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.filterLabel}>{t('matchSheet.filters.locationFilter')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    <TouchableOpacity
                      style={[styles.filterChip, !filterUbicacion && styles.filterChipActive]}
                      onPress={() => setFilterUbicacion('')}
                    >
                      <Text style={[styles.filterChipText, !filterUbicacion && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.allLocations')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, filterUbicacion === 'local' && { backgroundColor: '#2196F3', borderColor: '#2196F3' }]}
                      onPress={() => setFilterUbicacion(filterUbicacion === 'local' ? '' : 'local')}
                    >
                      <Ionicons name="home" size={14} color={filterUbicacion === 'local' ? '#fff' : '#2196F3'} />
                      <Text style={[styles.filterChipText, filterUbicacion === 'local' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.home')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, filterUbicacion === 'visitante' && { backgroundColor: '#9C27B0', borderColor: '#9C27B0' }]}
                      onPress={() => setFilterUbicacion(filterUbicacion === 'visitante' ? '' : 'visitante')}
                    >
                      <Ionicons name="airplane" size={14} color={filterUbicacion === 'visitante' ? '#fff' : '#9C27B0'} />
                      <Text style={[styles.filterChipText, filterUbicacion === 'visitante' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.away')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, filterUbicacion === 'neutral' && { backgroundColor: '#607D8B', borderColor: '#607D8B' }]}
                      onPress={() => setFilterUbicacion(filterUbicacion === 'neutral' ? '' : 'neutral')}
                    >
                      <Ionicons name="flag" size={14} color={filterUbicacion === 'neutral' ? '#fff' : '#607D8B'} />
                      <Text style={[styles.filterChipText, filterUbicacion === 'neutral' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.neutral')}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* Ordenar por fecha */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.filterLabel}>{t('matchSheet.filters.dateOrder')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    <TouchableOpacity
                      style={[styles.filterChip, sortDateOrder === 'default' && styles.filterChipActive]}
                      onPress={() => setSortDateOrder('default')}
                    >
                      <Text style={[styles.filterChipText, sortDateOrder === 'default' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.dateDefault')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, sortDateOrder === 'desc' && { backgroundColor: '#3578e5', borderColor: '#3578e5' }]}
                      onPress={() => setSortDateOrder(sortDateOrder === 'desc' ? 'default' : 'desc')}
                    >
                      <Ionicons name="arrow-down" size={14} color={sortDateOrder === 'desc' ? '#fff' : '#3578e5'} />
                      <Text style={[styles.filterChipText, sortDateOrder === 'desc' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.dateNewest')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, sortDateOrder === 'asc' && { backgroundColor: '#3578e5', borderColor: '#3578e5' }]}
                      onPress={() => setSortDateOrder(sortDateOrder === 'asc' ? 'default' : 'asc')}
                    >
                      <Ionicons name="arrow-up" size={14} color={sortDateOrder === 'asc' ? '#fff' : '#3578e5'} />
                      <Text style={[styles.filterChipText, sortDateOrder === 'asc' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.dateOldest')}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* Ordenar por goles */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.filterLabel}>{t('matchSheet.filters.goalsSort')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    <TouchableOpacity
                      style={[styles.filterChip, !sortGoals && styles.filterChipActive]}
                      onPress={() => setSortGoals('')}
                    >
                      <Text style={[styles.filterChipText, !sortGoals && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.goalsDefault')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, sortGoals === 'goalsFor_desc' && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
                      onPress={() => setSortGoals(sortGoals === 'goalsFor_desc' ? '' : 'goalsFor_desc')}
                    >
                      <Ionicons name="trending-up" size={14} color={sortGoals === 'goalsFor_desc' ? '#fff' : '#4CAF50'} />
                      <Text style={[styles.filterChipText, sortGoals === 'goalsFor_desc' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.goalsForDesc')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, sortGoals === 'goalsFor_asc' && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
                      onPress={() => setSortGoals(sortGoals === 'goalsFor_asc' ? '' : 'goalsFor_asc')}
                    >
                      <Ionicons name="trending-down" size={14} color={sortGoals === 'goalsFor_asc' ? '#fff' : '#4CAF50'} />
                      <Text style={[styles.filterChipText, sortGoals === 'goalsFor_asc' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.goalsForAsc')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, sortGoals === 'goalsAgainst_desc' && { backgroundColor: '#F44336', borderColor: '#F44336' }]}
                      onPress={() => setSortGoals(sortGoals === 'goalsAgainst_desc' ? '' : 'goalsAgainst_desc')}
                    >
                      <Ionicons name="trending-up" size={14} color={sortGoals === 'goalsAgainst_desc' ? '#fff' : '#F44336'} />
                      <Text style={[styles.filterChipText, sortGoals === 'goalsAgainst_desc' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.goalsAgainstDesc')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, sortGoals === 'goalsAgainst_asc' && { backgroundColor: '#F44336', borderColor: '#F44336' }]}
                      onPress={() => setSortGoals(sortGoals === 'goalsAgainst_asc' ? '' : 'goalsAgainst_asc')}
                    >
                      <Ionicons name="trending-down" size={14} color={sortGoals === 'goalsAgainst_asc' ? '#fff' : '#F44336'} />
                      <Text style={[styles.filterChipText, sortGoals === 'goalsAgainst_asc' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.goalsAgainstAsc')}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {uniqueTournaments.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.filterLabel}>{t('matchSheet.filters.searchTournament')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                      <TouchableOpacity
                        style={[styles.tournamentChip, !filterTorneo && styles.tournamentChipActive]}
                        onPress={() => setFilterTorneo('')}
                      >
                        <Text style={[styles.tournamentChipText, !filterTorneo && styles.tournamentChipTextActive]}>
                          {t('matchSheet.filters.allTournaments')}
                        </Text>
                      </TouchableOpacity>
                      {uniqueTournaments.map(t2 => (
                        <TouchableOpacity
                          key={String(t2._id)}
                          style={[
                            styles.tournamentChip,
                            filterTorneo === String(t2._id) && { backgroundColor: t2.color || '#F59E0B', borderColor: t2.color || '#F59E0B' },
                          ]}
                          onPress={() => setFilterTorneo(filterTorneo === String(t2._id) ? '' : String(t2._id))}
                        >
                          <View style={[styles.tournamentChipDot, { backgroundColor: filterTorneo === String(t2._id) ? '#fff' : (t2.color || '#F59E0B') }]} />
                          <Text style={[
                            styles.tournamentChipText,
                            filterTorneo === String(t2._id) && styles.tournamentChipTextActive,
                          ]} numberOfLines={1}>
                            {t2.nombre}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.filterActions}>
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={clearFilters}
                  >
                    <MaterialIcons name="clear" size={18} color="#666" />
                    <Text style={styles.clearFiltersText}>{t('matchSheet.actions.clearFilters')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeFiltersButton}
                    onPress={() => setFiltersVisible(false)}
                  >
                    <Text style={styles.closeFiltersText}>{t('matchSheet.actions.closeFilters')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { marginTop: 40 }]}>
                <Ionicons name="document-text-outline" size={80} color="#b5d6fa" />
                <Text style={styles.emptyText}>
                  {activeFiltersCount > 0 ? t('matchSheet.noMatchesFiltered') : t('matchSheet.noMatchSheets')}
                </Text>
                {!activeFiltersCount && (
                  <TouchableOpacity
                    style={[styles.createButton, { marginTop: 20 }]}
                    onPress={openCreateModal}
                  >
                    <MaterialIcons name="add" size={20} color="#fff" />
                    <Text style={styles.createButtonText}>{t('matchSheet.createFirst')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <View style={{
                width: '100%',
                padding: 4,
              }}>
                <MatchSheetCard
                  matchSheet={item}
                  onPress={handleMatchSheetPress}
                  onOpenOptions={openOptionsModal}
                  IS_MOBILE={IS_MOBILE}
                  selectedTeam={selectedTeam}
                />
              </View>
            )}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        <Modal
          visible={optionsModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setOptionsModalVisible(false)}
        >
          <Pressable 
            style={styles.modalOverlay}
            onPress={() => setOptionsModalVisible(false)}
          >
            <View style={[styles.optionsModalContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
              {/* Handle bar */}
              <View style={styles.optionsModalHandle} />
              {/* Title */}
              <Text style={styles.optionsModalTitle}>{t('matchSheet.actions.options') || 'Opciones'}</Text>

              <TouchableOpacity
                style={styles.optionsModalOption}
                onPress={() => {
                  setOptionsModalVisible(false);
                  openEditModal(selectedMatchSheetForOptions);
                }}
              >
                <View style={[styles.optionsModalIconBox, { backgroundColor: '#eff6ff' }]}>
                  <MaterialIcons name="edit" size={20} color="#2563eb" />
                </View>
                <Text style={styles.optionsModalOptionText}>{t('matchSheet.actions.edit')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionsModalOption}
                onPress={() => pdfHook.openLineupPDFModal()}
              >
                <View style={[styles.optionsModalIconBox, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="football" size={20} color="#16a34a" />
                </View>
                <Text style={styles.optionsModalOptionText}>{t('matchSheet.pdf.lineupTitle')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionsModalOption}
                onPress={() => pdfHook.openConvocatoriaPDFModal()}
              >
                <View style={[styles.optionsModalIconBox, { backgroundColor: '#faf5ff' }]}>
                  <Ionicons name="people" size={20} color="#7c3aed" />
                </View>
                <Text style={styles.optionsModalOptionText}>{t('matchSheet.pdf.callupTitle')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionsModalOption}
                onPress={() => pdfHook.handleGenerateMatchSheetPDF()}
                disabled={pdfHook.generatingPDF}
              >
                <View style={[styles.optionsModalIconBox, { backgroundColor: '#fff7ed' }]}>
                  {pdfHook.generatingPDFType === 'matchsheet' ? (
                    <ActivityIndicator color="#ea580c" size="small" />
                  ) : (
                    <Ionicons name="document-text" size={20} color="#ea580c" />
                  )}
                </View>
                <Text style={styles.optionsModalOptionText}>{t('matchSheet.pdf.matchSheetTitle')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.optionsModalOption, styles.optionsModalOptionDanger]}
                onPress={() => handleDelete(selectedMatchSheetForOptions)}
              >
                <View style={[styles.optionsModalIconBox, { backgroundColor: '#fef2f2' }]}>
                  <MaterialIcons name="delete" size={20} color="#dc2626" />
                </View>
                <Text style={[styles.optionsModalOptionText, styles.optionsModalOptionTextDanger]}>
                  {t('matchSheet.actions.delete')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionsModalCancelButton}
                onPress={() => setOptionsModalVisible(false)}
              >
                <Text style={styles.optionsModalCancelText}>{t('matchSheet.actions.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>

        {/* Modales de PDF reutilizables */}
        <MatchSheetPDFModals
          showLineupModal={pdfHook.showLineupModal}
          showConvocatoriaPDFModal={pdfHook.showConvocatoriaPDFModal}
          matchSheet={selectedMatchSheetForOptions}
          players={players}
          generatingPDF={pdfHook.generatingPDF}
          pdfOptions={pdfHook.pdfOptions}
          onPdfOptionsChange={pdfHook.setPdfOptions}
          convocatoriaPDFData={pdfHook.convocatoriaPDFData}
          onConvocatoriaDataChange={pdfHook.setConvocatoriaPDFData}
          onCloseLineupModal={pdfHook.closeLineupModal}
          onCloseConvocatoriaModal={pdfHook.closeConvocatoriaModal}
          onGenerateLineupPDF={pdfHook.handleGenerateLineupPDF}
          onGenerateCallUpPDF={pdfHook.handleGenerateCallUpPDF}
        />


        {/* Modal de Creación/Edición (compartido) */}
        <EditMatchSheetModal
          visible={crearModalVisible}
          matchSheet={editingMatchSheet}
          rivals={rivals}
          players={players}
          injuries={injuries}
          team={selectedTeam}
          onClose={handleCancel}
          onSave={handleSaveMatchFromModal}
          onCreate={handleCreateMatchFromModal}
          matchSheets={matchSheets}
          trainingSessions={trainingSessions}
          sanctionedPlayerIds={sanctions.filter(s => s.sancionado).map(s => s.playerId)}
        />

        {/* Menú Móvil */}
        <Modal
          visible={mobileMenuVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setMobileMenuVisible(false)}
        >
          <Pressable 
            style={styles.mobileMenuOverlay}
            onPress={() => setMobileMenuVisible(false)}
          >
            <Pressable style={styles.mobileMenuContainer} onPress={(e) => e.stopPropagation()}>
              <View style={styles.mobileMenuContent}>

                <TouchableOpacity
                  style={styles.mobileMenuItem}
                  onPress={() => {
                    setFiltersVisible(!filtersVisible);
                    setMobileMenuVisible(false);
                  }}
                >
                  <MaterialIcons name="filter-list" size={24} color="#2474E5" />
                  <Text style={styles.mobileMenuItemText}>{t('matchSheet.actions.filters')}</Text>
                  {activeFiltersCount > 0 && (
                    <View style={styles.mobileMenuItemBadge}>
                      <Text style={styles.mobileMenuItemBadgeText}>{activeFiltersCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.mobileMenuDivider} />

                <TouchableOpacity
                  style={styles.mobileMenuItem}
                  onPress={() => {
                    openCreateModal();
                    setMobileMenuVisible(false);
                  }}
                >
                  <MaterialIcons name="add" size={20} color="#ffffffff" backgroundColor="#2474E5" borderRadius={100} />
                  <Text style={styles.mobileMenuItemText}>{t('matchSheet.actions.createMatchSheet')}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Sección de Filtros Móvil */}
        {filtersVisible && IS_MOBILE && (
          <Modal
            visible={filtersVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setFiltersVisible(false)}
          >
            <View style={styles.mobileMenuOverlay}>
              <KeyboardAwareScrollView style={[styles.filtersSection, styles.filtersSectionMobile, { marginTop: 'auto', marginBottom: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }]} showsVerticalScrollIndicator={false}>
                <View style={styles.filtersHeader}>
                  <Text style={styles.filtersTitle}>{t('matchSheet.actions.filters')}</Text>
                  <Text style={styles.resultsCount}>
                    {t('matchSheet.filters.resultsCount', { count: filteredMatchSheets.length })}
                  </Text>
                </View>
                
                <View style={[styles.filtersGrid, styles.filtersGridMobile]}>
                  <View style={[styles.filterInputContainer, { minWidth: '100%' }]}>
                    <Text style={styles.filterLabel}>{t('matchSheet.filters.searchRival')}</Text>
                    <TextInput
                      style={styles.filterInput}
                      placeholder={t('matchSheet.filters.rivalPlaceholder')}
                      placeholderTextColor="#999"
                      value={filterRival}
                      onChangeText={setFilterRival}
                    />
                  </View>

                  <View style={[styles.filterInputContainer, { minWidth: '100%' }]}>
                    <Text style={styles.filterLabel}>{t('matchSheet.filters.searchMatchday')}</Text>
                    <TextInput
                      style={styles.filterInput}
                      placeholder={t('matchSheet.filters.matchdayPlaceholder')}
                      placeholderTextColor="#999"
                      value={filterJornada}
                      onChangeText={(text) => setFilterJornada(filterNumericInput(text))}
                      keyboardType="number-pad"
                      autoComplete="off"
                    />
                  </View>
                </View>

                {/* Resultado filter chips - Mobile */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.filterLabel}>{t('matchSheet.filters.resultFilter')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    <TouchableOpacity
                      style={[styles.filterChip, !filterResultado && styles.filterChipActive]}
                      onPress={() => setFilterResultado('')}
                    >
                      <Text style={[styles.filterChipText, !filterResultado && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.allResults')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, filterResultado === 'Victoria' && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
                      onPress={() => setFilterResultado(filterResultado === 'Victoria' ? '' : 'Victoria')}
                    >
                      <Ionicons name="trophy" size={14} color={filterResultado === 'Victoria' ? '#fff' : '#4CAF50'} />
                      <Text style={[styles.filterChipText, filterResultado === 'Victoria' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.wins')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, filterResultado === 'Empate' && { backgroundColor: '#FF9800', borderColor: '#FF9800' }]}
                      onPress={() => setFilterResultado(filterResultado === 'Empate' ? '' : 'Empate')}
                    >
                      <Ionicons name="remove" size={14} color={filterResultado === 'Empate' ? '#fff' : '#FF9800'} />
                      <Text style={[styles.filterChipText, filterResultado === 'Empate' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.draws')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, filterResultado === 'Derrota' && { backgroundColor: '#F44336', borderColor: '#F44336' }]}
                      onPress={() => setFilterResultado(filterResultado === 'Derrota' ? '' : 'Derrota')}
                    >
                      <Ionicons name="close-circle" size={14} color={filterResultado === 'Derrota' ? '#fff' : '#F44336'} />
                      <Text style={[styles.filterChipText, filterResultado === 'Derrota' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.losses')}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* Ubicación filter chips - Mobile */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.filterLabel}>{t('matchSheet.filters.locationFilter')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    <TouchableOpacity
                      style={[styles.filterChip, !filterUbicacion && styles.filterChipActive]}
                      onPress={() => setFilterUbicacion('')}
                    >
                      <Text style={[styles.filterChipText, !filterUbicacion && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.allLocations')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, filterUbicacion === 'local' && { backgroundColor: '#2196F3', borderColor: '#2196F3' }]}
                      onPress={() => setFilterUbicacion(filterUbicacion === 'local' ? '' : 'local')}
                    >
                      <Ionicons name="home" size={14} color={filterUbicacion === 'local' ? '#fff' : '#2196F3'} />
                      <Text style={[styles.filterChipText, filterUbicacion === 'local' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.home')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, filterUbicacion === 'visitante' && { backgroundColor: '#9C27B0', borderColor: '#9C27B0' }]}
                      onPress={() => setFilterUbicacion(filterUbicacion === 'visitante' ? '' : 'visitante')}
                    >
                      <Ionicons name="airplane" size={14} color={filterUbicacion === 'visitante' ? '#fff' : '#9C27B0'} />
                      <Text style={[styles.filterChipText, filterUbicacion === 'visitante' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.away')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, filterUbicacion === 'neutral' && { backgroundColor: '#607D8B', borderColor: '#607D8B' }]}
                      onPress={() => setFilterUbicacion(filterUbicacion === 'neutral' ? '' : 'neutral')}
                    >
                      <Ionicons name="flag" size={14} color={filterUbicacion === 'neutral' ? '#fff' : '#607D8B'} />
                      <Text style={[styles.filterChipText, filterUbicacion === 'neutral' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.neutral')}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* Ordenar por fecha - Mobile */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.filterLabel}>{t('matchSheet.filters.dateOrder')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    <TouchableOpacity
                      style={[styles.filterChip, sortDateOrder === 'default' && styles.filterChipActive]}
                      onPress={() => setSortDateOrder('default')}
                    >
                      <Text style={[styles.filterChipText, sortDateOrder === 'default' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.dateDefault')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, sortDateOrder === 'desc' && { backgroundColor: '#3578e5', borderColor: '#3578e5' }]}
                      onPress={() => setSortDateOrder(sortDateOrder === 'desc' ? 'default' : 'desc')}
                    >
                      <Ionicons name="arrow-down" size={14} color={sortDateOrder === 'desc' ? '#fff' : '#3578e5'} />
                      <Text style={[styles.filterChipText, sortDateOrder === 'desc' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.dateNewest')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, sortDateOrder === 'asc' && { backgroundColor: '#3578e5', borderColor: '#3578e5' }]}
                      onPress={() => setSortDateOrder(sortDateOrder === 'asc' ? 'default' : 'asc')}
                    >
                      <Ionicons name="arrow-up" size={14} color={sortDateOrder === 'asc' ? '#fff' : '#3578e5'} />
                      <Text style={[styles.filterChipText, sortDateOrder === 'asc' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.dateOldest')}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* Ordenar por goles - Mobile */}
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.filterLabel}>{t('matchSheet.filters.goalsSort')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    <TouchableOpacity
                      style={[styles.filterChip, !sortGoals && styles.filterChipActive]}
                      onPress={() => setSortGoals('')}
                    >
                      <Text style={[styles.filterChipText, !sortGoals && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.goalsDefault')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, sortGoals === 'goalsFor_desc' && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
                      onPress={() => setSortGoals(sortGoals === 'goalsFor_desc' ? '' : 'goalsFor_desc')}
                    >
                      <Ionicons name="trending-up" size={14} color={sortGoals === 'goalsFor_desc' ? '#fff' : '#4CAF50'} />
                      <Text style={[styles.filterChipText, sortGoals === 'goalsFor_desc' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.goalsForDesc')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, sortGoals === 'goalsFor_asc' && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
                      onPress={() => setSortGoals(sortGoals === 'goalsFor_asc' ? '' : 'goalsFor_asc')}
                    >
                      <Ionicons name="trending-down" size={14} color={sortGoals === 'goalsFor_asc' ? '#fff' : '#4CAF50'} />
                      <Text style={[styles.filterChipText, sortGoals === 'goalsFor_asc' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.goalsForAsc')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, sortGoals === 'goalsAgainst_desc' && { backgroundColor: '#F44336', borderColor: '#F44336' }]}
                      onPress={() => setSortGoals(sortGoals === 'goalsAgainst_desc' ? '' : 'goalsAgainst_desc')}
                    >
                      <Ionicons name="trending-up" size={14} color={sortGoals === 'goalsAgainst_desc' ? '#fff' : '#F44336'} />
                      <Text style={[styles.filterChipText, sortGoals === 'goalsAgainst_desc' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.goalsAgainstDesc')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterChip, sortGoals === 'goalsAgainst_asc' && { backgroundColor: '#F44336', borderColor: '#F44336' }]}
                      onPress={() => setSortGoals(sortGoals === 'goalsAgainst_asc' ? '' : 'goalsAgainst_asc')}
                    >
                      <Ionicons name="trending-down" size={14} color={sortGoals === 'goalsAgainst_asc' ? '#fff' : '#F44336'} />
                      <Text style={[styles.filterChipText, sortGoals === 'goalsAgainst_asc' && styles.filterChipTextActive]}>
                        {t('matchSheet.filters.goalsAgainstAsc')}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {uniqueTournaments.length > 0 && (
                    <View style={[styles.filterInputContainer, { minWidth: '100%', marginTop: 10 }]}>
                      <Text style={styles.filterLabel}>{t('matchSheet.filters.searchTournament')}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                        <TouchableOpacity
                          style={[styles.tournamentChip, !filterTorneo && styles.tournamentChipActive]}
                          onPress={() => setFilterTorneo('')}
                        >
                          <Text style={[styles.tournamentChipText, !filterTorneo && styles.tournamentChipTextActive]}>
                            {t('matchSheet.filters.allTournaments')}
                          </Text>
                        </TouchableOpacity>
                        {uniqueTournaments.map(t2 => (
                          <TouchableOpacity
                            key={String(t2._id)}
                            style={[
                              styles.tournamentChip,
                              filterTorneo === String(t2._id) && { backgroundColor: t2.color || '#F59E0B', borderColor: t2.color || '#F59E0B' },
                            ]}
                            onPress={() => setFilterTorneo(filterTorneo === String(t2._id) ? '' : String(t2._id))}
                          >
                            <View style={[styles.tournamentChipDot, { backgroundColor: filterTorneo === String(t2._id) ? '#fff' : (t2.color || '#F59E0B') }]} />
                            <Text
                              style={[styles.tournamentChipText, filterTorneo === String(t2._id) && styles.tournamentChipTextActive]}
                              numberOfLines={1}
                            >
                              {t2.nombre}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                <View style={[styles.filterActions, { marginTop: 16 }]}>
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={clearFilters}
                  >
                    <MaterialIcons name="clear" size={18} color="#666" />
                    <Text style={styles.clearFiltersText}>{t('matchSheet.actions.clearFilters')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeFiltersButton}
                    onPress={() => setFiltersVisible(false)}
                  >
                    <Text style={styles.closeFiltersText}>{t('matchSheet.actions.closeFilters')}</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAwareScrollView>
            </View>
          </Modal>
        )}
      </View>

      <MatchSheetDetailModal
        visible={!!viewingMatchSheet}
        matchSheet={viewingMatchSheet}
        team={selectedTeam}
        players={players}
        onClose={() => setViewingMatchSheet(null)}
        onEdit={(ms) => {
          setViewingMatchSheet(null);
          openEditModal(ms);
        }}
        onDelete={(ms) => {
          dispatch(deleteMatchSheet(ms._id));
          setViewingMatchSheet(null);
        }}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  topBar: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'web' ? 16 : 10,
    paddingBottom: Platform.OS === 'web' ? 12 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: '#1E293B',
  },
  topBarMobile: {
    paddingHorizontal: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eaf2fb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#b5d6fa',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  teamInfoMobile: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  teamInfoText: {
    color: '#2474E5',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  teamInfoTextMobile: {
    fontSize: 14,
  },
  // Estilos para gestión de tipos
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexShrink: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2474E5',
    paddingVertical: Platform.OS === 'ios' ? 8 : 7,
    paddingHorizontal: 16,
    borderRadius: 22,
    shadowColor: '#2856a2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  createButtonMobile: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.25,
  },
  createButtonTextMobile: {
    fontSize: 14,
  },
  matchSheetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e3e8f0',
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 74,
    marginBottom: 8,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    transitionDuration: '150ms',
  },
  matchSheetCardMobile: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    minHeight: 60,
  },
  matchSheetCardPressed: {
    backgroundColor: '#eaf2fb',
    borderColor: '#b5d6fa',
    shadowOpacity: 0.18,
    elevation: 4,
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: 46,
    overflow: 'hidden',
    marginLeft: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2856a2',
    marginBottom: 2,
    letterSpacing: 0.25,
    textShadowColor: '#e6eefc',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  cardTitleMobile: {
    fontSize: 13,
    marginBottom: 1,
  },
  infoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 2,
  },
  infoTagText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  infoTagsContainer: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyText: {
    fontSize: 16,
    color: '#8fa0b8',
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f6fc',
    padding: 24,
  },
  matchSheetCardContent: {
    flex: 1,
    flexDirection: 'row',
  },
  matchSheetCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingLeft: 8,
  },
  cardActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  // ========== NUEVOS ESTILOS PROFESIONALES ==========
  // Vista Grid - Tarjetas compactas
  gridCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    marginHorizontal: 4,
    flex: 1,
    maxHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  gridCardMobile: {
    marginHorizontal: 3,
    marginBottom: 6,
    borderRadius: 10,
    maxHeight: 125,
  },
  gridCardPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.05,
  },
  gridCardHeader: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridCardUbicacionCorner: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.25)',
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
  gridCardEscudo: {
    width: 26,
    height: 26,
    borderRadius: 4,
  },
  gridCardBody: {
    padding: 8,
    alignItems: 'center',
  },
  gridCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 14,
  },
  gridCardTitleMobile: {
    fontSize: 10,
    marginBottom: 3,
    lineHeight: 12,
  },
  gridCardScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  gridCardScoreText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    backgroundColor: '#fef3c7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  gridCardStatText: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '500',
  },
  gridCardStatValue: {
    fontSize: 10,
    color: '#d97706',
    fontWeight: '700',
  },
  gridCardBadge: {
    marginTop: 4,
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gridCardBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#7c3aed',
  },
  // Vista Lista - Tarjetas horizontales
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  listCardMobile: {
    borderRadius: 12,
    marginBottom: 8,
  },
  listCardPressed: {
    backgroundColor: '#f8fafc',
  },
  listCardIndicator: {
    width: 4,
    height: '100%',
  },
  listCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 12,
  },
  listCardEscudo: {
    width: 44,
    height: 44,
    borderRadius: 8,
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
    color: '#1e293b',
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
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  listCardTagSuccess: {
    backgroundColor: '#ecfdf5',
  },
  listCardTagWarning: {
    backgroundColor: '#fef3c7',
  },
  listCardTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
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
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tournamentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  tournamentChipActive: {
    backgroundColor: '#2474E5',
    borderColor: '#2474E5',
  },
  tournamentChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tournamentChipTextActive: {
    color: '#fff',
  },
  tournamentChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  filterChipActive: {
    backgroundColor: '#2474E5',
    borderColor: '#2474E5',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  // ========== FIN NUEVOS ESTILOS ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsModalContent: {
    backgroundColor: '#ffffff',
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
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  optionsModalTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
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
    borderBottomColor: '#f1f5f9',
  },
  optionsModalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  optionsModalOptionDanger: {
    borderBottomWidth: 0,
  },
  optionsModalOptionTextDanger: {
    color: '#dc2626',
  },
  optionsModalCancelButton: {
    marginTop: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  optionsModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: Platform.select({
    ios: {
      backgroundColor: '#fff',
      borderRadius: 20,
      width: '100%',
      maxWidth: 500,
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    android: {
      backgroundColor: '#fff',
      borderRadius: 20,
      width: '100%',
      maxWidth: 500,
      maxHeight: '90%',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
  }),
  modalContentTablet: Platform.select({
    ios: {
      backgroundColor: '#fff',
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
      backgroundColor: '#fff',
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
  }),
  viewModalContent: Platform.select({
    ios: {
      backgroundColor: '#fff',
      borderRadius: 20,
      width: '95%',
      maxWidth: 500,
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    android: {
      backgroundColor: '#fff',
      borderRadius: 20,
      width: '95%',
      maxWidth: 500,
      maxHeight: '90%',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
  }),
  viewModalContentTablet: Platform.select({
    ios: {
      backgroundColor: '#fff',
      borderRadius: 20,
      width: '90%',
      maxWidth: 800,
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
    },
    android: {
      backgroundColor: '#fff',
      borderRadius: 20,
      width: '90%',
      maxWidth: 800,
      maxHeight: '90%',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
  }),
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  modalEditButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  matchSheetDetailCard: {
    marginBottom: 16,
  },
  matchSheetDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  matchSheetDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 12,
    flex: 1,
  },
  matchPendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    gap: 6,
  },
  matchPendingText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 14,
  },
  resultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resultText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  resultBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultTextSmall: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 10,
  },
  resultBadgeGrid: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  resultTextGrid: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  detailSection: {
    marginTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9eef6',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardMobile: {
    flex: 0,
    width: '47%',
    minWidth: 0,
  },
  statIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  statContent: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  detailsSection: {
    gap: 16,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  detailCardContent: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  // Estilos del modal de creación
  createModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '96%',
    maxWidth: 800,
    maxHeight: '95%',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  createModalContainerMobile: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    height: '100%',
    flex: 1,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
    backgroundColor: '#f0f9ff',
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
  },
  createModalContent: {
    padding: 24,
  },
  createModalContentMobile: {
    padding: 16,
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
    gap: 16,
  },
  escudosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    marginBottom: 8,
  },
  escudoContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  escudoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '600',
  },
  escudoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  escudoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  escudoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  escudoPlaceholderText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },
  escudoEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#3578e5',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  escudoRemoveBtn: {
    position: 'absolute',
    top: 20,
    right: -8,
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#94a3b8',
  },
  createModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 16,
  },
  createCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  createCancelButtonText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
  },
  createSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3578e5',
    alignItems: 'center',
  },
  createSaveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#1e293b',
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
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  resultadoDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  resultadoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  resultadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resultadoText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  descuentoSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  descuentoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  descuentoValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  descuentoHint: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  selector: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  selectorTextSelected: {
    color: '#1f2937',
  },
  playerSelector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerSelectorTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedPlayersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  playerChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  playerChipText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  calledChip: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  calledChipText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  notCalledChip: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  notCalledChipText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    margin: 20,
  },
  modalContainerMobile: {
    width: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    margin: 0,
    borderRadius: 0,
    flex: 1,
  },
  playerSearchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playerSearchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  playerSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    padding: 0,
  },
  injuryFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  injuryFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  injuryFilterBtnActive: {
    backgroundColor: '#2474E5',
    borderColor: '#2474E5',
  },
  injuryFilterBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  injuryFilterBtnTextActive: {
    color: '#fff',
  },
  selectedPanelMobile: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  selectedPanelTitleMobile: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2474E5',
    marginBottom: 8,
  },
  selectedChipMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2474E5',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  selectedChipTextMobile: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    maxWidth: 100,
  },
  selectedChipRemoveMobile: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  playerRowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  playerRowMobileSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2474E5',
  },
  playerCheckMobile: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCheckMobileSelected: {
    backgroundColor: '#2474E5',
    borderColor: '#2474E5',
  },
  playerAvatarMobile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerNameMobile: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  playerNameMobileSelected: {
    color: '#2474E5',
  },
  playerPositionMobile: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  injuryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  injuryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  injuryBadgeMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  injuryBadgeTextMobile: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  selectAllContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f9fafb',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2474E5',
  },
  modalContent: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
    fontStyle: 'italic',
  },
  playerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  playerItemText: {
    fontSize: 16,
    color: '#333',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionItemText: {
    fontSize: 16,
    color: '#333',
  },
  optionItemTextSelected: {
    color: '#2474E5',
    fontWeight: '600',
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalActionButton: {
    backgroundColor: '#2474E5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  eventMinute: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3578e5',
    minWidth: 35,
  },
  eventPlayer: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  eventType: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  cambioDetails: {
    flex: 1,
    gap: 4,
  },
  cambioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  statItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    minWidth: '30%',
    flex: 1,
    alignItems: 'center',
  },
  statItemLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
  statItemValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  eventSelector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventSelectorTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  eventsList: {
    marginBottom: 12,
    gap: 8,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  eventChipText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  cardIndicator: {
    width: 12,
    height: 16,
    borderRadius: 2,
  },
  eventFormContainer: {
    padding: 20,
    gap: 12,
  },
  pickerContainer: {
    marginBottom: 12,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: '#999',
  },
  pickerTextSelected: {
    color: '#333',
  },
  cardTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cardTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  cardTypeButtonSelected: {
    borderColor: '#2474E5',
    backgroundColor: '#e3f2fd',
  },
  cardIcon: {
    width: 16,
    height: 22,
    borderRadius: 2,
  },
  cardTypeText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  cardTypeTextSelected: {
    color: '#2474E5',
    fontWeight: '600',
  },
  locationStat: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  // --- Vista de cuadrícula/lista ---
  viewModeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    overflow: 'hidden',
  },
  viewModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeBtnActive: {
    backgroundColor: '#2474E5',
    borderRadius: 8,
  },
  // Estilos para vista Grid
  matchSheetCardGrid: {
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  matchSheetCardGridMobile: {
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
    width: '100%',
    overflow: 'hidden',
    paddingHorizontal: 2,
  },
  // Estilos para botones de vista
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#eaf2fb",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#b5d6fa",
    flex: 1,
    maxWidth: 200,
  },
  toggleButtonMobile: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 4,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 36,
    flex: 0,
  },
  toggleButtonText: {
    marginLeft: 7,
    color: "#2474E5",
    fontWeight: "bold",
    width: 120,
  },
  // Estilos para filtros
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#eaf2fb",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#b5d6fa",
    marginRight: 8,
  },
  filterButtonMobile: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  filterButtonText: {
    marginLeft: 7,
    color: "#2474E5",
    fontWeight: "bold",
    fontSize: 14,
  },
  filterBadge: {
    backgroundColor: '#FF5722',
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
  filtersSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e3e8f0',
  },
  filtersSectionMobile: {
    marginHorizontal: 8,
    padding: 12,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filtersGridMobile: {
    gap: 8,
  },
  filterInputContainer: {
    flex: 1,
    minWidth: 200,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  clearFiltersText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  closeFiltersButton: {
    backgroundColor: '#2474E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeFiltersText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Estilos para menú móvil
  mobileMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eaf2fb",
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: "#b5d6fa",
  },
  mobileMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mobileMenuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  mobileMenuContent: {
    padding: 20,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  mobileMenuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    fontWeight: '500',
  },
  mobileMenuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  mobileMenuBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF5722',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMenuBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mobileMenuItemBadge: {
    backgroundColor: '#FF5722',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  mobileMenuItemBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  resultIndicatorGrid: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  resultIndicatorTextGrid: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
  },
  locationTagsContainerGrid: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  locationTagGrid: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    minHeight: 18,
    justifyContent: 'center',
  },
  locationTagTextGrid: {
    fontSize: 9,
    marginLeft: 1,
    fontWeight: '500',
  },
  // Estilos para selector de minutos
  minuteSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  minuteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
  },
  minuteOption: {
    minWidth: 50,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  minuteOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  minuteOptionAddedTime: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  minuteOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  minuteOptionTextSelected: {
    color: '#ffffff',
  },
  minuteOptionTextAddedTime: {
    color: '#92400e',
    fontWeight: '600',
  },
  // Estilos para PDF
  pdfOptionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pdfOptionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  pdfOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pdfOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pdfOptionLabel: {
    fontSize: 15,
    color: '#374151',
  },
  convocadosPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  convocadoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 8,
  },
  convocadoPhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  convocadoName: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },
  noConvocadosText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  inputGroup: {
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  visualLineupContainer: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyLineupMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    gap: 12,
  },
  emptyLineupText: {
    color: '#666',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  startersSubsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  startersSubsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  startersSubsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  startersSubsList: {
    gap: 6,
  },
  starterSubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  starterSubDorsal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterSubDorsalText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  starterSubName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
  },
  // Estilos para preview de suplentes en modal PDF
  suplentesPreviewCard: {
    backgroundColor: '#faf5ff',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  suplentesPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  suplentesPreviewIndicator: {
    width: 5,
    height: 18,
    backgroundColor: '#9333ea',
    borderRadius: 3,
  },
  suplentesPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#581c87',
  },
  suplentesPreviewList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  suplentePreviewItem: {
    alignItems: 'center',
    width: 60,
  },
  suplentePreviewPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#9333ea',
  },
  suplentePreviewCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  suplentePreviewDorsal: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  suplentePreviewName: {
    fontSize: 10,
    color: '#581c87',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 60,
  },
});
