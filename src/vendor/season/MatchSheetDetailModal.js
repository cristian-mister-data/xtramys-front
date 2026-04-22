// components/pages/season/MatchSheetDetailModal.js
// Modal de detalle de ficha de partido con PDFs de alineación y convocatoria
import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useMatchSheetPDF from '@/vendor/matchSheet/useMatchSheetPDF';
import MatchSheetPDFModals, { MatchSheetPDFButtons } from '@/vendor/matchSheet/MatchSheetPDFModals';
import LineupEditor from '@/vendor/matchSheet/LineupEditor';
import { getPlayerFullName, getPlayerInitials } from '@/utils/playerHelpers';

// Mapeo de rondas a claves i18n
const ROUND_I18N_KEYS = {
  final: 'tournaments.roundFinal',
  semifinal: 'tournaments.roundSemifinal',
  cuartos: 'tournaments.roundQuarters',
  octavos: 'tournaments.roundRound16',
  dieciseisavos: 'tournaments.roundRound32',
  treintaydosavos: 'tournaments.roundRound64',
};

// Tema consistente con el resto de la aplicación
const THEME = {
  primary: '#3578e5',
  primaryLight: '#5b93ea',
  primaryDark: '#2856a2',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  inputBg: '#f8fafc',
  gradient: ['#3578e5', '#2856a2'],
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

const getPositionIcon = (position) => {
  switch(position?.toLowerCase()) {
    case 'portero': return 'hand-left';
    case 'central': return 'shield';
    case 'lateral': return 'arrow-forward';
    case 'centrocampista': return 'git-merge';
    case 'extremo': return 'flash';
    case 'delantero': return 'football';
    default: return 'person';
  }
};

// Componente de ítem de jugador estilo lista (como jugadores.js)
function PlayerListItem({ player, t, isMobile }) {
  if (!player) return null;
  const colors = getPositionColor(player.posicion);
  return (
    <View style={playerStyles.listCard}>
      <LinearGradient colors={colors} style={playerStyles.listCardIndicator} />
      <View style={[playerStyles.listCardAvatar, { backgroundColor: colors[0] + '20' }]}>
        <Text style={[playerStyles.listCardInitials, { color: colors[1] }]}>
          {getPlayerInitials(player)}
        </Text>
      </View>
      <View style={playerStyles.listCardContent}>
        <Text style={[playerStyles.listCardTitle, isMobile && { fontSize: 13 }]} numberOfLines={1}>
          {getPlayerFullName(player)}
        </Text>
        <View style={playerStyles.listCardTags}>
          {player.dorsal != null && (
            <View style={[playerStyles.listCardTag, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="shirt-outline" size={11} color="#3b82f6" />
              <Text style={[playerStyles.listCardTagText, { color: '#3b82f6' }]}>#{player.dorsal}</Text>
            </View>
          )}
          {player.posicion && (
            <View style={[playerStyles.listCardTag, { backgroundColor: colors[0] + '20' }]}>
              <Ionicons name={getPositionIcon(player.posicion)} size={11} color={colors[1]} />
              <Text style={[playerStyles.listCardTagText, { color: colors[1] }]}>
                {t(`injury.positions.${player.posicion.toLowerCase()}`, { defaultValue: player.posicion })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// Componente de lista de jugadores con filtros de posición
function PlayerListWithFilters({ playerIds, allPlayers, t, isMobile }) {
  const [posFilter, setPosFilter] = useState('');
  const [search, setSearch] = useState('');

  const resolvedPlayers = useMemo(() => {
    return (playerIds || []).map(p => {
      const id = typeof p === 'object' ? p._id : p;
      return allPlayers.find(pl => pl._id === id);
    }).filter(Boolean);
  }, [playerIds, allPlayers]);

  const positions = useMemo(() => {
    const posSet = new Set();
    resolvedPlayers.forEach(p => { if (p.posicion) posSet.add(p.posicion.toLowerCase()); });
    return Array.from(posSet);
  }, [resolvedPlayers]);

  const filtered = useMemo(() => {
    let result = resolvedPlayers;
    if (posFilter) result = result.filter(p => p.posicion?.toLowerCase() === posFilter);
    if (search.trim()) {
      const lower = search.trim().toLowerCase();
      result = result.filter(p =>
        getPlayerFullName(p).toLowerCase().includes(lower)
      );
    }
    return result;
  }, [resolvedPlayers, posFilter, search]);

  if (resolvedPlayers.length === 0) return null;

  return (
    <View>
      {resolvedPlayers.length > 4 && (
        <View style={playerStyles.searchRow}>
          <Ionicons name="search" size={16} color="#94a3b8" />
          <TextInput
            style={playerStyles.searchInput}
            placeholder={t('player.searchPlaceholder')}
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {positions.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={playerStyles.filterScroll}>
          <TouchableOpacity
            style={[playerStyles.filterChip, !posFilter && playerStyles.filterChipActive]}
            onPress={() => setPosFilter('')}
          >
            <Text style={[playerStyles.filterChipText, !posFilter && playerStyles.filterChipTextActive]}>
              {t('player.all')}
            </Text>
          </TouchableOpacity>
          {positions.map(pos => {
            const colors = getPositionColor(pos);
            return (
              <TouchableOpacity
                key={pos}
                style={[
                  playerStyles.filterChip,
                  posFilter === pos && [playerStyles.filterChipActive, { backgroundColor: colors[0] }]
                ]}
                onPress={() => setPosFilter(posFilter === pos ? '' : pos)}
              >
                <Ionicons name={getPositionIcon(pos)} size={12} color={posFilter === pos ? '#fff' : colors[1]} />
                <Text style={[
                  playerStyles.filterChipText,
                  posFilter === pos && playerStyles.filterChipTextActive
                ]}>
                  {t(`injury.positions.${pos}`, { defaultValue: pos })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      {filtered.map(player => (
        <PlayerListItem key={player._id} player={player} t={t} isMobile={isMobile} />
      ))}
      {filtered.length === 0 && resolvedPlayers.length > 0 && (
        <Text style={playerStyles.noResults}>{t('injury.noResults')}</Text>
      )}
    </View>
  );
}

export default function MatchSheetDetailModal({
  visible,
  matchSheet,
  team,
  players = [],
  onClose,
  onEdit,
  onDelete,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'es';
  const { width: screenWidth } = useWindowDimensions();
  const IS_MOBILE = screenWidth < 430;
  const IS_TABLET = screenWidth > 700;
  // onLayout mide el ancho real de la tarjeta de alineación para evitar overflow en cualquier dispositivo
  const [lineupCardWidth, setLineupCardWidth] = useState(0);
  const cardPadding = IS_MOBILE ? 8 : 16;
  // containerWidth = ancho tarjeta - borde(1*2) - padding tarjeta(*2) - padding containerReadOnly(16*2)
  const lineupContainerWidth = lineupCardWidth > 0
    ? lineupCardWidth - 2 - cardPadding * 2 - 32
    : undefined;
  
  // Hook reutilizable para PDFs
  const {
    generatingPDF,
    generatingPDFType,
    showLineupModal,
    showConvocatoriaPDFModal,
    pdfOptions,
    convocatoriaPDFData,
    setPdfOptions,
    setConvocatoriaPDFData,
    handleGenerateLineupPDF,
    handleGenerateCallUpPDF,
    handleGenerateMatchSheetPDF,
    openLineupPDFModal,
    openConvocatoriaPDFModal,
    closeLineupModal,
    closeConvocatoriaModal,
  } = useMatchSheetPDF({ team, players });

  if (!matchSheet) return null;

  const formatDate = (date) => {
    if (!date) return t('matchSheet.fields.noDate');
    const d = new Date(date);
    const locale = currentLang === 'en' ? 'en-US' : 'es-ES';
    return d.toLocaleDateString(locale, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Traducir resultado de BD (normalizado a minúsculas para compatibilidad)
  const translateResult = (result) => {
    if (!result) return '';
    switch(result.toLowerCase()) {
      case 'victoria': case 'win': return t('matchSheet.fields.win');
      case 'empate': case 'draw': return t('matchSheet.fields.draw');
      case 'derrota': case 'loss': return t('matchSheet.fields.loss');
      default: return result;
    }
  };

  const getResultBadgeColorNorm = (result) => {
    if (!result) return '#9E9E9E';
    switch(result.toLowerCase()) {
      case 'victoria': case 'win': return '#4CAF50';
      case 'empate': case 'draw': return '#FF9800';
      case 'derrota': case 'loss': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  // Traducir ubicación de BD (normalizado a minúsculas)
  const translateUbicacion = (ubi) => {
    if (!ubi) return '';
    switch(ubi.toLowerCase()) {
      case 'local': case 'casa': case 'home': return t('matchSheet.fields.home');
      case 'visitante': case 'fuera': case 'away': return t('matchSheet.fields.away');
      case 'neutral': return t('schedule.neutral');
      default: return ubi;
    }
  };

  const getResultBadgeColor = getResultBadgeColorNorm;

  const normalizeFormation = (value) => {
    if (!value) return '';
    const v = String(value).trim();
    if (v.startsWith('1-')) return v;
    if (/^\d+-/.test(v)) return `1-${v}`;
    return v;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBg}>
        <View style={IS_TABLET ? styles.viewModalContentTablet : styles.viewModalContent}>
          {/* Header */}
          <View style={[styles.modalHeader, IS_MOBILE && { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }]}>
            <Text style={[styles.modalTitle, IS_MOBILE && { fontSize: 17 }]}>{t('matchSheet.title')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.modalEditButton}
                  onPress={() => onEdit(matchSheet)}
                >
                  <Ionicons name="pencil" size={20} color="#374151" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={[styles.modalBody, IS_MOBILE && { paddingHorizontal: 14 }]} showsVerticalScrollIndicator={false}>
            {/* Card principal con rival y resultado */}
            <View style={styles.matchSheetDetailCard}>
              <View style={styles.matchSheetDetailHeader}>
                <Ionicons name="football" size={24} color="#3578e5" />
                <Text style={styles.matchSheetDetailTitle}>{matchSheet.rival}</Text>
                {matchSheet.resultado && (
                  <View style={[styles.resultBadge, { backgroundColor: getResultBadgeColor(matchSheet.resultado) }]}>
                    <Text style={styles.resultText}>{translateResult(matchSheet.resultado)}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.detailSection}>
              <View style={styles.statsRow}>
                {matchSheet.ubicacion && (
                  <View style={[styles.statCard, IS_MOBILE && styles.statCardMobile]}>
                    <View style={[styles.statIconBg, { backgroundColor: '#dbeafe' }]}>
                      <Ionicons name="location" size={18} color="#2196F3" />
                    </View>
                    <View style={styles.statContent}>
                      <Text style={styles.statLabel}>{t('matchSheet.fields.location')}</Text>
                      <Text style={styles.statValue} numberOfLines={IS_MOBILE ? 2 : 1}>{translateUbicacion(matchSheet.ubicacion)}</Text>
                    </View>
                  </View>
                )}
                {(matchSheet.fase === 'eliminatoria' || matchSheet.fase === 'grupos' || matchSheet.jornada != null) && (
                  <View style={[styles.statCard, IS_MOBILE && styles.statCardMobile]}>
                    <View style={[styles.statIconBg, { backgroundColor: '#f3e8ff' }]}>
                      <Ionicons name="calendar" size={18} color="#9C27B0" />
                    </View>
                    <View style={styles.statContent}>
                      <Text style={styles.statLabel}>
                        {matchSheet.fase === 'eliminatoria' ? t('matchSheet.fields.round') : matchSheet.fase === 'grupos' ? t('matchSheet.fields.phase') : t('matchSheet.fields.matchday')}
                      </Text>
                      <Text style={styles.statValue} numberOfLines={IS_MOBILE ? 2 : 1}>
                        {matchSheet.fase === 'eliminatoria'
                          ? `${t(ROUND_I18N_KEYS[matchSheet.ronda] || 'matchSheet.fields.round')}${matchSheet.pierna === 'ida' ? ` (${t('matchSheet.fields.legFirst')})` : matchSheet.pierna === 'vuelta' ? ` (${t('matchSheet.fields.legSecond')})` : matchSheet.pierna === 'unico' ? ` (${t('matchSheet.fields.legSingle')})` : ''}`
                          : matchSheet.fase === 'grupos'
                            ? [matchSheet.grupo ? t('matchSheet.fields.groupN', { n: matchSheet.grupo }) : '', matchSheet.jornada ? `${t('matchSheet.fields.matchday')} ${matchSheet.jornada}` : ''].filter(Boolean).join(' - ')
                            : matchSheet.jornada != null ? `${t('matchSheet.fields.matchday')} ${matchSheet.jornada}` : ''}
                      </Text>
                    </View>
                  </View>
                )}
                {matchSheet.torneoId && typeof matchSheet.torneoId === 'object' && matchSheet.torneoId.nombre && (
                  <View style={[styles.statCard, IS_MOBILE && styles.statCardMobile]}>
                    <View style={[styles.statIconBg, { backgroundColor: matchSheet.torneoId.color ? matchSheet.torneoId.color + '28' : '#fef3c7' }]}>
                      <Ionicons name="trophy" size={18} color={matchSheet.torneoId.color || '#F59E0B'} />
                    </View>
                    <View style={styles.statContent}>
                      <Text style={styles.statLabel}>{t('matchSheet.fields.tournament')}</Text>
                      <Text style={styles.statValue} numberOfLines={IS_MOBILE ? 2 : 1}>{matchSheet.torneoId.nombre}</Text>
                    </View>
                  </View>
                )}
                {matchSheet.golesFavor != null && matchSheet.golesContra != null && (
                  <View style={[styles.statCard, IS_MOBILE && styles.statCardMobile]}>
                    <View style={[styles.statIconBg, { backgroundColor: '#fee2e2' }]}>
                      <Ionicons name="football" size={18} color="#FF5722" />
                    </View>
                    <View style={styles.statContent}>
                      <Text style={styles.statLabel}>{t('matchSheet.fields.result')}</Text>
                      <Text style={styles.statValue} numberOfLines={1}>
                        {(['casa','local'].includes((matchSheet.ubicacion || '').toLowerCase())) ? `${matchSheet.golesFavor} - ${matchSheet.golesContra}` : `${matchSheet.golesContra} - ${matchSheet.golesFavor}`}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Detalles */}
              <View style={styles.detailsSection}>
                {matchSheet.fechaHora && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="time-outline" size={18} color="#FF5722" />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.fields.dateTime')}</Text>
                    </View>
                    <Text style={styles.detailCardContent}>{formatDate(matchSheet.fechaHora)}</Text>
                  </View>
                )}

                {matchSheet.convocados && matchSheet.convocados.length > 0 && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="people" size={18} color="#4CAF50" />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.fields.called')} ({matchSheet.convocados.length})</Text>
                    </View>
                    <PlayerListWithFilters
                      playerIds={matchSheet.convocados}
                      allPlayers={players}
                      t={t}
                      isMobile={IS_MOBILE}
                    />
                  </View>
                )}

                {matchSheet.alineacionTitulares && matchSheet.alineacionTitulares.length > 0 && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="star" size={18} color="#FFC107" />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.fields.starters')} ({matchSheet.alineacionTitulares.length})</Text>
                    </View>
                    <PlayerListWithFilters
                      playerIds={matchSheet.alineacionTitulares}
                      allPlayers={players}
                      t={t}
                      isMobile={IS_MOBILE}
                    />
                  </View>
                )}

                {/* Alineación Visual */}
                {matchSheet.alineacion && matchSheet.alineacionTitulares && matchSheet.alineacionTitulares.length > 0 && (
                  <View
                    style={[styles.detailCard, IS_MOBILE && styles.detailCardLineupMobile]}
                    onLayout={e => setLineupCardWidth(e.nativeEvent.layout.width)}
                  >
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="football" size={18} color="#4CAF50" />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.lineup.visualLineup')} ({matchSheet.alineacion})</Text>
                    </View>
                    <LineupEditor
                      players={players}
                      convocados={[
                        ...(matchSheet.alineacionTitulares?.map(p => typeof p === 'object' ? p._id : p) || []),
                        ...(matchSheet.alineacionSuplentes?.map(p => typeof p === 'object' ? p._id : p) || [])
                      ]}
                      titulares={matchSheet.alineacionTitulares?.map(p => typeof p === 'object' ? p._id : p) || []}
                      suplentes={matchSheet.alineacionSuplentes?.map(p => typeof p === 'object' ? p._id : p) || []}
                      formation={matchSheet.alineacion}
                      readOnly={true}
                      showPhotos={true}
                      showNames={true}
                      jugadoresPorEquipo={team?.jugadoresPorEquipo || 11}
                      containerWidth={lineupContainerWidth}
                    />
                  </View>
                )}

                {matchSheet.notasEntrenador && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="document-text-outline" size={18} color="#2196F3" />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.fields.coachNotes')}</Text>
                    </View>
                    <Text style={styles.detailCardContent}>{matchSheet.notasEntrenador}</Text>
                  </View>
                )}

                {/* Goles */}
                {matchSheet.goles && matchSheet.goles.length > 0 && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="football" size={18} color="#4CAF50" />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.fields.goals')} ({matchSheet.goles.length})</Text>
                    </View>
                    {[...matchSheet.goles].sort((a, b) => {
                      const minA = parseInt(String(a.minuto).replace(/\+.*/, '')) || 0;
                      const minB = parseInt(String(b.minuto).replace(/\+.*/, '')) || 0;
                      return minA - minB;
                    }).map((gol, index) => {
                      const player = players.find(p => p._id === gol.jugador);
                      return (
                        <View key={index} style={styles.eventItem}>
                          <Text style={styles.eventMinute}>{gol.minuto}'</Text>
                          <Text style={styles.eventPlayer}>{player ? getPlayerFullName(player) : t('common.player')}</Text>
                          {gol.tipo && <Text style={styles.eventType}>({gol.tipo})</Text>}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Tarjetas Amarillas */}
                {matchSheet.tarjetasAmarillas && matchSheet.tarjetasAmarillas.length > 0 && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <View style={[styles.cardIndicator, { backgroundColor: '#FFC107' }]} />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.fields.yellowCards')} ({matchSheet.tarjetasAmarillas.length})</Text>
                    </View>
                      {[...matchSheet.tarjetasAmarillas].sort((a, b) => {
                      const minA = parseInt(String(a.minuto).replace(/\+.*/, '')) || 0;
                      const minB = parseInt(String(b.minuto).replace(/\+.*/, '')) || 0;
                      return minA - minB;
                    }).map((tarjeta, index) => {
                      const player = players.find(p => p._id === tarjeta.jugador);
                      return (
                        <View key={index} style={styles.eventItem}>
                          <Text style={styles.eventMinute}>{tarjeta.minuto}'</Text>
                          <Text style={styles.eventPlayer}>{player ? getPlayerFullName(player) : t('common.player')}</Text>
                          {tarjeta.motivo && <Text style={styles.eventType}>- {tarjeta.motivo}</Text>}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Tarjetas Rojas */}
                {matchSheet.tarjetasRojas && matchSheet.tarjetasRojas.length > 0 && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <View style={[styles.cardIndicator, { backgroundColor: '#F44336' }]} />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.fields.redCards')} ({matchSheet.tarjetasRojas.length})</Text>
                    </View>
                      {[...matchSheet.tarjetasRojas].sort((a, b) => {
                      const minA = parseInt(String(a.minuto).replace(/\+.*/, '')) || 0;
                      const minB = parseInt(String(b.minuto).replace(/\+.*/, '')) || 0;
                      return minA - minB;
                    }).map((tarjeta, index) => {
                      const player = players.find(p => p._id === tarjeta.jugador);
                      return (
                        <View key={index} style={styles.eventItem}>
                          <Text style={styles.eventMinute}>{tarjeta.minuto}'</Text>
                          <Text style={styles.eventPlayer}>{player ? getPlayerFullName(player) : t('common.player')}</Text>
                          {tarjeta.motivo && <Text style={styles.eventType}>- {tarjeta.motivo}</Text>}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Cambios */}
                {matchSheet.cambios && matchSheet.cambios.length > 0 && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="swap-horizontal" size={18} color="#9C27B0" />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.fields.changes')} ({matchSheet.cambios.length})</Text>
                    </View>
                    {[...matchSheet.cambios].sort((a, b) => {
                      const minA = parseInt(String(a.minuto).replace(/\+.*/, '')) || 0;
                      const minB = parseInt(String(b.minuto).replace(/\+.*/, '')) || 0;
                      return minA - minB;
                    }).map((cambio, index) => {
                      const salePlayer = players.find(p => p._id === (typeof cambio.sale === 'object' ? cambio.sale._id : cambio.sale));
                      const entraPlayer = players.find(p => p._id === (typeof cambio.entra === 'object' ? cambio.entra._id : cambio.entra));
                      return (
                        <View key={index} style={styles.eventItem}>
                          <Text style={styles.eventMinute}>{cambio.minuto}'</Text>
                          <View style={styles.cambioDetails}>
                            <View style={styles.cambioRow}>
                              <Ionicons name="arrow-down" size={14} color="#F44336" />
                              <Text style={[styles.eventPlayer, { color: '#F44336' }]}>{salePlayer ? getPlayerFullName(salePlayer) : t('common.player')}</Text>
                            </View>
                            <View style={styles.cambioRow}>
                              <Ionicons name="arrow-up" size={14} color="#4CAF50" />
                              <Text style={[styles.eventPlayer, { color: '#4CAF50' }]}>{entraPlayer ? getPlayerFullName(entraPlayer) : t('common.player')}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Goles del Rival */}
                {matchSheet.golesRival && matchSheet.golesRival.length > 0 && (
                  <View style={[styles.detailCard, { borderLeftWidth: 3, borderLeftColor: '#F44336', backgroundColor: '#fef2f2' }]}>
                    <View style={styles.detailCardHeader}>
                      <View style={{ backgroundColor: '#fee2e2', borderRadius: 20, padding: 6 }}>
                        <Ionicons name="football" size={18} color="#F44336" />
                      </View>
                      <Text style={[styles.detailCardTitle, { color: '#dc2626' }]}>{t('matchSheet.rivalGoals.title')} ({matchSheet.golesRival.length})</Text>
                    </View>
                    {[...matchSheet.golesRival].sort((a, b) => {
                      const minA = parseInt(String(a.minuto).replace(/\+.*/, '')) || 0;
                      const minB = parseInt(String(b.minuto).replace(/\+.*/, '')) || 0;
                      return minA - minB;
                    }).map((gol, index) => (
                      <View key={index} style={[styles.eventItem, { borderBottomColor: '#fecaca' }]}>
                        <View style={{ backgroundColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={[styles.eventMinute, { color: '#dc2626' }]}>{gol.minuto}'</Text>
                        </View>
                        <Ionicons name="football-outline" size={14} color="#ef4444" />
                        <Text style={[styles.eventPlayer, { color: '#dc2626', fontWeight: '500' }]}>{matchSheet.rival}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Botones de PDF - Componente reutilizable */}
            <MatchSheetPDFButtons
              matchSheet={matchSheet}
              onLineupPress={() => openLineupPDFModal(matchSheet)}
              onCallUpPress={() => openConvocatoriaPDFModal(matchSheet)}
              onMatchSheetPress={() => handleGenerateMatchSheetPDF(matchSheet)}
              generatingPDF={generatingPDF}
              generatingPDFType={generatingPDFType}
              layout="vertical"
            />

            {/* Botón Eliminar */}
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  Alert.alert(
                    t('matchSheet.deleteConfirm'),
                    t('matchSheet.deleteConfirmMessage', { rival: matchSheet.rival }),
                    [
                      { text: t('schedule.cancel'), style: 'cancel' },
                      {
                        text: t('message.delete'),
                        style: 'destructive',
                        onPress: () => onDelete(matchSheet),
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash" size={20} color={THEME.danger} />
                <Text style={styles.deleteButtonText}>{t('matchSheet.deleteMatch')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Modales de PDF - Componentes reutilizables */}
      <MatchSheetPDFModals
        showLineupModal={showLineupModal}
        onCloseLineupModal={closeLineupModal}
        onGenerateLineupPDF={handleGenerateLineupPDF}
        pdfOptions={pdfOptions}
        onPdfOptionsChange={setPdfOptions}
        showConvocatoriaPDFModal={showConvocatoriaPDFModal}
        onCloseConvocatoriaModal={closeConvocatoriaModal}
        onGenerateCallUpPDF={handleGenerateCallUpPDF}
        convocatoriaPDFData={convocatoriaPDFData}
        onConvocatoriaDataChange={setConvocatoriaPDFData}
        matchSheet={matchSheet}
        players={players}
        generatingPDF={generatingPDF}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  viewModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '98%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  viewModalContentTablet: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 800,
    maxHeight: '98%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
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
  modalEditButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  
  // Match Sheet Detail Card
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
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 12,
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
  
  // Stats
  detailSection: {
    marginBottom: 16,
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
    padding: 10,
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
  
  // Detail Cards
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
    overflow: 'hidden',
  },
  detailCardLineupMobile: {
    padding: 8,
    overflow: 'hidden',
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
  
  // Events
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
  cardIndicator: {
    width: 12,
    height: 16,
    borderRadius: 2,
  },
  
  // PDF Buttons
  pdfButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  pdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
    minHeight: 44,
  },
  pdfButtonPrimary: {
    backgroundColor: THEME.primary,
  },
  pdfButtonSecondary: {
    backgroundColor: THEME.surface,
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  pdfButtonFullSheet: {
    backgroundColor: '#FF5722',
    marginTop: 10,
    marginHorizontal: 16,
  },
  pdfButtonTextPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pdfButtonTextSecondary: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Delete Button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: THEME.danger + '10',
    borderWidth: 1,
    borderColor: THEME.danger + '30',
    gap: 8,
    marginBottom: 20,
  },
  deleteButtonText: {
    color: THEME.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // PDF Config Modal
  pdfConfigModal: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  pdfConfigBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: THEME.text,
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: THEME.text,
  },
});

// Estilos para la lista de jugadores (consistentes con jugadores.js)
const playerStyles = StyleSheet.create({
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  listCardIndicator: {
    width: 4,
    height: '100%',
    minHeight: 48,
  },
  listCardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  listCardInitials: {
    fontSize: 13,
    fontWeight: '700',
  },
  listCardContent: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  listCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 3,
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
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  listCardTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    paddingVertical: 2,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#3578e5',
    borderColor: '#3578e5',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  noResults: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    paddingVertical: 12,
  },
});
