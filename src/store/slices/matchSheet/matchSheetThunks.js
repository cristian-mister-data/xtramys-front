// store/slices/matchSheet/matchSheetThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';

export const fetchMatchSheetsByTeam = createAsyncThunk(
  'matchSheet/fetchByTeam',
  async (equipoId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/match-sheet/equipo/${equipoId}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchMatchSheetById = createAsyncThunk(
  'matchSheet/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/match-sheet/${id}`);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createMatchSheet = createAsyncThunk(
  'matchSheet/create',
  async (matchSheetData, { rejectWithValue }) => {
    try {
      const res = await api.post('/match-sheet/create', matchSheetData);
      return res.data;
    } catch (error) {
      const data = error.response?.data;
      if (data?.message === 'DUPLICATE_TOURNAMENT_MATCHDAY') {
        return rejectWithValue({ code: 'DUPLICATE_TOURNAMENT_MATCHDAY', rival: data.rival });
      }
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateMatchSheet = createAsyncThunk(
  'matchSheet/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/match-sheet/${id}`, data);
      return res.data;
    } catch (error) {
      const resData = error.response?.data;
      if (resData?.message === 'DUPLICATE_TOURNAMENT_MATCHDAY') {
        return rejectWithValue({ code: 'DUPLICATE_TOURNAMENT_MATCHDAY', rival: resData.rival });
      }
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteMatchSheet = createAsyncThunk(
  'matchSheet/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/match-sheet/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);
