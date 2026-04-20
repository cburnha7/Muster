import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store';
import { apiConfig } from '../../services/api/config';
import { clearAuth, setTokens } from '../slices/authSlice';
import TokenStorage from '../../services/auth/TokenStorage';
import { CancelRequestData } from '../../components/home/CancelRequestCard';

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

export const cancelRequestsApi = createApi({
  reducerPath: 'cancelRequestsApi',
  baseQuery: baseQueryWithReauth,
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
