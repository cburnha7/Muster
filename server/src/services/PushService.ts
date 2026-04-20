/**
 * Push Notification Service
 *
 * Sends push notifications via the Expo Push API.
 * Handles token management, batching, and error handling.
 *
 * Expo Push API docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { prisma } from '../lib/prisma';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Expo recommends max 100 per request

export interface PushMessage {
  to: string; // Expo push token
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

export interface PushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/**
 * Register or update a push token for a user.
 * Upserts — if the token already exists for this user, updates the timestamp.
 */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: string
): Promise<void> {
  // Validate it looks like an Expo push token
  if (
    !token.startsWith('ExponentPushToken[') &&
    !token.startsWith('ExpoPushToken[')
  ) {
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
 * Remove a push token (e.g., on logout).
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

/**
 * Get all active push tokens for a list of user IDs.
 */
async function getTokensForUsers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];

  const records = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });

  return records.map(r => r.token);
}

/**
 * Send push notifications to a list of user IDs.
 * Resolves user IDs to push tokens, batches the request, and handles errors.
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ sent: number; failed: number }> {
  const uniqueIds = [...new Set(userIds)];
  const tokens = await getTokensForUsers(uniqueIds);

  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const messages: PushMessage[] = tokens.map(token => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
  }));

  return sendPushBatch(messages);
}

/**
 * Send a batch of push messages to the Expo Push API.
 * Handles chunking into batches of 100.
 */
async function sendPushBatch(
  messages: PushMessage[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Chunk into batches
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        console.error(
          `[push] Expo API returned ${response.status}: ${await response.text()}`
        );
        failed += batch.length;
        continue;
      }

      const result = await response.json();
      const tickets = result.data as PushReceipt[];

      for (let j = 0; j < tickets.length; j++) {
        const ticket = tickets[j];
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
          const errorType = ticket.details?.error;

          // If the token is invalid, remove it from the database
          if (errorType === 'DeviceNotRegistered') {
            const badToken = batch[j].to;
            console.warn(
              `[push] Removing invalid token: ${badToken.substring(0, 30)}...`
            );
            await prisma.pushToken.deleteMany({ where: { token: badToken } });
          } else {
            console.error(
              `[push] Failed to send to ${batch[j].to.substring(0, 30)}...: ${errorType}`
            );
          }
        }
      }
    } catch (error) {
      console.error('[push] Batch send failed:', error);
      failed += batch.length;
    }
  }

  if (sent > 0 || failed > 0) {
    console.log(`[push] Sent: ${sent}, Failed: ${failed}`);
  }

  return { sent, failed };
}
