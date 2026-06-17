import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/api/client';
import * as authApi from '@/api/auth';
import * as subscriptionApi from '@/api/subscription';
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
    if (res.data) saveUser(res.data);
    return res.data;
  }
);

// ===== Auth thunks (web) =====

export const loginThunk = createAsyncThunk(
  'usuario/login',
  async (credentials, { dispatch, rejectWithValue }) => {
    try {
      const data = await authApi.login(credentials);
      dispatch({ type: RESET_STORE });
      // Backend returns { token, user } or similar; store regardless of mode
      // Bearer mode: persist token; cookie mode: token cookie set by backend
      if (data?.token) {
        saveToken(data.token);
      }
      const user = data?.usuario || data?.user || data;
      if (user) saveUser(user);
      return user;
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.message || error.message,
        type: error?.type,
        code: error.code || error.response?.data?.code,
        data: error.data || error.response?.data,
      });
    }
  }
);

export const fetchMe = createAsyncThunk(
  'usuario/me',
  async (_, { rejectWithValue }) => {
    try {
      const data = await authApi.me();
      if (data?.token) {
        saveToken(data.token);
      }
      const user = data?.usuario || data?.user || data;
      if (user) saveUser(user);
      return user;
    } catch (error) {
      const status = error?.status || error?.response?.status;
      clearUser();
      return rejectWithValue({
        message: error?.response?.data?.message || error.message,
        status,
        type: error?.type,
        code: error?.code || error?.response?.data?.code,
        data: error?.data || error?.response?.data,
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

export const checkSubscription = createAsyncThunk(
  'usuario/checkSubscription',
  async (_, { rejectWithValue }) => {
    try {
      const data = await subscriptionApi.getSubscriptionStatus();
      return data;
    } catch (error) {
      return rejectWithValue({
        message: error?.response?.data?.message || error.message,
        code: error?.code || error?.response?.data?.code,
      });
    }
  }
);
