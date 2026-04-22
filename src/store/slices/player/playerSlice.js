// store/slices/player/playerSlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchJugadoresEquipo,
  fetchJugadorEquipo,
  fetchPlayerStats,
  createJugador,
  updateJugador,
  deleteJugador,
} from './playerThunks';

const playerSlice = createSlice({
  name: 'jugador',
  initialState: {
    players: [],
    player: null,
    playerStats: null,
    loadingStats: false,
    loading: false,
    error: null,
  },
  reducers: {
    clearPlayers: (state) => {
      state.players = [];
    },
    clearPlayerStats: (state) => {
      state.playerStats = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJugadoresEquipo.pending, (state) => { state.loading = true; })
      .addCase(fetchJugadoresEquipo.fulfilled, (state, action) => {
        state.loading = false;
        state.players = action.payload;
      })
      .addCase(fetchJugadoresEquipo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(fetchJugadorEquipo.pending, (state) => { state.loading = true; })
      .addCase(fetchJugadorEquipo.fulfilled, (state, action) => {
        state.loading = false;
        state.player = action.payload;
      })
      .addCase(fetchJugadorEquipo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(createJugador.fulfilled, (state, action) => {
        state.players.push(action.payload);
      })

      .addCase(updateJugador.fulfilled, (state, action) => {
        if (action.payload.players) {
          state.players = action.payload.players;
        } else {
          const index = state.players.findIndex((p) => p._id === action.payload._id);
          if (index !== -1) state.players[index] = action.payload;
        }
      })

      .addCase(deleteJugador.fulfilled, (state, action) => {
        state.players = state.players.filter((e) => e._id !== action.payload);
      })

      .addCase(fetchPlayerStats.pending, (state) => {
        state.loadingStats = true;
        state.playerStats = null;
      })
      .addCase(fetchPlayerStats.fulfilled, (state, action) => {
        state.loadingStats = false;
        state.playerStats = action.payload;
      })
      .addCase(fetchPlayerStats.rejected, (state, action) => {
        state.loadingStats = false;
        state.error = action.error.message;
      });
  },
});

export const { clearPlayers, clearPlayerStats } = playerSlice.actions;
export default playerSlice.reducer;
