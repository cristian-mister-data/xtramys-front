import { Platform, NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const { SaveToDownloads } = NativeModules;

/**
 * Guarda un PDF directamente en Descargas (Android), abre share sheet (iOS) o
 * dispara descarga directa del navegador (web). En web preferimos siempre la
 * descarga directa (mejor UX que abrir share / nueva pestaña).
 *
 * @param {string} sourceUri - URI del archivo temporal (Print.printToFileAsync o data:/blob:)
 * @param {string} fileName - Nombre deseado del archivo (con o sin .pdf)
 * @returns {Promise<boolean>}
 */
export const savePdfToDownloads = async (sourceUri, fileName) => {
  const fullFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  // Web: descarga directa, sin pasar por share sheet ni cache.
  if (Platform.OS === 'web') {
    try {
      // Sentinel del shim de expo-print: la "descarga" ya se hizo vía
      // window.print() (diálogo "Guardar como PDF" del navegador). No hay
      // un blob real que volcar a disco.
      if (typeof sourceUri === 'string' && sourceUri.startsWith('webprint://')) {
        return true;
      }
      let blob;
      if (typeof sourceUri === 'string' && sourceUri.startsWith('webfs://')) {
        // Recuperar contenido persistido por el shim de expo-file-system.
        const KEY = 'expo-file-system::' + sourceUri;
        const payload = localStorage.getItem(KEY);
        if (payload == null) throw new Error('Archivo PDF no encontrado en FS web');
        if (payload.startsWith('data:')) {
          const r = await fetch(payload);
          blob = await r.blob();
        } else {
          blob = new Blob([payload], { type: 'application/pdf' });
        }
      } else {
        const r = await fetch(sourceUri);
        blob = await r.blob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fullFileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch {}
        try { URL.revokeObjectURL(url); } catch {}
      }, 1500);
      return true;
    } catch (e) {
      console.error('[savePdfToDownloads:web]', e);
      return false;
    }
  }

  if (Platform.OS === 'android' && SaveToDownloads?.save) {
    return await SaveToDownloads.save(sourceUri, fullFileName);
  }

  // Fallback: share sheet (iOS o Android sin módulo nativo)
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
