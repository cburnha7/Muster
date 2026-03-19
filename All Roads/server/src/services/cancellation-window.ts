/**
 * Cancellation window calculator — pure utility module.
 *
 * Determines whether a reservation cancellation falls inside or outside
 * the ground's cancellation policy window. No database or Stripe dependencies.
 */

export type WindowResult = 'inside' | 'outside';

/** The set of valid cancellation policy hour values a ground can use. */
export const ALLOWED_POLICY_HOURS = [0, 12, 24, 48, 72] as const;

/**
 * Returns true when `value` is a valid cancellation policy setting.
 *
 * Valid values are `null`, `undefined` (no policy), or one of the
 * allowed hour integers: 0, 12, 24, 48, 72.
 */
export function isValidPolicyHours(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== 'number') return false;
  return (ALLOWED_POLICY_HOURS as readonly number[]).includes(value);
}

/**
 * Evaluates whether a cancellation falls inside or outside the policy window.
 *
 * - `null` policy → always `'outside'` (automatic cancellation).
 * - Otherwise computes the boundary as
 *   `bookingStartTime - cancellationPolicyHours` (in ms) and returns
 *   `'outside'` when `currentTime` is before the boundary, `'inside'` otherwise.
 *
 * Pure function — no side effects, fully deterministic.
 */
export function evaluateCancellationWindow(
  currentTime: Date,
  bookingStartTime: Date,
  cancellationPolicyHours: number | null,
): WindowResult {
  if (cancellationPolicyHours === null) return 'outside';

  const boundaryMs =
    bookingStartTime.getTime() - cancellationPolicyHours * 60 * 60 * 1000;

  return currentTime.getTime() < boundaryMs ? 'outside' : 'inside';
}
