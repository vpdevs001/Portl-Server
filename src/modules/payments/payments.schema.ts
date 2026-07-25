import { z } from 'zod';

export const listDuesQuerySchema = z.object({
  status: z.enum(['pending', 'review', 'paid']).optional()
});

export const setDueStatusSchema = z.object({
  // Admin can only force a due directly between pending/paid — 'review'
  // is only ever entered via a resident's own submission, never set
  // manually.
  status: z.enum(['pending', 'paid'])
});

export const confirmPaymentSchema = z.object({
  dueId: z.string().uuid(),
  amount: z.number().positive(),
  // Base64 file content — uploaded straight to ImageKit inside the
  // service, same as visitor/complaint photos, just not routed through
  // the shared POST /api/upload since this needs due/flat scoping.
  screenshot: z.string().min(1),
  upiRef: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined)
});

export const verifyPaymentSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    rejectionReason: z
      .string()
      .trim()
      .min(1)
      .optional()
      .or(z.literal(''))
      .transform((value) => value || undefined)
  })
  .refine((dto) => dto.status !== 'rejected' || !!dto.rejectionReason, {
    message: 'rejectionReason is required when rejecting a payment confirmation',
    path: ['rejectionReason']
  });

export const idParamsSchema = z.object({
  id: z.string().uuid()
});
