// store/slices/strategy/strategySlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchEstrategia, fetchEstrategiasUsuario, fetchEstrategiasTemporada,
  createEstrategia, updateEstrategia, deleteEstrategia,
  fetchStrategyFolders, fetchStrategyFolderById, fetchStrategyFoldersFlat,
  createStrategyFolder, updateStrategyFolder, deleteStrategyFolder,
  moveStrategyToFolder, duplicateStrategyToFolder, duplicateGlobalStrategy,
  fetchGlobalStrategies, fetchGlobalFolders,
  toggleFavoriteStrategy, batchDeleteStrategies, batchMoveStrategies,
} from './strategyThunks';

const strategySlice = createSlice({
  name: 'estrategia',
  initialState: {
    strategies: [],
    strategy: null,
    globalStrategies: [],
    globalFolders: [],
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
      .addCase(fetchGlobalFolders.fulfilled, (s, a) => { s.globalFolders = a.payload; })

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

      .addCase(deleteEstrategia.fulfilled, (state, action) => {
        const deletedId = action.payload;
        const strategy = state.strategies.find((e) => e._id === deletedId) || 
                         state.currentFolderStrategies.find((e) => e._id === deletedId);
        
        if (strategy && strategy.folder) {
          const folderId = typeof strategy.folder === 'object' ? strategy.folder._id : strategy.folder;
          
          const folder = state.folders.find(f => f._id === folderId);
          if (folder && folder.strategyCount > 0) folder.strategyCount--;
          
          const folderFlat = state.foldersFlat.find(f => f._id === folderId);
          if (folderFlat && folderFlat.strategyCount > 0) folderFlat.strategyCount--;
        }

        state.strategies = state.strategies.filter((e) => e._id !== deletedId);
        state.currentFolderStrategies = state.currentFolderStrategies.filter((e) => e._id !== deletedId);
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
      })

      // Favorito toggle
      .addCase(toggleFavoriteStrategy.fulfilled, (state, action) => {
        const { _id, favorito } = action.payload;
        const idx = state.strategies.findIndex(e => e._id === _id);
        if (idx !== -1) state.strategies[idx].favorito = favorito;
        const idx2 = state.currentFolderStrategies.findIndex(e => e._id === _id);
        if (idx2 !== -1) state.currentFolderStrategies[idx2].favorito = favorito;
      })

      // Batch delete
      .addCase(batchDeleteStrategies.fulfilled, (state, action) => {
        const deletedIds = new Set(action.payload.ids || []);
        state.strategies = state.strategies.filter(e => !deletedIds.has(e._id));
        state.currentFolderStrategies = state.currentFolderStrategies.filter(e => !deletedIds.has(e._id));
      })

      // Batch move
      .addCase(batchMoveStrategies.fulfilled, (state, action) => {
        const { ids, folderId } = action.payload;
        const movedIds = new Set(ids || []);
        state.strategies = state.strategies.map(e =>
          movedIds.has(e._id) ? { ...e, folder: folderId || null } : e
        );
      });
  },
});

export const { clearCurrentFolder } = strategySlice.actions;
export default strategySlice.reducer;
