import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { getPlayerRosterName } from './playerHelpers';

export default function PlayerRosterPdfModal({ visible, onClose, players = [], onGenerate, generating = false }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [includeExtras, setIncludeExtras] = useState(true);
  const [showPhotos, setShowPhotos] = useState(false);

  useEffect(() => {
    if (visible) {
      setIncludeExtras(true);
      setShowPhotos(false);
    }
  }, [visible]);

  const selectedPlayers = useMemo(
    () => players.filter((player) => includeExtras || !player.extra),
    [players, includeExtras],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name="document-text-outline" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: theme.colors.text }]}>{t('player.rosterPdfTitle', 'Listado de jugadores')}</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {t('player.rosterPdfDescription', 'Configura el contenido del PDF antes de descargarlo.')}
              </Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.close', 'Cerrar')} onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={[styles.preview, { backgroundColor: theme.colors.backgroundAlt, borderColor: theme.colors.border }]}>
              <Text style={[styles.previewTitle, { color: theme.colors.text }]}>{selectedPlayers.length} {t('player.players', 'jugadores')}</Text>
              <Text style={[styles.previewText, { color: theme.colors.textSecondary }]} numberOfLines={3}>
                {selectedPlayers.slice(0, 5).map(getPlayerRosterName).join(' · ')}{selectedPlayers.length > 5 ? ' · ...' : ''}
              </Text>
            </View>

            <View style={[styles.optionsCard, { borderColor: theme.colors.border }]}>
              <Text style={[styles.optionsTitle, { color: theme.colors.text }]}>{t('player.rosterPdfOptions', 'Opciones del listado')}</Text>
              <OptionRow
                icon="star-outline"
                label={t('player.rosterPdfIncludeExtras', 'Incluir jugadores extras')}
                hint={t('player.rosterPdfIncludeExtrasHint', 'Añade los jugadores marcados como extra.')}
                value={includeExtras}
                onChange={setIncludeExtras}
                theme={theme}
              />
              <OptionRow
                icon="camera-outline"
                label={t('player.rosterPdfShowPhotos', 'Incluir fotografías')}
                hint={t('player.rosterPdfShowPhotosHint', 'Muestra la imagen disponible de cada jugador.')}
                value={showPhotos}
                onChange={setShowPhotos}
                theme={theme}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
              disabled={generating}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>{t('common.cancel', 'Cancelar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => onGenerate({ includeExtras, showPhotos })}
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary }, generating && styles.disabled]}
              disabled={generating || selectedPlayers.length === 0}
            >
              {generating ? <ActivityIndicator color={theme.colors.onPrimary} size="small" /> : <Ionicons name="download-outline" size={19} color={theme.colors.onPrimary} />}
              <Text style={[styles.primaryButtonText, { color: theme.colors.onPrimary }]}>{t('common.download', 'Descargar PDF')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OptionRow({ icon, label, hint, value, onChange, theme }) {
  return (
    <View style={[styles.optionRow, { borderTopColor: theme.colors.border }]}>
      <View style={[styles.optionIcon, { backgroundColor: theme.colors.primarySoft }]}>
        <Ionicons name={icon} size={19} color={theme.colors.primary} />
      </View>
      <View style={styles.optionCopy}>
        <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{label}</Text>
        <Text style={[styles.optionHint, { color: theme.colors.textSecondary }]}>{hint}</Text>
      </View>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }}
        thumbColor={value ? theme.colors.primary : theme.colors.textMuted}
      />
    </View>
  );
}

const styles = {
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.58)', justifyContent: 'center', padding: 18 },
  container: { width: '100%', maxWidth: 560, maxHeight: '88%', alignSelf: 'center', borderRadius: 18, overflow: 'hidden', elevation: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1 },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { marginTop: 4, fontSize: 12, lineHeight: 17 },
  closeButton: { padding: 4 },
  body: { padding: 18, gap: 14 },
  preview: { borderWidth: 1, borderRadius: 12, padding: 14 },
  previewTitle: { fontSize: 15, fontWeight: '800' },
  previewText: { marginTop: 5, fontSize: 12, lineHeight: 18 },
  optionsCard: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  optionsTitle: { fontSize: 14, fontWeight: '800', paddingTop: 14, paddingBottom: 4 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderTopWidth: 1 },
  optionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionCopy: { flex: 1 },
  optionLabel: { fontSize: 13, fontWeight: '700' },
  optionHint: { marginTop: 2, fontSize: 11, lineHeight: 15 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1 },
  secondaryButton: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 13, fontWeight: '700' },
  primaryButton: { flex: 1.35, minHeight: 44, borderRadius: 10, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.55 },
};
