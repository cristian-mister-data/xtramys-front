// Tema visual portado de mainDrawer.js (THEME) y login.js (BRAND_*)
export const theme = {
  colors: {
    primary: '#1a237e',
    primaryLight: '#3949ab',
    primaryDark: '#0d1551',
    secondary: '#00bcd4',
    accent: '#ff6b35',
    brandAccent: '#00b4d8',

    background: '#f8fafc',
    backgroundAlt: '#f0f4f8',
    surface: '#ffffff',

    text: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#8b96a8',
    textOnPrimary: '#ffffff',

    border: '#e2e8f0',
    borderStrong: '#cbd5e1',
    inputBg: '#f8fafc',

    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #1a237e 0%, #3949ab 50%, #5c6bc0 100%)',
    accent: 'linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)',
  },
  radius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  spacing: (n) => `${n * 4}px`,
  shadows: {
    sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
    md: '0 4px 12px rgba(15, 23, 42, 0.08)',
    lg: '0 8px 24px rgba(15, 23, 42, 0.12)',
    xl: '0 20px 40px rgba(15, 23, 42, 0.16)',
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    drawer: 1200,
    modal: 1300,
    toast: 1400,
  },
  breakpoints: {
    mobile: '600px',
    tablet: '900px',
    desktop: '1280px',
  },
  fonts: {
    body: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    heading: "'Inter', system-ui, -apple-system, sans-serif",
  },
};

export const media = {
  mobile: `@media (max-width: ${theme.breakpoints.mobile})`,
  tablet: `@media (max-width: ${theme.breakpoints.tablet})`,
  desktop: `@media (min-width: ${theme.breakpoints.desktop})`,
};
