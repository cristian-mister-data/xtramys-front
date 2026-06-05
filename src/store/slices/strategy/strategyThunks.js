// store/slices/strategy/strategyThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { linkVideoToStrategy } from '@/api/video';

export const fetchEstrategiasUsuario = createAsyncThunk(
  'strategy/fetchEstrategiasUsuario',
  async ({ user, lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/strategy/user/${user}${params}`);
    return res.data;
  }
);

export const fetchEstrategiasTemporada = createAsyncThunk(
  'strategy/fetchEstrategiasTemporada',
  async ({ season, lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/strategy/season/${season}${params}`);
    return res.data;
  }
);

export const fetchEstrategia = createAsyncThunk('strategy/fetchEstrategia', async ({ id, lang } = {}) => {
  const params = lang ? `?lang=${lang}` : '';
  const res = await api.get(`/strategy/${id}${params}`);
  return res.data;
});

export const fetchGlobalStrategies = createAsyncThunk(
  'strategy/fetchGlobalStrategies',
  async ({ lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/strategy/global${params}`);
    return res.data;
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
    const res = await api.post(`/strategy/${strategy?._id}`, strategy);
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
    return res.data;
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
  async (strategyId) => {
    const res = await api.patch(`/strategy/${strategyId}/favorite`);
    return res.data; // { _id, favorito }
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

