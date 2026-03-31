import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { CreateEventProvider, useCreateEvent } from './create-flow/CreateEventContext';
import { EventFlowContainer } from './create-flow/EventFlowContainer';
import { Step1Sport } from './create-flow/Step1Sport';
import { Step2Details } from './create-flow/Step2Details';
import { Step3When } from './create-flow/Step3When';
import { Step4Where } from './create-flow/Step4Where';
import { Step5Invite } from './create-flow/Step5Invite';
import { WizardSuccessScreen } from '../../components/wizard/WizardSuccessScreen';
import { eventService } from '../../services/api/EventService';
import { addEvent } from '../../store/slices/eventsSlice';
import { useAuth } from '../../context/AuthContext';
import { getSportEmoji } from '../../constants/sports';
import { EventType, SkillLevel } from '../../types';

function CreateEventInner() {
  const { state, dispatch } = useCreateEvent();
  const navigation = useNavigation<any>();
  const reduxDispatch = useDispatch();
  const { user } = useAuth();

  const handleSubmit = useCallback(async () => {
    if (!user || !state.sport) return;
    dispatch({ type: 'SUBMIT_START' });
    try {
      const sportLabel = state.sport.charAt(0).toUpperCase() + state.sport.slice(1).replace(/_/g, ' ');
      const typeLabel = state.eventType
        ? state.eventType.charAt(0).toUpperCase() + state.eventType.slice(1)
        : 'Event';

      // Build start/end times from date + time pickers
      const d = state.startDate ?? new Date();
      const st = state.startTime ?? new Date();
      const et = state.endTime ?? new Date();
      const startTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), st.getHours(), st.getMinutes());
      const endTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), et.getHours(), et.getMinutes());

      const rosterIds = state.invitedItems.filter((i) => i.type === 'roster').map((i) => i.id);
      const playerIds = state.invitedItems.filter((i) => i.type === 'player').map((i) => i.id);

      const eventData: any = {
        title: `${sportLabel} ${typeLabel}`,
        description: '',
        sportType: state.sport,
        eventType: state.eventType || EventType.PICKUP,
        startTime,
        endTime,
        maxParticipants: parseInt(state.maxParticipants) || 10,
        price: parseFloat(state.price) || 0,
        skillLevel: state.skillLevel || SkillLevel.ALL_LEVELS,
        equipment: [],
        isPrivate: state.visibility === 'private',
        organizerId: user.id,
      };

      // Location data
      if (state.locationMode === 'muster' && state.facilityId) {
        eventData.facilityId = state.facilityId;
        if (state.selectedSlots.length > 0) {
          const firstSlot = state.selectedSlots[0];
          eventData.timeSlotId = firstSlot.id;
          eventData.timeSlotIds = state.selectedSlots.map((s) => s.id);
          eventData.rentalIds = state.selectedSlots.map((s) => s.rentalId).filter(Boolean);
          if (firstSlot.rentalId) eventData.rentalId = firstSlot.rentalId;
        }
      } else if (state.locationMode === 'open') {
        eventData.locationName = state.locationName.trim();
        eventData.locationAddress = state.locationAddress.trim() || undefined;
        eventData.locationLat = state.locationLat;
        eventData.locationLng = state.locationLng;
      }

      // Eligibility
      if (state.minAge || state.maxAge || state.visibility === 'private') {
        eventData.eligibility = {
          isInviteOnly: state.visibility === 'private',
          minAge: state.minAge ? parseInt(state.minAge) : undefined,
          maxAge: state.maxAge ? parseInt(state.maxAge) : undefined,
        };
      }
      if (state.genderRestriction) eventData.genderRestriction = state.genderRestriction;
      if (state.minPlayerRating) eventData.minPlayerRating = parseInt(state.minPlayerRating);

      // Invites
      if (rosterIds.length > 0) {
        if (!eventData.eligibility) eventData.eligibility = {};
        eventData.eligibility.restrictedToTeams = rosterIds;
      }
      if (playerIds.length > 0) eventData.invitedUserIds = playerIds;

      // Recurring
      if (state.recurring && state.recurringFrequency) {
        eventData.recurring = true;
        eventData.recurringFrequency = state.recurringFrequency;
        eventData.recurringEndDate = state.recurringEndDate;
        eventData.recurringDays = state.recurringDays;
        eventData.numberOfEvents = parseInt(state.numberOfEvents) || 1;
        if (state.occurrenceLocations.length > 0) {
          eventData.occurrenceLocations = state.occurrenceLocations;
        }
      }

      const newEvent = await eventService.createEvent(eventData);
      reduxDispatch(addEvent(newEvent));
      dispatch({ type: 'SUBMIT_SUCCESS', eventId: newEvent.id });
    } catch (error: any) {
      dispatch({ type: 'SUBMIT_FAIL' });
      Alert.alert('Error', error?.message || 'Failed to create event');
    }
  }, [user, state, dispatch, reduxDispatch]);

  if (state.showSuccess) {
    return (
      <WizardSuccessScreen
        emoji={state.sport ? getSportEmoji(state.sport) : '\u{1F389}'}
        title="Event Created"
        subtitle="Your event is live. Time to muster the troops."
        actions={[
          {
            label: 'View Event',
            icon: 'eye-outline',
            onPress: () => {
              navigation.navigate('Events', {
                screen: 'EventDetail',
                params: { eventId: state.createdEventId },
              });
            },
            variant: 'primary',
          },
          {
            label: 'Create Another',
            icon: 'add-circle-outline',
            onPress: () => navigation.replace('CreateEvent'),
            variant: 'secondary',
          },
        ]}
      />
    );
  }

  return (
    <EventFlowContainer onSubmit={handleSubmit}>
      <Step1Sport />
      <Step2Details />
      <Step3When />
      <Step4Where />
      <Step5Invite />
    </EventFlowContainer>
  );
}

export function CreateEventScreen() {
  return (
    <CreateEventProvider>
      <CreateEventInner />
    </CreateEventProvider>
  );
}
