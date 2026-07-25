export type ComplaintCategory = 'plumbing' | 'electrical' | 'security' | 'cleanliness' | 'general';

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type Caller = {
  id: string;
  societyId: string;
  role: 'resident' | 'security_guard' | 'society_admin';
  flatId?: string | null;
};

export type CreateComplaintInput = {
  title: string;
  description: string;
  category?: ComplaintCategory;
  // Uploaded via POST /api/upload (Chapter 7's base64-upload flow), same
  // as a visitor photo — optional, omitted if the resident skips it.
  photoUrl?: string;
};

export type UpdateComplaintStatusInput = {
  status: ComplaintStatus;
  // Admin's note appended when resolving/closing/triaging — optional so an
  // admin can flip status without necessarily leaving a comment.
  adminComments?: string;
};
