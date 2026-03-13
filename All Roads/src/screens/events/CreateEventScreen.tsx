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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { FormInput } from '../../components/forms/FormInput';
import { FormButton } from '../../components/forms/FormButton';
import { FormSelect, SelectOption } from '../../components/forms/FormSelect';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { CourtSelector } from '../../components/events/CourtSelector';
import { TimeSlotPicker } from '../../components/events/TimeSlotPicker';

import { eventService } from '../../services/api/EventService';
import { facilityService } from '../../services/api/FacilityService';
import { addEvent } from '../../store/slices/eventsSlice';
import { useSelector } from 'react-redux';
import { selectUserTeams } from '../../store/slices/teamsSlice';
import { useAuth } from '../../context/AuthContext';
import { colors, Spacing, TextStyles } from '../../theme';
import {
  calendarTheme,
  formatDateForCalendar,
} from '../../utils/calendarUtils';
import {
  CreateEventData,
  SportType,
  SkillLevel,
  EventType,
  Facility,
} from '../../types';

interface FormData {
  title: string;
  description: string;
  sportType: SportType | '';
  eventType: EventType | '';
  facilityId: string;
  courtId: string; // Added for rental-based events
  startDate: Date | null;
  startTime: string;
  duration: string; // in minutes
  maxParticipants: string;
  price: string;
  skillLevel: SkillLevel | '';
  equipment: string;
  rules: string;
  teamIds: string[];
  // Eligibility fields
  enableEligibilityRestrictions: boolean;
  restrictedToTeams: string[];
  minAge: string;
  maxAge: string;
  requiredSkillLevel: SkillLevel | '';
  isInviteOnly: boolean;
  minimumPlayerCount: string; // Minimum players needed for event
}

interface FormErrors {
  [key: string]: string;
}

interface RentalDetails {
  id: string;
  timeSlot: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    court: {
      id: string;
      name: string;
      sportType: string;
      facility: {
        id: string;
        name: string;
      };
    };
  };
}

export function CreateEventScreen(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const userTeams = useSelector(selectUserTeams);
  const { user } = useAuth();

  // Get params from route - either rentalId (old way) or fromReservation (new way)
  const params = (route.params as any) || {};
  const { 
    rentalId,
    fromReservation,
    facilityId: prefilledFacilityId,
    facilityName: prefilledFacilityName,
    courtId: prefilledCourtId,
    courtName: prefilledCourtName,
    courtSportType: prefilledCourtSportType,
    timeSlotId: prefilledTimeSlotId,
    reservedDate,
    reservedStartTime,
    reservedEndTime,
  } = params;

  const isFromReservation = fromReservation || !!rentalId;

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    sportType: '',
    eventType: '',
    facilityId: '',
    courtId: '',
    startDate: null,
    startTime: '',
    duration: '60', // default 60 minutes
    maxParticipants: '',
    price: '0',
    skillLevel: '',
    equipment: '',
    rules: '',
    teamIds: [],
    // Eligibility defaults
    enableEligibilityRestrictions: false,
    restrictedToTeams: [],
    minAge: '',
    maxAge: '',
    requiredSkillLevel: '',
    isInviteOnly: false,
    minimumPlayerCount: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [rentalDetails, setRentalDetails] = useState<RentalDetails | null>(null);
  const [loadingRental, setLoadingRental] = useState(!!rentalId);
  
  // Calendar state for date selection
  const [selectedDate, setSelectedDate] = useState<string>(formatDateForCalendar(new Date()));
  const [markedDates, setMarkedDates] = useState<any>({});
  const [rentalDates, setRentalDates] = useState<string[]>([]); // Dates with user rentals

  // Court and time slot selection state
  const [selectedCourt, setSelectedCourt] = useState<{ id: string; name: string; sportType: string } | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    rentalId: string | null;
  }>>([]);

  const isTeamBasedEvent = formData.eventType === EventType.GAME || formData.eventType === EventType.PRACTICE;
  const isFromRental = !!rentalId && !!rentalDetails;

  // Form options
  const sportTypeOptions: SelectOption[] = [
    { label: 'Basketball', value: SportType.BASKETBALL },
    { label: 'Soccer', value: SportType.SOCCER },
    { label: 'Tennis', value: SportType.TENNIS },
    { label: 'Volleyball', value: SportType.VOLLEYBALL },
    { label: 'Badminton', value: SportType.BADMINTON },
    { label: 'Hockey', value: SportType.HOCKEY },
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

  const durationOptions: SelectOption[] = [
    { label: '30 minutes', value: '30' },
    { label: '45 minutes', value: '45' },
    { label: '1 hour', value: '60' },
    { label: '1.5 hours', value: '90' },
    { label: '2 hours', value: '120' },
    { label: '2.5 hours', value: '150' },
    { label: '3 hours', value: '180' },
  ];

  // Load facilities
  useEffect(() => {
    loadFacilities();
  }, []);

  // Load rental details if rentalId is provided
  useEffect(() => {
    if (rentalId) {
      loadRentalDetails();
    }
  }, [rentalId]);

  // Handle pre-populated data from reservation
  useEffect(() => {
    if (fromReservation && prefilledFacilityId && prefilledCourtId && reservedDate) {
      // Parse the reserved date
      const dateObj = new Date(reservedDate);
      const formattedDate = formatDateForCalendar(dateObj);

      // Calculate duration
      const [startHours, startMinutes] = reservedStartTime.split(':').map(Number);
      const [endHours, endMinutes] = reservedEndTime.split(':').map(Number);
      const startTimeMinutes = startHours * 60 + startMinutes;
      const endTimeMinutes = endHours * 60 + endMinutes;
      const durationMinutes = endTimeMinutes - startTimeMinutes;

      // Map court sport type to SportType enum
      const courtSportType = prefilledCourtSportType.toLowerCase();
      let mappedSportType: SportType | '' = '';
      if (Object.values(SportType).includes(courtSportType as SportType)) {
        mappedSportType = courtSportType as SportType;
      }

      // Set form data
      setFormData(prev => ({
        ...prev,
        facilityId: prefilledFacilityId,
        courtId: prefilledCourtId,
        startDate: dateObj,
        startTime: reservedStartTime,
        duration: durationMinutes.toString(),
        sportType: mappedSportType,
      }));

      // Set selected court
      setSelectedCourt({
        id: prefilledCourtId,
        name: prefilledCourtName,
        sportType: prefilledCourtSportType,
      });

      // Set selected date
      setSelectedDate(formattedDate);

      // Mark the date
      setMarkedDates({
        [formattedDate]: {
          selected: true,
          selectedColor: colors.grass,
        },
      });

      // Pre-select the time slot
      setSelectedSlots([{
        id: prefilledTimeSlotId,
        date: reservedDate,
        startTime: reservedStartTime,
        endTime: reservedEndTime,
        price: 0,
        rentalId: rentalId || null,
      }]);
    }
  }, [fromReservation, prefilledFacilityId, prefilledCourtId, reservedDate]);

  const loadFacilities = async () => {
    if (!user) {
      Alert.alert('Error', 'User not found. Please log in.');
      return;
    }

    try {
      setLoadingFacilities(true);
      const response = await facilityService.getAuthorizedFacilities(user.id);
      setFacilities(response.data);
      
      if (response.data.length === 0) {
        Alert.alert(
          'No Grounds Available',
          'You need to either own a ground or have a confirmed reservation to create events. Book a time slot at a ground first.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Load authorized facilities error:', error);
      Alert.alert('Error', 'Failed to load facilities');
    } finally {
      setLoadingFacilities(false);
    }
  };

  const loadRentalDetails = async () => {
    if (!rentalId) return;

    try {
      setLoadingRental(true);
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/rentals/${rentalId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load rental details');
      }

      const rental: RentalDetails = await response.json();
      setRentalDetails(rental);

      // Pre-fill form with rental details
      const slotDate = new Date(rental.timeSlot.date);
      const [startHours, startMinutes] = rental.timeSlot.startTime.split(':').map(Number);
      const [endHours, endMinutes] = rental.timeSlot.endTime.split(':').map(Number);

      // Calculate duration in minutes
      const startTimeMinutes = startHours * 60 + startMinutes;
      const endTimeMinutes = endHours * 60 + endMinutes;
      const durationMinutes = endTimeMinutes - startTimeMinutes;

      // Map court sport type to SportType enum
      const courtSportType = rental.timeSlot.court.sportType.toLowerCase();
      let mappedSportType: SportType | '' = '';
      if (Object.values(SportType).includes(courtSportType as SportType)) {
        mappedSportType = courtSportType as SportType;
      }

      setFormData(prev => ({
        ...prev,
        facilityId: rental.timeSlot.court.facility.id,
        courtId: rental.timeSlot.court.id,
        startDate: slotDate,
        startTime: rental.timeSlot.startTime,
        duration: durationMinutes.toString(),
        sportType: mappedSportType,
      }));
    } catch (error) {
      console.error('Load rental error:', error);
      Alert.alert(
        'Error',
        'Failed to load rental details. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } finally {
      setLoadingRental(false);
    }
  };

  // Get facility options
  const facilityOptions: SelectOption[] = (facilities || []).map(facility => ({
    label: facility?.name || 'Unknown',
    value: facility?.id || '',
  }));

  // Get team options (only teams user is captain/co-captain of)
  const teamOptions: SelectOption[] = userTeams
    .filter(team => {
      const userMember = team.members.find(m => m.status === 'active');
      return userMember && (userMember.role === 'captain' || userMember.role === 'co_captain');
    })
    .map(team => ({
      label: team.name,
      value: team.id,
    }));

  // Handle input change
  const handleInputChange = (field: keyof FormData, value: string | string[] | boolean) => {
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

  // Handle team selection toggle
  const handleTeamToggle = (teamId: string) => {
    setFormData(prev => {
      const teamIds = prev.teamIds.includes(teamId)
        ? prev.teamIds.filter(id => id !== teamId)
        : [...prev.teamIds, teamId];
      return { ...prev, teamIds };
    });
  };

  // Handle court selection
  const handleCourtSelect = (courtId: string, court: { id: string; name: string; sportType: string }) => {
    setSelectedCourt(court);
    setSelectedSlots([]); // Reset slots when court changes
    
    // Load rental dates for this court
    if (formData.facilityId && user) {
      loadRentalDates(formData.facilityId, courtId);
    }
    
    // Update sport type if not already set
    if (!formData.sportType && court.sportType) {
      const sportTypeValue = court.sportType.toLowerCase();
      if (Object.values(SportType).includes(sportTypeValue as SportType)) {
        setFormData(prev => ({ ...prev, sportType: sportTypeValue as SportType }));
      }
    }
  };

  // Load rental dates for calendar marking
  const loadRentalDates = async (facilityId: string, courtId: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/facilities/${facilityId}/courts/${courtId}/slots-for-event?userId=${user.id}`
      );

      if (!response.ok) {
        console.error('Failed to load rental dates');
        return;
      }

      const data = await response.json();
      
      // Extract unique dates where user has rentals
      const dates = data.slots
        .filter((slot: any) => slot.isUserRental)
        .map((slot: any) => {
          const date = new Date(slot.date);
          return formatDateForCalendar(date);
        }) as string[];
      
      // Remove duplicates
      const uniqueDates = Array.from(new Set(dates)) as string[];
      setRentalDates(uniqueDates);
      
      // Update marked dates to include rental dates
      updateMarkedDates(selectedDate, uniqueDates);
    } catch (error) {
      console.error('Load rental dates error:', error);
    }
  };

  // Update marked dates with rental indicators
  const updateMarkedDates = (selected: string, rentals: string[]) => {
    const marked: any = {};
    
    // Mark rental dates with dots
    rentals.forEach(date => {
      marked[date] = {
        marked: true,
        dotColor: colors.court, // Use court orange for rental indicator
      };
    });
    
    // Mark selected date
    if (selected) {
      marked[selected] = {
        ...marked[selected],
        selected: true,
        selectedColor: colors.grass,
      };
    }
    
    setMarkedDates(marked);
  };

  // Handle time slot selection
  const handleSlotsSelect = (slots: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    rentalId: string | null;
  }>) => {
    setSelectedSlots(slots);
    
    if (slots.length === 0) return;
    
    // Pre-fill form data from first and last slot
    const firstSlot = slots[0];
    const lastSlot = slots[slots.length - 1];
    
    if (!firstSlot || !lastSlot) return;
    
    // Use UTC date components to avoid timezone shift
    const slotDateUTC = new Date(firstSlot.date);
    const slotDate = new Date(
      slotDateUTC.getUTCFullYear(),
      slotDateUTC.getUTCMonth(),
      slotDateUTC.getUTCDate()
    );
    
    const startTimeParts = firstSlot.startTime.split(':');
    const endTimeParts = lastSlot.endTime.split(':');
    
    if (startTimeParts.length < 2 || endTimeParts.length < 2) return;
    
    const startHours = parseInt(startTimeParts[0], 10);
    const startMinutes = parseInt(startTimeParts[1], 10);
    const endHours = parseInt(endTimeParts[0], 10);
    const endMinutes = parseInt(endTimeParts[1], 10);
    
    if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes)) return;
    
    // Calculate total duration in minutes
    const durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    
    setFormData(prev => ({
      ...prev,
      startDate: slotDate,
      startTime: firstSlot.startTime,
      duration: durationMinutes.toString(),
      courtId: selectedCourt?.id || '',
    }));
  };

  // Handle calendar date selection
  const handleDateSelect = (day: DateData) => {
    setSelectedDate(day.dateString);
    const selectedDateObj = new Date(day.dateString);
    setFormData(prev => ({
      ...prev,
      startDate: selectedDateObj,
    }));
    // Update marked dates with rental indicators
    updateMarkedDates(day.dateString, rentalDates);
  };

  // Initialize marked dates
  useEffect(() => {
    updateMarkedDates(selectedDate, rentalDates);
  }, [rentalDates]);

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
      newErrors.facilityId = 'Ground is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.duration) {
      newErrors.duration = 'Duration is required';
    }

    if (!formData.maxParticipants) {
      newErrors.maxParticipants = 'Max participants is required';
    } else {
      const maxParticipants = parseInt(formData.maxParticipants);
      if (isNaN(maxParticipants) || maxParticipants < 1) {
        newErrors.maxParticipants = 'Must be a valid number greater than 0';
      }
    }

    if (!formData.skillLevel) {
      newErrors.skillLevel = 'Skill level is required';
    }

    if (!formData.eventType) {
      newErrors.eventType = 'Event type is required';
    }

    // Team validation for team-based events - optional
    // Teams can be added but are not required

    // Price validation
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      newErrors.price = 'Price must be a valid number (0 or greater)';
    }

    // Minimum player count validation for invite-only events
    if (formData.isInviteOnly) {
      if (!formData.minimumPlayerCount) {
        newErrors.minimumPlayerCount = 'Minimum player count is required for invite-only events';
      } else {
        const minPlayers = parseInt(formData.minimumPlayerCount);
        const maxParticipants = parseInt(formData.maxParticipants);
        
        if (isNaN(minPlayers) || minPlayers < 1) {
          newErrors.minimumPlayerCount = 'Must be a valid number greater than 0';
        } else if (!isNaN(maxParticipants) && minPlayers > maxParticipants) {
          newErrors.minimumPlayerCount = 'Cannot exceed maximum participants';
        }
      }
    }

    // Date/time validation - skip if slots are selected (slot times are already validated)
    if (selectedSlots.length === 0 && formData.startDate && formData.startTime) {
      const startDateTime = new Date(formData.startDate);
      const [hours, minutes] = formData.startTime.split(':').map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);
      const now = new Date();

      if (startDateTime <= now) {
        newErrors.startDate = 'Start date/time must be in the future';
      }
    }

    // Rental-specific validation
    if (isFromRental && selectedSlots.length > 0) {
      // When multiple slots are selected, skip date/time/duration/facility validation
      // The slots themselves define the event timing and are already from the correct facility
      // No additional validation needed
    } else if (isFromRental && rentalDetails && selectedSlots.length === 0) {
      // Single rental slot validation (legacy path - only when no slots selected)
      // Validate facility matches rental
      if (formData.facilityId !== rentalDetails.timeSlot.court.facility.id) {
        newErrors.facilityId = 'Event ground must match rental ground';
      }

      // Ensure event time matches rental slot
      const rentalDate = new Date(rentalDetails.timeSlot.date);
      const eventDate = formData.startDate;

      if (eventDate) {
        // Check if dates match
        if (
          rentalDate.getFullYear() !== eventDate.getFullYear() ||
          rentalDate.getMonth() !== eventDate.getMonth() ||
          rentalDate.getDate() !== eventDate.getDate()
        ) {
          newErrors.startDate = 'Event date must match rental slot date';
        }
      }

      // Check if times match
      if (formData.startTime !== rentalDetails.timeSlot.startTime) {
        newErrors.startTime = 'Event start time must match rental slot start time';
      }

      // Calculate expected duration
      const [startHours, startMinutes] = rentalDetails.timeSlot.startTime.split(':').map(Number);
      const [endHours, endMinutes] = rentalDetails.timeSlot.endTime.split(':').map(Number);
      const expectedDuration = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);

      if (parseInt(formData.duration) !== expectedDuration) {
        newErrors.duration = 'Event duration must match rental slot duration';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    console.log('=== Create Event Submit ===');
    console.log('Form data:', formData);
    console.log('Selected slots:', selectedSlots);
    console.log('Is from rental:', isFromRental);
    
    if (!validateForm()) {
      console.log('Validation failed, errors:', errors);
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    console.log('Validation passed, creating event...');

    try {
      setIsLoading(true);

      // Calculate end time based on start time and duration
      let startDateTime: Date;
      
      if (selectedSlots.length > 0) {
        const firstSlot = selectedSlots[0];
        if (!firstSlot) {
          throw new Error('Invalid slot selection');
        }
        
        // Parse the slot's date - it's stored as UTC midnight representing a date
        const slotDate = new Date(firstSlot.date);
        const year = slotDate.getUTCFullYear();
        const month = slotDate.getUTCMonth();
        const day = slotDate.getUTCDate();
        
        // Parse the time (stored as UTC time like "17:00" = 5 PM UTC)
        const timeParts = firstSlot.startTime.split(':');
        if (timeParts.length < 2) {
          throw new Error('Invalid time format');
        }
        
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        
        if (isNaN(hours) || isNaN(minutes)) {
          throw new Error('Invalid time values');
        }
        
        // Create date in UTC timezone directly using Date.UTC
        // This matches what the server expects
        const startTimestamp = Date.UTC(year, month, day, hours, minutes, 0, 0);
        startDateTime = new Date(startTimestamp);
        
        console.log('First slot date string:', firstSlot.date);
        console.log('Extracted UTC date components:', { year, month: month + 1, day });
        console.log('Time:', { hours, minutes });
        console.log('Created UTC datetime:', startDateTime.toISOString());
      } else {
        // Manual date/time entry
        startDateTime = new Date(formData.startDate!);
        const [hours, minutes] = formData.startTime.split(':').map(Number);
        startDateTime.setHours(hours, minutes, 0, 0);
      }

      const durationMinutes = parseInt(formData.duration);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

      const eventData: CreateEventData = {
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
        teamIds: isTeamBasedEvent ? formData.teamIds : undefined,
        eligibility: formData.enableEligibilityRestrictions ? {
          isInviteOnly: formData.isInviteOnly,
          minimumPlayerCount: formData.isInviteOnly && formData.minimumPlayerCount 
            ? parseInt(formData.minimumPlayerCount) 
            : undefined,
          restrictedToTeams: formData.restrictedToTeams.length > 0 ? formData.restrictedToTeams : undefined,
          minAge: formData.minAge ? parseInt(formData.minAge) : undefined,
          maxAge: formData.maxAge ? parseInt(formData.maxAge) : undefined,
          requiredSkillLevel: formData.requiredSkillLevel ? formData.requiredSkillLevel as SkillLevel : undefined,
          minSkillLevel: undefined,
          maxSkillLevel: undefined,
          restrictedToLeagues: undefined,
        } : undefined,
        organizerId: user?.id, // Add organizer ID
      };

      // Include timeSlotId and rentalId if selected
      // For multiple slots, collect all rental IDs
      const firstSlot = selectedSlots[0];
      const allRentalIds = selectedSlots
        .map(s => s.rentalId)
        .filter((id): id is string => id !== null);
      
      const eventDataWithSlot = {
        ...eventData,
        timeSlotId: firstSlot?.id,
        rentalId: firstSlot?.rentalId || (isFromRental ? rentalId : undefined),
        rentalIds: allRentalIds.length > 0 ? allRentalIds : undefined, // Send all rental IDs
        timeSlotIds: selectedSlots.map(s => s.id), // Send all selected slot IDs
      } as any;

      console.log('Sending event data:', JSON.stringify({
        ...eventDataWithSlot,
        startTime: eventDataWithSlot.startTime.toISOString(),
        endTime: eventDataWithSlot.endTime.toISOString(),
      }, null, 2));

      const newEvent = await eventService.createEvent(eventDataWithSlot);
      console.log('Event created successfully:', newEvent);
      dispatch(addEvent(newEvent));

      // Navigate to the newly created event details page
      navigation.navigate('EventDetails' as never, { eventId: newEvent.id } as never);
      
      // Show success message after navigation
      setTimeout(() => {
        Alert.alert('Success', 'Event created successfully!');
      }, 300);
    } catch (error) {
      console.error('❌ Create event error:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Extract error message from API error response
      let errorMessage = 'Failed to create event';
      if (error && typeof error === 'object') {
        const apiError = error as any;
        if (apiError.message) {
          errorMessage = apiError.message;
        }
        if (apiError.details) {
          console.error('❌ Error details object:', apiError.details);
          if (typeof apiError.details === 'object' && apiError.details.error) {
            errorMessage = apiError.details.error;
          }
        }
      }
      
      console.error('❌ Final error message:', errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigation.goBack();
  };

  if (loadingFacilities || loadingRental) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Create Event"
          showBack={true}
          onBackPress={handleCancel}
        />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader
        title="Create Event"
        showBack={true}
        onBackPress={handleCancel}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Rental Info Banner */}
        {isFromRental && rentalDetails && (
          <View style={styles.rentalBanner}>
            <View style={styles.rentalBannerHeader}>
              <Ionicons name="calendar-outline" size={20} color={colors.grass} />
              <Text style={styles.rentalBannerTitle}>Creating Event from Rental</Text>
            </View>
            <Text style={styles.rentalBannerText}>
              {rentalDetails.timeSlot.court.name} at {rentalDetails.timeSlot.court.facility.name}
            </Text>
            <Text style={styles.rentalBannerSubtext}>
              Location and time are locked to match your rental slot
            </Text>
          </View>
        )}

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
            label="Event Type"
            placeholder="Select event type"
            value={formData.eventType}
            options={eventTypeOptions}
            onSelect={(option) => handleSelectChange('eventType', option)}
            error={errors.eventType}
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
            label="Ground"
            placeholder="Select ground"
            value={formData.facilityId}
            options={facilityOptions}
            onSelect={(option) => handleSelectChange('facilityId', option)}
            error={errors.facilityId}
            required
            disabled={isFromReservation}
          />

          {/* Court Selector - Show after ground is selected */}
          {formData.facilityId && !isFromReservation && user && (
            <CourtSelector
              facilityId={formData.facilityId}
              selectedCourtId={selectedCourt?.id}
              onCourtSelect={handleCourtSelect}
            />
          )}

          {/* Show locked court info when from reservation */}
          {isFromReservation && selectedCourt && (
            <View style={styles.lockedFieldDisplay}>
              <Text style={styles.lockedFieldLabel}>Court/Field</Text>
              <View style={styles.lockedFieldValue}>
                <Ionicons name="basketball" size={20} color={colors.grass} />
                <Text style={styles.lockedFieldText}>{selectedCourt.name}</Text>
              </View>
            </View>
          )}

          {/* Date and Time Selection - Only show after court is selected */}
          {formData.facilityId && selectedCourt && (
            <>
              {/* Calendar for Date Selection - Only show if not from reservation */}
              {!isFromReservation && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Select Date</Text>
                  <Calendar
                    current={selectedDate}
                    onDayPress={handleDateSelect}
                    markedDates={markedDates}
                    minDate={formatDateForCalendar(new Date())}
                    theme={calendarTheme}
                    style={styles.calendar}
                  />
                  
                  {/* Calendar Legend */}
                  {rentalDates.length > 0 && (
                    <View style={styles.calendarLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors.court }]} />
                        <Text style={styles.legendText}>You have reservations</Text>
                      </View>
                    </View>
                  )}
                  
                  {errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}
                </View>
              )}

              {/* Show locked date when from reservation */}
              {isFromReservation && formData.startDate && (
                <View style={styles.lockedFieldDisplay}>
                  <Text style={styles.lockedFieldLabel}>Date</Text>
                  <View style={styles.lockedFieldValue}>
                    <Ionicons name="calendar" size={20} color={colors.grass} />
                    <Text style={styles.lockedFieldText}>
                      {formData.startDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                </View>
              )}

              {/* Time Slot Picker - Show after court AND date are selected */}
              {selectedCourt && user && formData.startDate && (
                <>
                  <TimeSlotPicker
                    facilityId={formData.facilityId}
                    courtId={selectedCourt.id}
                    userId={user.id}
                    selectedSlotIds={selectedSlots.map(s => s.id)}
                    onSlotsSelect={handleSlotsSelect}
                    selectedDate={selectedDate}
                    rentalMode={isFromReservation}
                  />
                  
                  {/* Show selected slots summary */}
                  {selectedSlots.length > 0 && (
                    <View style={styles.selectedSlotsSummary}>
                      <View style={styles.summaryHeader}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.grass} />
                        <Text style={styles.summaryTitle}>
                          {selectedSlots.length} Slot{selectedSlots.length > 1 ? 's' : ''} Selected
                        </Text>
                      </View>
                      <View style={styles.summaryContent}>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Date:</Text>
                          <Text style={styles.summaryValue}>
                            {(() => {
                              const dateUTC = new Date(selectedSlots[0].date);
                              const localDate = new Date(
                                dateUTC.getUTCFullYear(),
                                dateUTC.getUTCMonth(),
                                dateUTC.getUTCDate()
                              );
                              return localDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              });
                            })()}
                          </Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Time:</Text>
                          <Text style={styles.summaryValue}>
                            {selectedSlots[0].startTime} - {selectedSlots[selectedSlots.length - 1].endTime}
                          </Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Duration:</Text>
                          <Text style={styles.summaryValue}>{formData.duration} minutes</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* Manual Time and Duration Inputs - Only show if no court selected and not from reservation */}
              {!selectedCourt && !isFromReservation && (
                <View style={styles.dateTimeRow}>
                  <View style={styles.timeInput}>
                    <FormInput
                      label="Start Time"
                      placeholder="HH:MM (e.g., 14:30)"
                      value={formData.startTime}
                      onChangeText={(value) => handleInputChange('startTime', value)}
                      error={errors.startTime}
                      containerStyle={styles.timeInputInner}
                      required
                    />
                  </View>

                  <View style={styles.durationContainer}>
                    <FormSelect
                      label="Duration"
                      placeholder="Select duration"
                      value={formData.duration}
                      options={durationOptions}
                      onSelect={(option) => handleSelectChange('duration', option)}
                      error={errors.duration}
                      required
                    />
                  </View>
                </View>
              )}
            </>
          )}

          {/* Locked date/time fields for rental-based events - Only show if no slots selected yet */}
          {isFromRental && selectedSlots.length === 0 && (
            <>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyLabel}>Date</Text>
                <Text style={styles.readOnlyValue}>
                  {formData.startDate?.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.dateTimeRow}>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyLabel}>Start Time</Text>
                  <Text style={styles.readOnlyValue}>{formData.startTime}</Text>
                </View>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyLabel}>Duration</Text>
                  <Text style={styles.readOnlyValue}>{formData.duration} min</Text>
                </View>
              </View>

              <View style={styles.lockedFieldsInfoBox}>
                <Ionicons name="information-circle-outline" size={20} color={colors.sky} />
                <Text style={styles.lockedFieldsInfoText}>
                  Location, date, and time are locked to match your rental slot and cannot be changed.
                </Text>
              </View>
            </>
          )}

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

          {isTeamBasedEvent && (
            <View style={styles.teamSelection}>
              <Text style={styles.teamSelectionLabel}>
                Select Teams {errors.teamIds && <Text style={styles.errorText}>*</Text>}
              </Text>
              <Text style={styles.teamSelectionHint}>
                {formData.eventType === EventType.GAME
                  ? 'Select teams to participate in the game'
                  : 'Select your team for this event'}
              </Text>
              
              {teamOptions.length === 0 ? (
                <View style={styles.noTeamsBox}>
                  <Text style={styles.noTeamsText}>
                    You need to be a captain or co-captain of a team to create team-based events.
                  </Text>
                </View>
              ) : (
                <View style={styles.teamList}>
                  {teamOptions.map(team => (
                    <TouchableOpacity
                      key={team.value}
                      style={[
                        styles.teamItem,
                        formData.teamIds.includes(team.value.toString()) && styles.teamItemSelected,
                      ]}
                      onPress={() => handleTeamToggle(team.value.toString())}
                    >
                      <Text
                        style={[
                          styles.teamItemText,
                          formData.teamIds.includes(team.value.toString()) && styles.teamItemTextSelected,
                        ]}
                      >
                        {formData.teamIds.includes(team.value.toString()) ? '✓ ' : ''}
                        {team.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {errors.teamIds && (
                <Text style={styles.errorText}>{errors.teamIds}</Text>
              )}
            </View>
          )}

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

          {/* Eligibility Restrictions Section */}
          <View style={styles.eligibilitySection}>
            <TouchableOpacity
              style={styles.eligibilityToggle}
              onPress={() => handleInputChange('enableEligibilityRestrictions', !formData.enableEligibilityRestrictions)}
            >
              <Text style={styles.eligibilityToggleLabel}>
                {formData.enableEligibilityRestrictions ? '✓ ' : ''}
                Add Eligibility Restrictions
              </Text>
              <Text style={styles.eligibilityToggleHint}>
                Limit who can join this event
              </Text>
            </TouchableOpacity>

            {formData.enableEligibilityRestrictions && (
              <View style={styles.eligibilityOptions}>
                <TouchableOpacity
                  style={styles.eligibilityOption}
                  onPress={() => handleInputChange('isInviteOnly', !formData.isInviteOnly)}
                >
                  <Text style={styles.eligibilityOptionText}>
                    {formData.isInviteOnly ? '✓ ' : '☐ '}
                    Invite Only
                  </Text>
                  <Text style={styles.eligibilityOptionHint}>
                    Event will not appear in public lists until opened
                  </Text>
                </TouchableOpacity>

                {formData.isInviteOnly && (
                  <View style={styles.inviteOnlyDetails}>
                    <FormInput
                      label="Minimum Player Count"
                      placeholder="e.g., 8"
                      value={formData.minimumPlayerCount}
                      onChangeText={(value) => handleInputChange('minimumPlayerCount', value)}
                      error={errors.minimumPlayerCount}
                      keyboardType="numeric"
                      required
                    />
                    <View style={styles.inviteOnlyInfoBox}>
                      <Ionicons name="information-circle-outline" size={20} color={colors.sky} />
                      <Text style={styles.inviteOnlyInfoText}>
                        If minimum players aren't reached 2 days before the event, it will automatically open to the public.
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.ageRestrictions}>
                  <Text style={styles.sectionLabel}>Age Restrictions</Text>
                  <View style={styles.ageRow}>
                    <FormInput
                      label="Min Age"
                      placeholder="e.g., 18"
                      value={formData.minAge}
                      onChangeText={(value) => handleInputChange('minAge', value)}
                      keyboardType="numeric"
                      containerStyle={styles.ageInput}
                    />
                    <FormInput
                      label="Max Age"
                      placeholder="e.g., 35"
                      value={formData.maxAge}
                      onChangeText={(value) => handleInputChange('maxAge', value)}
                      keyboardType="numeric"
                      containerStyle={styles.ageInput}
                    />
                  </View>
                </View>

                <FormSelect
                  label="Required Skill Level (Optional)"
                  placeholder="Leave empty for any skill level"
                  value={formData.requiredSkillLevel}
                  options={skillLevelOptions}
                  onSelect={(option) => handleSelectChange('requiredSkillLevel', option)}
                />

                {teamOptions.length > 0 && (
                  <View style={styles.teamRestrictions}>
                    <Text style={styles.sectionLabel}>Restrict to Specific Teams</Text>
                    <Text style={styles.sectionHint}>
                      Only members of selected teams can join
                    </Text>
                    <View style={styles.teamList}>
                      {teamOptions.map(team => (
                        <TouchableOpacity
                          key={team.value}
                          style={[
                            styles.teamItem,
                            formData.restrictedToTeams.includes(team.value.toString()) && styles.teamItemSelected,
                          ]}
                          onPress={() => {
                            const teamId = team.value.toString();
                            const restrictedTeams = formData.restrictedToTeams.includes(teamId)
                              ? formData.restrictedToTeams.filter(id => id !== teamId)
                              : [...formData.restrictedToTeams, teamId];
                            handleInputChange('restrictedToTeams', restrictedTeams);
                          }}
                        >
                          <Text
                            style={[
                              styles.teamItemText,
                              formData.restrictedToTeams.includes(team.value.toString()) && styles.teamItemTextSelected,
                            ]}
                          >
                            {formData.restrictedToTeams.includes(team.value.toString()) ? '✓ ' : ''}
                            {team.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          <FormButton
            title="Create Event"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
          />

          <FormButton
            title="Cancel"
            variant="secondary"
            onPress={handleCancel}
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
    backgroundColor: colors.chalk,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  rentalBanner: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderLeftColor: colors.grass,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  rentalBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rentalBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.grass,
    marginLeft: 8,
  },
  rentalBannerText: {
    fontSize: 15,
    color: colors.ink,
    fontWeight: '500',
    marginBottom: 4,
  },
  rentalBannerSubtext: {
    fontSize: 13,
    color: colors.soft,
  },
  disabledField: {
    backgroundColor: colors.chalk,
    opacity: 0.7,
  },
  disabledText: {
    color: colors.soft,
  },
  lockedFieldContainer: {
    position: 'relative',
  },
  lockIconOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  datePickerValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockIcon: {
    marginLeft: 8,
  },
  lockedFieldsInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderLeftWidth: 3,
    borderLeftColor: colors.sky,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lockedFieldsInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    marginLeft: 8,
    lineHeight: 18,
  },
  lockedFieldDisplay: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lockedFieldLabel: {
    ...TextStyles.caption,
    color: colors.soft,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  lockedFieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedFieldText: {
    ...TextStyles.bodyLarge,
    color: colors.ink,
    fontWeight: '500',
    marginLeft: Spacing.sm,
  },
  lockedHint: {
    fontSize: 12,
    color: colors.soft,
    marginTop: 4,
  },
  lockedFieldsHint: {
    fontSize: 13,
    color: colors.soft,
    marginTop: -8,
    marginBottom: 16,
    fontStyle: 'italic',
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
  },
  timeInputInner: {
    flex: 1,
  },
  durationContainer: {
    flex: 1,
  },
  datePickerButton: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  datePickerValue: {
    fontSize: 16,
    color: '#1F2937',
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  numberInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  teamSelection: {
    marginTop: 16,
  },
  teamSelectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  teamSelectionHint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  teamList: {
    // gap removed - use marginBottom on teamItem instead
  },
  teamItem: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  teamItemSelected: {
    backgroundColor: colors.grass + '15',
    borderWidth: 2,
    borderColor: colors.grass,
  },
  teamItemText: {
    fontSize: 16,
    color: '#374151',
  },
  teamItemTextSelected: {
    color: colors.grass,
    fontWeight: '600',
  },
  noTeamsBox: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.court,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  noTeamsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    marginTop: 4,
  },
  eligibilitySection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  eligibilityToggle: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  eligibilityToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  eligibilityToggleHint: {
    fontSize: 14,
    color: '#6B7280',
  },
  eligibilityOptions: {
    marginTop: 16,
  },
  eligibilityOption: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  eligibilityOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  eligibilityOptionHint: {
    fontSize: 13,
    color: colors.soft,
    marginTop: 4,
  },
  inviteOnlyDetails: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.chalk,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.soft,
  },
  inviteOnlyInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 3,
    borderLeftColor: colors.sky,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  inviteOnlyInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    marginLeft: 8,
    lineHeight: 18,
  },
  ageRestrictions: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  ageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ageInput: {
    flex: 1,
    marginRight: 12,
  },
  teamRestrictions: {
    marginTop: 8,
  },
  readOnlyField: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  readOnlyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  readOnlyValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  // Calendar styles matching Court Booking screen
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    ...TextStyles.h4,
    color: colors.ink,
    marginBottom: Spacing.md,
  },
  calendar: {
    borderRadius: 12,
    backgroundColor: colors.background,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  calendarLegend: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: colors.chalk,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  legendText: {
    ...TextStyles.caption,
    color: colors.ink,
  },
  multiSlotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grass + '20',
    padding: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  multiSlotText: {
    ...TextStyles.caption,
    color: colors.grass,
    fontWeight: '600',
  },
  selectedSlotsSummary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.grass,
    borderRadius: 12,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    shadowColor: colors.ink,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    ...TextStyles.h4,
    color: colors.grass,
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
  summaryContent: {
    // gap removed - use marginBottom on summaryRow instead
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    ...TextStyles.body,
    color: colors.soft,
    fontWeight: '600',
  },
  summaryValue: {
    ...TextStyles.body,
    color: colors.ink,
    fontWeight: '600',
  },
});
