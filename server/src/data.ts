// In-memory seed data so the demo runs with zero setup.
// Swap these for Postgres/Supabase queries later (see schema.sql) -- routes stay the same.
import type { Person, Tutor, Topic, Lesson, SessionResult } from "../../shared/types";

const slots = { mon: ["16:00-17:00"], wed: ["16:00-17:00"] };

export const topics: Topic[] = [
  { id: 1, subject: "Math", name: "Solving linear equations", grade: 2 },
  { id: 2, subject: "Science", name: "States of matter", grade: 2 },
];

export const learners: Person[] = [
  { id: "l1", name: "Amani (demo learner)", grade: 2, schoolId: "s1", language: "en", availability: slots },
];

export const tutors: Tutor[] = [
  { id: "t1", name: "Wanjiru", grade: 3, schoolId: "s1", language: "en", availability: slots, verifiedScore: { 1: 0.95, 2: 0.7 }, teacherApproved: { 1: true, 2: false }, activeMatches: 1, avgGain: 0.3 },
  { id: "t2", name: "Brian", grade: 4, schoolId: "s1", language: "en", availability: { mon: ["16:00-17:00"] }, verifiedScore: { 1: 0.85, 2: 0.9 }, teacherApproved: { 1: true, 2: true }, activeMatches: 3, avgGain: 0.2 },
  { id: "t3", name: "Achieng", grade: 3, schoolId: "s2", language: "sw", availability: { wed: ["16:00-17:00"] }, verifiedScore: { 1: 0.9, 2: 0.88 }, teacherApproved: { 1: true, 2: true }, activeMatches: 0, avgGain: 0.1 },
  { id: "t4", name: "Kevin", grade: 1, schoolId: "s1", language: "en", availability: slots, verifiedScore: { 1: 0.99 }, teacherApproved: { 1: true }, activeMatches: 0, avgGain: 0 }, // filtered out: lower grade
  { id: "t5", name: "Daniel (Unapproved)", grade: 3, schoolId: "s1", language: "en", availability: slots, verifiedScore: { 1: 0.92 }, teacherApproved: { 1: false }, activeMatches: 0, avgGain: 0 }, // SAFE-1: unapproved
  { id: "t6", name: "Grace (Suspended)", grade: 4, schoolId: "s1", language: "en", availability: slots, verifiedScore: { 1: 0.88 }, teacherApproved: { 1: true }, isSuspended: true, activeMatches: 0, avgGain: 0 }, // SAFE-2: suspended
];

export const lessons: Lesson[] = [
  {
    topicId: 1, title: "Solving linear equations", version: 1,
    tutorGuide: [
      "Start by asking the learner: what does the = sign mean? (balance)",
      "Show: whatever you do to one side, do to the other.",
      "Work x + 5 = 12 together, then let the learner try 2x = 14.",
      "Finish with one two-step equation; do not give the answer, ask 'what is your first move?'",
    ],
    explanation: [
      "An equation is a balance. Both sides must stay equal.",
      "To solve x + 5 = 12, subtract 5 from both sides: x = 7.",
      "To solve 3x = 18, divide both sides by 3: x = 6.",
      "Two steps: 2x + 3 = 11 -> subtract 3 -> 2x = 8 -> divide by 2 -> x = 4.",
    ],
    pre: [
      { id: "q1_pre_1", q: "Solve: x + 4 = 9", options: ["3", "5", "13"], answer: 1, sub_skill: "addition_equations", difficulty: 1, language: "en" },
      { id: "q1_pre_2", q: "Solve: 3x = 12", options: ["4", "9", "15"], answer: 0, sub_skill: "multiplication_equations", difficulty: 2, language: "en" },
      { id: "q1_pre_3", q: "Solve: 2x + 1 = 7", options: ["2", "3", "4"], answer: 1, sub_skill: "two_step_equations", difficulty: 3, language: "en" },
    ],
    post: [
      { id: "q1_post_1", q: "Solve: x + 6 = 10", options: ["4", "16", "6"], answer: 0, sub_skill: "addition_equations", difficulty: 1, language: "en" },
      { id: "q1_post_2", q: "Solve: 4x = 20", options: ["16", "5", "80"], answer: 1, sub_skill: "multiplication_equations", difficulty: 2, language: "en" },
      { id: "q1_post_3", q: "Solve: 3x + 2 = 11", options: ["3", "4", "5"], answer: 0, sub_skill: "two_step_equations", difficulty: 3, language: "en" },
    ],
    retention: [
      { id: "q1_ret_1", q: "Solve: x - 3 = 8", options: ["5", "11", "24"], answer: 1, sub_skill: "subtraction_equations", difficulty: 1, language: "en" },
      { id: "q1_ret_2", q: "Solve: 5x = 35", options: ["7", "30", "40"], answer: 0, sub_skill: "multiplication_equations", difficulty: 2, language: "en" },
      { id: "q1_ret_3", q: "Solve: 2x - 4 = 10", options: ["3", "5", "7"], answer: 2, sub_skill: "two_step_equations", difficulty: 3, language: "en" },
    ],
  },
  {
    topicId: 2, title: "States of matter", version: 1,
    tutorGuide: [
      "Ask: name something solid, liquid and gas you touched today.",
      "Use water: ice -> water -> steam to show one substance, three states.",
      "Link to particles: tightly packed, sliding past, spread out.",
    ],
    explanation: [
      "Solids keep their shape; particles are tightly packed and only vibrate.",
      "Liquids take the shape of their container; particles slide past each other.",
      "Gases fill any container; particles are far apart and move fast.",
      "Heating gives particles energy and can change the state (melting, boiling).",
    ],
    pre: [
      { id: "q2_pre_1", q: "Which state keeps its own shape?", options: ["Solid", "Liquid", "Gas"], answer: 0, sub_skill: "shape_properties", difficulty: 1, language: "en" },
      { id: "q2_pre_2", q: "Ice turning to water is called:", options: ["Boiling", "Melting", "Freezing"], answer: 1, sub_skill: "phase_changes", difficulty: 2, language: "en" },
      { id: "q2_pre_3", q: "Particles are furthest apart in a:", options: ["Solid", "Liquid", "Gas"], answer: 2, sub_skill: "particle_theory", difficulty: 3, language: "en" },
    ],
    post: [
      { id: "q2_post_1", q: "Which state takes the shape of its container but has a fixed volume?", options: ["Solid", "Liquid", "Gas"], answer: 1, sub_skill: "volume_properties", difficulty: 2, language: "en" },
      { id: "q2_post_2", q: "Water turning to steam is called:", options: ["Evaporating/boiling", "Freezing", "Melting"], answer: 0, sub_skill: "phase_changes", difficulty: 2, language: "en" },
      { id: "q2_post_3", q: "Heating particles makes them:", options: ["Slow down", "Stop", "Gain energy"], answer: 2, sub_skill: "thermal_motion", difficulty: 3, language: "en" },
    ],
    retention: [
      { id: "q2_ret_1", q: "Which state of matter can be compressed easily?", options: ["Gas", "Solid", "Liquid"], answer: 0, sub_skill: "compressibility", difficulty: 2, language: "en" },
      { id: "q2_ret_2", q: "Sublimation occurs when a solid turns directly into a:", options: ["Liquid", "Gas", "Plasma"], answer: 1, sub_skill: "phase_changes", difficulty: 3, language: "en" },
      { id: "q2_ret_3", q: "In which state do particles only vibrate in place?", options: ["Gas", "Liquid", "Solid"], answer: 2, sub_skill: "particle_theory", difficulty: 1, language: "en" },
    ],
  },
];

// Seeded results so the teacher dashboard is not empty during the demo.
export const sessions: SessionResult[] = [
  {
    client_id: "seed-1",
    learnerId: "x1",
    tutorId: "t1",
    topicId: 1,
    pre: 0.33,
    post: 0.67,
    retention_score: 0.67, // PROOF-3: Retention check 7 days after
    retention_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    is_comparison_group: false,
    at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
  },
  {
    client_id: "seed-2",
    learnerId: "x2",
    tutorId: "t2",
    topicId: 1,
    pre: 0.33,
    post: 1.0,
    retention_score: 0.85,
    retention_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    is_comparison_group: false,
    at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
  },
  {
    client_id: "seed-3",
    learnerId: "x3",
    tutorId: "t3",
    topicId: 2,
    pre: 0.67,
    post: 0.67,
    is_comparison_group: false,
    at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    client_id: "seed-comp-1",
    learnerId: "comp-1",
    tutorId: "none",
    topicId: 1,
    pre: 0.33,
    post: 0.40, // Standard instruction comparison group without peer tutoring (PROOF-5)
    is_comparison_group: true,
    at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
];
