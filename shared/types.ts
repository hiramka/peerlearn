// Single source of truth for types used by BOTH server and web.

export type SchoolRole = 'platform_admin' | 'school_admin' | 'teacher' | 'tutor' | 'learner';
export type SchoolStatus = 'sandbox' | 'pilot' | 'active' | 'paused';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export type PilotTier = 'free_sandbox' | 'pilot_standard' | 'sponsor_partner';

export interface School {
  id: string;
  name: string;
  county?: string;
  school_code: string;
  status: SchoolStatus;
  pilot_started_at?: string;
  created_at?: string;
  tier?: PilotTier;
  sponsor_name?: string;
  term_fee_kes?: number;
  term_expires_at?: string;
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
  pin_hash?: string;
  created_at?: string;
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
  teacherApproved?: Record<number, boolean>; // topicId -> boolean (SAFE-1)
  isSuspended?: boolean; // tutor suspension (SAFE-2)
  trainingCompleted?: boolean; // LATER: Pedagogical certification badge
  completedModules?: string[];
  activeMatches: number;
  avgGain: number; // average (post - pre), 0..1, learned from past sessions
}

export type ReportStatus = 'open' | 'investigating' | 'resolved';

export interface Report {
  id: string;
  school_id: string;
  reporter_id: string;
  reporter_name?: string;
  match_id?: string;
  session_id?: string;
  target_id?: string;
  target_name?: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  school_id: string;
  actor_id: string;
  action: string;
  detail: any;
  created_at: string;
}

export type GuardianConsentType = 'digital_in_app' | 'paper_slip';

export interface GuardianConsent {
  student_id: string;
  school_id: string;
  consent_given: boolean;
  consent_type?: GuardianConsentType;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_national_id?: string;
  slip_serial_number?: string;
  verified_by?: string;
  consented_at: string;
}

export type CurriculumFramework = '8-4-4' | 'CBC';

export interface Topic {
  id: number;
  subject: string;
  name: string;
  grade: number;
  curriculum?: CurriculumFramework;
  strand?: string;
  term?: number;
}
export interface Question {
  id?: string | number;
  q: string;
  options: string[];
  answer: number;
  sub_skill?: string;
  difficulty?: number;
  language?: string;
}

export interface Lesson {
  topicId: number;
  title: string;
  version: number;
  tutorGuide: string[];
  explanation: string[];
  pre: Question[];
  post: Question[];
  retention?: Question[];
  status?: "draft" | "published"; // (CONT-2)
  school_id?: string; // (CONT-3, null = platform library)
  author_id?: string;
  grade?: number;
  subject?: string;
  updated_at?: string;
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
  retention_score?: number; // 0..1 (PROOF-3)
  retention_at?: string;
  is_comparison_group?: boolean; // (PROOF-5)
  is_demo?: boolean; // (R5, DEMO-1)
  learnerRating?: number; // 1..5
  tutorRating?: number;   // 1..5
  feedbackTags?: string[];
  at: string;
}

export interface RetentionCheckTask {
  id: string;
  client_id: string;
  school_id: string;
  learner_id: string;
  topic_id: number;
  session_completed_at: string;
  due_at: string;
  retention_score?: number;
  completed_at?: string;
  status: 'pending' | 'completed' | 'overdue';
}

export interface ProofCohortSummary {
  topic: string;
  topicId: number;
  sessions: number;
  avgPre: number;
  avgPost: number;
  immediateGain: number; // avgPost - avgPre
  retentionSessions: number;
  avgRetention: number;
  retentionGain: number; // avgRetention - avgPre
  avgRating?: number;
  comparisonGroup?: {
    learnerCount: number;
    avgGain: number;
  };
}

export interface RankedTutor { tutor: Tutor; score: number; breakdown?: MatchFactor[] }

// ============================================================================
// Phase 5: Sandbox and Live (DEMO-1..4, LIVE-1..3)
// ============================================================================

export type SessionEventType =
  | "started"
  | "pre_quiz_done"
  | "step_checked"
  | "post_quiz_done"
  | "ended";

export interface SessionEvent {
  id?: string | number;
  school_id: string;
  session_id: string; // client_id or session uuid
  type: SessionEventType;
  payload: {
    actor_id?: string;
    actor_name?: string;
    actor_role?: "learner" | "tutor" | "teacher";
    topic_id?: number;
    topic_name?: string;
    score?: number;
    step_index?: number;
    step_text?: string;
    rating?: number;
    timestamp?: string;
    [key: string]: any;
  };
  created_at?: string;
  is_demo?: boolean;
}

export interface GuestDemoToken {
  token: string;
  school_id: string;
  role: "learner" | "tutor" | "teacher";
  expires_at: string;
}

export interface DemoResetResult {
  ok: boolean;
  message: string;
  timestamp: string;
  seeded_students: number;
  seeded_tutors: number;
  seeded_sessions: number;
}

// ============================================================================
// Phase 6: Dashboards and Content Authoring (DASH-1..2, CONT-1..3)
// ============================================================================

export interface TopicStruggle {
  topicId: number;
  topicName: string;
  subject: string;
  grade: number;
  averageBaseline: number;
  averageMastery: number;
  struggleIndex: number; // 0..1 (higher = more struggle)
  struggleLevel: "low" | "medium" | "high";
  studentsNeedingHelp: number;
}

export interface NoImprovementAlert {
  sessionId: string;
  learnerId: string;
  learnerName?: string;
  tutorId: string;
  tutorName?: string;
  topicId: number;
  topicName?: string;
  pre: number;
  post: number;
  gain: number;
  at: string;
}

export interface PlatformSchoolHealth {
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  status: "pending" | "approved" | "active" | "suspended";
  studentsCount: number;
  tutorsCount: number;
  sessionsCount: number;
  avgGain: number;
  lastActivity: string;
  is_demo?: boolean;
}

export interface ImpactReport {
  totalSessions: number;
  totalLearners: number;
  totalTutors: number;
  avgImmediateGain: number;
  avgRetentionGain: number;
  demoExcluded: true;
  generatedAt: string;
}

// ============================================================================
// Phase 8: LATER Items (Africa's Talking SMS/USSD, QR Handoff, Group Sessions,
// Adaptive Practice Prerequisite Graph, Tutor Training Micro-Lessons)
// ============================================================================

export interface TutorTrainingModule {
  id: string;
  title: string;
  subtitle: string;
  principles: string[];
  scenario: string;
  quiz: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  };
}

export interface TutorTrainingProgress {
  tutorId: string;
  completedModuleIds: string[];
  certifiedBadge: boolean;
  certifiedAt?: string;
}

export interface TopicPrerequisiteNode {
  topicId: number;
  topicName: string;
  subject: string;
  grade: number;
  prerequisiteTopicIds: number[];
  progressionTopicIds: number[];
}

export interface AdaptiveRecommendation {
  type: "remediation_prerequisite" | "progression_advance" | "reinforce_current";
  reason: string;
  recommendedTopicId: number;
  recommendedTopicName: string;
  recommendedGrade: number;
}

export interface GroupMatch {
  id: string;
  schoolId: string;
  tutorId: string;
  tutorName: string;
  learnerIds: string[];
  topicId: number;
  topicName: string;
  scheduledAt: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

export interface USSDRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
}

export interface USSDResponse {
  message: string;
  continueSession: boolean; // CON vs END
}

export interface SMSMessageLog {
  id: string;
  to: string;
  message: string;
  status: "sent" | "delivered" | "failed";
  timestamp: string;
}

export interface QRTransferPayload {
  version: number;
  type: "session_result" | "lesson_pack";
  checksum: string;
  data: any;
  createdAt: string;
}

export interface GroupSessionResult {
  client_id: string;
  groupId: string;
  schoolId: string;
  tutorId: string;
  topicId: number;
  learnerResults: Array<{
    learnerId: string;
    preScore: number;
    postScore: number;
    gain: number;
  }>;
  avgGain: number;
  notes?: string;
  is_demo?: boolean;
  at: string;
}


