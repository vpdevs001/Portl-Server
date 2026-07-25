export type Caller = {
  id: string;
  societyId: string;
  role: 'resident' | 'security_guard' | 'society_admin';
  flatId?: string | null;
};

export type DueStatus = 'pending' | 'review' | 'paid';

export type ListDuesQuery = {
  status?: DueStatus;
};

export type SetDueStatusInput = {
  status: 'pending' | 'paid';
};

export type ConfirmPaymentInput = {
  dueId: string;
  amount: number;
  screenshot: string;
  upiRef?: string;
};

export type VerifyPaymentInput = {
  status: 'approved' | 'rejected';
  // Required when rejecting (so the resident knows what to fix); ignored
  // on approve.
  rejectionReason?: string;
};
