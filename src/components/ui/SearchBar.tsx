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
  tokenColors,
  tokenSpacing,
  tokenRadius,
  tokenType,
  tokenShadow,
  tokenFontFamily,
} from '../../theme/tokens';
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
          <View style={styles.inputContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={tokenColors.inkSecondary}
            />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor={tokenColors.inkSecondary}
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
                  color={tokenColors.inkSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {showFilters && (
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFiltersCount > 0 && styles.filterButtonActive,
              ]}
              onPress={() => setShowFilterModal(true)}
            >
              <Ionicons
                name="filter-outline"
                size={20}
                color={
                  activeFiltersCount > 0
                    ? tokenColors.white
                    : tokenColors.inkSecondary
                }
              />
              {activeFiltersCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
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
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={handleFilterReset}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Sport Type</Text>
                <View style={styles.optionsContainer}>
                  {Object.values(SportType).map(sport => (
                    <TouchableOpacity
                      key={sport}
                      style={[
                        styles.optionButton,
                        localFilters.sportType === sport &&
                          styles.optionButtonActive,
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
                          localFilters.sportType === sport &&
                            styles.optionTextActive,
                        ]}
                      >
                        {formatSportType(sport)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Skill Level</Text>
                <View style={styles.optionsContainer}>
                  {Object.values(SkillLevel).map(level => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.optionButton,
                        localFilters.skillLevel === level &&
                          styles.optionButtonActive,
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
                          localFilters.skillLevel === level &&
                            styles.optionTextActive,
                        ]}
                      >
                        {level.replace('_', ' ').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleFilterApply}
              >
                <Text style={styles.applyText}>Apply Filters</Text>
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
    backgroundColor: tokenColors.surface,
    borderRadius: tokenRadius.md,
    paddingHorizontal: tokenSpacing.lg,
    paddingVertical: tokenSpacing.md,
    marginRight: tokenSpacing.sm,
    borderWidth: 1.5,
    borderColor: tokenColors.border,
    ...tokenShadow.card,
  },
  input: {
    flex: 1,
    ...tokenType.body,
    color: tokenColors.ink,
    marginLeft: tokenSpacing.sm,
  },
  clearButton: {
    padding: tokenSpacing.xs,
  },
  filterButton: {
    backgroundColor: tokenColors.surface,
    borderRadius: tokenRadius.md,
    padding: tokenSpacing.md,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: tokenColors.cobalt,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: tokenColors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: tokenColors.white,
    fontSize: 12,
    fontFamily: tokenFontFamily.uiSemiBold,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: tokenColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokenSpacing.lg,
    paddingVertical: tokenSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: tokenColors.border,
  },
  cancelText: {
    ...tokenType.button,
    color: tokenColors.cobalt,
  },
  modalTitle: {
    ...tokenType.modalTitle,
    color: tokenColors.ink,
  },
  resetText: {
    ...tokenType.button,
    color: tokenColors.error,
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
    color: tokenColors.ink,
    marginBottom: tokenSpacing.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokenSpacing.sm,
  },
  optionButton: {
    backgroundColor: tokenColors.surface,
    paddingHorizontal: tokenSpacing.md,
    paddingVertical: tokenSpacing.sm,
    borderRadius: tokenRadius.pill,
    borderWidth: 1.5,
    borderColor: tokenColors.border,
  },
  optionButtonActive: {
    backgroundColor: tokenColors.cobalt,
    borderColor: tokenColors.cobalt,
  },
  optionText: {
    ...tokenType.chip,
    color: tokenColors.ink,
  },
  optionTextActive: {
    ...tokenType.chipSelected,
    color: tokenColors.white,
  },
  modalFooter: {
    paddingHorizontal: tokenSpacing.lg,
    paddingVertical: tokenSpacing.lg,
    borderTopWidth: 1,
    borderTopColor: tokenColors.border,
  },
  applyButton: {
    backgroundColor: tokenColors.cobalt,
    borderRadius: tokenRadius.lg,
    paddingVertical: tokenSpacing.lg,
    alignItems: 'center',
  },
  applyText: {
    ...tokenType.button,
    color: tokenColors.white,
  },
});
