/**
 * Shim de react-native-view-shot para web.
 * Usa html-to-image (foreignObject + motor del browser) para capturar un nodo DOM como dataURL.
 *
 * captureRef(refOrNode, options) → Promise<string dataURL>
 *
 * Soporta dos patrones de uso típicos del código vendor:
 *   1) `captureRef(viewShotRef.current, options)` — directo
 *   2) `viewShotRef.current.capture(options)` — método imperativo
 *
 * Devuelve siempre una `dataURL` (`data:image/png;base64,...`). El shim de
 * `expo-file-system` reconoce este formato en `readAsStringAsync` y devuelve
 * directamente la parte base64, por lo que el código RN sigue funcionando
 * sin cambios (`FileSystem.readAsStringAsync(uri, { encoding: Base64 })`).
 */
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { toPng, toJpeg } from 'html-to-image';

function resolveNode(refOrNode) {
  if (!refOrNode) return null;
  // RN ref: { current: ... }
  if (refOrNode.current !== undefined && refOrNode.current !== null) {
    refOrNode = refOrNode.current;
  }
  if (!refOrNode) return null;
  // Imperative handle del ViewShot shim: { capture, _node }
  if (refOrNode._node instanceof HTMLElement) return refOrNode._node;
  if (refOrNode instanceof HTMLElement) return refOrNode;
  // RNW expone componentes con stateNode
  if (refOrNode._reactInternals?.stateNode instanceof HTMLElement) {
    return refOrNode._reactInternals.stateNode;
  }
  if (typeof refOrNode.getBoundingClientRect === 'function') return refOrNode;
  return null;
}

export async function captureRef(refOrNode, options = {}) {
  const node = resolveNode(refOrNode);
  if (!node) throw new Error('view-shot shim: no DOM node resolved');
  // html-to-image usa <foreignObject> + el motor del browser para renderizar,
  // por lo que reproduce CSS (sombras, transformaciones, fuentes, opacidades)
  // con mucha mayor fidelidad que html2canvas.
  // Forzamos pixelRatio mínimo de 2 para preservar nitidez en líneas/iconos
  // pequeños (números de jugadores, líneas del campo) cuando se usa para
  // grabar video o exportar gráficos.
  const pixelRatio = options.pixelRatio || Math.max(window.devicePixelRatio || 1, 2);
  const isJpeg = options.format === 'jpg' || options.format === 'jpeg';
  const commonOpts = {
    pixelRatio,
    cacheBust: true,
    backgroundColor: options.backgroundColor || undefined,
    // Fuerza el tamaño exacto del nodo evitando recortes por scroll/transform.
    width: node.offsetWidth,
    height: node.offsetHeight,
  };
  const dataUrl = isJpeg
    ? await toJpeg(node, { ...commonOpts, quality: options.quality ?? 0.92 })
    : await toPng(node, commonOpts);
  if (options.result === 'base64') return dataUrl.split(',')[1];
  return dataUrl;
}

export async function captureScreen(options) {
  return captureRef(document.body, options);
}

export default forwardRef(function ViewShot({ children, style, options: defaultOptions }, ref) {
  const innerRef = useRef(null);
  // Exponemos un handle con `.capture()` (igual que la API nativa de
  // react-native-view-shot) y `_node` para que `captureRef` pueda resolver
  // el nodo DOM cuando se llama directamente con la ref.
  useImperativeHandle(
    ref,
    () => ({
      _node: innerRef.current,
      get node() { return innerRef.current; },
      capture: (opts) => captureRef(innerRef.current, { ...(defaultOptions || {}), ...(opts || {}) }),
      // Algunos componentes vendor pueden llamar a getBoundingClientRect directamente.
      getBoundingClientRect: () => innerRef.current?.getBoundingClientRect?.(),
    }),
    // Se actualiza si cambian las opciones por defecto (raro, pero correcto).
    // innerRef.current se resuelve perezosamente dentro de capture(), así que
    // no hace falta dep adicional sobre el nodo.
    [defaultOptions],
  );
  return (
    <div ref={innerRef} style={style}>
      {children}
    </div>
  );
});
