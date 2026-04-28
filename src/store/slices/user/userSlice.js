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
    loading: false,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearUserState: (state) => {
      state.user = null;
      state.isAuthenticated = false;
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
      })
      .addCase(loginThunk.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload || a.error.message;
      })

      .addCase(fetchMe.fulfilled, (s, a) => {
        s.user = a.payload;
        s.isAuthenticated = !!a.payload;
      })
      .addCase(fetchMe.rejected, (s, a) => {
        // Solo cerramos sesión si fue un error real de autenticación
        // (401/403). Un fallo de red o servidor transitorio al recargar
        // la página NO debe expulsar al usuario ni borrar su cache.
        if (a.payload?.isAuthError) {
          s.user = null;
          s.isAuthenticated = false;
        }
      })

      .addCase(logoutThunk.fulfilled, (s) => {
        s.user = null;
        s.isAuthenticated = false;
        s.error = null;
      });
  },
});

export const { setUser, clearUserState } = userSlice.actions;
export default userSlice.reducer;
