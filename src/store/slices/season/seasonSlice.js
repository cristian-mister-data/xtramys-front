// store/slices/season/seasonSlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchTemporada,
  fetchTemporadasUsuario,
  fetchTemporadaUsuarioSeleccionada,
  createTemporada,
  createTemporadaEquipo,
  updateTemporada,
  deleteTemporada,
  updateTemporadaSeleccionada,
} from './seasonThunks';

const seasonSlice = createSlice({
  name: 'temporada',
  initialState: {
    season: null,
    seasons: [],
    loading: false,
    error: null,
    calendarDate: null,
  },
  reducers: {
    setCalendarDate: (state, action) => {
      state.calendarDate = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTemporada.pending, (state) => { state.loading = true; })
      .addCase(fetchTemporada.fulfilled, (state, action) => {
        state.loading = false;
        state.season = action.payload;
      })
      .addCase(fetchTemporada.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(fetchTemporadasUsuario.pending, (state) => { state.loading = true; })
      .addCase(fetchTemporadasUsuario.fulfilled, (state, action) => {
        state.loading = false;
        state.seasons = action.payload;
        state.season = (action.payload && action.payload.length > 0)
          ? (action.payload.find((s) => s.seleccionada) || action.payload[0])
          : null;
      })
      .addCase(fetchTemporadasUsuario.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(fetchTemporadaUsuarioSeleccionada.pending, (state) => { state.loading = true; })
      .addCase(fetchTemporadaUsuarioSeleccionada.fulfilled, (state, action) => {
        state.loading = false;
        state.season = action.payload;
        if (action.payload && !state.seasons.some((e) => e._id === action.payload._id)) {
          state.seasons.push(action.payload);
        }
        if (action.payload) {
          state.seasons = state.seasons.map((season) => ({
            ...season,
            seleccionada: season._id === action.payload._id,
            selectedForUser: season._id === action.payload._id,
          }));
        }
      })
      .addCase(fetchTemporadaUsuarioSeleccionada.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(createTemporada.fulfilled, (state, action) => {
        state.loading = false;
        state.season = action.payload;
        if (action.payload && !state.seasons.some((e) => e._id === action.payload._id)) {
          state.seasons.push(action.payload);
        }
      })
      .addCase(createTemporadaEquipo.fulfilled, (state, action) => {
        state.seasons.push(action.payload);
        state.season = action.payload;
      })

      .addCase(updateTemporada.fulfilled, (state, action) => {
        const index = state.seasons.findIndex((e) => e._id === action.payload._id);
        if (index !== -1) state.seasons[index] = action.payload;
        if (state.season && state.season._id === action.payload._id) {
          state.season = action.payload;
        }
      })

      .addCase(updateTemporadaSeleccionada.fulfilled, (state, action) => {
        state.loading = false;
        state.season = action.payload;
        if (action.payload && !state.seasons.some((e) => e._id === action.payload._id)) {
          state.seasons.push(action.payload);
        }
        if (action.payload) {
          state.seasons = state.seasons.map((season) => ({
            ...season,
            seleccionada: season._id === action.payload._id,
            selectedForUser: season._id === action.payload._id,
          }));
        }
      })

      .addCase(deleteTemporada.fulfilled, (state, action) => {
        state.seasons = state.seasons.filter((e) => e._id !== action.payload);
        if (state.season && state.season._id === action.payload) {
          state.season = state.seasons.length > 0 ? state.seasons[0] : null;
        }
      });
  },
});

export const { setCalendarDate } = seasonSlice.actions;
export default seasonSlice.reducer;
