// store/slices/user/userThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import * as authApi from '@/api/auth';
import { saveUser, saveToken, clearUser } from '@/auth/storage';
import { USE_COOKIE_AUTH } from '@/config';
import { RESET_STORE } from '@/store/actionTypes';

export const fetchUsuario = createAsyncThunk('usuario/Usuario', async ({ usuario }) => {
  const res = await api.get(`/user/${usuario}`);
  return res.data;
});

export const updateUsuario = createAsyncThunk(
  'usuario/updateUsuario',
  async ({ id, updatedUser }) => {
    const res = await api.post(`/user/${id}`, updatedUser);
    return res.data;
  }
);

// ===== Auth thunks (web) =====

export const loginThunk = createAsyncThunk(
  'usuario/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const data = await authApi.login(credentials);
      // Backend returns { token, user } or similar; store regardless of mode
      // Bearer mode: persist token; cookie mode: token cookie set by backend
      if (data?.token && !USE_COOKIE_AUTH) {
        saveToken(data.token);
      }
      const user = data?.usuario || data?.user || data;
      if (user) saveUser(user);
      return user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchMe = createAsyncThunk(
  'usuario/me',
  async (_, { rejectWithValue }) => {
    try {
      const data = await authApi.me();
      const user = data?.usuario || data?.user || data;
      if (user) saveUser(user);
      return user;
    } catch (error) {
      // Diferenciamos errores reales de auth (401/403) de fallos de red
      // o servidor transitorios. Solo en el primer caso debemos cerrar
      // sesión; un timeout/500 al recargar no debe expulsar al usuario.
      const status = error?.status || error?.response?.status;
      const isAuthError = status === 401 || status === 403;
      if (isAuthError) {
        // Sesión inválida: limpiamos la cache local de usuario.
        clearUser();
      }
      return rejectWithValue({
        message: error?.response?.data?.message || error.message,
        isAuthError,
        status,
      });
    }
  }
);

export const logoutThunk = createAsyncThunk(
  'usuario/logout',
  async (_, { dispatch }) => {
    try {
      await authApi.logout();
    } catch {
      // ignore network errors on logout
    }
    clearUser();
    dispatch({ type: RESET_STORE });
    return true;
  }
);
