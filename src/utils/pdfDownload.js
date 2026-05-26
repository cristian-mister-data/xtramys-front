import { Platform, NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const { SaveToDownloads } = NativeModules;

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
