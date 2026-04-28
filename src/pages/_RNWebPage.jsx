/**
 * Wrapper común para páginas que montan componentes RN del proyecto móvil.
 *
 * - Provee SafeAreaProvider + GestureHandlerRootView ocupando 100%.
 * - Por defecto: en modo oscuro aplica filtro de inversión inteligente
 *   (invert + hue-rotate) al contenido vendor, contra-invirtiendo media.
 *   Útil para retrofitear dark mode sobre contenido legacy con colores
 *   claros hardcoded sin tocar miles de líneas de estilos RN.
 * - `themed` prop: si la página vendor ya usa `useTheme()` + `makeStyles(theme)`
 *   con tokens reales, debe OPT-OUT del filtro pasando `<RNWebPage themed>`.
 *   En ese caso el frame usa `theme.colors.background` y NO aplica invert.
 */
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import styled, { css } from 'styled-components';

const fillStyle = { flex: 1, width: '100%', height: '100%' };

// Elementos que NO deben invertirse (deben verse con sus colores reales).
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
  /* Inversión perceptual: invert(1) + hue-rotate(180deg) invierte
     únicamente la luminosidad y preserva los matices (azules siguen
     siendo azules). Valores como 0.92 producen verdes fluorescentes
     al desplazar la saturación de los azules. */
  filter: invert(1) hue-rotate(180deg);

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
  background: ${({ theme }) => theme.colors.background};
  color-scheme: ${({ $themed, theme }) =>
    $themed ? (theme.mode === 'dark' ? 'dark' : 'light') : 'light'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? theme.colors.border : 'transparent'};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? theme.shadows.lg : theme.shadows.sm};
  display: flex;
  flex-direction: column;
`;

const InvertLayer = styled.div`
  flex: 1;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  ${({ theme, $themed }) =>
    !$themed && theme.mode === 'dark' && darkInvert}
`;

export default function RNWebPage({ children, themed = false }) {
  return (
    <Frame $themed={themed}>
      <InvertLayer $themed={themed}>
        <SafeAreaProvider style={fillStyle}>
          <GestureHandlerRootView style={fillStyle}>
            {children}
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </InvertLayer>
    </Frame>
  );
}
