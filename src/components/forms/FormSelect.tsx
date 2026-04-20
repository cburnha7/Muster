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
import { fonts, useTheme } from '../../theme';

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
  const { colors } = useTheme();

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
        styles.option, { borderBottomColor: colors.background },
        { borderBottomColor: colors.border },
        item.disabled && styles.optionDisabled, item.disabled && { backgroundColor: colors.background },
        item.value === value && styles.optionSelected, item.value === value && { backgroundColor: colors.cobaltLight }]}
      onPress={() => handleSelect(item)}
      disabled={item.disabled}
    >
      <Text
        style={[
          styles.optionText, { color: colors.ink },
          { color: colors.textPrimary },
          item.disabled && styles.optionTextDisabled, item.disabled && { color: colors.inkSecondary },
          item.value === value && styles.optionTextSelected, item.value === value && { color: colors.cobalt }]}
      >
        {item.label}
      </Text>
      {item.value === value && (
        <Ionicons name="checkmark" size={20} color={colors.cobalt} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[styles.label, { color: colors.ink }, { color: colors.textPrimary }, labelStyle]}
        >
          {label}
          {required && <Text style={[styles.required, { color: colors.error }]}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.select, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.ink },
          {
            backgroundColor: colors.bgCard,
            borderColor: colors.border,
          },
          error && styles.selectError, error && { borderColor: colors.error, backgroundColor: colors.errorLight },
          disabled && styles.selectDisabled, disabled && { backgroundColor: colors.background, borderColor: colors.border },
          selectStyle]}
        onPress={() => !disabled && setIsModalVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectText, { color: colors.ink },
            { color: colors.textPrimary },
            !selectedOption && styles.placeholderText, !selectedOption && { color: colors.inkSecondary },
            disabled && styles.selectTextDisabled, disabled && { color: colors.inkSecondary }]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={20}
          color={
            disabled
              ? colors.inkSecondary
              : error
                ? colors.error
                : colors.textSecondary
          }
        />
      </TouchableOpacity>

      {error && <Text style={[styles.error, { color: colors.error }, errorStyle]}>{error}</Text>}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer, { backgroundColor: colors.surface },
            { backgroundColor: colors.bgScreen }]}
        >
          <View
            style={[
              styles.modalHeader, { borderBottomColor: colors.background },
              { borderBottomColor: colors.border }]}
          >
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={[styles.cancelText, { color: colors.cobalt }]}>Cancel</Text>
            </TouchableOpacity>
            <Text
              style={[styles.modalTitle, { color: colors.ink }, { color: colors.textPrimary }]}
            >
              {label || 'Select Option'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <FlatList
            data={options}
            renderItem={renderOption}
            keyExtractor={item => item.value.toString()}
            style={styles.optionsList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              footerOption ? (
                <TouchableOpacity
                  style={[styles.footerOption, { borderTopColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => {
                    setIsModalVisible(false);
                    footerOption.onPress();
                  }}
                >
                  {footerOption.icon && (
                    <Ionicons
                      name={footerOption.icon as any}
                      size={20}
                      color={colors.cobalt}
                      style={{ marginRight: 10 }}
                    />
                  )}
                  <Text style={[styles.footerOptionText, { color: colors.cobalt }]}>
                    {footerOption.label}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={colors.cobalt}
                  />
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
    marginBottom: 8,
  },
  required: {},
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectError: {},
  selectDisabled: {},
  selectText: {
    fontSize: 16,
    fontFamily: fonts.body,
    flex: 1,
  },
  placeholderText: {},
  selectTextDisabled: {},
  error: {
    fontSize: 14,
    fontFamily: fonts.body,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: fonts.ui,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.headingSemi,
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
  },
  optionSelected: {},
  optionDisabled: {},
  optionText: {
    fontSize: 16,
    fontFamily: fonts.body,
    flex: 1,
  },
  optionTextSelected: {
    fontFamily: fonts.label,
  },
  optionTextDisabled: {},
  footerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  footerOptionText: {
    fontSize: 16,
    fontFamily: fonts.ui,
    flex: 1,
  },
});
