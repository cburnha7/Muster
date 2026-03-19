/**
 * Events Calendar Type Definitions
 *
 * Types for the calendar-driven events view with dependent-aware
 * filtering and color-coded event indicators.
 *
 * Requirements: 4.1, 4.2
 */

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Represents the active selection in the DependentToggle.
 * Either an individual person (guardian or dependent) or the whole crew.
 */
export type PersonFilter =
  | { type: 'individual'; userId: string }
  | { type: 'wholeCrew' };

// ============================================================================
// EVENT OWNERSHIP
// ============================================================================

/**
 * Resolved ownership of an event within a family.
 * Contains all family member IDs associated with the event
 * (as organizer or participant).
 */
export interface EventOwnership {
  ownerUserIds: string[];
}

// ============================================================================
// COLOR KEY
// ============================================================================

/**
 * A single entry in the color key legend, mapping a person
 * to their assigned color.
 */
export interface ColorKeyEntry {
  userId: string;
  firstName: string;
  color: string;
}

// ============================================================================
// CALENDAR MARKINGS
// ============================================================================

/**
 * Multi-dot marking shape for react-native-calendars.
 * Each date can have multiple colored dots representing
 * different family members with events on that day.
 */
export interface MultiDotMarking {
  dots: Array<{ key: string; color: string }>;
  selected?: boolean;
  selectedColor?: string;
}

// ============================================================================
// COLOR PALETTE
// ============================================================================

/**
 * Fixed palette of 8 visually distinct colors for person assignment.
 * Guardian always receives index 0 (grass). Dependents are assigned
 * sequentially. All colors contrast well against chalk/chalkWarm backgrounds.
 */
export const PERSON_COLORS: string[] = [
  '#3D8C5E', // grass — guardian
  '#5B9FD4', // sky blue
  '#E8A030', // court gold
  '#9B59B6', // purple
  '#E67E22', // orange
  '#1ABC9C', // teal
  '#E74C3C', // red
  '#34495E', // dark slate
];
