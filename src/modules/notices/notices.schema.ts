import { z } from 'zod';

const noticeCategorySchema = z.enum(['emergency', 'maintenance', 'event', 'general']);

export const createNoticeSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  category: noticeCategorySchema.optional().default('general'),
  // Date-only selection on the client (per plan.md Chapter 10), sent as an
  // ISO-8601 datetime string. Omitted = no expiry.
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .refine((value) => !value || new Date(value) > new Date(), {
      message: 'expiresAt must be in the future'
    })
});

export const updateNoticeSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().min(1).optional(),
  category: noticeCategorySchema.optional(),
  // Explicit null clears the expiry (notice stays up indefinitely);
  // omitted leaves it untouched; a string sets a new expiry.
  expiresAt: z.string().datetime().nullable().optional()
});

export const listNoticesQuerySchema = z.object({
  includeExpired: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true')
});

// Chapter 17 — guard-only, deliberately narrower than createNoticeSchema:
// no category (server forces 'emergency'), no expiresAt (an emergency
// notice isn't something you schedule to auto-hide).
export const createEmergencyAlertSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1)
});
