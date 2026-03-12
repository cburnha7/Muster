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
    expect(mockProps.onConfirm).toHaveBeenCalled();
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
});
