// In-memory seed data so the demo runs with zero setup.
// Swap these for Postgres/Supabase queries later (see schema.sql) -- routes stay the same.
import type { Person, Tutor, Topic, Lesson, SessionResult } from "../../shared/types";

const slots = { mon: ["16:00-17:00"], wed: ["16:00-17:00"] };

export const topics: Topic[] = [
  { id: 1, subject: "Math", name: "Solving linear equations", grade: 2, curriculum: "8-4-4", strand: "Algebra", term: 1 },
  { id: 2, subject: "Science", name: "States of matter", grade: 2, curriculum: "8-4-4", strand: "Physical Chemistry", term: 1 },
  { id: 3, subject: "Math", name: "Commercial Arithmetic: Profit, Loss & Simple Interest", grade: 1, curriculum: "8-4-4", strand: "Arithmetic", term: 2 },
  { id: 4, subject: "Biology", name: "Cell Structure & Organization", grade: 1, curriculum: "8-4-4", strand: "Cytology", term: 1 },
  { id: 5, subject: "Physics", name: "Measurement & Fluid Pressure", grade: 1, curriculum: "8-4-4", strand: "Mechanics", term: 2 },
  { id: 6, subject: "Chemistry", name: "Structure of the Atom & Periodic Table", grade: 2, curriculum: "8-4-4", strand: "Inorganic Chemistry", term: 2 },
  { id: 7, subject: "Math", name: "Quadratic Expressions & Equations", grade: 3, curriculum: "8-4-4", strand: "Pure Mathematics", term: 1 },
  { id: 8, subject: "Integrated Science", name: "Human Body Systems: Nutrition & Digestion", grade: 8, curriculum: "CBC", strand: "Health Sciences", term: 1 },
];

export const learners: Person[] = [
  { id: "l1", name: "Amani (demo learner)", grade: 2, schoolId: "s1", language: "en", availability: slots },
  { id: "l2", name: "Faith (Form 1 learner)", grade: 1, schoolId: "s1", language: "en", availability: slots },
  { id: "l3", name: "Kamau (CBC Grade 8 learner)", grade: 8, schoolId: "s1", language: "en", availability: slots },
];

export const tutors: Tutor[] = [
  {
    id: "t1",
    name: "Wanjiru",
    grade: 3,
    schoolId: "s1",
    language: "en",
    availability: slots,
    verifiedScore: { 1: 0.95, 2: 0.7, 3: 0.92, 4: 0.88, 5: 0.9, 6: 0.85, 7: 0.91, 8: 0.94 },
    teacherApproved: { 1: true, 2: false, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
    activeMatches: 1,
    avgGain: 0.3,
  },
  {
    id: "t2",
    name: "Brian",
    grade: 4,
    schoolId: "s1",
    language: "en",
    availability: { mon: ["16:00-17:00"] },
    verifiedScore: { 1: 0.85, 2: 0.9, 3: 0.88, 4: 0.85, 5: 0.94, 6: 0.92, 7: 0.89, 8: 0.9 },
    teacherApproved: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
    activeMatches: 3,
    avgGain: 0.2,
  },
  {
    id: "t3",
    name: "Achieng",
    grade: 3,
    schoolId: "s2",
    language: "sw",
    availability: { wed: ["16:00-17:00"] },
    verifiedScore: { 1: 0.9, 2: 0.88, 3: 0.95, 4: 0.9, 5: 0.86, 6: 0.89, 7: 0.85, 8: 0.92 },
    teacherApproved: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
    activeMatches: 0,
    avgGain: 0.1,
  },
  {
    id: "t4",
    name: "Kevin",
    grade: 1,
    schoolId: "s1",
    language: "en",
    availability: slots,
    verifiedScore: { 1: 0.99 },
    teacherApproved: { 1: true },
    activeMatches: 0,
    avgGain: 0,
  }, // filtered out: lower grade for Form 2
  {
    id: "t5",
    name: "Daniel (Unapproved)",
    grade: 3,
    schoolId: "s1",
    language: "en",
    availability: slots,
    verifiedScore: { 1: 0.92 },
    teacherApproved: { 1: false },
    activeMatches: 0,
    avgGain: 0,
  }, // SAFE-1: unapproved
  {
    id: "t6",
    name: "Grace (Suspended)",
    grade: 4,
    schoolId: "s1",
    language: "en",
    availability: slots,
    verifiedScore: { 1: 0.88 },
    teacherApproved: { 1: true },
    isSuspended: true,
    activeMatches: 0,
    avgGain: 0,
  }, // SAFE-2: suspended
];

export const lessons: Lesson[] = [
  {
    topicId: 1,
    title: "Solving linear equations",
    version: 1,
    grade: 2,
    subject: "Math",
    tutorGuide: [
      "Start by asking the learner: what does the = sign mean? (balance)",
      "Show: whatever you do to one side, do to the other.",
      "Work x + 5 = 12 together, then let the learner try 2x = 14.",
      "Finish with one two-step equation; do not give the answer, ask 'what is your first move?'",
    ],
    explanation: [
      "An equation is a balance. Both sides must stay equal.",
      "To solve x + 5 = 12, subtract 5 from both sides: x = 7.",
      "To solve 3x = 18, divide both sides by 3: x = 6.",
      "Two steps: 2x + 3 = 11 -> subtract 3 -> 2x = 8 -> divide by 2 -> x = 4.",
    ],
    pre: [
      { id: "q1_pre_1", q: "Solve: x + 4 = 9", options: ["3", "5", "13"], answer: 1, sub_skill: "addition_equations", difficulty: 1, language: "en" },
      { id: "q1_pre_2", q: "Solve: 3x = 12", options: ["4", "9", "15"], answer: 0, sub_skill: "multiplication_equations", difficulty: 2, language: "en" },
      { id: "q1_pre_3", q: "Solve: 2x + 1 = 7", options: ["2", "3", "4"], answer: 1, sub_skill: "two_step_equations", difficulty: 3, language: "en" },
    ],
    post: [
      { id: "q1_post_1", q: "Solve: x + 6 = 10", options: ["4", "16", "6"], answer: 0, sub_skill: "addition_equations", difficulty: 1, language: "en" },
      { id: "q1_post_2", q: "Solve: 4x = 20", options: ["16", "5", "80"], answer: 1, sub_skill: "multiplication_equations", difficulty: 2, language: "en" },
      { id: "q1_post_3", q: "Solve: 3x + 2 = 11", options: ["3", "4", "5"], answer: 0, sub_skill: "two_step_equations", difficulty: 3, language: "en" },
    ],
    retention: [
      { id: "q1_ret_1", q: "Solve: x - 3 = 8", options: ["5", "11", "24"], answer: 1, sub_skill: "subtraction_equations", difficulty: 1, language: "en" },
      { id: "q1_ret_2", q: "Solve: 5x = 35", options: ["7", "30", "40"], answer: 0, sub_skill: "multiplication_equations", difficulty: 2, language: "en" },
      { id: "q1_ret_3", q: "Solve: 2x - 4 = 10", options: ["3", "5", "7"], answer: 2, sub_skill: "two_step_equations", difficulty: 3, language: "en" },
    ],
  },
  {
    topicId: 2,
    title: "States of matter",
    version: 1,
    grade: 2,
    subject: "Science",
    tutorGuide: [
      "Ask: name something solid, liquid and gas you touched today.",
      "Use water: ice -> water -> steam to show one substance, three states.",
      "Link to particles: tightly packed, sliding past, spread out.",
    ],
    explanation: [
      "Solids keep their shape; particles are tightly packed and only vibrate.",
      "Liquids take the shape of their container; particles slide past each other.",
      "Gases fill any container; particles are far apart and move fast.",
      "Heating gives particles energy and can change the state (melting, boiling).",
    ],
    pre: [
      { id: "q2_pre_1", q: "Which state keeps its own shape?", options: ["Solid", "Liquid", "Gas"], answer: 0, sub_skill: "shape_properties", difficulty: 1, language: "en" },
      { id: "q2_pre_2", q: "Ice turning to water is called:", options: ["Boiling", "Melting", "Freezing"], answer: 1, sub_skill: "phase_changes", difficulty: 2, language: "en" },
      { id: "q2_pre_3", q: "Particles are furthest apart in a:", options: ["Solid", "Liquid", "Gas"], answer: 2, sub_skill: "particle_theory", difficulty: 3, language: "en" },
    ],
    post: [
      { id: "q2_post_1", q: "Which state takes the shape of its container but has a fixed volume?", options: ["Solid", "Liquid", "Gas"], answer: 1, sub_skill: "volume_properties", difficulty: 2, language: "en" },
      { id: "q2_post_2", q: "Water turning to steam is called:", options: ["Evaporating/boiling", "Freezing", "Melting"], answer: 0, sub_skill: "phase_changes", difficulty: 2, language: "en" },
      { id: "q2_post_3", q: "Heating particles makes them:", options: ["Slow down", "Stop", "Gain energy"], answer: 2, sub_skill: "thermal_motion", difficulty: 3, language: "en" },
    ],
    retention: [
      { id: "q2_ret_1", q: "Which state of matter can be compressed easily?", options: ["Gas", "Solid", "Liquid"], answer: 0, sub_skill: "compressibility", difficulty: 2, language: "en" },
      { id: "q2_ret_2", q: "Sublimation occurs when a solid turns directly into a:", options: ["Liquid", "Gas", "Plasma"], answer: 1, sub_skill: "phase_changes", difficulty: 3, language: "en" },
      { id: "q2_ret_3", q: "In which state do particles only vibrate in place?", options: ["Gas", "Liquid", "Solid"], answer: 2, sub_skill: "particle_theory", difficulty: 1, language: "en" },
    ],
  },
  {
    topicId: 3,
    title: "Commercial Arithmetic: Profit, Loss & Simple Interest",
    version: 1,
    grade: 1,
    subject: "Math",
    tutorGuide: [
      "Ask: If a shopkeeper buys a phone for 5,000 and sells it for 6,000, did they make a profit or loss?",
      "Define: Profit = Selling Price (SP) - Cost Price (CP). Profit % = (Profit / CP) * 100.",
      "Guide simple interest formula: I = (P * R * T) / 100, where P is Principal, R is Rate (%), T is Time (years).",
      "Have the learner calculate interest on 10,000 KES borrowed for 2 years at 5% p.a.",
    ],
    explanation: [
      "Profit occurs when Selling Price exceeds Cost Price (SP > CP).",
      "Loss occurs when Cost Price exceeds Selling Price (CP > SP).",
      "Simple Interest (I) formula: I = (P * R * T) / 100.",
      "Total Amount payable (A) = Principal (P) + Interest (I).",
    ],
    pre: [
      { id: "q3_pre_1", q: "A trader bought a bag of maize for KES 3,000 and sold it for KES 3,600. Calculate the profit:", options: ["KES 600", "KES 400", "KES 800"], answer: 0, sub_skill: "profit_loss", difficulty: 1, language: "en" },
      { id: "q3_pre_2", q: "Calculate 15% profit on an item bought at KES 2,000:", options: ["KES 250", "KES 300", "KES 350"], answer: 1, sub_skill: "percentages", difficulty: 2, language: "en" },
      { id: "q3_pre_3", q: "Calculate simple interest on KES 10,000 at 5% per annum for 2 years:", options: ["KES 500", "KES 1,000", "KES 1,500"], answer: 1, sub_skill: "simple_interest", difficulty: 2, language: "en" },
    ],
    post: [
      { id: "q3_post_1", q: "A merchant purchased goods for KES 4,500 and sold them for KES 5,400. Find the profit percentage:", options: ["20%", "15%", "25%"], answer: 0, sub_skill: "profit_percentage", difficulty: 2, language: "en" },
      { id: "q3_post_2", q: "A loss of 10% was incurred on a bicycle bought for KES 8,000. Calculate the selling price:", options: ["KES 7,000", "KES 7,200", "KES 7,500"], answer: 1, sub_skill: "loss_calculation", difficulty: 2, language: "en" },
      { id: "q3_post_3", q: "Find the total amount after 3 years when KES 20,000 is invested at 4% simple interest p.a.:", options: ["KES 22,400", "KES 24,000", "KES 21,800"], answer: 0, sub_skill: "total_amount", difficulty: 3, language: "en" },
    ],
    retention: [
      { id: "q3_ret_1", q: "A farmer sold 5 bags of potatoes for KES 15,000, making a profit of KES 2,500. Find the cost price:", options: ["KES 12,000", "KES 12,500", "KES 13,000"], answer: 1, sub_skill: "cost_price", difficulty: 2, language: "en" },
      { id: "q3_ret_2", q: "Simple interest on a principal P over T years at rate R% is given by:", options: ["P * R * T / 100", "(P + R) * T / 100", "P * T / (100 * R)"], answer: 0, sub_skill: "formula_recall", difficulty: 1, language: "en" },
      { id: "q3_ret_3", q: "An article costing KES 1,200 is sold at 25% discount. What is the discounted price?", options: ["KES 850", "KES 900", "KES 950"], answer: 1, sub_skill: "discount", difficulty: 2, language: "en" },
    ],
  },
  {
    topicId: 4,
    title: "Cell Structure & Organization",
    version: 1,
    grade: 1,
    subject: "Biology",
    tutorGuide: [
      "Ask the learner: what is the basic building block of all living organisms?",
      "Compare a plant cell to an animal cell using a sketch: plant cells have a cell wall and chloroplasts.",
      "Explain the key organelles: Nucleus (control center), Mitochondria (powerhouse), Ribosomes (protein synthesis).",
      "Have the learner calculate magnification: Eyepiece lens x Objective lens = Total Magnification.",
    ],
    explanation: [
      "The cell is the basic structural and functional unit of living organisms.",
      "Plant cells have a cellulose cell wall, large central vacuole, and chloroplasts.",
      "Mitochondria generate cellular energy (ATP) via aerobic respiration.",
      "Total magnification = Eyepiece magnification × Objective lens magnification.",
    ],
    pre: [
      { id: "q4_pre_1", q: "Which organelle is known as the powerhouse of the cell, generating ATP?", options: ["Ribosome", "Mitochondrion", "Chloroplast"], answer: 1, sub_skill: "organelles", difficulty: 1, language: "en" },
      { id: "q4_pre_2", q: "A plant cell wall is primarily composed of:", options: ["Cellulose", "Protein", "Glycogen"], answer: 0, sub_skill: "plant_structures", difficulty: 1, language: "en" },
      { id: "q4_pre_3", q: "To calculate total magnification of a light microscope, you multiply eyepiece magnification by:", options: ["Stage size", "Objective lens magnification", "Condenser power"], answer: 1, sub_skill: "microscopy", difficulty: 2, language: "en" },
    ],
    post: [
      { id: "q4_post_1", q: "Which structure controls all cellular activities and stores genetic DNA?", options: ["Nucleus", "Vacuole", "Golgi apparatus"], answer: 0, sub_skill: "organelles", difficulty: 1, language: "en" },
      { id: "q4_post_2", q: "Unlike animal cells, typical plant cells possess:", options: ["Centrioles and lysosomes", "Chloroplasts and large central vacuole", "Hemoglobin"], answer: 1, sub_skill: "cell_comparison", difficulty: 2, language: "en" },
      { id: "q4_post_3", q: "If an eyepiece has 10x magnification and the objective lens is 40x, total magnification is:", options: ["400x", "50x", "4x"], answer: 0, sub_skill: "magnification_calc", difficulty: 2, language: "en" },
    ],
    retention: [
      { id: "q4_ret_1", q: "Which organelle is the site of protein synthesis in biological cells?", options: ["Ribosome", "Centrosome", "Endoplasmic reticulum without ribosomes"], answer: 0, sub_skill: "organelles", difficulty: 2, language: "en" },
      { id: "q4_ret_2", q: "The semi-permeable membrane that regulates entry and exit of substances is the:", options: ["Cell wall", "Plasma (cell) membrane", "Nuclear envelope"], answer: 1, sub_skill: "membranes", difficulty: 1, language: "en" },
      { id: "q4_ret_3", q: "Chloroplasts contain chlorophyll primarily used for capturing light during:", options: ["Respiration", "Photosynthesis", "Fermentation"], answer: 1, sub_skill: "chloroplast_function", difficulty: 1, language: "en" },
    ],
  },
  {
    topicId: 5,
    title: "Measurement & Fluid Pressure",
    version: 1,
    grade: 1,
    subject: "Physics",
    tutorGuide: [
      "Ask: Why do dams have thicker walls at the bottom than at the top?",
      "Define Pressure: P = Force / Area. Units: N/m² or Pascal (Pa).",
      "Demonstrate liquid pressure: Pressure = h * ρ * g (depth, density, gravity).",
      "Discuss hydraulic brakes and Pascal's principle: pressure applied is transmitted equally.",
    ],
    explanation: [
      "Pressure is defined as force per unit perpendicular area: P = F / A.",
      "The SI unit of pressure is Pascal (Pa), equivalent to 1 Newton per square meter (N/m²).",
      "Pressure in liquids increases with depth and density: P = h * ρ * g.",
      "Pascal's principle states that pressure applied to an enclosed fluid is transmitted undiminished in all directions.",
    ],
    pre: [
      { id: "q5_pre_1", q: "The SI unit of pressure is:", options: ["Newton (N)", "Pascal (Pa)", "Joule (J)"], answer: 1, sub_skill: "pressure_units", difficulty: 1, language: "en" },
      { id: "q5_pre_2", q: "Pressure in a liquid depends on depth h, density ρ, and gravity g according to:", options: ["P = h * ρ * g", "P = h / (ρ * g)", "P = ρ * g / h"], answer: 0, sub_skill: "liquid_pressure", difficulty: 2, language: "en" },
      { id: "q5_pre_3", q: "A hydraulic lift operates on which scientific principle?", options: ["Archimedes' principle", "Pascal's principle of transmission of fluid pressure", "Hooke's law"], answer: 1, sub_skill: "hydraulics", difficulty: 2, language: "en" },
    ],
    post: [
      { id: "q5_post_1", q: "A force of 60 N acts perpendicularly over an area of 3 m². What is the pressure?", options: ["180 Pa", "20 Pa", "15 Pa"], answer: 1, sub_skill: "pressure_calc", difficulty: 2, language: "en" },
      { id: "q5_post_2", q: "As a scuba diver swims deeper into Lake Victoria, water pressure on their ears:", options: ["Increases steadily", "Decreases", "Stays constant"], answer: 0, sub_skill: "depth_effect", difficulty: 1, language: "en" },
      { id: "q5_post_3", q: "Atmospheric pressure at sea level (Mombasa) compared to high altitude (Nairobi) is:", options: ["Higher at sea level", "Lower at sea level", "Identical"], answer: 0, sub_skill: "atmospheric_pressure", difficulty: 2, language: "en" },
    ],
    retention: [
      { id: "q5_ret_1", q: "Which instrument is specifically used to measure atmospheric pressure?", options: ["Manometer", "Mercury barometer", "Hydrometer"], answer: 1, sub_skill: "instruments", difficulty: 2, language: "en" },
      { id: "q5_ret_2", q: "The pressure exerted by a fluid acts:", options: ["Only downwards", "Equally in all directions", "Only upwards"], answer: 1, sub_skill: "fluid_direction", difficulty: 1, language: "en" },
      { id: "q5_ret_3", q: "A block of mass 10 kg resting on 0.5 m² exerts what pressure on the ground (take g = 10 N/kg)?", options: ["100 Pa", "200 Pa", "500 Pa"], answer: 1, sub_skill: "pressure_calc", difficulty: 3, language: "en" },
    ],
  },
  {
    topicId: 6,
    title: "Structure of the Atom & Periodic Table",
    version: 1,
    grade: 2,
    subject: "Chemistry",
    tutorGuide: [
      "Draw the Bohr model of an atom: protons and neutrons in nucleus, electrons in shells.",
      "Explain shell capacity rule: 2 in first shell, 8 in second, 8 in third (2.8.8).",
      "Connect electron configuration to Group number (valence electrons) and Period (number of energy levels).",
      "Work Sodium (Na, Z=11): configuration 2.8.1 -> Group 1, Period 3.",
    ],
    explanation: [
      "Atoms consist of protons (+), neutrons (neutral) in the nucleus, and electrons (-) in energy levels.",
      "Atomic Number (Z) = number of protons in the nucleus.",
      "Mass Number (A) = number of protons + number of neutrons.",
      "Group number in the Periodic Table equals the number of valence electrons in the outermost shell.",
    ],
    pre: [
      { id: "q6_pre_1", q: "The nucleus of an atom contains:", options: ["Electrons and protons", "Protons and neutrons", "Electrons only"], answer: 1, sub_skill: "subatomic_particles", difficulty: 1, language: "en" },
      { id: "q6_pre_2", q: "The atomic number of an element is defined as the total number of:", options: ["Protons in the nucleus", "Neutrons in the nucleus", "Protons plus electrons"], answer: 0, sub_skill: "atomic_number", difficulty: 1, language: "en" },
      { id: "q6_pre_3", q: "The electron arrangement of a neutral Sodium atom (Atomic number 11) is:", options: ["2.8.1", "2.8.2", "2.7.2"], answer: 0, sub_skill: "electron_arrangement", difficulty: 2, language: "en" },
    ],
    post: [
      { id: "q6_post_1", q: "Isotopes are atoms of the same chemical element having the same number of protons but different:", options: ["Electrons", "Neutrons (different mass numbers)", "Valency electrons"], answer: 1, sub_skill: "isotopes", difficulty: 2, language: "en" },
      { id: "q6_post_2", q: "Elements in the same group of the Periodic Table share the same:", options: ["Number of electron energy levels", "Number of valence electrons in outermost shell", "Atomic mass"], answer: 1, sub_skill: "periodic_groups", difficulty: 2, language: "en" },
      { id: "q6_post_3", q: "What is the electron arrangement of Chlorine (Atomic number 17)?", options: ["2.8.7", "2.8.8", "2.7.8"], answer: 0, sub_skill: "electron_arrangement", difficulty: 2, language: "en" },
    ],
    retention: [
      { id: "q6_ret_1", q: "Which subatomic particle carries a negative electric charge?", options: ["Proton", "Neutron", "Electron"], answer: 2, sub_skill: "subatomic_particles", difficulty: 1, language: "en" },
      { id: "q6_ret_2", q: "Group 1 elements (Lithium, Sodium, Potassium) are commonly known as:", options: ["Alkali metals", "Halogens", "Noble gases"], answer: 0, sub_skill: "periodic_families", difficulty: 1, language: "en" },
      { id: "q6_ret_3", q: "When a metal atom loses one valence electron, it forms a:", options: ["Positively charged cation", "Negatively charged anion", "Neutral molecule"], answer: 0, sub_skill: "ion_formation", difficulty: 2, language: "en" },
    ],
  },
  {
    topicId: 7,
    title: "Quadratic Expressions & Equations",
    version: 1,
    grade: 3,
    subject: "Math",
    tutorGuide: [
      "Review FOIL expansion: (x + a)(x + b) = x² + (a+b)x + ab.",
      "Teach factorization by grouping: find two numbers with product c and sum b.",
      "Work through difference of two squares: a² - b² = (a - b)(a + b).",
      "Demonstrate zero-product property: if (x - 2)(x + 3) = 0, then x = 2 or x = -3.",
    ],
    explanation: [
      "Standard form of a quadratic equation is ax² + bx + c = 0.",
      "Factoring involves finding two integers whose sum is b and product is ac.",
      "Difference of two squares identity: a² - b² = (a - b)(a + b).",
      "The quadratic formula is x = (-b ± √(b² - 4ac)) / (2a).",
    ],
    pre: [
      { id: "q7_pre_1", q: "Factorize completely: x² + 5x + 6:", options: ["(x + 2)(x + 3)", "(x + 1)(x + 6)", "(x - 2)(x - 3)"], answer: 0, sub_skill: "factorization", difficulty: 2, language: "en" },
      { id: "q7_pre_2", q: "Solve the quadratic equation: (x - 4)(x + 3) = 0:", options: ["x = 4 or x = -3", "x = -4 or x = 3", "x = 4 or x = 3"], answer: 0, sub_skill: "zero_product", difficulty: 2, language: "en" },
      { id: "q7_pre_3", q: "The discriminant of the quadratic equation ax² + bx + c = 0 is given by:", options: ["b² - 4ac", "4ac - b²", "-b ± √(ac)"], answer: 0, sub_skill: "discriminant", difficulty: 2, language: "en" },
    ],
    post: [
      { id: "q7_post_1", q: "Expand and simplify: (2x + 1)(x - 3):", options: ["2x² - 5x - 3", "2x² + 5x - 3", "2x² - 6x + 1"], answer: 0, sub_skill: "expansion", difficulty: 2, language: "en" },
      { id: "q7_post_2", q: "Solve by factorizing: x² - 9 = 0 (difference of two squares):", options: ["x = 3 or x = -3", "x = 9 or x = -9", "x = 0 or x = 9"], answer: 0, sub_skill: "difference_of_squares", difficulty: 2, language: "en" },
      { id: "q7_post_3", q: "If the discriminant b² - 4ac = 0, the quadratic equation has:", options: ["Two distinct real roots", "Two equal real roots (one repeated root)", "No real roots"], answer: 1, sub_skill: "nature_of_roots", difficulty: 3, language: "en" },
    ],
    retention: [
      { id: "q7_ret_1", q: "Factorize: x² - 7x + 12:", options: ["(x - 3)(x - 4)", "(x + 3)(x + 4)", "(x - 2)(x - 6)"], answer: 0, sub_skill: "factorization", difficulty: 2, language: "en" },
      { id: "q7_ret_2", q: "Find the roots of: x² - 6x = 0:", options: ["x = 0 or x = 6", "x = 6 or x = -6", "x = 3 or x = -3"], answer: 0, sub_skill: "common_factors", difficulty: 2, language: "en" },
      { id: "q7_ret_3", q: "What value of c makes x² + 8x + c a perfect square trinomial?", options: ["16", "64", "8"], answer: 0, sub_skill: "completing_square", difficulty: 3, language: "en" },
    ],
  },
  {
    topicId: 8,
    title: "Human Body Systems: Nutrition & Digestion",
    version: 1,
    grade: 8,
    subject: "Integrated Science",
    tutorGuide: [
      "Context: Connect to local Kenyan foods (ugali, sukuma wiki, beans, fish).",
      "Trace food journey: Mouth -> Esophagus -> Stomach -> Small Intestine -> Large Intestine.",
      "Emphasize enzyme roles: Amylase (carbohydrates), Pepsin (proteins), Lipase (fats).",
      "Ask: Why does chewing bread make it taste slightly sweet after a while? (amylase converts starch to maltose).",
    ],
    explanation: [
      "Chemical digestion begins in the mouth with salivary amylase breaking starch into maltose.",
      "Stomach produces hydrochloric acid and pepsin to digest proteins.",
      "The small intestine (ileum) contains villi for maximum absorption of digested nutrients into the blood.",
      "The large intestine absorbs water and mineral salts, forming solid feces.",
    ],
    pre: [
      { id: "q8_pre_1", q: "In the human digestive system, chemical digestion of starch begins in the:", options: ["Stomach", "Mouth (via salivary amylase)", "Small intestine"], answer: 1, sub_skill: "chemical_digestion", difficulty: 1, language: "en" },
      { id: "q8_pre_2", q: "Which nutrient is primarily responsible for tissue growth and repair in adolescents?", options: ["Carbohydrate", "Protein", "Dietary fiber"], answer: 1, sub_skill: "nutrients", difficulty: 1, language: "en" },
      { id: "q8_pre_3", q: "Hydrochloric acid in the human stomach helps to:", options: ["Neutralize bile", "Kill ingested microbes and activate pepsin", "Absorb dietary fats"], answer: 1, sub_skill: "stomach_function", difficulty: 2, language: "en" },
    ],
    post: [
      { id: "q8_post_1", q: "Most nutrient absorption into the bloodstream occurs in which organ?", options: ["Stomach", "Small intestine (ileum with villi)", "Large intestine (colon)"], answer: 1, sub_skill: "absorption", difficulty: 2, language: "en" },
      { id: "q8_post_2", q: "Bile is produced by the liver and stored in the gall bladder to aid in:", options: ["Digesting vitamins", "Emulsifying fats into smaller droplets", "Synthesizing glucose"], answer: 1, sub_skill: "bile_function", difficulty: 2, language: "en" },
      { id: "q8_post_3", q: "Deficiency of Vitamin C in a student's diet can lead to:", options: ["Scurvy (bleeding gums)", "Rickets", "Kwashiorkor"], answer: 0, sub_skill: "deficiency_diseases", difficulty: 1, language: "en" },
    ],
    retention: [
      { id: "q8_ret_1", q: "The wave-like muscular contraction that moves food through the esophagus is called:", options: ["Peristalsis", "Osmosis", "Mastication"], answer: 0, sub_skill: "peristalsis", difficulty: 1, language: "en" },
      { id: "q8_ret_2", q: "Which digestive enzyme breaks down dietary proteins into peptones in the stomach?", options: ["Amylase", "Pepsin", "Lipase"], answer: 1, sub_skill: "enzymes", difficulty: 2, language: "en" },
      { id: "q8_ret_3", q: "The primary function of the human large intestine (colon) is to:", options: ["Absorb water and mineral salts", "Digest carbohydrates", "Produce red blood cells"], answer: 0, sub_skill: "colon_function", difficulty: 1, language: "en" },
    ],
  },
];

// Seeded results so the teacher dashboard is not empty during the demo.
export const sessions: SessionResult[] = [
  {
    client_id: "seed-1",
    learnerId: "x1",
    tutorId: "t1",
    topicId: 1,
    pre: 0.33,
    post: 0.67,
    retention_score: 0.67, // PROOF-3: Retention check 7 days after
    retention_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    is_comparison_group: false,
    at: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
  },
  {
    client_id: "seed-2",
    learnerId: "x2",
    tutorId: "t2",
    topicId: 1,
    pre: 0.33,
    post: 1.0,
    retention_score: 0.85,
    retention_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    is_comparison_group: false,
    at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
  },
  {
    client_id: "seed-3",
    learnerId: "x3",
    tutorId: "t3",
    topicId: 2,
    pre: 0.67,
    post: 0.67,
    is_comparison_group: false,
    at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    client_id: "seed-comp-1",
    learnerId: "comp-1",
    tutorId: "none",
    topicId: 1,
    pre: 0.33,
    post: 0.40, // Standard instruction comparison group without peer tutoring (PROOF-5)
    is_comparison_group: true,
    at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
];
