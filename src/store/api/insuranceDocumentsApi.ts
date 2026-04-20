import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store';
import { apiConfig } from '../../services/api/config';
import { clearAuth, setTokens } from '../slices/authSlice';
import TokenStorage from '../../services/auth/TokenStorage';

// Define base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: apiConfig.baseURL,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;

    const token = state.auth.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    const userId = state.auth.user?.id;

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

  if (result.error && result.error.status === 401) {
    const failedToken = (api.getState() as RootState).auth.accessToken;

    // Check if token was already refreshed by login or another interceptor
    const currentToken = (api.getState() as RootState).auth.accessToken;
    if (currentToken && currentToken !== failedToken) {
      return await baseQuery(args, api, extraOptions);
    }

    let refreshToken = (api.getState() as RootState).auth.refreshToken;
    if (!refreshToken) {
      refreshToken = await TokenStorage.getRefreshToken();
    }

    if (!refreshToken) {
      const latestToken = (api.getState() as RootState).auth.accessToken;
      if (!latestToken || latestToken === failedToken) {
        await TokenStorage.clearAll();
        api.dispatch(clearAuth());
      }
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
      const tokenData = refreshResult.data as {
        accessToken: string;
        refreshToken: string;
      };
      await TokenStorage.storeTokens(
        tokenData.accessToken,
        tokenData.refreshToken
      );
      api.dispatch(
        setTokens({
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
        })
      );
      result = await baseQuery(args, api, extraOptions);
    } else {
      const latestToken = (api.getState() as RootState).auth.accessToken;
      if (!latestToken || latestToken === failedToken) {
        await TokenStorage.clearAll();
        api.dispatch(clearAuth());
      }
    }
  }

  return result;
};

export const insuranceDocumentsApi = createApi({
  reducerPath: 'insuranceDocumentsApi',
  baseQuery: baseQueryWithReauth,
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
