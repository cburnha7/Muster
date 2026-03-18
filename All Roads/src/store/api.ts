import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from './store';
import { API_BASE_URL } from '../services/api/config';
import TokenStorage from '../services/auth/TokenStorage';
import { clearAuth, setTokens } from './slices/authSlice';

// Define base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;

    // Get token from auth state (note: field is 'accessToken' not 'token')
    const token = state.auth.accessToken;
    
    // If we have a token, include it in the Authorization header
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    // DEVELOPMENT: Send X-User-Id header for mock authentication
    if (process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true') {
      // Import authService to get current user
      const { authService } = require('../services/auth/AuthService');
      const currentUser = authService.getCurrentUser();
      if (currentUser?.id) {
        headers.set('X-User-Id', currentUser.id);
        console.log('🔑 Setting X-User-Id header:', currentUser.id);
      }
    }

    // Attach X-Active-User-Id header when acting on behalf of a dependent
    const activeUserId = state.context?.activeUserId;
    const authUserId = state.auth.user?.id;
    if (activeUserId && activeUserId !== authUserId) {
      headers.set('X-Active-User-Id', activeUserId);
    }
    
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Track if we're currently refreshing to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;

// Base query with re-authentication logic
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // If we get a 401, try to refresh the token
  if (result.error && result.error.status === 401) {
    console.log('🔄 401 error detected, attempting token refresh...');
    
    // If already refreshing, wait for that refresh to complete
    if (isRefreshing && refreshPromise) {
      console.log('⏳ Refresh already in progress, waiting...');
      await refreshPromise;
      // Retry the original request with the new token
      result = await baseQuery(args, api, extraOptions);
      return result;
    }
    
    // Start refresh process
    isRefreshing = true;
    
    try {
      // Get refresh token from Redux state first, then fallback to TokenStorage
      let refreshToken = (api.getState() as RootState).auth.refreshToken;
      
      if (!refreshToken) {
        console.log('⚠️ No refresh token in Redux, checking TokenStorage...');
        refreshToken = await TokenStorage.getRefreshToken();
      }
      
      if (!refreshToken) {
        console.error('❌ No refresh token available, clearing session...');
        // Clear auth state silently (user is already logged out)
        await TokenStorage.clearAll();
        api.dispatch(clearAuth());
        isRefreshing = false;
        refreshPromise = null;
        return result;
      }
      
      console.log('🔑 Refresh token found, calling refresh endpoint...');
      
      // Create the refresh promise
      refreshPromise = baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: {
            refreshToken,
          },
        },
        api,
        extraOptions
      );
      
      const refreshResult = await refreshPromise;
      
      if (refreshResult.data) {
        const tokenData = refreshResult.data as { accessToken: string; refreshToken: string };
        console.log('✅ Token refresh successful');
        
        // Store new tokens in TokenStorage
        await TokenStorage.storeTokens(tokenData.accessToken, tokenData.refreshToken);
        
        // Update Redux state
        api.dispatch(setTokens({
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
        }));
        
        // Retry the original query with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        console.error('❌ Token refresh failed, clearing session...');
        // Refresh failed, clear session silently
        await TokenStorage.clearAll();
        api.dispatch(clearAuth());
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      // Clear session on any error
      await TokenStorage.clearAll();
      api.dispatch(clearAuth());
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  }
  
  return result;
};

// Create RTK Query API
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Event', 'Facility', 'Team', 'Booking'],
  endpoints: (builder) => ({
    // Authentication endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),
    
    refreshToken: builder.mutation({
      query: (refreshToken) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: { refreshToken },
      }),
    }),
    
    // User endpoints
    getProfile: builder.query({
      query: () => '/users/profile',
      providesTags: ['User'],
    }),
    
    updateProfile: builder.mutation({
      query: (updates) => ({
        url: '/users/profile',
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['User'],
    }),
    
    // Event endpoints
    getEvents: builder.query({
      query: (filters = {}) => ({
        url: '/events',
        params: filters,
      }),
      providesTags: ['Event'],
    }),
    
    getEvent: builder.query({
      query: (id) => `/events/${id}`,
      providesTags: (result, error, id) => [{ type: 'Event', id }],
    }),
    
    createEvent: builder.mutation({
      query: (eventData) => ({
        url: '/events',
        method: 'POST',
        body: eventData,
      }),
      invalidatesTags: ['Event'],
    }),
    
    updateEvent: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/events/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Event', id }],
    }),
    
    deleteEvent: builder.mutation({
      query: (id) => ({
        url: `/events/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Event'],
    }),
    
    bookEvent: builder.mutation({
      query: ({ eventId, teamId }) => ({
        url: `/events/${eventId}/book`,
        method: 'POST',
        body: teamId ? { teamId } : {},
      }),
      invalidatesTags: ['Event', 'Booking'],
    }),
    
    // Facility endpoints
    getFacilities: builder.query({
      query: (filters = {}) => ({
        url: '/facilities',
        params: filters,
      }),
      providesTags: ['Facility'],
    }),
    
    getFacility: builder.query({
      query: (id) => `/facilities/${id}`,
      providesTags: (result, error, id) => [{ type: 'Facility', id }],
    }),
    
    createFacility: builder.mutation({
      query: (facilityData) => ({
        url: '/facilities',
        method: 'POST',
        body: facilityData,
      }),
      invalidatesTags: ['Facility'],
    }),
    
    updateFacility: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/facilities/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Facility', id }],
    }),
    
    deleteFacility: builder.mutation({
      query: (id) => ({
        url: `/facilities/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Facility'],
    }),
    
    // Team endpoints
    getTeams: builder.query({
      query: (filters = {}) => ({
        url: '/teams',
        params: filters,
      }),
      providesTags: ['Team'],
    }),
    
    getTeam: builder.query({
      query: (id) => `/teams/${id}`,
      providesTags: (result, error, id) => [{ type: 'Team', id }],
    }),
    
    createTeam: builder.mutation({
      query: (teamData) => ({
        url: '/teams',
        method: 'POST',
        body: teamData,
      }),
      invalidatesTags: ['Team'],
    }),
    
    updateTeam: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `/teams/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Team', id }],
    }),
    
    deleteTeam: builder.mutation({
      query: (id) => ({
        url: `/teams/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Team'],
    }),
    
    joinTeam: builder.mutation({
      query: ({ teamId, inviteCode }) => ({
        url: `/teams/${teamId}/join`,
        method: 'POST',
        body: inviteCode ? { inviteCode } : {},
      }),
      invalidatesTags: ['Team'],
    }),
    
    leaveTeam: builder.mutation({
      query: (teamId) => ({
        url: `/teams/${teamId}/leave`,
        method: 'POST',
      }),
      invalidatesTags: ['Team'],
    }),
    
    // Booking endpoints
    getUserBookings: builder.query({
      query: () => '/users/bookings',
      providesTags: ['Booking'],
    }),
    
    cancelBooking: builder.mutation({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Booking', 'Event'],
    }),

    // Promo code endpoints
    validatePromoCode: builder.mutation<{ valid: boolean; trialDurationDays?: number; error?: string }, { code: string }>({
      query: (body) => ({
        url: '/promo-codes/validate',
        method: 'POST',
        body,
      }),
    }),

    redeemPromoCode: builder.mutation<any, { code: string; selectedTier: string }>({
      query: (body) => ({
        url: '/promo-codes/redeem',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Auth hooks
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenMutation,
  
  // User hooks
  useGetProfileQuery,
  useUpdateProfileMutation,
  
  // Event hooks
  useGetEventsQuery,
  useGetEventQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useBookEventMutation,
  
  // Facility hooks
  useGetFacilitiesQuery,
  useGetFacilityQuery,
  useCreateFacilityMutation,
  useUpdateFacilityMutation,
  useDeleteFacilityMutation,
  
  // Team hooks
  useGetTeamsQuery,
  useGetTeamQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useJoinTeamMutation,
  useLeaveTeamMutation,
  
  // Booking hooks
  useGetUserBookingsQuery,
  useCancelBookingMutation,

  // Promo code hooks
  useValidatePromoCodeMutation,
  useRedeemPromoCodeMutation,
} = api;