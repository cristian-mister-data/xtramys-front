import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, ScrollView, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';

const daysList = [
  { label: 'weekdays.monday', value: 1 },
  { label: 'weekdays.tuesday', value: 2 },
  { label: 'weekdays.wednesday', value: 3 },
  { label: 'weekdays.thursday', value: 4 },
  { label: 'weekdays.friday', value: 5 },
  { label: 'weekdays.saturday', value: 6 },
  { label: 'weekdays.sunday', value: 0 }
];

// Función para detectar si es móvil
const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

function formatTime(date) {
  if (!(date instanceof Date)) return date;
  return date
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    .replace(/^(\d{2}):(\d{2}).*$/, '$1:$2');
}

// Función para inicializar la hora con fecha de hoy
function getTodayWithTime(hour, minute) {
  const now = new Date();
  now.setHours(hour);
  now.setMinutes(minute);
  now.setSeconds(0);
  now.setMilliseconds(0);
  return now;
}

export default function OrganizeSeasonForm({ onSubmit, onCancel, loading }) {
  const { t, i18n } = useTranslation();
  // Detectar si es móvil para estilos responsivos
  const [fechaInicio, setFechaInicio] = useState(new Date());
  const [fechaFin, setFechaFin] = useState(new Date());
  const [diasSemana, setDiasSemana] = useState([]);
  // INICIALIZACIÓN CORRECTA DE HORAS
  const [horaInicio, setHoraInicio] = useState(getTodayWithTime(18, 0));
  const [horaFin, setHoraFin] = useState(getTodayWithTime(19, 0));
  const [horaReunion, setHoraReunion] = useState(getTodayWithTime(17, 45));

  // Picker state
  const [picker, setPicker] = useState({ open: false, field: null, mode: 'date' });

  // Para ModalDateTimePicker (mejor soporte en iOS)
  const [modalDatePicker, setModalDatePicker] = useState({ visible: false, field: null, mode: 'date' });

  function toggleDia(dia) {
    setDiasSemana(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  }

  function handleSubmit() {
    const missing = [];
    if (!fechaInicio) missing.push(t('session.startDate'));
    if (!fechaFin) missing.push(t('session.endDate'));
    if (diasSemana.length === 0) missing.push(t('session.trainingDays'));
    if (missing.length > 0) {
      Alert.alert(t('message.error'), t('message.missingFields', { fields: missing.join(', ') }));
      return;
    }
    onSubmit({
      fechaInicio,
      fechaFin,
      diasSemana,
      horaInicio: formatTime(horaInicio),
      horaFin: formatTime(horaFin),
      horaReunion: formatTime(horaReunion)
    });
  }

  function openPicker(field, mode) {
    if (Platform.OS === "ios") {
      setModalDatePicker({ visible: true, field, mode });
    } else {
      setPicker({ open: true, field, mode });
    }
  }

  function getPickerValue(field) {
    switch (field) {
      case 'fechaInicio':
        return fechaInicio;
      case 'fechaFin':
        return fechaFin;
      case 'horaInicio':
        return horaInicio;
      case 'horaFin':
        return horaFin;
      case 'horaReunion':
        return horaReunion;
      default:
        return new Date();
    }
  }

  function getPickerDisplay() {
    if (picker.mode === 'date') return 'calendar';
    if (Platform.OS === 'ios') return 'spinner';
    return 'default';
  }

  function onChange(event, selectedValue) {
    if ((Platform.OS === 'android' || Platform.OS === 'web') && event.type === "dismissed") {
      setPicker({ ...picker, open: false });
      return;
    }
    if (picker.field === "fechaInicio" && selectedValue) {
      setFechaInicio(selectedValue);
      if (fechaFin < selectedValue) setFechaFin(selectedValue);
    }
    if (picker.field === "fechaFin" && selectedValue) {
      setFechaFin(selectedValue);
    }
    if (picker.field === "horaInicio" && selectedValue) {
      setHoraInicio(selectedValue);
    }
    if (picker.field === "horaFin" && selectedValue) {
      setHoraFin(selectedValue);
    }
    if (picker.field === "horaReunion" && selectedValue) {
      setHoraReunion(selectedValue);
    }
    setPicker({ ...picker, open: false });
  }

  function handleModalConfirm(date) {
    if (modalDatePicker.field === "fechaInicio") {
      setFechaInicio(date);
      if (fechaFin < date) setFechaFin(date);
    }
    if (modalDatePicker.field === "fechaFin") {
      setFechaFin(date);
    }
    if (modalDatePicker.field === "horaInicio") {
      setHoraInicio(date);
    }
    if (modalDatePicker.field === "horaFin") {
      setHoraFin(date);
    }
    if (modalDatePicker.field === "horaReunion") {
      setHoraReunion(date);
    }
    setModalDatePicker({ ...modalDatePicker, visible: false });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('session.organizeTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('session.organizeSubtitle')}
        </Text>
      </View>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('session.periodSection')}</Text>
          
          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('session.startDate')}</Text>
              <TouchableOpacity 
                onPress={() => openPicker('fechaInicio', 'date')} 
                style={styles.dateInput}
              >
                <MaterialIcons name="calendar-today" size={20} color="#64748b" />
                <Text style={styles.dateText}>
                  {fechaInicio.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('session.endDate')}</Text>
              <TouchableOpacity 
                onPress={() => openPicker('fechaFin', 'date')} 
                style={styles.dateInput}
              >
                <MaterialIcons name="calendar-today" size={20} color="#64748b" />
                <Text style={styles.dateText}>
                  {fechaFin.toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('session.trainingDays')}</Text>
          <Text style={styles.sectionSubtitle}>{t('session.selectDaysSubtitle')}</Text>
          
          <View style={styles.daysGrid}>
            {daysList.map(d =>
              <TouchableOpacity
                key={d.value}
                style={[
                  styles.dayButton,
                  diasSemana.includes(d.value) && styles.dayButtonActive
                ]}
                onPress={() => toggleDia(d.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayButtonText,
                  diasSemana.includes(d.value) && styles.dayButtonTextActive
                ]}>
                  {t(d.label).slice(0, 3)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('session.schedules')}</Text>
          
          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('session.startHour')}</Text>
              <TouchableOpacity 
                style={styles.timeInput} 
                onPress={() => openPicker('horaInicio', 'time')}
              >
                <MaterialIcons name="schedule" size={20} color="#64748b" />
                <Text style={styles.timeText}>{formatTime(horaInicio)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('session.endHour')}</Text>
              <TouchableOpacity 
                style={styles.timeInput} 
                onPress={() => openPicker('horaFin', 'time')}
              >
                <MaterialIcons name="schedule" size={20} color="#64748b" />
                <Text style={styles.timeText}>{formatTime(horaFin)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('session.meetingHour')}</Text>
            <TouchableOpacity 
              style={styles.timeInput} 
              onPress={() => openPicker('horaReunion', 'time')}
            >
              <MaterialIcons name="schedule" size={20} color="#64748b" />
              <Text style={styles.timeText}>{formatTime(horaReunion)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ANDROID Picker */}
      {(Platform.OS === 'android' || Platform.OS === 'web') && picker.open && (
        <DateTimePicker
          value={getPickerValue(picker.field)}
          mode={picker.mode}
          is24Hour={true}
          display={getPickerDisplay()}
          minimumDate={picker.field === 'fechaFin' ? fechaInicio : undefined}
          maximumDate={picker.field === 'fechaInicio' ? fechaFin : undefined}
          onChange={onChange}
          style={{ backgroundColor: 'white' }}
        />
      )}

      {/* Modal iOS Picker */}
      <DateTimePickerModal
        isVisible={modalDatePicker.visible}
        mode={modalDatePicker.mode}
        date={getPickerValue(modalDatePicker.field)}
        is24Hour={true}
        minimumDate={modalDatePicker.field === 'fechaFin' ? fechaInicio : undefined}
        maximumDate={modalDatePicker.field === 'fechaInicio' ? fechaFin : undefined}
        onConfirm={handleModalConfirm}
        onCancel={() => setModalDatePicker({ ...modalDatePicker, visible: false })}
        locale={i18n.language === 'es' ? 'es-ES' : 'en-US'}
        headerTextIOS={t('session.selectDateTime')}
        cancelTextIOS={t('common.cancel')}
        confirmTextIOS={t('common.confirm')}
      />

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={onCancel} 
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleSubmit} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialIcons name="play-arrow" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>{t('session.createTrainings')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: isMobileDevice() ? 16 : 24,
    paddingTop: isMobileDevice() ? 16 : 20,
    paddingBottom: isMobileDevice() ? 12 : 16,
  },
  title: {
    fontSize: isMobileDevice() ? 20 : 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: isMobileDevice() ? 12 : 14,
    color: '#64748b',
    lineHeight: isMobileDevice() ? 18 : 20,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: isMobileDevice() ? 16 : 24,
  },
  section: {
    marginBottom: isMobileDevice() ? 20 : 24,
  },
  sectionTitle: {
    fontSize: isMobileDevice() ? 16 : 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: isMobileDevice() ? 12 : 14,
    color: '#64748b',
    marginBottom: isMobileDevice() ? 12 : 16,
    lineHeight: isMobileDevice() ? 18 : 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: isMobileDevice() ? 12 : 16,
  },
  formGroup: {
    flex: 1,
    marginBottom: isMobileDevice() ? 12 : 16,
  },
  label: {
    fontSize: isMobileDevice() ? 12 : 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: isMobileDevice() ? 6 : 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    paddingVertical: isMobileDevice() ? 12 : 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateText: {
    fontSize: isMobileDevice() ? 14 : 16,
    color: '#1e293b',
    marginLeft: 12,
    fontWeight: '500',
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    paddingVertical: isMobileDevice() ? 10 : 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeText: {
    fontSize: isMobileDevice() ? 14 : 16,
    color: '#1e293b',
    marginLeft: 12,
    fontWeight: '500',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isMobileDevice() ? 6 : 8,
  },
  dayButton: {
    flex: 1,
    minWidth: isMobileDevice() ? 70 : 80,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: isMobileDevice() ? 10 : 12,
    paddingHorizontal: isMobileDevice() ? 6 : 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dayButtonActive: {
    backgroundColor: '#3578e5',
    borderColor: '#3578e5',
  },
  dayButtonText: {
    fontSize: isMobileDevice() ? 12 : 14,
    fontWeight: '600',
    color: '#64748b',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: isMobileDevice() ? 8 : 12,
    paddingHorizontal: isMobileDevice() ? 16 : 24,
    paddingVertical: isMobileDevice() ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2856a2',
    paddingVertical: isMobileDevice() ? 10 : 12,
    paddingHorizontal: isMobileDevice() ? 16 : 20,
    borderRadius: 12,
    shadowColor: '#2856a2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: isMobileDevice() ? 14 : 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    paddingVertical: isMobileDevice() ? 10 : 12,
    paddingHorizontal: isMobileDevice() ? 16 : 20,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: isMobileDevice() ? 14 : 16,
    fontWeight: '600',
  },
});