// store/slices/anthropometry/anthropometryThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';

export const fetchAnthropometriesByTeam = createAsyncThunk(
  'anthropometry/fetchByTeam',
  async ({ team }) => {
    const res = await api.get(`/anthropometry/team/${team}`);
    return res.data;
  }
);

export const fetchAnthropometriesByPlayer = createAsyncThunk(
  'anthropometry/fetchByPlayer',
  async ({ playerId }) => {
    const res = await api.get(`/anthropometry/player/${playerId}`);
    return res.data;
  }
);

export const fetchPlayerHistory = createAsyncThunk(
  'anthropometry/fetchPlayerHistory',
  async ({ playerId, startDate, endDate }) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get(`/anthropometry/player/${playerId}/history${qs}`);
    return res.data;
  }
);

export const fetchAnthropometryById = createAsyncThunk(
  'anthropometry/fetchById',
  async ({ id }) => {
    const res = await api.get(`/anthropometry/${id}`);
    return res.data;
  }
);

export const createAnthropometry = createAsyncThunk(
  'anthropometry/create',
  async (data) => {
    const res = await api.post('/anthropometry/create', data);
    return res.data;
  }
);

export const updateAnthropometry = createAsyncThunk(
  'anthropometry/update',
  async ({ id, data }) => {
    const res = await api.post(`/anthropometry/${id}`, data);
    return res.data;
  }
);

export const deleteAnthropometry = createAsyncThunk(
  'anthropometry/delete',
  async (id) => {
    await api.delete(`/anthropometry/${id}`);
    return id;
  }
);
