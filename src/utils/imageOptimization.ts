import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

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
 * Optimize an image by resizing and compressing it
 */
export async function optimizeImage(
  uri: string,
  options: ImageOptimizationOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: opts.maxWidth,
            height: opts.maxHeight,
          },
        },
      ],
      {
        compress: opts.quality,
        format: opts.format === 'png' 
          ? ImageManipulator.SaveFormat.PNG 
          : ImageManipulator.SaveFormat.JPEG,
      }
    );

    return manipResult.uri;
  } catch (error) {
    console.error('Error optimizing image:', error);
    return uri; // Return original URI if optimization fails
  }
}

/**
 * Get cached image path for a remote URL
 */
export function getCachedImagePath(url: string): string {
  const filename = url.split('/').pop() || 'image';
  const cacheDir = `${FileSystem.cacheDirectory}images/`;
  return `${cacheDir}${filename}`;
}

/**
 * Cache an image from a remote URL
 */
export async function cacheImage(url: string): Promise<string> {
  try {
    const cachedPath = getCachedImagePath(url);
    const cacheDir = `${FileSystem.cacheDirectory}images/`;

    // Create cache directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
    }

    // Check if image is already cached
    const fileInfo = await FileSystem.getInfoAsync(cachedPath);
    if (fileInfo.exists) {
      return cachedPath;
    }

    // Download and cache the image
    const downloadResult = await FileSystem.downloadAsync(url, cachedPath);
    return downloadResult.uri;
  } catch (error) {
    console.error('Error caching image:', error);
    return url; // Return original URL if caching fails
  }
}

/**
 * Clear image cache
 */
export async function clearImageCache(): Promise<void> {
  try {
    const cacheDir = `${FileSystem.cacheDirectory}images/`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(cacheDir, { idempotent: true });
    }
  } catch (error) {
    console.error('Error clearing image cache:', error);
  }
}

/**
 * Get cache size in bytes
 */
export async function getImageCacheSize(): Promise<number> {
  try {
    const cacheDir = `${FileSystem.cacheDirectory}images/`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    
    if (!dirInfo.exists) {
      return 0;
    }

    const files = await FileSystem.readDirectoryAsync(cacheDir);
    let totalSize = 0;

    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${cacheDir}${file}`);
      if (fileInfo.exists && 'size' in fileInfo) {
        totalSize += fileInfo.size;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Error getting cache size:', error);
    return 0;
  }
}
