// Dashboard Analytics Service: Heatmap, Struggle Flags, School Health & Impact Reports (DASH-1, DASH-2)
import type {
  ImpactReport,
  NoImprovementAlert,
  PlatformSchoolHealth,
  TopicStruggle,
} from "../../shared/types";
import { sessions, topics, tutors, learners } from "./data";
import { schoolsStore, profilesStore } from "./auth";

/**
 * DASH-1: Topic Struggle Heatmap.
 * Computes failure/struggle index (0..1) based on entry diagnostics and post-session mastery.
 */
export function getTeacherTopicHeatmap(schoolId: string = "s1"): TopicStruggle[] {
  return topics.map((t) => {
    // Exclude demo sessions from real diagnostics (R5)
    const topicSessions = sessions.filter(
      (s) => s.topicId === t.id && !s.is_demo && !s.is_comparison_group
    );

    const avgPre =
      topicSessions.length > 0
        ? topicSessions.reduce((a, b) => a + b.pre, 0) / topicSessions.length
        : 0.35;
    const avgPost =
      topicSessions.length > 0
        ? topicSessions.reduce((a, b) => a + b.post, 0) / topicSessions.length
        : 0.7;

    // Struggle index: higher when baseline and mastery are low
    const struggleIndex = Math.max(0, Math.min(1, 1 - (avgPre * 0.3 + avgPost * 0.7)));
    const struggleLevel: "low" | "medium" | "high" =
      struggleIndex >= 0.45 ? "high" : struggleIndex >= 0.25 ? "medium" : "low";

    const needingHelp = topicSessions.filter((s) => s.post < 0.7).length;

    return {
      topicId: t.id,
      topicName: t.name,
      subject: t.subject,
      grade: t.grade,
      averageBaseline: avgPre,
      averageMastery: avgPost,
      struggleIndex: Number(struggleIndex.toFixed(2)),
      struggleLevel,
      studentsNeedingHelp: needingHelp,
    };
  });
}

/**
 * DASH-1: No-Improvement Flags.
 * Flags student sessions where post-quiz score did not exceed pre-quiz score (gain <= 0).
 */
export function getNoImprovementFlags(schoolId: string = "s1"): NoImprovementAlert[] {
  // Exclude demo sessions
  const noImpSessions = sessions.filter(
    (s) => !s.is_demo && !s.is_comparison_group && s.post <= s.pre
  );

  return noImpSessions.map((s) => {
    const learner = learners.find((l) => l.id === s.learnerId);
    const tutor = tutors.find((t) => t.id === s.tutorId);
    const topic = topics.find((t) => t.id === s.topicId);

    return {
      sessionId: s.client_id,
      learnerId: s.learnerId,
      learnerName: learner?.name || "Student Learner",
      tutorId: s.tutorId,
      tutorName: tutor?.name || "Peer Tutor",
      topicId: s.topicId,
      topicName: topic?.name || "Curriculum Topic",
      pre: s.pre,
      post: s.post,
      gain: Number((s.post - s.pre).toFixed(2)),
      at: s.at,
    };
  });
}

/**
 * DASH-2: Platform School Health Table.
 * Aggregates school health: students, tutors, sessions, average gain, last activity.
 * All demo sessions (is_demo = true) excluded per requirement R5.
 */
export function getPlatformSchoolHealth(): PlatformSchoolHealth[] {
  return schoolsStore.map((school) => {
    const schoolStudents = profilesStore.filter(
      (p) => p.school_id === school.id && !p.is_demo
    );
    const schoolTutors = tutors.filter((t) => t.schoolId === school.id);

    // Filter real sessions only (R5)
    const schoolSessions = sessions.filter(
      (s) => !s.is_demo && !s.is_comparison_group
    );

    const gains = schoolSessions.map((s) => s.post - s.pre);
    const avgGain =
      gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0.28;

    const dates = schoolSessions.map((s) => new Date(s.at).getTime());
    const lastActivity =
      dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : new Date().toISOString();

    return {
      schoolId: school.id,
      schoolName: school.name,
      schoolCode: school.school_code,
      status: school.status as any,
      studentsCount: schoolStudents.length,
      tutorsCount: schoolTutors.length,
      sessionsCount: schoolSessions.length,
      avgGain: Number(avgGain.toFixed(2)),
      lastActivity,
    };
  });
}

/**
 * DASH-2 & DoD: Generate Platform Impact Report with Demo Data Strictly Excluded (R5).
 */
export function generatePlatformImpactReport(): ImpactReport {
  // CRITICAL REQUIREMENT R5 & DoD: Exclude all is_demo = true records
  const realSessions = sessions.filter((s) => !s.is_demo && !s.is_comparison_group);

  const realLearnerIds = new Set(realSessions.map((s) => s.learnerId));
  const realTutorIds = new Set(realSessions.map((s) => s.tutorId).filter((id) => id !== "none"));

  const immediateGains = realSessions.map((s) => s.post - s.pre);
  const avgImmediateGain =
    immediateGains.length > 0
      ? immediateGains.reduce((a, b) => a + b, 0) / immediateGains.length
      : 0;

  const retentionSessions = realSessions.filter((s) => typeof s.retention_score === "number");
  const retentionGains = retentionSessions.map((s) => (s.retention_score as number) - s.pre);
  const avgRetentionGain =
    retentionGains.length > 0
      ? retentionGains.reduce((a, b) => a + b, 0) / retentionGains.length
      : 0;

  return {
    totalSessions: realSessions.length,
    totalLearners: realLearnerIds.size,
    totalTutors: realTutorIds.size,
    avgImmediateGain: Number(avgImmediateGain.toFixed(3)),
    avgRetentionGain: Number(avgRetentionGain.toFixed(3)),
    demoExcluded: true,
    generatedAt: new Date().toISOString(),
  };
}
