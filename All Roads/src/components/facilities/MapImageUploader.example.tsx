/**
 * MapImageUploader Component - Usage Examples
 * 
 * This file demonstrates various ways to use the MapImageUploader component.
 */

import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { MapImageUploader } from './MapImageUploader';

/**
 * Example 1: Basic Usage
 * Simple image uploader with default settings
 */
export function BasicExample() {
  const [imageUri, setImageUri] = useState<string | undefined>();

  return (
    <MapImageUploader
      imageUri={imageUri}
      onImageSelected={(uri) => setImageUri(uri)}
      onImageRemoved={() => setImageUri(undefined)}
    />
  );
}

/**
 * Example 2: With Custom Dimensions
 * Uploader with custom minimum and maximum dimensions
 */
export function CustomDimensionsExample() {
  const [imageUri, setImageUri] = useState<string | undefined>();

  return (
    <MapImageUploader
      imageUri={imageUri}
      onImageSelected={(uri) => setImageUri(uri)}
      onImageRemoved={() => setImageUri(undefined)}
      minDimensions={{ width: 1000, height: 800 }}
      maxDimensions={{ width: 3000, height: 3000 }}
    />
  );
}

/**
 * Example 3: Without Instructions
 * Uploader without the instructions card
 */
export function NoInstructionsExample() {
  const [imageUri, setImageUri] = useState<string | undefined>();

  return (
    <MapImageUploader
      imageUri={imageUri}
      onImageSelected={(uri) => setImageUri(uri)}
      onImageRemoved={() => setImageUri(undefined)}
      showInstructions={false}
    />
  );
}

/**
 * Example 4: With Upload State
 * Uploader that handles upload state and shows loading indicator
 */
export function WithUploadStateExample() {
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  const handleImageSelected = async (uri: string) => {
    setImageUri(uri);
    setUploading(true);

    try {
      // Simulate upload
      await new Promise((resolve) => setTimeout(resolve, 2000));
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

/**
 * Example 5: Custom Placeholder Text
 * Uploader with custom placeholder text
 */
export function CustomPlaceholderExample() {
  const [imageUri, setImageUri] = useState<string | undefined>();

  return (
    <MapImageUploader
      imageUri={imageUri}
      onImageSelected={(uri) => setImageUri(uri)}
      onImageRemoved={() => setImageUri(undefined)}
      placeholderText="Select a facility map from your gallery"
    />
  );
}

/**
 * Example 6: With Image Quality Control
 * Uploader with custom image quality setting
 */
export function CustomQualityExample() {
  const [imageUri, setImageUri] = useState<string | undefined>();

  return (
    <MapImageUploader
      imageUri={imageUri}
      onImageSelected={(uri) => setImageUri(uri)}
      onImageRemoved={() => setImageUri(undefined)}
      quality={0.8} // Lower quality for smaller file size
    />
  );
}

/**
 * Example 7: Complete Integration
 * Full example with all features integrated
 */
export function CompleteExample() {
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  const handleImageSelected = async (uri: string) => {
    setImageUri(uri);
    setUploading(true);

    try {
      // Upload to server
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], 'facility-map.jpg', { type: 'image/jpeg' });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      Alert.alert('Success', 'Facility map uploaded successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload facility map');
      setImageUri(undefined);
    } finally {
      setUploading(false);
    }
  };

  const handleImageRemoved = () => {
    setImageUri(undefined);
    Alert.alert('Removed', 'Facility map has been removed');
  };

  return (
    <View style={{ padding: 16 }}>
      <MapImageUploader
        imageUri={imageUri}
        onImageSelected={handleImageSelected}
        onImageRemoved={handleImageRemoved}
        disabled={uploading}
        minDimensions={{ width: 800, height: 600 }}
        maxDimensions={{ width: 4000, height: 4000 }}
        quality={0.9}
        showInstructions={true}
        placeholderText="Tap to select a facility map image"
      />
    </View>
  );
}
