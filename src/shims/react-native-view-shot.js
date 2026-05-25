import { forwardRef, useImperativeHandle, useRef } from 'react';
import { toPng, toJpeg, toBlob } from 'html-to-image';
import html2canvas from 'html2canvas';

function resolveNode(refOrNode) {
  if (!refOrNode) return null;
  if (refOrNode.current !== undefined && refOrNode.current !== null) {
    refOrNode = refOrNode.current;
  }
  if (!refOrNode) return null;
  if (refOrNode._node instanceof HTMLElement) return refOrNode._node;
  if (refOrNode instanceof HTMLElement) return refOrNode;
  if (refOrNode._reactInternals?.stateNode instanceof HTMLElement) {
    return refOrNode._reactInternals.stateNode;
  }
  if (typeof refOrNode.getBoundingClientRect === 'function') return refOrNode;
  return null;
}

function suppressAncestorTransforms(node) {
  const saved = [];
  let el = node.parentElement;
  while (el && el !== document.body) {
    const t = el.style.transform;
    const to = el.style.transformOrigin;
    if (t && t !== 'none') {
      saved.push({ el, transform: t, transformOrigin: to });
      el.style.transform = 'none';
      el.style.transformOrigin = 'top left';
    }
    el = el.parentElement;
  }
  return saved;
}

function restoreAncestorTransforms(saved) {
  for (const { el, transform, transformOrigin } of saved) {
    el.style.transform = transform;
    el.style.transformOrigin = transformOrigin;
  }
}

function captureHtmlToImage(node, options) {
  const pixelRatio = options.pixelRatio || Math.max(window.devicePixelRatio || 1, 2);
  const isJpeg = options.format === 'jpg' || options.format === 'jpeg';
  const commonOpts = {
    pixelRatio,
    cacheBust: options.cacheBust ?? true,
    backgroundColor: options.backgroundColor || undefined,
    width: node.offsetWidth,
    height: node.offsetHeight,
  };

  if (options.result === 'blob') return toBlob(node, { ...commonOpts, type: isJpeg ? 'image/jpeg' : 'image/png', quality: isJpeg ? (options.quality ?? 0.92) : 1 });
  return isJpeg ? toJpeg(node, { ...commonOpts, quality: isJpeg ? (options.quality ?? 0.92) : undefined }) : toPng(node, commonOpts);
}

function captureHtml2Canvas(node, options) {
  return html2canvas(node, {
    scale: options.pixelRatio || Math.max(window.devicePixelRatio || 1, 2),
    useCORS: true,
    allowTaint: false,
    backgroundColor: options.backgroundColor || null,
    width: node.offsetWidth,
    height: node.offsetHeight,
    logging: false,
  }).then((canvas) => {
    const isJpeg = options.format === 'jpg' || options.format === 'jpeg';
    const quality = isJpeg ? (options.quality ?? 0.92) : 1;
    const type = isJpeg ? 'image/jpeg' : 'image/png';

    if (options.result === 'blob') {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('html2canvas: no se pudo generar Blob'));
        }, type, quality);
      });
    }

    const dataUrl = canvas.toDataURL(type, quality);
    if (options.result === 'base64') return dataUrl.split(',')[1];
    return dataUrl;
  });
}

export async function captureRef(refOrNode, options = {}) {
  const node = resolveNode(refOrNode);
  if (!node) throw new Error('view-shot shim: no DOM node resolved');

  const savedTransforms = suppressAncestorTransforms(node);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    return await captureHtmlToImage(node, options);
  } catch (e) {
    console.warn('[view-shot] html-to-image falló, intentando con html2canvas:', e.message);
  }

  try {
    return await captureHtml2Canvas(node, options);
  } catch (e) {
    console.warn('[view-shot] html2canvas también falló:', e.message);
    throw new Error('view-shot shim: no se pudo capturar el nodo');
  } finally {
    restoreAncestorTransforms(savedTransforms);
  }
}

export async function captureScreen(options) {
  return captureRef(document.body, options);
}

export default forwardRef(function ViewShot({ children, style, options: defaultOptions }, ref) {
  const innerRef = useRef(null);
  useImperativeHandle(ref, () => ({
    _node: innerRef.current,
    get node() { return innerRef.current; },
    capture: (opts) => captureRef(innerRef.current, { ...(defaultOptions || {}), ...(opts || {}) }),
    getBoundingClientRect: () => innerRef.current?.getBoundingClientRect?.(),
  }), [defaultOptions]);
  return (
    <div ref={innerRef} style={style}>
      {children}
    </div>
  );
});
