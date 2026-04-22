// store/slices/strategy/strategyThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { linkVideoToStrategy } from '@/api/video';

export const fetchEstrategiasUsuario = createAsyncThunk(
  'strategy/fetchEstrategiasUsuario',
  async ({ user }) => {
    const res = await api.get(`/strategy/user/${user}`);
    return res.data;
  }
);

export const fetchEstrategiasTemporada = createAsyncThunk(
  'strategy/fetchEstrategiasTemporada',
  async ({ season }) => {
    const res = await api.get(`/strategy/season/${season}`);
    return res.data;
  }
);

export const fetchEstrategia = createAsyncThunk('strategy/fetchEstrategia', async ({ id }) => {
  const res = await api.get(`/strategy/${id}`);
  return res.data;
});

export const fetchGlobalStrategies = createAsyncThunk(
  'strategy/fetchGlobalStrategies',
  async () => {
    const res = await api.get('/strategy/global');
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
  async ({ parentFolder } = {}) => {
    const params = parentFolder ? `?parentFolder=${parentFolder}` : '';
    const res = await api.get(`/strategy-folder${params}`);
    return res.data.folders;
  }
);

export const fetchStrategyFolderById = createAsyncThunk(
  'strategy/fetchStrategyFolderById',
  async ({ id }) => {
    const res = await api.get(`/strategy-folder/${id}`);
    return res.data;
  }
);

export const fetchStrategyFoldersFlat = createAsyncThunk(
  'strategy/fetchStrategyFoldersFlat',
  async () => {
    const res = await api.get('/strategy-folder/flat');
    return res.data.folders;
  }
);

export const createStrategyFolder = createAsyncThunk(
  'strategy/createStrategyFolder',
  async ({ nombre, parentFolder, color }) => {
    const res = await api.post('/strategy-folder', { nombre, parentFolder, color });
    return res.data.folder;
  }
);

export const updateStrategyFolder = createAsyncThunk(
  'strategy/updateStrategyFolder',
  async ({ id, nombre, color }) => {
    const res = await api.put(`/strategy-folder/${id}`, { nombre, color });
    return res.data.folder;
  }
);

export const deleteStrategyFolder = createAsyncThunk(
  'strategy/deleteStrategyFolder',
  async ({ id, moveStrategiesTo }) => {
    await api.delete(`/strategy-folder/${id}`, { data: { moveStrategiesTo } });
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
  async ({ strategyId, folderId }) => {
    const res = await api.post('/strategy-folder/duplicate-strategy', { strategyId, folderId });
    return res.data.strategy;
  }
);

export const duplicateGlobalStrategy = createAsyncThunk(
  'strategy/duplicateGlobalStrategy',
  async ({ strategyId, folderId }) => {
    const res = await api.post('/strategy-folder/duplicate-global', { strategyId, folderId });
    return res.data.strategy;
  }
);
