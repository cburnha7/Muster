# Web Bundling Issue - React Native 0.72 Compatibility

## Issue
The app fails to bundle for web with the error:
```
Unable to resolve "../Utilities/Platform" from "node_modules\react-native\Libraries\ReactPrivate\ReactNativePrivateInterface.js"
```

## Root Cause
React Native 0.72.10 has internal modules that use relative paths (`../Utilities/Platform`) which don't resolve properly with webpack when bundling for web. This is a known compatibility issue between React Native 0.72 and react-native-web.

## What We've Tried

### 1. Removed Lazy Loading ✅
- Removed `lazyLoadScreen` from all stack navigators
- Removed lazy loading from `RootNavigator.tsx` and `TabNavigator.tsx`
- This fixed the "Requiring unknown module" errors but revealed the underlying Platform resolution issue

### 2. Webpack Alias Configuration ❌
Attempted to add webpack aliases in `webpack.config.js`:
```javascript
config.resolve.alias = {
  'react-native$': 'react-native-web',
  '../Utilities/Platform': 'react-native-web/dist/exports/Platform',
};
```
Result: Did not resolve the issue

### 3. Webpack NormalModuleReplacementPlugin ❌
Attempted to use webpack plugin to replace the module:
```javascript
new NormalModuleReplacementPlugin(
  /^\.\.\/Utilities\/Platform$/,
  'react-native-web/dist/exports/Platform'
)
```
Result: Did not resolve the issue

### 4. Custom Webpack Resolver Plugin ❌
Attempted to create a custom resolver plugin to intercept and redirect the import.
Result: Did not resolve the issue

### 5. Babel Module Resolver ❌
Added `babel-plugin-module-resolver` to `babel.config.js`:
```javascript
[
  'module-resolver',
  {
    alias: {
      '../Utilities/Platform': 'react-native-web/dist/exports/Platform',
    },
  },
]
```
Result: Did not resolve the issue (webpack resolves before babel transforms)

## Current Status
- Mobile app works perfectly (iOS/Android via Expo Go)
- Web bundling fails at ~83% completion
- All lazy loading has been removed from navigation
- Mock data is integrated
- Onboarding and auth are skipped for development

## Solutions

### Option 1: Patch React Native (Recommended for Quick Fix)
Create a patch file for `react-native` to fix the internal import:

1. Install patch-package:
```bash
npm install --save-dev patch-package postinstall-postinstall
```

2. Manually edit `node_modules/react-native/Libraries/ReactPrivate/ReactNativePrivateInterface.js`
   - Change: `import Platform from '../Utilities/Platform';`
   - To: `import Platform from 'react-native/Libraries/Utilities/Platform';`

3. Create patch:
```bash
npx patch-package react-native
```

4. Add to package.json scripts:
```json
"postinstall": "patch-package"
```

### Option 2: Upgrade Expo/React Native (Recommended for Long-term)
Upgrade to Expo SDK 50+ which has better web compatibility:

```bash
npx expo install expo@latest
npx expo install --fix
```

This will upgrade:
- Expo SDK 49 → 50+
- React Native 0.72 → 0.73+
- Better react-native-web integration

### Option 3: Use Expo Web Build (Alternative)
Instead of running dev server, build for production:

```bash
npx expo export:web
npx serve web-build
```

Production builds sometimes handle module resolution differently.

### Option 4: Downgrade React Native Web (Not Recommended)
Try an older version of react-native-web that might have better compatibility:

```bash
npm install react-native-web@0.18.12
```

## Recommendation

For immediate development, use **Option 1 (Patch)** to quickly fix the issue.

For production and long-term maintenance, plan to upgrade to **Option 2 (Expo SDK 50+)** which has resolved many web compatibility issues.

## Files Modified During Troubleshooting
- `webpack.config.js` - Added various resolution attempts
- `babel.config.js` - Added module-resolver plugin
- `src/navigation/stacks/*.tsx` - Removed all lazy loading
- `src/navigation/RootNavigator.tsx` - Removed lazy loading
- `src/navigation/TabNavigator.tsx` - Removed lazy loading

## Next Steps

1. Choose a solution approach (recommend Option 1 for quick fix)
2. Test web bundling after applying fix
3. Verify app loads in browser
4. Plan upgrade to Expo SDK 50+ for long-term solution

## References
- [React Native Web Compatibility Issues](https://github.com/necolas/react-native-web/issues)
- [Expo Web Support](https://docs.expo.dev/workflow/web/)
- [patch-package Documentation](https://github.com/ds300/patch-package)

Date: March 9, 2026
