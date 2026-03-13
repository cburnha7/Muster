import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store';
import { apiConfig } from '../../services/api/config';
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
    // Get token from auth state (note: field is 'accessToken' not 'token')
    const token = (getState() as RootState).auth.accessToken;
    
    // If we have a token, include it in the Authorization header
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    // DEVELOPMENT: Send X-User-Id header for mock authentication
    if (process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true') {
      // Import authService to get current user
      const { authService } = require('../../services/auth/AuthService');
      const currentUser = authService.getCurrentUser();
      if (currentUser?.id) {
        headers.set('X-User-Id', currentUser.id);
        console.log('🔑 Setting X-User-Id header:', currentUser.id);
      }
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
    // Try to refresh token
    const refreshResult = await baseQuery(
      {
        url: '/auth/refresh',
        method: 'POST',
        body: {
          refreshToken: (api.getState() as RootState).auth.refreshToken,
        },
      },
      api,
      extraOptions
    );
    
    if (refreshResult.data) {
      // Store the new token
      api.dispatch({
        type: 'auth/setTokens',
        payload: refreshResult.data,
      });
      
      // Retry the original query
      result = await baseQuery(args, api, extraOptions);
    } else {
      // Refresh failed, logout user
      api.dispatch({ type: 'auth/logout' });
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
    }>({
      query: ({ filters = {}, pagination = { page: 1, limit: 20 } }) => ({
        url: '/events',
        params: {
          ...filters,
          ...pagination,
          // Convert Date objects to ISO strings if present
          startDate: filters.startDate?.toISOString(),
          endDate: filters.endDate?.toISOString(),
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
