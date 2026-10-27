import { describe, it, expect, beforeEach } from "vitest";
import { rankTutors, evaluateMatch } from "../server/src/matching";
import {
  approveTutorTopic,
  setTutorSuspension,
  submitReport,
  getReportsBySchool,
  resolveReport,
  recordGuardianConsent,
  checkGuardianConsent,
  reportsStore,
  auditLogsStore,
  guardianConsentStore,
} from "../server/src/safeguarding";
import type { Person, Tutor } from "../shared/types";

describe("SAFE: Safeguarding and Child Protection Suite (Phase 3 DoD)", () => {
  const learner: Person = {
    id: "l_mani",
    name: "Amani Student",
    grade: 2,
    schoolId: "school_alliance",
    language: "en",
    availability: { mon: ["16:00-17:00"], wed: ["16:00-17:00"] },
  };

  const highScoringTutor: Tutor = {
    id: "t_high",
    name: "Wanjiru Tutor",
    grade: 3,
    schoolId: "school_alliance",
    language: "en",
    availability: { mon: ["16:00-17:00"], wed: ["16:00-17:00"] },
    verifiedScore: { 1: 0.95 },
    teacherApproved: {}, // Not yet approved by teacher
    activeMatches: 0,
    avgGain: 0.25,
  };

  beforeEach(() => {
    reportsStore.length = 0;
    auditLogsStore.length = 0;
  });

  it("SAFE-1 (DoD): Unapproved tutor with 95% mastery NEVER appears in matches", () => {
    // Verified 95% score, but teacher has not approved
    const unapproved: Tutor = {
      ...highScoringTutor,
      teacherApproved: { 1: false },
    };

    const evaluation = evaluateMatch(learner, unapproved, 1);
    expect(evaluation.score).toBe(0);
    expect(evaluation.breakdown).toHaveLength(0);

    const matches = rankTutors(learner, [unapproved], 1);
    expect(matches).toHaveLength(0);
  });

  it("SAFE-1: Once teacher approves tutor for topic, tutor appears in matches", () => {
    const unapproved: Tutor = {
      ...highScoringTutor,
      teacherApproved: { 1: false },
    };

    // Initially cannot match
    expect(rankTutors(learner, [unapproved], 1)).toHaveLength(0);

    // Teacher approves tutor for topic 1
    const res = approveTutorTopic("teacher_mrs_kamau", "school_alliance", unapproved.id, 1, true);
    expect(res.ok).toBe(true);
    expect(res.approved).toBe(true);

    // Now tutor matches
    const approvedTutor: Tutor = {
      ...unapproved,
      teacherApproved: { 1: true },
    };
    const matches = rankTutors(learner, [approvedTutor], 1);
    expect(matches).toHaveLength(1);
    expect(matches[0].tutor.id).toBe(unapproved.id);
    expect(matches[0].score).toBeGreaterThan(0);
  });

  it("SAFE-2: Teachers can suspend a tutor at any time, removing them from all matches immediately", () => {
    const activeTutor: Tutor = {
      ...highScoringTutor,
      teacherApproved: { 1: true },
      isSuspended: false,
    };

    // Initially eligible
    expect(rankTutors(learner, [activeTutor], 1)).toHaveLength(1);

    // Teacher suspends tutor
    setTutorSuspension("teacher_mrs_kamau", "school_alliance", activeTutor.id, true, "Investigation into peer conduct");

    const suspendedTutor: Tutor = {
      ...activeTutor,
      isSuspended: true,
    };

    // Suspended tutor must NEVER match
    const evaluation = evaluateMatch(learner, suspendedTutor, 1);
    expect(evaluation.score).toBe(0);
    expect(rankTutors(learner, [suspendedTutor], 1)).toHaveLength(0);

    // Reinstating tutor allows matching again
    setTutorSuspension("teacher_mrs_kamau", "school_alliance", activeTutor.id, false);
    suspendedTutor.isSuspended = false;
    expect(rankTutors(learner, [suspendedTutor], 1)).toHaveLength(1);
  });

  it("SAFE-4 (DoD): Report submitted by student reaches the school admin queue with status 'open'", () => {
    const report = submitReport({
      school_id: "school_alliance",
      reporter_id: learner.id,
      reporter_name: learner.name,
      target_id: "t_high",
      target_name: "Wanjiru Tutor",
      reason: "Inappropriate language during peer study session",
      details: "Tutor used offensive terminology during step 3 of the algebra guide.",
    });

    expect(report.id).toBeDefined();
    expect(report.status).toBe("open");
    expect(report.reason).toContain("Inappropriate language");

    // School admin retrieves reports for their school
    const adminReports = getReportsBySchool("school_alliance");
    expect(adminReports).toHaveLength(1);
    expect(adminReports[0].id).toBe(report.id);
    expect(adminReports[0].reporter_id).toBe(learner.id);

    // Different school admin sees 0 reports (tenant isolation)
    const otherSchoolReports = getReportsBySchool("school_lenana");
    expect(otherSchoolReports).toHaveLength(0);
  });

  it("SAFE-4: School admin or teacher resolves a problem report with resolution audit", () => {
    const report = submitReport({
      school_id: "school_alliance",
      reporter_id: learner.id,
      reason: "Scheduled time confusion",
    });

    expect(report.status).toBe("open");

    const res = resolveReport("admin_user_1", "school_alliance", report.id, "Spoke with both students, rescheduled to library period.");
    expect(res.ok).toBe(true);
    expect(res.report?.status).toBe("resolved");

    const openReports = getReportsBySchool("school_alliance", "open");
    expect(openReports).toHaveLength(0);

    const resolvedReports = getReportsBySchool("school_alliance", "resolved");
    expect(resolvedReports).toHaveLength(1);
  });

  it("SAFE-5: Guardian consent is verified before a learner participates in sessions", () => {
    expect(checkGuardianConsent("unconsented_student_99")).toBe(false);

    recordGuardianConsent("school_alliance", "unconsented_student_99", "John Doe (Parent)", "+254712345678");

    expect(checkGuardianConsent("unconsented_student_99")).toBe(true);
    expect(guardianConsentStore["unconsented_student_99"].guardian_name).toBe("John Doe (Parent)");
  });

  it("SAFE-6: Audit log captures approvals, suspensions, reports, and resolutions", () => {
    approveTutorTopic("teacher_1", "school_alliance", "t1", 1, true);
    setTutorSuspension("teacher_1", "school_alliance", "t1", true, "Testing conduct");
    const rep = submitReport({ school_id: "school_alliance", reporter_id: "l1", reason: "Test reason" });
    resolveReport("teacher_1", "school_alliance", rep.id, "Test resolution");

    expect(auditLogsStore.length).toBeGreaterThanOrEqual(4);

    const actions = auditLogsStore.map((a) => a.action);
    expect(actions).toContain("APPROVE_TUTOR_TOPIC");
    expect(actions).toContain("SUSPEND_TUTOR");
    expect(actions).toContain("SUBMIT_REPORT");
    expect(actions).toContain("RESOLVE_REPORT");
  });
});
