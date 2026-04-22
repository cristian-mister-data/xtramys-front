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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Base64ImagePreview from '@/vendor/tacticalBoard/imagePreview';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchExerciseFoldersFlat, createExerciseFolder, fetchGlobalFolders } from '@/store/slices/exercise/exerciseThunks';
import { LinearGradient } from 'expo-linear-gradient';
import { linkVideoToExercise } from '@/utils/api';
import FolderPickerModal from '@/vendor/shared/FolderPickerModal';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import {
  saveFormDraft,
  loadFormDraft,
  clearFormDraft,
  STORAGE_KEYS,
} from '@/utils/formPersistence';

export default function CreateExerciseForm({ 
  navigation, // Recibir navigation como prop
  onSave, 
  onCancel, 
  editingExercise,  
}) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const exerciseFoldersFlat = useSelector(state => state.exercise.foldersFlat) || [];
  const exerciseLoading = useSelector(state => state.exercise.loading);
  
  const [name, setName] = useState(editingExercise ? editingExercise.nombre : '');
  const [duration, setDuration] = useState(editingExercise ? String(editingExercise.tiempo) : '');
  const [description, setDescription] = useState(editingExercise ? editingExercise.descripcion : '');
  const [objective, setObjective] = useState(editingExercise ? editingExercise.objetivo : '');
  const [dimensions, setDimensions] = useState(editingExercise ? editingExercise.dimensiones || '' : '');
  const [folderId, setFolderId] = useState(editingExercise?.folder?._id || editingExercise?.folder || '');
  const [folderName, setFolderName] = useState('');
  const [playerNumbers, setPlayerNumbers] = useState(() => {
    if (editingExercise && editingExercise.numeroJugadores != null) {
      return String(editingExercise.numeroJugadores);
    }
    return '';
  });
  const [teams, setTeams] = useState(() => {
    if (editingExercise && editingExercise.equipos != null) {
      return String(editingExercise.equipos);
    }
    return '';
  });
  // En web el componente puede remontarse después de volver del editor de campo.
  // Para sobrevivir remounts, inicializamos imagen/fieldElements/fieldType
  // leyendo primero el FIELD_RESULT persistido (si coincide con el ejercicio editado).
  const __pendingFieldResult = (() => {
    try {
      const fr = loadFormDraft(STORAGE_KEYS.FIELD_RESULT, { remove: false });
      const editingId = editingExercise?._id || null;
      if (fr && (fr.editingId || null) === editingId && fr.kind === 'exercise') return fr;
    } catch {}
    return null;
  })();

  const [imagen, setImagen] = useState(
    __pendingFieldResult && typeof __pendingFieldResult.imagen === 'string'
      ? __pendingFieldResult.imagen
      : (editingExercise ? editingExercise.imagen : '')
  );
  const [showField, setShowField] = useState(false);
  const [fieldElements, setFieldElements] = useState(
    __pendingFieldResult && Array.isArray(__pendingFieldResult.fieldElements)
      ? __pendingFieldResult.fieldElements
      : (editingExercise ? editingExercise.elementosCampo || [] : [])
  );
  const [fieldType, setFieldType] = useState(
    __pendingFieldResult && typeof __pendingFieldResult.fieldType === 'string'
      ? __pendingFieldResult.fieldType
      : (editingExercise ? editingExercise.tipoCampo || '' : '')
  );

  // Estados para videos pendientes de asociar (para nuevos ejercicios)
  const pendingVideoIds = useRef([]);

  // Estado para admin: ejercicio global
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGlobal, setIsGlobal] = useState(editingExercise?.isGlobal || false);

  // Traducciones para ejercicios globales (admin)
  const [nameEn, setNameEn] = useState(editingExercise?.translations?.en?.nombre || '');
  const [descriptionEn, setDescriptionEn] = useState(editingExercise?.translations?.en?.descripcion || '');
  const [objectiveEn, setObjectiveEn] = useState(editingExercise?.translations?.en?.objetivo || '');

  // Estados para carpeta de ejercicio
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [loadingField, setLoadingField] = useState(false);

  // Efecto para encontrar el nombre de la carpeta cuando se carga la edición
  useEffect(() => {
    if (folderId && exerciseFoldersFlat.length > 0) {
      const foundFolder = exerciseFoldersFlat.find(f => f._id === folderId);
      if (foundFolder) {
        setFolderName(foundFolder.nombre);
      }
    }
  }, [folderId, exerciseFoldersFlat]);

  // Cargar carpetas de ejercicio
  useEffect(() => {
    dispatch(fetchExerciseFoldersFlat({ lang: i18n.language }));
    // Verificar si el usuario es admin: primero desde usuario, luego desde JWT como fallback
    const detectAdmin = async () => {
      try {
        const str = await AsyncStorage.getItem('usuario');
        if (str) {
          const parsed = JSON.parse(str);
          if (parsed?.role === 'admin') {
            setIsAdmin(true);
            // Default new exercises to global when admin creates (not editing)
            if (!editingExercise) setIsGlobal(true);
            return;
          }
        }
        // Fallback: decodificar JWT manualmente (atob no disponible en todas las versiones de RN)
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const parts = token.split('.');
          if (parts.length === 3) {
            const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
              + '='.repeat((4 - parts[1].length % 4) % 4);
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            let decoded = ''; let i = 0;
            while (i < b64.length) {
              const e1 = chars.indexOf(b64[i++]), e2 = chars.indexOf(b64[i++]);
              const e3 = chars.indexOf(b64[i++]), e4 = chars.indexOf(b64[i++]);
              decoded += String.fromCharCode((e1 << 2) | (e2 >> 4));
              if (e3 !== 64) decoded += String.fromCharCode(((e2 & 15) << 4) | (e3 >> 2));
              if (e4 !== 64) decoded += String.fromCharCode(((e3 & 3) << 6) | e4);
            }
            const payload = JSON.parse(decoded);
            if (payload?.role === 'admin') {
              setIsAdmin(true);
              if (!editingExercise) setIsGlobal(true);
            }
          }
        }
      } catch {}
    };
    detectAdmin();
  }, [dispatch]);

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
  // desmonta esta pantalla).
  useEffect(() => {
    const editingId = editingExercise?._id || null;
    const draft = loadFormDraft(STORAGE_KEYS.EXERCISE_FORM_DRAFT, { remove: false });
    const fieldResult = loadFormDraft(STORAGE_KEYS.FIELD_RESULT, { remove: false });
    const draftMatches = draft && (draft.editingId || null) === editingId && draft.kind === 'exercise';
    const resultMatches = fieldResult && (fieldResult.editingId || null) === editingId && fieldResult.kind === 'exercise';

    if (draftMatches) {
      if (typeof draft.name === 'string') setName(draft.name);
      if (typeof draft.duration === 'string') setDuration(draft.duration);
      if (typeof draft.description === 'string') setDescription(draft.description);
      if (typeof draft.objective === 'string') setObjective(draft.objective);
      if (typeof draft.dimensions === 'string') setDimensions(draft.dimensions);
      if (typeof draft.folderId === 'string') setFolderId(draft.folderId);
      if (typeof draft.playerNumbers === 'string') setPlayerNumbers(draft.playerNumbers);
      if (typeof draft.teams === 'string') setTeams(draft.teams);
      if (typeof draft.nameEn === 'string') setNameEn(draft.nameEn);
      if (typeof draft.descriptionEn === 'string') setDescriptionEn(draft.descriptionEn);
      if (typeof draft.objectiveEn === 'string') setObjectiveEn(draft.objectiveEn);
      if (typeof draft.isGlobal === 'boolean') setIsGlobal(draft.isGlobal);
      if (Array.isArray(draft.fieldElements)) setFieldElements(draft.fieldElements);
      if (typeof draft.fieldType === 'string') setFieldType(draft.fieldType);
      if (typeof draft.imagen === 'string') setImagen(draft.imagen);
    }

    if (resultMatches) {
      console.log('[exForm.mount] FIELD_RESULT match: imgLen=', fieldResult.imagen?.length, 'elements=', fieldResult.fieldElements?.length);
      if (Array.isArray(fieldResult.fieldElements)) setFieldElements(fieldResult.fieldElements);
      if (typeof fieldResult.fieldType === 'string') setFieldType(fieldResult.fieldType);
      if (typeof fieldResult.imagen === 'string') setImagen(fieldResult.imagen);
    }

    if (draftMatches || resultMatches) {
      // No limpiamos FIELD_RESULT aquí: si el componente se remonta, los lazy
      // initializers de useState lo necesitan. Se limpia en handleSave/handleCancel.
      clearFormDraft(STORAGE_KEYS.EXERCISE_FORM_DRAFT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleOpenField = () => {
    setLoadingField(true);

    const editingId = editingExercise?._id || null;
    saveFormDraft(STORAGE_KEYS.EXERCISE_FORM_DRAFT, {
      kind: 'exercise',
      editingId,
      name, duration, description, objective, dimensions, folderId,
      playerNumbers, teams, nameEn, descriptionEn, objectiveEn, isGlobal,
      fieldElements, fieldType, imagen,
    });

    // Crear callbacks globales que se pueden acceder desde cualquier lugar
    global.fieldCallbacks = {
      onSave: (updatedElements, updatedFieldType, imageBase64) => {
        console.log('[exForm.onSave] elements=', updatedElements?.length, 'imgLen=', imageBase64?.length);
        // En web esta pantalla está desmontada cuando esto se ejecuta;
        // persistimos el resultado y el efecto de montaje lo aplica.
        saveFormDraft(STORAGE_KEYS.FIELD_RESULT, {
          kind: 'exercise',
          editingId,
          fieldElements: updatedElements,
          fieldType: updatedFieldType,
          imagen: imageBase64,
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
        if (videoId && !editingExercise?._id) {
          // Si es un ejercicio nuevo, guardar el ID del video para asociar después
          pendingVideoIds.current.push(videoId);
        }
        // Si estamos editando, el video ya se asocia directamente con ejercicioId
      }
    };
    
    navigation.navigate('Field', {
      initialElements: fieldElements || [],
      initialFieldType: fieldType || 'full',
      isEditing: true,
      fieldImages: [],
      // Forzar sandbox=false: la página /tactical-board standalone usa
      // sandbox=true por defecto vía prop. Al venir desde el formulario
      // del ejercicio queremos los botones Guardar/Cancelar.
      sandbox: false,
      // Pasar el ID del ejercicio si estamos editando, para poder asociar videos
      ejercicioId: editingExercise?._id || null,
      isGlobalExercise: isGlobal && isAdmin,
    });
  };



  const handleSave = async () => {
    const missing = [];
    if (!name.trim()) missing.push(t('exercise.name'));
    if (!duration.trim()) missing.push(t('exercise.duration'));
    
    if (missing.length > 0) {
      Alert.alert(t('message.warning'), t('exercise.missingFields', { fields: missing.join(', ') }));
      return;
    }
    
    try {
      const usuario = await AsyncStorage.getItem('usuario');
      const idUsuario = JSON.parse(usuario)?._id;
      if (!idUsuario) {
        Alert.alert(t('message.error'), t('exercise.cannotFindUser'));
        return;
      }

      const newExercise = {
        nombre: name,
        tiempo: duration,
        descripcion: description,
        objetivo: objective,
        dimensiones: dimensions || undefined,
        folder: folderId || undefined,
        numeroJugadores: playerNumbers ? Number(playerNumbers) : undefined,
        equipos: teams ? Number(teams) : undefined,
        usuario: idUsuario,
        _id: editingExercise ? editingExercise._id : undefined,
        imagen: imagen,
        elementosCampo: fieldElements || [],
        tipoCampo: fieldType || '',
        isGlobal: isAdmin ? isGlobal : false,
        // Traducciones para ejercicios globales
        translations: (isAdmin && isGlobal && (nameEn || descriptionEn || objectiveEn))
          ? { en: { nombre: nameEn, descripcion: descriptionEn, objetivo: objectiveEn } }
          : undefined,
        // Incluir IDs de videos pendientes para asociar después de crear el ejercicio
        pendingVideoIds: pendingVideoIds.current.length > 0 ? [...pendingVideoIds.current] : undefined
      };
      
      if (onSave) {
        console.log('[exForm.handleSave] dispatching onSave: editing=', !!editingExercise, 'id=', newExercise._id, 'imgLen=', typeof imagen === 'string' ? imagen.length : 0, 'elements=', (fieldElements||[]).length);
        onSave(newExercise);
        // Limpiar videos pendientes después de guardar
        pendingVideoIds.current = [];
        clearFormDraft(STORAGE_KEYS.EXERCISE_FORM_DRAFT);
        clearFormDraft(STORAGE_KEYS.FIELD_RESULT);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      Alert.alert(t('message.error'), t('exercise.saveError', { msg: error.message || '' }));
    }
  };

  const handleCancelPress = useCallback(() => {
    clearFormDraft(STORAGE_KEYS.EXERCISE_FORM_DRAFT);
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
          <Ionicons name="arrow-back" size={26} color="#ffffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>{editingExercise ? t('exercise.editExercise') : t('exercise.createExercise')}</Text>
      </LinearGradient>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start' }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <Text style={styles.subTitle}>{t('exercise.generalData')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('exercise.examplePlaceholder')}
            placeholderTextColor="#bbb"
            value={name}
            onChangeText={setName}
          />
          
          {/* Selector de carpeta */}
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
          <Text style={styles.subTitle}>{t('exercise.parameters')}</Text>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.inputLabel}>{t('exercise.duration')}</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="time-outline" size={18} color="#9e9e9e" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.inputField}
                  placeholder="0"
                  placeholderTextColor="#bbb"
                  keyboardType="number-pad"
                  autoComplete="off"
                  value={duration}
                  onChangeText={setDuration}
                  maxLength={3}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('exercise.players')}</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="people-outline" size={18} color="#9e9e9e" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.inputField}
                  value={playerNumbers}
                  onChangeText={setPlayerNumbers}
                  keyboardType="number-pad"
                  autoComplete="off"
                  placeholder="0"
                  placeholderTextColor="#bbb"
                  maxLength={3}
                />
              </View>
            </View>
          </View>
          <Text style={styles.inputLabel}>{t('exercise.teams')}</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              value={teams}
              onChangeText={setTeams}
              keyboardType="number-pad"
              autoComplete="off"
              placeholder="Equipos"
              placeholderTextColor="#bbb"
              maxLength={2}
            />
            <View style={{ flex: 1 }} />
          </View>
          <Text style={styles.inputLabel}>{t('exercise.fieldDimensions')}</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="resize-outline" size={18} color="#9e9e9e" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.inputField}
              value={dimensions}
              onChangeText={setDimensions}
              placeholder={t('exercise.fieldDimensionsPlaceholder')}
              placeholderTextColor="#bbb"
              maxLength={20}
            />
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.subTitle}>{t('exercise.content')}</Text>
          <Text style={styles.inputLabel}>{t('exercise.description')}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={t('exercise.descriptionPlaceholder')}
            placeholderTextColor="#bbb"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Text style={styles.inputLabel}>{t('exercise.objective')}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={t('exercise.objectivePlaceholder')}
            placeholderTextColor="#bbb"
            value={objective}
            onChangeText={setObjective}
            multiline
          />
        </View>

        <View style={styles.formCard}>
          <View style={styles.graphicSection}>
            {loadingField ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>{t('exercise.loadingField')}</Text>
              </View>
            ) : (fieldElements && fieldElements.length > 0) || imagen ? (
              <>
                <Text style={styles.subTitle}>{t('exercise.graphicSaved')}</Text>
                <Base64ImagePreview base64={imagen} imageUrl={imagen} aspect={0.6} />
                <TouchableOpacity 
                    style={[styles.editButton, { alignSelf: 'center', marginTop: 12 }]} 
                    onPress={handleOpenField}
                  >
                    <Ionicons name="pencil-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.saveButtonText}>
                      {t('exercise.editGraphic')}
                    </Text>
                  </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.addButton} onPress={handleOpenField}>
                <Ionicons name="document-outline" size={40} color="#2196F3" />
                <Text style={styles.addButtonText}>{t('exercise.addGraphic')}</Text>
                <Text style={[styles.addButtonText, { fontSize: 13, color: '#9e9e9e', marginTop: 4 }]}> 
                  {t('exercise.touchToOpenEditor')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Toggle para ejercicio global (solo admin) */}
        {isAdmin && (
          <View style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 10 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Visibilidad del ejercicio</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: !isGlobal ? '#1e40af' : '#e2e8f0', borderWidth: 2, borderColor: !isGlobal ? '#1e40af' : 'transparent' }}
                onPress={() => setIsGlobal(false)}
              >
                <Ionicons name="person-outline" size={16} color={!isGlobal ? '#fff' : '#64748b'} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: !isGlobal ? '#fff' : '#64748b' }}>{t('exercise.myExercises')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: isGlobal ? '#16a34a' : '#e2e8f0', borderWidth: 2, borderColor: isGlobal ? '#16a34a' : 'transparent' }}
                onPress={() => setIsGlobal(true)}
              >
                <Ionicons name="globe-outline" size={16} color={isGlobal ? '#fff' : '#64748b'} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: isGlobal ? '#fff' : '#64748b' }}>{t('exercise.appExercises')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Traducciones al inglés (solo admin + ejercicio global) */}
        {isAdmin && isGlobal && (
          <View style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#eff6ff', borderTopWidth: 1, borderTopColor: '#bfdbfe', marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Ionicons name="language-outline" size={16} color="#1e40af" />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.5 }}>English Translation</Text>
            </View>
            <TextInput
              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#93c5fd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, fontSize: 14, color: '#1e293b' }}
              placeholder="Name (English)"
              placeholderTextColor="#94a3b8"
              value={nameEn}
              onChangeText={setNameEn}
            />
            <TextInput
              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#93c5fd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, fontSize: 14, color: '#1e293b' }}
              placeholder="Objective (English)"
              placeholderTextColor="#94a3b8"
              value={objectiveEn}
              onChangeText={setObjectiveEn}
            />
            <TextInput
              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#93c5fd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1e293b', minHeight: 60 }}
              placeholder="Description (English)"
              placeholderTextColor="#94a3b8"
              value={descriptionEn}
              onChangeText={setDescriptionEn}
              multiline
            />
          </View>
        )}
      </KeyboardAwareScrollView>

      <View style={[styles.fixedFooter, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={handleCancelPress}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.saveButton, exerciseLoading && styles.buttonDisabled]} 
          onPress={handleSave}
          disabled={exerciseLoading}
        >
          <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>
            {exerciseLoading ? t('exercise.saving') : (editingExercise ? t('exercise.saveChanges') : t('exercise.saveExercise'))}
          </Text>
        </TouchableOpacity>
      </View>
      <FolderPickerModal
        visible={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onSelect={(id, name) => {
          setFolderId(id || '');
          setFolderName(name || '');
        }}
        folders={isAdmin ? exerciseFoldersFlat : exerciseFoldersFlat.filter(f => !f.isGlobal)}
        selectedFolderId={folderId || null}
        title={t('folders.selectFolder')}
        accentColor="#3578e5"
        isAdmin={isAdmin}
        defaultIsGlobal={isGlobal}
        onCreateFolder={async ({ nombre, parentFolder, color, isGlobal: folderIsGlobal, translations }) => {
          await dispatch(createExerciseFolder({ nombre, parentFolder, color, isGlobal: folderIsGlobal, translations })).unwrap();
          dispatch(fetchExerciseFoldersFlat({ lang: i18n.language }));
          if (folderIsGlobal) dispatch(fetchGlobalFolders({ lang: i18n.language }));
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "#006577ff",
    borderBottomWidth: 1,
    borderColor: "#e0e0e0"
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: "#ffffffff",
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
  inputHalf: {
    flex: 1,
    marginRight: 10,
    minWidth: 90,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: "#424242",
    marginBottom: 8,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    marginBottom: 16,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: "#000",
    padding: 0,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
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

  editButtonText: {
    color: "#ffa726",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 0.2
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  saveButtonInline: {
    backgroundColor: "#2e7d32",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 8,
    marginLeft: 8,
    elevation: 1,
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
  // Modal styles
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
  modalText: {
    fontSize: 16,
    marginBottom: 22,
    textAlign: 'center',
    color: "#222"
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
  fieldButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  fieldButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos para tipo de ejercicio
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
    color: '#333',
  },
  createTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 16,
  },
  createTypeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginVertical: 16,
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  typeOptionText: {
    fontSize: 16,
    color: '#222',
  },
  createTypeButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 10,
  },
  createTypeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalInput: {
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    color: "#222",
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCreateBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 10,
    alignItems: 'center',
  },
  modalCreateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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