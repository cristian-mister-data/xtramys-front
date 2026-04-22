import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ALERT_TYPES = {
  success: {
    color: '#10b981',
    bgLight: '#ecfdf5',
    icon: 'check-circle',
  },
  error: {
    color: '#ef4444',
    bgLight: '#fef2f2',
    icon: 'error',
  },
  warning: {
    color: '#f59e0b',
    bgLight: '#fffbeb',
    icon: 'warning',
  },
  info: {
    color: '#3b82f6',
    bgLight: '#eff6ff',
    icon: 'info',
  },
};

function getAlertType(title) {
  const lower = (title || '').toLowerCase();
  if (lower.includes('éxito') || lower.includes('success') || lower.includes('correcto')) return 'success';
  if (lower.includes('error')) return 'error';
  if (lower.includes('advertencia') || lower.includes('warning')) return 'warning';
  return 'info';
}

export default function CustomAlertModal({ visible, title = 'Error', message, onClose, onCancel, cancelText, confirmText, type }) {
  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  const alertType = type || getAlertType(title);
  const theme = ALERT_TYPES[alertType] || ALERT_TYPES.info;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 80,
      }).start();
    } else {
      scaleValue.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.modal, 
          { 
            transform: [{ scale: scaleValue }],
            width: isMobile ? '88%' : '80%',
            maxWidth: isMobile ? 360 : 420,
            padding: isMobile ? 28 : 32,
          }
        ]}>
          {/* Color accent bar */}
          <View style={[styles.accentBar, { backgroundColor: theme.color }]} />
          
          {/* Icon */}
          <View style={[
            styles.iconCircle, 
            { backgroundColor: theme.bgLight },
            isMobile && styles.iconCircleMobile
          ]}>
            <MaterialIcons name={theme.icon} size={isMobile ? 32 : 38} color={theme.color} />
          </View>
          
          <Text style={[
            styles.title, 
            { color: theme.color },
            isMobile && styles.titleMobile
          ]}>{title}</Text>
          
          <Text style={[styles.message, isMobile && styles.messageMobile]}>{message}</Text>
          
          <View style={onCancel ? styles.buttonRow : undefined}>
            {onCancel && (
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.cancelButton,
                  isMobile && styles.buttonMobile,
                  onCancel && { flex: 1 },
                ]} 
                onPress={onCancel} 
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText, isMobile && styles.buttonTextMobile]}>{cancelText || 'Cancel'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[
                styles.button, 
                { backgroundColor: theme.color },
                isMobile && styles.buttonMobile,
                onCancel && { flex: 1 },
              ]} 
              onPress={onClose} 
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, isMobile && styles.buttonTextMobile]}>{confirmText || 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    alignItems: 'center',
    elevation: 20,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }
      : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 30,
      }),
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    marginTop: 8,
  },
  iconCircleMobile: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginBottom: 14,
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  titleMobile: {
    fontSize: 19,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 2,
    lineHeight: 23,
    paddingHorizontal: 8,
  },
  messageMobile: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    minWidth: 100,
    alignItems: 'center',
    elevation: 3,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 3px 6px rgba(0,0,0,0.2)' }
      : {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      }),
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    elevation: 0,
    ...(Platform.OS !== 'web' && { shadowOpacity: 0 }),
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#64748b',
  },
  buttonMobile: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 0,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  buttonTextMobile: {
    fontSize: 14,
  },
});