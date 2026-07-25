export type Caller = {
  id: string;
  societyId: string;
  role: 'resident' | 'security_guard' | 'society_admin';
};

export type CreatePollInput = {
  question: string;
  // ISO-8601 datetime string. Omitted = starts immediately (now()).
  startsAt?: string;
  endsAt: string;
  // At least 2 option labels (enforced in polls.schema.ts).
  options: string[];
};

export type VoteInput = {
  optionId: string;
};

export type PollOptionResult = {
  id: string;
  optionText: string;
  voteCount: number;
};

export type PollResults = {
  pollId: string;
  totalVotes: number;
  options: PollOptionResult[];
};
