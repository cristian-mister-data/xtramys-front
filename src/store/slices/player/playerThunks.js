// store/slices/player/playerThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';

export const fetchJugadoresEquipo = createAsyncThunk(
  'jugador/fetchJugadoresEquipo',
  async ({ team }) => {
    const res = await api.get(`/player/team/${team}`);
    return res.data;
  }
);

export const fetchJugadorEquipo = createAsyncThunk(
  'jugador/fetchJugadorEquipo',
  async ({ id }, { rejectWithValue }) => {
    try {
      console.log('[fetchJugadorEquipo] GET /player/' + id);
      const res = await api.get(`/player/${id}`);
      console.log('[fetchJugadorEquipo] OK status=', res?.status, 'data=', res?.data, 'keys=', res?.data && typeof res.data === 'object' ? Object.keys(res.data) : null);
      // Algunos endpoints devuelven { player: {...} } o { jugador: {...} } en lugar del objeto raíz.
      const payload = res?.data?.player || res?.data?.jugador || res?.data;
      return payload;
    } catch (err) {
      console.error('[fetchJugadorEquipo] FAIL', err?.response?.status, err?.response?.data || err?.message);
      return rejectWithValue(err?.response?.data || err?.message);
    }
  }
);

export const fetchPlayerStats = createAsyncThunk(
  'jugador/fetchPlayerStats',
  async ({ playerId, teamId }) => {
    const url = teamId
      ? `/player/stats/${playerId}?team=${teamId}`
      : `/player/stats/${playerId}`;
    const res = await api.get(url);
    return res.data;
  }
);

export const createJugador = createAsyncThunk('jugador/createJugador', async (nuevoJugador) => {
  const res = await api.post('/player/create', nuevoJugador);
  return res.data;
});

export const updateJugador = createAsyncThunk('jugador/updateJugador', async ({ id, data }) => {
  const res = await api.post(`/player/${id}`, data);
  return res.data;
});

export const deleteJugador = createAsyncThunk('jugador/deleteJugador', async (id) => {
  await api.delete(`/player/${id}`);
  return id;
});
