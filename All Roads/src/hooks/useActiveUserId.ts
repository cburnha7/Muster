/**
 * useActiveUserId Hook
 *
 * Returns the currently active user ID from the context slice.
 * When a guardian is acting as themselves, activeUserId is null,
 * so this hook falls back to the authenticated user's ID.
 *
 * Requirements: 5.3, 5.4, 5.5
 */

import { useSelector } from 'react-redux';
import { selectActiveUserId } from '../store/slices/contextSlice';
import { selectUser } from '../store/slices/authSlice';

/**
 * Returns the effective user ID for API calls and data scoping.
 * - If a dependent is selected, returns the dependent's ID.
 * - Otherwise, returns the authenticated guardian's own ID.
 */
export function useActiveUserId(): string | null {
  const activeUserId = useSelector(selectActiveUserId);
  const user = useSelector(selectUser);
  return activeUserId ?? user?.id ?? null;
}
