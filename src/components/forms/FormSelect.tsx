import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';

export interface SelectOption {
  label: string;
  value: string | number | boolean;
  disabled?: boolean;
}

interface FooterOption {
  label: string;
  icon?: string;
  onPress: () => void;
}

interface FormSelectProps {
  label?: string;
  placeholder?: string;
  value?: string | number | boolean;
  options: SelectOption[];
  onSelect?: (option: SelectOption) => void;
  onValueChange?: (value: string | number | boolean) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  containerStyle?: any;
  selectStyle?: any;
  labelStyle?: any;
  errorStyle?: any;
  footerOption?: FooterOption;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  placeholder = 'Select an option',
  value,
  options,
  onSelect,
  onValueChange,
  error,
  required = false,
  disabled = false,
  containerStyle,
  selectStyle,
  labelStyle,
  errorStyle,
  footerOption,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (option: SelectOption) => {
    if (!option.disabled) {
      // Support both onSelect and onValueChange
      if (onSelect) {
        onSelect(option);
      }
      if (onValueChange) {
        onValueChange(option.value);
      }
      setIsModalVisible(false);
    }
  };

  const renderOption = ({ item }: { item: SelectOption }) => (
    <TouchableOpacity
      style={[
        styles.option,
        item.disabled && styles.optionDisabled,
        item.value === value && styles.optionSelected,
      ]}
      onPress={() => handleSelect(item)}
      disabled={item.disabled}
    >
      <Text
        style={[
          styles.optionText,
          item.disabled && styles.optionTextDisabled,
          item.value === value && styles.optionTextSelected,
        ]}
      >
        {item.label}
      </Text>
      {item.value === value && (
        <Ionicons name="checkmark" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.select,
          error && styles.selectError,
          disabled && styles.selectDisabled,
          selectStyle,
        ]}
        onPress={() => !disabled && setIsModalVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectText,
            !selectedOption && styles.placeholderText,
            disabled && styles.selectTextDisabled,
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={disabled ? colors.outline : error ? colors.error : colors.onSurfaceVariant}
        />
      </TouchableOpacity>

      {error && (
        <Text style={[styles.error, errorStyle]}>{error}</Text>
      )}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {label || 'Select Option'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <FlatList
            data={options}
            renderItem={renderOption}
            keyExtractor={(item) => item.value.toString()}
            style={styles.optionsList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              footerOption ? (
                <TouchableOpacity
                  style={styles.footerOption}
                  onPress={() => {
                    setIsModalVisible(false);
                    footerOption.onPress();
                  }}
                >
                  {footerOption.icon && (
                    <Ionicons name={footerOption.icon as any} size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  )}
                  <Text style={styles.footerOptionText}>{footerOption.label}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              ) : null
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontFamily: fonts.label,
    color: colors.onSurface,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    shadowColor: '#191C1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectError: {
    borderColor: colors.error,
    backgroundColor: colors.errorContainer,
  },
  selectDisabled: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
  },
  selectText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.onSurface,
    flex: 1,
  },
  placeholderText: {
    color: colors.outline,
  },
  selectTextDisabled: {
    color: colors.outline,
  },
  error: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.error,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: fonts.ui,
    color: colors.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.headingSemi,
    color: colors.onSurface,
  },
  placeholder: {
    width: 60, // Same width as cancel button for centering
  },
  optionsList: {
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerLow,
  },
  optionSelected: {
    backgroundColor: colors.primaryFixed,
  },
  optionDisabled: {
    backgroundColor: colors.surfaceContainerLow,
  },
  optionText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.onSurface,
    flex: 1,
  },
  optionTextSelected: {
    color: colors.primary,
    fontFamily: fonts.label,
  },
  optionTextDisabled: {
    color: colors.outline,
  },
  footerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  footerOptionText: {
    fontSize: 16,
    fontFamily: fonts.ui,
    color: colors.primary,
    flex: 1,
  },
});
