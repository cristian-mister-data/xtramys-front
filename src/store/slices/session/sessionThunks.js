// store/slices/session/sessionThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';

export const fetchEntrenamientosTemporada = createAsyncThunk(
  'entrenamiento/fetchEntrenamientosTemporada',
  async ({ temporada }) => {
    const res = await api.get(`/session/season/${temporada}`);
    return res.data;
  }
);

export const fetchEntrenamientosPorEquipo = createAsyncThunk(
  'entrenamiento/fetchEntrenamientosPorEquipo',
  async ({ team }) => {
    const res = await api.get(`/session/team/${team}`);
    return res.data;
  }
);

export const fetchEntrenamiento = createAsyncThunk(
  'entrenamiento/fetchEntrenamiento',
  async ({ id }) => {
    const res = await api.get(`/session/${id}`);
    return res.data;
  }
);

export const createEntrenamiento = createAsyncThunk(
  'entrenamiento/createEntrenamiento',
  async (nuevoEntrenamiento) => {
    const res = await api.post('/session/create', nuevoEntrenamiento);
    return res.data;
  }
);

export const createEntrenamientoBulk = createAsyncThunk(
  'entrenamiento/createEntrenamientoBulk',
  async (nuevoEntrenamiento) => {
    const res = await api.post('/session/team/create', nuevoEntrenamiento);
    return res.data;
  }
);

export const updateEntrenamiento = createAsyncThunk(
  'entrenamiento/updateEntrenamiento',
  async ({ id, data }) => {
    const res = await api.post(`/session/${id}`, data);
    return res.data;
  }
);

export const deleteEntrenamiento = createAsyncThunk(
  'entrenamiento/deleteEntrenamiento',
  async (id) => {
    await api.delete(`/session/${id}`);
    return id;
  }
);
