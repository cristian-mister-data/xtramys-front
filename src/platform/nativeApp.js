import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard, KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNative, setNativeDocumentFlags } from './capacitor';

export async function initNativeApp() {
  setNativeDocumentFlags();
  if (!isNative) return;

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Default });
  } catch (_) {
    // native plugin may be unavailable in web preview
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    await Keyboard.setStyle({ style: KeyboardStyle.Default });
  } catch (_) {
    // iOS-only methods can throw on Android
  }

  try {
    await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) window.history.back();
      else CapacitorApp.exitApp();
    });
  } catch (_) {
    // Android-only listener
  }

  window.setTimeout(() => {
    SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
  }, 1000);
}
