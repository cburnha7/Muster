import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { TimePickerInput } from '../../components/forms/TimePickerInput';
import { DatePickerInput } from '../../components/forms/DatePickerInput';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';

import { eventService } from '../../services/api/EventService';
import { facilityService } from '../../services/api/FacilityService';
import { teamService } from '../../services/api/TeamService';
import { updateEvent } from '../../store/slices/eventsSlice';
import { colors, fonts, Spacing, useTheme } from '../../theme';
import { loggingService } from '../../services/LoggingService';
import {
  Event,
  UpdateEventData,
  SportType,
  SkillLevel,
  EventType,
  EventStatus,
  Facility,
} from '../../types';
import { API_BASE_URL } from '../../services/api/config';

interface EditEventScreenProps {
  route: {
    params: {
      eventId: string;
    };
  };
}

interface FormData {
  title: string;
  description: string;
  sportType: SportType | '';
  facilityId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  maxParticipants: string;
  price: string;
  skillLevel: SkillLevel | '';
  equipment: string;
  rules: string;
  eventType: EventType | '';
  status: EventStatus | '';
}

interface FormErrors {
  [key: string]: string;
}

interface InviteItem {
  id: string;
  name: string;
  type: 'roster' | 'player';
  image?: string;
}

interface InvitedPlayer {
  userId: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  status: 'confirmed' | 'invited';
}

export function EditEventScreen(): JSX.Element {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { eventId } = (route.params as any) || {};

  // State
  const [event, setEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    sportType: '',
    facilityId: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    maxParticipants: '',
    price: '0',
    skillLevel: '',
    equipment: '',
    rules: '',
    eventType: '',
    status: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Invite state
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<InviteItem[]>([]);
  const [players, setPlayers] = useState<InvitedPlayer[]>([]);

  // Form options
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

  const skillLevelOptions: SelectOption[] = [
    { label: 'Beginner', value: SkillLevel.BEGINNER },
    { label: 'Intermediate', value: SkillLevel.INTERMEDIATE },
    { label: 'Advanced', value: SkillLevel.ADVANCED },
    { label: 'All Levels', value: SkillLevel.ALL_LEVELS },
  ];

  const eventTypeOptions: SelectOption[] = [
    { label: 'Game', value: EventType.GAME },
    { label: 'Practice', value: EventType.PRACTICE },
    { label: 'Pickup', value: EventType.PICKUP },
  ];

  const statusOptions: SelectOption[] = [
    { label: 'Active', value: EventStatus.ACTIVE },
    { label: 'Cancelled', value: EventStatus.CANCELLED },
    { label: 'Completed', value: EventStatus.COMPLETED },
  ];

  // Load event and facilities
  useEffect(() => {
    if (eventId) {
      loadEventAndFacilities();
    }
  }, [eventId]);

  const loadEventAndFacilities = async () => {
    try {
      setIsLoadingEvent(true);
      setLoadError(null);

      const [eventResponse, facilitiesResponse] = await Promise.all([
        eventService.getEvent(eventId),
        facilityService.getFacilities(),
      ]);

      setEvent(eventResponse);
      setFacilities(facilitiesResponse.data);

      // Populate form with event data
      const startDate = new Date(eventResponse.startTime);
      const endDate = new Date(eventResponse.endTime);

      setFormData({
        title: eventResponse.title,
        description: eventResponse.description,
        sportType: eventResponse.sportType,
        facilityId: eventResponse.facilityId,
        startDate: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split('T')[0],
        endTime: endDate.toTimeString().slice(0, 5),
        maxParticipants: eventResponse.maxParticipants.toString(),
        price: eventResponse.price.toString(),
        skillLevel: eventResponse.skillLevel,
        equipment: eventResponse.equipment.join(', '),
        rules: eventResponse.rules || '',
        eventType: eventResponse.eventType,
        status: eventResponse.status,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load event';
      setLoadError(errorMessage);
    } finally {
      setIsLoadingEvent(false);
    }
  };

  // Load participants + invited users
  useEffect(() => {
    if (!event) return;
    (async () => {
      try {
        const data = await eventService.getEventParticipants(eventId, true);
        const confirmed: InvitedPlayer[] = (data.participants || []).map(
          (p: any) => ({
            userId: p.userId,
            firstName: p.user?.firstName || 'Unknown',
            lastName: p.user?.lastName || '',
            profileImage: p.user?.profileImage,
            status: 'confirmed' as const,
          })
        );
        // Fetch invited users who haven't joined yet
        const invitedIds: string[] = event.invitedUserIds || [];
        const confirmedIds = new Set(confirmed.map(p => p.userId));
        const pendingIds = invitedIds.filter(id => !confirmedIds.has(id));
        let pending: InvitedPlayer[] = [];
        if (pendingIds.length > 0) {
          // Fetch user details for pending invites
          for (const uid of pendingIds) {
            try {
              const resp = await fetch(`${API_BASE_URL}/users/${uid}`);
              if (resp.ok) {
                const u = await resp.json();
                pending.push({
                  userId: u.id,
                  firstName: u.firstName,
                  lastName: u.lastName,
                  profileImage: u.profileImage,
                  status: 'invited',
                });
              }
            } catch (err) {
              console.warn(
                'Failed to fetch user:',
                uid,
                (err as Error).message
              );
            }
          }
        }
        setPlayers([...confirmed, ...pending]);
      } catch (err) {
        console.warn('Failed to load players:', (err as Error).message);
      }
    })();
  }, [event, eventId]);

  // Invite search
  useEffect(() => {
    if (!inviteQuery.trim()) {
      setInviteResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const isGame = formData.eventType === EventType.GAME;
        if (isGame) {
          const res = await teamService.getTeams(undefined, {
            page: 1,
            limit: 15,
          });
          setInviteResults(
            (res.data || [])
              .filter((t: any) =>
                t.name.toLowerCase().includes(inviteQuery.toLowerCase())
              )
              .map((t: any) => ({
                id: t.id,
                name: t.name,
                type: 'roster' as const,
              }))
          );
        } else {
          let searchPlayers: any[] = [];
          try {
            const resp = await fetch(
              `${API_BASE_URL}/users/search?query=${encodeURIComponent(inviteQuery)}&limit=10`
            );
            const json = await resp.json();
            searchPlayers = Array.isArray(json) ? json : json.data || [];
          } catch (err) {
            console.warn('Player search failed:', (err as Error).message);
          }
          setInviteResults(
            searchPlayers.map((u: any) => ({
              id: u.id,
              name: `${u.firstName} ${u.lastName}`,
              type: 'player' as const,
              image: u.profileImage,
            }))
          );
        }
      } catch {
        setInviteResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inviteQuery, formData.eventType]);

  const addInvite = (item: InviteItem) => {
    if (players.some(p => p.userId === item.id)) return;
    setPlayers(prev => [
      ...prev,
      {
        userId: item.id,
        firstName: item.name.split(' ')[0] || item.name,
        lastName: item.name.split(' ').slice(1).join(' '),
        profileImage: item.image,
        status: 'invited',
      },
    ]);
    setInviteQuery('');
    setInviteResults([]);
  };

  const removeInvite = (userId: string) => {
    setPlayers(prev =>
      prev.filter(p => p.userId !== userId || p.status === 'confirmed')
    );
  };

  // Get facility options
  const facilityOptions: SelectOption[] = facilities.map(facility => ({
    label: facility.name,
    value: facility.id,
  }));

  // Handle input change
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle select change
  const handleSelectChange = (field: keyof FormData, option: SelectOption) => {
    handleInputChange(field, option.value.toString());
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.sportType) {
      newErrors.sportType = 'Sport type is required';
    }

    if (!formData.facilityId) {
      newErrors.facilityId = 'Grounds is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (!formData.maxParticipants) {
      newErrors.maxParticipants = 'Max participants is required';
    } else {
      const maxParticipants = parseInt(formData.maxParticipants);
      if (isNaN(maxParticipants) || maxParticipants < 1) {
        newErrors.maxParticipants = 'Must be a valid number greater than 0';
      }

      // Check if reducing capacity below current participants
      if (event && maxParticipants < event.currentParticipants) {
        newErrors.maxParticipants = `Cannot reduce below current participants (${event.currentParticipants})`;
      }
    }

    if (!formData.skillLevel) {
      newErrors.skillLevel = 'Skill level is required';
    }

    if (!formData.eventType) {
      newErrors.eventType = 'Event type is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    // Price validation
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      newErrors.price = 'Price must be a valid number (0 or greater)';
    }

    // Date/time validation
    if (
      formData.startDate &&
      formData.startTime &&
      formData.endDate &&
      formData.endTime
    ) {
      const startDateTime = new Date(
        `${formData.startDate}T${formData.startTime}`
      );
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      if (endDateTime <= startDateTime) {
        newErrors.endDate = 'End date/time must be after start date/time';
      }
    }

    // Log each validation failure
    Object.entries(newErrors).forEach(([field, msg]) => {
      if (msg)
        loggingService.logValidation('EditEventScreen', field, 'invalid', msg);
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm() || !event) {
      return;
    }

    loggingService.logButton('Save Changes', 'EditEventScreen');
    try {
      setIsLoading(true);

      const startDateTime = new Date(
        `${formData.startDate}T${formData.startTime}`
      );
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      const updateData: UpdateEventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        sportType: formData.sportType as SportType,
        facilityId: formData.facilityId,
        startTime: startDateTime,
        endTime: endDateTime,
        maxParticipants: parseInt(formData.maxParticipants),
        price: parseFloat(formData.price),
        skillLevel: formData.skillLevel as SkillLevel,
        equipment: formData.equipment
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
        rules: formData.rules.trim() || undefined,
        eventType: formData.eventType as EventType,
        status: formData.status as EventStatus,
        invitedUserIds: players
          .filter(p => p.status === 'invited')
          .map(p => p.userId),
      } as any;

      const updatedEvent = await eventService.updateEvent(event.id, updateData);
      dispatch(updateEvent(updatedEvent));

      // Navigate back to the event details screen
      navigation.goBack();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update event';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (!event) return;
    loggingService.logButton('Delete Event', 'EditEventScreen');

    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!event) return;

    try {
      setIsLoading(true);
      await eventService.deleteEvent(event.id);

      Alert.alert('Success', 'Event deleted successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete event';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigation.goBack();
  };

  if (isLoadingEvent) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Edit Event"
          showBack={true}
          onBackPress={handleCancel}
        />
        <LoadingSpinner />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Edit Event"
          showBack={true}
          onBackPress={handleCancel}
        />
        <ErrorDisplay message={loadError} onRetry={loadEventAndFacilities} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgScreen }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader
        title="Edit Event"
        showBack={true}
        onBackPress={handleCancel}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <FormInput
            label="Event Title"
            placeholder="Enter event title"
            value={formData.title}
            onChangeText={value => handleInputChange('title', value)}
            error={errors.title}
            required
          />

          <FormSelect
            label="Sport"
            placeholder="Select sport"
            value={formData.sportType}
            options={sportTypeOptions}
            onSelect={option => handleSelectChange('sportType', option)}
            error={errors.sportType}
            required
          />

          <FormSelect
            label="Grounds"
            placeholder="Select grounds"
            value={formData.facilityId}
            options={facilityOptions}
            onSelect={option => handleSelectChange('facilityId', option)}
            error={errors.facilityId}
            required
            footerOption={{
              label: 'Book a Court',
              icon: 'calendar-outline',
              onPress: () => {
                const eventDateStr = formData.startDate || undefined;
                (navigation as any).navigate('Facilities', {
                  screen: 'FacilitiesList',
                  params: {
                    eventDate: eventDateStr,
                    eventStartTime: formData.startTime || undefined,
                    returnTo: 'EditEvent',
                    eventId,
                  },
                });
              },
            }}
          />

          <View style={styles.dateTimeRow}>
            <DatePickerInput
              label="Start Date"
              value={formData.startDate}
              onChange={value => handleInputChange('startDate', value)}
              error={errors.startDate}
              containerStyle={styles.dateInput}
              required
            />

            <TimePickerInput
              label="Start Time"
              value={formData.startTime}
              onChange={value => handleInputChange('startTime', value)}
              error={errors.startTime}
              containerStyle={styles.timeInput}
              required
            />
          </View>

          <View style={styles.dateTimeRow}>
            <DatePickerInput
              label="End Date"
              value={formData.endDate}
              onChange={value => handleInputChange('endDate', value)}
              error={errors.endDate}
              containerStyle={styles.dateInput}
              required
            />

            <TimePickerInput
              label="End Time"
              value={formData.endTime}
              onChange={value => handleInputChange('endTime', value)}
              error={errors.endTime}
              containerStyle={styles.timeInput}
              required
            />
          </View>

          <View style={styles.numberRow}>
            <FormInput
              label="Max Participants"
              placeholder="e.g., 10"
              value={formData.maxParticipants}
              onChangeText={value =>
                handleInputChange('maxParticipants', value)
              }
              error={errors.maxParticipants}
              keyboardType="numeric"
              containerStyle={styles.numberInput}
              required
            />

            <FormInput
              label="Price (USD)"
              placeholder="0.00"
              value={formData.price}
              onChangeText={value => handleInputChange('price', value)}
              error={errors.price}
              keyboardType="decimal-pad"
              containerStyle={styles.numberInput}
            />
          </View>

          <FormSelect
            label="Skill Level"
            placeholder="Select skill level"
            value={formData.skillLevel}
            options={skillLevelOptions}
            onSelect={option => handleSelectChange('skillLevel', option)}
            error={errors.skillLevel}
            required
          />

          <FormSelect
            label="Event Type"
            placeholder="Select event type"
            value={formData.eventType}
            options={eventTypeOptions}
            onSelect={option => handleSelectChange('eventType', option)}
            error={errors.eventType}
            required
          />

          <FormSelect
            label="Status"
            placeholder="Select status"
            value={formData.status}
            options={statusOptions}
            onSelect={option => handleSelectChange('status', option)}
            error={errors.status}
            required
          />

          <FormInput
            label="Equipment Needed"
            placeholder="e.g., Basketball, Water bottle (comma separated)"
            value={formData.equipment}
            onChangeText={value => handleInputChange('equipment', value)}
          />

          <FormInput
            label="Rules & Notes"
            placeholder="Any special rules or notes for participants"
            value={formData.rules}
            onChangeText={value => handleInputChange('rules', value)}
            multiline
            numberOfLines={3}
          />

          {event && (
            <View style={styles.eventInfo}>
              <Text style={styles.infoLabel}>
                Current Participants: {event.currentParticipants}
              </Text>
              <Text style={styles.infoLabel}>
                Created: {new Date(event.createdAt).toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Players list */}
          {players.length > 0 && (
            <View style={styles.playersSection}>
              <Text style={styles.playersSectionTitle}>Players</Text>
              {players.map(p => (
                <View key={p.userId} style={styles.playerRow}>
                  {p.profileImage ? (
                    <Image
                      source={{ uri: p.profileImage }}
                      style={styles.playerAvatar}
                    />
                  ) : (
                    <View style={styles.playerAvatarFallback}>
                      <Ionicons name="person" size={16} color={colors.white} />
                    </View>
                  )}
                  <Text style={styles.playerName}>
                    {p.firstName} {p.lastName}
                  </Text>
                  {p.status === 'invited' && (
                    <>
                      <View style={styles.invitedBadge}>
                        <Text style={styles.invitedBadgeText}>Invited</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeInvite(p.userId)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={colors.inkFaint}
                        />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Invite search */}
          <View style={styles.inviteSection}>
            <Text style={styles.playersSectionTitle}>Invite Players</Text>
            <TextInput
              style={styles.inviteInput}
              placeholder={
                formData.eventType === EventType.GAME
                  ? 'Search rosters...'
                  : 'Search players...'
              }
              placeholderTextColor={colors.inkFaint}
              value={inviteQuery}
              onChangeText={setInviteQuery}
            />
            {inviteResults.length > 0 && (
              <View style={styles.inviteDropdown}>
                {inviteResults.slice(0, 8).map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.inviteDropdownRow}
                    onPress={() => addInvite(item)}
                  >
                    {item.type === 'roster' ? (
                      <Ionicons name="people" size={18} color={colors.cobalt} />
                    ) : item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.inviteDropdownAvatar}
                      />
                    ) : (
                      <Ionicons
                        name="person"
                        size={18}
                        color={colors.inkFaint}
                      />
                    )}
                    <Text style={styles.inviteDropdownText}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <FormButton
          title="Delete"
          variant="danger"
          onPress={handleDelete}
          style={styles.deleteButton}
          disabled={isLoading}
        />
        <FormButton
          title="Cancel"
          variant="outline"
          onPress={handleCancel}
          style={styles.actionButton}
          disabled={isLoading}
        />
        <FormButton
          title="Save Changes"
          onPress={handleSubmit}
          style={styles.actionButton}
          loading={isLoading}
          disabled={isLoading}
        />
      </View>
    </KeyboardAvoidingView>
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
  form: {
    padding: 16,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInput: {
    flex: 1,
    marginRight: 8,
  },
  timeInput: {
    flex: 1,
    marginLeft: 8,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  numberInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  eventInfo: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.inkSecondary,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  deleteButton: {
    marginRight: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  // ── Players & Invite ──
  playersSection: {
    marginTop: 20,
  },
  playersSectionTitle: {
    fontFamily: fonts.label,
    fontSize: 13,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  playerAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cobalt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
  },
  invitedBadge: {
    backgroundColor: colors.gold + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  invitedBadgeText: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.gold,
  },
  inviteSection: {
    marginTop: 20,
  },
  inviteInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviteDropdown: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 240,
  },
  inviteDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inviteDropdownAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  inviteDropdownText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
});
