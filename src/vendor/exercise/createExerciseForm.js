import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { useTheme } from 'styled-components';
import { showMissingFieldsToast } from '@/utils/validationToast';
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
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const exerciseFoldersFlat = useSelector(state => state.exercise.foldersFlat) || [];
  const exerciseLoading = useSelector(state => state.exercise.loading);
  const placeholderColor = theme?.colors?.inputPlaceholder || '#94a3b8';
  const iconColor = theme?.colors?.textMuted || '#9e9e9e';
  const chevronColor = theme?.colors?.textSecondary || '#666';
  const onPrimaryColor = theme?.colors?.onPrimary || '#fff';
  const onWarningColor = theme?.colors?.onWarning || '#fff';
  
  const [name, setName] = useState(editingExercise ? editingExercise.nombre || '' : '');
  const [duration, setDuration] = useState(editingExercise ? String(editingExercise.tiempo ?? '') : '');
  const [description, setDescription] = useState(editingExercise ? editingExercise.descripcion || '' : '');
  const [objective, setObjective] = useState(editingExercise ? editingExercise.objetivo || '' : '');
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
  const __pendingFormDraft = (() => {
    try {
      return loadFormDraft(STORAGE_KEYS.EXERCISE_FORM_DRAFT, { remove: false });
    } catch {}
    return null;
  })();
  const __pendingFieldResult = (() => {
    try {
      const fr = loadFormDraft(STORAGE_KEYS.FIELD_RESULT, { remove: false });
      const editingId = editingExercise?._id || editingExercise?.id || null;
      const draftMatches = __pendingFormDraft && (__pendingFormDraft.editingId || null) === editingId && __pendingFormDraft.kind === 'exercise';
      if (draftMatches && fr && (fr.editingId || null) === editingId && fr.kind === 'exercise') return fr;
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
  const [pizarraConfig, setPizarraConfig] = useState(
    __pendingFieldResult && __pendingFieldResult.pizarraConfig
      ? __pendingFieldResult.pizarraConfig
      : (editingExercise ? editingExercise.pizarraConfig || null : null)
  );

  // Estados para videos pendientes de asociar (para nuevos ejercicios)
  const pendingVideoIds = useRef([]);

  // Estado para admin: ejercicio global
  const user = useSelector(state => state.usuario.user);
  const idUsuario = user?._id || "";
  const isAdmin = user?.role === 'admin';
  const userClubId = user?.clubId || null;
  const [isGlobal, setIsGlobal] = useState(() => {
    if (editingExercise) return editingExercise.isGlobal || false;
    return user?.role === 'admin';
  });
  const [visibility, setVisibility] = useState(editingExercise?.visibility || 'PRIVATE');

  // Traducciones para ejercicios globales (admin)
  const [nameEn, setNameEn] = useState(editingExercise?.translations?.en?.nombre || '');
  const [descriptionEn, setDescriptionEn] = useState(editingExercise?.translations?.en?.descripcion || '');
  const [objectiveEn, setObjectiveEn] = useState(editingExercise?.translations?.en?.objetivo || '');

  // Estados para carpeta de ejercicio
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [loadingField, setLoadingField] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

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
    dispatch(fetchExerciseFoldersFlat({ lang: i18n.language, user: idUsuario }));
  }, [dispatch, i18n.language, idUsuario]);

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
    const editingId = editingExercise?._id || editingExercise?.id || null;
    const draft = loadFormDraft(STORAGE_KEYS.EXERCISE_FORM_DRAFT, { remove: false });
    const fieldResult = loadFormDraft(STORAGE_KEYS.FIELD_RESULT, { remove: false });
    const draftMatches = draft && (draft.editingId || null) === editingId && draft.kind === 'exercise';
    const resultMatches = draftMatches && fieldResult && (fieldResult.editingId || null) === editingId && fieldResult.kind === 'exercise';

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
      if (typeof draft.visibility === 'string') setVisibility(draft.visibility);
      if (Array.isArray(draft.fieldElements)) setFieldElements(draft.fieldElements);
      if (typeof draft.fieldType === 'string') setFieldType(draft.fieldType);
      if (draft.pizarraConfig) setPizarraConfig(draft.pizarraConfig);
      if (typeof draft.imagen === 'string') setImagen(draft.imagen);
      if (Array.isArray(draft.pendingVideoIds)) pendingVideoIds.current = [...draft.pendingVideoIds];
    }

    if (resultMatches) {
      if (Array.isArray(fieldResult.fieldElements)) setFieldElements(fieldResult.fieldElements);
      if (typeof fieldResult.fieldType === 'string') setFieldType(fieldResult.fieldType);
      if (fieldResult.pizarraConfig) setPizarraConfig(fieldResult.pizarraConfig);
      if (typeof fieldResult.imagen === 'string') setImagen(fieldResult.imagen);
      if (Array.isArray(fieldResult.pendingVideoIds)) pendingVideoIds.current = [...fieldResult.pendingVideoIds];
    }

    if (draftMatches || resultMatches) {
      // No limpiamos FIELD_RESULT aquí: si el componente se remonta, los lazy
      // initializers de useState lo necesitan. Tampoco limpiamos el borrador
      // del formulario: React 18 StrictMode puede remontar una segunda vez.
      // Ambos se limpian al guardar o cancelar el formulario.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleOpenField = () => {
    setLoadingField(true);

    const editingId = editingExercise?._id || editingExercise?.id || null;
    saveFormDraft(STORAGE_KEYS.EXERCISE_FORM_DRAFT, {
      kind: 'exercise',
      editingId,
      name, duration, description, objective, dimensions, folderId,
      playerNumbers, teams, nameEn, descriptionEn, objectiveEn, isGlobal, visibility,
      fieldElements, fieldType, imagen, pizarraConfig,
      pendingVideoIds: pendingVideoIds.current.length > 0 ? [...pendingVideoIds.current] : [],
    });

    // Crear callbacks globales que se pueden acceder desde cualquier lugar
    global.fieldCallbacks = {
      onSave: (updatedElements, updatedFieldType, imageBase64, updatedConfig) => {
        // En web esta pantalla está desmontada cuando esto se ejecuta;
        // persistimos el resultado y el efecto de montaje lo aplica.
        saveFormDraft(STORAGE_KEYS.FIELD_RESULT, {
          kind: 'exercise',
          editingId,
          fieldElements: updatedElements,
          fieldType: updatedFieldType,
          imagen: imageBase64,
          pizarraConfig: updatedConfig,
          pendingVideoIds: pendingVideoIds.current.length > 0 ? [...pendingVideoIds.current] : [],
        });
        try {
          setFieldElements(updatedElements);
          setFieldType(updatedFieldType);
          setImagen(imageBase64);
          if (updatedConfig) setPizarraConfig(updatedConfig);
          setLoadingField(false);
        } catch {}
        global.fieldCallbacks = null;
      },
      onCancel: () => {
        saveFormDraft(STORAGE_KEYS.FIELD_RESULT, {
          kind: 'exercise',
          editingId,
        });
        try { setLoadingField(false); } catch {}
        global.fieldCallbacks = null;
      },
      // Callback para cuando se guarda un video - guardar ID para asociar después
      onVideoSaved: (videoId) => {
        if (videoId && !editingExercise?._id && !editingExercise?.id) {
          // Si es un ejercicio nuevo, guardar el ID del video para asociar después
          pendingVideoIds.current.push(videoId);
          saveFormDraft(STORAGE_KEYS.EXERCISE_FORM_DRAFT, {
            kind: 'exercise',
            editingId,
            name, duration, description, objective, dimensions, folderId,
            playerNumbers, teams, nameEn, descriptionEn, objectiveEn, isGlobal,
            fieldElements, fieldType, imagen, pizarraConfig,
            pendingVideoIds: [...pendingVideoIds.current],
          });
        }
        // Si estamos editando, el video ya se asocia directamente con ejercicioId
      }
    };
    
    const safeConfig = typeof pizarraConfig === 'string' ? (() => { try { return JSON.parse(pizarraConfig); } catch { return {}; } })() : (pizarraConfig || {});
    
    navigation.navigate('Field', {
      initialElements: fieldElements || [],
      initialFieldType: fieldType || 'full',
      initialConfig: safeConfig,
      isEditing: true,
      fieldImages: [],
      // Forzar sandbox=false: la página /tactical-board standalone usa
      // sandbox=true por defecto vía prop. Al venir desde el formulario
      // del ejercicio queremos los botones Guardar/Cancelar.
      sandbox: false,
      // Pasar el ID del ejercicio si estamos editando, para poder asociar videos
      ejercicioId: editingExercise?._id || editingExercise?.id || null,
      isGlobalExercise: isGlobal && isAdmin,
    });
  };



  const handleSave = async () => {
    const errors = {};
    const missingFields = [];
    const trimmedName = String(name || '').trim();
    const trimmedDuration = String(duration || '').trim();
    if (!trimmedName) {
      errors.name = true;
      missingFields.push(t('exercise.name'));
    }
    if (!trimmedDuration) {
      errors.duration = true;
      missingFields.push(t('exercise.duration'));
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showMissingFieldsToast(t, missingFields);
      return;
    }
    
    try {
      if (!idUsuario) {
        Alert.alert(t('message.error'), t('exercise.cannotFindUser'));
        return;
      }

      setSaving(true);

      const newExercise = {
        nombre: trimmedName,
        tiempo: trimmedDuration,
        descripcion: String(description || ''),
        objetivo: String(objective || ''),
        dimensiones: dimensions ? String(dimensions) : undefined,
        folder: folderId || undefined,
        numeroJugadores: playerNumbers ? Number(playerNumbers) : undefined,
        equipos: teams ? Number(teams) : undefined,
        usuario: idUsuario,
        _id: editingExercise ? editingExercise._id : undefined,
        imagen: imagen,
        elementosCampo: fieldElements || [],
        tipoCampo: fieldType || '',
        pizarraConfig: pizarraConfig || null,
        isGlobal: isAdmin ? isGlobal : false,
        visibility: !isAdmin && userClubId ? visibility : (editingExercise?.visibility || 'PRIVATE'),
        // Traducciones para ejercicios globales
        translations: (isAdmin && isGlobal)
          ? { en: { nombre: nameEn || '', descripcion: descriptionEn || '', objetivo: objectiveEn || '' } }
          : undefined,
        // Incluir IDs de videos pendientes para asociar después de crear el ejercicio
        pendingVideoIds: pendingVideoIds.current.length > 0 ? [...pendingVideoIds.current] : undefined
      };
      
      if (onSave) {
        await onSave(newExercise);
        // Limpiar videos pendientes después de guardar
        pendingVideoIds.current = [];
        clearFormDraft(STORAGE_KEYS.EXERCISE_FORM_DRAFT);
        clearFormDraft(STORAGE_KEYS.FIELD_RESULT);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      Alert.alert(t('message.error'), t('exercise.saveError', { msg: error.message || '' }));
    } finally {
      setSaving(false);
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
        colors={[theme?.colors?.surface || '#111827', theme?.colors?.surfaceAlt || '#0f172a']}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <TouchableOpacity onPress={handleCancelPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color={theme?.colors?.text || '#fff'} />
        </TouchableOpacity>
        <Text style={styles.title}>{editingExercise ? t('exercise.editExercise') : t('exercise.createExercise')}</Text>
      </LinearGradient>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start', paddingBottom: Math.max(insets.bottom, 120) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selector de visibilidad y global (Arriba del todo) */}
        {((!isAdmin && userClubId) || isAdmin) && (
          <View style={styles.formCard}>
            <Text style={styles.subTitle}>{isAdmin ? t('visibility', 'Visibilidad') : t('club.exerciseVisibility', 'Visibilidad del ejercicio')}</Text>
            
            {!isAdmin && userClubId && (
              <View style={styles.visibilityContainer}>
                <TouchableOpacity
                  style={[styles.visibilityOption, visibility === 'PRIVATE' && styles.visibilityOptionSelectedPrivate]}
                  onPress={() => setVisibility('PRIVATE')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.visibilityIconContainer, visibility === 'PRIVATE' && styles.visibilityIconContainerSelectedPrivate]}>
                    <Ionicons name="lock-closed" size={20} color={visibility === 'PRIVATE' ? (theme?.colors?.primary || '#3b82f6') : (theme?.colors?.textMuted || '#94a3b8')} />
                  </View>
                  <View style={styles.visibilityTextContainer}>
                    <Text style={[styles.visibilityTitle, visibility === 'PRIVATE' && styles.visibilityTitleSelected]}>{t('club.private', 'Privado')}</Text>
                    <Text style={styles.visibilityDesc}>{t('club.privateDesc', 'Solo tú puedes verlo')}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.visibilityOption, visibility === 'CLUB' && styles.visibilityOptionSelectedClub]}
                  onPress={() => setVisibility('CLUB')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.visibilityIconContainer, visibility === 'CLUB' && styles.visibilityIconContainerSelectedClub]}>
                    <Ionicons name="people" size={20} color={visibility === 'CLUB' ? (theme?.colors?.success || '#10b981') : (theme?.colors?.textMuted || '#94a3b8')} />
                  </View>
                  <View style={styles.visibilityTextContainer}>
                    <Text style={[styles.visibilityTitle, visibility === 'CLUB' && styles.visibilityTitleSelected]}>{t('club.shareWithClub', 'Compartir con mi club')}</Text>
                    <Text style={styles.visibilityDesc}>{t('club.shareDesc', 'Visible para tu club')}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {isAdmin && (
              <View style={styles.visibilityContainer}>
                <TouchableOpacity
                  style={[styles.visibilityOption, !isGlobal && styles.visibilityOptionSelectedPrivate]}
                  onPress={() => setIsGlobal(false)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.visibilityIconContainer, !isGlobal && styles.visibilityIconContainerSelectedPrivate]}>
                    <Ionicons name="person" size={20} color={!isGlobal ? (theme?.colors?.primary || '#3b82f6') : (theme?.colors?.textMuted || '#94a3b8')} />
                  </View>
                  <View style={styles.visibilityTextContainer}>
                    <Text style={[styles.visibilityTitle, !isGlobal && styles.visibilityTitleSelected]}>{t('exercise.myExercises')}</Text>
                    <Text style={styles.visibilityDesc}>Privado</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.visibilityOption, isGlobal && styles.visibilityOptionSelectedClub]}
                  onPress={() => setIsGlobal(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.visibilityIconContainer, isGlobal && styles.visibilityIconContainerSelectedClub]}>
                    <Ionicons name="globe" size={20} color={isGlobal ? (theme?.colors?.success || '#10b981') : (theme?.colors?.textMuted || '#94a3b8')} />
                  </View>
                  <View style={styles.visibilityTextContainer}>
                    <Text style={[styles.visibilityTitle, isGlobal && styles.visibilityTitleSelected]}>{t('exercise.appExercises')}</Text>
                    <Text style={styles.visibilityDesc}>Público</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.subTitle}>{t('exercise.generalData')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('exercise.examplePlaceholder')}
            placeholderTextColor={placeholderColor}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (validationErrors.name) {
                setValidationErrors(prev => ({ ...prev, name: null }));
              }
            }}
          />
          {/* Selector de carpeta */}
          <TouchableOpacity 
            style={styles.typeSelector} 
            onPress={() => setShowFolderModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="folder-outline" size={18} color={iconColor} style={{ marginRight: 8 }} />
              <Text style={[styles.typeSelectorText, styles.typeSelectorTextSelected]}>
                {folderId ? folderName : t('folders.noFolder')}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={chevronColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.subTitle}>{t('exercise.parameters')}</Text>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.inputLabel}>{t('exercise.duration')}</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="time-outline" size={18} color={iconColor} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.inputField}
                  placeholder="0"
                  placeholderTextColor={placeholderColor}
                  keyboardType="number-pad"
                  autoComplete="off"
                  value={duration}
                  onChangeText={(text) => {
                    setDuration(text);
                    if (validationErrors.duration) {
                      setValidationErrors(prev => ({ ...prev, duration: null }));
                    }
                  }}
                  maxLength={3}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('exercise.players')}</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="people-outline" size={18} color={iconColor} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.inputField}
                  value={playerNumbers}
                  onChangeText={setPlayerNumbers}
                  keyboardType="number-pad"
                  autoComplete="off"
                  placeholder="0"
                  placeholderTextColor={placeholderColor}
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
              placeholderTextColor={placeholderColor}
              maxLength={2}
            />
            <View style={{ flex: 1 }} />
          </View>
          <Text style={styles.inputLabel}>{t('exercise.fieldDimensions')}</Text>
          <View style={styles.inputWithIcon}>
            <Ionicons name="resize-outline" size={18} color={iconColor} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.inputField}
              value={dimensions}
              onChangeText={setDimensions}
              placeholder={t('exercise.fieldDimensionsPlaceholder')}
              placeholderTextColor={placeholderColor}
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
            placeholderTextColor={placeholderColor}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Text style={styles.inputLabel}>{t('exercise.objective')}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={t('exercise.objectivePlaceholder')}
            placeholderTextColor={placeholderColor}
            value={objective}
            onChangeText={setObjective}
            multiline
          />
        </View>

        <View style={styles.formCard}>
          <View style={styles.graphicSection}>
            {(fieldElements && fieldElements.length > 0) || imagen ? (
              <>
                <Text style={styles.subTitle}>{t('exercise.graphicSaved')}</Text>
                <Base64ImagePreview base64={imagen} imageUrl={imagen} aspect={0.6} maxWidth={600} horizontalInset={112} style={{ width: '100%', alignSelf: 'stretch' }} />
                <TouchableOpacity 
                    style={[styles.editButton, { alignSelf: 'center', marginTop: 12 }]} 
                    onPress={handleOpenField}
                  >
                    <Ionicons name="pencil-outline" size={18} color={onWarningColor} style={{ marginRight: 8 }} />
                    <Text style={[styles.saveButtonText, { color: onWarningColor }]}>
                      {t('exercise.editGraphic')}
                    </Text>
                  </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.addButton} onPress={handleOpenField}>
                <Ionicons name="document-outline" size={40} color={theme?.colors?.primary || '#2196F3'} />
                <Text style={styles.addButtonText}>{t('exercise.addGraphic')}</Text>
                <Text style={[styles.addButtonText, { fontSize: 13, color: theme?.colors?.textMuted || '#9e9e9e', marginTop: 4 }]}> 
                  {t('exercise.touchToOpenEditor')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>



        {/* Traducciones al inglés (solo admin + ejercicio global) */}
        {isAdmin && isGlobal && (
          <View style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: theme?.colors?.surface || '#111827', borderTopWidth: 1, borderTopColor: theme?.colors?.border || '#334155', marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Ionicons name="language-outline" size={16} color={theme?.colors?.primary || '#3b82f6'} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme?.colors?.primary || '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.5 }}>English Translation</Text>
            </View>
            <TextInput
              style={{ backgroundColor: theme?.colors?.inputBg || '#1f2937', borderWidth: 1, borderColor: theme?.colors?.inputBorder || '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, fontSize: 14, color: theme?.colors?.text || '#e2e8f0' }}
              placeholder="Name (English)"
              placeholderTextColor={placeholderColor}
              value={nameEn}
              onChangeText={setNameEn}
            />
            <TextInput
              style={{ backgroundColor: theme?.colors?.inputBg || '#1f2937', borderWidth: 1, borderColor: theme?.colors?.inputBorder || '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, fontSize: 14, color: theme?.colors?.text || '#e2e8f0' }}
              placeholder="Objective (English)"
              placeholderTextColor={placeholderColor}
              value={objectiveEn}
              onChangeText={setObjectiveEn}
            />
            <TextInput
              style={{ backgroundColor: theme?.colors?.inputBg || '#1f2937', borderWidth: 1, borderColor: theme?.colors?.inputBorder || '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: theme?.colors?.text || '#e2e8f0', minHeight: 60 }}
              placeholder="Description (English)"
              placeholderTextColor={placeholderColor}
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
          style={[styles.saveButton, saving && styles.buttonDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="save-outline" size={18} color={onPrimaryColor} style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>
            {saving ? t('exercise.saving') : (editingExercise ? t('exercise.saveChanges') : t('exercise.saveExercise'))}
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
        accentColor={theme?.colors?.primary || '#3578e5'}
        isAdmin={isAdmin}
        defaultIsGlobal={isGlobal}
        onCreateFolder={async ({ nombre, parentFolder, color, isGlobal: folderIsGlobal, translations }) => {
          await dispatch(createExerciseFolder({ nombre, parentFolder, color, isGlobal: folderIsGlobal, translations, user: idUsuario })).unwrap();
          dispatch(fetchExerciseFoldersFlat({ lang: i18n.language, user: idUsuario }));
          if (folderIsGlobal) dispatch(fetchGlobalFolders({ lang: i18n.language }));
        }}
      />
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
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
    backgroundColor: theme?.colors?.backgroundAlt || '#111a30'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: theme?.colors?.surface || '#111827',
    borderBottomWidth: 1,
    borderColor: theme?.colors?.border || '#334155'
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme?.colors?.text || '#e2e8f0',
    letterSpacing: 0.2
  },
  subTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme?.colors?.textMuted || '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: theme?.colors?.surfaceAlt || '#111827',
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
    borderWidth: 1,
    borderColor: theme?.colors?.border || '#334155',
  },
  input: {
    backgroundColor: theme?.colors?.inputBg || '#1f2937',
    borderRadius: 8,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme?.colors?.inputBorder || '#334155',
    color: theme?.colors?.text || '#e2e8f0',
  },
  inputHalf: {
    flex: 1,
    marginRight: 10,
    minWidth: 90,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme?.colors?.textSecondary || '#424242',
    marginBottom: 8,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme?.colors?.inputBg || '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme?.colors?.inputBorder || '#334155',
    marginBottom: 16,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: theme?.colors?.text || '#000',
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
    width: '100%',
  },
  addButton: {
    backgroundColor: theme?.colors?.surfaceAlt || '#111827',
    borderRadius: 12,
    paddingVertical: 48,
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme?.colors?.primary || '#3b82f6',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  addButtonText: {
    color: theme?.colors?.primary || '#3b82f6',
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
  visibilityContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme?.colors?.inputBg || '#1f2937',
  },
  visibilityOptionSelectedPrivate: {
    borderColor: theme?.colors?.primary || '#3b82f6',
    backgroundColor: (theme?.colors?.primary || '#3b82f6') + '10',
  },
  visibilityOptionSelectedClub: {
    borderColor: theme?.colors?.success || '#10b981',
    backgroundColor: (theme?.colors?.success || '#10b981') + '10',
  },
  visibilityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme?.colors?.surfaceAlt || '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  visibilityIconContainerSelectedPrivate: {
    backgroundColor: (theme?.colors?.primary || '#3b82f6') + '20',
  },
  visibilityIconContainerSelectedClub: {
    backgroundColor: (theme?.colors?.success || '#10b981') + '20',
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme?.colors?.text || '#e2e8f0',
    marginBottom: 2,
  },
  visibilityTitleSelected: {
    color: theme?.colors?.text || '#fff',
  },
  visibilityDesc: {
    fontSize: 13,
    color: theme?.colors?.textMuted || '#94a3b8',
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
    backgroundColor: theme?.colors?.primary || '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: theme?.colors?.primary || '#2196F3',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    maxWidth: 200,
  }, 
  editButton: {
    backgroundColor: theme?.colors?.warning || '#d97706',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    minWidth: 200,
    maxWidth: 260,
  },
  saveButtonText: {
    color: theme?.colors?.onPrimary || '#fff',
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
    backgroundColor: theme?.colors?.surface || '#111827',
    borderTopWidth: 1,
    borderTopColor: theme?.colors?.border || '#334155',
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
  },
  cancelButton: {
    flex: 0.4,
    backgroundColor: theme?.colors?.surfaceAlt || '#111827',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme?.colors?.border || '#334155',
    maxWidth: 200,
  },
  cancelButtonText: {
    color: theme?.colors?.textSecondary || '#94a3b8',
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
    backgroundColor: theme?.colors?.surfaceAlt || '#111827',
    borderRadius: 16,
    padding: 26,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 12,
    color: theme?.colors?.text || '#e2e8f0'
  },
  modalText: {
    fontSize: 16,
    marginBottom: 22,
    textAlign: 'center',
    color: theme?.colors?.textSecondary || '#94a3b8'
  },
  closeModalBtn: {
    backgroundColor: theme?.colors?.primary || '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  closeModalBtnText: {
    color: theme?.colors?.onPrimary || '#fff',
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 0.2
  },
  fieldButton: {
    backgroundColor: theme?.colors?.success || '#16a34a',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  fieldButtonText: {
    color: theme?.colors?.onSuccess || '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos para tipo de ejercicio
  typeSelector: {
    backgroundColor: theme?.colors?.inputBg || '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme?.colors?.inputBorder || '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeSelectorText: {
    fontSize: 15,
    color: theme?.colors?.textMuted || '#94a3b8',
  },
  typeSelectorTextSelected: {
    color: theme?.colors?.text || '#e2e8f0',
  },
  typeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme?.colors?.border || '#334155',
  },
  typeOptionText: {
    fontSize: 16,
    color: theme?.colors?.text || '#e2e8f0',
  },
  createTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme?.colors?.success || '#16a34a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 16,
  },
  createTypeButtonText: {
    color: theme?.colors?.onSuccess || '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalInput: {
    backgroundColor: theme?.colors?.inputBg || '#1f2937',
    borderRadius: 8,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: theme?.colors?.border || '#334155',
    color: theme?.colors?.text || '#e2e8f0',
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
    backgroundColor: theme?.colors?.surfaceAlt || '#1f2937',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: theme?.colors?.textSecondary || '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCreateBtn: {
    flex: 1,
    backgroundColor: theme?.colors?.primary || '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    marginLeft: 10,
    alignItems: 'center',
  },
  modalCreateBtnText: {
    color: theme?.colors?.onPrimary || '#fff',
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
    color: theme?.colors?.primary || '#1976d2',
    fontWeight: '600',
  },
});
