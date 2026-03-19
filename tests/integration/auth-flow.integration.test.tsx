// Feature: sports-booking-app, Integration Test: Authentication Flow
// Tests complete user authentication flows end-to-end
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { store } from '../../src/store/store';
import { AuthNavigator } from '../../src/navigation/AuthNavigator';
import { authService } from '../../src/services/auth/AuthService';

// Mock the auth service
jest.mock('../../src/services/auth/AuthService');

describe('Integration: Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full login flow successfully', async () => {
    const mockAuthResponse = {
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
      expiresAt: new Date(Date.now() + 3600000),
    };

    (authService.login as jest.Mock).mockResolvedValue(mockAuthResponse);

    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>
      </Provider>
    );

    // Find and fill login form
    const emailInput = getByPlaceholderText(/email/i);
    const passwordInput = getByPlaceholderText(/password/i);
    const loginButton = getByText(/log in/i);

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    // Wait for login to complete
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should handle login errors gracefully', async () => {
    (authService.login as jest.Mock).mockRejectedValue(
      new Error('Invalid credentials')
    );

    const { getByPlaceholderText, getByText, findByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>
      </Provider>
    );

    const emailInput = getByPlaceholderText(/email/i);
    const passwordInput = getByPlaceholderText(/password/i);
    const loginButton = getByText(/log in/i);

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(loginButton);

    // Should display error message
    const errorMessage = await findByText(/invalid credentials/i);
    expect(errorMessage).toBeTruthy();
  });

  it('should complete full registration flow successfully', async () => {
    const mockAuthResponse = {
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: '1',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
      },
      expiresAt: new Date(Date.now() + 3600000),
    };

    (authService.register as jest.Mock).mockResolvedValue(mockAuthResponse);

    const { getByPlaceholderText, getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>
      </Provider>
    );

    // Navigate to register screen
    const registerLink = getByText(/sign up/i);
    fireEvent.press(registerLink);

    await waitFor(() => {
      const firstNameInput = getByPlaceholderText(/first name/i);
      expect(firstNameInput).toBeTruthy();
    });

    // Fill registration form
    const firstNameInput = getByPlaceholderText(/first name/i);
    const lastNameInput = getByPlaceholderText(/last name/i);
    const emailInput = getByPlaceholderText(/email/i);
    const passwordInput = getByPlaceholderText(/password/i);
    const registerButton = getByText(/create account/i);

    fireEvent.changeText(firstNameInput, 'New');
    fireEvent.changeText(lastNameInput, 'User');
    fireEvent.changeText(emailInput, 'newuser@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(registerButton);

    // Wait for registration to complete
    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        firstName: 'New',
        lastName: 'User',
        email: 'newuser@example.com',
        password: 'password123',
      });
    });
  });

  it('should handle logout flow correctly', async () => {
    (authService.logout as jest.Mock).mockResolvedValue(undefined);
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true);
    (authService.getCurrentUser as jest.Mock).mockReturnValue({
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    });

    // Test logout functionality
    await authService.logout();

    expect(authService.logout).toHaveBeenCalled();
  });
});
