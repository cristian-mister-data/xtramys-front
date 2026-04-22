import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import App from './App.jsx';
import store from './store/store.js';
import { theme } from './theme.js';
import { GlobalStyles } from './GlobalStyles.js';
import './i18n.js';
import { injectVectorIconFonts } from './shims/vector-icons-fonts.js';
import './shims/rn-runtime-patch.js';

injectVectorIconFonts();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
);
