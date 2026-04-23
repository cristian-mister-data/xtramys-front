import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html, body, #root { height: 100%; margin: 0; padding: 0; }

  html {
    color-scheme: ${({ theme }) => theme.mode};
  }

  body {
    font-family: ${({ theme }) => theme.fonts.body};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: background-color 200ms ease, color 200ms ease;
  }

  a { color: inherit; text-decoration: none; }

  button {
    font: inherit;
    cursor: pointer;
    border: none;
    background: none;
    color: inherit;
  }

  input, textarea, select {
    font: inherit;
    color: inherit;
  }

  img { max-width: 100%; display: block; }

  /* Scrollbar discreta theme-aware */
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.borderStrong};
    border-radius: 6px;
    border: 2px solid ${({ theme }) => theme.colors.background};
  }
  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.textMuted};
  }
  ::-webkit-scrollbar-track { background: transparent; }

  ::selection {
    background: ${({ theme }) => theme.colors.primary}55;
    color: ${({ theme }) => theme.colors.text};
  }

  /* Focus visible accesible y theme-aware */
  :focus { outline: none; }
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* Respeta preferencia de movimiento reducido */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* =========================================================
     PORTALES RN-Web (Modal, etc.):
     RN-Web ModalPortal crea un <div> "bare" (sin atributos,
     sin position, sin z-index) directamente en <body> AL
     MONTAR el componente, INCLUSO con visible={false}. Si la
     pantalla declara varios <Modal> siempre montados (típico
     en MatchSheets: optionsModal, mobileMenuModal, filtersModal,
     detailModal), hay 4+ wrappers permanentes en <body>.

     Estos wrappers, aunque vacíos visualmente, pueden capturar
     eventos de puntero y robar los clicks a los modales propios
     (Modal.jsx) que se montan después. Por eso los neutralizamos
     en AMBOS temas con pointer-events: none — los hijos reales
     (ModalAnimation/ModalContent) que sí necesitan interacción
     restablecen pointer-events: auto vía sus propios estilos
     inline cuando visible=true.

     Excluimos [data-theme-aware] para portales propios
     (Modal.jsx) que ya gestionan su position/z-index/eventos.

     Adicionalmente, en modo OSCURO, aplicamos un CSS filter al
     wrapper para invertir colores. CSS filter crea un
     containing block para descendientes con position:fixed, lo
     que rompería la posición del ModalContent (colapsaría al
     fondo del wrapper bare de altura 0). Por eso, SOLO en dark
     mode forzamos position:fixed; inset:0 en el wrapper para
     que tenga el tamaño del viewport y los descendientes fixed
     se sitúen correctamente.
     ========================================================= */
  body > div:not(#root):not([data-theme-aware]) {
    pointer-events: none;
  }
  body > div:not(#root):not([data-theme-aware]) > * {
    pointer-events: auto;
  }

  html[data-theme="dark"] body > div:not(#root):not([data-theme-aware]):has(*) {
    position: fixed;
    inset: 0;
    filter: invert(0.92) hue-rotate(180deg);

    img,
    video,
    canvas,
    iframe,
    svg image,
    [data-no-invert],
    [style*="background-image"],
    [style*="rgba(0, 0, 0"],
    [style*="rgba(0,0,0"] {
      filter: invert(1) hue-rotate(180deg);
    }
  }
`;
