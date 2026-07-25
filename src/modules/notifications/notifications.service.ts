import { and, eq } from 'drizzle-orm';
import { db } from '../../common/db';
import { pushTokens } from '../../common/db/schema';
import type { RegisterPushTokenInput } from './notifications.types';

// Moved here from visitors.service.ts (Chapter 16) — originally pulled
// forward into Chapter 7 since Visitor Management was the first thing that
// needed to send a push. Behavior is unchanged: `onConflictDoUpdate` on the
// `(user_id, expo_push_token)` unique constraint means re-registering the
// same device (e.g. app relaunch) updates `deviceId` in place rather than
// creating a duplicate row.
export async function registerPushToken(userId: string, dto: RegisterPushTokenInput) {
  const [token] = await db
    .insert(pushTokens)
    .values({
      userId,
      expoPushToken: dto.expoPushToken,
      deviceId: dto.deviceId ?? null
    })
    .onConflictDoUpdate({
      target: [pushTokens.userId, pushTokens.expoPushToken],
      set: { deviceId: dto.deviceId ?? null }
    })
    .returning();

  return token;
}

// New in Chapter 16. Scoped to the caller's own userId — a token belongs to
// whoever registered it, so logging out on one device should only ever be
// able to remove that device's own token, never another user's.
export async function unregisterPushToken(userId: string, token: string) {
  await db
    .delete(pushTokens)
    .where(and(eq(pushTokens.userId, userId), eq(pushTokens.expoPushToken, token)));
}
