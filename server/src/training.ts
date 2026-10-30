import type { TutorTrainingModule, TutorTrainingProgress } from "../../shared/types";
import { tutors } from "./data";
import { logAudit } from "./safeguarding";

export const defaultTrainingModules: TutorTrainingModule[] = [
  {
    id: "mod-1",
    title: "Socratic Questioning & Active Listening",
    subtitle: "Guide peers to discover answers instead of spoon-feeding solutions",
    principles: [
      "Never grab the pen or write the answer on your peer's paper",
      "Ask 'What is the first step we know?' before giving hints",
      "Give at least 10 seconds of wait time for the learner to think",
      "Celebrate the reasoning process, not just the final number",
    ],
    scenario:
      "A Form 1 student says: 'I do not know how to solve 2x + 6 = 14. Just tell me what x is so I can write it down.' What is the best pedagogical response?",
    quiz: {
      question: "How should you respond as a certified peer tutor?",
      options: [
        "Tell them x = 4 quickly so you can finish the 20-minute session on time.",
        "Take their pen, solve the equation step-by-step on their page, and tell them to copy it.",
        "Ask: 'If we want x by itself, what number is currently added to 2x that we can undo first?'",
        "Say: 'This is easy Form 1 math, you should already know how to do this.'",
      ],
      correctAnswer: 2,
      explanation:
        "Guiding questions (Socratic method) build long-term retention and conceptual mastery without creating dependency on the tutor.",
    },
  },
  {
    id: "mod-2",
    title: "Growth Mindset & Mistake Normalization",
    subtitle: "Turn frustration into breakthroughs during difficult science & math problems",
    principles: [
      "Mistakes in secondary school STEM are valuable diagnostics, not signs of low intelligence",
      "Point out what part of the peer's calculation was actually correct before addressing the error",
      "Replace 'You are wrong' with 'Let us re-check line 2 together'",
      "Encourage effort over innate 'genius' talent",
    ],
    scenario:
      "A learner gets an incorrect answer when balancing a chemical equation and slams their pencil down in defeat: 'I am terrible at chemistry, I will never pass KCSE.' What do you do?",
    quiz: {
      question: "Which approach best reinforces a growth mindset?",
      options: [
        "Acknowledge their frustration: 'Balancing equations is challenging at first! You got the reactants right. Let us count oxygen atoms together.'",
        "Agree with them that chemistry is only for students with high natural aptitude.",
        "Ignore their reaction completely and immediately move to the next quiz question.",
        "Give them a passing grade anyway so they feel better.",
      ],
      correctAnswer: 0,
      explanation:
        "Validating feelings while anchoring praise in specific partial progress builds resilience and self-efficacy.",
    },
  },
  {
    id: "mod-3",
    title: "20-Minute Time & Pace Management",
    subtitle: "Structuring a high-yield peer tutoring session within the bell schedule",
    principles: [
      "Minutes 0-3: Pre-quiz diagnostic to identify specific misconception",
      "Minutes 3-7: Concept review and step-by-step tutor guide",
      "Minutes 7-15: Collaborative practice where learner controls the pencil",
      "Minutes 15-20: Disjoint post-quiz and respectful constructive feedback",
    ],
    scenario:
      "You notice 12 minutes have elapsed and you are still reviewing the theory guide, with zero time spent on practice problems. How do you adjust?",
    quiz: {
      question: "What is the correct pacing intervention?",
      options: [
        "Skip the practice entirely and jump straight to the post-quiz.",
        "Pause the theory and say: 'Let us try problem #1 together right now so you can practice before our time is up.'",
        "Keep talking about theory until the 20-minute timer runs out.",
        "Ask the teacher for a 45-minute extension during the next lesson period.",
      ],
      correctAnswer: 1,
      explanation:
        "Active practice by the learner is where learning gains happen. Pivot promptly to student practice by minute 7-8.",
    },
  },
  {
    id: "mod-4",
    title: "Safeguarding, Privacy & Boundary Awareness",
    subtitle: "Kenya DPA compliance, school safety, and reporting procedures",
    principles: [
      "All sessions must happen on school grounds in supervised classrooms or library areas",
      "Never exchange personal phone numbers, social media handles, or home contacts",
      "Never share or mock a classmate's diagnostic test score with other students",
      "Immediately report any bullying, inappropriate comments, or distress using 'Report a Problem'",
    ],
    scenario:
      "After a session, a peer asks: 'Can you give me your WhatsApp number so you can help me with homework tonight after prep?'",
    quiz: {
      question: "What is the correct protocol according to PeerLearn safeguarding rules?",
      options: [
        "Give them your WhatsApp number as long as you only discuss schoolwork.",
        "Politely decline: 'PeerLearn sessions are strictly on school grounds. Let us schedule our next session in the library during prep.'",
        "Give them a fake phone number to avoid hurting their feelings.",
        "Exchange Instagram handles instead of WhatsApp numbers.",
      ],
      correctAnswer: 1,
      explanation:
        "Strict boundaries protect both learners and tutors, complying with Kenya DPA 2019 child protection standards.",
    },
  },
];

// In-memory store for tutor training progress
export const tutorTrainingProgressStore = new Map<string, TutorTrainingProgress>();

export function getTrainingModules(): TutorTrainingModule[] {
  return defaultTrainingModules;
}

export function getTutorTrainingProgress(tutorId: string): TutorTrainingProgress {
  let progress = tutorTrainingProgressStore.get(tutorId);
  if (!progress) {
    const tutor = tutors.find((t) => t.id === tutorId);
    progress = {
      tutorId,
      completedModuleIds: tutor?.completedModules || [],
      certifiedBadge: !!tutor?.trainingCompleted,
      certifiedAt: tutor?.trainingCompleted ? new Date().toISOString() : undefined,
    };
    tutorTrainingProgressStore.set(tutorId, progress);
  }
  return progress;
}

export function completeTrainingModule(
  tutorId: string,
  moduleId: string,
  selectedAnswer: number
): {
  ok: boolean;
  correct: boolean;
  explanation: string;
  progress: TutorTrainingProgress;
  certifiedNow: boolean;
  message: string;
} {
  const mod = defaultTrainingModules.find((m) => m.id === moduleId);
  if (!mod) {
    throw new Error(`Module ${moduleId} not found`);
  }

  const isCorrect = selectedAnswer === mod.quiz.correctAnswer;
  let progress = getTutorTrainingProgress(tutorId);

  if (!isCorrect) {
    return {
      ok: false,
      correct: false,
      explanation: mod.quiz.explanation,
      progress,
      certifiedNow: false,
      message: "Incorrect answer. Review the core principles and try again.",
    };
  }

  if (!progress.completedModuleIds.includes(moduleId)) {
    progress.completedModuleIds.push(moduleId);
  }

  let certifiedNow = false;
  const allCompleted = defaultTrainingModules.every((m) =>
    progress.completedModuleIds.includes(m.id)
  );

  if (allCompleted && !progress.certifiedBadge) {
    progress.certifiedBadge = true;
    progress.certifiedAt = new Date().toISOString();
    certifiedNow = true;

    // Update tutor in tutors store
    const tutor = tutors.find((t) => t.id === tutorId);
    if (tutor) {
      tutor.trainingCompleted = true;
      tutor.completedModules = [...progress.completedModuleIds];
    }

    logAudit("s1", tutorId, "TUTOR_PEDAGOGICAL_CERTIFICATION_EARNED", {
      tutorId,
      modulesCompleted: progress.completedModuleIds.length,
      certifiedAt: progress.certifiedAt,
    });
  }

  tutorTrainingProgressStore.set(tutorId, progress);

  return {
    ok: true,
    correct: true,
    explanation: mod.quiz.explanation,
    progress,
    certifiedNow,
    message: certifiedNow
      ? "Outstanding! You have completed all pedagogical training modules and earned the Certified Peer Tutor Badge!"
      : `Module "${mod.title}" completed successfully (${progress.completedModuleIds.length}/${defaultTrainingModules.length})!`,
  };
}

export function resetTrainingProgress(): void {
  tutorTrainingProgressStore.clear();
}
