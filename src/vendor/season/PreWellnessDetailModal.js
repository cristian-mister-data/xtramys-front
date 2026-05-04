// components/pages/season/PreWellnessDetailModal.js
// Modal para ver detalle de pre-wellness de una sesión de entrenamiento
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
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { savePdfToDownloads } from '@/utils/pdfDownload';
import {
  getSessionPreWellnessStats,
  updateSessionPreWellness,
  generatePreWellnessLink,
  togglePreWellnessLink,
  deletePreWellnessResponse,
  getWellnessTemplates,
  getPreWellnessFormUrl,
} from '@/utils/api';

const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

// Colores según nivel de pre-wellness
const getPreWellnessColor = (value) => {
  if (value <= 3) return '#ef4444';
  if (value <= 5) return '#f59e0b';
  if (value <= 7) return '#3b82f6';
  return '#10b981';
};

// Emoji según nivel
const getPreWellnessEmoji = (value) => {
  if (value <= 2) return '😞';
  if (value <= 4) return '😐';
  if (value <= 6) return '🙂';
  if (value <= 8) return '😊';
  return '🤩';
};

export default function PreWellnessDetailModal({
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
  const [preWellnessData, setPreWellnessData] = useState(null);
  const [expectedPreWellness, setExpectedPreWellness] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const sessionId = session?._id;
  const sessionDate = session?.fecha;

  useEffect(() => {
    if (visible && sessionId) {
      loadPreWellnessData();
      loadTemplates();
    }
  }, [visible, sessionId]);

  const loadTemplates = async () => {
    try {
      const data = await getWellnessTemplates('pre');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading pre-wellness templates:', error);
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

  const loadPreWellnessData = async () => {
    setLoading(true);
    try {
      const response = await getSessionPreWellnessStats(sessionId);
      setPreWellnessData(response);
      setExpectedPreWellness(response.expectedPreWellness);
      setQuestions(response.preWellnessQuestions || []);
      setSelectedTemplate(response.preWellnessTemplate?._id || response.preWellnessTemplate || null);
    } catch (error) {
      console.error('Error cargando pre-wellness:', error);
      setPreWellnessData({
        totalResponses: 0,
        averagePreWellness: null,
        responses: [],
        preWellnessToken: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const response = await updateSessionPreWellness(sessionId, {
        expectedPreWellness,
        preWellnessQuestions: questions,
        preWellnessTemplateId: selectedTemplate,
      });
      await loadPreWellnessData();
      if (onUpdate) {
        await onUpdate(response?.expectedPreWellness ?? expectedPreWellness);
      }
      Alert.alert(t('message.success'), t('session.responseSaved') || 'Configuración guardada');
    } catch (error) {
      console.error('Error guardando pre-wellness:', error);
      Alert.alert(t('message.error'), t('session.responseError') || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      await generatePreWellnessLink(sessionId, 48, selectedTemplate, questions);
      await loadPreWellnessData();
      Alert.alert(t('message.success'), t('session.linkGenerated'));
    } catch (error) {
      console.error('Error generando enlace:', error);
      Alert.alert(t('message.error'), t('session.responseError') || 'No se pudo generar el enlace');
    } finally {
      setGenerating(false);
    }
  };

  const handleShareLink = async () => {
    if (!preWellnessData?.preWellnessToken) return;
    const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
    const link = getPreWellnessFormUrl(preWellnessData.preWellnessToken);
    const dateStr = sessionDate ? new Date(sessionDate).toLocaleDateString(locale) : '';
    try {
      await Share.share({
        message: `📋 ${t('session.wellnessFormMessage')}${dateStr ? ` (${dateStr})` : ''}:\n\n${link}`,
        title: t('session.wellnessFormTitle'),
      });
    } catch (error) {
      console.error('Error compartiendo:', error);
    }
  };

  const handleCopyLink = async () => {
    if (!preWellnessData?.preWellnessToken) return;
    const link = getPreWellnessFormUrl(preWellnessData.preWellnessToken);
    await Clipboard.setStringAsync(link);
    Alert.alert(t('message.success'), t('session.linkCopied'));
  };

  const handleToggleLink = async () => {
    if (!preWellnessData?.preWellnessToken) return;
    const isCurrentlyActive = preWellnessData?.preWellnessLinkActive !== false;
    const newState = !isCurrentlyActive;
    setToggling(true);
    try {
      await togglePreWellnessLink(sessionId, newState);
      await loadPreWellnessData();
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
              await deletePreWellnessResponse(responseId);
              await loadPreWellnessData();
              if (onUpdate) onUpdate();
            } catch (error) {
              Alert.alert(t('message.error'), t('session.responseDeleteError') || 'No se pudo eliminar la respuesta');
            }
          },
        },
      ]
    );
  };

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions([...questions, { question: newQuestion.trim(), order: questions.length }]);
    setNewQuestion('');
    setShowAddQuestion(false);
  };

  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const getLocale = () => i18n.language === 'en' ? 'en-US' : 'es-ES';

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(getLocale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateForPDF = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(getLocale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleGeneratePDF = async () => {
    if (!preWellnessData?.responses?.length) {
      Alert.alert(t('message.info'), t('session.noResponses') || 'No hay respuestas para exportar');
      return;
    }
    setGeneratingPDF(true);
    try {
      const locale = getLocale();
      const dateStr = formatDateForPDF(sessionDate);
      const teamName = session?.equipo?.nombre || session?.teamName || '';
      const filePrefix = i18n.language === 'en' ? 'prewellness_training' : 'prewellness_entrenamiento';
      const fileName = `${filePrefix}_${dateStr.replace(/\//g, '-')}.pdf`;
      const htmlContent = `
        <!DOCTYPE html><html><head><meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #1a1a1a; padding: 20px; }
          .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #333; }
          .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
          .header .date { font-size: 12px; color: #444; }
          .summary { display: flex; justify-content: space-around; margin-bottom: 25px; padding: 15px; border: 1px solid #333; }
          .summary-item { text-align: center; padding: 0 20px; }
          .summary-item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #444; margin-bottom: 5px; }
          .summary-item .value { font-size: 22px; font-weight: 700; }
          .summary-item .sublabel { font-size: 9px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #333; padding: 8px 10px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { font-size: 11px; }
          .score-cell { text-align: center; font-weight: 600; font-size: 14px; }
          .response-row td { vertical-align: top; }
          .question-responses { margin-top: 5px; }
          .question-response { margin-bottom: 5px; padding-left: 10px; border-left: 2px solid #ddd; }
          .question-response .q { font-size: 9px; color: #666; font-style: italic; }
          .question-response .a { font-size: 10px; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #333; text-align: center; font-size: 9px; color: #666; }
        </style></head><body>
          <div class="header">
            <h1>${t('session.preWellnessReport') || 'Informe Pre-Wellness'}</h1>
            <div class="date">${t('session.trainingOf')} ${dateStr}${teamName ? ` • ${teamName}` : ''}</div>
          </div>
          <div class="summary">
            <div class="summary-item">
              <div class="label">${t('session.expectedWellness') || 'Esperado'}</div>
              <div class="value">${expectedPreWellness || '-'}</div>
              <div class="sublabel">${t('session.coachObjective') || 'Objetivo entrenador'}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('session.averageObtained') || 'Media obtenida'}</div>
              <div class="value">${preWellnessData.averagePreWellness?.toFixed(1) || '-'}</div>
              <div class="sublabel">${t('session.averageResponses') || 'Media respuestas'}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('session.totalResponses')}</div>
              <div class="value">${preWellnessData.totalResponses || 0}</div>
              <div class="sublabel">${t('session.players')}</div>
            </div>
          </div>
          <table><thead><tr>
            <th style="width: 25%">${t('session.player')}</th>
            <th style="width: 15%">Pre-Wellness</th>
            <th style="width: 40%">${t('session.responses')}</th>
            <th style="width: 20%">${t('session.date')}</th>
          </tr></thead><tbody>
            ${preWellnessData.responses.map(response => `
              <tr class="response-row">
                <td>${response.playerName}</td>
                <td class="score-cell">${response.preWellnessScore ?? response.wellness ?? '-'}</td>
                <td>${response.questionResponses && response.questionResponses.length > 0
                  ? response.questionResponses.filter(qr => qr.answer).map(qr =>
                      `<div class="question-response"><div class="q">${qr.question}</div><div class="a">${qr.answer}</div></div>`
                    ).join('')
                  : `<span style="color:#999;">${t('session.noAdditionalResponses')}</span>`}
                </td>
                <td>${new Date(response.submittedAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
              </tr>`).join('')}
          </tbody></table>
          <div class="footer">${t('player.profile.generatedAt')}: ${new Date().toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      await savePdfToDownloads(uri, fileName);
    } catch (error) {
      console.error('Error generating pre-wellness PDF:', error);
      Alert.alert(t('message.error'), t('session.pdfError') || 'Error al generar el PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerIcon}>
              <Ionicons name="fitness" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.modalTitle}>{t('preWellness.title')}</Text>
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
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      {preWellnessData?.averagePreWellness?.toFixed(1) || '-'}
                    </Text>
                    <Text style={styles.statLabel}>{t('session.averageWellness')}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>
                      {preWellnessData?.totalResponses || 0}
                    </Text>
                    <Text style={styles.statLabel}>{t('session.responses')}</Text>
                  </View>
                  {expectedPreWellness && preWellnessData?.averagePreWellness && (() => {
                    const diff = preWellnessData.averagePreWellness - expectedPreWellness;
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
                    <TouchableOpacity style={styles.addQuestionConfirm} onPress={handleAddQuestion}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                {questions.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {t('session.noQuestionsHint') || 'No hay preguntas adicionales. Solo se pedirá nombre y pre-wellness.'}
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
                {!preWellnessData?.preWellnessToken ? (
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
                    <View style={styles.linkStatusContainer}>
                      <View style={[
                        styles.linkStatusBadge,
                        { backgroundColor: preWellnessData?.preWellnessLinkActive !== false ? theme.colors.success + '20' : theme.colors.error + '20' }
                      ]}>
                        <Ionicons
                          name={preWellnessData?.preWellnessLinkActive !== false ? 'checkmark-circle' : 'close-circle'}
                          size={16}
                          color={preWellnessData?.preWellnessLinkActive !== false ? theme.colors.success : theme.colors.error}
                        />
                        <Text style={[
                          styles.linkStatusText,
                          { color: preWellnessData?.preWellnessLinkActive !== false ? theme.colors.success : theme.colors.error }
                        ]}>
                          {preWellnessData?.preWellnessLinkActive !== false ? t('session.linkActive') : t('session.linkInactive')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.toggleLinkBtn,
                          { backgroundColor: preWellnessData?.preWellnessLinkActive !== false ? theme.colors.error + '15' : theme.colors.success + '15' }
                        ]}
                        onPress={handleToggleLink}
                        disabled={toggling}
                      >
                        {toggling ? (
                          <ActivityIndicator size="small" color={preWellnessData?.preWellnessLinkActive !== false ? theme.colors.error : theme.colors.success} />
                        ) : (
                          <>
                            <Ionicons
                              name={preWellnessData?.preWellnessLinkActive !== false ? 'pause' : 'play'}
                              size={16}
                              color={preWellnessData?.preWellnessLinkActive !== false ? theme.colors.error : theme.colors.success}
                            />
                            <Text style={[
                              styles.toggleLinkText,
                              { color: preWellnessData?.preWellnessLinkActive !== false ? theme.colors.error : theme.colors.success }
                            ]}>
                              {preWellnessData?.preWellnessLinkActive !== false ? t('session.deactivateLink') : t('session.activateLink')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    <Text style={[
                      styles.linkText,
                      preWellnessData?.preWellnessLinkActive === false && styles.linkTextInactive
                    ]} numberOfLines={1}>
                      {getPreWellnessFormUrl(preWellnessData.preWellnessToken)}
                    </Text>
                    <View style={styles.linkActions}>
                      <TouchableOpacity
                        style={[styles.linkActionBtn, preWellnessData?.preWellnessLinkActive === false && styles.linkActionBtnDisabled]}
                        onPress={handleCopyLink}
                        disabled={preWellnessData?.preWellnessLinkActive === false}
                      >
                        <Ionicons name="copy" size={18} color={preWellnessData?.preWellnessLinkActive === false ? theme.colors.textMuted : theme.colors.primary} />
                        <Text style={[styles.linkActionText, preWellnessData?.preWellnessLinkActive === false && { color: theme.colors.textMuted }]}>{t('session.copyLink')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.linkActionBtn, preWellnessData?.preWellnessLinkActive === false && styles.linkActionBtnDisabled]}
                        onPress={handleShareLink}
                        disabled={preWellnessData?.preWellnessLinkActive === false}
                      >
                        <Ionicons name="share-social" size={18} color={preWellnessData?.preWellnessLinkActive === false ? theme.colors.textMuted : theme.colors.success} />
                        <Text style={[styles.linkActionText, { color: preWellnessData?.preWellnessLinkActive === false ? theme.colors.textMuted : theme.colors.success }]}>{t('session.shareLink')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.linkActionBtn} onPress={handleGenerateLink}>
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
                    {t('session.responses')} ({preWellnessData?.totalResponses || 0})
                  </Text>
                  {preWellnessData?.responses?.length > 0 && (
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
                {!preWellnessData?.responses?.length ? (
                  <View style={styles.emptyResponses}>
                    <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.textMuted} />
                    <Text style={styles.emptyText}>{t('session.noResponses')}</Text>
                  </View>
                ) : (
                  preWellnessData.responses.map((response) => (
                    <View key={response._id} style={styles.responseCard}>
                      <View style={styles.responseHeader}>
                        <View style={styles.responsePlayer}>
                          <Ionicons name="person" size={16} color={theme.colors.primary} />
                          <Text style={styles.responsePlayerName}>{response.playerName}</Text>
                        </View>
                        <View style={[
                          styles.wellnessBadge,
                          { backgroundColor: getPreWellnessColor(response.preWellnessScore ?? response.wellness ?? 5) }
                        ]}>
                          <Text style={styles.wellnessBadgeText}>
                            {response.preWellnessScore ?? response.wellness ?? '-'}
                          </Text>
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
                        <Text style={styles.responseDate}>{formatDate(response.submittedAt)}</Text>
                        <TouchableOpacity onPress={() => handleDeleteResponse(response._id, response.playerName)}>
                          <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Jugadores pendientes */}
              {preWellnessData?.pendingPlayers?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {t('preWellness.pendingPlayers') || 'Pendientes'} ({preWellnessData.pendingPlayers.length})
                  </Text>
                  <View style={styles.pendingList}>
                    {preWellnessData.pendingPlayers.map(player => (
                      <View key={player._id} style={styles.pendingPlayer}>
                        <Ionicons name="person-outline" size={14} color={theme.colors.textMuted} />
                        <Text style={styles.pendingPlayerName}>{player.fullName}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
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
                  onPress={() => { setSelectedTemplate(null); setShowTemplateSelector(false); }}
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
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: isMobileDevice() ? 12 : 20,
    borderTopRightRadius: isMobileDevice() ? 12 : 20,
    maxHeight: '92%',
    minHeight: '60%',
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
  pendingList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pendingPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  pendingPlayerName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
