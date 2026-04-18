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
import { colors } from '../../theme';
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
            <Ionicons name="search-outline" size={20} color={colors.inkSoft} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={placeholder}
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
                  color={colors.inkSoft}
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
                color={activeFiltersCount > 0 ? colors.white : colors.inkSoft}
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
                        {sport.charAt(0).toUpperCase() + sport.slice(1)}
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
    marginHorizontal: 16,
    marginVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: colors.ink,
    marginLeft: 10,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: colors.cobalt,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.heart,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  cancelText: {
    fontSize: 16,
    color: colors.cobalt,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
  },
  resetText: {
    fontSize: 16,
    color: colors.heart,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterSection: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionButtonActive: {
    backgroundColor: colors.cobalt,
    borderColor: colors.cobalt,
  },
  optionText: {
    fontSize: 14,
    color: colors.inkSoft,
  },
  optionTextActive: {
    color: colors.white,
    fontWeight: '500',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  applyButton: {
    backgroundColor: colors.cobalt,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
