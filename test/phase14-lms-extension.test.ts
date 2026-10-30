import { describe, it, expect } from "vitest";
import {
  getForumQuestions,
  getQuestionById,
  createForumQuestion,
  createForumAnswer,
  voteForumItem,
  acceptForumAnswer,
  checkForumContentSafeguard,
  questionsStore,
  answersStore,
} from "../server/src/forum";
import {
  getSchoolNotices,
  createSchoolNotice,
  togglePinSchoolNotice,
  deleteSchoolNotice,
  schoolNoticesStore,
} from "../server/src/notices";
import {
  getCATRecords,
  upsertCATRecord,
  computeCATImpactCorrelation,
  calculateWeightedCATTotal,
} from "../server/src/gradebook";
import {
  getPastPapers,
  getPastPaperById,
  pastPapersStore,
} from "../server/src/pastpapers";

describe("Phase 14: School LMS Extension Pack (KeMU Gap Parity)", () => {
  describe("1. Asynchronous Subject Q&A & Peer Homework Forum", () => {
    it("should retrieve seeded forum questions and support subject/grade filtering", () => {
      const allQ = getForumQuestions("s1");
      expect(allQ.length).toBeGreaterThanOrEqual(4);

      const mathQ = getForumQuestions("s1", { subject: "Mathematics" });
      expect(mathQ.length).toBeGreaterThanOrEqual(1);
      expect(mathQ.every((q) => q.subject === "Mathematics")).toBe(true);

      const chemQ = getForumQuestions("s1", { subject: "Chemistry" });
      expect(chemQ.length).toBeGreaterThanOrEqual(1);

      const searchResults = getForumQuestions("s1", { search: "Boyle" });
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].title).toContain("Boyle's Law");
    });

    it("should fetch question details with answers ordered by acceptance and upvotes", () => {
      const details = getQuestionById("fq-1");
      expect(details.question).not.toBeNull();
      expect(details.question?.id).toBe("fq-1");
      expect(details.answers.length).toBeGreaterThanOrEqual(2);
      expect(details.answers[0].isAccepted).toBe(true);
      expect(details.answers[0].steps).toBeDefined();
    });

    it("should enforce child safeguarding rules against phone numbers and social media handles", () => {
      const safeCheck1 = checkForumContentSafeguard("+254712345678 call me for answers");
      expect(safeCheck1.flagged).toBe(true);
      expect(safeCheck1.reason).toContain("telephone or WhatsApp numbers");

      const safeCheck2 = checkForumContentSafeguard("DM me on WhatsApp or Telegram for the leaked paper");
      expect(safeCheck2.flagged).toBe(true);

      const validCheck = checkForumContentSafeguard("How do we use the quadratic formula to find the roots of 3x^2 - 5x + 2 = 0?");
      expect(validCheck.flagged).toBe(false);

      // Attempt to create question with contact info
      const blocked = createForumQuestion({
        schoolId: "s1",
        authorId: "l1",
        authorName: "Amina",
        authorRole: "learner",
        grade: 2,
        subject: "Mathematics",
        title: "Call me on 0722123456",
        content: "Please help me with this problem",
      });
      expect(blocked.ok).toBe(false);
      expect(blocked.error).toBeDefined();
    });

    it("should successfully create questions and answers with Socratic steps", () => {
      const qRes = createForumQuestion({
        schoolId: "s1",
        authorId: "l3",
        authorName: "Faith W.",
        authorRole: "learner",
        grade: 2,
        subject: "Mathematics",
        topicId: 1,
        title: "How do I solve by completing the square?",
        content: "Can someone show the method for x^2 + 6x + 5 = 0?",
      });
      expect(qRes.ok).toBe(true);
      expect(qRes.question).toBeDefined();
      const qId = qRes.question!.id;

      const aRes = createForumAnswer({
        questionId: qId,
        schoolId: "s1",
        authorId: "t1",
        authorName: "Kelvin M.",
        authorRole: "tutor",
        isCertifiedTutor: true,
        content: "Here is the step-by-step completing the square method:",
        steps: [
          "Move constant to RHS: x^2 + 6x = -5",
          "Take half the coefficient of x (6/2 = 3) and square it (9)",
          "Add 9 to both sides: x^2 + 6x + 9 = 4",
          "Factor LHS: (x + 3)^2 = 4",
          "Take square root: x + 3 = ±2 => x = -1 or x = -5",
        ],
      });
      expect(aRes.ok).toBe(true);
      expect(aRes.answer).toBeDefined();

      const details = getQuestionById(qId);
      expect(details.question?.answersCount).toBe(1);
      expect(details.answers.length).toBe(1);
    });

    it("should handle upvoting and accepting answers", () => {
      const qId = "fq-3";
      const initialUpvotes = questionsStore.find((q) => q.id === qId)?.upvotes || 0;

      const vote1 = voteForumItem("question", qId, "user-test-1");
      expect(vote1.ok).toBe(true);
      expect(vote1.upvotes).toBe(initialUpvotes + 1);

      // Unvote
      const vote2 = voteForumItem("question", qId, "user-test-1");
      expect(vote2.ok).toBe(true);
      expect(vote2.upvotes).toBe(initialUpvotes);

      // Accept answer
      const acceptRes = acceptForumAnswer("fq-1", "fa-1", "teacher-1");
      expect(acceptRes.ok).toBe(true);
      const q = questionsStore.find((item) => item.id === "fq-1");
      expect(q?.isResolved).toBe(true);
      expect(q?.acceptedAnswerId).toBe("fa-1");
    });
  });

  describe("2. School Notice Board & Academic Bulletin", () => {
    it("should retrieve notices with pinned notices first", () => {
      const notices = getSchoolNotices("s1");
      expect(notices.length).toBeGreaterThanOrEqual(4);
      expect(notices[0].isPinned).toBe(true);
    });

    it("should filter notices by grade level", () => {
      const g8Notices = getSchoolNotices("s1", 8);
      expect(g8Notices.some((n) => n.targetGrades.includes(8))).toBe(true);
    });

    it("should create notice, support SMS broadcast, and toggle pin", () => {
      const res = createSchoolNotice({
        schoolId: "s1",
        authorId: "t-admin",
        authorName: "Mr. Otieno",
        authorRole: "teacher",
        title: "Form 2 Extra Math Remedial",
        category: "academic",
        targetGrades: [2],
        content: "Remedial clinic on Friday 4:30 PM.",
        isPinned: false,
        broadcastSMS: true,
      });
      expect(res.ok).toBe(true);
      expect(res.notice).toBeDefined();
      expect(res.notice?.smsBroadcasted).toBe(true);

      const noticeId = res.notice!.id;
      const pinRes = togglePinSchoolNotice("s1", noticeId, true, "t-admin");
      expect(pinRes.ok).toBe(true);
      const updated = schoolNoticesStore.find((n) => n.id === noticeId);
      expect(updated?.isPinned).toBe(true);

      const delRes = deleteSchoolNotice("s1", noticeId, "t-admin");
      expect(delRes.ok).toBe(true);
    });
  });

  describe("3. Teacher CAT Gradebook & Tutoring Impact Correlation", () => {
    it("should accurately compute weighted Kenyan term percentage", () => {
      // CAT 1 (24/30), CAT 2 (26/30) => avg = 25/30 * 30% = 25%
      // Exam (80/100) * 70% = 56% => Total = 81%
      const total = calculateWeightedCATTotal(24, 26, 80);
      expect(total).toBe(81);
    });

    it("should retrieve and upsert student CAT score records", () => {
      const records = getCATRecords("s1", { subject: "Mathematics", grade: 2 });
      expect(records.length).toBeGreaterThanOrEqual(9);

      const upsertRes = upsertCATRecord("s1", "t-admin", {
        studentId: "l1",
        regNumber: "MHS-2024-001",
        studentName: "Amina K.",
        grade: 2,
        subject: "Mathematics",
        term: "Term 2",
        year: 2024,
        cat1Score: 25,
        cat2Score: 28,
        examScore: 85,
        tutoringHoursReceived: 7.0,
        tutoringGainAvg: 0.40,
      });
      expect(upsertRes.ok).toBe(true);
      expect(upsertRes.record?.totalPercent).toBeGreaterThan(80);
    });

    it("should compute statistical correlation and Cohen's d between peer tutoring and CAT scores", () => {
      const correlation = computeCATImpactCorrelation("s1", "Mathematics", 2, "Term 2");

      expect(correlation.sampleSize).toBeGreaterThanOrEqual(8);
      expect(correlation.tutoredCount).toBeGreaterThanOrEqual(4);
      expect(correlation.nonTutoredCount).toBeGreaterThanOrEqual(4);

      // Tutored students should exhibit higher average CAT percentage than control group
      expect(correlation.tutoredAvgCAT).toBeGreaterThan(correlation.nonTutoredAvgCAT);
      expect(correlation.absoluteLift).toBeGreaterThan(10); // >10 percentage points lift
      expect(correlation.relativeLiftPercent).toBeGreaterThan(15);

      // Pearson correlation r and Cohen's d
      expect(correlation.correlationCoefficient).toBeGreaterThan(0.6); // Strong positive correlation
      expect(correlation.cohensD).toBeGreaterThan(0.8); // Large effect size
      expect(correlation.statisticallySignificant).toBe(true);
      expect(correlation.narrative).toContain("achieved an average term CAT score");
    });
  });

  describe("4. KNEC KCSE & CBC Past Paper Repository", () => {
    it("should retrieve past papers with filtering by subject, level, and search", () => {
      const allPapers = getPastPapers();
      expect(allPapers.length).toBeGreaterThanOrEqual(6);

      const kcseMath = getPastPapers({ subject: "Mathematics", level: "KCSE" });
      expect(kcseMath.length).toBeGreaterThanOrEqual(2);

      const cbcScience = getPastPapers({ level: "CBC" });
      expect(cbcScience.length).toBeGreaterThanOrEqual(1);
      expect(cbcScience[0].grade).toBe(8);

      const searched = getPastPapers({ search: "Density" });
      expect(searched.length).toBeGreaterThanOrEqual(1);
      expect(searched[0].subject).toBe("Physics");
    });

    it("should fetch past paper by ID with complete KNEC marking scheme solutions", () => {
      const paper = getPastPaperById("pp-kcse-2023-math-1");
      expect(paper).not.toBeNull();
      expect(paper?.sampleQuestions.length).toBeGreaterThanOrEqual(2);

      const q1 = paper!.sampleQuestions[0];
      expect(q1.qNumber).toContain("Section I Q4");
      expect(q1.marks).toBe(3);
      expect(q1.solution).toContain("(3x - 4)(x - 2)");
    });
  });
});
