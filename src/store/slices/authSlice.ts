/**
 * Auth Slice
 * 
 * Redux store for authentication state management.
 * Requirements: 1.17, 6.7, 8.11, 8.12, 10.6, 33.3
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../services/api/AuthService';
import SSOService from '../../services/auth/SSOService';
import TokenStorage from '../../services/auth/TokenStorage';
import {
  User,
  RegisterData,
  SSORegisterData,
  LoginCredentials,
  AuthResponse,
  TokenResponse,
  OnboardingData,
} from '../../types/auth';
import { UserService } from '../../services/api/UserService';

// Auth state interface
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Initial state
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunks

/**
 * Register user with email and password
 * Requirement 1.17: Manual registration
 */
export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.register(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

/**
 * Register user with SSO
 * Requirement 1.17: SSO registration
 */
export const registerWithSSO = createAsyncThunk(
  'auth/registerSSO',
  async (data: SSORegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.registerWithSSO(data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'SSO registration failed');
    }
  }
);

/**
 * Login user with email/username and password
 * Requirement 6.7: Manual login
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(
        credentials.emailOrUsername,
        credentials.password,
        credentials.rememberMe
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

/**
 * Login user with SSO
 * Requirement 6.7: SSO login
 */
export const loginWithSSO = createAsyncThunk(
  'auth/loginSSO',
  async (
    { provider }: { provider: 'apple' | 'google' },
    { rejectWithValue }
  ) => {
    try {
      // Get SSO user data from provider
      let ssoData;
      if (provider === 'apple') {
        ssoData = await SSOService.signInWithApple();
      } else {
        ssoData = await SSOService.signInWithGoogle();
      }

      // Login with SSO
      const response = await authService.loginWithSSO(
        ssoData.provider,
        ssoData.providerToken,
        ssoData.providerId
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'SSO login failed');
    }
  }
);

/**
 * Link SSO account to existing account
 * Requirement 6.7: Account linking
 */
export const linkAccount = createAsyncThunk(
  'auth/linkAccount',
  async (
    {
      email,
      password,
      provider,
      token,
      userId,
    }: {
      email: string;
      password: string;
      provider: string;
      token: string;
      userId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.linkAccount(
        email,
        password,
        provider,
        token,
        userId
      );
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Account linking failed');
    }
  }
);

/**
 * Logout user
 * Requirement 10.6: User logout
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

/**
 * Refresh access token
 * Requirement 8.11: Token refresh
 */
export const refreshAccessToken = createAsyncThunk(
  'auth/refreshToken',
  async (refreshToken: string, { rejectWithValue }) => {
    try {
      const response = await authService.refreshToken(refreshToken);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Token refresh failed');
    }
  }
);

/**
 * Request password reset
 * Requirement 33.3: Password reset request
 */
export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email: string, { rejectWithValue }) => {
    try {
      await authService.requestPasswordReset(email);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Password reset request failed');
    }
  }
);

/**
 * Reset password
 * Requirement 33.3: Password reset completion
 */
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (
    { token, newPassword }: { token: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      await authService.resetPassword(token, newPassword);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Password reset failed');
    }
  }
);

/**
 * Load cached user data on app start
 * Requirement 8.12: Cache user data
 */
export const loadCachedUser = createAsyncThunk(
  'auth/loadCachedUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getStoredUser();
      const accessToken = await authService.getStoredToken();
      const refreshToken = await TokenStorage.getRefreshToken();
      
      if (user && accessToken) {
        return { user, accessToken, refreshToken };
      }
      
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load cached user');
    }
  }
);

/**
 * Complete onboarding flow
 */
export const completeOnboarding = createAsyncThunk(
  'auth/completeOnboarding',
  async (data: OnboardingData, { rejectWithValue }) => {
    try {
      const userService = new UserService();
      const response = await userService.completeOnboarding(data);
      const updatedUser = response.user;
      // Persist updated user to TokenStorage so it survives page reloads
      await TokenStorage.storeUser(updatedUser);
      return updatedUser;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to complete onboarding');
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set user
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },

    // Set tokens
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken?: string }>) => {
      state.accessToken = action.payload.accessToken;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      state.isAuthenticated = true;
    },

    // Clear auth state
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    // Set error state
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Register user
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Register with SSO
    builder
      .addCase(registerWithSSO.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerWithSSO.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerWithSSO.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Login user
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Login with SSO
    builder
      .addCase(loginWithSSO.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithSSO.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(loginWithSSO.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Link account
    builder
      .addCase(linkAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(linkAccount.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(linkAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout user
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        // Clear state even if logout fails
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Refresh token
    builder
      .addCase(refreshAccessToken.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action: PayloadAction<TokenResponse>) => {
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isLoading = false;
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        // Clear auth state on refresh failure
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Request password reset
    builder
      .addCase(requestPasswordReset.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Reset password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Load cached user
    builder
      .addCase(loadCachedUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadCachedUser.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken || null;
          state.isAuthenticated = true;
        }
        state.isLoading = false;
      })
      .addCase(loadCachedUser.rejected, (state) => {
        state.isLoading = false;
      });

    // Complete onboarding
    builder
      .addCase(completeOnboarding.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeOnboarding.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(completeOnboarding.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  setUser,
  setTokens,
  clearAuth,
  setLoading,
  setError,
  clearError,
} = authSlice.actions;

// Export reducer
export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken;
export const selectRefreshToken = (state: { auth: AuthState }) => state.auth.refreshToken;