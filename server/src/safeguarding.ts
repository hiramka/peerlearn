// Safeguarding Service (SAFE-1 to SAFE-6)
import type { Report, ReportStatus, AuditLogEntry, GuardianConsent } from "../../shared/types";
import { tutors } from "./data";

export interface TutorApprovalRecord {
  tutor_id: string;
  school_id: string;
  topic_id: number;
  approved: boolean;
  approved_by?: string;
  approved_at: string;
}

export const tutorApprovalsStore: TutorApprovalRecord[] = [
  { tutor_id: "t1", school_id: "s1", topic_id: 1, approved: true, approved_at: new Date().toISOString() },
  { tutor_id: "t2", school_id: "s1", topic_id: 1, approved: true, approved_at: new Date().toISOString() },
  { tutor_id: "t2", school_id: "s1", topic_id: 2, approved: true, approved_at: new Date().toISOString() },
];

export const tutorSuspensionsStore: Record<string, { suspended: boolean; reason?: string; suspended_by?: string; suspended_at?: string }> = {
  t6: { suspended: true, reason: "Conduct review pending", suspended_at: new Date().toISOString() },
};

export const reportsStore: Report[] = [];

export const guardianConsentStore: Record<string, GuardianConsent> = {
  l1: {
    student_id: "l1",
    school_id: "s1",
    consent_given: true,
    guardian_name: "Mrs. Rehema",
    guardian_phone: "+254700112233",
    consented_at: new Date().toISOString(),
  },
};

export const auditLogsStore: AuditLogEntry[] = [];

export function logSafeguardingAudit(school_id: string, actor_id: string, action: string, detail: any) {
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    school_id,
    actor_id,
    action,
    detail,
    created_at: new Date().toISOString(),
  };
  auditLogsStore.push(entry);
  return entry;
}

export const logAudit = logSafeguardingAudit;

// SAFE-1: Approve or Revoke Tutor for a specific topic
export function approveTutorTopic(actorId: string, schoolId: string, tutorId: string, topicId: number, approved: boolean) {
  const existing = tutorApprovalsStore.find((a) => a.tutor_id === tutorId && a.topic_id === topicId);
  if (existing) {
    existing.approved = approved;
    existing.approved_by = actorId;
    existing.approved_at = new Date().toISOString();
  } else {
    tutorApprovalsStore.push({
      tutor_id: tutorId,
      school_id: schoolId,
      topic_id: topicId,
      approved,
      approved_by: actorId,
      approved_at: new Date().toISOString(),
    });
  }

  // Update in-memory tutor object if exists
  const tutor = tutors.find((t) => t.id === tutorId);
  if (tutor) {
    if (!tutor.teacherApproved) tutor.teacherApproved = {};
    tutor.teacherApproved[topicId] = approved;
  }

  logSafeguardingAudit(schoolId, actorId, approved ? "APPROVE_TUTOR_TOPIC" : "REVOKE_TUTOR_TOPIC", {
    tutorId,
    topicId,
  });

  return { ok: true, tutorId, topicId, approved };
}

// SAFE-2: Suspend or Reinstate Tutor
export function setTutorSuspension(actorId: string, schoolId: string, tutorId: string, suspended: boolean, reason?: string) {
  tutorSuspensionsStore[tutorId] = {
    suspended,
    reason,
    suspended_by: actorId,
    suspended_at: new Date().toISOString(),
  };

  const tutor = tutors.find((t) => t.id === tutorId);
  if (tutor) {
    tutor.isSuspended = suspended;
  }

  logSafeguardingAudit(schoolId, actorId, suspended ? "SUSPEND_TUTOR" : "REINSTATE_TUTOR", {
    tutorId,
    reason,
  });

  return { ok: true, tutorId, suspended, reason };
}

// SAFE-4: Submit Problem Report
export function submitReport(input: {
  school_id: string;
  reporter_id: string;
  reporter_name?: string;
  match_id?: string;
  session_id?: string;
  target_id?: string;
  target_name?: string;
  reason: string;
  details?: string;
}): Report {
  const report: Report = {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    school_id: input.school_id,
    reporter_id: input.reporter_id,
    reporter_name: input.reporter_name || "Student",
    match_id: input.match_id,
    session_id: input.session_id,
    target_id: input.target_id,
    target_name: input.target_name,
    reason: input.reason,
    details: input.details,
    status: "open",
    created_at: new Date().toISOString(),
  };

  reportsStore.push(report);

  logSafeguardingAudit(input.school_id, input.reporter_id, "SUBMIT_REPORT", {
    report_id: report.id,
    reason: input.reason,
    target_id: input.target_id,
  });

  return report;
}

// SAFE-4: Get Reports for a School (School Admin / Teacher view)
export function getReportsBySchool(schoolId: string, status?: ReportStatus): Report[] {
  return reportsStore.filter((r) => r.school_id === schoolId && (!status || r.status === status));
}

// SAFE-4: Resolve Report
export function resolveReport(actorId: string, schoolId: string, reportId: string, resolutionNotes?: string) {
  const report = reportsStore.find((r) => r.id === reportId);
  if (!report) return { ok: false, error: "Report not found" };

  report.status = "resolved";

  logSafeguardingAudit(schoolId, actorId, "RESOLVE_REPORT", {
    reportId,
    resolutionNotes,
  });

  return { ok: true, report };
}

// SAFE-5: Guardian Consent Check and Recording
export function recordGuardianConsent(schoolId: string, studentId: string, guardianName?: string, guardianPhone?: string): GuardianConsent {
  const consent: GuardianConsent = {
    student_id: studentId,
    school_id: schoolId,
    consent_given: true,
    guardian_name: guardianName,
    guardian_phone: guardianPhone,
    consented_at: new Date().toISOString(),
  };
  guardianConsentStore[studentId] = consent;

  logSafeguardingAudit(schoolId, studentId, "RECORD_GUARDIAN_CONSENT", {
    studentId,
    guardianName,
  });

  return consent;
}

export function checkGuardianConsent(studentId: string): boolean {
  return !!guardianConsentStore[studentId]?.consent_given;
}
