import { z } from 'zod';

export const searchUsersSchema = z.object({
  q: z.string().min(1)
});

export const createInviteSchema = z
  .object({
    userId: z.string().uuid(),
    role: z.enum(['resident', 'security_guard']),
    flatId: z.string().uuid().optional()
  })
  .refine(
    (data) => {
      if (data.role === 'resident' && !data.flatId) {
        return false;
      }
      return true;
    },
    {
      message: 'flatId is required when role is resident',
      path: ['flatId']
    }
  );

export const respondInviteSchema = z.object({
  action: z.enum(['accept', 'reject'])
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type RespondInviteInput = z.infer<typeof respondInviteSchema>;
