import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchAnthropometryById } from '@/store/slices/anthropometry/anthropometryThunks';
import { clearCurrentAnthropometry } from '@/store/slices/anthropometry/anthropometrySlice';
import { getPlayerFullName } from '@/utils/playerHelpers';

const AnthropometryDetail = ({ navigation, route }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  const { anthropometryId } = route.params;
  const { currentAnthropometry, loading } = useSelector((state) => state.anthropometry);

  useEffect(() => {
    if (anthropometryId) {
      dispatch(fetchAnthropometryById({ id: anthropometryId }));
    }
    
    return () => {
      dispatch(clearCurrentAnthropometry());
    };
  }, [anthropometryId]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

const getPlayerName = (jugador) => {
    if (typeof jugador === 'object' && jugador.nombre) {
      return getPlayerFullName(jugador);
    }
    return '-';
  };

  if (loading || !currentAnthropometry) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const data = currentAnthropometry;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.playerName}>{getPlayerName(data.jugador)}</Text>
        <Text style={styles.date}>{formatDate(data.fecha)}</Text>
      </View>

      {/* Peso y medidas calculadas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('anthropometry.generalMeasures')}</Text>
        
        {data.peso && (
          <View style={styles.dataRow}>
            <Text style={styles.label}>{t('anthropometry.weight')}:</Text>
            <Text style={styles.value}>{data.peso} kg</Text>
          </View>
        )}
        
        {data.suma_pliegues && (
          <View style={styles.dataRow}>
            <Text style={styles.label}>{t('anthropometry.sumOfFolds')}:</Text>
            <Text style={styles.value}>{data.suma_pliegues.toFixed(2)} mm</Text>
          </View>
        )}
        
        {data.porcentaje_grasa && (
          <View style={styles.dataRow}>
            <Text style={styles.label}>{t('anthropometry.fatPercentage')}:</Text>
            <Text style={styles.valueHighlight}>{data.porcentaje_grasa.toFixed(2)}%</Text>
          </View>
        )}
      </View>

      {/* Pliegues cutáneos */}
      {data.pliegues && Object.values(data.pliegues).some(val => val) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('anthropometry.skinfolds')}</Text>
          <Text style={styles.sectionSubtitle}>{t('anthropometry.skinfoldsUnit')}</Text>
          
          {data.pliegues.tricipital && (
            <View style={styles.dataRow}>
              <Text style={styles.label}>{t('anthropometry.tricipital')}:</Text>
              <Text style={styles.value}>{data.pliegues.tricipital} mm</Text>
            </View>
          )}
          
          {data.pliegues.subescapular && (
            <View style={styles.dataRow}>
              <Text style={styles.label}>{t('anthropometry.subescapular')}:</Text>
              <Text style={styles.value}>{data.pliegues.subescapular} mm</Text>
            </View>
          )}
          
          {data.pliegues.bicipital && (
            <View style={styles.dataRow}>
              <Text style={styles.label}>{t('anthropometry.bicipital')}:</Text>
              <Text style={styles.value}>{data.pliegues.bicipital} mm</Text>
            </View>
          )}
          
          {data.pliegues.cresta_iliaca && (
            <View style={styles.dataRow}>
              <Text style={styles.label}>{t('anthropometry.crestaIliaca')}:</Text>
              <Text style={styles.value}>{data.pliegues.cresta_iliaca} mm</Text>
            </View>
          )}
          
          {data.pliegues.supraespinal && (
            <View style={styles.dataRow}>
              <Text style={styles.label}>{t('anthropometry.supraespinal')}:</Text>
              <Text style={styles.value}>{data.pliegues.supraespinal} mm</Text>
            </View>
          )}
          
          {data.pliegues.abdominal && (
            <View style={styles.dataRow}>
              <Text style={styles.label}>{t('anthropometry.abdominal')}:</Text>
              <Text style={styles.value}>{data.pliegues.abdominal} mm</Text>
            </View>
          )}
          
          {data.pliegues.muslo_frontal && (
            <View style={styles.dataRow}>
              <Text style={styles.label}>{t('anthropometry.musloFrontal')}:</Text>
              <Text style={styles.value}>{data.pliegues.muslo_frontal} mm</Text>
            </View>
          )}
          
          {data.pliegues.pierna_medial && (
            <View style={styles.dataRow}>
              <Text style={styles.label}>{t('anthropometry.piernaMedial')}:</Text>
              <Text style={styles.value}>{data.pliegues.pierna_medial} mm</Text>
            </View>
          )}
        </View>
      )}

      {/* Notas */}
      {data.notas && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('anthropometry.notes')}</Text>
          <Text style={styles.notesText}>{data.notas}</Text>
        </View>
      )}

      {/* Esta navegación ya no se usa - ahora todo se maneja con modales
      <TouchableOpacity
        style={styles.editButton}
        onPress={() =>
          navigation.navigate('AnthropometryForm', {
            anthropometryId: data._id,
            mode: 'edit',
          })
        }
      >
        <Text style={styles.editButtonText}>{t('common.edit')}</Text>
      </TouchableOpacity>
      */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f6fc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f6fc',
  },
  header: {
    backgroundColor: '#2474E5',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#2856a2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  playerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
    letterSpacing: 0.25,
  },
  date: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 14,
    shadowColor: '#222',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e3e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2856a2',
    marginBottom: 5,
    letterSpacing: 0.25,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  label: {
    fontSize: 16,
    color: '#64748b',
    flex: 1,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    textAlign: 'right',
  },
  valueHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2474E5',
    flex: 1,
    textAlign: 'right',
  },
  notesText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  editButton: {
    backgroundColor: '#2474E5',
    margin: 15,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#2856a2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  editButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.25,
  },
});

export default AnthropometryDetail;
