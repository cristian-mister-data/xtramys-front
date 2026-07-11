// store/slices/player/playerThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { createReadCache } from '@/utils/readCache';

const playerCache = createReadCache({ ttlMs: 60000 });
const playerKey = (scope, payload) => playerCache.key(`player:${scope}`, payload);
const clearPlayerCache = () => playerCache.clear();

export const fetchJugadoresEquipo = createAsyncThunk(
  'jugador/fetchJugadoresEquipo',
  async ({ team }) => playerCache.read(playerKey('team', { team }), async () => {
    const res = await api.get(`/player/team/${team}?includeInactive=true`);
    return res.data;
  })
);

export const fetchJugadorEquipo = createAsyncThunk(
  'jugador/fetchJugadorEquipo',
  async ({ id }, { rejectWithValue }) => {
    try {
      return await playerCache.read(playerKey('detail', { id }), async () => {
        const res = await api.get(`/player/${id}`);
        return res?.data?.player || res?.data?.jugador || res?.data;
      });
    } catch (err) {
      console.error('[fetchJugadorEquipo] FAIL', err?.response?.status, err?.response?.data || err?.message);
      return rejectWithValue(err?.response?.data || err?.message);
    }
  }
);

export const fetchPlayerStats = createAsyncThunk(
  'jugador/fetchPlayerStats',
  async ({ playerId, teamId }) => playerCache.read(playerKey('stats', { playerId, teamId }), async () => {
    const url = teamId
      ? `/player/stats/${playerId}?team=${teamId}`
      : `/player/stats/${playerId}`;
    const res = await api.get(url);
    return res.data;
  })
);

export const createJugador = createAsyncThunk('jugador/createJugador', async (nuevoJugador) => {
  const res = await api.post('/player/create', nuevoJugador);
  clearPlayerCache();
  return res.data;
});

export const updateJugador = createAsyncThunk('jugador/updateJugador', async ({ id, data }) => {
  const res = await api.post(`/player/${id}`, data);
  clearPlayerCache();
  return res.data;
});

export const deleteJugador = createAsyncThunk('jugador/deleteJugador', async (id) => {
  await api.delete(`/player/${id}`);
  clearPlayerCache();
  return id;
});

export const darDeBajaJugador = createAsyncThunk('jugador/darDeBajaJugador', async ({ id, motivo = '' }) => {
  await api.post(`/player/${id}/deactivate`, { motivo });
  clearPlayerCache();
  return id;
});

export const darDeAltaJugador = createAsyncThunk('jugador/darDeAltaJugador', async ({ id }) => {
  await api.post(`/player/${id}/activate`);
  clearPlayerCache();
  return id;
});
