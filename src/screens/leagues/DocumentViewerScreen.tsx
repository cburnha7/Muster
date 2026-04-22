import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, TextStyles, useTheme } from '../../theme';
import { leagueService } from '../../services/api/LeagueService';
import { performanceMonitoringService } from '../../services/monitoring/PerformanceMonitoringService';

interface DocumentViewerScreenProps {
  route: {
    params: {
      leagueId: string;
      documentId: string;
      documentName?: string;
    };
  };
  navigation: any;
}

export const DocumentViewerScreen: React.FC<DocumentViewerScreenProps> = ({
  route,
  navigation,
}) => {
  const { colors } = useTheme();
  const { leagueId, documentId, documentName } = route.params ?? {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>(documentName || 'Document');

  useEffect(() => {
    loadDocument();
  }, [leagueId, documentId]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      const startTime = Date.now();

      // Get document URL from API
      const response = await leagueService.downloadDocument(
        leagueId,
        documentId
      );

      setDocumentUrl(response.url);
      setFileName(response.fileName);

      // Track document access for analytics
      const loadTime = Date.now() - startTime;
      performanceMonitoringService.recordMetric({
        name: 'document_load_time',
        value: loadTime,
        unit: 'ms',
        metadata: {
          leagueId,
          documentId,
          fileName: response.fileName,
        },
      });

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading document:', err);
      setError(err.message || 'Failed to load document');
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!documentUrl) return;

    try {
      // Track download attempt
      performanceMonitoringService.recordMetric({
        name: 'document_download_attempt',
        value: 1,
        unit: 'count',
        metadata: {
          leagueId,
          documentId,
          fileName,
          platform: Platform.OS,
        },
      });

      if (Platform.OS === 'web') {
        // Web: Open in new tab for download
        window.open(documentUrl, '_blank');
      } else {
        // Mobile: Open with system handler
        const supported = await Linking.canOpenURL(documentUrl);
        if (supported) {
          await Linking.openURL(documentUrl);
        } else {
          Alert.alert(
            'Cannot Open Document',
            'Your device cannot open this document. Please try downloading it on a computer.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (err: any) {
      console.error('Error downloading document:', err);
      Alert.alert(
        'Download Failed',
        'Failed to download document. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRetry = () => {
    loadDocument();
  };

  // Set header title
  useEffect(() => {
    navigation.setOptions({
      title: fileName,
      headerRight: () => (
        <TouchableOpacity
          onPress={handleDownload}
          style={styles.downloadButton}
          disabled={!documentUrl}
        >
          <Ionicons name="download-outline" size={24} color={colors.cobalt} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, fileName, documentUrl]);

  if (loading) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.bgScreen }]}
      >
        <ActivityIndicator size="large" color={colors.cobalt} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading document...</Text>
      </View>
    );
  }

  if (error || !documentUrl) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.bgScreen }]}
      >
        <Ionicons
          name="document-text-outline"
          size={64}
          color={colors.inkFaint}
        />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Failed to Load Document</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error || 'Document URL not available'}
        </Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.cobalt }]} onPress={handleRetry}>
          <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.downloadFallbackButton}
          onPress={handleDownload}
        >
          <Ionicons name="download-outline" size={20} color={colors.cobalt} />
          <Text style={[styles.downloadFallbackText, { color: colors.cobalt }]}>Try Download Instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Platform-specific PDF viewing
  if (Platform.OS === 'web') {
    // Web: Use iframe for native browser PDF viewer
    return (
      <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
        <iframe
          src={documentUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title={fileName}
        />
      </View>
    );
  }

  // iOS and Android: Use WebView with Google Docs Viewer as fallback
  // Google Docs Viewer provides zoom, scroll, and page navigation
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgScreen }]}>
      <WebView
        source={{ uri: viewerUrl }}
        style={styles.webview}
        onError={syntheticEvent => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setError('Failed to display document in viewer');
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={[styles.webviewLoading, { backgroundColor: colors.bgScreen }]}>
            <ActivityIndicator size="large" color={colors.cobalt} />
          </View>
        )}
        // Enable zoom and scroll
        scalesPageToFit={true}
        bounces={true}
        // Security settings
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
      />

      {/* Floating download button for mobile */}
      <TouchableOpacity
        style={[styles.floatingDownloadButton, { backgroundColor: colors.cobalt, shadowColor: colors.ink }]}
        onPress={handleDownload}
      >
        <Ionicons name="download" size={24} color={colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...TextStyles.body,
    marginTop: Spacing.md,
  },
  errorTitle: {
    ...TextStyles.h3,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...TextStyles.body,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  retryButtonText: {
    ...TextStyles.body,
    fontWeight: '600',
  },
  downloadFallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  downloadFallbackText: {
    ...TextStyles.body,
    marginLeft: Spacing.sm,
    fontWeight: '600',
  },
  downloadButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  floatingDownloadButton: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
