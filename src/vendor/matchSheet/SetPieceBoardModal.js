import React, { useMemo, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'styled-components';
import { cdnUrl } from '@/config';
import { getPlayerFullName, getPlayerInitials } from '@/utils/playerHelpers';
import { getContentImage, usesImportedImage } from '@/utils/contentVisual';

const getId = (value) => (typeof value === 'object' ? value?._id : value);

export default function SetPieceBoardModal({ visible, setPiece, players = [], onClose, onAssign, onPlayVideo }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 780;
  const styles = useMemo(() => makeStyles(theme, isCompact), [theme, isCompact]);
  const [slotId, setSlotId] = useState(null);
  const assignments = Array.isArray(setPiece?.assignments) ? setPiece.assignments : [];
  const elements = Array.isArray(setPiece?.elementosCampo) ? setPiece.elementosCampo : [];
  const active = assignments.find(a => a.slotId === slotId) || assignments[0];
  const activeSlotId = active?.slotId || slotId;

  const markers = assignments.map((assignment) => {
    const element = elements.find((item) => String(item.id || item._id || '') === String(assignment.slotId));
    const playerId = getId(assignment.player);
    const player = players.find((p) => String(p._id) === String(playerId)) || assignment.player;
    return { ...assignment, element, player, x: element?.xRatio, y: element?.yRatio };
  }).filter(item => item.x !== undefined && item.y !== undefined);
  const importedSelected = usesImportedImage(setPiece);

  const assign = (playerId) => {
    if (!activeSlotId) return;
    onAssign?.(activeSlotId, playerId);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.shell}>
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>ABP</Text>
              <Text style={styles.title} numberOfLines={1}>{setPiece?.nombre}</Text>
            </View>
            <View style={styles.headerActions}>
              {!importedSelected && !!setPiece?.videoId && (
                <TouchableOpacity style={styles.playBtn} onPress={onPlayVideo}>
                  <Ionicons name="play-circle-outline" size={18} color="#fff" />
                  <Text style={styles.playText}>Video</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.boardWrap}>
              {getContentImage(setPiece) ? (
                <Image source={{ uri: getContentImage(setPiece) }} style={styles.boardImage} resizeMode="contain" />
              ) : (
                <View style={styles.empty}><Text style={styles.muted}>Sin grafico</Text></View>
              )}
              {markers.map((marker) => {
                const selected = marker.slotId === activeSlotId;
                const hasPlayer = marker.player && typeof marker.player === 'object';
                return (
                  <TouchableOpacity
                    key={marker.slotId}
                    style={[
                      styles.marker,
                      { left: `${Math.max(0, Math.min(1, marker.x)) * 100}%`, top: `${Math.max(0, Math.min(1, marker.y)) * 100}%` },
                      selected && styles.markerSelected,
                    ]}
                    onPress={() => setSlotId(marker.slotId)}
                    activeOpacity={0.86}
                  >
                    {hasPlayer && marker.player?.foto ? (
                      <Image source={{ uri: cdnUrl(marker.player.foto) }} style={styles.avatar} />
                    ) : hasPlayer ? (
                      <View style={styles.avatarInitials}><Text style={styles.avatarInitialsText}>{getPlayerInitials(marker.player)}</Text></View>
                    ) : (
                      <View style={styles.number}><Text style={styles.numberText}>#{marker.number}</Text></View>
                    )}
                    <Text style={styles.markerName} numberOfLines={1}>{hasPlayer ? getPlayerFullName(marker.player) : `#${marker.number}`}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.side}>
              <Text style={styles.sideTitle}>{active ? `Dorsal #${active.number}` : 'Selecciona un jugador'}</Text>
              <ScrollView contentContainerStyle={styles.players}>
                <TouchableOpacity style={[styles.playerItem, !active?.player && styles.playerSelected]} onPress={() => assign(null)}>
                  <View style={styles.noneIcon}><Ionicons name="remove" size={16} color={theme.colors.textSecondary} /></View>
                  <Text style={styles.playerName}>Sin asignar</Text>
                </TouchableOpacity>
                {players.map((player) => {
                  const selected = String(active?.player || '') === String(player._id);
                  return (
                    <TouchableOpacity key={player._id} style={[styles.playerItem, selected && styles.playerSelected]} onPress={() => assign(player._id)}>
                      {player.foto ? (
                        <Image source={{ uri: cdnUrl(player.foto) }} style={styles.playerPhoto} />
                      ) : (
                        <View style={styles.playerInitials}><Text style={styles.playerInitialsText}>{getPlayerInitials(player)}</Text></View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.playerName} numberOfLines={1}>{getPlayerFullName(player)}</Text>
                        {!!player.dorsal && <Text style={styles.playerMeta}>#{player.dorsal}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme, isCompact) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', padding: isCompact ? 8 : 18 },
  shell: { flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  header: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  kicker: { color: theme.colors.primary, fontSize: 11, fontWeight: '900' },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '900', maxWidth: isCompact ? 220 : 520 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 10, backgroundColor: theme.colors.primary },
  playText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  closeBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: theme.colors.background },
  body: { flex: 1, flexDirection: isCompact ? 'column' : 'row' },
  boardWrap: { flex: 1, position: 'relative', backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
  boardImage: { width: '100%', height: '100%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: theme.colors.textSecondary, fontWeight: '800' },
  marker: { position: 'absolute', width: 96, marginLeft: -48, marginTop: -34, alignItems: 'center' },
  markerSelected: { transform: [{ scale: 1.08 }] },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: '#fff', backgroundColor: theme.colors.surface },
  avatarInitials: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: '#fff', backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitialsText: { color: '#fff', fontWeight: '900' },
  number: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: '#fff', backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  numberText: { color: '#fff', fontWeight: '900' },
  markerName: { marginTop: 4, maxWidth: 92, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(15,23,42,0.86)', color: '#fff', fontSize: 11, fontWeight: '900' },
  side: { width: isCompact ? '100%' : 320, maxHeight: isCompact ? 250 : undefined, borderLeftWidth: isCompact ? 0 : 1, borderTopWidth: isCompact ? 1 : 0, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 12 },
  sideTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '900', marginBottom: 10 },
  players: { gap: 8, paddingBottom: 18 },
  playerItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  playerSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  playerPhoto: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.surface },
  playerInitials: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  playerInitialsText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  noneIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  playerName: { color: theme.colors.text, fontWeight: '800', fontSize: 13 },
  playerMeta: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 11 },
});
