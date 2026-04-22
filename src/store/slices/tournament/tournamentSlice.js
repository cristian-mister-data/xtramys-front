// store/slices/tournament/tournamentSlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchTournamentsByTeam,
  fetchTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  fetchTournamentSanctions,
} from './tournamentThunks';

const initialState = {
  tournaments: [],
  currentTournament: null,
  sanctions: [],
  loadingSanctions: false,
  loading: false,
  error: null,
};

const tournamentSlice = createSlice({
  name: 'tournament',
  initialState,
  reducers: {
    clearCurrentTournament: (state) => { state.currentTournament = null; },
    clearTournaments: (state) => {
      state.tournaments = [];
      state.currentTournament = null;
    },
    clearError: (state) => { state.error = null; },
    clearSanctions: (state) => { state.sanctions = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTournamentsByTeam.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchTournamentsByTeam.fulfilled, (s, a) => { s.loading = false; s.tournaments = a.payload; })
      .addCase(fetchTournamentsByTeam.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(fetchTournamentById.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(fetchTournamentById.fulfilled, (s, a) => { s.loading = false; s.currentTournament = a.payload; })
      .addCase(fetchTournamentById.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(createTournament.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(createTournament.fulfilled, (s, a) => {
        s.loading = false;
        s.tournaments = [...s.tournaments, a.payload];
      })
      .addCase(createTournament.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(updateTournament.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(updateTournament.fulfilled, (s, a) => {
        s.loading = false;
        s.tournaments = s.tournaments.map((t) => (t._id === a.payload._id ? a.payload : t));
        if (s.currentTournament?._id === a.payload._id) s.currentTournament = a.payload;
      })
      .addCase(updateTournament.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(deleteTournament.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(deleteTournament.fulfilled, (s, a) => {
        s.loading = false;
        s.tournaments = s.tournaments.filter((t) => t._id !== a.payload);
        if (s.currentTournament?._id === a.payload) s.currentTournament = null;
      })
      .addCase(deleteTournament.rejected, (s, a) => { s.loading = false; s.error = a.payload; })

      .addCase(fetchTournamentSanctions.pending, (s) => { s.loadingSanctions = true; })
      .addCase(fetchTournamentSanctions.fulfilled, (s, a) => {
        s.loadingSanctions = false;
        s.sanctions = a.payload;
      })
      .addCase(fetchTournamentSanctions.rejected, (s) => {
        s.loadingSanctions = false;
        s.sanctions = [];
      });
  },
});

export const {
  clearCurrentTournament, clearTournaments, clearError, clearSanctions,
} = tournamentSlice.actions;
export default tournamentSlice.reducer;
