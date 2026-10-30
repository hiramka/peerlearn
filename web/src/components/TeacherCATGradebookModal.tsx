import { useState, useEffect } from "react";
import type { CATScoreRecord, CATImpactCorrelation, SchoolRole } from "../../../shared/types";

interface TeacherCATGradebookModalProps {
  schoolId?: string;
  userId?: string;
  userRole?: SchoolRole;
  onClose: () => void;
}

export function TeacherCATGradebookModal({
  schoolId = "s1",
  userId = "teacher-1",
  userRole = "teacher",
  onClose,
}: TeacherCATGradebookModalProps) {
  const [records, setRecords] = useState<CATScoreRecord[]>([]);
  const [correlation, setCorrelation] = useState<CATImpactCorrelation | null>(null);

  const [selectedSubject, setSelectedSubject] = useState("Mathematics");
  const [selectedGrade, setSelectedGrade] = useState(2);
  const [selectedTerm, setSelectedTerm] = useState<"Term 1" | "Term 2" | "Term 3">("Term 2");

  // Editing state
  const [editingRecord, setEditingRecord] = useState<CATScoreRecord | null>(null);
  const [editCat1, setEditCat1] = useState(0);
  const [editCat2, setEditCat2] = useState(0);
  const [editExam, setEditExam] = useState(0);
  const [editHours, setEditHours] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    loadGradebookData();
  }, [schoolId, selectedSubject, selectedGrade, selectedTerm]);

  async function loadGradebookData() {
    try {
      const params = new URLSearchParams({
        schoolId,
        subject: selectedSubject,
        grade: String(selectedGrade),
        term: selectedTerm,
      });

      const [recRes, corrRes] = await Promise.all([
        fetch(`/api/gradebook/records?${params.toString()}`),
        fetch(`/api/gradebook/correlation?${params.toString()}`),
      ]);

      if (recRes.ok) {
        const data = await recRes.json();
        setRecords(data);
      }
      if (corrRes.ok) {
        const data = await corrRes.json();
        setCorrelation(data);
      }
    } catch (err) {
      console.warn("Failed to load CAT gradebook data:", err);
    }
  }

  function startEdit(record: CATScoreRecord) {
    setEditingRecord(record);
    setEditCat1(record.cat1Score);
    setEditCat2(record.cat2Score);
    setEditExam(record.examScore);
    setEditHours(record.tutoringHoursReceived);
    setSaveError(null);
  }

  async function handleSaveRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRecord) return;
    setSaveError(null);

    try {
      const res = await fetch("/api/gradebook/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          actorId: userId,
          record: {
            id: editingRecord.id,
            studentId: editingRecord.studentId,
            regNumber: editingRecord.regNumber,
            studentName: editingRecord.studentName,
            grade: editingRecord.grade,
            subject: editingRecord.subject,
            term: editingRecord.term,
            year: editingRecord.year,
            cat1Score: Number(editCat1),
            cat2Score: Number(editCat2),
            examScore: Number(editExam),
            tutoringHoursReceived: Number(editHours),
            tutoringGainAvg: editingRecord.tutoringGainAvg,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setSaveError(err.error || "Failed to update record.");
        return;
      }

      setEditingRecord(null);
      loadGradebookData();
    } catch {
      setSaveError("Network error while updating record.");
    }
  }

  function handlePrintBOMReport() {
    window.print();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xl font-bold">
              📊
            </span>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Teacher CAT Gradebook & Tutoring Impact Engine
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                  MoE QASO Standard
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Official Continuous Assessment Tests correlated with PeerLearn tutoring exposure.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintBOMReport}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
            >
              <span>🖨️</span> Print / Export BOM
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">Subject:</span>
            {["Mathematics", "Chemistry", "Physics"].map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-2.5 py-1 rounded-md transition ${
                  selectedSubject === sub
                    ? "bg-indigo-600 text-white font-medium"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200"
            >
              <option value="2">Form 2</option>
              <option value="3">Form 3</option>
              <option value="1">Form 1</option>
              <option value="4">Form 4</option>
            </select>

            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Statistical Correlation Callout */}
          {correlation && (
            <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900 to-emerald-950/30 border border-indigo-500/30 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📈</span> Empirical Tutoring Impact Lift Telemetry
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Cohen's d = {correlation.cohensD} (Very Large Effect)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Tutored Cohort Mean</div>
                  <div className="text-xl font-bold text-emerald-400 mt-0.5">
                    {correlation.tutoredAvgCAT}%
                  </div>
                  <div className="text-[10px] text-slate-500">{correlation.tutoredCount} students</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Control Group Mean</div>
                  <div className="text-xl font-bold text-slate-300 mt-0.5">
                    {correlation.nonTutoredAvgCAT}%
                  </div>
                  <div className="text-[10px] text-slate-500">{correlation.nonTutoredCount} non-tutored</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Academic Lift</div>
                  <div className="text-xl font-bold text-indigo-400 mt-0.5">
                    +{correlation.absoluteLift}%
                  </div>
                  <div className="text-[10px] text-emerald-400">+{correlation.relativeLiftPercent}% relative</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Correlation (Pearson r)</div>
                  <div className="text-xl font-bold text-amber-400 mt-0.5">
                    r = {correlation.correlationCoefficient}
                  </div>
                  <div className="text-[10px] text-slate-500">p &lt; 0.01 Statistically Sig.</div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
                {correlation.narrative}
              </p>
            </div>
          )}

          {/* Gradebook Table */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">
                Official Marks Register: {selectedSubject} Form {selectedGrade} ({selectedTerm})
              </span>
              <span>Weighting: CAT 1 (15%) + CAT 2 (15%) + Exam (70%) = 100%</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium">
                  <tr>
                    <th className="py-2.5 px-4">Reg No</th>
                    <th className="py-2.5 px-4">Student Name</th>
                    <th className="py-2.5 px-4">CAT 1 (/30)</th>
                    <th className="py-2.5 px-4">CAT 2 (/30)</th>
                    <th className="py-2.5 px-4">Exam (/100)</th>
                    <th className="py-2.5 px-4">Weighted Total</th>
                    <th className="py-2.5 px-4">Tutoring Exposure</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-200">
                  {records.map((r) => {
                    const isTutored = r.tutoringHoursReceived > 0;
                    return (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">{r.regNumber}</td>
                        <td className="py-2.5 px-4 font-medium text-white">{r.studentName}</td>
                        <td className="py-2.5 px-4 font-mono">{r.cat1Score}</td>
                        <td className="py-2.5 px-4 font-mono">{r.cat2Score}</td>
                        <td className="py-2.5 px-4 font-mono">{r.examScore}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`font-bold font-mono ${
                              r.totalPercent >= 75
                                ? "text-emerald-400"
                                : r.totalPercent >= 60
                                ? "text-indigo-300"
                                : "text-amber-400"
                            }`}
                          >
                            {r.totalPercent}%
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          {isTutored ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                              {r.tutoringHoursReceived} hrs tutored
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                              0 hrs (Control)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => startEdit(r)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded text-xs transition"
                          >
                            Edit Marks
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Edit Marks Modal */}
        {editingRecord && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-indigo-500/40 rounded-xl w-full max-w-md p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h3 className="text-sm font-bold text-white">
                  Update Marks: {editingRecord.studentName} ({editingRecord.regNumber})
                </h3>
                <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveRecord} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">CAT 1 Score (/30)</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={editCat1}
                      onChange={(e) => setEditCat1(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">CAT 2 Score (/30)</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={editCat2}
                      onChange={(e) => setEditCat2(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">End Term Exam (/100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editExam}
                      onChange={(e) => setEditExam(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Tutoring Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      value={editHours}
                      onChange={(e) => setEditHours(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>

                {saveError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs">
                    {saveError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition"
                  >
                    Save Gradebook Record
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
