export type CreateVisitorRequestInput = {
  visitorType: 'guest' | 'delivery' | 'cab' | 'service_staff' | 'admin_visitor';
  name: string;
  phone?: string;
  purpose?: string;
  flatId?: string;
  photo?: string;
  // Non-cab vehicle plate (e.g. a delivery rider's bike). Cab plates go in
  // details.vehicleNumber instead.
  vehicleNumber?: string;
  source?: 'guard_request' | 'pre_approval' | 'admin_initiated';
  approverType?: 'resident' | 'admin';
  details?: {
    companyName?: string;
    orderId?: string;
    providerName?: string;
    vehicleNumber?: string;
    driverName?: string;
    serviceType?: string;
    company?: string;
  };
};

export type RespondVisitorRequestInput = {
  status: 'approved' | 'rejected';
};

export type UploadVisitorPhotoInput = {
  fileName: string;
  contentType: string;
  base64: string;
};

export type CreatePreApprovalInput = {
  name: string;
  phone?: string;
  purpose?: string;
  // admin_visitor is deliberately excluded — pre-approvals are always
  // resident-routed (approverType is hardcoded to 'resident' in the
  // service), and admin_visitor always implies approverType 'admin'.
  visitorType?: 'guest' | 'delivery' | 'cab' | 'service_staff';
  // ISO-8601 datetime strings. validFrom defaults to "now" if omitted.
  validFrom?: string;
  validUntil: string;
};

export type VerifyPassInput = {
  // Guard supplies whichever one the client has on hand: a scanned QR
  // (visitor_request_id) or a hand-typed passCode. Schema-level refine
  // guarantees at least one is present.
  passCode?: string;
  requestId?: string;
};
