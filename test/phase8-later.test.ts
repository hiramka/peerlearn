import { describe, it, expect, beforeEach } from "vitest";
import {
  getTrainingModules,
  getTutorTrainingProgress,
  completeTrainingModule,
  resetTrainingProgress,
} from "../server/src/training";
import {
  getPrerequisiteGraph,
  getAdaptiveRecommendations,
  getTopicNode,
} from "../server/src/adaptive";
import {
  createGroupMatch,
  recordGroupSessionResult,
  getGroupMatches,
  resetGroupData,
} from "../server/src/groups";
import {
  processUSSDRequest,
  sendSMS,
  getSMSLogs,
  resetTelecomData,
} from "../server/src/telecom";
import {
  generateQRPayload,
  parseAndIngestQRPayload,
} from "../server/src/qr";
import { rankTutors, evaluateMatch } from "../server/src/matching";
import { tutors, learners } from "../server/src/data";

describe("Phase 8: LATER Extensions Suite", () => {
  beforeEach(() => {
    resetTrainingProgress();
    resetGroupData();
    resetTelecomData();
  });

  // ==========================================================================
  // 1. Tutor Training Micro-Lessons & Pedagogical Certification
  // ==========================================================================
  describe("Tutor Training Micro-Lessons (LATER)", () => {
    it("provides 4 comprehensive pedagogical micro-modules", () => {
      const modules = getTrainingModules();
      expect(modules.length).toBe(4);
      expect(modules[0].title).toContain("Socratic Questioning");
      expect(modules[1].title).toContain("Growth Mindset");
      expect(modules[2].title).toContain("Time & Pace Management");
      expect(modules[3].title).toContain("Safeguarding");
    });

    it("rejects incorrect scenario responses with educational feedback", () => {
      const res = completeTrainingModule("t1", "mod-1", 0); // wrong answer
      expect(res.ok).toBe(false);
      expect(res.correct).toBe(false);
      expect(res.progress.completedModuleIds.length).toBe(0);
      expect(res.explanation).toBeTruthy();
    });

    it("awards Certified Peer Tutor badge and grants matching bonus upon passing all 4 modules", () => {
      const tutor = tutors.find((t) => t.id === "t1")!;
      tutor.trainingCompleted = false;

      // Complete all 4 modules with correct answers
      const m1 = completeTrainingModule("t1", "mod-1", 2);
      expect(m1.correct).toBe(true);

      const m2 = completeTrainingModule("t1", "mod-2", 0);
      expect(m2.correct).toBe(true);

      const m3 = completeTrainingModule("t1", "mod-3", 1);
      expect(m3.correct).toBe(true);

      const m4 = completeTrainingModule("t1", "mod-4", 1);
      expect(m4.correct).toBe(true);
      expect(m4.certifiedNow).toBe(true);
      expect(m4.progress.certifiedBadge).toBe(true);
      expect(tutor.trainingCompleted).toBe(true);

      // Verify that certified tutor receives pedagogical bonus points in matching
      const learner = learners[0];
      const evaluation = evaluateMatch(learner, tutor, 1);
      const bonusFactor = evaluation.breakdown.find((f) => f.label.includes("Certified Peer Tutor"));
      expect(bonusFactor).toBeDefined();
      expect(bonusFactor?.points).toBe(10);
    });
  });

  // ==========================================================================
  // 2. Adaptive Practice with Prerequisite Knowledge Graph
  // ==========================================================================
  describe("Adaptive Knowledge Graph & Prerequisite Recommendations (LATER)", () => {
    it("connects secondary curriculum across Forms 1 to 4", () => {
      const graph = getPrerequisiteGraph();
      expect(graph.length).toBeGreaterThanOrEqual(8);

      const linearNode = getTopicNode(1); // Form 2 Linear Equations
      expect(linearNode).toBeDefined();
      expect(linearNode?.prerequisiteTopicIds).toContain(100); // Form 1 Integers
      expect(linearNode?.progressionTopicIds).toContain(201); // Form 3 Quadratics
    });

    it("recommends prerequisite remediation when score is below 50%", () => {
      const rec = getAdaptiveRecommendations("l1", 1, 0.35); // 35% on Linear Equations
      expect(rec.type).toBe("remediation_prerequisite");
      expect(rec.recommendedTopicId).toBe(100); // Integers & Basic Algebra
      expect(rec.recommendedGrade).toBe(1);
      expect(rec.reason).toContain("foundational gaps in prerequisites");
    });

    it("recommends practice reinforcement when score is between 50% and 79%", () => {
      const rec = getAdaptiveRecommendations("l1", 1, 0.65); // 65%
      expect(rec.type).toBe("reinforce_current");
      expect(rec.recommendedTopicId).toBe(1);
      expect(rec.reason).toContain("guided peer practice session");
    });

    it("unlocks advanced topic progression when score is 80% or higher", () => {
      const rec = getAdaptiveRecommendations("l1", 1, 0.9); // 90%
      expect(rec.type).toBe("progression_advance");
      expect(rec.recommendedTopicId).toBe(201); // Form 3 Quadratics
      expect(rec.recommendedGrade).toBe(3);
    });
  });

  // ==========================================================================
  // 3. Small-Group Peer Tutoring Sessions
  // ==========================================================================
  describe("Small-Group Peer Tutoring (LATER)", () => {
    it("creates a group match with multiple learners and validates minimum cohort size", () => {
      expect(() => {
        createGroupMatch({
          schoolId: "s1",
          tutorId: "t1",
          learnerIds: ["l1"], // only 1 learner
          topicId: 1,
        });
      }).toThrow("Small group requires a tutor and at least 2 learners.");

      const group = createGroupMatch({
        schoolId: "s1",
        tutorId: "t1",
        learnerIds: ["l1", "l2", "l3"],
        topicId: 1,
        scheduledAt: "Wednesday, 16:30 (Room 4)",
      });

      expect(group.id).toBeTruthy();
      expect(group.learnerIds.length).toBe(3);
      expect(group.status).toBe("scheduled");
    });

    it("records multi-student group session and calculates collective average gain", () => {
      const group = createGroupMatch({
        schoolId: "s1",
        tutorId: "t1",
        learnerIds: ["l1", "l2"],
        topicId: 1,
      });

      const res = recordGroupSessionResult({
        client_id: "grp-test-session-1",
        groupId: group.id,
        schoolId: "s1",
        tutorId: "t1",
        topicId: 1,
        learnerResults: [
          { learnerId: "l1", preScore: 0.3, postScore: 0.8, gain: 0.5 },
          { learnerId: "l2", preScore: 0.4, postScore: 0.7, gain: 0.3 },
        ],
        avgGain: 0,
        at: new Date().toISOString(),
      });

      expect(res.ok).toBe(true);
      expect(res.session.avgGain).toBe(0.4); // (0.5 + 0.3) / 2 = 0.40
      expect(group.status).toBe("completed");

      // Idempotent sync: submitting duplicate client_id does not throw or duplicate
      const dup = recordGroupSessionResult({
        client_id: "grp-test-session-1",
        groupId: group.id,
        schoolId: "s1",
        tutorId: "t1",
        topicId: 1,
        learnerResults: [],
        avgGain: 0,
        at: new Date().toISOString(),
      });
      expect(dup.ok).toBe(true);
      expect(dup.message).toContain("already synced");
    });
  });

  // ==========================================================================
  // 4. Africa's Talking SMS & USSD Webhooks
  // ==========================================================================
  describe("Africa's Talking USSD & SMS Gateway (LATER)", () => {
    it("handles USSD root dial and returns CON menu in bilingual format", () => {
      const res = processUSSDRequest({
        sessionId: "ussd-123",
        serviceCode: "*384*500#",
        phoneNumber: "+254712345678",
        text: "",
      });

      expect(res.continueSession).toBe(true);
      expect(res.message).toContain("CON PeerLearn Kenya");
      expect(res.message).toContain("1. Leo: Ratiba ya Masomo");
      expect(res.message).toContain("2. Matokeo na Maendeleo");
    });

    it("processes USSD navigation options 1, 2, and 4", () => {
      // Menu 1: Scheduled sessions
      const res1 = processUSSDRequest({
        sessionId: "ussd-123",
        serviceCode: "*384*500#",
        phoneNumber: "+254712345678",
        text: "1",
      });
      expect(res1.continueSession).toBe(false);
      expect(res1.message).toContain("END Ratiba ya Leo");

      // Menu 2: Scores and gains
      const res2 = processUSSDRequest({
        sessionId: "ussd-123",
        serviceCode: "*384*500#",
        phoneNumber: "+254712345678",
        text: "2",
      });
      expect(res2.continueSession).toBe(false);
      expect(res2.message).toContain("END Matokeo Yako");
      expect(res2.message).toContain("Linear Equations");

      // Menu 4: PIN help
      const res4 = processUSSDRequest({
        sessionId: "ussd-123",
        serviceCode: "*384*500#",
        phoneNumber: "+254712345678",
        text: "4",
      });
      expect(res4.continueSession).toBe(false);
      expect(res4.message).toContain("Hali ya Akaunti: Salama");
    });

    it("dispatches outbound SMS and tracks delivery log", () => {
      const log = sendSMS("+254722000111", "PeerLearn Reminder: Session at 16:00 in Room 3B.");
      expect(log.id).toBeTruthy();
      expect(log.to).toBe("+254722000111");
      expect(log.status).toBe("delivered");

      const logs = getSMSLogs();
      expect(logs.some((l) => l.to === "+254722000111")).toBe(true);
    });
  });

  // ==========================================================================
  // 5. Zero-Data Offline QR Transfer
  // ==========================================================================
  describe("Zero-Data Offline QR Transfer Engine (LATER)", () => {
    it("encodes session results with a tamper-evident checksum", () => {
      const sessionData = {
        client_id: `qr-test-${Date.now()}`,
        learnerId: "l1",
        tutorId: "t1",
        topicId: 1,
        pre: 0.33,
        post: 1.0,
        at: new Date().toISOString(),
      };

      const { rawString, payload } = generateQRPayload("session_result", sessionData);
      expect(rawString.startsWith("PEERLEARN_QR:1:")).toBe(true);
      expect(payload.checksum).toBeTruthy();
      expect(payload.type).toBe("session_result");
    });

    it("ingests valid QR transfer payload and idempotently stores session result", () => {
      const clientId = `qr-sess-sync-${Date.now()}`;
      const sessionData = {
        client_id: clientId,
        learnerId: "l1",
        tutorId: "t1",
        topicId: 1,
        pre: 0.4,
        post: 0.9,
        at: new Date().toISOString(),
      };

      const { rawString } = generateQRPayload("session_result", sessionData);
      const res = parseAndIngestQRPayload(rawString);

      expect(res.ok).toBe(true);
      expect(res.type).toBe("session_result");
      expect(res.importedRecord.client_id).toBe(clientId);

      // Subsequent scan of same QR code is recognized idempotently
      const dupRes = parseAndIngestQRPayload(rawString);
      expect(dupRes.ok).toBe(true);
      expect(dupRes.message).toContain("already exists in database");
    });

    it("detects tampering when payload data is modified and rejects transfer", () => {
      const sessionData = {
        client_id: "tamper-check",
        learnerId: "l1",
        pre: 0.2,
        post: 0.5,
      };

      const { payload } = generateQRPayload("session_result", sessionData);

      // Attacker tampers with post score from 0.5 to 1.0
      payload.data.post = 1.0;
      const tamperedRawString = `PEERLEARN_QR:1:${JSON.stringify(payload)}`;

      expect(() => {
        parseAndIngestQRPayload(tamperedRawString);
      }).toThrow("Tamper detection: QR payload checksum mismatch.");
    });
  });
});
