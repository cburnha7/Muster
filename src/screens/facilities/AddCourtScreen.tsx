import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { courtService, CreateCourtData } from '../../services/api/CourtService';
import { SportType } from '../../types';
import { colors, Spacing } from '../../theme';

export function AddCourtScreen(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute();
  const { facilityId } = route.params as { facilityId: string };

  const [formData, setFormData] = useState({
    name: '',
    sportType: '',
    capacity: '1',
    isIndoor: false,
    pricePerHour: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const sportTypeOptions: SelectOption[] = [
    { label: 'Basketball', value: SportType.BASKETBALL },
    { label: 'Pickleball', value: SportType.PICKLEBALL },
    { label: 'Tennis', value: SportType.TENNIS },
    { label: 'Soccer', value: SportType.SOCCER },
    { label: 'Softball', value: SportType.SOFTBALL },
    { label: 'Baseball', value: SportType.BASEBALL },
    { label: 'Volleyball', value: SportType.VOLLEYBALL },
    { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
    { label: 'Kickball', value: SportType.KICKBALL },
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

      const data: CreateCourtData = {
        name: formData.name.trim(),
        sportType: formData.sportType,
        capacity: parseInt(formData.capacity),
        isIndoor: formData.isIndoor,
        pricePerHour: formData.pricePerHour ? parseFloat(formData.pricePerHour) : undefined,
      };

      await courtService.createCourt(facilityId, data);
      Alert.alert('Success', 'Court created successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create court');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title="Add Court" showBack />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <FormInput
          label="Court Name"
          placeholder="e.g., Court 1, Field A"
          value={formData.name}
          onChangeText={(value) => handleInputChange('name', value)}
          error={errors.name}
          required
        />

        <FormSelect
          label="Sport"
          placeholder="Select sport"
          value={formData.sportType}
          options={sportTypeOptions}
          onSelect={(option) => handleInputChange('sportType', option.value.toString())}
          error={errors.sportType}
          required
        />

        <FormSelect
          label="Location"
          placeholder="Select location"
          value={formData.isIndoor.toString()}
          options={locationOptions}
          onSelect={(option) => handleInputChange('isIndoor', option.value === 'true')}
        />

        <FormInput
          label="Capacity"
          placeholder="Number of players"
          value={formData.capacity}
          onChangeText={(value) => handleInputChange('capacity', value)}
          error={errors.capacity}
          keyboardType="numeric"
          required
        />

        <FormInput
          label="Price Per Hour (Optional)"
          placeholder="Leave empty to use facility rate"
          value={formData.pricePerHour}
          onChangeText={(value) => handleInputChange('pricePerHour', value)}
          error={errors.pricePerHour}
          keyboardType="decimal-pad"
        />
      </ScrollView>

      <View style={styles.actions}>
        <FormButton
          title="Cancel"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
          disabled={loading}
        />
        <FormButton
          title="Create Court"
          onPress={handleSubmit}
          style={styles.actionButton}
          loading={loading}
          disabled={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
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
