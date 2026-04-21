import { createApi } from '@reduxjs/toolkit/query/react';
import { createAuthenticatedBaseQuery } from './createAuthenticatedApi';

export const insuranceDocumentsApi = createApi({
  reducerPath: 'insuranceDocumentsApi',
  baseQuery: createAuthenticatedBaseQuery(),
  tagTypes: ['InsuranceDocuments', 'PendingReservations', 'EscrowTransactions'],
  endpoints: builder => ({
    // Get insurance documents for a user
    getInsuranceDocuments: builder.query<
      any[],
      { userId: string; status?: string }
    >({
      query: ({ userId, status }) => ({
        url: '/insurance-documents',
        params: { userId, ...(status ? { status } : {}) },
      }),
      providesTags: result =>
        result
          ? [
              ...result.map(({ id }: any) => ({
                type: 'InsuranceDocuments' as const,
                id,
              })),
              { type: 'InsuranceDocuments', id: 'LIST' },
            ]
          : [{ type: 'InsuranceDocuments', id: 'LIST' }],
    }),

    // Upload a new insurance document
    uploadInsuranceDocument: builder.mutation<any, FormData>({
      query: formData => ({
        url: '/insurance-documents',
        method: 'POST',
        body: formData,
        // Let the browser set the correct multipart content-type with boundary
        formData: true,
      }),
      invalidatesTags: [{ type: 'InsuranceDocuments', id: 'LIST' }],
    }),

    // Delete an insurance document
    deleteInsuranceDocument: builder.mutation<{ message: string }, string>({
      query: id => ({
        url: `/insurance-documents/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'InsuranceDocuments', id },
        { type: 'InsuranceDocuments', id: 'LIST' },
      ],
    }),

    // Get pending reservations for a ground owner
    getPendingReservations: builder.query<any[], { ownerId: string }>({
      query: ({ ownerId }) => ({
        url: '/reservation-approvals',
        params: { ownerId },
      }),
      providesTags: result =>
        result
          ? [
              ...result.map(({ id }: any) => ({
                type: 'PendingReservations' as const,
                id,
              })),
              { type: 'PendingReservations', id: 'LIST' },
            ]
          : [{ type: 'PendingReservations', id: 'LIST' }],
    }),

    // Approve a pending reservation
    approveReservation: builder.mutation<any, { rentalId: string }>({
      query: ({ rentalId }) => ({
        url: `/reservation-approvals/${rentalId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'PendingReservations', id: 'LIST' }],
    }),

    // Deny a pending reservation
    denyReservation: builder.mutation<any, { rentalId: string }>({
      query: ({ rentalId }) => ({
        url: `/reservation-approvals/${rentalId}/deny`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'PendingReservations', id: 'LIST' }],
    }),

    // Get escrow transactions for a rental
    getEscrowTransactions: builder.query<any[], { rentalId: string }>({
      query: ({ rentalId }) => ({
        url: '/escrow-transactions',
        params: { rentalId },
      }),
      providesTags: (_result, _error, { rentalId }) => [
        { type: 'EscrowTransactions', id: rentalId },
      ],
    }),
  }),
});

export const {
  useGetInsuranceDocumentsQuery,
  useUploadInsuranceDocumentMutation,
  useDeleteInsuranceDocumentMutation,
  useGetPendingReservationsQuery,
  useApproveReservationMutation,
  useDenyReservationMutation,
  useGetEscrowTransactionsQuery,
} = insuranceDocumentsApi;
