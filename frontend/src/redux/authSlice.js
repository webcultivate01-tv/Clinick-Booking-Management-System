import { createSlice } from '@reduxjs/toolkit';

/**
 * Auth slice — setter-only per blueprint § 3F. No thunks. Components do the
 * inline axios call and dispatch setUser / clearAuth / setAuthInitialized
 * themselves.
 */
const slice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    initialized: false, // true after first /me call resolves either way
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
    },
    setAuthInitialized(state, action) {
      state.initialized = Boolean(action.payload);
    },
    clearAuth(state) {
      state.user = null;
    },
  },
});

export const { setUser, setAuthInitialized, clearAuth } = slice.actions;

export const selectUser = (s) => s.auth.user;
export const selectIsAuthed = (s) => Boolean(s.auth.user);
export const selectRole = (s) => s.auth.user?.role || null;
export const selectAuthInitialized = (s) => s.auth.initialized;

export default slice.reducer;
