/**
 * Custom hook for loading Muster brand fonts.
 * Includes a 3-second timeout fallback so the app never hangs on startup.
 * Calls SplashScreen.hideAsync() as a safety net in all exit paths.
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import {
  Fraunces_700Bold,
  Fraunces_700Bold_Italic,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';

const fontAssets = {
  Fraunces_700Bold,
  Fraunces_700Bold_Italic,
  Fraunces_900Black,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
};

const FONT_TIMEOUT_MS = 3000;

function hideSplash() {
  if (Platform.OS !== 'web') {
    SplashScreen.hideAsync().catch(() => {});
  }
}

export function useFonts() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let resolved = false;

    const resolve = () => {
      if (!resolved) {
        resolved = true;
        setFontsLoaded(true);
        hideSplash();
      }
    };

    // Timeout fallback — proceed after 3s no matter what
    const timer = setTimeout(() => {
      if (!resolved) {
        console.warn(
          'Font loading timed out after 3s — proceeding with system fonts'
        );
        resolve();
      }
    }, FONT_TIMEOUT_MS);

    async function loadFonts() {
      try {
        await Font.loadAsync(fontAssets);
        console.log('Fonts loaded successfully');
      } catch (err) {
        console.error('Error loading fonts:', err);
        setError(err as Error);
      } finally {
        resolve();
      }
    }

    loadFonts();

    return () => clearTimeout(timer);
  }, []);

  return { fontsLoaded, error };
}
