import React, { useState, useEffect } from 'react';
import {
  Image,
  ImageProps,
  ImageStyle,
  StyleProp,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { cacheImage } from '../../utils/imageOptimization';
import { useTheme } from '../../theme';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  style?: StyleProp<ImageStyle>;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  cacheEnabled?: boolean;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

/**
 * Optimized Image component with caching and loading states
 * Automatically caches remote images for better performance
 */
export function OptimizedImage({
  source,
  style,
  placeholder,
  fallback,
  cacheEnabled = true,
  resizeMode = 'cover',
  ...props
}: OptimizedImageProps): JSX.Element {
  const { colors } = useTheme();
  const [imageSource, setImageSource] = useState<{ uri: string } | number>(
    source
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadImage();
  }, [source]);

  const loadImage = async () => {
    // If source is a local require(), use it directly
    if (typeof source === 'number') {
      setImageSource(source);
      return;
    }

    // If caching is disabled or source is not a URI, use it directly
    if (!cacheEnabled || !source.uri) {
      setImageSource(source);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);

      // Cache the image
      const cachedUri = await cacheImage(source.uri);
      setImageSource({ uri: cachedUri });
    } catch (error) {
      console.error('Error loading image:', error);
      setHasError(true);
      // Fallback to original URI if caching fails
      setImageSource(source);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        {...props}
        source={imageSource}
        style={[styles.image, style]}
        resizeMode={resizeMode}
        onError={handleError}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
      />
      {isLoading && (
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {placeholder || (
            <ActivityIndicator size="small" color={colors.cobalt} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
