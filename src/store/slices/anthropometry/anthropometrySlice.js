// store/slices/anthropometry/anthropometrySlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchAnthropometriesByTeam,
  fetchAnthropometriesByPlayer,
  fetchPlayerHistory,
  fetchAnthropometryById,
  createAnthropometry,
  updateAnthropometry,
  deleteAnthropometry,
} from './anthropometryThunks';

const initialState = {
  anthropometries: [],
  currentAnthropometry: null,
  loading: false,
  error: null,
};

const anthropometrySlice = createSlice({
  name: 'anthropometry',
  initialState,
  reducers: {
    clearCurrentAnthropometry: (state) => { state.currentAnthropometry = null; },
    clearAnthropometries: (state) => { state.anthropometries = []; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const setLoading = (s) => { s.loading = true; s.error = null; };
    const setError = (s, a) => { s.loading = false; s.error = a.error.message; };
    const setListPayload = (s, a) => { s.loading = false; s.anthropometries = a.payload; };

    builder
      .addCase(fetchAnthropometriesByTeam.pending, setLoading)
      .addCase(fetchAnthropometriesByTeam.fulfilled, setListPayload)
      .addCase(fetchAnthropometriesByTeam.rejected, setError)

      .addCase(fetchAnthropometriesByPlayer.pending, setLoading)
      .addCase(fetchAnthropometriesByPlayer.fulfilled, setListPayload)
      .addCase(fetchAnthropometriesByPlayer.rejected, setError)

      .addCase(fetchPlayerHistory.pending, setLoading)
      .addCase(fetchPlayerHistory.fulfilled, setListPayload)
      .addCase(fetchPlayerHistory.rejected, setError)

      .addCase(fetchAnthropometryById.pending, setLoading)
      .addCase(fetchAnthropometryById.fulfilled, (s, a) => {
        s.loading = false;
        s.currentAnthropometry = a.payload;
      })
      .addCase(fetchAnthropometryById.rejected, setError)

      .addCase(createAnthropometry.pending, setLoading)
      .addCase(createAnthropometry.fulfilled, (s, a) => {
        s.loading = false;
        s.anthropometries.unshift(a.payload);
      })
      .addCase(createAnthropometry.rejected, setError)

      .addCase(updateAnthropometry.pending, setLoading)
      .addCase(updateAnthropometry.fulfilled, (s, a) => {
        s.loading = false;
        const idx = s.anthropometries.findIndex((i) => i._id === a.payload._id);
        if (idx !== -1) s.anthropometries[idx] = a.payload;
        s.currentAnthropometry = a.payload;
      })
      .addCase(updateAnthropometry.rejected, setError)

      .addCase(deleteAnthropometry.pending, setLoading)
      .addCase(deleteAnthropometry.fulfilled, (s, a) => {
        s.loading = false;
        s.anthropometries = s.anthropometries.filter((i) => i._id !== a.payload);
      })
      .addCase(deleteAnthropometry.rejected, setError);
  },
});

export const { clearCurrentAnthropometry, clearAnthropometries, clearError } =
  anthropometrySlice.actions;
export default anthropometrySlice.reducer;
