# Web Support Quick Reference

**Quick reference for developing cross-platform features**

## Commands

```bash
npm run web          # Start web dev server
npm run build:web    # Build for production
npm run serve:web    # Test production build
npm run test:web     # Run web tests
```

## Platform Detection

```typescript
import { isWeb, isMobile, isIOS, isAndroid } from '@/utils/platform';

if (isWeb) {
  // Web-specific code
}

if (isMobile) {
  // Mobile-specific code (iOS + Android)
}
```

## Platform-Specific Values

```typescript
import { platformSelect } from '@/utils/platform';

const value = platformSelect({
  web: 'web-value',
  ios: 'ios-value',
  android: 'android-value',
  mobile: 'mobile-value',  // Both iOS and Android
  default: 'fallback-value',
});
```

## Responsive Values

```typescript
import { responsiveValue, getScreenSize } from '@/utils/platform';

// Get current screen size
const size = getScreenSize(); // 'mobile' | 'tablet' | 'desktop' | 'wide'

// Get responsive value
const columns = responsiveValue({
  mobile: 1,
  tablet: 2,
  desktop: 3,
  wide: 4,
  default: 2,
});
```

## Breakpoints

```typescript
import { Theme } from '@/theme';

const { breakpoints } = Theme;

// breakpoints.mobile = 0
// breakpoints.tablet = 768
// breakpoints.desktop = 1024
// breakpoints.wide = 1440
```

## Screen Size Checks

```typescript
import { 
  isMobileSize, 
  isTabletSize, 
  isDesktopSize 
} from '@/utils/platform';

if (isDesktopSize()) {
  // Show desktop layout
}
```

## Feature Detection

```typescript
import { supportsHover, supportsTouch } from '@/utils/platform';

if (supportsHover()) {
  // Add hover effects
}

if (supportsTouch()) {
  // Add touch-specific interactions
}
```

## Platform-Specific Files

Create platform-specific implementations:

```
Component.tsx         # Shared interface/logic
Component.native.tsx  # Mobile implementation
Component.web.tsx     # Web implementation
```

React Native will automatically use the correct file.

## Platform Styles

```typescript
import { platformStyles } from '@/utils/platform';

const styles = StyleSheet.create({
  button: {
    padding: 10,
    ...platformStyles.hover({
      backgroundColor: '#eee',
    }),
    ...platformStyles.web({
      cursor: 'pointer',
    }),
  },
});
```

## Browser Detection

```typescript
import { getBrowserType, isBrowser } from '@/utils/platform';

if (isBrowser()) {
  const browser = getBrowserType();
  // 'chrome' | 'firefox' | 'safari' | 'edge' | 'other'
}
```

## Common Patterns

### Conditional Rendering

```typescript
import { isWeb } from '@/utils/platform';

return (
  <View>
    {isWeb ? (
      <WebComponent />
    ) : (
      <MobileComponent />
    )}
  </View>
);
```

### Responsive Layout

```typescript
import { responsiveValue } from '@/utils/platform';

const numColumns = responsiveValue({
  mobile: 1,
  tablet: 2,
  desktop: 3,
});

return (
  <FlatList
    data={items}
    numColumns={numColumns}
    // ...
  />
);
```

### Platform-Specific Styles

```typescript
import { platformSelect } from '@/utils/platform';

const styles = StyleSheet.create({
  container: {
    padding: platformSelect({
      web: 20,
      mobile: 10,
    }),
  },
});
```

### Hover Effects

```typescript
import { supportsHover } from '@/utils/platform';
import { useState } from 'react';

const [isHovered, setIsHovered] = useState(false);

return (
  <Pressable
    onHoverIn={() => supportsHover() && setIsHovered(true)}
    onHoverOut={() => supportsHover() && setIsHovered(false)}
    style={[
      styles.button,
      isHovered && styles.buttonHovered,
    ]}
  >
    <Text>Button</Text>
  </Pressable>
);
```

## Web-Specific Features

### Input Types

```typescript
import { getWebInputType } from '@/utils/platform';

<TextInput
  keyboardType={getWebInputType('email')}
  // On web: type="email"
  // On mobile: keyboardType="email-address"
/>
```

### Container Max Width

```typescript
import { Theme } from '@/theme';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: Theme.containerWidths.desktop, // 960
    alignSelf: 'center',
  },
});
```

## Testing

### Test Platform-Specific Code

```typescript
// In tests
jest.mock('@/utils/platform', () => ({
  isWeb: true,
  isMobile: false,
  // ...
}));
```

### Test Responsive Behavior

```typescript
import { Dimensions } from 'react-native';

// Mock screen size
Dimensions.get = jest.fn().mockReturnValue({
  width: 1024, // Desktop size
  height: 768,
});
```

## Common Issues

### Issue: Component doesn't work on web
**Solution**: Check if it uses native-only features, create `.web.tsx` version

### Issue: Styles look different on web
**Solution**: Use `platformSelect` for platform-specific styles

### Issue: Touch events don't work on web
**Solution**: Use `Pressable` instead of `TouchableOpacity`

### Issue: Navigation doesn't work
**Solution**: Ensure React Navigation is properly configured

## Best Practices

1. ✅ Use `Pressable` instead of `TouchableOpacity` (works on all platforms)
2. ✅ Use `platformSelect` for platform-specific values
3. ✅ Use `responsiveValue` for screen-size-specific values
4. ✅ Test on both mobile and web during development
5. ✅ Add hover states for better web UX
6. ✅ Use semantic HTML on web when possible
7. ✅ Ensure keyboard navigation works on web

## Resources

- Full Guide: `docs/web-support-guide.md`
- Week 1 Plan: `docs/web-support-week1-plan.md`
- Platform Utils: `src/utils/platform.ts`
- Theme: `src/theme/index.ts`

---

**Keep this handy while developing!**
