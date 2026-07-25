import { pgEnum } from 'drizzle-orm/pg-core';

// ===== IDENTITY & STRUCTURE =====

export const userRoleEnum = pgEnum('user_role', ['resident', 'security_guard', 'society_admin']);

// ===== VISITOR MANAGEMENT =====

export const visitorTypeEnum = pgEnum('visitor_type', [
  'guest',
  'delivery',
  'cab',
  'service_staff',
  'admin_visitor'
]);

export const approverTypeEnum = pgEnum('approver_type', ['resident', 'admin']);

export const visitorStatusEnum = pgEnum('visitor_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
  'checked_in',
  'completed'
]);

export const visitorSourceEnum = pgEnum('visitor_source', [
  'guard_request',
  'pre_approval',
  'admin_initiated'
]);

// ===== COMMUNITY MANAGEMENT =====

export const noticeCategoryEnum = pgEnum('notice_category', [
  'emergency',
  'maintenance',
  'event',
  'general'
]);

export const complaintStatusEnum = pgEnum('complaint_status', [
  'open',
  'in_progress',
  'resolved',
  'closed'
]);

export const complaintCategoryEnum = pgEnum('complaint_category', [
  'plumbing',
  'electrical',
  'security',
  'cleanliness',
  'general'
]);

// ===== AMENITIES =====

export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled']);

// ===== MAINTENANCE & PAYMENTS =====

// Chapter 15 rework: a due's status now reflects the actual review
// workflow — pending (unpaid, or resubmit needed after a reject),
// review (resident submitted proof, awaiting admin), paid (approved, or
// admin marked it paid directly). "overdue" was dropped — there's no
// concept of a due date anymore since dues auto-materialize each month
// from the flat's fixed monthly amount.
export const dueStatusEnum = pgEnum('due_status', ['pending', 'review', 'paid']);

// Flat type — kept as a plain string union rather than growing the pg enum
// list further; residential unit types are fairly fixed but "other" covers
// anything unusual (shops, offices in mixed-use societies, etc).
export const flatTypeEnum = pgEnum('flat_type', ['1bhk', '2bhk', '3bhk', '4bhk', '5bhk', 'other']);

export const paymentConfirmationStatusEnum = pgEnum('payment_confirmation_status', [
  'pending',
  'approved',
  'rejected'
]);

// ===== INVITATIONS =====

export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'rejected',
  'cancelled'
]);
