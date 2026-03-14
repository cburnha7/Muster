import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { InfoTab } from '../../../../src/screens/leagues/tabs/InfoTab';
import { leagueService } from '../../../../src/services/api/LeagueService';
import { League, LeagueDocument } from '../../../../src/types/league';

// Mock dependencies
jest.mock('../../../../src/services/api/LeagueService');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../../src/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: () => {
    const { Text } = require('react-native');
    return <Text testID="loading-spinner">Loading...</Text>;
  },
}));

jest.mock('../../../../src/components/ui/ErrorDisplay', () => ({
  ErrorDisplay: ({ message, onRetry }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <View>
        <Text>{message}</Text>
        <TouchableOpacity onPress={onRetry}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  },
}));

describe('InfoTab', () => {
  const mockLeague: League = {
    id: 'league-1',
    name: 'Summer Soccer League',
    description: 'A competitive summer soccer league for all skill levels.',
    sportType: 'soccer',
    skillLevel: 'intermediate',
    isActive: true,
    pointsConfig: {
      win: 3,
      draw: 1,
      loss: 0,
    },
    isCertified: false,
    organizerId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockDocuments: LeagueDocument[] = [
    {
      id: 'doc-1',
      leagueId: 'league-1',
      fileName: 'League Rules.pdf',
      fileUrl: 'https://example.com/rules.pdf',
      fileSize: 1024000,
      mimeType: 'application/pdf',
      documentType: 'rules',
      uploadedAt: new Date('2024-01-15'),
      uploadedBy: 'user-1',
    },
    {
      id: 'doc-2',
      leagueId: 'league-1',
      fileName: 'Match Schedule.pdf',
      fileUrl: 'https://example.com/schedule.pdf',
      fileSize: 512000,
      mimeType: 'application/pdf',
      documentType: 'schedule',
      uploadedAt: new Date('2024-01-20'),
      uploadedBy: 'user-1',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (leagueService.getDocuments as jest.Mock).mockResolvedValue(mockDocuments);
  });

  describe('Description Section', () => {
    it('should display league description when available', async () => {
      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        expect(screen.getByText('About')).toBeTruthy();
        expect(screen.getByText(mockLeague.description!)).toBeTruthy();
      });
    });

    it('should not display description section when description is missing', async () => {
      const leagueWithoutDescription = { ...mockLeague, description: undefined };
      render(<InfoTab league={leagueWithoutDescription} />);

      await waitFor(() => {
        expect(screen.queryByText('About')).toBeNull();
      });
    });
  });

  describe('Points System Section', () => {
    it('should display points system configuration', async () => {
      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        expect(screen.getByText('Points System')).toBeTruthy();
        expect(screen.getByText('Win')).toBeTruthy();
        expect(screen.getByText('3 pts')).toBeTruthy();
        expect(screen.getByText('Draw')).toBeTruthy();
        expect(screen.getByText('1 pts')).toBeTruthy();
        expect(screen.getByText('Loss')).toBeTruthy();
        expect(screen.getByText('0 pts')).toBeTruthy();
      });
    });

    it('should display custom points configuration', async () => {
      const customLeague = {
        ...mockLeague,
        pointsConfig: { win: 5, draw: 2, loss: 1 },
      };
      render(<InfoTab league={customLeague} />);

      await waitFor(() => {
        expect(screen.getByText('5 pts')).toBeTruthy();
        expect(screen.getByText('2 pts')).toBeTruthy();
        expect(screen.getByText('1 pts')).toBeTruthy();
      });
    });
  });

  describe('League Documents Section', () => {
    it('should load and display league documents', async () => {
      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        expect(leagueService.getDocuments).toHaveBeenCalledWith('league-1');
        expect(screen.getByText('League Documents')).toBeTruthy();
        expect(screen.getByText('League Rules.pdf')).toBeTruthy();
        expect(screen.getByText('Match Schedule.pdf')).toBeTruthy();
      });
    });

    it('should display document metadata (size and date)', async () => {
      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        expect(screen.getByText('1000.0 KB')).toBeTruthy();
        expect(screen.getByText('500.0 KB')).toBeTruthy();
      });
    });

    it('should display View button for each document', async () => {
      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        const viewButtons = screen.getAllByText('View');
        expect(viewButtons).toHaveLength(2);
      });
    });

    it('should navigate to DocumentViewer when View button is pressed', async () => {
      const mockNavigate = jest.fn();
      jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
        navigate: mockNavigate,
      });

      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        const viewButtons = screen.getAllByText('View');
        fireEvent.press(viewButtons[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('DocumentViewer', {
        leagueId: 'league-1',
        documentId: 'doc-1',
        documentName: 'League Rules.pdf',
      });
    });

    it('should not display documents section when no documents exist', async () => {
      (leagueService.getDocuments as jest.Mock).mockResolvedValue([]);
      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        expect(screen.queryByText('League Documents')).toBeNull();
      });
    });
  });

  describe('Certification Section', () => {
    it('should display certification info for certified leagues', async () => {
      const certifiedLeague: League = {
        ...mockLeague,
        isCertified: true,
        certifiedAt: new Date('2024-02-01'),
      };
      render(<InfoTab league={certifiedLeague} />);

      await waitFor(() => {
        expect(screen.getByText('Certified League')).toBeTruthy();
        expect(
          screen.getByText(/This league has been certified with official documentation/)
        ).toBeTruthy();
        expect(screen.getByText(/Certified on/)).toBeTruthy();
      });
    });

    it('should not display certification section for non-certified leagues', async () => {
      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        expect(screen.queryByText('Certified League')).toBeNull();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no content is available', async () => {
      (leagueService.getDocuments as jest.Mock).mockResolvedValue([]);
      const minimalLeague = {
        ...mockLeague,
        description: undefined,
        isCertified: false,
      };
      render(<InfoTab league={minimalLeague} />);

      await waitFor(() => {
        expect(screen.getByText('No additional information available')).toBeTruthy();
      });
    });

    it('should not display empty state when content is available', async () => {
      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        expect(screen.queryByText('No additional information available')).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when document loading fails', async () => {
      const errorMessage = 'Failed to load documents';
      (leagueService.getDocuments as jest.Mock).mockRejectedValue(new Error(errorMessage));

      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeTruthy();
      });
    });

    it('should allow retry after error', async () => {
      (leagueService.getDocuments as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });

      // Mock successful retry
      (leagueService.getDocuments as jest.Mock).mockResolvedValue(mockDocuments);

      const retryButton = screen.getByText('Retry');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(screen.getByText('League Documents')).toBeTruthy();
      });
    });
  });

  describe('Loading State', () => {
    it('should display loading spinner while fetching documents', () => {
      (leagueService.getDocuments as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<InfoTab league={mockLeague} />);

      expect(screen.getByTestId('loading-spinner')).toBeTruthy();
    });
  });

  describe('Refresh Functionality', () => {
    it('should reload documents on pull-to-refresh', async () => {
      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        expect(screen.getByText('League Documents')).toBeTruthy();
      });

      // Clear the mock to verify it's called again
      (leagueService.getDocuments as jest.Mock).mockClear();

      // Simulate pull-to-refresh via the ScrollView's refreshControl
      const scrollView = screen.getByTestId('info-tab-scroll-view');
      const { refreshControl } = scrollView.props;
      
      // Trigger the onRefresh callback directly
      await waitFor(() => {
        refreshControl.props.onRefresh();
      });

      await waitFor(() => {
        expect(leagueService.getDocuments).toHaveBeenCalledWith('league-1');
      });
    });
  });

  describe('File Size Formatting', () => {
    it('should format file sizes correctly', async () => {
      const documentsWithVariousSizes: LeagueDocument[] = [
        {
          ...mockDocuments[0],
          id: 'doc-bytes',
          fileName: 'Small.pdf',
          fileSize: 500, // 500 B
        },
        {
          ...mockDocuments[0],
          id: 'doc-kb',
          fileName: 'Medium.pdf',
          fileSize: 50000, // ~48.8 KB
        },
        {
          ...mockDocuments[0],
          id: 'doc-mb',
          fileName: 'Large.pdf',
          fileSize: 5000000, // ~4.8 MB
        },
      ];

      (leagueService.getDocuments as jest.Mock).mockResolvedValue(documentsWithVariousSizes);

      render(<InfoTab league={mockLeague} />);

      await waitFor(() => {
        expect(screen.getByText('500 B')).toBeTruthy();
        expect(screen.getByText('48.8 KB')).toBeTruthy();
        expect(screen.getByText('4.8 MB')).toBeTruthy();
      });
    });
  });
});
