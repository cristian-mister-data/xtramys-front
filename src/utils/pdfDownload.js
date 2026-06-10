import { Platform, NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const { SaveToDownloads } = NativeModules;
const PDF_LOADING_ID = 'xtramys-pdf-loading-overlay';

export function showPdfLoading(message) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const existing = document.getElementById(PDF_LOADING_ID);
  const text = message || 'Generando PDF...';
  if (existing) {
    const label = existing.querySelector('[data-pdf-loading-label]');
    if (label) label.textContent = text;
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes xtramysPdfSpin { to { transform: rotate(360deg); } }
    @keyframes xtramysPdfFade { from { opacity: 0; } to { opacity: 1; } }
  `;

  const overlay = document.createElement('div');
  overlay.id = PDF_LOADING_ID;
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483646',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'rgba(15, 23, 42, 0.58)',
    animation: 'xtramysPdfFade 120ms ease-out',
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    width: 'min(320px, 100%)',
    borderRadius: '16px',
    background: '#ffffff',
    color: '#0f172a',
    boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.18)',
    padding: '22px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
    fontFamily: 'inherit',
    textAlign: 'center',
  });

  const spinner = document.createElement('div');
  Object.assign(spinner.style, {
    width: '34px',
    height: '34px',
    borderRadius: '999px',
    border: '3px solid #dbeafe',
    borderTopColor: '#1d4ed8',
    animation: 'xtramysPdfSpin 0.8s linear infinite',
  });

  const label = document.createElement('div');
  label.setAttribute('data-pdf-loading-label', 'true');
  Object.assign(label.style, {
    fontSize: '15px',
    fontWeight: '700',
    lineHeight: '1.35',
  });
  label.textContent = text;

  panel.appendChild(spinner);
  panel.appendChild(label);
  overlay.appendChild(style);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}

export function hidePdfLoading() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const overlay = document.getElementById(PDF_LOADING_ID);
  if (!overlay) return;
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 120ms ease-out';
  setTimeout(() => {
    try { overlay.remove(); } catch {}
  }, 140);
}

async function fetchBlobFromUri(sourceUri) {
  if (typeof sourceUri === 'string' && sourceUri.startsWith('blob:')) {
    const r = await fetch(sourceUri);
    return await r.blob();
  }
  if (typeof sourceUri === 'string' && sourceUri.startsWith('webfs://')) {
    const KEY = 'expo-file-system::' + sourceUri;
    const payload = localStorage.getItem(KEY);
    if (payload == null) throw new Error('Archivo PDF no encontrado en FS web');
    if (payload.startsWith('data:')) {
      const r = await fetch(payload);
      return await r.blob();
    }
    return new Blob([payload], { type: 'application/pdf' });
  }
  if (typeof sourceUri === 'string' && sourceUri.startsWith('data:')) {
    const r = await fetch(sourceUri);
    return await r.blob();
  }
  const r = await fetch(sourceUri);
  return await r.blob();
}

export const savePdfToDownloads = async (sourceUri, fileName) => {
  const fullFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  if (Platform.OS === 'web') {
    try {
      const blob = await fetchBlobFromUri(sourceUri);
      const { showPdfActions } = await import('@/ui/PdfActionDialog');
      hidePdfLoading();
      await showPdfActions(blob, fullFileName);
      return true;
    } catch (e) {
      console.error('[savePdfToDownloads:web]', e);
      return false;
    }
  }

  if (Platform.OS === 'android' && SaveToDownloads?.save) {
    return await SaveToDownloads.save(sourceUri, fullFileName);
  }

  const cacheUri = `${FileSystem.cacheDirectory}${fullFileName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: cacheUri });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(cacheUri, {
      mimeType: 'application/pdf',
      dialogTitle: fullFileName,
      UTI: 'com.adobe.pdf'
    });
  }
  await FileSystem.deleteAsync(sourceUri, { idempotent: true });
  return true;
};
