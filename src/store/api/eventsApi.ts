import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store';
import { apiConfig } from '../../services/api/config';
import { clearAuth, setTokens } from '../slices/authSlice';
import TokenStorage from '../../services/auth/TokenStorage';
import { Event, EventFilters, PaginatedResponse, PaginationParams, Booking, EventStatus } from '../../types';

// Default filter configuration used by both Home Screen and Events Tab
export const DEFAULT_EVENT_FILTERS: EventFilters = {
  status: EventStatus.ACTIVE,
  // Location-based sorting will be handled by backend based on user location
};

// Define base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: apiConfig.baseURL,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;

    // Get token from auth state (note: field is 'accessToken' not 'token')
    const token = state.auth.accessToken;
    
    // If we have a token, include it in the Authorization header
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    // Send X-User-Id header as fallback authentication
    // This allows the backend to identify the user even if the JWT is expired
    const userId = state.auth.user?.id;
    if (userId) {
      headers.set('X-User-Id', userId);
    }

    // Attach X-Active-User-Id header when acting on behalf of a dependent
    const activeUserId = state.context?.activeUserId;
    if (activeUserId && activeUserId !== userId) {
      headers.set('X-Active-User-Id', activeUserId);
    }
    
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Base query with re-authentication logic
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // If we get a 401, try to refresh the token
  if (result.error && result.error.status === 401) {
    console.log('🔄 [eventsApi] 401 error, attempting token refresh...');
    
    // Get refresh token from Redux state first, then fallback to TokenStorage
    let refreshToken = (api.getState() as RootState).auth.refreshToken;
    if (!refreshToken) {
      refreshToken = await TokenStorage.getRefreshToken();
    }
    
    if (!refreshToken) {
      console.error('❌ No refresh token available, clearing session...');
      await TokenStorage.clearAll();
      api.dispatch(clearAuth());
      return result;
    }
    
    const refreshResult = await baseQuery(
      {
        url: '/auth/refresh',
        method: 'POST',
        body: { refreshToken },
      },
      api,
      extraOptions
    );
    
    if (refreshResult.data) {
      const tokenData = refreshResult.data as { accessToken: string; refreshToken: string };
      console.log('✅ [eventsApi] Token refresh successful');
      
      await TokenStorage.storeTokens(tokenData.accessToken, tokenData.refreshToken);
      api.dispatch(setTokens({
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
      }));
      
      // Retry the original query with new token
      result = await baseQuery(args, api, extraOptions);
    } else {
      console.error('❌ [eventsApi] Token refresh failed, clearing session...');
      await TokenStorage.clearAll();
      api.dispatch(clearAuth());
    }
  }
  
  return result;
};

// Create RTK Query API for events
export const eventsApi = createApi({
  reducerPath: 'eventsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Events', 'Bookings'],
  endpoints: (builder) => ({
    // Get events with filters and pagination
    getEvents: builder.query<PaginatedResponse<Event>, {
      filters?: EventFilters;
      pagination?: PaginationParams;
      userId?: string;
    }>({
      query: ({ filters = {}, pagination = { page: 1, limit: 20 }, userId }) => ({
        url: '/events',
        params: {
          ...filters,
          ...pagination,
          // Convert Date objects to ISO strings if present
          startDate: filters.startDate?.toISOString(),
          endDate: filters.endDate?.toISOString(),
          ...(userId ? { userId } : {}),
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Events' as const, id })),
              { type: 'Events', id: 'LIST' },
            ]
          : [{ type: 'Events', id: 'LIST' }],
      // Add retry logic with exponential backoff
      extraOptions: {
        maxRetries: 3,
      },
      // Transform error response
      transformErrorResponse: (response: any) => ({
        code: response.status === 401 ? 'ERR_UNAUTHORIZED' : 'ERR_API',
        message: response.data?.message || 'Failed to load events',
      }),
      // Add logging in development
      onQueryStarted: async (arg, { queryFulfilled }) => {
        if (__DEV__) {
          console.log('[RTK Query] getEvents started:', arg);
          try {
            const { data } = await queryFulfilled;
            console.log('[RTK Query] getEvents succeeded:', data.data.length, 'events');
          } catch (error) {
            console.error('[RTK Query] getEvents failed:', error);
          }
        }
      },
    }),

    // Get user bookings
    getUserBookings: builder.query<PaginatedResponse<Booking>, {
      status?: 'upcoming' | 'past' | 'all';
      pagination?: PaginationParams;
    }>({
      query: ({ status = 'upcoming', pagination = { page: 1, limit: 100 } }) => ({
        url: '/users/bookings',
        params: {
          status,
          ...pagination,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Bookings' as const, id })),
              { type: 'Bookings', id: 'LIST' },
            ]
          : [{ type: 'Bookings', id: 'LIST' }],
      // Add retry logic
      extraOptions: {
        maxRetries: 3,
      },
      // Transform error response
      transformErrorResponse: (response: any) => ({
        code: response.status === 401 ? 'ERR_UNAUTHORIZED' : 'ERR_API',
        message: response.data?.message || 'Failed to load bookings',
      }),
      // Add logging in development
      onQueryStarted: async (arg, { queryFulfilled }) => {
        if (__DEV__) {
          console.log('[RTK Query] getUserBookings started:', arg);
          try {
            const { data } = await queryFulfilled;
            console.log('[RTK Query] getUserBookings succeeded:', data.data.length, 'bookings');
          } catch (error) {
            console.error('[RTK Query] getUserBookings failed:', error);
          }
        }
      },
    }),

    // Book an event
    bookEvent: builder.mutation<Booking, { eventId: string; userId: string; teamId?: string }>({
      query: ({ eventId, userId, teamId }) => ({
        url: `/events/${eventId}/book`,
        method: 'POST',
        body: { userId, teamId },
      }),
      // Invalidate both Events and Bookings to trigger refetch
      invalidatesTags: (_result, _error, { eventId }) => [
        { type: 'Events', id: eventId },
        { type: 'Events', id: 'LIST' },
        { type: 'Bookings', id: 'LIST' },
      ],
      // Add logging in development
      onQueryStarted: async (arg, { queryFulfilled }) => {
        if (__DEV__) {
          console.log('[RTK Query] bookEvent started:', arg);
          try {
            const { data } = await queryFulfilled;
            console.log('[RTK Query] bookEvent succeeded:', data);
          } catch (error) {
            console.error('[RTK Query] bookEvent failed:', error);
          }
        }
      },
    }),

    // Cancel a booking
    cancelBooking: builder.mutation<void, { eventId: string; bookingId: string }>({
      query: ({ eventId, bookingId }) => ({
        url: `/events/${eventId}/book/${bookingId}`,
        method: 'DELETE',
      }),
      // Invalidate both Events and Bookings to trigger refetch
      invalidatesTags: (_result, _error, { eventId }) => {
        console.log('[RTK Query] cancelBooking - Invalidating tags for eventId:', eventId);
        return [
          { type: 'Events', id: eventId },
          { type: 'Events', id: 'LIST' },
          { type: 'Bookings', id: 'LIST' },
        ];
      },
      // Add logging in development
      onQueryStarted: async (arg, { queryFulfilled }) => {
        console.log('[RTK Query] cancelBooking started:', arg);
        try {
          await queryFulfilled;
          console.log('[RTK Query] cancelBooking succeeded - cache should be invalidated now');
        } catch (error) {
          console.error('[RTK Query] cancelBooking failed:', error);
        }
      },
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetEventsQuery,
  useGetUserBookingsQuery,
  useBookEventMutation,
  useCancelBookingMutation,
} = eventsApi;
