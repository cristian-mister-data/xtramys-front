/**
 * useInAppNotification
 * 
 * Hook reutilizable que proporciona el mismo sistema de notificación toast
 * que usa "Mis Videos": un toast flotante animado en la parte superior
 * que respeta el espacio nativo (safe area) y no bloquea la pantalla.
 * 
 * Uso:
 *   const { notification, showNotification, NotificationToast } = useInAppNotification();
 *   showNotification('Mensaje de éxito', 'success');
 *   showNotification('Error!', 'error');
 *   // En el return del componente, fuera de ScrollView/FlatList:
 *   {NotificationToast}
 */
import { useState, useRef, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export function useInAppNotification() {
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' });
  const anim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const insets = useSafeAreaInsets();

  const showNotification = useCallback((message, type = 'success') => {
    // Cancelar timer anterior si existe
    if (timerRef.current) clearTimeout(timerRef.current);
    anim.stopAnimation();

    setNotification({ visible: true, message, type });

    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setNotification({ visible: false, message: '', type: 'success' });
    });
  }, [anim]);

  const topOffset = (insets?.top ?? 0) + (Platform.OS === 'android' ? 8 : 12);

  const NotificationToast = notification.visible ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { top: topOffset },
        notification.type === 'success' ? styles.success : styles.error,
        {
          opacity: anim,
          transform: [{
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0],
            }),
          }],
        },
      ]}
    >
      <Feather
        name={notification.type === 'success' ? 'check-circle' : 'alert-circle'}
        size={18}
        color="#fff"
      />
      <Text style={styles.text}>{notification.message}</Text>
    </Animated.View>
  ) : null;

  return { notification, showNotification, NotificationToast };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignSelf: 'center',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 99999,
  },
  success: {
    backgroundColor: '#10B981',
  },
  error: {
    backgroundColor: '#EF4444',
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
