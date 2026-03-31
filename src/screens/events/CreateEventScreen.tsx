import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { CreateEventProvider, useCreateEvent } from './create-flow/CreateEventContext';
import { EventFlowContainer } from './create-flow/EventFlowContainer';
import { Step1Sport } from './create-flow/Step1Sport';
import { Step2Details } from './create-flow/Step2Details';
import { Step3Ground } from './create-flow/Step3Ground';
import { Step4When } from './create-flow/Step4When';
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
    if (!user || !state.sport || !state.facilityId || state.selectedSlots.length === 0) return;
    dispatch({ type: 'SUBMIT_START' });
    try {
      const firstSlot = state.selectedSlots[0]!;
      const lastSlot = state.selectedSlots[state.selectedSlots.length - 1]!;
      const slotDate = new Date(firstSlot.date);
      const [sh, sm] = firstSlot.startTime.split(':');
      const startTime = new Date(
        Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(),
          parseInt(sh || '0'), parseInt(sm || '0')),
      );
      const [eh, em] = lastSlot.endTime.split(':');
      const endTime = new Date(
        Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate(),
          parseInt(eh || '0'), parseInt(em || '0')),
      );
      const sportLabel = state.sport.charAt(0).toUpperCase() + state.sport.slice(1).replace(/_/g, ' ');
      const typeLabel = state.eventType
        ? state.eventType.charAt(0).toUpperCase() + state.eventType.slice(1)
        : 'Event';
      const rosterIds = state.invitedItems.filter((i) => i.type === 'roster').map((i) => i.id);
      const playerIds = state.invitedItems.filter((i) => i.type === 'player').map((i) => i.id);

      const eventData = {
        title: `${sportLabel} ${typeLabel}`,
        description: '',
        sportType: state.sport,
        eventType: state.eventType || EventType.PICKUP,
        facilityId: state.facilityId,
        timeSlotId: firstSlot.id,
        startTime,
        endTime,
        maxParticipants: parseInt(state.maxParticipants) || 10,
        price: parseFloat(state.price) || 0,
        skillLevel: state.skillLevel || SkillLevel.ALL_LEVELS,
        equipment: [],
        isPrivate: state.visibility === 'private',
        organizerId: user.id,
      };
      if (state.minAge || state.maxAge || state.visibility === 'private') {
        eventData.eligibility = {
          isInviteOnly: state.visibility === 'private',
          minAge: state.minAge ? parseInt(state.minAge) : undefined,
          maxAge: state.maxAge ? parseInt(state.maxAge) : undefined,
        };
      }
      if (state.genderRestriction) eventData.genderRestriction = state.genderRestriction;
      if (state.minPlayerRating) eventData.minPlayerRating = parseInt(state.minPlayerRating);
      if (rosterIds.length > 0) {
        if (!eventData.eligibility) eventData.eligibility = {};
        eventData.eligibility.restrictedToTeams = rosterIds;
      }
      if (playerIds.length > 0) eventData.invitedUserIds = playerIds;
      if (state.recurring && state.recurringFrequency) {
        eventData.recurring = true;
        eventData.recurringFrequency = state.recurringFrequency;
        eventData.recurringEndDate = state.recurringEndDate;
      }
      eventData.timeSlotIds = state.selectedSlots.map((s) => s.id);
      eventData.rentalIds = state.selectedSlots.map((s) => s.rentalId).filter(Boolean);
      if (firstSlot.rentalId) eventData.rentalId = firstSlot.rentalId;

      const newEvent = await eventService.createEvent(eventData);
      reduxDispatch(addEvent(newEvent));
      dispatch({ type: 'SUBMIT_SUCCESS', eventId: newEvent.id });
    } catch (error) {
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
      <Step3Ground />
      <Step4When />
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
