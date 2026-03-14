import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { FormInput } from '../forms/FormInput';
import { FormSelect, SelectOption } from '../forms/FormSelect';
import { FormButton } from '../forms/FormButton';
import { CreateLeagueData, UpdateLeagueData, SportType, SkillLevel, PointsConfig } from '../../types';
import { colors, fonts, typeScale, Spacing } from '../../theme';

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
  const [leagueType, setLeagueType] = useState<'team' | 'pickup'>(
    (initialData as Partial<CreateLeagueData>)?.leagueType || 'team'
  );
  const [visibility, setVisibility] = useState<'public' | 'private'>(
    (initialData as Partial<CreateLeagueData>)?.visibility || 'public'
  );
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

  // Schedule management fields
  const [minimumRosterSize, setMinimumRosterSize] = useState(
    (initialData as any)?.minimumRosterSize?.toString() || ''
  );
  const [registrationCloseDate, setRegistrationCloseDate] = useState(
    (initialData as any)?.registrationCloseDate?.toString() || ''
  );
  const [preferredGameDays, setPreferredGameDays] = useState<number[]>(
    (initialData as any)?.preferredGameDays || []
  );
  const [timeWindowStart, setTimeWindowStart] = useState(
    (initialData as any)?.preferredTimeWindowStart || ''
  );
  const [timeWindowEnd, setTimeWindowEnd] = useState(
    (initialData as any)?.preferredTimeWindowEnd || ''
  );
  const [seasonGameCount, setSeasonGameCount] = useState(
    (initialData as any)?.seasonGameCount?.toString() || ''
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const skillLevelOptions: SelectOption[] = [
    { label: 'Beginner', value: SkillLevel.BEGINNER },
    { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
    { label: 'Advanced', value: SkillLevel.ADVANCED },
    { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
  ];

  const leagueTypeOptions: SelectOption[] = [
    { label: 'Team League', value: 'team' },
    { label: 'Pickup League', value: 'pickup' },
  ];

  const visibilityOptions: SelectOption[] = [
    { label: 'Public', value: 'public' },
    { label: 'Private', value: 'private' },
  ];

  const handleLeagueTypeChange = (option: SelectOption) => {
    const newType = option.value as 'team' | 'pickup';
    setLeagueType(newType);
    // Pickup leagues are always public — auto-set and hide visibility selector
    if (newType === 'pickup') {
      setVisibility('public');
    }
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleGameDay = (day: number) => {
    setPreferredGameDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

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

    // Validate schedule management fields
    const hhmmRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (timeWindowStart && !hhmmRegex.test(timeWindowStart)) {
      newErrors.timeWindowStart = 'Must be in HH:MM format (e.g. 18:00)';
    }
    if (timeWindowEnd && !hhmmRegex.test(timeWindowEnd)) {
      newErrors.timeWindowEnd = 'Must be in HH:MM format (e.g. 21:00)';
    }
    if (timeWindowStart && timeWindowEnd && timeWindowStart >= timeWindowEnd) {
      newErrors.timeWindowEnd = 'End time must be after start time';
    }
    if (minimumRosterSize) {
      const minSize = parseInt(minimumRosterSize);
      if (isNaN(minSize) || minSize < 1) {
        newErrors.minimumRosterSize = 'Must be a positive number';
      }
    }
    if (seasonGameCount) {
      const count = parseInt(seasonGameCount);
      if (isNaN(count) || count < 1) {
        newErrors.seasonGameCount = 'Must be a positive number';
      }
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
      // Schedule management fields
      minimumRosterSize: minimumRosterSize ? parseInt(minimumRosterSize) : null,
      registrationCloseDate: registrationCloseDate ? new Date(registrationCloseDate) : null,
      preferredGameDays: preferredGameDays.length > 0 ? preferredGameDays : undefined,
      preferredTimeWindowStart: timeWindowStart || null,
      preferredTimeWindowEnd: timeWindowEnd || null,
      seasonGameCount: seasonGameCount ? parseInt(seasonGameCount) : null,
      ...(isEdit ? {} : {
        leagueType,
        visibility: leagueType === 'pickup' ? 'public' : visibility,
      }),
    };

    try {
      await onSubmit(formData);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save league');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {!isEdit && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>League Type</Text>
          <Text style={styles.sectionDescription}>
            Choose how your league is structured
          </Text>

          <FormSelect
            label="League Type *"
            placeholder="Select league type"
            value={leagueType}
            options={leagueTypeOptions}
            onSelect={handleLeagueTypeChange}
          />

          {leagueType === 'team' && (
            <FormSelect
              label="Visibility"
              placeholder="Select visibility"
              value={visibility}
              options={visibilityOptions}
              onSelect={(option) => setVisibility(option.value as 'public' | 'private')}
            />
          )}
        </View>
      )}

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
          Configure how many points rosters earn for match results
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

      {/* Schedule Configuration — only for team leagues */}
      {leagueType === 'team' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Configuration</Text>
          <Text style={styles.sectionDescription}>
            Optional settings for roster requirements and auto-scheduling
          </Text>

          <FormInput
            label="Minimum Roster Size"
            placeholder="e.g. 5"
            value={minimumRosterSize}
            onChangeText={setMinimumRosterSize}
            keyboardType="numeric"
            error={errors.minimumRosterSize}
          />

          <FormInput
            label="Registration Close Date"
            placeholder="YYYY-MM-DD"
            value={registrationCloseDate}
            onChangeText={setRegistrationCloseDate}
          />

          <Text style={styles.fieldLabel}>Preferred Game Days</Text>
          <View style={styles.dayChipsRow}>
            {dayLabels.map((label, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dayChip,
                  preferredGameDays.includes(idx) && styles.dayChipSelected,
                ]}
                onPress={() => toggleGameDay(idx)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayChipText,
                    preferredGameDays.includes(idx) && styles.dayChipTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormInput
            label="Time Window Start"
            placeholder="HH:MM (e.g. 18:00)"
            value={timeWindowStart}
            onChangeText={setTimeWindowStart}
            error={errors.timeWindowStart}
          />

          <FormInput
            label="Time Window End"
            placeholder="HH:MM (e.g. 21:00)"
            value={timeWindowEnd}
            onChangeText={setTimeWindowEnd}
            error={errors.timeWindowEnd}
          />

          <FormInput
            label="Season Game Count"
            placeholder="Total games per roster"
            value={seasonGameCount}
            onChangeText={setSeasonGameCount}
            keyboardType="numeric"
            error={errors.seasonGameCount}
          />
        </View>
      )}

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
    backgroundColor: colors.chalk,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    ...typeScale.h3,
    color: colors.ink,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.inkFaint,
    marginBottom: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: fonts.body,
    ...typeScale.bodySm,
    color: colors.ink,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  dayChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dayChipSelected: {
    backgroundColor: colors.grass,
    borderColor: colors.grass,
  },
  dayChipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkFaint,
    fontWeight: '600',
  },
  dayChipTextSelected: {
    color: '#FFFFFF',
  },
});
