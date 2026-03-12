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
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { FormInput, FormSelect, FormButton } from '../../components/forms';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { teamService } from '../../services/api/TeamService';
import { addTeam, joinTeam } from '../../store/slices/teamsSlice';
import { SportType, SkillLevel, CreateTeamData } from '../../types';

export function CreateTeamScreen(): JSX.Element {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState<CreateTeamData>({
    name: '',
    description: '',
    sportType: SportType.BASKETBALL,
    skillLevel: SkillLevel.ALL_LEVELS,
    maxMembers: 10,
    isPublic: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const sportTypeOptions = [
    { label: 'Basketball', value: SportType.BASKETBALL },
    { label: 'Soccer', value: SportType.SOCCER },
    { label: 'Tennis', value: SportType.TENNIS },
    { label: 'Volleyball', value: SportType.VOLLEYBALL },
    { label: 'Badminton', value: SportType.BADMINTON },
    { label: 'Other', value: SportType.OTHER },
  ];

  const skillLevelOptions = [
    { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
    { label: 'Beginner', value: SkillLevel.BEGINNER },
    { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
    { label: 'Advanced', value: SkillLevel.ADVANCED },
  ];

  const visibilityOptions = [
    { label: 'Public (Anyone can find and join)', value: 'true' },
    { label: 'Private (Invite only)', value: 'false' },
  ];

  const maxMembersOptions = [
    { label: '5 members', value: '5' },
    { label: '10 members', value: '10' },
    { label: '15 members', value: '15' },
    { label: '20 members', value: '20' },
    { label: '25 members', value: '25' },
    { label: '30 members', value: '30' },
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Team name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Team name must be less than 50 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (formData.maxMembers < 2) {
      newErrors.maxMembers = 'Team must allow at least 2 members';
    } else if (formData.maxMembers > 100) {
      newErrors.maxMembers = 'Maximum members cannot exceed 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTeam = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const newTeam = await teamService.createTeam(formData);
      
      // Add team to store
      dispatch(addTeam(newTeam));
      dispatch(joinTeam(newTeam)); // Add to user's teams

      Alert.alert(
        'Success',
        'Team created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
              // Navigate to team details
              (navigation as any).navigate('TeamDetails', { teamId: newTeam.id });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating team:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create team. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof CreateTeamData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Creating team..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader
        title="Create Team"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Team Information</Text>

          <FormInput
            label="Team Name *"
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            placeholder="Enter team name"
            error={errors.name}
            maxLength={50}
          />

          <FormInput
            label="Description"
            value={formData.description || ''}
            onChangeText={(value) => updateFormData('description', value)}
            placeholder="Tell others about your team"
            multiline
            numberOfLines={4}
            error={errors.description}
            maxLength={500}
          />

          <FormSelect
            label="Sport Type *"
            value={formData.sportType}
            onValueChange={(value) => updateFormData('sportType', value)}
            options={sportTypeOptions}
          />

          <FormSelect
            label="Skill Level *"
            value={formData.skillLevel}
            onValueChange={(value) => updateFormData('skillLevel', value)}
            options={skillLevelOptions}
          />

          <FormSelect
            label="Maximum Members *"
            value={formData.maxMembers.toString()}
            onValueChange={(value) => updateFormData('maxMembers', parseInt(value, 10))}
            options={maxMembersOptions}
          />

          <FormSelect
            label="Team Visibility *"
            value={formData.isPublic.toString()}
            onValueChange={(value) => updateFormData('isPublic', value === 'true')}
            options={visibilityOptions}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {formData.isPublic
                ? '🌐 Public teams can be discovered and joined by anyone'
                : '🔒 Private teams require an invite code to join'}
            </Text>
          </View>

          <FormButton
            title="Create Team"
            onPress={handleCreateTeam}
            disabled={isLoading}
          />

          <FormButton
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="secondary"
            disabled={isLoading}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  form: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});