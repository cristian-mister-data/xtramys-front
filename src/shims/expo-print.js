import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4_PORTRAIT_W_MM = 210;
const A4_PORTRAIT_H_MM = 297;
const SCALE = 2;

function buildIframe(html, landscape) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  if (landscape) {
    iframe.style.width = '1123px';
    iframe.style.height = '794px';
  } else {
    iframe.style.width = '794px';
    iframe.style.height = '1123px';
  }
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('No se pudo crear el iframe de renderizado');
  }
  doc.open();
  doc.write(html || '<html><body></body></html>');
  doc.close();
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

function isLandscape(opts) {
  if (opts.orientation === 'landscape') return true;
  if (opts.width && opts.height && opts.width > opts.height) return true;
  return false;
}

async function htmlToPdfBlob(html, opts = {}) {
  const landscape = isLandscape(opts);
  const pageWmm = landscape ? A4_PORTRAIT_H_MM : A4_PORTRAIT_W_MM;
  const pageHmm = landscape ? A4_PORTRAIT_W_MM : A4_PORTRAIT_H_MM;

  const iframe = buildIframe(html, landscape);
  try {
    await waitForResources(iframe);
    await new Promise((r) => setTimeout(r, 100));

    const doc = iframe.contentDocument;
    const body = doc.body;

    const pxPerMm = 96 / 25.4;
    const pageWidthPx = Math.round(pageWmm * pxPerMm);
    const pageHeightPx = Math.round(pageHmm * pxPerMm);

    const fullCanvas = await html2canvas(body, {
      scale: SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: body.scrollWidth,
      height: body.scrollHeight,
      windowWidth: body.scrollWidth,
      windowHeight: body.scrollHeight,
      logging: false,
    });

    const imgWidthPx = fullCanvas.width;
    const imgHeightPx = fullCanvas.height;

    const numPages = Math.ceil(imgHeightPx / (pageHeightPx * SCALE));

    const pdf = new jsPDF({
      orientation: landscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    for (let i = 0; i < numPages; i++) {
      if (i > 0) pdf.addPage();

      const srcY = i * pageHeightPx * SCALE;
      const srcH = Math.min(pageHeightPx * SCALE, imgHeightPx - srcY);

      if (srcH <= 0) break;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = imgWidthPx;
      pageCanvas.height = srcH;
      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        fullCanvas,
        0, srcY, imgWidthPx, srcH,
        0, 0, imgWidthPx, srcH
      );

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
      const ratioW = pageWmm / (imgWidthPx / SCALE);
      const drawH = (srcH / SCALE) * ratioW;
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWmm, drawH);
    }

    const blob = pdf.output('blob');
    return blob;
  } finally {
    try { document.body.removeChild(iframe); } catch { /* noop */ }
  }
}

export async function printAsync({ html, uri, orientation, width, height } = {}) {
  if (uri) {
    const w = window.open(uri, '_blank');
    if (w) w.focus();
    return;
  }
  const blob = await htmlToPdfBlob(html, { orientation, width, height });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) w.focus();
  setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 60_000);
}

export async function printToFileAsync({ html, orientation, width, height } = {}) {
  const blob = await htmlToPdfBlob(html, { orientation, width, height });
  const url = URL.createObjectURL(blob);
  return { uri: url, base64: null, numberOfPages: 1 };
}

export async function selectPrinterAsync() {
  return { name: 'Default', url: '' };
}

export const Orientation = {
  portrait: 'portrait',
  landscape: 'landscape',
};

export default { printAsync, printToFileAsync, selectPrinterAsync, Orientation };
