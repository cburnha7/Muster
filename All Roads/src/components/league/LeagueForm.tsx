import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { FormInput } from '../forms/FormInput';
import { FormSelect, SelectOption } from '../forms/FormSelect';
import { FormButton } from '../forms/FormButton';
import { CreateLeagueData, UpdateLeagueData, SportType, SkillLevel, PointsConfig } from '../../types';

interface LeagueFormProps {
  initialData?: Partial<CreateLeagueData | UpdateLeagueData>;
  onSubmit: (data: CreateLeagueData | UpdateLeagueData) => Promise<void>;
  onCancel?: () => void;
  isEdit?: boolean;
  loading?: boolean;
}

export const LeagueForm: React.FC<LeagueFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isEdit = false,
  loading = false,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [sportType, setSportType] = useState(initialData?.sportType || '');
  const [skillLevel, setSkillLevel] = useState(initialData?.skillLevel || '');
  const [seasonName, setSeasonName] = useState(initialData?.seasonName || '');
  const [startDate, setStartDate] = useState(initialData?.startDate?.toString() || '');
  const [endDate, setEndDate] = useState(initialData?.endDate?.toString() || '');
  const [winPoints, setWinPoints] = useState(
    initialData?.pointsConfig?.win?.toString() || '3'
  );
  const [drawPoints, setDrawPoints] = useState(
    initialData?.pointsConfig?.draw?.toString() || '1'
  );
  const [lossPoints, setLossPoints] = useState(
    initialData?.pointsConfig?.loss?.toString() || '0'
  );
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const sportTypeOptions: SelectOption[] = [
    { label: 'Basketball', value: SportType.BASKETBALL },
    { label: 'Soccer', value: SportType.SOCCER },
    { label: 'Tennis', value: SportType.TENNIS },
    { label: 'Volleyball', value: SportType.VOLLEYBALL },
    { label: 'Badminton', value: SportType.BADMINTON },
    { label: 'Other', value: SportType.OTHER },
  ];

  const skillLevelOptions: SelectOption[] = [
    { label: 'Beginner', value: SkillLevel.BEGINNER },
    { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
    { label: 'Advanced', value: SkillLevel.ADVANCED },
    { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
  ];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'League name is required';
    } else if (name.trim().length < 3) {
      newErrors.name = 'League name must be at least 3 characters';
    }

    if (!sportType) {
      newErrors.sportType = 'Sport type is required';
    }

    if (!skillLevel) {
      newErrors.skillLevel = 'Skill level is required';
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    const win = parseInt(winPoints);
    const draw = parseInt(drawPoints);
    const loss = parseInt(lossPoints);

    if (isNaN(win) || win < 0) {
      newErrors.winPoints = 'Win points must be a non-negative number';
    }
    if (isNaN(draw) || draw < 0) {
      newErrors.drawPoints = 'Draw points must be a non-negative number';
    }
    if (isNaN(loss) || loss < 0) {
      newErrors.lossPoints = 'Loss points must be a non-negative number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    const pointsConfig: PointsConfig = {
      win: parseInt(winPoints),
      draw: parseInt(drawPoints),
      loss: parseInt(lossPoints),
    };

    const formData: CreateLeagueData | UpdateLeagueData = {
      name: name.trim(),
      description: description.trim() || undefined,
      sportType: sportType as SportType,
      skillLevel: skillLevel as SkillLevel,
      seasonName: seasonName.trim() || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      pointsConfig,
      imageUrl: imageUrl.trim() || undefined,
    };

    try {
      await onSubmit(formData);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save league');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <FormInput
          label="League Name *"
          placeholder="Enter league name"
          value={name}
          onChangeText={setName}
          error={errors.name}
        />

        <FormInput
          label="Description"
          placeholder="Enter league description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <FormSelect
          label="Sport Type *"
          placeholder="Select sport type"
          value={sportType}
          options={sportTypeOptions}
          onSelect={(option) => setSportType(option.value as string)}
          error={errors.sportType}
        />

        <FormSelect
          label="Skill Level *"
          placeholder="Select skill level"
          value={skillLevel}
          options={skillLevelOptions}
          onSelect={(option) => setSkillLevel(option.value as string)}
          error={errors.skillLevel}
        />

        <FormInput
          label="League Logo URL"
          placeholder="https://example.com/logo.png"
          value={imageUrl}
          onChangeText={setImageUrl}
          keyboardType="url"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Season Information</Text>
        
        <FormInput
          label="Season Name"
          placeholder="e.g., Spring 2024"
          value={seasonName}
          onChangeText={setSeasonName}
        />

        <FormInput
          label="Start Date"
          placeholder="YYYY-MM-DD"
          value={startDate}
          onChangeText={setStartDate}
          error={errors.startDate}
        />

        <FormInput
          label="End Date"
          placeholder="YYYY-MM-DD"
          value={endDate}
          onChangeText={setEndDate}
          error={errors.endDate}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Points System</Text>
        <Text style={styles.sectionDescription}>
          Configure how many points teams earn for match results
        </Text>
        
        <FormInput
          label="Points for Win"
          placeholder="3"
          value={winPoints}
          onChangeText={setWinPoints}
          keyboardType="numeric"
          error={errors.winPoints}
        />

        <FormInput
          label="Points for Draw"
          placeholder="1"
          value={drawPoints}
          onChangeText={setDrawPoints}
          keyboardType="numeric"
          error={errors.drawPoints}
        />

        <FormInput
          label="Points for Loss"
          placeholder="0"
          value={lossPoints}
          onChangeText={setLossPoints}
          keyboardType="numeric"
          error={errors.lossPoints}
        />
      </View>

      <View style={styles.actions}>
        {onCancel && (
          <FormButton
            title="Cancel"
            variant="outline"
            onPress={onCancel}
            disabled={loading}
            style={styles.actionButton}
          />
        )}
        <FormButton
          title={isEdit ? 'Update League' : 'Create League'}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
