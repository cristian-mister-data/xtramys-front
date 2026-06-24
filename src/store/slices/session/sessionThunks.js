// store/slices/session/sessionThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { createReadCache } from '@/utils/readCache';

const sessionCache = createReadCache({ ttlMs: 60000 });
const sessionKey = (scope, payload) => sessionCache.key(`session:${scope}`, payload);
const clearSessionCache = () => sessionCache.clear();

export const fetchEntrenamientosTemporada = createAsyncThunk(
  'entrenamiento/fetchEntrenamientosTemporada',
  async ({ temporada }) => {
    return sessionCache.read(sessionKey('season', { temporada }), async () => {
      const res = await api.get(`/session/season/${temporada}`);
      return res.data;
    });
  }
);

export const fetchEntrenamientosPorEquipo = createAsyncThunk(
  'entrenamiento/fetchEntrenamientosPorEquipo',
  async ({ team }) => {
    return sessionCache.read(sessionKey('team', { team }), async () => {
      const res = await api.get(`/session/team/${team}`);
      return res.data;
    });
  }
);

export const fetchEntrenamiento = createAsyncThunk(
  'entrenamiento/fetchEntrenamiento',
  async ({ id }) => {
    return sessionCache.read(sessionKey('detail', { id }), async () => {
      const res = await api.get(`/session/${id}`);
      return res.data;
    });
  }
);

export const createEntrenamiento = createAsyncThunk(
  'entrenamiento/createEntrenamiento',
  async (nuevoEntrenamiento) => {
    const res = await api.post('/session/create', nuevoEntrenamiento);
    clearSessionCache();
    return res.data;
  }
);

export const createEntrenamientoBulk = createAsyncThunk(
  'entrenamiento/createEntrenamientoBulk',
  async (nuevoEntrenamiento) => {
    const res = await api.post('/session/team/create', nuevoEntrenamiento);
    clearSessionCache();
    return res.data;
  }
);

export const updateEntrenamiento = createAsyncThunk(
  'entrenamiento/updateEntrenamiento',
  async ({ id, data }) => {
    const res = await api.post(`/session/${id}`, data);
    clearSessionCache();
    return Array.isArray(res.data) ? res.data[0] : res.data;
  }
);

export const deleteEntrenamiento = createAsyncThunk(
  'entrenamiento/deleteEntrenamiento',
  async (id) => {
    await api.delete(`/session/${id}`);
    clearSessionCache();
    return id;
  }
);
