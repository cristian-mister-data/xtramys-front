import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '@/api/client';
import { clearWorkspace, loadWorkspace, saveWorkspace } from '@/auth/storage';

const cachedWorkspace = loadWorkspace();

export const fetchWorkspaces = createAsyncThunk(
  'workspace/list',
  async (_, { getState, rejectWithValue }) => {
    const user = getState().usuario?.user;
    const supervising = getState().usuario?.supervising;
    const storedTarget = typeof window !== 'undefined'
      ? sessionStorage.getItem('xtramys:club-supervision-user')
      : null;
    const storedOwner = typeof window !== 'undefined'
      ? sessionStorage.getItem('xtramys:club-supervision-owner')
      : null;
    const pendingSupervision = storedTarget && storedOwner === String(user?._id || '');
    if (user?.plan === 'demo' || user?.accessMode === 'demo') {
      return { workspaces: [] };
    }
    try {
      const targetUserId = supervising ? user?._id : (pendingSupervision ? storedTarget : null);
      const query = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : '';
      const { data } = await api.get(`/club/workspaces${query}`, { cache: false });
      return data;
    } catch (err) {
      if (err.response?.status === 403 && (user?.plan === 'demo' || user?.accessMode === 'demo')) {
        return { workspaces: [] };
      }
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
  {
    condition: ({ force = false } = {}, { getState }) => {
      const workspace = getState().workspace;
      return Boolean(force || (!workspace.loading && !workspace.loaded));
    },
  },
);

export const selectWorkspace = createAsyncThunk('workspace/select', async (workspace, { getState }) => {
  const teamId = workspace?.team?._id || workspace?.teamId;
  const state = getState();
  const storedMode = typeof window !== 'undefined' ? sessionStorage.getItem('xtramys:club-supervision-mode') : null;
  const storedTarget = typeof window !== 'undefined'
    ? sessionStorage.getItem('xtramys:club-supervision-user')
    : null;
  const storedOwner = typeof window !== 'undefined'
    ? sessionStorage.getItem('xtramys:club-supervision-owner')
    : null;
  const pendingSupervision = typeof window !== 'undefined'
    && storedTarget
    && (state.usuario?.supervising
      || storedTarget === String(state.usuario?.user?._id || '')
      || storedOwner === String(state.usuario?.user?._id || ''));
  if (state.usuario?.supervising || pendingSupervision) {
    const managing = state.usuario?.supervisionMode === 'manage' || storedMode === 'manage';
    const selected = { ...workspace, teamId, permission: managing ? 'manage' : 'view', historical: false, canWrite: managing };
    saveWorkspace(selected);
    return selected;
  }
  const { data } = await api.post('/club/workspaces/select', { teamId });
  const selected = {
    ...workspace,
    teamId,
    permission: data.permission,
    historical: data.historical,
    canWrite: data.canWrite,
  };
  saveWorkspace(selected);
  return selected;
});

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState: {
    items: [],
    selected: cachedWorkspace,
    loading: false,
    loaded: false,
    error: null,
  },
  reducers: {
    forgetWorkspace(state) {
      state.selected = null;
      clearWorkspace();
    },
    setSupervisionWorkspaces(state, action) {
      const { items, selected } = action.payload || {};
      state.items = items || [];
      state.selected = selected || null;
      state.loaded = true;
      state.loading = false;
      state.error = null;
      if (selected) {
        saveWorkspace(selected);
      } else {
        clearWorkspace();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.pending, (state) => {
        state.loading = true;
        state.loaded = false;
        state.error = null;
        state.items = [];
        state.selected = null;
        clearWorkspace();
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.items = action.payload.workspaces || [];
        const selectedId = state.selected?.team?._id || state.selected?.teamId;
        const current = state.items.find(({ team }) => String(team?._id) === String(selectedId))
          || (state.items.length === 1 ? state.items[0] : null);
        if (current) {
          const supervisionMode = typeof window !== 'undefined'
            ? sessionStorage.getItem('xtramys:club-supervision-mode')
            : null;
          state.selected = supervisionMode ? {
            ...current,
            teamId: current.team?._id || current.teamId,
            permission: supervisionMode === 'manage' ? 'manage' : 'view',
            historical: false,
            canWrite: supervisionMode === 'manage',
          } : current;
          saveWorkspace(state.selected);
        } else {
          state.selected = null;
          clearWorkspace();
        }
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.error = action.error.message;
      })
      .addCase(selectWorkspace.fulfilled, (state, action) => {
        state.selected = action.payload;
        state.error = null;
      })
      .addCase(selectWorkspace.rejected, (state, action) => {
        state.error = action.error.message;
      });
  },
});

export const { forgetWorkspace, setSupervisionWorkspaces } = workspaceSlice.actions;
export default workspaceSlice.reducer;
