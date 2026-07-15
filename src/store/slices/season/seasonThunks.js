// store/slices/season/seasonThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { createReadCache } from '@/utils/readCache';

const seasonCache = createReadCache({ ttlMs: 60000 });
const seasonKey = (scope, payload) => seasonCache.key(`season:${scope}`, payload);
const clearSeasonCache = () => seasonCache.clear();

export { clearSeasonCache };

export const fetchTemporadasUsuario = createAsyncThunk(
  'temporada/fetchTemporadasUsuario',
  async ({ usuario }) => {
    return seasonCache.read(seasonKey('user', { usuario }), async () => {
      const res = await api.get(`/season/user/${usuario}`);
      return res.data;
    });
  }
);

export const fetchTemporadaUsuarioSeleccionada = createAsyncThunk(
  'temporada/fetchTemporadasUsuarioSeleccionada',
  async ({ usuario }) => {
    return seasonCache.read(seasonKey('selected', { usuario }), async () => {
      const res = await api.get(`/season/selected/${usuario}`);
      return res.data[0];
    });
  }
);

export const fetchTemporada = createAsyncThunk(
  'temporada/fetchTemporada',
  async ({ id }) => {
    return seasonCache.read(seasonKey('detail', { id }), async () => {
      const res = await api.get(`/season/${id}`);
      return res.data;
    });
  }
);

export const createTemporada = createAsyncThunk(
  'temporada/createTemporada',
  async (nuevaTemporada) => {
    const res = await api.post('/season/create', nuevaTemporada);
    clearSeasonCache();
    return res.data;
  }
);

export const createTemporadaEquipo = createAsyncThunk(
  'temporada/createTemporadaEquipo',
  async (nuevaTemporada) => {
    const res = await api.post('/season/createSeasonTeam', nuevaTemporada);
    clearSeasonCache();
    return res.data;
  }
);

export const updateTemporada = createAsyncThunk(
  'temporada/updateTemporada',
  async ({ id, data }) => {
    const res = await api.post(`/season/${id}`, data);
    clearSeasonCache();
    return res.data;
  }
);

export const updateTemporadaSeleccionada = createAsyncThunk(
  'temporada/updateTemporadaSeleccionada',
  async ({ id, usuario }) => {
    const res = await api.post(`/season/id/${id}/user/${usuario}`);
    clearSeasonCache();
    return res.data[0];
  }
);

export const deleteTemporada = createAsyncThunk(
  'temporada/deleteTemporada',
  async (id) => {
    await api.delete(`/season/${id}`);
    clearSeasonCache();
    return id;
  }
);
