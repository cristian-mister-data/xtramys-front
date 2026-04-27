import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '@/utils/api';
import { BACKEND_URL } from '@/config';

// Logo de la aplicación
import APP_LOGO from '../../images/xtramys.webp';

// Colores del tema profesional - exportados para uso en otros componentes
export const THEME = {
  primary: '#1a237e',       // Azul oscuro profundo
  primaryLight: '#3949ab',  // Azul medio
  secondary: '#00bcd4',     // Cyan vibrante
  accent: '#ff6b35',        // Naranja energético
  background: '#f8fafc',    // Gris muy claro
  backgroundAlt: '#f1f5f9', // Gris ligeramente más oscuro (para inputs/dropdowns)
  surface: '#ffffff',       // Blanco
  text: '#1e293b',          // Casi negro
  textSecondary: '#64748b', // Gris medio
  textMuted: '#94a3b8',     // Gris claro
  border: '#e2e8f0',        // Gris claro
  inputBg: '#f8fafc',       // Fondo de inputs
  success: '#10b981',       // Verde
  warning: '#f59e0b',       // Amarillo
  error: '#ef4444',         // Rojo
  danger: '#ef4444',        // Alias de error
  gradient: ['#1a237e', '#3949ab', '#5c6bc0'], // Gradiente azul
};

/**
 * Componente de Header Profesional reutilizable
 * @param {object} navigation - Objeto de navegación de React Navigation
 * @param {string} title - Título a mostrar en el header
 * @param {boolean} showBack - Si es true, muestra botón de volver. Si es false, muestra botón de menú
 * @param {boolean} showProfile - Si es true, muestra el botón de perfil. Por defecto true
 * @param {function} onBackPress - Función personalizada para el botón de volver
 * @param {object} rightComponent - Componente personalizado para la derecha
 */
export default function ProfessionalHeader({ 
  navigation, 
  title, 
  showBack = false, 
  showMenu = true,
  showProfile = true,
  onBackPress,
  rightComponent 
}) {
  const insets = useSafeAreaInsets();
  const [userImage, setUserImage] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(true);

  useEffect(() => {
    const loadUserImage = async () => {
      try {
        const str = await AsyncStorage.getItem('usuario');
        if (str) {
          const user = JSON.parse(str);
          
          // Si hay imagen en el storage local, usarla
          if (user?.imagen) {
            setUserImage(user.imagen);
            setIsImageLoading(false);
          } else if (user?._id) {
            // Si no hay imagen local, intentar obtener del servidor
            try {
              const response = await api.get(`${BACKEND_URL}/api/user/${user._id}`);
              const serverUser = response.data?.[0] || response.data;
              if (serverUser?.imagen) {
                setUserImage(serverUser.imagen);
                // Actualizar AsyncStorage con la imagen del servidor
                const updatedUser = { ...user, imagen: serverUser.imagen };
                await AsyncStorage.setItem('usuario', JSON.stringify(updatedUser));
              }
            } catch (err) {
              console.log('Error fetching user from server:', err);
            }
            setIsImageLoading(false);
          } else {
            setIsImageLoading(false);
          }
        } else {
          setIsImageLoading(false);
        }
      } catch (error) {
        console.log('Error loading user image:', error);
        setIsImageLoading(false);
      }
    };
    loadUserImage();

    // Escuchar cambios en el storage para actualizar la imagen
    const interval = setInterval(async () => {
      try {
        const str = await AsyncStorage.getItem('usuario');
        if (str) {
          const user = JSON.parse(str);
          setUserImage(user?.imagen || null);
        }
      } catch (error) {
        console.log('Error refreshing user image:', error);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <LinearGradient
      colors={THEME.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 0) + 14 }]}
    >
      <View style={styles.headerContent}>
        {/* Botón izquierdo - Menú o Volver */}
        {showBack ? (
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ) : showMenu ? (
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="menu" size={26} color="#fff" />
          </TouchableOpacity>
        ) : null}

        {/* Logo central - Enlace a Home */}
        <View style={styles.logoContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('InicioDrawer')}
            activeOpacity={0.8}
          >
          <View style={styles.logoBackground}>
            <Image 
              source={{ uri: APP_LOGO }} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          </TouchableOpacity>
        </View>

        {/* Botón derecho - Perfil o componente personalizado */}
        {rightComponent ? (
          rightComponent
        ) : showMenu && showProfile ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('perfil')}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            {isImageLoading ? (
              <View style={styles.profileIconContainer}>
                <ActivityIndicator size="small" color={THEME.primary} />
              </View>
            ) : userImage ? (
              <Image 
                source={{ uri: userImage }} 
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileIconContainer}>
                <Ionicons name="person" size={20} color={THEME.primary} />
              </View>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  logoBackground: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  headerLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
  },
});
