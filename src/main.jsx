import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import './shims/rn-runtime-patch.js';

// Recover automatically when a deploy removes old Vite chunks still referenced by this tab.
(function () {
  const isChunkError = (value) => (
    /failed to fetch dynamically imported module/i.test(value) ||
    /failed to load module script/i.test(value) ||
    /loading chunk/i.test(value) ||
    /importing a module script failed/i.test(value) ||
    /\/assets\/.*\.js/i.test(value)
  );

  const reloadForFreshBuild = (value) => {
    if (!isChunkError(String(value || ''))) return false;
    const lastReload = Number(sessionStorage.getItem('xtramys_chunk_reload_at') || 0);
    if (Date.now() - lastReload < 10000) return true;
    sessionStorage.setItem('xtramys_chunk_reload_at', String(Date.now()));
    window.location.reload();
    return true;
  };

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadForFreshBuild(event.payload?.message || event.payload);
  });

  window.addEventListener('error', (event) => {
    const target = event.target || event.srcElement;
    const src = target?.src || target?.href || '';
    if (reloadForFreshBuild(`${event.message || ''} ${src}`)) event.preventDefault?.();
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (reloadForFreshBuild(event.reason?.message || event.reason)) event.preventDefault();
  });
})();

import App from './App.jsx';
import store from './store/store.js';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import { GlobalStyles } from './GlobalStyles.js';
import './i18n.js';
import { injectVectorIconFonts } from './shims/vector-icons-fonts.js';

injectVectorIconFonts();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
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
