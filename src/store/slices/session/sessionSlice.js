// store/slices/session/sessionSlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchEntrenamiento,
  fetchEntrenamientosTemporada,
  fetchEntrenamientosPorEquipo,
  createEntrenamiento,
  updateEntrenamiento,
  deleteEntrenamiento,
  createEntrenamientoBulk,
  uploadEntrenamientoPdf,
} from './sessionThunks';

const sessionSlice = createSlice({
  name: 'entrenamiento',
  initialState: {
    session: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearSessions: (state) => {
      state.session = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEntrenamiento.pending, (state) => { state.loading = true; })
      .addCase(fetchEntrenamiento.fulfilled, (state, action) => {
        state.loading = false;
        state.session = action.payload;
      })
      .addCase(fetchEntrenamiento.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(fetchEntrenamientosTemporada.pending, (state) => { state.loading = true; })
      .addCase(fetchEntrenamientosTemporada.fulfilled, (state, action) => {
        state.loading = false;
        state.session = action.payload;
      })
      .addCase(fetchEntrenamientosTemporada.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(fetchEntrenamientosPorEquipo.pending, (state) => { state.loading = true; })
      .addCase(fetchEntrenamientosPorEquipo.fulfilled, (state, action) => {
        state.loading = false;
        state.session = action.payload;
      })
      .addCase(fetchEntrenamientosPorEquipo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(createEntrenamiento.fulfilled, (state, action) => {
        state.session.push(action.payload);
      })

      .addCase(createEntrenamientoBulk.fulfilled, (state, action) => {
        state.session.push(action.payload);
      })

      .addCase(updateEntrenamiento.fulfilled, (state, action) => {
        const index = state.session.findIndex((e) => e._id === action.payload._id);
        if (index !== -1) state.session[index] = action.payload;
      })

      .addCase(uploadEntrenamientoPdf.fulfilled, (state, action) => {
        const index = state.session.findIndex((e) => e._id === action.payload._id);
        if (index !== -1) state.session[index] = action.payload;
      })

      .addCase(deleteEntrenamiento.fulfilled, (state, action) => {
        state.session = state.session.filter((e) => e._id !== action.payload);
      });
  },
});

export const { clearSessions } = sessionSlice.actions;
export default sessionSlice.reducer;
