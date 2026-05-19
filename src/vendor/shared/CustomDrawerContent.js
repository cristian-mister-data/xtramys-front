import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '@/utils/api';
import { BACKEND_URL } from '@/config';
import { THEME } from './ProfessionalHeader';

// MenuItem personalizado para el drawer
const MenuItem = ({ icon, iconType = 'material', label, isActive, onPress }) => {
  const IconComponent = iconType === 'ionicons' ? Ionicons :
                        iconType === 'community' ? MaterialCommunityIcons : MaterialIcons;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.menuItem, isActive && styles.menuItemActive]}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, isActive && styles.menuIconActive]}>
        <IconComponent
          name={icon}
          size={22}
          color={isActive ? '#fff' : THEME.textSecondary}
        />
      </View>
      <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
        {label}
      </Text>
      {isActive && (
        <View style={styles.activeIndicator} />
      )}
    </TouchableOpacity>
  );
};

// Separador de sección
const SectionDivider = ({ title }) => (
  <View style={styles.sectionDivider}>
    <View style={styles.dividerLine} />
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.dividerLine} />
  </View>
);

export default function CustomDrawerContent({ navigation, state, onLogout }) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [userImage, setUserImage] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const str = await AsyncStorage.getItem('usuario');
        const u = JSON.parse(str);
        setUsername(u?.nombre || '');

        if (u?.imagen) {
          setUserImage(u.imagen);
          setIsUserLoading(false);
        } else if (u?._id) {
          try {
            const response = await api.get(`${BACKEND_URL}/api/user/${u._id}`);
            const serverUser = response.data?.[0] || response.data;
            if (serverUser?.imagen) {
              setUserImage(serverUser.imagen);
              const updatedUser = { ...u, imagen: serverUser.imagen };
              await AsyncStorage.setItem('usuario', JSON.stringify(updatedUser));
            }
          } catch (err) {
            console.log('Error fetching user from server:', err);
          }
          setIsUserLoading(false);
        } else {
          setIsUserLoading(false);
        }
      } catch (error) {
        setIsUserLoading(false);
      }
    };
    loadUser();

    const interval = setInterval(async () => {
      try {
        const str = await AsyncStorage.getItem('usuario');
        if (str) {
          const u = JSON.parse(str);
          setUsername(u?.nombre || '');
          setUserImage(u?.imagen || null);
        }
      } catch (error) {
        console.log('Error refreshing user:', error);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const activeRouteName = state?.routes?.[state?.index]?.name;

  const goTo = route => {
    if (route === 'EjerciciosDrawer' || route === 'TemporadaDrawer' || route === 'EntrenamientoDrawer') {
      navigation.reset({
        index: 0,
        routes: [{ name: route }],
      });
    } else {
      navigation.navigate(route);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.drawerContainer}>
      {/* Header del Drawer con información del usuario */}
      <LinearGradient
        colors={THEME.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.drawerHeader, { paddingTop: Math.max(insets.top, 10) + 15 }]}
      >
        <View style={styles.userAvatarContainer}>
          {isUserLoading ? (
            <View style={styles.userAvatar}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : userImage ? (
            <Image
              source={{ uri: userImage }}
              style={styles.userAvatarImage}
            />
          ) : (
            <View style={styles.userAvatar}>
              <Text style={styles.avatarText}>{getInitials(username)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.drawerUsername}>{username || 'Usuario'}</Text>
      </LinearGradient>

      {/* Contenido scrollable del menú */}
      <DrawerContentScrollView
        style={styles.drawerScrollView}
        contentContainerStyle={styles.drawerScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sección Principal */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="home"
            label={t('menu.home')}
            isActive={activeRouteName === 'InicioDrawer'}
            onPress={() => goTo('InicioDrawer')}
          />
          <MenuItem
            icon="calendar-month"
            iconType="community"
            label={t('menu.season')}
            isActive={activeRouteName === 'TemporadaDrawer'}
            onPress={() => goTo('TemporadaDrawer')}
          />
          <MenuItem
            icon="emoji-events"
            label={t('menu.tournaments')}
            isActive={activeRouteName === 'TorneosDrawer'}
            onPress={() => goTo('TorneosDrawer')}
          />
          <MenuItem
            icon="people"
            label={t('menu.players')}
            isActive={activeRouteName === 'JugadoresDrawer'}
            onPress={() => goTo('JugadoresDrawer')}
          />
        </View>

        <SectionDivider title={t('menu.tools')} />

        {/* Sección Herramientas */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="clipboard-outline"
            iconType="ionicons"
            label={t('menu.tacticalBoard')}
            isActive={activeRouteName === 'PizarraDrawer'}
            onPress={() => goTo('PizarraDrawer')}
          />
          <MenuItem
            icon="fitness-center"
            label={t('menu.exercises')}
            isActive={activeRouteName === 'EjerciciosDrawer'}
            onPress={() => goTo('EjerciciosDrawer')}
          />
          <MenuItem
            icon="strategy"
            iconType="community"
            label={t('menu.strategies')}
            isActive={activeRouteName === 'EstrategiasDrawer'}
            onPress={() => goTo('EstrategiasDrawer')}
          />
          <MenuItem
            icon="videocam"
            iconType="ionicons"
            label={t('menu.myVideos')}
            isActive={activeRouteName === 'MisVideosDrawer'}
            onPress={() => goTo('MisVideosDrawer')}
          />
        </View>

        <SectionDivider title={t('menu.management')} />

        {/* Sección Gestión */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="library-books"
            label={t('menu.methodology')}
            isActive={activeRouteName === 'MetodologiaDrawer'}
            onPress={() => goTo('MetodologiaDrawer')}
          />
          <MenuItem
            icon="sports-handball"
            label={t('menu.goalkeeperMethodology')}
            isActive={activeRouteName === 'MetodologiaPorterosDrawer'}
            onPress={() => goTo('MetodologiaPorterosDrawer')}
          />
          <MenuItem
            icon="timer"
            label={t('menu.training')}
            isActive={activeRouteName === 'EntrenamientoDrawer'}
            onPress={() => goTo('EntrenamientoDrawer')}
          />
          <MenuItem
            icon="favorite"
            label={t('menu.wellness')}
            isActive={activeRouteName === 'WellnessDrawer'}
            onPress={() => goTo('WellnessDrawer')}
          />
          <MenuItem
            icon="shield"
            iconType="ionicons"
            label={t('menu.rivals')}
            isActive={activeRouteName === 'RivalesDrawer'}
            onPress={() => goTo('RivalesDrawer')}
          />
          <MenuItem
            icon="description"
            label={t('menu.matchSheets')}
            isActive={activeRouteName === 'FichasPartidoDrawer'}
            onPress={() => goTo('FichasPartidoDrawer')}
          />
        </View>

        <SectionDivider title={t('menu.analysis')} />

        {/* Sección Análisis */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="medical-services"
            label={t('menu.injuries')}
            isActive={activeRouteName === 'LesionesDrawer'}
            onPress={() => goTo('LesionesDrawer')}
          />
          <MenuItem
            icon="analytics"
            iconType="ionicons"
            label={t('menu.rivalAnalysis')}
            isActive={activeRouteName === 'AnalisisRivalDrawer'}
            onPress={() => goTo('AnalisisRivalDrawer')}
          />
          <MenuItem
            icon="body"
            iconType="ionicons"
            label={t('menu.anthropometry')}
            isActive={activeRouteName === 'AntropometriaDrawer'}
            onPress={() => goTo('AntropometriaDrawer')}
          />
          <MenuItem
            icon="bar-chart"
            iconType="ionicons"
            label={t('menu.statistics')}
            isActive={activeRouteName === 'EstadisticasDrawer'}
            onPress={() => goTo('EstadisticasDrawer')}
          />
          <MenuItem
            icon="nutrition"
            iconType="ionicons"
            label={t('menu.nutrition') || 'Nutrición'}
            isActive={activeRouteName === 'NutricionDrawer'}
            onPress={() => goTo('NutricionDrawer')}
          />
          <MenuItem
            icon="shield-checkmark"
            iconType="ionicons"
            label={t('menu.injuryPrevention')}
            isActive={activeRouteName === 'PrevencionLesionesDrawer'}
            onPress={() => goTo('PrevencionLesionesDrawer')}
          />
        </View>

        {/* Espaciador */}
        <View style={{ flex: 1, minHeight: 20 }} />
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={styles.drawerFooter}>
        {onLogout && (
          <TouchableOpacity
            onPress={onLogout}
            style={styles.logoutButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="logout" size={20} color={THEME.error} />
            <Text style={styles.logoutText}>{t('menu.logout', 'Cerrar sesión')}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.versionText}>Xtramys v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Drawer Styles
  drawerContainer: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  drawerHeader: {
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomRightRadius: 30,
  },
  userAvatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  userAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  userAvatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: THEME.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.success,
    borderWidth: 3,
    borderColor: '#fff',
  },
  drawerUsername: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  drawerEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  drawerLogo: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 45 : 55,
    right: 20,
    width: 45,
    height: 45,
    resizeMode: 'contain',
    opacity: 0.9,
  },
  drawerScrollView: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingTop: 10,
    paddingBottom: 10,
  },

  // Menu Items
  menuSection: {
    paddingHorizontal: 12,
    marginBottom: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: THEME.primary + '15',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuIconActive: {
    backgroundColor: THEME.primary,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: THEME.text,
  },
  menuLabelActive: {
    fontWeight: '700',
    color: THEME.primary,
  },
  activeIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    backgroundColor: THEME.primary,
    position: 'absolute',
    right: 0,
  },

  // Section Divider
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 10,
  },

  // Footer
  drawerFooter: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: THEME.error + '10',
    marginBottom: 10,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.error,
    marginLeft: 12,
  },
  versionText: {
    fontSize: 11,
    color: THEME.textSecondary,
    textAlign: 'center',
  },
});
