import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: any;
  inputStyle?: any;
  labelStyle?: any;
  errorStyle?: any;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  required = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  secureTextEntry,
  ...textInputProps
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const handleToggleSecure = () => {
    setIsSecure(!isSecure);
  };

  const showPasswordToggle = secureTextEntry && !rightIcon;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon as any}
            size={20}
            color={error ? colors.track : isFocused ? colors.grass : colors.soft}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || showPasswordToggle) && styles.inputWithRightIcon,
            inputStyle,
          ]}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="#999"
          {...textInputProps}
        />
        
        {showPasswordToggle && (
          <TouchableOpacity
            onPress={handleToggleSecure}
            style={styles.rightIcon}
          >
            <Ionicons
              name={isSecure ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.soft}
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !showPasswordToggle && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
          >
            <Ionicons
              name={rightIcon as any}
              size={20}
              color={error ? colors.track : isFocused ? colors.grass : colors.soft}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={[styles.error, errorStyle]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
  },
  required: {
    color: colors.track,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    minHeight: 48,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainerFocused: {
    borderColor: colors.grass,
    backgroundColor: '#FFFFFF',
  },
  inputContainerError: {
    borderColor: colors.track,
    backgroundColor: '#FFF5F5',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 12,
  },
  inputWithLeftIcon: {
    marginLeft: 8,
  },
  inputWithRightIcon: {
    marginRight: 8,
  },
  leftIcon: {
    marginRight: 0,
  },
  rightIcon: {
    padding: 4,
    marginLeft: 0,
  },
  error: {
    fontSize: 14,
    color: colors.track,
    marginTop: 4,
  },
});