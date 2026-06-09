import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'xtramys.favorites';

const FAVORITE_KEYS = {
  exercise: {
    favorites: `${STORAGE_PREFIX}.exercise`,
    unfavorites: `${STORAGE_PREFIX}.exercise.unfavorite`,
  },
  strategy: {
    favorites: `${STORAGE_PREFIX}.strategy`,
    unfavorites: `${STORAGE_PREFIX}.strategy.unfavorite`,
  },
};

export const getItemId = (item) => item?._id || item?.id || item;

export const sameId = (a, b) => String(a || '') === String(b || '');

export const getFavoriteValue = (item) => {
  if (typeof item?.favorito === 'boolean') return item.favorito;
  if (typeof item?.isFavorite === 'boolean') return item.isFavorite;
  if (typeof item?.favorite === 'boolean') return item.favorite;
  return false;
};

const getKeys = (type) => {
  const keys = FAVORITE_KEYS[type];
  if (!keys) throw new Error(`Unknown favorite type: ${type}`);
  return keys;
};

const readSet = async (key) => {
  const raw = await AsyncStorage.getItem(key);
  const parsed = raw ? JSON.parse(raw) : [];
  return new Set(Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []);
};

const writeSet = (key, valueSet) => (
  AsyncStorage.setItem(key, JSON.stringify([...valueSet]))
);

export const readFavoritePrefs = async (type) => {
  const keys = getKeys(type);
  const [favorites, unfavorites] = await Promise.all([
    readSet(keys.favorites),
    readSet(keys.unfavorites),
  ]);
  return { favorites, unfavorites };
};

export const persistFavoriteState = async (type, itemId, favorito) => {
  const id = String(itemId || '');
  if (!id || typeof favorito !== 'boolean') return;
  const keys = getKeys(type);
  const { favorites, unfavorites } = await readFavoritePrefs(type);

  if (favorito) {
    favorites.add(id);
    unfavorites.delete(id);
  } else {
    favorites.delete(id);
    unfavorites.add(id);
  }

  await Promise.all([
    writeSet(keys.favorites, favorites),
    writeSet(keys.unfavorites, unfavorites),
  ]);
};

export const applyFavoritePrefsToItem = (item, prefs) => {
  if (!item) return item;
  const id = getItemId(item);
  const idKey = String(id || '');
  const favorito = Boolean(
    idKey
      && !prefs.unfavorites.has(idKey)
      && (getFavoriteValue(item) || prefs.favorites.has(idKey))
  );
  return { ...item, favorito };
};

export const applyFavoritePrefsToItems = (items = [], prefs) => (
  items.filter(Boolean).map((item) => applyFavoritePrefsToItem(item, prefs))
);

export const normalizeFavoritePayload = (payload, fallbackId, fallbackFavorite) => {
  const item = payload?.exercise || payload?.strategy || payload?.item || payload?.data || payload;
  const id = getItemId(item) || fallbackId;
  const favoriteFromPayload = getFavoriteValue(item);
  const favorito = typeof item?.favorito === 'boolean'
    || typeof item?.isFavorite === 'boolean'
    || typeof item?.favorite === 'boolean'
    ? favoriteFromPayload
    : fallbackFavorite;

  return { ...(typeof item === 'object' && item ? item : {}), _id: id, favorito: !!favorito };
};
