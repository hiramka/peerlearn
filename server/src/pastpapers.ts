import type { PastPaperResource } from "../../shared/types";

export const pastPapersStore: PastPaperResource[] = [
  {
    id: "pp-kcse-2023-math-1",
    title: "KCSE 2023 Mathematics Paper 1 (Alt A)",
    subject: "Mathematics",
    level: "KCSE",
    grade: 4,
    year: 2023,
    paperNumber: 1,
    term: "National Exam",
    fileSize: "1.4 MB",
    hasMarkingScheme: true,
    sampleQuestions: [
      {
        qNumber: "Section I Q4",
        text: "Factorize completely the quadratic expression: 3x² - 10x + 8.",
        marks: 3,
        topicId: 1, // Quadratic Expressions
        solution: "1. Identify product ac = 3 * 8 = 24 and sum b = -10.\n2. Factors are -6 and -4 (-6 * -4 = 24, -6 + -4 = -10).\n3. Split middle term: 3x² - 6x - 4x + 8.\n4. Group: 3x(x - 2) - 4(x - 2).\n5. Solution: (3x - 4)(x - 2) [M1 for factor pairs, M1 for grouping, A1 for final factors].",
      },
      {
        qNumber: "Section I Q9",
        text: "The coordinates of points P and Q are (2, 5) and (6, -3) respectively. Find the equation of the perpendicular bisector of line PQ in the form y = mx + c.",
        marks: 4,
        topicId: 4,
        solution: "1. Midpoint M = ((2+6)/2, (5-3)/2) = (4, 1).\n2. Gradient of PQ = (-3 - 5)/(6 - 2) = -8/4 = -2.\n3. Perpendicular gradient m_perp = -1 / (-2) = 1/2.\n4. Equation using M(4, 1): y - 1 = (1/2)(x - 4) => y = (1/2)x - 2 + 1 => y = 0.5x - 1.",
      },
    ],
  },
  {
    id: "pp-kcse-2023-math-2",
    title: "KCSE 2023 Mathematics Paper 2 (Alt A)",
    subject: "Mathematics",
    level: "KCSE",
    grade: 4,
    year: 2023,
    paperNumber: 2,
    term: "National Exam",
    fileSize: "1.6 MB",
    hasMarkingScheme: true,
    sampleQuestions: [
      {
        qNumber: "Section I Q2",
        text: "Solve for x in the equation: 2 log_10(x) - log_10(x - 1) = log_10(4).",
        marks: 3,
        solution: "1. Apply power law: log_10(x²) - log_10(x - 1) = log_10(4).\n2. Apply quotient rule: log_10(x² / (x - 1)) = log_10(4).\n3. Equate arguments: x² / (x - 1) = 4 => x² = 4x - 4 => x² - 4x + 4 = 0.\n4. (x - 2)² = 0 => x = 2. Verify domain: x > 1 (valid).",
      },
    ],
  },
  {
    id: "pp-kcse-2022-chem-1",
    title: "KCSE 2022 Chemistry Paper 1 (Theory)",
    subject: "Chemistry",
    level: "KCSE",
    grade: 4,
    year: 2022,
    paperNumber: 1,
    term: "National Exam",
    fileSize: "1.2 MB",
    hasMarkingScheme: true,
    sampleQuestions: [
      {
        qNumber: "Q7",
        text: "A fixed mass of an ideal gas occupies 300 cm³ at a pressure of 750 mmHg and temperature of 27°C. Calculate the volume occupied by the gas at s.t.p. (Standard temperature = 0°C, Standard pressure = 760 mmHg).",
        marks: 3,
        topicId: 2, // Gas Laws
        solution: "1. Identify variables: V1 = 300 cm³, P1 = 750 mmHg, T1 = 27 + 273 = 300 K.\n2. Standard conditions: P2 = 760 mmHg, T2 = 0 + 273 = 273 K.\n3. Combined gas law: (P1 * V1) / T1 = (P2 * V2) / T2.\n4. (750 * 300) / 300 = (760 * V2) / 273 => 750 = (760 * V2) / 273.\n5. V2 = (750 * 273) / 760 = 269.41 cm³.",
      },
    ],
  },
  {
    id: "pp-kcse-2022-chem-2",
    title: "KCSE 2022 Chemistry Paper 2 (Theory & Calculations)",
    subject: "Chemistry",
    level: "KCSE",
    grade: 4,
    year: 2022,
    paperNumber: 2,
    term: "National Exam",
    fileSize: "1.5 MB",
    hasMarkingScheme: true,
    sampleQuestions: [
      {
        qNumber: "Q3 (a)",
        text: "Explain why dry chlorine gas does not bleach dry blue litmus paper, whereas moist chlorine gas turns it red then white.",
        marks: 3,
        solution: "1. Dry chlorine exists as molecular Cl2 without acid properties (no bleaching action).\n2. When moist, chlorine dissolves in water to form a mixture of hydrochloric acid (HCl) and hypochlorous (chloric I) acid (HOCl).\n3. HCl turns blue litmus red due to H+ ions.\n4. HOCl dissociates and donates an active oxygen atom [O] to the dye, oxidizing and decolorizing it (bleaching).",
      },
    ],
  },
  {
    id: "pp-kcse-2023-phys-1",
    title: "KCSE 2023 Physics Paper 1 (Mechanics & Heat)",
    subject: "Physics",
    level: "KCSE",
    grade: 4,
    year: 2023,
    paperNumber: 1,
    term: "National Exam",
    fileSize: "1.3 MB",
    hasMarkingScheme: true,
    sampleQuestions: [
      {
        qNumber: "Section A Q5",
        text: "A stone of mass 120 g is immersed in water in a measuring cylinder containing 40 cm³ of water. The water level rises to 88 cm³. Calculate the density of the stone in kg/m³.",
        marks: 3,
        topicId: 5, // Measurement & Density
        solution: "1. Volume of stone V = 88 - 40 = 48 cm³.\n2. Density in g/cm³ = Mass / Volume = 120 / 48 = 2.5 g/cm³.\n3. Convert to SI units (kg/m³): 2.5 * 1000 = 2,500 kg/m³.",
      },
    ],
  },
  {
    id: "pp-cbc-2023-g8-science",
    title: "CBC Grade 8 Integrated Science National Assessment",
    subject: "Integrated Science",
    level: "CBC",
    grade: 8,
    year: 2023,
    paperNumber: 1,
    term: "National Assessment",
    fileSize: "1.1 MB",
    hasMarkingScheme: true,
    sampleQuestions: [
      {
        qNumber: "Task 2 (b)",
        text: "Name two differences between the structure of an onion cell and an amoeba cell as observed under a light microscope.",
        marks: 2,
        topicId: 7, // Living Things & Cells
        solution: "1. Onion cell has a rigid cellulose cell wall; Amoeba has only a flexible cell membrane.\n2. Onion cell has a large permanent central vacuole; Amoeba has temporary contractile vacuoles.",
      },
    ],
  },
];

export function getPastPapers(filters?: {
  subject?: string;
  level?: "KCSE" | "CBC";
  grade?: number;
  year?: number;
  search?: string;
}): PastPaperResource[] {
  return pastPapersStore.filter((p) => {
    if (filters?.subject && filters.subject !== "All" && p.subject.toLowerCase() !== filters.subject.toLowerCase()) {
      return false;
    }
    if (filters?.level && p.level !== filters.level) return false;
    if (filters?.grade && p.grade !== filters.grade) return false;
    if (filters?.year && p.year !== filters.year) return false;
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      const matches =
        p.title.toLowerCase().includes(q) ||
        p.subject.toLowerCase().includes(q) ||
        p.sampleQuestions.some((sq) => sq.text.toLowerCase().includes(q));
      if (!matches) return false;
    }
    return true;
  });
}

export function getPastPaperById(id: string): PastPaperResource | null {
  return pastPapersStore.find((p) => p.id === id) || null;
}
