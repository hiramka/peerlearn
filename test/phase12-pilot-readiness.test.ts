import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { generateSeedData, runSeeder } from "../server/src/scripts/seed-cloud-db";

describe("Phase 12: Field Pilot Launch & School Operations Pack", () => {
  // ==========================================================================
  // 1. Automated Cloud Database Seeder Integrity
  // ==========================================================================
  describe("Cloud Database Seeder Script", () => {
    it("generates complete, validated payloads matching Supabase RLS schema", () => {
      const data = generateSeedData();

      // 1. Schools
      expect(data.schoolsRows.length).toBeGreaterThanOrEqual(2);
      for (const s of data.schoolsRows) {
        expect(s.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        expect(s.school_code).toBeTruthy();
        expect(["sandbox", "pilot", "active", "paused"]).toContain(s.status);
        expect(["free_sandbox", "pilot_standard", "sponsor_partner"]).toContain(s.tier);
        expect(typeof s.term_fee_kes).toBe("number");
      }

      // 2. Topics
      expect(data.topicsRows.length).toBe(8);
      const curricula = new Set(data.topicsRows.map((t) => t.curriculum));
      expect(curricula).toContain("8-4-4");
      expect(curricula).toContain("CBC");

      // 3. Lessons
      expect(data.lessonsRows.length).toBe(8);
      for (const l of data.lessonsRows) {
        expect(l.status).toBe("published");
        expect(JSON.parse(l.tutor_guide).length).toBeGreaterThanOrEqual(3);
        expect(JSON.parse(l.explanation).length).toBeGreaterThanOrEqual(3);
      }

      // 4. Questions (72 questions: 8 topics * 9 questions each)
      expect(data.questionsRows.length).toBe(72);

      // Verify each lesson has exactly 3 pre, 3 post, 3 retention
      for (let topicId = 1; topicId <= 8; topicId++) {
        const topicQuestions = data.questionsRows.filter((q) => q.topic_id === topicId);
        expect(topicQuestions.length).toBe(9);

        const pre = topicQuestions.filter((q) => q.phase === "pre");
        const post = topicQuestions.filter((q) => q.phase === "post");
        const ret = topicQuestions.filter((q) => q.phase === "retention");

        expect(pre.length).toBe(3);
        expect(post.length).toBe(3);
        expect(ret.length).toBe(3);

        // Disjoint ID check
        const ids = new Set(topicQuestions.map((q) => q.id));
        expect(ids.size).toBe(9); // All 9 IDs strictly distinct
      }

      // 5. Adaptive Graph
      expect(data.graphRows.length).toBeGreaterThanOrEqual(30);
      for (const edge of data.graphRows) {
        expect(edge.source_topic_id).toBeGreaterThan(0);
        expect(edge.target_topic_id).toBeGreaterThan(0);
        expect(["prerequisite", "progression"]).toContain(edge.relationship_type);
      }
    });

    it("executes clean dry-run verification without remote network mutation", async () => {
      const summary = await runSeeder(true);
      expect(summary.schoolsCount).toBeGreaterThanOrEqual(2);
      expect(summary.topicsCount).toBe(8);
      expect(summary.lessonsCount).toBe(8);
      expect(summary.questionsCount).toBe(72);
      expect(summary.prerequisiteEdgesCount).toBeGreaterThanOrEqual(30);
      expect(summary.timestamp).toBeTruthy();
    });
  });

  // ==========================================================================
  // 2. Teacher Field Operations Guide Verification
  // ==========================================================================
  describe("Teacher Field Operations Handbook (docs/TEACHER_PILOT_GUIDE.md)", () => {
    const guidePath = path.resolve(__dirname, "../docs/TEACHER_PILOT_GUIDE.md");

    it("exists and is comprehensive", () => {
      expect(fs.existsSync(guidePath)).toBe(true);
      const content = fs.readFileSync(guidePath, "utf-8");
      expect(content.length).toBeGreaterThan(1500);

      // Asserts core operational sections
      expect(content).toContain("8-Week Term Pilot Timeline");
      expect(content).toContain("Computer Lab & Device Provisioning");
      expect(content).toContain("The 20-Minute Guided Session Structure");
      expect(content).toContain("Safeguarding & Student Protection Protocol");
      expect(content).toContain("Dual Guardian Consent Procedures");
      expect(content).toContain("Offline Synchronization & Power Outage Recovery");
    });
  });

  // ==========================================================================
  // 3. Ministry of Education Pilot Authorization Pack Verification
  // ==========================================================================
  describe("Ministry of Education & Board Pack (docs/MOE_PILOT_AUTHORIZATION.md)", () => {
    const moePath = path.resolve(__dirname, "../docs/MOE_PILOT_AUTHORIZATION.md");

    it("exists and contains formal administrative templates", () => {
      expect(fs.existsSync(moePath)).toBe(true);
      const content = fs.readFileSync(moePath, "utf-8");
      expect(content.length).toBeGreaterThan(1500);

      // Asserts statutory and institutional components
      expect(content).toContain("COUNTY DIRECTOR OF EDUCATION");
      expect(content).toContain("School Board of Management (BOM) Minute Resolution");
      expect(content).toContain("Kenya Data Protection Act (2019) Minor Protection Schedule");
      expect(content).toContain("Pilot Pricing & Telco / Foundation Subsidy Framework");
    });
  });

  // ==========================================================================
  // 4. Package.json Script Integration
  // ==========================================================================
  describe("Root Package.json Scripts", () => {
    it("has seed:cloud and seed:dry-run scripts configured", () => {
      const pkgPath = path.resolve(__dirname, "../package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      expect(pkg.scripts["seed:cloud"]).toContain("seed-cloud-db.ts");
      expect(pkg.scripts["seed:dry-run"]).toContain("seed-cloud-db.ts --dry-run");
    });
  });
});
