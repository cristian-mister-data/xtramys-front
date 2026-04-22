// components/pages/matchSheet/MatchSheetPDFModals.js
// Componente reutilizable con los modales de configuración de PDF
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getPlayerFullName } from '@/utils/playerHelpers';

// Tema consistente con el resto de la aplicación
const THEME = {
  primary: '#3578e5',
  primaryLight: '#5b93ea',
  primaryDark: '#2856a2',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  inputBg: '#f8fafc',
};

const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

/**
 * Componente reutilizable para los modales de PDF de fichas de partido
 * Se usa tanto en matchSheetList como en MatchSheetDetailModal y calendario
 */
export default function MatchSheetPDFModals({
  // Modal de Alineación
  showLineupModal,
  onCloseLineupModal,
  onGenerateLineupPDF,
  pdfOptions,
  onPdfOptionsChange,
  
  // Modal de Convocatoria
  showConvocatoriaPDFModal,
  onCloseConvocatoriaModal,
  onGenerateCallUpPDF,
  convocatoriaPDFData,
  onConvocatoriaDataChange,
  
  // Datos compartidos
  matchSheet,
  players = [],
  generatingPDF = false,
}) {
  const { t } = useTranslation();

  if (!matchSheet) return null;

  return (
    <>
      {/* Modal de PDF Alineación */}
      <Modal
        visible={showLineupModal}
        animationType="slide"
        transparent
        onRequestClose={onCloseLineupModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconContainer, { backgroundColor: '#e3f2fd' }]}>
                  <Ionicons name="document-text" size={28} color="#4CAF50" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{t('matchSheet.pdf.lineupTitle')}</Text>
                  <Text style={styles.modalSubtitle}>
                    {matchSheet?.rival || ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={onCloseLineupModal}
              >
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <KeyboardAwareScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Vista previa de titulares */}
              <View style={styles.pdfOptionsCard}>
                <Text style={styles.pdfOptionsTitle}>{t('matchSheet.lineup.starters')}</Text>
                <View style={styles.playersPreview}>
                  {matchSheet?.alineacionTitulares?.map((p, idx) => {
                    const player = typeof p === 'object' ? p : players.find(pl => pl._id === p);
                    if (!player) return null;
                    return (
                      <View key={player._id || idx} style={styles.playerChip}>
                        {pdfOptions.showPhotos && player.foto ? (
                          <Image source={{ uri: player.foto }} style={styles.playerPhoto} />
                        ) : (
                          <View style={[styles.playerPhoto, { backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                              {player.dorsal || '?'}
                            </Text>
                          </View>
                        )}
                        {pdfOptions.showNames && (
                          <Text style={styles.playerName}>{getPlayerFullName(player)}</Text>
                        )}
                      </View>
                    );
                  })}
                  {(!matchSheet?.alineacionTitulares || matchSheet.alineacionTitulares.length === 0) && (
                    <Text style={styles.noPlayersText}>{t('matchSheet.pdf.noStartersWarning')}</Text>
                  )}
                </View>
              </View>
              
              {/* Opciones */}
              <View style={styles.pdfOptionsCard}>
                <Text style={styles.pdfOptionsTitle}>{t('matchSheet.pdfOptions.title')}</Text>
                
                <View style={styles.pdfOptionRow}>
                  <View style={styles.pdfOptionLeft}>
                    <Ionicons name="camera" size={20} color="#4CAF50" />
                    <Text style={styles.pdfOptionLabel}>{t('matchSheet.pdfOptions.showPhotos')}</Text>
                  </View>
                  <Switch
                    value={pdfOptions.showPhotos}
                    onValueChange={(v) => onPdfOptionsChange({ ...pdfOptions, showPhotos: v })}
                    trackColor={{ false: '#e2e8f0', true: '#86efac' }}
                    thumbColor={pdfOptions.showPhotos ? '#4CAF50' : '#94a3b8'}
                  />
                </View>
                
                <View style={styles.pdfOptionRow}>
                  <View style={styles.pdfOptionLeft}>
                    <Ionicons name="text" size={20} color="#3578e5" />
                    <Text style={styles.pdfOptionLabel}>{t('matchSheet.pdfOptions.showNames')}</Text>
                  </View>
                  <Switch
                    value={pdfOptions.showNames}
                    onValueChange={(v) => onPdfOptionsChange({ ...pdfOptions, showNames: v })}
                    trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                    thumbColor={pdfOptions.showNames ? '#3578e5' : '#94a3b8'}
                  />
                </View>
              </View>
            </KeyboardAwareScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCloseLineupModal}
              >
                <Text style={styles.cancelButtonText}>{t('matchSheet.actions.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.generateButton, generatingPDF && styles.buttonDisabled]}
                onPress={() => onGenerateLineupPDF(matchSheet)}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="download" size={20} color="#fff" />
                    <Text style={styles.generateButtonText}>{t('matchSheet.pdfOptions.generate')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de PDF Convocatoria */}
      <Modal
        visible={showConvocatoriaPDFModal}
        animationType="slide"
        transparent
        onRequestClose={onCloseConvocatoriaModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconContainer, { backgroundColor: '#f3e8ff' }]}>
                  <Ionicons name="people" size={28} color="#9C27B0" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{t('matchSheet.pdf.callupTitle')}</Text>
                  <Text style={styles.modalSubtitle}>
                    {matchSheet?.rival || ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={onCloseConvocatoriaModal}
              >
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <KeyboardAwareScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Vista previa de convocados */}
              <View style={styles.pdfOptionsCard}>
                <Text style={styles.pdfOptionsTitle}>{t('matchSheet.lineup.called')}</Text>
                <View style={styles.playersPreview}>
                  {matchSheet?.convocados?.map((p, idx) => {
                    const player = typeof p === 'object' ? p : players.find(pl => pl._id === p);
                    if (!player) return null;
                    return (
                      <View key={player._id || idx} style={styles.playerChip}>
                        {convocatoriaPDFData.showPhotos && player.foto ? (
                          <Image source={{ uri: player.foto }} style={styles.playerPhoto} />
                        ) : (
                          <View style={[styles.playerPhoto, { backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                              {player.dorsal || '?'}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.playerName}>{getPlayerFullName(player)}</Text>
                      </View>
                    );
                  })}
                  {(!matchSheet?.convocados || matchSheet.convocados.length === 0) && (
                    <Text style={styles.noPlayersText}>{t('matchSheet.lineup.noCalledSelected')}</Text>
                  )}
                </View>
              </View>
              
              {/* Vista previa de no convocados */}
              {matchSheet?.noConvocados?.length > 0 && (
                <View style={styles.pdfOptionsCard}>
                  <Text style={[styles.pdfOptionsTitle, { color: '#dc2626' }]}>{t('matchSheet.lineup.notCalled')}</Text>
                  <View style={styles.playersPreview}>
                    {matchSheet.noConvocados.map((p, idx) => {
                      const player = typeof p === 'object' ? p : players.find(pl => pl._id === p);
                      if (!player) return null;
                      return (
                        <View key={player._id || idx} style={[styles.playerChip, { backgroundColor: '#fef2f2' }]}>
                          <View style={[styles.playerPhoto, { backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                              {player.dorsal || '?'}
                            </Text>
                          </View>
                          <Text style={styles.playerName}>{getPlayerFullName(player)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
              
              {/* Datos de quedada */}
              <View style={styles.pdfOptionsCard}>
                <Text style={styles.pdfOptionsTitle}>{t('matchSheet.pdfOptions.meetingData')}</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('matchSheet.pdfOptions.meetingTime')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={convocatoriaPDFData.horaQuedada}
                    onChangeText={(text) => onConvocatoriaDataChange({ ...convocatoriaPDFData, horaQuedada: text })}
                    placeholder={t('matchSheet.pdfOptions.meetingTimePlaceholder')}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('matchSheet.pdfOptions.meetingPlace')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={convocatoriaPDFData.lugarQuedada}
                    onChangeText={(text) => onConvocatoriaDataChange({ ...convocatoriaPDFData, lugarQuedada: text })}
                    placeholder={t('matchSheet.pdfOptions.meetingPlaceholder')}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('matchSheet.pdfOptions.observations')}</Text>
                  <TextInput
                    style={[styles.textInput, styles.textInputMultiline]}
                    value={convocatoriaPDFData.observaciones}
                    onChangeText={(text) => onConvocatoriaDataChange({ ...convocatoriaPDFData, observaciones: text })}
                    placeholder={t('matchSheet.pdfOptions.observationsPlaceholder')}
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                  />
                </View>
                
                <View style={styles.pdfOptionRow}>
                  <View style={styles.pdfOptionLeft}>
                    <Ionicons name="camera" size={20} color="#4CAF50" />
                    <Text style={styles.pdfOptionLabel}>{t('matchSheet.pdfOptions.showPhotos')}</Text>
                  </View>
                  <Switch
                    value={convocatoriaPDFData.showPhotos}
                    onValueChange={(v) => onConvocatoriaDataChange({ ...convocatoriaPDFData, showPhotos: v })}
                    trackColor={{ false: '#e2e8f0', true: '#86efac' }}
                    thumbColor={convocatoriaPDFData.showPhotos ? '#4CAF50' : '#94a3b8'}
                  />
                </View>
              </View>
            </KeyboardAwareScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCloseConvocatoriaModal}
              >
                <Text style={styles.cancelButtonText}>{t('matchSheet.actions.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: '#9C27B0' }, generatingPDF && styles.buttonDisabled]}
                onPress={() => onGenerateCallUpPDF(matchSheet)}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="download" size={20} color="#fff" />
                    <Text style={styles.generateButtonText}>{t('matchSheet.pdfOptions.generate')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * Componente de botones de PDF reutilizable
 */
export function MatchSheetPDFButtons({
  matchSheet,
  onLineupPress,
  onCallUpPress,
  onMatchSheetPress,
  generatingPDF = false,
  generatingPDFType = null,
  showMatchSheetButton = true,
  compact = false, // modo compacto para header de modales
  layout = 'horizontal', // 'horizontal' | 'vertical'
}) {
  const { t } = useTranslation();

  if (!matchSheet) return null;

  // En modo compacto, solo mostrar iconos
  if (compact) {
    return (
      <>
        {/* PDF de Convocatoria */}
        {matchSheet.convocados && matchSheet.convocados.length > 0 && (
          <TouchableOpacity
            style={[styles.compactButton, { backgroundColor: '#e8f5e9' }]}
            onPress={onCallUpPress}
            disabled={generatingPDF}
          >
            {generatingPDFType === 'callup' ? (
              <ActivityIndicator size={16} color="#4CAF50" />
            ) : (
              <Ionicons name="people" size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
        )}
        {/* PDF de Alineación */}
        {matchSheet.alineacion && matchSheet.alineacionTitulares && matchSheet.alineacionTitulares.length > 0 && (
          <TouchableOpacity
            style={[styles.compactButton, { backgroundColor: '#e3f2fd' }]}
            onPress={onLineupPress}
            disabled={generatingPDF}
          >
            {generatingPDFType === 'lineup' ? (
              <ActivityIndicator size={16} color="#2196F3" />
            ) : (
              <Ionicons name="grid" size={20} color="#2196F3" />
            )}
          </TouchableOpacity>
        )}
        {/* PDF Ficha Completa */}
        {showMatchSheetButton && (
          <TouchableOpacity
            style={[styles.compactButton, { backgroundColor: '#fff3e0' }]}
            onPress={onMatchSheetPress}
            disabled={generatingPDF}
          >
            {generatingPDFType === 'matchsheet' ? (
              <ActivityIndicator size={16} color="#FF5722" />
            ) : (
              <Ionicons name="document-text" size={20} color="#FF5722" />
            )}
          </TouchableOpacity>
        )}
      </>
    );
  }

  const buttonStyle = layout === 'vertical' ? styles.pdfButtonVertical : styles.pdfButton;
  const containerStyle = layout === 'vertical' ? styles.pdfButtonsVertical : styles.pdfButtonsContainer;

  return (
    <View style={{ ...containerStyle, marginBottom: 40 }}>
      <TouchableOpacity
        style={[buttonStyle, styles.pdfButtonPrimary]}
        onPress={onLineupPress}
        disabled={generatingPDF}
      >
        {generatingPDFType === 'lineup' ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="document-text" size={20} color="#fff" />
            <Text style={styles.pdfButtonTextPrimary}>{t('matchSheet.pdf.lineupButton')}</Text>
          </>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[buttonStyle, styles.pdfButtonSecondary]}
        onPress={onCallUpPress}
        disabled={generatingPDF}
      >
        <Ionicons name="people" size={20} color={THEME.primary} />
        <Text style={styles.pdfButtonTextSecondary}>{t('matchSheet.pdf.callupButton')}</Text>
      </TouchableOpacity>
      
      {showMatchSheetButton && (
        <TouchableOpacity
          style={[buttonStyle, styles.pdfButtonFullSheet]}
          onPress={onMatchSheetPress}
          disabled={generatingPDF}
        >
          {generatingPDFType === 'matchsheet' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="document" size={20} color="#fff" />
              <Text style={styles.pdfButtonTextPrimary}>{t('matchSheet.pdf.matchSheetButton')}</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Modal Container
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 8 : 12,
  },
  modalContainer: {
    backgroundColor: THEME.surface,
    borderRadius: isMobileDevice() ? 12 : 16,
    maxHeight: '90%',
    width: '100%',
    maxWidth: isMobileDevice() ? '100%' : 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    paddingVertical: isMobileDevice() ? 10 : 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: isMobileDevice() ? 16 : 18,
    fontWeight: '700',
    color: THEME.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: THEME.inputBg,
  },
  modalBody: {
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    paddingVertical: isMobileDevice() ? 10 : 14,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: isMobileDevice() ? 8 : 12,
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    paddingVertical: isMobileDevice() ? 10 : 14,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  
  // Options Card
  pdfOptionsCard: {
    backgroundColor: THEME.inputBg,
    borderRadius: isMobileDevice() ? 10 : 12,
    padding: isMobileDevice() ? 12 : 16,
    marginBottom: isMobileDevice() ? 12 : 16,
  },
  pdfOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 12,
  },
  pdfOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  pdfOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pdfOptionLabel: {
    fontSize: 14,
    color: THEME.text,
  },
  
  // Players Preview
  playersPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  playerPhoto: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  playerName: {
    fontSize: 12,
    color: THEME.text,
    fontWeight: '500',
  },
  noPlayersText: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  
  // Input
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: THEME.text,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  // Buttons
  cancelButton: {
    flex: 1,
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderRadius: isMobileDevice() ? 10 : 12,
    backgroundColor: THEME.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: isMobileDevice() ? 14 : 15,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  generateButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderRadius: isMobileDevice() ? 10 : 12,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateButtonText: {
    fontSize: isMobileDevice() ? 14 : 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  
  // PDF Buttons
  pdfButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pdfButtonsVertical: {
    flexDirection: 'column',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
    minHeight: 44,
  },
  pdfButtonVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    minHeight: 48,
  },
  pdfButtonPrimary: {
    backgroundColor: THEME.primary,
  },
  pdfButtonSecondary: {
    backgroundColor: THEME.surface,
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  pdfButtonFullSheet: {
    backgroundColor: '#FF5722',
  },
  pdfButtonTextPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pdfButtonTextSecondary: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Compact button style for modal headers
  compactButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
