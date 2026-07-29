import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components';

export default function CustomTrainingTaskModal({ visible, initialTask, onClose, onSave }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [nombre, setNombre] = useState('');
  const [imagen, setImagen] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [observaciones, setObservaciones] = useState(['']);
  const [selectingImage, setSelectingImage] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNombre(initialTask?.nombre || '');
    setImagen(initialTask?.imagen || '');
    setDescripcion(initialTask?.descripcion || '');
    setObservaciones(initialTask?.observaciones?.length ? initialTask.observaciones : ['']);
  }, [visible, initialTask]);

  const pickImage = async () => {
    try {
      setSelectingImage(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t('common.error', 'Error'),
          t('session.customTaskImagePermission', 'Necesitamos permiso para importar una imagen.'),
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
        base64: true,
      });
      const asset = !result.canceled && result.assets?.[0];
      if (asset?.base64) {
        if (asset.base64.length > 5800000) {
          Alert.alert(
            t('common.error', 'Error'),
            t('session.customTaskImageTooLarge', 'La imagen es demasiado grande. Elige otra de menos de 4 MB.'),
          );
          return;
        }
        setImagen(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
      }
    } catch {
      Alert.alert(
        t('common.error', 'Error'),
        t('session.customTaskImageError', 'No se pudo importar la imagen.'),
      );
    } finally {
      setSelectingImage(false);
    }
  };

  const submit = () => {
    const cleanName = nombre.trim();
    if (!cleanName || !imagen) {
      Alert.alert(
        t('common.error', 'Error'),
        t('session.customTaskRequired', 'Añade un nombre y una imagen para continuar.'),
      );
      return;
    }

    onSave({
      ...initialTask,
      id: initialTask?.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nombre: cleanName,
      imagen,
      descripcion: descripcion.trim(),
      observaciones: observaciones.map((item) => item.trim()).filter(Boolean),
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{t('session.customTaskEyebrow', 'CONTENIDO PROPIO')}</Text>
              <Text style={styles.title}>
                {initialTask
                  ? t('session.editCustomTask', 'Editar tarea personalizada')
                  : t('session.addCustomTask', 'Añadir tarea personalizada')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel={t('common.close', 'Cerrar')}
            >
              <MaterialIcons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>{t('session.customTaskName', 'Nombre de la tarea')} *</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              maxLength={160}
              placeholder={t('session.customTaskNamePlaceholder', 'Ej. Salida de balón por zonas')}
              placeholderTextColor={theme.colors.textMuted}
              autoFocus={Platform.OS === 'web'}
            />

            <Text style={styles.label}>{t('session.customTaskImage', 'Imagen de la tarea')} *</Text>
            <TouchableOpacity
              style={[styles.imagePicker, imagen && styles.imagePickerWithImage]}
              onPress={pickImage}
              disabled={selectingImage}
              accessibilityLabel={t('session.customTaskImportImage', 'Importar imagen')}
            >
              {imagen ? (
                <>
                  <Image source={{ uri: imagen }} style={styles.preview} resizeMode="cover" />
                  <View style={styles.replaceBadge}>
                    <Ionicons name="images-outline" size={16} color="#fff" />
                    <Text style={styles.replaceText}>{t('session.customTaskReplaceImage', 'Cambiar imagen')}</Text>
                  </View>
                </>
              ) : selectingImage ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <>
                  <View style={styles.imageIcon}>
                    <Ionicons name="cloud-upload-outline" size={26} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.imageTitle}>{t('session.customTaskImportImage', 'Importar imagen')}</Text>
                  <Text style={styles.imageHint}>{t('session.customTaskImageHint', 'JPG o PNG · formato recomendado 4:3')}</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>{t('session.customTaskDescription', 'Descripción de la tarea')}</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={descripcion}
              onChangeText={setDescripcion}
              maxLength={4000}
              multiline
              numberOfLines={4}
              placeholder={t('session.customTaskDescriptionPlaceholder', 'Explica el desarrollo, reglas y objetivo de la tarea...')}
              placeholderTextColor={theme.colors.textMuted}
            />

            <View style={styles.observationsHeader}>
              <Text style={[styles.label, { marginBottom: 0 }]}>{t('session.customTaskObservations', 'Observaciones')}</Text>
              <TouchableOpacity
                style={styles.addObservation}
                onPress={() => setObservaciones((current) => [...current, ''])}
              >
                <Ionicons name="add" size={16} color={theme.colors.primary} />
                <Text style={styles.addObservationText}>{t('session.addObservation', 'Añadir')}</Text>
              </TouchableOpacity>
            </View>

            {observaciones.map((observacion, index) => (
              <View key={index} style={styles.observationRow}>
                <TextInput
                  style={[styles.input, styles.observationInput]}
                  value={observacion}
                  onChangeText={(text) => setObservaciones((current) => current.map((item, i) => i === index ? text : item))}
                  maxLength={1000}
                  multiline
                  placeholder={t('session.customTaskObservationPlaceholder', 'Indicación o punto de atención...')}
                  placeholderTextColor={theme.colors.textMuted}
                />
                {observaciones.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeObservation}
                    onPress={() => setObservaciones((current) => current.filter((_, i) => i !== index))}
                    accessibilityLabel={t('session.removeObservation', 'Eliminar observación')}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>{t('common.cancel', 'Cancelar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={submit}>
              <Ionicons name="checkmark" size={19} color={theme.colors.onPrimary} />
              <Text style={styles.saveText}>{t('common.save', 'Guardar')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '92%',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { color: theme.colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: theme.colors.text, fontSize: 19, fontWeight: '800', marginTop: 3 },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flexGrow: 0 },
  bodyContent: { padding: 20, paddingBottom: 24 },
  label: { color: theme.colors.text, fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 11,
    backgroundColor: theme.colors.inputBg,
    color: theme.colors.text,
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  imagePicker: {
    minHeight: 160,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePickerWithImage: { borderStyle: 'solid', backgroundColor: theme.colors.inputBg },
  imageIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  imageTitle: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
  imageHint: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 },
  preview: { width: '100%', height: 220 },
  replaceBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  replaceText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  observationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 7,
  },
  addObservation: { flexDirection: 'row', alignItems: 'center', gap: 3, padding: 6 },
  addObservationText: { color: theme.colors.primary, fontSize: 12, fontWeight: '700' },
  observationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  observationInput: { flex: 1, minHeight: 48, textAlignVertical: 'top' },
  removeObservation: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelButton: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 11, backgroundColor: theme.colors.inputBg },
  cancelText: { color: theme.colors.textSecondary, fontWeight: '700' },
  saveButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveText: { color: theme.colors.onPrimary, fontWeight: '800' },
});
