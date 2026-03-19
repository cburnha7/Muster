import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuthContext } from '../../services/auth';
import { RegisterData, SportType } from '../../types';
import { 
  isValidEmail, 
  isValidPassword, 
  getPasswordStrength, 
  getPasswordStrengthLabel,
  getAuthErrorMessage 
} from '../../services/auth/authUtils';
import { loggingService } from '../../services/LoggingService';
import { colors } from '../../theme';

export interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess: () => void;
}

export function RegisterScreen({ 
  onNavigateToLogin, 
  onRegisterSuccess 
}: RegisterScreenProps) {
  const { register, isLoading, error, clearError } = useAuthContext();
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    preferredSports: [],
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Partial<RegisterData & { confirmPassword: string }>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    const errors: Partial<RegisterData & { confirmPassword: string }> = {};

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (!isValidPassword(formData.password)) {
      errors.password = 'Password must be at least 8 characters with uppercase, lowercase, and numbers';
    }

    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== formData.password) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    // Phone number validation (optional but if provided, should be valid)
    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      const cleanPhone = formData.phoneNumber.replace(/[\s\-\(\)]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        errors.phoneNumber = 'Please enter a valid phone number';
      }
    }

    // Log validation failures
    Object.entries(errors).forEach(([field, msg]) => {
      if (msg) loggingService.logValidation('RegisterScreen', field, 'invalid', msg);
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    
    if (!validateForm()) {
      return;
    }

    loggingService.logButton('Create Account', 'RegisterScreen');

    try {
      await register(formData);
      onRegisterSuccess();
    } catch (error) {
      // Error is handled by the auth context
      console.error('Registration failed:', error);
    }
  };

  const handleInputChange = (field: keyof RegisterData | 'confirmPassword', value: string) => {
    if (field === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleSportPreference = (sport: SportType) => {
    setFormData(prev => ({
      ...prev,
      preferredSports: prev.preferredSports.includes(sport)
        ? prev.preferredSports.filter(s => s !== sport)
        : [...prev.preferredSports, sport]
    }));
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const passwordStrengthLabel = getPasswordStrengthLabel(passwordStrength);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the sports community</Text>
        </View>

        <View style={styles.form}>
          {/* Name Fields */}
          <View style={styles.nameContainer}>
            <View style={[styles.inputContainer, styles.nameInput]}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[
                  styles.input,
                  formErrors.firstName && styles.inputError
                ]}
                value={formData.firstName}
                onChangeText={(text) => handleInputChange('firstName', text)}
                placeholder="First name"
                autoCapitalize="words"
                editable={!isLoading}
              />
              {formErrors.firstName && (
                <Text style={styles.errorText}>{formErrors.firstName}</Text>
              )}
            </View>

            <View style={[styles.inputContainer, styles.nameInput]}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[
                  styles.input,
                  formErrors.lastName && styles.inputError
                ]}
                value={formData.lastName}
                onChangeText={(text) => handleInputChange('lastName', text)}
                placeholder="Last name"
                autoCapitalize="words"
                editable={!isLoading}
              />
              {formErrors.lastName && (
                <Text style={styles.errorText}>{formErrors.lastName}</Text>
              )}
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[
                styles.input,
                formErrors.email && styles.inputError
              ]}
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {formErrors.email && (
              <Text style={styles.errorText}>{formErrors.email}</Text>
            )}
          </View>

          {/* Phone Number Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                formErrors.phoneNumber && styles.inputError
              ]}
              value={formData.phoneNumber}
              onChangeText={(text) => handleInputChange('phoneNumber', text)}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              editable={!isLoading}
            />
            {formErrors.phoneNumber && (
              <Text style={styles.errorText}>{formErrors.phoneNumber}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.passwordInput,
                  formErrors.password && styles.inputError
                ]}
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                placeholder="Create a password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Text style={styles.passwordToggleText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            {formData.password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBar}>
                  <View 
                    style={[
                      styles.passwordStrengthFill,
                      { width: `${(passwordStrength / 4) * 100}%` },
                      passwordStrength <= 1 && styles.strengthWeak,
                      passwordStrength === 2 && styles.strengthFair,
                      passwordStrength === 3 && styles.strengthGood,
                      passwordStrength === 4 && styles.strengthStrong,
                    ]}
                  />
                </View>
                <Text style={styles.passwordStrengthText}>
                  Password strength: {passwordStrengthLabel}
                </Text>
              </View>
            )}
            {formErrors.password && (
              <Text style={styles.errorText}>{formErrors.password}</Text>
            )}
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.passwordInput,
                  formErrors.confirmPassword && styles.inputError
                ]}
                value={confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                <Text style={styles.passwordToggleText}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            {formErrors.confirmPassword && (
              <Text style={styles.errorText}>{formErrors.confirmPassword}</Text>
            )}
          </View>

          {/* Preferred Sports */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Preferred Sports (Optional)</Text>
            <View style={styles.sportsContainer}>
              {Object.values(SportType).map((sport) => (
                <TouchableOpacity
                  key={sport}
                  style={[
                    styles.sportChip,
                    formData.preferredSports.includes(sport) && styles.sportChipSelected
                  ]}
                  onPress={() => toggleSportPreference(sport)}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.sportChipText,
                    formData.preferredSports.includes(sport) && styles.sportChipTextSelected
                  ]}>
                    {sport.charAt(0).toUpperCase() + sport.slice(1).replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{getAuthErrorMessage(error)}</Text>
            </View>
          )}

          {/* Register Button */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              isLoading && styles.registerButtonDisabled
            ]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={onNavigateToLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    marginBottom: 32,
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  nameInput: {
    flex: 1,
    marginBottom: 0,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    marginRight: 8,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  passwordToggleText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  passwordStrengthContainer: {
    marginTop: 8,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 4,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthWeak: {
    backgroundColor: '#EF4444',
  },
  strengthFair: {
    backgroundColor: '#F59E0B',
  },
  strengthGood: {
    backgroundColor: '#10B981',
  },
  strengthStrong: {
    backgroundColor: '#059669',
  },
  passwordStrengthText: {
    fontSize: 12,
    color: '#6B7280',
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  sportChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  sportChipText: {
    fontSize: 14,
    color: '#374151',
  },
  sportChipTextSelected: {
    color: '#FFFFFF',
  },
  errorContainer: {
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 4,
  },
  registerButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#6B7280',
  },
  loginLink: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
});
