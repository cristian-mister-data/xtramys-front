import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider as SCThemeProvider } from 'styled-components';
import { themes } from '../theme.js';

const STORAGE_KEY = 'xtramys.theme';

const ThemeModeContext = createContext({
  mode: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

function getInitialMode() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) { /* noop */ }
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, mode); } catch (e) { /* noop */ }
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = mode;
      document.documentElement.style.colorScheme = mode;
    }
  }, [mode]);

  // Atajo de teclado: Ctrl/Cmd + Shift + L para alternar tema
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        setMode((m) => (m === 'dark' ? 'light' : 'dark'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const value = useMemo(() => ({
    mode,
    toggleTheme: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')),
    setTheme: (m) => setMode(m === 'dark' ? 'dark' : 'light'),
  }), [mode]);

  const themeObject = themes[mode] || themes.light;

  return (
    <ThemeModeContext.Provider value={value}>
      <SCThemeProvider theme={themeObject}>
        {children}
      </SCThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
