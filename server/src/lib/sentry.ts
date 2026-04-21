import * as Sentry from '@sentry/node';

const DSN = process.env.SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Don't send PII
    sendDefaultPii: false,
  });
  console.log('Sentry initialized');
} else {
  console.warn('SENTRY_DSN not set — error tracking disabled');
}

export { Sentry };
export const sentryEnabled = !!DSN;
