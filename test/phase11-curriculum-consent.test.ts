import { describe, it, expect, beforeEach } from "vitest";
import { topics, lessons, tutors } from "../server/src/data";
import {
  getPrerequisiteGraph,
  getTopicNode,
  getAdaptiveRecommendations,
} from "../server/src/adaptive";
import {
  recordGuardianConsent,
  checkGuardianConsent,
  generatePaperConsentSlip,
  auditLogsStore,
} from "../server/src/safeguarding";
import {
  schoolsStore,
  updateSchoolPilotTier,
  getSchoolPilotTier,
} from "../server/src/auth";

describe("Phase 11: Kenyan Curriculum Bank, Dual Consent & Pilot Operations", () => {
  beforeEach(() => {
    // Reset test state if necessary
  });

  // ==========================================================================
  // 1. Kenyan Secondary Curriculum Bank (8-4-4 & CBC Frameworks)
  // ==========================================================================
  describe("Curriculum Framework Coverage (8-4-4 & CBC)", () => {
    it("provides 8 comprehensive secondary topics across core STEM subjects", () => {
      expect(topics.length).toBeGreaterThanOrEqual(8);

      const subjects = new Set(topics.map((t) => t.subject));
      expect(subjects).toContain("Math");
      expect(subjects).toContain("Biology");
      expect(subjects).toContain("Physics");
      expect(subjects).toContain("Chemistry");
      expect(subjects).toContain("Integrated Science");
    });

    it("covers both 8-4-4 Secondary (Forms 1–4) and Junior Secondary CBC (Grade 8)", () => {
      const eightFourFourTopics = topics.filter((t) => t.curriculum === "8-4-4");
      const cbcTopics = topics.filter((t) => t.curriculum === "CBC");

      expect(eightFourFourTopics.length).toBeGreaterThanOrEqual(7);
      expect(cbcTopics.length).toBeGreaterThanOrEqual(1);

      // Verify specific CBC topic
      const cbcTopic = topics.find((t) => t.id === 8);
      expect(cbcTopic).toBeDefined();
      expect(cbcTopic?.name).toContain("Human Body Systems");
      expect(cbcTopic?.grade).toBe(8);
      expect(cbcTopic?.curriculum).toBe("CBC");
    });

    it("has complete lesson packs with tutor guides and conceptual explanations for every topic", () => {
      for (const topic of topics) {
        const lesson = lessons.find((l) => l.topicId === topic.id);
        expect(lesson, `Lesson pack missing for topic ${topic.id} (${topic.name})`).toBeDefined();
        expect(lesson?.tutorGuide.length).toBeGreaterThanOrEqual(3);
        expect(lesson?.explanation.length).toBeGreaterThanOrEqual(3);
      }
    });

    it("guarantees disjoint pre, post, and retention questions with sub-skill tagging (PROOF-1, PROOF-2)", () => {
      for (const lesson of lessons) {
        expect(lesson.pre.length).toBe(3);
        expect(lesson.post.length).toBe(3);
        expect(lesson.retention?.length).toBe(3);

        const preIds = new Set(lesson.pre.map((q) => q.id));
        const postIds = new Set(lesson.post.map((q) => q.id));
        const retentionIds = new Set(lesson.retention!.map((q) => q.id));

        // Assert strictly zero overlap in question IDs (PROOF-2)
        for (const id of postIds) {
          expect(preIds.has(id)).toBe(false);
        }
        for (const id of retentionIds) {
          expect(preIds.has(id)).toBe(false);
          expect(postIds.has(id)).toBe(false);
        }

        // Assert all questions are tagged with sub_skills and difficulty
        for (const q of [...lesson.pre, ...lesson.post, ...lesson.retention!]) {
          expect(q.sub_skill).toBeTruthy();
          expect(q.difficulty).toBeGreaterThanOrEqual(1);
          expect(q.options.length).toBeGreaterThanOrEqual(3);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.options.length);
        }
      }
    });
  });

  // ==========================================================================
  // 2. Adaptive Knowledge Graph Interconnection Across Subjects
  // ==========================================================================
  describe("Adaptive Knowledge Graph Expansion", () => {
    it("connects prerequisite nodes across Math, Science, and Biology", () => {
      const graph = getPrerequisiteGraph();
      expect(graph.length).toBeGreaterThanOrEqual(14);

      // Math: Topic 3 (Commercial Arithmetic) -> Topic 1 (Linear Equations) -> Topic 7 (Quadratics)
      const commArith = getTopicNode(3);
      expect(commArith).toBeDefined();
      expect(commArith?.progressionTopicIds).toContain(1);

      const linearNode = getTopicNode(1);
      expect(linearNode?.prerequisiteTopicIds).toContain(3);
      expect(linearNode?.progressionTopicIds).toContain(7);

      const quadNode = getTopicNode(7);
      expect(quadNode?.prerequisiteTopicIds).toContain(1);

      // Biology: Topic 4 (Cell Structure) -> Topic 8 (CBC Grade 8 Body Systems)
      const cellNode = getTopicNode(4);
      expect(cellNode?.progressionTopicIds).toContain(8);

      const bodySystemsNode = getTopicNode(8);
      expect(bodySystemsNode?.prerequisiteTopicIds).toContain(4);
    });

    it("routes remediation to Commercial Arithmetic when Form 2 Linear Equations score is deficient", () => {
      const rec = getAdaptiveRecommendations("student-test", 1, 0.4);
      expect(rec.type).toBe("remediation_prerequisite");
      expect(rec.recommendedTopicId).toBeDefined();
      expect([100, 3]).toContain(rec.recommendedTopicId);
    });

    it("recommends progression to Form 3 Quadratics when Linear Equations score is >= 80%", () => {
      const rec = getAdaptiveRecommendations("student-test", 1, 0.85);
      expect(rec.type).toBe("progression_advance");
      expect([201, 7]).toContain(rec.recommendedTopicId);
    });
  });

  // ==========================================================================
  // 3. Dual Guardian Consent Workflow (In-App & Paper Slip)
  // ==========================================================================
  describe("Dual Guardian Consent Flow (SPEC_V2 Section 10.5)", () => {
    it("generates an official printable consent slip with unique serial number and DPA 2019 legal reference", () => {
      const slip = generatePaperConsentSlip({
        id: "stud-201",
        full_name: "Esther Wanjiku",
        reg_number: "ADM-8821",
        grade: 2,
        school_name: "Alliance High School",
        school_id: "11111111-1111-1111-1111-111111111111",
      });

      expect(slip.serial_number).toMatch(/^PL-KE-G2-[A-Z0-9]+-[A-Z0-9]+$/);
      expect(slip.student_name).toBe("Esther Wanjiku");
      expect(slip.reg_number).toBe("ADM-8821");
      expect(slip.legal_framework).toContain("Kenya Data Protection Act");
    });

    it("records returned physical paper slip verification with serial number", () => {
      const consent = recordGuardianConsent("11111111-1111-1111-1111-111111111111", "stud-paper-1", {
        consentType: "paper_slip",
        guardianName: "David Otieno",
        guardianPhone: "0722000000",
        guardianNationalId: "12345678",
        slipSerialNumber: "PL-KE-G1-9988-ABCD",
        verifiedBy: "Teacher Mwangi",
      });

      expect(consent.consent_given).toBe(true);
      expect(consent.consent_type).toBe("paper_slip");
      expect(consent.slip_serial_number).toBe("PL-KE-G1-9988-ABCD");
      expect(consent.verified_by).toBe("Teacher Mwangi");

      // Verify clearance
      expect(checkGuardianConsent("stud-paper-1")).toBe(true);
    });

    it("records in-app digital consent and logs safeguarding audit entry", () => {
      const initialAuditCount = auditLogsStore.length;

      const consent = recordGuardianConsent("11111111-1111-1111-1111-111111111111", "stud-app-1", {
        consentType: "digital_in_app",
        guardianName: "Grace Muthoni",
      });

      expect(consent.consent_given).toBe(true);
      expect(consent.consent_type).toBe("digital_in_app");
      expect(checkGuardianConsent("stud-app-1")).toBe(true);

      expect(auditLogsStore.length).toBeGreaterThan(initialAuditCount);
      const lastAudit = auditLogsStore[auditLogsStore.length - 1];
      expect(lastAudit.action).toBe("RECORD_GUARDIAN_CONSENT");
      expect(lastAudit.detail.studentId).toBe("stud-app-1");
    });
  });

  // ==========================================================================
  // 4. Pilot School Pricing & Subscription Tier Management
  // ==========================================================================
  describe("Pilot School Tier & Pricing Management (SPEC_V2 Section 10.2, 10.4)", () => {
    it("reports default seeded pilot tiers for schools", () => {
      const allianceTier = getSchoolPilotTier("11111111-1111-1111-1111-111111111111");
      expect(allianceTier.ok).toBe(true);
      expect(allianceTier.tier).toBe("pilot_standard");
      expect(allianceTier.term_fee_kes).toBe(15000);

      const manguTier = getSchoolPilotTier("22222222-2222-2222-2222-222222222222");
      expect(manguTier.ok).toBe(true);
      expect(manguTier.tier).toBe("sponsor_partner");
      expect(manguTier.term_fee_kes).toBe(0);
      expect(manguTier.sponsor_name).toBe("Safaricom Foundation");
    });

    it("updates school pilot tier to sponsor subsidized tier and records audit trail", () => {
      const schoolId = "11111111-1111-1111-1111-111111111111";
      const result = updateSchoolPilotTier(schoolId, "sponsor_partner", {
        sponsorName: "Equity Group Foundation",
        actorId: "platform-admin-1",
      });

      expect(result.ok).toBe(true);
      expect(result.school?.tier).toBe("sponsor_partner");
      expect(result.school?.term_fee_kes).toBe(0);
      expect(result.school?.sponsor_name).toBe("Equity Group Foundation");

      const currentTier = getSchoolPilotTier(schoolId);
      expect(currentTier.tier).toBe("sponsor_partner");
      expect(currentTier.sponsor_name).toBe("Equity Group Foundation");
    });

    it("resets school to standard pilot tier with custom term fee", () => {
      const schoolId = "11111111-1111-1111-1111-111111111111";
      const result = updateSchoolPilotTier(schoolId, "pilot_standard", {
        termFeeKes: 12000,
      });

      expect(result.ok).toBe(true);
      expect(result.school?.tier).toBe("pilot_standard");
      expect(result.school?.term_fee_kes).toBe(12000);
      expect(result.school?.sponsor_name).toBeUndefined();
    });
  });
});
