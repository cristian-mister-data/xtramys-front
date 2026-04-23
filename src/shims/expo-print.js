/**
 * Shim de expo-print para web.
 * - printAsync({ html }): abre ventana, escribe HTML y dispara window.print().
 * - printToFileAsync({ html }): renderiza el HTML a un PDF real usando
 *   jsPDF + html2canvas y devuelve un blob URL del PDF resultante.
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function printAsync({ html, uri } = {}) {
  if (uri) {
    const w = window.open(uri, '_blank');
    if (w) w.focus();
    return;
  }
  const w = window.open('', '_blank');
  if (!w) throw new Error('print: popup blocked');
  w.document.open();
  w.document.write(html || '<html><body></body></html>');
  w.document.close();
  w.focus();
  w.print();
}

/**
 * Renderiza el HTML dado en un contenedor offscreen, lo captura con
 * html2canvas y lo divide en páginas A4 dentro de un PDF de jsPDF.
 */
export async function printToFileAsync({ html, width, height, orientation } = {}) {
  if (!html) {
    const empty = new Blob([''], { type: 'application/pdf' });
    return { uri: URL.createObjectURL(empty), base64: null, numberOfPages: 0 };
  }

  // Detectar orientación: explícita, o derivada de width/height (expo-print API).
  // A4 portrait = 595x842pt; landscape = 842x595pt.
  let resolvedOrientation = orientation;
  if (!resolvedOrientation && typeof width === 'number' && typeof height === 'number') {
    resolvedOrientation = width > height ? 'landscape' : 'portrait';
  }
  if (resolvedOrientation !== 'landscape') resolvedOrientation = 'portrait';

  // Ancho del contenedor offscreen aproximado a A4 a 96dpi.
  // Portrait ~794px, landscape ~1123px.
  const containerWidthPx = resolvedOrientation === 'landscape' ? 1123 : 794;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = containerWidthPx + 'px';
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: resolvedOrientation });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    const blob = pdf.output('blob');
    const uri = URL.createObjectURL(blob);
    return { uri, base64: null, numberOfPages: pdf.getNumberOfPages?.() || 1 };
  } finally {
    try { document.body.removeChild(container); } catch {}
  }
}

export async function selectPrinterAsync() {
  return { name: 'Default', url: '' };
}

export default { printAsync, printToFileAsync, selectPrinterAsync };
