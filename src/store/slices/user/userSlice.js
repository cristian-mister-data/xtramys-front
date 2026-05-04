// store/slices/user/userSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { fetchUsuario, updateUsuario, loginThunk, fetchMe, logoutThunk } from './userThunks';
import { loadUser } from '@/auth/storage';

const cachedUser = loadUser();

const userSlice = createSlice({
  name: 'usuario',
  initialState: {
    user: cachedUser || null,
    isAuthenticated: !!cachedUser,
    authChecked: false,
    loading: false,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.authChecked = true;
    },
    clearUserState: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.authChecked = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsuario.pending, (s) => { s.loading = true; })
      .addCase(fetchUsuario.fulfilled, (s, a) => {
        s.loading = false;
        s.user = a.payload;
        s.isAuthenticated = !!a.payload;
      })
      .addCase(fetchUsuario.rejected, (s, a) => {
        s.loading = false;
        s.error = a.error.message;
      })

      .addCase(updateUsuario.fulfilled, (s, a) => {
        s.user = a.payload;
      })

      .addCase(loginThunk.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(loginThunk.fulfilled, (s, a) => {
        s.loading = false;
        s.user = a.payload;
        s.isAuthenticated = !!a.payload;
        s.authChecked = true;
      })
      .addCase(loginThunk.rejected, (s, a) => {
        s.loading = false;
        s.authChecked = true;
        s.error = a.payload?.message || a.payload || a.error.message;
      })

      .addCase(fetchMe.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchMe.fulfilled, (s, a) => {
        s.loading = false;
        s.user = a.payload;
        s.isAuthenticated = !!a.payload;
        s.authChecked = true;
      })
      .addCase(fetchMe.rejected, (s, a) => {
        s.loading = false;
        s.authChecked = true;
        s.user = null;
        s.isAuthenticated = false;
        s.error = a.payload?.message || a.error.message;
      })

      .addCase(logoutThunk.fulfilled, (s) => {
        s.user = null;
        s.isAuthenticated = false;
        s.authChecked = true;
        s.error = null;
      });
  },
});

export const { setUser, clearUserState } = userSlice.actions;
export default userSlice.reducer;
