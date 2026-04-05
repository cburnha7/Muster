import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormInput, FormButton } from '../../components/forms';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { teamService } from '../../services/api/TeamService';
import { joinTeam } from '../../store/slices/teamsSlice';
import { selectDependents } from '../../store/slices/contextSlice';
import { useAuth } from '../../context/AuthContext';
import { DependentSummary } from '../../types/dependent';
import { colors } from '../../theme';

interface JoinTeamScreenProps {
  route: {
    params: {
      inviteCode?: string;
    };
  };
}

export function JoinTeamScreen({ route }: JoinTeamScreenProps) {
  const { inviteCode: initialInviteCode } = route.params || {};
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const dependents = useSelector(selectDependents);

  const [inviteCode, setInviteCode] = useState(initialInviteCode || '');
  const [validatedTeam, setValidatedTeam] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [showDependentPicker, setShowDependentPicker] = useState(false);

  useEffect(() => {
    if (initialInviteCode) {
      validateInviteCode(initialInviteCode);
    }
  }, [initialInviteCode]);

  const validateInviteCode = async (code: string) => {
    if (!code.trim()) {
      setError('Please enter an invite code');
      setValidatedTeam(null);
      return;
    }

    try {
      setIsValidating(true);
      setError(null);

      const result = await teamService.validateInviteCode(code);

      if (result.valid && result.team) {
        setValidatedTeam(result.team);
        setExpiresAt(result.expiresAt || null);
        setError(null);
      } else {
        setValidatedTeam(null);
        setError('Invalid or expired invite code');
      }
    } catch (err: any) {
      console.error('Error validating invite code:', err);
      setError(err.message || 'Failed to validate invite code');
      setValidatedTeam(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleValidate = () => {
    validateInviteCode(inviteCode);
  };

  const performJoin = async (joinAsUserId?: string) => {
    if (!validatedTeam) return;

    try {
      setIsJoining(true);

      // Build headers for joining as a dependent
      const headers: Record<string, string> = {};
      if (joinAsUserId && joinAsUserId !== user?.id) {
        headers['X-Active-User-Id'] = joinAsUserId;
      }

      await teamService.joinTeam(validatedTeam.id, inviteCode);

      // Fetch updated team data
      const updatedTeam = await teamService.getTeam(validatedTeam.id);
      dispatch(joinTeam(updatedTeam));

      const joinedName =
        joinAsUserId && joinAsUserId !== user?.id
          ? dependents.find(d => d.id === joinAsUserId)?.firstName ||
            'Your child'
          : 'You';

      Alert.alert('Success', `${joinedName} joined ${validatedTeam.name}!`, [
        {
          text: 'View Roster',
          onPress: () => {
            navigation.goBack();
            (navigation as any).navigate('TeamDetails', {
              teamId: validatedTeam.id,
            });
          },
        },
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      console.error('Error joining roster:', err);
      Alert.alert(
        'Error',
        err.message || 'Failed to join roster. Please try again.'
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!validatedTeam) {
      Alert.alert('Error', 'Please validate the invite code first');
      return;
    }

    // If user has dependents, show picker
    if (dependents.length > 0) {
      setShowDependentPicker(true);
      return;
    }

    // No dependents — join as self
    Alert.alert('Join Team', `Do you want to join ${validatedTeam.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Join', onPress: () => performJoin() },
    ]);
  };

  const handleDependentSelection = (selectedUserId: string) => {
    setShowDependentPicker(false);
    const selectedName =
      selectedUserId === user?.id
        ? 'yourself'
        : dependents.find(d => d.id === selectedUserId)?.firstName ||
          'your child';

    Alert.alert(
      'Join Team',
      `Join ${validatedTeam?.name} as ${selectedName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Join', onPress: () => performJoin(selectedUserId) },
      ]
    );
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (isJoining) {
    return <LoadingSpinner />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader title="Join Team" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.title}>Enter Invite Code</Text>
          <Text style={styles.subtitle}>
            Enter the invite code shared by the roster manager to join the
            roster
          </Text>

          <FormInput
            label="Invite Code"
            value={inviteCode}
            onChangeText={text => {
              setInviteCode(text.toUpperCase());
              setError(null);
              setValidatedTeam(null);
            }}
            placeholder="XXXXX-XXXXX"
            autoCapitalize="characters"
            error={error || undefined}
            maxLength={20}
          />

          <FormButton
            title={isValidating ? 'Validating...' : 'Validate Code'}
            onPress={handleValidate}
            disabled={!inviteCode.trim() || isValidating}
          />

          {validatedTeam && (
            <View style={styles.validatedSection}>
              <View style={styles.successBanner}>
                <Text style={styles.successText}>Valid Invite Code</Text>
                {expiresAt && (
                  <Text style={styles.expiresText}>
                    Expires: {new Date(expiresAt).toLocaleDateString()}
                  </Text>
                )}
              </View>

              <Text style={styles.teamPreviewTitle}>Roster Preview</Text>

              <View style={styles.teamInfo}>
                <Text style={styles.teamNameText}>{validatedTeam.name}</Text>
                <Text style={styles.infoItem}>
                  Sport:{' '}
                  {validatedTeam.sportType?.charAt(0).toUpperCase() +
                    validatedTeam.sportType?.slice(1).replace(/_/g, ' ')}
                </Text>
                <Text style={styles.infoItem}>
                  Skill Level: {validatedTeam.skillLevel}
                </Text>
                <Text style={styles.infoItem}>
                  Players: {validatedTeam.memberCount}/
                  {validatedTeam.maxMembers}
                </Text>
              </View>

              <FormButton
                title={
                  dependents.length > 0
                    ? 'Join This Roster...'
                    : 'Join This Roster'
                }
                onPress={handleJoinTeam}
                disabled={isJoining}
              />
            </View>
          )}

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Don't have an invite code?</Text>
            <Text style={styles.helpText}>
              Ask the roster manager to share their invite code with you, or
              browse public rosters to join without a code.
            </Text>
            <FormButton
              title="Browse Public Rosters"
              onPress={() => {
                navigation.goBack();
              }}
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>

      {/* ── "Who's joining?" picker modal ── */}
      <Modal
        visible={showDependentPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDependentPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Who's joining?</Text>
            <Text style={styles.modalSubtitle}>
              Select who will be added to {validatedTeam?.name}
            </Text>

            {/* Self option */}
            <TouchableOpacity
              style={styles.pickerOption}
              onPress={() => handleDependentSelection(user?.id || '')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="person-circle-outline"
                size={28}
                color={colors.cobalt}
              />
              <View style={styles.pickerOptionText}>
                <Text style={styles.pickerOptionName}>
                  Me ({user?.firstName})
                </Text>
                <Text style={styles.pickerOptionHint}>Join as a player</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.onSurfaceVariant}
              />
            </TouchableOpacity>

            {/* Dependent options */}
            {dependents.map((dep: DependentSummary) => (
              <TouchableOpacity
                key={dep.id}
                style={styles.pickerOption}
                onPress={() => handleDependentSelection(dep.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="people-circle-outline"
                  size={28}
                  color={colors.gold}
                />
                <View style={styles.pickerOptionText}>
                  <Text style={styles.pickerOptionName}>
                    {dep.firstName} {dep.lastName}
                  </Text>
                  <Text style={styles.pickerOptionHint}>
                    Join as your child
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowDependentPicker(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  form: {
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  validatedSection: {
    marginTop: 24,
    gap: 16,
  },
  successBanner: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 4,
  },
  expiresText: {
    fontSize: 14,
    color: '#047857',
  },
  teamPreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  teamNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  teamInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoItem: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  helpSection: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    gap: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // ── Dependent picker modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  pickerOptionText: {
    flex: 1,
  },
  pickerOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  pickerOptionHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
