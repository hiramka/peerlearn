// Single source of truth for types used by BOTH server and web.
export interface Person {
  id: string;
  name: string;
  grade: number;
  schoolId: string;
  language: string;
  availability: Record<string, string[]>; // {"mon": ["16:00-17:00"]}
}
export interface Tutor extends Person {
  verifiedScore: Record<number, number>; // topicId -> 0..1
  activeMatches: number;
  avgGain: number; // average (post - pre), 0..1, learned from past sessions
}
export interface Topic { id: number; subject: string; name: string; grade: number }
export interface Question { q: string; options: string[]; answer: number }
export interface Lesson {
  topicId: number;
  title: string;
  version: number;
  tutorGuide: string[];
  explanation: string[];
  pre: Question[];
  post: Question[];
}
export interface MatchFactor {
  label: string;
  points: number;
}

export interface SessionResult {
  client_id: string; // idempotency key generated on the device
  learnerId: string;
  tutorId: string;
  topicId: number;
  pre: number;  // 0..1
  post: number; // 0..1
  learnerRating?: number; // 1..5
  tutorRating?: number;   // 1..5
  feedbackTags?: string[];
  at: string;
}
export interface RankedTutor { tutor: Tutor; score: number; breakdown?: MatchFactor[] }
