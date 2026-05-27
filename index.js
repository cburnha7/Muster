import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN } from './src/services/api/config';
import { registerRootComponent } from 'expo';
import App from './App';

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

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Sentry.wrap(App));
