/**
 * Parches en runtime sobre react-native-web para módulos cuyos métodos
 * vienen no-op o ruidosos (Alert, BackHandler). Importar UNA SOLA VEZ
 * lo antes posible (en main.jsx, antes de cargar componentes).
 */
import { Alert, BackHandler } from 'react-native';

// --- Alert.alert: RNW lo deja vacío. Lo redirigimos a window.confirm/alert
// para que los flujos que dependen de la confirmación del usuario (p.ej.
// "¿descartar cambios?") funcionen en web.
if (Alert && (!Alert._patchedWeb)) {
  Alert.alert = function alertWeb(title, message, buttons, _options) {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!Array.isArray(buttons) || buttons.length === 0) {
      try { window.alert(text); } catch {}
      return;
    }
    if (buttons.length === 1) {
      try { window.alert(text); } catch {}
      const cb = buttons[0] && buttons[0].onPress;
      if (typeof cb === 'function') {
        try { cb(); } catch (e) { console.error(e); }
      }
      return;
    }
    // 2+ botones: usamos confirm. OK = botón "destructivo" o el último que
    // no sea "cancel"; Cancel = el botón con style 'cancel' (o el primero).
    const cancelBtn = buttons.find(b => b && b.style === 'cancel') || buttons[0];
    const okBtn = buttons.find(b => b && b !== cancelBtn) || buttons[buttons.length - 1];
    let confirmed = false;
    try { confirmed = window.confirm(text); } catch {}
    const chosen = confirmed ? okBtn : cancelBtn;
    const cb = chosen && chosen.onPress;
    if (typeof cb === 'function') {
      try { cb(); } catch (e) { console.error(e); }
    }
  };
  Alert.prompt = Alert.prompt || function (title, message, callbackOrButtons, _type, defaultValue) {
    const text = [title, message].filter(Boolean).join('\n\n');
    let result = null;
    try { result = window.prompt(text, defaultValue || ''); } catch {}
    if (typeof callbackOrButtons === 'function') {
      try { callbackOrButtons(result); } catch (e) { console.error(e); }
    } else if (Array.isArray(callbackOrButtons)) {
      const okBtn = callbackOrButtons.find(b => b && b.style !== 'cancel') || callbackOrButtons[0];
      const cb = okBtn && okBtn.onPress;
      if (typeof cb === 'function') {
        try { cb(result); } catch (e) { console.error(e); }
      }
    }
  };
  Alert._patchedWeb = true;
}

// --- BackHandler: en RNW imprime console.error en cada add/remove. Como
// no podemos interceptar el botón "atrás" del navegador de forma fiable
// (popstate ya navegó cuando se dispara), simplemente silenciamos para
// que no inunde la consola. Devolvemos un suscriptor inerte.
if (BackHandler && (!BackHandler._patchedWeb)) {
  const noopSub = { remove: () => {} };
  BackHandler.addEventListener = () => noopSub;
  BackHandler.removeEventListener = () => {};
  BackHandler.exitApp = () => {};
  BackHandler._patchedWeb = true;
}

// (Filtro de console.warn/error movido a index.html para que aplique antes
// de cualquier import de módulos de RNW.)

// (Eliminado warmUp sintético: disparaba pointerdown en body y la pizarra
// lo interpretaba como "click fuera", cerrando paneles. Para el problema
// del primer click sobre TouchableOpacity ver patch en `react-native.js`.)
