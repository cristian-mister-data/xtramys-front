import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';

export default function TrainingSessionPdfFormatPicker({ visible, onClose, onSelect }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [blackAndWhite, setBlackAndWhite] = useState(false);
  const options = [
    {
      format: 'complete',
      icon: 'file-text',
      title: t('session.pdfComplete', 'PDF completo'),
      description: t(
        'session.pdfCompleteDescription',
        'El documento actual con el resumen de la sesión, asistencia y todos los ejercicios.',
      ),
    },
    {
      format: 'print',
      icon: 'printer',
      title: t('session.pdfPrint', 'PDF para el campo'),
      description: t(
        'session.pdfPrintDescription',
        'A4 horizontal, una página por ejercicio. Información arriba y gráfico grande debajo, listo para imprimir.',
      ),
    },
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: 'rgba(15,23,42,0.55)',
        }}
      >
        <TouchableOpacity
          accessibilityLabel={t('common.cancel', 'Cancelar')}
          onPress={onClose}
          activeOpacity={1}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 480,
            maxHeight: '90%',
            backgroundColor: colors.surface,
            borderRadius: 20,
          }}
        >
          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 21, fontWeight: '700', color: colors.text, marginBottom: 6 }}
            >
              {t('session.pdfChooseFormat', 'Descargar entrenamiento')}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                lineHeight: 20,
                marginBottom: 20,
              }}
            >
              {t(
                'session.pdfChooseFormatDescription',
                'Elige el formato que necesitas para esta sesión.',
              )}
            </Text>
            {options.map((option) => (
              <TouchableOpacity
                key={option.format}
                accessibilityRole="button"
                onPress={() => onSelect(option.format, option.format === 'print' && blackAndWhite)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <Feather name={option.icon} size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }}
                  >
                    {option.title}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
                    {option.description}
                  </Text>
                </View>
                <Feather name="download" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: blackAndWhite }}
              onPress={() => setBlackAndWhite((value) => !value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 8,
                marginTop: -4,
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  borderWidth: 1.5,
                  borderColor: blackAndWhite ? colors.primary : colors.border,
                  backgroundColor: blackAndWhite ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {blackAndWhite && <Feather name="check" size={14} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                  {t('session.pdfBlackAndWhite', 'Campo en blanco y negro')}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {t(
                    'session.pdfBlackAndWhiteDescription',
                    'Convierte el gráfico a escala de grises para ahorrar tinta.',
                  )}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onClose}
              style={{ alignSelf: 'center', padding: 10 }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>
                {t('common.cancel', 'Cancelar')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
