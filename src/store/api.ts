import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from './api/createAuthenticatedApi';
import { SchedulePreviewEvent, ConfirmableEvent } from '../types/scheduling';

// Create RTK Query API — uses shared authenticated base query
export const api = createApi({
  reducerPath: 'api',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['User', 'Event', 'Facility', 'Team', 'Booking', 'League'],
  endpoints: builder => ({
    // Authentication endpoints
    login: builder.mutation({
      query: credentials => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    register: builder.mutation({
      query: userData => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),

    refreshToken: builder.mutation({
      query: refreshToken => ({
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
      query: updates => ({
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
      query: id => `/events/${id}`,
      providesTags: (result, error, id) => [{ type: 'Event', id }],
    }),

    createEvent: builder.mutation({
      query: eventData => ({
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
      query: id => ({
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
      query: id => `/facilities/${id}`,
      providesTags: (result, error, id) => [{ type: 'Facility', id }],
    }),

    createFacility: builder.mutation({
      query: facilityData => ({
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
      query: id => ({
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
      query: id => `/teams/${id}`,
      providesTags: (result, error, id) => [{ type: 'Team', id }],
    }),

    createTeam: builder.mutation({
      query: teamData => ({
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
      query: id => ({
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
      query: teamId => ({
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
      query: bookingId => ({
        url: `/bookings/${bookingId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Booking', 'Event'],
    }),

    // League scheduling endpoints
    generateSchedule: builder.mutation<
      { events: SchedulePreviewEvent[] },
      { leagueId: string }
    >({
      query: ({ leagueId }) => ({
        url: `/leagues/${leagueId}/generate-schedule`,
        method: 'POST',
      }),
    }),

    confirmSchedule: builder.mutation<
      { eventsCreated: number },
      { leagueId: string; events: ConfirmableEvent[] }
    >({
      query: ({ leagueId, events }) => ({
        url: `/leagues/${leagueId}/confirm-schedule`,
        method: 'POST',
        body: { events },
      }),
      invalidatesTags: ['Event', 'League'],
    }),

    // Promo code endpoints
    validatePromoCode: builder.mutation<
      { valid: boolean; trialDurationDays?: number; error?: string },
      { code: string }
    >({
      query: body => ({
        url: '/promo-codes/validate',
        method: 'POST',
        body,
      }),
    }),

    redeemPromoCode: builder.mutation<
      any,
      { code: string; selectedTier: string }
    >({
      query: body => ({
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

  // League scheduling hooks
  useGenerateScheduleMutation,
  useConfirmScheduleMutation,
} = api;
