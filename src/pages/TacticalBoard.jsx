import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import styled from 'styled-components';
import Field from '@/vendor/tacticalBoard/field';
import RotatePrompt from '@/features/tacticalBoard/RotatePrompt';

const fillStyle = { flex: 1, width: '100%', height: '100%' };

const MobileSafeWrap = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  @media (max-width: 1280px) {
    /* Asegura que el área inferior sea visible en móvil con notch/home indicator */
    padding-bottom: env(safe-area-inset-bottom, 0px);
    min-height: -webkit-fill-available;
  }
`;

export default function TacticalBoardPage() {
  return (
    <MobileSafeWrap>
      <RotatePrompt />
      <SafeAreaProvider style={fillStyle}>
        <GestureHandlerRootView style={fillStyle}>
          <Field sandbox />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </MobileSafeWrap>
  );
}
