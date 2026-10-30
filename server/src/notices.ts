import type { SchoolNotice, SchoolRole } from "../../shared/types";
import { logSafeguardingAudit } from "./safeguarding";
import { sendSMS } from "./telecom";

export const schoolNoticesStore: SchoolNotice[] = [
  {
    id: "not-1",
    schoolId: "s1",
    authorId: "t-admin",
    authorName: "Mr. Otieno (Head of Mathematics)",
    authorRole: "teacher",
    title: "Form 2 & 3 Mathematics Remedial Lab Clinic",
    category: "academic",
    targetGrades: [2, 3],
    content: "Peer tutoring clinic for Quadratic Expressions and Linear Motion will run every Tuesday and Thursday from 4:15 PM - 5:15 PM in Computer Lab 1. Certified peer tutors please arrive 10 minutes early.",
    isPinned: true,
    smsBroadcasted: true,
    createdAt: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
  },
  {
    id: "not-2",
    schoolId: "s1",
    authorId: "t-admin",
    authorName: "Mrs. Wanjiku (Director of Studies)",
    authorRole: "school_admin",
    title: "Term 2 CAT 2 Science Practical Timetable",
    category: "exam_timetable",
    targetGrades: [1, 2, 3, 4],
    content: "Continuous Assessment Test 2 (CAT 2) commences next Monday. Chemistry Paper 3 practicals will be conducted in two shifts (Form 3A morning, Form 3B afternoon). Please review Gas Laws and Volumetric Analysis.",
    isPinned: true,
    smsBroadcasted: false,
    createdAt: new Date(Date.now() - 3600 * 1000 * 36).toISOString(),
  },
  {
    id: "not-3",
    schoolId: "s1",
    authorId: "t-admin",
    authorName: "Mr. Kiprop (Science HOD)",
    authorRole: "teacher",
    title: "CBC Grade 8 Integrated Science Projects Due Date",
    category: "academic",
    targetGrades: [8],
    content: "Grade 8 learners must submit their microscope cell-drawing portfolios and plant classification charts by Friday 3:00 PM to Mr. Kiprop in the science department.",
    isPinned: false,
    smsBroadcasted: false,
    createdAt: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
  },
  {
    id: "not-4",
    schoolId: "s1",
    authorId: "t-admin",
    authorName: "ICT Administrator",
    authorRole: "school_admin",
    title: "Offline Raspberry Pi Lab Appliance Update Completed",
    category: "general",
    targetGrades: [],
    content: "The local PeerLearn server cache has been updated with 8 new STEM lesson packs and KCSE 2023 revision papers. Offline sessions will sync automatically upon network reconnection.",
    isPinned: false,
    smsBroadcasted: false,
    createdAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
  },
];

export function getSchoolNotices(schoolId: string, grade?: number): SchoolNotice[] {
  return schoolNoticesStore
    .filter((n) => {
      if (n.schoolId !== schoolId) return false;
      if (grade && n.targetGrades.length > 0 && !n.targetGrades.includes(grade)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Pinned notices first, then newest
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function createSchoolNotice(data: {
  schoolId: string;
  authorId: string;
  authorName: string;
  authorRole: SchoolRole;
  title: string;
  category: "academic" | "exam_timetable" | "urgent" | "general";
  targetGrades?: number[];
  content: string;
  isPinned?: boolean;
  broadcastSMS?: boolean;
}): { ok: boolean; notice?: SchoolNotice; error?: string } {
  if (!data.title || !data.content) {
    return { ok: false, error: "Notice title and content are required." };
  }

  const notice: SchoolNotice = {
    id: `not-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    schoolId: data.schoolId,
    authorId: data.authorId,
    authorName: data.authorName,
    authorRole: data.authorRole,
    title: data.title.trim(),
    category: data.category || "general",
    targetGrades: data.targetGrades || [],
    content: data.content.trim(),
    isPinned: !!data.isPinned,
    smsBroadcasted: !!data.broadcastSMS,
    createdAt: new Date().toISOString(),
  };

  schoolNoticesStore.unshift(notice);

  // If broadcast SMS is requested, log to telecom system
  if (data.broadcastSMS) {
    sendSMS(
      "+254700000000", // Broadcast trunk
      `[PeerLearn Notice] ${data.title}: ${data.content.slice(0, 100)}...`
    );
  }

  logSafeguardingAudit(data.schoolId, data.authorId, "CREATE_SCHOOL_NOTICE", {
    noticeId: notice.id,
    title: notice.title,
    category: notice.category,
    broadcastSMS: data.broadcastSMS,
  });

  return { ok: true, notice };
}

export function togglePinSchoolNotice(
  schoolId: string,
  noticeId: string,
  isPinned: boolean,
  actorId: string
): { ok: boolean; error?: string } {
  const notice = schoolNoticesStore.find((n) => n.id === noticeId && n.schoolId === schoolId);
  if (!notice) return { ok: false, error: "Notice not found." };

  notice.isPinned = isPinned;
  logSafeguardingAudit(schoolId, actorId, "PIN_NOTICE", { noticeId, isPinned });
  return { ok: true };
}

export function deleteSchoolNotice(
  schoolId: string,
  noticeId: string,
  actorId: string
): { ok: boolean; error?: string } {
  const index = schoolNoticesStore.findIndex((n) => n.id === noticeId && n.schoolId === schoolId);
  if (index === -1) return { ok: false, error: "Notice not found." };

  schoolNoticesStore.splice(index, 1);
  logSafeguardingAudit(schoolId, actorId, "DELETE_NOTICE", { noticeId });
  return { ok: true };
}
