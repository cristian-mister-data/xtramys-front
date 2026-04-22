import { useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomDrawerContent from '@/vendor/shared/CustomDrawerContent';
import { resolveScreen } from '@/shims/react-navigation-native';
import { logoutThunk } from '@/store/slices/user/userThunks';

const Aside = styled.aside`
  grid-area: sidebar;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: ${({ theme }) => theme.zIndex.drawer};

  @media (max-width: 900px) {
    position: fixed;
    inset: 0 auto 0 0;
    width: 280px;
    transform: translateX(${({ $open }) => ($open ? '0' : '-100%')});
    transition: transform 0.2s ease;
    box-shadow: ${({ $open }) => ($open ? '0 8px 24px rgba(0,0,0,0.25)' : 'none')};
  }
`;

const Backdrop = styled.div`
  display: none;
  @media (max-width: 900px) {
    display: ${({ $open }) => ($open ? 'block' : 'none')};
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: ${({ theme }) => theme.zIndex.drawer - 1};
  }
`;

const fillStyle = { flex: 1, width: '100%', height: '100%' };

// Mapeo inverso path web → nombre ruta drawer (para resaltar item activo)
const PATH_TO_DRAWER = {
  '/': 'InicioDrawer',
  '/season': 'TemporadaDrawer',
  '/season/create': 'CrearTemporadaDrawer',
  '/tournaments': 'TorneosDrawer',
  '/players': 'JugadoresDrawer',
  '/training': 'EntrenamientoDrawer',
  '/match-sheets': 'FichasPartidoDrawer',
  '/injuries': 'LesionesDrawer',
  '/injury-prevention': 'PrevencionLesionesDrawer',
  '/exercises': 'EjerciciosDrawer',
  '/strategies': 'EstrategiasDrawer',
  '/tactical-board': 'PizarraDrawer',
  '/rivals': 'RivalesDrawer',
  '/rival-analysis': 'AnalisisRivalDrawer',
  '/my-videos': 'MisVideosDrawer',
  '/video-editor': 'VideoEditorDrawer',
  '/methodology': 'MetodologiaDrawer',
  '/goalkeeper-methodology': 'MetodologiaPorterosDrawer',
  '/wellness': 'WellnessDrawer',
  '/anthropometry': 'AntropometriaDrawer',
  '/statistics': 'EstadisticasDrawer',
  '/nutrition': 'NutricionDrawer',
};

function resolveActiveDrawer(pathname) {
  if (PATH_TO_DRAWER[pathname]) return PATH_TO_DRAWER[pathname];
  // Match por prefijo (rutas con subpaths)
  const candidates = Object.keys(PATH_TO_DRAWER)
    .filter((p) => p !== '/' && pathname.startsWith(p))
    .sort((a, b) => b.length - a.length);
  if (candidates.length) return PATH_TO_DRAWER[candidates[0]];
  return 'InicioDrawer';
}

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const navigation = useMemo(() => ({
    navigate: (name, params) => {
      navigate(resolveScreen(name), { state: params });
      onClose && onClose();
    },
    reset: ({ routes }) => {
      const target = routes?.[0]?.name;
      if (target) {
        navigate(resolveScreen(target), { replace: true });
        onClose && onClose();
      }
    },
    goBack: () => navigate(-1),
    push: (name, params) => navigate(resolveScreen(name), { state: params }),
    replace: (name, params) => navigate(resolveScreen(name), { replace: true, state: params }),
    closeDrawer: () => onClose && onClose(),
    openDrawer: () => {},
    dispatch: () => {},
  }), [navigate, onClose]);

  const state = useMemo(() => {
    const name = resolveActiveDrawer(location.pathname);
    return { index: 0, routes: [{ name }] };
  }, [location.pathname]);

  const handleLogout = async () => {
    onClose && onClose();
    await dispatch(logoutThunk());
    navigate('/auth/welcome', { replace: true });
  };

  return (
    <>
      <Backdrop $open={open} onClick={onClose} />
      <Aside $open={open}>
        <SafeAreaProvider style={fillStyle}>
          <GestureHandlerRootView style={fillStyle}>
            <CustomDrawerContent
              navigation={navigation}
              state={state}
              onLogout={handleLogout}
            />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </Aside>
    </>
  );
}
