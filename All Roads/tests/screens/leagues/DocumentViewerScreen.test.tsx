import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DocumentViewerScreen } from '../../../src/screens/leagues/DocumentViewerScreen';
import { leagueService } from '../../../src/services/api/LeagueService';
import { Alert, Platform } from 'react-native';
import authReducer from '../../../src/store/slices/authSlice';
import leaguesReducer from '../../../src/store/slices/leaguesSlice';

// Mock dependencies
jest.mock('../../../src/services/api/LeagueService');
jest.mock('../../../src/services/monitoring/PerformanceMonitoringService', () => ({
  performanceMonitoringService: {
    recordMetric: jest.fn(),
  },
}));
jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

describe('DocumentViewerScreen', () => {
  let store: any;

  const mockNavigation = {
    setOptions: jest.fn(),
    goBack: jest.fn(),
  };

  const mockRoute = {
    params: {
      leagueId: 'league-1',
      documentId: 'doc-1',
      documentName: 'League Rules.pdf',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock store
    store = configureStore({
      reducer: {
        auth: authReducer,
        leagues: leaguesReducer,
      },
      preloadedState: {
        auth: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
          },
          isAuthenticated: true,
          loading: false,
          error: null,
        },
        leagues: {
          leagues: [],
          currentLeague: null,
          standings: [],
          playerRankings: [],
          documents: [],
          loading: false,
          error: null,
        },
      },
    });
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(<Provider store={store}>{component}</Provider>);
  };

  describe('Document Loading', () => {
    it('should display loading state initially', () => {
      (leagueService.downloadDocument as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByText } = renderWithProvider(
        <DocumentViewerScreen route={mockRoute} navigation={mockNavigation} />
      );

      expect(getByText('Loading document...')).toBeTruthy();
    });

    it('should load document successfully', async () => {
      const mockDocumentData = {
        url: 'https://example.com/document.pdf',
        fileName: 'League Rules.pdf',
        mimeType: 'application/pdf',
      };

      (leagueService.downloadDocument as jest.Mock).mockResolvedValue(mockDocumentData);

      const { queryByText } = renderWithProvider(
        <DocumentViewerScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(queryByText('Loading document...')).toBeNull();
      });

      expect(leagueService.downloadDocument).toHaveBeenCalledWith('league-1', 'doc-1');
    });

    it('should display error state when loading fails', async () => {
      (leagueService.downloadDocument as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = renderWithProvider(
        <DocumentViewerScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Failed to Load Document')).toBeTruthy();
        expect(getByText('Network error')).toBeTruthy();
      });
    });
  });

  describe('Document Viewing', () => {
    it('should set header title to document name', async () => {
      const mockDocumentData = {
        url: 'https://example.com/document.pdf',
        fileName: 'League Rules.pdf',
        mimeType: 'application/pdf',
      };

      (leagueService.downloadDocument as jest.Mock).mockResolvedValue(mockDocumentData);

      renderWithProvider(<DocumentViewerScreen route={mockRoute} navigation={mockNavigation} />);

      await waitFor(() => {
        expect(mockNavigation.setOptions).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'League Rules.pdf',
          })
        );
      });
    });

    it('should display WebView on mobile platforms', async () => {
      Platform.OS = 'ios';

      const mockDocumentData = {
        url: 'https://example.com/document.pdf',
        fileName: 'League Rules.pdf',
        mimeType: 'application/pdf',
      };

      (leagueService.downloadDocument as jest.Mock).mockResolvedValue(mockDocumentData);

      const { UNSAFE_getByType } = renderWithProvider(
        <DocumentViewerScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(UNSAFE_getByType('WebView')).toBeTruthy();
      });
    });
  });

  describe('Download Functionality', () => {
    it('should provide retry button on error', async () => {
      (leagueService.downloadDocument as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = renderWithProvider(
        <DocumentViewerScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Retry')).toBeTruthy();
      });

      // Clear the mock and set up success response
      (leagueService.downloadDocument as jest.Mock).mockResolvedValue({
        url: 'https://example.com/document.pdf',
        fileName: 'League Rules.pdf',
        mimeType: 'application/pdf',
      });

      // Click retry
      fireEvent.press(getByText('Retry'));

      await waitFor(() => {
        expect(leagueService.downloadDocument).toHaveBeenCalledTimes(2);
      });
    });

    it('should provide download fallback button on error', async () => {
      (leagueService.downloadDocument as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = renderWithProvider(
        <DocumentViewerScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Try Download Instead')).toBeTruthy();
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('should track document load time', async () => {
      const mockDocumentData = {
        url: 'https://example.com/document.pdf',
        fileName: 'League Rules.pdf',
        mimeType: 'application/pdf',
      };

      (leagueService.downloadDocument as jest.Mock).mockResolvedValue(mockDocumentData);

      const { performanceMonitoringService } = require('../../../src/services/monitoring/PerformanceMonitoringService');

      renderWithProvider(<DocumentViewerScreen route={mockRoute} navigation={mockNavigation} />);

      await waitFor(() => {
        expect(performanceMonitoringService.recordMetric).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'document_load_time',
            unit: 'ms',
            metadata: expect.objectContaining({
              leagueId: 'league-1',
              documentId: 'doc-1',
              fileName: 'League Rules.pdf',
            }),
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing document URL gracefully', async () => {
      (leagueService.downloadDocument as jest.Mock).mockResolvedValue({
        url: null,
        fileName: 'League Rules.pdf',
        mimeType: 'application/pdf',
      });

      const { getByText } = renderWithProvider(
        <DocumentViewerScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Failed to Load Document')).toBeTruthy();
        expect(getByText('Document URL not available')).toBeTruthy();
      });
    });

    it('should handle WebView errors', async () => {
      const mockDocumentData = {
        url: 'https://example.com/document.pdf',
        fileName: 'League Rules.pdf',
        mimeType: 'application/pdf',
      };

      (leagueService.downloadDocument as jest.Mock).mockResolvedValue(mockDocumentData);

      const { UNSAFE_getByType } = renderWithProvider(
        <DocumentViewerScreen route={mockRoute} navigation={mockNavigation} />
      );

      await waitFor(() => {
        const webView = UNSAFE_getByType('WebView');
        expect(webView).toBeTruthy();

        // Simulate WebView error
        if (webView.props.onError) {
          webView.props.onError({
            nativeEvent: { description: 'Failed to load' },
          });
        }
      });
    });
  });
});
