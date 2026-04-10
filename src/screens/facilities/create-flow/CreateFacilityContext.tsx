import React, { createContext, useContext, useReducer, useMemo } from 'react';
import {
  FacilityWizardState,
  FacilityWizardAction,
  createInitialFacilityState,
} from './types';

const TOTAL_STEPS = 5;

// ── Reducer ──

export function facilityWizardReducer(
  state: FacilityWizardState,
  action: FacilityWizardAction
): FacilityWizardState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };

    case 'ADD_COURT':
      return { ...state, courts: [...state.courts, action.court] };

    case 'UPDATE_COURT':
      return {
        ...state,
        courts: state.courts.map(c =>
          c.id === action.court.id ? action.court : c
        ),
      };

    case 'REMOVE_COURT':
      return {
        ...state,
        courts: state.courts.filter(c => c.id !== action.courtId),
      };

    case 'SET_HOURS':
      return { ...state, hoursOfOperation: action.hours };

    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1),
      };

    case 'PREV_STEP':
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 0),
      };

    case 'SUBMIT_START':
      return { ...state, isSubmitting: true };

    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        isSubmitting: false,
        showSuccess: true,
        createdFacilityId: action.facilityId,
      };

    case 'SUBMIT_FAIL':
      return { ...state, isSubmitting: false };

    case 'SET_PENDING_PHOTOS':
      return { ...state, pendingPhotos: action.photos };

    case 'SET_PENDING_MAP':
      return { ...state, pendingMapFile: action.file };

    default:
      return state;
  }
}

// ── Context ──

interface CreateFacilityContextValue {
  state: FacilityWizardState;
  dispatch: React.Dispatch<FacilityWizardAction>;
}

const CreateFacilityContext = createContext<CreateFacilityContextValue | null>(
  null
);

export function CreateFacilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(
    facilityWizardReducer,
    undefined,
    createInitialFacilityState
  );
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <CreateFacilityContext.Provider value={value}>
      {children}
    </CreateFacilityContext.Provider>
  );
}

export function useCreateFacility(): CreateFacilityContextValue {
  const ctx = useContext(CreateFacilityContext);
  if (!ctx)
    throw new Error(
      'useCreateFacility must be used within a CreateFacilityProvider'
    );
  return ctx;
}
