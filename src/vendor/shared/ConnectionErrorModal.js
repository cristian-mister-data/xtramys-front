import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNetwork, NETWORK_ERROR_TYPES } from '@/utils/NetworkContext';

const ERROR_CONFIG = {
  [NETWORK_ERROR_TYPES.OFFLINE]: {
    icon: 'wifi-off',
    color: '#ef4444',
    bgLight: '#fef2f2',
    accentColor: '#dc2626',
  },
  [NETWORK_ERROR_TYPES.TIMEOUT]: {
    icon: 'timer-off',
    color: '#f59e0b',
    bgLight: '#fffbeb',
    accentColor: '#d97706',
  },
  [NETWORK_ERROR_TYPES.SERVER_ERROR]: {
    icon: 'cloud-off',
    color: '#8b5cf6',
    bgLight: '#f5f3ff',
    accentColor: '#7c3aed',
  },
  [NETWORK_ERROR_TYPES.SESSION_EXPIRED]: {
    icon: 'lock-outline',
    color: '#3b82f6',
    bgLight: '#eff6ff',
    accentColor: '#2563eb',
  },
};

export default function ConnectionErrorModal() {
  const { t } = useTranslation();
  const { networkError, isVisible, reloadApp, handleSessionExpired, dismissError } = useNetwork();
  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;

  React.useEffect(() => {
    if (isVisible) {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 80,
      }).start();
    } else {
      scaleValue.setValue(0);
    }
  }, [isVisible]);

  if (!networkError) return null;

  const errorType = networkError.type || NETWORK_ERROR_TYPES.OFFLINE;
  const config = ERROR_CONFIG[errorType] || ERROR_CONFIG[NETWORK_ERROR_TYPES.OFFLINE];
  const isSessionExpired = errorType === NETWORK_ERROR_TYPES.SESSION_EXPIRED;

  const getTitle = () => {
    switch (errorType) {
      case NETWORK_ERROR_TYPES.OFFLINE:
        return t('connection.offlineTitle', 'Sin conexión');
      case NETWORK_ERROR_TYPES.TIMEOUT:
        return t('connection.timeoutTitle', 'Conexión lenta');
      case NETWORK_ERROR_TYPES.SERVER_ERROR:
        return t('connection.serverErrorTitle', 'Error del servidor');
      case NETWORK_ERROR_TYPES.SESSION_EXPIRED:
        return t('connection.sessionExpiredTitle', 'Sesión expirada');
      default:
        return t('connection.errorTitle', 'Error de conexión');
    }
  };

  const getMessage = () => {
    switch (errorType) {
      case NETWORK_ERROR_TYPES.OFFLINE:
        return t('connection.offlineMessage', 'No se pudo conectar con el servidor. Comprueba tu conexión a internet e inténtalo de nuevo.');
      case NETWORK_ERROR_TYPES.TIMEOUT:
        return t('connection.timeoutMessage', 'La petición ha tardado demasiado. Comprueba tu conexión e inténtalo de nuevo.');
      case NETWORK_ERROR_TYPES.SERVER_ERROR:
        return t('connection.serverErrorMessage', 'El servidor no está disponible en este momento. Inténtalo de nuevo en unos minutos.');
      case NETWORK_ERROR_TYPES.SESSION_EXPIRED:
        return t('connection.sessionExpiredMessage', 'Tu sesión ha caducado. Por favor, vuelve a iniciar sesión.');
      default:
        return t('connection.errorMessage', 'Ha ocurrido un error de conexión. Inténtalo de nuevo.');
    }
  };

  const handlePrimaryAction = () => {
    if (isSessionExpired) {
      handleSessionExpired();
    } else {
      reloadApp();
    }
  };

  const primaryButtonText = isSessionExpired
    ? t('connection.login', 'Iniciar sesión')
    : t('connection.reload', 'Recargar');

  return (
    <Modal
      animationType="fade"
      transparent
      visible={isVisible}
      onRequestClose={dismissError}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.modal,
          {
            transform: [{ scale: scaleValue }],
            width: isMobile ? '88%' : '80%',
            maxWidth: isMobile ? 380 : 440,
            padding: isMobile ? 28 : 36,
          }
        ]}>
          {/* Barra de acento superior */}
          <View style={[styles.accentBar, { backgroundColor: config.accentColor }]} />

          {/* Icono animado */}
          <View style={[
            styles.iconCircle,
            { backgroundColor: config.bgLight },
            isMobile && styles.iconCircleMobile,
          ]}>
            <MaterialIcons name={config.icon} size={isMobile ? 36 : 44} color={config.color} />
          </View>

          {/* Título */}
          <Text style={[
            styles.title,
            { color: config.color },
            isMobile && styles.titleMobile,
          ]}>
            {getTitle()}
          </Text>

          {/* Mensaje */}
          <Text style={[styles.message, isMobile && styles.messageMobile]}>
            {getMessage()}
          </Text>

          {/* Botones */}
          <View style={styles.buttonContainer}>
            {!isSessionExpired && (
              <TouchableOpacity
                style={[styles.secondaryButton, isMobile && styles.buttonMobile]}
                onPress={dismissError}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryButtonText, isMobile && styles.buttonTextMobile]}>
                  {t('connection.dismiss', 'Cerrar')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: config.accentColor },
                isMobile && styles.buttonMobile,
                isSessionExpired && { flex: 1 },
              ]}
              onPress={handlePrimaryAction}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={isSessionExpired ? 'login' : 'refresh'}
                size={18}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.primaryButtonText, isMobile && styles.buttonTextMobile]}>
                {primaryButtonText}
              </Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 22,
    alignItems: 'center',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  iconCircleMobile: {
    width: 66,
    height: 66,
    borderRadius: 33,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  titleMobile: {
    fontSize: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  messageMobile: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.4,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 15,
  },
  buttonMobile: {
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  buttonTextMobile: {
    fontSize: 14,
  },
});
