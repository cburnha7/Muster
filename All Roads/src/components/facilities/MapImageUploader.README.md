# MapImageUploader Component

A reusable React Native component for uploading facility map images with preview functionality. This component handles image selection, validation, preview, and removal with a clean, user-friendly interface.

## Features

- 📸 **Image Selection**: Uses expo-image-picker for cross-platform image selection
- ✅ **Validation**: Validates image dimensions (min/max) before accepting
- 👁️ **Preview**: Shows selected image with change/remove actions
- 🔒 **Permission Handling**: Automatically requests and handles media library permissions
- 🎨 **Brand Consistent**: Uses Muster theme colors and styling
- ⚙️ **Customizable**: Configurable dimensions, quality, and placeholder text
- ♿ **Accessible**: Follows accessibility best practices

## Installation

The component requires the following dependencies:

```bash
npm install expo-image-picker @expo/vector-icons
```

## Basic Usage

```tsx
import React, { useState } from 'react';
import { MapImageUploader } from './components/facilities/MapImageUploader';

function MyScreen() {
  const [imageUri, setImageUri] = useState<string | undefined>();

  return (
    <MapImageUploader
      imageUri={imageUri}
      onImageSelected={(uri) => setImageUri(uri)}
      onImageRemoved={() => setImageUri(undefined)}
    />
  );
}
```

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `onImageSelected` | `(uri: string) => void` | Callback when image is selected |
| `onImageRemoved` | `() => void` | Callback when image is removed |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageUri` | `string \| undefined` | `undefined` | Current image URI (if any) |
| `disabled` | `boolean` | `false` | Whether the component is disabled |
| `minDimensions` | `{ width: number; height: number }` | `{ width: 800, height: 600 }` | Minimum image dimensions |
| `maxDimensions` | `{ width: number; height: number }` | `{ width: 4000, height: 4000 }` | Maximum image dimensions |
| `quality` | `number` | `0.9` | Image quality (0-1) |
| `placeholderText` | `string` | `'Tap to select an image from your device'` | Custom placeholder text |
| `showInstructions` | `boolean` | `true` | Show instructions card |

## Examples

### With Upload State

```tsx
function UploadExample() {
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  const handleImageSelected = async (uri: string) => {
    setImageUri(uri);
    setUploading(true);

    try {
      // Upload to server
      await uploadImage(uri);
      Alert.alert('Success', 'Image uploaded successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
      setImageUri(undefined);
    } finally {
      setUploading(false);
    }
  };

  return (
    <MapImageUploader
      imageUri={imageUri}
      onImageSelected={handleImageSelected}
      onImageRemoved={() => setImageUri(undefined)}
      disabled={uploading}
    />
  );
}
```

### Custom Dimensions

```tsx
<MapImageUploader
  imageUri={imageUri}
  onImageSelected={(uri) => setImageUri(uri)}
  onImageRemoved={() => setImageUri(undefined)}
  minDimensions={{ width: 1000, height: 800 }}
  maxDimensions={{ width: 3000, height: 3000 }}
/>
```

### Without Instructions

```tsx
<MapImageUploader
  imageUri={imageUri}
  onImageSelected={(uri) => setImageUri(uri)}
  onImageRemoved={() => setImageUri(undefined)}
  showInstructions={false}
/>
```

### Custom Placeholder

```tsx
<MapImageUploader
  imageUri={imageUri}
  onImageSelected={(uri) => setImageUri(uri)}
  onImageRemoved={() => setImageUri(undefined)}
  placeholderText="Select a facility map from your gallery"
/>
```

## Validation

The component validates images based on the following criteria:

1. **Minimum Dimensions**: Default 800x600 pixels (customizable)
2. **Maximum Dimensions**: Default 4000x4000 pixels (customizable)
3. **File Size**: Recommended max 10MB (enforced by expo-image-picker quality setting)
4. **Formats**: JPEG, PNG (handled by expo-image-picker)

If validation fails, an alert is shown to the user with a clear error message.

## Permissions

The component automatically requests media library permissions on mount for iOS and Android. On web, no permissions are required.

If permissions are denied, an alert is shown to the user explaining why the permission is needed.

## Styling

The component uses the Muster theme system for consistent styling:

- **Colors**: Uses `colors.grass` (primary), `colors.track` (remove), `colors.sky` (info)
- **Spacing**: Uses `Spacing` constants from theme
- **Border Radius**: Uses `BorderRadius` constants from theme

All styles are defined internally and cannot be overridden. For custom styling, consider wrapping the component in a container.

## Accessibility

The component follows accessibility best practices:

- Touch targets are at least 44x44 points (iOS) / 48x48 pixels (Android)
- Disabled states are properly indicated
- Alert dialogs provide clear feedback
- Color contrast meets WCAG AA standards

## Platform Support

- ✅ iOS
- ✅ Android
- ✅ Web

## Testing

The component includes comprehensive unit tests covering:

- Rendering states (with/without image)
- Permission handling
- Image selection and validation
- Dimension validation (min/max)
- Error handling
- Disabled state
- Custom props

Run tests with:

```bash
npm test -- tests/components/facilities/MapImageUploader.test.tsx
```

## Integration with FacilityMapEditorScreen

The component is used in `FacilityMapEditorScreen` to handle facility map uploads:

```tsx
<MapImageUploader
  imageUri={mapImageUri}
  onImageSelected={handleImageSelected}
  onImageRemoved={handleImageRemoved}
  disabled={uploading}
  showInstructions={true}
/>
```

## Troubleshooting

### Image picker not opening

- Ensure expo-image-picker is installed
- Check that permissions are granted
- Verify the device has a photo library

### Validation errors

- Check that image dimensions meet min/max requirements
- Ensure image file is not corrupted
- Try a different image format (JPEG or PNG)

### Styling issues

- Ensure theme system is properly configured
- Check that all theme imports are correct
- Verify React Native version compatibility

## Future Enhancements

Potential improvements for future versions:

- [ ] Support for multiple image selection
- [ ] Image cropping functionality
- [ ] Drag-and-drop support (web)
- [ ] Progress indicator during upload
- [ ] Image compression options
- [ ] Support for other image formats (WebP, HEIC)
- [ ] Camera capture option
- [ ] Image editing tools (rotate, crop, filters)

## Related Components

- `FacilityMapEditorScreen`: Uses this component for map uploads
- `OptimizedImage`: For displaying optimized images
- `FormButton`: For action buttons

## License

Part of the Muster sports booking platform.
