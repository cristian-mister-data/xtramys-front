// store/slices/strategy/strategySlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchEstrategia, fetchEstrategiasUsuario, fetchEstrategiasTemporada,
  createEstrategia, updateEstrategia, deleteEstrategia,
  fetchStrategyFolders, fetchStrategyFolderById, fetchStrategyFoldersFlat,
  createStrategyFolder, updateStrategyFolder, deleteStrategyFolder,
  moveStrategyToFolder, duplicateStrategyToFolder, duplicateGlobalStrategy,
  fetchGlobalStrategies,
} from './strategyThunks';

const strategySlice = createSlice({
  name: 'estrategia',
  initialState: {
    strategies: [],
    strategy: null,
    globalStrategies: [],
    folders: [],
    foldersFlat: [],
    currentFolder: null,
    currentFolderStrategies: [],
    currentFolderSubfolders: [],
    loading: false,
    foldersLoading: false,
    error: null,
  },
  reducers: {
    clearCurrentFolder: (state) => {
      state.currentFolder = null;
      state.currentFolderStrategies = [];
      state.currentFolderSubfolders = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEstrategiasUsuario.pending, (s) => { s.loading = true; })
      .addCase(fetchEstrategiasUsuario.fulfilled, (s, a) => { s.loading = false; s.strategies = a.payload; })
      .addCase(fetchEstrategiasUsuario.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(fetchEstrategiasTemporada.pending, (s) => { s.loading = true; })
      .addCase(fetchEstrategiasTemporada.fulfilled, (s, a) => { s.loading = false; s.strategies = a.payload; })
      .addCase(fetchEstrategiasTemporada.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(fetchEstrategia.pending, (s) => { s.loading = true; })
      .addCase(fetchEstrategia.fulfilled, (s, a) => { s.loading = false; s.strategy = a.payload; })
      .addCase(fetchEstrategia.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(fetchGlobalStrategies.fulfilled, (s, a) => { s.globalStrategies = a.payload; })

      .addCase(createEstrategia.pending, (s) => { s.loading = true; })
      .addCase(createEstrategia.fulfilled, (s, a) => {
        s.loading = false;
        s.strategies = [...s.strategies, a.payload];
      })
      .addCase(createEstrategia.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(updateEstrategia.pending, (s) => { s.loading = true; })
      .addCase(updateEstrategia.fulfilled, (s, a) => {
        s.loading = false;
        const idx = s.strategies.findIndex((e) => e._id === a.payload._id);
        if (idx !== -1) s.strategies[idx] = a.payload;
      })
      .addCase(updateEstrategia.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })

      .addCase(deleteEstrategia.fulfilled, (s, a) => {
        s.strategies = s.strategies.filter((e) => e._id !== a.payload);
      })

      .addCase(fetchStrategyFolders.pending, (s) => { s.foldersLoading = true; })
      .addCase(fetchStrategyFolders.fulfilled, (s, a) => { s.foldersLoading = false; s.folders = a.payload; })
      .addCase(fetchStrategyFolders.rejected, (s, a) => { s.foldersLoading = false; s.error = a.error.message; })

      .addCase(fetchStrategyFolderById.fulfilled, (s, a) => {
        s.currentFolder = a.payload.folder;
        s.currentFolderStrategies = a.payload.strategies;
        s.currentFolderSubfolders = a.payload.subfolders;
      })

      .addCase(fetchStrategyFoldersFlat.fulfilled, (s, a) => { s.foldersFlat = a.payload; })

      .addCase(createStrategyFolder.fulfilled, (s, a) => { s.folders = [...s.folders, a.payload]; })

      .addCase(updateStrategyFolder.fulfilled, (s, a) => {
        const idx = s.folders.findIndex((f) => f._id === a.payload._id);
        if (idx !== -1) s.folders[idx] = { ...s.folders[idx], ...a.payload };
      })

      .addCase(deleteStrategyFolder.fulfilled, (s, a) => {
        s.folders = s.folders.filter((f) => f._id !== a.payload);
      })

      .addCase(moveStrategyToFolder.fulfilled, (s, a) => {
        const { strategyId, folderId } = a.payload;
        const idx = s.strategies.findIndex((st) => st._id === strategyId);
        if (idx !== -1) s.strategies[idx].folder = folderId;
      })

      .addCase(duplicateStrategyToFolder.fulfilled, (s, a) => {
        s.strategies = [...s.strategies, a.payload];
      })

      .addCase(duplicateGlobalStrategy.fulfilled, (s, a) => {
        s.strategies = [...s.strategies, a.payload];
      });
  },
});

export const { clearCurrentFolder } = strategySlice.actions;
export default strategySlice.reducer;
