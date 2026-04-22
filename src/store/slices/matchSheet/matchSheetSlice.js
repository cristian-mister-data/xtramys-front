// store/slices/matchSheet/matchSheetSlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchMatchSheetsByTeam,
  fetchMatchSheetById,
  createMatchSheet,
  updateMatchSheet,
  deleteMatchSheet,
} from './matchSheetThunks';

const initialState = {
  matchSheets: [],
  currentMatchSheet: null,
  loading: false,
  error: null,
};

const matchSheetSlice = createSlice({
  name: 'matchSheet',
  initialState,
  reducers: {
    clearCurrentMatchSheet: (state) => { state.currentMatchSheet = null; },
    clearMatchSheets: (state) => {
      state.matchSheets = [];
      state.currentMatchSheet = null;
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMatchSheetsByTeam.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchMatchSheetsByTeam.fulfilled, (s, a) => { s.loading = false; s.matchSheets = a.payload; })
      .addCase(fetchMatchSheetsByTeam.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(fetchMatchSheetById.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchMatchSheetById.fulfilled, (s, a) => { s.loading = false; s.currentMatchSheet = a.payload; })
      .addCase(fetchMatchSheetById.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(createMatchSheet.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(createMatchSheet.fulfilled, (s, a) => {
        s.loading = false;
        s.matchSheets = [...s.matchSheets, a.payload];
      })
      .addCase(createMatchSheet.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(updateMatchSheet.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(updateMatchSheet.fulfilled, (s, a) => {
        s.loading = false;
        s.matchSheets = s.matchSheets.map((ms) => (ms._id === a.payload._id ? a.payload : ms));
        if (s.currentMatchSheet?._id === a.payload._id) s.currentMatchSheet = a.payload;
      })
      .addCase(updateMatchSheet.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(deleteMatchSheet.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(deleteMatchSheet.fulfilled, (s, a) => {
        s.loading = false;
        s.matchSheets = s.matchSheets.filter((ms) => ms._id !== a.payload);
        if (s.currentMatchSheet?._id === a.payload) s.currentMatchSheet = null;
      })
      .addCase(deleteMatchSheet.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export const { clearCurrentMatchSheet, clearMatchSheets, clearError } = matchSheetSlice.actions;
export default matchSheetSlice.reducer;
