import {
  clearFormDraft,
  loadFormDrafts,
  STORAGE_KEYS,
} from './formPersistence.js';

const parseBoardConfig = (value) => {
  if (!value || typeof value === 'object') return value || {};
  try { return JSON.parse(value); } catch { return {}; }
};

const migrationKey = (value) => {
  const source = JSON.stringify(value);
  let hash = 14695981039346656037n;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= BigInt(source.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return `abp-v1-${hash.toString(36)}-${source.length}`;
};

export function buildRecoveredSetPiece(draft = {}, fieldResult = {}) {
  const data = { ...draft, ...fieldResult };
  const fieldElements = Array.isArray(data.fieldElements) ? data.fieldElements : [];
  if (!String(data.name || data.imagen || data.importedImage || '').trim() && fieldElements.length === 0) return null;

  const payload = {
    nombre: String(data.name || `ABP recuperada ${new Date().toLocaleDateString()}`).trim(),
    descripcion: String(data.description || ''),
    objetivo: String(data.objective || ''),
    videoUrl: String(data.videoUrl || '').trim(),
    folder: data.folderId || undefined,
    imagen: data.imagen || '',
    importedImage: data.importedImage || '',
    hasImportedImage: Boolean(data.importedImage),
    visualSource: data.visualSource === 'imported' && data.importedImage ? 'imported' : 'board',
    elementosCampo: fieldElements,
    tipoCampo: data.fieldType || '',
    pizarraConfig: { ...parseBoardConfig(data.pizarraConfig), setPieceMode: true },
    kind: 'setPiece',
    visibility: data.visibility || 'PRIVATE',
    isGlobal: Boolean(data.isGlobal),
    sharedWithFriends: Boolean(data.friendSharing?.sharedWithFriends),
    shareWithAll: Boolean(data.friendSharing?.shareWithAll),
    sharingFriendIds: data.friendSharing?.sharingFriendIds || [],
    translations: data.nameEn || data.descriptionEn || data.objectiveEn
      ? { en: { nombre: data.nameEn || '', descripcion: data.descriptionEn || '', objetivo: data.objectiveEn || '' } }
      : undefined,
    pendingVideoIds: Array.isArray(data.pendingVideoIds) ? data.pendingVideoIds : undefined,
  };
  payload.legacyMigrationKey = migrationKey(payload);
  if (data.editingId) payload._id = data.editingId;
  return payload;
}

export function getLocalSetPieceMigration() {
  const draft = loadFormDrafts(STORAGE_KEYS.STRATEGY_FORM_DRAFT).find((item) => item?.kind === 'setPiece');
  const result = loadFormDrafts(STORAGE_KEYS.FIELD_RESULT).find((item) => (
    item?.kind === 'setPiece' && (item.editingId || null) === (draft?.editingId || null)
  ));
  return buildRecoveredSetPiece(draft, result);
}

export function clearLocalSetPieceMigration() {
  clearFormDraft(STORAGE_KEYS.STRATEGY_LIST);
  clearFormDraft(STORAGE_KEYS.STRATEGY_FORM_DRAFT);
  clearFormDraft(STORAGE_KEYS.FIELD_RESULT);
}
