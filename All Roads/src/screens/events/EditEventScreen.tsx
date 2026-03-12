import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';

import { eventService } from '../../services/api/EventService';
import { facilityService } from '../../services/api/FacilityService';
import { updateEvent } from '../../store/slices/eventsSlice';
import {
  Event,
  UpdateEventData,
  SportType,
  SkillLevel,
  EventType,
  EventStatus,
  Facility,
} from '../../types';

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

export function EditEventScreen(): JSX.Element {
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

  // Form options
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

  const eventTypeOptions: SelectOption[] = [
    { label: 'Game', value: EventType.GAME },
    { label: 'Practice', value: EventType.PRACTICE },
    { label: 'Pickup', value: EventType.PICKUP },
    { label: 'Camp', value: EventType.CAMP },
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to load event';
      setLoadError(errorMessage);
    } finally {
      setIsLoadingEvent(false);
    }
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

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.sportType) {
      newErrors.sportType = 'Sport type is required';
    }

    if (!formData.facilityId) {
      newErrors.facilityId = 'Facility is required';
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
    if (formData.startDate && formData.startTime && formData.endDate && formData.endTime) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      if (endDateTime <= startDateTime) {
        newErrors.endDate = 'End date/time must be after start date/time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm() || !event) {
      return;
    }

    try {
      setIsLoading(true);

      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
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
        equipment: formData.equipment.split(',').map(item => item.trim()).filter(Boolean),
        rules: formData.rules.trim() || undefined,
        eventType: formData.eventType as EventType,
        status: formData.status as EventStatus,
      };

      const updatedEvent = await eventService.updateEvent(event.id, updateData);
      dispatch(updateEvent(updatedEvent));

      Alert.alert(
        'Success',
        'Event updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update event';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (!event) return;

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
      
      Alert.alert(
        'Success',
        'Event deleted successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
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
        <ErrorDisplay
          message={loadError}
          onRetry={loadEventAndFacilities}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
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
            onChangeText={(value) => handleInputChange('title', value)}
            error={errors.title}
            required
          />

          <FormInput
            label="Description"
            placeholder="Describe your event"
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            error={errors.description}
            multiline
            numberOfLines={3}
            required
          />

          <FormSelect
            label="Sport Type"
            placeholder="Select sport type"
            value={formData.sportType}
            options={sportTypeOptions}
            onSelect={(option) => handleSelectChange('sportType', option)}
            error={errors.sportType}
            required
          />

          <FormSelect
            label="Facility"
            placeholder="Select facility"
            value={formData.facilityId}
            options={facilityOptions}
            onSelect={(option) => handleSelectChange('facilityId', option)}
            error={errors.facilityId}
            required
          />

          <View style={styles.dateTimeRow}>
            <FormInput
              label="Start Date"
              placeholder="YYYY-MM-DD"
              value={formData.startDate}
              onChangeText={(value) => handleInputChange('startDate', value)}
              error={errors.startDate}
              containerStyle={styles.dateInput}
              required
            />

            <FormInput
              label="Start Time"
              placeholder="HH:MM"
              value={formData.startTime}
              onChangeText={(value) => handleInputChange('startTime', value)}
              error={errors.startTime}
              containerStyle={styles.timeInput}
              required
            />
          </View>

          <View style={styles.dateTimeRow}>
            <FormInput
              label="End Date"
              placeholder="YYYY-MM-DD"
              value={formData.endDate}
              onChangeText={(value) => handleInputChange('endDate', value)}
              error={errors.endDate}
              containerStyle={styles.dateInput}
              required
            />

            <FormInput
              label="End Time"
              placeholder="HH:MM"
              value={formData.endTime}
              onChangeText={(value) => handleInputChange('endTime', value)}
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
              onChangeText={(value) => handleInputChange('maxParticipants', value)}
              error={errors.maxParticipants}
              keyboardType="numeric"
              containerStyle={styles.numberInput}
              required
            />

            <FormInput
              label="Price (USD)"
              placeholder="0.00"
              value={formData.price}
              onChangeText={(value) => handleInputChange('price', value)}
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
            onSelect={(option) => handleSelectChange('skillLevel', option)}
            error={errors.skillLevel}
            required
          />

          <FormSelect
            label="Event Type"
            placeholder="Select event type"
            value={formData.eventType}
            options={eventTypeOptions}
            onSelect={(option) => handleSelectChange('eventType', option)}
            error={errors.eventType}
            required
          />

          <FormSelect
            label="Status"
            placeholder="Select status"
            value={formData.status}
            options={statusOptions}
            onSelect={(option) => handleSelectChange('status', option)}
            error={errors.status}
            required
          />

          <FormInput
            label="Equipment Needed"
            placeholder="e.g., Basketball, Water bottle (comma separated)"
            value={formData.equipment}
            onChangeText={(value) => handleInputChange('equipment', value)}
          />

          <FormInput
            label="Rules & Notes"
            placeholder="Any special rules or notes for participants"
            value={formData.rules}
            onChangeText={(value) => handleInputChange('rules', value)}
            multiline
            numberOfLines={3}
          />

          {event && (
            <View style={styles.eventInfo}>
              <Text style={styles.infoLabel}>Current Participants: {event.currentParticipants}</Text>
              <Text style={styles.infoLabel}>Created: {new Date(event.createdAt).toLocaleDateString()}</Text>
            </View>
          )}
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
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  deleteButton: {
    marginRight: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});