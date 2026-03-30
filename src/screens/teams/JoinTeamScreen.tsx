import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormInput, FormButton } from '../../components/forms';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { TeamCard } from '../../components/ui/TeamCard';
import { teamService } from '../../services/api/TeamService';
import { joinTeam } from '../../store/slices/teamsSlice';
import { Team } from '../../types';
import { colors } from '../../theme';

interface JoinTeamScreenProps {
  route: {
    params: {
      inviteCode?: string;
    };
  };
}

export function JoinTeamScreen({ route }: JoinTeamScreenProps): JSX.Element {
  const { inviteCode: initialInviteCode } = route.params || {};
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [inviteCode, setInviteCode] = useState(initialInviteCode || '');
  const [validatedTeam, setValidatedTeam] = useState<Team | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

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

  const handleJoinTeam = async () => {
    if (!validatedTeam) {
      Alert.alert('Error', 'Please validate the invite code first');
      return;
    }

    Alert.alert(
      'Join Team',
      `Do you want to join ${validatedTeam.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            try {
              setIsJoining(true);
              await teamService.joinTeam(validatedTeam.id, inviteCode);
              
              // Fetch updated team data
              const updatedTeam = await teamService.getTeam(validatedTeam.id);
              dispatch(joinTeam(updatedTeam));

              Alert.alert(
                'Success',
                `You have joined ${validatedTeam.name}!`,
                [
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
                ]
              );
            } catch (err: any) {
              console.error('Error joining roster:', err);
              Alert.alert(
                'Error',
                err.message || 'Failed to join roster. Please try again.'
              );
            } finally {
              setIsJoining(false);
            }
          },
        },
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
      <ScreenHeader
        title="Join Team"
        showBack
        onBackPress={handleCancel}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.title}>Enter Invite Code</Text>
          <Text style={styles.subtitle}>
            Enter the invite code shared by the roster manager to join the roster
          </Text>

          <FormInput
            label="Invite Code"
            value={inviteCode}
            onChangeText={(text) => {
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
                <Text style={styles.successText}>✓ Valid Invite Code</Text>
                {expiresAt && (
                  <Text style={styles.expiresText}>
                    Expires: {new Date(expiresAt).toLocaleDateString()}
                  </Text>
                )}
              </View>

              <Text style={styles.teamPreviewTitle}>Roster Preview</Text>
              <TeamCard
                team={validatedTeam}
                onPress={() => {}}
                showJoinButton={false}
              />

              <View style={styles.teamInfo}>
                <Text style={styles.infoTitle}>About this roster:</Text>
                <Text style={styles.infoItem}>
                  🏀 Sport: {(() => {
                    const sports = validatedTeam.sportTypes && validatedTeam.sportTypes.length > 0
                      ? validatedTeam.sportTypes
                      : [validatedTeam.sportType];
                    return sports.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')).join(', ');
                  })()}
                </Text>
                <Text style={styles.infoItem}>
                  📊 Skill Level: {validatedTeam.skillLevel}
                </Text>
                <Text style={styles.infoItem}>
                  👥 Players: {validatedTeam.members.length}/{validatedTeam.maxMembers}
                </Text>
                {validatedTeam.description && (
                  <Text style={styles.infoDescription}>
                    {validatedTeam.description}
                  </Text>
                )}
              </View>

              <FormButton
                title="Join This Roster"
                onPress={handleJoinTeam}
                disabled={isJoining}
              />
            </View>
          )}

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Don't have an invite code?</Text>
            <Text style={styles.helpText}>
              Ask the roster manager to share their invite code with you, or browse
              public rosters to join without a code.
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
  teamInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  infoDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 8,
    fontStyle: 'italic',
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
});