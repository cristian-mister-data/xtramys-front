// components/pages/WellnessManagement.js
// Pantalla principal de gestión de Wellness - Templates y Estadísticas
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { savePdfToDownloads } from '@/utils/pdfDownload';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import i18n from '@/i18n';
import AppLayout from '@/vendor/shared/appLayout';
import { fetchEntrenamientosPorEquipo } from '@/store/slices/session/sessionThunks';
import {
  getWellnessTemplates,
  createWellnessTemplate,
  updateWellnessTemplate,
  deleteWellnessTemplate,
  setDefaultWellnessTemplate,
  duplicateWellnessTemplate,
  getSessionWellnessStats,
  getSessionPreWellnessStats,
  generateWellnessLink,
  generatePreWellnessLink,
  toggleWellnessLink,
  togglePreWellnessLink,
  deleteWellnessResponse,
  deletePreWellnessResponse,
  getWellnessRange,
  getPreWellnessRange,
} from '@/utils/api';
import { BACKEND_URL } from '@/config';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// THEME tokens are now derived from styled-components theme inside the component.
// `getWellnessColor` returns semantic wellness/mood colors and is intentionally
// left with literal hex values (chart-style data colors).

// Colores según nivel de wellness
const getWellnessColor = (value) => {
  if (!value) return '#64748b';
  if (value <= 3) return '#ef4444';
  if (value <= 5) return '#f59e0b';
  if (value <= 7) return '#3b82f6';
  return '#276e15';
};

export default function WellnessManagement({ navigation }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const THEME = useMemo(() => ({
    primary: theme.colors.primary,
    primaryLight: theme.colors.primaryLight,
    primaryDark: theme.colors.primaryHover,
    success: theme.colors.success,
    successSoft: theme.colors.successSoft,
    successSoftText: theme.colors.successSoftText,
    warning: theme.colors.warning,
    warningSoft: theme.colors.warningSoft,
    warningSoftText: theme.colors.warningSoftText,
    danger: theme.colors.error,
    background: theme.colors.background,
    backgroundAlt: theme.colors.backgroundAlt,
    surface: theme.colors.surface,
    surfaceAlt: theme.colors.surfaceAlt,
    onPrimary: theme.colors.onPrimary,
    text: theme.colors.text,
    textSecondary: theme.colors.textSecondary,
    textMuted: theme.colors.textMuted,
    border: theme.colors.border,
  }), [theme]);
  const isDark = theme.mode === 'dark';
  // Gradiente de cabecera adaptado al tema (en oscuro utiliza tonos
  // de superficie para no romper el contraste suave del resto de la app).
  const headerGradient = isDark
    ? [theme.colors.surface, theme.colors.surfaceAlt, theme.colors.surfaceElevated]
    : ['#1a237e', '#3949ab', '#5c6bc0'];
  const headerTextColor = isDark ? theme.colors.text : '#fff';
  const headerTextMutedColor = isDark
    ? theme.colors.textSecondary
    : 'rgba(255,255,255,0.8)';
  const headerActionBg = isDark
    ? theme.colors.backgroundAlt
    : 'rgba(255,255,255,0.2)';
  const sessions = useSelector(state => state.session.session) || [];
  const equipos = useSelector(state => state.team.teams) || [];
  
  // Estado general
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions', 'templates'
  const [loading, setLoading] = useState(false);
  
  // Estado para templates
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateType, setSelectedTemplateType] = useState('pre');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateQuestions, setTemplateQuestions] = useState([]);
  const [newTemplateQuestion, setNewTemplateQuestion] = useState('');
  
  // Estado para sesiones y wellness
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [wellnessType, setWellnessType] = useState('pre'); // 'pre' o 'post'
  const [sessionWellnessData, setSessionWellnessData] = useState(null);
  const [loadingSessionData, setLoadingSessionData] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [togglingLink, setTogglingLink] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Estado para PDF por rango de fechas
  const [showRangePDFModal, setShowRangePDFModal] = useState(false);
  const [rangePDFType, setRangePDFType] = useState('post'); // 'pre' o 'post'
  const [rangeFromDate, setRangeFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d;
  });
  const [rangeToDate, setRangeToDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [generatingRangePDF, setGeneratingRangePDF] = useState(false);

  // Cargar sesiones del equipo seleccionado al montar
  useEffect(() => {
    const selectedTeam = equipos.find(e => e.seleccionado === true);
    if (selectedTeam?._id) {
      dispatch(fetchEntrenamientosPorEquipo({ team: selectedTeam._id }));
    }
  }, [equipos, dispatch]);

  // Filtrar sesiones con wellness configurado o respuestas
  const sessionsWithData = useMemo(() => {
    return sessions
      .filter(s => s.fecha)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 50); // Limitar a últimas 50
  }, [sessions]);

  // Cargar templates cuando cambia el tipo
  useEffect(() => {
    if (activeTab === 'templates') {
      loadTemplates();
    }
  }, [activeTab, selectedTemplateType]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getWellnessTemplates(selectedTemplateType);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== FUNCIONES DE TEMPLATES ====================

  const openCreateTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateQuestions([]);
    setNewTemplateQuestion('');
    setShowTemplateModal(true);
  };

  const openEditTemplateModal = (template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setTemplateQuestions(template.questions || []);
    setNewTemplateQuestion('');
    setShowTemplateModal(true);
  };

  const addTemplateQuestion = () => {
    if (!newTemplateQuestion.trim()) return;
    setTemplateQuestions([...templateQuestions, { 
      question: newTemplateQuestion.trim(), 
      order: templateQuestions.length, 
      required: false 
    }]);
    setNewTemplateQuestion('');
  };

  const removeTemplateQuestion = (index) => {
    const updated = [...templateQuestions];
    updated.splice(index, 1);
    setTemplateQuestions(updated.map((q, i) => ({ ...q, order: i })));
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert(t('message.error'), t('wellnessTemplates.nameRequired'));
      return;
    }

    setSavingTemplate(true);
    try {
      if (editingTemplate) {
        await updateWellnessTemplate(editingTemplate._id, {
          name: templateName.trim(),
          description: templateDescription.trim(),
          questions: templateQuestions,
        });
        Alert.alert(t('message.success'), t('wellnessTemplates.updated'));
      } else {
        await createWellnessTemplate({
          name: templateName.trim(),
          description: templateDescription.trim(),
          type: selectedTemplateType,
          questions: templateQuestions,
        });
        Alert.alert(t('message.success'), t('wellnessTemplates.created'));
      }
      setShowTemplateModal(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert(t('message.error'), error.response?.data?.message || t('wellnessTemplates.saveError'));
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = (template) => {
    Alert.alert(
      t('wellnessTemplates.deleteConfirmTitle'),
      t('wellnessTemplates.deleteConfirmMessage', { name: template.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWellnessTemplate(template._id);
              Alert.alert(t('message.success'), t('wellnessTemplates.deleted'));
              loadTemplates();
            } catch (error) {
              Alert.alert(t('message.error'), t('wellnessTemplates.deleteError'));
            }
          }
        }
      ]
    );
  };

  const handleSetDefault = async (template) => {
    try {
      await setDefaultWellnessTemplate(template._id);
      Alert.alert(t('message.success'), t('wellnessTemplates.setAsDefault'));
      loadTemplates();
    } catch (error) {
      Alert.alert(t('message.error'), t('wellnessTemplates.setDefaultError'));
    }
  };

  const handleDuplicate = async (template) => {
    try {
      await duplicateWellnessTemplate(template._id);
      Alert.alert(t('message.success'), t('wellnessTemplates.duplicated'));
      loadTemplates();
    } catch (error) {
      Alert.alert(t('message.error'), t('wellnessTemplates.duplicateError'));
    }
  };

  // ==================== FUNCIONES DE SESIONES/WELLNESS ====================

  const openSessionModal = async (session, type = 'pre') => {
    setSelectedSession(session);
    setWellnessType(type);
    setShowSessionModal(true);
    await loadSessionWellnessData(session._id, type);
  };

  const loadSessionWellnessData = async (sessionId, type) => {
    setLoadingSessionData(true);
    try {
      let data;
      if (type === 'pre') {
        data = await getSessionPreWellnessStats(sessionId);
      } else {
        data = await getSessionWellnessStats(sessionId);
      }
      setSessionWellnessData(data);
    } catch (error) {
      console.error('Error loading session wellness:', error);
      setSessionWellnessData(null);
    } finally {
      setLoadingSessionData(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!selectedSession) return;
    setGeneratingLink(true);
    try {
      if (wellnessType === 'pre') {
        await generatePreWellnessLink(selectedSession._id, 48);
      } else {
        await generateWellnessLink(selectedSession._id, 48);
      }
      Alert.alert(t('message.success'), t('session.linkGenerated'));
      await loadSessionWellnessData(selectedSession._id, wellnessType);
    } catch (error) {
      Alert.alert(t('message.error'), t('session.responseError'));
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleToggleLink = async () => {
    if (!selectedSession || !sessionWellnessData) return;
    const currentActive = wellnessType === 'pre' 
      ? sessionWellnessData?.preWellnessLinkActive !== false 
      : sessionWellnessData?.wellnessLinkActive !== false;
    
    setTogglingLink(true);
    try {
      if (wellnessType === 'pre') {
        await togglePreWellnessLink(selectedSession._id, !currentActive);
      } else {
        await toggleWellnessLink(selectedSession._id, !currentActive);
      }
      Alert.alert(
        t('message.success'), 
        !currentActive ? t('session.linkActivated') : t('session.linkDeactivated')
      );
      await loadSessionWellnessData(selectedSession._id, wellnessType);
    } catch (error) {
      Alert.alert(t('message.error'), t('session.responseError'));
    } finally {
      setTogglingLink(false);
    }
  };

  const handleShareLink = async () => {
    const token = wellnessType === 'pre' 
      ? sessionWellnessData?.preWellnessToken 
      : sessionWellnessData?.wellnessToken;
    if (!token) return;
    
    const currentLang = t('lang') === 'en' ? 'en' : 'es';
    const endpoint = wellnessType === 'pre' ? 'prewellness/form' : 'api/wellness/form';
    const link = `${BACKEND_URL}/${endpoint}/${token}?lang=${currentLang}`;
    const dateStr = selectedSession?.fecha 
      ? new Date(selectedSession.fecha).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'es-ES') 
      : '';
    
    try {
      await Share.share({
        message: `📊 ${wellnessType === 'pre' ? t('preWellness.formMessage') : t('session.wellnessFormMessage')}${dateStr ? ` (${dateStr})` : ''}:\n\n${link}`,
        title: wellnessType === 'pre' ? t('preWellness.formTitle') : t('session.wellnessFormTitle')
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyLink = async () => {
    const token = wellnessType === 'pre' 
      ? sessionWellnessData?.preWellnessToken 
      : sessionWellnessData?.wellnessToken;
    if (!token) return;
    
    const currentLang = t('lang') === 'en' ? 'en' : 'es';
    const endpoint = wellnessType === 'pre' ? 'prewellness/form' : 'api/wellness/form';
    const link = `${BACKEND_URL}/${endpoint}/${token}?lang=${currentLang}`;
    await Clipboard.setStringAsync(link);
    Alert.alert(t('message.success'), t('session.linkCopied'));
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
              if (wellnessType === 'pre') {
                await deletePreWellnessResponse(responseId);
              } else {
                await deleteWellnessResponse(responseId);
              }
              await loadSessionWellnessData(selectedSession._id, wellnessType);
            } catch (error) {
              Alert.alert(t('message.error'), t('session.responseDeleteError'));
            }
          }
        }
      ]
    );
  };

  // Generar PDF
  const handleGeneratePDF = async () => {
    const isPreWellness = wellnessType === 'pre';
    const responses = sessionWellnessData?.responses || [];
    if (responses.length === 0) {
      Alert.alert(t('message.info'), t('session.noResponses'));
      return;
    }

    setGeneratingPDF(true);
    try {
      const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
      const dateStr = selectedSession?.fecha
        ? new Date(selectedSession.fecha).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      const teamName = selectedSession?.equipo?.nombre || selectedSession?.teamName || '';
      const average = isPreWellness
        ? sessionWellnessData?.averagePreWellness
        : sessionWellnessData?.averageWellness;
      const filePrefix = isPreWellness
        ? (i18n.language === 'en' ? 'prewellness_training' : 'prewellness_entrenamiento')
        : (i18n.language === 'en' ? 'wellness_training' : 'wellness_entrenamiento');
      const fileName = `${filePrefix}_${dateStr.replace(/\//g, '-')}.pdf`;
      const accentColor = isPreWellness ? '#f59e0b' : '#276e15';
      const reportTitle = isPreWellness ? t('session.preWellnessReport') : t('session.wellnessReport');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #1a1a1a; padding: 20px; }
            .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid ${accentColor}; }
            .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; color: ${accentColor}; }
            .header .date { font-size: 12px; color: #444; }
            .summary { display: flex; justify-content: space-around; margin-bottom: 25px; padding: 15px; border: 1px solid ${accentColor}; border-radius: 8px; }
            .summary-item { text-align: center; padding: 0 20px; }
            .summary-item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #444; margin-bottom: 5px; }
            .summary-item .value { font-size: 22px; font-weight: 700; color: ${accentColor}; }
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
            <h1>${reportTitle}</h1>
            <div class="date">${t('session.trainingOf')} ${dateStr}${teamName ? ` • ${teamName}` : ''}</div>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="label">${t('session.totalResponses')}</div>
              <div class="value">${responses.length}</div>
              <div class="sublabel">${t('session.players')}</div>
            </div>
            ${!isPreWellness ? `
            <div class="summary-item">
              <div class="label">${t('session.averageWellness')}</div>
              <div class="value">${average?.toFixed(1) || '-'}</div>
              <div class="sublabel">${t('session.averageResponses')}</div>
            </div>
            ` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: ${isPreWellness ? '25' : '20'}%">${t('session.player')}</th>
                ${!isPreWellness ? `<th style="width: 15%">Wellness</th>` : ''}
                <th style="width: ${isPreWellness ? '50' : '40'}%">${t('session.responses')}</th>
                <th style="width: ${isPreWellness ? '25' : '25'}%">${t('session.date')}</th>
              </tr>
            </thead>
            <tbody>
              ${responses.map(response => {
                const score = isPreWellness ? response.preWellnessScore : response.wellness;
                return `
                <tr>
                  <td>${response.playerName}</td>
                  ${!isPreWellness ? `<td class="score-cell">${score}</td>` : ''}
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
                  <td>${response.submittedAt ? new Date(response.submittedAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                </tr>
              `}).join('')}
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

      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      await savePdfToDownloads(uri, fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert(t('message.error'), t('session.pdfError'));
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Generar PDF por rango de fechas
  const handleGenerateRangePDF = async () => {
    const selectedTeam = equipos.find(e => e.seleccionado === true);
    if (!selectedTeam?._id) {
      Alert.alert(t('message.error'), t('wellness.noTeamSelected', 'Selecciona un equipo primero'));
      return;
    }

    setGeneratingRangePDF(true);
    try {
      const isPreWellness = rangePDFType === 'pre';
      const data = isPreWellness
        ? await getPreWellnessRange(selectedTeam._id, rangeFromDate.toISOString(), rangeToDate.toISOString())
        : await getWellnessRange(selectedTeam._id, rangeFromDate.toISOString(), rangeToDate.toISOString());

      const sessionsWithResponses = (data.sessions || []).filter(s => s.totalResponses > 0);
      if (sessionsWithResponses.length === 0) {
        Alert.alert(t('message.info'), t('wellness.noDataInRange', 'No hay datos de wellness en el rango seleccionado'));
        return;
      }

      const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
      const fromStr = rangeFromDate.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
      const toStr = rangeToDate.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
      const teamName = selectedTeam.nombre || '';
      const accentColor = isPreWellness ? '#f59e0b' : '#276e15';
      const reportTitle = isPreWellness ? t('session.preWellnessReport') : t('session.wellnessReport');
      const filePrefix = isPreWellness ? 'prewellness' : 'wellness';
      const fileName = `${filePrefix}_${fromStr.replace(/\//g, '-')}_${toStr.replace(/\//g, '-')}.pdf`;

      const totalResponses = sessionsWithResponses.reduce((sum, s) => sum + s.totalResponses, 0);
      const avgScore = isPreWellness
        ? null
        : Math.round((sessionsWithResponses.filter(s => s.averageWellness).reduce((sum, s) => sum + s.averageWellness, 0) / sessionsWithResponses.filter(s => s.averageWellness).length) * 10) / 10;

      const sessionsHTML = sessionsWithResponses.map(session => {
        const sessionDate = new Date(session.fecha).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
        const avg = isPreWellness ? session.averageScore : session.averageWellness;
        return `
          <div style="margin-bottom: 20px; page-break-inside: avoid;">
            <h3 style="font-size: 13px; color: ${accentColor}; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd;">
              📅 ${sessionDate} ${session.horaInicio ? `(${session.horaInicio}${session.horaFin ? ' - ' + session.horaFin : ''})` : ''}
              ${avg ? ` — ${t('session.average', 'Media')}: ${avg}` : ''}
            </h3>
            <table>
              <thead>
                <tr>
                  <th style="width: ${isPreWellness ? '30' : '25'}%">${t('session.player')}</th>
                  ${!isPreWellness ? `<th style="width: 12%">Wellness</th>` : ''}
                  <th style="width: ${isPreWellness ? '70' : '63'}%">${t('session.responses')}</th>
                </tr>
              </thead>
              <tbody>
                ${session.responses.map(r => {
                  const score = isPreWellness ? r.preWellnessScore : r.wellness;
                  return `
                    <tr>
                      <td>${r.playerName}</td>
                      ${!isPreWellness ? `<td class="score-cell">${score || '-'}</td>` : ''}
                      <td>
                        ${r.questionResponses && r.questionResponses.length > 0
                          ? r.questionResponses.filter(qr => qr.answer).map(qr => `
                              <div class="question-response">
                                <div class="q">${qr.question}</div>
                                <div class="a">${qr.answer}</div>
                              </div>
                            `).join('')
                          : `<span style="color: #999;">-</span>`
                        }
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #1a1a1a; padding: 20px; }
            .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid ${accentColor}; }
            .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; color: ${accentColor}; }
            .header .date { font-size: 12px; color: #444; }
            .summary { display: flex; justify-content: space-around; margin-bottom: 25px; padding: 15px; border: 1px solid ${accentColor}; border-radius: 8px; }
            .summary-item { text-align: center; padding: 0 20px; }
            .summary-item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #444; margin-bottom: 5px; }
            .summary-item .value { font-size: 22px; font-weight: 700; color: ${accentColor}; }
            .summary-item .sublabel { font-size: 9px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
            th { background-color: #f0f0ff; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            td { font-size: 10px; }
            .score-cell { text-align: center; font-weight: 600; font-size: 13px; }
            .question-response { margin-bottom: 4px; padding-left: 8px; border-left: 2px solid #ddd; }
            .question-response .q { font-size: 8px; color: #666; font-style: italic; }
            .question-response .a { font-size: 9px; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #333; text-align: center; font-size: 9px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportTitle}</h1>
            <div class="date">${fromStr} - ${toStr}${teamName ? ` • ${teamName}` : ''}</div>
          </div>

          <div class="summary">
            <div class="summary-item">
              <div class="label">${t('wellness.sessionsCount', 'Sesiones')}</div>
              <div class="value">${sessionsWithResponses.length}</div>
            </div>
            <div class="summary-item">
              <div class="label">${t('session.totalResponses')}</div>
              <div class="value">${totalResponses}</div>
            </div>
            ${!isPreWellness && avgScore ? `
            <div class="summary-item">
              <div class="label">${t('session.averageWellness')}</div>
              <div class="value">${avgScore}</div>
            </div>
            ` : ''}
          </div>

          ${sessionsHTML}

          <div class="footer">
            ${t('player.profile.generatedAt')}: ${new Date().toLocaleDateString(locale, { 
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      await savePdfToDownloads(uri, fileName);
      setShowRangePDFModal(false);
    } catch (error) {
      console.error('Error generating range PDF:', error);
      Alert.alert(t('message.error'), t('session.pdfError'));
    } finally {
      setGeneratingRangePDF(false);
    }
  };

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(i18n.language === 'es' ? 'es-ES' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  // ==================== RENDERIZADO ====================

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'sessions' && styles.tabActive]}
        onPress={() => setActiveTab('sessions')}
      >
        <Ionicons 
          name="calendar" 
          size={18} 
          color={activeTab === 'sessions' ? THEME.onPrimary : THEME.textSecondary} 
        />
        <Text style={[styles.tabText, activeTab === 'sessions' && styles.tabTextActive]}>
          {t('wellness.sessions')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'templates' && styles.tabActive]}
        onPress={() => setActiveTab('templates')}
      >
        <Ionicons 
          name="document-text" 
          size={18} 
          color={activeTab === 'templates' ? THEME.onPrimary : THEME.textSecondary} 
        />
        <Text style={[styles.tabText, activeTab === 'templates' && styles.tabTextActive]}>
          {t('wellness.templates')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSessionsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>
        {t('wellness.recentSessions')}
      </Text>
      <Text style={styles.sectionSubtitle}>
        {t('wellness.selectSessionToManage')}
      </Text>
      
      <ScrollView style={styles.sessionsList} showsVerticalScrollIndicator={false}>
        {sessionsWithData.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={THEME.textMuted} />
            <Text style={styles.emptyText}>{t('wellness.noSessions')}</Text>
          </View>
        ) : (
          sessionsWithData.map((session) => (
            <View key={session._id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={styles.sessionDateContainer}>
                  <Ionicons name="calendar" size={16} color={THEME.primary} />
                  <Text style={styles.sessionDate}>{formatDate(session.fecha)}</Text>
                  {session.horaInicio && (
                    <Text style={styles.sessionTime}>{session.horaInicio}</Text>
                  )}
                </View>
                {session.nombre && (
                  <Text style={styles.sessionName}>{session.nombre}</Text>
                )}
              </View>
              
              <View style={styles.sessionActions}>
                <TouchableOpacity
                  style={[styles.sessionActionBtn, { backgroundColor: THEME.warningSoft }]}
                  onPress={() => openSessionModal(session, 'pre')}
                >
                  <View style={styles.sessionActionContent}>
                    <View style={[styles.typeBadge, { backgroundColor: THEME.warning }]}>
                      <Text style={styles.typeBadgeText}>{t('wellness.preBadge')}</Text>
                    </View>
                    <Text style={[styles.sessionActionText, { color: THEME.warningSoftText }]}>
                      {t('preWellness.title')}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={THEME.warningSoftText} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.sessionActionBtn, { backgroundColor: THEME.successSoft }]}
                  onPress={() => openSessionModal(session, 'post')}
                >
                  <View style={styles.sessionActionContent}>
                    <View style={[styles.typeBadge, { backgroundColor: THEME.success }]}>
                      <Text style={styles.typeBadgeText}>{t('wellness.postBadge')}</Text>
                    </View>
                    <Text style={[styles.sessionActionText, { color: THEME.successSoftText }]}>
                      {t('session.wellness')}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={THEME.successSoftText} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderTemplatesTab = () => (
    <View style={styles.tabContent}>
      {/* Selector de tipo */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeBtn, selectedTemplateType === 'pre' && styles.typeBtnActive]}
          onPress={() => setSelectedTemplateType('pre')}
        >
          <View style={[styles.typeBadgeSmall, { backgroundColor: selectedTemplateType === 'pre' ? THEME.warning : THEME.backgroundAlt }]}>
            <Text style={[styles.typeBadgeTextSmall, { color: selectedTemplateType === 'pre' ? '#fff' : THEME.textSecondary }]}>PRE</Text>
          </View>
          <Text style={[styles.typeBtnText, selectedTemplateType === 'pre' && styles.typeBtnTextActive]}>
            {t('preWellness.title')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeBtn, selectedTemplateType === 'post' && styles.typeBtnActive]}
          onPress={() => setSelectedTemplateType('post')}
        >
          <View style={[styles.typeBadgeSmall, { backgroundColor: selectedTemplateType === 'post' ? THEME.success : THEME.backgroundAlt }]}>
            <Text style={[styles.typeBadgeTextSmall, { color: selectedTemplateType === 'post' ? '#fff' : THEME.textSecondary }]}>POST</Text>
          </View>
          <Text style={[styles.typeBtnText, selectedTemplateType === 'post' && styles.typeBtnTextActive]}>
            {t('session.wellness')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botón crear plantilla */}
      <TouchableOpacity style={styles.createBtn} onPress={openCreateTemplateModal}>
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.createBtnText}>
          {t('wellnessTemplates.createNew')}
        </Text>
      </TouchableOpacity>

      {/* Lista de plantillas */}
      {loading ? (
        <ActivityIndicator size="large" color={THEME.primary} style={{ marginTop: 40 }} />
      ) : templates.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={THEME.textMuted} />
          <Text style={styles.emptyText}>
            {t('wellnessTemplates.noTemplates')}
          </Text>
          <Text style={styles.emptySubtext}>
            {t('wellnessTemplates.createFirst')}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.templatesList} showsVerticalScrollIndicator={false}>
          {templates.map((template) => (
            <View key={template._id} style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <View style={styles.templateTitleRow}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  {template.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text style={styles.defaultBadgeText}>{t('wellnessTemplates.default')}</Text>
                    </View>
                  )}
                </View>
                {template.description && (
                  <Text style={styles.templateDescription}>{template.description}</Text>
                )}
              </View>
              
              <View style={styles.templateMeta}>
                <View style={styles.templateMetaItem}>
                  <Ionicons name="help-circle-outline" size={14} color={THEME.textSecondary} />
                  <Text style={styles.templateMetaText}>
                    {template.questions?.length || 0} {t('wellnessTemplates.questions')}
                  </Text>
                </View>
              </View>
              
              <View style={styles.templateActions}>
                <TouchableOpacity 
                  style={styles.templateActionBtn}
                  onPress={() => openEditTemplateModal(template)}
                >
                  <Feather name="edit-2" size={16} color={THEME.primary} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.templateActionBtn}
                  onPress={() => handleDuplicate(template)}
                >
                  <Feather name="copy" size={16} color={THEME.textSecondary} />
                </TouchableOpacity>
                {!template.isDefault && (
                  <TouchableOpacity 
                    style={styles.templateActionBtn}
                    onPress={() => handleSetDefault(template)}
                  >
                    <Ionicons name="star-outline" size={16} color="#f59e0b" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.templateActionBtn}
                  onPress={() => handleDeleteTemplate(template)}
                >
                  <Feather name="trash-2" size={16} color={THEME.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // Modal de crear/editar plantilla
  const renderTemplateModal = () => (
    <Modal
      visible={showTemplateModal}
      animationType="slide"
      transparent
     
      onRequestClose={() => setShowTemplateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingTemplate 
                ? t('wellnessTemplates.editTemplate') 
                : t('wellnessTemplates.createTemplate')}
            </Text>
            <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
              <Ionicons name="close" size={24} color={THEME.text} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Nombre */}
            <Text style={styles.inputLabel}>{t('wellnessTemplates.name')}</Text>
            <TextInput
              style={styles.textInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder={t('wellnessTemplates.namePlaceholder')}
              placeholderTextColor={THEME.textMuted}
            />

            {/* Descripción */}
            <Text style={styles.inputLabel}>{t('wellnessTemplates.description')}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={templateDescription}
              onChangeText={setTemplateDescription}
              placeholder={t('wellnessTemplates.descriptionPlaceholder')}
              placeholderTextColor={THEME.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* Preguntas */}
            <Text style={styles.inputLabel}>{t('wellnessTemplates.questions')}</Text>
            
            {templateQuestions.map((q, index) => (
              <View key={index} style={styles.questionItem}>
                <Text style={styles.questionNumber}>{index + 1}.</Text>
                <Text style={styles.questionText}>{q.question}</Text>
                <TouchableOpacity onPress={() => removeTemplateQuestion(index)}>
                  <Ionicons name="close-circle" size={20} color={THEME.danger} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Añadir pregunta */}
            <View style={styles.addQuestionRow}>
              <TextInput
                style={[styles.textInput, styles.questionInput]}
                value={newTemplateQuestion}
                onChangeText={setNewTemplateQuestion}
                placeholder={t('wellnessTemplates.addQuestionPlaceholder')}
                placeholderTextColor={THEME.textMuted}
                onSubmitEditing={addTemplateQuestion}
              />
              <TouchableOpacity style={styles.addQuestionBtn} onPress={addTemplateQuestion}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => setShowTemplateModal(false)}
            >
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveBtn, savingTemplate && styles.saveBtnDisabled]}
              onPress={handleSaveTemplate}
              disabled={savingTemplate}
            >
              {savingTemplate ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Modal de detalle de sesión wellness
  const renderSessionModal = () => {
    const isPreWellness = wellnessType === 'pre';
    const accentColor = isPreWellness ? '#f59e0b' : '#276e15';
    const token = isPreWellness 
      ? sessionWellnessData?.preWellnessToken 
      : sessionWellnessData?.wellnessToken;
    const isLinkActive = isPreWellness
      ? sessionWellnessData?.preWellnessLinkActive !== false
      : sessionWellnessData?.wellnessLinkActive !== false;
    const isLinkExpired = isPreWellness
      ? sessionWellnessData?.preWellnessLinkExpired === true
      : sessionWellnessData?.wellnessLinkExpired === true;
    const currentLang = t('lang') === 'en' ? 'en' : 'es';
    const linkEndpoint = isPreWellness ? 'prewellness/form' : 'api/wellness/form';
    const fullLink = token ? `${BACKEND_URL}/${linkEndpoint}/${token}?lang=${currentLang}` : '';
    const responses = sessionWellnessData?.responses || [];
    const average = isPreWellness
      ? sessionWellnessData?.averagePreWellness
      : sessionWellnessData?.averageWellness;
    
    return (
      <Modal
        visible={showSessionModal}
        animationType="slide"
        transparent
       
        onRequestClose={() => setShowSessionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.typeBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.typeBadgeText}>{isPreWellness ? 'PRE' : 'POST'}</Text>
                </View>
                <Text style={styles.modalTitle}>
                  {isPreWellness ? t('preWellness.title') : t('session.wellness')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSessionModal(false)}>
                <Ionicons name="close" size={24} color={THEME.text} />
              </TouchableOpacity>
            </View>

            {/* Info de la sesión */}
            <View style={[styles.sessionInfoBar, { backgroundColor: `${accentColor}15` }]}>
              <Ionicons name="calendar" size={16} color={accentColor} />
              <Text style={[styles.sessionInfoText, { color: accentColor }]}>
                {formatDate(selectedSession?.fecha)} {selectedSession?.horaInicio && `- ${selectedSession.horaInicio}`}
              </Text>
            </View>

            {loadingSessionData ? (
              <ActivityIndicator size="large" color={THEME.primary} style={{ marginTop: 40, marginBottom: 40 }} />
            ) : (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Estadísticas */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>{t('preWellness.responses')}</Text>
                    <Text style={[styles.statValue, { color: THEME.primary }]}>
                      {responses.length}
                    </Text>
                  </View>
                  {!isPreWellness && (
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>{t('session.averageWellness')}</Text>
                      <Text style={[styles.statValue, { color: '#3b82f6' }]}>
                        {average?.toFixed(1) || '-'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>{t('preWellness.pending')}</Text>
                    <Text style={[styles.statValue, { color: THEME.warning }]}>
                      {sessionWellnessData?.pendingCount || 0}
                    </Text>
                  </View>
                </View>

                {/* Gestión de enlace */}
                <View style={styles.linkSection}>
                  <Text style={styles.linkSectionTitle}>
                    {t('preWellness.formLink')}
                  </Text>
                  
                  {!token ? (
                    <TouchableOpacity
                      style={[styles.generateLinkBtn, { backgroundColor: accentColor }]}
                      onPress={handleGenerateLink}
                      disabled={generatingLink}
                    >
                      {generatingLink ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="link" size={18} color="#fff" />
                          <Text style={styles.generateLinkText}>
                            {t('preWellness.generateLink')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : isLinkExpired ? (
                    <View style={styles.linkActions}>
                      <View style={styles.linkStatusRow}>
                        <View style={[styles.linkStatusBadge, { backgroundColor: theme.colors.errorSoft }]}>
                          <Ionicons name="time-outline" size={14} color={THEME.danger} />
                          <Text style={[styles.linkStatusText, { color: THEME.danger }]}>
                            {t('preWellness.linkExpired')}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.generateLinkBtn, { backgroundColor: accentColor }]}
                        onPress={handleGenerateLink}
                        disabled={generatingLink}
                      >
                        {generatingLink ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="refresh" size={18} color="#fff" />
                            <Text style={styles.generateLinkText}>
                              {t('preWellness.regenerateLink')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.linkActions}>
                      <View style={styles.linkStatusRow}>
                        <View style={[styles.linkStatusBadge, { backgroundColor: isLinkActive ? theme.colors.successSoft : theme.colors.errorSoft }]}>
                          <Ionicons 
                            name={isLinkActive ? 'checkmark-circle' : 'close-circle'} 
                            size={14} 
                            color={isLinkActive ? THEME.success : THEME.danger} 
                          />
                          <Text style={[styles.linkStatusText, { color: isLinkActive ? THEME.success : THEME.danger }]}>
                            {isLinkActive 
                              ? t('preWellness.linkActive') 
                              : t('preWellness.linkInactive')}
                          </Text>
                        </View>
                      </View>
                      
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleCopyLink}
                        style={styles.linkUrlBox}
                      >
                        <Text
                          style={styles.linkUrlText}
                          numberOfLines={2}
                          selectable
                        >
                          {fullLink}
                        </Text>
                        <Ionicons name="copy-outline" size={16} color={THEME.primary} />
                      </TouchableOpacity>
                      
                      <View style={styles.linkBtnRow}>
                        <TouchableOpacity style={styles.linkActionBtn} onPress={handleShareLink}>
                          <Ionicons name="share-social" size={18} color={THEME.primary} />
                          <Text style={styles.linkActionText}>{t('common.share')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.linkActionBtn} onPress={handleCopyLink}>
                          <Ionicons name="copy" size={18} color={THEME.primary} />
                          <Text style={styles.linkActionText}>{t('common.copy')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.linkActionBtn} 
                          onPress={handleToggleLink}
                          disabled={togglingLink}
                        >
                          {togglingLink ? (
                            <ActivityIndicator size="small" color={THEME.primary} />
                          ) : (
                            <>
                              <Ionicons 
                                name={isLinkActive ? 'pause-circle' : 'play-circle'} 
                                size={18} 
                                color={isLinkActive ? THEME.warning : THEME.success} 
                              />
                              <Text style={styles.linkActionText}>
                                {isLinkActive ? t('common.disable') : t('common.enable')}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* Lista de respuestas */}
                <View style={styles.responsesSection}>
                  <Text style={styles.responsesSectionTitle}>
                    {t('preWellness.responses')} ({responses.length})
                  </Text>
                  
                  {responses.length === 0 ? (
                    <View style={styles.noResponses}>
                      <Ionicons name="clipboard-outline" size={32} color={THEME.textMuted} />
                      <Text style={styles.noResponsesText}>
                        {t('preWellness.noResponses')}
                      </Text>
                    </View>
                  ) : (
                    responses.map((response, index) => {
                      const scoreValue = isPreWellness ? response.preWellnessScore : response.wellness;
                      return (
                        <View key={response._id || index} style={styles.responseCard}>
                          <View style={styles.responseHeader}>
                            <View style={styles.responsePlayerInfo}>
                              <Ionicons name="person" size={16} color={THEME.textSecondary} />
                              <Text style={styles.responsePlayerName}>{response.playerName}</Text>
                            </View>
                            {!isPreWellness && (
                              <View style={[styles.responseScoreBadge, { backgroundColor: getWellnessColor(scoreValue) }]}>
                                <Text style={styles.responseScoreText}>{scoreValue}/10</Text>
                              </View>
                            )}
                          </View>
                          
                          {response.questionResponses && response.questionResponses.length > 0 && (
                            <View style={styles.responseQuestions}>
                              {response.questionResponses.map((qr, qIndex) => (
                                <View key={qIndex} style={styles.responseQuestionItem}>
                                  <Text style={styles.responseQuestionText}>{qr.question}</Text>
                                  <Text style={styles.responseAnswerText}>{qr.answer}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                          
                          <View style={styles.responseFooter}>
                            <Text style={styles.responseTime}>
                              {response.submittedAt && new Date(response.submittedAt).toLocaleString(i18n.language === 'en' ? 'en-US' : 'es-ES', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleDeleteResponse(response._id, response.playerName)}
                            >
                              <Ionicons name="trash-outline" size={18} color={THEME.danger} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Jugadores pendientes */}
                {sessionWellnessData?.pendingPlayers && sessionWellnessData.pendingPlayers.length > 0 && (
                  <View style={styles.pendingSection}>
                    <Text style={styles.pendingSectionTitle}>
                      {t('preWellness.pendingPlayers')}
                    </Text>
                    <View style={styles.pendingList}>
                      {sessionWellnessData.pendingPlayers.map((player, index) => (
                        <View key={player._id || index} style={styles.pendingPlayer}>
                          <Ionicons name="person-outline" size={14} color={THEME.warning} />
                          <Text style={styles.pendingPlayerName}>{player.fullName || player.nombre}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.pdfBtn, generatingPDF && { opacity: 0.6 }]}
                onPress={handleGeneratePDF}
                disabled={generatingPDF || responses.length === 0}
              >
                {generatingPDF ? (
                  <ActivityIndicator size="small" color={THEME.primary} />
                ) : (
                  <>
                    <Ionicons name="document-text" size={18} color={THEME.primary} />
                    <Text style={styles.pdfBtnText}>PDF</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.closeModalBtn, { backgroundColor: accentColor, flex: 1 }]}
                onPress={() => setShowSessionModal(false)}
              >
                <Text style={styles.closeModalBtnText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <AppLayout>
      <View style={styles.container}>
        <LinearGradient
          colors={headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, isDark && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}
        >
          <View style={styles.headerContent}>
            <MaterialIcons name="favorite" size={28} color={headerTextColor} />
            <Text style={[styles.headerTitle, { color: headerTextColor }]}>{t('wellness.title')}</Text>
            <TouchableOpacity
              style={{ marginLeft: 'auto', backgroundColor: headerActionBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: isDark ? 1 : 0, borderColor: theme.colors.border }}
              onPress={() => setShowRangePDFModal(true)}
            >
              <Ionicons name="document-text-outline" size={18} color={headerTextColor} />
              <Text style={{ color: headerTextColor, fontSize: 12, fontWeight: '600' }}>{t('wellness.pdfButton')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerSubtitle, { color: headerTextMutedColor }]}>
            {t('wellness.subtitle')}
          </Text>
        </LinearGradient>

        {renderTabs()}
        
        {activeTab === 'sessions' ? renderSessionsTab() : renderTemplatesTab()}
        
        {renderTemplateModal()}
        {renderSessionModal()}

        {/* Modal PDF por rango de fechas */}
        <Modal visible={showRangePDFModal} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: THEME.surface, borderRadius: 16, padding: 24, width: isMobile ? '90%' : 400, maxWidth: 500 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text }}>{t('wellness.rangePDF')}</Text>
                <TouchableOpacity onPress={() => setShowRangePDFModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Tipo */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 }}>{t('wellness.pdfType')}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: rangePDFType === 'post' ? THEME.success : THEME.backgroundAlt }}
                  onPress={() => setRangePDFType('post')}
                >
                  <Text style={{ fontWeight: '600', color: rangePDFType === 'post' ? '#fff' : THEME.textSecondary }}>{t('wellness.postBadge')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: rangePDFType === 'pre' ? THEME.warning : THEME.backgroundAlt }}
                  onPress={() => setRangePDFType('pre')}
                >
                  <Text style={{ fontWeight: '600', color: rangePDFType === 'pre' ? '#fff' : THEME.textSecondary }}>{t('wellness.preBadge')}</Text>
                </TouchableOpacity>
              </View>

              {/* Fecha desde */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 }}>{t('wellness.fromDate', 'Desde')}</Text>
              <TouchableOpacity
                style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                onPress={() => setShowFromPicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                <Text style={{ fontSize: 14, color: theme.colors.text }}>
                  {rangeFromDate.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </Text>
              </TouchableOpacity>

              {/* Fecha hasta */}
              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 8 }}>{t('wellness.toDate', 'Hasta')}</Text>
              <TouchableOpacity
                style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 12, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                onPress={() => setShowToPicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                <Text style={{ fontSize: 14, color: theme.colors.text }}>
                  {rangeToDate.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </Text>
              </TouchableOpacity>

              {/* Botón generar */}
              <TouchableOpacity
                style={{ backgroundColor: rangePDFType === 'pre' ? THEME.warning : THEME.success, borderRadius: 10, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                onPress={handleGenerateRangePDF}
                disabled={generatingRangePDF}
              >
                {generatingRangePDF ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{t('pdf.generatePDF')}</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Date picker modals */}
              <DateTimePickerModal
                isVisible={showFromPicker}
                mode="date"
                date={rangeFromDate}
                onConfirm={(date) => { setRangeFromDate(date); setShowFromPicker(false); }}
                onCancel={() => setShowFromPicker(false)}
                locale={i18n.language}
              />
              <DateTimePickerModal
                isVisible={showToPicker}
                mode="date"
                date={rangeToDate}
                onConfirm={(date) => { setRangeToDate(date); setShowToPicker(false); }}
                onCancel={() => setShowToPicker(false)}
                locale={i18n.language}
              />
            </View>
          </View>
        </Modal>
      </View>
    </AppLayout>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    marginLeft: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.onPrimary,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  sessionsList: {
    flex: 1,
  },
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sessionHeader: {
    marginBottom: 12,
  },
  sessionDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionDate: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sessionTime: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  sessionName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  sessionActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  sessionActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 4,
  },

  // Templates
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  typeBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  typeBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeTextSmall: {
    fontSize: 9,
    fontWeight: '700',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  typeBtnTextActive: {
    color: theme.colors.primary,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  createBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  templatesList: {
    flex: 1,
  },
  templateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  templateHeader: {
    marginBottom: 10,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.warningSoftText,
  },
  templateDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  templateMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  templateMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  templateMetaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  templateActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobile ? 10 : 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: isMobile ? 14 : 16,
    width: '100%',
    maxWidth: isMobile ? 400 : 500,
    maxHeight: isMobile ? '90%' : '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isMobile ? 14 : 16,
    paddingVertical: isMobile ? 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  addQuestionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  questionInput: {
    flex: 1,
  },
  addQuestionBtn: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
  closeModalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeModalBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pdfBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  // Session Modal
  sessionInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  sessionInfoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  linkSection: {
    marginBottom: 20,
  },
  linkSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  generateLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  generateLinkText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  linkActions: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 12,
  },
  linkStatusRow: {
    marginBottom: 12,
  },
  linkStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  linkStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  linkBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  linkUrlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  linkUrlText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.text,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  linkActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    borderRadius: 8,
  },
  linkActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  responsesSection: {
    marginBottom: 20,
  },
  responsesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  noResponses: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
  },
  noResponsesText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  responseCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  responsePlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responsePlayerName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  responseScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  responseScoreText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  responseQuestions: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  responseQuestionItem: {
    marginBottom: 6,
  },
  responseQuestionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  responseAnswerText: {
    fontSize: 13,
    color: theme.colors.text,
    marginTop: 2,
  },
  responseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  responseTime: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  pendingSection: {
    marginBottom: 20,
  },
  pendingSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  pendingList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pendingPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.warningSoft,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  pendingPlayerName: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.warningSoftText,
  },
});
