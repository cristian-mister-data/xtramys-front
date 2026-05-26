import { Platform, NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const { SaveToDownloads } = NativeModules;

export const savePdfToDownloads = async (sourceUri, fileName) => {
  const fullFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  if (Platform.OS === 'web') {
    try {
      let blob;

      if (typeof sourceUri === 'string' && sourceUri.startsWith('blob:')) {
        const r = await fetch(sourceUri);
        blob = await r.blob();
      } else if (typeof sourceUri === 'string' && sourceUri.startsWith('webfs://')) {
        const KEY = 'expo-file-system::' + sourceUri;
        const payload = localStorage.getItem(KEY);
        if (payload == null) throw new Error('Archivo PDF no encontrado en FS web');
        if (payload.startsWith('data:')) {
          const r = await fetch(payload);
          blob = await r.blob();
        } else {
          blob = new Blob([payload], { type: 'application/pdf' });
        }
      } else if (typeof sourceUri === 'string' && (sourceUri.startsWith('data:') || sourceUri.startsWith('http'))) {
        const r = await fetch(sourceUri);
        blob = await r.blob();
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

      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], fullFileName, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: fullFileName,
            });
          }
        } catch (shareErr) {
          if (shareErr.name !== 'AbortError') {
            console.warn('[savePdfToDownloads:web:share]', shareErr);
          }
        }
      }

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
