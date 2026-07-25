import { z } from 'zod';

export const createStaffSchema = z.object({
  name: z.string().trim().min(1).max(150),
  roleTitle: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(5).max(20),
  photo: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined)
});

export const staffIdParamSchema = z.object({
  id: z.string().uuid()
});

export const updateStaffSchema = createStaffSchema.partial();

export const listStaffQuerySchema = z.object({
  search: z.string().optional(),
  roleTitle: z.string().optional()
});
