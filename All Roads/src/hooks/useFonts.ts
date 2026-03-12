/**
 * Custom hook for loading Muster brand fonts
 * Fraunces (serif) - Display and headings
 * Nunito (sans-serif) - UI and body text
 */

import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import {
  Fraunces_200ExtraLight,
  Fraunces_200ExtraLight_Italic,
  Fraunces_300Light,
  Fraunces_300Light_Italic,
  Fraunces_700Bold,
  Fraunces_700Bold_Italic,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';

export function useFonts() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          // Fraunces (serif) - Display and headings
          Fraunces_200ExtraLight,
          Fraunces_200ExtraLight_Italic,
          Fraunces_300Light,
          Fraunces_300Light_Italic,
          Fraunces_700Bold,
          Fraunces_700Bold_Italic,
          Fraunces_900Black,
          
          // Nunito (sans-serif) - UI and body
          Nunito_400Regular,
          Nunito_600SemiBold,
          Nunito_700Bold,
          Nunito_800ExtraBold,
          Nunito_900Black,
        });
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
