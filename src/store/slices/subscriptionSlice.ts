/**
 * Subscription Slice
 *
 * Stores the current user's subscription plan, status, and expiry.
 * Hydrated on login, refreshed after any plan change.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  PLAN_HIERARCHY,
} from '../../types/subscription';

export interface SubscriptionState {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: SubscriptionState = {
  plan: 'free',
  status: 'active',
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  isLoading: false,
  error: null,
};

/** Fetch subscription from backend */
export const fetchSubscription = createAsyncThunk(
  'subscription/fetch',
  async (userId: string, { rejectWithValue }) => {
    try {
      const { API_BASE_URL } = await import('../../services/api/config');
      const response = await fetch(
        `${API_BASE_URL}/subscriptions/${userId}`
      );
      if (!response.ok) {
        // No subscription = free plan
        if (response.status === 404) {
          return { plan: 'free', status: 'active', currentPeriodEnd: null, cancelAtPeriodEnd: false } as Subscription;
        }
        throw new Error('Failed to fetch subscription');
      }
      return (await response.json()) as Subscription;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch subscription');
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setSubscription(state, action: PayloadAction<Subscription>) {
      state.plan = action.payload.plan;
      state.status = action.payload.status;
      state.currentPeriodEnd = action.payload.currentPeriodEnd;
      state.cancelAtPeriodEnd = action.payload.cancelAtPeriodEnd;
      state.error = null;
    },
    clearSubscription(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        state.plan = action.payload.plan;
        state.status = action.payload.status;
        state.currentPeriodEnd = action.payload.currentPeriodEnd;
        state.cancelAtPeriodEnd = action.payload.cancelAtPeriodEnd;
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSubscription, clearSubscription } = subscriptionSlice.actions;

// Selectors
export const selectSubscription = (state: RootState) => state.subscription;
export const selectPlan = (state: RootState) => state.subscription.plan;
export const selectIsSubscriptionActive = (state: RootState) =>
  state.subscription.status === 'active' || state.subscription.status === 'trialing';

/** Check if user's plan meets or exceeds the required plan */
export const selectHasPlan = (requiredPlan: SubscriptionPlan) => (state: RootState) => {
  const userPlanIndex = PLAN_HIERARCHY.indexOf(state.subscription.plan);
  const requiredIndex = PLAN_HIERARCHY.indexOf(requiredPlan);
  const isActive = state.subscription.status === 'active' || state.subscription.status === 'trialing';
  return isActive && userPlanIndex >= requiredIndex;
};

export default subscriptionSlice.reducer;
