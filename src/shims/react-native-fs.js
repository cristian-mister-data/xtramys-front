// shim for react-native-fs — implementación parcial para web.
// Almacén en memoria de "frames" para grabación de video: las capturas
// (Blob o data URLs) que el flujo nativo movería a /virtual/frames_XXX/frameNNNN.png
// se guardan acá indexadas por destPath. videoUtils.generateVideo las lee
// y arma el video con canvas + MediaRecorder.
//
// Persistir el almacén en `globalThis` para que sobreviva HMR y cualquier
// reimport del shim devuelva la misma instancia.
const G = (typeof globalThis !== 'undefined' ? globalThis : window);
if (!G.__rnfsFrames) G.__rnfsFrames = new Map();
const frames = G.__rnfsFrames;

const NOT_IMPL = (name) => () => {
  throw new Error(`react-native-fs.${name}: not implemented on web`);
};

const isBlob = (value) => typeof Blob !== 'undefined' && value instanceof Blob;

const isCapacitorPath = (path) => {
  if (typeof path !== 'string') return false;
  return path.startsWith('file://') || path.startsWith('/CACHE') || (path.startsWith('/') && !path.startsWith('/virtual/'));
};

const RNFS = {
  CachesDirectoryPath: '/virtual/caches',
  DocumentDirectoryPath: '/virtual/documents',
  TemporaryDirectoryPath: '/virtual/tmp',
  mkdir: async () => {},
  unlink: async (path) => {
    if (!path) return;
    const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
    if (isCapacitor && isCapacitorPath(path)) {
      try {
        const { Filesystem } = await import('@capacitor/filesystem');
        await Filesystem.deleteFile({ path });
      } catch (err) {
        console.warn('[RNFS shim] Failed deleting native file:', err);
      }
      return;
    }
    // Blob URL devuelta por videoUtils.generateVideo
    if (typeof path === 'string' && path.startsWith('blob:')) {
      try { URL.revokeObjectURL(path); } catch (_) {}
      return;
    }
    if (frames.has(path)) {
      frames.delete(path);
      return;
    }
    // Borrar todo el directorio: claves que empiezan con path
    for (const k of Array.from(frames.keys())) {
      if (k.startsWith(path)) frames.delete(k);
    }
  },
  exists: async (path) => {
    if (typeof path === 'string' && (path.startsWith('blob:') || path.startsWith('data:'))) return true;
    const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
    if (isCapacitor && isCapacitorPath(path)) {
      try {
        const { Filesystem } = await import('@capacitor/filesystem');
        await Filesystem.stat({ path });
        return true;
      } catch (_) {
        return false;
      }
    }
    return frames.has(path);
  },
  readDir: async (path) => {
    const prefix = path.endsWith('/') ? path : path + '/';
    const out = [];
    for (const k of frames.keys()) {
      if (k.startsWith(prefix)) {
        const name = k.slice(prefix.length);
        out.push({ name, path: k, isFile: () => true, isDirectory: () => false });
      }
    }
    return out;
  },
  // moveFile / copyFile: el "src" suele ser una data URL devuelta por
  // captureRef (shim view-shot). La almacenamos bajo destPath para que
  // generateVideo (videoUtils) pueda recuperarla.
  moveFile: async (src, dst) => {
    if (!dst) return;
    if (isBlob(src) || (typeof src === 'string' && src.startsWith('data:'))) {
      frames.set(dst, src);
    } else if (frames.has(src)) {
      frames.set(dst, frames.get(src));
      frames.delete(src);
    }
  },
  copyFile: async (src, dst) => {
    if (!dst) return;
    if (isBlob(src) || (typeof src === 'string' && src.startsWith('data:'))) {
      frames.set(dst, src);
    } else if (frames.has(src)) {
      frames.set(dst, frames.get(src));
    }
  },
  // En web, `capture()` (view-shot shim) devuelve directamente una data URL.
  // El flujo nativo haría `RNFS.readFile(uri, 'base64')` para obtener los
  // bytes; replicamos esa semántica extrayendo la parte base64. También
  // soportamos lecturas desde el almacén interno de frames.
  readFile: async (path, encoding = 'base64') => {
    if (!path) throw new Error('react-native-fs.readFile: empty path');
    const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
    if (isCapacitor && isCapacitorPath(path)) {
      try {
        const { Filesystem } = await import('@capacitor/filesystem');
        const result = await Filesystem.readFile({ path });
        if (encoding === 'base64') return result.data;
        if (encoding === 'utf8') {
          return atob(result.data);
        }
        return result.data;
      } catch (err) {
        console.error('[RNFS shim] Failed reading native file:', err);
        throw err;
      }
    }
    let value = path;
    if (frames.has(path)) value = frames.get(path);
    if (typeof value === 'string' && value.startsWith('data:')) {
      const commaIdx = value.indexOf(',');
      const payload = commaIdx >= 0 ? value.slice(commaIdx + 1) : value;
      if (encoding === 'base64') return payload;
      if (encoding === 'utf8') {
        try {
          return atob(payload);
        } catch (_) {
          return payload;
        }
      }
      return payload;
    }
    if (isBlob(value)) {
      const buffer = await value.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let index = 0; index < bytes.length; index++) {
        binary += String.fromCharCode(bytes[index]);
      }
      if (encoding === 'base64') return btoa(binary);
      if (encoding === 'utf8') return binary;
      return binary;
    }
    throw new Error(`react-native-fs.readFile: unsupported source on web (${String(path).slice(0, 60)})`);
  },
  writeFile: NOT_IMPL('writeFile'),
  stat: NOT_IMPL('stat'),
  // API interna para videoUtils
  __getFrames: () => frames,
};

export default RNFS;
