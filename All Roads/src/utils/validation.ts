// Data validation utilities for the Sports Booking App
import {
  CreateEventData,
  CreateFacilityData,
  UpdateProfileData,
  SportType,
  SkillLevel,
  EventType,
  Address,
  Coordinates,
  ContactInfo,
  OperatingHours,
  FacilityPricing,
} from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Event validation
export function validateEventData(data: CreateEventData): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields validation
  if (!data.title || data.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required' });
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  if (!Object.values(SportType).includes(data.sportType)) {
    errors.push({ field: 'sportType', message: 'Invalid sport type' });
  }

  if (!data.facilityId || data.facilityId.trim().length === 0) {
    errors.push({ field: 'facilityId', message: 'Facility ID is required' });
  }

  // Date validation - prevent past dates
  const now = new Date();
  if (data.startTime <= now) {
    errors.push({ field: 'startTime', message: 'Start time must be in the future' });
  }

  if (data.endTime <= data.startTime) {
    errors.push({ field: 'endTime', message: 'End time must be after start time' });
  }

  // Capacity validation - prevent over-capacity
  if (data.maxParticipants <= 0) {
    errors.push({ field: 'maxParticipants', message: 'Max participants must be greater than 0' });
  }

  if (data.maxParticipants > 1000) {
    errors.push({ field: 'maxParticipants', message: 'Max participants cannot exceed 1000' });
  }

  // Price validation
  if (data.price < 0) {
    errors.push({ field: 'price', message: 'Price cannot be negative' });
  }

  if (!data.currency || data.currency.trim().length === 0) {
    errors.push({ field: 'currency', message: 'Currency is required' });
  }

  if (!Object.values(SkillLevel).includes(data.skillLevel)) {
    errors.push({ field: 'skillLevel', message: 'Invalid skill level' });
  }

  if (!Object.values(EventType).includes(data.eventType)) {
    errors.push({ field: 'eventType', message: 'Invalid event type' });
  }

  if (!Array.isArray(data.equipment)) {
    errors.push({ field: 'equipment', message: 'Equipment must be an array' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Facility validation
export function validateFacilityData(data: CreateFacilityData): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields validation
  if (!data.name || data.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  // Address validation for completeness
  if (!validateAddress(data.address)) {
    errors.push({ field: 'address', message: 'Complete address is required' });
  }

  // Coordinates validation for accuracy
  if (!validateCoordinates(data.coordinates)) {
    errors.push({ field: 'coordinates', message: 'Valid coordinates are required' });
  }

  // Sport types validation
  if (!Array.isArray(data.sportTypes) || data.sportTypes.length === 0) {
    errors.push({ field: 'sportTypes', message: 'At least one sport type is required' });
  } else {
    const invalidSportTypes = data.sportTypes.filter(
      (sport) => !Object.values(SportType).includes(sport)
    );
    if (invalidSportTypes.length > 0) {
      errors.push({ field: 'sportTypes', message: 'Invalid sport types found' });
    }
  }

  // Contact info validation
  if (!validateContactInfo(data.contactInfo)) {
    errors.push({ field: 'contactInfo', message: 'Valid contact information is required' });
  }

  // Operating hours validation
  if (!validateOperatingHours(data.operatingHours)) {
    errors.push({ field: 'operatingHours', message: 'Valid operating hours are required' });
  }

  // Pricing validation
  if (!validateFacilityPricing(data.pricing)) {
    errors.push({ field: 'pricing', message: 'Valid pricing information is required' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Profile validation
export function validateProfileData(data: UpdateProfileData): ValidationResult {
  const errors: ValidationError[] = [];

  if (data.firstName !== undefined && (!data.firstName || data.firstName.trim().length === 0)) {
    errors.push({ field: 'firstName', message: 'First name cannot be empty' });
  }

  if (data.lastName !== undefined && (!data.lastName || data.lastName.trim().length === 0)) {
    errors.push({ field: 'lastName', message: 'Last name cannot be empty' });
  }

  if (data.phoneNumber !== undefined && data.phoneNumber && !isValidPhoneNumber(data.phoneNumber)) {
    errors.push({ field: 'phoneNumber', message: 'Invalid phone number format' });
  }

  if (data.dateOfBirth !== undefined && data.dateOfBirth && data.dateOfBirth > new Date()) {
    errors.push({ field: 'dateOfBirth', message: 'Date of birth cannot be in the future' });
  }

  if (data.preferredSports !== undefined) {
    if (!Array.isArray(data.preferredSports)) {
      errors.push({ field: 'preferredSports', message: 'Preferred sports must be an array' });
    } else {
      const invalidSports = data.preferredSports.filter(
        (sport) => !Object.values(SportType).includes(sport)
      );
      if (invalidSports.length > 0) {
        errors.push({ field: 'preferredSports', message: 'Invalid sport types found' });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Helper validation functions
function validateAddress(address: Address): boolean {
  return !!(
    address &&
    address.street &&
    address.street.trim().length > 0 &&
    address.city &&
    address.city.trim().length > 0 &&
    address.state &&
    address.state.trim().length > 0 &&
    address.zipCode &&
    address.zipCode.trim().length > 0 &&
    address.country &&
    address.country.trim().length > 0
  );
}

function validateCoordinates(coordinates: Coordinates): boolean {
  return !!(
    coordinates &&
    typeof coordinates.latitude === 'number' &&
    typeof coordinates.longitude === 'number' &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  );
}

function validateContactInfo(contactInfo: ContactInfo): boolean {
  // At least one contact method should be provided
  return !!(
    contactInfo &&
    (contactInfo.phone || contactInfo.email || contactInfo.website)
  );
}

function validateOperatingHours(operatingHours: OperatingHours): boolean {
  if (!operatingHours || typeof operatingHours !== 'object') {
    return false;
  }

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  // At least one day should have operating hours
  const hasAnyHours = daysOfWeek.some(day => {
    const dayHours = operatingHours[day];
    return Array.isArray(dayHours) && dayHours.length > 0;
  });

  if (!hasAnyHours) {
    return false;
  }

  // Validate time format for each day
  for (const day of daysOfWeek) {
    const dayHours = operatingHours[day];
    if (dayHours && Array.isArray(dayHours)) {
      for (const timeSlot of dayHours) {
        if (!isValidTimeFormat(timeSlot.open) || !isValidTimeFormat(timeSlot.close)) {
          return false;
        }
        if (timeSlot.open >= timeSlot.close) {
          return false;
        }
      }
    }
  }

  return true;
}

function validateFacilityPricing(pricing: FacilityPricing): boolean {
  return !!(
    pricing &&
    pricing.currency &&
    pricing.currency.trim().length > 0 &&
    (pricing.hourlyRate === undefined || pricing.hourlyRate >= 0) &&
    (pricing.dailyRate === undefined || pricing.dailyRate >= 0) &&
    (pricing.deposit === undefined || pricing.deposit >= 0)
  );
}

function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

function isValidPhoneNumber(phone: string): boolean {
  // Basic phone number validation - accepts various formats
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleanPhone);
}