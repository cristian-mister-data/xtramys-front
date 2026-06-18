// store/slices/exercise/exerciseThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import { linkVideoToExercise } from '@/api/video';
import { createReadCache } from '@/utils/readCache';
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
const exerciseReadCache = createReadCache({ ttlMs: 60000 });
const exerciseCacheKey = (scope, payload) => exerciseReadCache.key(`exercise:${scope}`, payload);
const invalidateExerciseReads = () => exerciseReadCache.clear();

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
  async ({ user, lang, filterType } = {}) => {
    const cacheKey = exerciseCacheKey('user', { user, lang, filterType });
    return exerciseReadCache.read(cacheKey, async () => {
      const queryParams = [];
      if (lang) queryParams.push(`lang=${lang}`);
      if (filterType) queryParams.push(`filterType=${filterType}`);
      const params = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/exercise/user/${user}${params}`);
      return applyExerciseFavoritePrefs(res.data);
    });
  }
);

export const fetchEjercicio = createAsyncThunk('ejercicio/fetchEjercicio', async ({ id, lang } = {}) => {
  const cacheKey = exerciseCacheKey('detail', { id, lang });
  return exerciseReadCache.read(cacheKey, async () => {
    const params = lang ? `?lang=${lang}` : '';
    const res = await api.get(`/exercise/${id}${params}`);
    return applyExerciseFavoritePrefs(res.data);
  });
});

export const fetchGlobalExercises = createAsyncThunk(
  'ejercicio/fetchGlobalExercises',
  async ({ lang } = {}) => {
    const cacheKey = exerciseCacheKey('global', { lang });
    return exerciseReadCache.read(cacheKey, async () => {
      const params = lang ? `?lang=${lang}` : '';
      const res = await api.get(`/exercise/global${params}`);
      return applyExerciseFavoritePrefs(res.data);
    });
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
    invalidateExerciseReads();
    return createdExercise;
  }
);

export const updateEjercicio = createAsyncThunk('ejercicio/updateEjercicio', async (exercise, { rejectWithValue }) => {
  try {
    const { pendingVideoIds, ...exerciseData } = exercise || {};
    const res = await api.post(`/exercise/${exerciseData?._id}`, exerciseData);
    await replaceExerciseVideos(exerciseData?._id, pendingVideoIds);
    invalidateExerciseReads();
    return res.data;
  } catch (err) {
    console.error('[updateEjercicio] FAIL', err?.response?.status, err?.response?.data || err?.message);
    return rejectWithValue(err?.response?.data || err?.message);
  }
});

export const deleteEjercicio = createAsyncThunk('ejercicio/deleteEjercicio', async (id) => {
  await api.delete(`/exercise/${id}`);
  invalidateExerciseReads();
  return id;
});

// ========== Carpetas de ejercicios ==========

export const fetchExerciseFolders = createAsyncThunk(
  'ejercicio/fetchExerciseFolders',
  async ({ parentFolder, lang, user } = {}) => {
    const cacheKey = exerciseCacheKey('folders', { parentFolder, lang, user });
    return exerciseReadCache.read(cacheKey, async () => {
      const queryParams = [];
      if (parentFolder) queryParams.push(`parentFolder=${parentFolder}`);
      if (lang) queryParams.push(`lang=${lang}`);
      if (user) queryParams.push(`user=${user}`);
      const params = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/exercise-folder${params}`);
      return res.data.folders;
    });
  }
);

export const fetchGlobalFolders = createAsyncThunk(
  'ejercicio/fetchGlobalFolders',
  async ({ lang } = {}) => {
    const cacheKey = exerciseCacheKey('global-folders', { lang });
    return exerciseReadCache.read(cacheKey, async () => {
      const params = lang ? `?lang=${lang}` : '';
      const res = await api.get(`/exercise-folder/global${params}`);
      return res.data.folders;
    });
  }
);

export const fetchExerciseFolderById = createAsyncThunk(
  'ejercicio/fetchExerciseFolderById',
  async ({ id, lang, user }) => {
    const cacheKey = exerciseCacheKey('folder-detail', { id, lang, user });
    return exerciseReadCache.read(cacheKey, async () => {
      const queryParams = [];
      if (lang) queryParams.push(`lang=${lang}`);
      if (user) queryParams.push(`user=${user}`);
      const params = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/exercise-folder/${id}${params}`);
      const prefs = await readFavoritePrefs('exercise');
      return {
        ...res.data,
        exercises: applyFavoritePrefsToItems(res.data?.exercises || [], prefs),
      };
    });
  }
);

export const fetchExerciseFoldersFlat = createAsyncThunk(
  'ejercicio/fetchExerciseFoldersFlat',
  async ({ lang, user } = {}) => {
    const cacheKey = exerciseCacheKey('folders-flat', { lang, user });
    return exerciseReadCache.read(cacheKey, async () => {
      const queryParams = [];
      if (lang) queryParams.push(`lang=${lang}`);
      if (user) queryParams.push(`user=${user}`);
      const params = queryParams.length ? `?${queryParams.join('&')}` : '';
      const res = await api.get(`/exercise-folder/flat${params}`);
      return res.data.folders;
    });
  }
);

export const createExerciseFolder = createAsyncThunk(
  'ejercicio/createExerciseFolder',
  async ({ nombre, parentFolder, color, isGlobal, translations, user }) => {
    const res = await api.post('/exercise-folder', {
      nombre, parentFolder, color, isGlobal, translations, usuario: user,
    });
    invalidateExerciseReads();
    return res.data.folder;
  }
);

export const updateExerciseFolder = createAsyncThunk(
  'ejercicio/updateExerciseFolder',
  async ({ id, nombre, color, translations, user }) => {
    const res = await api.put(`/exercise-folder/${id}`, { nombre, color, translations, user });
    invalidateExerciseReads();
    return res.data.folder;
  }
);

export const deleteExerciseFolder = createAsyncThunk(
  'ejercicio/deleteExerciseFolder',
  async ({ id, moveExercisesTo, deleteContents, user }) => {
    await api.delete(`/exercise-folder/${id}`, { data: { moveExercisesTo, deleteContents, user } });
    invalidateExerciseReads();
    return id;
  }
);

export const moveExerciseToFolder = createAsyncThunk(
  'ejercicio/moveExerciseToFolder',
  async ({ exerciseId, folderId, user }) => {
    await api.post('/exercise-folder/move-exercise', { exerciseId, folderId, user });
    invalidateExerciseReads();
    return { exerciseId, folderId };
  }
);

export const duplicateExerciseToFolder = createAsyncThunk(
  'ejercicio/duplicateExerciseToFolder',
  async ({ exerciseId, folderId, duplicateName, lang, user }) => {
    const res = await api.post('/exercise-folder/duplicate-exercise', {
      exerciseId, folderId, duplicateName, lang, user,
    });
    invalidateExerciseReads();
    return res.data.exercise;
  }
);

export const duplicateGlobalExercise = createAsyncThunk(
  'ejercicio/duplicateGlobalExercise',
  async ({ exerciseId, folderId, duplicateName, lang, user }) => {
    const res = await api.post('/exercise-folder/duplicate-global', {
      exerciseId, folderId, duplicateName, lang, user,
    });
    invalidateExerciseReads();
    return res.data.exercise;
  }
);

export const copyClubExerciseToMine = createAsyncThunk(
  'ejercicio/copyClubExerciseToMine',
  async ({ exerciseId, folderId, duplicateName, lang, user }) => {
    const res = await api.post('/exercise-folder/copy-club', {
      exerciseId, folderId, duplicateName, lang, user,
    });
    invalidateExerciseReads();
    return res.data.exercise;
  }
);

export const toggleFavoriteExercise = createAsyncThunk(
  'ejercicio/toggleFavoriteExercise',
  async (payloadArg, { getState }) => {
    const exerciseId = typeof payloadArg === 'object' ? payloadArg.exerciseId : payloadArg;
    const expectedFavorite = typeof payloadArg === 'object' ? payloadArg.favorito : undefined;
    const fallbackFavorite = findExerciseFavorite(getState(), exerciseId);
    const optimisticFavorite = expectedFavorite ?? !fallbackFavorite;

    try {
      const res = await api.patch(`/exercise/${exerciseId}/favorite`);
      const payload = normalizeFavoritePayload(res.data, exerciseId, optimisticFavorite);
      if (typeof expectedFavorite === 'boolean') payload.favorito = expectedFavorite;
      await persistFavoriteState('exercise', exerciseId, payload.favorito);
      invalidateExerciseReads();
      return payload; // { _id, favorito }
    } catch (error) {
      const isPermissionFallback = error?.status === 403 || error?.status === 404;
      if (!isPermissionFallback) throw error;

      await persistFavoriteState('exercise', exerciseId, optimisticFavorite);
      invalidateExerciseReads();
      return { _id: exerciseId, favorito: optimisticFavorite };
    }
  }
);

export const batchDeleteExercises = createAsyncThunk(
  'ejercicio/batchDeleteExercises',
  async (payload) => {
    const body = Array.isArray(payload) ? { ids: payload } : payload;
    const res = await api.post('/exercise/batch-delete', body);
    invalidateExerciseReads();
    return res.data; // { deleted, ids }
  }
);

export const batchMoveExercises = createAsyncThunk(
  'ejercicio/batchMoveExercises',
  async ({ ids, folderId, user }) => {
    const res = await api.post('/exercise/batch-move', { ids, folderId, user });
    invalidateExerciseReads();
    return res.data; // { moved, folderId }
  }
);

