import { Platform } from 'react-native';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  format: 'jpeg',
};

/**
 * Optimize an image by resizing and compressing it.
 * On web, returns the original URI (no native manipulation available).
 */
export async function optimizeImage(
  uri: string,
  options: ImageOptimizationOptions = {}
): Promise<string> {
  if (Platform.OS === 'web') return uri;

  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const ImageManipulator = require('expo-image-manipulator');
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: opts.maxWidth, height: opts.maxHeight } }],
      {
        compress: opts.quality,
        format:
          opts.format === 'png'
            ? ImageManipulator.SaveFormat.PNG
            : ImageManipulator.SaveFormat.JPEG,
      }
    );
    return manipResult.uri;
  } catch (error) {
    console.error('Error optimizing image:', error);
    return uri;
  }
}

/**
 * Cache an image from a remote URL.
 * On web, returns the original URL (no file system caching).
 */
export async function cacheImage(url: string): Promise<string> {
  if (Platform.OS === 'web') return url;

  try {
    const { File, Directory } = require('expo-file-system/next');
    const filename = url.split('/').pop() || 'image';
    const cacheDir = new Directory(
      require('expo-file-system').cacheDirectory + 'images/'
    );

    if (!cacheDir.exists) {
      cacheDir.create();
    }

    const cachedFile = new File(cacheDir.uri + filename);
    if (cachedFile.exists) {
      return cachedFile.uri;
    }

    // Download
    const FileSystem = require('expo-file-system');
    const downloadResult = await FileSystem.downloadAsync(
      url,
      cacheDir.uri + filename
    );
    return downloadResult.uri;
  } catch (error) {
    // Fallback: return original URL if caching fails
    console.warn('Image cache skipped:', error);
    return url;
  }
}

/**
 * Clear image cache.
 */
export async function clearImageCache(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const FileSystem = require('expo-file-system');
    const cacheDir = FileSystem.cacheDirectory + 'images/';
    await FileSystem.deleteAsync(cacheDir, { idempotent: true });
  } catch (error) {
    console.error('Error clearing image cache:', error);
  }
}

/**
 * Get cache size in bytes.
 */
export async function getImageCacheSize(): Promise<number> {
  if (Platform.OS === 'web') return 0;

  try {
    const FileSystem = require('expo-file-system');
    const cacheDir = FileSystem.cacheDirectory + 'images/';
    const files = await FileSystem.readDirectoryAsync(cacheDir);
    // Approximate — can't get individual file sizes without the deprecated API
    return files.length * 100_000; // rough estimate
  } catch {
    return 0;
  }
}
