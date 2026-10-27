import { describe, it, expect } from "vitest";
import {
  createLesson,
  updateLesson,
  publishLesson,
  getCurriculum,
  authoringLessons,
} from "../server/src/content";
import {
  getTeacherTopicHeatmap,
  getNoImprovementFlags,
  getPlatformSchoolHealth,
  generatePlatformImpactReport,
} from "../server/src/dashboards";
import { sessions } from "../server/src/data";
import type { SessionResult } from "../shared/types";

describe("Phase 6: Content Authoring (CONT) & Dashboards (DASH)", () => {
  // CONT-1: Teacher lesson editor creates draft lesson
  it("CONT-1: createLesson creates a new draft lesson with version 1 and status 'draft'", () => {
    const draft = createLesson({
      title: "Introduction to Quadratic Equations",
      subject: "Math",
      grade: 3,
      school_id: "s1",
      author_id: "teacher-1",
      tutorGuide: ["Explain standard form ax^2 + bx + c = 0", "Show factorization method"],
      explanation: ["Quadratic equations have degree 2."],
      pre: [{ q: "What is degree of x^2 + 2x = 0?", options: ["1", "2", "3"], answer: 1 }],
      post: [{ q: "Find roots of x^2 - 4 = 0", options: ["2, -2", "4, -4", "0, 2"], answer: 0 }],
    });

    expect(draft.topicId).toBeDefined();
    expect(draft.title).toBe("Introduction to Quadratic Equations");
    expect(draft.version).toBe(1);
    expect(draft.status).toBe("draft");
    expect(draft.school_id).toBe("s1");
    expect(draft.tutorGuide.length).toBe(2);
  });

  // CONT-2 (DoD): Teacher publishes a lesson; publishing bumps version
  it("CONT-2 (DoD): publishLesson bumps version and sets status to 'published'", () => {
    // 1. Create draft
    const draft = createLesson({
      title: "Chemical Bonding Basics",
      subject: "Science",
      grade: 2,
      school_id: "s1",
    });

    expect(draft.version).toBe(1);
    expect(draft.status).toBe("draft");

    // 2. Publish lesson (DoD: teacher publishes a lesson)
    const published = publishLesson(draft.topicId);
    expect(published.status).toBe("published");
    expect(published.version).toBe(2); // bumped version!

    // Publishing again bumps version to 3
    const republished = publishLesson(draft.topicId);
    expect(republished.version).toBe(3);
  });

  // CONT-3 (DoD): Students can download published lessons; unpublished drafts remain invisible
  it("CONT-3 (DoD): getCurriculum excludes drafts for student download (includeDrafts=false)", () => {
    // 1. Create a draft that is NOT published
    const unpublishedDraft = createLesson({
      title: "Secret Unreleased Curriculum Draft",
      subject: "Math",
      grade: 4,
      school_id: "s1",
    });

    // 2. Student query: includeDrafts = false
    const studentPack = getCurriculum("s1", false);
    const foundInStudentPack = studentPack.some((l) => l.topicId === unpublishedDraft.topicId);
    expect(foundInStudentPack).toBe(false);

    // 3. Teacher query: includeDrafts = true
    const teacherPack = getCurriculum("s1", true);
    const foundInTeacherPack = teacherPack.some((l) => l.topicId === unpublishedDraft.topicId);
    expect(foundInTeacherPack).toBe(true);

    // 4. Publish the lesson -> now student can download it
    publishLesson(unpublishedDraft.topicId);
    const updatedStudentPack = getCurriculum("s1", false);
    expect(updatedStudentPack.some((l) => l.topicId === unpublishedDraft.topicId)).toBe(true);
  });

  // DASH-1: Topic struggle heatmap and no-improvement flags
  it("DASH-1: topic struggle heatmap computes struggle index and flags low-mastery topics", () => {
    const heatmap = getTeacherTopicHeatmap("s1");
    expect(heatmap.length).toBeGreaterThan(0);

    for (const topic of heatmap) {
      expect(topic.struggleIndex).toBeGreaterThanOrEqual(0);
      expect(topic.struggleIndex).toBeLessThanOrEqual(1);
      expect(["low", "medium", "high"]).toContain(topic.struggleLevel);
    }

    // Test No-Improvement Flags (gain <= 0)
    sessions.push({
      client_id: "no-imp-test-session",
      learnerId: "l1",
      tutorId: "t1",
      topicId: 1,
      pre: 0.8,
      post: 0.6, // post < pre -> negative gain!
      at: new Date().toISOString(),
      is_demo: false,
    });

    const flags = getNoImprovementFlags("s1");
    expect(flags.some((f) => f.sessionId === "no-imp-test-session")).toBe(true);
    const testFlag = flags.find((f) => f.sessionId === "no-imp-test-session")!;
    expect(testFlag.gain).toBeLessThan(0);
  });

  // DASH-2 (DoD): Platform impact reports strictly exclude demo data (is_demo = true)
  it("DASH-2 (DoD): generatePlatformImpactReport excludes all demo sessions (is_demo: true, R5)", () => {
    // Insert dummy demo sessions with extreme gains
    sessions.push(
      {
        client_id: "fake-demo-session-1",
        learnerId: "demo-l1",
        tutorId: "demo-t1",
        topicId: 1,
        pre: 0.0,
        post: 1.0, // +100% fake gain
        is_demo: true, // DEMO FLAG
        at: new Date().toISOString(),
      },
      {
        client_id: "fake-demo-session-2",
        learnerId: "demo-l2",
        tutorId: "demo-t2",
        topicId: 2,
        pre: 0.0,
        post: 1.0,
        is_demo: true,
        at: new Date().toISOString(),
      }
    );

    const report = generatePlatformImpactReport();
    expect(report.demoExcluded).toBe(true);

    // Verify demo sessions are not counted in real session count
    const totalWithDemo = sessions.filter((s) => !s.is_comparison_group).length;
    expect(report.totalSessions).toBeLessThan(totalWithDemo);
    expect(report.avgImmediateGain).toBeLessThan(1.0); // Extreme demo 1.0 gains must not distort real averages
  });
});
