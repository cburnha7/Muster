import React, {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Text,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  tokenSpacing,
  tokenRadius,
  tokenType,
  tokenFontFamily,
} from '../../theme/tokens';
import { useTheme } from '../../theme';
import { formatSportType } from '../../utils/formatters';
import { SportType, SkillLevel } from '../../types';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSearch?: (query: string) => void;
  showFilters?: boolean;
  filters?: SearchFilters;
  onFiltersChange?: (filters: SearchFilters) => void;
  style?: any;
}

export interface SearchBarHandle {
  focus: () => void;
}

export interface SearchFilters {
  sportType?: SportType;
  skillLevel?: SkillLevel;
  priceRange?: {
    min: number;
    max: number;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(
  (
    {
      placeholder = 'Search...',
      value,
      onChangeText,
      onSearch,
      showFilters = false,
      filters,
      onFiltersChange,
      style,
    },
    ref
  ) => {
    const { colors, shadow } = useTheme();
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [localFilters, setLocalFilters] = useState<SearchFilters>(
      filters || {}
    );
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const handleSearch = () => {
      onSearch?.(value);
    };

    const handleFilterApply = () => {
      onFiltersChange?.(localFilters);
      setShowFilterModal(false);
    };

    const handleFilterReset = () => {
      const resetFilters: SearchFilters = {};
      setLocalFilters(resetFilters);
      onFiltersChange?.(resetFilters);
      setShowFilterModal(false);
    };

    const getActiveFiltersCount = () => {
      let count = 0;
      if (filters?.sportType) count++;
      if (filters?.skillLevel) count++;
      if (filters?.priceRange) count++;
      if (filters?.dateRange) count++;
      return count;
    };

    const activeFiltersCount = getActiveFiltersCount();

    return (
      <View style={[styles.container, style]}>
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                ...shadow.card,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.inkSecondary}
            />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.ink }]}
              placeholder={placeholder}
              placeholderTextColor={colors.inkSecondary}
              value={value}
              onChangeText={onChangeText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {value.length > 0 && (
              <TouchableOpacity
                onPress={() => onChangeText('')}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.inkSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {showFilters && (
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: colors.surface },
                activeFiltersCount > 0 && { backgroundColor: colors.cobalt },
              ]}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons
                name="filter-outline"
                size={20}
                color={
                  activeFiltersCount > 0 ? colors.white : colors.inkSecondary
                }
              />
              {activeFiltersCount > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    { backgroundColor: colors.error },
                  ]}
                >
                  <Text
                    style={[styles.filterBadgeText, { color: colors.white }]}
                  >
                    {activeFiltersCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Modal
          visible={showFilterModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowFilterModal(false)}
        >
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.background },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={[styles.cancelText, { color: colors.cobalt }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>
                Filters
              </Text>
              <TouchableOpacity onPress={handleFilterReset}>
                <Text style={[styles.resetText, { color: colors.error }]}>
                  Reset
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: colors.ink }]}>
                  Sport Type
                </Text>
                <View style={styles.optionsContainer}>
                  {Object.values(SportType).map(sport => (
                    <TouchableOpacity
                      key={sport}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                        localFilters.sportType === sport && {
                          backgroundColor: colors.cobalt,
                          borderColor: colors.cobalt,
                        },
                      ]}
                      onPress={() =>
                        setLocalFilters({
                          ...localFilters,
                          sportType:
                            localFilters.sportType === sport
                              ? undefined
                              : sport,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: colors.ink },
                          localFilters.sportType === sport && {
                            ...tokenType.chipSelected,
                            color: colors.white,
                          },
                        ]}
                      >
                        {formatSportType(sport)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.sectionTitle, { color: colors.ink }]}>
                  Skill Level
                </Text>
                <View style={styles.optionsContainer}>
                  {Object.values(SkillLevel).map(level => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                        localFilters.skillLevel === level && {
                          backgroundColor: colors.cobalt,
                          borderColor: colors.cobalt,
                        },
                      ]}
                      onPress={() =>
                        setLocalFilters({
                          ...localFilters,
                          skillLevel:
                            localFilters.skillLevel === level
                              ? undefined
                              : level,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: colors.ink },
                          localFilters.skillLevel === level && {
                            ...tokenType.chipSelected,
                            color: colors.white,
                          },
                        ]}
                      >
                        {level.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View
              style={[styles.modalFooter, { borderTopColor: colors.border }]}
            >
              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: colors.cobalt }]}
                onPress={handleFilterApply}
              >
                <Text style={[styles.applyText, { color: colors.white }]}>
                  Apply Filters
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: tokenSpacing.lg,
    marginVertical: tokenSpacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokenRadius.md,
    paddingHorizontal: tokenSpacing.lg,
    paddingVertical: tokenSpacing.md,
    marginRight: tokenSpacing.sm,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    ...tokenType.body,
    marginLeft: tokenSpacing.sm,
  },
  clearButton: {
    padding: tokenSpacing.xs,
  },
  filterButton: {
    borderRadius: tokenRadius.md,
    padding: tokenSpacing.md,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 12,
    fontFamily: tokenFontFamily.uiSemiBold,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokenSpacing.lg,
    paddingVertical: tokenSpacing.lg,
    borderBottomWidth: 1,
  },
  cancelText: {
    ...tokenType.button,
  },
  modalTitle: {
    ...tokenType.modalTitle,
  },
  resetText: {
    ...tokenType.button,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: tokenSpacing.lg,
  },
  filterSection: {
    marginVertical: tokenSpacing.lg,
  },
  sectionTitle: {
    ...tokenType.fieldLabel,
    marginBottom: tokenSpacing.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokenSpacing.sm,
  },
  optionButton: {
    paddingHorizontal: tokenSpacing.md,
    paddingVertical: tokenSpacing.sm,
    borderRadius: tokenRadius.pill,
    borderWidth: 1.5,
  },
  optionText: {
    ...tokenType.chip,
  },
  modalFooter: {
    paddingHorizontal: tokenSpacing.lg,
    paddingVertical: tokenSpacing.lg,
    borderTopWidth: 1,
  },
  applyButton: {
    borderRadius: tokenRadius.lg,
    paddingVertical: tokenSpacing.lg,
    alignItems: 'center',
  },
  applyText: {
    ...tokenType.button,
  },
});
