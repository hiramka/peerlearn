// Content Authoring Service: Lesson Editor, Draft/Publish, Versioning & Libraries (CONT-1 to CONT-3)
import type { Lesson, Topic } from "../../shared/types";
import { lessons, topics } from "./data";

// In-memory curriculum initialized with seed lessons (all published)
export const authoringLessons: Lesson[] = lessons.map((l) => ({
  ...l,
  status: "published",
  version: l.version || 1,
  updated_at: new Date().toISOString(),
}));

/**
 * CONT-1 & CONT-2: Create a new lesson draft.
 */
export function createLesson(data: {
  title: string;
  subject: string;
  grade: number;
  school_id?: string;
  author_id?: string;
  tutorGuide?: string[];
  explanation?: string[];
  pre?: any[];
  post?: any[];
  retention?: any[];
}): Lesson {
  const newTopicId = Math.max(...topics.map((t) => t.id), 0) + 1;

  // Register in topics directory
  const newTopic: Topic = {
    id: newTopicId,
    subject: data.subject || "Math",
    name: data.title,
    grade: Number(data.grade) || 2,
  };
  topics.push(newTopic);

  const newLesson: Lesson = {
    topicId: newTopicId,
    title: data.title,
    version: 1,
    status: "draft",
    school_id: data.school_id,
    author_id: data.author_id,
    grade: Number(data.grade) || 2,
    subject: data.subject || "Math",
    tutorGuide: data.tutorGuide && data.tutorGuide.length > 0 ? data.tutorGuide : [
      "Explain the key concept using a real-world example.",
      "Work through the sample problem together step-by-step.",
      "Have the learner explain the reasoning in their own words.",
    ],
    explanation: data.explanation && data.explanation.length > 0 ? data.explanation : [
      "Understand the fundamentals before attempting problem solving.",
      "Break complex tasks down into single verifiable operations.",
    ],
    pre: data.pre || [],
    post: data.post || [],
    retention: data.retention || [],
    updated_at: new Date().toISOString(),
  };

  authoringLessons.push(newLesson);
  return newLesson;
}

/**
 * CONT-1: Update an existing lesson draft.
 */
export function updateLesson(topicId: number, data: Partial<Lesson>): Lesson {
  const lesson = authoringLessons.find((l) => l.topicId === topicId);
  if (!lesson) {
    throw new Error(`Lesson with topicId ${topicId} not found.`);
  }

  if (data.title) {
    lesson.title = data.title;
    const topic = topics.find((t) => t.id === topicId);
    if (topic) topic.name = data.title;
  }
  if (data.subject) lesson.subject = data.subject;
  if (data.grade) lesson.grade = data.grade;
  if (data.tutorGuide) lesson.tutorGuide = data.tutorGuide;
  if (data.explanation) lesson.explanation = data.explanation;
  if (data.pre) lesson.pre = data.pre;
  if (data.post) lesson.post = data.post;
  if (data.retention) lesson.retention = data.retention;

  lesson.updated_at = new Date().toISOString();
  return lesson;
}

/**
 * CONT-2 (DoD): Publish lesson.
 * Publishing bumps version and transitions status to 'published'.
 * Once published, it becomes downloadable by students.
 */
export function publishLesson(topicId: number): Lesson {
  const lesson = authoringLessons.find((l) => l.topicId === topicId);
  if (!lesson) {
    throw new Error(`Lesson with topicId ${topicId} not found.`);
  }

  // Publishing bumps version
  lesson.version = (lesson.version || 1) + 1;
  lesson.status = "published";
  lesson.updated_at = new Date().toISOString();

  // Also update data.ts lessons reference for runtime queries
  const existingIndex = lessons.findIndex((l) => l.topicId === topicId);
  if (existingIndex >= 0) {
    lessons[existingIndex] = lesson;
  } else {
    lessons.push(lesson);
  }

  return lesson;
}

/**
 * CONT-3: Get curriculum lessons.
 * Supports platform library (!school_id) and per-school custom content.
 * If includeDrafts is false, only published lessons are returned (for student download).
 */
export function getCurriculum(schoolId?: string, includeDrafts: boolean = false): Lesson[] {
  return authoringLessons.filter((l) => {
    // Check school tenant boundary: either universal platform library (no school_id) or belongs to this school
    const isAccessible = !l.school_id || !schoolId || l.school_id === schoolId;
    if (!isAccessible) return false;

    // Student download filter: only published lessons
    if (!includeDrafts && l.status === "draft") return false;

    return true;
  });
}
