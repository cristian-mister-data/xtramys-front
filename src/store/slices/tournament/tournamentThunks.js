// store/slices/tournament/tournamentThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';

export const fetchTournamentsByTeam = createAsyncThunk(
  'tournament/fetchByTeam',
  async (equipoId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/tournament/equipo/${equipoId}`);
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const fetchTournamentById = createAsyncThunk(
  'tournament/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.get(`/tournament/${id}`);
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const createTournament = createAsyncThunk(
  'tournament/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post('/tournament/create', data);
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const updateTournament = createAsyncThunk(
  'tournament/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/tournament/${id}`, data);
      return res.data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const deleteTournament = createAsyncThunk(
  'tournament/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/tournament/${id}`);
      return id;
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);

export const fetchTournamentSanctions = createAsyncThunk(
  'tournament/fetchSanctions',
  async (tournamentId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/tournament/${tournamentId}/sanctions`);
      return res.data.jugadores || [];
    } catch (e) { return rejectWithValue(e.response?.data?.message || e.message); }
  }
);
