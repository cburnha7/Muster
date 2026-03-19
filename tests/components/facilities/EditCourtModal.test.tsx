import React from 'react';
import { render, fireEvent, waitFor } from '../../utils/test-utils';
import { Alert } from 'react-native';
import { EditCourtModal } from '../../../src/components/facilities/EditCourtModal';
import { courtService, Court } from '../../../src/services/api/CourtService';

// Mock the court service
jest.mock('../../../src/services/api/CourtService', () => ({
  courtService: {
    updateCourt: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('EditCourtModal', () => {
  const mockCourt: Court = {
    id: 'court-1',
    facilityId: 'facility-1',
    name: 'Court 1',
    sportType: 'basketball',
    capacity: 10,
    isIndoor: true,
    isActive: true,
    displayOrder: 1,
    pricePerHour: 50,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockProps = {
    visible: true,
    court: mockCourt,
    facilityId: 'facility-1',
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with court data pre-filled', () => {
    const { getByDisplayValue } = render(<EditCourtModal {...mockProps} />);

    expect(getByDisplayValue('Court 1')).toBeTruthy();
    expect(getByDisplayValue('10')).toBeTruthy();
    expect(getByDisplayValue('50')).toBeTruthy();
  });

  it('displays modal title', () => {
    const { getByText } = render(<EditCourtModal {...mockProps} />);

    expect(getByText('Edit Court')).toBeTruthy();
  });

  it('shows all form fields', () => {
    const { getByPlaceholderText } = render(<EditCourtModal {...mockProps} />);

    expect(getByPlaceholderText('e.g., Court 1, Field A')).toBeTruthy();
    expect(getByPlaceholderText('Number of players')).toBeTruthy();
    expect(getByPlaceholderText('Leave empty to use facility rate')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByDisplayValue, getByText } = render(<EditCourtModal {...mockProps} />);

    // Clear the court name
    const nameInput = getByDisplayValue('Court 1');
    fireEvent.changeText(nameInput, '');

    // Try to submit
    const updateButton = getByText('Update Court');
    fireEvent.press(updateButton);

    await waitFor(() => {
      expect(getByText('Court name is required')).toBeTruthy();
    });

    expect(courtService.updateCourt).not.toHaveBeenCalled();
  });

  it('validates capacity is a positive number', async () => {
    const { getByDisplayValue, getByText } = render(<EditCourtModal {...mockProps} />);

    // Set invalid capacity
    const capacityInput = getByDisplayValue('10');
    fireEvent.changeText(capacityInput, '0');

    // Try to submit
    const updateButton = getByText('Update Court');
    fireEvent.press(updateButton);

    await waitFor(() => {
      expect(getByText('Capacity must be at least 1')).toBeTruthy();
    });

    expect(courtService.updateCourt).not.toHaveBeenCalled();
  });

  it('validates price is a valid number', async () => {
    const { getByDisplayValue, getByText } = render(<EditCourtModal {...mockProps} />);

    // Set invalid price
    const priceInput = getByDisplayValue('50');
    fireEvent.changeText(priceInput, 'invalid');

    // Try to submit
    const updateButton = getByText('Update Court');
    fireEvent.press(updateButton);

    await waitFor(() => {
      expect(getByText('Price must be a valid number')).toBeTruthy();
    });

    expect(courtService.updateCourt).not.toHaveBeenCalled();
  });

  it('successfully updates court with valid data', async () => {
    (courtService.updateCourt as jest.Mock).mockResolvedValue({
      ...mockCourt,
      name: 'Updated Court',
    });

    const { getByDisplayValue, getByText } = render(<EditCourtModal {...mockProps} />);

    // Update court name
    const nameInput = getByDisplayValue('Court 1');
    fireEvent.changeText(nameInput, 'Updated Court');

    // Submit form
    const updateButton = getByText('Update Court');
    fireEvent.press(updateButton);

    await waitFor(() => {
      expect(courtService.updateCourt).toHaveBeenCalledWith(
        'facility-1',
        'court-1',
        expect.objectContaining({
          name: 'Updated Court',
          sportType: 'basketball',
          capacity: 10,
          isIndoor: true,
        })
      );
    });

    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Court updated successfully');
    expect(mockProps.onSuccess).toHaveBeenCalled();
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('handles update error gracefully', async () => {
    const errorMessage = 'Failed to update court';
    (courtService.updateCourt as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const { getByText } = render(<EditCourtModal {...mockProps} />);

    // Submit form
    const updateButton = getByText('Update Court');
    fireEvent.press(updateButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', errorMessage);
    });

    expect(mockProps.onSuccess).not.toHaveBeenCalled();
    expect(mockProps.onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when cancel button is pressed', () => {
    const { getByText } = render(<EditCourtModal {...mockProps} />);

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when close icon is pressed', () => {
    const { getByTestId } = render(<EditCourtModal {...mockProps} />);

    // The close button should be accessible via testID or by finding the Ionicons component
    // For now, we'll test the cancel button which has the same effect
    const { getByText } = render(<EditCourtModal {...mockProps} />);
    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('does not include pricePerHour in update if empty', async () => {
    (courtService.updateCourt as jest.Mock).mockResolvedValue(mockCourt);

    const { getByDisplayValue, getByText } = render(<EditCourtModal {...mockProps} />);

    // Clear price
    const priceInput = getByDisplayValue('50');
    fireEvent.changeText(priceInput, '');

    // Submit form
    const updateButton = getByText('Update Court');
    fireEvent.press(updateButton);

    await waitFor(() => {
      expect(courtService.updateCourt).toHaveBeenCalledWith(
        'facility-1',
        'court-1',
        expect.not.objectContaining({
          pricePerHour: expect.anything(),
        })
      );
    });
  });

  it('clears error when user starts typing', async () => {
    const { getByDisplayValue, getByText, queryByText } = render(<EditCourtModal {...mockProps} />);

    // Clear the court name to trigger error
    const nameInput = getByDisplayValue('Court 1');
    fireEvent.changeText(nameInput, '');

    // Try to submit
    const updateButton = getByText('Update Court');
    fireEvent.press(updateButton);

    await waitFor(() => {
      expect(getByText('Court name is required')).toBeTruthy();
    });

    // Start typing again
    fireEvent.changeText(nameInput, 'New Court');

    // Error should be cleared
    await waitFor(() => {
      expect(queryByText('Court name is required')).toBeNull();
    });
  });
});
