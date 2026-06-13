// store/slices/strategy/strategyThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { linkVideoToStrategy } from '@/api/video';
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
  async ({ user, lang, filterType } = {}) => {
    const queryParams = [];
    if (lang) queryParams.push(`lang=${lang}`);
    if (filterType) queryParams.push(`filterType=${filterType}`);
    const params = queryParams.length ? `?${queryParams.join('&')}` : '';
    const res = await api.get(`/strategy/user/${user}${params}`);
    return applyStrategyFavoritePrefs(res.data);
  }
);

export const fetchEstrategiasTemporada = createAsyncThunk(
  'strategy/fetchEstrategiasTemporada',
  async ({ season, lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/strategy/season/${season}${params}`);
    return applyStrategyFavoritePrefs(res.data);
  }
);

export const fetchEstrategia = createAsyncThunk('strategy/fetchEstrategia', async ({ id, lang } = {}) => {
  const params = lang ? `?lang=${lang}` : '';
  const res = await api.get(`/strategy/${id}${params}`);
  return applyStrategyFavoritePrefs(res.data);
});

export const fetchGlobalStrategies = createAsyncThunk(
  'strategy/fetchGlobalStrategies',
  async ({ lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/strategy/global${params}`);
    return applyStrategyFavoritePrefs(res.data);
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
    return created;
  }
);

export const updateEstrategia = createAsyncThunk(
  'strategy/updateEstrategia',
  async (strategy) => {
    const { pendingVideoIds, ...strategyData } = strategy || {};
    const res = await api.post(`/strategy/${strategyData?._id}`, strategyData);
    await replaceStrategyVideos(strategyData?._id, pendingVideoIds);
    return res.data;
  }
);

export const deleteEstrategia = createAsyncThunk('strategy/deleteEstrategia', async (id) => {
  await api.delete(`/strategy/${id}`);
  return id;
});

// ========== Carpetas de estrategias ==========

export const fetchStrategyFolders = createAsyncThunk(
  'strategy/fetchStrategyFolders',
  async ({ parentFolder, lang } = {}) => {
    const queryParams = [];
    if (parentFolder) queryParams.push(`parentFolder=${parentFolder}`);
    if (lang) queryParams.push(`lang=${lang}`);
    const params = queryParams.length ? `?${queryParams.join('&')}` : '';
    const res = await api.get(`/strategy-folder${params}`);
    return res.data.folders;
  }
);

export const fetchGlobalFolders = createAsyncThunk(
  'strategy/fetchGlobalFolders',
  async ({ lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/strategy-folder/global${params}`);
    return res.data.folders;
  }
);

export const fetchStrategyFolderById = createAsyncThunk(
  'strategy/fetchStrategyFolderById',
  async ({ id, lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/strategy-folder/${id}${params}`);
    const prefs = await readFavoritePrefs('strategy');
    return {
      ...res.data,
      strategies: applyFavoritePrefsToItems(res.data?.strategies || [], prefs),
    };
  }
);

export const fetchStrategyFoldersFlat = createAsyncThunk(
  'strategy/fetchStrategyFoldersFlat',
  async ({ lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/strategy-folder/flat${params}`);
    return res.data.folders;
  }
);

export const createStrategyFolder = createAsyncThunk(
  'strategy/createStrategyFolder',
  async ({ nombre, parentFolder, color, isGlobal, translations }) => {
    const res = await api.post('/strategy-folder', {
      nombre, parentFolder, color, isGlobal, translations,
    });
    return res.data.folder;
  }
);

export const updateStrategyFolder = createAsyncThunk(
  'strategy/updateStrategyFolder',
  async ({ id, nombre, color, translations }) => {
    const res = await api.put(`/strategy-folder/${id}`, { nombre, color, translations });
    return res.data.folder;
  }
);

export const deleteStrategyFolder = createAsyncThunk(
  'strategy/deleteStrategyFolder',
  async ({ id, moveStrategiesTo, deleteContents }) => {
    await api.delete(`/strategy-folder/${id}`, { data: { moveStrategiesTo, deleteContents } });
    return id;
  }
);

export const moveStrategyToFolder = createAsyncThunk(
  'strategy/moveStrategyToFolder',
  async ({ strategyId, folderId }) => {
    await api.post('/strategy-folder/move-strategy', { strategyId, folderId });
    return { strategyId, folderId };
  }
);

export const duplicateStrategyToFolder = createAsyncThunk(
  'strategy/duplicateStrategyToFolder',
  async ({ strategyId, folderId, duplicateName, lang }) => {
    const res = await api.post('/strategy-folder/duplicate-strategy', {
      strategyId, folderId, duplicateName, lang,
    });
    return res.data.strategy;
  }
);

export const duplicateGlobalStrategy = createAsyncThunk(
  'strategy/duplicateGlobalStrategy',
  async ({ strategyId, folderId, duplicateName, lang }) => {
    const res = await api.post('/strategy-folder/duplicate-global', {
      strategyId, folderId, duplicateName, lang,
    });
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
      return payload;
    } catch (error) {
      const isPermissionFallback = error?.status === 403 || error?.status === 404;
      if (!isPermissionFallback) throw error;

      await persistFavoriteState('strategy', strategyId, optimisticFavorite);
      return { _id: strategyId, favorito: optimisticFavorite };
    }
  }
);

export const batchDeleteStrategies = createAsyncThunk(
  'strategy/batchDeleteStrategies',
  async (ids) => {
    const res = await api.post('/strategy/batch-delete', { ids });
    return res.data; // { deleted, ids }
  }
);

export const batchMoveStrategies = createAsyncThunk(
  'strategy/batchMoveStrategies',
  async ({ ids, folderId }) => {
    const res = await api.post('/strategy/batch-move', { ids, folderId });
    return res.data; // { moved, folderId }
  }
);

