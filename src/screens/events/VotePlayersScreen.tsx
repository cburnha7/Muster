import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormButton } from '../../components/forms/FormButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { colors } from '../../theme';

interface Participant {
  userId: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  currentRating: number;
}

interface RouteParams {
  eventId: string;
  eventTitle: string;
}

export function VotePlayersScreen(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
  const { eventId, eventTitle } = route.params;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadParticipants();
  }, [eventId]);

  const loadParticipants = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      // const response = await eventService.getEventParticipants(eventId);
      
      // Mock data for now
      const mockParticipants: Participant[] = [
        {
          userId: '1',
          firstName: 'John',
          lastName: 'Doe',
          currentRating: 3.5,
        },
        {
          userId: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          currentRating: 4.2,
        },
        {
          userId: '3',
          firstName: 'Mike',
          lastName: 'Johnson',
          currentRating: 2.8,
        },
      ];
      
      setParticipants(mockParticipants);
    } catch (error) {
      Alert.alert('Error', 'Failed to load participants');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayer = (userId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedPlayers(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedPlayers.size === 0) {
      Alert.alert('No Votes', 'Please select at least one player to vote for');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // TODO: Replace with actual API call
      // await eventService.submitVotes(eventId, Array.from(selectedPlayers));
      
      Alert.alert(
        'Votes Submitted',
        'Thank you for rating your fellow players!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit votes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(Math.round(rating));
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Vote for Players" />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Vote for Players" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.eventTitle}>{eventTitle}</Text>
          <Text style={styles.instructions}>
            Select the players who performed well in this game. You can vote for multiple players.
          </Text>
          <View style={styles.voteCount}>
            <Ionicons name="checkmark-circle" size={20} color={colors.cobalt} />
            <Text style={styles.voteCountText}>
              {selectedPlayers.size} {selectedPlayers.size === 1 ? 'vote' : 'votes'} selected
            </Text>
          </View>
        </View>

        <View style={styles.participantsList}>
          {participants.map(participant => {
            const isSelected = selectedPlayers.has(participant.userId);
            const fullName = `${participant.firstName} ${participant.lastName}`;

            return (
              <TouchableOpacity
                key={participant.userId}
                style={[styles.participantCard, isSelected && styles.participantCardSelected]}
                onPress={() => togglePlayer(participant.userId)}
                activeOpacity={0.7}
              >
                <View style={styles.participantInfo}>
                  {participant.profileImage ? (
                    <Image
                      source={{ uri: participant.profileImage }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {participant.firstName[0]}{participant.lastName[0]}
                      </Text>
                    </View>
                  )}

                  <View style={styles.participantDetails}>
                    <Text style={styles.participantName}>{fullName}</Text>
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingStars}>
                        {getRatingStars(participant.currentRating)}
                      </Text>
                      <Text style={styles.ratingValue}>
                        {participant.currentRating.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Your votes help build a fair rating system for all players. Ratings are anonymous.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <FormButton
          title="Skip"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
          disabled={isSubmitting}
        />
        <FormButton
          title={`Submit ${selectedPlayers.size} ${selectedPlayers.size === 1 ? 'Vote' : 'Votes'}`}
          onPress={handleSubmit}
          style={styles.actionButton}
          loading={isSubmitting}
          disabled={isSubmitting || selectedPlayers.size === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  voteCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voteCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cobalt,
  },
  participantsList: {
    padding: 16,
    gap: 12,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  participantCardSelected: {
    borderColor: colors.cobalt,
    backgroundColor: '#F0F9FF',
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cobalt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingStars: {
    fontSize: 14,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.cobalt,
    borderColor: colors.cobalt,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    borderRadius: 8,
  },
  footerNote: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
