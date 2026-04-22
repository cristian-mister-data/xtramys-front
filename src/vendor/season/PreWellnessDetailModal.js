// components/pages/season/PreWellnessDetailModal.js
// Modal para ver detalle de pre-wellness de una sesión de entrenamiento
import { useState, useEffect } from 'react';
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
import { BACKEND_URL } from '@/config';

const isMobileDevice = () => {
  const { width, height } = Dimensions.get('window');
  return Math.min(width, height) < 768;
};

const THEME = {
  primary: '#667eea',
  primaryLight: '#818cf8',
  primaryDark: '#5a67d8',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
};

// Colores según nivel de pre-wellness
const getPreWellnessColor = (value) => {
  if (value <= 3) return '#ef4444'; // Rojo
  if (value <= 5) return '#f59e0b'; // Amarillo
  if (value <= 7) return '#3b82f6'; // Azul
  return '#10b981'; // Verde
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

  // Helper para obtener locale
  const getLocale = () => i18n.language === 'en' ? 'en-US' : 'es-ES';

  useEffect(() => {
    if (visible && sessionId) {
      loadPreWellnessData();
      loadTemplates();
    }
  }, [visible, sessionId]);

  const loadPreWellnessData = async () => {
    setLoading(true);
    try {
      const data = await getSessionPreWellnessStats(sessionId);
      setPreWellnessData(data);
      setExpectedPreWellness(data.expectedPreWellness);
      setQuestions(data.preWellnessQuestions || []);
      setSelectedTemplate(data.preWellnessTemplate?._id || null);
    } catch (error) {
      console.error('Error cargando pre-wellness:', error);
      setPreWellnessData({
        totalResponses: 0,
        averagePreWellness: null,
        responses: [],
        preWellnessToken: null
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await getWellnessTemplates('pre');
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template._id);
    setQuestions(template.questions || []);
    setShowTemplateSelector(false);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const data = await updateSessionPreWellness(sessionId, {
        expectedPreWellness,
        preWellnessQuestions: questions,
        preWellnessTemplateId: selectedTemplate
      });
      
      await loadPreWellnessData();
      
      if (onUpdate) {
        await onUpdate(data?.expectedPreWellness ?? expectedPreWellness);
      }
      Alert.alert(t('message.success'), t('preWellness.configSaved'));
    } catch (error) {
      console.error('Error guardando pre-wellness:', error);
      Alert.alert(t('message.error'), t('preWellness.configError'));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      // Primero guardamos la configuración actual (template y preguntas)
      await updateSessionPreWellness(sessionId, {
        expectedPreWellness,
        preWellnessQuestions: questions,
        preWellnessTemplateId: selectedTemplate
      });
      
      // Luego generamos el link con el template y preguntas
      await generatePreWellnessLink(sessionId, 48, selectedTemplate, questions);
      await loadPreWellnessData();
      Alert.alert(t('message.success'), t('preWellness.linkGenerated'));
    } catch (error) {
      console.error('Error generando enlace:', error);
      Alert.alert(t('message.error'), t('preWellness.linkError'));
    } finally {
      setGenerating(false);
    }
  };

  const handleShareLink = async () => {
    if (!preWellnessData?.preWellnessToken) return;
    
    const link = getPreWellnessFormUrl(preWellnessData.preWellnessToken);
    const dateStr = sessionDate ? new Date(sessionDate).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US') : '';
    
    try {
      await Share.share({
        message: `📋 ${t('preWellness.formMessage')}${dateStr ? ` (${dateStr})` : ''}:\n\n${link}`,
        title: t('preWellness.formTitle')
      });
    } catch (error) {
      console.error('Error compartiendo:', error);
    }
  };

  const handleCopyLink = async () => {
    if (!preWellnessData?.preWellnessToken) return;
    
    const link = getPreWellnessFormUrl(preWellnessData.preWellnessToken);
    await Clipboard.setStringAsync(link);
    Alert.alert(t('message.success'), t('preWellness.linkCopied'));
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
        newState ? t('preWellness.linkActivated') : t('preWellness.linkDeactivated')
      );
    } catch (error) {
      console.error('Error toggling link:', error);
      Alert.alert(t('message.error'), t('preWellness.linkError'));
    } finally {
      setToggling(false);
    }
  };

  const handleDeleteResponse = async (responseId) => {
    Alert.alert(
      t('common.confirm'),
      t('preWellness.deleteResponseConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePreWellnessResponse(responseId);
              await loadPreWellnessData();
              if (onUpdate) onUpdate();
              Alert.alert(t('message.success'), t('preWellness.responseDeleted'));
            } catch (error) {
              console.error('Error eliminando respuesta:', error);
              Alert.alert(t('message.error'), t('preWellness.deleteError'));
            }
          }
        }
      ]
    );
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions([...questions, { question: newQuestion.trim(), order: questions.length, required: false }]);
    setNewQuestion('');
    setShowAddQuestion(false);
  };

  const removeQuestion = (index) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated.map((q, i) => ({ ...q, order: i })));
  };

  const renderScoreSelector = () => (
    <View style={styles.scoreSelectorContainer}>
      <Text style={styles.scoreSelectorLabel}>{t('preWellness.expectedScore')}</Text>
      <View style={styles.scoreSelector}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
          <TouchableOpacity
            key={num}
            style={[
              styles.scoreButton,
              expectedPreWellness === num && styles.scoreButtonSelected,
              { backgroundColor: expectedPreWellness === num ? getPreWellnessColor(num) : '#f0f0f0' }
            ]}
            onPress={() => setExpectedPreWellness(num)}
          >
            <Text style={[
              styles.scoreButtonText,
              expectedPreWellness === num && styles.scoreButtonTextSelected
            ]}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {expectedPreWellness && (
        <TouchableOpacity 
          style={styles.clearExpectedBtn}
          onPress={() => setExpectedPreWellness(null)}
        >
          <Text style={styles.clearExpectedText}>{t('preWellness.clearExpected')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderResponseItem = (response) => (
    <View key={response._id} style={styles.responseItem}>
      <View style={styles.responseHeader}>
        <View style={styles.responseInfo}>
          <Text style={styles.responseName}>{response.playerName}</Text>
          <Text style={styles.responseDate}>
            {new Date(response.submittedAt).toLocaleString()}
          </Text>
        </View>
        <View style={[styles.scoreCircle, { backgroundColor: getPreWellnessColor(response.preWellnessScore) }]}>
          <Text style={styles.scoreCircleText}>{response.preWellnessScore}</Text>
        </View>
      </View>
      
      {response.questionResponses?.length > 0 && (
        <View style={styles.questionResponsesList}>
          {response.questionResponses.map((qr, idx) => (
            <View key={idx} style={styles.questionResponseItem}>
              <Text style={styles.questionResponseQ}>{qr.question}</Text>
              <Text style={styles.questionResponseA}>{qr.answer || '-'}</Text>
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.responseFooter}>
        <Text style={styles.responseFooterDate}>
          {new Date(response.submittedAt).toLocaleString(getLocale(), {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
        <TouchableOpacity 
          style={styles.deleteResponseBtn}
          onPress={() => handleDeleteResponse(response._id)}
        >
          <Ionicons name="trash-outline" size={16} color={THEME.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPendingPlayers = () => {
    if (!preWellnessData?.pendingPlayers?.length) return null;
    
    return (
      <View style={styles.pendingSection}>
        <Text style={styles.pendingSectionTitle}>
          {t('preWellness.pendingPlayers')} ({preWellnessData.pendingPlayers.length})
        </Text>
        <View style={styles.pendingList}>
          {preWellnessData.pendingPlayers.map(player => (
            <View key={player._id} style={styles.pendingPlayer}>
              <Ionicons name="person-outline" size={14} color={THEME.textMuted} />
              <Text style={styles.pendingPlayerName}>{player.fullName}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Generar PDF de pre-wellness
  const handleGeneratePDF = async () => {
    if (!preWellnessData || !preWellnessData.responses || preWellnessData.responses.length === 0) {
      Alert.alert(t('message.info'), t('session.noResponses'));
      return;
    }

    setGeneratingPDF(true);
    try {
      const locale = getLocale();
      const dateStr = sessionDate ? new Date(sessionDate).toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) : '';
      const teamName = session?.equipo?.nombre || session?.teamName || '';
      const filePrefix = i18n.language === 'en' ? 'prewellness_training' : 'prewellness_entrenamiento';
      const fileName = `${filePrefix}_${dateStr.replace(/\//g, '-')}.pdf`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #1a1a1a; padding: 20px; }
            .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #667eea; }
            .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; color: #667eea; }
            .header .date { font-size: 12px; color: #444; }
            .summary { display: flex; justify-content: space-around; margin-bottom: 25px; padding: 15px; border: 1px solid #667eea; border-radius: 8px; }
            .summary-item { text-align: center; padding: 0 20px; }
            .summary-item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #444; margin-bottom: 5px; }
            .summary-item .value { font-size: 22px; font-weight: 700; color: #667eea; }
            .summary-item .sublabel { font-size: 9px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #333; padding: 8px 10px; text-align: left; }
            th { background-color: #f0f0ff; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            td { font-size: 11px; }
            .score-cell { text-align: center; font-weight: 600; font-size: 14px; }
            .question-responses { margin-top: 5px; }
            .question-response { margin-bottom: 5px; padding-left: 10px; border-left: 2px solid #ddd; }
            .question-response .q { font-size: 9px; color: #666; font-style: italic; }
            .question-response .a { font-size: 10px; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #333; text-align: center; font-size: 9px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${t('session.preWellnessReport')}</h1>
            <div class="date">${t('session.trainingOf')} ${dateStr}${teamName ? ` • ${teamName}` : ''}</div>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="label">${t('session.totalResponses')}</div>
              <div class="value">${preWellnessData.totalResponses || 0}</div>
              <div class="sublabel">${t('session.players')}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 25%">${t('session.player')}</th>
                <th style="width: 50%">${t('session.responses')}</th>
                <th style="width: 25%">${t('session.date')}</th>
              </tr>
            </thead>
            <tbody>
              ${preWellnessData.responses.map(response => `
                <tr>
                  <td>${response.playerName}</td>
                  <td>
                    ${response.questionResponses && response.questionResponses.length > 0 
                      ? `<div class="question-responses">
                          ${response.questionResponses.filter(qr => qr.answer).map(qr => `
                            <div class="question-response">
                              <div class="q">${qr.question}</div>
                              <div class="a">${qr.answer}</div>
                            </div>
                          `).join('')}
                        </div>`
                      : `<span style="color: #999;">${t('session.noAdditionalResponses')}</span>`
                    }
                  </td>
                  <td>${new Date(response.submittedAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            ${t('player.profile.generatedAt')}: ${new Date().toLocaleDateString(locale, { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      await savePdfToDownloads(uri, fileName);
    } catch (error) {
      console.error('Error generating pre-wellness PDF:', error);
      Alert.alert(t('message.error'), t('session.pdfError'));
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
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerBadge}>
                <Ionicons name="fitness" size={16} color="#fff" />
                <Text style={styles.headerBadgeText}>PRE</Text>
              </View>
              <Text style={styles.headerTitle}>{t('preWellness.title')}</Text>
              {sessionDate && (
                <Text style={styles.headerDate}>
                  {new Date(sessionDate).toLocaleDateString(getLocale())}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {preWellnessData?.responses?.length > 0 && (
                <TouchableOpacity 
                  style={[styles.pdfButton, generatingPDF && styles.pdfButtonDisabled]} 
                  onPress={handleGeneratePDF}
                  disabled={generatingPDF}
                >
                  {generatingPDF ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="document-text" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.primary} />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Stats Summary */}
              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {preWellnessData?.totalResponses || 0}
                  </Text>
                  <Text style={styles.statLabel}>{t('preWellness.responses')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[
                    styles.statValue,
                    preWellnessData?.averagePreWellness && { color: getPreWellnessColor(preWellnessData.averagePreWellness) }
                  ]}>
                    {preWellnessData?.averagePreWellness 
                      ? `${preWellnessData.averagePreWellness} ${getPreWellnessEmoji(preWellnessData.averagePreWellness)}`
                      : '-'
                    }
                  </Text>
                  <Text style={styles.statLabel}>{t('preWellness.average')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {preWellnessData?.pendingCount || 0}
                  </Text>
                  <Text style={styles.statLabel}>{t('preWellness.pending')}</Text>
                </View>
              </View>

              {/* Template Selector */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('preWellness.template')}</Text>
                <TouchableOpacity 
                  style={styles.templateSelector}
                  onPress={() => setShowTemplateSelector(true)}
                >
                  <Ionicons name="document-text-outline" size={20} color={THEME.primary} />
                  <Text style={styles.templateSelectorText}>
                    {selectedTemplate 
                      ? templates.find(t => t._id === selectedTemplate)?.name || t('preWellness.selectTemplate')
                      : t('preWellness.selectTemplate')
                    }
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={THEME.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Questions */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('preWellness.questions')}</Text>
                  <TouchableOpacity 
                    style={styles.addQuestionBtn}
                    onPress={() => setShowAddQuestion(!showAddQuestion)}
                  >
                    <Ionicons name={showAddQuestion ? "close" : "add"} size={20} color={THEME.primary} />
                  </TouchableOpacity>
                </View>
                
                {showAddQuestion && (
                  <View style={styles.addQuestionForm}>
                    <TextInput
                      style={styles.questionInput}
                      value={newQuestion}
                      onChangeText={setNewQuestion}
                      placeholder={t('preWellness.questionPlaceholder')}
                      onSubmitEditing={addQuestion}
                    />
                    <TouchableOpacity style={styles.addQuestionConfirm} onPress={addQuestion}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                
                {questions.length === 0 ? (
                  <Text style={styles.noQuestionsText}>{t('preWellness.noQuestions')}</Text>
                ) : (
                  questions.map((q, index) => (
                    <View key={index} style={styles.questionItem}>
                      <Text style={styles.questionItemText}>{q.question}</Text>
                      <TouchableOpacity onPress={() => removeQuestion(index)}>
                        <Ionicons name="close-circle" size={20} color={THEME.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Save Button */}
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveConfig}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>{t('common.save')}</Text>
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
                    {/* Indicador de estado del enlace */}
                    <View style={styles.linkStatusContainer}>
                      <View style={[
                        styles.linkStatusBadge,
                        { backgroundColor: preWellnessData?.preWellnessLinkActive !== false ? THEME.success + '20' : THEME.danger + '20' }
                      ]}>
                        <Ionicons 
                          name={preWellnessData?.preWellnessLinkActive !== false ? "checkmark-circle" : "close-circle"} 
                          size={16} 
                          color={preWellnessData?.preWellnessLinkActive !== false ? THEME.success : THEME.danger} 
                        />
                        <Text style={[
                          styles.linkStatusText,
                          { color: preWellnessData?.preWellnessLinkActive !== false ? THEME.success : THEME.danger }
                        ]}>
                          {preWellnessData?.preWellnessLinkActive !== false 
                            ? t('session.linkActive') 
                            : t('session.linkInactive')}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={[
                          styles.toggleLinkBtn,
                          { backgroundColor: preWellnessData?.preWellnessLinkActive !== false ? THEME.danger + '15' : THEME.success + '15' }
                        ]}
                        onPress={handleToggleLink}
                        disabled={toggling}
                      >
                        {toggling ? (
                          <ActivityIndicator size="small" color={preWellnessData?.preWellnessLinkActive !== false ? THEME.danger : THEME.success} />
                        ) : (
                          <>
                            <Ionicons 
                              name={preWellnessData?.preWellnessLinkActive !== false ? "pause" : "play"} 
                              size={16} 
                              color={preWellnessData?.preWellnessLinkActive !== false ? THEME.danger : THEME.success} 
                            />
                            <Text style={[
                              styles.toggleLinkText,
                              { color: preWellnessData?.preWellnessLinkActive !== false ? THEME.danger : THEME.success }
                            ]}>
                              {preWellnessData?.preWellnessLinkActive !== false 
                                ? t('session.deactivateLink') 
                                : t('session.activateLink')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={[
                      styles.linkText,
                      preWellnessData?.preWellnessLinkActive === false && styles.linkTextInactive
                    ]} numberOfLines={1}>
                      {`${BACKEND_URL}/prewellness/form/${preWellnessData.preWellnessToken}?lang=${t('lang') === 'en' ? 'en' : 'es'}`}
                    </Text>
                    <View style={styles.linkActions}>
                      <TouchableOpacity 
                        style={[styles.linkActionBtn, preWellnessData?.preWellnessLinkActive === false && styles.linkActionBtnDisabled]} 
                        onPress={handleCopyLink}
                        disabled={preWellnessData?.preWellnessLinkActive === false}
                      >
                        <Ionicons name="copy" size={18} color={preWellnessData?.preWellnessLinkActive === false ? THEME.textMuted : THEME.primary} />
                        <Text style={[styles.linkActionText, preWellnessData?.preWellnessLinkActive === false && { color: THEME.textMuted }]}>{t('session.copyLink')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.linkActionBtn, preWellnessData?.preWellnessLinkActive === false && styles.linkActionBtnDisabled]} 
                        onPress={handleShareLink}
                        disabled={preWellnessData?.preWellnessLinkActive === false}
                      >
                        <Ionicons name="share-social" size={18} color={preWellnessData?.preWellnessLinkActive === false ? THEME.textMuted : THEME.success} />
                        <Text style={[styles.linkActionText, { color: preWellnessData?.preWellnessLinkActive === false ? THEME.textMuted : THEME.success }]}>{t('session.shareLink')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.linkActionBtn} 
                        onPress={handleGenerateLink}
                      >
                        <Ionicons name="refresh" size={18} color={THEME.warning} />
                        <Text style={[styles.linkActionText, { color: THEME.warning }]}>{t('common.new') || 'Nuevo'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Responses List */}
              {preWellnessData?.responses?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('preWellness.responsesList')}</Text>
                  {preWellnessData.responses.map(renderResponseItem)}
                </View>
              )}

              {/* Pending Players */}
              {renderPendingPlayers()}

              <View style={{ height: 30 }} />
            </ScrollView>
          )}
        </View>

        {/* Template Selector Modal */}
        <Modal
          visible={showTemplateSelector}
          animationType="fade"
          transparent
          onRequestClose={() => setShowTemplateSelector(false)}
        >
          <View style={styles.templateModalOverlay}>
            <View style={styles.templateModalContent}>
              <View style={styles.templateModalHeader}>
                <Text style={styles.templateModalTitle}>{t('preWellness.selectTemplate')}</Text>
                <TouchableOpacity onPress={() => setShowTemplateSelector(false)}>
                  <Ionicons name="close" size={24} color={THEME.text} />
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
                  <Text style={styles.templateItemText}>{t('preWellness.noTemplate')}</Text>
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
                      {template.questions?.length || 0} {t('preWellness.questions')}
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: THEME.background,
    borderTopLeftRadius: isMobileDevice() ? 12 : 24,
    borderTopRightRadius: isMobileDevice() ? 12 : 24,
    maxHeight: isMobileDevice() ? '95%' : '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isMobileDevice() ? 14 : 20,
    paddingVertical: isMobileDevice() ? 14 : 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface,
    borderTopLeftRadius: isMobileDevice() ? 12 : 24,
    borderTopRightRadius: isMobileDevice() ? 12 : 24,
  },
  headerContent: {
    flex: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: isMobileDevice() ? 18 : 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  headerDate: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  pdfButton: {
    backgroundColor: THEME.primary,
    padding: 8,
    borderRadius: 8,
  },
  pdfButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: THEME.textSecondary,
  },
  content: {
    flex: 1,
    padding: isMobileDevice() ? 12 : 16,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: THEME.border,
    marginHorizontal: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 12,
  },
  templateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  templateSelectorText: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
    marginLeft: 10,
  },
  scoreSelectorContainer: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  scoreSelectorLabel: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginBottom: 12,
  },
  scoreSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  scoreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreButtonSelected: {
    transform: [{ scale: 1.1 }],
  },
  scoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
  },
  scoreButtonTextSelected: {
    color: '#fff',
  },
  clearExpectedBtn: {
    alignSelf: 'center',
    marginTop: 12,
    padding: 8,
  },
  clearExpectedText: {
    color: THEME.danger,
    fontSize: 13,
  },
  addQuestionBtn: {
    padding: 6,
  },
  addQuestionForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionInput: {
    flex: 1,
    backgroundColor: THEME.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    marginRight: 10,
  },
  addQuestionConfirm: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    padding: 12,
  },
  noQuestionsText: {
    color: THEME.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  questionItemText: {
    flex: 1,
    fontSize: 14,
    color: THEME.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primary,
    borderRadius: 12,
    padding: isMobileDevice() ? 14 : 16,
    marginBottom: 20,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  generateLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.success,
    borderRadius: 12,
    padding: isMobileDevice() ? 12 : 14,
    gap: 8,
  },
  generateLinkBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  linkContainer: {
    backgroundColor: THEME.background,
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
    color: THEME.textSecondary,
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
    color: THEME.primary,
  },
  responseItem: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  responseInfo: {
    flex: 1,
  },
  responseName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
  responseDate: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCircleText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  questionResponsesList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  questionResponseItem: {
    marginBottom: 8,
  },
  questionResponseQ: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginBottom: 2,
  },
  questionResponseA: {
    fontSize: 14,
    color: THEME.text,
  },
  deleteResponseBtn: {
    padding: 6,
  },
  responseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  responseFooterDate: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  pendingSection: {
    marginBottom: 20,
  },
  pendingSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginBottom: 10,
  },
  pendingList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pendingPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 6,
  },
  pendingPlayerName: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  templateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobileDevice() ? 8 : 12,
  },
  templateModalContent: {
    backgroundColor: THEME.surface,
    borderRadius: isMobileDevice() ? 12 : 14,
    width: '100%',
    maxWidth: isMobileDevice() ? '100%' : 400,
    maxHeight: '70%',
  },
  templateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isMobileDevice() ? 12 : 16,
    paddingVertical: isMobileDevice() ? 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  templateModalTitle: {
    fontSize: isMobileDevice() ? 16 : 18,
    fontWeight: '600',
    color: THEME.text,
  },
  templateList: {
    padding: isMobileDevice() ? 8 : 12,
  },
  templateItem: {
    padding: isMobileDevice() ? 12 : 14,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  templateItemSelected: {
    backgroundColor: '#f0f0ff',
    borderColor: THEME.primary,
  },
  templateItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateItemText: {
    fontSize: 15,
    color: THEME.text,
    fontWeight: '500',
  },
  templateDefaultBadge: {
    backgroundColor: '#f39c12',
    borderRadius: 10,
    padding: 3,
    marginLeft: 8,
  },
  templateItemQuestions: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 4,
  },
});
