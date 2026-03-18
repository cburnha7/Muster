/**
 * Context Slice
 *
 * Manages the active user context for guardian/dependent switching.
 * The guardian remains authenticated; this slice only tracks which
 * user ID (guardian or dependent) is currently "active" across the app.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DependentSummary } from '../../types/dependent';

export interface ContextState {
  /** The user ID currently in effect. Defaults to null (guardian's own ID). */
  activeUserId: string | null;
  /** Cached list of the guardian's dependents for the context switcher. */
  dependents: DependentSummary[];
}

const initialState: ContextState = {
  activeUserId: null,
  dependents: [],
};

const contextSlice = createSlice({
  name: 'context',
  initialState,
  reducers: {
    /** Switch the active user context to a guardian or dependent. */
    setActiveUser(state, action: PayloadAction<string | null>) {
      state.activeUserId = action.payload;
    },
    /** Update the cached dependents list (e.g. after fetching from API). */
    setDependents(state, action: PayloadAction<DependentSummary[]>) {
      state.dependents = action.payload;
    },
    /** Reset context back to defaults (e.g. on logout). */
    resetContext() {
      return initialState;
    },
  },
});

// Export actions
export const { setActiveUser, setDependents, resetContext } = contextSlice.actions;

// Export reducer
export default contextSlice.reducer;

// Selectors
export const selectActiveUserId = (state: { context: ContextState }) =>
  state.context.activeUserId;
export const selectDependents = (state: { context: ContextState }) =>
  state.context.dependents;
export const selectContext = (state: { context: ContextState }) =>
  state.context;
