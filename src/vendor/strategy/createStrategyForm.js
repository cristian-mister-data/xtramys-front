import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
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
import { fetchStrategyFoldersFlat, createStrategyFolder, fetchGlobalFolders } from '@/store/slices/strategy/strategyThunks';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { LinearGradient } from 'expo-linear-gradient';
import { linkVideoToStrategy } from '@/utils/api';
import FolderPickerModal from '@/vendor/shared/FolderPickerModal';
import { useTheme } from 'styled-components';
import { showMissingFieldsToast } from '@/utils/validationToast';
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
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const strategyFolders = useSelector(state => state.strategy.foldersFlat) || [];
  const strategyLoading = useSelector(state => state.strategy.loading);
  const placeholderColor = theme?.colors?.inputPlaceholder || '#94a3b8';
  const iconColor = theme?.colors?.textMuted || '#9e9e9e';
  const chevronColor = theme?.colors?.textSecondary || '#666';
  const onPrimaryColor = theme?.colors?.onPrimary || '#fff';
  const onWarningColor = theme?.colors?.onWarning || '#fff';
  
  const [name, setName] = useState(editingStrategy ? editingStrategy.nombre || '' : '');
  const [folderId, setFolderId] = useState(editingStrategy?.folder?._id || editingStrategy?.folder || '');
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState(editingStrategy ? editingStrategy.descripcion || '' : '');
  const [objective, setObjective] = useState(editingStrategy ? editingStrategy.objetivo || '' : '');
  // En web el componente puede remontarse después de volver del editor de campo.
  // Inicializamos imagen/fieldElements/fieldType desde FIELD_RESULT si existe,
  // para sobrevivir a remounts (ver bug fix análogo en createExerciseForm.js).
  const __pendingFormDraft = (() => {
    try {
      return loadFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT, { remove: false });
    } catch {}
    return null;
  })();
  const __pendingFieldResult = (() => {
    try {
      const fr = loadFormDraft(STORAGE_KEYS.FIELD_RESULT, { remove: false });
      const editingId = editingStrategy?._id || editingStrategy?.id || null;
      const draftMatches = __pendingFormDraft && (__pendingFormDraft.editingId || null) === editingId && __pendingFormDraft.kind === 'strategy';
      if (draftMatches && fr && (fr.editingId || null) === editingId && fr.kind === 'strategy') return fr;
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
  const [pizarraConfig, setPizarraConfig] = useState(
    __pendingFieldResult && __pendingFieldResult.pizarraConfig
      ? __pendingFieldResult.pizarraConfig
      : (editingStrategy ? editingStrategy.pizarraConfig || null : null)
  );

  // Estados para videos pendientes de asociar (para nuevas estrategias)
  const pendingVideoIds = useRef([]);

  // Estado para admin: estrategia global
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGlobal, setIsGlobal] = useState(editingStrategy?.isGlobal || false);
  const [visibility, setVisibility] = useState(editingStrategy?.visibility || 'PRIVATE');
  const [userClubId, setUserClubId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [nameEn, setNameEn] = useState(editingStrategy?.translations?.en?.nombre || '');
  const [descriptionEn, setDescriptionEn] = useState(editingStrategy?.translations?.en?.descripcion || '');
  const [objectiveEn, setObjectiveEn] = useState(editingStrategy?.translations?.en?.objetivo || '');
  const [validationErrors, setValidationErrors] = useState({});
  
  const stableImagen = useMemo(() => imagen, [imagen]);
  const stableFieldElements = useMemo(() => fieldElements, [fieldElements]);
  const stableFieldType = useMemo(() => fieldType, [fieldType]);

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

  // Cargar carpetas de estrategia y detectar admin
  useEffect(() => {
    const loadFoldersAndRole = async () => {
      if (!foldersLoadedRef.current && strategyFolders.length === 0) {
        foldersLoadedRef.current = true;
        dispatch(fetchStrategyFoldersFlat({ lang: i18n.language }));
      }

      try {
        const str = await AsyncStorage.getItem('usuario');
        if (str) {
          const parsed = JSON.parse(str);
          if (parsed?.clubId) {
            setUserClubId(parsed.clubId);
          }
          if (parsed?.role === 'admin') {
            setIsAdmin(true);
            if (!editingStrategy) setIsGlobal(true);
            return;
          }
        }

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
            if (payload?.clubId) {
              setUserClubId(payload.clubId);
            }
            if (payload?.role === 'admin') {
              setIsAdmin(true);
              if (!editingStrategy) setIsGlobal(true);
            }
          }
        }
      } catch {}
    };
    loadFoldersAndRole();
  }, [dispatch, editingStrategy, i18n.language, strategyFolders.length]);

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
    const resultMatches = draftMatches && fieldResult && (fieldResult.editingId || null) === editingId && fieldResult.kind === 'strategy';

    if (draftMatches) {
      if (typeof draft.name === 'string') setName(draft.name);
      if (typeof draft.description === 'string') setDescription(draft.description);
      if (typeof draft.objective === 'string') setObjective(draft.objective);
      if (typeof draft.folderId === 'string') setFolderId(draft.folderId);
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
      name, description, objective, folderId,
      nameEn, descriptionEn, objectiveEn, isGlobal, visibility,
      fieldElements, fieldType, imagen, pizarraConfig,
      pendingVideoIds: pendingVideoIds.current.length > 0 ? [...pendingVideoIds.current] : [],
    });

    // Crear callbacks globales que se pueden acceder desde cualquier lugar
    global.fieldCallbacks = {
      onSave: (updatedElements, updatedFieldType, imageBase64, updatedConfig) => {
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
          kind: 'strategy',
          editingId,
        });
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
            name, description, objective, folderId,
            nameEn, descriptionEn, objectiveEn, isGlobal,
            fieldElements, fieldType, imagen, pizarraConfig,
            pendingVideoIds: [...pendingVideoIds.current],
          });
        }
        // Si estamos editando, el video ya se asocia directamente con estrategiaId
      }
    };

    const safeConfig = typeof pizarraConfig === 'string' ? (() => { try { return JSON.parse(pizarraConfig); } catch { return {}; } })() : (pizarraConfig || {});
    
    navigation.navigate('Field', {
      initialElements: fieldElements || [],
      initialFieldType: fieldType || 'full',
      initialConfig: safeConfig,
      isEditing: true,
      fieldImages: [],
      isStrategyMode: true, // Nueva prop para indicar modo estrategia
      // Forzar sandbox=false: ver nota en createExerciseForm.
      sandbox: false,
      // Pasar el ID de la estrategia si estamos editando, para poder asociar videos
      estrategiaId: editingStrategy?._id || editingStrategy?.id || null,
      isGlobalStrategy: isGlobal && isAdmin,
    });
  };



  const handleSave = async () => {
    const errors = {};
    const missingFields = [];
    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      errors.name = true;
      missingFields.push(t('strategy.name'));
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showMissingFieldsToast(t, missingFields);
      return;
    }
    
    try {
      const usuario = await AsyncStorage.getItem('usuario');
      const idUsuario = JSON.parse(usuario)?._id;
      if (!idUsuario) {
        Alert.alert(t('message.error'), t('strategy.cannotFindUser'));
        return;
      }

      setSaving(true);

      const newStrategy = {
        nombre: trimmedName,
        descripcion: String(description || ''),
        objetivo: String(objective || ''),
        folder: folderId || undefined,
        usuario: idUsuario,
        _id: editingStrategy ? editingStrategy._id : undefined,
        imagen: imagen,
        elementosCampo: fieldElements || [],
        tipoCampo: fieldType || '',
        pizarraConfig: pizarraConfig || null,
        isGlobal: isAdmin ? isGlobal : false,
        visibility: !isAdmin && userClubId ? visibility : (editingStrategy?.visibility || 'PRIVATE'),
        translations: (isAdmin && isGlobal)
          ? { en: { nombre: nameEn || '', descripcion: descriptionEn || '', objetivo: objectiveEn || '' } }
          : undefined,
        pendingVideoIds: pendingVideoIds.current.length > 0 ? [...pendingVideoIds.current] : undefined
      };
      
      if (onSave) {
        await onSave(newStrategy);
        // Limpiar videos pendientes después de guardar
        pendingVideoIds.current = [];
        clearFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT);
        clearFormDraft(STORAGE_KEYS.FIELD_RESULT);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      Alert.alert(t('message.error'), t('strategy.saveError', { msg: error.message || '' }));
    } finally {
      setSaving(false);
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
        colors={[theme?.colors?.surface || '#111827', theme?.colors?.surfaceAlt || '#0f172a']}
        style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <TouchableOpacity onPress={handleCancelPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color={theme?.colors?.text || '#fff'} />
        </TouchableOpacity>
        <Text style={styles.title}>{editingStrategy ? t('strategy.editStrategy') : t('strategy.createStrategy')}</Text>
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
            <Text style={styles.subTitle}>{isAdmin ? t('visibility', 'Visibilidad') : t('club.strategyVisibility', 'Visibilidad de la estrategia')}</Text>
            
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
                    <Text style={[styles.visibilityTitle, !isGlobal && styles.visibilityTitleSelected]}>{t('strategy.myStrategies')}</Text>
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
                    <Text style={[styles.visibilityTitle, isGlobal && styles.visibilityTitleSelected]}>{t('strategy.appStrategies')}</Text>
                    <Text style={styles.visibilityDesc}>Público</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.subTitle}>{t('strategy.generalData')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('strategy.examplePlaceholder')}
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
          <Text style={styles.subTitle}>{t('strategy.content')}</Text>
          <Text style={styles.inputLabel}>{t('strategy.description')}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={t('strategy.descriptionPlaceholder')}
            placeholderTextColor={placeholderColor}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Text style={styles.inputLabel}>{t('strategy.objective')}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={t('strategy.objectivePlaceholder')}
            placeholderTextColor={placeholderColor}
            value={objective}
            onChangeText={setObjective}
            multiline
          />
        </View>

        <View style={styles.formCard}>
          <View style={styles.graphicSection}>
            {(stableFieldElements && stableFieldElements.length > 0) || stableImagen ? (
              <>
                <Text style={styles.subTitle}>{t('strategy.graphicSaved')}</Text>
                <Base64ImagePreview base64={stableImagen} imageUrl={stableImagen} aspect={0.6} maxWidth={600} horizontalInset={112} style={{ width: '100%', alignSelf: 'stretch' }} />
                <TouchableOpacity style={[styles.editButton, { alignSelf: 'center', marginTop: 12 }]} onPress={handleOpenField}>
                    <Ionicons name="pencil-outline" size={18} color={onWarningColor} style={{ marginRight: 8 }} />
                    <Text style={[styles.saveButtonText, { color: onWarningColor }]}>{t('strategy.editGraphic')}</Text>
                  </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.addButton} onPress={handleOpenField}>
                <Ionicons name="document-outline" size={40} color={theme?.colors?.primary || '#2196F3'} />
                <Text style={styles.addButtonText}>{t('strategy.addGraphic')}</Text>
                <Text style={[styles.addButtonText, { fontSize: 13, color: theme?.colors?.textMuted || '#9e9e9e', marginTop: 4 }]}>
                  {t('strategy.touchToOpenEditor')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </View>



        {/* Traducciones al inglés (solo admin + estrategia global) */}
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
            {saving ? t('strategy.saving') : (editingStrategy ? t('edition.saveChanges') : t('strategy.saveStrategy'))}
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
        folders={isAdmin ? strategyFolders : strategyFolders.filter(f => !f.isGlobal)}
        selectedFolderId={folderId || null}
        title={t('folders.selectFolder')}
        accentColor={theme?.colors?.primary || '#8B5CF6'}
        isAdmin={isAdmin}
        defaultIsGlobal={isGlobal}
        onCreateFolder={async ({ nombre, parentFolder, color, isGlobal: folderIsGlobal, translations }) => {
          await dispatch(createStrategyFolder({ nombre, parentFolder, color, isGlobal: folderIsGlobal, translations })).unwrap();
          dispatch(fetchStrategyFoldersFlat({ lang: i18n.language }));
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
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme?.colors?.text || '#111827',
    letterSpacing: 0.2
  },
  subTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme?.colors?.textMuted || '#757575',
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme?.colors?.textSecondary || '#424242',
    marginBottom: 8,
  },
  textarea: {
    minHeight: 60,
    verticalAlign: "top",
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
    backgroundColor: theme?.colors?.surfaceAlt || '#111827',
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
    backgroundColor: theme?.colors?.success || '#16a34a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  createTypeButtonText: {
    color: theme?.colors?.onSuccess || '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  modalInput: {
    width: '100%',
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: theme?.colors?.surfaceAlt || '#1f2937',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: theme?.colors?.textSecondary || '#94a3b8',
    fontWeight: '600',
    fontSize: 15,
  },
  modalCreateBtn: {
    flex: 1,
    backgroundColor: theme?.colors?.primary || '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCreateBtnText: {
    color: theme?.colors?.onPrimary || '#fff',
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
    color: theme?.colors?.primary || '#1976d2',
    fontWeight: '600',
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
});
