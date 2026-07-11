import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { updateMatchSheet } from '@/api/matchSheet';
import { getPlayerFullName } from '@/utils/playerHelpers';

const TEAM_FIELDS = ['posesion', 'tiros', 'tirosAPuerta', 'corners', 'faltas', 'fueras', 'pasesCompletados', 'recuperaciones', 'perdidas', 'duelosGanados', 'duelosPerdidos'];
const PLAYER_FIELDS = ['tiros', 'tirosAPuerta', 'pasesCompletados', 'recuperaciones', 'perdidas', 'duelosGanados', 'valoracion'];
const idOf = (value) => String(value?._id || value?.player?._id || value?.player || value || '');
const valueOf = (value) => value == null ? '' : String(value);

export default function MatchStatisticsModal({ visible, matchSheet, players = [], onClose, onSaved }) {
  const { t } = useTranslation();
  const theme = useTheme();
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
    setEvents(roster.map((player) => ({ player: player._id, ...(old.get(String(player._id)) || {}) })));
  }, [visible, matchSheet, roster]);

  const setNumber = (setter, key, raw) => setter((prev) => ({ ...prev, [key]: raw === '' ? '' : Number(raw) }));
  const save = async () => {
    setSaving(true);
    try {
      const response = await updateMatchSheet(matchSheet._id, { estadisticas: teamStats, eventos: events });
      onSaved?.(response.data);
      onClose?.();
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

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}><View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}><Text style={[styles.title, { color: theme.colors.text }]}>{t('matchSheet.statistics.title', 'Estadísticas del partido')}</Text><TouchableOpacity title={t('common.close', 'Cerrar')} onPress={onClose}><Ionicons name="close" size={24} color={theme.colors.text} /></TouchableOpacity></View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.section, { color: theme.colors.text }]}>{t('matchSheet.statistics.team', 'Estadísticas del equipo')}</Text>
        <View style={styles.grid}>{TEAM_FIELDS.map((key) => <Field key={key} label={t(`matchSheet.statistics.fields.${key}`, key)} value={valueOf(teamStats[key])} onChange={(raw) => setNumber(setTeamStats, key, raw)} />)}</View>
        <Text style={[styles.section, { color: theme.colors.text }]}>{t('matchSheet.statistics.players', 'Estadísticas por jugador')}</Text>
        {events.map((event) => { const player = players.find((p) => String(p._id) === String(event.player)); return <View key={event.player} style={styles.playerBlock}><Text style={[styles.playerName, { color: theme.colors.text }]}>{getPlayerFullName(player) || player?.nombre || event.player}</Text><View style={styles.grid}>{PLAYER_FIELDS.map((key) => <Field key={key} label={t(`matchSheet.statistics.fields.${key}`, key)} value={valueOf(event[key])} onChange={(raw) => setEvents((prev) => prev.map((item) => String(item.player) === String(event.player) ? { ...item, [key]: raw === '' ? '' : Number(raw) } : item))} />)}</View></View>; })}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}><TouchableOpacity title={t('matchSheet.statistics.downloadPdf', 'Descargar PDF')} style={[styles.secondary, { borderColor: theme.colors.border }]} onPress={downloadPdf}><Ionicons name="download-outline" size={18} color={theme.colors.text} /><Text style={{ color: theme.colors.text }}>{t('matchSheet.statistics.downloadPdf', 'Descargar PDF')}</Text></TouchableOpacity><TouchableOpacity title={t('common.save', 'Guardar')} style={styles.primary} onPress={save} disabled={saving}><Text style={styles.primaryText}>{saving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}</Text></TouchableOpacity></View>
    </View></View>
  </Modal>;
}

function Field({ label, value, onChange }) { const theme = useTheme(); return <View style={styles.field}><Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text><TextInput style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.backgroundAlt }]} value={value} keyboardType="numeric" onChangeText={onChange} /></View>; }
const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: 'rgba(2,6,23,.55)', justifyContent: 'center', padding: 12 }, container: { maxHeight: '94%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }, header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { fontSize: 18, fontWeight: '800' }, body: { padding: 16, gap: 12 }, section: { fontSize: 14, fontWeight: '800', marginTop: 4 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, field: { minWidth: 120, flex: 1 }, label: { fontSize: 11, color: '#64748b', marginBottom: 4 }, input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 8, minHeight: 38 }, playerBlock: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 10 }, playerName: { fontWeight: '700', marginBottom: 8 }, footer: { padding: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }, primary: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 7 }, primaryText: { color: '#fff', fontWeight: '700' }, secondary: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 7 } });
