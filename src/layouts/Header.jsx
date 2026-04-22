import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ProfessionalHeader from '@/vendor/shared/ProfessionalHeader';
import { resolveScreen } from '@/shims/react-navigation-native';

const Bar = styled.header`
  grid-area: header;
  z-index: ${({ theme }) => theme.zIndex.sticky};
  display: flex;
  flex-direction: column;
`;

const fillStyle = { width: '100%' };

function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

export default function Header({ onMenu }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const navigation = useMemo(() => ({
    navigate: (name, params) => navigate(resolveScreen(name), { state: params }),
    goBack: () => navigate(-1),
    push: (name, params) => navigate(resolveScreen(name), { state: params }),
    replace: (name, params) => navigate(resolveScreen(name), { replace: true, state: params }),
    openDrawer: () => onMenu && onMenu(),
    closeDrawer: () => {},
    dispatch: () => {},
  }), [navigate, onMenu]);

  return (
    <Bar>
      <SafeAreaProvider style={fillStyle}>
        <GestureHandlerRootView style={fillStyle}>
          <ProfessionalHeader navigation={navigation} showMenu={isMobile} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Bar>
  );
}
