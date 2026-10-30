import type { GroupMatch, GroupSessionResult } from "../../shared/types";
import { tutors, topics } from "./data";
import { broadcastSessionEvent } from "./live";
import { logAudit } from "./safeguarding";

export const groupMatchesStore = new Map<string, GroupMatch>();
export const groupSessionsStore: GroupSessionResult[] = [];

// Seed an initial demo group match
groupMatchesStore.set("gm-1", {
  id: "gm-1",
  schoolId: "s1",
  tutorId: "t1",
  tutorName: "Wanjiru",
  learnerIds: ["l1", "l2", "l3"],
  topicId: 1,
  topicName: "Solving linear equations",
  scheduledAt: "Tomorrow, 16:00 (Room 3B)",
  status: "scheduled",
});

export function getGroupMatches(schoolId: string = "s1"): GroupMatch[] {
  return Array.from(groupMatchesStore.values()).filter((g) => g.schoolId === schoolId);
}

export function createGroupMatch(params: {
  schoolId: string;
  tutorId: string;
  learnerIds: string[];
  topicId: number;
  scheduledAt?: string;
}): GroupMatch {
  const { schoolId, tutorId, learnerIds, topicId, scheduledAt } = params;

  if (!tutorId || !learnerIds || learnerIds.length < 2) {
    throw new Error("Small group requires a tutor and at least 2 learners.");
  }
  if (learnerIds.length > 5) {
    throw new Error("Maximum group size is 4 learners to maintain high-impact peer attention.");
  }

  const tutor = tutors.find((t) => t.id === tutorId);
  const topic = topics.find((t) => t.id === topicId);

  const newMatch: GroupMatch = {
    id: `gm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    schoolId,
    tutorId,
    tutorName: tutor ? tutor.name : "Peer Tutor",
    learnerIds,
    topicId,
    topicName: topic ? topic.name : `Topic #${topicId}`,
    scheduledAt: scheduledAt || "Scheduled (School Library)",
    status: "scheduled",
  };

  groupMatchesStore.set(newMatch.id, newMatch);

  logAudit(schoolId, tutorId, "GROUP_TUTORING_MATCH_CREATED", {
    groupId: newMatch.id,
    learnerCount: learnerIds.length,
    topicId,
  });

  return newMatch;
}

export function recordGroupSessionResult(session: GroupSessionResult): {
  ok: boolean;
  session: GroupSessionResult;
  message: string;
} {
  if (!session.client_id || !session.groupId) {
    throw new Error("Invalid group session data.");
  }

  // Idempotent deduplication on client_id
  const existing = groupSessionsStore.find((s) => s.client_id === session.client_id);
  if (existing) {
    return { ok: true, session: existing, message: "Group session already synced." };
  }

  if (!session.learnerResults || session.learnerResults.length === 0) {
    throw new Error("Invalid group session data.");
  }

  // Calculate average gain
  const totalGain = session.learnerResults.reduce((acc, r) => acc + (r.postScore - r.preScore), 0);
  const avgGain = Number((totalGain / session.learnerResults.length).toFixed(2));
  session.avgGain = avgGain;

  groupSessionsStore.push(session);

  // Update match status to completed
  const match = groupMatchesStore.get(session.groupId);
  if (match) {
    match.status = "completed";
  }

  // Broadcast real-time event for teachers
  broadcastSessionEvent({
    session_id: session.client_id,
    school_id: session.schoolId || "s1",
    type: "ended",
    payload: {
      type: "group_session_completed",
      groupId: session.groupId,
      topicId: session.topicId,
      learnerCount: session.learnerResults.length,
      avgGain,
    },
  });

  return {
    ok: true,
    session,
    message: `Group session completed! Average cohort mastery gain: +${(avgGain * 100).toFixed(0)}%`,
  };
}

export function getGroupSessions(schoolId: string = "s1"): GroupSessionResult[] {
  return groupSessionsStore.filter((s) => s.schoolId === schoolId);
}

export function resetGroupData(): void {
  groupMatchesStore.clear();
  groupSessionsStore.length = 0;
  // Re-seed demo
  groupMatchesStore.set("gm-1", {
    id: "gm-1",
    schoolId: "s1",
    tutorId: "t1",
    tutorName: "Wanjiru",
    learnerIds: ["l1", "l2", "l3"],
    topicId: 1,
    topicName: "Solving linear equations",
    scheduledAt: "Tomorrow, 16:00 (Room 3B)",
    status: "scheduled",
  });
}
