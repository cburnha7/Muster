import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen, RegisterScreen, ForgotPasswordScreen } from '../../src/screens/auth';

// Mock the auth context
const mockAuthContext = {
  login: jest.fn(),
  register: jest.fn(),
  isLoading: false,
  error: null,
  clearError: jest.fn(),
};

jest.mock('../../src/services/auth', () => ({
  useAuthContext: () => mockAuthContext,
}));

describe('Authentication Screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginScreen', () => {
    const mockProps = {
      onNavigateToRegister: jest.fn(),
      onNavigateToForgotPassword: jest.fn(),
      onLoginSuccess: jest.fn(),
    };

    it('renders login form correctly', () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginScreen {...mockProps} />
      );

      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(getByPlaceholderText('Enter your password')).toBeTruthy();
      expect(getByText('Sign In')).toBeTruthy();
      expect(getByText('Remember me')).toBeTruthy();
    });

    it('validates email format', async () => {
      const { getByPlaceholderText, getByText, findByText } = render(
        <LoginScreen {...mockProps} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const loginButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(findByText('Please enter a valid email address')).toBeTruthy();
      });
    });

    it('validates password requirement', async () => {
      const { getByPlaceholderText, getByText, findByText } = render(
        <LoginScreen {...mockProps} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const loginButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(findByText('Password is required')).toBeTruthy();
      });
    });
  });

  describe('RegisterScreen', () => {
    const mockProps = {
      onNavigateToLogin: jest.fn(),
      onRegisterSuccess: jest.fn(),
    };

    it('renders registration form correctly', () => {
      const { getByPlaceholderText, getByText } = render(
        <RegisterScreen {...mockProps} />
      );

      expect(getByPlaceholderText('First name')).toBeTruthy();
      expect(getByPlaceholderText('Last name')).toBeTruthy();
      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(getByPlaceholderText('Create a password')).toBeTruthy();
      expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
      expect(getByText('Create Account')).toBeTruthy();
    });

    it('validates required fields', async () => {
      const { getByText, findByText } = render(
        <RegisterScreen {...mockProps} />
      );

      const registerButton = getByText('Create Account');
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(findByText('Email is required')).toBeTruthy();
        expect(findByText('First name is required')).toBeTruthy();
        expect(findByText('Last name is required')).toBeTruthy();
      });
    });

    it('validates password confirmation', async () => {
      const { getByPlaceholderText, getByText, findByText } = render(
        <RegisterScreen {...mockProps} />
      );

      const passwordInput = getByPlaceholderText('Create a password');
      const confirmPasswordInput = getByPlaceholderText('Confirm your password');
      const registerButton = getByText('Create Account');

      fireEvent.changeText(passwordInput, 'Password123!');
      fireEvent.changeText(confirmPasswordInput, 'DifferentPassword');
      fireEvent.press(registerButton);

      await waitFor(() => {
        expect(findByText('Passwords do not match')).toBeTruthy();
      });
    });
  });

  describe('ForgotPasswordScreen', () => {
    const mockProps = {
      onNavigateToLogin: jest.fn(),
      onResetSuccess: jest.fn(),
    };

    it('renders forgot password form correctly', () => {
      const { getByPlaceholderText, getByText } = render(
        <ForgotPasswordScreen {...mockProps} />
      );

      expect(getByPlaceholderText('Enter your email address')).toBeTruthy();
      expect(getByText('Send Reset Instructions')).toBeTruthy();
      expect(getByText('← Back to Sign In')).toBeTruthy();
    });

    it('validates email requirement', async () => {
      const { getByText, findByText } = render(
        <ForgotPasswordScreen {...mockProps} />
      );

      const resetButton = getByText('Send Reset Instructions');
      fireEvent.press(resetButton);

      await waitFor(() => {
        expect(findByText('Email is required')).toBeTruthy();
      });
    });

    it('shows success screen after email submission', async () => {
      const { getByPlaceholderText, getByText, findByText } = render(
        <ForgotPasswordScreen {...mockProps} />
      );

      const emailInput = getByPlaceholderText('Enter your email address');
      const resetButton = getByText('Send Reset Instructions');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.press(resetButton);

      await waitFor(() => {
        expect(findByText('Check Your Email')).toBeTruthy();
      });
    });
  });
});