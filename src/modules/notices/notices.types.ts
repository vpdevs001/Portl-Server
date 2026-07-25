export type NoticeCategory = 'emergency' | 'maintenance' | 'event' | 'general';

export type Caller = {
  id: string;
  societyId: string;
  role: 'resident' | 'security_guard' | 'society_admin';
};

export type CreateNoticeInput = {
  title: string;
  description: string;
  category?: NoticeCategory;
  // ISO-8601 datetime string. Omitted/undefined = no expiry, stays visible
  // indefinitely.
  expiresAt?: string;
};

// Chapter 17 — a guard-triggered broadcast to the whole society. Deliberately
// narrower than CreateNoticeInput: no category (always 'emergency'), no
// expiry (an emergency notice isn't something you schedule to auto-hide).
export type EmergencyAlertInput = {
  title: string;
  description: string;
};

export type UpdateNoticeInput = {
  title?: string;
  description?: string;
  category?: NoticeCategory;
  // Distinguishing "leave as-is" from "clear the expiry" needs three states,
  // not two — a plain optional string can't tell "omitted" apart from
  // "explicitly clear it". `null` clears expiresAt; `undefined`/omitted
  // leaves it untouched; a string sets a new expiry.
  expiresAt?: string | null;
};

export type ListNoticesQuery = {
  includeExpired?: boolean;
};
