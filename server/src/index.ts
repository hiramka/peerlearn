import express from "express";
import cors from "cors";
import { topics, learners, tutors, lessons, sessions } from "./data";
import { rankTutors } from "./matching";
import {
  schoolsStore,
  profilesStore,
  studentFirstSetup,
  studentLogin,
  resetStudentPin,
  importStudentsCSV,
  submitSchoolApplication,
  approveSchoolApplication,
  applicationsStore,
  exportStudentData,
  eraseStudentData,
  updateSchoolPilotTier,
  getSchoolPilotTier,
} from "./auth";
import {
  approveTutorTopic,
  setTutorSuspension,
  submitReport,
  getReportsBySchool,
  resolveReport,
  recordGuardianConsent,
  checkGuardianConsent,
  generatePaperConsentSlip,
  auditLogsStore,
} from "./safeguarding";
import {
  scheduleRetentionCheck,
  recordRetentionScore,
  getPendingRetentionTasks,
  generateProofCohortSummary,
} from "./proof";
import { resetDemoData, createGuestDemoToken, validateGuestDemoToken } from "./demo";
import { broadcastSessionEvent, registerSSEClient, batchUploadEvents, getSessionEvents } from "./live";
import { createLesson, updateLesson, publishLesson, getCurriculum } from "./content";
import {
  getTeacherTopicHeatmap,
  getNoImprovementFlags,
  getPlatformSchoolHealth,
  generatePlatformImpactReport,
  generateDonorAuditVerificationReport,
} from "./dashboards";
import {
  getTrainingModules,
  getTutorTrainingProgress,
  completeTrainingModule,
} from "./training";
import {
  getPrerequisiteGraph,
  getAdaptiveRecommendations,
} from "./adaptive";
import {
  getGroupMatches,
  createGroupMatch,
  recordGroupSessionResult,
  getGroupSessions,
} from "./groups";
import {
  processUSSDRequest,
  sendSMS,
  getSMSLogs,
} from "./telecom";
import {
  generateQRPayload,
  parseAndIngestQRPayload,
} from "./qr";
import type { SessionResult, SessionEvent } from "../../shared/types";

const app = express();
app.use(cors());
app.use(express.json());

// Curriculum endpoints
app.get("/api/topics", (_req, res) => res.json(topics));

// Bulk download: fetch all lessons in a single call for offline pack caching
app.get("/api/lessons", (_req, res) => res.json(lessons));

app.get("/api/lessons/:topicId", (req, res) => {
  const lesson = lessons.find((l) => l.topicId === Number(req.params.topicId));
  return lesson ? res.json(lesson) : res.status(404).json({ error: "Lesson not found" });
});

// Top tutors for a learner + topic with explainable matching
app.get("/api/matches", (req, res) => {
  const learner = learners.find((l) => l.id === req.query.learnerId);
  const topicId = Number(req.query.topic);
  if (!learner || !topicId) return res.status(400).json({ error: "learnerId and topic are required" });
  res.json(rankTutors(learner, tutors, topicId));
});

// Tutor Qualification / Skill Verification
app.post("/api/tutors/verify", (req, res) => {
  const { studentId, studentName, grade, schoolId, language, topicId, score } = req.body;
  if (!studentId || !topicId || typeof score !== "number") {
    return res.status(400).json({ error: "studentId, topicId, and score are required" });
  }

  const verified = score >= 0.8;
  let tutor = tutors.find((t) => t.id === studentId);

  if (verified) {
    if (!tutor) {
      tutor = {
        id: studentId,
        name: studentName || "Verified Peer Tutor",
        grade: Number(grade) || 3,
        schoolId: schoolId || "s1",
        language: language || "en",
        availability: { mon: ["16:00-17:00"], wed: ["16:00-17:00"] },
        verifiedScore: { [topicId]: score },
        activeMatches: 0,
        avgGain: 0.25,
      };
      tutors.push(tutor);
    } else {
      tutor.verifiedScore[topicId] = score;
    }
  }

  return res.json({
    ok: true,
    verified,
    score,
    threshold: 0.8,
    message: verified
      ? "Congratulations! You have verified mastery and are now an active peer tutor."
      : "Score below 80% threshold. Review the material and re-take the verification check.",
  });
});

// Idempotent upload: the same client_id twice never creates a duplicate.
app.post("/api/sessions", (req, res) => {
  const s = req.body as SessionResult;
  if (!s?.client_id || typeof s.pre !== "number" || typeof s.post !== "number")
    return res.status(400).json({ error: "Invalid session" });
  if (!sessions.some((x) => x.client_id === s.client_id)) {
    sessions.push(s);

    // PROOF-3: Automatically schedule a 7-day retention check
    scheduleRetentionCheck({
      client_id: s.client_id,
      school_id: "s1",
      learner_id: s.learnerId,
      topic_id: s.topicId,
      session_completed_at: s.at,
    });

    const t = tutors.find((t) => t.id === s.tutorId);
    if (t) {
      const mine = sessions.filter((x) => x.tutorId === t.id);
      t.avgGain = mine.reduce((a, x) => a + (x.post - x.pre), 0) / mine.length;
    }
  }
  res.status(201).json({ ok: true });
});

// PROOF-4 & PROOF-5: Evidence & Proof summary showing immediate gain, 7-day retention gain, and comparison group
app.get("/api/teacher/summary", (_req, res) => {
  res.json(generateProofCohortSummary(sessions, topics));
});

// PROOF-3: Retention Checks
app.get("/api/retention/pending/:learnerId", (req, res) => {
  const pending = getPendingRetentionTasks(req.params.learnerId);
  res.json(pending);
});

app.post("/api/retention/submit", (req, res) => {
  const { client_id, retention_score, completed_at } = req.body;
  if (!client_id || typeof retention_score !== "number") {
    return res.status(400).json({ error: "client_id and numeric retention_score are required." });
  }
  const result = recordRetentionScore({ client_id, retention_score, completed_at });
  res.json(result);
});

// PROOF-1: Get questions filtered by topic, sub-skill, difficulty, language
app.get("/api/questions", (req, res) => {
  const topicId = req.query.topicId ? Number(req.query.topicId) : undefined;
  const subSkill = req.query.subSkill as string;
  const difficulty = req.query.difficulty ? Number(req.query.difficulty) : undefined;
  const language = (req.query.language as string) || "en";

  const allQuestions: any[] = [];
  lessons.forEach((l) => {
    if (!topicId || l.topicId === topicId) {
      l.pre.forEach((q) => allQuestions.push({ ...q, topicId: l.topicId, type: "pre" }));
      l.post.forEach((q) => allQuestions.push({ ...q, topicId: l.topicId, type: "post" }));
      l.retention?.forEach((q) => allQuestions.push({ ...q, topicId: l.topicId, type: "retention" }));
    }
  });

  const filtered = allQuestions.filter((q) => {
    if (subSkill && q.sub_skill !== subSkill) return false;
    if (difficulty && q.difficulty !== difficulty) return false;
    if (language && q.language !== language) return false;
    return true;
  });

  res.json(filtered);
});

// ============================================================================
// Phase 2: AUTH, ONB, and CLS Endpoints
// ============================================================================

// AUTH-3: Student first-time setup (school code + reg number + setup code -> sets 6-digit PIN)
app.post("/api/auth/student-setup", (req, res) => {
  const result = studentFirstSetup(req.body);
  res.status(result.ok ? 200 : 400).json(result);
});

// AUTH-4 & AUTH-5: Student login with 5-attempt/15-minute lockout
app.post("/api/auth/student-login", (req, res) => {
  const result = studentLogin(req.body);
  const status = result.ok ? 200 : result.locked ? 403 : 401;
  res.status(status).json(result);
});

// AUTH-6: Teacher PIN Reset
app.post("/api/auth/reset-pin", (req, res) => {
  const { teacherId, schoolId, regNumber } = req.body;
  if (!schoolId || !regNumber) {
    return res.status(400).json({ ok: false, error: "schoolId and regNumber are required." });
  }
  const result = resetStudentPin(teacherId || "teacher1", schoolId, regNumber);
  res.status(result.ok ? 200 : 400).json(result);
});

// CLS-1 & CLS-3: Student CSV import and roster
app.post("/api/students/import-csv", (req, res) => {
  const { schoolId, rows } = req.body;
  if (!schoolId || !Array.isArray(rows)) {
    return res.status(400).json({ error: "schoolId and rows array are required." });
  }
  res.json(importStudentsCSV(schoolId, rows));
});

app.get("/api/students", (req, res) => {
  const schoolId = req.query.schoolId as string;
  const filtered = profilesStore.filter((p) => !schoolId || p.school_id === schoolId);
  res.json(filtered);
});

// Kenya DPA 2019 (Section 9): Right to Data Portability & Right to Erasure
app.get("/api/students/:id/export", (req, res) => {
  const result = exportStudentData(req.params.id);
  res.status(result.ok ? 200 : 404).json(result);
});

app.post("/api/students/:id/erase", (req, res) => {
  const { actorId } = req.body;
  const result = eraseStudentData(req.params.id, actorId || "school_admin");
  res.status(result.ok ? 200 : 404).json(result);
});

// ONB-1 to ONB-4: School onboarding applications and tenant management
app.get("/api/schools", (_req, res) => res.json(schoolsStore));

app.post("/api/schools/apply", (req, res) => {
  res.json(submitSchoolApplication(req.body));
});

app.get("/api/schools/applications", (_req, res) => res.json(applicationsStore));

app.post("/api/schools/approve", (req, res) => {
  const { applicationId } = req.body;
  if (!applicationId) return res.status(400).json({ error: "applicationId is required." });
  res.json(approveSchoolApplication(applicationId));
});

// ============================================================================
// Phase 3: Safeguarding Endpoints (SAFE-1 to SAFE-6)
// ============================================================================

// Tutors list for Teacher Safeguarding & Approval view (SAFE-1, SAFE-2, SAFE-3)
app.get("/api/tutors", (req, res) => {
  const schoolId = (req.query.schoolId as string) || "s1";
  // Filter by school, exclude private contacts (SAFE-3, R4)
  const schoolTutors = tutors
    .filter((t) => !schoolId || t.schoolId === schoolId)
    .map((t) => ({
      id: t.id,
      name: t.name,
      grade: t.grade,
      schoolId: t.schoolId,
      language: t.language,
      verifiedScore: t.verifiedScore,
      teacherApproved: t.teacherApproved || {},
      isSuspended: !!t.isSuspended,
      activeMatches: t.activeMatches,
      avgGain: t.avgGain,
    }));
  res.json(schoolTutors);
});

// SAFE-1: Approve or Revoke Tutor for a specific topic
app.post("/api/tutors/approve", (req, res) => {
  const { actorId, schoolId, tutorId, topicId, approved } = req.body;
  if (!schoolId || !tutorId || topicId === undefined) {
    return res.status(400).json({ error: "schoolId, tutorId, and topicId are required." });
  }
  const result = approveTutorTopic(actorId || "teacher1", schoolId, tutorId, Number(topicId), approved !== false);
  res.json(result);
});

// SAFE-2: Suspend or Reinstate Tutor
app.post("/api/tutors/suspend", (req, res) => {
  const { actorId, schoolId, tutorId, suspended, reason } = req.body;
  if (!schoolId || !tutorId) {
    return res.status(400).json({ error: "schoolId and tutorId are required." });
  }
  const result = setTutorSuspension(actorId || "teacher1", schoolId, tutorId, suspended !== false, reason);
  res.json(result);
});

// SAFE-4: Submit Problem Report
app.post("/api/reports", (req, res) => {
  const { school_id, reporter_id, reporter_name, match_id, session_id, target_id, target_name, reason, details } = req.body;
  if (!school_id || !reporter_id || !reason) {
    return res.status(400).json({ error: "school_id, reporter_id, and reason are required." });
  }
  const report = submitReport({
    school_id,
    reporter_id,
    reporter_name,
    match_id,
    session_id,
    target_id,
    target_name,
    reason,
    details,
  });
  res.status(201).json({ ok: true, report });
});

// SAFE-4: Get Reports for a School (School Admin / Teacher view)
app.get("/api/reports", (req, res) => {
  const schoolId = (req.query.schoolId as string) || "s1";
  const status = req.query.status as any;
  res.json(getReportsBySchool(schoolId, status));
});

// SAFE-4: Resolve Report
app.post("/api/reports/resolve", (req, res) => {
  const { actorId, schoolId, reportId, resolutionNotes } = req.body;
  if (!reportId) return res.status(400).json({ error: "reportId is required." });
  const result = resolveReport(actorId || "teacher1", schoolId || "s1", reportId, resolutionNotes);
  res.status(result.ok ? 200 : 400).json(result);
});

// SAFE-5: Record & Check Guardian Consent (Dual Track: In-App & Paper Slip)
app.post("/api/guardian-consent", (req, res) => {
  const {
    schoolId,
    studentId,
    guardianName,
    guardianPhone,
    guardianNationalId,
    consentType,
    slipSerialNumber,
    verifiedBy,
  } = req.body;
  if (!schoolId || !studentId) {
    return res.status(400).json({ error: "schoolId and studentId are required." });
  }
  const consent = recordGuardianConsent(schoolId, studentId, {
    guardianName,
    guardianPhone,
    guardianNationalId,
    consentType,
    slipSerialNumber,
    verifiedBy,
  });
  res.json({ ok: true, consent });
});

app.get("/api/guardian-consent/slip/:studentId", (req, res) => {
  const student = profilesStore.find((s) => s.id === req.params.studentId || s.reg_number === req.params.studentId);
  if (!student) {
    return res.status(404).json({ error: "Student not found." });
  }
  const school = schoolsStore.find((s) => s.id === student.school_id);
  const slip = generatePaperConsentSlip({
    id: student.id,
    full_name: student.full_name,
    reg_number: student.reg_number,
    grade: student.grade,
    school_name: school ? school.name : "Secondary School",
    school_id: student.school_id,
  });
  res.json(slip);
});

app.get("/api/guardian-consent/:studentId", (req, res) => {
  const consented = checkGuardianConsent(req.params.studentId);
  res.json({ studentId: req.params.studentId, consent_given: consented });
});

// School Pilot Tier & Pricing Management (SPEC_V2 Section 10)
app.get("/api/platform/schools/:id/tier", (req, res) => {
  const result = getSchoolPilotTier(req.params.id);
  res.status(result.ok ? 200 : 404).json(result);
});

app.patch("/api/platform/schools/:id/tier", (req, res) => {
  const { tier, sponsorName, termFeeKes, termExpiresAt, actorId } = req.body;
  if (!tier) return res.status(400).json({ error: "tier is required." });
  const result = updateSchoolPilotTier(req.params.id, tier, {
    sponsorName,
    termFeeKes,
    termExpiresAt,
    actorId,
  });
  res.status(result.ok ? 200 : 400).json(result);
});

// Curriculum overview endpoint
app.get("/api/curriculum", (_req, res) => {
  res.json({
    frameworks: [
      { id: "8-4-4", name: "8-4-4 Secondary System (Forms 1–4 KCSE)" },
      { id: "CBC", name: "Competency-Based Curriculum (CBC Grades 7–9 Junior Secondary)" },
    ],
    topics,
  });
});

// Phase 13: Latency & Network Diagnostics ping endpoint
app.get("/api/ping", (_req, res) => {
  res.json({
    ok: true,
    timestamp: Date.now(),
    service: "peerlearn-api",
    status: "healthy",
  });
});

// Phase 13: Donor & Board of Management Pilot Impact Verification Report (R5)
app.get("/api/donor-audit-report", (req, res) => {
  const schoolId = (req.query.schoolId as string) || "11111111-1111-1111-1111-111111111111";
  const report = generateDonorAuditVerificationReport(schoolId);
  res.json(report);
});

// SAFE-6: Audit Log
app.get("/api/audit-log", (req, res) => {
  const schoolId = req.query.schoolId as string;
  const filtered = auditLogsStore.filter((a) => !schoolId || a.school_id === schoolId);
  res.json(filtered);
});

// ============================================================================
// Phase 5: Sandbox and Live Endpoints (DEMO-1..4, LIVE-1..3)
// ============================================================================

// DEMO-1 & DEMO-3: Reset and reseed demo data in milliseconds
app.post("/api/demo/reset", (req, res) => {
  const schoolId = (req.body?.schoolId as string) || "s1";
  const result = resetDemoData(schoolId);
  res.json(result);
});

// DEMO-4: Guest demo link generation and verification
app.post("/api/demo/guest-session", (req, res) => {
  const { schoolId, role, durationHours } = req.body || {};
  const token = createGuestDemoToken(schoolId || "s1", role || "learner", durationHours || 4);
  res.json({ ok: true, guest: token });
});

app.get("/api/demo/guest-session/:token", (req, res) => {
  const result = validateGuestDemoToken(req.params.token);
  res.status(result.valid ? 200 : 400).json(result);
});

// LIVE-1: Broadcast live session events
app.post("/api/events", (req, res) => {
  try {
    const event = req.body as SessionEvent;
    if (!event?.school_id || !event?.type) {
      return res.status(400).json({ error: "school_id and type are required." });
    }
    const result = broadcastSessionEvent(event);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// LIVE-2: SSE Stream for real-time events without reload
app.get("/api/events/stream", (req, res) => {
  const schoolId = (req.query.schoolId as string) || "s1";
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  registerSSEClient(schoolId, res);
});

// LIVE-3: Batch upload offline events
app.post("/api/events/batch", (req, res) => {
  const { events } = req.body;
  if (!Array.isArray(events)) {
    return res.status(400).json({ error: "events array required." });
  }
  const result = batchUploadEvents(events);
  res.json(result);
});

// LIVE-1 & LIVE-2: Get recent events log
app.get("/api/events", (req, res) => {
  const schoolId = (req.query.schoolId as string) || "s1";
  const sessionId = req.query.sessionId as string;
  res.json(getSessionEvents(schoolId, sessionId));
});

// ============================================================================
// Phase 6: Content Authoring (CONT-1..3) & Dashboards (DASH-1..2)
// ============================================================================

// CONT-1 & CONT-3: Get curriculum (published for students, drafts optional for teachers)
app.get("/api/content/lessons", (req, res) => {
  const schoolId = req.query.schoolId as string;
  const includeDrafts = req.query.includeDrafts === "true";
  res.json(getCurriculum(schoolId, includeDrafts));
});

// CONT-1: Create new lesson draft
app.post("/api/content/lessons", (req, res) => {
  try {
    const lesson = createLesson(req.body);
    res.status(201).json({ ok: true, lesson });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// CONT-1: Update lesson draft
app.put("/api/content/lessons/:topicId", (req, res) => {
  try {
    const lesson = updateLesson(Number(req.params.topicId), req.body);
    res.json({ ok: true, lesson });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// CONT-2 (DoD): Publish lesson (bumps version and makes downloadable to students)
app.post("/api/content/lessons/:topicId/publish", (req, res) => {
  try {
    const lesson = publishLesson(Number(req.params.topicId));
    res.json({ ok: true, lesson, message: `Lesson "${lesson.title}" published as v${lesson.version}!` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DASH-1: Topic struggle heatmap
app.get("/api/teacher/struggle-heatmap", (req, res) => {
  const schoolId = (req.query.schoolId as string) || "s1";
  res.json(getTeacherTopicHeatmap(schoolId));
});

// DASH-1: No-improvement flags
app.get("/api/teacher/no-improvement", (req, res) => {
  const schoolId = (req.query.schoolId as string) || "s1";
  res.json(getNoImprovementFlags(schoolId));
});

// DASH-1: Export cohort telemetry to CSV
app.get("/api/teacher/export/csv", (req, res) => {
  const schoolId = (req.query.schoolId as string) || "s1";
  const realSessions = sessions.filter((s) => !s.is_demo);

  let csv = "client_id,learner_id,tutor_id,topic_id,pre_score,post_score,gain,retention_score,at\n";
  for (const s of realSessions) {
    const gain = (s.post - s.pre).toFixed(2);
    csv += `${s.client_id},${s.learnerId},${s.tutorId},${s.topicId},${s.pre},${s.post},${gain},${s.retention_score ?? ""},${s.at}\n`;
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=peerlearn-${schoolId}-telemetry.csv`);
  res.send(csv);
});

// DASH-2: Platform Admin School Health Table
app.get("/api/platform/school-health", (_req, res) => {
  res.json(getPlatformSchoolHealth());
});

// DASH-2 & DoD: Platform Impact Report (R5 demo data excluded)
app.get("/api/platform/impact-report", (_req, res) => {
  res.json(generatePlatformImpactReport());
});

// ============================================================================
// Phase 8: LATER Items (Training, Adaptive Graph, Groups, Telecom, QR Handoff)
// ============================================================================

// 1. Tutor Training Micro-Lessons & Pedagogical Certification
app.get("/api/training/modules", (_req, res) => {
  res.json(getTrainingModules());
});

app.get("/api/training/progress/:tutorId", (req, res) => {
  res.json(getTutorTrainingProgress(req.params.tutorId));
});

app.post("/api/training/complete-module", (req, res) => {
  const { tutorId, moduleId, answer } = req.body;
  if (!tutorId || !moduleId || typeof answer !== "number") {
    return res.status(400).json({ error: "tutorId, moduleId, and answer index required." });
  }
  try {
    const result = completeTrainingModule(tutorId, moduleId, answer);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Adaptive Practice & Prerequisite Knowledge Graph
app.get("/api/adaptive/graph", (_req, res) => {
  res.json(getPrerequisiteGraph());
});

app.get("/api/adaptive/recommendations/:studentId/:topicId", (req, res) => {
  const score = Number(req.query.score ?? 0.5);
  res.json(getAdaptiveRecommendations(req.params.studentId, Number(req.params.topicId), score));
});

// 3. Small-Group Peer Tutoring Sessions
app.get("/api/groups", (req, res) => {
  const schoolId = (req.query.schoolId as string) || "s1";
  res.json(getGroupMatches(schoolId));
});

app.post("/api/groups/match", (req, res) => {
  try {
    const match = createGroupMatch(req.body);
    res.status(201).json({ ok: true, match });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/groups/session", (req, res) => {
  try {
    const result = recordGroupSessionResult(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/groups/sessions", (req, res) => {
  const schoolId = (req.query.schoolId as string) || "s1";
  res.json(getGroupSessions(schoolId));
});

// 4. Africa's Talking SMS & USSD Webhooks
app.post("/api/ussd", (req, res) => {
  try {
    const response = processUSSDRequest(req.body);
    res.json(response);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/sms/send", (req, res) => {
  const { to, message } = req.body;
  try {
    const result = sendSMS(to, message);
    res.status(201).json({ ok: true, log: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/sms/logs", (_req, res) => {
  res.json(getSMSLogs());
});

// 5. Zero-Data Offline QR Handoff
app.post("/api/qr/encode", (req, res) => {
  const { type, data } = req.body;
  if (!type || !data) {
    return res.status(400).json({ error: "type and data are required." });
  }
  try {
    const result = generateQRPayload(type, data);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/qr/decode", (req, res) => {
  const { rawString } = req.body;
  if (!rawString) {
    return res.status(400).json({ error: "rawString is required." });
  }
  try {
    const result = parseAndIngestQRPayload(rawString);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API on http://localhost:${port}`));

