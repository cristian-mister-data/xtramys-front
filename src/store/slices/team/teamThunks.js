// store/slices/team/teamThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';

export const fetchEquiposTemporada = createAsyncThunk(
  'equipo/fetchEquiposTemporada',
  async ({ season, usuario }, { getState }) => {
    const state = getState();
    const supervisedUserId = state.usuario.supervising ? state.usuario.user?._id : null;
    const queryUser = usuario || supervisedUserId;
    const url = queryUser
      ? `/team/season/${season}?usuario=${encodeURIComponent(queryUser)}`
      : `/team/season/${season}`;
    const res = await api.get(url);
    return res.data;
  }
);

export const fetchEquipo = createAsyncThunk('equipo/fetchEquipo', async ({ id }) => {
  const res = await api.get(`/team/${id}`);
  return res.data;
});

export const createEquipo = createAsyncThunk('equipo/createEquipo', async (nuevoEquipo) => {
  const res = await api.post('/team/create', nuevoEquipo);
  return res.data;
});

export const createEquipoWithPlayers = createAsyncThunk(
  'equipo/createEquipoWithPlayers',
  async (data) => {
    const res = await api.post('/team/create-with-players', data);
    return res.data;
  }
);

export const fetchPreviousSeason = createAsyncThunk(
  'equipo/fetchPreviousSeason',
  async ({ seasonId, userId }) => {
    const res = await api.get(`/team/previous-season/${seasonId}/${userId}`);
    return res.data;
  }
);

export const updateEquipo = createAsyncThunk('equipo/updateEquipo', async ({ id, data }) => {
  const res = await api.post(`/team/${id}`, data);
  return res.data;
});

export const deleteEquipo = createAsyncThunk('equipo/deleteEquipo', async (id) => {
  await api.delete(`/team/${id}`);
  return id;
});

export const deleteEquipoWithData = createAsyncThunk(
  'equipo/deleteEquipoWithData',
  async (id) => {
    const res = await api.delete(`/team/with-data/${id}`);
    return res.data;
  }
);

export const selectEquipo = createAsyncThunk(
  'equipo/selectEquipo',
  async ({ teamId, seasonId }) => {
    const res = await api.post(`/team/select/${teamId}`, { temporada: seasonId });
    return res.data;
  }
);
