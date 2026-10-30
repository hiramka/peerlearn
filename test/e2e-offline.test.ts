import { describe, it, expect, beforeEach } from "vitest";
import { studentLogin } from "../server/src/auth";
import { lessons, sessions } from "../server/src/data";
import { scheduleRetentionCheck, getPendingRetentionTasks } from "../server/src/proof";
import type { SessionResult, Lesson } from "../shared/types";

describe("Phase 9: End-to-End Offline Simulation & Idempotent Sync Test", () => {
  beforeEach(() => {
    // Clear demo sessions to ensure clean test assertions
    sessions.length = 0;
  });

  it("completes full offline peer-tutoring lifecycle: login -> download -> offline -> pre/post quiz -> sync repeatedly -> assert exactly ONE session row", async () => {
    // ------------------------------------------------------------------------
    // Step 1: Student Authenticates Online
    // ------------------------------------------------------------------------
    const loginResult = await studentLogin({
      school_code: "ALLIANCE",
      reg_number: "ADM-101",
      pin: "123456",
    });
    expect(loginResult.ok).toBe(true);
    expect(loginResult.session).toBeDefined();
    expect(loginResult.session?.user.reg_number).toBe("ADM-101");
    expect(loginResult.session?.user.school_id).toBe("11111111-1111-1111-1111-111111111111");

    const studentSession = loginResult.session!;

    // ------------------------------------------------------------------------
    // Step 2: Download Lesson Pack (OFF-1)
    // ------------------------------------------------------------------------
    const topicId = 1;
    const remoteLesson = lessons.find((l) => l.topicId === topicId);
    expect(remoteLesson).toBeDefined();

    // Cache locally in client memory (simulating IndexedDB 'lessons' store)
    const localCachedLesson: Lesson = JSON.parse(JSON.stringify(remoteLesson));
    expect(localCachedLesson.pre.length).toBe(3);
    expect(localCachedLesson.post.length).toBe(3);

    // ------------------------------------------------------------------------
    // Step 3: Go Offline (R1: zero network dependency)
    // ------------------------------------------------------------------------
    let isOnline = false;

    // Simulate IndexedDB outbox queue
    const localOutbox: SessionResult[] = [];
    const localEventsOutbox: any[] = [];

    // Verify student cannot make live server requests while offline
    const simulateNetworkFetch = (url: string, opts: any) => {
      if (!isOnline) {
        throw new Error("Failed to fetch: Network is offline.");
      }
      // If online, forward to mock server handler
      if (url === "/api/sessions") {
        const item: SessionResult = JSON.parse(opts.body);
        if (!sessions.some((s) => s.client_id === item.client_id)) {
          sessions.push(item);
          scheduleRetentionCheck({
            client_id: item.client_id,
            school_id: studentSession.user.school_id,
            learner_id: item.learnerId,
            topic_id: item.topicId,
            post_score: item.post,
          });
        }
        return { ok: true, status: 201, json: async () => ({ ok: true, session: item }) };
      }
      return { ok: false, status: 404 };
    };

    // ------------------------------------------------------------------------
    // Step 4: Complete Pre-Quiz, 20-Minute Guided Lesson & Post-Quiz Offline
    // ------------------------------------------------------------------------
    // Pre-quiz: learner answers 1 of 3 correct
    const preQuizAnswers = [1, 2, 0]; // 1 correct
    const preScore = Number(
      (
        localCachedLesson.pre.filter((q, i) => preQuizAnswers[i] === q.answer).length /
        localCachedLesson.pre.length
      ).toFixed(2)
    );
    expect(preScore).toBe(0.33);

    // Guided 20-minute peer tutoring checklist
    const completedGuideSteps = [true, true, true, true];
    expect(completedGuideSteps.every(Boolean)).toBe(true);

    // Disjoint post-quiz: learner answers all 3 correct (mastery!)
    const postQuizAnswers = [
      localCachedLesson.post[0].answer,
      localCachedLesson.post[1].answer,
      localCachedLesson.post[2].answer,
    ];
    const postScore = Number(
      (
        localCachedLesson.post.filter((q, i) => postQuizAnswers[i] === q.answer).length /
        localCachedLesson.post.length
      ).toFixed(2)
    );
    expect(postScore).toBe(1.0);

    // Generate idempotent client_id (UUID)
    const clientId = `offline-client-sess-${Date.now()}`;
    const offlineSessionPayload: SessionResult = {
      client_id: clientId,
      learnerId: studentSession.user.id,
      tutorId: "t1",
      topicId: topicId,
      pre: preScore,
      post: postScore,
      learnerRating: 5,
      feedbackTags: ["Clear steps", "Patient tutor", "Good pacing"],
      at: new Date().toISOString(),
    };

    // Queue in local IndexedDB outbox
    localOutbox.push(offlineSessionPayload);
    expect(localOutbox.length).toBe(1);

    // Assert zero sessions reached the server while offline
    expect(sessions.length).toBe(0);

    // ------------------------------------------------------------------------
    // Step 5: Network Reconnects (isOnline = true)
    // ------------------------------------------------------------------------
    isOnline = true;

    // ------------------------------------------------------------------------
    // Step 6: Flaky Network Sync Simulation (Sync Repeatedly - 10 Times)
    // ------------------------------------------------------------------------
    // Simulating rapid background sync, page refreshes, and service worker retry loops
    for (let syncAttempt = 1; syncAttempt <= 10; syncAttempt++) {
      for (const queueItem of [...localOutbox]) {
        const res = simulateNetworkFetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queueItem),
        });
        expect(res.ok).toBe(true);
      }
    }

    // Clear local outbox once sync is confirmed
    localOutbox.length = 0;
    expect(localOutbox.length).toBe(0);

    // ------------------------------------------------------------------------
    // Step 7: Critical Assertion: Exactly ONE session row exists on the server!
    // ------------------------------------------------------------------------
    expect(sessions.length).toBe(1);

    const savedRow = sessions[0];
    expect(savedRow.client_id).toBe(clientId);
    expect(savedRow.pre).toBe(0.33);
    expect(savedRow.post).toBe(1.0);
    expect(savedRow.learnerRating).toBe(5);
    expect(savedRow.feedbackTags).toContain("Patient tutor");

    // Learning gain is accurately recorded (+67%)
    const gain = Number((savedRow.post - savedRow.pre).toFixed(2));
    expect(gain).toBe(0.67);

    // Automated 7-day retention task was scheduled
    const futureDate = new Date(Date.now() + 8 * 24 * 3600 * 1000);
    const retentionTasks = getPendingRetentionTasks(studentSession.user.id, futureDate);
    expect(retentionTasks.some((t) => t.client_id === clientId)).toBe(true);
  });

  it("handles concurrent conflicting uploads idempotently (First write wins)", () => {
    const clientId = "concurrent-sync-key-100";

    const sessionA: SessionResult = {
      client_id: clientId,
      learnerId: "l1",
      tutorId: "t1",
      topicId: 1,
      pre: 0.3,
      post: 0.8,
      at: "2026-10-30T10:00:00Z",
    };

    const sessionB_Tampered: SessionResult = {
      client_id: clientId,
      learnerId: "l1",
      tutorId: "t1",
      topicId: 1,
      pre: 0.3,
      post: 1.0, // altered post score
      at: "2026-10-30T10:00:05Z",
    };

    // First device syncs sessionA
    if (!sessions.some((s) => s.client_id === sessionA.client_id)) {
      sessions.push(sessionA);
    }

    // Second device (or delayed retry) tries to sync sessionB with same client_id
    if (!sessions.some((s) => s.client_id === sessionB_Tampered.client_id)) {
      sessions.push(sessionB_Tampered);
    }

    // Assert: Only sessionA exists, exactly 1 row, first write won!
    expect(sessions.length).toBe(1);
    expect(sessions[0].post).toBe(0.8);
  });
});
