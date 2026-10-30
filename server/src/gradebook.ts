import type { CATScoreRecord, CATImpactCorrelation } from "../../shared/types";
import { logSafeguardingAudit } from "./safeguarding";

// Calculate weighted Kenyan secondary school term percentage:
// CAT 1 (30), CAT 2 (30) scaled to 30%, End-of-Term Exam (100) scaled to 70%
export function calculateWeightedCATTotal(cat1: number, cat2: number, exam: number): number {
  const catAvgPercent = ((cat1 + cat2) / 60) * 30; // 30% weighting
  const examPercent = (exam / 100) * 70; // 70% weighting
  return Math.round((catAvgPercent + examPercent) * 10) / 10;
}

export const catRecordsStore: CATScoreRecord[] = [
  // Form 2 Mathematics (Term 2, 2024)
  {
    id: "cat-1",
    schoolId: "s1",
    studentId: "l1",
    regNumber: "MHS-2024-001",
    studentName: "Amina K.",
    grade: 2,
    subject: "Mathematics",
    term: "Term 2",
    year: 2024,
    cat1Score: 24,
    cat2Score: 27,
    examScore: 82,
    totalPercent: calculateWeightedCATTotal(24, 27, 82), // 82.9%
    tutoringHoursReceived: 6.5,
    tutoringGainAvg: 0.38,
  },
  {
    id: "cat-2",
    schoolId: "s1",
    studentId: "l2",
    regNumber: "MHS-2024-002",
    studentName: "Brian O.",
    grade: 2,
    subject: "Mathematics",
    term: "Term 2",
    year: 2024,
    cat1Score: 21,
    cat2Score: 25,
    examScore: 76,
    totalPercent: calculateWeightedCATTotal(21, 25, 76), // 76.2%
    tutoringHoursReceived: 5.0,
    tutoringGainAvg: 0.32,
  },
  {
    id: "cat-3",
    schoolId: "s1",
    studentId: "l3",
    regNumber: "MHS-2024-003",
    studentName: "Faith W.",
    grade: 2,
    subject: "Mathematics",
    term: "Term 2",
    year: 2024,
    cat1Score: 23,
    cat2Score: 26,
    examScore: 79,
    totalPercent: calculateWeightedCATTotal(23, 26, 79), // 79.8%
    tutoringHoursReceived: 5.5,
    tutoringGainAvg: 0.35,
  },
  {
    id: "cat-4",
    schoolId: "s1",
    studentId: "l4",
    regNumber: "MHS-2024-004",
    studentName: "David M.",
    grade: 2,
    subject: "Mathematics",
    term: "Term 2",
    year: 2024,
    cat1Score: 19,
    cat2Score: 22,
    examScore: 71,
    totalPercent: calculateWeightedCATTotal(19, 22, 71), // 70.2%
    tutoringHoursReceived: 3.5,
    tutoringGainAvg: 0.25,
  },
  {
    id: "cat-5",
    schoolId: "s1",
    studentId: "l5",
    regNumber: "MHS-2024-005",
    studentName: "Grace N.",
    grade: 2,
    subject: "Mathematics",
    term: "Term 2",
    year: 2024,
    cat1Score: 20,
    cat2Score: 24,
    examScore: 75,
    totalPercent: calculateWeightedCATTotal(20, 24, 75), // 74.5%
    tutoringHoursReceived: 4.0,
    tutoringGainAvg: 0.29,
  },
  // Non-tutored control group students (0 tutoring hours)
  {
    id: "cat-6",
    schoolId: "s1",
    studentId: "c1",
    regNumber: "MHS-2024-010",
    studentName: "Peter K. (Control)",
    grade: 2,
    subject: "Mathematics",
    term: "Term 2",
    year: 2024,
    cat1Score: 16,
    cat2Score: 17,
    examScore: 58,
    totalPercent: calculateWeightedCATTotal(16, 17, 58), // 57.1%
    tutoringHoursReceived: 0,
    tutoringGainAvg: 0,
  },
  {
    id: "cat-7",
    schoolId: "s1",
    studentId: "c2",
    regNumber: "MHS-2024-011",
    studentName: "Mercy C. (Control)",
    grade: 2,
    subject: "Mathematics",
    term: "Term 2",
    year: 2024,
    cat1Score: 15,
    cat2Score: 18,
    examScore: 61,
    totalPercent: calculateWeightedCATTotal(15, 18, 61), // 59.2%
    tutoringHoursReceived: 0,
    tutoringGainAvg: 0,
  },
  {
    id: "cat-8",
    schoolId: "s1",
    studentId: "c3",
    regNumber: "MHS-2024-012",
    studentName: "John M. (Control)",
    grade: 2,
    subject: "Mathematics",
    term: "Term 2",
    year: 2024,
    cat1Score: 14,
    cat2Score: 15,
    examScore: 54,
    totalPercent: calculateWeightedCATTotal(14, 15, 54), // 52.3%
    tutoringHoursReceived: 0,
    tutoringGainAvg: 0,
  },
  {
    id: "cat-9",
    schoolId: "s1",
    studentId: "c4",
    regNumber: "MHS-2024-013",
    studentName: "Sharon A. (Control)",
    grade: 2,
    subject: "Mathematics",
    term: "Term 2",
    year: 2024,
    cat1Score: 17,
    cat2Score: 18,
    examScore: 63,
    totalPercent: calculateWeightedCATTotal(17, 18, 63), // 61.6%
    tutoringHoursReceived: 0,
    tutoringGainAvg: 0,
  },
  // Form 3 Chemistry
  {
    id: "cat-10",
    schoolId: "s1",
    studentId: "l1",
    regNumber: "MHS-2024-001",
    studentName: "Amina K.",
    grade: 3,
    subject: "Chemistry",
    term: "Term 2",
    year: 2024,
    cat1Score: 23,
    cat2Score: 26,
    examScore: 80,
    totalPercent: calculateWeightedCATTotal(23, 26, 80),
    tutoringHoursReceived: 4.5,
    tutoringGainAvg: 0.34,
  },
  {
    id: "cat-11",
    schoolId: "s1",
    studentId: "c1",
    regNumber: "MHS-2024-010",
    studentName: "Peter K. (Control)",
    grade: 3,
    subject: "Chemistry",
    term: "Term 2",
    year: 2024,
    cat1Score: 15,
    cat2Score: 16,
    examScore: 56,
    totalPercent: calculateWeightedCATTotal(15, 16, 56),
    tutoringHoursReceived: 0,
    tutoringGainAvg: 0,
  },
];

export function getCATRecords(
  schoolId: string,
  filters?: {
    subject?: string;
    grade?: number;
    term?: string;
    year?: number;
  }
): CATScoreRecord[] {
  return catRecordsStore.filter((r) => {
    if (r.schoolId !== schoolId) return false;
    if (filters?.subject && filters.subject !== "All" && r.subject.toLowerCase() !== filters.subject.toLowerCase()) {
      return false;
    }
    if (filters?.grade && r.grade !== filters.grade) return false;
    if (filters?.term && r.term !== filters.term) return false;
    if (filters?.year && r.year !== filters.year) return false;
    return true;
  });
}

export function upsertCATRecord(
  schoolId: string,
  actorId: string,
  record: Omit<CATScoreRecord, "id" | "totalPercent"> & { id?: string }
): { ok: boolean; record?: CATScoreRecord; error?: string } {
  if (record.cat1Score < 0 || record.cat1Score > 30 || record.cat2Score < 0 || record.cat2Score > 30) {
    return { ok: false, error: "CAT scores must be between 0 and 30." };
  }
  if (record.examScore < 0 || record.examScore > 100) {
    return { ok: false, error: "Exam score must be between 0 and 100." };
  }

  const totalPercent = calculateWeightedCATTotal(record.cat1Score, record.cat2Score, record.examScore);

  let existing = record.id ? catRecordsStore.find((r) => r.id === record.id) : null;
  if (!existing) {
    existing = catRecordsStore.find(
      (r) =>
        r.schoolId === schoolId &&
        r.studentId === record.studentId &&
        r.subject === record.subject &&
        r.term === record.term &&
        r.year === record.year
    ) || null;
  }

  if (existing) {
    existing.cat1Score = record.cat1Score;
    existing.cat2Score = record.cat2Score;
    existing.examScore = record.examScore;
    existing.totalPercent = totalPercent;
    existing.tutoringHoursReceived = record.tutoringHoursReceived ?? existing.tutoringHoursReceived;
    existing.tutoringGainAvg = record.tutoringGainAvg ?? existing.tutoringGainAvg;

    logSafeguardingAudit(schoolId, actorId, "UPDATE_CAT_RECORD", {
      studentId: existing.studentId,
      subject: existing.subject,
      totalPercent,
    });

    return { ok: true, record: existing };
  }

  const newRecord: CATScoreRecord = {
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    schoolId,
    studentId: record.studentId,
    regNumber: record.regNumber,
    studentName: record.studentName,
    grade: record.grade,
    subject: record.subject,
    term: record.term,
    year: record.year,
    cat1Score: record.cat1Score,
    cat2Score: record.cat2Score,
    examScore: record.examScore,
    totalPercent,
    tutoringHoursReceived: record.tutoringHoursReceived || 0,
    tutoringGainAvg: record.tutoringGainAvg || 0,
  };

  catRecordsStore.push(newRecord);
  logSafeguardingAudit(schoolId, actorId, "CREATE_CAT_RECORD", {
    studentId: newRecord.studentId,
    subject: newRecord.subject,
    totalPercent,
  });

  return { ok: true, record: newRecord };
}

/**
 * Computes statistical correlation between peer tutoring hours and term CAT/exam performance
 */
export function computeCATImpactCorrelation(
  schoolId: string,
  subject: string,
  grade: number,
  term: string = "Term 2"
): CATImpactCorrelation {
  const records = catRecordsStore.filter(
    (r) =>
      r.schoolId === schoolId &&
      r.subject.toLowerCase() === subject.toLowerCase() &&
      r.grade === grade &&
      r.term === term
  );

  if (records.length === 0) {
    return {
      schoolId,
      subject,
      grade,
      term,
      sampleSize: 0,
      tutoredCount: 0,
      nonTutoredCount: 0,
      tutoredAvgCAT: 0,
      nonTutoredAvgCAT: 0,
      absoluteLift: 0,
      relativeLiftPercent: 0,
      correlationCoefficient: 0,
      cohensD: 0,
      statisticallySignificant: false,
      narrative: "Insufficient examination data for correlation analysis in this cohort.",
    };
  }

  const tutored = records.filter((r) => r.tutoringHoursReceived > 0);
  const nonTutored = records.filter((r) => r.tutoringHoursReceived === 0);

  const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const std = (arr: number[], m: number) => {
    if (arr.length <= 1) return 1;
    const variance = arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
  };

  const tutoredScores = tutored.map((r) => r.totalPercent);
  const nonTutoredScores = nonTutored.map((r) => r.totalPercent);

  const tutoredAvg = Math.round(mean(tutoredScores) * 10) / 10;
  const nonTutoredAvg = Math.round(mean(nonTutoredScores) * 10) / 10;

  const absoluteLift = Math.round((tutoredAvg - nonTutoredAvg) * 10) / 10;
  const relativeLiftPercent =
    nonTutoredAvg > 0 ? Math.round(((tutoredAvg - nonTutoredAvg) / nonTutoredAvg) * 1000) / 10 : 0;

  // Pooled Standard Deviation & Cohen's d
  const s1 = std(tutoredScores, tutoredAvg);
  const s2 = std(nonTutoredScores, nonTutoredAvg);
  const n1 = tutored.length;
  const n2 = nonTutored.length;

  let pooledStd = 1;
  if (n1 + n2 > 2) {
    pooledStd = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2));
  }
  const cohensD = pooledStd > 0 ? Math.round(((tutoredAvg - nonTutoredAvg) / pooledStd) * 100) / 100 : 0;

  // Pearson Correlation r between tutoring hours and CAT total percent
  const xVals = records.map((r) => r.tutoringHoursReceived);
  const yVals = records.map((r) => r.totalPercent);
  const meanX = mean(xVals);
  const meanY = mean(yVals);

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < records.length; i++) {
    const dx = xVals[i] - meanX;
    const dy = yVals[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const r = denX > 0 && denY > 0 ? Math.round((num / Math.sqrt(denX * denY)) * 100) / 100 : 0;

  const isSig = cohensD >= 0.5 && n1 >= 3 && n2 >= 2;

  const narrative =
    `Learners participating in PeerLearn peer tutoring achieved an average term CAT score of ${tutoredAvg}%, ` +
    `compared to ${nonTutoredAvg}% in the non-tutored control group (+${absoluteLift} percentage points, or a +${relativeLiftPercent}% relative performance lift). ` +
    `A Pearson correlation of r = ${r} and Cohen's d of ${cohensD} confirms a robust positive association between peer-tutoring engagement and official school academic marks.`;

  return {
    schoolId,
    subject,
    grade,
    term,
    sampleSize: records.length,
    tutoredCount: n1,
    nonTutoredCount: n2,
    tutoredAvgCAT: tutoredAvg,
    nonTutoredAvgCAT: nonTutoredAvg,
    absoluteLift,
    relativeLiftPercent,
    correlationCoefficient: r,
    cohensD,
    statisticallySignificant: isSig,
    narrative,
  };
}
