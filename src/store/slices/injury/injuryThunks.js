// store/slices/injury/injuryThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { createReadCache } from '@/utils/readCache';

const injuryCache = createReadCache({ ttlMs: 60000 });
const injuryKey = (scope, payload) => injuryCache.key(`injury:${scope}`, payload);
const clearInjuryCache = () => injuryCache.clear();

export const fetchInjuries = createAsyncThunk('injury/fetchInjuries', async () => {
  return injuryCache.read(injuryKey('all'), async () => {
    const res = await api.get('/injury');
    return res.data;
  });
});

export const fetchInjuriesByTeam = createAsyncThunk(
  'injury/fetchInjuriesByTeam',
  async ({ team }) => {
    return injuryCache.read(injuryKey('team', { team }), async () => {
      const res = await api.get(`/injury/team/${team}`);
      return res.data;
    });
  }
);

export const fetchInjuryById = createAsyncThunk(
  'injury/fetchInjuryById',
  async ({ id }) => {
    return injuryCache.read(injuryKey('detail', { id }), async () => {
      const res = await api.get(`/injury/${id}`);
      return res.data;
    });
  }
);

export const createInjury = createAsyncThunk('injury/createInjury', async (injuryData) => {
  const res = await api.post('/injury/create', injuryData);
  clearInjuryCache();
  return res.data;
});

export const updateInjury = createAsyncThunk('injury/updateInjury', async ({ id, data }) => {
  const res = await api.post(`/injury/${id}`, data);
  clearInjuryCache();
  return res.data;
});

export const deleteInjury = createAsyncThunk('injury/deleteInjury', async (id) => {
  await api.delete(`/injury/${id}`);
  clearInjuryCache();
  return id;
});
