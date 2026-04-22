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

// Re-export todo lo demás tal cual.
export * from 'react-native-web';
// Sobreescribir los dos componentes problemáticos. Los named exports
// posteriores ganan sobre los de `export *`.
export { PatchedTouchableOpacity as TouchableOpacity, PatchedPressable as Pressable };

// Default: imitar el namespace original con los reemplazos aplicados.
const _default = { ...RNW, TouchableOpacity: PatchedTouchableOpacity, Pressable: PatchedPressable };
export default _default;
