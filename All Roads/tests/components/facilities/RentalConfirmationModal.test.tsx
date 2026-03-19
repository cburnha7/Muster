import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RentalConfirmationModal } from '../../../src/components/facilities/RentalConfirmationModal';

describe('RentalConfirmationModal', () => {
  const mockProps = {
    visible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    facilityName: 'Test Facility',
    courtName: 'Court 1',
    date: '2024-01-15',
    startTime: '10:00',
    endTime: '11:00',
    price: 50,
  };

  it('renders correctly when visible', () => {
    const { getByText } = render(<RentalConfirmationModal {...mockProps} />);
    
    expect(getByText('Confirm Rental')).toBeTruthy();
    expect(getByText('Test Facility')).toBeTruthy();
    expect(getByText('Court 1')).toBeTruthy();
  });

  it('calls onClose when cancel button is pressed', () => {
    const { getByText } = render(<RentalConfirmationModal {...mockProps} />);
    
    fireEvent.press(getByText('Cancel'));
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls onConfirm when confirm button is pressed', () => {
    const { getByText } = render(<RentalConfirmationModal {...mockProps} />);
    
    fireEvent.press(getByText('Confirm Booking'));
    expect(mockProps.onConfirm).toHaveBeenCalledWith();
  });

  it('displays the correct price', () => {
    const { getByText } = render(<RentalConfirmationModal {...mockProps} />);
    
    expect(getByText('$50.00')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <RentalConfirmationModal {...mockProps} visible={false} />
    );
    
    expect(queryByText('Confirm Rental')).toBeNull();
  });

  describe('policy acknowledgement', () => {
    const policyProps = {
      ...mockProps,
      onConfirm: jest.fn(),
      cancellationPolicy: {
        noticeWindowHours: 24,
        teamPenaltyPct: 50,
        penaltyDestination: 'facility' as const,
      },
    };

    it('shows acknowledgement checkbox when cancellation policy is present', () => {
      const { getByText } = render(<RentalConfirmationModal {...policyProps} />);

      expect(
        getByText("I acknowledge and accept the facility's cancellation policy")
      ).toBeTruthy();
    });

    it('does not show acknowledgement checkbox when no cancellation policy', () => {
      const { queryByText } = render(<RentalConfirmationModal {...mockProps} />);

      expect(
        queryByText("I acknowledge and accept the facility's cancellation policy")
      ).toBeNull();
    });

    it('disables confirm button until policy is acknowledged', () => {
      const { getByTestId } = render(<RentalConfirmationModal {...policyProps} />);

      const confirmButton = getByTestId('confirm-booking-button');
      expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('enables confirm button after policy is acknowledged', () => {
      const { getByTestId } = render(<RentalConfirmationModal {...policyProps} />);

      const checkbox = getByTestId('policy-acknowledgement-checkbox');
      fireEvent.press(checkbox);

      const confirmButton = getByTestId('confirm-booking-button');
      expect(confirmButton.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('sends policyAcknowledgedAt timestamp on confirm when policy acknowledged', () => {
      const { getByTestId } = render(<RentalConfirmationModal {...policyProps} />);

      const checkbox = getByTestId('policy-acknowledgement-checkbox');
      fireEvent.press(checkbox);

      const confirmButton = getByTestId('confirm-booking-button');
      fireEvent.press(confirmButton);

      expect(policyProps.onConfirm).toHaveBeenCalledTimes(1);
      const arg = policyProps.onConfirm.mock.calls[0][0];
      expect(typeof arg).toBe('string');
      // Should be a valid ISO date string
      expect(new Date(arg).toISOString()).toBe(arg);
    });

    it('toggles checkbox off when pressed twice', () => {
      const { getByTestId } = render(<RentalConfirmationModal {...policyProps} />);

      const checkbox = getByTestId('policy-acknowledgement-checkbox');
      fireEvent.press(checkbox);
      fireEvent.press(checkbox);

      const confirmButton = getByTestId('confirm-booking-button');
      expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
    });
  });
});
