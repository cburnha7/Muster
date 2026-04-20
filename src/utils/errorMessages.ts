/**
 * User-friendly error message mapping.
 * Every catch block should use getErrorMessage() instead of showing raw API strings.
 */

const ERROR_MAP: Record<string, string> = {
  // Network
  'Network request failed':
    'No internet connection. Check your network and try again.',
  'Failed to fetch':
    'No internet connection. Check your network and try again.',
  timeout: 'The request took too long. Please try again.',
  ECONNREFUSED: 'Unable to reach the server. Please try again later.',

  // Auth
  'Invalid credentials': 'Incorrect email or password. Please try again.',
  'Token expired': 'Your session has expired. Please sign in again.',
  Unauthorized: 'You need to sign in to do that.',
  Forbidden: "You don't have permission to do that.",
  INVALID_TOKEN: 'Your session has expired. Please sign in again.',

  // Booking / Events
  'Event is full': 'This game is full. Try another one nearby.',
  'Already joined': "You've already joined this game.",
  'Event not found': 'This game is no longer available.',
  'Booking not found': 'This booking could not be found.',
  'Cannot cancel': 'This booking can no longer be cancelled.',
  SELF_SALUTE: "You can't salute yourself.",
  DUPLICATE_SALUTE: "You've already saluted this player for this game.",
  SALUTE_LIMIT_EXCEEDED: "You've used all your salutes for this game.",
  WINDOW_CLOSED: 'The salute window for this game has closed.',
  NON_PARTICIPANT: 'Only players in this game can give salutes.',

  // Facility
  'Facility not found': 'This grounds location could not be found.',
  'Court not available':
    'This court is no longer available for the selected time.',
  'Time slot conflict': 'This time slot is already booked.',

  // Team / Roster
  'Team not found': 'This roster could not be found.',
  'Already a member': "You're already a player on this roster.",
  'Team is full': 'This roster is full.',

  // League
  'League not found': 'This league could not be found.',
  'Season not active': 'This league season is not currently active.',

  // Payment
  'Payment failed':
    'Payment could not be processed. Please check your payment method.',
  'Stripe error':
    'There was a problem with payment processing. Please try again.',

  // Generic
  'Internal server error': 'Something went wrong on our end. Please try again.',
  'Bad request': 'Something went wrong with that request. Please try again.',
  'Not found': 'The requested item could not be found.',
  'Validation error': 'Please check your input and try again.',
};

/**
 * Maps a raw error to a user-friendly message.
 * Falls back to a generic message if no mapping exists.
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.';

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : ((error as any)?.message ?? '');

  // Check exact match first
  if (ERROR_MAP[message]) return ERROR_MAP[message];

  // Check partial match
  const lowerMessage = message.toLowerCase();
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (lowerMessage.includes(key.toLowerCase())) return value;
  }

  // If the message looks like a user-friendly string already (no stack trace, no code), return it
  if (
    message.length > 0 &&
    message.length < 200 &&
    !message.includes('at ') &&
    !message.includes('Error:')
  ) {
    return message;
  }

  return 'Something went wrong. Please try again.';
}
