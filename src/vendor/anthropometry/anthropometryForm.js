import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import {
  createAnthropometry,
  updateAnthropometry,
  fetchAnthropometryById,
} from '@/store/slices/anthropometry/anthropometryThunks';
import { clearCurrentAnthropometry } from '@/store/slices/anthropometry/anthropometrySlice';
import { getPlayerFullName } from '@/utils/playerHelpers';

const AnthropometryForm = ({ navigation, route }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  const { anthropometryId, mode } = route.params || {};
  const isEditMode = mode === 'edit';
  
  const { currentAnthropometry, loading } = useSelector((state) => state.anthropometry);
  const { players } = useSelector((state) => state.player);
  const equipos = useSelector((state) => state.team.teams);
  
  // Obtener el equipo seleccionado igual que en entrenamientos
  const selectedTeam = equipos?.find(e => e.seleccionado === true);
  
  const [formData, setFormData] = useState({
    jugador: '',
    equipo: '',
    fecha: new Date(),
    peso: '',
    pliegues: {
      tricipital: '',
      subescapular: '',
      bicipital: '',
      cresta_iliaca: '',
      supraespinal: '',
      abdominal: '',
      muslo_frontal: '',
      pierna_medial: '',
    },
    notas: '',
  });

  // Establecer equipo cuando esté disponible
  useEffect(() => {
    if (selectedTeam?._id && !formData.equipo) {
      setFormData(prev => ({ ...prev, equipo: selectedTeam._id }));
    }
  }, [selectedTeam?._id]);
  
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (isEditMode && anthropometryId) {
      dispatch(fetchAnthropometryById({ id: anthropometryId }));
    }
    
    return () => {
      dispatch(clearCurrentAnthropometry());
    };
  }, [anthropometryId, isEditMode]);

  useEffect(() => {
    if (isEditMode && currentAnthropometry) {
      setFormData({
        jugador: typeof currentAnthropometry.jugador === 'object' 
          ? currentAnthropometry.jugador._id 
          : currentAnthropometry.jugador,
        equipo: typeof currentAnthropometry.equipo === 'object'
          ? currentAnthropometry.equipo._id
          : currentAnthropometry.equipo,
        fecha: new Date(currentAnthropometry.fecha),
        peso: currentAnthropometry.peso?.toString() || '',
        pliegues: {
          tricipital: currentAnthropometry.pliegues?.tricipital?.toString() || '',
          subescapular: currentAnthropometry.pliegues?.subescapular?.toString() || '',
          bicipital: currentAnthropometry.pliegues?.bicipital?.toString() || '',
          cresta_iliaca: currentAnthropometry.pliegues?.cresta_iliaca?.toString() || '',
          supraespinal: currentAnthropometry.pliegues?.supraespinal?.toString() || '',
          abdominal: currentAnthropometry.pliegues?.abdominal?.toString() || '',
          muslo_frontal: currentAnthropometry.pliegues?.muslo_frontal?.toString() || '',
          pierna_medial: currentAnthropometry.pliegues?.pierna_medial?.toString() || '',
        },
        notas: currentAnthropometry.notas || '',
      });
    }
  }, [currentAnthropometry, isEditMode]);

  const handleSubmit = async () => {
    if (!formData.jugador) {
      Alert.alert(t('message.error'), t('anthropometry.selectPlayer'));
      return;
    }

    if (!formData.equipo || !selectedTeam?._id) {
      Alert.alert(t('message.error'), 'Por favor selecciona un equipo');
      return;
    }

    // Limpiar pliegues vacíos/undefined
    const plieguesLimpios = {};
    Object.keys(formData.pliegues).forEach(key => {
      const valor = formData.pliegues[key];
      if (valor && valor !== '' && !isNaN(parseFloat(valor))) {
        plieguesLimpios[key] = parseFloat(valor);
      }
    });

    const dataToSend = {
      jugador: formData.jugador,
      equipo: selectedTeam._id,
      fecha: formData.fecha.toISOString(),
      notas: formData.notas,
    };
    
    // Solo añadir peso si tiene valor
    if (formData.peso && formData.peso !== '' && !isNaN(parseFloat(formData.peso))) {
      dataToSend.peso = parseFloat(formData.peso);
    }
    
    // Solo añadir pliegues si hay al menos uno
    if (Object.keys(plieguesLimpios).length > 0) {
      dataToSend.pliegues = plieguesLimpios;
    }

    try {
      if (isEditMode) {
        await dispatch(updateAnthropometry({ id: anthropometryId, data: dataToSend })).unwrap();
        Alert.alert(t('message.success'), t('anthropometry.updateSuccess'));
      } else {
        await dispatch(createAnthropometry(dataToSend)).unwrap();
        Alert.alert(t('message.success'), t('anthropometry.createSuccess'));
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting anthropometry:', error);
      Alert.alert(
        t('message.error'),
        isEditMode ? t('anthropometry.updateError') : t('anthropometry.createError')
      );
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, fecha: selectedDate });
    }
  };

  const updatePliegue = (key, value) => {
    setFormData({
      ...formData,
      pliegues: {
        ...formData.pliegues,
        [key]: value,
      },
    });
  };

  if (loading && isEditMode) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2856a2', '#1a3d73']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>
          {isEditMode ? t('anthropometry.edit') : t('anthropometry.new')}
        </Text>
      </LinearGradient>
      
      <KeyboardAwareScrollView style={styles.scrollView}>
        <View style={styles.form}>
          {/* DATOS GENERALES */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>DATOS GENERALES</Text>
            
            {/* Selector de jugador */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                <Ionicons name="person-outline" size={14} color="#424242" />
                {' '}{t('player.player')} *
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.jugador}
                  onValueChange={(value) => setFormData({ ...formData, jugador: value })}
                  style={styles.picker}
                  enabled={!isEditMode}
                >
                  <Picker.Item label={t('anthropometry.selectPlayer')} value="" />
{players.map((player) => (
                    <Picker.Item
                      key={player._id}
                      label={getPlayerFullName(player)}
                      value={player._id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Fecha */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                <Ionicons name="calendar-outline" size={14} color="#424242" />
                {' '}{t('anthropometry.date')} *
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {formData.fecha.toLocaleDateString('es-ES')}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.fecha}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Peso */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                <Ionicons name="fitness-outline" size={14} color="#424242" />
                {' '}{t('anthropometry.weight')} (kg)
              </Text>
              <TextInput
                style={styles.input}
                value={formData.peso}
                onChangeText={(value) => setFormData({ ...formData, peso: value })}
                keyboardType="decimal-pad"
                placeholder="75.5"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* PLIEGUES CUTÁNEOS */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>PLIEGUES CUTÁNEOS (mm)</Text>
            <Text style={styles.sectionSubtitle}>{t('anthropometry.skinfoldsUnit')}</Text>

            {/* Pliegues */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('anthropometry.tricipital')}</Text>
              <TextInput
                style={styles.input}
                value={formData.pliegues.tricipital}
                onChangeText={(value) => updatePliegue('tricipital', value)}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('anthropometry.subescapular')}</Text>
              <TextInput
                style={styles.input}
                value={formData.pliegues.subescapular}
                onChangeText={(value) => updatePliegue('subescapular', value)}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('anthropometry.bicipital')}</Text>
              <TextInput
                style={styles.input}
                value={formData.pliegues.bicipital}
                onChangeText={(value) => updatePliegue('bicipital', value)}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('anthropometry.crestaIliaca')}</Text>
              <TextInput
                style={styles.input}
                value={formData.pliegues.cresta_iliaca}
                onChangeText={(value) => updatePliegue('cresta_iliaca', value)}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('anthropometry.supraespinal')}</Text>
              <TextInput
                style={styles.input}
                value={formData.pliegues.supraespinal}
                onChangeText={(value) => updatePliegue('supraespinal', value)}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('anthropometry.abdominal')}</Text>
              <TextInput
                style={styles.input}
                value={formData.pliegues.abdominal}
                onChangeText={(value) => updatePliegue('abdominal', value)}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('anthropometry.musloFrontal')}</Text>
              <TextInput
                style={styles.input}
                value={formData.pliegues.muslo_frontal}
                onChangeText={(value) => updatePliegue('muslo_frontal', value)}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('anthropometry.piernaMedial')}</Text>
              <TextInput
                style={styles.input}
                value={formData.pliegues.pierna_medial}
                onChangeText={(value) => updatePliegue('pierna_medial', value)}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* NOTAS */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>NOTAS</Text>
            <View style={styles.fieldGroup}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notas}
                onChangeText={(value) => setFormData({ ...formData, notas: value })}
                multiline
                numberOfLines={4}
                placeholder={t('anthropometry.notesPlaceholder')}
                placeholderTextColor="#999"
              />
            </View>
          </View>

        </View>
      </KeyboardAwareScrollView>
      {/* Botones - Fixed Footer */}
      <View style={styles.fixedFooter}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSubmit}
        >
          <Ionicons name="save-outline" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {isEditMode ? t('common.save') : t('common.create')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#424242',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#333',
  },
  dateButton: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 15,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  fixedFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default AnthropometryForm;
