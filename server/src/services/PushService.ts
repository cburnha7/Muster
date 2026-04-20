/**
 * Push Notification Service
 *
 * Sends push notifications via the Expo Push API.
 * Handles token management, batching, and error handling.
 *
 * Expo Push API docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { prisma } from '../lib/prisma';

// ─── Expo Push API types ─────────────────────────────────────

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Expo recommends max 100 per request

/** Shape of a single message sent to the Expo Push API. */
interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

/** A successful ticket returned by the Expo Push API. */
interface ExpoPushTicketOk {
  status: 'ok';
  id: string;
}

/** An error ticket returned by the Expo Push API. */
interface ExpoPushTicketError {
  status: 'error';
  message: string;
  details?: {
    error:
      | 'DeviceNotRegistered'
      | 'InvalidCredentials'
      | 'MessageTooBig'
      | 'MessageRateExceeded'
      | string;
  };
}

type ExpoPushTicket = ExpoPushTicketOk | ExpoPushTicketError;

/** Top-level response shape from the Expo Push API. */
interface ExpoPushResponse {
  data: ExpoPushTicket[];
  errors?: Array<{ code: string; message: string }>;
}

// ─── Token management ────────────────────────────────────────

/**
 * Register or update a push token for a user.
 * Upserts — if the token already exists for this user, updates the timestamp.
 */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: string
): Promise<void> {
  if (!isValidExpoToken(token)) {
    console.warn(
      `[push] Invalid token format for user ${userId}: ${token.substring(0, 30)}...`
    );
    return;
  }

  await prisma.pushToken.upsert({
    where: { userId_token: { userId, token } },
    create: { userId, token, platform },
    update: { updatedAt: new Date() },
  });
}

/**
 * Remove a specific push token (e.g., on logout).
 */
export async function removePushToken(
  userId: string,
  token: string
): Promise<void> {
  await prisma.pushToken.deleteMany({
    where: { userId, token },
  });
}

/**
 * Remove all push tokens for a user (e.g., on account deletion).
 */
export async function removeAllPushTokens(userId: string): Promise<void> {
  await prisma.pushToken.deleteMany({ where: { userId } });
}

// ─── Sending ─────────────────────────────────────────────────

/**
 * Send push notifications to a list of user IDs.
 * Resolves user IDs to push tokens, batches the request, and handles errors.
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ sent: number; failed: number }> {
  const uniqueIds = [...new Set(userIds)];
  const tokens = await getTokensForUsers(uniqueIds);

  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const messages: ExpoPushMessage[] = tokens.map(token => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
  }));

  return sendBatched(messages);
}

// ─── Internal helpers ────────────────────────────────────────

/** Validate that a string looks like an Expo push token. */
function isValidExpoToken(token: string): boolean {
  return (
    token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
  );
}

/** Get all active push tokens for a list of user IDs. */
async function getTokensForUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  const records = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });

  return records.map(r => r.token);
}

/**
 * Send messages to the Expo Push API in batches of BATCH_SIZE.
 * Handles chunking, HTTP errors, and per-ticket error handling.
 */
async function sendBatched(
  messages: ExpoPushMessage[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const result = await sendSingleBatch(batch);
    sent += result.sent;
    failed += result.failed;
  }

  if (sent > 0 || failed > 0) {
    console.log(`[push] Sent: ${sent}, Failed: ${failed}`);
  }

  return { sent, failed };
}

/**
 * Send a single batch (≤100 messages) to the Expo Push API.
 * Returns per-ticket success/failure counts.
 */
async function sendSingleBatch(
  batch: ExpoPushMessage[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  let response: Response;
  try {
    response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch),
    });
  } catch (networkError) {
    console.error('[push] Network error calling Expo Push API:', networkError);
    return { sent: 0, failed: batch.length };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '(unreadable)');
    console.error(`[push] Expo API returned ${response.status}: ${text}`);
    return { sent: 0, failed: batch.length };
  }

  let parsed: ExpoPushResponse;
  try {
    const json: unknown = await response.json();
    parsed = json as ExpoPushResponse;
  } catch (parseError) {
    console.error('[push] Failed to parse Expo API response:', parseError);
    return { sent: 0, failed: batch.length };
  }

  // Check for top-level API errors (e.g., malformed request)
  if (parsed.errors && parsed.errors.length > 0) {
    console.error('[push] Expo API errors:', parsed.errors);
    return { sent: 0, failed: batch.length };
  }

  const tickets = parsed.data;
  if (!Array.isArray(tickets)) {
    console.error('[push] Unexpected response shape — data is not an array');
    return { sent: 0, failed: batch.length };
  }

  for (let j = 0; j < tickets.length; j++) {
    const ticket = tickets[j];

    if (ticket.status === 'ok') {
      sent++;
      continue;
    }

    // Error ticket
    failed++;
    const errorType = ticket.details?.error;

    if (errorType === 'DeviceNotRegistered') {
      // Token is stale — remove it from the database
      const badToken = batch[j].to;
      console.warn(
        `[push] Removing stale token: ${badToken.substring(0, 30)}...`
      );
      await prisma.pushToken
        .deleteMany({ where: { token: badToken } })
        .catch(err => {
          console.error('[push] Failed to delete stale token:', err);
        });
    } else {
      console.error(
        `[push] Ticket error for ${batch[j].to.substring(0, 30)}...: ${ticket.message} (${errorType ?? 'unknown'})`
      );
    }
  }

  return { sent, failed };
}
