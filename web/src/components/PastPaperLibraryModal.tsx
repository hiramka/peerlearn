import { useState, useEffect } from "react";
import type { PastPaperResource } from "../../../shared/types";

interface PastPaperLibraryModalProps {
  onClose: () => void;
}

export function PastPaperLibraryModal({ onClose }: PastPaperLibraryModalProps) {
  const [papers, setPapers] = useState<PastPaperResource[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<PastPaperResource | null>(null);

  const [subjectFilter, setSubjectFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState<"All" | "KCSE" | "CBC">("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPapers();
  }, [subjectFilter, levelFilter, searchQuery]);

  async function fetchPapers() {
    try {
      const params = new URLSearchParams();
      if (subjectFilter !== "All") params.append("subject", subjectFilter);
      if (levelFilter !== "All") params.append("level", levelFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/pastpapers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPapers(data);
      }
    } catch (err) {
      console.warn("Failed to fetch past papers:", err);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-teal-500/30 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xl font-bold">
              📚
            </span>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                KNEC Past Paper & Scheme of Work Repository
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-medium border border-teal-500/30">
                  Offline Synced
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official Kenya National Examinations Council past papers and marking schemes for peer revision.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Subject:</span>
            {["All", "Mathematics", "Chemistry", "Physics", "Integrated Science"].map((sub) => (
              <button
                key={sub}
                onClick={() => setSubjectFilter(sub)}
                className={`px-2.5 py-1 rounded-md transition ${
                  subjectFilter === sub
                    ? "bg-teal-600 text-white font-medium"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200"
            >
              <option value="All">All Curriculum Levels</option>
              <option value="KCSE">8-4-4 KCSE Examination</option>
              <option value="CBC">CBC Junior School Assessment</option>
            </select>

            <input
              type="text"
              placeholder="Search paper or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200 placeholder:text-slate-500 w-44 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Papers Grid */}
          <div className={`${selectedPaper ? "hidden md:block md:col-span-5" : "col-span-12"} space-y-3`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{papers.length} Past Papers Available</span>
              <span>KNEC Verified</span>
            </div>

            {papers.map((p) => {
              const isSelected = selectedPaper?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPaper(p)}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? "bg-teal-950/20 border-teal-500/60 shadow-lg"
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold">
                        {p.level} {p.year}
                      </span>
                      <span className="text-xs text-slate-400">
                        {p.subject} (Paper {p.paperNumber})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">{p.fileSize}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-2">{p.title}</h3>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                    <span className="text-emerald-400 flex items-center gap-1">
                      ✓ Marking Scheme Included
                    </span>
                    <span className="text-slate-300">
                      {p.sampleQuestions.length} Sample Questions
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paper Detail & Marking Scheme Drawer */}
          {selectedPaper && (
            <div className="col-span-12 md:col-span-7 bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-semibold">
                      {selectedPaper.level} {selectedPaper.year}
                    </span>
                    <span className="text-xs text-slate-400">{selectedPaper.term}</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{selectedPaper.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedPaper(null)}
                  className="md:hidden text-xs text-slate-400 hover:text-white"
                >
                  ← Back
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  KNEC Exam Questions & Official Marking Scheme Breakdown
                </h4>

                {selectedPaper.sampleQuestions.map((q, idx) => (
                  <div key={idx} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-400">{q.qNumber}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        [{q.marks} Marks]
                      </span>
                    </div>

                    <div className="text-sm text-slate-200 leading-relaxed font-sans font-medium">
                      {q.text}
                    </div>

                    {/* Marking Scheme Box */}
                    <div className="bg-slate-950/80 border border-teal-500/20 rounded-lg p-3 text-xs">
                      <div className="text-[11px] font-bold text-teal-300 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <span>📝</span> Official Model Solution & Mark Allocation
                      </div>
                      <pre className="text-slate-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                        {q.solution}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
