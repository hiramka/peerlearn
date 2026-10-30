import type { TopicPrerequisiteNode, AdaptiveRecommendation } from "../../shared/types";
import { topics } from "./data";

export const defaultPrerequisiteGraph: TopicPrerequisiteNode[] = [
  {
    topicId: 100,
    topicName: "Integers & Basic Algebraic Notation",
    subject: "Math",
    grade: 1,
    prerequisiteTopicIds: [],
    progressionTopicIds: [1],
  },
  {
    topicId: 3,
    topicName: "Commercial Arithmetic: Profit, Loss & Simple Interest",
    subject: "Math",
    grade: 1,
    prerequisiteTopicIds: [100],
    progressionTopicIds: [1],
  },
  {
    topicId: 1,
    topicName: "Solving linear equations",
    subject: "Math",
    grade: 2,
    prerequisiteTopicIds: [100, 3],
    progressionTopicIds: [201, 7],
  },
  {
    topicId: 7,
    topicName: "Quadratic Expressions & Equations",
    subject: "Math",
    grade: 3,
    prerequisiteTopicIds: [1],
    progressionTopicIds: [301],
  },
  {
    topicId: 201,
    topicName: "Quadratic Expressions & Equations (Advanced)",
    subject: "Math",
    grade: 3,
    prerequisiteTopicIds: [1],
    progressionTopicIds: [301],
  },
  {
    topicId: 301,
    topicName: "Calculus & Rate of Change",
    subject: "Math",
    grade: 4,
    prerequisiteTopicIds: [201, 7],
    progressionTopicIds: [],
  },
  {
    topicId: 200,
    topicName: "Mixtures, Elements & Particle Intro",
    subject: "Science",
    grade: 1,
    prerequisiteTopicIds: [],
    progressionTopicIds: [2],
  },
  {
    topicId: 5,
    topicName: "Measurement & Fluid Pressure",
    subject: "Physics",
    grade: 1,
    prerequisiteTopicIds: [200],
    progressionTopicIds: [2],
  },
  {
    topicId: 2,
    topicName: "States of matter",
    subject: "Science",
    grade: 2,
    prerequisiteTopicIds: [200, 5],
    progressionTopicIds: [202, 6],
  },
  {
    topicId: 6,
    topicName: "Structure of the Atom & Periodic Table",
    subject: "Chemistry",
    grade: 2,
    prerequisiteTopicIds: [2],
    progressionTopicIds: [202, 302],
  },
  {
    topicId: 202,
    topicName: "Gas Laws & Kinetic Theory",
    subject: "Science",
    grade: 3,
    prerequisiteTopicIds: [2, 6],
    progressionTopicIds: [302],
  },
  {
    topicId: 4,
    topicName: "Cell Structure & Organization",
    subject: "Biology",
    grade: 1,
    prerequisiteTopicIds: [],
    progressionTopicIds: [8],
  },
  {
    topicId: 8,
    topicName: "Human Body Systems: Nutrition & Digestion",
    subject: "Integrated Science",
    grade: 8,
    prerequisiteTopicIds: [4],
    progressionTopicIds: [302],
  },
  {
    topicId: 302,
    topicName: "Chemical Kinetics & Thermodynamics",
    subject: "Science",
    grade: 4,
    prerequisiteTopicIds: [202, 6],
    progressionTopicIds: [],
  },
];

export function getPrerequisiteGraph(): TopicPrerequisiteNode[] {
  return defaultPrerequisiteGraph;
}

export function getTopicNode(topicId: number): TopicPrerequisiteNode | undefined {
  return defaultPrerequisiteGraph.find((node) => node.topicId === topicId);
}

export function getAdaptiveRecommendations(
  _studentId: string,
  topicId: number,
  score: number
): AdaptiveRecommendation {
  const node = getTopicNode(topicId);
  const currentTopic = topics.find((t) => t.id === topicId) || {
    id: topicId,
    name: node ? node.topicName : `Topic #${topicId}`,
    grade: node ? node.grade : 2,
    subject: node ? node.subject : "General",
  };

  // Case 1: Remediation needed (< 50% score)
  if (score < 0.5) {
    if (node && node.prerequisiteTopicIds.length > 0) {
      const prereqId = node.prerequisiteTopicIds[0];
      const prereqNode = getTopicNode(prereqId);
      return {
        type: "remediation_prerequisite",
        reason: `Score of ${(score * 100).toFixed(0)}% indicates foundational gaps in prerequisites before mastering ${currentTopic.name}.`,
        recommendedTopicId: prereqId,
        recommendedTopicName: prereqNode ? prereqNode.topicName : `Prerequisite #${prereqId}`,
        recommendedGrade: prereqNode ? prereqNode.grade : Math.max(1, currentTopic.grade - 1),
      };
    }

    return {
      type: "remediation_prerequisite",
      reason: `Score of ${(score * 100).toFixed(0)}% suggests reviewing foundational Form 1 concepts for ${currentTopic.subject}.`,
      recommendedTopicId: topicId,
      recommendedTopicName: `${currentTopic.name} (Foundational Review)`,
      recommendedGrade: Math.max(1, currentTopic.grade - 1),
    };
  }

  // Case 2: Reinforce current topic (50% to 79% score)
  if (score < 0.8) {
    return {
      type: "reinforce_current",
      reason: `Good start (${(score * 100).toFixed(0)}%)! One additional 20-minute guided peer practice session will push you above the 80% mastery threshold.`,
      recommendedTopicId: topicId,
      recommendedTopicName: currentTopic.name,
      recommendedGrade: currentTopic.grade,
    };
  }

  // Case 3: Mastery achieved (>= 80% score) -> Unlock progression
  if (node && node.progressionTopicIds.length > 0) {
    const nextId = node.progressionTopicIds[0];
    const nextNode = getTopicNode(nextId);
    return {
      type: "progression_advance",
      reason: `Mastery achieved (${(score * 100).toFixed(0)}%)! You have unlocked higher-level Form ${nextNode?.grade || currentTopic.grade + 1} topics.`,
      recommendedTopicId: nextId,
      recommendedTopicName: nextNode ? nextNode.topicName : `Topic #${nextId}`,
      recommendedGrade: nextNode ? nextNode.grade : currentTopic.grade + 1,
    };
  }

  return {
    type: "progression_advance",
    reason: `Mastery achieved (${(score * 100).toFixed(0)}%)! You are fully qualified to tutor peers on ${currentTopic.name} and advance to term exams.`,
    recommendedTopicId: topicId,
    recommendedTopicName: `${currentTopic.name} (KCSE Mastery)`,
    recommendedGrade: currentTopic.grade,
  };
}
