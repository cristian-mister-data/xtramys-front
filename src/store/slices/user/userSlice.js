import { createSlice } from '@reduxjs/toolkit';
import { fetchUsuario, updateUsuario, loginThunk, fetchMe, logoutThunk, checkSubscription } from './userThunks';
import { loadUser } from '@/auth/storage';

const cachedUser = loadUser();
const cachedSupervision = (() => {
  if (typeof window === 'undefined' || !cachedUser?._id) return null;
  try {
    const ownerId = sessionStorage.getItem('xtramys:club-supervision-owner');
    const targetId = sessionStorage.getItem('xtramys:club-supervision-user');
    const target = JSON.parse(sessionStorage.getItem('xtramys:club-supervision-user-data') || 'null');
    return ownerId === String(cachedUser._id) && targetId === String(target?._id) ? target : null;
  } catch {
    return null;
  }
})();

const userSlice = createSlice({
  name: 'usuario',
  initialState: {
    user: cachedSupervision || cachedUser || null,
    isAuthenticated: !!cachedUser,
    authChecked: false,
    loading: false,
    error: null,
    subscriptionStatus: cachedUser?.subscriptionStatus || null,
    plan: cachedUser?.plan || 'free',
    backupUser: cachedSupervision ? cachedUser : null,
    supervising: Boolean(cachedSupervision),
    supervisionMode: cachedSupervision
      ? (sessionStorage.getItem('xtramys:club-supervision-mode') || 'view')
      : 'view',
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.authChecked = true;
      state.subscriptionStatus = action.payload?.subscriptionStatus || null;
      state.plan = action.payload?.plan || 'free';
    },
    clearUserState: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.authChecked = true;
      state.error = null;
      state.subscriptionStatus = null;
      state.plan = 'free';
    },
    subscriptionRequired: (state) => {
      state.subscriptionStatus = 'canceled';
      if (state.user) {
        state.user.subscriptionStatus = 'canceled';
        state.user.plan = 'free';
      }
      state.plan = 'free';
    },
    startSupervision: (state, action) => {
      const target = action.payload?.user || action.payload;
      if (!state.supervising) state.backupUser = state.user;
      state.user = { ...target };
      state.supervising = true;
      state.supervisionMode = action.payload?.mode || 'view';
    },
    stopSupervision: (state) => {
      if (state.backupUser) {
        state.user = state.backupUser;
        state.backupUser = null;
      }
      state.supervising = false;
      state.supervisionMode = 'view';
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
        s.subscriptionStatus = a.payload?.subscriptionStatus || null;
        s.plan = a.payload?.plan || 'free';
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
        if (s.supervising) s.backupUser = a.payload;
        else s.user = a.payload;
        s.isAuthenticated = !!a.payload;
        s.authChecked = true;
        s.subscriptionStatus = a.payload?.subscriptionStatus || null;
        s.plan = a.payload?.plan || 'free';
      })
      .addCase(fetchMe.rejected, (s, a) => {
        s.loading = false;
        s.authChecked = true;
        s.user = null;
        s.isAuthenticated = false;
        s.error = a.payload?.status === 401 ? null : (a.payload?.message || a.error.message);
        s.subscriptionStatus = null;
        s.plan = 'free';
      })

      .addCase(logoutThunk.fulfilled, (s) => {
        s.user = null;
        s.isAuthenticated = false;
        s.authChecked = true;
        s.error = null;
        s.subscriptionStatus = null;
        s.plan = 'free';
      })

      .addCase(checkSubscription.fulfilled, (s, a) => {
        s.subscriptionStatus = a.payload?.subscriptionStatus || null;
        s.plan = a.payload?.plan || 'free';
        if (s.user) {
          s.user.subscriptionStatus = a.payload?.subscriptionStatus || null;
          s.user.plan = a.payload?.plan || 'free';
          s.user.subscriptionCurrentPeriodEnd = a.payload?.currentPeriodEnd || null;
          s.user.subscriptionCancelAtPeriodEnd = a.payload?.cancelAtPeriodEnd || false;
          s.user.paymentProvider = a.payload?.paymentProvider || null;
          s.user.subscriptionStartedAt = a.payload?.startedAt || null;
          s.user.subscriptionCanceledAt = a.payload?.canceledAt || null;
          s.user.clubMaxTeams = a.payload?.maxTeams ?? a.payload?.maxUsers ?? null;
          s.user.clubActiveTeams = a.payload?.activeTeams ?? a.payload?.activeUsers ?? null;
          s.user.clubMaxUsers = s.user.clubMaxTeams;
          s.user.clubActiveUsers = s.user.clubActiveTeams;
          s.user.invoices = a.payload?.invoices || [];
        }
      });
  },
});

export const { setUser, clearUserState, subscriptionRequired, startSupervision, stopSupervision } = userSlice.actions;
export default userSlice.reducer;
