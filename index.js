import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from './src/services/api/config';
import { registerRootComponent } from 'expo';
import App from './App';

try {
  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
    beforeSend(event) {
      const msg = event.exception?.values?.[0]?.value ?? '';
      if (msg.includes('Network request failed')) return null;
      if (msg.includes('AbortError')) return null;
      return event;
    },
  });
} catch (e) {
  console.warn('Sentry initialization failed:', e);
}

// ── Global JS error handler — last line of defense ──
// Catches: uncaught errors thrown from module-eval, constructors, async effects,
// setTimeout/setInterval callbacks, native module callbacks, and any code path
// that ErrorBoundary cannot reach. Related: incident 2B176A02.
try {
  const defaultHandler =
    typeof ErrorUtils !== 'undefined' && ErrorUtils.getGlobalHandler
      ? ErrorUtils.getGlobalHandler()
      : null;

  if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      try {
        Sentry.captureException(error, {
          tags: {
            surface: 'globalHandler',
            isFatal: String(Boolean(isFatal)),
          },
        });
      } catch (e) {
        console.error('Sentry capture failed in global handler:', e);
      }

      // In DEV, let RN show the red-box so we can actually debug.
      // In production, swallow non-fatal errors and let the JS thread keep
      // running. Fatal errors will still terminate; that is RN's contract.
      if (__DEV__ && defaultHandler) {
        defaultHandler(error, isFatal);
      }
    });
  }
} catch (e) {
  console.warn('Global error handler installation failed:', e);
}

// ── Unhandled promise rejection tracker ──
// React Native disables this by default in release. Re-enable so unhandled
// rejections route through Sentry instead of being silently swallowed.
try {
  const tracking = require('promise/setimmediate/rejection-tracking');
  tracking.enable({
    allRejections: true,
    onUnhandled: (id, error) => {
      try {
        Sentry.captureException(error, {
          tags: {
            surface: 'unhandledRejection',
            rejectionId: String(id),
          },
        });
      } catch {}
    },
    onHandled: () => {},
  });
} catch (e) {
  console.warn('Promise rejection tracking install failed:', e);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Sentry.wrap(App));
