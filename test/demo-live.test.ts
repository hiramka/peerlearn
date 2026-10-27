import { describe, it, expect } from "vitest";
import { resetDemoData, createGuestDemoToken, validateGuestDemoToken } from "../server/src/demo";
import {
  broadcastSessionEvent,
  getSessionEvents,
  batchUploadEvents,
  sessionEventsStore,
} from "../server/src/live";
import { profilesStore } from "../server/src/auth";
import { sessions, tutors } from "../server/src/data";
import type { SessionEvent } from "../shared/types";

describe("Phase 5: Sandbox (DEMO) and Live Real-time Events (LIVE)", () => {
  // DEMO-1 & DEMO-3: Reset demo deletes previous demo data and re-seeds cleanly in seconds
  it("DEMO-1 & DEMO-3 (DoD): resetDemoData wipes and cleanly re-seeds demo class and tutors in milliseconds", () => {
    const schoolId = "demo-school-test";
    const startTime = performance.now();

    const result = resetDemoData(schoolId);
    const duration = performance.now() - startTime;

    expect(result.ok).toBe(true);
    expect(duration).toBeLessThan(1000); // under 1 second / fast
    expect(result.seeded_students).toBeGreaterThanOrEqual(2);
    expect(result.seeded_tutors).toBeGreaterThanOrEqual(2);

    // Verify all seeded demo students have is_demo = true (DEMO-1, R5)
    const demoStudents = profilesStore.filter((p) => p.school_id === schoolId && p.is_demo);
    expect(demoStudents.length).toBeGreaterThanOrEqual(2);
    for (const s of demoStudents) {
      expect(s.is_demo).toBe(true);
      expect(s.reg_number).toContain("DEMO-");
    }

    // Verify demo tutors exist
    const demoTutors = tutors.filter((t) => t.schoolId === schoolId);
    expect(demoTutors.length).toBeGreaterThanOrEqual(2);
    for (const t of demoTutors) {
      expect(t.verifiedScore[1]).toBeGreaterThanOrEqual(0.8);
      expect(t.teacherApproved[1]).toBe(true);
    }
  });

  // DEMO-4: Guest demo link generation and expiration check
  it("DEMO-4: guest demo link expires after duration and allows guest session", () => {
    // 1. Create a 4-hour valid guest token
    const token = createGuestDemoToken("s1", "learner", 4);
    expect(token.token).toBeDefined();
    expect(new Date(token.expires_at).getTime()).toBeGreaterThan(Date.now());

    // 2. Validate token is active
    const validation = validateGuestDemoToken(token.token);
    expect(validation.valid).toBe(true);
    expect(validation.token?.role).toBe("learner");

    // 3. Create an expired token (negative duration)
    const expired = createGuestDemoToken("s1", "tutor", -1);
    const expiredCheck = validateGuestDemoToken(expired.token);
    expect(expiredCheck.valid).toBe(false);
    expect(expiredCheck.error).toContain("expired");
  });

  // LIVE-1: Session event emission lifecycle
  it("LIVE-1: sessions write events started -> pre_quiz_done -> step_checked -> post_quiz_done -> ended", () => {
    const schoolId = "s1";
    const sessionId = "test-live-sess-1";

    const lifecycleTypes: SessionEvent["type"][] = [
      "started",
      "pre_quiz_done",
      "step_checked",
      "post_quiz_done",
      "ended",
    ];

    for (const evType of lifecycleTypes) {
      const res = broadcastSessionEvent({
        school_id: schoolId,
        session_id: sessionId,
        type: evType,
        payload: { testKey: evType, score: evType.includes("quiz") ? 0.8 : undefined },
      });
      expect(res.ok).toBe(true);
      expect(res.event.type).toBe(evType);
    }

    const recordedEvents = getSessionEvents(schoolId, sessionId);
    expect(recordedEvents.length).toBe(5);
    expect(recordedEvents.map((e) => e.type)).toEqual(lifecycleTypes);
  });

  // LIVE-1: Rejects invalid event types
  it("LIVE-1: rejects unregistered event types", () => {
    expect(() =>
      broadcastSessionEvent({
        school_id: "s1",
        session_id: "invalid-test",
        type: "unknown_event_type" as any,
        payload: {},
      })
    ).toThrow(/Invalid event type/);
  });

  // LIVE-3 (DoD): Offline devices queue events; they appear on reconnect batch upload
  it("LIVE-3 (DoD): batchUploadEvents syncs offline queued events upon reconnect", () => {
    const schoolId = "s1";
    const sessionId = "offline-reconnect-sess";

    const offlineQueuedEvents: SessionEvent[] = [
      {
        id: "offline-evt-1",
        school_id: schoolId,
        session_id: sessionId,
        type: "started",
        payload: { note: "started offline on device" },
      },
      {
        id: "offline-evt-2",
        school_id: schoolId,
        session_id: sessionId,
        type: "pre_quiz_done",
        payload: { score: 0.67 },
      },
      {
        id: "offline-evt-3",
        school_id: schoolId,
        session_id: sessionId,
        type: "ended",
        payload: { rating: 5 },
      },
    ];

    // Replay on reconnect
    const result = batchUploadEvents(offlineQueuedEvents);
    expect(result.ok).toBe(true);
    expect(result.processed).toBe(3);

    const synced = getSessionEvents(schoolId, sessionId);
    expect(synced.length).toBe(3);
    expect(synced.map((e) => e.id)).toContain("offline-evt-1");
    expect(synced.map((e) => e.id)).toContain("offline-evt-3");
  });
});
