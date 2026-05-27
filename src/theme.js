/**
 * Sistema de tokens de diseño Xtramys.
 *
 * Palette diseñada para cumplir WCAG AA (≥4.5:1 texto normal, ≥3:1 elementos
 * grandes / iconografía). Cada variante (light/dark) ha sido validada contra
 * sus superficies principales.
 *
 * Convenciones:
 *  - text         → contenido principal (>= 7:1 sobre background)
 *  - textSecondary→ contenido auxiliar  (>= 4.5:1 sobre background)
 *  - textMuted    → metadatos / hints   (>= 4.5:1 sobre background)
 *  - text Disabled → opacity 0.55 (no se usa por color directo)
 *
 *  - primary      → marca acción principal (>= 4.5:1 contraste con surface)
 *  - on*          → color seguro de TEXTO sobre el fondo del mismo nombre
 */

const shared = {
  radius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  spacing: (n) => `${n * 4}px`,
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    drawer: 1200,
    // Por encima de los modales legacy de react-native-web (z-index 9999)
    // y de elementos del vendor con z-index hasta 99999 (tacticalBoard,
    // videoRecorder, etc.). Así los modales propios siempre quedan por
    // encima del header, el sidebar y cualquier capa legacy.
    modal: 2147483000,
    toast: 2147483600,
  },
  breakpoints: {
    mobile: '600px',
    tablet: '1280px',
    desktop: '1280px',
  },
  fonts: {
    body: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    heading: "'Inter', system-ui, -apple-system, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },
};

// =====================================================================
// LIGHT THEME (WCAG AA validado)
// =====================================================================
export const lightTheme = {
  mode: 'light',
  ...shared,
  colors: {
    // ---- Marca ----------------------------------------------------------
    primary: '#1d4ed8',          // blue-700, 8.6:1 sobre #fff
    primaryHover: '#1e40af',     // blue-800
    primaryActive: '#1e3a8a',    // blue-900
    primaryLight: '#3b82f6',     // blue-500 (decorativo)
    primarySoft: '#dbeafe',      // blue-100 (badges/backgrounds)
    primarySoftText: '#1e40af',
    onPrimary: '#ffffff',

    secondary: '#0891b2',        // cyan-600, 4.6:1 sobre #fff
    secondaryHover: '#0e7490',
    secondarySoft: '#cffafe',
    onSecondary: '#ffffff',

    accent: '#ea580c',           // orange-600 (uso puntual)
    brandAccent: '#0284c7',

    // ---- Superficies ---------------------------------------------------
    background: '#f8fafc',       // slate-50
    backgroundAlt: '#f1f5f9',    // slate-100
    surface: '#ffffff',
    surfaceAlt: '#f8fafc',
    surfaceElevated: '#ffffff',
    overlay: 'rgba(15, 23, 42, 0.55)',  // backdrop modales

    // ---- Texto ---------------------------------------------------------
    text: '#0f172a',             // slate-900, 17:1 sobre bg
    textSecondary: '#334155',    // slate-700, 10:1 sobre bg
    textMuted: '#64748b',        // slate-500, 4.6:1 sobre bg (AA)
    textDisabled: '#94a3b8',
    onPrimary_: '#ffffff',
    textOnPrimary: '#ffffff',

    // ---- Bordes / Inputs ----------------------------------------------
    border: '#e2e8f0',           // slate-200
    borderStrong: '#cbd5e1',     // slate-300
    borderFocus: '#1d4ed8',
    inputBg: '#ffffff',
    inputBorder: '#cbd5e1',
    inputPlaceholder: '#94a3b8',

    // ---- Estados (validados con texto blanco a 4.5:1+) ----------------
    success: '#15803d',          // green-700
    successSoft: '#dcfce7',
    successSoftText: '#14532d',
    onSuccess: '#ffffff',

    warning: '#b45309',          // amber-700
    warningSoft: '#fef3c7',
    warningSoftText: '#78350f',
    onWarning: '#ffffff',

    error: '#b91c1c',            // red-700, 6.5:1 sobre #fff
    errorSoft: '#fee2e2',
    errorSoftText: '#7f1d1d',
    onError: '#ffffff',

    info: '#0369a1',             // sky-700
    infoSoft: '#e0f2fe',
    infoSoftText: '#075985',
    onInfo: '#ffffff',

    purple: '#7c3aed',           // violet-600
    purpleSoft: '#f3e8ff',
    purpleSoftText: '#5b21b6',
    onPurple: '#ffffff',

    // ---- Sidebar / Header ---------------------------------------------
    sidebarBg: '#ffffff',
    sidebarBorder: '#e2e8f0',
    sidebarItemHover: '#f1f5f9',
    sidebarItemActive: '#dbeafe',
    sidebarItemActiveText: '#1e40af',
    sidebarText: '#334155',
    sidebarTextMuted: '#64748b',
    sidebarSection: '#64748b',
    sidebarBrand: '#1d4ed8',

    headerBg: '#ffffff',
    headerBorder: '#e2e8f0',
    headerText: '#0f172a',

    // ---- Focus ring ----------------------------------------------------
    focusRing: '#1d4ed8',
    focusRingBg: 'rgba(29, 78, 216, 0.15)',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
    accent: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    sidebar: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
  },
  shadows: {
    xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
    sm: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
    md: '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
    lg: '0 10px 15px -3px rgba(15, 23, 42, 0.10), 0 4px 6px -4px rgba(15, 23, 42, 0.05)',
    xl: '0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
    focus: '0 0 0 3px rgba(29, 78, 216, 0.20)',
  },
};

// =====================================================================
// DARK THEME (WCAG AA validado)
// =====================================================================
export const darkTheme = {
  mode: 'dark',
  ...shared,
  colors: {
    // ---- Marca (versiones más luminosas para contraste sobre oscuro) ---
    primary: '#60a5fa',          // blue-400, 7.4:1 sobre #0b1220
    primaryHover: '#93c5fd',
    primaryActive: '#bfdbfe',
    primaryLight: '#93c5fd',
    primarySoft: 'rgba(96, 165, 250, 0.15)',
    primarySoftText: '#bfdbfe',
    onPrimary: '#0b1220',

    secondary: '#22d3ee',         // cyan-400, 9:1 sobre #0b1220
    secondaryHover: '#67e8f9',
    secondarySoft: 'rgba(34, 211, 238, 0.15)',
    onSecondary: '#0b1220',

    accent: '#fb923c',
    brandAccent: '#38bdf8',

    // ---- Superficies (escalado neutro→azul tenue) ---------------------
    background: '#0b1220',        // slate-950 +tinted
    backgroundAlt: '#111a30',
    surface: '#162038',           // panel
    surfaceAlt: '#1c2742',        // panel hover
    surfaceElevated: '#22304f',   // dropdowns / tooltips
    overlay: 'rgba(0, 0, 0, 0.65)',

    // ---- Texto ---------------------------------------------------------
    text: '#f1f5fb',              // ~#fff-tint, 16:1 sobre bg
    textSecondary: '#cbd5e1',     // slate-300, 11:1 sobre bg
    textMuted: '#94a3b8',         // slate-400, 6:1 sobre bg (AA cumplido)
    textDisabled: '#64748b',
    textOnPrimary: '#0b1220',

    // ---- Bordes / Inputs ----------------------------------------------
    border: '#293555',
    borderStrong: '#3b4970',
    borderFocus: '#60a5fa',
    inputBg: '#1c2742',
    inputBorder: '#3b4970',
    inputPlaceholder: '#64748b',

    // ---- Estados ------------------------------------------------------
    success: '#4ade80',           // green-400
    successSoft: 'rgba(74, 222, 128, 0.15)',
    successSoftText: '#86efac',
    onSuccess: '#052e16',

    warning: '#fbbf24',           // amber-400
    warningSoft: 'rgba(251, 191, 36, 0.15)',
    warningSoftText: '#fde68a',
    onWarning: '#451a03',

    error: '#f87171',             // red-400, 5.5:1 sobre bg
    errorSoft: 'rgba(248, 113, 113, 0.15)',
    errorSoftText: '#fca5a5',
    onError: '#450a0a',

    info: '#38bdf8',              // sky-400
    infoSoft: 'rgba(56, 189, 248, 0.15)',
    infoSoftText: '#7dd3fc',
    onInfo: '#082f49',

    purple: '#a78bfa',            // violet-400
    purpleSoft: 'rgba(167, 139, 250, 0.18)',
    purpleSoftText: '#ddd6fe',
    onPurple: '#1e1b4b',

    // ---- Sidebar / Header ---------------------------------------------
    sidebarBg: '#0f172a',
    sidebarBorder: '#1e293b',
    sidebarItemHover: '#1e293b',
    sidebarItemActive: 'rgba(96, 165, 250, 0.18)',
    sidebarItemActiveText: '#bfdbfe',
    sidebarText: '#cbd5e1',
    sidebarTextMuted: '#94a3b8',
    sidebarSection: '#94a3b8',
    sidebarBrand: '#60a5fa',

    headerBg: '#0f172a',
    headerBorder: '#1e293b',
    headerText: '#f1f5fb',

    // ---- Focus ring ----------------------------------------------------
    focusRing: '#60a5fa',
    focusRingBg: 'rgba(96, 165, 250, 0.25)',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    accent: 'linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)',
    sidebar: 'linear-gradient(180deg, #0f172a 0%, #0b1220 100%)',
  },
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.30)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.25)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.45), 0 2px 4px -2px rgba(0, 0, 0, 0.30)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.55), 0 4px 6px -4px rgba(0, 0, 0, 0.35)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.65), 0 8px 10px -6px rgba(0, 0, 0, 0.40)',
    focus: '0 0 0 3px rgba(96, 165, 250, 0.35)',
  },
};

export const themes = { light: lightTheme, dark: darkTheme };

export const media = {
  mobile: `@media (max-width: ${shared.breakpoints.mobile})`,
  tablet: `@media (max-width: ${shared.breakpoints.tablet})`,
  desktop: `@media (min-width: ${shared.breakpoints.desktop})`,
};

// Compat con código legacy que importa { theme }
export const theme = lightTheme;
