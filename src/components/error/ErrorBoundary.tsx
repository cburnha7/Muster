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

/** Default error fallback UI — uses hardcoded colors to avoid dependency on ThemeProvider */
function DefaultErrorFallback({
  error,
  errorInfo,
  onReset,
}: {
  error: Error;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}) {
  // Use hardcoded light-mode colors so this works even if ThemeProvider is unavailable
  const colors = {
    background: '#F7F4EF',
    ink: '#1C2320',
    inkSecondary: '#6B7C76',
    inkMuted: '#94A3B8',
    error: '#D0362A',
    errorLight: '#FDECEA',
    cobalt: '#2040E0',
    white: '#FFFFFF',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Ionicons name="alert-circle" size={64} color={colors.error} />
        <Text style={[styles.title, { color: colors.ink }]}>
          Oops! Something went wrong
        </Text>
        <Text style={[styles.message, { color: colors.inkSecondary }]}>
          We're sorry for the inconvenience. The app encountered an unexpected
          error.
        </Text>

        <ScrollView
          style={[styles.errorDetails, { backgroundColor: colors.errorLight }]}
        >
          <Text style={[styles.errorTitle, { color: colors.error }]}>
            Error:
          </Text>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error.toString()}
          </Text>
          {errorInfo && (
            <>
              <Text style={[styles.errorTitle, { color: colors.error }]}>
                Component Stack:
              </Text>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errorInfo.componentStack}
              </Text>
            </>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.cobalt }]}
          onPress={onReset}
        >
          <Text style={[styles.buttonText, { color: colors.white }]}>
            Try Again
          </Text>
        </TouchableOpacity>

        <Text style={[styles.helpText, { color: colors.inkMuted }]}>
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
