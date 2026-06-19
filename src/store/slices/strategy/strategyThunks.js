// store/slices/strategy/strategyThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { linkVideoToStrategy } from '@/api/video';
import { createReadCache } from '@/utils/readCache';
import {
  applyFavoritePrefsToItem,
  applyFavoritePrefsToItems,
  normalizeFavoritePayload,
  persistFavoriteState,
  readFavoritePrefs,
  sameId,
  getItemId,
} from '@/utils/favoritePersistence';

const getVideoId = (video) => video?._id || video?.id || video;
const strategyReadCache = createReadCache({ ttlMs: 60000 });
const strategyCacheKey = (scope, payload) => strategyReadCache.key(`strategy:${scope}`, payload);
const invalidateStrategyReads = () => strategyReadCache.clear();

const applyStrategyFavoritePrefs = async (items) => {
  const prefs = await readFavoritePrefs('strategy');
  return Array.isArray(items)
    ? applyFavoritePrefsToItems(items, prefs)
    : applyFavoritePrefsToItem(items, prefs);
};

const findStrategyFavorite = (state, strategyId) => {
  const lists = [
    state?.strategy?.strategies || [],
    state?.strategy?.currentFolderStrategies || [],
    state?.strategy?.globalStrategies || [],
    state?.strategy?.strategy ? [state.strategy.strategy] : [],
  ];
  return lists.flat().find((item) => sameId(getItemId(item), strategyId))?.favorito;
};

const replaceStrategyVideos = async (strategyId, pendingVideoIds = []) => {
  if (!strategyId || pendingVideoIds.length === 0) return;

  const currentRes = await api.get(`/video/strategy/${strategyId}`);
  const currentVideos = currentRes?.data?.videos || currentRes?.data || [];
  const pendingSet = new Set(pendingVideoIds.map(String));

  for (const video of currentVideos) {
    const videoId = getVideoId(video);
    if (!videoId || pendingSet.has(String(videoId))) continue;

    try {
      await api.post('/video/unlink-strategy', { videoId, strategyId });
    } catch (error) {
      console.error('Error desasociando video anterior:', error);
    }

    try {
      await api.delete(`/video/${videoId}`);
    } catch (error) {
      console.error('Error eliminando video anterior:', error);
    }
  }

  for (const videoId of pendingVideoIds) {
    try {
      await linkVideoToStrategy({ videoId, strategyId });
    } catch (error) {
      console.error('Error asociando video pendiente:', error);
    }
  }
};

export const fetchEstrategiasUsuario = createAsyncThunk(
  'strategy/fetchEstrategiasUsuario',
  async ({ user, lang, filterType, kind } = {}) => {
    const cacheKey = strategyCacheKey('user', { user, lang, filterType, kind });
    return strategyReadCache.read(cacheKey, async () => {
      const queryParams = [];
      if (lang) queryParams.push(`lang=${lang}`);
      if (filterType) queryParams.push(`filterType=${filterType}`);
      if (kind) queryParams.push(`kind=${kind}`);
      const params = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/strategy/user/${user}${params}`);
      return applyStrategyFavoritePrefs(res.data);
    });
  }
);

export const fetchEstrategiasTemporada = createAsyncThunk(
  'strategy/fetchEstrategiasTemporada',
  async ({ season, lang } = {}) => {
    const cacheKey = strategyCacheKey('season', { season, lang });
    return strategyReadCache.read(cacheKey, async () => {
      const params = lang ? `?lang=${lang}` : '';
      const res = await api.get(`/strategy/season/${season}${params}`);
      return applyStrategyFavoritePrefs(res.data);
    });
  }
);

export const fetchEstrategia = createAsyncThunk('strategy/fetchEstrategia', async ({ id, lang } = {}) => {
  const cacheKey = strategyCacheKey('detail', { id, lang });
  return strategyReadCache.read(cacheKey, async () => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/strategy/${id}${params}`);
    return applyStrategyFavoritePrefs(res.data);
  });
});

export const fetchGlobalStrategies = createAsyncThunk(
  'strategy/fetchGlobalStrategies',
  async ({ lang, kind } = {}) => {
    const cacheKey = strategyCacheKey('global', { lang, kind });
    return strategyReadCache.read(cacheKey, async () => {
      const queryParams = [];
      if (lang) queryParams.push(`lang=${lang}`);
      if (kind) queryParams.push(`kind=${kind}`);
      const params = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/strategy/global${params}`);
      return applyStrategyFavoritePrefs(res.data);
    });
  }
);

export const createEstrategia = createAsyncThunk(
  'strategy/createEstrategia',
  async (nuevaEstrategia) => {
    const { pendingVideoIds, ...strategyData } = nuevaEstrategia;
    const res = await api.post('/strategy/create', strategyData);
    const created = res.data;
    if (pendingVideoIds && pendingVideoIds.length > 0 && created?._id) {
      for (const videoId of pendingVideoIds) {
        try {
          await linkVideoToStrategy({ videoId, strategyId: created._id });
        } catch (error) {
          console.error('Error asociando video pendiente:', error);
        }
      }
    }
    invalidateStrategyReads();
    return created;
  }
);

export const updateEstrategia = createAsyncThunk(
  'strategy/updateEstrategia',
  async (strategy) => {
    const { pendingVideoIds, ...strategyData } = strategy || {};
    const res = await api.post(`/strategy/${strategyData?._id}`, strategyData);
    await replaceStrategyVideos(strategyData?._id, pendingVideoIds);
    invalidateStrategyReads();
    return res.data;
  }
);

export const deleteEstrategia = createAsyncThunk('strategy/deleteEstrategia', async (id) => {
  await api.delete(`/strategy/${id}`);
  invalidateStrategyReads();
  return id;
});

// ========== Carpetas de estrategias ==========

export const fetchStrategyFolders = createAsyncThunk(
  'strategy/fetchStrategyFolders',
  async ({ parentFolder, lang, user, kind } = {}) => {
    const cacheKey = strategyCacheKey('folders', { parentFolder, lang, user, kind });
    return strategyReadCache.read(cacheKey, async () => {
      const queryParams = [];
      if (parentFolder) queryParams.push(`parentFolder=${parentFolder}`);
      if (lang) queryParams.push(`lang=${lang}`);
      if (user) queryParams.push(`user=${user}`);
      if (kind) queryParams.push(`kind=${kind}`);
      const params = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/strategy-folder${params}`);
      return res.data.folders;
    });
  }
);

export const fetchGlobalFolders = createAsyncThunk(
  'strategy/fetchGlobalFolders',
  async ({ lang, kind } = {}) => {
    const cacheKey = strategyCacheKey('global-folders', { lang, kind });
    return strategyReadCache.read(cacheKey, async () => {
      const queryParams = [];
      if (lang) queryParams.push(`lang=${lang}`);
      if (kind) queryParams.push(`kind=${kind}`);
      const params = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/strategy-folder/global${params}`);
      return res.data.folders;
    });
  }
);

export const fetchStrategyFolderById = createAsyncThunk(
  'strategy/fetchStrategyFolderById',
  async ({ id, lang, user, kind } = {}) => {
    const cacheKey = strategyCacheKey('folder-detail', { id, lang, user, kind });
    return strategyReadCache.read(cacheKey, async () => {
      const queryParams = [];
      if (lang) queryParams.push(`lang=${lang}`);
      if (user) queryParams.push(`user=${user}`);
      if (kind) queryParams.push(`kind=${kind}`);
      const params = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/strategy-folder/${id}${params}`);
      const prefs = await readFavoritePrefs('strategy');
      return {
        ...res.data,
        strategies: applyFavoritePrefsToItems(res.data?.strategies || [], prefs),
      };
    });
  }
);

export const fetchStrategyFoldersFlat = createAsyncThunk(
  'strategy/fetchStrategyFoldersFlat',
  async ({ lang, user, kind } = {}) => {
    const cacheKey = strategyCacheKey('folders-flat', { lang, user, kind });
    return strategyReadCache.read(cacheKey, async () => {
      const queryParams = [];
      if (lang) queryParams.push(`lang=${lang}`);
      if (user) queryParams.push(`user=${user}`);
      if (kind) queryParams.push(`kind=${kind}`);
      const params = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/strategy-folder/flat${params}`);
      return res.data.folders;
    });
  }
);

export const createStrategyFolder = createAsyncThunk(
  'strategy/createStrategyFolder',
  async ({ nombre, parentFolder, color, isGlobal, translations, user }) => {
    const res = await api.post('/strategy-folder', {
      nombre, parentFolder, color, isGlobal, translations, usuario: user,
    });
    invalidateStrategyReads();
    return res.data.folder;
  }
);

export const updateStrategyFolder = createAsyncThunk(
  'strategy/updateStrategyFolder',
  async ({ id, nombre, color, translations, user }) => {
    const res = await api.put(`/strategy-folder/${id}`, { nombre, color, translations, user });
    invalidateStrategyReads();
    return res.data.folder;
  }
);

export const deleteStrategyFolder = createAsyncThunk(
  'strategy/deleteStrategyFolder',
  async ({ id, moveStrategiesTo, deleteContents, user }) => {
    await api.delete(`/strategy-folder/${id}`, { data: { moveStrategiesTo, deleteContents, user } });
    invalidateStrategyReads();
    return id;
  }
);

export const moveStrategyToFolder = createAsyncThunk(
  'strategy/moveStrategyToFolder',
  async ({ strategyId, folderId, user }) => {
    await api.post('/strategy-folder/move-strategy', { strategyId, folderId, user });
    invalidateStrategyReads();
    return { strategyId, folderId };
  }
);

export const duplicateStrategyToFolder = createAsyncThunk(
  'strategy/duplicateStrategyToFolder',
  async ({ strategyId, folderId, duplicateName, lang, user }) => {
    const res = await api.post('/strategy-folder/duplicate-strategy', {
      strategyId, folderId, duplicateName, lang, user,
    });
    invalidateStrategyReads();
    return res.data.strategy;
  }
);

export const duplicateGlobalStrategy = createAsyncThunk(
  'strategy/duplicateGlobalStrategy',
  async ({ strategyId, folderId, duplicateName, lang, user }) => {
    const res = await api.post('/strategy-folder/duplicate-global', {
      strategyId, folderId, duplicateName, lang, user,
    });
    invalidateStrategyReads();
    return res.data.strategy;
  }
);

export const copyClubStrategyToMine = createAsyncThunk(
  'strategy/copyClubStrategyToMine',
  async ({ strategyId, folderId, duplicateName, lang, user }) => {
    const res = await api.post('/strategy-folder/copy-club', {
      strategyId, folderId, duplicateName, lang, user,
    });
    invalidateStrategyReads();
    return res.data.strategy;
  }
);

export const toggleFavoriteStrategy = createAsyncThunk(
  'strategy/toggleFavoriteStrategy',
  async (payloadArg, { getState }) => {
    const strategyId = typeof payloadArg === 'object' ? payloadArg.strategyId : payloadArg;
    const expectedFavorite = typeof payloadArg === 'object' ? payloadArg.favorito : undefined;
    const fallbackFavorite = findStrategyFavorite(getState(), strategyId);
    const optimisticFavorite = expectedFavorite ?? !fallbackFavorite;

    try {
      const res = await api.patch(`/strategy/${strategyId}/favorite`);
      const payload = normalizeFavoritePayload(res.data, strategyId, optimisticFavorite);
      if (typeof expectedFavorite === 'boolean') payload.favorito = expectedFavorite;
      await persistFavoriteState('strategy', strategyId, payload.favorito);
      invalidateStrategyReads();
      return payload;
    } catch (error) {
      const isPermissionFallback = error?.status === 403 || error?.status === 404;
      if (!isPermissionFallback) throw error;

      await persistFavoriteState('strategy', strategyId, optimisticFavorite);
      invalidateStrategyReads();
      return { _id: strategyId, favorito: optimisticFavorite };
    }
  }
);

export const batchDeleteStrategies = createAsyncThunk(
  'strategy/batchDeleteStrategies',
  async (payload) => {
    const body = Array.isArray(payload) ? { ids: payload } : payload;
    const res = await api.post('/strategy/batch-delete', body);
    invalidateStrategyReads();
    return res.data; // { deleted, ids }
  }
);

export const batchMoveStrategies = createAsyncThunk(
  'strategy/batchMoveStrategies',
  async ({ ids, folderId, user }) => {
    const res = await api.post('/strategy/batch-move', { ids, folderId, user });
    invalidateStrategyReads();
    return res.data; // { moved, folderId }
  }
);

