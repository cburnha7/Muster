import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { colors, Spacing, BorderRadius } from '../../theme';

export interface MapImageUploaderProps {
  /**
   * Current image URI (if any)
   */
  imageUri?: string | undefined;
  
  /**
   * Callback when image is selected
   */
  onImageSelected: (uri: string) => void;
  
  /**
   * Callback when image is removed
   */
  onImageRemoved: () => void;
  
  /**
   * Whether the component is disabled (e.g., during upload)
   */
  disabled?: boolean;
  
  /**
   * Minimum image dimensions (default: 800x600)
   */
  minDimensions?: { width: number; height: number };
  
  /**
   * Maximum image dimensions (default: 4000x4000)
   */
  maxDimensions?: { width: number; height: number };
  
  /**
   * Image quality (0-1, default: 0.9)
   */
  quality?: number;
  
  /**
   * Custom placeholder text
   */
  placeholderText?: string;
  
  /**
   * Show instructions card
   */
  showInstructions?: boolean;
}

/**
 * MapImageUploader Component
 * 
 * Reusable component for uploading facility map images with preview functionality.
 * Handles image selection, validation, preview, and removal.
 * 
 * Features:
 * - Image selection from device library
 * - Dimension validation (min/max)
 * - Image preview with change/remove actions
 * - Permission handling
 * - Customizable constraints
 * 
 * @example
 * ```tsx
 * <MapImageUploader
 *   imageUri={mapImageUri}
 *   onImageSelected={(uri) => setMapImageUri(uri)}
 *   onImageRemoved={() => setMapImageUri(undefined)}
 *   disabled={uploading}
 * />
 * ```
 */
export function MapImageUploader({
  imageUri,
  onImageSelected,
  onImageRemoved,
  disabled = false,
  minDimensions = { width: 800, height: 600 },
  maxDimensions = { width: 4000, height: 4000 },
  quality = 0.9,
  placeholderText = 'Tap to select an image from your device',
  showInstructions = true,
}: MapImageUploaderProps): JSX.Element {
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    requestImagePermissions();
  }, []);

  const requestImagePermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status === 'granted') {
        setPermissionGranted(true);
      } else {
        Alert.alert(
          'Permission Required',
          'We need camera roll permissions to upload facility maps.'
        );
      }
    } else {
      setPermissionGranted(true);
    }
  };

  const handlePickImage = async () => {
    if (!permissionGranted && Platform.OS !== 'web') {
      await requestImagePermissions();
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Validate image dimensions
        if (asset.width && asset.height) {
          if (asset.width < minDimensions.width || asset.height < minDimensions.height) {
            Alert.alert(
              'Image Too Small',
              `Please select an image with minimum dimensions of ${minDimensions.width}x${minDimensions.height} pixels.`
            );
            return;
          }
          
          if (asset.width > maxDimensions.width || asset.height > maxDimensions.height) {
            Alert.alert(
              'Image Too Large',
              `Please select an image with maximum dimensions of ${maxDimensions.width}x${maxDimensions.height} pixels.`
            );
            return;
          }
        }

        onImageSelected(asset.uri);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick image: ' + err.message);
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: onImageRemoved,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Instructions */}
      {showInstructions && (
        <View style={styles.instructionsCard}>
          <View style={styles.instructionHeader}>
            <Ionicons name="information-circle" size={24} color={colors.sky} />
            <Text style={styles.instructionTitle}>Upload Facility Map</Text>
          </View>
          <Text style={styles.instructionText}>
            Upload a clear image showing the layout of your facility. This will help users
            understand the location of courts and fields.
          </Text>
          <View style={styles.requirementsList}>
            <Text style={styles.requirementItem}>
              • Minimum size: {minDimensions.width}x{minDimensions.height} pixels
            </Text>
            <Text style={styles.requirementItem}>
              • Maximum size: {maxDimensions.width}x{maxDimensions.height} pixels
            </Text>
            <Text style={styles.requirementItem}>• Maximum file size: 10MB</Text>
            <Text style={styles.requirementItem}>• Formats: JPEG, PNG</Text>
          </View>
        </View>
      )}

      {/* Image Preview or Upload Placeholder */}
      {imageUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.mapImage} resizeMode="contain" />
          <View style={styles.imageOverlay}>
            <TouchableOpacity
              style={[styles.imageButton, styles.changeButton]}
              onPress={handlePickImage}
              disabled={disabled}
            >
              <Ionicons name="images" size={20} color={colors.grass} />
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.imageButton, styles.removeButton]}
              onPress={handleRemoveImage}
              disabled={disabled}
            >
              <Ionicons name="trash" size={20} color={colors.track} />
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadPlaceholder}
          onPress={handlePickImage}
          disabled={disabled}
        >
          <Ionicons name="cloud-upload-outline" size={48} color={colors.soft} />
          <Text style={styles.uploadPlaceholderTitle}>Upload Facility Map</Text>
          <Text style={styles.uploadPlaceholderText}>{placeholderText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  instructionsCard: {
    backgroundColor: colors.background,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    marginLeft: Spacing.sm,
  },
  instructionText: {
    fontSize: 15,
    color: colors.mid,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  requirementsList: {
    backgroundColor: colors.chalk,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  requirementItem: {
    fontSize: 14,
    color: colors.soft,
    marginBottom: Spacing.xs,
  },
  imageContainer: {
    backgroundColor: colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: 400,
    backgroundColor: colors.chalk,
  },
  imageOverlay: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  changeButton: {
    backgroundColor: colors.chalk,
    borderWidth: 1,
    borderColor: colors.grass,
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.grass,
  },
  removeButton: {
    backgroundColor: colors.chalk,
    borderWidth: 1,
    borderColor: colors.track,
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.track,
  },
  uploadPlaceholder: {
    backgroundColor: colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  uploadPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  uploadPlaceholderText: {
    fontSize: 15,
    color: colors.soft,
    textAlign: 'center',
  },
});
