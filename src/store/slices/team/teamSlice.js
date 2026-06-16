// store/slices/team/teamSlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchEquiposTemporada,
  fetchEquipo,
  createEquipo,
  updateEquipo,
  deleteEquipo,
  selectEquipo,
} from './teamThunks';

const ensureSelectedTeam = (teams) => {
  if (!Array.isArray(teams) || teams.length === 0 || teams.some((team) => team.seleccionado)) return teams;
  return teams.map((team, index) => ({ ...team, seleccionado: index === 0 }));
};

const teamSlice = createSlice({
  name: 'equipo',
  initialState: {
    teams: [],
    team: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearTeams: (state) => {
      state.teams = [];
      state.team = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEquiposTemporada.pending, (state) => { state.loading = true; })
      .addCase(fetchEquiposTemporada.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = ensureSelectedTeam(action.payload);
      })
      .addCase(fetchEquiposTemporada.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(fetchEquipo.pending, (state) => { state.loading = true; })
      .addCase(fetchEquipo.fulfilled, (state, action) => {
        state.loading = false;
        state.team = action.payload;
      })
      .addCase(fetchEquipo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(createEquipo.pending, (state) => { state.loading = true; })
      .addCase(createEquipo.fulfilled, (state, action) => {
        state.loading = false;
        if (Array.isArray(action.payload)) {
          state.teams = ensureSelectedTeam(action.payload);
        } else {
          state.teams.push(action.payload);
        }
      })
      .addCase(createEquipo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(updateEquipo.fulfilled, (state, action) => {
        const index = state.teams.findIndex((e) => e._id === action.payload._id);
        if (index !== -1) state.teams[index] = action.payload;
      })

      .addCase(deleteEquipo.fulfilled, (state, action) => {
        state.teams = state.teams.filter((e) => e._id !== action.payload);
      })

      .addCase(selectEquipo.fulfilled, (state, action) => {
        state.teams = ensureSelectedTeam(action.payload);
      });
  },
});

export const { clearTeams } = teamSlice.actions;
export default teamSlice.reducer;
