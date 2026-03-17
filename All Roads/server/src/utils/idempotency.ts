/**
 * Idempotency key generation for Stripe API calls.
 *
 * Every Stripe call that creates or captures a PaymentIntent must include
 * an idempotency key to prevent double-charges on retries.
 *
 * Key format: bookingId:participantRole:actionType
 */

/** Common action types for Stripe idempotency keys. */
export const IdempotencyAction = {
  CREATE: 'create',
  CAPTURE: 'capture',
  CANCEL: 'cancel',
  REFUND: 'refund',
  RENEW: 'renew',
} as const;

export type IdempotencyActionType =
  (typeof IdempotencyAction)[keyof typeof IdempotencyAction];

/**
 * Generate a deterministic idempotency key for Stripe API calls.
 *
 * @param bookingId - The booking identifier
 * @param participantRole - The participant role (e.g. 'home', 'away')
 * @param actionType - The action being performed (e.g. 'create', 'capture')
 * @returns Idempotency key in format `bookingId:role:action`
 * @throws {Error} If any parameter is empty or not a string
 */
export function generateIdempotencyKey(
  bookingId: string,
  participantRole: string,
  actionType: string,
): string {
  const trimmedBookingId = validateAndTrim(bookingId, 'bookingId');
  const trimmedRole = validateAndTrim(participantRole, 'participantRole');
  const trimmedAction = validateAndTrim(actionType, 'actionType');

  return `${trimmedBookingId}:${trimmedRole}:${trimmedAction}`;
}

function validateAndTrim(value: string, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value.trim();
}
