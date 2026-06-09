// store/slices/exercise/exerciseThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { linkVideoToExercise } from '@/api/video';
import {
  applyFavoritePrefsToItem,
  applyFavoritePrefsToItems,
  normalizeFavoritePayload,
  persistFavoriteState,
  readFavoritePrefs,
  sameId,
  getItemId,
} from '@/utils/favoritePersistence';

const getVideoId = (video) => video?._id || video?.id || video;

const applyExerciseFavoritePrefs = async (items) => {
  const prefs = await readFavoritePrefs('exercise');
  return Array.isArray(items)
    ? applyFavoritePrefsToItems(items, prefs)
    : applyFavoritePrefsToItem(items, prefs);
};

const findExerciseFavorite = (state, exerciseId) => {
  const lists = [
    state?.exercise?.exercises || [],
    state?.exercise?.currentFolderExercises || [],
    state?.exercise?.globalExercises || [],
    state?.exercise?.exercise ? [state.exercise.exercise] : [],
  ];
  return lists.flat().find((item) => sameId(getItemId(item), exerciseId))?.favorito;
};

const replaceExerciseVideos = async (exerciseId, pendingVideoIds = []) => {
  if (!exerciseId || pendingVideoIds.length === 0) return;

  const currentRes = await api.get(`/video/exercise/${exerciseId}`);
  const currentVideos = currentRes?.data?.videos || currentRes?.data || [];
  const pendingSet = new Set(pendingVideoIds.map(String));

  for (const video of currentVideos) {
    const videoId = getVideoId(video);
    if (!videoId || pendingSet.has(String(videoId))) continue;

    try {
      await api.post('/video/unlink-exercise', { videoId, exerciseId });
    } catch (error) {
      console.error('Error desasociando video anterior:', error);
    }

    try {
      await api.delete(`/video/${videoId}`);
    } catch (error) {
      console.error('Error eliminando video anterior:', error);
    }
  }

  for (const videoId of pendingVideoIds) {
    try {
      await linkVideoToExercise({ videoId, exerciseId });
    } catch (error) {
      console.error('Error asociando video pendiente:', error);
    }
  }
};

export const fetchEjerciciosUsuario = createAsyncThunk(
  'ejercicio/fetchEjerciciosUsuario',
  async ({ user, lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/exercise/user/${user}${params}`);
    return applyExerciseFavoritePrefs(res.data);
  }
);

export const fetchEjercicio = createAsyncThunk('ejercicio/fetchEjercicio', async ({ id, lang } = {}) => {
  const params = lang ? `?lang=${lang}` : '';
  const res = await api.get(`/exercise/${id}${params}`);
  return applyExerciseFavoritePrefs(res.data);
});

export const fetchGlobalExercises = createAsyncThunk(
  'ejercicio/fetchGlobalExercises',
  async ({ lang } = {}) => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/exercise/global${params}`);
    return applyExerciseFavoritePrefs(res.data);
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
    const { pendingVideoIds, ...exerciseData } = exercise || {};
    const res = await api.post(`/exercise/${exerciseData?._id}`, exerciseData);
    await replaceExerciseVideos(exerciseData?._id, pendingVideoIds);
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
    const prefs = await readFavoritePrefs('exercise');
    return {
      ...res.data,
      exercises: applyFavoritePrefsToItems(res.data?.exercises || [], prefs),
    };
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
  async ({ id, moveExercisesTo, deleteContents }) => {
    await api.delete(`/exercise-folder/${id}`, { data: { moveExercisesTo, deleteContents } });
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

export const toggleFavoriteExercise = createAsyncThunk(
  'ejercicio/toggleFavoriteExercise',
  async (payloadArg, { getState }) => {
    const exerciseId = typeof payloadArg === 'object' ? payloadArg.exerciseId : payloadArg;
    const expectedFavorite = typeof payloadArg === 'object' ? payloadArg.favorito : undefined;
    const res = await api.patch(`/exercise/${exerciseId}/favorite`);
    const fallbackFavorite = findExerciseFavorite(getState(), exerciseId);
    const payload = normalizeFavoritePayload(res.data, exerciseId, expectedFavorite ?? fallbackFavorite);
    if (typeof expectedFavorite === 'boolean') payload.favorito = expectedFavorite;
    await persistFavoriteState('exercise', exerciseId, payload.favorito);
    return payload; // { _id, favorito }
  }
);

export const batchDeleteExercises = createAsyncThunk(
  'ejercicio/batchDeleteExercises',
  async (ids) => {
    const res = await api.post('/exercise/batch-delete', { ids });
    return res.data; // { deleted, ids }
  }
);

export const batchMoveExercises = createAsyncThunk(
  'ejercicio/batchMoveExercises',
  async ({ ids, folderId }) => {
    const res = await api.post('/exercise/batch-move', { ids, folderId });
    return res.data; // { moved, folderId }
  }
);

