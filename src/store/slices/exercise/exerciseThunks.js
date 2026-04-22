// store/slices/exercise/exerciseThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { linkVideoToExercise } from '@/api/video';

export const fetchEjerciciosUsuario = createAsyncThunk(
  'ejercicio/fetchEjerciciosUsuario',
  async ({ user }) => {
    const res = await api.get(`/exercise/user/${user}`);
    return res.data;
  }
);

export const fetchEjercicio = createAsyncThunk('ejercicio/fetchEjercicio', async ({ id }) => {
  const res = await api.get(`/exercise/${id}`);
  return res.data;
});

export const fetchGlobalExercises = createAsyncThunk(
  'ejercicio/fetchGlobalExercises',
  async ({ lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/exercise/global${params}`);
    return res.data;
  }
);

export const createEjercicio = createAsyncThunk(
  'ejercicio/createEjercicio',
  async (nuevoEjercicio) => {
    const { pendingVideoIds, ...exerciseData } = nuevoEjercicio;
    const res = await api.post('/exercise/create', exerciseData);
    const createdExercise = res.data;
    if (pendingVideoIds && pendingVideoIds.length > 0 && createdExercise?._id) {
      for (const videoId of pendingVideoIds) {
        try {
          await linkVideoToExercise({ videoId, exerciseId: createdExercise._id });
        } catch (error) {
          console.error('Error asociando video pendiente:', error);
        }
      }
    }
    return createdExercise;
  }
);

export const updateEjercicio = createAsyncThunk('ejercicio/updateEjercicio', async (exercise, { rejectWithValue }) => {
  try {
    console.log('[updateEjercicio] POST /exercise/' + exercise?._id, 'imgLen=', typeof exercise?.imagen === 'string' ? exercise.imagen.length : 0, 'elementsLen=', (exercise?.elementosCampo||[]).length);
    const res = await api.post(`/exercise/${exercise?._id}`, exercise);
    console.log('[updateEjercicio] OK status=', res?.status);
    return res.data;
  } catch (err) {
    console.error('[updateEjercicio] FAIL', err?.response?.status, err?.response?.data || err?.message);
    return rejectWithValue(err?.response?.data || err?.message);
  }
});

export const deleteEjercicio = createAsyncThunk('ejercicio/deleteEjercicio', async (id) => {
  await api.delete(`/exercise/${id}`);
  return id;
});

// ========== Carpetas de ejercicios ==========

export const fetchExerciseFolders = createAsyncThunk(
  'ejercicio/fetchExerciseFolders',
  async ({ parentFolder, lang } = {}) => {
    const queryParams = [];
    if (parentFolder) queryParams.push(`parentFolder=${parentFolder}`);
    if (lang) queryParams.push(`lang=${lang}`);
    const params = queryParams.length ? `?${queryParams.join('&')}` : '';
    const res = await api.get(`/exercise-folder${params}`);
    return res.data.folders;
  }
);

export const fetchGlobalFolders = createAsyncThunk(
  'ejercicio/fetchGlobalFolders',
  async ({ lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/exercise-folder/global${params}`);
    return res.data.folders;
  }
);

export const fetchExerciseFolderById = createAsyncThunk(
  'ejercicio/fetchExerciseFolderById',
  async ({ id, lang }) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/exercise-folder/${id}${params}`);
    return res.data;
  }
);

export const fetchExerciseFoldersFlat = createAsyncThunk(
  'ejercicio/fetchExerciseFoldersFlat',
  async ({ lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/exercise-folder/flat${params}`);
    return res.data.folders;
  }
);

export const createExerciseFolder = createAsyncThunk(
  'ejercicio/createExerciseFolder',
  async ({ nombre, parentFolder, color, isGlobal, translations }) => {
    const res = await api.post('/exercise-folder', {
      nombre, parentFolder, color, isGlobal, translations,
    });
    return res.data.folder;
  }
);

export const updateExerciseFolder = createAsyncThunk(
  'ejercicio/updateExerciseFolder',
  async ({ id, nombre, color, translations }) => {
    const res = await api.put(`/exercise-folder/${id}`, { nombre, color, translations });
    return res.data.folder;
  }
);

export const deleteExerciseFolder = createAsyncThunk(
  'ejercicio/deleteExerciseFolder',
  async ({ id, moveExercisesTo }) => {
    await api.delete(`/exercise-folder/${id}`, { data: { moveExercisesTo } });
    return id;
  }
);

export const moveExerciseToFolder = createAsyncThunk(
  'ejercicio/moveExerciseToFolder',
  async ({ exerciseId, folderId }) => {
    await api.post('/exercise-folder/move-exercise', { exerciseId, folderId });
    return { exerciseId, folderId };
  }
);

export const duplicateExerciseToFolder = createAsyncThunk(
  'ejercicio/duplicateExerciseToFolder',
  async ({ exerciseId, folderId, duplicateName, lang }) => {
    const res = await api.post('/exercise-folder/duplicate-exercise', {
      exerciseId, folderId, duplicateName, lang,
    });
    return res.data.exercise;
  }
);

export const duplicateGlobalExercise = createAsyncThunk(
  'ejercicio/duplicateGlobalExercise',
  async ({ exerciseId, folderId, duplicateName, lang }) => {
    const res = await api.post('/exercise-folder/duplicate-global', {
      exerciseId, folderId, duplicateName, lang,
    });
    return res.data.exercise;
  }
);
