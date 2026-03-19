import React from 'react';
import { render, fireEvent } from '../../utils/test-utils';
import { Alert } from 'react-native';
import { CourtListManager } from '../../../src/components/facilities/CourtListManager';
import { courtService, Court } from '../../../src/services/api/CourtService';

// Mock the court service
jest.mock('../../../src/services/api/CourtService', () => ({
  courtService: {
    deleteCourt: jest.fn(),
    updateCourt: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('CourtListManager', () => {
  const mockCourts: Court[] = [
    {
      id: '1',
      facilityId: 'facility-1',
      name: 'Court 1',
      sportType: 'Basketball',
      capacity: 10,
      isIndoor: true,
      isActive: true,
      displayOrder: 1,
      pricePerHour: 50,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      facilityId: 'facility-1',
      name: 'Court 2',
      sportType: 'Tennis',
      capacity: 4,
      isIndoor: false,
      isActive: false,
      displayOrder: 2,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockProps = {
    courts: mockCourts,
    facilityId: 'facility-1',
    onCourtUpdated: jest.fn(),
    onEditCourt: jest.fn(),
    onAddCourt: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders court list correctly', () => {
    const { getByText } = render(<CourtListManager {...mockProps} />);

    expect(getByText('Court 1')).toBeTruthy();
    expect(getByText('Court 2')).toBeTruthy();
    expect(getByText('Basketball • Indoor • Capacity: 10')).toBeTruthy();
    expect(getByText('Tennis • Outdoor • Capacity: 4')).toBeTruthy();
  });

  it('displays active and inactive status correctly', () => {
    const { getAllByText } = render(<CourtListManager {...mockProps} />);

    const activeStatus = getAllByText('Active');
    const inactiveStatus = getAllByText('Inactive');

    expect(activeStatus.length).toBeGreaterThan(0);
    expect(inactiveStatus.length).toBeGreaterThan(0);
  });

  it('displays price when available', () => {
    const { getByText } = render(<CourtListManager {...mockProps} />);

    expect(getByText('$50/hour')).toBeTruthy();
  });

  it('calls onEditCourt when edit button is pressed', () => {
    const { getAllByText } = render(<CourtListManager {...mockProps} />);

    const editButtons = getAllByText('Edit');
    fireEvent.press(editButtons[0]);

    expect(mockProps.onEditCourt).toHaveBeenCalledWith(mockCourts[0]);
  });

  it('shows empty state when no courts', () => {
    const emptyProps = { ...mockProps, courts: [] };
    const { getByText } = render(<CourtListManager {...emptyProps} />);

    expect(getByText('No Courts Yet')).toBeTruthy();
    expect(getByText('Add courts or fields to start managing availability and rentals')).toBeTruthy();
  });

  it('calls onAddCourt when empty state button is pressed', () => {
    const emptyProps = { ...mockProps, courts: [] };
    const { getByText } = render(<CourtListManager {...emptyProps} />);

    const addButton = getByText('Add Your First Court');
    fireEvent.press(addButton);

    expect(mockProps.onAddCourt).toHaveBeenCalled();
  });

  it('shows confirmation alert when delete is pressed', () => {
    const { getAllByText } = render(<CourtListManager {...mockProps} />);

    const deleteButtons = getAllByText('Delete');
    fireEvent.press(deleteButtons[0]);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Court',
      'Are you sure you want to delete "Court 1"? This action cannot be undone.',
      expect.any(Array)
    );
  });

  it('displays activate/deactivate button based on court status', () => {
    const { getAllByText } = render(<CourtListManager {...mockProps} />);

    expect(getAllByText('Deactivate').length).toBeGreaterThan(0);
    expect(getAllByText('Activate').length).toBeGreaterThan(0);
  });
});
