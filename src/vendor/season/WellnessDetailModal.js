// components/pages/season/WellnessDetailModal.js
// Modal para ver detalle de wellness de una sesión de entrenamiento
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
import api from '@/utils/api';
import { BACKEND_URL } from '@/config';

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
};

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
  
  // Extraer sessionId y sessionDate de la sesión
  const sessionId = session?._id;
  const sessionDate = session?.fecha;

  // Cargar datos al abrir
  useEffect(() => {
    if (visible && sessionId) {
      loadWellnessData();
    }
  }, [visible, sessionId]);

  const loadWellnessData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/wellness/session/${sessionId}`);
      setWellnessData(response.data);
      setExpectedWellness(response.data.expectedWellness);
      setQuestions(response.data.wellnessQuestions || []);
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
        wellnessQuestions: questions
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
    const link = `${BACKEND_URL}/api/wellness/form/${wellnessData.wellnessToken}?lang=${currentLang}`;
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
    const link = `${BACKEND_URL}/api/wellness/form/${wellnessData.wellnessToken}?lang=${currentLang}`;
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
      const locale = getLocale();
      const dateStr = formatDateForPDF(sessionDate);
      const teamName = session?.equipo?.nombre || session?.teamName || '';
      const filePrefix = i18n.language === 'en' ? 'wellness_training' : 'wellness_entrenamiento';
      const fileName = `${filePrefix}_${dateStr.replace(/\//g, '-')}.pdf`;

      // Generar contenido HTML del PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              color: #1a1a1a;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
              padding-bottom: 15px;
              border-bottom: 2px solid #333;
            }
            .header h1 {
              font-size: 18px;
              font-weight: 700;
              margin-bottom: 5px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .header .date {
              font-size: 12px;
              color: #444;
            }
            .summary {
              display: flex;
              justify-content: space-around;
              margin-bottom: 25px;
              padding: 15px;
              border: 1px solid #333;
            }
            .summary-item {
              text-align: center;
              padding: 0 20px;
            }
            .summary-item .label {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #444;
              margin-bottom: 5px;
            }
            .summary-item .value {
              font-size: 22px;
              font-weight: 700;
            }
            .summary-item .sublabel {
              font-size: 9px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #333;
              padding: 8px 10px;
              text-align: left;
            }
            th {
              background-color: #f5f5f5;
              font-weight: 600;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            td {
              font-size: 11px;
            }
            .wellness-cell {
              text-align: center;
              font-weight: 600;
              font-size: 14px;
            }
            .response-row td {
              vertical-align: top;
            }
            .question-responses {
              margin-top: 5px;
            }
            .question-response {
              margin-bottom: 5px;
              padding-left: 10px;
              border-left: 2px solid #ddd;
            }
            .question-response .q {
              font-size: 9px;
              color: #666;
              font-style: italic;
            }
            .question-response .a {
              font-size: 10px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #333;
              text-align: center;
              font-size: 9px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${t('session.wellnessReport')}</h1>
            <div class="date">${t('session.trainingOf')} ${dateStr}${teamName ? ` • ${teamName}` : ''}</div>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="label">${t('session.expectedWellness')}</div>
              <div class="value">${expectedWellness || '-'}</div>
              <div class="sublabel">${t('session.coachObjective')}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('session.averageObtained')}</div>
              <div class="value">${wellnessData.averageWellness?.toFixed(1) || '-'}</div>
              <div class="sublabel">${t('session.averageResponses')}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('session.totalResponses')}</div>
              <div class="value">${wellnessData.totalResponses || 0}</div>
              <div class="sublabel">${t('session.players')}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('session.difference')}</div>
              <div class="value">${expectedWellness && wellnessData.averageWellness 
                ? (wellnessData.averageWellness - expectedWellness > 0 ? '+' : '') + (wellnessData.averageWellness - expectedWellness).toFixed(1) 
                : '-'}</div>
              <div class="sublabel">${expectedWellness && wellnessData.averageWellness
                ? (Math.abs(wellnessData.averageWellness - expectedWellness) <= 0.5 
                  ? t('session.objectiveMet') 
                  : wellnessData.averageWellness > expectedWellness 
                    ? t('session.above') 
                    : t('session.below'))
                : ''}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 25%">${t('session.player')}</th>
                <th style="width: 15%">Wellness</th>
                <th style="width: 40%">${t('session.responses')}</th>
                <th style="width: 20%">${t('session.date')}</th>
              </tr>
            </thead>
            <tbody>
              ${wellnessData.responses.map(response => `
                <tr class="response-row">
                  <td>${response.playerName}</td>
                  <td class="wellness-cell">${response.wellness}</td>
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

      // Generar PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      await savePdfToDownloads(uri, fileName);
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
              <Ionicons name="pulse" size={24} color={THEME.primary} />
            </View>
            <Text style={styles.modalTitle}>{t('session.wellnessConfig')}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.primary} />
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
                          { color: isOnTarget ? THEME.success : (isAbove ? THEME.primary : THEME.danger) }
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

              {/* Preguntas personalizadas */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('session.customQuestions')}</Text>
                  <TouchableOpacity 
                    style={styles.addQuestionBtn}
                    onPress={() => setShowAddQuestion(!showAddQuestion)}
                  >
                    <Ionicons name={showAddQuestion ? 'close' : 'add'} size={20} color={THEME.primary} />
                  </TouchableOpacity>
                </View>
                
                {showAddQuestion && (
                  <View style={styles.addQuestionContainer}>
                    <TextInput
                      style={styles.questionInput}
                      value={newQuestion}
                      onChangeText={setNewQuestion}
                      placeholder={t('session.questionPlaceholder')}
                      placeholderTextColor={THEME.textMuted}
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
                        <Ionicons name="trash-outline" size={18} color={THEME.danger} />
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
                        { backgroundColor: wellnessData?.wellnessLinkActive !== false ? THEME.success + '20' : THEME.danger + '20' }
                      ]}>
                        <Ionicons 
                          name={wellnessData?.wellnessLinkActive !== false ? "checkmark-circle" : "close-circle"} 
                          size={16} 
                          color={wellnessData?.wellnessLinkActive !== false ? THEME.success : THEME.danger} 
                        />
                        <Text style={[
                          styles.linkStatusText,
                          { color: wellnessData?.wellnessLinkActive !== false ? THEME.success : THEME.danger }
                        ]}>
                          {wellnessData?.wellnessLinkActive !== false 
                            ? t('session.linkActive') 
                            : t('session.linkInactive')}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={[
                          styles.toggleLinkBtn,
                          { backgroundColor: wellnessData?.wellnessLinkActive !== false ? THEME.danger + '15' : THEME.success + '15' }
                        ]}
                        onPress={handleToggleLink}
                        disabled={toggling}
                      >
                        {toggling ? (
                          <ActivityIndicator size="small" color={wellnessData?.wellnessLinkActive !== false ? THEME.danger : THEME.success} />
                        ) : (
                          <>
                            <Ionicons 
                              name={wellnessData?.wellnessLinkActive !== false ? "pause" : "play"} 
                              size={16} 
                              color={wellnessData?.wellnessLinkActive !== false ? THEME.danger : THEME.success} 
                            />
                            <Text style={[
                              styles.toggleLinkText,
                              { color: wellnessData?.wellnessLinkActive !== false ? THEME.danger : THEME.success }
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
                      {`${BACKEND_URL}/api/wellness/form/${wellnessData.wellnessToken}?lang=${t('lang') === 'en' ? 'en' : 'es'}`}
                    </Text>
                    <View style={styles.linkActions}>
                      <TouchableOpacity 
                        style={[styles.linkActionBtn, wellnessData?.wellnessLinkActive === false && styles.linkActionBtnDisabled]} 
                        onPress={handleCopyLink}
                        disabled={wellnessData?.wellnessLinkActive === false}
                      >
                        <Ionicons name="copy" size={18} color={wellnessData?.wellnessLinkActive === false ? THEME.textMuted : THEME.primary} />
                        <Text style={[styles.linkActionText, wellnessData?.wellnessLinkActive === false && { color: THEME.textMuted }]}>{t('session.copyLink')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.linkActionBtn, wellnessData?.wellnessLinkActive === false && styles.linkActionBtnDisabled]} 
                        onPress={handleShareLink}
                        disabled={wellnessData?.wellnessLinkActive === false}
                      >
                        <Ionicons name="share-social" size={18} color={wellnessData?.wellnessLinkActive === false ? THEME.textMuted : THEME.success} />
                        <Text style={[styles.linkActionText, { color: wellnessData?.wellnessLinkActive === false ? THEME.textMuted : THEME.success }]}>{t('session.shareLink')}</Text>
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
                    <Ionicons name="chatbubbles-outline" size={40} color={THEME.textMuted} />
                    <Text style={styles.emptyText}>
                      {t('session.noResponses')}
                    </Text>
                  </View>
                ) : (
                  wellnessData?.responses?.map((response) => (
                    <View key={response._id} style={styles.responseCard}>
                      <View style={styles.responseHeader}>
                        <View style={styles.responsePlayer}>
                          <Ionicons name="person" size={16} color={THEME.primary} />
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
                          <Ionicons name="trash-outline" size={16} color={THEME.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: isMobileDevice() ? 0 : 0,
  },
  modalContent: {
    backgroundColor: THEME.surface,
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
    borderBottomColor: THEME.border,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: isMobileDevice() ? 16 : 18,
    fontWeight: '700',
    color: THEME.text,
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
    color: THEME.textSecondary,
  },
  summarySection: {
    marginBottom: 20,
  },
  summaryRow: {
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: THEME.background,
    borderRadius: isMobileDevice() ? 12 : 16,
    padding: isMobileDevice() ? 12 : 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
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
    borderColor: THEME.border,
    backgroundColor: THEME.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wellnessOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
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
    backgroundColor: THEME.background,
    borderRadius: isMobileDevice() ? 10 : 12,
    padding: isMobileDevice() ? 12 : 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: isMobileDevice() ? 20 : 24,
    fontWeight: '700',
    color: THEME.text,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.textSecondary,
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
    color: THEME.text,
  },
  addQuestionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.primary + '15',
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
    backgroundColor: THEME.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: THEME.text,
  },
  addQuestionConfirm: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.background,
    borderRadius: isMobileDevice() ? 10 : 12,
    padding: isMobileDevice() ? 10 : 14,
    marginBottom: 8,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: THEME.text,
  },
  emptyText: {
    textAlign: 'center',
    color: THEME.textMuted,
    fontSize: 14,
    padding: 16,
  },
  saveConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primary,
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
    backgroundColor: THEME.success,
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
  emptyResponses: {
    alignItems: 'center',
    padding: 24,
  },
  responseCard: {
    backgroundColor: THEME.background,
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
    color: THEME.text,
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
    borderTopColor: THEME.border,
  },
  responseAnswer: {
    marginBottom: 8,
  },
  responseQuestion: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginBottom: 2,
  },
  responseAnswerText: {
    fontSize: 14,
    color: THEME.text,
  },
  responseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  responseDate: {
    fontSize: 12,
    color: THEME.textMuted,
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
