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
import SectionHeader from '@/ui/SectionHeader';

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
  flex: 1;
  min-height: 0;
  width: 100%;
  border-radius: ${({ $fullscreen, theme }) => ($fullscreen ? '0' : theme.radius.lg)};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background};
  color-scheme: ${({ $themed, theme }) =>
    $themed ? (theme.mode === 'dark' ? 'dark' : 'light') : 'light'};
  border: 1px solid
    ${({ $fullscreen, theme }) =>
      $fullscreen ? 'transparent' : theme.mode === 'dark' ? theme.colors.border : 'transparent'};
  box-shadow: ${({ $fullscreen, theme }) =>
    $fullscreen ? 'none' : theme.mode === 'dark' ? theme.shadows.lg : theme.shadows.sm};
  display: flex;
  flex-direction: column;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    border-radius: ${({ $fullscreen, theme }) => ($fullscreen ? '0' : theme.radius.md)};
    border-color: transparent;
    box-shadow: none;
  }
`;

const PageStack = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 16px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    gap: 12px;
  }
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

export default function RNWebPage({
  children,
  themed = false,
  fullscreen = false,
  title,
  subtitle,
  eyebrow,
  icon,
  actions,
  meta,
  header,
}) {
  const headerNode = header || (title ? (
    <SectionHeader
      title={title}
      subtitle={subtitle}
      eyebrow={eyebrow}
      icon={icon}
      actions={actions}
      meta={meta}
    />
  ) : null);

  const frame = (
    <Frame $themed={themed} $fullscreen={fullscreen} $hasHeader={!!headerNode}>
      <InvertLayer $themed={themed}>
        <SafeAreaProvider style={fillStyle}>
          <GestureHandlerRootView style={fillStyle}>
            {children}
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </InvertLayer>
    </Frame>
  );

  if (!headerNode || fullscreen) return frame;

  return (
    <PageStack>
      {headerNode}
      {frame}
    </PageStack>
  );
}
