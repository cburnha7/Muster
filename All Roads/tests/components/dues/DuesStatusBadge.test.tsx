import React from 'react';
import { render } from '@testing-library/react-native';
import { DuesStatusBadge } from '../../../src/components/dues/DuesStatusBadge';

describe('DuesStatusBadge', () => {
  it('renders paid status with correct label', () => {
    const { getByText } = render(<DuesStatusBadge status="paid" />);
    expect(getByText('Paid')).toBeTruthy();
  });

  it('renders pending status with correct label', () => {
    const { getByText } = render(<DuesStatusBadge status="pending" />);
    expect(getByText('Pending')).toBeTruthy();
  });

  it('renders unpaid status with correct label', () => {
    const { getByText } = render(<DuesStatusBadge status="unpaid" />);
    expect(getByText('Unpaid')).toBeTruthy();
  });

  it('renders compact mode without label text', () => {
    const { queryByText } = render(<DuesStatusBadge status="paid" compact />);
    expect(queryByText('Paid')).toBeNull();
  });
});
