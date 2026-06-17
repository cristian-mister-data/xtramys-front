// store/slices/team/teamThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { createReadCache } from '@/utils/readCache';

const teamCache = createReadCache({ ttlMs: 60000 });
const teamKey = (scope, payload) => teamCache.key(`team:${scope}`, payload);
const clearTeamCache = () => teamCache.clear();

export const fetchEquiposTemporada = createAsyncThunk(
  'equipo/fetchEquiposTemporada',
  async ({ season, usuario }, { getState }) => {
    const state = getState();
    const supervisedUserId = state.usuario.supervising ? state.usuario.user?._id : null;
    const queryUser = usuario || supervisedUserId;
    const url = queryUser
      ? `/team/season/${season}?usuario=${encodeURIComponent(queryUser)}`
      : `/team/season/${season}`;
    return teamCache.read(teamKey('season', { season, queryUser }), async () => {
      const res = await api.get(url);
      return res.data;
    });
  }
);

export const fetchEquipo = createAsyncThunk('equipo/fetchEquipo', async ({ id }) => {
  return teamCache.read(teamKey('detail', { id }), async () => {
    const res = await api.get(`/team/${id}`);
    return res.data;
  });
});

export const createEquipo = createAsyncThunk('equipo/createEquipo', async (nuevoEquipo) => {
  const res = await api.post('/team/create', nuevoEquipo);
  clearTeamCache();
  return res.data;
});

export const createEquipoWithPlayers = createAsyncThunk(
  'equipo/createEquipoWithPlayers',
  async (data) => {
    const res = await api.post('/team/create-with-players', data);
    clearTeamCache();
    return res.data;
  }
);

export const fetchPreviousSeason = createAsyncThunk(
  'equipo/fetchPreviousSeason',
  async ({ seasonId, userId }) => {
    return teamCache.read(teamKey('previous-season', { seasonId, userId }), async () => {
      const res = await api.get(`/team/previous-season/${seasonId}/${userId}`);
      return res.data;
    });
  }
);

export const updateEquipo = createAsyncThunk('equipo/updateEquipo', async ({ id, data }) => {
  const res = await api.post(`/team/${id}`, data);
  clearTeamCache();
  return res.data;
});

export const deleteEquipo = createAsyncThunk('equipo/deleteEquipo', async (id) => {
  await api.delete(`/team/${id}`);
  clearTeamCache();
  return id;
});

export const deleteEquipoWithData = createAsyncThunk(
  'equipo/deleteEquipoWithData',
  async (id) => {
    const res = await api.delete(`/team/with-data/${id}`);
    clearTeamCache();
    return res.data;
  }
);

export const selectEquipo = createAsyncThunk(
  'equipo/selectEquipo',
  async ({ teamId, seasonId }) => {
    const res = await api.post(`/team/select/${teamId}`, { temporada: seasonId });
    clearTeamCache();
    return res.data;
  }
);
