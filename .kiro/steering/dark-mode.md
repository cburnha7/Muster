---
inclusion: auto
---

# Dark Mode Rule

Every component must call `useTheme()` at the top of its render function
and use only the returned `colors` object for all color values.

No hardcoded hex values, no `'white'`, no `'black'`, no static color strings
anywhere in `src/` except inside `tokens.ts` and `colors.ts`.

`StyleSheet.create()` must never contain color values — only layout properties
(flex, padding, margin, borderRadius, gap, etc.). All color-bearing styles
must be applied inline using the `colors` object from `useTheme()`.

Plain helper functions (not components or hooks) that need colors must either:

1. Accept colors as a parameter, or
2. Import the static `colors` object from `src/theme` (light-mode only fallback)

The theme preference is controlled by `useTheme().setDarkMode(boolean)` and
persisted via AsyncStorage. The Settings → Preferences → Dark Mode toggle
writes to this. System preference is used as the default on first launch.

Any component that does not follow this rule will break in dark mode.
