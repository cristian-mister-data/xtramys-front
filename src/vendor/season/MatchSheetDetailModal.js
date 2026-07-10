// components/pages/season/MatchSheetDetailModal.js
// Modal de detalle de ficha de partido con PDFs de alineación y convocatoria
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Image,
  Linking,
} from 'react-native';
import { cdnUrl } from '@/config';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import useMatchSheetPDF from '@/vendor/matchSheet/useMatchSheetPDF';
import MatchSheetPDFModals, { MatchSheetPDFButtons } from '@/vendor/matchSheet/MatchSheetPDFModals';
import LineupEditor from '@/vendor/matchSheet/LineupEditor';
import SetPiecePreview from '@/vendor/matchSheet/SetPiecePreview';
import { getPlayerFullName, getPlayerInitials } from '@/utils/playerHelpers';
import { resolvePlayableVideoUrl, revokeVideoObjectUrl } from '@/utils/videoPlayback';
import { generateSetPiecesPdf } from '@/vendor/strategy/pdf';
import { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';
import { createMatchSheetSetPiecesShareLink } from '@/utils/api';
import { getScoutingReports, deleteScoutingReport } from '@/api/scouting';
import ScoutingDetailModal from '@/components/scouting/ScoutingDetailModal';

// Mapeo de rondas a claves i18n
const ROUND_I18N_KEYS = {
  final: 'tournaments.roundFinal',
  semifinal: 'tournaments.roundSemifinal',
  cuartos: 'tournaments.roundQuarters',
  octavos: 'tournaments.roundRound16',
  dieciseisavos: 'tournaments.roundRound32',
  treintaydosavos: 'tournaments.roundRound64',
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
  const theme = useTheme();
  const playerStyles = useMemo(() => makePlayerStyles(theme), [theme]);
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
            <View style={[playerStyles.listCardTag, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name="shirt-outline" size={11} color={theme.colors.primary} />
              <Text style={[playerStyles.listCardTagText, { color: theme.colors.primary }]}>#{player.dorsal}</Text>
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
  const theme = useTheme();
  const playerStyles = useMemo(() => makePlayerStyles(theme), [theme]);
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
          <Ionicons name="search" size={16} color={theme.colors.inputPlaceholder} />
          <TextInput
            style={playerStyles.searchInput}
            placeholder={t('player.searchPlaceholder')}
            placeholderTextColor={theme.colors.inputPlaceholder}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.inputPlaceholder} />
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
  canMutate,
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
  const [setPieceVideoUrl, setSetPieceVideoUrl] = useState(null);
  const [setPieceVideoTitle, setSetPieceVideoTitle] = useState('');
  const [loadingSetPieceVideo, setLoadingSetPieceVideo] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('data');
  const setPieceVideoPlayer = useVideoPlayer(setPieceVideoUrl || '', (player) => {
    if (setPieceVideoUrl) player.play();
  });
  
  const openExternalUrl = (url) => {
    if (!url) return;
    Linking.openURL(url).catch((err) => console.error("Error opening URL:", err));
  };
  
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

  const [scoutingReports, setScoutingReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    if (!visible || !matchSheet?._id) {
      setScoutingReports([]);
      return;
    }
    const loadScouting = async () => {
      try {
        const { data: reports } = await getScoutingReports({ matchSheet: matchSheet._id });
        setScoutingReports(reports || []);
      } catch (err) {
        console.error('Error loading scouting reports', err);
      }
    };
    loadScouting();
  }, [visible, matchSheet?._id]);

  const handleDeleteScouting = async (scoutReport) => {
    Alert.alert(
      'Eliminar Scouting',
      `¿Eliminar el informe de scouting de ${scoutReport.playerName}?`,
      [
        { text: t('schedule.cancel'), style: 'cancel' },
        {
          text: t('message.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScoutingReport(scoutReport._id);
              // Reload reports list
              const { data: reports } = await getScoutingReports({ matchSheet: matchSheet._id });
              setScoutingReports(reports || []);
              setSelectedReport(null);
              Alert.alert('Éxito', 'Informe de scouting eliminado');
            } catch (error) {
              console.error('Error deleting scouting report:', error);
              Alert.alert('Error', 'No se pudo eliminar el informe');
            }
          },
        },
      ]
    );
  };

  if (!matchSheet) return null;
  const jugadoresPorEquipo = matchSheet.jugadoresPorEquipo || team?.jugadoresPorEquipo || 11;

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
    if (!result) return theme.colors.textMuted;
    switch(result.toLowerCase()) {
      case 'victoria': case 'win': return theme.colors.success;
      case 'empate': case 'draw': return theme.colors.warning;
      case 'derrota': case 'loss': return theme.colors.error;
      default: return theme.colors.textMuted;
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

  const getAssignedPlayer = (assignment) => {
    if (assignment?.player && typeof assignment.player === 'object') return assignment.player;
    return players.find(p => String(p._id) === String(assignment?.player));
  };

  const buildSetPiecePlayerOverlays = (setPiece) => {
    const bySlot = new Map((setPiece?.assignments || []).map((assignment) => [String(assignment.slotId || ''), assignment]));
    const boardPlayers = (setPiece?.customElements || [])
      .filter((element) => element?.type === 'player' && element.playerData)
      .map((element, index) => {
        const slotId = String(element.id || element._id || `slot-${index}`);
        const assignment = bySlot.get(slotId);
        const player = getAssignedPlayer(assignment) || element.playerData;
        const name = getPlayerFullName(player);
        const photoUrl = assignment?.photoUrl || element.photoUrl || (player.foto ? cdnUrl(player.foto) : '');
        return {
          slotId,
          number: String(assignment?.number || element.number || element.playerNumber || element.numero || element.text || element.label || ''),
          exactSlot: false,
          xRatio: element.xRatio,
          yRatio: element.yRatio,
          x: element.x,
          y: element.y,
          playerData: {
            _id: player._id || player.id || '',
            nombre: name,
            name,
            demarcacion: player.demarcacion || player.posicion || player.position || '',
            posicion: player.posicion || player.position || '',
            foto: player.foto || '',
          },
          photoUrl,
          showPhotos: Boolean(photoUrl),
        };
      });
    if (boardPlayers.length) return boardPlayers;

    return (setPiece?.assignments || []).map((assignment) => {
      const player = getAssignedPlayer(assignment);
      if (!player) return null;
      const name = getPlayerFullName(player);
      const photoUrl = assignment.photoUrl || (player.foto ? cdnUrl(player.foto) : '');
      return {
        slotId: assignment.slotId,
        number: assignment.number,
        xRatio: assignment.xRatio,
        yRatio: assignment.yRatio,
        x: assignment.x,
        y: assignment.y,
        playerData: {
          _id: player._id,
          nombre: name,
          name,
          demarcacion: player.demarcacion || player.posicion || player.position || '',
          posicion: player.posicion || player.position || '',
          foto: player.foto || '',
        },
        photoUrl,
        showPhotos: Boolean(photoUrl),
      };
    })
    .filter(Boolean);
  };

  const downloadSetPiecesPdf = async () => {
    const setPieces = matchSheet?.setPieces || [];
    if (!setPieces.length) return;
    await generateSetPiecesPdf(
      setPieces.map((setPiece) => ({
        ...setPiece,
        kind: 'setPiece',
        imagen: normalizeImageSource(setPiece.customImage || setPiece.imagen || ''),
      })),
      t,
      `${matchSheet.rival || 'Ficha'} ABP`,
    );
  };

  const shareMatchSetPieces = async () => {
    try {
      const data = await createMatchSheetSetPiecesShareLink(matchSheet._id);
      const url = data?.url;
      if (!url) throw new Error('No share URL');
      const text = [t('setPieces.matchShareText'), matchSheet.rival, url].filter(Boolean).join('\n');
      const nav = typeof navigator !== 'undefined' ? navigator : null;
      if (nav?.share) {
        await nav.share({ title: t('setPieces.matchTab'), text, url });
        return;
      }
      await nav?.clipboard?.writeText(text);
      Alert.alert(t('message.success'), t('common.copied', 'Copiado'));
    } catch (error) {
      Alert.alert(t('message.error'), t('setPieces.shareError'));
    }
  };

  const getVideoId = (setPiece) => {
    const video = setPiece?.videoId || (Array.isArray(setPiece?.videos) ? setPiece.videos[0] : null);
    return typeof video === 'object' ? video?._id : video;
  };

  const playSetPieceVideo = async (setPiece) => {
    const videoId = getVideoId(setPiece);
    if (!videoId) return;
    setLoadingSetPieceVideo(true);
    setSetPieceVideoTitle(setPiece.nombre || t('setPieces.title'));
    try {
      setSetPieceVideoUrl(await resolvePlayableVideoUrl(
        videoId,
        setPiece.pizarraConfig?.matchVideoCopy ? undefined : { playerOverlays: buildSetPiecePlayerOverlays(setPiece) },
      ));
    } catch (error) {
      console.error('Error loading set piece video:', error);
      Alert.alert(t('message.error'), t('strategy.videoPlayError'));
    } finally {
      setLoadingSetPieceVideo(false);
    }
  };

  const closeSetPieceVideo = () => {
    if (setPieceVideoUrl) revokeVideoObjectUrl(setPieceVideoUrl);
    setSetPieceVideoUrl(null);
    setSetPieceVideoTitle('');
  };

  const openScouting = () => {
    const params = new URLSearchParams();
    if (matchSheet?._id) params.set('matchSheet', matchSheet._id);
    if (matchSheet?.rival) params.set('rival', matchSheet.rival);
    const rivalId = matchSheet?.rivalId?._id || matchSheet?.rivalId;
    if (rivalId) params.set('rivalId', rivalId);
    if (matchSheet?.competicion) params.set('competition', matchSheet.competicion);
    if (matchSheet?.fechaHora) params.set('date', new Date(matchSheet.fechaHora).toISOString().slice(0, 10));
    navigate(`/scouting?${params.toString()}`);
    onClose?.();
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MatchSheetPDFButtons
                matchSheet={matchSheet}
                onLineupPress={() => openLineupPDFModal(matchSheet)}
                onCallUpPress={() => openConvocatoriaPDFModal(matchSheet)}
                onMatchSheetPress={() => handleGenerateMatchSheetPDF(matchSheet)}
                generatingPDF={generatingPDF}
                generatingPDFType={generatingPDFType}
                compact={true}
              />
              <TouchableOpacity
                style={styles.modalEditButton}
                onPress={openScouting}
              >
                <Ionicons name="person-add-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              {onEdit && (
                <TouchableOpacity
                  style={styles.modalEditButton}
                  onPress={() => onEdit(matchSheet)}
                >
                  <Ionicons name="pencil" size={20} color={theme.colors.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={[styles.modalBody, IS_MOBILE && { paddingHorizontal: 14 }]} showsVerticalScrollIndicator={false}>
            {/* Card principal con rival y resultado */}
            <View style={styles.matchSheetDetailCard}>
              <View style={styles.matchSheetDetailHeader}>
                <Ionicons name="football" size={24} color={theme.colors.primary} />
                <Text style={styles.matchSheetDetailTitle}>{matchSheet.rival}</Text>
                {matchSheet.resultado && (
                  <View style={[styles.resultBadge, { backgroundColor: getResultBadgeColor(matchSheet.resultado) }]}>
                    <Text style={styles.resultText}>{translateResult(matchSheet.resultado)}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.detailTabs}>
              {[
                ['data', t('matchSheet.tabs.data', 'Datos'), 'document-text-outline'],
                ['abp', t('matchSheet.tabs.abp'), 'football-outline'],
              ].map(([key, label, icon]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.detailTab, activeDetailTab === key && styles.detailTabActive]}
                  onPress={() => setActiveDetailTab(key)}
                >
                  <Ionicons name={icon} size={16} color={activeDetailTab === key ? '#fff' : theme.colors.textSecondary} />
                  <Text style={[styles.detailTabText, activeDetailTab === key && styles.detailTabTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeDetailTab === 'abp' && (
              <View style={styles.detailCard}>
                <View style={styles.detailCardHeader}>
                  <Ionicons name="football-outline" size={18} color={theme.colors.primary} />
                  <Text style={styles.detailCardTitle}>{t('setPieces.matchTab')} ({matchSheet.setPieces?.length || 0})</Text>
                  {!!matchSheet.setPieces?.length && (
                    <View style={styles.setPieceActions}>
                      <TouchableOpacity style={[styles.setPieceActionBtn, { borderColor: theme.colors.error, backgroundColor: theme.colors.errorSoft }]} onPress={downloadSetPiecesPdf}>
                        <MaterialIcons name="picture-as-pdf" size={16} color={theme.colors.error} />
                        <Text style={[styles.setPieceActionText, { color: theme.colors.error }]}>PDF</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.setPieceActionBtn, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft }]} onPress={shareMatchSetPieces}>
                        <Ionicons name="share-social-outline" size={16} color={theme.colors.primary} />
                        <Text style={styles.setPieceActionText}>{t('setPieces.share')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                {matchSheet.setPieces?.length ? (
                  <View style={styles.setPiecesList}>
                    {matchSheet.setPieces.map((setPiece, index) => (
                      <View key={`${setPiece.strategyId || index}`} style={styles.setPieceDetailCard}>
                        <View style={styles.setPieceDetailHeader}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.setPieceDetailTitle} numberOfLines={1}>{setPiece.nombre}</Text>
                            {!!setPiece.descripcion && <Text style={styles.setPieceDetailDesc} numberOfLines={2}>{setPiece.descripcion}</Text>}
                            {!!setPiece.videoUrl && (
                              <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
                                onPress={() => openExternalUrl(setPiece.videoUrl)}
                              >
                                <Ionicons name="logo-youtube" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                                <Text style={{ color: theme.colors.primary, fontSize: 13, textDecorationLine: 'underline' }} numberOfLines={1}>
                                  {setPiece.videoUrl}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          {!!getVideoId(setPiece) && (
                            <TouchableOpacity style={styles.setPieceVideoBtn} onPress={() => playSetPieceVideo(setPiece)}>
                              <Ionicons name="play" size={16} color="#fff" />
                              <Text style={styles.setPieceVideoBtnText}>{t('strategy.play') || 'Ver'}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <SetPiecePreview setPiece={setPiece} players={players} height={IS_MOBILE ? 180 : 260} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.detailCardContent}>{t('setPieces.noResults')}</Text>
                )}
              </View>
            )}

            {activeDetailTab === 'data' && (
              <>
            {/* Stats */}
            <View style={styles.detailSection}>
              <View style={styles.statsRow}>
                {matchSheet.ubicacion && (
                  <View style={[styles.statCard, IS_MOBILE && styles.statCardMobile]}>
                    <View style={[styles.statIconBg, IS_MOBILE && styles.statIconBgMobile, { backgroundColor: theme.colors.infoSoft }]}>
                      <Ionicons name="location" size={18} color={theme.colors.info} />
                    </View>
                    <View style={[styles.statContent, IS_MOBILE && styles.statContentMobile]}>
                      <Text style={[styles.statLabel, IS_MOBILE && styles.statLabelMobile]}>{t('matchSheet.fields.location')}</Text>
                      <Text style={[styles.statValue, IS_MOBILE && styles.statValueMobile]} numberOfLines={IS_MOBILE ? 2 : 1}>{translateUbicacion(matchSheet.ubicacion)}</Text>
                    </View>
                  </View>
                )}
                {(matchSheet.fase === 'eliminatoria' || matchSheet.fase === 'grupos' || matchSheet.jornada != null) && (
                  <View style={[styles.statCard, IS_MOBILE && styles.statCardMobile]}>
                    <View style={[styles.statIconBg, IS_MOBILE && styles.statIconBgMobile, { backgroundColor: theme.colors.purpleSoft }]}>
                      <Ionicons name="calendar" size={18} color={theme.colors.purple} />
                    </View>
                    <View style={[styles.statContent, IS_MOBILE && styles.statContentMobile]}>
                      <Text style={[styles.statLabel, IS_MOBILE && styles.statLabelMobile]}>
                        {matchSheet.fase === 'eliminatoria' ? t('matchSheet.fields.round') : matchSheet.fase === 'grupos' ? t('matchSheet.fields.phase') : t('matchSheet.fields.matchday')}
                      </Text>
                      <Text style={[styles.statValue, IS_MOBILE && styles.statValueMobile]} numberOfLines={IS_MOBILE ? 2 : 1}>
                        {matchSheet.fase === 'eliminatoria'
                          ? `${t(ROUND_I18N_KEYS[matchSheet.ronda] || 'matchSheet.fields.round')}${matchSheet.pierna === 'ida' ? ` (${t('matchSheet.fields.legFirst')})` : matchSheet.pierna === 'vuelta' ? ` (${t('matchSheet.fields.legSecond')})` : matchSheet.pierna === 'unico' ? ` (${t('matchSheet.fields.legSingle')})` : ''}`
                          : matchSheet.fase === 'grupos'
                            ? [matchSheet.grupo ? t('matchSheet.fields.groupN', { n: matchSheet.grupo }) : '', matchSheet.jornada ? `${t('matchSheet.fields.matchday')} ${matchSheet.jornada}` : '', matchSheet.pierna === 'ida' ? t('matchSheet.fields.legFirst') : matchSheet.pierna === 'vuelta' ? t('matchSheet.fields.legSecond') : ''].filter(Boolean).join(' - ')
                            : matchSheet.jornada != null ? `${t('matchSheet.fields.matchday')} ${matchSheet.jornada}` : ''}
                      </Text>
                    </View>
                  </View>
                )}
                {matchSheet.torneoId && typeof matchSheet.torneoId === 'object' && matchSheet.torneoId.nombre && (
                  <View style={[styles.statCard, IS_MOBILE && styles.statCardMobile]}>
                    <View style={[styles.statIconBg, IS_MOBILE && styles.statIconBgMobile, { backgroundColor: matchSheet.torneoId.color ? matchSheet.torneoId.color + '28' : theme.colors.warningSoft }]}>
                      <Ionicons name="trophy" size={18} color={matchSheet.torneoId.color || theme.colors.warning} />
                    </View>
                    <View style={[styles.statContent, IS_MOBILE && styles.statContentMobile]}>
                      <Text style={[styles.statLabel, IS_MOBILE && styles.statLabelMobile]}>{t('matchSheet.fields.tournament')}</Text>
                      <Text style={[styles.statValue, IS_MOBILE && styles.statValueMobile]} numberOfLines={IS_MOBILE ? 2 : 1}>{matchSheet.torneoId.nombre}</Text>
                    </View>
                  </View>
                )}
                {matchSheet.golesFavor != null && matchSheet.golesContra != null && (
                  <View style={[styles.statCard, IS_MOBILE && styles.statCardMobile]}>
                    <View style={[styles.statIconBg, IS_MOBILE && styles.statIconBgMobile, { backgroundColor: theme.colors.errorSoft }]}>
                      <Ionicons name="football" size={18} color={theme.colors.error} />
                    </View>
                    <View style={[styles.statContent, IS_MOBILE && styles.statContentMobile]}>
                      <Text style={[styles.statLabel, IS_MOBILE && styles.statLabelMobile]}>{t('matchSheet.fields.result')}</Text>
                      <Text style={[styles.statValue, IS_MOBILE && styles.statValueMobile]} numberOfLines={1}>
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
                      <Ionicons name="time-outline" size={18} color={theme.colors.error} />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.fields.dateTime')}</Text>
                    </View>
                    <Text style={styles.detailCardContent}>{formatDate(matchSheet.fechaHora)}</Text>
                  </View>
                )}

                {matchSheet.convocados && matchSheet.convocados.length > 0 && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="people" size={18} color={theme.colors.success} />
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

                {matchSheet.noConvocados && matchSheet.noConvocados.length > 0 && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="people-outline" size={18} color={theme.colors.textSecondary} />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.fields.notCalled')} ({matchSheet.noConvocados.length})</Text>
                    </View>
                    <PlayerListWithFilters
                      playerIds={matchSheet.noConvocados}
                      allPlayers={players}
                      t={t}
                      isMobile={IS_MOBILE}
                    />
                  </View>
                )}

                {matchSheet.alineacionTitulares && matchSheet.alineacionTitulares.length > 0 && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="star" size={18} color={theme.colors.warning} />
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
                      <Ionicons name="football" size={18} color={theme.colors.success} />
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
                      jugadoresPorEquipo={jugadoresPorEquipo}
                      containerWidth={lineupContainerWidth}
                    />
                  </View>
                )}


                {matchSheet.notasEntrenador && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="document-text-outline" size={18} color={theme.colors.info} />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.fields.coachNotes')}</Text>
                    </View>
                    <Text style={styles.detailCardContent}>{matchSheet.notasEntrenador}</Text>
                  </View>
                )}

                {matchSheet.partidoUrl && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="link-outline" size={18} color={theme.colors.primary} />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.fields.matchLink', 'Enlace del partido')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => Linking.openURL(matchSheet.partidoUrl)}>
                      <Text style={[styles.detailCardContent, styles.matchLink]}>{matchSheet.partidoUrl}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Goles */}
                {matchSheet.goles && matchSheet.goles.length > 0 && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="football" size={18} color={theme.colors.success} />
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
                      <View style={[styles.cardIndicator, { backgroundColor: '#fbbf24' }]} />
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
                      <View style={[styles.cardIndicator, { backgroundColor: theme.colors.error }]} />
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
                      <Ionicons name="swap-horizontal" size={18} color={theme.colors.purple} />
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
                              <Ionicons name="arrow-down" size={14} color={theme.colors.error} />
                              {salePlayer?.foto ? (
                                <Image source={{ uri: cdnUrl(salePlayer.foto) }} style={styles.cambioAvatar} />
                              ) : (
                                <View style={styles.cambioAvatarPlaceholder}>
                                  <Text style={styles.cambioAvatarPlaceholderText}>
                                    {getPlayerInitials ? getPlayerInitials(salePlayer) : '?'}
                                  </Text>
                                </View>
                              )}
                              <Text style={[styles.eventPlayer, { color: theme.colors.error }]}>{salePlayer ? getPlayerFullName(salePlayer) : t('common.player')}</Text>
                            </View>
                            <View style={styles.cambioRow}>
                              <Ionicons name="arrow-up" size={14} color={theme.colors.success} />
                              {entraPlayer?.foto ? (
                                <Image source={{ uri: cdnUrl(entraPlayer.foto) }} style={styles.cambioAvatar} />
                              ) : (
                                <View style={styles.cambioAvatarPlaceholder}>
                                  <Text style={styles.cambioAvatarPlaceholderText}>
                                    {getPlayerInitials ? getPlayerInitials(entraPlayer) : '?'}
                                  </Text>
                                </View>
                              )}
                              <Text style={[styles.eventPlayer, { color: theme.colors.success }]}>{entraPlayer ? getPlayerFullName(entraPlayer) : t('common.player')}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Goles del Rival */}
                {matchSheet.golesRival && matchSheet.golesRival.length > 0 && (
                  <View style={[styles.detailCard, { borderLeftWidth: 3, borderLeftColor: theme.colors.error, backgroundColor: theme.colors.errorSoft }]}>
                    <View style={styles.detailCardHeader}>
                      <View style={{ backgroundColor: theme.colors.errorSoft, borderRadius: 20, padding: 6 }}>
                        <Ionicons name="football" size={18} color={theme.colors.error} />
                      </View>
                      <Text style={[styles.detailCardTitle, { color: theme.colors.errorSoftText }]}>{t('matchSheet.rivalGoals.title')} ({matchSheet.golesRival.length})</Text>
                    </View>
                    {[...matchSheet.golesRival].sort((a, b) => {
                      const minA = parseInt(String(a.minuto).replace(/\+.*/, '')) || 0;
                      const minB = parseInt(String(b.minuto).replace(/\+.*/, '')) || 0;
                      return minA - minB;
                    }).map((gol, index) => (
                      <View key={index} style={[styles.eventItem, { borderBottomColor: theme.colors.errorSoft }]}>
                        <View style={{ backgroundColor: theme.colors.errorSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={[styles.eventMinute, { color: theme.colors.errorSoftText }]}>{gol.minuto}'</Text>
                        </View>
                        <Ionicons name="football-outline" size={14} color={theme.colors.error} />
                        <Text style={[styles.eventPlayer, { color: theme.colors.errorSoftText, fontWeight: '500' }]}>{matchSheet.rival}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

                {/* Scouting Players List */}
                {scoutingReports.length > 0 && (
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Ionicons name="person" size={18} color={theme.colors.primary} />
                      <Text style={styles.detailCardTitle}>{t('matchSheet.featuredPlayers', 'Jugadores destacados')} ({scoutingReports.length})</Text>
                    </View>
                    {scoutingReports.map((report) => (
                      <TouchableOpacity
                        key={report._id}
                        onPress={() => setSelectedReport(report)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: theme.colors.backgroundAlt,
                          padding: 12,
                          borderRadius: 8,
                          marginVertical: 4,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: 'bold', fontSize: 14, color: theme.colors.text }}>
                            {report.playerName}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 }}>
                            {[report.position, report.playerTeam].filter(Boolean).join(' - ') || 'Sin posición/equipo'}
                          </Text>
                        </View>
                        {report.rating && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.warningSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                            <Ionicons name="star" size={12} color={theme.colors.warning} />
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.warningSoftText }}>{report.rating}/10</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

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
                <Ionicons name="trash" size={20} color={theme.colors.error} />
                <Text style={styles.deleteButtonText}>{t('matchSheet.deleteMatch')}</Text>
              </TouchableOpacity>
            )}
              </>
            )}
          </ScrollView>
        </View>
      </View>

      <Modal
        visible={!!setPieceVideoUrl || loadingSetPieceVideo}
        transparent
        animationType="fade"
        onRequestClose={closeSetPieceVideo}
      >
        <View style={styles.videoModalBg}>
          <View style={styles.videoModalContent}>
            <View style={styles.videoModalHeader}>
              <Text style={styles.videoModalTitle} numberOfLines={1}>{setPieceVideoTitle}</Text>
              <TouchableOpacity onPress={closeSetPieceVideo} style={styles.videoModalCloseBtn}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            {loadingSetPieceVideo ? (
              <View style={styles.videoGeneratingContainer}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.videoGeneratingText}>{t('common.loading', 'Cargando...')}</Text>
              </View>
            ) : (
              <View style={styles.videoPlayerContainer}>
                <VideoView player={setPieceVideoPlayer} style={styles.videoPlayer} allowsFullscreen allowsPictureInPicture />
              </View>
            )}
          </View>
        </View>
      </Modal>

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

      {/* Scouting Detail Sub-Modal */}
      <ScoutingDetailModal
        visible={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        report={selectedReport}
        onEdit={(rep) => {
          setSelectedReport(null);
          onClose?.();
          navigate(`/scouting?edit=${rep._id}&matchSheet=${matchSheet._id}`);
        }}
        onDelete={canMutate !== false ? handleDeleteScouting : undefined}
      />
    </Modal>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  viewModalContent: {
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.surface,
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
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalEditButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundAlt,
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundAlt,
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
    backgroundColor: theme.colors.backgroundAlt,
    padding: 16,
    borderRadius: 12,
  },
  matchSheetDetailTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
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
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardMobile: {
    flex: 0,
    width: '47%',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
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
  statIconBgMobile: {
    marginRight: 0,
    marginBottom: 8,
  },
  statContent: {
    flex: 1,
    minWidth: 0,
  },
  statContentMobile: {
    alignItems: 'center',
    width: '100%',
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statLabelMobile: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statValueMobile: {
    textAlign: 'center',
  },
  detailTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  detailTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  detailTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  detailTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  detailTabTextActive: {
    color: '#fff',
  },

  // Detail Cards
  detailsSection: {
    gap: 16,
  },
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.text,
    marginLeft: 8,
  },
  detailCardContent: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  matchLink: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  setPiecesList: {
    gap: 12,
  },
  setPieceDetailCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    padding: 10,
    gap: 10,
  },
  setPieceDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  setPieceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    maxWidth: 260,
    marginLeft: 'auto',
  },
  setPieceDetailTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  setPieceDetailDesc: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  setPieceVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  setPieceVideoBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  setPieceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  setPieceActionText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  // Events
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 8,
  },
  eventMinute: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    minWidth: 35,
  },
  eventPlayer: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  eventType: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.primary,
  },
  pdfButtonSecondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  pdfButtonFullSheet: {
    backgroundColor: theme.colors.error,
    marginTop: 10,
    marginHorizontal: 16,
  },
  pdfButtonTextPrimary: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  pdfButtonTextSecondary: {
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: theme.colors.error,
    gap: 8,
    marginBottom: 20,
  },
  deleteButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  videoModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  videoModalContent: {
    width: '100%',
    maxWidth: 900,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  videoModalTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  videoModalCloseBtn: {
    padding: 4,
  },
  videoGeneratingContainer: {
    height: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  videoGeneratingText: {
    color: '#fff',
    fontWeight: '700',
  },
  videoPlayerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },

  // PDF Config Modal
  pdfConfigModal: {
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
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
    color: theme.colors.text,
  },
});

// Estilos para la lista de jugadores (consistentes con jugadores.js)
const makePlayerStyles = (theme) => StyleSheet.create({
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.text,
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
    backgroundColor: theme.colors.backgroundAlt,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  listCardTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
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
    backgroundColor: theme.colors.backgroundAlt,
    marginRight: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  noResults: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 13,
    paddingVertical: 12,
  },
  cambioAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  cambioAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  cambioAvatarPlaceholderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
});
