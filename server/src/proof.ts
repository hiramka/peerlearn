// Proof Service: Question Bank, Disjoint Quizzes, Retention & Impact Reporting (PROOF-1 to PROOF-5)
import type { Question, SessionResult, RetentionCheckTask, ProofCohortSummary, Topic } from "../../shared/types";
import { sessions } from "./data";

export const retentionTasksStore: RetentionCheckTask[] = [
  {
    id: "ret-seed-1",
    client_id: "seed-1",
    school_id: "s1",
    learner_id: "x1",
    topic_id: 1,
    session_completed_at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
    due_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    retention_score: 0.67,
    completed_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    status: "completed",
  },
  {
    id: "ret-seed-2",
    client_id: "seed-2",
    school_id: "s1",
    learner_id: "x2",
    topic_id: 1,
    session_completed_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    due_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    retention_score: 0.85,
    completed_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    status: "completed",
  },
];

// PROOF-2 (DoD): Validate that pre and post quizzes never share questions
export function validateDisjointQuizzes(pre: Question[], post: Question[]): { isDisjoint: boolean; overlap: string[] } {
  const prePrompts = new Set(pre.map((q) => q.q.trim().toLowerCase()));
  const preIds = new Set(pre.map((q) => q.id).filter(Boolean));

  const overlap: string[] = [];
  for (const q of post) {
    const cleanPrompt = q.q.trim().toLowerCase();
    if (prePrompts.has(cleanPrompt)) {
      overlap.push(q.q);
    } else if (q.id && preIds.has(q.id)) {
      overlap.push(String(q.id));
    }
  }

  return {
    isDisjoint: overlap.length === 0,
    overlap,
  };
}

// PROOF-3: Schedule a retention check approximately 7 days after session completion
export function scheduleRetentionCheck(params: {
  client_id: string;
  school_id: string;
  learner_id: string;
  topic_id: number;
  session_completed_at?: string;
  daysDelay?: number;
}): RetentionCheckTask {
  const sessionAt = params.session_completed_at ? new Date(params.session_completed_at) : new Date();
  const days = params.daysDelay ?? 7;
  const dueDate = new Date(sessionAt.getTime() + days * 24 * 60 * 60 * 1000);

  const existing = retentionTasksStore.find((t) => t.client_id === params.client_id);
  if (existing) return existing;

  const task: RetentionCheckTask = {
    id: `ret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    client_id: params.client_id,
    school_id: params.school_id,
    learner_id: params.learner_id,
    topic_id: params.topic_id,
    session_completed_at: sessionAt.toISOString(),
    due_at: dueDate.toISOString(),
    status: "pending",
  };

  retentionTasksStore.push(task);
  return task;
}

// PROOF-3: Submit retention score and update session
export function recordRetentionScore(params: {
  client_id: string;
  retention_score: number;
  completed_at?: string;
}) {
  const completedAt = params.completed_at || new Date().toISOString();

  // Update session
  const session = sessions.find((s) => s.client_id === params.client_id);
  if (session) {
    session.retention_score = params.retention_score;
    session.retention_at = completedAt;
  }

  // Update retention task
  const task = retentionTasksStore.find((t) => t.client_id === params.client_id);
  if (task) {
    task.retention_score = params.retention_score;
    task.completed_at = completedAt;
    task.status = "completed";
  }

  return {
    ok: true,
    client_id: params.client_id,
    retention_score: params.retention_score,
    completed_at: completedAt,
    session,
  };
}

// PROOF-3: Get pending retention tasks for learner
export function getPendingRetentionTasks(learnerId: string, asOfDate: Date = new Date()): RetentionCheckTask[] {
  return retentionTasksStore.filter(
    (t) => t.learner_id === learnerId && t.status === "pending" && new Date(t.due_at) <= asOfDate
  );
}

// PROOF-4 & PROOF-5: Compute Immediate Gain, Retention Gain, and Comparison Group Separation
export function generateProofCohortSummary(allSessions: SessionResult[], allTopics: Topic[]): ProofCohortSummary[] {
  return allTopics.map((topic) => {
    // Exclude comparison group from primary peer-tutoring cohort metrics
    const peerSessions = allSessions.filter((s) => s.topicId === topic.id && !s.is_comparison_group);
    const compSessions = allSessions.filter((s) => s.topicId === topic.id && s.is_comparison_group);

    const avg = (items: SessionResult[], getter: (s: SessionResult) => number | undefined) => {
      const vals = items.map(getter).filter((v): v is number => typeof v === "number");
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    const avgPre = avg(peerSessions, (s) => s.pre);
    const avgPost = avg(peerSessions, (s) => s.post);
    const immediateGain = avgPost - avgPre;

    const retentionSessions = peerSessions.filter((s) => typeof s.retention_score === "number");
    const avgRetention = avg(retentionSessions, (s) => s.retention_score);
    const retentionGain = retentionSessions.length > 0 ? avgRetention - avgPre : 0;

    const ratings = peerSessions.map((s) => s.learnerRating).filter((r): r is number => typeof r === "number");
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined;

    // PROOF-5: Comparison group baseline vs post stats
    let comparisonGroup;
    if (compSessions.length > 0) {
      const compPre = avg(compSessions, (s) => s.pre);
      const compPost = avg(compSessions, (s) => s.post);
      comparisonGroup = {
        learnerCount: compSessions.length,
        avgGain: compPost - compPre,
      };
    }

    return {
      topic: topic.name,
      topicId: topic.id,
      sessions: peerSessions.length,
      avgPre,
      avgPost,
      immediateGain,
      retentionSessions: retentionSessions.length,
      avgRetention,
      retentionGain,
      avgRating,
      comparisonGroup,
    };
  });
}
