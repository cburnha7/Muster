# Branding and Assets Guide

## Overview
This document provides specifications for all visual assets required for the Sports Booking App, including app icons, splash screens, and branding guidelines.

## Brand Colors

### Primary Colors
- **Primary Blue**: `#007AFF` - Main brand color, used for primary actions and highlights
- **Primary Dark**: `#0051D5` - Darker shade for pressed states
- **Primary Light**: `#4DA3FF` - Lighter shade for backgrounds

### Secondary Colors
- **Success Green**: `#34C759` - Success states, confirmations
- **Warning Orange**: `#FF9500` - Warnings, important notices
- **Error Red**: `#FF3B30` - Errors, cancellations
- **Info Blue**: `#5AC8FA` - Information, tips

### Neutral Colors
- **Background**: `#FFFFFF` - Main background
- **Surface**: `#F2F2F7` - Card backgrounds, surfaces
- **Border**: `#E5E5EA` - Borders, dividers
- **Text Primary**: `#000000` - Main text
- **Text Secondary**: `#8E8E93` - Secondary text, labels
- **Text Tertiary**: `#C7C7CC` - Disabled text, placeholders

## Typography

### Font Family
- **Primary**: System font (San Francisco on iOS, Roboto on Android)
- **Fallback**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif

### Font Sizes
- **Heading 1**: 34px, Bold
- **Heading 2**: 28px, Bold
- **Heading 3**: 22px, Semibold
- **Body Large**: 17px, Regular
- **Body**: 15px, Regular
- **Caption**: 13px, Regular
- **Small**: 11px, Regular

### Font Weights
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

## App Icon Specifications

### iOS App Icon
**File**: `assets/icon.png`
**Size**: 1024x1024 pixels
**Format**: PNG (no transparency)
**Color Space**: sRGB

**Design Guidelines**:
- Use the primary blue (#007AFF) as the background
- Include a white sports-related icon (basketball, soccer ball, or generic sports symbol)
- Keep design simple and recognizable at small sizes
- Avoid text in the icon
- Ensure good contrast

**Suggested Design**:
```
┌─────────────────┐
│                 │
│   ┌─────────┐   │
│   │    🏀   │   │  ← White sports icon
│   │         │   │
│   └─────────┘   │
│                 │
└─────────────────┘
   Blue Background
```

### Android Adaptive Icon
**Foreground**: `assets/adaptive-icon.png`
**Size**: 1024x1024 pixels
**Format**: PNG with transparency
**Safe Zone**: Center 66% (684x684 pixels)

**Background Color**: `#007AFF`

**Design Guidelines**:
- Foreground image should be centered in the safe zone
- Use transparency for the foreground layer
- Background color will be applied by the system
- Icon will be masked to various shapes (circle, square, rounded square)

## Splash Screen Specifications

### Splash Screen Image
**File**: `assets/splash.png`
**Size**: 1242x2436 pixels (iPhone X/11/12 Pro Max resolution)
**Format**: PNG
**Background Color**: `#007AFF`

**Design Guidelines**:
- Use the primary blue background
- Center the app logo/icon
- Add app name below the icon in white
- Keep design minimal and clean
- Ensure content is in the safe area (avoid notch/home indicator areas)

**Layout**:
```
┌─────────────────────┐
│                     │
│                     │
│                     │
│     ┌─────────┐     │
│     │   🏀    │     │  ← App icon (white)
│     └─────────┘     │
│                     │
│  Sports Booking     │  ← App name (white)
│                     │
│                     │
│                     │
└─────────────────────┘
```

### Splash Screen Configuration
- **Resize Mode**: `contain` - Maintains aspect ratio
- **Background Color**: `#007AFF` - Primary blue
- **Duration**: System default (typically 1-2 seconds)

## Notification Icon

### Android Notification Icon
**File**: `assets/notification-icon.png`
**Size**: 96x96 pixels (xxxhdpi)
**Format**: PNG with transparency
**Color**: White silhouette on transparent background

**Design Guidelines**:
- Must be a white silhouette
- Transparent background
- Simple, recognizable shape
- No gradients or colors (Android will apply color)
- Use the same sports icon as the app icon

**Additional Sizes** (for different densities):
- mdpi: 24x24 pixels
- hdpi: 36x36 pixels
- xhdpi: 48x48 pixels
- xxhdpi: 72x72 pixels
- xxxhdpi: 96x96 pixels

### Notification Color
**Color**: `#007AFF` - Applied by Android to the notification icon

## Favicon

### Web Favicon
**File**: `assets/favicon.png`
**Size**: 32x32 pixels
**Format**: PNG or ICO

**Design Guidelines**:
- Simplified version of the app icon
- Recognizable at small size
- Use primary brand colors

## Loading States

### Loading Spinner
**Color**: `#007AFF` (primary blue)
**Size**: 
- Small: 20x20 pixels
- Medium: 40x40 pixels
- Large: 60x60 pixels

### Skeleton Screens
**Background**: `#F2F2F7` (surface color)
**Shimmer**: `#E5E5EA` (border color)
**Animation**: Subtle left-to-right shimmer effect

## UI Component Branding

### Buttons

#### Primary Button
- **Background**: `#007AFF`
- **Text**: `#FFFFFF`
- **Border Radius**: 8px
- **Height**: 48px
- **Font**: 17px, Semibold

#### Secondary Button
- **Background**: `#F2F2F7`
- **Text**: `#007AFF`
- **Border Radius**: 8px
- **Height**: 48px
- **Font**: 17px, Semibold

#### Destructive Button
- **Background**: `#FF3B30`
- **Text**: `#FFFFFF`
- **Border Radius**: 8px
- **Height**: 48px
- **Font**: 17px, Semibold

### Cards
- **Background**: `#FFFFFF`
- **Border**: 1px solid `#E5E5EA`
- **Border Radius**: 12px
- **Shadow**: 0px 2px 8px rgba(0, 0, 0, 0.1)
- **Padding**: 16px

### Input Fields
- **Background**: `#F2F2F7`
- **Border**: 1px solid `#E5E5EA`
- **Border Radius**: 8px
- **Height**: 48px
- **Padding**: 12px 16px
- **Font**: 17px, Regular
- **Placeholder**: `#C7C7CC`

### Tab Bar
- **Background**: `#FFFFFF`
- **Border Top**: 1px solid `#E5E5EA`
- **Active Color**: `#007AFF`
- **Inactive Color**: `#8E8E93`
- **Height**: 60px
- **Icon Size**: 24x24 pixels

## Asset Generation Instructions

### Using Expo Asset Generator
Expo can automatically generate all required icon sizes from a single 1024x1024 image:

```bash
# Install expo-cli if not already installed
npm install -g expo-cli

# Generate icons
expo optimize
```

### Manual Asset Creation

#### 1. Create App Icon (1024x1024)
1. Open your design tool (Figma, Sketch, Photoshop)
2. Create a 1024x1024 canvas
3. Fill with primary blue (#007AFF)
4. Add white sports icon in center
5. Export as PNG
6. Save as `assets/icon.png`

#### 2. Create Adaptive Icon (1024x1024)
1. Create a 1024x1024 canvas with transparency
2. Add white sports icon in center (within 684x684 safe zone)
3. Export as PNG with transparency
4. Save as `assets/adaptive-icon.png`

#### 3. Create Splash Screen (1242x2436)
1. Create a 1242x2436 canvas
2. Fill with primary blue (#007AFF)
3. Add app icon in center
4. Add app name below icon in white
5. Export as PNG
6. Save as `assets/splash.png`

#### 4. Create Notification Icon (96x96)
1. Create a 96x96 canvas with transparency
2. Add white silhouette of sports icon
3. Export as PNG with transparency
4. Save as `assets/notification-icon.png`

#### 5. Create Favicon (32x32)
1. Create a 32x32 canvas
2. Add simplified version of app icon
3. Export as PNG or ICO
4. Save as `assets/favicon.png`

## Asset Checklist

### Required Assets
- [ ] `assets/icon.png` (1024x1024) - iOS app icon
- [ ] `assets/adaptive-icon.png` (1024x1024) - Android adaptive icon foreground
- [ ] `assets/splash.png` (1242x2436) - Splash screen
- [ ] `assets/notification-icon.png` (96x96) - Android notification icon
- [ ] `assets/favicon.png` (32x32) - Web favicon

### Optional Assets
- [ ] `assets/sounds/notification.wav` - Custom notification sound
- [ ] `assets/images/logo.png` - App logo for use in UI
- [ ] `assets/images/logo-white.png` - White version of logo
- [ ] `assets/images/placeholder-avatar.png` - Default user avatar
- [ ] `assets/images/placeholder-facility.png` - Default facility image
- [ ] `assets/images/placeholder-event.png` - Default event image

## Brand Guidelines

### Logo Usage
- Always maintain clear space around the logo (minimum 20px)
- Never distort or skew the logo
- Use the white version on dark backgrounds
- Use the colored version on light backgrounds
- Minimum size: 32x32 pixels

### Color Usage
- Use primary blue for main actions and highlights
- Use secondary colors sparingly for specific states
- Maintain sufficient contrast for accessibility (WCAG AA minimum)
- Use neutral colors for backgrounds and text

### Accessibility
- Ensure text has minimum 4.5:1 contrast ratio
- Provide alternative text for all images
- Use semantic HTML/native components
- Support dynamic type/font scaling
- Test with screen readers

## Implementation Notes

### iOS Specific
- App icon will be automatically rounded by iOS
- No transparency allowed in app icon
- Splash screen will be shown during app launch
- Status bar style should match splash screen

### Android Specific
- Adaptive icon will be masked to various shapes
- Notification icon must be white silhouette
- Splash screen may show briefly on cold start
- Material Design guidelines should be followed

### Web Specific
- Favicon should be recognizable at small sizes
- Consider providing multiple sizes for different contexts
- PWA icons may be needed for web app installation

## Testing Assets

### Visual Testing Checklist
- [ ] Test app icon on iOS home screen
- [ ] Test app icon on Android home screen (various launchers)
- [ ] Test splash screen on various device sizes
- [ ] Test notification icon in notification tray
- [ ] Test favicon in browser tab
- [ ] Test all assets in light and dark mode
- [ ] Test assets on various screen densities

### Accessibility Testing
- [ ] Verify sufficient color contrast
- [ ] Test with screen readers
- [ ] Test with dynamic type enabled
- [ ] Test with color blindness simulators

## Resources

### Design Tools
- **Figma**: https://www.figma.com/
- **Sketch**: https://www.sketch.com/
- **Adobe XD**: https://www.adobe.com/products/xd.html
- **Photoshop**: https://www.adobe.com/products/photoshop.html

### Icon Resources
- **SF Symbols** (iOS): https://developer.apple.com/sf-symbols/
- **Material Icons** (Android): https://material.io/resources/icons/
- **Ionicons**: https://ionic.io/ionicons
- **Font Awesome**: https://fontawesome.com/

### Asset Generators
- **Expo Asset Generator**: Built into Expo CLI
- **App Icon Generator**: https://appicon.co/
- **Adaptive Icon Generator**: https://adapticon.tooo.io/

### Guidelines
- **iOS Human Interface Guidelines**: https://developer.apple.com/design/human-interface-guidelines/
- **Material Design**: https://material.io/design
- **Expo Asset Guidelines**: https://docs.expo.dev/guides/app-icons/

## Conclusion

Following these branding guidelines will ensure a consistent, professional appearance across all platforms and touchpoints. The specified colors, typography, and asset specifications create a cohesive brand identity that users will recognize and trust.

Remember to:
1. Create all required assets before building the app
2. Test assets on actual devices
3. Maintain brand consistency across all screens
4. Follow platform-specific guidelines
5. Ensure accessibility compliance
