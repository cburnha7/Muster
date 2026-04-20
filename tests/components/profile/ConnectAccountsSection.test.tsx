import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ConnectAccountsSection } from '../../../src/components/profile/ConnectAccountsSection';

// Mock useAuth
const mockUseAuth = jest.fn();
jest.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock TokenStorage
jest.mock('../../../src/services/auth/TokenStorage', () => ({
  __esModule: true,
  default: {
    getAccessToken: jest.fn().mockResolvedValue('test-token'),
  },
}));

// Mock useFocusEffect (global setup only mocks useNavigation/useRoute)
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
}));

// Mock Linking
import { Linking } from 'react-native';

// Mock fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ token: 'test-token', user: { id: 'user-1' } });
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
});

describe('ConnectAccountsSection', () => {
  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
    const { getByText } = render(<ConnectAccountsSection userId="user-1" />);
    expect(getByText('Stripe Connect')).toBeTruthy();
  });

  it('shows empty message when user manages no entities', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accounts: [] }),
    });

    const { getByText } = render(<ConnectAccountsSection userId="user-1" />);

    await waitFor(() => {
      expect(
        getByText("You don't manage any rosters, facilities, or leagues yet.")
      ).toBeTruthy();
    });
  });

  it('displays entities with Active status badge', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accounts: [
          {
            entityType: 'roster',
            entityId: 'r1',
            entityName: 'Weekend Warriors',
            accountId: 'acct_123',
            status: {
              chargesEnabled: true,
              payoutsEnabled: true,
              detailsSubmitted: true,
            },
          },
        ],
      }),
    });

    const { getByText, queryByText } = render(
      <ConnectAccountsSection userId="user-1" />
    );

    await waitFor(() => {
      expect(getByText('Weekend Warriors')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
      // Active accounts should not show a Set Up / Resume button
      expect(queryByText('Set Up')).toBeNull();
      expect(queryByText('Resume')).toBeNull();
    });
  });

  it('displays Pending badge and Resume button for partially onboarded entity', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accounts: [
          {
            entityType: 'facility',
            entityId: 'f1',
            entityName: 'Downtown Courts',
            accountId: 'acct_456',
            status: {
              chargesEnabled: false,
              payoutsEnabled: false,
              detailsSubmitted: true,
            },
          },
        ],
      }),
    });

    const { getByText } = render(<ConnectAccountsSection userId="user-1" />);

    await waitFor(() => {
      expect(getByText('Downtown Courts')).toBeTruthy();
      expect(getByText('Pending')).toBeTruthy();
      expect(getByText('Resume')).toBeTruthy();
    });
  });

  it('displays Not Set Up badge and Set Up button for entity without account', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accounts: [
          {
            entityType: 'league',
            entityId: 'l1',
            entityName: 'City League',
            accountId: null,
            status: null,
          },
        ],
      }),
    });

    const { getByText } = render(<ConnectAccountsSection userId="user-1" />);

    await waitFor(() => {
      expect(getByText('City League')).toBeTruthy();
      expect(getByText('Not Set Up')).toBeTruthy();
      expect(getByText('Set Up')).toBeTruthy();
    });
  });

  it('calls onboard endpoint and opens URL when Set Up is pressed', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accounts: [
            {
              entityType: 'roster',
              entityId: 'r1',
              entityName: 'My Roster',
              accountId: null,
              status: null,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://connect.stripe.com/setup/abc' }),
      });

    const { getByText } = render(<ConnectAccountsSection userId="user-1" />);

    await waitFor(() => expect(getByText('Set Up')).toBeTruthy());
    fireEvent.press(getByText('Set Up'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [onboardUrl, onboardOpts] = mockFetch.mock.calls[1];
      expect(onboardUrl).toContain('/connect/onboard');
      expect(onboardOpts.method).toBe('POST');
      expect(onboardOpts.headers['Authorization']).toBe('Bearer test-token');
      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://connect.stripe.com/setup/abc'
      );
    });
  });

  it('sends auth headers with fetch requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accounts: [] }),
    });

    render(<ConnectAccountsSection userId="user-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers['Authorization']).toBe('Bearer test-token');
    });
  });

  it('handles API error gracefully by showing empty list', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { getByText } = render(<ConnectAccountsSection userId="user-1" />);

    await waitFor(() => {
      expect(
        getByText("You don't manage any rosters, facilities, or leagues yet.")
      ).toBeTruthy();
    });
  });

  it('collapses and expands when header is pressed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accounts: [
          {
            entityType: 'roster',
            entityId: 'r1',
            entityName: 'My Roster',
            accountId: null,
            status: null,
          },
        ],
      }),
    });

    const { getByText, queryByText } = render(
      <ConnectAccountsSection userId="user-1" />
    );

    await waitFor(() => expect(getByText('My Roster')).toBeTruthy());

    // Collapse
    fireEvent.press(getByText('Stripe Connect'));
    expect(queryByText('My Roster')).toBeNull();

    // Expand
    fireEvent.press(getByText('Stripe Connect'));
    expect(getByText('My Roster')).toBeTruthy();
  });
});
