import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from 'styled-components';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { generateScoutingPdf } from '@/vendor/scouting/pdf';
import { toast } from '@/ui/toast';

const FIELD_LABELS = {
  // Técnica
  control: 'Control',
  pase: 'Pase',
  conduccion: 'Conducción',
  regate: 'Regate',
  tiro: 'Tiro',
  juegoAereo: 'Juego aéreo',

  // Física
  velocidad: 'Velocidad',
  resistencia: 'Resistencia',
  fuerza: 'Fuerza',
  agilidad: 'Agilidad',

  // Táctica
  posicionamiento: 'Posicionamiento',
  tomaDecisiones: 'Toma de decisiones',
  visionJuego: 'Visión de juego',
  trabajoDefensivo: 'Trabajo defensivo',

  // Mental
  actitud: 'Actitud',
  esfuerzo: 'Esfuerzo',
  concentracion: 'Concentración',
  comunicacion: 'Comunicación',
  liderazgo: 'Liderazgo',
};

const scoreLabel = (field) => FIELD_LABELS[field] || field.charAt(0).toUpperCase() + field.slice(1);

function getFootLabel(foot) {
  switch (foot?.toLowerCase()) {
    case 'derecho':
      return 'Derecho';
    case 'izquierdo':
      return 'Izquierdo';
    case 'ambos':
      return 'Ambos (Ambidiextro)';
    default:
      return foot || 'Sin definir';
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
};

function getRecommendationLabel(val) {
  switch (val) {
    case 'muy_recomendable':
      return 'Muy recomendable';
    case 'seguir_observando':
      return 'Seguir observando';
    case 'no_recomendado':
      return 'No recomendado';
    default:
      return val || '—';
  }
}

function getPotentialLabel(val) {
  switch (val) {
    case 'bajo':
      return 'Bajo';
    case 'medio':
      return 'Medio';
    case 'alto':
      return 'Alto';
    default:
      return val || '—';
  }
}

export default function ScoutingDetailModal({
  visible,
  open, // Soporte para visible u open
  onClose,
  report,
  onEdit,
  onDelete,
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width: screenWidth } = useWindowDimensions();
  const IS_TABLET = screenWidth > 700;
  const [generating, setGenerating] = useState(false);

  const isOpen = visible || open;
  if (!isOpen || !report) return null;

  const handleExportPdf = async () => {
    setGenerating(true);
    try {
      await generateScoutingPdf(report, t);
      toast.success(t('exercise.pdfGenerated', 'PDF generado correctamente'));
    } catch (err) {
      toast.error(err.message || t('exercise.pdfGenerateError', 'No se pudo generar el PDF'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={IS_TABLET ? styles.viewModalContentTablet : styles.viewModalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalle de Scouting</Text>
            <View style={styles.headerActions}>
              {onEdit && (
                <TouchableOpacity
                  style={[styles.headerActionBtn, { backgroundColor: theme.colors.primarySoft }]}
                  onPress={() => {
                    onClose();
                    onEdit(report);
                  }}
                >
                  <Ionicons name="pencil" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={[styles.headerActionBtn, { backgroundColor: theme.colors.errorSoft }]}
                  onPress={() => {
                    onClose();
                    onDelete(report);
                  }}
                >
                  <Ionicons name="trash" size={18} color={theme.colors.error} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Player Info Card */}
            <View style={styles.playerCard}>
              <View style={styles.playerMainInfo}>
                <Text style={styles.playerName}>{report.playerName}</Text>
                <Text style={styles.playerSub}>
                  {[report.position, report.playerTeam].filter(Boolean).join(' - ') ||
                    'Sin posición/equipo'}
                </Text>
                <Text style={styles.playerMeta}>
                  {[
                    report.age ? `${report.age} años` : null,
                    `Pie: ${getFootLabel(report.dominantFoot)}`,
                    report.observationDate ? `Fecha: ${formatDate(report.observationDate)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' | ')}
                </Text>
                {(report.rival || report.competition) && (
                  <Text style={[styles.playerMeta, { marginTop: 2, fontWeight: '500' }]}>
                    {[
                      report.rival ? `Rival: ${report.rival}` : null,
                      report.competition ? `Competición: ${report.competition}` : null,
                    ]
                      .filter(Boolean)
                      .join(' | ')}
                  </Text>
                )}
              </View>
              {report.rating && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={18} color="#eab308" />
                  <Text style={styles.ratingText}>{report.rating}/10</Text>
                </View>
              )}
            </View>

            {/* General Info Grid */}
            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Recomendación</Text>
                <Text style={styles.infoValue}>
                  {getRecommendationLabel(report.recommendation)}
                </Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Potencial</Text>
                <Text style={styles.infoValue}>{getPotentialLabel(report.potential)}</Text>
              </View>
            </View>

            {/* Tags */}
            {report.tags && report.tags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tags</Text>
                <View style={styles.tagList}>
                  {report.tags.map((tag) => (
                    <View key={tag} style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Strengths & Improvements */}
            {report.strengths ? (
              <View
                style={[styles.section, styles.cardAlt, { borderLeftColor: theme.colors.success }]}
              >
                <Text style={[styles.cardTitle, { color: theme.colors.success }]}>
                  💪 Fortalezas
                </Text>
                <Text style={styles.cardText}>{report.strengths}</Text>
              </View>
            ) : null}

            {report.improvements ? (
              <View
                style={[styles.section, styles.cardAlt, { borderLeftColor: theme.colors.error }]}
              >
                <Text style={[styles.cardTitle, { color: theme.colors.error }]}>
                  📈 Aspectos a mejorar
                </Text>
                <Text style={styles.cardText}>{report.improvements}</Text>
              </View>
            ) : null}

            {/* Ratings Breakdown Grid */}
            <View style={styles.ratingsGrid}>
              {Object.entries({
                Técnica: report.technical,
                Física: report.physical,
                Táctica: report.tactical,
                Mental: report.mental,
              }).map(([category, scores]) => {
                if (!scores) return null;
                const entries = Object.entries(scores).filter(([_, v]) => v !== null && v !== '');
                if (entries.length === 0) return null;

                return (
                  <View key={category} style={styles.ratingCard}>
                    <Text style={styles.ratingCardTitle}>{category}</Text>
                    {entries.map(([field, score]) => (
                      <View key={field} style={styles.ratingRow}>
                        <Text style={styles.ratingLabel}>{scoreLabel(field)}</Text>
                        <Text style={styles.ratingScore}>{score}/10</Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>

            {/* Observations */}
            {report.observations ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Observaciones</Text>
                <View style={styles.obsCard}>
                  <Text style={styles.obsText}>{report.observations}</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.pdfFooterBtn, generating && { opacity: 0.6 }]}
              onPress={handleExportPdf}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons name="document-text" size={18} color={theme.colors.primary} />
              )}
              <Text style={styles.pdfFooterBtnText}>
                {generating ? 'Generando...' : 'Exportar PDF'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose}>
              <Text style={styles.closeFooterBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme) =>
  StyleSheet.create({
    modalBg: {
      flex: 1,
      backgroundColor: theme.colors.overlay || 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    viewModalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      width: '100%',
      maxWidth: 550,
      maxHeight: '92%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 20,
    },
    viewModalContentTablet: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      width: '90%',
      maxWidth: 700,
      maxHeight: '92%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerActionBtn: {
      padding: 8,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCloseBtn: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.backgroundAlt,
    },
    modalBody: {
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    playerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.primarySoft,
      padding: 20,
      borderRadius: 16,
      marginBottom: 20,
    },
    playerMainInfo: {
      flex: 1,
    },
    playerName: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    playerSub: {
      fontSize: 14,
      color: theme.colors.text,
      marginTop: 4,
      fontWeight: '500',
    },
    playerMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#fef08a',
    },
    ratingText: {
      fontSize: 16,
      fontWeight: '800',
      color: '#a16207',
    },
    infoGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    infoCard: {
      flex: 1,
      backgroundColor: theme.colors.backgroundAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      borderRadius: 12,
    },
    infoLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    infoValue: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
      marginTop: 4,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    tagList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    tagBadge: {
      backgroundColor: theme.colors.primarySoft,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    tagBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    cardAlt: {
      backgroundColor: theme.colors.backgroundAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderLeftWidth: 4,
      padding: 16,
      borderRadius: 12,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    cardText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    ratingsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 20,
    },
    ratingCard: {
      flex: 1,
      minWidth: 200,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      borderRadius: 12,
    },
    ratingCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      marginBottom: 10,
      textTransform: 'uppercase',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingBottom: 6,
    },
    ratingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 4,
    },
    ratingLabel: {
      fontSize: 13,
      color: theme.colors.text,
    },
    ratingScore: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    obsCard: {
      backgroundColor: theme.colors.backgroundAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      borderRadius: 12,
    },
    obsText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 22,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    pdfFooterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.primarySoft,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    pdfFooterBtnText: {
      color: theme.colors.primary,
      fontWeight: 'bold',
      fontSize: 14,
    },
    closeFooterBtn: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
    },
    closeFooterBtnText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 14,
    },
  });
