import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from './createAuthenticatedApi';
import { CancelRequestData } from '../../components/home/CancelRequestCard';

export const cancelRequestsApi = createApi({
  reducerPath: 'cancelRequestsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['CancelRequests'],
  endpoints: builder => ({
    getPendingCancelRequests: builder.query<CancelRequestData[], string>({
      query: userId => ({
        url: '/cancel-requests/pending',
        params: { userId },
      }),
      providesTags: [{ type: 'CancelRequests', id: 'PENDING' }],
    }),

    approveCancelRequest: builder.mutation<
      { id: string; status: string; resolvedAt: string },
      { id: string; userId: string }
    >({
      query: ({ id, userId }) => ({
        url: `/cancel-requests/${id}/approve`,
        method: 'POST',
        params: { userId },
      }),
      invalidatesTags: [{ type: 'CancelRequests', id: 'PENDING' }],
    }),

    denyCancelRequest: builder.mutation<
      { id: string; status: string; resolvedAt: string },
      { id: string; userId: string }
    >({
      query: ({ id, userId }) => ({
        url: `/cancel-requests/${id}/deny`,
        method: 'POST',
        params: { userId },
      }),
      invalidatesTags: [{ type: 'CancelRequests', id: 'PENDING' }],
    }),
  }),
});

export const {
  useGetPendingCancelRequestsQuery,
  useApproveCancelRequestMutation,
  useDenyCancelRequestMutation,
} = cancelRequestsApi;
