import React, { createContext, useContext, useReducer, useMemo } from 'react';
import {
  RosterWizardState,
  RosterWizardAction,
  createInitialRosterState,
  getDefaultMaxPlayers,
} from './types';

const TOTAL_STEPS = 3;

function rosterReducer(
  state: RosterWizardState,
  action: RosterWizardAction
): RosterWizardState {
  switch (action.type) {
    case 'SET_SPORT':
      return {
        ...state,
        sport: action.sport,
        maxPlayers: String(getDefaultMaxPlayers(action.sport)),
        currentStep: 1,
      };
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_VISIBILITY':
      return { ...state, visibility: action.visibility };
    case 'ADD_INVITE':
      if (state.invitedItems.some(i => i.id === action.item.id)) return state;
      return { ...state, invitedItems: [...state.invitedItems, action.item] };
    case 'REMOVE_INVITE':
      return {
        ...state,
        invitedItems: state.invitedItems.filter(i => i.id !== action.id),
      };
    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1),
      };
    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        isSubmitting: false,
        showSuccess: true,
        createdRosterId: action.rosterId,
      };
    case 'SUBMIT_FAIL':
      return { ...state, isSubmitting: false };
    default:
      return state;
  }
}

interface CreateRosterContextValue {
  state: RosterWizardState;
  dispatch: React.Dispatch<RosterWizardAction>;
}

const CreateRosterContext = createContext<CreateRosterContextValue | null>(
  null
);

export function CreateRosterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(
    rosterReducer,
    undefined,
    createInitialRosterState
  );
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <CreateRosterContext.Provider value={value}>
      {children}
    </CreateRosterContext.Provider>
  );
}

export function useCreateRoster(): CreateRosterContextValue {
  const ctx = useContext(CreateRosterContext);
  if (!ctx)
    throw new Error('useCreateRoster must be used within CreateRosterProvider');
  return ctx;
}
