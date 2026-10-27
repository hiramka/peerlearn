import { describe, it, expect } from "vitest";
import { lessons, topics, sessions } from "../server/src/data";
import {
  validateDisjointQuizzes,
  scheduleRetentionCheck,
  recordRetentionScore,
  getPendingRetentionTasks,
  generateProofCohortSummary,
  retentionTasksStore,
} from "../server/src/proof";
import type { Question, SessionResult } from "../shared/types";

describe("Phase 4: Proof, Retention, and Cohort Impact (PROOF-1 to PROOF-5)", () => {
  // PROOF-1: Questions tagged by topic, sub-skill, difficulty, and language
  it("PROOF-1: questions have sub_skill, difficulty, and language tags", () => {
    expect(lessons.length).toBeGreaterThan(0);
    for (const lesson of lessons) {
      expect(lesson.pre.length).toBeGreaterThan(0);
      expect(lesson.post.length).toBeGreaterThan(0);

      for (const q of [...lesson.pre, ...lesson.post, ...(lesson.retention || [])]) {
        expect(q.sub_skill).toBeDefined();
        expect(typeof q.sub_skill).toBe("string");
        expect(q.difficulty).toBeGreaterThanOrEqual(1);
        expect(q.language).toBeDefined();
      }
    }
  });

  // PROOF-2 (Definition of Done): Pre and post quizzes must never share questions
  it("PROOF-2 (DoD): pre and post quizzes never share questions across all curriculum lessons", () => {
    for (const lesson of lessons) {
      const validation = validateDisjointQuizzes(lesson.pre, lesson.post);
      expect(validation.isDisjoint).toBe(true);
      expect(validation.overlap).toEqual([]);

      // Also ensure retention questions are disjoint from pre and post
      if (lesson.retention) {
        const retVsPre = validateDisjointQuizzes(lesson.pre, lesson.retention);
        expect(retVsPre.isDisjoint).toBe(true);
        const retVsPost = validateDisjointQuizzes(lesson.post, lesson.retention);
        expect(retVsPost.isDisjoint).toBe(true);
      }
    }
  });

  it("PROOF-2: validateDisjointQuizzes correctly detects and flags overlapping questions", () => {
    const preQuiz: Question[] = [
      { id: "q1", q: "Solve: x + 4 = 9", options: ["3", "5", "13"], answer: 1 },
      { id: "q2", q: "Solve: 3x = 12", options: ["4", "9", "15"], answer: 0 },
    ];

    const overlappingPostQuiz: Question[] = [
      { id: "q3", q: "Solve: 2x = 10", options: ["2", "5", "10"], answer: 1 },
      { id: "q1", q: "Solve: x + 4 = 9", options: ["3", "5", "13"], answer: 1 }, // duplicate!
    ];

    const result = validateDisjointQuizzes(preQuiz, overlappingPostQuiz);
    expect(result.isDisjoint).toBe(false);
    expect(result.overlap.length).toBeGreaterThan(0);
  });

  // PROOF-3 (Definition of Done): Retention check scheduled 7 days after session and records retention_score
  it("PROOF-3 (DoD): scheduleRetentionCheck schedules task ~7 days out and recordRetentionScore records score", () => {
    const sessionTime = new Date("2026-10-01T10:00:00Z");
    const testClientId = "test-session-proof-3";

    // Add session to data store
    const testSession: SessionResult = {
      client_id: testClientId,
      learnerId: "learner-test-1",
      tutorId: "t1",
      topicId: 1,
      pre: 0.33,
      post: 1.0,
      at: sessionTime.toISOString(),
    };
    sessions.push(testSession);

    // Schedule 7-day retention check
    const task = scheduleRetentionCheck({
      client_id: testClientId,
      school_id: "s1",
      learner_id: "learner-test-1",
      topic_id: 1,
      session_completed_at: sessionTime.toISOString(),
      daysDelay: 7,
    });

    expect(task.client_id).toBe(testClientId);
    expect(task.status).toBe("pending");
    // Verify due_at is exactly 7 days after session
    const expectedDueDate = new Date(sessionTime.getTime() + 7 * 24 * 3600 * 1000).toISOString();
    expect(task.due_at).toBe(expectedDueDate);

    // Verify task is not due before 7 days
    const day6 = new Date(sessionTime.getTime() + 6 * 24 * 3600 * 1000);
    const pendingOnDay6 = getPendingRetentionTasks("learner-test-1", day6);
    expect(pendingOnDay6.some((t) => t.client_id === testClientId)).toBe(false);

    // Verify task IS due on or after day 7
    const day7 = new Date(sessionTime.getTime() + 7 * 24 * 3600 * 1000);
    const pendingOnDay7 = getPendingRetentionTasks("learner-test-1", day7);
    expect(pendingOnDay7.some((t) => t.client_id === testClientId)).toBe(true);

    // Record retention score (DoD: retention score recorded)
    const recordResult = recordRetentionScore({
      client_id: testClientId,
      retention_score: 0.85,
      completed_at: new Date(sessionTime.getTime() + 7.5 * 24 * 3600 * 1000).toISOString(),
    });

    expect(recordResult.ok).toBe(true);
    expect(recordResult.retention_score).toBe(0.85);
    expect(testSession.retention_score).toBe(0.85);
    expect(testSession.retention_at).toBeDefined();

    const storedTask = retentionTasksStore.find((t) => t.client_id === testClientId);
    expect(storedTask?.status).toBe("completed");
    expect(storedTask?.retention_score).toBe(0.85);
  });

  // PROOF-4: Reports show immediate gain and retention gain
  it("PROOF-4: generateProofCohortSummary reports both immediate gain and retention gain", () => {
    const summary = generateProofCohortSummary(sessions, topics);
    expect(summary.length).toBe(topics.length);

    const topic1Summary = summary.find((s) => s.topicId === 1);
    expect(topic1Summary).toBeDefined();
    if (!topic1Summary) return;

    expect(topic1Summary.sessions).toBeGreaterThan(0);
    expect(topic1Summary.immediateGain).toBeGreaterThan(0);
    expect(topic1Summary.retentionSessions).toBeGreaterThan(0);
    expect(topic1Summary.avgRetention).toBeGreaterThan(0);
    expect(topic1Summary.retentionGain).toBeDefined();

    // Verify mathematical relation: immediateGain = avgPost - avgPre
    expect(Math.abs(topic1Summary.immediateGain - (topic1Summary.avgPost - topic1Summary.avgPre))).toBeLessThan(0.001);

    // Verify mathematical relation: retentionGain = avgRetention - avgPre
    expect(Math.abs((topic1Summary.retentionGain ?? 0) - ((topic1Summary.avgRetention ?? 0) - topic1Summary.avgPre))).toBeLessThan(0.001);
  });

  // PROOF-5: Separation of comparison group learners for pilot reporting
  it("PROOF-5: comparison group learners are isolated from peer-tutoring cohort metrics", () => {
    const testSessions: SessionResult[] = [
      {
        client_id: "peer-1",
        learnerId: "p1",
        tutorId: "t1",
        topicId: 1,
        pre: 0.3,
        post: 0.9, // +60% peer-tutored gain
        is_comparison_group: false,
        at: new Date().toISOString(),
      },
      {
        client_id: "comp-1",
        learnerId: "c1",
        tutorId: "none",
        topicId: 1,
        pre: 0.3,
        post: 0.4, // +10% standard instruction gain
        is_comparison_group: true,
        at: new Date().toISOString(),
      },
    ];

    const summary = generateProofCohortSummary(testSessions, topics);
    const t1 = summary.find((s) => s.topicId === 1)!;

    // The peer tutoring cohort sessions should ONLY include peer-1 (not comp-1)
    expect(t1.sessions).toBe(1);
    expect(t1.avgPost).toBe(0.9);
    expect(t1.immediateGain).toBeCloseTo(0.6);

    // Comparison group is isolated in comparisonGroup benchmark field
    expect(t1.comparisonGroup).toBeDefined();
    expect(t1.comparisonGroup?.learnerCount).toBe(1);
    expect(t1.comparisonGroup?.avgGain).toBeCloseTo(0.1);
  });
});
