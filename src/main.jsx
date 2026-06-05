import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';

// Intercept global script/chunk loading failures to recover on redeployments
(function() {
  const handleChunkError = (errorMsg) => {
    const isChunkError = 
      /failed to fetch dynamically imported module/i.test(errorMsg) ||
      /failed to load module script/i.test(errorMsg) ||
      /loading chunk/i.test(errorMsg);
      
    if (isChunkError) {
      const now = Date.now();
      const lastReload = parseInt(localStorage.getItem('last_chunk_error_reload') || '0', 10);
      // Wait at least 10 seconds between reload attempts to avoid infinite loops
      if (now - lastReload > 10000) {
        localStorage.setItem('last_chunk_error_reload', String(now));
        console.warn('Chunk loading error detected. Reloading page to fetch latest version...', errorMsg);
        window.location.reload();
      } else {
        console.error('Chunk loading error detected, but reload cooldown active. Prevents infinite refresh loop.');
      }
    }
  };

  // Capture script loading failures (MIME type or 404 errors)
  window.addEventListener('error', (event) => {
    const target = event.target || event.srcElement;
    const isScript = target && (target.tagName === 'SCRIPT' || target.nodeName === 'SCRIPT');
    
    if (isScript || (event.message && /failed to load/i.test(event.message))) {
      handleChunkError(event.message || 'Script resource load failed');
    }
  }, true); // Capture phase is required for resource loading errors

  // Capture promise rejections from dynamic imports
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason) {
      const reasonStr = String(event.reason.message || event.reason);
      handleChunkError(reasonStr);
    }
  });
})();

import App from './App.jsx';
import store from './store/store.js';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import { GlobalStyles } from './GlobalStyles.js';
import './i18n.js';
import { injectVectorIconFonts } from './shims/vector-icons-fonts.js';
import './shims/rn-runtime-patch.js';

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
