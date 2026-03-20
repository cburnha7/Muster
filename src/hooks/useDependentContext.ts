/**
 * useDependentContext
 *
 * Returns whether the active context is a dependent account.
 * When `isDependent` is true, creation/management/payment UI must be
 * hidden entirely (not disabled — not rendered at all).
 *
 * Dependents CAN: browse events, join events, browse rosters, join rosters,
 * view leagues, view grounds, complete debriefs, give salutes.
 *
 * Dependents CANNOT: create events, create rosters, create leagues,
 * create/manage grounds, book courts, manage other users, access
 * payment/billing screens, or perform any paid-tier action.
 */

import { useSelector } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import {
  selectActiveUserId,
  selectDependents,
} from '../store/slices/contextSlice';

export function useDependentContext() {
  const { user: guardian } = useAuth();
  const activeUserId = useSelector(selectActiveUserId);
  const dependents = useSelector(selectDependents);

  // A dependent is active when activeUserId is set and matches a dependent
  const isDependent =
    !!activeUserId &&
    activeUserId !== guardian?.id &&
    dependents.some((d) => d.id === activeUserId);

  const activeName = isDependent
    ? dependents.find((d) => d.id === activeUserId)?.firstName ?? ''
    : guardian?.firstName ?? '';

  return { isDependent, activeUserId, activeName };
}
