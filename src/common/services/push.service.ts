import { inArray } from 'drizzle-orm';
import { db } from '../db';
import { pushTokens } from '../db/schema';

/**
 * Chapter 16 — Push Notification Consolidation.
 *
 * Chapter 7 pulled forward a minimal, best-effort Expo push helper
 * (`src/lib/push.ts`) because Visitor Management was the first thing that
 * actually needed to send one. This module replaces it: every module added
 * since (Notices, Complaints, Payments) had grown its own copy of the
 * "fetch tokens → call Expo" boilerplate, each with a slightly different
 * `data` payload shape. This is now the single place that does it, with:
 *
 *  - a **standard payload envelope** (`{ data: { screen, params } }`) that
 *    every notification uses, so the client's deep-link handler only has
 *    to understand one shape
 *  - **chunking** into batches of 100 — Expo's push API hard-limits a
 *    single request to 100 messages
 *  - **dead-token pruning** — Expo's response ticket for a message tells
 *    us immediately if a token is no longer valid (`DeviceNotRegistered`),
 *    so we delete it from `push_tokens` right away instead of letting it
 *    silently fail forever
 */

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

// Expo hard-limits a single push request to 100 messages.
const EXPO_PUSH_CHUNK_SIZE = 100;

export type PushEnvelope = {
  title: string;
  body: string;
  /** Deep-link target, e.g. `/(app)/notices` — matches an Expo Router route. */
  screen: string;
  /** Optional route params the client attaches to `screen` when navigating. */
  params?: Record<string, unknown>;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Looks up every registered device token for the given users and sends the
 * notification to all of them. This is the entry point every module should
 * use — it replaces each module fetching `push_tokens` itself.
 */
export async function sendPushToUsers(userIds: string[], message: PushEnvelope): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  const rows = await db
    .select({ token: pushTokens.expoPushToken })
    .from(pushTokens)
    .where(inArray(pushTokens.userId, userIds));

  await sendPushNotifications(
    rows.map((row) => row.token),
    message
  );
}

/**
 * Lower-level send for the rare case a caller already has a specific token
 * list in hand (e.g. from a join query). Prefer `sendPushToUsers` when
 * possible so token lookup stays centralized.
 */
export async function sendPushNotifications(
  tokens: string[],
  message: PushEnvelope
): Promise<void> {
  const validTokens = [...new Set(tokens)].filter((token) => token.startsWith('ExponentPushToken'));

  if (validTokens.length === 0) {
    return;
  }

  const data = { screen: message.screen, params: message.params ?? {} };

  for (const tokenChunk of chunk(validTokens, EXPO_PUSH_CHUNK_SIZE)) {
    await sendChunk(tokenChunk, message, data);
  }
}

async function sendChunk(
  tokenChunk: string[],
  message: PushEnvelope,
  data: { screen: string; params: Record<string, unknown> }
): Promise<void> {
  const payload = tokenChunk.map((to) => ({
    to,
    sound: 'default',
    title: message.title,
    body: message.body,
    data
  }));

  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const json = (await response.json()) as { data?: ExpoPushTicket[] };
    await pruneDeadTokens(tokenChunk, json.data ?? []);
  } catch {
    // Best-effort, fire-and-forget from every call site — a failed push
    // should never fail the request/response flow that triggered it. The
    // visitor-request path specifically also has the client's 5s poll as a
    // fallback (Chapter 7).
  }
}

/**
 * Expo returns one ticket per message, in the same order the messages were
 * sent — `details.error === 'DeviceNotRegistered'` means the app was
 * uninstalled or the token otherwise expired, so it's safe to delete.
 */
async function pruneDeadTokens(tokenChunk: string[], tickets: ExpoPushTicket[]): Promise<void> {
  const deadTokens = tickets
    .map((ticket, index) => ({ ticket, token: tokenChunk[index] }))
    .filter(
      ({ ticket }) => ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
    )
    .map(({ token }) => token)
    .filter((token): token is string => Boolean(token));

  if (deadTokens.length === 0) {
    return;
  }

  await db.delete(pushTokens).where(inArray(pushTokens.expoPushToken, deadTokens));
}
