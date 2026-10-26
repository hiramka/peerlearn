import { useEffect, useState, useRef } from "react";
import type { Lesson, Question, RankedTutor, Topic } from "../../shared/types";
import {
  cacheTopics,
  cachedTopics,
  getLesson,
  offlineIds,
  pendingCount,
  queueSession,
  saveLesson,
  saveAllLessons,
  cacheTeacherSummary,
  cachedTeacherSummary,
  getLastSyncTime,
  syncOutbox,
} from "./db";

const LEARNER_ID = "l1";
type Stage = "browse" | "pre" | "lesson" | "post" | "done";
type NavView = "dashboard" | "courses" | "schedule" | "teacher" | "verify";
interface Summary { topic: string; sessions: number; avgPre: number; avgPost: number; avgRating?: number }

function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const u = () => setOn(navigator.onLine);
    window.addEventListener("online", u);
    window.addEventListener("offline", u);
    return () => {
      window.removeEventListener("online", u);
      window.removeEventListener("offline", u);
    };
  }, []);
  return on;
}

// Circular segmented tick gauge matching reference UI
function RadialProgressGauge({ percent }: { percent: number }) {
  const totalTicks = 28;
  const activeTicks = Math.round((percent / 100) * totalTicks);
  const radius = 52;
  const tickLength = 11;
  const center = 70;

  return (
    <div className="radial-gauge-container">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {Array.from({ length: totalTicks }).map((_, i) => {
          const angle = (i * 360) / totalTicks - 90;
          const rad = (angle * Math.PI) / 180;
          const x1 = center + (radius - tickLength) * Math.cos(rad);
          const y1 = center + (radius - tickLength) * Math.sin(rad);
          const x2 = center + radius * Math.cos(rad);
          const y2 = center + radius * Math.sin(rad);
          const isActive = i < activeTicks;

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isActive ? "#111827" : "#e5e7eb"}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          );
        })}
        <text
          x="70"
          y="76"
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fill="#111827"
          fontFamily="inherit"
        >
          {percent}%
        </text>
      </svg>
      <div className="gauge-sub-progress">
        <div className="gauge-sub-label">
          <span>Progress</span>
          <strong>{percent}%</strong>
        </div>
        <div className="gauge-linear-track">
          <div className="gauge-linear-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

// In-Session Countdown Timer Component
function SessionTimer({ initialMinutes = 20 }: { initialMinutes?: number }) {
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="session-timer-widget">
      <div className="timer-display">
        <span className="timer-icon">⏱️</span>
        <span className="timer-digits">{timeStr}</span>
      </div>
      <div className="timer-controls">
        <button
          className="timer-btn"
          onClick={() => setIsRunning(!isRunning)}
          title={isRunning ? "Pause timer" : "Start timer"}
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          className="timer-btn reset"
          onClick={() => {
            setIsRunning(false);
            setSecondsLeft(initialMinutes * 60);
          }}
          title="Reset timer"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const online = useOnline();
  const [navView, setNavView] = useState<NavView>("dashboard");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [offline, setOffline] = useState<number[]>([]);
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState<string>("Never");
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [tutors, setTutors] = useState<RankedTutor[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<RankedTutor | null>(null);
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [stage, setStage] = useState<Stage>("browse");
  const [pre, setPre] = useState(0);
  const [post, setPost] = useState(0);
  const [msg, setMsg] = useState("");
  const [summary, setSummary] = useState<Summary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [activeSlot, setActiveSlot] = useState(1);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // In-session interactive checklist
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  // Session feedback state
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Tutor Verification State
  const [verifyTopicId, setVerifyTopicId] = useState<number>(1);
  const [verifyScore, setVerifyScore] = useState<number | null>(null);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyAnswers, setVerifyAnswers] = useState<number[]>([]);

  const refresh = async () => {
    setOffline(await offlineIds());
    setPending(await pendingCount());
    const storedLastSync = await getLastSyncTime();
    if (storedLastSync) setLastSync(storedLastSync);
  };

  useEffect(() => {
    (async () => {
      try {
        const t: Topic[] = await (await fetch("/api/topics")).json();
        setTopics(t);
        cacheTopics(t);
        if (t.length > 0) {
          handleSelectTopic(t[0]);
        }
      } catch {
        const cached = await cachedTopics();
        setTopics(cached);
        if (cached.length > 0) {
          handleSelectTopic(cached[0]);
        }
      }
      refresh();
    })();
  }, []);

  useEffect(() => {
    if (online) setTimeout(refresh, 800);
  }, [online]);

  async function handleSelectTopic(t: Topic) {
    setSelectedTopic(t);
    setMsg("");
    try {
      const ranked: RankedTutor[] = await (await fetch(`/api/matches?learnerId=${LEARNER_ID}&topic=${t.id}`)).json();
      setTutors(ranked);
      if (ranked.length > 0) {
        setSelectedTutor(ranked[0]);
      } else {
        setSelectedTutor(null);
      }
    } catch {
      setMsg("Peer matching requires a live connection. Downloaded lessons can still be reviewed offline.");
    }
  }

  // Single lesson download
  async function handleDownload(t: Topic, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      saveLesson(await (await fetch(`/api/lessons/${t.id}`)).json());
      setTimeout(refresh, 300);
      setMsg(`Topic "${t.name}" saved for offline study.`);
    } catch {
      setMsg("Connect to the internet to download this topic.");
    }
  }

  // Bulk offline download
  async function handleBulkDownload() {
    setIsBulkDownloading(true);
    setMsg("Downloading all curriculum topics for offline access...");
    try {
      const allLessons: Lesson[] = await (await fetch("/api/lessons")).json();
      await saveAllLessons(allLessons);
      await refresh();
      setMsg(`✓ Downloaded ${allLessons.length} modules! Entire curriculum is ready offline.`);
    } catch {
      setMsg("Failed bulk download. Please check your internet connection and try again.");
    } finally {
      setIsBulkDownloading(false);
    }
  }

  // Manual Sync Now button
  async function handleManualSync() {
    setIsSyncing(true);
    try {
      const res = await syncOutbox();
      setLastSync(res.timestamp);
      await refresh();
      if (online) {
        setMsg(`✓ Sync complete at ${res.timestamp}. Synced ${res.syncedCount} queued sessions. 0 pending.`);
      } else {
        setMsg(`Offline mode: ${res.remainingCount} session(s) queued locally in outbox.`);
      }
    } catch {
      setMsg("Sync failed. Check connection.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function startSession() {
    if (!selectedTopic) return;
    let l = await getLesson(selectedTopic.id);
    if (!l) {
      try {
        l = await (await fetch(`/api/lessons/${selectedTopic.id}`)).json();
      } catch {
        /* handled */
      }
    }
    if (!l) {
      return setMsg("This lesson is not downloaded yet. Please download it while online.");
    }
    setLesson(l);
    setQuizAnswers([]);
    setCheckedSteps({});
    setRating(5);
    setSelectedTags(["Clear steps", "Patient"]);
    setFeedbackSubmitted(false);
    setStage("pre");
  }

  async function finishSession(finalScore: number) {
    setPost(finalScore);
    setStage("done");
    if (selectedTopic) {
      await queueSession({
        learnerId: LEARNER_ID,
        tutorId: selectedTutor?.tutor.id || "t1",
        topicId: selectedTopic.id,
        pre,
        post: finalScore,
        learnerRating: rating,
        feedbackTags: selectedTags,
      });
    }
    refresh();
  }

  function submitFeedback() {
    setFeedbackSubmitted(true);
    setMsg("Thank you! Your feedback helps update tutor ranking.");
  }

  function resetSession() {
    setStage("browse");
    setLesson(null);
    setMsg("");
  }

  async function openTeacherView() {
    setNavView("teacher");
    try {
      const data = await (await fetch("/api/teacher/summary")).json();
      setSummary(data);
      await cacheTeacherSummary(data);
    } catch {
      const cached = await cachedTeacherSummary();
      if (cached && cached.length) {
        setSummary(cached);
        setMsg("Showing cached cohort analytics (Offline mode).");
      } else {
        setMsg("Teacher analytics requires an active connection for initial load.");
      }
    }
  }

  // Tutor Verification Submission
  async function submitVerification() {
    if (!lesson) return;
    const questions = lesson.pre;
    const correct = questions.filter((q, i) => verifyAnswers[i] === q.answer).length;
    const calculatedScore = correct / questions.length;
    setVerifyScore(calculatedScore);

    try {
      const res = await (
        await fetch("/api/tutors/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: "l1",
            studentName: "Amani R.",
            grade: 3,
            schoolId: "s1",
            language: "en",
            topicId: verifyTopicId,
            score: calculatedScore,
          }),
        })
      ).json();

      setVerifyMsg(res.message);
      if (selectedTopic) handleSelectTopic(selectedTopic);
    } catch {
      setVerifyMsg(
        calculatedScore >= 0.8
          ? "Passed verification check! Will register once back online."
          : "Score below 80% threshold. Practice with the lesson material and try again."
      );
    }
  }

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  // Filtered tutors and topics
  const filteredTopics = topics.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = subjectFilter === "All" || t.subject.toLowerCase() === subjectFilter.toLowerCase();
    return matchesSearch && matchesSubject;
  });

  const filteredTutors = tutors.filter((tr) => {
    return tr.tutor.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const avgProgress = summary.length
    ? Math.round((summary.reduce((acc, s) => acc + s.avgPost, 0) / summary.length) * 100)
    : 70;

  const allTopicsDownloaded = topics.length > 0 && topics.every((t) => offline.includes(t.id));

  return (
    <div className="dashboard-outer-canvas">
      {/* Centered Floating Tablet Frame */}
      <div className="dashboard-frame">
        {/* Left Vertical Icon Rail */}
        <aside className="icon-sidebar">
          <div className="sidebar-top-icons">
            <button
              className={`rail-icon-btn ${navView === "dashboard" && stage === "browse" ? "active" : ""}`}
              onClick={() => {
                setNavView("dashboard");
                setStage("browse");
              }}
              title="Dashboard"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </button>

            <button
              className={`rail-icon-btn ${navView === "courses" ? "active" : ""}`}
              onClick={() => {
                setNavView("courses");
                setStage("browse");
              }}
              title="Topics & Courses"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </button>

            <button
              className={`rail-icon-btn ${navView === "schedule" ? "active" : ""}`}
              onClick={() => {
                setNavView("schedule");
                setStage("browse");
              }}
              title="Schedule"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>

            <button
              className={`rail-icon-btn ${navView === "verify" ? "active" : ""}`}
              onClick={async () => {
                setNavView("verify");
                setStage("browse");
                const l = await getLesson(1);
                if (l) setLesson(l);
              }}
              title="Become a Tutor / Skill Verification"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
              </svg>
            </button>

            <button
              className={`rail-icon-btn ${navView === "teacher" ? "active" : ""}`}
              onClick={openTeacherView}
              title="Teacher Analytics"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </button>
          </div>

          <div className="sidebar-bottom-icons">
            <button
              className="rail-icon-btn"
              title={online ? `Online • Last sync: ${lastSync}` : `Offline • ${pending} queued`}
              onClick={handleManualSync}
            >
              <span className={`sidebar-status-dot ${online ? "online" : "offline"}`} />
            </button>
          </div>
        </aside>

        {/* Dashboard Main Workspace */}
        <section className="dashboard-content">
          {/* Top Bar Header */}
          <header className="dash-top-bar">
            <div className="dash-title-group">
              <h1 className="dash-page-title">
                {navView === "teacher"
                  ? "Teacher Dashboard"
                  : navView === "verify"
                  ? "Tutor Verification Check"
                  : "Dashboard"}
              </h1>
              <div className="dash-search-container">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search topics or tutors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="dash-search-input"
                />
              </div>
            </div>

            <div className="dash-user-controls">
              {/* Online / Offline status */}
              <div className={`status-chip ${online ? "online" : "offline"}`}>
                <span className="chip-dot" />
                <span>{online ? "Online" : "Offline"}</span>
              </div>

              {/* Sync Assurance Button & Info */}
              <button
                className={`sync-now-pill-btn ${isSyncing ? "syncing" : ""}`}
                onClick={handleManualSync}
                title={`Last sync: ${lastSync}. Click to force immediate synchronization.`}
              >
                <span className="sync-icon-rotate">⟳</span>
                <span>{isSyncing ? "Syncing..." : pending > 0 ? `Sync (${pending})` : "Sync Now"}</span>
              </button>

              <div className="user-profile-badge">
                <div className="user-avatar-circle">A</div>
                <span className="user-name">Amani R.</span>
              </div>
            </div>
          </header>

          {/* Flash message notice */}
          {msg && (
            <div className="dash-alert">
              <span>{msg}</span>
              <button className="dash-alert-close" onClick={() => setMsg("")}>×</button>
            </div>
          )}

          {/* Main Dashboard Grid View */}
          {stage === "browse" && navView !== "teacher" && navView !== "verify" && (
            <div className="dash-columns-layout">
              {/* Left / Center Column (Find your tutor & Schedule) */}
              <div className="dash-main-column">
                {/* Find Your Tutor Section */}
                <div className="dash-card find-tutor-section">
                  <div className="dash-card-header">
                    <div>
                      <h2 className="dash-section-heading">Find your tutor</h2>
                      <span className="section-sub-tip">Algorithm ranked by proven mastery and student gain</span>
                    </div>
                    <div className="subject-filter-select">
                      <select
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        className="filter-pill-dropdown"
                      >
                        <option value="All">All Subjects ▾</option>
                        <option value="Math">Math ▾</option>
                        <option value="Science">Science ▾</option>
                      </select>
                    </div>
                  </div>

                  {filteredTutors.length === 0 ? (
                    <div className="empty-subtext">No eligible tutors found. Connect online to load live peer matches.</div>
                  ) : (
                    <div className="tutor-rows-list">
                      {filteredTutors.map((tr) => {
                        const isSelected = selectedTutor?.tutor.id === tr.tutor.id;
                        const matchPct = Math.round(tr.score);
                        const gainPct = Math.round(tr.tutor.avgGain * 100);
                        const isExpanded = expandedBreakdownId === tr.tutor.id;

                        return (
                          <div key={tr.tutor.id} className="tutor-row-wrapper">
                            <div
                              className={`tutor-row-item ${isSelected ? "active" : ""}`}
                              onClick={() => setSelectedTutor(tr)}
                            >
                              <div className="tutor-row-avatar">
                                <span className="avatar-initials">
                                  {tr.tutor.name.substring(0, 2).toUpperCase()}
                                </span>
                              </div>

                              <div className="tutor-row-name">
                                <strong>Prof. {tr.tutor.name}</strong>
                                <span className="tutor-row-sub">
                                  Form {tr.tutor.grade} • {selectedTopic ? selectedTopic.subject : "Tutor"}
                                </span>
                              </div>

                              <div className="tutor-row-duration">
                                <span>4 hours lecture</span>
                                <small>Lang: {tr.tutor.language}</small>
                              </div>

                              <div className="tutor-row-rate">
                                <strong>{matchPct}% match</strong>
                                {gainPct > 0 && <small>+{gainPct}% gain</small>}
                              </div>

                              <div
                                className="tutor-breakdown-trigger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedBreakdownId(isExpanded ? null : tr.tutor.id);
                                }}
                                title="View explainable matching factors"
                              >
                                <span className="breakdown-pill">
                                  {isExpanded ? "Hide Factors ▲" : "Why this match? ▼"}
                                </span>
                              </div>
                            </div>

                            {/* Explainable Match Breakdown Dropdown */}
                            {isExpanded && tr.breakdown && (
                              <div className="match-factors-accordion">
                                <div className="factors-header">
                                  <span>Explainable Match Score Breakdown ({matchPct} Total Points)</span>
                                </div>
                                <div className="factors-tags-grid">
                                  {tr.breakdown.map((f, idx) => (
                                    <div key={idx} className="factor-tag-item">
                                      <span className="factor-pts">+{f.points}</span>
                                      <span className="factor-label">{f.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Schedule & Tutor Highlight Section */}
                <div className="dash-card schedule-section">
                  <div className="dash-card-header">
                    <h2 className="dash-section-heading">Schedule</h2>
                    <div className="schedule-header-meta">
                      <span className="date-caption">Oct 24, 2026</span>
                      <div className="active-tutor-tag">
                        {selectedTutor ? `Prof. ${selectedTutor.tutor.name} ▾` : "Select Tutor ▾"}
                      </div>
                    </div>
                  </div>

                  <div className="schedule-content-split">
                    {/* Tutor Highlight Card */}
                    <div className="tutor-profile-card">
                      <div className="tutor-big-avatar">
                        <div className="avatar-photo-mock">
                          {selectedTutor ? selectedTutor.tutor.name[0] : "T"}
                        </div>
                      </div>
                      <h3 className="profile-name">
                        Prof. {selectedTutor ? selectedTutor.tutor.name : "Select Tutor"}
                      </h3>
                      <p className="profile-exp">
                        Form {selectedTutor?.tutor.grade ?? 3} Peer Mentor
                      </p>
                      <p className="profile-subject">
                        Verified {selectedTopic?.name ?? "Subject Specialist"}
                      </p>
                      <button
                        className="black-pill-btn"
                        onClick={startSession}
                        disabled={!selectedTopic}
                      >
                        Start Session
                      </button>
                    </div>

                    {/* Schedule Time Slots */}
                    <div className="slots-column">
                      <div
                        className={`slot-row-card ${activeSlot === 0 ? "active" : ""}`}
                        onClick={() => setActiveSlot(0)}
                      >
                        <div className="slot-date-block">
                          <span className="slot-day-num">12</span>
                          <div className="slot-day-meta">
                            <span>Dec</span>
                            <span>Monday</span>
                          </div>
                        </div>
                        <div className="slot-time-text">10:00am - 12:00pm</div>
                      </div>

                      <div
                        className={`slot-row-card ${activeSlot === 1 ? "active" : ""}`}
                        onClick={() => setActiveSlot(1)}
                      >
                        <div className="slot-date-block">
                          <span className="slot-day-num">13</span>
                          <div className="slot-day-meta">
                            <span>Dec</span>
                            <span>Tuesday</span>
                          </div>
                        </div>
                        <div className="slot-time-text">02:00pm - 04:00pm</div>
                      </div>

                      <div
                        className={`slot-row-card ${activeSlot === 2 ? "active" : ""}`}
                        onClick={() => setActiveSlot(2)}
                      >
                        <div className="slot-date-block">
                          <span className="slot-day-num">14</span>
                          <div className="slot-day-meta">
                            <span>Dec</span>
                            <span>Wednesday</span>
                          </div>
                        </div>
                        <div className="slot-time-text">08:00am - 10:00am</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (My Courses & Account Progress) */}
              <div className="dash-side-column">
                {/* My Courses / Topics Card with Bulk Download */}
                <div className="dash-card my-courses-card">
                  <div className="dash-card-header">
                    <h2 className="dash-section-heading">My Courses</h2>
                    {allTopicsDownloaded ? (
                      <span className="all-downloaded-pill">All Offline Ready ✓</span>
                    ) : (
                      <button
                        className="bulk-download-btn"
                        onClick={handleBulkDownload}
                        disabled={!online || isBulkDownloading}
                        title="Download all modules for offline study"
                      >
                        {isBulkDownloading ? "Downloading..." : "⬇ Bulk Download"}
                      </button>
                    )}
                  </div>

                  <div className="course-items-list">
                    {filteredTopics.map((t) => {
                      const isSelected = selectedTopic?.id === t.id;
                      const isDownloaded = offline.includes(t.id);

                      return (
                        <div
                          key={t.id}
                          className={`course-list-row ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectTopic(t)}
                        >
                          <div className="course-black-icon">
                            {t.subject === "Math" ? "∑" : "⚛"}
                          </div>

                          <div className="course-row-info">
                            <strong className="course-row-title">{t.name}</strong>
                            <span className="course-row-meta">
                              {t.subject} • Form {t.grade} • 20 Hours
                            </span>
                          </div>

                          <div className="course-row-actions">
                            {isDownloaded ? (
                              <span className="downloaded-check-dot" title="Available offline">
                                ✓
                              </span>
                            ) : (
                              <button
                                className="download-mini-icon-btn"
                                onClick={(e) => handleDownload(t, e)}
                                disabled={!online}
                                title={online ? "Download offline" : "Offline"}
                              >
                                ↓
                              </button>
                            )}
                            <span className="three-dots-icon">⋮</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Account Progress Card with Segmented Radial Dial */}
                <div className="dash-card account-progress-card">
                  <div className="dash-card-header">
                    <h2 className="dash-section-heading">Account Progress</h2>
                  </div>

                  <RadialProgressGauge percent={avgProgress} />
                </div>
              </div>
            </div>
          )}

          {/* Diagnostic Pre-Quiz */}
          {stage === "pre" && lesson && (
            <div className="dash-stage-container">
              <div className="stage-back-bar">
                <button className="back-link-btn" onClick={resetSession}>
                  ← Back to Dashboard
                </button>
                <div className="stage-title-pill">Step 1: Pre-Session Diagnostic</div>
              </div>

              <div className="dash-card quiz-stage-card">
                <h2 className="quiz-title">Diagnostic Assessment: {lesson.title}</h2>
                <p className="quiz-desc">
                  Quick assessment to benchmark your starting baseline before the tutoring session begins.
                </p>

                <div className="quiz-items-wrapper">
                  {lesson.pre.map((q, i) => (
                    <div key={i} className="quiz-item-block">
                      <div className="quiz-item-prompt">
                        <span className="quiz-num">{i + 1}</span>
                        <strong>{q.q}</strong>
                      </div>
                      <div className="quiz-options-grid">
                        {q.options.map((opt, j) => {
                          const isPicked = quizAnswers[i] === j;
                          return (
                            <button
                              key={j}
                              type="button"
                              className={`quiz-option-button ${isPicked ? "selected" : ""}`}
                              onClick={() => {
                                const ans = [...quizAnswers];
                                ans[i] = j;
                                setQuizAnswers(ans);
                              }}
                            >
                              <span className="option-indicator" />
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="stage-footer-actions">
                  <button
                    className="black-pill-btn"
                    disabled={quizAnswers.filter((a) => a !== undefined).length < lesson.pre.length}
                    onClick={() => {
                      const score = lesson.pre.filter((q, i) => quizAnswers[i] === q.answer).length / lesson.pre.length;
                      setPre(score);
                      setStage("lesson");
                    }}
                  >
                    Submit Baseline & Enter Tutoring Session →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lesson Study View with In-Session Timer & Guiding Checklist */}
          {stage === "lesson" && lesson && (
            <div className="dash-stage-container">
              <div className="stage-back-bar">
                <button className="back-link-btn" onClick={resetSession}>
                  ← Back to Dashboard
                </button>
                <div className="stage-title-pill">Step 2: Interactive Tutoring Session</div>
              </div>

              <div className="dash-card lesson-stage-card">
                <div className="lesson-hero-header">
                  <div>
                    <h2 className="lesson-main-heading">{lesson.title}</h2>
                    <span className="lesson-rev-badge">Working with Prof. {selectedTutor?.tutor.name}</span>
                  </div>

                  {/* Active In-Session Countdown Timer */}
                  <SessionTimer initialMinutes={20} />
                </div>

                {/* Interactive Tutor Guiding Checklist */}
                <div className="tutor-interactive-checklist-box">
                  <div className="checklist-header">
                    <span className="checklist-tag">TUTOR INTERACTIVE GUIDELINES</span>
                    <span className="checklist-sub">Check off each pedagogical milestone as you progress:</span>
                  </div>
                  <div className="checklist-items">
                    {lesson.tutorGuide.map((step, idx) => {
                      const isDone = !!checkedSteps[idx];
                      return (
                        <label key={idx} className={`checklist-item ${isDone ? "completed" : ""}`}>
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => {
                              setCheckedSteps({ ...checkedSteps, [idx]: !isDone });
                            }}
                          />
                          <span className="custom-check-box">{isDone ? "✓" : ""}</span>
                          <span className="check-text">{step}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="lesson-dual-columns">
                  <div className="lesson-box concepts-box">
                    <div className="box-tag">CORE CONCEPTS & RULES</div>
                    <ul className="box-bullet-list">
                      {lesson.explanation.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="lesson-box practice-box">
                    <div className="box-tag">COLLABORATION WORKSPACE</div>
                    <p className="practice-note">
                      Discuss the questions together. Have the learner explain their thought process before clicking to proceed.
                    </p>
                    <div className="practice-hint-chip">
                      <span>💡 Reminder: Praise effort, not just the correct answer.</span>
                    </div>
                  </div>
                </div>

                <div className="stage-footer-actions">
                  <button
                    className="black-pill-btn"
                    onClick={() => {
                      setQuizAnswers([]);
                      setStage("post");
                    }}
                  >
                    Session Finished • Start Mastery Check →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Post-Session Quiz */}
          {stage === "post" && lesson && (
            <div className="dash-stage-container">
              <div className="stage-back-bar">
                <button className="back-link-btn" onClick={resetSession}>
                  ← Back to Dashboard
                </button>
                <div className="stage-title-pill">Step 3: Post-Session Mastery Check</div>
              </div>

              <div className="dash-card quiz-stage-card">
                <h2 className="quiz-title">Mastery Check: {lesson.title}</h2>
                <p className="quiz-desc">
                  Show what you learned during your session with Prof. {selectedTutor?.tutor.name}.
                </p>

                <div className="quiz-items-wrapper">
                  {lesson.post.map((q, i) => (
                    <div key={i} className="quiz-item-block">
                      <div className="quiz-item-prompt">
                        <span className="quiz-num">{i + 1}</span>
                        <strong>{q.q}</strong>
                      </div>
                      <div className="quiz-options-grid">
                        {q.options.map((opt, j) => {
                          const isPicked = quizAnswers[i] === j;
                          return (
                            <button
                              key={j}
                              type="button"
                              className={`quiz-option-button ${isPicked ? "selected" : ""}`}
                              onClick={() => {
                                const ans = [...quizAnswers];
                                ans[i] = j;
                                setQuizAnswers(ans);
                              }}
                            >
                              <span className="option-indicator" />
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="stage-footer-actions">
                  <button
                    className="black-pill-btn"
                    disabled={quizAnswers.filter((a) => a !== undefined).length < lesson.post.length}
                    onClick={() => {
                      const finalScore = lesson.post.filter((q, i) => quizAnswers[i] === q.answer).length / lesson.post.length;
                      finishSession(finalScore);
                    }}
                  >
                    Submit Answers & View Learning Gain →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Session Done / Results & Feedback View */}
          {stage === "done" && (
            <div className="dash-stage-container">
              <div className="dash-card results-stage-card">
                <div className="results-badge-icon">🎉</div>
                <h2 className="results-heading">Tutoring Session Completed!</h2>
                <p className="results-subtext">Here is your verified learning progression:</p>

                <div className="results-score-tiles">
                  <div className="score-tile">
                    <span className="tile-label">PRE-QUIZ</span>
                    <strong className="tile-value">{pct(pre)}</strong>
                    <span className="tile-note">Baseline Score</span>
                  </div>

                  <div className="score-tile-arrow">→</div>

                  <div className="score-tile highlight">
                    <span className="tile-label">POST-QUIZ</span>
                    <strong className="tile-value">{pct(post)}</strong>
                    <span className="tile-note">Mastery Score</span>
                  </div>
                </div>

                <div className="results-gain-badge">
                  {post >= pre ? `+${Math.round((post - pre) * 100)}% Verified Learning Gain` : "Reviewed"}
                </div>

                {/* Session Feedback & Tutor Rating Component */}
                <div className="session-feedback-card">
                  <h3 className="feedback-heading">Rate your session with Prof. {selectedTutor?.tutor.name}</h3>
                  <div className="star-rating-row">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn ${star <= rating ? "active" : ""}`}
                        onClick={() => setRating(star)}
                      >
                        ★
                      </button>
                    ))}
                    <span className="star-label-text">{rating} of 5 Stars</span>
                  </div>

                  <div className="feedback-tag-chips">
                    {["Clear explanations", "Patient", "Friendly", "Engaging", "Great examples", "Good pacing"].map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`feedback-chip ${isSelected ? "selected" : ""}`}
                          onClick={() => {
                            setSelectedTags(
                              isSelected ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag]
                            );
                          }}
                        >
                          {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                        </button>
                      );
                    })}
                  </div>

                  {!feedbackSubmitted ? (
                    <button className="submit-feedback-btn" onClick={submitFeedback}>
                      Save Rating & Telemetry
                    </button>
                  ) : (
                    <div className="feedback-saved-notice">✓ Feedback recorded and synced to tutor profile!</div>
                  )}
                </div>

                <div className="results-sync-notice">
                  <span>{online ? "☁️ Synced to school server" : "💾 Stored securely offline — will sync automatically"}</span>
                </div>

                <button className="black-pill-btn" onClick={resetSession}>
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Tutor Qualification Flow (Become a Tutor) */}
          {navView === "verify" && (
            <div className="dash-stage-container">
              <div className="stage-back-bar">
                <button className="back-link-btn" onClick={() => setNavView("dashboard")}>
                  ← Back to Dashboard
                </button>
                <div className="stage-title-pill">Peer Tutor Qualification</div>
              </div>

              <div className="dash-card verify-stage-card">
                <h2 className="dash-section-heading">Qualify as a Peer Tutor</h2>
                <p className="dash-section-desc">
                  Students in Form 2, 3, or 4 can qualify to tutor their peers. Achieve <strong>80% or higher</strong> on the subject diagnostic check to earn verified tutor status.
                </p>

                <div className="topic-select-row">
                  <label>Select Subject Module:</label>
                  <select
                    value={verifyTopicId}
                    onChange={(e) => {
                      setVerifyTopicId(Number(e.target.value));
                      setVerifyScore(null);
                      setVerifyMsg("");
                    }}
                    className="filter-pill-dropdown"
                  >
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.subject}, Form {t.grade})
                      </option>
                    ))}
                  </select>
                </div>

                {lesson && (
                  <div className="quiz-items-wrapper">
                    {lesson.pre.map((q, i) => (
                      <div key={i} className="quiz-item-block">
                        <div className="quiz-item-prompt">
                          <span className="quiz-num">{i + 1}</span>
                          <strong>{q.q}</strong>
                        </div>
                        <div className="quiz-options-grid">
                          {q.options.map((opt, j) => {
                            const isPicked = verifyAnswers[i] === j;
                            return (
                              <button
                                key={j}
                                type="button"
                                className={`quiz-option-button ${isPicked ? "selected" : ""}`}
                                onClick={() => {
                                  const ans = [...verifyAnswers];
                                  ans[i] = j;
                                  setVerifyAnswers(ans);
                                }}
                              >
                                <span className="option-indicator" />
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {verifyScore !== null && (
                  <div className={`verify-result-box ${verifyScore >= 0.8 ? "passed" : "failed"}`}>
                    <div className="verify-score-num">{Math.round(verifyScore * 100)}%</div>
                    <p>{verifyMsg}</p>
                  </div>
                )}

                <div className="stage-footer-actions">
                  <button
                    className="black-pill-btn"
                    disabled={verifyAnswers.length < (lesson?.pre.length ?? 3)}
                    onClick={submitVerification}
                  >
                    Submit Qualification Test
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Teacher Analytics Dashboard */}
          {navView === "teacher" && (
            <div className="dash-stage-container">
              <div className="stage-back-bar">
                <button className="back-link-btn" onClick={() => setNavView("dashboard")}>
                  ← Back to Student Dashboard
                </button>
                <div className="stage-title-pill">Teacher Analytics</div>
              </div>

              <div className="dash-card teacher-analytics-card">
                <h2 className="dash-section-heading">Cohort Learning Impact & Diagnostics</h2>
                <p className="dash-section-desc">
                  Aggregated telemetry comparing pre-session diagnostics against post-session mastery.
                </p>

                <div className="analytics-topic-list">
                  {summary.map((s) => {
                    const gain = Math.round((s.avgPost - s.avgPre) * 100);
                    return (
                      <div key={s.topic} className="analytics-topic-row">
                        <div className="analytics-row-header">
                          <div>
                            <strong>{s.topic}</strong>
                            <span className="analytics-session-count">
                              {s.sessions} student session{s.sessions === 1 ? "" : "s"}
                              {s.avgRating ? ` • Avg Rating: ★ ${s.avgRating.toFixed(1)}` : ""}
                            </span>
                          </div>
                          <span className={`gain-chip ${gain >= 0 ? "positive" : "negative"}`}>
                            {gain >= 0 ? `+${gain}%` : `${gain}%`} Gain
                          </span>
                        </div>

                        <div className="dual-progress-container">
                          <div className="progress-bar-item">
                            <div className="progress-label-row">
                              <span>Pre-Quiz Baseline</span>
                              <strong>{pct(s.avgPre)}</strong>
                            </div>
                            <div className="progress-track">
                              <div className="progress-fill pre" style={{ width: pct(s.avgPre) }} />
                            </div>
                          </div>

                          <div className="progress-bar-item">
                            <div className="progress-label-row">
                              <span>Post-Quiz Mastery</span>
                              <strong>{pct(s.avgPost)}</strong>
                            </div>
                            <div className="progress-track">
                              <div className="progress-fill post" style={{ width: pct(s.avgPost) }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
