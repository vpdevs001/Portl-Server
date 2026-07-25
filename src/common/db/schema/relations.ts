import { defineRelations } from 'drizzle-orm';
import * as auth from './auth.schema';
import * as identity from './identity.schema';
import * as visitors from './visitors.schema';
import * as logs from './logs.schema';
import * as community from './community.schema';
import * as amenities from './amenities.schema';
import * as payments from './payments.schema';
import * as invites from './invites.schema';

const schema = {
  ...auth,
  ...identity,
  ...visitors,
  ...logs,
  ...community,
  ...amenities,
  ...payments,
  ...invites
};

export const relations = defineRelations(schema, (r) => ({
  // ===== BETTER AUTH =====

  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
    society: r.one.societies({
      from: r.user.societyId,
      to: r.societies.id
    }),
    flat: r.one.flats({
      from: r.user.flatId,
      to: r.flats.id
    }),
    createdVisitorRequests: r.many.visitorRequests({
      alias: 'visitorRequestCreator'
    }),
    approvedVisitorRequests: r.many.visitorRequests({
      alias: 'visitorRequestApprover'
    }),
    residentEntryLogs: r.many.residentEntryLogs({
      alias: 'residentEntryLogOwner'
    }),
    sentInvites: r.many.societyInvites({
      alias: 'inviteSender'
    }),
    receivedInvites: r.many.societyInvites({
      alias: 'inviteReceiver'
    }),
    pushTokens: r.many.pushTokens()
  },

  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id
    })
  },

  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id
    })
  },

  // ===== IDENTITY & STRUCTURE =====

  societies: {
    towers: r.many.towers(),
    flats: r.many.flats(),
    users: r.many.user(),
    staffDirectory: r.many.staffDirectory(),
    notices: r.many.notices(),
    polls: r.many.polls(),
    complaints: r.many.complaints(),
    amenities: r.many.amenities(),
    maintenanceDues: r.many.maintenanceDues(),
    visitorRequests: r.many.visitorRequests(),
    invites: r.many.societyInvites(),
    residentEntryLogs: r.many.residentEntryLogs(),
    staffEntryLogs: r.many.staffEntryLogs()
  },

  towers: {
    society: r.one.societies({
      from: r.towers.societyId,
      to: r.societies.id
    }),
    flats: r.many.flats()
  },

  flats: {
    society: r.one.societies({
      from: r.flats.societyId,
      to: r.societies.id
    }),
    tower: r.one.towers({
      from: r.flats.towerId,
      to: r.towers.id
    }),
    users: r.many.user(),
    complaints: r.many.complaints(),
    amenityBookings: r.many.amenityBookings(),
    maintenanceDues: r.many.maintenanceDues(),
    invites: r.many.societyInvites()
  },

  // ===== VISITOR MANAGEMENT =====

  visitorRequests: {
    society: r.one.societies({
      from: r.visitorRequests.societyId,
      to: r.societies.id
    }),
    flat: r.one.flats({
      from: r.visitorRequests.flatId,
      to: r.flats.id
    }),
    createdByUser: r.one.user({
      from: r.visitorRequests.createdBy,
      to: r.user.id,
      alias: 'visitorRequestCreator'
    }),
    approvedByUser: r.one.user({
      from: r.visitorRequests.approvedBy,
      to: r.user.id,
      alias: 'visitorRequestApprover'
    }),
    deliveryDetails: r.one.deliveryDetails(),
    cabDetails: r.one.cabDetails(),
    serviceStaffDetails: r.one.serviceStaffDetails(),
    entryLogs: r.many.visitorEntryLogs()
  },

  deliveryDetails: {
    visitorRequest: r.one.visitorRequests({
      from: r.deliveryDetails.visitorRequestId,
      to: r.visitorRequests.id
    })
  },

  cabDetails: {
    visitorRequest: r.one.visitorRequests({
      from: r.cabDetails.visitorRequestId,
      to: r.visitorRequests.id
    })
  },

  serviceStaffDetails: {
    visitorRequest: r.one.visitorRequests({
      from: r.serviceStaffDetails.visitorRequestId,
      to: r.visitorRequests.id
    })
  },

  pushTokens: {
    user: r.one.user({
      from: r.pushTokens.userId,
      to: r.user.id
    })
  },

  // ===== ENTRY / EXIT LOGS =====

  visitorEntryLogs: {
    visitorRequest: r.one.visitorRequests({
      from: r.visitorEntryLogs.visitorRequestId,
      to: r.visitorRequests.id
    }),
    entryMarkedByUser: r.one.user({
      from: r.visitorEntryLogs.entryMarkedBy,
      to: r.user.id
    }),
    exitMarkedByUser: r.one.user({
      from: r.visitorEntryLogs.exitMarkedBy,
      to: r.user.id
    })
  },

  residentEntryLogs: {
    society: r.one.societies({
      from: r.residentEntryLogs.societyId,
      to: r.societies.id
    }),
    user: r.one.user({
      from: r.residentEntryLogs.userId,
      to: r.user.id,
      alias: 'residentEntryLogOwner'
    }),
    entryMarkedByUser: r.one.user({
      from: r.residentEntryLogs.entryMarkedBy,
      to: r.user.id
    }),
    exitMarkedByUser: r.one.user({
      from: r.residentEntryLogs.exitMarkedBy,
      to: r.user.id
    })
  },

  staffDirectory: {
    society: r.one.societies({
      from: r.staffDirectory.societyId,
      to: r.societies.id
    }),
    entryLogs: r.many.staffEntryLogs()
  },

  staffEntryLogs: {
    society: r.one.societies({
      from: r.staffEntryLogs.societyId,
      to: r.societies.id
    }),
    staff: r.one.staffDirectory({
      from: r.staffEntryLogs.staffId,
      to: r.staffDirectory.id
    }),
    entryMarkedByUser: r.one.user({
      from: r.staffEntryLogs.entryMarkedBy,
      to: r.user.id
    }),
    exitMarkedByUser: r.one.user({
      from: r.staffEntryLogs.exitMarkedBy,
      to: r.user.id
    })
  },

  // ===== COMMUNITY MANAGEMENT =====

  notices: {
    society: r.one.societies({
      from: r.notices.societyId,
      to: r.societies.id
    }),
    createdByUser: r.one.user({
      from: r.notices.createdBy,
      to: r.user.id
    })
  },

  polls: {
    society: r.one.societies({
      from: r.polls.societyId,
      to: r.societies.id
    }),
    createdByUser: r.one.user({
      from: r.polls.createdBy,
      to: r.user.id
    }),
    options: r.many.pollOptions(),
    votes: r.many.pollVotes()
  },

  pollOptions: {
    poll: r.one.polls({
      from: r.pollOptions.pollId,
      to: r.polls.id
    }),
    votes: r.many.pollVotes()
  },

  pollVotes: {
    poll: r.one.polls({
      from: r.pollVotes.pollId,
      to: r.polls.id
    }),
    pollOption: r.one.pollOptions({
      from: r.pollVotes.pollOptionId,
      to: r.pollOptions.id
    }),
    user: r.one.user({
      from: r.pollVotes.userId,
      to: r.user.id
    })
  },

  complaints: {
    society: r.one.societies({
      from: r.complaints.societyId,
      to: r.societies.id
    }),
    flat: r.one.flats({
      from: r.complaints.flatId,
      to: r.flats.id
    }),
    raisedByUser: r.one.user({
      from: r.complaints.raisedBy,
      to: r.user.id
    })
  },

  // ===== AMENITIES =====

  amenities: {
    society: r.one.societies({
      from: r.amenities.societyId,
      to: r.societies.id
    }),
    bookings: r.many.amenityBookings()
  },

  amenityBookings: {
    amenity: r.one.amenities({
      from: r.amenityBookings.amenityId,
      to: r.amenities.id
    }),
    flat: r.one.flats({
      from: r.amenityBookings.flatId,
      to: r.flats.id
    }),
    bookedByUser: r.one.user({
      from: r.amenityBookings.bookedBy,
      to: r.user.id
    })
  },

  // ===== MAINTENANCE & PAYMENTS =====

  maintenanceDues: {
    society: r.one.societies({
      from: r.maintenanceDues.societyId,
      to: r.societies.id
    }),
    flat: r.one.flats({
      from: r.maintenanceDues.flatId,
      to: r.flats.id
    }),
    paymentConfirmations: r.many.paymentConfirmations()
  },

  paymentConfirmations: {
    due: r.one.maintenanceDues({
      from: r.paymentConfirmations.dueId,
      to: r.maintenanceDues.id
    }),
    flat: r.one.flats({
      from: r.paymentConfirmations.flatId,
      to: r.flats.id
    }),
    raisedByUser: r.one.user({
      from: r.paymentConfirmations.raisedBy,
      to: r.user.id,
      alias: 'paymentConfirmationRaisedBy'
    }),
    reviewedByUser: r.one.user({
      from: r.paymentConfirmations.reviewedBy,
      to: r.user.id,
      alias: 'paymentConfirmationReviewedBy'
    })
  },

  societyInvites: {
    society: r.one.societies({
      from: r.societyInvites.societyId,
      to: r.societies.id
    }),
    invitedUser: r.one.user({
      from: r.societyInvites.invitedUserId,
      to: r.user.id,
      alias: 'inviteReceiver'
    }),
    invitedByUser: r.one.user({
      from: r.societyInvites.invitedBy,
      to: r.user.id,
      alias: 'inviteSender'
    }),
    flat: r.one.flats({
      from: r.societyInvites.flatId,
      to: r.flats.id
    })
  }
}));

export type Relations = typeof relations;
