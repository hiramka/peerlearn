import { describe, it, expect } from "vitest";
import { evaluateMatch, scoreMatch, rankTutors } from "../server/src/matching";
import type { Person, Tutor } from "../shared/types";

describe("MATCH: Explainable Peer-Tutoring Matchmaker", () => {
  const learner: Person = {
    id: "l1",
    name: "Amani Learner",
    grade: 2,
    schoolId: "school_a",
    language: "en",
    availability: { mon: ["16:00-17:00"], wed: ["16:00-17:00"] },
  };

  const eligibleTutor: Tutor = {
    id: "t1",
    name: "Wanjiru Tutor",
    grade: 3,
    schoolId: "school_a",
    language: "en",
    availability: { mon: ["16:00-17:00"], wed: ["16:00-17:00"] },
    verifiedScore: { 1: 0.95 },
    activeMatches: 1,
    avgGain: 0.3,
  };

  it("MATCH-1: Hard filter rejects tutor with verified mastery < 0.8", () => {
    const weakTutor: Tutor = {
      ...eligibleTutor,
      id: "t_weak",
      verifiedScore: { 1: 0.75 }, // below 80% threshold
    };
    const res = evaluateMatch(learner, weakTutor, 1);
    expect(res.score).toBe(0);
    expect(res.breakdown).toHaveLength(0);
  });

  it("MATCH-1: Hard filter rejects tutor whose grade is lower than learner", () => {
    const youngerTutor: Tutor = {
      ...eligibleTutor,
      id: "t_young",
      grade: 1, // learner is grade 2
    };
    const res = evaluateMatch(learner, youngerTutor, 1);
    expect(res.score).toBe(0);
  });

  it("MATCH-1: Hard filter rejects tutor with grade gap > 2", () => {
    const seniorTutor: Tutor = {
      ...eligibleTutor,
      id: "t_senior",
      grade: 5, // gap = 3 > 2
    };
    const res = evaluateMatch(learner, seniorTutor, 1);
    expect(res.score).toBe(0);
  });

  it("MATCH-1: Hard filter rejects matching student with themselves", () => {
    const selfTutor: Tutor = {
      ...eligibleTutor,
      id: "l1", // same as learner
    };
    const res = evaluateMatch(learner, selfTutor, 1);
    expect(res.score).toBe(0);
  });

  it("MATCH-2: Computes correct explainable breakdown for eligible tutor", () => {
    const res = evaluateMatch(learner, eligibleTutor, 1);
    expect(res.score).toBeGreaterThan(0);

    const labels = res.breakdown.map((b) => b.label);
    expect(labels.some((l) => l.includes("Subject Mastery"))).toBe(true);
    expect(labels.some((l) => l.includes("Same School Campus"))).toBe(true);
    expect(labels.some((l) => l.includes("Shared Language"))).toBe(true);
    expect(labels.some((l) => l.includes("Compatible Schedule"))).toBe(true);
  });

  it("MATCH-3: rankTutors returns top 3 sorted in descending score order", () => {
    const tutor2: Tutor = {
      ...eligibleTutor,
      id: "t2",
      name: "Tutor 2",
      verifiedScore: { 1: 0.85 },
      schoolId: "school_b", // different school = lower score
    };
    const tutor3: Tutor = {
      ...eligibleTutor,
      id: "t3",
      name: "Tutor 3",
      verifiedScore: { 1: 0.90 },
      language: "sw", // different language = lower score
    };
    const tutor4: Tutor = {
      ...eligibleTutor,
      id: "t4",
      name: "Tutor 4",
      verifiedScore: { 1: 0.82 },
      schoolId: "school_b",
    };

    const ranked = rankTutors(learner, [eligibleTutor, tutor2, tutor3, tutor4], 1, 3);
    expect(ranked).toHaveLength(3);
    expect(ranked[0].tutor.id).toBe("t1");
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
    expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
  });
});
