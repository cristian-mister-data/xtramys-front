import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateMatchSheet } from '@/store/slices/matchSheet/matchSheetThunks';
import { getPlayerFullName } from '@/utils/playerHelpers';

const TEAM_FIELDS = ['posesion', 'tiros', 'tirosAPuerta', 'corners', 'faltas', 'fueras', 'pasesCompletados', 'recuperaciones', 'perdidas', 'duelosGanados', 'duelosPerdidos'];
const PLAYER_FIELDS = ['tiros', 'tirosAPuerta', 'pasesCompletados', 'recuperaciones', 'perdidas', 'duelosGanados', 'valoracion'];
const idOf = (value) => String(value?._id || value?.player?._id || value?.player || value || '');
const valueOf = (value) => value == null ? '' : String(value);

export default function MatchStatisticsModal({ visible, matchSheet, players = [], onClose, onSaved }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, width, insets.top, insets.bottom), [theme, width, insets.top, insets.bottom]);
  const [teamStats, setTeamStats] = useState({});
  const [events, setEvents] = useState([]);
  const [saving, setSaving] = useState(false);
  const roster = useMemo(() => {
    const ids = [...(matchSheet?.convocados || []), ...(matchSheet?.alineacionTitulares || []), ...(matchSheet?.alineacionSuplentes || [])].map(idOf).filter(Boolean);
    return [...new Set(ids)].map((id) => players.find((p) => String(p._id) === id) || { _id: id, nombre: id });
  }, [matchSheet, players]);

  useEffect(() => {
    if (!visible) return;
    setTeamStats({ ...(matchSheet?.estadisticas || {}) });
    const old = new Map((matchSheet?.eventos || []).map((item) => [idOf(item.player), { ...item }]));
    setEvents(roster.map((player) => ({ ...(old.get(String(player._id)) || {}), player: player._id })));
  }, [visible, matchSheet, roster]);

  const setNumber = (setter, key, raw) => setter((prev) => ({ ...prev, [key]: raw === '' ? '' : Number(raw) }));
  const save = async () => {
    setSaving(true);
    try {
      const normalizedEvents = events.map((event) => ({ ...event, player: idOf(event.player) }));
      const updatedMatchSheet = await dispatch(updateMatchSheet({
        id: matchSheet._id,
        data: { estadisticas: teamStats, eventos: normalizedEvents },
      })).unwrap();
      onSaved?.(updatedMatchSheet);
      onClose?.();
    } catch (error) {
      Alert.alert(
        t('message.error', 'Error'),
        (typeof error === 'string' ? error : error?.response?.data?.message) || t('matchSheet.statistics.saveError', 'No se pudieron guardar las estadísticas.'),
      );
    } finally { setSaving(false); }
  };
  const downloadPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const title = t('matchSheet.statistics.title', 'Estadísticas del partido');
    const fieldLabel = (key) => t(`matchSheet.statistics.fields.${key}`, key);
    const colors = {
      ink: [15, 23, 42],
      muted: [71, 85, 105],
      border: [203, 213, 225],
      header: [30, 64, 120],
      soft: [248, 250, 252],
      alt: [241, 245, 249],
    };
    const setRgb = (method, color) => pdf[method](color[0], color[1], color[2]);
    const drawCell = (x, y, width, height, text, options = {}) => {
      const { header = false, shaded = false, bold = false, center = false } = options;
      setRgb('setFillColor', header ? colors.header : shaded ? colors.alt : colors.soft);
      setRgb('setDrawColor', colors.border);
      pdf.rect(x, y, width, height, 'FD');
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(header ? 7.2 : 8);
      setRgb('setTextColor', header ? [255, 255, 255] : colors.ink);
      pdf.text(String(text ?? '-'), center ? x + width / 2 : x + 2.5, y + height / 2 + 1.4, {
        align: center ? 'center' : 'left',
        maxWidth: width - 5,
      });
    };
    const drawMetric = (x, y, width, label, value) => {
      setRgb('setFillColor', colors.soft);
      setRgb('setDrawColor', colors.border);
      pdf.roundedRect(x, y, width, 17, 2, 2, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.8);
      setRgb('setTextColor', colors.muted);
      pdf.text(String(label).toUpperCase(), x + 3, y + 5, { maxWidth: width - 6 });
      pdf.setFontSize(10);
      setRgb('setTextColor', colors.ink);
      pdf.text(String(value ?? '-'), x + 3, y + 13, { maxWidth: width - 6 });
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    setRgb('setTextColor', colors.ink);
    pdf.text(`${title} - ${matchSheet?.rival || ''}`, margin, 17);
    pdf.setFontSize(9);
    setRgb('setTextColor', colors.muted);
    pdf.text(matchSheet?.fechaHora ? new Date(matchSheet.fechaHora).toLocaleDateString() : '', margin, 24);

    let y = 34;
    pdf.setFontSize(11);
    setRgb('setTextColor', colors.ink);
    pdf.text(t('matchSheet.statistics.team', 'Estadísticas del equipo'), margin, y);
    y += 6;
    const teamColumns = 4;
    const teamGap = 4;
    const teamWidth = (pageWidth - margin * 2 - teamGap * (teamColumns - 1)) / teamColumns;
    const teamRows = Math.ceil(TEAM_FIELDS.length / teamColumns);
    for (let row = 0; row < teamRows; row += 1) {
      for (let col = 0; col < teamColumns; col += 1) {
        const key = TEAM_FIELDS[row * teamColumns + col];
        if (!key) continue;
        const x = margin + col * (teamWidth + teamGap);
        drawMetric(x, y, teamWidth, fieldLabel(key), teamStats[key]);
      }
      y += 20;
    }
    y += 5;
    pdf.setFontSize(11);
    setRgb('setTextColor', colors.ink);
    pdf.text(t('matchSheet.statistics.players', 'Estadísticas por jugador'), margin, y);
    y += 6;

    const columns = [
      t('player.player', 'Jugador'),
      ...PLAYER_FIELDS.map(fieldLabel),
    ];
    const widths = [50, 27, 32, 32, 32, 27, 34, 29];
    const rowHeight = 12;
    const drawHeader = () => {
      let x = margin;
      columns.forEach((column, index) => {
        drawCell(x, y, widths[index], rowHeight, column, { header: true, bold: true, center: index !== 0 });
        x += widths[index];
      });
      y += rowHeight;
    };
    drawHeader();
    events.forEach((event, rowIndex) => {
      if (y + rowHeight > pageHeight - 12) {
        pdf.addPage();
        y = 14;
        pdf.setFontSize(11);
        setRgb('setTextColor', colors.ink);
        pdf.text(`${title} - ${matchSheet?.rival || ''}`, margin, y);
        y += 6;
        drawHeader();
      }
      const player = players.find((p) => String(p._id) === String(event.player));
      const values = [getPlayerFullName(player) || player?.nombre || event.player, ...PLAYER_FIELDS.map((key) => event[key] ?? '-')];
      let x = margin;
      values.forEach((value, index) => {
        drawCell(x, y, widths[index], rowHeight, value, { shaded: rowIndex % 2 === 1, bold: index === 0, center: index !== 0 });
        x += widths[index];
      });
      y += rowHeight;
    });
    const fileName = `estadisticas-${String(matchSheet?.rival || 'partido').replace(/\s+/g, '-')}.pdf`;
    if (Platform.OS === 'web') {
      pdf.save(fileName);
      return;
    }
    const FileSystem = await import('expo-file-system/legacy');
    const Sharing = await import('expo-sharing');
    const target = `${FileSystem.cacheDirectory}${fileName}`;
    const base64 = pdf.output('datauristring').split(',')[1];
    await FileSystem.writeAsStringAsync(target, base64, { encoding: FileSystem.EncodingType.Base64 });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(target, { mimeType: 'application/pdf', dialogTitle: fileName });
  };

  const matchMeta = [
    matchSheet?.rival,
    matchSheet?.fechaHora ? new Date(matchSheet.fechaHora).toLocaleDateString() : null,
  ].filter(Boolean).join(' · ');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={saving ? undefined : onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="stats-chart" size={21} color={theme.colors.primary} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{t('matchSheet.statistics.title', 'Estadísticas del partido')}</Text>
              {!!matchMeta && <Text style={styles.subtitle} numberOfLines={1}>{matchMeta}</Text>}
            </View>
            <TouchableOpacity
              accessibilityLabel={t('common.close', 'Cerrar')}
              title={t('common.close', 'Cerrar')}
              style={styles.closeButton}
              onPress={onClose}
              disabled={saving}
            >
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="football-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.sectionCopy}>
                  <Text style={styles.sectionTitle}>{t('matchSheet.statistics.team', 'Estadísticas del equipo')}</Text>
                  <Text style={styles.sectionHint}>{t('matchSheet.statistics.teamHint', 'Resumen global del rendimiento del equipo')}</Text>
                </View>
                <View style={styles.countBadge}><Text style={styles.countBadgeText}>{TEAM_FIELDS.length}</Text></View>
              </View>
              <View style={styles.grid}>
                {TEAM_FIELDS.map((key) => (
                  <StatField
                    key={key}
                    styles={styles}
                    theme={theme}
                    label={t(`matchSheet.statistics.fields.${key}`, key)}
                    value={valueOf(teamStats[key])}
                    onChange={(raw) => setNumber(setTeamStats, key, raw)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.playersSectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="people-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>{t('matchSheet.statistics.players', 'Estadísticas por jugador')}</Text>
                <Text style={styles.sectionHint}>{t('matchSheet.statistics.playersHint', 'Rendimiento individual de los jugadores convocados')}</Text>
              </View>
              <View style={styles.countBadge}><Text style={styles.countBadgeText}>{events.length}</Text></View>
            </View>

            <View style={styles.playerList}>
              {events.map((event, index) => {
                const player = players.find((item) => String(item._id) === String(event.player));
                const playerName = getPlayerFullName(player) || player?.nombre || event.player;
                return (
                  <View key={event.player} style={styles.playerCard}>
                    <View style={styles.playerHeader}>
                      <View style={styles.playerNumber}>
                        <Text style={styles.playerNumberText}>{player?.dorsal || index + 1}</Text>
                      </View>
                      <View style={styles.playerCopy}>
                        <Text style={styles.playerName} numberOfLines={1}>{playerName}</Text>
                        {!!player?.posicion && <Text style={styles.playerMeta}>{player.posicion}</Text>}
                      </View>
                    </View>
                    <View style={styles.grid}>
                      {PLAYER_FIELDS.map((key) => (
                        <StatField
                          key={key}
                          styles={styles}
                          theme={theme}
                          label={t(`matchSheet.statistics.fields.${key}`, key)}
                          value={valueOf(event[key])}
                          onChange={(raw) => setEvents((prev) => prev.map((item) => (
                            String(item.player) === String(event.player)
                              ? { ...item, [key]: raw === '' ? '' : Number(raw) }
                              : item
                          )))}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              title={t('matchSheet.statistics.downloadPdf', 'Descargar PDF')}
              style={styles.secondaryButton}
              onPress={downloadPdf}
              disabled={saving}
            >
              <Ionicons name="download-outline" size={18} color={theme.colors.text} />
              <Text style={styles.secondaryButtonText}>{t('matchSheet.statistics.downloadPdf', 'Descargar PDF')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              title={t('common.save', 'Guardar')}
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              onPress={save}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={19} color="#fff" />}
              <Text style={styles.primaryButtonText}>
                {saving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StatField({ styles, theme, label, value, onChange }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        keyboardType="numeric"
        inputMode="decimal"
        placeholder="—"
        placeholderTextColor={theme.colors.inputPlaceholder}
        selectTextOnFocus
        onChangeText={onChange}
      />
    </View>
  );
}

const makeStyles = (theme, width, insetTop, insetBottom) => {
  const isMobile = width < 600;
  const isTablet = width >= 600 && width < 1024;
  const horizontalPadding = isMobile ? 14 : isTablet ? 20 : 24;

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay || 'rgba(2, 6, 23, 0.68)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isMobile ? 0 : isTablet ? 18 : 28,
    },
    container: {
      width: '100%',
      maxWidth: isTablet ? 920 : 1240,
      height: isMobile ? '100%' : undefined,
      maxHeight: isMobile ? '100%' : '94%',
      backgroundColor: theme.colors.surface,
      borderRadius: isMobile ? 0 : 18,
      borderWidth: isMobile ? 0 : 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.3,
      shadowRadius: 36,
      elevation: 18,
    },
    header: {
      minHeight: isMobile ? 72 : 82,
      paddingHorizontal: horizontalPadding,
      paddingTop: 14 + (isMobile ? insetTop : 0),
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
    },
    headerIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primarySoft,
    },
    headerCopy: { flex: 1, minWidth: 0 },
    title: {
      color: theme.colors.text,
      fontSize: isMobile ? 17 : 20,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    subtitle: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.backgroundAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    scroll: { flex: 1 },
    body: {
      paddingHorizontal: horizontalPadding,
      paddingTop: isMobile ? 16 : 22,
      paddingBottom: 28,
      gap: isMobile ? 16 : 20,
    },
    sectionCard: {
      padding: isMobile ? 14 : 18,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.backgroundAlt,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    playersSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primarySoft,
    },
    sectionCopy: { flex: 1, minWidth: 0 },
    sectionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
    sectionHint: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
    countBadge: {
      minWidth: 30,
      height: 26,
      paddingHorizontal: 8,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primarySoft,
    },
    countBadgeText: {
      color: theme.colors.primarySoftText || theme.colors.primary,
      fontSize: 11,
      fontWeight: '800',
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: isMobile ? 10 : 12 },
    field: {
      flexGrow: 1,
      flexBasis: isMobile ? '46%' : isTablet ? '30%' : 150,
      minWidth: isMobile ? '46%' : isTablet ? 150 : 140,
      maxWidth: isMobile ? undefined : isTablet ? '48%' : 210,
    },
    label: {
      color: theme.colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.35,
      marginBottom: 6,
    },
    input: {
      minHeight: isMobile ? 46 : 44,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      fontSize: 15,
      fontWeight: '700',
    },
    playerList: { gap: 12 },
    playerCard: {
      padding: isMobile ? 14 : 18,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceElevated || theme.colors.surface,
    },
    playerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingBottom: 14,
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    playerNumber: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
    },
    playerNumberText: { color: '#fff', fontSize: 13, fontWeight: '900' },
    playerCopy: { flex: 1, minWidth: 0 },
    playerName: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
    playerMeta: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
    footer: {
      paddingHorizontal: horizontalPadding,
      paddingVertical: isMobile ? 12 : 14,
      paddingBottom: isMobile ? Math.max(18, insetBottom + 10) : 14,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'flex-end',
      gap: 10,
      backgroundColor: theme.colors.surface,
    },
    secondaryButton: {
      minHeight: 46,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.backgroundAlt,
    },
    secondaryButtonText: { color: theme.colors.text, fontSize: 13, fontWeight: '700' },
    primaryButton: {
      minHeight: 46,
      minWidth: isMobile ? undefined : 130,
      paddingHorizontal: 20,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
    },
    primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    buttonDisabled: { opacity: 0.72 },
  });
};
