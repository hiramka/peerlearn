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
    const t = tutors.find((t) => t.id === s.tutorId);
    if (t) {
      const mine = sessions.filter((x) => x.tutorId === t.id);
      t.avgGain = mine.reduce((a, x) => a + (x.post - x.pre), 0) / mine.length;
    }
  }
  res.status(201).json({ ok: true });
});

// Teacher view: where do students struggle, and is tutoring helping?
app.get("/api/teacher/summary", (_req, res) => {
  const out = topics.map((t) => {
    const ss = sessions.filter((s) => s.topicId === t.id);
    const avg = (f: (s: SessionResult) => number) => (ss.length ? ss.reduce((a, s) => a + f(s), 0) / ss.length : 0);
    const ratings = ss.filter((s) => typeof s.learnerRating === "number").map((s) => s.learnerRating as number);
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    return {
      topic: t.name,
      sessions: ss.length,
      avgPre: avg((s) => s.pre),
      avgPost: avg((s) => s.post),
      avgRating,
    };
  });
  res.json(out);
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

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API on http://localhost:${port}`));
