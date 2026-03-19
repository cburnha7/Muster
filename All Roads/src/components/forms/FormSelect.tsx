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

export interface SelectOption {
  label: string;
  value: string | number | boolean;
  disabled?: boolean;
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
        <Ionicons name="checkmark" size={20} color="#007AFF" />
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
          color={disabled ? '#999' : error ? '#FF3B30' : '#666'}
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
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  selectError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  selectDisabled: {
    backgroundColor: '#F0F0F0',
    borderColor: '#D0D0D0',
  },
  selectText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  selectTextDisabled: {
    color: '#999',
  },
  error: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
    borderBottomColor: '#F0F0F0',
  },
  optionSelected: {
    backgroundColor: '#F0F8FF',
  },
  optionDisabled: {
    backgroundColor: '#F8F8F8',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  optionTextDisabled: {
    color: '#999',
  },
});