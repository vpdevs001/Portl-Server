import { z } from 'zod';

export const createPollSchema = z
  .object({
    question: z.string().trim().min(1).max(500),
    // Omitted = starts immediately. Sent as an ISO-8601 datetime string, same
    // pattern as notices' expiresAt (Chapter 10).
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime(),
    options: z.array(z.string().trim().min(1).max(255)).min(2).max(10)
  })
  .refine((dto) => new Date(dto.endsAt) > new Date(dto.startsAt ?? Date.now()), {
    message: 'endsAt must be after startsAt',
    path: ['endsAt']
  });

export const voteSchema = z.object({
  optionId: z.string().uuid()
});

export const pollIdParamsSchema = z.object({
  id: z.string().uuid()
});
