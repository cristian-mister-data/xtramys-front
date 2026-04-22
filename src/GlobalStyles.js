import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html, body, #root { height: 100%; margin: 0; padding: 0; }

  body {
    font-family: ${({ theme }) => theme.fonts.body};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a { color: inherit; text-decoration: none; }

  button {
    font: inherit;
    cursor: pointer;
    border: none;
    background: none;
  }

  input, textarea, select {
    font: inherit;
    color: inherit;
  }

  img { max-width: 100%; display: block; }

  /* Scrollbar discreta */
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.colors.borderStrong}; border-radius: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
`;
