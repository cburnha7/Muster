import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { useTheme } from '../../theme';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (
    error: Error,
    errorInfo: ErrorInfo,
    resetError: () => void
  ) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Default error fallback UI — tries the theme first for dark-mode support,
 * falls back to hardcoded light-mode colors if ThemeProvider is unreachable
 * (e.g. the error originated inside the provider itself).
 */
function DefaultErrorFallback({
  error,
  errorInfo,
  onReset,
}: {
  error: Error;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}) {
  // Try the theme; degrade gracefully if ThemeProvider is unreachable.
  let themeColors: {
    background: string;
    ink: string;
    inkSecondary: string;
    inkMuted: string;
    error: string;
    errorLight: string;
    cobalt: string;
    white: string;
  };
  try {
    const theme = useTheme();
    themeColors = {
      background: theme.colors.bgScreen,
      ink: theme.colors.ink,
      inkSecondary: theme.colors.inkSecondary,
      inkMuted: theme.colors.inkMuted,
      error: theme.colors.error,
      errorLight: theme.colors.errorLight,
      cobalt: theme.colors.cobalt,
      white: '#FFFFFF',
    };
  } catch {
    // Hardcoded light-mode fallback — uses documented brand colors
    themeColors = {
      background: '#F7F4EF',
      ink: '#1C2320',
      inkSecondary: '#6B7C76',
      inkMuted: '#94A3B8',
      error: '#D0362A',
      errorLight: '#FDECEA',
      cobalt: '#2040E0',
      white: '#FFFFFF',
    };
  }

  const isDev = __DEV__;

  return (
    <View
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <View style={styles.content}>
        <Ionicons name="alert-circle" size={64} color={themeColors.error} />
        <Text style={[styles.title, { color: themeColors.ink }]}>
          Oops! Something went wrong
        </Text>
        <Text style={[styles.message, { color: themeColors.inkSecondary }]}>
          We're sorry for the inconvenience. The app encountered an unexpected
          error.
        </Text>

        {isDev && (
          <ScrollView
            style={[
              styles.errorDetails,
              { backgroundColor: themeColors.errorLight },
            ]}
          >
            <Text style={[styles.errorTitle, { color: themeColors.error }]}>
              Error:
            </Text>
            <Text style={[styles.errorText, { color: themeColors.error }]}>
              {error.toString()}
            </Text>
            {errorInfo && (
              <>
                <Text style={[styles.errorTitle, { color: themeColors.error }]}>
                  Component Stack:
                </Text>
                <Text style={[styles.errorText, { color: themeColors.error }]}>
                  {errorInfo.componentStack}
                </Text>
              </>
            )}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors.cobalt }]}
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="Try Again"
        >
          <Text style={[styles.buttonText, { color: themeColors.white }]}>
            Try Again
          </Text>
        </TouchableOpacity>

        <Text style={[styles.helpText, { color: themeColors.inkMuted }]}>
          If the problem persists, please restart the app or contact support.
        </Text>
      </View>
    </View>
  );
}

/**
 * Error Boundary component to catch and handle React component errors.
 * Prevents the entire app from crashing when a component error occurs.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error Boundary caught an error:', error, errorInfo);
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo!,
          this.resetError
        );
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorDetails: {
    width: '100%',
    maxHeight: 200,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
