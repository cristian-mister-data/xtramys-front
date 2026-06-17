// store/slices/rival/rivalThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { createReadCache } from '@/utils/readCache';

const rivalCache = createReadCache({ ttlMs: 60000 });
const rivalKey = (scope, payload) => rivalCache.key(`rival:${scope}`, payload);
const clearRivalCache = () => rivalCache.clear();

export const fetchRivalsByTeam = createAsyncThunk(
  'rival/fetchRivalsByTeam',
  async (payload, { rejectWithValue }) => {
    const teamId = typeof payload === 'object' ? payload?.teamId : payload;
    if (!teamId) return rejectWithValue('teamId es requerido');
    return rivalCache.read(rivalKey('team', { teamId }), async () => {
      const res = await api.get(`/rival/team/${teamId}`);
      return res.data;
    });
  }
);

export const fetchRivalsByUser = createAsyncThunk(
  'rival/fetchRivalsByUser',
  async ({ userId }) => {
    return rivalCache.read(rivalKey('user', { userId }), async () => {
      const res = await api.get(`/rival/user/${userId}`);
      return res.data;
    });
  }
);

export const fetchRival = createAsyncThunk('rival/fetchRival', async ({ id }) => {
  return rivalCache.read(rivalKey('detail', { id }), async () => {
    const res = await api.get(`/rival/${id}`);
    return res.data;
  });
});

export const createRival = createAsyncThunk('rival/createRival', async (rivalData) => {
  const res = await api.post('/rival/create', rivalData);
  clearRivalCache();
  return res.data;
});

export const updateRival = createAsyncThunk('rival/updateRival', async (rivalData) => {
  const res = await api.post(`/rival/${rivalData._id}`, rivalData);
  clearRivalCache();
  return res.data;
});

export const deleteRival = createAsyncThunk('rival/deleteRival', async (id) => {
  await api.delete(`/rival/${id}`);
  clearRivalCache();
  return id;
});
