// shim for react-native-fs — implementación parcial para web.
// Almacén en memoria de "frames" para grabación de video: las capturas
// (data URLs) que el flujo nativo movería a /virtual/frames_XXX/frameNNNN.png
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

const RNFS = {
  CachesDirectoryPath: '/virtual/caches',
  DocumentDirectoryPath: '/virtual/documents',
  TemporaryDirectoryPath: '/virtual/tmp',
  mkdir: async () => {},
  unlink: async (path) => {
    if (!path) return;
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
  exists: async (path) => frames.has(path),
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
    if (typeof src === 'string' && src.startsWith('data:')) {
      frames.set(dst, src);
    } else if (frames.has(src)) {
      frames.set(dst, frames.get(src));
      frames.delete(src);
    }
  },
  copyFile: async (src, dst) => {
    if (!dst) return;
    if (typeof src === 'string' && src.startsWith('data:')) {
      frames.set(dst, src);
    } else if (frames.has(src)) {
      frames.set(dst, frames.get(src));
    }
  },
  readFile: NOT_IMPL('readFile'),
  writeFile: NOT_IMPL('writeFile'),
  stat: NOT_IMPL('stat'),
  // API interna para videoUtils
  __getFrames: () => frames,
};

export default RNFS;
