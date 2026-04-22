// store/slices/exercise/exerciseSlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchEjercicio, fetchEjerciciosUsuario, createEjercicio, updateEjercicio, deleteEjercicio,
  fetchExerciseFolders, fetchExerciseFolderById, fetchExerciseFoldersFlat,
  createExerciseFolder, updateExerciseFolder, deleteExerciseFolder,
  moveExerciseToFolder, duplicateExerciseToFolder, duplicateGlobalExercise,
  fetchGlobalExercises, fetchGlobalFolders,
} from './exerciseThunks';

const exerciseSlice = createSlice({
  name: 'ejercicio',
  initialState: {
    exercises: [],
    exercise: null,
    globalExercises: [],
    globalFolders: [],
    folders: [],
    foldersFlat: [],
    currentFolder: null,
    currentFolderExercises: [],
    currentFolderSubfolders: [],
    loading: false,
    foldersLoading: false,
    error: null,
  },
  reducers: {
    clearCurrentFolder: (state) => {
      state.currentFolder = null;
      state.currentFolderExercises = [];
      state.currentFolderSubfolders = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEjerciciosUsuario.pending, (state) => { state.loading = true; })
      .addCase(fetchEjerciciosUsuario.fulfilled, (state, action) => {
        state.loading = false;
        state.exercises = action.payload;
      })
      .addCase(fetchEjerciciosUsuario.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(fetchEjercicio.pending, (state) => { state.loading = true; })
      .addCase(fetchEjercicio.fulfilled, (state, action) => {
        state.loading = false;
        state.exercise = action.payload;
      })
      .addCase(fetchEjercicio.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(fetchGlobalExercises.fulfilled, (state, action) => {
        state.globalExercises = action.payload;
      })
      .addCase(fetchGlobalFolders.fulfilled, (state, action) => {
        state.globalFolders = action.payload;
      })

      .addCase(createEjercicio.pending, (state) => { state.loading = true; })
      .addCase(createEjercicio.fulfilled, (state, action) => {
        state.loading = false;
        state.exercises = [...state.exercises, action.payload];
      })
      .addCase(createEjercicio.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(updateEjercicio.pending, (state) => { state.loading = true; })
      .addCase(updateEjercicio.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.exercises.findIndex((e) => e._id === action.payload._id);
        if (index !== -1) state.exercises[index] = action.payload;
      })
      .addCase(updateEjercicio.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(deleteEjercicio.fulfilled, (state, action) => {
        state.exercises = state.exercises.filter((e) => e._id !== action.payload);
      })

      .addCase(fetchExerciseFolders.pending, (state) => { state.foldersLoading = true; })
      .addCase(fetchExerciseFolders.fulfilled, (state, action) => {
        state.foldersLoading = false;
        state.folders = action.payload;
      })
      .addCase(fetchExerciseFolders.rejected, (state, action) => {
        state.foldersLoading = false;
        state.error = action.error.message;
      })

      .addCase(fetchExerciseFolderById.fulfilled, (state, action) => {
        state.currentFolder = action.payload.folder;
        state.currentFolderExercises = action.payload.exercises;
        state.currentFolderSubfolders = action.payload.subfolders;
      })

      .addCase(fetchExerciseFoldersFlat.fulfilled, (state, action) => {
        state.foldersFlat = action.payload;
      })

      .addCase(createExerciseFolder.fulfilled, (state, action) => {
        state.folders = [...state.folders, action.payload];
      })

      .addCase(updateExerciseFolder.fulfilled, (state, action) => {
        const index = state.folders.findIndex((f) => f._id === action.payload._id);
        if (index !== -1) state.folders[index] = { ...state.folders[index], ...action.payload };
      })

      .addCase(deleteExerciseFolder.fulfilled, (state, action) => {
        state.folders = state.folders.filter((f) => f._id !== action.payload);
      })

      .addCase(moveExerciseToFolder.fulfilled, (state, action) => {
        const { exerciseId, folderId } = action.payload;
        const index = state.exercises.findIndex((e) => e._id === exerciseId);
        if (index !== -1) state.exercises[index].folder = folderId;
      })

      .addCase(duplicateExerciseToFolder.fulfilled, (state, action) => {
        state.exercises = [...state.exercises, action.payload];
      })

      .addCase(duplicateGlobalExercise.fulfilled, (state, action) => {
        state.exercises = [...state.exercises, action.payload];
      });
  },
});

export const { clearCurrentFolder } = exerciseSlice.actions;
export default exerciseSlice.reducer;
