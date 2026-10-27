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
} from "./auth";
import {
  approveTutorTopic,
  setTutorSuspension,
  submitReport,
  getReportsBySchool,
  resolveReport,
  recordGuardianConsent,
  checkGuardianConsent,
  auditLogsStore,
} from "./safeguarding";
import {
  scheduleRetentionCheck,
  recordRetentionScore,
  getPendingRetentionTasks,
  generateProofCohortSummary,
} from "./proof";
import type { SessionResult } from "../../shared/types";

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

// SAFE-5: Record & Check Guardian Consent
app.post("/api/guardian-consent", (req, res) => {
  const { schoolId, studentId, guardianName, guardianPhone } = req.body;
  if (!schoolId || !studentId) {
    return res.status(400).json({ error: "schoolId and studentId are required." });
  }
  const consent = recordGuardianConsent(schoolId, studentId, guardianName, guardianPhone);
  res.json({ ok: true, consent });
});

app.get("/api/guardian-consent/:studentId", (req, res) => {
  const consented = checkGuardianConsent(req.params.studentId);
  res.json({ studentId: req.params.studentId, consent_given: consented });
});

// SAFE-6: Audit Log
app.get("/api/audit-log", (req, res) => {
  const schoolId = req.query.schoolId as string;
  const filtered = auditLogsStore.filter((a) => !schoolId || a.school_id === schoolId);
  res.json(filtered);
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API on http://localhost:${port}`));
