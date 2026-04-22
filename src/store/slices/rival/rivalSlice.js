// store/slices/rival/rivalSlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchRivalsByTeam, fetchRivalsByUser, fetchRival,
  createRival, updateRival, deleteRival,
} from './rivalThunks';

const rivalSlice = createSlice({
  name: 'rival',
  initialState: {
    rivals: [],
    rival: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearRivals: (state) => {
      state.rivals = [];
      state.rival = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRivalsByTeam.pending, (s) => { s.loading = true; })
      .addCase(fetchRivalsByTeam.fulfilled, (s, a) => { s.loading = false; s.rivals = a.payload; })
      .addCase(fetchRivalsByTeam.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(fetchRivalsByUser.pending, (s) => { s.loading = true; })
      .addCase(fetchRivalsByUser.fulfilled, (s, a) => { s.loading = false; s.rivals = a.payload; })
      .addCase(fetchRivalsByUser.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(fetchRival.pending, (s) => { s.loading = true; })
      .addCase(fetchRival.fulfilled, (s, a) => { s.loading = false; s.rival = a.payload; })
      .addCase(fetchRival.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(createRival.pending, (s) => { s.loading = true; })
      .addCase(createRival.fulfilled, (s, a) => {
        s.loading = false;
        s.rivals = [...s.rivals, a.payload];
      })
      .addCase(createRival.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(updateRival.pending, (s) => { s.loading = true; })
      .addCase(updateRival.fulfilled, (s, a) => {
        s.loading = false;
        const idx = s.rivals.findIndex((r) => r._id === a.payload._id);
        if (idx !== -1) s.rivals[idx] = a.payload;
      })
      .addCase(updateRival.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(deleteRival.fulfilled, (s, a) => {
        s.rivals = s.rivals.filter((r) => r._id !== a.payload);
      });
  },
});

export const { clearRivals } = rivalSlice.actions;
export default rivalSlice.reducer;
