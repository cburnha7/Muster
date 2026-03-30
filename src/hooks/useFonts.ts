/**
 * Custom hook for loading Muster brand fonts
 * Plus Jakarta Sans — Headlines & display
 * Inter — Body & UI text
 *
 * Font assets are loaded here (not in typography.ts) to isolate the
 * @expo-google-fonts ESM/CJS interop issue from the rest of the theme.
 */

import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

// Build the font asset map at load time. If the packages fail to import
// (ESM/CJS mismatch on web), we gracefully fall back to system fonts.
let fontAssets: Record<string, any> = {};
try {
  // Use require() so Metro doesn't hoist these into static imports
  // that would crash the entire module graph on web.
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
  console.warn('Font packages failed to load — will use system fonts:', (e as Error).message);
}

export function useFonts() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        if (Object.keys(fontAssets).length === 0) {
          console.warn('No font assets available — using system fonts');
          setFontsLoaded(true);
          return;
        }
        await Font.loadAsync(fontAssets);
        setFontsLoaded(true);
      } catch (err) {
        console.error('Error loading fonts:', err);
        setError(err as Error);
        // Still set fonts as loaded to prevent blocking the app
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  return { fontsLoaded, error };
}
