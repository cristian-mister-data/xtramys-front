import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';
import { normalizeImageSource } from '@/vendor/tacticalBoard/imagePreview';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export default function VisualMediaSelector({
  boardImage,
  boardAvailable,
  importedImage,
  visualSource,
  onOpenBoard,
  onImportedImageChange,
  onVisualSourceChange,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [picking, setPicking] = useState(false);
  const selected = visualSource === 'imported' && importedImage ? 'imported' : 'board';

  const pickImage = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('message.error'), t('contentVisual.galleryPermission'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType ? [ImagePicker.MediaType.Images] : ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.85,
      });
      const asset = !result.canceled ? result.assets?.[0] : null;
      if (!asset) return;
      if (asset.fileSize > MAX_IMAGE_BYTES || (asset.mimeType && !asset.mimeType.startsWith('image/'))) {
        Alert.alert(t('message.error'), t('contentVisual.invalidImage'));
        return;
      }
      const image = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;
      onImportedImageChange(image);
      onVisualSourceChange('imported');
    } catch (error) {
      Alert.alert(t('message.error'), error?.message || t('contentVisual.importError'));
    } finally {
      setPicking(false);
    }
  };

  const option = (source, icon, title, subtitle, available, onPress) => {
    const active = selected === source && available;
    return (
      <TouchableOpacity
        style={[styles.option, active && styles.optionActive, !available && styles.optionEmpty]}
        onPress={() => available ? onVisualSourceChange(source) : onPress()}
        activeOpacity={0.85}
      >
        <View style={[styles.icon, active && styles.iconActive]}>
          <Ionicons name={icon} size={21} color={active ? theme.colors.onPrimary : theme.colors.primary} />
        </View>
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={styles.optionSubtitle}>{subtitle}</Text>
        </View>
        {active && <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>{t('contentVisual.title')}</Text>
          <Text style={styles.subtitle}>{t('contentVisual.subtitle')}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t(`contentVisual.${selected}`)}</Text>
        </View>
      </View>

      <View style={styles.options}>
        {option('board', 'create-outline', t('contentVisual.board'), t('contentVisual.boardHint'), boardAvailable, onOpenBoard)}
        {option('imported', 'image-outline', t('contentVisual.imported'), t('contentVisual.importedHint'), Boolean(importedImage), pickImage)}
      </View>

      {(selected === 'imported' ? importedImage : boardImage) ? (
        <Image
          source={{ uri: normalizeImageSource(selected === 'imported' ? importedImage : boardImage) }}
          style={styles.preview}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.emptyPreview}>
          <Ionicons name="images-outline" size={30} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>{t('contentVisual.noVisual')}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={onOpenBoard}>
          <Ionicons name={boardAvailable ? 'pencil-outline' : 'add-outline'} size={18} color={theme.colors.primary} />
          <Text style={styles.actionText}>{t(boardAvailable ? 'contentVisual.editBoard' : 'contentVisual.createBoard')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={pickImage} disabled={picking}>
          {picking ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Ionicons name="folder-open-outline" size={18} color={theme.colors.primary} />}
          <Text style={styles.actionText}>{t(importedImage ? 'contentVisual.replaceImage' : 'contentVisual.importImage')}</Text>
        </TouchableOpacity>
        {!!importedImage && (
          <TouchableOpacity
            style={[styles.action, styles.removeAction]}
            onPress={() => {
              onImportedImageChange('');
              onVisualSourceChange('board');
            }}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            <Text style={[styles.actionText, { color: theme.colors.error }]}>{t('contentVisual.removeImage')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  root: { gap: 14 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
  subtitle: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 3 },
  badge: { backgroundColor: theme.colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { color: theme.colors.primary, fontSize: 11, fontWeight: '800' },
  options: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  option: { flex: 1, minWidth: 210, minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background },
  optionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  optionEmpty: { borderStyle: 'dashed' },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primarySoft },
  iconActive: { backgroundColor: theme.colors.primary },
  optionText: { flex: 1 },
  optionTitle: { color: theme.colors.text, fontWeight: '800', fontSize: 13 },
  optionSubtitle: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
  preview: { width: '100%', height: 280, borderRadius: 12, backgroundColor: theme.colors.background },
  emptyPreview: { height: 150, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: theme.colors.background },
  emptyText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 13, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, backgroundColor: theme.colors.surface },
  removeAction: { marginLeft: 'auto' },
  actionText: { color: theme.colors.primary, fontWeight: '800', fontSize: 12 },
});
