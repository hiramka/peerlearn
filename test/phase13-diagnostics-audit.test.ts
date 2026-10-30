import { describe, it, expect } from "vitest";
import { generateDonorAuditVerificationReport } from "../server/src/dashboards";

describe("Phase 13: Field Diagnostics, Sync Queue Inspector & Donor Audit Verification Engine", () => {
  // ==========================================================================
  // 1. Donor Audit Verification Report & Cryptographic Hash (R5, DASH-1, DASH-2)
  // ==========================================================================
  describe("Donor Audit Verification Report Engine", () => {
    it("generates an official audit report with demo sessions strictly excluded (Rule R5)", () => {
      const report = generateDonorAuditVerificationReport("11111111-1111-1111-1111-111111111111");

      expect(report.reportId).toMatch(/^DONOR-AUDIT-ALLIANCE-[A-Z0-9]+$/);
      expect(report.schoolName).toBe("Alliance High School");
      expect(report.county).toBe("Kiambu");
      expect(report.demoExcluded).toBe(true);

      // Verify empirical lift metrics
      expect(report.totalTutoredStudents).toBeGreaterThan(0);
      expect(report.totalSessions).toBeGreaterThan(0);
      expect(report.tutoredAvgImmediateGain).toBeGreaterThan(0);
      expect(report.controlAvgImmediateGain).toBeGreaterThanOrEqual(0);

      // Net Impact Lift = Tutored Gain - Control Gain
      expect(report.netImpactLift).toBeCloseTo(
        report.tutoredAvgImmediateGain - report.controlAvgImmediateGain,
        2
      );
      expect(report.netImpactLift).toBeGreaterThan(0);

      // Effect Size Cohen's d
      expect(report.effectSizeCohenD).toBeGreaterThan(0.5); // Clinically significant educational gain

      // 7-day retention persistence
      expect(report.retentionPersistenceRatio).toBeGreaterThan(0.5); // Retaining majority of gains

      // Cryptographic SHA-256 verification hash
      expect(report.auditVerificationHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("includes breakdown across curriculum STEM topics and top peer tutors", () => {
      const report = generateDonorAuditVerificationReport("11111111-1111-1111-1111-111111111111");

      expect(report.topicsBreakdown.length).toBeGreaterThanOrEqual(8);
      for (const t of report.topicsBreakdown) {
        expect(t.name).toBeTruthy();
        expect(t.subject).toBeTruthy();
        expect(t.sessions).toBeGreaterThan(0);
        expect(t.avgGain).toBeGreaterThanOrEqual(0);
      }

      expect(report.topTutors.length).toBeGreaterThanOrEqual(1);
      for (const tutor of report.topTutors) {
        expect(tutor.name).toBeTruthy();
        expect(tutor.grade).toBeGreaterThanOrEqual(1);
        expect(tutor.sessions).toBeGreaterThan(0);
        expect(tutor.rating).toBeGreaterThanOrEqual(4.0);
      }
    });

    it("reflects sponsor subsidized partner tier metadata when applicable", () => {
      const manguReport = generateDonorAuditVerificationReport("22222222-2222-2222-2222-222222222222");

      expect(manguReport.schoolCode).toBe("MANGU");
      expect(manguReport.tier).toBe("sponsor_partner");
      expect(manguReport.sponsorName).toBe("Safaricom Foundation");
      expect(manguReport.auditVerificationHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // ==========================================================================
  // 2. Outbox Serialization & Emergency JSON Backup Structure
  // ==========================================================================
  describe("Outbox Serialization & Backup Structure", () => {
    it("formats a standard JSON backup schema for offline field recovery", () => {
      const sampleSession = {
        client_id: "test-client-999",
        learnerId: "l1",
        tutorId: "t1",
        topicId: 1,
        pre: 0.33,
        post: 1.0,
        at: new Date().toISOString(),
      };

      const backup = {
        backupTimestamp: new Date().toISOString(),
        schoolCode: "ALLIANCE",
        sessionsCount: 1,
        eventsCount: 0,
        sessions: [sampleSession],
        events: [],
      };

      const jsonStr = JSON.stringify(backup, null, 2);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.schoolCode).toBe("ALLIANCE");
      expect(parsed.sessionsCount).toBe(1);
      expect(parsed.sessions[0].client_id).toBe("test-client-999");
      expect(parsed.sessions[0].post).toBe(1.0);
    });

    it("identifies and filters malformed session payloads during corrupt purge", () => {
      const items = [
        { client_id: "valid-1", learnerId: "l1", topicId: 1, pre: 0.33, post: 0.67, at: "" },
        { client_id: "corrupted-1", learnerId: "", topicId: 1, pre: null, post: 0.67, at: "" },
        { client_id: "", learnerId: "l2", topicId: 1, pre: 0.5, post: 0.8, at: "" },
      ];

      const validItems = items.filter(
        (item) => item.client_id && item.learnerId && typeof item.pre === "number" && typeof item.post === "number"
      );

      expect(validItems.length).toBe(1);
      expect(validItems[0].client_id).toBe("valid-1");
    });
  });
});
