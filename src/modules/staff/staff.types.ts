export type Caller = {
  id: string;
  societyId: string;
  role: 'resident' | 'security_guard' | 'society_admin';
  flatId?: string | null;
};

export type CreateStaffInput = {
  name: string;
  roleTitle: string;
  phone: string;
  photo?: string;
};

export type UpdateStaffInput = Partial<CreateStaffInput>;

export type ListStaffQuery = {
  search?: string;
  roleTitle?: string;
};
