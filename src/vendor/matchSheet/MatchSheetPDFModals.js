// components/pages/matchSheet/MatchSheetPDFModals.js
// Componente reutilizable con los modales de configuración de PDF
import { useMemo, useState } from 'react';
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
import { useTheme } from 'styled-components';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getPlayerFullName } from '@/utils/playerHelpers';

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
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
                <View style={[styles.modalIconContainer, { backgroundColor: theme.colors.primarySoft }]}>
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
                <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
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
                    trackColor={{ false: theme.colors.border, true: '#86efac' }}
                    thumbColor={pdfOptions.showPhotos ? '#4CAF50' : theme.colors.textMuted}
                  />
                </View>

                <View style={styles.pdfOptionRow}>
                  <View style={styles.pdfOptionLeft}>
                    <Ionicons name="text" size={20} color={theme.colors.primary} />
                    <Text style={styles.pdfOptionLabel}>{t('matchSheet.pdfOptions.showNames')}</Text>
                  </View>
                  <Switch
                    value={pdfOptions.showNames}
                    onValueChange={(v) => onPdfOptionsChange({ ...pdfOptions, showNames: v })}
                    trackColor={{ false: theme.colors.border, true: '#93c5fd' }}
                    thumbColor={pdfOptions.showNames ? theme.colors.primary : theme.colors.textMuted}
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
                onPress={() => {
                  if (generatingPDF) return;
                  onGenerateLineupPDF(matchSheet);
                }}
                activeOpacity={generatingPDF ? 1 : 0.8}
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
                <View style={[styles.modalIconContainer, { backgroundColor: theme.colors.purpleSoft }]}>
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
                <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
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
                  <Text style={[styles.pdfOptionsTitle, { color: theme.colors.error }]}>{t('matchSheet.lineup.notCalled')}</Text>
                  <View style={styles.playersPreview}>
                    {matchSheet.noConvocados.map((p, idx) => {
                      const player = typeof p === 'object' ? p : players.find(pl => pl._id === p);
                      if (!player) return null;
                      return (
                        <View key={player._id || idx} style={[styles.playerChip, { backgroundColor: theme.colors.errorSoft }]}>
                          <View style={[styles.playerPhoto, { backgroundColor: theme.colors.error, justifyContent: 'center', alignItems: 'center' }]}>
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
                    placeholderTextColor={theme.colors.inputPlaceholder}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('matchSheet.pdfOptions.meetingPlace')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={convocatoriaPDFData.lugarQuedada}
                    onChangeText={(text) => onConvocatoriaDataChange({ ...convocatoriaPDFData, lugarQuedada: text })}
                    placeholder={t('matchSheet.pdfOptions.meetingPlaceholder')}
                    placeholderTextColor={theme.colors.inputPlaceholder}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('matchSheet.pdfOptions.observations')}</Text>
                  <TextInput
                    style={[styles.textInput, styles.textInputMultiline]}
                    value={convocatoriaPDFData.observaciones}
                    onChangeText={(text) => onConvocatoriaDataChange({ ...convocatoriaPDFData, observaciones: text })}
                    placeholder={t('matchSheet.pdfOptions.observationsPlaceholder')}
                    placeholderTextColor={theme.colors.inputPlaceholder}
                    multiline
                    rows={3}
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
                    trackColor={{ false: theme.colors.border, true: '#86efac' }}
                    thumbColor={convocatoriaPDFData.showPhotos ? '#4CAF50' : theme.colors.textMuted}
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
                onPress={() => {
                  if (generatingPDF) return;
                  onGenerateCallUpPDF(matchSheet);
                }}
                activeOpacity={generatingPDF ? 1 : 0.8}
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
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!matchSheet) return null;

  // En modo compacto, solo mostrar iconos
  if (compact) {
    return (
      <>
        {/* PDF de Convocatoria */}
        {matchSheet.convocados && matchSheet.convocados.length > 0 && (
          <TouchableOpacity
            style={[styles.compactButton, { backgroundColor: theme.colors.successSoft }]}
            title={t('matchSheet.pdf.callupButton', 'PDF convocatoria')}
            onPress={() => {
              if (generatingPDF) return;
              onCallUpPress();
            }}
            activeOpacity={generatingPDF ? 1 : 0.8}
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
            style={[styles.compactButton, { backgroundColor: theme.colors.primarySoft }]}
            title={t('matchSheet.pdf.lineupButton', 'PDF alineación')}
            onPress={() => {
              if (generatingPDF) return;
              onLineupPress();
            }}
            activeOpacity={generatingPDF ? 1 : 0.8}
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
            style={[styles.compactButton, { backgroundColor: theme.colors.warningSoft }]}
            title={t('matchSheet.pdf.matchSheetButton', 'PDF ficha completa')}
            onPress={() => {
              if (generatingPDF) return;
              onMatchSheetPress();
            }}
            activeOpacity={generatingPDF ? 1 : 0.8}
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
        style={[buttonStyle, styles.pdfButtonPrimary, generatingPDF && styles.buttonDisabled]}
        onPress={() => {
          if (generatingPDF) return;
          onLineupPress();
        }}
        activeOpacity={generatingPDF ? 1 : 0.8}
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
        style={[buttonStyle, styles.pdfButtonSecondary, generatingPDF && styles.buttonDisabled]}
        onPress={() => {
          if (generatingPDF) return;
          onCallUpPress();
        }}
        activeOpacity={generatingPDF ? 1 : 0.8}
      >
        <Ionicons name="people" size={20} color={theme.colors.primary} />
        <Text style={styles.pdfButtonTextSecondary}>{t('matchSheet.pdf.callupButton')}</Text>
      </TouchableOpacity>

      {showMatchSheetButton && (
        <TouchableOpacity
          style={[buttonStyle, styles.pdfButtonFullSheet, generatingPDF && styles.buttonDisabled]}
          onPress={() => {
            if (generatingPDF) return;
            onMatchSheetPress();
          }}
          activeOpacity={generatingPDF ? 1 : 0.8}
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

const makeStyles = (theme) => StyleSheet.create({
  // Modal Container
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 8 : 12,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
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
    borderBottomColor: theme.colors.border,
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
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundAlt,
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
    borderTopColor: theme.colors.border,
  },

  // Options Card
  pdfOptionsCard: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: isMobileDevice() ? 10 : 12,
    padding: isMobileDevice() ? 12 : 16,
    marginBottom: isMobileDevice() ? 12 : 16,
  },
  pdfOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  pdfOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pdfOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pdfOptionLabel: {
    fontSize: 14,
    color: theme.colors.text,
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
    backgroundColor: theme.colors.successSoft,
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
    color: theme.colors.text,
    fontWeight: '500',
  },
  noPlayersText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  textInputMultiline: {
    minHeight: 80,
    verticalAlign: 'top',
  },

  // Buttons
  cancelButton: {
    flex: 1,
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderRadius: isMobileDevice() ? 10 : 12,
    backgroundColor: theme.colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: isMobileDevice() ? 14 : 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  generateButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderRadius: isMobileDevice() ? 10 : 12,
    backgroundColor: theme.colors.primary,
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
    backgroundColor: theme.colors.primary,
  },
  pdfButtonSecondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
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
    color: theme.colors.primary,
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
