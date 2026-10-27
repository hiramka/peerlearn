// Demo Service: Sandbox, Sample Mode & Guest Links (DEMO-1 to DEMO-4)
import type { DemoResetResult, GuestDemoToken, StudentProfile, Tutor, SessionResult } from "../../shared/types";
import { profilesStore } from "./auth";
import { tutors, sessions } from "./data";
import { sessionEventsStore } from "./live";

// Guest demo tokens store (DEMO-4)
export const guestTokensStore: Map<string, GuestDemoToken> = new Map();

/**
 * DEMO-1 & DEMO-3: Reset demo data for a school.
 * Cleans up previous demo records and re-seeds baseline fake students, tutors, and sessions.
 * Completes in milliseconds.
 */
export function resetDemoData(schoolId: string = "s1"): DemoResetResult {
  const timestamp = new Date().toISOString();

  // 1. Remove previous demo profiles for this school
  const nonDemoProfiles = profilesStore.filter((p) => p.school_id !== schoolId || !p.is_demo);
  profilesStore.length = 0;
  profilesStore.push(...nonDemoProfiles);

  // 2. Remove previous demo sessions
  const nonDemoSessions = sessions.filter((s) => !s.is_demo);
  sessions.length = 0;
  sessions.push(...nonDemoSessions);

  // 3. Remove previous demo events from live stream
  const nonDemoEvents = sessionEventsStore.filter((e) => e.school_id !== schoolId || !e.is_demo);
  sessionEventsStore.length = 0;
  sessionEventsStore.push(...nonDemoEvents);

  // 4. Seed demo students (DEMO-1)
  const demoStudents: StudentProfile[] = [
    {
      id: `demo-learner-1-${Date.now()}`,
      full_name: "Amani (Demo Learner)",
      reg_number: "DEMO-001",
      school_id: schoolId,
      grade: 2,
      class_stream: "East",
      language: "en",
      is_demo: true,
      pin_hash: "123456", // default demo pin
      guardian_consent_at: timestamp,
      created_at: timestamp,
    },
    {
      id: `demo-learner-2-${Date.now()}`,
      full_name: "Zawadi (Demo Learner)",
      reg_number: "DEMO-002",
      school_id: schoolId,
      grade: 2,
      class_stream: "West",
      language: "en",
      is_demo: true,
      pin_hash: "123456",
      guardian_consent_at: timestamp,
      created_at: timestamp,
    },
  ];
  profilesStore.push(...demoStudents);

  // 5. Seed / ensure demo tutors (DEMO-1)
  const demoTutors: Tutor[] = [
    {
      id: "demo-tutor-wanjiru",
      name: "Wanjiru (Demo Tutor)",
      grade: 3,
      schoolId,
      language: "en",
      availability: { mon: ["16:00-17:00"], wed: ["16:00-17:00"] },
      verifiedScore: { 1: 0.95, 2: 0.9 },
      teacherApproved: { 1: true, 2: true },
      activeMatches: 1,
      avgGain: 0.32,
    },
    {
      id: "demo-tutor-brian",
      name: "Brian (Demo Tutor)",
      grade: 4,
      schoolId,
      language: "en",
      availability: { mon: ["16:00-17:00"] },
      verifiedScore: { 1: 0.88, 2: 0.85 },
      teacherApproved: { 1: true, 2: true },
      activeMatches: 2,
      avgGain: 0.28,
    },
  ];

  for (const dt of demoTutors) {
    const existingIdx = tutors.findIndex((t) => t.id === dt.id);
    if (existingIdx >= 0) {
      tutors[existingIdx] = dt;
    } else {
      tutors.push(dt);
    }
  }

  // 6. Seed demo baseline session (is_demo = true)
  const demoSession: SessionResult = {
    client_id: `demo-session-${Date.now()}`,
    learnerId: demoStudents[0].id,
    tutorId: "demo-tutor-wanjiru",
    topicId: 1,
    pre: 0.33,
    post: 1.0,
    retention_score: 0.85,
    is_demo: true,
    at: timestamp,
  };
  sessions.push(demoSession);

  return {
    ok: true,
    message: `Demo environment reset successfully for school ${schoolId}.`,
    timestamp,
    seeded_students: demoStudents.length,
    seeded_tutors: demoTutors.length,
    seeded_sessions: 1,
  };
}

/**
 * DEMO-4: Create a temporary guest demo access token that expires in N hours (default: 4 hours).
 * No registration or student setup required.
 */
export function createGuestDemoToken(
  schoolId: string = "s1",
  role: "learner" | "tutor" | "teacher" = "learner",
  durationHours: number = 4
): GuestDemoToken {
  const token = `guest-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
  const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();

  const guestToken: GuestDemoToken = {
    token,
    school_id: schoolId,
    role,
    expires_at: expiresAt,
  };

  guestTokensStore.set(token, guestToken);
  return guestToken;
}

/**
 * DEMO-4: Validate if a guest demo link is valid and unexpired.
 */
export function validateGuestDemoToken(token: string): { valid: boolean; token?: GuestDemoToken; error?: string } {
  const item = guestTokensStore.get(token);
  if (!item) {
    return { valid: false, error: "Guest demo token not found or invalid." };
  }

  if (new Date(item.expires_at).getTime() < Date.now()) {
    guestTokensStore.delete(token);
    return { valid: false, error: "Guest demo token has expired." };
  }

  return { valid: true, token: item };
}
