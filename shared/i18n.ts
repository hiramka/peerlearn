// Bilingual localization dictionary supporting English (en) and Kiswahili (sw) (I18N-1)

export type SupportedLanguage = "en" | "sw";

export interface Translations {
  appName: string;
  tagline: string;
  online: string;
  offline: string;
  syncReady: string;
  syncing: string;
  lastSynced: string;
  lowDataMode: string;
  storageUsage: string;
  clearCache: string;
  cacheCleared: string;
  
  // Navigation
  navDashboard: string;
  navCourses: string;
  navSchedule: string;
  navTeacher: string;
  navVerify: string;
  navPlatformAdmin: string;
  signOut: string;
  signIn: string;
  firstTimeSetup: string;
  schoolApply: string;

  // Session Flow
  diagnosticQuiz: string;
  diagnosticDesc: string;
  startSession: string;
  tutorGuide: string;
  explanation: string;
  interactiveSteps: string;
  stepCompleted: string;
  timerStart: string;
  timerPause: string;
  timerReset: string;
  takePostQuiz: string;
  postQuizTitle: string;
  postQuizDesc: string;
  retentionTitle: string;
  retentionDesc: string;
  submitAnswers: string;
  score: string;
  masteryGain: string;
  sessionComplete: string;
  rateSession: string;
  submitFeedback: string;
  returnToDashboard: string;

  // Tutor Matching
  selectTutor: string;
  recommendedTutors: string;
  whyThisMatch: string;
  verifiedScore: string;
  certifiedTutor: string;
  grade: string;
  formLevel: string;
  
  // Teacher Portal
  teacherPortal: string;
  cohortAnalytics: string;
  lessonAuthoring: string;
  classRoster: string;
  safeguarding: string;
  liveFeed: string;
  topicStruggleHeatmap: string;
  flaggedSessions: string;
  exportCsv: string;
  printReport: string;
  setupSlips: string;
  tutorApprovals: string;
  confidentialReports: string;
  reportProblem: string;
  suspendTutor: string;
  approveTutor: string;
  
  // Platform Admin
  platformOperations: string;
  verifiedSessions: string;
  activeLearners: string;
  retentionGain: string;
  schoolTenantHealth: string;
  demoExcludedNotice: string;

  // Phase 8: LATER items
  tutorTraining: string;
  pedagogicalCertification: string;
  adaptiveGraph: string;
  groupTutoring: string;
  qrHandoff: string;
  smsUssdService: string;
  prerequisiteRemediation: string;
  progressionAdvancement: string;
  certifiedBadgeText: string;
  startTrainingModule: string;
}

export const translations: Record<SupportedLanguage, Translations> = {
  en: {
    appName: "PeerLearn",
    tagline: "Offline Peer-Tutoring for Secondary Schools",
    online: "Online",
    offline: "Offline",
    syncReady: "sync ready",
    syncing: "Syncing...",
    lastSynced: "Last synced",
    lowDataMode: "Low Data Mode",
    storageUsage: "Storage Used",
    clearCache: "Clear Cache",
    cacheCleared: "Cache cleared successfully.",

    navDashboard: "Dashboard",
    navCourses: "Topics",
    navSchedule: "Schedule",
    navTeacher: "Teacher Portal",
    navVerify: "Tutor Verification",
    navPlatformAdmin: "Platform Admin",
    signOut: "Sign Out",
    signIn: "Student Sign In",
    firstTimeSetup: "First-Time PIN Setup",
    schoolApply: "Register School",

    diagnosticQuiz: "Diagnostic Pre-Quiz",
    diagnosticDesc: "3 quick diagnostic questions before pairing with your peer tutor.",
    startSession: "Start Peer Session",
    tutorGuide: "Peer Tutor Step-by-Step Guide",
    explanation: "Core Concept Review",
    interactiveSteps: "Session Checklist",
    stepCompleted: "Completed",
    timerStart: "Start",
    timerPause: "Pause",
    timerReset: "Reset",
    takePostQuiz: "Take Mastery Post-Quiz",
    postQuizTitle: "Mastery Post-Quiz",
    postQuizDesc: "Evaluate understanding after the peer tutoring session.",
    retentionTitle: "7-Day Retention Check",
    retentionDesc: "Verify persistent recall and long-term retention of this topic.",
    submitAnswers: "Submit Answers",
    score: "Score",
    masteryGain: "Mastery Gain",
    sessionComplete: "Session Complete!",
    rateSession: "How helpful was your tutor?",
    submitFeedback: "Complete & Sync Session",
    returnToDashboard: "Return to Dashboard",

    selectTutor: "Choose a Tutor",
    recommendedTutors: "Top Matched Peer Tutors",
    whyThisMatch: "Why this match?",
    verifiedScore: "Verified Mastery",
    certifiedTutor: "Certified Tutor",
    grade: "Grade",
    formLevel: "Form",

    teacherPortal: "Teacher Portal",
    cohortAnalytics: "Cohort Learning Analytics",
    lessonAuthoring: "Lesson Authoring & Publishing",
    classRoster: "Class Roster & Setup Slips",
    safeguarding: "Safeguarding & Reports",
    liveFeed: "Live Event Stream",
    topicStruggleHeatmap: "Topic Struggle Heatmap",
    flaggedSessions: "Flagged Sessions: No Mastery Improvement",
    exportCsv: "Export Pilot CSV",
    printReport: "Print Report",
    setupSlips: "Printable Setup Slips",
    tutorApprovals: "Tutor Safeguarding & Approvals",
    confidentialReports: "Confidential Incident Reports",
    reportProblem: "Report a Problem",
    suspendTutor: "Suspend Tutor",
    approveTutor: "Approve Tutor",

    platformOperations: "Platform Operations & Aggregate Impact",
    verifiedSessions: "Verified Sessions",
    activeLearners: "Active Learners",
    retentionGain: "7-Day Retention Gain",
    schoolTenantHealth: "School Tenant Health & Real-World Engagement",
    demoExcludedNotice: "Demo Data Excluded (R5 Active)",

    // Phase 8: LATER items
    tutorTraining: "Peer Tutor Pedagogical Training",
    pedagogicalCertification: "Certified Peer Tutor Badge",
    adaptiveGraph: "Adaptive Prerequisite Learning Graph",
    groupTutoring: "Small-Group Tutoring Sessions",
    qrHandoff: "Zero-Data Offline QR Transfer",
    smsUssdService: "Africa's Talking SMS & USSD Portal",
    prerequisiteRemediation: "Recommended Prerequisite Topic (Remediation)",
    progressionAdvancement: "Unlocked Advanced Topic (Progression)",
    certifiedBadgeText: "Verified Pedagogical Peer Tutor",
    startTrainingModule: "Start Interactive Training Module",
  },
  sw: {
    appName: "PeerLearn",
    tagline: "Mafunzo ya Rika Bila Mtandao kwa Shule za Upili",
    online: "Upo Mtandaoni",
    offline: "Bila Mtandao (Offline)",
    syncReady: "tayari kusawazishwa",
    syncing: "Inasawazisha...",
    lastSynced: "Ilisawazishwa mara ya mwisho",
    lowDataMode: "Hali ya Data Ndogo",
    storageUsage: "Nafasi Iliyotumika",
    clearCache: "Futa Kumbukumbu (Cache)",
    cacheCleared: "Kumbukumbu ya simu imefutwa kwa mafanikio.",

    navDashboard: "Dashibodi",
    navCourses: "Mada za Masomo",
    navSchedule: "Ratiba",
    navTeacher: "Tovuti ya Mwalimu",
    navVerify: "Ukaguzi wa Mwalimu",
    navPlatformAdmin: "Usimamizi wa Jukwaa",
    signOut: "Toka",
    signIn: "Ingia kama Mwanafunzi",
    firstTimeSetup: "Weka PIN Mara ya Kwanza",
    schoolApply: "Sajili Shule Mpya",

    diagnosticQuiz: "Mtihani wa Awali wa Utambuzi",
    diagnosticDesc: "Maswali 3 ya haraka ya utambuzi kabla ya kuanza mafunzo na rika lako.",
    startSession: "Anza Kipindi cha Rika",
    tutorGuide: "Mwongozo wa Hatua kwa Hatua wa Mfunzaji",
    explanation: "Muhtasari wa Dhana Muhimu",
    interactiveSteps: "Orodha ya Hatua za Kipindi",
    stepCompleted: "Imekamilika",
    timerStart: "Anza",
    timerPause: "Sitisha",
    timerReset: "Weka Upya",
    takePostQuiz: "Fanya Mtihani wa Umahiri",
    postQuizTitle: "Mtihani wa Baada wa Umahiri",
    postQuizDesc: "Pima uelewa baada ya kumaliza kipindi cha mafunzo ya rika.",
    retentionTitle: "Ukaguzi wa Kumbukumbu wa Siku 7",
    retentionDesc: "Hakikisha kumbukumbu ya muda mrefu ya mada hii imedumu.",
    submitAnswers: "Wasilisha Majibu",
    score: "Alama",
    masteryGain: "Ongezeko la Umahiri",
    sessionComplete: "Kipindi Kimekamilika!",
    rateSession: "Mfunzaji wako alikusaidia kwa kiwango gani?",
    submitFeedback: "Kamilisha na Sawazisha",
    returnToDashboard: "Rudi kwenye Dashibodi",

    selectTutor: "Chagua Mfunzaji",
    recommendedTutors: "Wafunzaji Bora wa Rika Waliolingana",
    whyThisMatch: "Kwa nini ulinganifu huu?",
    verifiedScore: "Umahiri Uliothibitishwa",
    certifiedTutor: "Mfunzaji Aliyeidhinishwa",
    grade: "Kidato",
    formLevel: "Kidato cha",

    teacherPortal: "Tovuti ya Mwalimu",
    cohortAnalytics: "Takwimu za Ujifunzaji wa Wanafunzi",
    lessonAuthoring: "Kutunga na Kuchapisha Masomo",
    classRoster: "Orodha ya Wanafunzi na Cheti cha Kuanzisha",
    safeguarding: "Ulinzi wa Mtoto na Ripoti",
    liveFeed: "Matukio ya Moja kwa Moja",
    topicStruggleHeatmap: "Ramani ya Ugumu wa Mada",
    flaggedSessions: "Vipindi Vilivyo na Mashaka (Bila Maendeleo)",
    exportCsv: "Pakua Ripoti ya CSV",
    printReport: "Chapisha Ripoti",
    setupSlips: "Kadi za Kuanzisha za Kuchapishwa",
    tutorApprovals: "Idhini na Usimamizi wa Wafunzaji",
    confidentialReports: "Ripoti za Siri za Matukio",
    reportProblem: "Ripoti Tatizo",
    suspendTutor: "Simamisha Mfunzaji",
    approveTutor: "Idhinisha Mfunzaji",

    platformOperations: "Uendeshaji wa Jukwaa na Matokeo ya Jumla",
    verifiedSessions: "Vipindi Vilivyothibitishwa",
    activeLearners: "Wanafunzi Wanaofanya Kazi",
    retentionGain: "Ongezeko la Kumbukumbu (Siku 7)",
    schoolTenantHealth: "Afya ya Shule na Ushiriki Halisi",
    demoExcludedNotice: "Data ya Majaribio Imeondolewa (R5 Inafanya Kazi)",

    // Phase 8: LATER items
    tutorTraining: "Mafunzo ya Ualimu wa Kikaada kwa Wafunzaji",
    pedagogicalCertification: "Beji ya Mfunzaji wa Rika Aliyeidhinishwa",
    adaptiveGraph: "Grafu ya Mfuatano wa Masomo na Mahitaji ya Awali",
    groupTutoring: "Vipindi vya Mafunzo ya Vikundi Vidogo",
    qrHandoff: "Uhamisho wa QR Bila Mtandao Wala Data",
    smsUssdService: "Huduma ya USSD na SMS ya Africa's Talking",
    prerequisiteRemediation: "Mada ya Msingi Inayopendekezwa (Marudio)",
    progressionAdvancement: "Mada ya Juu Iliyofunguliwa (Kuendelea)",
    certifiedBadgeText: "Mfunzaji wa Rika Aliyeidhinishwa Kiufundishaji",
    startTrainingModule: "Anza Moduli ya Mafunzo",
  },
};

export function getTranslation(lang: SupportedLanguage = "en"): Translations {
  return translations[lang] || translations.en;
}
