import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { WizardState, WizardAction, SlotData, createInitialState } from './types';

const TOTAL_STEPS = 5;

// ── Contiguous slot helper ──

function computeContiguousSelection(
  current: SlotData[],
  toggled: SlotData,
  allSlots: SlotData[],
): SlotData[] {
  const isSelected = current.some((s) => s.id === toggled.id);

  if (isSelected) {
    // Deselect: only allow removing from either end of the contiguous block
    if (current.length <= 1) return [];
    if (toggled.id === current[0]!.id) return current.slice(1);
    if (toggled.id === current[current.length - 1]!.id) return current.slice(0, -1);
    // Not an endpoint — ignore
    return current;
  }

  // Select: must be adjacent to the current block
  if (current.length === 0) return [toggled];

  const sorted = [...allSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const toggledIdx = sorted.findIndex((s) => s.id === toggled.id);
  const firstIdx = sorted.findIndex((s) => s.id === current[0]!.id);
  const lastIdx = sorted.findIndex((s) => s.id === current[current.length - 1]!.id);

  if (toggledIdx === firstIdx - 1) return [toggled, ...current];
  if (toggledIdx === lastIdx + 1) return [...current, toggled];

  // Not adjacent — ignore
  return current;
}

// ── Reducer ──

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_SPORT':
      return { ...state, sport: action.sport, currentStep: 1 };

    case 'SET_EVENT_TYPE':
      return { ...state, eventType: action.eventType };

    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };

    case 'SET_FACILITY':
      return {
        ...state,
        facilityId: action.facilityId,
        facilityName: action.facilityName,
        isOwner: action.isOwner,
        courtId: '',
        courtName: '',
        selectedDate: '',
        selectedSlots: [],
      };

    case 'SET_COURT':
      return { ...state, courtId: action.courtId, courtName: action.courtName };

    case 'RESET_COURT':
      return { ...state, courtId: '', courtName: '', selectedDate: '', selectedSlots: [] };

    case 'SET_DATE':
      return { ...state, selectedDate: action.date, selectedSlots: [] };

    case 'TOGGLE_SLOT':
      return {
        ...state,
        selectedSlots: computeContiguousSelection(
          state.selectedSlots,
          action.slot,
          action.slotsForDate,
        ),
      };

    case 'SET_VISIBILITY':
      return { ...state, visibility: action.visibility };

    case 'ADD_INVITE':
      if (state.invitedItems.some((i) => i.id === action.item.id)) return state;
      return { ...state, invitedItems: [...state.invitedItems, action.item] };

    case 'REMOVE_INVITE':
      return { ...state, invitedItems: state.invitedItems.filter((i) => i.id !== action.id) };

    case 'GO_TO_STEP':
      return { ...state, currentStep: Math.max(0, Math.min(action.step, TOTAL_STEPS - 1)) };

    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1) };

    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };

    case 'SUBMIT_START':
      return { ...state, isSubmitting: true };

    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false, showSuccess: true, createdEventId: action.eventId };

    case 'SUBMIT_FAIL':
      return { ...state, isSubmitting: false };

    default:
      return state;
  }
}

// ── Context ──

interface CreateEventContextValue {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

const CreateEventContext = createContext<CreateEventContextValue | null>(null);

export function CreateEventProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, undefined, createInitialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <CreateEventContext.Provider value={value}>{children}</CreateEventContext.Provider>;
}

export function useCreateEvent(): CreateEventContextValue {
  const ctx = useContext(CreateEventContext);
  if (!ctx) {
    throw new Error('useCreateEvent must be used within a CreateEventProvider');
  }
  return ctx;
}
