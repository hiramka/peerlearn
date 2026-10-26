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
  { id: "t1", name: "Wanjiru", grade: 3, schoolId: "s1", language: "en", availability: slots, verifiedScore: { 1: 0.95, 2: 0.7 }, activeMatches: 1, avgGain: 0.3 },
  { id: "t2", name: "Brian", grade: 4, schoolId: "s1", language: "en", availability: { mon: ["16:00-17:00"] }, verifiedScore: { 1: 0.85, 2: 0.9 }, activeMatches: 3, avgGain: 0.2 },
  { id: "t3", name: "Achieng", grade: 3, schoolId: "s2", language: "sw", availability: { wed: ["16:00-17:00"] }, verifiedScore: { 1: 0.9, 2: 0.88 }, activeMatches: 0, avgGain: 0.1 },
  { id: "t4", name: "Kevin", grade: 1, schoolId: "s1", language: "en", availability: slots, verifiedScore: { 1: 0.99 }, activeMatches: 0, avgGain: 0 }, // filtered out: lower grade
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
      { q: "Solve: x + 4 = 9", options: ["3", "5", "13"], answer: 1 },
      { q: "Solve: 3x = 12", options: ["4", "9", "15"], answer: 0 },
      { q: "Solve: 2x + 1 = 7", options: ["2", "3", "4"], answer: 1 },
    ],
    post: [
      { q: "Solve: x + 6 = 10", options: ["4", "16", "6"], answer: 0 },
      { q: "Solve: 4x = 20", options: ["16", "5", "80"], answer: 1 },
      { q: "Solve: 3x + 2 = 11", options: ["3", "4", "5"], answer: 0 },
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
      { q: "Which state keeps its own shape?", options: ["Solid", "Liquid", "Gas"], answer: 0 },
      { q: "Ice turning to water is called:", options: ["Boiling", "Melting", "Freezing"], answer: 1 },
      { q: "Particles are furthest apart in a:", options: ["Solid", "Liquid", "Gas"], answer: 2 },
    ],
    post: [
      { q: "Which state takes the shape of its container but has a fixed volume?", options: ["Solid", "Liquid", "Gas"], answer: 1 },
      { q: "Water turning to steam is called:", options: ["Evaporating/boiling", "Freezing", "Melting"], answer: 0 },
      { q: "Heating particles makes them:", options: ["Slow down", "Stop", "Gain energy"], answer: 2 },
    ],
  },
];

// Seeded results so the teacher dashboard is not empty during the demo.
export const sessions: SessionResult[] = [
  { client_id: "seed-1", learnerId: "x1", tutorId: "t1", topicId: 1, pre: 0.33, post: 0.67, at: new Date().toISOString() },
  { client_id: "seed-2", learnerId: "x2", tutorId: "t2", topicId: 1, pre: 0.33, post: 1, at: new Date().toISOString() },
  { client_id: "seed-3", learnerId: "x3", tutorId: "t3", topicId: 2, pre: 0.67, post: 0.67, at: new Date().toISOString() },
];
