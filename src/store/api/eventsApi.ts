import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from './createAuthenticatedApi';
import {
  Event,
  EventFilters,
  PaginatedResponse,
  PaginationParams,
  Booking,
  EventStatus,
} from '../../types';

// Default filter configuration used by both Home Screen and Events Tab
export const DEFAULT_EVENT_FILTERS: EventFilters = {
  status: EventStatus.ACTIVE,
  // Location-based sorting will be handled by backend based on user location
};

// Create RTK Query API for events
export const eventsApi = createApi({
  reducerPath: 'eventsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['Events', 'Bookings'],
  endpoints: builder => ({
    // Get events with filters and pagination
    getEvents: builder.query<
      PaginatedResponse<Event>,
      {
        filters?: EventFilters;
        pagination?: PaginationParams;
        userId?: string;
      }
    >({
      query: ({
        filters = {},
        pagination = { page: 1, limit: 20 },
        userId,
      }) => ({
        url: '/events',
        params: {
          ...filters,
          ...pagination,
          // Convert Date objects to ISO strings if present
          startDate: filters.startDate?.toISOString(),
          endDate: filters.endDate?.toISOString(),
          ...(userId ? { userId } : {}),
          // Strip the nested location object — pass as flat params
          location: undefined,
        },
      }),
      providesTags: result =>
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
            console.log(
              '[RTK Query] getEvents succeeded:',
              data.data.length,
              'events'
            );
          } catch (error) {
            console.error('[RTK Query] getEvents failed:', error);
          }
        }
      },
    }),

    // Get user bookings
    getUserBookings: builder.query<
      PaginatedResponse<Booking>,
      {
        status?: 'upcoming' | 'past' | 'all';
        pagination?: PaginationParams;
        includeFamily?: boolean;
      }
    >({
      query: ({
        status = 'upcoming',
        pagination = { page: 1, limit: 100 },
        includeFamily,
      }) => ({
        url: '/users/bookings',
        params: {
          status,
          ...pagination,
          ...(includeFamily ? { includeFamily: 'true' } : {}),
        },
      }),
      providesTags: result =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: 'Bookings' as const,
                id,
              })),
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
            console.log(
              '[RTK Query] getUserBookings succeeded:',
              data.data.length,
              'bookings'
            );
          } catch (error) {
            console.error('[RTK Query] getUserBookings failed:', error);
          }
        }
      },
    }),

    // Book an event
    bookEvent: builder.mutation<
      Booking,
      { eventId: string; userId: string; teamId?: string }
    >({
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
    cancelBooking: builder.mutation<
      void,
      { eventId: string; bookingId: string }
    >({
      query: ({ eventId, bookingId }) => ({
        url: `/events/${eventId}/book/${bookingId}`,
        method: 'DELETE',
      }),
      // Invalidate both Events and Bookings to trigger refetch
      invalidatesTags: (_result, _error, { eventId }) => {
        return [
          { type: 'Events', id: eventId },
          { type: 'Events', id: 'LIST' },
          { type: 'Bookings', id: 'LIST' },
        ];
      },
      // Add logging in development
      onQueryStarted: async (arg, { queryFulfilled }) => {
        try {
          await queryFulfilled;
        } catch (error) {
          console.error('[RTK Query] cancelBooking failed:', error);
        }
      },
    }),

    // Search events with location, sport filters, and proximity
    searchEvents: builder.query<
      PaginatedResponse<Event>,
      {
        sportTypes?: string[];
        latitude?: number;
        longitude?: number;
        radiusMiles?: number;
        locationQuery?: string;
        status?: string;
        userId?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: params => ({
        url: '/events',
        params: {
          ...(params.sportTypes && params.sportTypes.length > 0
            ? { sportTypes: params.sportTypes.join(',') }
            : {}),
          ...(params.latitude != null ? { latitude: params.latitude } : {}),
          ...(params.longitude != null ? { longitude: params.longitude } : {}),
          ...(params.radiusMiles != null
            ? { radiusMiles: params.radiusMiles }
            : {}),
          ...(params.locationQuery
            ? { locationQuery: params.locationQuery }
            : {}),
          status: params.status || 'active',
          ...(params.userId ? { userId: params.userId } : {}),
          page: params.page || 1,
          limit: params.limit || 50,
        },
      }),
      providesTags: [{ type: 'Events', id: 'SEARCH' }],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetEventsQuery,
  useGetUserBookingsQuery,
  useBookEventMutation,
  useCancelBookingMutation,
  useLazySearchEventsQuery,
} = eventsApi;
