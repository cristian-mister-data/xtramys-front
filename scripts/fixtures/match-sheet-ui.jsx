import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '/src/theme/ThemeContext.jsx';
import { GlobalStyles } from '/src/GlobalStyles.js';
import '/src/i18n.js';
import store from '/src/store/store.js';
import MatchSheetDetailModal from '/src/vendor/season/MatchSheetDetailModal.js';
import '/src/shims/rn-runtime-patch.js';
import { injectVectorIconFonts } from '/src/shims/vector-icons-fonts.js';
injectVectorIconFonts();
const sheet = window.__TEST_SHEET__;
const h = React.createElement;
createRoot(document.getElementById('root')).render(
  h(
    Provider,
    { store },
    h(
      ThemeProvider,
      null,
      h(GlobalStyles),
      h(
        BrowserRouter,
        null,
        h(
          SafeAreaProvider,
          null,
          h(MatchSheetDetailModal, {
            visible: true,
            matchSheet: sheet,
            team: sheet.equipo,
            players: sheet.convocados,
            onClose() {},
            onEdit() {},
          }),
        ),
      ),
    ),
  ),
);
