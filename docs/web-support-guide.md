# Web Support Guide

**Sports Booking App - Web Version**

## Overview

The Sports Booking App now supports web browsers in addition to iOS and Android. This guide covers how to run, build, and deploy the web version, as well as platform-specific considerations.

## Quick Start

### Running the Web Version

```bash
# Start the development server for web
npm run web

# Or using Expo CLI directly
expo start --web
```

The app will open in your default browser at `http://localhost:19006`

### Building for Production

```bash
# Build static web files
npm run build:web

# Serve the built files locally for testing
npm run serve:web
```

The built files will be in the `web-build/` directory, ready for deployment to any static hosting service.

## Platform Detection

The app uses platform detection utilities to provide platform-specific functionality:

```typescript
import { isWeb, isMobile, platformSelect, responsiveValue } from '@/utils/platform';

// Check platform
if (isWeb) {
  // Web-specific code
}

// Platform-specific values
const padding = platformSelect({
  web: 20,
  mobile: 10,
  default: 15,
});

// Responsive values based on screen size
const columns = responsiveValue({
  mobile: 1,
  tablet: 2,
  desktop: 3,
  wide: 4,
});
```

## Responsive Design

### Breakpoints

The app uses the following breakpoints:

- **Mobile**: 0px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px - 1439px
- **Wide**: 1440px+

### Using Breakpoints

```typescript
import { Theme } from '@/theme';

// Access breakpoints
const { breakpoints, mediaQueries, containerWidths } = Theme;

// Use in styles
const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: containerWidths.desktop,
    // On web, you can use media queries in CSS-in-JS
  },
});
```

### Responsive Utilities

```typescript
import { 
  getScreenSize, 
  isMobileSize, 
  isTabletSize, 
  isDesktopSize 
} from '@/utils/platform';

// Get current screen size
const screenSize = getScreenSize(); // 'mobile' | 'tablet' | 'desktop' | 'wide'

// Check specific sizes
if (isDesktopSize()) {
  // Show desktop layout
}
```

## Platform-Specific Features

### Features That Work Everywhere

✅ Authentication
✅ Navigation
✅ State Management (Redux)
✅ API Calls (Axios)
✅ Forms and Validation
✅ Search and Filtering
✅ Event Management
✅ Booking System
✅ Team Management
✅ Profile Management

### Features with Platform-Specific Implementations

#### Maps (Week 2)
- **Mobile**: React Native Maps
- **Web**: Google Maps JavaScript API or react-map-gl

#### Image Upload (Week 2)
- **Mobile**: Expo Image Picker (camera + gallery)
- **Web**: HTML file input

#### Storage (Week 2)
- **Mobile**: Expo Secure Store + SQLite
- **Web**: localStorage (encrypted) + IndexedDB

#### Push Notifications (Week 2)
- **Mobile**: Expo Notifications
- **Web**: Web Push API / Firebase Cloud Messaging

## Web-Specific Considerations

### Navigation

React Navigation works seamlessly on web with:
- URL-based routing
- Browser back/forward buttons
- Deep linking
- Shareable URLs

### Keyboard Support

The web version supports keyboard navigation:
- **Tab**: Navigate between focusable elements
- **Enter**: Activate buttons and links
- **Escape**: Close modals and dialogs
- **Arrow keys**: Navigate lists and menus

### Mouse Interactions

Hover states are automatically enabled on devices that support hover:

```typescript
import { supportsHover } from '@/utils/platform';

if (supportsHover()) {
  // Add hover effects
}
```

### SEO Considerations

For better SEO, consider:
1. Adding meta tags in `app.json` web configuration
2. Using semantic HTML elements
3. Providing alt text for images
4. Implementing proper heading hierarchy

### Performance

Web-specific optimizations:
- Code splitting with lazy loading
- Image optimization
- Bundle size optimization
- Caching strategies

## Deployment

### Static Hosting Options

The web build generates static files that can be deployed to:

1. **Vercel**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

2. **Netlify**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=web-build
   ```

3. **GitHub Pages**
   ```bash
   # Build the app
   npm run build:web
   
   # Deploy to gh-pages branch
   npx gh-pages -d web-build
   ```

4. **AWS S3 + CloudFront**
   ```bash
   # Build the app
   npm run build:web
   
   # Upload to S3
   aws s3 sync web-build/ s3://your-bucket-name
   ```

5. **Firebase Hosting**
   ```bash
   npm install -g firebase-tools
   firebase init hosting
   firebase deploy
   ```

### Environment Variables

Set environment variables for different environments:

```bash
# .env.production
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
EXPO_PUBLIC_GOOGLE_MAPS_KEY=your-key-here
```

### Custom Domain

After deploying, configure your custom domain:
1. Add DNS records pointing to your hosting provider
2. Configure SSL certificate
3. Update `app.json` with your domain

## Browser Compatibility

### Supported Browsers

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

### Minimum Versions

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Testing

Test on multiple browsers:

```bash
# Chrome
npm run web

# Firefox
npm run web -- --browser firefox

# Safari
npm run web -- --browser safari
```

## Troubleshooting

### Common Issues

**Issue**: App doesn't load in browser
**Solution**: Clear browser cache and rebuild

**Issue**: Styles look different on web
**Solution**: Check for platform-specific styles and add web alternatives

**Issue**: Navigation doesn't work
**Solution**: Ensure React Navigation is properly configured for web

**Issue**: Images don't load
**Solution**: Check image paths and ensure they're in the assets folder

### Debug Mode

Enable debug mode for more information:

```bash
EXPO_DEBUG=true npm run web
```

### Console Errors

Check browser console for errors:
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for errors or warnings

## Development Workflow

### Hot Reloading

The web version supports hot reloading:
- Save any file to see changes instantly
- No need to refresh the browser

### DevTools

Use browser DevTools for debugging:
- **Elements**: Inspect DOM and styles
- **Console**: View logs and errors
- **Network**: Monitor API calls
- **Application**: Check localStorage and cookies
- **Performance**: Profile app performance

### Redux DevTools

Install Redux DevTools Extension for Chrome/Firefox to debug state:
1. Install extension from browser store
2. Open DevTools
3. Go to Redux tab
4. Inspect actions and state changes

## Best Practices

### Responsive Design

1. **Mobile-first approach**: Design for mobile, then scale up
2. **Use flexbox**: Works consistently across platforms
3. **Test all breakpoints**: Ensure layout works at all sizes
4. **Touch-friendly**: Make buttons large enough for touch

### Performance

1. **Lazy load screens**: Use React.lazy for code splitting
2. **Optimize images**: Compress and use appropriate formats
3. **Minimize bundle size**: Remove unused dependencies
4. **Cache API responses**: Use RTK Query caching

### Accessibility

1. **Keyboard navigation**: Ensure all features are keyboard-accessible
2. **Screen readers**: Add proper ARIA labels
3. **Color contrast**: Ensure sufficient contrast ratios
4. **Focus indicators**: Make focus states visible

### Security

1. **HTTPS only**: Always use HTTPS in production
2. **Secure storage**: Encrypt sensitive data
3. **API security**: Use proper authentication
4. **Content Security Policy**: Configure CSP headers

## Next Steps

### Week 2: Platform-Specific Features

- Implement web maps integration
- Add web file upload
- Configure web storage
- Set up web push notifications

### Week 3: Optimization

- Add responsive layouts for all screens
- Implement hover states
- Add keyboard shortcuts
- Optimize for desktop UX

### Week 4: Testing & Polish

- Cross-browser testing
- Performance optimization
- SEO improvements
- Final bug fixes

## Resources

- [Expo Web Documentation](https://docs.expo.dev/workflow/web/)
- [React Native Web](https://necolas.github.io/react-native-web/)
- [React Navigation Web](https://reactnavigation.org/docs/web-support/)
- [Redux Toolkit](https://redux-toolkit.js.org/)

## Support

For issues or questions:
1. Check this documentation
2. Review the codebase examples
3. Consult Expo documentation
4. Ask the development team

---

**Last Updated:** March 9, 2026
**Version:** 1.0.0
