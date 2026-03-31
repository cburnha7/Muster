import { WizardState } from './types';

/**
 * Returns whether the Continue / Create button should be enabled for the given step.
 *
 * Step 0 (Sport):   always false — no Continue button, auto-advance on tap
 * Step 1 (Details): eventType must be set
 * Step 2 (Ground):  facilityId and courtId must be non-empty
 * Step 3 (When):    selectedDate non-empty and at least one slot selected
 * Step 4 (Invite):  always true — invites are optional
 */
export function canContinue(state: WizardState, step: number): boolean {
  switch (step) {
    case 0:
      return false;
    case 1:
      return state.eventType !== null;
    case 2:
      return state.facilityId !== '' && state.courtId !== '';
    case 3:
      return state.selectedDate !== '' && state.selectedSlots.length >= 1;
    case 4:
      return true;
    default:
      return false;
  }
}
