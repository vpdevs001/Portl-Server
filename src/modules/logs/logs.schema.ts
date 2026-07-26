import { z } from 'zod';

export const logResidentSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['entry', 'exit'])
});

export const logStaffSchema = z.object({
  staffId: z.string().uuid(),
  action: z.enum(['entry', 'exit'])
});

export const listLogsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().min(1).optional(),
  type: z.enum(['resident', 'staff', 'guest', 'all']).optional().default('all')
});
