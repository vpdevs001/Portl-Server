import { z } from 'zod';

export const createVisitorRequestSchema = z.object({
  visitorType: z.enum(['guest', 'delivery', 'cab', 'service_staff', 'admin_visitor']),
  name: z.string().min(1),
  phone: z
    .string()
    .min(3)
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  purpose: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  flatId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  photo: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  vehicleNumber: z
    .string()
    .min(1)
    .optional()
    .or(z.literal(''))
    .transform((value) => value || undefined),
  source: z
    .enum(['guard_request', 'pre_approval', 'admin_initiated'])
    .optional()
    .default('guard_request'),
  approverType: z.enum(['resident', 'admin']).optional().default('resident'),
  details: z
    .object({
      companyName: z.string().optional(),
      orderId: z.string().optional(),
      providerName: z.string().optional(),
      vehicleNumber: z.string().optional(),
      driverName: z.string().optional(),
      serviceType: z.string().optional(),
      company: z.string().optional()
    })
    .optional()
});

export const respondVisitorRequestSchema = z.object({
  status: z.enum(['approved', 'rejected'])
});

export const uploadVisitorPhotoSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  base64: z.string().min(1)
});

export const createPreApprovalSchema = z
  .object({
    name: z.string().min(1),
    phone: z
      .string()
      .min(3)
      .optional()
      .or(z.literal(''))
      .transform((value) => value || undefined),
    purpose: z
      .string()
      .min(1)
      .optional()
      .or(z.literal(''))
      .transform((value) => value || undefined),
    // admin_visitor excluded on purpose — see visitors.types.ts.
    visitorType: z.enum(['guest', 'delivery', 'cab', 'service_staff']).optional().default('guest'),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime()
  })
  .refine((data) => !data.validFrom || new Date(data.validFrom) < new Date(data.validUntil), {
    message: 'validUntil must be after validFrom',
    path: ['validUntil']
  });

export const verifyPassSchema = z
  .object({
    passCode: z
      .string()
      .trim()
      .length(6)
      .optional()
      .or(z.literal(''))
      .transform((value) => value || undefined),
    requestId: z.string().uuid().optional()
  })
  .refine((data) => Boolean(data.passCode || data.requestId), {
    message: 'Provide either a passCode or a requestId',
    path: ['passCode']
  });
