import { useState, useCallback, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Base64ImagePreview from '@/vendor/tacticalBoard/imagePreview';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStrategyFoldersFlat, createStrategyFolder } from '@/store/slices/strategy/strategyThunks';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { LinearGradient } from 'expo-linear-gradient';
import { linkVideoToStrategy } from '@/utils/api';
import FolderPickerModal from '@/vendor/shared/FolderPickerModal';
import {
  saveFormDraft,
  loadFormDraft,
  clearFormDraft,
  STORAGE_KEYS,
} from '@/utils/formPersistence';

export default function CreateStrategyForm({ 
  navigation,
  onSave, 
  onCancel, 
  editingStrategy, 
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const strategyFolders = useSelector(state => state.strategy.foldersFlat) || [];
  const strategyLoading = useSelector(state => state.strategy.loading);
  
  const [name, setName] = useState(editingStrategy ? editingStrategy.nombre : '');
  const [folderId, setFolderId] = useState(editingStrategy?.folder?._id || editingStrategy?.folder || '');
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState(editingStrategy ? editingStrategy.descripcion : '');
  // En web el componente puede remontarse después de volver del editor de campo.
  // Inicializamos imagen/fieldElements/fieldType desde FIELD_RESULT si existe,
  // para sobrevivir a remounts (ver bug fix análogo en createExerciseForm.js).
  const __pendingFieldResult = (() => {
    try {
      const fr = loadFormDraft(STORAGE_KEYS.FIELD_RESULT, { remove: false });
      const editingId = editingStrategy?._id || editingStrategy?.id || null;
      if (fr && (fr.editingId || null) === editingId && fr.kind === 'strategy') return fr;
    } catch {}
    return null;
  })();

  const [imagen, setImagen] = useState(
    __pendingFieldResult && typeof __pendingFieldResult.imagen === 'string'
      ? __pendingFieldResult.imagen
      : (editingStrategy ? editingStrategy.imagen : '')
  );
  const [showField, setShowField] = useState(false);
  const [fieldElements, setFieldElements] = useState(
    __pendingFieldResult && Array.isArray(__pendingFieldResult.fieldElements)
      ? __pendingFieldResult.fieldElements
      : (editingStrategy ? editingStrategy.elementosCampo || [] : [])
  );
  const [fieldType, setFieldType] = useState(
    __pendingFieldResult && typeof __pendingFieldResult.fieldType === 'string'
      ? __pendingFieldResult.fieldType
      : (editingStrategy ? editingStrategy.tipoCampo || '' : '')
  );

  // Estados para videos pendientes de asociar (para nuevas estrategias)
  const pendingVideoIds = useRef([]);

  // Estados para carpetas de estrategia
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [loadingField, setLoadingField] = useState(false);
  const foldersLoadedRef = useRef(false);

  // Efecto para encontrar el nombre de la carpeta cuando se carga la edición
  useEffect(() => {
    if (folderId && strategyFolders.length > 0) {
      const foundFolder = strategyFolders.find(f => f._id === folderId);
      if (foundFolder) {
        setFolderName(foundFolder.nombre);
      }
    }
  }, [folderId, strategyFolders]);

  // Cargar carpetas de estrategia - solo una vez
  useEffect(() => {
    const loadFolders = async () => {
      if (!foldersLoadedRef.current && strategyFolders.length === 0) {
        foldersLoadedRef.current = true;
        dispatch(fetchStrategyFoldersFlat());
      }
    };
    loadFolders();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showField) {
          setShowField(false);
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        subscription.remove();
      };
    }, [showField])
  );

  // Reset loadingField when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      setLoadingField(false);
    }, [])
  );

  // Restaurar borrador del formulario y resultado del campo cuando el
  // componente se monta tras volver del editor (en web la navegación
  // desmonta esta pantalla, así que sin esto se pierden todos los datos).
  useEffect(() => {
    const editingId = editingStrategy?._id || editingStrategy?.id || null;
    const draft = loadFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT, { remove: false });
    const fieldResult = loadFormDraft(STORAGE_KEYS.FIELD_RESULT, { remove: false });
    const draftMatches = draft && (draft.editingId || null) === editingId && draft.kind === 'strategy';
    const resultMatches = fieldResult && (fieldResult.editingId || null) === editingId && fieldResult.kind === 'strategy';

    if (draftMatches) {
      if (typeof draft.name === 'string') setName(draft.name);
      if (typeof draft.description === 'string') setDescription(draft.description);
      if (typeof draft.folderId === 'string') setFolderId(draft.folderId);
      if (Array.isArray(draft.fieldElements)) setFieldElements(draft.fieldElements);
      if (typeof draft.fieldType === 'string') setFieldType(draft.fieldType);
      if (typeof draft.imagen === 'string') setImagen(draft.imagen);
      if (Array.isArray(draft.pendingVideoIds)) pendingVideoIds.current = [...draft.pendingVideoIds];
    }

    if (resultMatches) {
      if (Array.isArray(fieldResult.fieldElements)) setFieldElements(fieldResult.fieldElements);
      if (typeof fieldResult.fieldType === 'string') setFieldType(fieldResult.fieldType);
      if (typeof fieldResult.imagen === 'string') setImagen(fieldResult.imagen);
      if (Array.isArray(fieldResult.pendingVideoIds)) pendingVideoIds.current = [...fieldResult.pendingVideoIds];
    }

    if (draftMatches || resultMatches) {
      // No limpiamos FIELD_RESULT aquí: lazy initializers de useState lo
      // necesitan si el componente se remonta. Tampoco limpiamos el borrador
      // del formulario porque React 18 StrictMode puede remontar una segunda vez.
      // Ambos se limpian en save/cancel.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenField = () => {
    setLoadingField(true);

    const editingId = editingStrategy?._id || editingStrategy?.id || null;
    // Persistir borrador completo: en web esta pantalla se desmonta al
    // navegar al editor del campo y luego se vuelve a montar (perdiendo
    // estado local). El resultado del editor se persiste también desde el
    // callback `onSave` para que el remontaje pueda reaplicarlo.
    saveFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT, {
      kind: 'strategy',
      editingId,
      name,
      description,
      folderId,
      fieldElements,
      fieldType,
      imagen,
      pendingVideoIds: pendingVideoIds.current.length > 0 ? [...pendingVideoIds.current] : [],
    });

    // Crear callbacks globales que se pueden acceder desde cualquier lugar
    global.fieldCallbacks = {
      onSave: (updatedElements, updatedFieldType, imageBase64) => {
        // Importante: en web este callback corre cuando esta pantalla está
        // desmontada, así que llamar a setState aquí no surte efecto. Lo
        // persistimos en sessionStorage y el efecto de montaje lo aplica al
        // volver. Los setters siguen llamándose por compatibilidad nativa.
        saveFormDraft(STORAGE_KEYS.FIELD_RESULT, {
          kind: 'strategy',
          editingId,
          fieldElements: updatedElements,
          fieldType: updatedFieldType,
          imagen: imageBase64,
          pendingVideoIds: pendingVideoIds.current.length > 0 ? [...pendingVideoIds.current] : [],
        });
        try {
          setFieldElements(updatedElements);
          setFieldType(updatedFieldType);
          setImagen(imageBase64);
          setLoadingField(false);
        } catch {}
        global.fieldCallbacks = null;
      },
      onCancel: () => {
        try { setLoadingField(false); } catch {}
        global.fieldCallbacks = null;
      },
      // Callback para cuando se guarda un video - guardar ID para asociar después
      onVideoSaved: (videoId) => {
        if (videoId && !editingStrategy?._id && !editingStrategy?.id) {
          // Si es una estrategia nueva, guardar el ID del video para asociar después
          pendingVideoIds.current.push(videoId);
          saveFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT, {
            kind: 'strategy',
            editingId,
            name,
            description,
            folderId,
            fieldElements,
            fieldType,
            imagen,
            pendingVideoIds: [...pendingVideoIds.current],
          });
        }
        // Si estamos editando, el video ya se asocia directamente con estrategiaId
      }
    };

    navigation.navigate('Field', {
      initialElements: fieldElements || [],
      initialFieldType: fieldType || 'full',
      isEditing: true,
      fieldImages: [],
      isStrategyMode: true, // Nueva prop para indicar modo estrategia
      // Forzar sandbox=false: ver nota en createExerciseForm.
      sandbox: false,
      // Pasar el ID de la estrategia si estamos editando, para poder asociar videos
      estrategiaId: editingStrategy?._id || editingStrategy?.id || null,
    });
  };



  const handleSave = async () => {
    const missing = [];
    if (!name.trim()) missing.push('Nombre');
    
    if (missing.length > 0) {
      Alert.alert(t('message.warning'), t('strategy.missingFields', { fields: missing.join(', ') }));
      return;
    }
    
    try {
      const usuario = await AsyncStorage.getItem('usuario');
      const idUsuario = JSON.parse(usuario)?._id;
      if (!idUsuario) {
        Alert.alert(t('message.error'), t('message.noUserIdentified'));
        return;
      }
      const newStrategy = {
        nombre: name,
        folder: folderId || undefined,
        descripcion: description,
        usuario: idUsuario,
        _id: editingStrategy ? editingStrategy._id : undefined,
        imagen: imagen,
        elementosCampo: fieldElements || [],
        tipoCampo: fieldType || '',
        // Incluir IDs de videos pendientes para asociar después de crear la estrategia
        pendingVideoIds: pendingVideoIds.current.length > 0 ? [...pendingVideoIds.current] : undefined
      };
      
      if (onSave) {
        onSave(newStrategy);
        // Limpiar videos pendientes después de guardar
        pendingVideoIds.current = [];
        clearFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT);
        clearFormDraft(STORAGE_KEYS.FIELD_RESULT);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      Alert.alert(t('message.error'), t('strategy.saveError', { msg: error.message }));
    }
  };

  const handleCancelPress = useCallback(() => {
    clearFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT);
    clearFormDraft(STORAGE_KEYS.FIELD_RESULT);
    if (onCancel) onCancel();
  }, [onCancel]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2856a2', '#1a3d73']}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <TouchableOpacity onPress={handleCancelPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{editingStrategy ? t('strategy.editStrategy') : t('strategy.createStrategy')}</Text>
      </LinearGradient>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start', paddingBottom: Math.max(insets.bottom, 120) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <Text style={styles.subTitle}>{t('strategy.generalsDatas')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('strategy.examplePlaceholder')}
            placeholderTextColor="#bbb"
            value={name}
            onChangeText={setName}
          />
          
          {/* Campo de carpeta */}
          <TouchableOpacity 
            style={styles.typeSelector} 
            onPress={() => setShowFolderModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="folder-outline" size={18} color="#9e9e9e" style={{ marginRight: 8 }} />
              <Text style={[styles.typeSelectorText, folderName && styles.typeSelectorTextSelected]}>
                {folderName || t('folders.selectFolder')}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.subTitle}>{t('strategy.content')}</Text>
          <Text style={styles.inputLabel}>{t('strategy.description')}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={t('strategy.descriptionPlaceholder')}
            placeholderTextColor="#bbb"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.formCard}>
          <View style={styles.graphicSection}>
            {loadingField ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>{t('strategy.loadingField')}</Text>
              </View>
            ) : fieldElements && fieldElements.length > 0 ? (
              <>
                <Text style={styles.subTitle}>{t('strategy.graphicSaved')}</Text>
                <Base64ImagePreview base64={imagen} imageUrl={imagen} aspect={0.6} />
                <TouchableOpacity style={[styles.editButton, { alignSelf: 'center', marginTop: 12 }]} onPress={handleOpenField}>
                    <Ionicons name="pencil-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>{t('strategy.editGraphic')}</Text>
                  </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.addButton} onPress={handleOpenField}>
                <Ionicons name="document-outline" size={40} color="#2196F3" />
                <Text style={styles.addButtonText}>{t('strategy.addGraphic')}</Text>
                <Text style={[styles.addButtonText, { fontSize: 13, color: '#9e9e9e', marginTop: 4 }]}>
                  {t('strategy.touchToOpenEditor')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </KeyboardAwareScrollView>
      <View style={[styles.fixedFooter, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={handleCancelPress}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveButton, strategyLoading && styles.buttonDisabled]} 
          onPress={handleSave}
          disabled={strategyLoading}
        >
          <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>
            {strategyLoading ? t('strategy.saving') : (editingStrategy ? t('edition.saveChanges') : t('strategy.saveStrategy'))}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Modal para seleccionar carpeta */}
      <FolderPickerModal
        visible={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onSelect={(id, name) => {
          setFolderId(id || '');
          setFolderName(name || '');
        }}
        folders={strategyFolders}
        selectedFolderId={folderId || null}
        title={t('folders.selectFolder')}
        accentColor="#8B5CF6"
        onCreateFolder={async ({ nombre, parentFolder, color }) => {
          await dispatch(createStrategyFolder({ nombre, parentFolder, color })).unwrap();
          dispatch(fetchStrategyFoldersFlat());
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  container: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 0,
    backgroundColor: "#f5f5f5"
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: "#fff",
    letterSpacing: 0.2
  },
  subTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: "#757575",
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    color: "#000",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: "#424242",
    marginBottom: 8,
  },
  textarea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  graphicSection: {
    alignItems: "center",
    marginVertical: 16,
  },
  addButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 48,
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#2196F3",
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: "#2196F3",
    fontWeight: "600",
    fontSize: 15,
    textAlign: "center",
    letterSpacing: 0.2,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: "#d39625ff",
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    maxWidth: 200,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#2196F3",
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: "#2196F3",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    maxWidth: 200,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
  },
  fixedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
  },
  cancelButton: {
    flex: 0.4,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: "#e0e0e0",
    maxWidth: 200,
  },
  cancelButtonText: {
    color: "#424242",
    fontWeight: "500",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 320,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 26,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 12,
    color: "#e65100"
  },
  closeModalBtn: {
    backgroundColor: "#1976d2",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  closeModalBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 0.2
  },
  typeSelector: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeSelectorText: {
    fontSize: 15,
    color: "#9e9e9e",
  },
  typeSelectorTextSelected: {
    color: "#000",
  },
  typeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  typeOptionText: {
    fontSize: 16,
    color: '#222',
  },
  createTypeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  createTypeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  modalInput: {
    width: '100%',
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    color: "#000",
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  modalCreateBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCreateBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
  },
});
