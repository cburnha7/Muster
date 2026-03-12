import { useColorScheme as useRNColorScheme } from 'react-native';
import { lightColors, darkColors } from '../theme/colors';

/**
 * Hook to get the current color scheme and theme colors
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    colorScheme,
    isDark,
    colors: isDark ? darkColors : lightColors,
  };
}

/**
 * Hook to get theme-aware colors
 */
export function useThemeColors() {
  const { colors } = useColorScheme();
  return colors;
}
