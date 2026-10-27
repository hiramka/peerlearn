// Single source of truth for types used by BOTH server and web.

export type SchoolRole = 'platform_admin' | 'school_admin' | 'teacher' | 'tutor' | 'learner';
export type SchoolStatus = 'sandbox' | 'pilot' | 'active' | 'paused';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface School {
  id: string;
  name: string;
  county?: string;
  school_code: string;
  status: SchoolStatus;
  pilot_started_at?: string;
  created_at?: string;
}

export interface SchoolApplication {
  id?: string;
  school_name: string;
  county: string;
  school_type: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  student_count: number;
  grades: number[];
  subjects: string[];
  consent_given: boolean;
  status?: ApplicationStatus;
  created_at?: string;
}

export interface StudentProfile {
  id: string;
  school_id: string;
  full_name: string;
  reg_number: string;
  grade: number;
  class_stream?: string;
  language: string;
  availability?: Record<string, string[]>;
  is_demo?: boolean;
  guardian_consent_at?: string;
  setup_code?: string; // only populated during import/reset sheets
}

export interface AuthSession {
  user: {
    id: string;
    full_name: string;
    role: SchoolRole;
    school_id: string;
    school_code: string;
    reg_number?: string;
    grade?: number;
    email?: string;
  };
  token?: string;
}

export interface StudentSetupInput {
  school_code: string;
  reg_number: string;
  setup_code: string;
  pin: string;
}

export interface StudentLoginInput {
  school_code: string;
  reg_number: string;
  pin: string;
}

export interface CSVImportStudentRow {
  reg_number: string;
  full_name: string;
  grade: number;
  class_stream?: string;
}

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
