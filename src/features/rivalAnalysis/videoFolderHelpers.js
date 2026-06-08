// Helpers para asegurar la jerarquía de carpetas donde se guardan los vídeos
// tácticos generados desde el formulario de Análisis de Rival.
//
// Estructura: <Análisis Rival> / <Nombre del rival> / <vídeo>
// - El nombre raíz se traduce según el idioma activo.
// - Si la carpeta raíz o la del rival no existen, se crean.
//
// Las llamadas pasan por los wrappers de `@/utils/api` (createVideoFolder
// devuelve `{ success, folder }` ahí) y por `getAllVideoFoldersFlat` que ya
// devuelve `{ success, folders }`.
import { getAllVideoFoldersFlat, createVideoFolder, updateVideoFolder } from '@/utils/api';

const ROOT_FOLDER_COLOR = '#FF5722';
const RIVAL_FOLDER_COLOR = '#FF9800';
const ROOT_FOLDER_NAMES = ['Análisis Rival', 'Rival Analysis'];

// Devuelve el id de carpeta padre como string, sea string u objeto poblado.
function parentIdOf(folder) {
  const p = folder?.parentFolder ?? folder?.parent ?? null;
  if (!p) return null;
  if (typeof p === 'string') return p;
  return p?._id || p?.id || null;
}

function nameOf(folder) {
  // El endpoint `/video-folder/flat` antepone `'  └─ '` al `nombre` de las
  // subcarpetas y deja el nombre real en `displayName`. Usar displayName
  // cuando exista para que la comparación sea fiable.
  return (folder?.displayName || folder?.nombre || folder?.name || '').trim();
}

function findFolder(folders, name, parentId) {
  const lname = (name || '').trim().toLowerCase();
  return folders.find(
    (f) => nameOf(f).toLowerCase() === lname && (parentIdOf(f) || null) === (parentId || null)
  );
}

/**
 * Asegura que existe `<rootName> / <rivalName>` en Mis Vídeos del usuario.
 * Devuelve el `_id` de la carpeta del rival (donde se guardará el vídeo).
 * Si algo falla, devuelve `null` y el vídeo se guardará en la raíz.
 */
export async function ensureRivalAnalysisFolder({ rootName, rivalName, lang }) {
  if (!rootName || !rivalName) return null;
  try {
    let result = await getAllVideoFoldersFlat(lang);
    let folders = result?.folders || result?.data?.folders || [];

    const rootNames = Array.from(new Set([rootName, ...ROOT_FOLDER_NAMES]));
    let root = rootNames.map((name) => findFolder(folders, name, null)).find(Boolean);
    if (!root) {
      const created = await createVideoFolder({
        nombre: rootName,
        parentFolder: null,
        color: ROOT_FOLDER_COLOR,
      });
      root = created?.folder;
      // Refrescar listado para que el find del rival funcione bien.
      result = await getAllVideoFoldersFlat(lang);
      folders = result?.folders || result?.data?.folders || [];
    }
    if (!root?._id) return null;

    let rival = findFolder(folders, rivalName, root._id);
    if (!rival) {
      const created = await createVideoFolder({
        nombre: rivalName,
        parentFolder: root._id,
        color: RIVAL_FOLDER_COLOR,
      });
      rival = created?.folder;
    }
    return rival?._id || null;
  } catch (err) {
    console.warn('[ensureRivalAnalysisFolder] failed:', err?.message || err);
    return null;
  }
}

export async function renameRivalAnalysisFolder(folderId, rivalName) {
  const nextName = (rivalName || '').trim();
  if (!folderId || !nextName) return false;
  try {
    await updateVideoFolder(folderId, {
      nombre: nextName,
      color: RIVAL_FOLDER_COLOR,
    });
    return true;
  } catch (err) {
    console.warn('[renameRivalAnalysisFolder] failed:', err?.message || err);
    return false;
  }
}
