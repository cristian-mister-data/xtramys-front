import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AppLayout from '@/vendor/shared/appLayout';
import KeyboardAwareScrollView from '@/vendor/shared/KeyboardAwareScrollView';
import { THEME } from '@/vendor/shared/ProfessionalHeader';
import {
  getWellnessTemplates,
  createWellnessTemplate,
  updateWellnessTemplate,
  deleteWellnessTemplate,
  setDefaultWellnessTemplate,
  duplicateWellnessTemplate,
} from '@/utils/api';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

export default function WellnessTemplates({ navigation }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [selectedType, setSelectedType] = useState('pre'); // 'pre' o 'post'
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);

  // Estado del formulario
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');

  useEffect(() => {
    loadTemplates();
  }, [selectedType]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getWellnessTemplates(selectedType);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      Alert.alert(t('message.error'), t('wellnessTemplates.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setQuestions([]);
    setNewQuestion('');
    setShowEditModal(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setQuestions(template.questions || []);
    setNewQuestion('');
    setShowEditModal(true);
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions([...questions, { question: newQuestion.trim(), order: questions.length, required: false }]);
    setNewQuestion('');
  };

  const removeQuestion = (index) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated.map((q, i) => ({ ...q, order: i })));
  };

  const toggleQuestionRequired = (index) => {
    const updated = [...questions];
    updated[index].required = !updated[index].required;
    setQuestions(updated);
  };

  const moveQuestion = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    const updated = [...questions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setQuestions(updated.map((q, i) => ({ ...q, order: i })));
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      Alert.alert(t('message.error'), t('wellnessTemplates.nameRequired'));
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        await updateWellnessTemplate(editingTemplate._id, {
          name: templateName.trim(),
          description: templateDescription.trim(),
          questions,
        });
        Alert.alert(t('message.success'), t('wellnessTemplates.updated'));
      } else {
        await createWellnessTemplate({
          name: templateName.trim(),
          description: templateDescription.trim(),
          type: selectedType,
          questions,
        });
        Alert.alert(t('message.success'), t('wellnessTemplates.created'));
      }
      setShowEditModal(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      Alert.alert(t('message.error'), error.response?.data?.message || t('wellnessTemplates.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (template) => {
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
          },
        },
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

  const renderTemplateCard = (template) => (
    <View key={template._id} style={styles.templateCard}>
      <View style={styles.templateHeader}>
        <View style={styles.templateTitleRow}>
          <Text style={styles.templateName}>{template.name}</Text>
          {template.isDefault && (
            <View style={styles.defaultBadge}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={styles.defaultBadgeText}>{t('wellnessTemplates.default')}</Text>
            </View>
          )}
        </View>
        {template.description && (
          <Text style={styles.templateDescription}>{template.description}</Text>
        )}
      </View>

      <View style={styles.questionsPreview}>
        <Text style={styles.questionsCount}>
          {template.questions?.length || 0} {t('wellnessTemplates.questions')}
        </Text>
        {template.questions?.slice(0, 2).map((q, idx) => (
          <Text key={idx} style={styles.questionPreview} numberOfLines={1}>
            • {q.question}
          </Text>
        ))}
        {template.questions?.length > 2 && (
          <Text style={styles.moreQuestions}>
            +{template.questions.length - 2} {t('wellnessTemplates.more')}
          </Text>
        )}
      </View>

      <View style={styles.templateActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(template)}
        >
          <Feather name="edit-2" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>{t('common.edit')}</Text>
        </TouchableOpacity>

        {!template.isDefault && (
          <TouchableOpacity
            style={[styles.actionButton, styles.defaultButton]}
            onPress={() => handleSetDefault(template)}
          >
            <Ionicons name="star-outline" size={16} color="#fff" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.duplicateButton]}
          onPress={() => handleDuplicate(template)}
        >
          <Feather name="copy" size={16} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(template)}
        >
          <Feather name="trash-2" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <AppLayout navigation={navigation}>
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{t('wellnessTemplates.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('wellnessTemplates.subtitle')}</Text>
          </View>
        </LinearGradient>

        {/* Type Selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, selectedType === 'pre' && styles.typeButtonActive]}
            onPress={() => setSelectedType('pre')}
          >
            <Text style={[styles.typeButtonText, selectedType === 'pre' && styles.typeButtonTextActive]}>
              {t('wellnessTemplates.preWellness')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, selectedType === 'post' && styles.typeButtonActive]}
            onPress={() => setSelectedType('post')}
          >
            <Text style={[styles.typeButtonText, selectedType === 'post' && styles.typeButtonTextActive]}>
              {t('wellnessTemplates.postWellness')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
          </View>
        ) : (
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {templates.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="description" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>{t('wellnessTemplates.noTemplates')}</Text>
                <Text style={styles.emptyStateSubtext}>
                  {selectedType === 'pre' 
                    ? t('wellnessTemplates.noPreTemplatesHint') 
                    : t('wellnessTemplates.noPostTemplatesHint')}
                </Text>
              </View>
            ) : (
              templates.map(renderTemplateCard)
            )}
          </ScrollView>
        )}

        {/* FAB */}
        <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.fabGradient}>
            <Feather name="plus" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Edit/Create Modal */}
        <Modal visible={showEditModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingTemplate ? t('wellnessTemplates.editTemplate') : t('wellnessTemplates.createTemplate')}
                </Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <KeyboardAwareScrollView style={styles.modalBody}>
                <Text style={styles.inputLabel}>{t('wellnessTemplates.templateName')}</Text>
                <TextInput
                  style={styles.input}
                  value={templateName}
                  onChangeText={setTemplateName}
                  placeholder={t('wellnessTemplates.templateNamePlaceholder')}
                />

                <Text style={styles.inputLabel}>{t('wellnessTemplates.description')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={templateDescription}
                  onChangeText={setTemplateDescription}
                  placeholder={t('wellnessTemplates.descriptionPlaceholder')}
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.inputLabel}>{t('wellnessTemplates.questions')}</Text>
                
                {questions.map((q, index) => (
                  <View key={index} style={styles.questionItem}>
                    <View style={styles.questionContent}>
                      <Text style={styles.questionText}>{q.question}</Text>
                      {q.required && (
                        <Text style={styles.requiredBadge}>{t('wellnessTemplates.required')}</Text>
                      )}
                    </View>
                    <View style={styles.questionActions}>
                      <TouchableOpacity
                        onPress={() => moveQuestion(index, -1)}
                        disabled={index === 0}
                        style={[styles.questionActionBtn, index === 0 && styles.disabledBtn]}
                      >
                        <Ionicons name="chevron-up" size={18} color={index === 0 ? '#ccc' : '#666'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moveQuestion(index, 1)}
                        disabled={index === questions.length - 1}
                        style={[styles.questionActionBtn, index === questions.length - 1 && styles.disabledBtn]}
                      >
                        <Ionicons name="chevron-down" size={18} color={index === questions.length - 1 ? '#ccc' : '#666'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => toggleQuestionRequired(index)}
                        style={styles.questionActionBtn}
                      >
                        <Ionicons name={q.required ? "star" : "star-outline"} size={18} color={q.required ? '#f39c12' : '#666'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeQuestion(index)}
                        style={styles.questionActionBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <View style={styles.addQuestionRow}>
                  <TextInput
                    style={[styles.input, styles.addQuestionInput]}
                    value={newQuestion}
                    onChangeText={setNewQuestion}
                    placeholder={t('wellnessTemplates.addQuestionPlaceholder')}
                    onSubmitEditing={addQuestion}
                  />
                  <TouchableOpacity style={styles.addQuestionBtn} onPress={addQuestion}>
                    <Ionicons name="add" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </KeyboardAwareScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: THEME.backgroundAlt,
  },
  typeButtonActive: {
    backgroundColor: '#667eea',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  templateCard: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  templateHeader: {
    marginBottom: 12,
  },
  templateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  templateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f39c12',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
  },
  questionsPreview: {
    backgroundColor: THEME.backgroundAlt,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  questionsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 8,
  },
  questionPreview: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  moreQuestions: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  templateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: '#3498db',
  },
  defaultButton: {
    backgroundColor: '#f39c12',
  },
  duplicateButton: {
    backgroundColor: '#9b59b6',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabGradient: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isMobile ? 10 : 20,
  },
  modalContent: {
    backgroundColor: THEME.surface,
    borderRadius: isMobile ? 14 : 16,
    width: isMobile ? '100%' : '60%',
    maxHeight: isMobile ? '95%' : '90%',
    maxWidth: 600,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isMobile ? 16 : 20,
    paddingVertical: isMobile ? 14 : 18,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  modalTitle: {
    fontSize: isMobile ? 17 : 20,
    fontWeight: 'bold',
    color: THEME.text,
  },
  modalBody: {
    padding: isMobile ? 16 : 20,
    maxHeight: isMobile ? 350 : 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 14,
    color: '#333',
  },
  requiredBadge: {
    fontSize: 11,
    color: '#e74c3c',
    fontWeight: '600',
    marginTop: 4,
  },
  questionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionActionBtn: {
    padding: 6,
    marginLeft: 4,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  addQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  addQuestionInput: {
    flex: 1,
    marginRight: 10,
  },
  addQuestionBtn: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
