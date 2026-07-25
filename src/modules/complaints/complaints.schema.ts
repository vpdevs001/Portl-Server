import { z } from 'zod';

const complaintCategorySchema = z.enum([
  'plumbing',
  'electrical',
  'security',
  'cleanliness',
  'general'
]);

const complaintStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed']);

export const createComplaintSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  category: complaintCategorySchema.optional().default('general'),
  photoUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined)
});

export const updateComplaintStatusSchema = z.object({
  status: complaintStatusSchema,
  adminComments: z
    .string()
    .trim()
    .min(1)
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined)
});

export const complaintIdParamsSchema = z.object({
  id: z.string().uuid()
});
