// store/slices/injury/injuryThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';

export const fetchInjuries = createAsyncThunk('injury/fetchInjuries', async () => {
  const res = await api.get('/injury');
  return res.data;
});

export const fetchInjuriesByTeam = createAsyncThunk(
  'injury/fetchInjuriesByTeam',
  async ({ team }) => {
    const res = await api.get(`/injury/team/${team}`);
    return res.data;
  }
);

export const fetchInjuryById = createAsyncThunk(
  'injury/fetchInjuryById',
  async ({ id }) => {
    const res = await api.get(`/injury/${id}`);
    return res.data;
  }
);

export const createInjury = createAsyncThunk('injury/createInjury', async (injuryData) => {
  const res = await api.post('/injury/create', injuryData);
  return res.data;
});

export const updateInjury = createAsyncThunk('injury/updateInjury', async ({ id, data }) => {
  const res = await api.post(`/injury/${id}`, data);
  return res.data;
});

export const deleteInjury = createAsyncThunk('injury/deleteInjury', async (id) => {
  await api.delete(`/injury/${id}`);
  return id;
});
