/**
 * Shim de expo-print para web.
 *
 * Usa `window.print()` del navegador en un iframe oculto. Es la única forma
 * de conseguir que el PDF en web sea visualmente idéntico al de iOS/Android,
 * porque ambos pasan por el mismo motor de Chromium / WebKit:
 *   - texto vectorial (no rasterizado),
 *   - respeta @page, page-break, page-break-inside: avoid,
 *   - flujo natural sin cortes a media línea,
 *   - mismas medidas y tipografía que el móvil.
 *
 * Inyectamos `@page { size: A4; margin: 0 }` para que el navegador no añada
 * cabeceras/pies por defecto y el padding del body se vea como en móvil.
 *
 * Limitación: el navegador exige el diálogo "Guardar como PDF" por seguridad.
 * No existe API para volcar a fichero sin esa interacción del usuario. La
 * alternativa rasterizada (html2canvas + jsPDF) producía PDFs de baja
 * calidad, así que se descarta.
 */

const SENTINEL_URI = 'webprint://done';

const PAGE_RULES = `
  @page { size: A4; margin: 0; }
  html, body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
`;

function buildIframe(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('No se pudo crear el iframe de impresión');
  }
  doc.open();
  doc.write(html || '<html><body></body></html>');
  doc.close();
  try {
    const style = doc.createElement('style');
    style.setAttribute('data-webprint', 'page-rules');
    style.textContent = PAGE_RULES;
    (doc.head || doc.documentElement).appendChild(style);
  } catch { /* noop */ }
  return iframe;
}

function waitForResources(iframe) {
  return new Promise((resolve) => {
    const win = iframe.contentWindow;
    const doc = iframe.contentDocument;

    const checkImages = () => {
      const imgs = Array.from(doc.images || []);
      if (imgs.length === 0) return resolve();
      let pending = imgs.length;
      const settle = () => {
        pending -= 1;
        if (pending <= 0) resolve();
      };
      imgs.forEach((img) => {
        if (img.complete) return settle();
        img.addEventListener('load', settle, { once: true });
        img.addEventListener('error', settle, { once: true });
      });
      setTimeout(resolve, 4000);
    };

    if (doc.readyState === 'complete') {
      checkImages();
    } else {
      win.addEventListener('load', checkImages, { once: true });
      setTimeout(checkImages, 1500);
    }
  });
}

async function printViaIframe(html) {
  const iframe = buildIframe(html);
  try {
    await waitForResources(iframe);
    await new Promise((r) => setTimeout(r, 80));
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch { /* noop */ }
    }, 60_000);
  } catch (e) {
    try { document.body.removeChild(iframe); } catch { /* noop */ }
    throw e;
  }
}

export async function printAsync({ html, uri } = {}) {
  if (uri) {
    const w = window.open(uri, '_blank');
    if (w) w.focus();
    return;
  }
  await printViaIframe(html);
}

/**
 * En móvil esto produciría un fichero PDF temporal. En web no es posible sin
 * un servidor — devolvemos un URI sentinela que `savePdfToDownloads` detecta
 * para no intentar descargar tras la impresión nativa.
 */
export async function printToFileAsync({ html } = {}) {
  await printViaIframe(html);
  return { uri: SENTINEL_URI, base64: null, numberOfPages: 1 };
}

export async function selectPrinterAsync() {
  return { name: 'Default', url: '' };
}

export const WEB_PRINT_SENTINEL = SENTINEL_URI;

export default { printAsync, printToFileAsync, selectPrinterAsync };
