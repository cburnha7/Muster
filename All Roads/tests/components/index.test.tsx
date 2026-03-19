// Basic component tests
import React from 'react';
import { render, screen } from '../utils/test-utils';
import HomeScreen from '../../app/index';

describe('HomeScreen', () => {
  it('renders welcome message', () => {
    render(<HomeScreen />);
    
    expect(screen.getByText('Sports Booking App')).toBeTruthy();
    expect(screen.getByText('Welcome to your sports booking platform')).toBeTruthy();
  });
});