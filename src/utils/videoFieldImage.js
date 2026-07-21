import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { decomposeFieldId } from '@/vendor/tacticalBoard/fields/fieldConfigs';
import FieldSVGRenderer from '@/vendor/tacticalBoard/fields/FieldSVGRenderer';

function loadSvgImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo rasterizar el campo'));
    image.src = source;
  });
}

export async function renderVideoFieldImage(fieldType, width, height) {
  const { lineType, viewMode } = decomposeFieldId(fieldType || 'full');
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px`;
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    flushSync(() => {
      root.render(React.createElement(FieldSVGRenderer, { lineType, viewMode, width, height }));
    });
    const svg = host.querySelector('svg');
    if (!svg) throw new Error('No se pudo renderizar el campo');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const markup = new XMLSerializer().serializeToString(svg);

    // WebKit rasteriza de forma fiable SVG data URLs; con blob: puede cargar solo el fondo verde.
    try {
      return await loadSvgImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);
    } catch {
      const objectUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
      try {
        return await loadSvgImage(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }
  } finally {
    root.unmount();
    host.remove();
  }
}
