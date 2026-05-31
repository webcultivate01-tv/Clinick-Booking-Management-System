import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../api/axios';

/**
 * Auth state: user + initial-load flag so route guards can wait for the
 * "have I checked /me yet?" answer instead of bouncing the user to /login
 * on every refresh.
 */

export const loadCurrentUser = createAsyncThunk(
  'auth/loadCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/auth/me');
      return res.data.user;
    } catch (err) {
      // 401 just means "not logged in" — fine on public pages.
      return rejectWithValue(err.message);
    }
  }
);

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.token) localStorage.setItem('token', res.data.token);
      return res.data.user;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  try { await api.post('/auth/logout'); } catch { /* fall through */ }
  localStorage.removeItem('token');
});

const slice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    initialized: false, // true after first /me call resolves either way
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (s) => { s.error = null; },
  },
  extraReducers: (b) => {
    b
      .addCase(loadCurrentUser.pending,   (s) => { s.loading = true; })
      .addCase(loadCurrentUser.fulfilled, (s, a) => { s.user = a.payload; s.loading = false; s.initialized = true; })
      .addCase(loadCurrentUser.rejected,  (s) => { s.user = null;       s.loading = false; s.initialized = true; })

      .addCase(loginThunk.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(loginThunk.fulfilled, (s, a) => { s.user = a.payload; s.loading = false; })
      .addCase(loginThunk.rejected,  (s, a) => { s.user = null;       s.loading = false; s.error = a.payload; })

      .addCase(logoutThunk.fulfilled, (s) => { s.user = null; });
  },
});

export const { clearError } = slice.actions;

export const selectUser = (s) => s.auth.user;
export const selectIsAuthed = (s) => Boolean(s.auth.user);
export const selectRole = (s) => s.auth.user?.role || null;
export const selectAuthInitialized = (s) => s.auth.initialized;
export const selectAuthLoading = (s) => s.auth.loading;
export const selectAuthError = (s) => s.auth.error;

export default slice.reducer;
