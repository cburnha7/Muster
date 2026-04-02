/**
 * Custom hook for loading Muster brand fonts.
 * Includes a 3-second timeout fallback so the app never hangs on startup.
 * Calls SplashScreen.hideAsync() as a safety net in all exit paths.
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Build the font asset map at load time.
let fontAssets: Record<string, any> = {};
try {
  const jakarta = require('@expo-google-fonts/plus-jakarta-sans');
  const inter = require('@expo-google-fonts/inter');
  fontAssets = {
    PlusJakartaSans_400Regular: jakarta.PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium: jakarta.PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold: jakarta.PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold: jakarta.PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold: jakarta.PlusJakartaSans_800ExtraBold,
    Inter_400Regular: inter.Inter_400Regular,
    Inter_500Medium: inter.Inter_500Medium,
    Inter_600SemiBold: inter.Inter_600SemiBold,
    Inter_700Bold: inter.Inter_700Bold,
  };
} catch (e) {
  console.warn(
    'Font packages failed to load — will use system fonts:',
    (e as Error).message
  );
}

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
        if (Object.keys(fontAssets).length === 0) {
          console.warn('No font assets available — using system fonts');
          resolve();
          return;
        }
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
