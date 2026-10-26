import type { Person, Tutor, RankedTutor, MatchFactor } from "../../shared/types";

function sharedSlots(a: Person["availability"], b: Person["availability"]) {
  let n = 0;
  for (const day in a) if (b[day]) n += a[day].filter((s) => b[day].includes(s)).length;
  return n;
}

export interface MatchEvaluation {
  score: number;
  breakdown: MatchFactor[];
}

/** Evaluates a match and returns the overall score alongside explainable breakdown factors. */
export function evaluateMatch(learner: Person, tutor: Tutor, topicId: number): MatchEvaluation {
  const mastery = tutor.verifiedScore[topicId] ?? 0;
  if (tutor.id === learner.id) return { score: 0, breakdown: [] };
  if (mastery < 0.8) return { score: 0, breakdown: [] };                   // must be verified strong (>=80%)
  if (tutor.grade < learner.grade) return { score: 0, breakdown: [] };     // same grade or higher
  if (tutor.grade - learner.grade > 2) return { score: 0, breakdown: [] }; // but not too far apart

  const breakdown: MatchFactor[] = [];

  const masteryPts = Math.round(40 * mastery);
  breakdown.push({ label: `Subject Mastery (${Math.round(mastery * 100)}%)`, points: masteryPts });

  if (tutor.schoolId === learner.schoolId) {
    breakdown.push({ label: "Same School Campus", points: 25 });
  }

  if (tutor.language === learner.language) {
    breakdown.push({ label: `Shared Language (${tutor.language.toUpperCase()})`, points: 15 });
  }

  const commonSlots = sharedSlots(learner.availability, tutor.availability);
  if (commonSlots > 0) {
    const slotPts = Math.min(commonSlots, 3) * 5;
    breakdown.push({ label: `Compatible Schedule (${commonSlots} slot${commonSlots > 1 ? "s" : ""})`, points: slotPts });
  }

  const loadPts = 5 - Math.min(tutor.activeMatches, 5);
  if (loadPts > 0) {
    breakdown.push({ label: "High Tutor Availability", points: loadPts });
  }

  if (tutor.avgGain > 0) {
    const gainPts = Math.round(Math.min(tutor.avgGain, 0.5) * 20);
    breakdown.push({ label: `Track Record (+${Math.round(tutor.avgGain * 100)}% gain)`, points: gainPts });
  }

  const score = breakdown.reduce((a, b) => a + b.points, 0);
  return { score, breakdown };
}

/** Legacy wrapper returns 0 when the tutor is ineligible, otherwise the ranking score. */
export function scoreMatch(learner: Person, tutor: Tutor, topicId: number): number {
  return evaluateMatch(learner, tutor, topicId).score;
}

export function rankTutors(learner: Person, tutors: Tutor[], topicId: number, top = 3): RankedTutor[] {
  return tutors
    .map((tutor) => {
      const { score, breakdown } = evaluateMatch(learner, tutor, topicId);
      return { tutor, score, breakdown };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}
