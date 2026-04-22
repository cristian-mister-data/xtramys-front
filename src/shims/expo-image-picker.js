/**
 * Shim de expo-image-picker para web.
 * Usa <input type="file"> oculto y devuelve la API que usa el source RN.
 *
 * Soporta: requestMediaLibraryPermissionsAsync, requestCameraPermissionsAsync,
 * launchImageLibraryAsync, launchCameraAsync, MediaTypeOptions, MediaType.
 */

export const MediaTypeOptions = { Images: 'Images', Videos: 'Videos', All: 'All' };
export const MediaType = { Images: 'Images', Videos: 'Videos' };

export async function requestMediaLibraryPermissionsAsync() {
  return { granted: true, status: 'granted' };
}
export async function requestCameraPermissionsAsync() {
  return { granted: true, status: 'granted' };
}
export async function getMediaLibraryPermissionsAsync() {
  return { granted: true, status: 'granted' };
}

function pickFile({ accept = 'image/*', capture = null, base64 = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) input.capture = capture;
    input.style.display = 'none';
    document.body.appendChild(input);

    let resolved = false;
    const cleanup = () => {
      try { document.body.removeChild(input); } catch (_) { /* noop */ }
    };

    input.onchange = async () => {
      const file = input.files && input.files[0];
      cleanup();
      if (!file) {
        resolved = true;
        return resolve({ canceled: true, assets: null });
      }
      const uri = URL.createObjectURL(file);
      const asset = {
        uri,
        width: 0,
        height: 0,
        type: file.type.startsWith('video') ? 'video' : 'image',
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        file, // exposicion del File nativo para fetch/upload
      };
      if (base64) {
        const b64 = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(String(r.result || '').split(',')[1] || '');
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        asset.base64 = b64;
      }
      resolved = true;
      resolve({ canceled: false, assets: [asset] });
    };

    // Fallback si el usuario cierra el diálogo (sin evento change)
    const onFocus = () => {
      window.removeEventListener('focus', onFocus);
      setTimeout(() => {
        if (!resolved) {
          cleanup();
          resolve({ canceled: true, assets: null });
        }
      }, 500);
    };
    window.addEventListener('focus', onFocus);

    input.click();
  });
}

export async function launchImageLibraryAsync(options = {}) {
  const mediaTypes = options.mediaTypes;
  let accept = 'image/*';
  if (Array.isArray(mediaTypes)) {
    if (mediaTypes.includes('videos') || mediaTypes.includes('Videos')) accept = 'image/*,video/*';
  } else if (mediaTypes === MediaTypeOptions.Videos) {
    accept = 'video/*';
  } else if (mediaTypes === MediaTypeOptions.All) {
    accept = 'image/*,video/*';
  }
  return pickFile({ accept, base64: !!options.base64 });
}

export async function launchCameraAsync(options = {}) {
  return pickFile({ accept: 'image/*', capture: 'environment', base64: !!options.base64 });
}

export default {
  MediaTypeOptions, MediaType,
  requestMediaLibraryPermissionsAsync, requestCameraPermissionsAsync,
  getMediaLibraryPermissionsAsync,
  launchImageLibraryAsync, launchCameraAsync,
};
