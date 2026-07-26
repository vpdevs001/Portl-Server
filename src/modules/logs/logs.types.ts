import type { z } from 'zod';
import type { listLogsQuerySchema, logResidentSchema, logStaffSchema } from './logs.schema';

export type LogResidentInput = z.infer<typeof logResidentSchema>;
export type LogStaffInput = z.infer<typeof logStaffSchema>;
export type ListLogsQuery = z.infer<typeof listLogsQuerySchema>;

export type Caller = {
  id: string;
  societyId: string;
  role: 'resident' | 'security_guard' | 'society_admin';
  flatId: string | null;
};

export type GateLogItem = {
  id: string;
  type: 'resident' | 'staff' | 'guest';
  name: string;
  subtitle: string | null;
  entryTime: string | null;
  exitTime: string | null;
  isInside: boolean;
};
