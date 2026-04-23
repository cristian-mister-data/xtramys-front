/**
 * Wrapper común para páginas que montan componentes RN del proyecto móvil.
 *
 * - Provee SafeAreaProvider + GestureHandlerRootView ocupando 100%.
 * - Modo oscuro: aplica filtro de inversión inteligente (invert + hue-rotate)
 *   al contenido vendor (que tiene colores claros hardcoded), y contra-invierte
 *   imágenes/vídeos/canvas/iframes para que se vean correctos.
 *   Esta técnica es el estándar para retrofitear dark mode sobre contenido legacy
 *   sin tocar miles de líneas de estilos RN.
 */
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import styled, { css } from 'styled-components';

const fillStyle = { flex: 1, width: '100%', height: '100%' };

// Selector de elementos que NO deben invertirse (deben verse con sus colores reales).
const RAW_MEDIA = `
  img,
  video,
  canvas,
  iframe,
  svg image,
  [data-no-invert],
  [style*="background-image"],
  [style*="rgba(0, 0, 0"],
  [style*="rgba(0,0,0"]
`;

const darkInvert = css`
  /* Inversión perceptual: invert + hue-rotate preserva matices,
     solo invierte luminosidad (blanco↔negro, claro↔oscuro). */
  filter: invert(0.92) hue-rotate(180deg);

  /* Contra-invertimos contenido visual para que se vea natural */
  ${RAW_MEDIA} {
    filter: invert(1) hue-rotate(180deg);
  }
`;

const Frame = styled.div`
  width: 100%;
  height: 100%;
  min-height: calc(100dvh - 60px - 48px);
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
  background: #f8fafc;
  color-scheme: light;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? theme.colors.border : 'transparent'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? theme.shadows.lg : theme.shadows.sm};
  display: flex;
  flex-direction: column;

  ${({ theme }) => theme.mode === 'dark' && darkInvert}
`;

export default function RNWebPage({ children }) {
  return (
    <Frame>
      <SafeAreaProvider style={fillStyle}>
        <GestureHandlerRootView style={fillStyle}>
          {children}
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Frame>
  );
}
