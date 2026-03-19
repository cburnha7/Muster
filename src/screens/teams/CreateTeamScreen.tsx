import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { FormInput, FormSelect, FormButton } from '../../components/forms';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { AddMemberSearch } from '../../components/teams/AddMemberSearch';
import { UpsellModal } from '../../components/paywall/UpsellModal';
import { teamService } from '../../services/api/TeamService';
import { addTeam, joinTeam, selectUserTeams } from '../../store/slices/teamsSlice';
import { useFeatureGate } from '../../hooks/useFeatureGate';
import { SportType, SkillLevel, CreateTeamData, User } from '../../types';
import { SubscriptionPlan } from '../../types/subscription';
import { colors } from '../../theme';
import { loggingService } from '../../services/LoggingService';
export function CreateTeamScreen(): JSX.Element {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const userTeams = useSelector(selectUserTeams);
  const { allowed: rosterAllowed, requiredPlan } = useFeatureGate('create_roster');

  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellPlan, setUpsellPlan] = useState<SubscriptionPlan>('roster');

  const [formData, setFormData] = useState<CreateTeamData>({
    name: '',
    description: '',
    sportType: SportType.BASKETBALL,
    sportTypes: [],
    skillLevel: SkillLevel.ALL_LEVELS,
    maxMembers: 10,
    isPublic: true,
  });
  const [genderRestriction, setGenderRestriction] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<User[]>([]);

  const sportTypeOptions = [
    { label: 'Basketball', value: SportType.BASKETBALL },
    { label: 'Pickleball', value: SportType.PICKLEBALL },
    { label: 'Tennis', value: SportType.TENNIS },
    { label: 'Soccer', value: SportType.SOCCER },
    { label: 'Softball', value: SportType.SOFTBALL },
    { label: 'Baseball', value: SportType.BASEBALL },
    { label: 'Volleyball', value: SportType.VOLLEYBALL },
    { label: 'Flag Football', value: SportType.FLAG_FOOTBALL },
    { label: 'Kickball', value: SportType.KICKBALL },
    { label: 'Hockey', value: SportType.HOCKEY },
    { label: 'Other', value: SportType.OTHER },
  ];

  const toggleSport = (sport: SportType) => {
    const current = formData.sportTypes || [];
    const updated = current.includes(sport)
      ? current.filter(s => s !== sport)
      : [...current, sport];
    setFormData(prev => ({
      ...prev,
      sportTypes: updated,
      sportType: updated.length > 0 ? updated[0] : prev.sportType,
    }));
    if (errors.sportTypes) {
      setErrors(prev => { const e = { ...prev }; delete e.sportTypes; return e; });
    }
  };

  const skillLevelOptions = [
    { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
    { label: 'Beginner', value: SkillLevel.BEGINNER },
    { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
    { label: 'Advanced', value: SkillLevel.ADVANCED },
  ];

  const visibilityOptions = [
    { label: 'Public (Anyone can find and join)', value: true },
    { label: 'Private (Invite only)', value: false },
  ];



  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Roster name is required';
      loggingService.logValidation('CreateTeamScreen', 'name', 'required', 'Roster name is required');
    } else if (formData.name.length < 3) {
      newErrors.name = 'Roster name must be at least 3 characters';
      loggingService.logValidation('CreateTeamScreen', 'name', 'minLength', 'Roster name must be at least 3 characters');
    } else if (formData.name.length > 50) {
      newErrors.name = 'Roster name must be less than 50 characters';
      loggingService.logValidation('CreateTeamScreen', 'name', 'maxLength', 'Roster name must be less than 50 characters');
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
      loggingService.logValidation('CreateTeamScreen', 'description', 'maxLength', 'Description must be less than 500 characters');
    }

    if (formData.maxMembers < 2) {
      newErrors.maxMembers = 'Roster must allow at least 2 players';
      loggingService.logValidation('CreateTeamScreen', 'maxMembers', 'min', 'Roster must allow at least 2 players');
    } else if (formData.maxMembers > 100) {
      newErrors.maxMembers = 'Maximum players cannot exceed 100';
      loggingService.logValidation('CreateTeamScreen', 'maxMembers', 'max', 'Maximum players cannot exceed 100');
    }

    if (!formData.sportTypes || formData.sportTypes.length === 0) {
      newErrors.sportTypes = 'At least one sport is required';
      loggingService.logValidation('CreateTeamScreen', 'sportTypes', 'required', 'At least one sport is required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTeam = async () => {
    if (!validateForm()) {
      return;
    }

    // Gate: 2nd+ roster requires roster plan
    if (userTeams.length >= 1 && !rosterAllowed) {
      setUpsellPlan(requiredPlan);
      setShowUpsell(true);
      return;
    }

    loggingService.logButton('Create Roster', 'CreateTeamScreen');

    setIsLoading(true);

    try {
      // Create the team with pending member IDs
      const teamDataWithMembers = {
        ...formData,
        genderRestriction: genderRestriction || undefined,
        initialMemberIds: pendingMembers.map(m => m.id),
      };
      
      const newTeam = await teamService.createTeam(teamDataWithMembers as any);
      
      // Add team to store
      dispatch(addTeam(newTeam));
      dispatch(joinTeam(newTeam)); // Add to user's teams

      // Navigate back to roster list immediately
      (navigation as any).replace('TeamsList');
    } catch (error: any) {
      console.error('Error creating roster:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create roster. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof CreateTeamData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear pending members if switching from private to public
    if (field === 'isPublic' && value === true) {
      setPendingMembers([]);
    }
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddPendingMember = async (user: User) => {
    // Add to pending members list
    setPendingMembers(prev => [...prev, user]);
  };

  const handleRemovePendingMember = (userId: string) => {
    setPendingMembers(prev => prev.filter(m => m.id !== userId));
  };

  if (isLoading) {
    return <LoadingSpinner message="Creating roster..." />;
  }

  return (
    <>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader
        title="Create Roster"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Roster Information</Text>

          <FormInput
            label="Roster Name *"
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            placeholder="Enter roster name"
            error={errors.name}
            maxLength={50}
          />

          <FormInput
            label="Description"
            value={formData.description || ''}
            onChangeText={(value) => updateFormData('description', value)}
            placeholder="Tell others about your roster"
            multiline
            numberOfLines={4}
            error={errors.description}
            maxLength={500}
          />

          <View>
            <Text style={styles.fieldLabel}>Sports *</Text>
            <Text style={styles.fieldHint}>Select one or more sports for this roster</Text>
            <View style={styles.sportChipsRow}>
              {sportTypeOptions.map((opt) => {
                const selected = (formData.sportTypes || []).includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.sportChip, selected && styles.sportChipSelected]}
                    onPress={() => toggleSport(opt.value)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={opt.label}
                  >
                    <Text style={[styles.sportChipText, selected && styles.sportChipTextSelected]}>
                      {opt.label}
                    </Text>
                    {selected && (
                      <Ionicons name="close-circle" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.sportTypes && <Text style={styles.fieldError}>{errors.sportTypes}</Text>}
          </View>

          <FormSelect
            label="Skill Level *"
            value={formData.skillLevel}
            onValueChange={(value) => updateFormData('skillLevel', value)}
            options={skillLevelOptions}
          />

          <FormInput
            label="Maximum Players *"
            value={formData.maxMembers.toString()}
            onChangeText={(value) => {
              const numValue = parseInt(value, 10);
              if (!isNaN(numValue) || value === '') {
                updateFormData('maxMembers', value === '' ? 0 : numValue);
              }
            }}
            placeholder="Enter maximum number of players"
            keyboardType="numeric"
            error={errors.maxMembers}
          />

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Public Roster</Text>
              <Text style={styles.toggleDescription}>
                {formData.isPublic ? 'Anyone can find and join' : 'Invite only'}
              </Text>
            </View>
            <Switch
              value={formData.isPublic}
              onValueChange={(value) => updateFormData('isPublic', value)}
              trackColor={{ false: '#D1D5DB', true: colors.pineLight }}
              thumbColor={formData.isPublic ? colors.pine : '#F4F4F5'}
            />
          </View>

          {/* Gender Restriction */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Gender</Text>
              <Text style={styles.toggleDescription}>
                {genderRestriction === 'male' ? 'Male only' : genderRestriction === 'female' ? 'Female only' : 'Open to all'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[{ label: 'All', value: '' }, { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: genderRestriction === opt.value ? colors.pine : '#F3F4F6',
                    borderWidth: 1,
                    borderColor: genderRestriction === opt.value ? colors.pine : '#E5E7EB',
                  }}
                  onPress={() => setGenderRestriction(opt.value)}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: genderRestriction === opt.value ? '#FFFFFF' : colors.inkFaint,
                  }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Invites Section */}
          <View style={styles.addMembersSection}>
            <View style={styles.addMembersHeader}>
              <Text style={styles.addMembersTitle}>Invites</Text>
            </View>
              <Text style={styles.addMembersDescription}>
                Search for existing users and add them to your roster. They will be added when you create the roster.
              </Text>

              {/* Pending Players List */}
              {pendingMembers.length > 0 && (
                <View style={styles.pendingMembersContainer}>
                  <Text style={styles.pendingMembersTitle}>
                    Invited ({pendingMembers.length})
                  </Text>
                  {pendingMembers.map((member) => (
                    <View key={member.id} style={styles.pendingMemberItem}>
                      <View style={styles.pendingMemberInfo}>
                        {member.profileImage ? (
                          <Image
                            source={{ uri: member.profileImage }}
                            style={styles.pendingMemberAvatar}
                          />
                        ) : (
                          <View style={[styles.pendingMemberAvatar, styles.pendingMemberAvatarPlaceholder]}>
                            <Text style={styles.pendingMemberAvatarText}>
                              {member.firstName?.[0] || '?'}
                            </Text>
                          </View>
                        )}
                        <View style={styles.pendingMemberDetails}>
                          <Text style={styles.pendingMemberName}>
                            {member.firstName} {member.lastName}
                          </Text>
                          <Text style={styles.pendingMemberEmail}>{member.email}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.removeMemberButton}
                        onPress={() => handleRemovePendingMember(member.id)}
                      >
                        <Ionicons name="close-circle" size={24} color={colors.heart} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Search Component */}
              <AddMemberSearch
                onAddMember={handleAddPendingMember}
                existingMemberIds={pendingMembers.map(m => m.id)}
              />
            </View>

          <FormButton
            title="Create Roster"
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

      <UpsellModal
        visible={showUpsell}
        requiredPlan={upsellPlan}
        onClose={() => setShowUpsell(false)}
        onUpgrade={() => {
          setShowUpsell(false);
          // TODO: Navigate to subscription/checkout screen
        }}
      />
    </>
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
    paddingBottom: 40,
  },
  form: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: colors.courtLight + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.courtLight + '40',
  },
  infoText: {
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  toggleDescription: {
    fontSize: 13,
    color: colors.inkFaint,
    marginTop: 2,
  },
  addMembersSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addMembersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addMembersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  privateBadge: {
    backgroundColor: colors.courtLight + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  privateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.court,
  },
  addMembersDescription: {
    fontSize: 14,
    color: colors.inkFaint,
    lineHeight: 20,
  },
  pendingMembersContainer: {
    gap: 8,
  },
  pendingMembersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  pendingMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cream,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.pine + '40',
  },
  pendingMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  pendingMemberAvatarPlaceholder: {
    backgroundColor: colors.pine,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingMemberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pendingMemberDetails: {
    flex: 1,
  },
  pendingMemberName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
    marginBottom: 2,
  },
  pendingMemberEmail: {
    fontSize: 13,
    color: colors.inkFaint,
  },
  removeMemberButton: {
    padding: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 13,
    color: colors.inkFaint,
    marginBottom: 8,
  },
  fieldError: {
    fontSize: 13,
    color: colors.heart,
    marginTop: 4,
  },
  sportChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sportChipSelected: {
    backgroundColor: colors.pine,
    borderColor: colors.pine,
  },
  sportChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkFaint,
  },
  sportChipTextSelected: {
    color: '#FFFFFF',
  },
});