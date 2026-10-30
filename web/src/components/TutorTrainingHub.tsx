import { useState, useEffect } from "react";
import type { TutorTrainingModule, TutorTrainingProgress } from "../../../shared/types";
import { saveTrainingProgressOffline, getTrainingProgressOffline } from "../db";

interface TutorTrainingHubProps {
  tutorId?: string;
  tutorName?: string;
  onOpenCert?: () => void;
}

export function TutorTrainingHub({
  tutorId = "t1",
  tutorName = "Wanjiru",
  onOpenCert,
}: TutorTrainingHubProps) {
  const [modules, setModules] = useState<TutorTrainingModule[]>([]);
  const [progress, setProgress] = useState<TutorTrainingProgress | null>(null);
  const [activeModule, setActiveModule] = useState<TutorTrainingModule | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    explanation: string;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTrainingData();
  }, [tutorId]);

  async function loadTrainingData() {
    try {
      const [modsRes, progRes] = await Promise.all([
        fetch("/api/training/modules"),
        fetch(`/api/training/progress/${tutorId}`),
      ]);
      if (modsRes.ok) {
        const mods = await modsRes.json();
        setModules(mods);
        if (mods.length > 0 && !activeModule) setActiveModule(mods[0]);
      }
      if (progRes.ok) {
        const prog = await progRes.json();
        setProgress(prog);
        saveTrainingProgressOffline(prog);
      }
    } catch {
      // Offline fallback
      const cachedProg = await getTrainingProgressOffline(tutorId);
      if (cachedProg) setProgress(cachedProg);
    }
  }

  async function handleAnswerSubmit() {
    if (!activeModule || selectedOption === null) return;
    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/training/complete-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId,
          moduleId: activeModule.id,
          answer: selectedOption,
        }),
      });
      const data = await res.json();
      setFeedback({
        correct: data.correct,
        explanation: data.explanation,
        message: data.message,
      });
      if (data.progress) {
        setProgress(data.progress);
        saveTrainingProgressOffline(data.progress);
      }
    } catch {
      setFeedback({
        correct: false,
        explanation: "Unable to verify answer. Please check network connection.",
        message: "Network error",
      });
    } finally {
      setLoading(false);
    }
  }

  const completedCount = progress?.completedModuleIds.length || 0;
  const totalCount = modules.length || 4;
  const isCertified = !!progress?.certifiedBadge;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="training-hub-container">
      {/* Header Banner */}
      <div className="training-hub-banner">
        <div className="banner-text">
          <span className="badge-pill">Phase 8 • Pedagogical Excellence</span>
          <h2>Peer Tutor Pedagogical Training Hub</h2>
          <p>
            Secondary school peer tutoring is most impactful when tutors facilitate guided
            inquiry rather than dictating solutions. Complete all 4 micro-modules to earn the
            verified <strong>Certified Peer Tutor</strong> badge and receive a +10 point boost in
            the explainable matchmaker.
          </p>
        </div>

        <div className="badge-preview-card">
          <div className={`cert-medal ${isCertified ? "unlocked" : "locked"}`}>
            <span className="medal-icon">{isCertified ? "🏆" : "🔒"}</span>
          </div>
          <div className="medal-info">
            <span className="status-label">{isCertified ? "VERIFIED CERTIFIED" : "IN TRAINING"}</span>
            <strong>{tutorName}</strong>
            <small>{completedCount}/{totalCount} Modules Passed</small>
          </div>
          {isCertified && (
            <button className="view-cert-btn" onClick={onOpenCert}>
              🖨️ View Certificate
            </button>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className="training-progress-bar-card">
        <div className="progress-labels">
          <span>Certification Progress: <strong>{progressPercent}% Complete</strong></span>
          <span>{isCertified ? "✓ All competencies verified" : `${totalCount - completedCount} module(s) remaining`}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Main Grid: Modules List + Interactive Workspace */}
      <div className="training-grid">
        {/* Module Nav Cards */}
        <div className="module-list-column">
          <h3>Pedagogy Curriculum</h3>
          <div className="modules-stack">
            {modules.map((m, idx) => {
              const isDone = progress?.completedModuleIds.includes(m.id);
              const isActive = activeModule?.id === m.id;
              return (
                <div
                  key={m.id}
                  className={`module-nav-card ${isActive ? "active" : ""} ${isDone ? "completed" : ""}`}
                  onClick={() => {
                    setActiveModule(m);
                    setSelectedOption(null);
                    setFeedback(null);
                  }}
                >
                  <div className="mod-idx-circle">
                    {isDone ? "✓" : idx + 1}
                  </div>
                  <div className="mod-nav-text">
                    <strong>{m.title}</strong>
                    <p>{m.subtitle}</p>
                  </div>
                  {isDone && <span className="done-pill">Passed</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Module Interactive Content */}
        {activeModule && (
          <div className="module-workspace-column">
            <div className="workspace-card">
              <div className="workspace-header">
                <div>
                  <span className="topic-tag">Micro-Module</span>
                  <h3>{activeModule.title}</h3>
                  <p className="subtitle">{activeModule.subtitle}</p>
                </div>
                {progress?.completedModuleIds.includes(activeModule.id) && (
                  <span className="passed-badge">✓ Competency Passed</span>
                )}
              </div>

              {/* Core Principles */}
              <div className="principles-section">
                <h4>Core Pedagogical Principles</h4>
                <ul className="principles-list">
                  {activeModule.principles.map((p, i) => (
                    <li key={i}>
                      <span className="bullet-icon">💡</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Classroom Scenario */}
              <div className="scenario-card">
                <h4>Classroom Case Study</h4>
                <div className="scenario-body">
                  <span className="quote-icon">“</span>
                  <p>{activeModule.scenario}</p>
                </div>
              </div>

              {/* Scenario Quiz */}
              <div className="quiz-section">
                <h4>Pedagogical Decision Check</h4>
                <p className="quiz-question">{activeModule.quiz.question}</p>

                <div className="options-stack">
                  {activeModule.quiz.options.map((opt, oIdx) => {
                    const isSelected = selectedOption === oIdx;
                    return (
                      <label
                        key={oIdx}
                        className={`quiz-option-label ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedOption(oIdx)}
                      >
                        <input
                          type="radio"
                          name="quiz-opt"
                          checked={isSelected}
                          onChange={() => setSelectedOption(oIdx)}
                        />
                        <span className="opt-letter">
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="opt-text">{opt}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="submit-action-row">
                  <button
                    className="action-pill-btn primary"
                    disabled={selectedOption === null || loading}
                    onClick={handleAnswerSubmit}
                  >
                    {loading ? "Checking..." : "Submit Pedagogical Choice"}
                  </button>
                </div>

                {/* Feedback Box */}
                {feedback && (
                  <div
                    className={`feedback-box ${feedback.correct ? "success" : "error"}`}
                  >
                    <div className="feedback-icon">
                      {feedback.correct ? "🎉" : "⚠️"}
                    </div>
                    <div className="feedback-text">
                      <strong>{feedback.message}</strong>
                      <p>{feedback.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
