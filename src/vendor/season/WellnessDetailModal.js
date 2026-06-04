// components/pages/season/WellnessDetailModal.js
// Modal para ver detalle de wellness de una sesión de entrenamiento
import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'styled-components';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
  TextInput,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { generateWellnessSessionPdf } from '@/vendor/wellness/pdf';
import * as FileSystem from 'expo-file-system/legacy';
import { savePdfToDownloads } from '@/utils/pdfDownload';
import api from '@/api/client';
import { getWellnessTemplates, getWellnessFormUrl } from '@/utils/api';
import { BACKEND_URL } from '@/config';

const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

// Colores según nivel de wellness
const getWellnessColor = (value) => {
  if (value <= 3) return '#ef4444'; // Rojo
  if (value <= 5) return '#f59e0b'; // Amarillo
  if (value <= 7) return '#3b82f6'; // Azul
  return '#10b981'; // Verde
};

// Emoji según nivel de wellness
const getWellnessEmoji = (value) => {
  if (value <= 2) return '😞';
  if (value <= 4) return '😐';
  if (value <= 6) return '🙂';
  if (value <= 8) return '😊';
  return '🤩';
};

export default function WellnessDetailModal({
  visible,
  session,
  onClose,
  onUpdate,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [wellnessData, setWellnessData] = useState(null);
  const [expectedWellness, setExpectedWellness] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  // Extraer sessionId y sessionDate de la sesión
  const sessionId = session?._id;
  const sessionDate = session?.fecha;

  // Cargar datos al abrir
  useEffect(() => {
    if (visible && sessionId) {
      loadWellnessData();
      loadTemplates();
    }
  }, [visible, sessionId]);

  const loadTemplates = async () => {
    try {
      const data = await getWellnessTemplates('post');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading wellness templates:', error);
      setTemplates([]);
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template?._id || null);
    if (template?.questions) {
      setQuestions(template.questions.map((q, i) => ({
        question: typeof q === 'string' ? q : q.question,
        order: i,
      })));
    }
    setShowTemplateSelector(false);
  };

  const loadWellnessData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/wellness/session/${sessionId}`);
      setWellnessData(response.data);
      setExpectedWellness(response.data.expectedWellness);
      setQuestions(response.data.wellnessQuestions || []);
      setSelectedTemplate(response.data.wellnessTemplate?._id || response.data.wellnessTemplate || null);
    } catch (error) {
      console.error('Error cargando wellness:', error);
      // Si no hay datos, inicializar vacío
      setWellnessData({
        totalResponses: 0,
        averageWellness: null,
        responses: [],
        wellnessToken: null
      });
    } finally {
      setLoading(false);
    }
  };

  // Guardar wellness esperado y preguntas
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const response = await api.put(`/wellness/session/${sessionId}`, {
        expectedWellness,
        wellnessQuestions: questions,
        wellnessTemplateId: selectedTemplate,
      });
      
      // Recargar datos
      await loadWellnessData();
      
      // Esperar a que onUpdate complete antes de mostrar el Alert
      if (onUpdate) {
        await onUpdate(response.data?.expectedWellness ?? expectedWellness);
      }
      Alert.alert(t('message.success'), t('session.responseSaved') || 'Configuración guardada');
    } catch (error) {
      console.error('Error guardando wellness:', error);
      Alert.alert(t('message.error'), t('session.responseError') || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  // Generar enlace
  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      const response = await api.post(`/wellness/session/${sessionId}/generate-link`, {
        expiryHours: 48 // 48 horas de expiración
      });
      
      // Recargar datos para obtener el nuevo token
      await loadWellnessData();
      
      Alert.alert(t('message.success'), t('session.linkGenerated'));
    } catch (error) {
      console.error('Error generando enlace:', error);
      Alert.alert(t('message.error'), t('session.responseError') || 'No se pudo generar el enlace');
    } finally {
      setGenerating(false);
    }
  };

  // Compartir enlace
  const handleShareLink = async () => {
    if (!wellnessData?.wellnessToken) return;
    
    // Obtener idioma actual (i18n)
    const currentLang = i18n.language === 'en' ? 'en' : 'es';
    const locale = currentLang === 'en' ? 'en-US' : 'es-ES';
    const link = getWellnessFormUrl(wellnessData.wellnessToken, currentLang);
    const dateStr = sessionDate ? new Date(sessionDate).toLocaleDateString(locale) : '';
    
    try {
      await Share.share({
        message: `📊 ${t('session.wellnessFormMessage')}${dateStr ? ` (${dateStr})` : ''}:\n\n${link}`,
        title: t('session.wellnessFormTitle')
      });
    } catch (error) {
      console.error('Error compartiendo:', error);
    }
  };

  // Copiar enlace
  const handleCopyLink = async () => {
    if (!wellnessData?.wellnessToken) return;
    
    // Obtener idioma actual (i18n)
    const currentLang = t('lang') === 'en' ? 'en' : 'es';
    const link = getWellnessFormUrl(wellnessData.wellnessToken, currentLang);
    await Clipboard.setStringAsync(link);
    Alert.alert(t('message.success'), t('session.linkCopied'));
  };

  // Activar/Desactivar enlace
  const handleToggleLink = async () => {
    if (!wellnessData?.wellnessToken) return;
    
    const isCurrentlyActive = wellnessData?.wellnessLinkActive !== false;
    const newState = !isCurrentlyActive;
    
    setToggling(true);
    try {
      await api.post(`/wellness/session/${sessionId}/toggle-link`, { active: newState });
      await loadWellnessData();
      if (onUpdate) onUpdate();
      Alert.alert(
        t('message.success'), 
        newState ? t('session.linkActivated') : t('session.linkDeactivated')
      );
    } catch (error) {
      console.error('Error toggling link:', error);
      Alert.alert(t('message.error'), t('session.responseError'));
    } finally {
      setToggling(false);
    }
  };

  // Eliminar respuesta
  const handleDeleteResponse = async (responseId, playerName) => {
    Alert.alert(
      t('session.deleteResponse'),
      t('session.deleteResponseConfirm', { name: playerName }),
      [
        { text: t('action.cancel'), style: 'cancel' },
        {
          text: t('action.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/wellness/response/${responseId}`);
              await loadWellnessData();
              if (onUpdate) onUpdate();
            } catch (error) {
              Alert.alert(t('message.error'), t('session.responseDeleteError') || 'No se pudo eliminar la respuesta');
            }
          }
        }
      ]
    );
  };

  // Añadir pregunta
  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions([...questions, { question: newQuestion.trim(), order: questions.length }]);
    setNewQuestion('');
    setShowAddQuestion(false);
  };

  // Eliminar pregunta
  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Helper para obtener locale
  const getLocale = () => i18n.language === 'en' ? 'en-US' : 'es-ES';

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(getLocale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear fecha para el nombre del PDF
  const formatDateForPDF = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(getLocale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Generar PDF de wellness
  const handleGeneratePDF = async () => {
    if (!wellnessData || !wellnessData.responses || wellnessData.responses.length === 0) {
      Alert.alert(t('message.info'), t('session.noResponses') || 'No hay respuestas para exportar');
      return;
    }

    setGeneratingPDF(true);
    try {
      const lang = i18n.language || 'es';
      await generateWellnessSessionPdf(session, expectedWellness, wellnessData, t, lang, false);
    } catch (error) {
      console.error('Error generating wellness PDF:', error);
      Alert.alert(t('message.error'), t('session.pdfError') || 'Error al generar el PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
   >
      <View style={styles.modalBg}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerIcon}>
              <Ionicons name="pulse" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.modalTitle}>{t('session.wellnessConfig')}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>{t('message.loading')}...</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Resumen */}
              <View style={styles.summarySection}>

                {/* Estadísticas */}
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      {wellnessData?.averageWellness?.toFixed(1) || '-'}
                    </Text>
                    <Text style={styles.statLabel}>{t('session.averageWellness')}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      {wellnessData?.totalResponses || 0}
                    </Text>
                    <Text style={styles.statLabel}>{t('session.responses')}</Text>
                  </View>
                  {expectedWellness && wellnessData?.averageWellness && (() => {
                    const diff = wellnessData.averageWellness - expectedWellness;
                    const isOnTarget = Math.abs(diff) <= 0.5;
                    const isAbove = diff > 0.5;
                    return (
                      <View style={styles.statCard}>
                        <Text style={[
                          styles.statValue,
                          { color: isOnTarget ? theme.colors.success : (isAbove ? theme.colors.primary : theme.colors.error) }
                        ]}>
                          {isOnTarget ? '✓' : (isAbove ? '↑' : '↓')}
                        </Text>
                        <Text style={styles.statLabel}>
                          {isOnTarget 
                            ? t('common.goalAchieved') || 'Objetivo cumplido'
                            : isAbove
                              ? t('common.aboveTarget') || 'Por arriba'
                              : t('common.belowTarget') || 'Por debajo'}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
              </View>

              {/* Plantilla de preguntas */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('preWellness.template') || 'Plantilla'}</Text>
                <TouchableOpacity
                  style={styles.templateSelector}
                  onPress={() => setShowTemplateSelector(true)}
                >
                  <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.templateSelectorText}>
                    {selectedTemplate
                      ? (templates.find(tp => tp._id === selectedTemplate)?.name || t('preWellness.selectTemplate') || 'Seleccionar plantilla')
                      : (t('preWellness.selectTemplate') || 'Seleccionar plantilla')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Preguntas personalizadas */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('session.customQuestions')}</Text>
                  <TouchableOpacity 
                    style={styles.addQuestionBtn}
                    onPress={() => setShowAddQuestion(!showAddQuestion)}
                  >
                    <Ionicons name={showAddQuestion ? 'close' : 'add'} size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
                
                {showAddQuestion && (
                  <View style={styles.addQuestionContainer}>
                    <TextInput
                      style={styles.questionInput}
                      value={newQuestion}
                      onChangeText={setNewQuestion}
                      placeholder={t('session.questionPlaceholder')}
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    <TouchableOpacity 
                      style={styles.addQuestionConfirm}
                      onPress={handleAddQuestion}
                    >
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                
                {questions.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {t('session.noQuestionsHint') || 'No hay preguntas adicionales. Solo se pedirá nombre y wellness.'}
                  </Text>
                ) : (
                  questions.map((q, index) => (
                    <View key={index} style={styles.questionItem}>
                      <Text style={styles.questionText}>{q.question}</Text>
                      <TouchableOpacity onPress={() => handleRemoveQuestion(index)}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Botón guardar configuración */}
              <TouchableOpacity
                style={[styles.saveConfigBtn, saving && styles.btnDisabled]}
                onPress={handleSaveConfig}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save" size={18} color="#fff" />
                    <Text style={styles.saveConfigBtnText}>{t('common.saveChanges') || 'Guardar Configuración'}</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Enlace para compartir */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('session.linkForPlayers') || 'Enlace para Jugadores'}</Text>
                
                {!wellnessData?.wellnessToken ? (
                  <TouchableOpacity
                    style={[styles.generateLinkBtn, generating && styles.btnDisabled]}
                    onPress={handleGenerateLink}
                    disabled={generating}
                  >
                    {generating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="link" size={18} color="#fff" />
                        <Text style={styles.generateLinkBtnText}>{t('session.generateLink')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.linkContainer}>
                    {/* Indicador de estado del enlace */}
                    <View style={styles.linkStatusContainer}>
                      <View style={[
                        styles.linkStatusBadge,
                        { backgroundColor: wellnessData?.wellnessLinkActive !== false ? theme.colors.success + '20' : theme.colors.error + '20' }
                      ]}>
                        <Ionicons 
                          name={wellnessData?.wellnessLinkActive !== false ? "checkmark-circle" : "close-circle"} 
                          size={16} 
                          color={wellnessData?.wellnessLinkActive !== false ? theme.colors.success : theme.colors.error} 
                        />
                        <Text style={[
                          styles.linkStatusText,
                          { color: wellnessData?.wellnessLinkActive !== false ? theme.colors.success : theme.colors.error }
                        ]}>
                          {wellnessData?.wellnessLinkActive !== false 
                            ? t('session.linkActive') 
                            : t('session.linkInactive')}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={[
                          styles.toggleLinkBtn,
                          { backgroundColor: wellnessData?.wellnessLinkActive !== false ? theme.colors.error + '15' : theme.colors.success + '15' }
                        ]}
                        onPress={handleToggleLink}
                        disabled={toggling}
                      >
                        {toggling ? (
                          <ActivityIndicator size="small" color={wellnessData?.wellnessLinkActive !== false ? theme.colors.error : theme.colors.success} />
                        ) : (
                          <>
                            <Ionicons 
                              name={wellnessData?.wellnessLinkActive !== false ? "pause" : "play"} 
                              size={16} 
                              color={wellnessData?.wellnessLinkActive !== false ? theme.colors.error : theme.colors.success} 
                            />
                            <Text style={[
                              styles.toggleLinkText,
                              { color: wellnessData?.wellnessLinkActive !== false ? theme.colors.error : theme.colors.success }
                            ]}>
                              {wellnessData?.wellnessLinkActive !== false 
                                ? t('session.deactivateLink') 
                                : t('session.activateLink')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={[
                      styles.linkText,
                      wellnessData?.wellnessLinkActive === false && styles.linkTextInactive
                    ]} numberOfLines={1}>
                      {getWellnessFormUrl(wellnessData.wellnessToken, t('lang') === 'en' ? 'en' : 'es')}
                    </Text>
                    <View style={styles.linkActions}>
                      <TouchableOpacity 
                        style={[styles.linkActionBtn, wellnessData?.wellnessLinkActive === false && styles.linkActionBtnDisabled]} 
                        onPress={handleCopyLink}
                        disabled={wellnessData?.wellnessLinkActive === false}
                      >
                        <Ionicons name="copy" size={18} color={wellnessData?.wellnessLinkActive === false ? theme.colors.textMuted : theme.colors.primary} />
                        <Text style={[styles.linkActionText, wellnessData?.wellnessLinkActive === false && { color: theme.colors.textMuted }]}>{t('session.copyLink')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.linkActionBtn, wellnessData?.wellnessLinkActive === false && styles.linkActionBtnDisabled]} 
                        onPress={handleShareLink}
                        disabled={wellnessData?.wellnessLinkActive === false}
                      >
                        <Ionicons name="share-social" size={18} color={wellnessData?.wellnessLinkActive === false ? theme.colors.textMuted : theme.colors.success} />
                        <Text style={[styles.linkActionText, { color: wellnessData?.wellnessLinkActive === false ? theme.colors.textMuted : theme.colors.success }]}>{t('session.shareLink')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.linkActionBtn} 
                        onPress={handleGenerateLink}
                      >
                        <Ionicons name="refresh" size={18} color={theme.colors.warning} />
                        <Text style={[styles.linkActionText, { color: theme.colors.warning }]}>{t('common.new') || 'Nuevo'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Respuestas de jugadores */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderResponses}>
                  <Text style={styles.sectionTitle}>
                    {t('session.responses')} ({wellnessData?.totalResponses || 0})
                  </Text>
                  {wellnessData?.responses?.length > 0 && (
                    <TouchableOpacity
                      style={[styles.downloadPdfBtn, generatingPDF && styles.btnDisabled]}
                      onPress={handleGeneratePDF}
                      disabled={generatingPDF}
                    >
                      {generatingPDF ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="download-outline" size={16} color="#fff" />
                          <Text style={styles.downloadPdfBtnText}>PDF</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                
                {wellnessData?.responses?.length === 0 ? (
                  <View style={styles.emptyResponses}>
                    <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.textMuted} />
                    <Text style={styles.emptyText}>
                      {t('session.noResponses')}
                    </Text>
                  </View>
                ) : (
                  wellnessData?.responses?.map((response) => (
                    <View key={response._id} style={styles.responseCard}>
                      <View style={styles.responseHeader}>
                        <View style={styles.responsePlayer}>
                          <Ionicons name="person" size={16} color={theme.colors.primary} />
                          <Text style={styles.responsePlayerName}>{response.playerName}</Text>
                        </View>
                        <View style={[
                          styles.wellnessBadge,
                          { backgroundColor: getWellnessColor(response.wellness) }
                        ]}>
                          <Text style={styles.wellnessBadgeText}>{response.wellness}</Text>
                        </View>
                      </View>
                      
                      {response.questionResponses?.length > 0 && (
                        <View style={styles.responseAnswers}>
                          {response.questionResponses.map((qr, idx) => (
                            qr.answer && (
                              <View key={idx} style={styles.responseAnswer}>
                                <Text style={styles.responseQuestion}>{qr.question}</Text>
                                <Text style={styles.responseAnswerText}>{qr.answer}</Text>
                              </View>
                            )
                          ))}
                        </View>
                      )}
                      
                      <View style={styles.responseFooter}>
                        <Text style={styles.responseDate}>
                          {formatDate(response.submittedAt)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleDeleteResponse(response._id, response.playerName)}
                        >
                          <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Modal selector de plantillas */}
        <Modal
          visible={showTemplateSelector}
          animationType="fade"
          transparent
          onRequestClose={() => setShowTemplateSelector(false)}
        >
          <View style={styles.templateModalOverlay}>
            <View style={styles.templateModalContent}>
              <View style={styles.templateModalHeader}>
                <Text style={styles.templateModalTitle}>{t('preWellness.selectTemplate') || 'Seleccionar plantilla'}</Text>
                <TouchableOpacity onPress={() => setShowTemplateSelector(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.templateList}>
                <TouchableOpacity
                  style={[styles.templateItem, !selectedTemplate && styles.templateItemSelected]}
                  onPress={() => {
                    setSelectedTemplate(null);
                    setShowTemplateSelector(false);
                  }}
                >
                  <Text style={styles.templateItemText}>{t('preWellness.noTemplate') || 'Sin plantilla'}</Text>
                </TouchableOpacity>
                {templates.map(template => (
                  <TouchableOpacity
                    key={template._id}
                    style={[styles.templateItem, selectedTemplate === template._id && styles.templateItemSelected]}
                    onPress={() => handleSelectTemplate(template)}
                  >
                    <View style={styles.templateItemContent}>
                      <Text style={styles.templateItemText}>{template.name}</Text>
                      {template.isDefault && (
                        <View style={styles.templateDefaultBadge}>
                          <Ionicons name="star" size={10} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.templateItemQuestions}>
                      {template.questions?.length || 0} {t('preWellness.questions') || 'preguntas'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  templateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  templateSelectorText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    marginLeft: 10,
  },
  templateModalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay || 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  templateModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  templateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  templateModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  templateList: {
    padding: 12,
  },
  templateItem: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    backgroundColor: theme.colors.background,
  },
  templateItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft || (theme.colors.primary + '15'),
  },
  templateItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  templateDefaultBadge: {
    backgroundColor: theme.colors.warning || '#f59e0b',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateItemQuestions: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  modalBg: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
    padding: isMobileDevice() ? 0 : 0,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: isMobileDevice() ? 12 : 20,
    borderTopRightRadius: isMobileDevice() ? 12 : 20,
    maxHeight: '92%',
    minHeight: '60%',
    maxWidth: isMobileDevice() ? '100%' : undefined,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: isMobileDevice() ? 16 : 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 8,
  },
  modalBody: {
    padding: isMobileDevice() ? 12 : 16,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
  },
  summarySection: {
    marginBottom: 20,
  },
  summaryRow: {
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: isMobileDevice() ? 12 : 16,
    padding: isMobileDevice() ? 12 : 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  wellnessSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wellnessOption: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellnessOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  wellnessOptionTextSelected: {
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: isMobileDevice() ? 10 : 12,
    padding: isMobileDevice() ? 12 : 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: isMobileDevice() ? 20 : 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  statEmoji: {
    fontSize: 20,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: isMobileDevice() ? 14 : 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  addQuestionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addQuestionContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  questionInput: {
    flex: 1,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  addQuestionConfirm: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: isMobileDevice() ? 10 : 12,
    padding: isMobileDevice() ? 10 : 14,
    marginBottom: 8,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 14,
    padding: 16,
  },
  saveConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: isMobileDevice() ? 10 : 12,
    padding: isMobileDevice() ? 12 : 14,
    marginBottom: 24,
    gap: 8,
  },
  saveConfigBtnText: {
    color: '#fff',
    fontSize: isMobileDevice() ? 14 : 15,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  generateLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: isMobileDevice() ? 10 : 12,
    padding: isMobileDevice() ? 12 : 14,
    gap: 8,
  },
  generateLinkBtnText: {
    color: '#fff',
    fontSize: isMobileDevice() ? 14 : 15,
    fontWeight: '600',
  },
  linkContainer: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 12,
    padding: 14,
  },
  linkStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  linkStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  linkText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  linkTextInactive: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  linkActions: {
    flexDirection: 'row',
    gap: 16,
  },
  linkActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkActionBtnDisabled: {
    opacity: 0.5,
  },
  linkActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  emptyResponses: {
    alignItems: 'center',
    padding: 24,
  },
  responseCard: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: isMobileDevice() ? 10 : 12,
    padding: isMobileDevice() ? 10 : 14,
    marginBottom: 10,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  responsePlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responsePlayerName: {
    fontSize: isMobileDevice() ? 14 : 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  wellnessBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellnessBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  responseAnswers: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  responseAnswer: {
    marginBottom: 8,
  },
  responseQuestion: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  responseAnswerText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  responseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  responseDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  sectionHeaderResponses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  downloadPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: isMobileDevice() ? 10 : 12,
    paddingVertical: isMobileDevice() ? 5 : 6,
    borderRadius: 8,
  },
  downloadPdfBtnText: {
    color: '#fff',
    fontSize: isMobileDevice() ? 11 : 12,
    fontWeight: '600',
  },
});
