import type { ForumQuestion, ForumAnswer, SchoolRole } from "../../shared/types";
import { logSafeguardingAudit } from "./safeguarding";

// In-memory store for Phase 14 Subject Q&A Forum
export const questionsStore: ForumQuestion[] = [
  {
    id: "fq-1",
    schoolId: "s1",
    authorId: "l1",
    authorName: "Amina K. (Form 2)",
    authorRole: "learner",
    grade: 2,
    subject: "Mathematics",
    topicId: 1, // Quadratic Expressions
    title: "How do you factorize 2x² + 7x + 3 using splitting the middle term?",
    content: "I am having trouble finding two numbers whose product is 6 and sum is 7. Can someone walk me through the step-by-step grouping method?",
    formulaOrSnippet: "2x^2 + 7x + 3 = 0",
    upvotes: 8,
    answersCount: 2,
    isResolved: true,
    acceptedAnswerId: "fa-1",
    createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
  },
  {
    id: "fq-2",
    schoolId: "s1",
    authorId: "l2",
    authorName: "Brian O. (Form 3)",
    authorRole: "learner",
    grade: 3,
    subject: "Chemistry",
    topicId: 2, // Gas Laws & Boyle's Law
    title: "Boyle's Law: Why does gas pressure increase when volume is halved at constant temperature?",
    content: "In Boyle's Law experiments with a syringe, when volume decreases from 20cm³ to 10cm³, the Bourdon gauge reading doubles. How do we explain this in terms of Kinetic Theory of Matter?",
    formulaOrSnippet: "P_1 * V_1 = P_2 * V_2",
    upvotes: 5,
    answersCount: 1,
    isResolved: true,
    acceptedAnswerId: "fa-3",
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
  },
  {
    id: "fq-3",
    schoolId: "s1",
    authorId: "l3",
    authorName: "Faith W. (Form 1)",
    authorRole: "learner",
    grade: 1,
    subject: "Physics",
    topicId: 5, // Measurement & Density
    title: "How to accurately measure the volume of an irregular stone with zero water splash?",
    content: "When using a displacement (eureka) can and a measuring cylinder, what precautions ensure zero error in recording stone volume?",
    upvotes: 4,
    answersCount: 1,
    isResolved: false,
    createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
  },
  {
    id: "fq-4",
    schoolId: "s1",
    authorId: "l4",
    authorName: "David M. (Grade 8)",
    authorRole: "learner",
    grade: 8,
    subject: "Integrated Science",
    topicId: 7, // Living Things & Cells
    title: "Differences between Plant and Animal cells observed in CBC practical",
    content: "We stained an onion epidermal peel with iodine and human cheek cells with methylene blue. What organelles are visible only in the plant cell?",
    upvotes: 6,
    answersCount: 1,
    isResolved: true,
    acceptedAnswerId: "fa-4",
    createdAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
  },
];

export const answersStore: ForumAnswer[] = [
  {
    id: "fa-1",
    questionId: "fq-1",
    schoolId: "s1",
    authorId: "t1",
    authorName: "Kelvin M. (Certified Peer Tutor)",
    authorRole: "tutor",
    isCertifiedTutor: true,
    content: "Great question Amina! Here is the Socratic step-by-step breakdown using the AC method.",
    steps: [
      "1. Identify coefficients: a = 2, b = 7, c = 3.",
      "2. Multiply a * c = 2 * 3 = 6.",
      "3. Find factors of 6 that add up to b (7): 6 and 1 (6 * 1 = 6, 6 + 1 = 7).",
      "4. Split the middle term: 2x² + 6x + x + 3.",
      "5. Factor by grouping: 2x(x + 3) + 1(x + 3).",
      "6. Common binomial factor: (2x + 1)(x + 3). Check by expanding!"
    ],
    upvotes: 11,
    isAccepted: true,
    createdAt: new Date(Date.now() - 3600 * 1000 * 46).toISOString(),
  },
  {
    id: "fa-2",
    questionId: "fq-1",
    schoolId: "s1",
    authorId: "t2",
    authorName: "Sarah N. (Peer Tutor)",
    authorRole: "tutor",
    content: "You can also verify with the quadratic formula x = (-b ± √(b² - 4ac))/(2a) to confirm roots are x = -1/2 and x = -3.",
    upvotes: 3,
    isAccepted: false,
    createdAt: new Date(Date.now() - 3600 * 1000 * 40).toISOString(),
  },
  {
    id: "fa-3",
    questionId: "fq-2",
    schoolId: "s1",
    authorId: "t1",
    authorName: "Kelvin M. (Certified Peer Tutor)",
    authorRole: "tutor",
    isCertifiedTutor: true,
    content: "According to the Kinetic Theory: Gas particles move in continuous random motion and collide with container walls.",
    steps: [
      "1. Constant temperature means average kinetic energy of gas molecules remains unchanged.",
      "2. Halving the volume halves the surface area of the syringe walls.",
      "3. The frequency of particle collisions per unit surface area per second doubles.",
      "4. Since Pressure = Force / Area, double the collision rate yields double the measured pressure."
    ],
    upvotes: 7,
    isAccepted: true,
    createdAt: new Date(Date.now() - 3600 * 1000 * 22).toISOString(),
  },
  {
    id: "fa-4",
    questionId: "fq-4",
    schoolId: "s1",
    authorId: "t3",
    authorName: "Dennis K. (Peer Tutor)",
    authorRole: "tutor",
    isCertifiedTutor: true,
    content: "Under light microscope observation for Grade 8 CBC practicals:",
    steps: [
      "1. Cellulose Cell Wall: Visible in onion peel, absent in animal cheek cells.",
      "2. Large Central Sap Vacuole: Pushes the nucleus to the periphery in plant cells.",
      "3. Chloroplasts: Present in green leaf cells (though absent in underground onion bulbs).",
      "4. Regular/Fixed Shape: Plant cells have rigid rectangular shape; cheek cells have irregular shape."
    ],
    upvotes: 8,
    isAccepted: true,
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
  },
];

// Track votes to prevent duplicate voting: "targetId:userId"
const userVotesSet = new Set<string>();

/**
 * Automated text safeguard filter for minors in Kenyan schools:
 * Flags phone numbers (+254, 07xx, 01xx), social media handles, external contact solicitation, or inappropriate keywords.
 */
export function checkForumContentSafeguard(text: string): { flagged: boolean; reason?: string } {
  const phoneRegex = /(\+?254|0)[17]\d{8}/;
  if (phoneRegex.test(text.replace(/[\s\-_]/g, ""))) {
    return { flagged: true, reason: "Sharing personal telephone or WhatsApp numbers is prohibited for student safety." };
  }

  const socialRegex = /\b(whatsapp|telegram|instagram|snapchat|tiktok|dm me|inbox me|call me)\b/i;
  if (socialRegex.test(text)) {
    return { flagged: true, reason: "Off-platform contact solicitation is prohibited under Kenya DPA 2019 safeguarding rules." };
  }

  const inappropriateRegex = /\b(leak|cheat|exam leak|knec leak|porn|abuse|stupid|idiot)\b/i;
  if (inappropriateRegex.test(text)) {
    return { flagged: true, reason: "Content contains flagged non-academic or inappropriate keywords." };
  }

  return { flagged: false };
}

export function getForumQuestions(
  schoolId: string,
  filters?: {
    subject?: string;
    grade?: number;
    resolved?: boolean;
    search?: string;
  }
): ForumQuestion[] {
  return questionsStore
    .filter((q) => {
      if (q.schoolId !== schoolId) return false;
      if (filters?.subject && filters.subject !== "All" && q.subject.toLowerCase() !== filters.subject.toLowerCase()) {
        return false;
      }
      if (filters?.grade && q.grade !== filters.grade) return false;
      if (filters?.resolved !== undefined && q.isResolved !== filters.resolved) return false;
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        const matches =
          q.title.toLowerCase().includes(query) ||
          q.content.toLowerCase().includes(query) ||
          q.subject.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getQuestionById(questionId: string): { question: ForumQuestion | null; answers: ForumAnswer[] } {
  const question = questionsStore.find((q) => q.id === questionId) || null;
  const answers = answersStore
    .filter((a) => a.questionId === questionId)
    .sort((a, b) => (b.isAccepted ? 1 : 0) - (a.isAccepted ? 1 : 0) || b.upvotes - a.upvotes);
  return { question, answers };
}

export function createForumQuestion(data: {
  schoolId: string;
  authorId: string;
  authorName: string;
  authorRole: SchoolRole;
  grade: number;
  subject: string;
  topicId?: number;
  title: string;
  content: string;
  formulaOrSnippet?: string;
}): { ok: boolean; question?: ForumQuestion; error?: string } {
  if (!data.title || !data.content || !data.subject) {
    return { ok: false, error: "Title, content, and subject are required." };
  }

  const safeguard = checkForumContentSafeguard(`${data.title} ${data.content}`);
  if (safeguard.flagged) {
    logSafeguardingAudit(data.schoolId, data.authorId, "FORUM_CONTENT_FLAGGED", {
      reason: safeguard.reason,
      snippet: data.title.slice(0, 40),
    });
    return { ok: false, error: safeguard.reason };
  }

  const question: ForumQuestion = {
    id: `fq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    schoolId: data.schoolId,
    authorId: data.authorId,
    authorName: data.authorName,
    authorRole: data.authorRole,
    grade: data.grade,
    subject: data.subject,
    topicId: data.topicId,
    title: data.title.trim(),
    content: data.content.trim(),
    formulaOrSnippet: data.formulaOrSnippet?.trim(),
    upvotes: 0,
    answersCount: 0,
    isResolved: false,
    createdAt: new Date().toISOString(),
  };

  questionsStore.unshift(question);
  return { ok: true, question };
}

export function createForumAnswer(data: {
  questionId: string;
  schoolId: string;
  authorId: string;
  authorName: string;
  authorRole: SchoolRole;
  isCertifiedTutor?: boolean;
  content: string;
  steps?: string[];
}): { ok: boolean; answer?: ForumAnswer; error?: string } {
  const question = questionsStore.find((q) => q.id === data.questionId);
  if (!question) {
    return { ok: false, error: "Question not found." };
  }

  const combinedText = `${data.content} ${(data.steps || []).join(" ")}`;
  const safeguard = checkForumContentSafeguard(combinedText);
  if (safeguard.flagged) {
    logSafeguardingAudit(data.schoolId, data.authorId, "FORUM_ANSWER_FLAGGED", {
      reason: safeguard.reason,
      questionId: data.questionId,
    });
    return { ok: false, error: safeguard.reason };
  }

  const answer: ForumAnswer = {
    id: `fa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    questionId: data.questionId,
    schoolId: data.schoolId,
    authorId: data.authorId,
    authorName: data.authorName,
    authorRole: data.authorRole,
    isCertifiedTutor: data.isCertifiedTutor,
    content: data.content.trim(),
    steps: data.steps && data.steps.length > 0 ? data.steps.filter((s) => s.trim().length > 0) : undefined,
    upvotes: 0,
    isAccepted: false,
    createdAt: new Date().toISOString(),
  };

  answersStore.push(answer);
  question.answersCount += 1;
  return { ok: true, answer };
}

export function voteForumItem(
  type: "question" | "answer",
  targetId: string,
  userId: string
): { ok: boolean; upvotes: number; alreadyVoted?: boolean } {
  const key = `${type}:${targetId}:${userId}`;
  if (userVotesSet.has(key)) {
    // Unvote
    userVotesSet.delete(key);
    if (type === "question") {
      const q = questionsStore.find((item) => item.id === targetId);
      if (q) q.upvotes = Math.max(0, q.upvotes - 1);
      return { ok: true, upvotes: q?.upvotes || 0, alreadyVoted: false };
    } else {
      const a = answersStore.find((item) => item.id === targetId);
      if (a) a.upvotes = Math.max(0, a.upvotes - 1);
      return { ok: true, upvotes: a?.upvotes || 0, alreadyVoted: false };
    }
  }

  userVotesSet.add(key);
  if (type === "question") {
    const q = questionsStore.find((item) => item.id === targetId);
    if (!q) return { ok: false, upvotes: 0 };
    q.upvotes += 1;
    return { ok: true, upvotes: q.upvotes, alreadyVoted: true };
  } else {
    const a = answersStore.find((item) => item.id === targetId);
    if (!a) return { ok: false, upvotes: 0 };
    a.upvotes += 1;
    return { ok: true, upvotes: a.upvotes, alreadyVoted: true };
  }
}

export function acceptForumAnswer(
  questionId: string,
  answerId: string,
  actorId: string
): { ok: boolean; error?: string } {
  const question = questionsStore.find((q) => q.id === questionId);
  if (!question) return { ok: false, error: "Question not found." };

  const answer = answersStore.find((a) => a.id === answerId && a.questionId === questionId);
  if (!answer) return { ok: false, error: "Answer not found for this question." };

  // Clear previous accepted if any
  answersStore.forEach((a) => {
    if (a.questionId === questionId) a.isAccepted = false;
  });

  answer.isAccepted = true;
  question.isResolved = true;
  question.acceptedAnswerId = answerId;

  logSafeguardingAudit(question.schoolId, actorId, "ACCEPT_FORUM_SOLUTION", {
    questionId,
    answerId,
    tutorId: answer.authorId,
  });

  return { ok: true };
}
