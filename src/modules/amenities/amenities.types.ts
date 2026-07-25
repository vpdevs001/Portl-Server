export type Caller = {
  id: string;
  societyId: string;
  role: 'resident' | 'security_guard' | 'society_admin';
  flatId?: string | null;
};

export type CreateAmenityInput = {
  name: string;
  description?: string;
  capacity?: number;
};

export type BookAmenityInput = {
  startTime: string;
  endTime: string;
};

export type ListBookingsQuery = {
  amenityId?: string;
};
