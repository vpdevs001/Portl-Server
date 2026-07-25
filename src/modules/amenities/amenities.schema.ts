import { z } from 'zod';

export const createAmenitySchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  capacity: z.coerce.number().int().positive().optional()
});

export const bookAmenitySchema = z
  .object({
    startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'startTime must be a valid ISO datetime string'
    }),
    endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'endTime must be a valid ISO datetime string'
    })
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: 'endTime must be after startTime',
    path: ['endTime']
  })
  .refine((data) => new Date(data.startTime).getTime() + 5 * 60 * 1000 > Date.now(), {
    message: 'startTime must not be in the past',
    path: ['startTime']
  });

export const amenityIdParamsSchema = z.object({
  id: z.string().uuid()
});

export const listBookingsQuerySchema = z.object({
  amenityId: z.string().uuid().optional()
});
