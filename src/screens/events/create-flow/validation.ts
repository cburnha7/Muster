import { WizardState } from './types';

/**
 * Step 0 (Sport):   auto-advance on tap, no button
 * Step 1 (Details): eventType must be set
 * Step 2 (When):    date and time must be set; if recurring, frequency + days + count required
 * Step 3 (Where):   locationMode chosen and valid data for that mode
 * Step 4 (Invite):  always true — invites are optional
 */
export function canContinue(state: WizardState, step: number): boolean {
  switch (step) {
    case 0:
      return false;
    case 1:
      return state.eventType !== null;
    case 2: {
      const hasDateTime =
        state.startDate !== null &&
        state.startTime !== null &&
        state.endTime !== null;
      if (!hasDateTime) return false;
      if (state.recurring) {
        return (
          state.recurringFrequency !== null &&
          state.recurringDays.length > 0 &&
          parseInt(state.numberOfEvents) > 0
        );
      }
      return true;
    }
    case 3: {
      if (state.locationMode === 'open') {
        return state.locationName.trim().length > 0;
      }
      if (state.locationMode === 'muster') {
        // Owner can proceed without selected slots; non-owner needs at least one
        return (
          state.facilityId !== '' &&
          state.courtId !== '' &&
          (state.isOwner || state.selectedSlots.length > 0)
        );
      }
      return false;
    }
    case 4:
      return state.visibility !== null;
    default:
      return false;
  }
}
