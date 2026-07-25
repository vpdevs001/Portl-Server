import { count, eq } from 'drizzle-orm';
import { db } from '../../common/db';
import { AppError } from '../../common/errors/app-error';
import { polls, pollOptions, pollVotes } from '../../common/db/schema';
import { emitPollCreated, emitPollResults } from '../../lib/socket';
import type {
  Caller,
  CreatePollInput,
  PollOptionResult,
  PollResults,
  VoteInput
} from './polls.types';

export async function createPoll(caller: Caller, dto: CreatePollInput) {
  const created = await db.transaction(async (tx) => {
    const [poll] = await tx
      .insert(polls)
      .values({
        societyId: caller.societyId,
        createdBy: caller.id,
        question: dto.question,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        endsAt: new Date(dto.endsAt)
      })
      .returning();

    if (!poll) {
      throw AppError.badRequest('Failed to create poll');
    }

    const options = await tx
      .insert(pollOptions)
      .values(dto.options.map((optionText) => ({ pollId: poll.id, optionText })))
      .returning();

    return { ...poll, options };
  });

  // Fire-and-forget, mirroring the notices push pattern (Chapter 10): never
  // blocks/fails the response if the broadcast itself fails.
  try {
    emitPollCreated(caller.societyId, {
      ...created,
      totalVotes: 0,
      hasVoted: false,
      votedOptionId: null
    });
  } catch {
    // Socket layer being down should never fail poll creation.
  }

  return created;
}

// Lists every poll (active & closed) for the caller's society, each with its
// options, the caller's own vote status, and live vote counts per option —
// enough for the client to render either the ballot or the results view
// without a second round trip per poll.
export async function listPolls(caller: Caller) {
  const rows = await db.query.polls.findMany({
    where: { societyId: caller.societyId },
    with: {
      options: true,
      votes: { columns: { userId: true, pollOptionId: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return rows.map((poll) => {
    const voteCounts = new Map<string, number>();
    for (const vote of poll.votes) {
      voteCounts.set(vote.pollOptionId, (voteCounts.get(vote.pollOptionId) ?? 0) + 1);
    }

    const myVote = poll.votes.find((vote) => vote.userId === caller.id);

    return {
      id: poll.id,
      societyId: poll.societyId,
      question: poll.question,
      startsAt: poll.startsAt,
      endsAt: poll.endsAt,
      createdAt: poll.createdAt,
      options: poll.options.map((option) => ({
        id: option.id,
        optionText: option.optionText,
        voteCount: voteCounts.get(option.id) ?? 0
      })),
      totalVotes: poll.votes.length,
      hasVoted: Boolean(myVote),
      votedOptionId: myVote?.pollOptionId ?? null
    };
  });
}

async function findPollInSociety(pollId: string, societyId: string) {
  const poll = await db.query.polls.findFirst({
    where: { id: pollId, societyId },
    with: { options: true }
  });

  if (!poll) {
    throw AppError.notFound('Poll not found');
  }

  return poll;
}

export async function castVote(caller: Caller, pollId: string, dto: VoteInput) {
  const poll = await findPollInSociety(pollId, caller.societyId);

  if (poll.endsAt <= new Date()) {
    throw AppError.badRequest('This poll has already closed');
  }

  const option = poll.options.find((o) => o.id === dto.optionId);
  if (!option) {
    throw AppError.badRequest('Option does not belong to this poll');
  }

  try {
    await db.insert(pollVotes).values({
      pollId: poll.id,
      pollOptionId: option.id,
      userId: caller.id
    });
  } catch (error) {
    // 23505 = unique_violation on (poll_id, user_id) — the DB is the source
    // of truth for one-vote-per-resident, an atomic insert rather than a
    // check-then-insert race. See community.schema.ts.
    if ((error as { code?: string }).code === '23505') {
      throw AppError.conflict('You have already voted in this poll');
    }
    throw error;
  }

  const results = await getPollResults(caller, pollId);

  try {
    emitPollResults(caller.societyId, results);
  } catch {
    // Socket layer being down should never fail the vote itself.
  }

  return results;
}

export async function getPollResults(caller: Caller, pollId: string): Promise<PollResults> {
  const poll = await findPollInSociety(pollId, caller.societyId);

  const counts = await db
    .select({ optionId: pollVotes.pollOptionId, voteCount: count() })
    .from(pollVotes)
    .where(eq(pollVotes.pollId, poll.id))
    .groupBy(pollVotes.pollOptionId);

  const countByOption = new Map(counts.map((row) => [row.optionId, Number(row.voteCount)]));

  const options: PollOptionResult[] = poll.options.map((option) => ({
    id: option.id,
    optionText: option.optionText,
    voteCount: countByOption.get(option.id) ?? 0
  }));

  return {
    pollId: poll.id,
    totalVotes: options.reduce((sum, o) => sum + o.voteCount, 0),
    options
  };
}
