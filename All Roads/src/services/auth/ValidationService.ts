/**
 * ValidationService
 * 
 * Centralized validation logic for all authentication forms.
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 6.2, 6.3, 12.3, 12.4, 17.2
 */

import {
  ValidationErrors,
  RegistrationFormData,
  LoginFormData,
  PasswordResetFormData,
} from '../../types/auth';
import { ErrorMessages } from '../../constants/errorMessages';

/**
 * RFC 5322 compliant email regex
 * Validates email format according to standard
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Username validation regex
 * Allows alphanumeric characters, underscores, and dashes
 */
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Password validation regexes
 */
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
const PASSWORD_NUMBER_REGEX = /[0-9]/;
const PASSWORD_SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

class ValidationService {
  /**
   * Validate first name
   * Requirement 1.2: Minimum 2 characters
   */
  validateFirstName(value: string): string | null {
    if (!value || !value.trim()) {
      return ErrorMessages.validation.firstName.required;
    }
    if (value.trim().length < 2) {
      return ErrorMessages.validation.firstName.tooShort;
    }
    return null;
  }

  /**
   * Validate last name
   * Requirement 1.3: Minimum 2 characters
   */
  validateLastName(value: string): string | null {
    if (!value || !value.trim()) {
      return ErrorMessages.validation.lastName.required;
    }
    if (value.trim().length < 2) {
      return ErrorMessages.validation.lastName.tooShort;
    }
    return null;
  }

  /**
   * Validate email
   * Requirement 1.4: Valid email format (RFC 5322 compliant)
   */
  validateEmail(value: string): string | null {
    if (!value || !value.trim()) {
      return ErrorMessages.validation.email.required;
    }
    if (!EMAIL_REGEX.test(value.trim())) {
      return ErrorMessages.validation.email.invalid;
    }
    return null;
  }

  /**
   * Validate username
   * Requirements 1.5, 1.6: Minimum 3 characters, alphanumeric/underscore/dash only
   */
  validateUsername(value: string): string | null {
    if (!value || !value.trim()) {
      return ErrorMessages.validation.username.required;
    }
    if (value.trim().length < 3) {
      return ErrorMessages.validation.username.tooShort;
    }
    if (!USERNAME_REGEX.test(value.trim())) {
      return ErrorMessages.validation.username.invalidCharacters;
    }
    return null;
  }

  /**
   * Validate password
   * Requirements 1.7, 1.8, 1.9, 1.10, 1.11: 
   * - Minimum 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   * - At least one special character
   */
  validatePassword(value: string): string | null {
    if (!value) {
      return ErrorMessages.validation.password.required;
    }
    if (value.length < 8) {
      return ErrorMessages.validation.password.tooShort;
    }
    if (!PASSWORD_UPPERCASE_REGEX.test(value)) {
      return ErrorMessages.validation.password.missingUppercase;
    }
    if (!PASSWORD_LOWERCASE_REGEX.test(value)) {
      return ErrorMessages.validation.password.missingLowercase;
    }
    if (!PASSWORD_NUMBER_REGEX.test(value)) {
      return ErrorMessages.validation.password.missingNumber;
    }
    if (!PASSWORD_SPECIAL_CHAR_REGEX.test(value)) {
      return ErrorMessages.validation.password.missingSpecial;
    }
    return null;
  }

  /**
   * Validate confirm password
   * Requirement 1.12: Must match password field
   */
  validateConfirmPassword(password: string, confirmPassword: string): string | null {
    if (!confirmPassword) {
      return ErrorMessages.validation.confirmPassword.required;
    }
    if (password !== confirmPassword) {
      return ErrorMessages.validation.confirmPassword.mismatch;
    }
    return null;
  }

  /**
   * Validate registration form
   * Validates all fields and returns errors object
   */
  validateRegistrationForm(data: RegistrationFormData): ValidationErrors {
    const errors: ValidationErrors = {};

    const firstNameError = this.validateFirstName(data.firstName);
    if (firstNameError) errors.firstName = firstNameError;

    const lastNameError = this.validateLastName(data.lastName);
    if (lastNameError) errors.lastName = lastNameError;

    const emailError = this.validateEmail(data.email);
    if (emailError) errors.email = emailError;

    const usernameError = this.validateUsername(data.username);
    if (usernameError) errors.username = usernameError;

    const passwordError = this.validatePassword(data.password);
    if (passwordError) errors.password = passwordError;

    const confirmPasswordError = this.validateConfirmPassword(
      data.password,
      data.confirmPassword
    );
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

    if (!data.agreedToTerms) {
      errors.agreedToTerms = ErrorMessages.validation.terms.required;
    }

    return errors;
  }

  /**
   * Validate login form
   * Requirements 6.2, 6.3: Email/username and password required
   */
  validateLoginForm(data: LoginFormData): ValidationErrors {
    const errors: ValidationErrors = {};

    if (!data.emailOrUsername || data.emailOrUsername.trim().length === 0) {
      errors.emailOrUsername = ErrorMessages.validation.credentials.required;
    }

    if (!data.password || data.password.length === 0) {
      errors.password = ErrorMessages.validation.credentials.passwordRequired;
    }

    return errors;
  }

  /**
   * Validate password reset form
   * Requirements 12.3, 12.4: New password validation and confirmation
   */
  validatePasswordResetForm(data: PasswordResetFormData): ValidationErrors {
    const errors: ValidationErrors = {};

    const passwordError = this.validatePassword(data.newPassword);
    if (passwordError) errors.password = passwordError;

    const confirmPasswordError = this.validateConfirmPassword(
      data.newPassword,
      data.confirmPassword
    );
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

    return errors;
  }
}

// Export singleton instance
export default new ValidationService();
