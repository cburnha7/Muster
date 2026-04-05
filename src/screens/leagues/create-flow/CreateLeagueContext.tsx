import React, { createContext, useContext, useReducer, useMemo } from 'react';
import {
  LeagueWizardState,
  LeagueWizardAction,
  createInitialLeagueState,
} from './types';

const TOTAL_STEPS = 5;

function leagueReducer(
  state: LeagueWizardState,
  action: LeagueWizardAction
): LeagueWizardState {
  switch (action.type) {
    case 'SET_SPORT':
      return { ...state, sport: action.sport, currentStep: 1 };

    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };

    case 'SET_LEAGUE_FORMAT':
      return { ...state, leagueFormat: action.format };

    case 'SET_FREQUENCY':
      return {
        ...state,
        frequency: action.frequency,
        // Reset frequency-specific fields
        gameDays: [],
        endDate: null,
        seriesEndDate: '',
      };

    case 'TOGGLE_DAY': {
      const days = state.gameDays.includes(action.day)
        ? state.gameDays.filter(d => d !== action.day)
        : [...state.gameDays, action.day];
      return { ...state, gameDays: days };
    }

    case 'ADD_ROSTER':
      if (state.invitedRosters.some(r => r.id === action.roster.id))
        return state;
      return {
        ...state,
        invitedRosters: [...state.invitedRosters, action.roster],
      };

    case 'REMOVE_ROSTER':
      return {
        ...state,
        invitedRosters: state.invitedRosters.filter(r => r.id !== action.id),
      };

    case 'SET_VISIBILITY':
      return { ...state, visibility: action.visibility };

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
        createdLeagueId: action.leagueId,
      };

    case 'SUBMIT_FAIL':
      return { ...state, isSubmitting: false };

    default:
      return state;
  }
}

interface CreateLeagueContextValue {
  state: LeagueWizardState;
  dispatch: React.Dispatch<LeagueWizardAction>;
}

const CreateLeagueContext = createContext<CreateLeagueContextValue | null>(
  null
);

export function CreateLeagueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(
    leagueReducer,
    undefined,
    createInitialLeagueState
  );
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <CreateLeagueContext.Provider value={value}>
      {children}
    </CreateLeagueContext.Provider>
  );
}

export function useCreateLeague(): CreateLeagueContextValue {
  const ctx = useContext(CreateLeagueContext);
  if (!ctx)
    throw new Error('useCreateLeague must be used within CreateLeagueProvider');
  return ctx;
}
