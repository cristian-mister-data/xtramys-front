// store/slices/season/seasonThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';

export const fetchTemporadasUsuario = createAsyncThunk(
  'temporada/fetchTemporadasUsuario',
  async ({ usuario }) => {
    const res = await api.get(`/season/user/${usuario}`);
    return res.data;
  }
);

export const fetchTemporadaUsuarioSeleccionada = createAsyncThunk(
  'temporada/fetchTemporadasUsuarioSeleccionada',
  async ({ usuario }) => {
    const res = await api.get(`/season/selected/${usuario}`);
    return res.data[0];
  }
);

export const fetchTemporada = createAsyncThunk(
  'temporada/fetchTemporada',
  async ({ id }) => {
    const res = await api.get(`/season/${id}`);
    return res.data;
  }
);

export const createTemporada = createAsyncThunk(
  'temporada/createTemporada',
  async (nuevaTemporada) => {
    const res = await api.post('/season/create', nuevaTemporada);
    return res.data;
  }
);

export const createTemporadaEquipo = createAsyncThunk(
  'temporada/createTemporadaEquipo',
  async (nuevaTemporada) => {
    const res = await api.post('/season/createSeasonTeam', nuevaTemporada);
    return res.data;
  }
);

export const updateTemporada = createAsyncThunk(
  'temporada/updateTemporada',
  async ({ id, data }) => {
    const res = await api.post(`/season/${id}`, data);
    return res.data;
  }
);

export const updateTemporadaSeleccionada = createAsyncThunk(
  'temporada/updateTemporadaSeleccionada',
  async ({ id, usuario }) => {
    const res = await api.post(`/season/id/${id}/user/${usuario}`);
    return res.data[0];
  }
);

export const deleteTemporada = createAsyncThunk(
  'temporada/deleteTemporada',
  async (id) => {
    await api.delete(`/season/${id}`);
    return id;
  }
);
