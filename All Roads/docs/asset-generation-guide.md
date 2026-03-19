# Asset Generation Guide

## Quick Start

This guide will help you generate all required assets for the Sports Booking App.

## Prerequisites

- Design tool (Figma, Sketch, Photoshop, or similar)
- Basic image editing skills
- Expo CLI installed (`npm install -g expo-cli`)

## Step-by-Step Asset Creation

### Step 1: Create the App Icon (1024x1024)

1. **Open your design tool** and create a new canvas:
   - Width: 1024 pixels
   - Height: 1024 pixels
   - Color mode: RGB
   - Resolution: 72 DPI (or higher)

2. **Design the icon**:
   ```
   Background: #007AFF (primary blue)
   Icon: White sports symbol (basketball, soccer ball, or generic)
   Style: Flat, modern, minimal
   ```

3. **Design tips**:
   - Keep it simple - the icon will be displayed at small sizes
   - Use high contrast (white on blue works well)
   - Avoid fine details that won't be visible when small
   - Don't include text
   - Center the icon with adequate padding

4. **Export**:
   - Format: PNG
   - No transparency
   - Color space: sRGB
   - Save as: `assets/icon.png`

### Step 2: Create the Adaptive Icon (1024x1024)

1. **Create a new canvas**:
   - Width: 1024 pixels
   - Height: 1024 pixels
   - Transparent background

2. **Design the foreground**:
   ```
   Safe zone: Center 684x684 pixels
   Icon: White sports symbol
   Background: Transparent
   ```

3. **Important notes**:
   - Keep all important content within the center 684x684 pixel safe zone
   - The icon will be masked to various shapes (circle, square, rounded square)
   - Use transparency for the background
   - The system will apply the background color (#007AFF)

4. **Export**:
   - Format: PNG with transparency
   - Save as: `assets/adaptive-icon.png`

### Step 3: Create the Splash Screen (1242x2436)

1. **Create a new canvas**:
   - Width: 1242 pixels
   - Height: 2436 pixels
   - Background: #007AFF

2. **Design the splash screen**:
   ```
   Layout:
   - Background: #007AFF
   - Center: App icon (white, ~200x200 pixels)
   - Below icon: "Sports Booking" text (white, 28-34px)
   - Keep content centered vertically and horizontally
   ```

3. **Safe areas**:
   - Top: 88 pixels (status bar + notch)
   - Bottom: 34 pixels (home indicator)
   - Sides: 20 pixels minimum

4. **Export**:
   - Format: PNG
   - Save as: `assets/splash.png`

### Step 4: Create the Notification Icon (96x96)

1. **Create a new canvas**:
   - Width: 96 pixels
   - Height: 96 pixels
   - Transparent background

2. **Design the icon**:
   ```
   Icon: White silhouette of sports symbol
   Background: Transparent
   Style: Simple, flat, no gradients
   ```

3. **Important notes**:
   - Must be a white silhouette only
   - No colors or gradients (Android will apply color)
   - Keep it simple and recognizable
   - Use the same symbol as the app icon

4. **Export**:
   - Format: PNG with transparency
   - Save as: `assets/notification-icon.png`

### Step 5: Create the Favicon (32x32)

1. **Create a new canvas**:
   - Width: 32 pixels
   - Height: 32 pixels

2. **Design the favicon**:
   ```
   Background: #007AFF or transparent
   Icon: Simplified version of app icon
   ```

3. **Export**:
   - Format: PNG or ICO
   - Save as: `assets/favicon.png`

## Using Expo Asset Generator

After creating the base icon (1024x1024), Expo can automatically generate all required sizes:

```bash
# Navigate to your project directory
cd /path/to/sports-booking-app

# Run Expo optimize
expo optimize

# This will generate:
# - iOS app icons (all sizes)
# - Android app icons (all densities)
# - Adaptive icons
# - And more
```

## Manual Asset Generation (Alternative)

If you prefer to generate assets manually or need specific sizes:

### iOS Icon Sizes
- 20x20 (iPhone Notification)
- 29x29 (iPhone Settings)
- 40x40 (iPhone Spotlight)
- 60x60 (iPhone App)
- 76x76 (iPad App)
- 83.5x83.5 (iPad Pro App)
- 1024x1024 (App Store)

### Android Icon Sizes
- mdpi: 48x48
- hdpi: 72x72
- xhdpi: 96x96
- xxhdpi: 144x144
- xxxhdpi: 192x192

## Asset Validation Checklist

Before submitting your app, verify:

### App Icon
- [ ] 1024x1024 pixels
- [ ] PNG format
- [ ] No transparency
- [ ] sRGB color space
- [ ] Recognizable at small sizes
- [ ] Follows brand guidelines

### Adaptive Icon
- [ ] 1024x1024 pixels
- [ ] PNG with transparency
- [ ] Content in safe zone (684x684)
- [ ] Works with all mask shapes
- [ ] Background color set in app.json

### Splash Screen
- [ ] 1242x2436 pixels (or appropriate size)
- [ ] PNG format
- [ ] Content in safe areas
- [ ] Matches brand colors
- [ ] Loads quickly

### Notification Icon
- [ ] 96x96 pixels (xxxhdpi)
- [ ] PNG with transparency
- [ ] White silhouette only
- [ ] Simple and recognizable
- [ ] Additional sizes for other densities

### Favicon
- [ ] 32x32 pixels
- [ ] PNG or ICO format
- [ ] Recognizable at small size

## Testing Your Assets

### iOS Testing
1. Build the app for iOS
2. Install on a device or simulator
3. Check home screen icon
4. Check splash screen
5. Check notification icon (send a test notification)

### Android Testing
1. Build the app for Android
2. Install on a device or emulator
3. Check home screen icon (try different launchers)
4. Check splash screen
5. Check notification icon in notification tray
6. Test adaptive icon with different shapes

### Web Testing
1. Run the web version
2. Check favicon in browser tab
3. Test on different browsers

## Common Issues and Solutions

### Issue: Icon looks blurry
**Solution**: Ensure you're exporting at the correct resolution (1024x1024) and not scaling up a smaller image.

### Issue: Adaptive icon is cut off
**Solution**: Keep all important content within the center 684x684 pixel safe zone.

### Issue: Splash screen shows white bars
**Solution**: Ensure the splash screen image is the correct size (1242x2436) and the background color matches.

### Issue: Notification icon doesn't show
**Solution**: Ensure the icon is a white silhouette on transparent background with no colors or gradients.

### Issue: Colors look different on device
**Solution**: Use sRGB color space and test on actual devices.

## Asset Optimization

### File Size Optimization
- Use PNG-8 instead of PNG-24 when possible
- Compress images without losing quality
- Remove metadata from images
- Use appropriate compression tools

### Tools for Optimization
- **ImageOptim** (Mac): https://imageoptim.com/
- **TinyPNG**: https://tinypng.com/
- **Squoosh**: https://squoosh.app/
- **OptiPNG**: Command-line tool

### Optimization Commands
```bash
# Using ImageOptim CLI
imageoptim assets/*.png

# Using OptiPNG
optipng -o7 assets/*.png

# Using pngquant
pngquant --quality=65-80 assets/*.png
```

## Design Resources

### Free Icon Resources
- **Ionicons**: https://ionic.io/ionicons
- **Material Icons**: https://material.io/resources/icons/
- **Font Awesome**: https://fontawesome.com/
- **Feather Icons**: https://feathericons.com/

### Design Templates
- **Figma App Icon Template**: Search "app icon template" in Figma Community
- **Sketch App Icon Template**: Available on Sketch Resources
- **Adobe XD Templates**: Available in Adobe XD

### Color Tools
- **Coolors**: https://coolors.co/ - Color palette generator
- **Adobe Color**: https://color.adobe.com/ - Color wheel and schemes
- **Contrast Checker**: https://webaim.org/resources/contrastchecker/

## Next Steps

After generating all assets:

1. **Place assets in the correct locations**:
   ```
   assets/
   ├── icon.png
   ├── adaptive-icon.png
   ├── splash.png
   ├── notification-icon.png
   └── favicon.png
   ```

2. **Verify app.json configuration**:
   - Check icon paths
   - Verify splash screen settings
   - Confirm notification icon settings

3. **Test on devices**:
   - iOS device/simulator
   - Android device/emulator
   - Web browser

4. **Build and deploy**:
   ```bash
   # Build for iOS
   expo build:ios
   
   # Build for Android
   expo build:android
   
   # Or use EAS Build
   eas build --platform all
   ```

## Support

If you encounter issues:
- Check Expo documentation: https://docs.expo.dev/
- Review iOS Human Interface Guidelines
- Review Material Design guidelines
- Ask in Expo forums or Discord

## Conclusion

Following this guide will ensure you have all the required assets for your Sports Booking App. Remember to:
- Follow brand guidelines
- Test on actual devices
- Optimize file sizes
- Maintain consistency across platforms
