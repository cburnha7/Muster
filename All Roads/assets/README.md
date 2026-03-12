# Assets Directory

This directory contains all visual assets for the Sports Booking App.

## Required Assets

### App Icons
- **icon.png** (1024x1024) - Main app icon for iOS
- **adaptive-icon.png** (1024x1024) - Adaptive icon foreground for Android
- **favicon.png** (32x32) - Web favicon

### Splash Screen
- **splash.png** (1242x2436) - Splash screen image

### Notifications
- **notification-icon.png** (96x96) - Android notification icon

## Asset Specifications

### icon.png
- Size: 1024x1024 pixels
- Format: PNG (no transparency)
- Color Space: sRGB
- Background: #007AFF (primary blue)
- Icon: White sports symbol

### adaptive-icon.png
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Safe Zone: Center 684x684 pixels
- Icon: White sports symbol
- Background: Transparent (color applied by system)

### splash.png
- Size: 1242x2436 pixels
- Format: PNG
- Background: #007AFF (primary blue)
- Content: Centered app icon and name in white

### notification-icon.png
- Size: 96x96 pixels (xxxhdpi)
- Format: PNG with transparency
- Icon: White silhouette only
- Background: Transparent

### favicon.png
- Size: 32x32 pixels
- Format: PNG or ICO
- Icon: Simplified app icon

## Placeholder Assets

Currently, this directory contains a `.gitkeep` file to maintain the directory structure. Replace this with actual assets before building the app.

## Generating Assets

See `docs/asset-generation-guide.md` for detailed instructions on creating all required assets.

Quick steps:
1. Create base icon (1024x1024)
2. Create adaptive icon (1024x1024 with transparency)
3. Create splash screen (1242x2436)
4. Create notification icon (96x96 white silhouette)
5. Create favicon (32x32)

## Using Expo Asset Generator

After creating the base icon, run:
```bash
expo optimize
```

This will automatically generate all required sizes.

## Brand Colors

- Primary Blue: #007AFF
- White: #FFFFFF
- Surface: #F2F2F7
- Border: #E5E5EA

## Testing Assets

Test your assets on:
- iOS devices/simulators
- Android devices/emulators
- Web browsers
- Different screen sizes
- Light and dark modes

## Resources

- Branding Guide: `docs/branding-and-assets.md`
- Asset Generation: `docs/asset-generation-guide.md`
- Theme System: `src/theme/`

## Notes

- All assets should follow the brand guidelines
- Ensure sufficient contrast for accessibility
- Test on actual devices before deployment
- Optimize file sizes for performance
