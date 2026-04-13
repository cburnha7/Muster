/**
 * Shared hook for the family crew selector.
 * Provides crew members and handles active profile switching via Redux.
 * Used on all tab screens that show the crew row.
 */

import { useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import {
  selectActiveUserId,
  selectDependents,
  setActiveUser,
} from '../store/slices/contextSlice';
import { PERSON_COLORS } from '../types/eventsCalendar';
import { assignPersonColors } from '../utils/eventsCalendarUtils';
import type { CrewMember } from '../components/home/MyCrewRow';

export function useCrewSelector() {
  const dispatch = useDispatch();
  const { user: currentUser } = useAuth();
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);

  const personColors = useMemo(
    () => assignPersonColors(currentUser?.id || '', dependents),
    [currentUser?.id, dependents]
  );

  const crewMembers: CrewMember[] = useMemo(() => {
    const members: CrewMember[] = [];
    if (currentUser) {
      members.push({
        id: currentUser.id,
        firstName: currentUser.firstName || 'Me',
        profileImage: currentUser.profileImage,
        color: personColors.get(currentUser.id) || PERSON_COLORS[0],
      });
    }
    for (const dep of dependents) {
      members.push({
        id: dep.id,
        firstName: dep.firstName || '?',
        profileImage: dep.profileImage,
        color: personColors.get(dep.id) || PERSON_COLORS[1],
      });
    }
    return members;
  }, [currentUser, dependents, personColors]);

  const hasDependents = dependents.length > 0;

  // The selected crew ID for the row — null means "All"
  // Maps from Redux activeUserId (null = guardian) to crew row selection
  const selectedCrewId = activeUserId;

  const onSelectCrew = useCallback(
    (id: string | null) => {
      dispatch(setActiveUser(id));
    },
    [dispatch]
  );

  return {
    crewMembers,
    selectedCrewId,
    onSelectCrew,
    hasDependents,
    activeUserId,
    personColors,
  };
}
