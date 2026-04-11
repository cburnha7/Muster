import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FormInput } from '../forms/FormInput';
import { FormButton } from '../forms/FormButton';
import { FormSelect, SelectOption } from '../forms/FormSelect';
import {
  courtService,
  Court,
  UpdateCourtData,
} from '../../services/api/CourtService';
import { SportType } from '../../types';
import { colors, Spacing } from '../../theme';

interface EditCourtModalProps {
  visible: boolean;
  court: Court;
  facilityId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCourtModal({
  visible,
  court,
  facilityId,
  onClose,
  onSuccess,
}: EditCourtModalProps): JSX.Element {
  const [formData, setFormData] = useState({
    name: '',
    sportType: '',
    capacity: '1',
    isIndoor: false,
    pricePerHour: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  // Initialize form data when court changes
  useEffect(() => {
    if (court) {
      setFormData({
        name: court.name,
        sportType: court.sportType,
        capacity: court.capacity.toString(),
        isIndoor: court.isIndoor,
        pricePerHour: court.pricePerHour ? court.pricePerHour.toString() : '',
      });
      setErrors({});
    }
  }, [court]);

  const sportTypeOptions: SelectOption[] = [
    { label: 'Baseball', value: SportType.BASEBALL },
    { label: 'Basketball', value: SportType.BASKETBALL },
    { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
    { label: 'Kickball', value: SportType.KICKBALL },
    { label: 'Pickleball', value: SportType.PICKLEBALL },
    { label: 'Soccer', value: SportType.SOCCER },
    { label: 'Softball', value: SportType.SOFTBALL },
    { label: 'Tennis', value: SportType.TENNIS },
    { label: 'Volleyball', value: SportType.VOLLEYBALL },
    { label: 'Other', value: SportType.OTHER },
  ];

  const locationOptions: SelectOption[] = [
    { label: 'Outdoor', value: 'false' },
    { label: 'Indoor', value: 'true' },
  ];

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Court name is required';
    }

    if (!formData.sportType) {
      newErrors.sportType = 'Sport type is required';
    }

    const capacity = parseInt(formData.capacity);
    if (isNaN(capacity) || capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    if (formData.pricePerHour) {
      const price = parseFloat(formData.pricePerHour);
      if (isNaN(price) || price < 0) {
        newErrors.pricePerHour = 'Price must be a valid number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const data: UpdateCourtData = {
        name: formData.name.trim(),
        sportType: formData.sportType,
        capacity: parseInt(formData.capacity),
        isIndoor: formData.isIndoor,
      };

      // Only include pricePerHour if it has a value
      if (formData.pricePerHour) {
        data.pricePerHour = parseFloat(formData.pricePerHour);
      }

      await courtService.updateCourt(facilityId, court.id, data);
      Alert.alert('Success', 'Court updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update court');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            disabled={loading}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Court</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <FormInput
            label="Court Name"
            placeholder="e.g., Court 1, Field A"
            value={formData.name}
            onChangeText={value => handleInputChange('name', value)}
            {...(errors.name && { error: errors.name })}
            required
          />

          <FormSelect
            label="Sport"
            placeholder="Select sport"
            value={formData.sportType}
            options={sportTypeOptions}
            onSelect={option =>
              handleInputChange('sportType', option.value.toString())
            }
            {...(errors.sportType && { error: errors.sportType })}
            required
          />

          <FormSelect
            label="Location"
            placeholder="Select location"
            value={formData.isIndoor.toString()}
            options={locationOptions}
            onSelect={option =>
              handleInputChange('isIndoor', option.value === 'true')
            }
          />

          <FormInput
            label="Capacity"
            placeholder="Number of players"
            value={formData.capacity}
            onChangeText={value => handleInputChange('capacity', value)}
            {...(errors.capacity && { error: errors.capacity })}
            keyboardType="numeric"
            required
          />

          <FormInput
            label="Price Per Hour (Optional)"
            placeholder="Leave empty to use facility rate"
            value={formData.pricePerHour}
            onChangeText={value => handleInputChange('pricePerHour', value)}
            {...(errors.pricePerHour && { error: errors.pricePerHour })}
            keyboardType="decimal-pad"
          />
        </ScrollView>

        <View style={styles.actions}>
          <FormButton
            title="Cancel"
            variant="outline"
            onPress={handleClose}
            style={styles.actionButton}
            disabled={loading}
          />
          <FormButton
            title="Update Court"
            onPress={handleSubmit}
            style={styles.actionButton}
            loading={loading}
            disabled={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
});
