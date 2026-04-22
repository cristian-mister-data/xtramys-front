// store/slices/injury/injurySlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchInjuries,
  fetchInjuriesByTeam,
  fetchInjuryById,
  createInjury,
  updateInjury,
  deleteInjury,
} from './injuryThunks';

const initialState = {
  injuries: [],
  injury: null,
  loading: false,
  error: null,
};

const injurySlice = createSlice({
  name: 'injury',
  initialState,
  reducers: {
    clearInjury: (state) => { state.injury = null; },
    clearInjuries: (state) => {
      state.injuries = [];
      state.injury = null;
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInjuries.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchInjuries.fulfilled, (state, action) => {
        state.loading = false;
        state.injuries = action.payload;
      })
      .addCase(fetchInjuries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchInjuriesByTeam.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchInjuriesByTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.injuries = action.payload;
      })
      .addCase(fetchInjuriesByTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchInjuryById.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchInjuryById.fulfilled, (state, action) => {
        state.loading = false;
        state.injury = action.payload;
      })
      .addCase(fetchInjuryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createInjury.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createInjury.fulfilled, (state, action) => {
        state.loading = false;
        state.injuries.push(action.payload);
      })
      .addCase(createInjury.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(updateInjury.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateInjury.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.injuries.findIndex((i) => i._id === action.payload._id);
        if (index !== -1) state.injuries[index] = action.payload;
        state.injury = action.payload;
      })
      .addCase(updateInjury.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(deleteInjury.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteInjury.fulfilled, (state, action) => {
        state.loading = false;
        state.injuries = state.injuries.filter((i) => i._id !== action.payload);
      })
      .addCase(deleteInjury.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearInjury, clearInjuries, clearError } = injurySlice.actions;
export default injurySlice.reducer;
