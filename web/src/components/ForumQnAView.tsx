import { useState, useEffect } from "react";
import type { ForumQuestion, ForumAnswer, SchoolRole } from "../../../shared/types";

interface ForumQnAViewProps {
  schoolId?: string;
  userId?: string;
  userName?: string;
  userRole?: SchoolRole;
  userGrade?: number;
  onClose?: () => void;
}

export function ForumQnAView({
  schoolId = "s1",
  userId = "l1",
  userName = "Amina K.",
  userRole = "learner",
  userGrade = 2,
  onClose,
}: ForumQnAViewProps) {
  const [questions, setQuestions] = useState<ForumQuestion[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [questionDetails, setQuestionDetails] = useState<{
    question: ForumQuestion | null;
    answers: ForumAnswer[];
  } | null>(null);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [gradeFilter, setGradeFilter] = useState<number | "All">("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "resolved" | "open">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals & Forms
  const [showAskModal, setShowAskModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newSubject, setNewSubject] = useState("Mathematics");
  const [newGrade, setNewGrade] = useState<number>(userGrade);
  const [newFormula, setNewFormula] = useState("");
  const [askError, setAskError] = useState<string | null>(null);

  // New Answer Form
  const [answerContent, setAnswerContent] = useState("");
  const [answerSteps, setAnswerSteps] = useState<string[]>([""]);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [schoolId, subjectFilter, gradeFilter, statusFilter, searchQuery]);

  async function fetchQuestions() {
    try {
      const params = new URLSearchParams({ schoolId });
      if (subjectFilter !== "All") params.append("subject", subjectFilter);
      if (gradeFilter !== "All") params.append("grade", String(gradeFilter));
      if (statusFilter === "resolved") params.append("resolved", "true");
      if (statusFilter === "open") params.append("resolved", "false");
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/forum/questions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (err) {
      console.warn("Failed to fetch forum questions:", err);
    }
  }

  async function openQuestionDetails(qId: string) {
    setSelectedQuestionId(qId);
    try {
      const res = await fetch(`/api/forum/questions/${qId}`);
      if (res.ok) {
        const data = await res.json();
        setQuestionDetails(data);
      }
    } catch (err) {
      console.warn("Failed to load question details:", err);
    }
  }

  async function handleVote(type: "question" | "answer", targetId: string) {
    try {
      const res = await fetch("/api/forum/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId, userId }),
      });
      if (res.ok) {
        fetchQuestions();
        if (selectedQuestionId) {
          openQuestionDetails(selectedQuestionId);
        }
      }
    } catch (err) {
      console.warn("Vote failed:", err);
    }
  }

  async function handleAcceptAnswer(answerId: string) {
    if (!selectedQuestionId) return;
    try {
      const res = await fetch("/api/forum/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: selectedQuestionId,
          answerId,
          actorId: userId,
        }),
      });
      if (res.ok) {
        openQuestionDetails(selectedQuestionId);
        fetchQuestions();
      }
    } catch (err) {
      console.warn("Accept answer failed:", err);
    }
  }

  async function handleAskQuestion(e: React.FormEvent) {
    e.preventDefault();
    setAskError(null);

    try {
      const res = await fetch("/api/forum/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          authorId: userId,
          authorName: userName,
          authorRole: userRole,
          grade: Number(newGrade),
          subject: newSubject,
          title: newTitle,
          content: newContent,
          formulaOrSnippet: newFormula,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAskError(data.error || "Failed to post question.");
        return;
      }

      setShowAskModal(false);
      setNewTitle("");
      setNewContent("");
      setNewFormula("");
      fetchQuestions();
      openQuestionDetails(data.id);
    } catch {
      setAskError("Network error while submitting question.");
    }
  }

  async function handleSubmitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedQuestionId) return;
    setAnswerError(null);
    setSubmittingAnswer(true);

    try {
      const cleanedSteps = answerSteps.filter((s) => s.trim().length > 0);
      const res = await fetch("/api/forum/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: selectedQuestionId,
          schoolId,
          authorId: userId,
          authorName: userName,
          authorRole: userRole,
          isCertifiedTutor: userRole === "tutor" || userRole === "teacher",
          content: answerContent,
          steps: cleanedSteps.length > 0 ? cleanedSteps : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAnswerError(data.error || "Failed to submit answer.");
        setSubmittingAnswer(false);
        return;
      }

      setAnswerContent("");
      setAnswerSteps([""]);
      openQuestionDetails(selectedQuestionId);
      fetchQuestions();
    } catch {
      setAnswerError("Failed to submit answer due to network error.");
    } finally {
      setSubmittingAnswer(false);
    }
  }

  function addStepField() {
    setAnswerSteps([...answerSteps, ""]);
  }

  function updateStepField(index: number, val: string) {
    const updated = [...answerSteps];
    updated[index] = val;
    setAnswerSteps(updated);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xl font-bold">
              💬
            </span>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Subject Q&A & Peer Homework Forum
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                  Kenya DPA Protected
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Asynchronous Socratic problem-solving for Kenyan 8-4-4 & CBC secondary subjects.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAskModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5 shadow-md shadow-emerald-900/20"
            >
              <span>+</span> Ask Question
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Subject:</span>
            {["All", "Mathematics", "Chemistry", "Physics", "Biology", "Integrated Science"].map((sub) => (
              <button
                key={sub}
                onClick={() => setSubjectFilter(sub)}
                className={`px-2.5 py-1 rounded-md transition ${
                  subjectFilter === sub
                    ? "bg-emerald-600 text-white font-medium"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value === "All" ? "All" : Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200"
            >
              <option value="All">All Levels</option>
              <option value="8">CBC Grade 8</option>
              <option value="1">Form 1</option>
              <option value="2">Form 2</option>
              <option value="3">Form 3</option>
              <option value="4">Form 4</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200"
            >
              <option value="all">All Status</option>
              <option value="resolved">✓ Solved Only</option>
              <option value="open">Open (Unanswered)</option>
            </select>

            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200 placeholder:text-slate-500 w-44 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Questions Column */}
          <div className={`${selectedQuestionId ? "hidden md:block md:col-span-5" : "col-span-12"} space-y-3`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{questions.length} Questions Found</span>
              <span>Sorted by Latest</span>
            </div>

            {questions.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400">
                <p className="text-sm">No forum questions found matching criteria.</p>
                <button
                  onClick={() => setShowAskModal(true)}
                  className="mt-3 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs"
                >
                  Post First Question
                </button>
              </div>
            ) : (
              questions.map((q) => {
                const isSelected = q.id === selectedQuestionId;
                return (
                  <div
                    key={q.id}
                    onClick={() => openQuestionDetails(q.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? "bg-emerald-950/20 border-emerald-500/60 shadow-lg"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                          {q.subject}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {q.grade === 8 ? "CBC Grade 8" : `Form ${q.grade}`}
                        </span>
                        {q.isResolved && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            ✓ Solved
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white line-clamp-2 hover:text-emerald-300">
                      {q.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{q.content}</p>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                      <span className="text-[11px] text-slate-400">By {q.authorName}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-emerald-400">
                          ▲ {q.upvotes}
                        </span>
                        <span className="flex items-center gap-1 text-slate-300">
                          💬 {q.answersCount} {q.answersCount === 1 ? "answer" : "answers"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Question Details Column */}
          {selectedQuestionId && questionDetails && (
            <div className="col-span-12 md:col-span-7 bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              {/* Question Header */}
              {questionDetails.question && (
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium">
                        {questionDetails.question.subject}
                      </span>
                      <span className="text-xs text-slate-400">
                        {questionDetails.question.grade === 8 ? "CBC Grade 8" : `Form ${questionDetails.question.grade}`}
                      </span>
                      {questionDetails.question.isResolved && (
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ✓ Solution Accepted
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedQuestionId(null)}
                      className="md:hidden text-xs text-slate-400 hover:text-white"
                    >
                      ← Back to list
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">
                    {questionDetails.question.title}
                  </h3>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {questionDetails.question.content}
                  </p>

                  {questionDetails.question.formulaOrSnippet && (
                    <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-emerald-400">
                      <code>{questionDetails.question.formulaOrSnippet}</code>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Asked by <strong className="text-slate-200">{questionDetails.question.authorName}</strong>
                    </span>
                    <button
                      onClick={() => handleVote("question", questionDetails.question!.id)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-emerald-400 flex items-center gap-1.5 transition"
                    >
                      ▲ Helpful ({questionDetails.question.upvotes})
                    </button>
                  </div>
                </div>
              )}

              {/* Answers List */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                  <span>Socratic Answers & Explanations ({questionDetails.answers.length})</span>
                </h4>

                {questionDetails.answers.length === 0 ? (
                  <div className="p-5 text-center bg-slate-900/50 rounded-lg border border-dashed border-slate-800 text-slate-400 text-xs">
                    No solutions posted yet. Be the first peer tutor to answer!
                  </div>
                ) : (
                  questionDetails.answers.map((ans) => (
                    <div
                      key={ans.id}
                      className={`p-4 rounded-xl border ${
                        ans.isAccepted
                          ? "bg-emerald-950/20 border-emerald-500/40"
                          : "bg-slate-900/80 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">
                            {ans.authorName}
                          </span>
                          {ans.isCertifiedTutor && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              🎓 Certified Peer Tutor
                            </span>
                          )}
                          {ans.isAccepted && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold">
                              ✓ Accepted Solution
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {new Date(ans.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-sm text-slate-200 leading-relaxed">{ans.content}</p>

                      {ans.steps && ans.steps.length > 0 && (
                        <div className="mt-3 pl-3 border-l-2 border-emerald-500/40 space-y-1">
                          {ans.steps.map((st, i) => (
                            <div key={i} className="text-xs text-slate-300 font-mono">
                              {st}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                        <button
                          onClick={() => handleVote("answer", ans.id)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-emerald-400 flex items-center gap-1 transition"
                        >
                          ▲ {ans.upvotes}
                        </button>

                        {!ans.isAccepted && (userRole === "teacher" || userRole === "school_admin" || userId === questionDetails.question?.authorId) && (
                          <button
                            onClick={() => handleAcceptAnswer(ans.id)}
                            className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded transition"
                          >
                            Mark as Accepted Solution
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Submit Answer Form */}
              <form onSubmit={handleSubmitAnswer} className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                <h5 className="text-xs font-semibold text-slate-300">
                  Write a Socratic Answer / Explanation
                </h5>
                <textarea
                  rows={3}
                  value={answerContent}
                  onChange={(e) => setAnswerContent(e.target.value)}
                  placeholder="Explain the foundational concept or principle first..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />

                {/* Socratic Steps */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Step-by-Step Solving Breakdown:</span>
                    <button
                      type="button"
                      onClick={addStepField}
                      className="text-emerald-400 hover:underline"
                    >
                      + Add Step
                    </button>
                  </div>
                  {answerSteps.map((st, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={st}
                      onChange={(e) => updateStepField(idx, e.target.value)}
                      placeholder={`Step ${idx + 1}: e.g. Factorize 2x(x + 3) + 1(x + 3)`}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  ))}
                </div>

                {answerError && (
                  <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-800/50 p-2 rounded">
                    {answerError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submittingAnswer || !answerContent.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                >
                  {submittingAnswer ? "Posting..." : "Post Solution"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Ask Question Modal */}
        {showAskModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl w-full max-w-lg p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>❓</span> Ask a Peer Tutoring Question
                </h3>
                <button
                  onClick={() => setShowAskModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAskQuestion} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Question Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. How to solve 2x² + 7x + 3 by splitting middle term?"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Subject</label>
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                    >
                      <option value="Mathematics">Mathematics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Physics">Physics</option>
                      <option value="Biology">Biology</option>
                      <option value="Integrated Science">Integrated Science (CBC)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Class / Level</label>
                    <select
                      value={newGrade}
                      onChange={(e) => setNewGrade(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                    >
                      <option value="8">CBC Grade 8</option>
                      <option value="1">Form 1</option>
                      <option value="2">Form 2</option>
                      <option value="3">Form 3</option>
                      <option value="4">Form 4</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Detailed Explanation</label>
                  <textarea
                    rows={4}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Describe where you get stuck and what you have tried so far..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Formula / Equation Snippet (Optional)</label>
                  <input
                    type="text"
                    value={newFormula}
                    onChange={(e) => setNewFormula(e.target.value)}
                    placeholder="e.g. 2x^2 + 7x + 3 = 0 or P1*V1 = P2*V2"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {askError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs">
                    {askError}
                  </div>
                )}

                <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300">
                  🛡️ <strong>Kenya DPA Rule:</strong> Do not include phone numbers, social media handles, or full personal names in questions.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAskModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition"
                  >
                    Post Question
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
