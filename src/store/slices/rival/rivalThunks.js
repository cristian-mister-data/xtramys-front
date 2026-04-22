// store/slices/rival/rivalThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';

export const fetchRivalsByTeam = createAsyncThunk(
  'rival/fetchRivalsByTeam',
  async ({ teamId }, { rejectWithValue }) => {
    if (!teamId) return rejectWithValue('teamId es requerido');
    const res = await api.get(`/rival/team/${teamId}`);
    return res.data;
  }
);

export const fetchRivalsByUser = createAsyncThunk(
  'rival/fetchRivalsByUser',
  async ({ userId }) => {
    const res = await api.get(`/rival/user/${userId}`);
    return res.data;
  }
);

export const fetchRival = createAsyncThunk('rival/fetchRival', async ({ id }) => {
  const res = await api.get(`/rival/${id}`);
  return res.data;
});

export const createRival = createAsyncThunk('rival/createRival', async (rivalData) => {
  const res = await api.post('/rival/create', rivalData);
  return res.data;
});

export const updateRival = createAsyncThunk('rival/updateRival', async (rivalData) => {
  const res = await api.post(`/rival/${rivalData._id}`, rivalData);
  return res.data;
});

export const deleteRival = createAsyncThunk('rival/deleteRival', async (id) => {
  await api.delete(`/rival/${id}`);
  return id;
});
