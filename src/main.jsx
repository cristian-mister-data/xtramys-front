import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import './shims/rn-runtime-patch.js';

import App from './App.jsx';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import { GlobalStyles } from './GlobalStyles.js';
import './i18n.js';
import { injectVectorIconFonts } from './shims/vector-icons-fonts.js';
import { hydrateNativeStorage } from './auth/storage.js';
import { initNativeApp } from './platform/nativeApp.js';

injectVectorIconFonts();

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

async function bootstrap() {
  await hydrateNativeStorage();
  await initNativeApp();
  const { default: store } = await import('./store/store.js');

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
}

bootstrap();
