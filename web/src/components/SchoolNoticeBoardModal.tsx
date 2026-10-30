import { useState, useEffect } from "react";
import type { SchoolNotice, SchoolRole } from "../../../shared/types";

interface SchoolNoticeBoardModalProps {
  schoolId?: string;
  userId?: string;
  userName?: string;
  userRole?: SchoolRole;
  userGrade?: number;
  onClose: () => void;
}

export function SchoolNoticeBoardModal({
  schoolId = "s1",
  userId = "teacher-1",
  userName = "Mr. Otieno",
  userRole = "teacher",
  userGrade,
  onClose,
}: SchoolNoticeBoardModalProps) {
  const [notices, setNotices] = useState<SchoolNotice[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"academic" | "exam_timetable" | "urgent" | "general">("academic");
  const [content, setContent] = useState("");
  const [targetGrades, setTargetGrades] = useState<number[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [broadcastSMS, setBroadcastSMS] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotices();
  }, [schoolId, userGrade]);

  async function fetchNotices() {
    try {
      const url = userGrade
        ? `/api/notices?schoolId=${schoolId}&grade=${userGrade}`
        : `/api/notices?schoolId=${schoolId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotices(data);
      }
    } catch (err) {
      console.warn("Failed to load school notices:", err);
    }
  }

  async function handleCreateNotice(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          authorId: userId,
          authorName: userName,
          authorRole: userRole,
          title,
          category,
          targetGrades,
          content,
          isPinned,
          broadcastSMS,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error || "Failed to post notice.");
        return;
      }

      setShowCreateModal(false);
      setTitle("");
      setContent("");
      setIsPinned(false);
      setBroadcastSMS(false);
      setTargetGrades([]);
      fetchNotices();
    } catch {
      setFormError("Network error while submitting notice.");
    }
  }

  async function handleTogglePin(noticeId: string, currentPin: boolean) {
    try {
      const res = await fetch(`/api/notices/${noticeId}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          isPinned: !currentPin,
          actorId: userId,
        }),
      });
      if (res.ok) fetchNotices();
    } catch (err) {
      console.warn("Failed to pin notice:", err);
    }
  }

  async function handleDelete(noticeId: string) {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    try {
      const res = await fetch(`/api/notices/${noticeId}?schoolId=${schoolId}&actorId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) fetchNotices();
    } catch (err) {
      console.warn("Failed to delete notice:", err);
    }
  }

  const filteredNotices = notices.filter((n) => {
    if (categoryFilter !== "all" && n.category !== categoryFilter) return false;
    return true;
  });

  const canPost = userRole === "teacher" || userRole === "school_admin" || userRole === "platform_admin";

  const categoryColorMap = {
    academic: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    exam_timetable: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    urgent: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    general: "bg-slate-700/30 text-slate-300 border-slate-600/30",
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xl font-bold">
              📢
            </span>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                School Notice Board & Academic Bulletin
              </h2>
              <p className="text-xs text-slate-400">
                Official broadcasts for remedial sessions, CAT schedules, and laboratory updates.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canPost && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow"
              >
                <span>+</span> Post Notice
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-900 flex items-center gap-2 text-xs overflow-x-auto">
          <span className="text-slate-400 font-medium">Category:</span>
          {[
            { id: "all", label: "All Notices" },
            { id: "academic", label: "Academic Remedial" },
            { id: "exam_timetable", label: "Exam Timetable" },
            { id: "urgent", label: "Urgent" },
            { id: "general", label: "General Updates" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-md transition whitespace-nowrap ${
                categoryFilter === cat.id
                  ? "bg-amber-600 text-white font-medium"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Notices Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredNotices.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
              No school notices found in this category.
            </div>
          ) : (
            filteredNotices.map((n) => (
              <div
                key={n.id}
                className={`p-5 rounded-xl border transition ${
                  n.isPinned
                    ? "bg-amber-950/15 border-amber-500/40 shadow-md"
                    : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {n.isPinned && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                        📌 Pinned Notice
                      </span>
                    )}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded border font-medium uppercase tracking-wider text-[10px] ${
                        categoryColorMap[n.category] || categoryColorMap.general
                      }`}
                    >
                      {n.category.replace("_", " ")}
                    </span>
                    {n.targetGrades.length > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Target: {n.targetGrades.map((g) => (g === 8 ? "Grade 8" : `Form ${g}`)).join(", ")}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        All Students
                      </span>
                    )}
                    {n.smsBroadcasted && (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                        📲 SMS Dispatched to Parents
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1.5">{n.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{n.content}</p>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Posted by <strong className="text-slate-200">{n.authorName}</strong>
                  </span>
                  {canPost && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePin(n.id, n.isPinned)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
                      >
                        {n.isPinned ? "Unpin" : "Pin to Top"}
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-900/40 text-rose-400 transition"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Notice Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/40 rounded-xl w-full max-w-lg p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📢</span> Publish Official School Notice
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateNotice} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Notice Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Form 3 Chemistry Paper 3 Practical Mock Schedule"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                    >
                      <option value="academic">Academic Remedial</option>
                      <option value="exam_timetable">Exam Timetable</option>
                      <option value="urgent">Urgent Announcement</option>
                      <option value="general">General Updates</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Target Form / Class</label>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "all") setTargetGrades([]);
                        else setTargetGrades([Number(val)]);
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                    >
                      <option value="all">All Forms & Classes</option>
                      <option value="8">CBC Grade 8</option>
                      <option value="1">Form 1</option>
                      <option value="2">Form 2</option>
                      <option value="3">Form 3</option>
                      <option value="4">Form 4</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Notice Content</label>
                  <textarea
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Provide detailed instructions, times, laboratory venues, or materials required..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500"
                    />
                    <span>Pin to top of board</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={broadcastSMS}
                      onChange={(e) => setBroadcastSMS(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500"
                    />
                    <span>Broadcast SMS to parents</span>
                  </label>
                </div>

                {formError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs">
                    {formError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold transition"
                  >
                    Publish Notice
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
