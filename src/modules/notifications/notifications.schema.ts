import { z } from 'zod';

export const registerPushTokenSchema = z.object({
  expoPushToken: z.string().min(1),
  deviceId: z.string().optional()
});

// Expo push tokens look like `ExponentPushToken[xxxxxxxxxxxx]` and travel
// safely as a route param, but come through URL-encoded — no extra format
// validation here beyond "non-empty", matching the register schema above.
export const unregisterTokenParamSchema = z.object({
  token: z.string().min(1)
});
