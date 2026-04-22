import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRivalsByTeam, createRival } from '@/store/slices/rival/rivalThunks';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

export default function RivalSelector({
  selectedRivalId,
  selectedRivalName,
  onSelectRival,
  teamId,
  placeholder,
  style,
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  const rivals = useSelector(state => state.rival.rivals || []);
  const loading = useSelector(state => state.rival.loading);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [newRivalName, setNewRivalName] = useState('');
  const [newRivalEscudo, setNewRivalEscudo] = useState('');
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    (async () => {
      const storedUser = await AsyncStorage.getItem('usuario');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserId(user._id);
      }
    })();
  }, []);

  useEffect(() => {
    if (teamId) {
      dispatch(fetchRivalsByTeam({ teamId }));
    }
  }, [teamId, dispatch]);

  const filteredRivals = rivals.filter(rival =>
    rival.nombre?.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelectRival = (rival) => {
    onSelectRival(rival._id, rival.nombre, rival.escudo);
    setModalVisible(false);
    setSearchText('');
  };

  const handleManualEntry = () => {
    if (searchText.trim()) {
      onSelectRival(null, searchText.trim(), null);
      setModalVisible(false);
      setSearchText('');
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t('common.error'), t('rivals.permissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setNewRivalEscudo(base64Image);
    }
  };

  const handleCreateRival = async () => {
    if (!newRivalName.trim()) {
      Alert.alert(t('common.error'), t('rivals.nameRequired'));
      return;
    }

    if (!teamId) {
      Alert.alert(t('common.error'), t('rivals.noTeamSelected'));
      return;
    }

    if (!userId) {
      Alert.alert(t('common.error'), t('rivals.userNotFound'));
      return;
    }

    setSaving(true);
    try {
      const rivalData = {
        nombre: newRivalName.trim(),
        escudo: newRivalEscudo || '',
        equipo: teamId,
        usuario: userId,
      };

      const result = await dispatch(createRival(rivalData)).unwrap();
      
      // Refetch rivals list
      await dispatch(fetchRivalsByTeam({ teamId })).unwrap();
      
      // Select the newly created rival
      onSelectRival(result._id, result.nombre, result.escudo);
      
      // Close modals and reset
      setCreateModalVisible(false);
      setModalVisible(false);
      setNewRivalName('');
      setNewRivalEscudo('');
      setSearchText('');
      
      Alert.alert(t('common.success'), t('rivals.createSuccess'));
    } catch (error) {
      console.error('Error creating rival:', error);
      Alert.alert(t('common.error'), error.message || t('rivals.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setNewRivalName(searchText.trim());
    setNewRivalEscudo('');
    // Cerrar el modal de selección primero para evitar conflictos de modales anidados
    setModalVisible(false);
    // Pequeño delay para asegurar que el primer modal se cierra antes de abrir el segundo
    setTimeout(() => {
      setCreateModalVisible(true);
    }, 100);
  };

  const selectedRival = selectedRivalId ? rivals.find(r => r._id === selectedRivalId) : null;
  const displayValue = selectedRival?.nombre || selectedRivalName || '';

  return (
    <View style={style}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        {selectedRival?.escudo ? (
          <Image source={{ uri: selectedRival.escudo }} style={styles.selectorEscudo} />
        ) : (
          <Ionicons name="shield-outline" size={20} color="#64748b" style={styles.selectorIcon} />
        )}
        <Text style={[styles.selectorText, displayValue && styles.selectorTextSelected]}>
          {displayValue || placeholder || t('rivals.selectRivalPlaceholder')}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#64748b" />
      </TouchableOpacity>

      {/* Modal de selección de rival */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('rivals.selectRival')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color='#64748b' />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder={t('common.search') + '...'}
                placeholderTextColor="#64748b"
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="words"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <MaterialIcons name="clear" size={20} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3578e5" />
              </View>
            ) : (
              <FlatList
                data={filteredRivals}
                keyExtractor={(item) => item._id}
                style={styles.rivalList}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyText}>
                      {searchText ? t('common.noResults') : t('rivals.noRivals')}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.rivalItem,
                      selectedRivalId === item._id && styles.rivalItemSelected
                    ]}
                    onPress={() => handleSelectRival(item)}
                  >
                    {item.escudo ? (
                      <Image source={{ uri: item.escudo }} style={styles.rivalItemEscudo} />
                    ) : (
                      <View style={styles.rivalItemEscudoPlaceholder}>
                        <Ionicons name="shield-outline" size={24} color="#64748b" />
                      </View>
                    )}
                    <Text style={styles.rivalItemName}>{item.nombre}</Text>
                    {selectedRivalId === item._id && (
                      <MaterialIcons name="check" size={20} color="#10b981" />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}

            <View style={styles.modalFooter}>
              {searchText.trim() && !filteredRivals.some(r => r.nombre?.toLowerCase() === searchText.toLowerCase()) && (
                <TouchableOpacity style={styles.manualEntryButton} onPress={handleManualEntry}>
                  <MaterialIcons name="edit" size={18} color="#3578e5" />
                  <Text style={styles.manualEntryText}>
                    {t('common.use')} "{searchText.trim()}"
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
                <MaterialIcons name="add" size={20} color="#fff" />
                <Text style={styles.createButtonText}>{t('rivals.createNew')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de crear rival */}
      <Modal
        visible={createModalVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => {
          setCreateModalVisible(false);
          setTimeout(() => setModalVisible(true), 100);
        }}
      >
        <View style={[styles.modalOverlay, { zIndex: 9999 }]}>
          <View style={styles.createModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('rivals.createRival')}</Text>
              <TouchableOpacity onPress={() => {
                setCreateModalVisible(false);
                setTimeout(() => setModalVisible(true), 100);
              }}>
                <MaterialIcons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.createModalBody}>
              <TouchableOpacity style={styles.escudoPicker} onPress={pickImage}>
                {newRivalEscudo ? (
                  <Image source={{ uri: newRivalEscudo }} style={styles.escudoPreview} />
                ) : (
                  <View style={styles.escudoPlaceholder}>
                    <Ionicons name="camera" size={32} color="#64748b" />
                    <Text style={styles.escudoPlaceholderText}>{t('rivals.addShield')}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.inputLabel}>{t('rivals.name')}</Text>
              <TextInput
                style={styles.input}
                value={newRivalName}
                onChangeText={setNewRivalName}
                placeholder={t('rivals.namePlaceholder')}
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.createModalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setCreateModalVisible(false);
                  // Volver al modal de selección
                  setTimeout(() => {
                    setModalVisible(true);
                  }, 100);
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleCreateRival}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('common.create')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectorIcon: {
    marginRight: 8,
  },
  selectorEscudo: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 8,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: '#64748b',
  },
  selectorTextSelected: {
    color: '#1e293b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 8 : 12,
  },
  modalContent: {
    width: '100%',
    maxWidth: isMobileDevice() ? '100%' : 380,
    maxHeight: isMobileDevice() ? '85%' : '85%',
    backgroundColor: '#ffffff',
    borderRadius: isMobileDevice() ? 12 : 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isMobileDevice() ? 14 : 16,
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: isMobileDevice() ? 16 : 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: isMobileDevice() ? 12 : 16,
    marginBottom: 8,
    paddingHorizontal: isMobileDevice() ? 10 : 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: isMobileDevice() ? 10 : 12,
    paddingHorizontal: isMobileDevice() ? 6 : 8,
    fontSize: isMobileDevice() ? 14 : 16,
    color: '#1e293b',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  rivalList: {
    maxHeight: 300,
  },
  emptyList: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  rivalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isMobileDevice() ? 10 : 12,
    marginHorizontal: isMobileDevice() ? 12 : 16,
    marginVertical: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  rivalItemSelected: {
    backgroundColor: '#e8f0fe',
    borderWidth: 1,
    borderColor: '#3578e5',
  },
  rivalItemEscudo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  rivalItemEscudoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rivalItemName: {
    flex: 1,
    fontSize: isMobileDevice() ? 14 : 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  modalFooter: {
    padding: isMobileDevice() ? 12 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isMobileDevice() ? 10 : 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    gap: 8,
  },
  manualEntryText: {
    color: '#3578e5',
    fontWeight: '600',
    fontSize: isMobileDevice() ? 13 : 14,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3578e5',
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: isMobileDevice() ? 14 : 16,
  },
  createModalContent: {
    width: '100%',
    maxWidth: isMobileDevice() ? '100%' : 380,
    backgroundColor: '#ffffff',
    borderRadius: isMobileDevice() ? 12 : 16,
    overflow: 'hidden',
  },
  createModalBody: {
    padding: isMobileDevice() ? 12 : 16,
  },
  escudoPicker: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  escudoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  escudoPlaceholder: {
    alignItems: 'center',
  },
  escudoPlaceholderText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: isMobileDevice() ? 12 : 14,
    fontSize: isMobileDevice() ? 14 : 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  createModalFooter: {
    flexDirection: 'row',
    padding: isMobileDevice() ? 12 : 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: isMobileDevice() ? 14 : 16,
  },
  saveButton: {
    flex: 1,
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderRadius: 12,
    backgroundColor: '#3578e5',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: isMobileDevice() ? 14 : 16,
  },
});


