/**
 * Shim de `react-native` para web.
 *
 * Re-exporta todo desde `react-native-web` pero reemplaza `TouchableOpacity`
 * y `Pressable` por wrappers que también atienden eventos `onClick` nativos
 * del DOM. Esto soluciona el bug del "primer click no abre nada": el
 * ResponderEventPlugin de RNW no se inicializa hasta el primer evento
 * pointer, perdiendo el primer onPress; con un onClick nativo paralelo el
 * primer click siempre dispara el handler.
 */
import React from 'react';
import { createPortal } from 'react-dom';
import * as RNW from 'react-native-web';

const RNWTouchableOpacity = RNW.TouchableOpacity;
const RNWPressable = RNW.Pressable;

function makeWebPressableWrapper(Base, displayName) {
  return React.forwardRef(function WebPressable(props, ref) {
    const { onPress, onPressIn, onPressOut, onLongPress, disabled, ...rest } = props;
    // Refs locales para deduplicar: si el responder system YA disparó onPress
    // (por ej. al segundo click), el onClick nativo no debe duplicarlo.
    const lastFiredRef = React.useRef(0);
    const fire = React.useCallback((handler, event) => {
      if (typeof handler !== 'function') return;
      const now = Date.now();
      if (now - lastFiredRef.current < 250) return; // dedupe ventana 250ms
      lastFiredRef.current = now;
      try { handler(event); } catch (e) { console.error(e); }
    }, []);

    const wrappedOnPress = React.useCallback((event) => {
      if (disabled) return;
      fire(onPress, event);
    }, [onPress, disabled, fire]);

    // onClick nativo del DOM: garantiza disparo en el primer click incluso
    // si el responder system de RNW aún no se ha activado.
    const handleNativeClick = React.useCallback((event) => {
      if (disabled) return;
      // Evita doble disparo cuando el responder system también lo entrega.
      // Marcamos el evento para que el handler RNW pueda ignorarlo si llega.
      fire(onPress, event);
    }, [onPress, disabled, fire]);

    return (
      <Base
        ref={ref}
        {...rest}
        disabled={disabled}
        onPress={wrappedOnPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onLongPress={onLongPress}
        // RNW pasa props desconocidas al div raíz, así que onClick llega al DOM.
        onClick={handleNativeClick}
      />
    );
  });
}

const PatchedTouchableOpacity = makeWebPressableWrapper(RNWTouchableOpacity, 'TouchableOpacity');
const PatchedPressable = RNWPressable ? makeWebPressableWrapper(RNWPressable, 'Pressable') : RNWPressable;

// Patch Modal: la implementación de Modal de react-native-web sufre un bug
// de pintado en Chromium/Edge. Tras varios intentos de "forzar repaint" sin
// éxito, optamos por reemplazarla completamente por una implementación
// nativa basada en createPortal, equivalente a la usada en ui/Modal.jsx
// (que sí funciona). Mantiene la API mínima de RN Modal usada en el code-
// base: visible, transparent, animationType, onRequestClose, onShow,
// onDismiss, statusBarTranslucent, children, style.
function PatchedModal({
  visible,
  transparent,
  animationType, // 'none' | 'fade' | 'slide' (slide se trata como fade)
  onRequestClose,
  onShow,
  onDismiss,
  children,
  // Props ignoradas en web (válidas solo en nativo): supportedOrientations,
  // hardwareAccelerated, statusBarTranslucent, presentationStyle, etc.
  ...rest
}) {
  const wasVisibleRef = React.useRef(false);

  // Disparar onShow / onDismiss en transiciones.
  React.useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      wasVisibleRef.current = true;
      if (typeof onShow === 'function') {
        try { onShow(); } catch (e) { console.error(e); }
      }
    } else if (!visible && wasVisibleRef.current) {
      wasVisibleRef.current = false;
      if (typeof onDismiss === 'function') {
        try { onDismiss(); } catch (e) { console.error(e); }
      }
    }
  }, [visible, onShow, onDismiss]);

  // Cerrar con Escape (equivalente a onRequestClose nativo).
  React.useEffect(() => {
    if (!visible || typeof onRequestClose !== 'function') return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') {
        try { onRequestClose(); } catch (err) { console.error(err); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onRequestClose]);

  // Bloquear scroll del body mientras el modal está visible.
  React.useEffect(() => {
    if (!visible) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [visible]);

  if (!visible || typeof document === 'undefined') return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // 2147483400: por encima del overlay de TacticalVideoRecorderModal
    // (zIndex.modal = 2147483000) pero por debajo del Toaster (2147483600).
    // Necesario para que los modales RN (guardar vídeo, crear carpeta, etc.)
    // sean visibles e interactivos cuando se abren dentro de un overlay.
    zIndex: 2147483400,
    backgroundColor: transparent ? 'transparent' : '#fff',
    animation: animationType && animationType !== 'none'
      ? 'rnwShimModalFadeIn 150ms ease-out'
      : undefined,
    // Garantizar que el modal recibe eventos aunque algún ancestro tuviera
    // pointer-events: none.
    pointerEvents: 'auto',
    // display:flex con flexDirection:column es necesario para que los hijos
    // que usan `flex: 1` (SafeAreaView, View overlay, etc.) se expandan al
    // tamaño completo del viewport. Sin esto, los hijos colapsan a su
    // tamaño natural y el modal aparece pegado a una esquina.
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'stretch',
  };

  return createPortal(
    <div style={overlayStyle} data-theme-aware="true" {...rest}>
      {children}
    </div>,
    document.body
  );
}
PatchedModal.displayName = 'Modal';

// Inyectar keyframes de fade-in una sola vez (idempotente).
if (typeof document !== 'undefined' && !document.getElementById('__rnw_shim_modal_styles__')) {
  const styleEl = document.createElement('style');
  styleEl.id = '__rnw_shim_modal_styles__';
  styleEl.textContent = '@keyframes rnwShimModalFadeIn { from { opacity: 0 } to { opacity: 1 } }';
  document.head.appendChild(styleEl);
}

// Re-export todo lo demás tal cual.
export * from 'react-native-web';
// Sobreescribir los dos componentes problemáticos. Los named exports
// posteriores ganan sobre los de `export *`.
export { PatchedTouchableOpacity as TouchableOpacity, PatchedPressable as Pressable, PatchedModal as Modal };

// Default: imitar el namespace original con los reemplazos aplicados.
const _default = { ...RNW, TouchableOpacity: PatchedTouchableOpacity, Pressable: PatchedPressable, Modal: PatchedModal };
export default _default;
