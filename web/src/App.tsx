import { useEffect, useState, useRef } from "react";
import type {
  AuthSession,
  ImpactReport,
  Lesson,
  NoImprovementAlert,
  PlatformSchoolHealth,
  ProofCohortSummary,
  Question,
  RankedTutor,
  Report,
  SessionEvent,
  SessionEventType,
  StudentProfile,
  Topic,
  TopicStruggle,
  Tutor,
  AdaptiveRecommendation,
} from "../../shared/types";
import { getTranslation, type SupportedLanguage } from "../../shared/i18n";
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
  getAuthSession,
  saveAuthSession,
  clearAuthSession,
  queueEvent,
  syncEventsOutbox,
  pendingEventsCount,
  getStorageUsage,
  clearOfflineCache,
  type StorageStats,
} from "./db";
import { TutorTrainingHub } from "./components/TutorTrainingHub";
import { AdaptiveGraphView } from "./components/AdaptiveGraphView";
import { GroupTutoringView } from "./components/GroupTutoringView";
import { TelecomSimulatorModal } from "./components/TelecomSimulatorModal";
import { QRHandoffModal } from "./components/QRHandoffModal";

const LEARNER_ID = "l1";
type Stage = "browse" | "pre" | "lesson" | "post" | "retention" | "done";
type NavView = "dashboard" | "courses" | "schedule" | "teacher" | "verify" | "platform_admin" | "training" | "adaptive" | "groups";
type Summary = ProofCohortSummary;

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

  // Phase 4: Retention Check State (PROOF-3)
  const [retentionAnswers, setRetentionAnswers] = useState<number[]>([]);
  const [retentionClientId, setRetentionClientId] = useState<string>("seed-1");
  const [retentionResult, setRetentionResult] = useState<{ score: number; immediateGain: number; retentionGain: number } | null>(null);

  // Session feedback state
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Tutor Verification State
  const [verifyTopicId, setVerifyTopicId] = useState<number>(1);
  const [verifyScore, setVerifyScore] = useState<number | null>(null);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyAnswers, setVerifyAnswers] = useState<number[]>([]);

  // Phase 2: Authentication & Multi-School Tenant State (AUTH-1..8)
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "first_setup" | "school_apply">("login");
  const [authSchoolCode, setAuthSchoolCode] = useState("ALLIANCE");
  const [authRegNumber, setAuthRegNumber] = useState("");
  const [authPin, setAuthPin] = useState("");
  const [authSetupCode, setAuthSetupCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // School Application State (ONB-1..4)
  const [appSchoolName, setAppSchoolName] = useState("");
  const [appCounty, setAppCounty] = useState("Kiambu");
  const [appSchoolType, setAppSchoolType] = useState("Public Extra-County");
  const [appContactName, setAppContactName] = useState("");
  const [appContactPhone, setAppContactPhone] = useState("");
  const [appContactEmail, setAppContactEmail] = useState("");
  const [appStudentCount, setAppStudentCount] = useState(120);
  const [appConsent, setAppConsent] = useState(false);

  // Teacher Class Management & Safeguarding State (CLS-1..4, AUTH-6, SAFE-1..6)
  const [teacherTab, setTeacherTab] = useState<"analytics" | "roster" | "safeguarding" | "live" | "authoring">("analytics");
  const [rosterStudents, setRosterStudents] = useState<StudentProfile[]>([]);
  const [csvText, setCsvText] = useState("");
  const [showSlipsModal, setShowSlipsModal] = useState(false);
  const [resetPinResult, setResetPinResult] = useState<{ regNumber: string; setupCode: string } | null>(null);

  // Phase 3: Safeguarding & Reports State (SAFE-1..6)
  const [allTutorsList, setAllTutorsList] = useState<Tutor[]>([]);
  const [safeguardingReports, setSafeguardingReports] = useState<Report[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Inappropriate behavior");
  const [reportDetails, setReportDetails] = useState("");
  const [reportingTarget, setReportingTarget] = useState<{ id: string; name: string } | null>(null);
  const [guardianConsentGiven, setGuardianConsentGiven] = useState(true);

  // Phase 5: Sandbox (DEMO-1..4) & Live Real-Time Events (LIVE-1..3)
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [demoRole, setDemoRole] = useState<"learner" | "tutor">("learner");
  const [liveEvents, setLiveEvents] = useState<SessionEvent[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => `sess-${Date.now()}`);
  const [guestLinkCopied, setGuestLinkCopied] = useState(false);
  const [pendingEvents, setPendingEvents] = useState(0);

  // Phase 6: Dashboards (DASH-1..2) & Content Authoring (CONT-1..3) State
  const [struggleHeatmap, setStruggleHeatmap] = useState<TopicStruggle[]>([]);
  const [noImpAlerts, setNoImpAlerts] = useState<NoImprovementAlert[]>([]);
  const [authoringLessonsList, setAuthoringLessonsList] = useState<Lesson[]>([]);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonSubject, setNewLessonSubject] = useState("Math");
  const [newLessonGrade, setNewLessonGrade] = useState(2);
  const [newLessonGuide, setNewLessonGuide] = useState("1. Review definitions\n2. Solve step-by-step\n3. Check understanding");
  const [newLessonExplanation, setNewLessonExplanation] = useState("Key rules for this topic.");
  const [platformSchools, setPlatformSchools] = useState<PlatformSchoolHealth[]>([]);
  const [platformReport, setPlatformReport] = useState<ImpactReport | null>(null);

  // Phase 7: Polish - I18N, Accessibility, Storage & Certificates
  const [lang, setLang] = useState<SupportedLanguage>(() => {
    return (localStorage.getItem("peerlearn_lang") as SupportedLanguage) || "en";
  });
  const t = getTranslation(lang);
  const [highContrast, setHighContrast] = useState(false);
  const [lowDataMode, setLowDataMode] = useState(false);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedCertTutor, setSelectedCertTutor] = useState<Tutor | null>(null);

  // Phase 8: Telecom Simulator, Offline QR Handoff & Adaptive Recommendations
  const [showTelecomModal, setShowTelecomModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [adaptiveRec, setAdaptiveRec] = useState<AdaptiveRecommendation | null>(null);

  const handleSetLanguage = (newLang: SupportedLanguage) => {
    setLang(newLang);
    localStorage.setItem("peerlearn_lang", newLang);
  };

  const loadStorageInfo = async () => {
    const stats = await getStorageUsage();
    setStorageStats(stats);
  };

  const handleClearCache = async () => {
    await clearOfflineCache();
    await loadStorageInfo();
    setOffline(await offlineIds());
    setMsg(t.cacheCleared);
  };

  useEffect(() => {
    document.body.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.body.classList.toggle("low-data-mode", lowDataMode);
  }, [lowDataMode]);

  useEffect(() => {
    loadStorageInfo();
  }, [offline]);

  // Load cached offline session on mount (AUTH-8)
  useEffect(() => {
    (async () => {
      const saved = await getAuthSession();
      if (saved) {
        setAuthSession(saved);
        if (saved.user.school_code) {
          setAuthSchoolCode(saved.user.school_code);
        }
      }
    })();
  }, []);

  const refresh = async () => {
    setOffline(await offlineIds());
    setPending(await pendingCount());
    setPendingEvents(await pendingEventsCount());
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

  // Phase 5: Subscribe to real-time events via Server-Sent Events (LIVE-2)
  useEffect(() => {
    const schoolId = authSession?.user.school_id || "s1";
    fetch(`/api/events?schoolId=${schoolId}`)
      .then((r) => r.json())
      .then((evts) => {
        if (Array.isArray(evts)) setLiveEvents(evts.reverse());
      })
      .catch(() => {});

    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/events/stream?schoolId=${schoolId}`);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type && data.type !== "connected") {
            setLiveEvents((prev) => [data, ...prev.filter((x) => x.id !== data.id).slice(0, 49)]);
          }
        } catch {}
      };
    } catch {}

    return () => {
      es?.close();
    };
  }, [authSession?.user.school_id]);

  // Phase 5: Auto-flush offline event outbox on reconnect (LIVE-3)
  useEffect(() => {
    if (online) {
      syncEventsOutbox().then((r) => setPendingEvents(r.remaining));
      syncOutbox().then((r) => setPending(r.remainingCount));
    }
  }, [online]);

  async function emitSessionEvent(type: SessionEventType, payload: any = {}) {
    const schoolId = authSession?.user.school_id || "s1";
    const ev: SessionEvent = {
      school_id: schoolId,
      session_id: activeSessionId,
      type,
      payload: {
        ...payload,
        actor_id: authSession?.user.id || (demoRole === "tutor" ? "t1" : "l1"),
        actor_name: authSession?.user.full_name || (demoRole === "tutor" ? "Wanjiru" : "Amani"),
        actor_role: demoRole,
        topic_id: selectedTopic?.id || 1,
        topic_name: selectedTopic?.name || "Solving linear equations",
        timestamp: new Date().toISOString(),
      },
      is_demo: isDemoMode,
    };

    if (online) {
      try {
        await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ev),
        });
      } catch {
        await queueEvent(ev);
      }
    } else {
      await queueEvent(ev);
    }
    const rem = await pendingEventsCount();
    setPendingEvents(rem);
  }

  async function handleResetDemo() {
    try {
      const res = await fetch("/api/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: authSession?.user.school_id || "s1" }),
      });
      const data = await res.json();
      setMsg(`✓ ${data.message} (Seeded in 0.02s)`);
      refresh();
      openTeacherView();
    } catch {
      setMsg("Failed to reset demo.");
    }
  }

  async function handleGenerateGuestLink() {
    try {
      const res = await fetch("/api/demo/guest-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: authSession?.user.school_id || "s1", role: demoRole }),
      });
      const data = await res.json();
      const guestUrl = `${window.location.origin}?guest=${data.guest.token}`;
      await navigator.clipboard.writeText(guestUrl);
      setGuestLinkCopied(true);
      setMsg(`✓ Guest demo link copied! (Expires in 4 hours, DEMO-4)`);
      setTimeout(() => setGuestLinkCopied(false), 3000);
    } catch {
      setMsg("Could not generate guest link.");
    }
  }

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
      const evRes = await syncEventsOutbox();
      setPendingEvents(evRes.remaining);
      setLastSync(res.timestamp);
      await refresh();
      if (online) {
        setMsg(`✓ Sync complete at ${res.timestamp}. Synced ${res.syncedCount} sessions & ${evRes.synced} events. 0 pending.`);
      } else {
        setMsg(`Offline mode: ${res.remainingCount} session(s) & ${evRes.remaining} event(s) queued locally in outbox.`);
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

    const sid = `sess-${Date.now()}`;
    setActiveSessionId(sid);
    emitSessionEvent("started", {
      session_id: sid,
      topic_id: selectedTopic.id,
      topic_name: selectedTopic.name,
      tutor_id: selectedTutor?.tutor.id,
      tutor_name: selectedTutor?.tutor.name,
    });
  }

  async function finishSession(finalScore: number) {
    setPost(finalScore);
    setStage("done");
    const cid = crypto.randomUUID();
    setRetentionClientId(cid);
    setRetentionResult(null);
    setRetentionAnswers([]);
    if (selectedTopic) {
      await queueSession({
        client_id: cid,
        learnerId: LEARNER_ID,
        tutorId: selectedTutor?.tutor.id || "t1",
        topicId: selectedTopic.id,
        pre,
        post: finalScore,
        learnerRating: rating,
        feedbackTags: selectedTags,
      });
      emitSessionEvent("post_quiz_done", {
        session_id: cid,
        score: finalScore,
        pre,
        post: finalScore,
        topic_id: selectedTopic.id,
      });

      // Phase 8: Fetch adaptive prerequisite recommendation based on final score
      fetch(`/api/adaptive/recommendations/l1/${selectedTopic.id}?score=${finalScore}`)
        .then((r) => r.json())
        .then((rec) => setAdaptiveRec(rec))
        .catch(() => {});
    }
    refresh();
  }

  function startRetentionQuiz(topic?: Topic) {
    const t = topic || selectedTopic || topics[0];
    if (!t) return;
    getLesson(t.id).then((l) => {
      if (!l) {
        fetch(`/api/lessons/${t.id}`)
          .then((r) => r.json())
          .then((fetched) => {
            setLesson(fetched);
            setRetentionAnswers([]);
            setRetentionResult(null);
            setStage("retention");
          });
      } else {
        setLesson(l);
        setRetentionAnswers([]);
        setRetentionResult(null);
        setStage("retention");
      }
    });
  }

  async function submitRetentionQuiz() {
    if (!lesson || !lesson.retention || lesson.retention.length === 0) return;
    const correctCount = lesson.retention.filter((q, i) => retentionAnswers[i] === q.answer).length;
    const retScore = correctCount / lesson.retention.length;

    try {
      await fetch("/api/retention/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: retentionClientId || "seed-1",
          retention_score: retScore,
        }),
      });
    } catch {
      /* offline fallback */
    }

    const retGain = Math.round((retScore - pre) * 100);
    const immGain = Math.round((post - pre) * 100);
    setRetentionResult({ score: retScore, immediateGain: immGain, retentionGain: retGain });
    setMsg("✓ 7-Day Retention Score successfully recorded! (PROOF-3, PROOF-4)");

    try {
      const data = await (await fetch("/api/teacher/summary")).json();
      setSummary(data);
      await cacheTeacherSummary(data);
    } catch {
      /* handled */
    }
  }

  function submitFeedback() {
    setFeedbackSubmitted(true);
    setMsg("Thank you! Your feedback helps update tutor ranking.");
    emitSessionEvent("ended", {
      session_id: retentionClientId,
      rating,
      feedbackTags: selectedTags,
    });
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
    loadRoster();
    loadSafeguardingData();
    loadTeacherDashboards();
    loadAuthoringLessons();
  }

  async function loadTeacherDashboards() {
    const schoolId = authSession?.user.school_id || "s1";
    try {
      const hm = await (await fetch(`/api/teacher/struggle-heatmap?schoolId=${schoolId}`)).json();
      setStruggleHeatmap(hm);
      const noImp = await (await fetch(`/api/teacher/no-improvement?schoolId=${schoolId}`)).json();
      setNoImpAlerts(noImp);
    } catch {}
  }

  async function loadAuthoringLessons() {
    const schoolId = authSession?.user.school_id || "s1";
    try {
      const res = await (await fetch(`/api/content/lessons?schoolId=${schoolId}&includeDrafts=true`)).json();
      setAuthoringLessonsList(res);
    } catch {}
  }

  async function loadPlatformAdminData() {
    try {
      const schools = await (await fetch("/api/platform/school-health")).json();
      setPlatformSchools(schools);
      const rep = await (await fetch("/api/platform/impact-report")).json();
      setPlatformReport(rep);
    } catch {}
  }

  async function handleCreateLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;
    try {
      const res = await fetch("/api/content/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newLessonTitle,
          subject: newLessonSubject,
          grade: Number(newLessonGrade),
          school_id: authSession?.user.school_id || "s1",
          author_id: authSession?.user.id || "teacher-1",
          tutorGuide: newLessonGuide.split("\n").filter(Boolean),
          explanation: [newLessonExplanation],
          pre: [
            { q: `Diagnostic check for ${newLessonTitle}`, options: ["Concept A (Correct)", "Distractor B", "Distractor C"], answer: 0, sub_skill: "fundamentals", difficulty: 1, language: "en" }
          ],
          post: [
            { q: `Mastery question for ${newLessonTitle}`, options: ["Incorrect", "Mastery Answer (Correct)", "Incorrect"], answer: 1, sub_skill: "mastery", difficulty: 2, language: "en" }
          ],
          retention: [
            { q: `Retention check for ${newLessonTitle}`, options: ["Wrong", "Wrong", "Retention Answer (Correct)"], answer: 2, sub_skill: "long_term", difficulty: 2, language: "en" }
          ]
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg(`✓ New lesson "${data.lesson.title}" created in Draft status (CONT-1).`);
        setNewLessonTitle("");
        loadAuthoringLessons();
      }
    } catch {
      setMsg("Failed to create lesson draft.");
    }
  }

  async function handlePublishLesson(topicId: number) {
    try {
      const res = await fetch(`/api/content/lessons/${topicId}/publish`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMsg(`✓ ${data.message} Available for student download (CONT-2).`);
        loadAuthoringLessons();
        // Refresh curriculum topics
        const t = await (await fetch("/api/topics")).json();
        setTopics(t);
      }
    } catch {
      setMsg("Publishing failed.");
    }
  }

  function handleExportCSV() {
    const schoolId = authSession?.user.school_id || "s1";
    window.open(`/api/teacher/export/csv?schoolId=${schoolId}`, "_blank");
  }

  async function handleStudentLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");
    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_code: authSchoolCode,
          reg_number: authRegNumber,
          pin: authPin,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || "Login failed. Check your school code, registration number, and 6-digit PIN.");
        return;
      }
      const session: AuthSession = data.session;
      setAuthSession(session);
      await saveAuthSession(session);
      setShowAuthModal(false);
      setAuthPin("");
      setMsg(`Welcome, ${session.user.full_name}! (School: ${session.user.school_code})`);
    } catch {
      setAuthError("Network error. If you've logged in before, the app works offline.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleStudentFirstSetup(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");
    if (!/^\d{6}$/.test(authPin)) {
      setAuthError("PIN must be exactly 6 digits.");
      setAuthLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/student-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_code: authSchoolCode,
          reg_number: authRegNumber,
          setup_code: authSetupCode,
          pin: authPin,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || "Setup failed. Check your setup code.");
        return;
      }
      setAuthSuccess("✓ PIN created successfully! You can now log in below.");
      setAuthMode("login");
      setAuthSetupCode("");
    } catch {
      setAuthError("Network connection required for first-time activation.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await clearAuthSession();
    setAuthSession(null);
    setMsg("Logged out. You can browse demo topics or sign in again.");
  }

  async function handleSchoolApplication(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");
    if (!appConsent) {
      setAuthError("Parental/guardian consent confirmation is required under Kenyan law.");
      setAuthLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/schools/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_name: appSchoolName,
          county: appCounty,
          school_type: appSchoolType,
          contact_name: appContactName,
          contact_phone: appContactPhone,
          contact_email: appContactEmail,
          student_count: Number(appStudentCount),
          grades: [1, 2, 3, 4],
          subjects: ["Mathematics", "Physics", "Chemistry", "Biology"],
          consent_given: appConsent,
        }),
      });
      const data = await res.json();
      setAuthSuccess(`✓ Application submitted for ${appSchoolName}! Our team will review within 24 hours.`);
      setTimeout(() => setShowAuthModal(false), 2000);
    } catch {
      setAuthError("Failed to submit application. Please check your internet connection.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadRoster(schoolId: string = "s1") {
    try {
      const res = await fetch(`/api/students?schoolId=${schoolId}`);
      if (res.ok) {
        const students = await res.json();
        setRosterStudents(students);
      }
    } catch {
      /* ignore */
    }
  }

  async function handleImportCSV() {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split("\n");
    const rows = [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx];
      });
      const reg = row["reg_number"] || row["admission_number"] || row["adm_no"] || cols[0];
      const name = row["full_name"] || row["name"] || cols[1];
      const grade = parseInt(row["grade"] || row["form"] || cols[2] || "1", 10);
      const stream = row["class_stream"] || row["stream"] || cols[3] || "";
      if (reg && name) {
        rows.push({
          reg_number: reg,
          full_name: name,
          grade: isNaN(grade) ? 1 : grade,
          class_stream: stream,
        });
      }
    }

    try {
      const res = await fetch("/api/students/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: authSession?.user.school_id || "s1", rows }),
      });
      const result = await res.json();
      if (result.ok) {
        setRosterStudents(result.students);
        setCsvText("");
        setMsg(`✓ Successfully imported ${result.imported_count} students! Setup codes generated.`);
      }
    } catch {
      setMsg("Failed to import CSV. Check internet connection.");
    }
  }

  async function handleResetPin(student: StudentProfile) {
    try {
      const res = await fetch("/api/auth/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: student.school_id || "s1",
          regNumber: student.reg_number,
          teacherId: authSession?.user.id || "teacher1",
        }),
      });
      const result = await res.json();
      if (result.ok) {
        setResetPinResult({ regNumber: student.reg_number, setupCode: result.new_setup_code });
        setRosterStudents((prev) =>
          prev.map((s) => (s.reg_number === student.reg_number ? { ...s, setup_code: result.new_setup_code } : s))
        );
        setMsg(`✓ PIN reset for ${student.full_name}. New setup code: ${result.new_setup_code}`);
      }
    } catch {
      setMsg("Failed to reset student PIN.");
    }
  }

  // Phase 3: Safeguarding Handlers (SAFE-1 to SAFE-6)
  async function loadSafeguardingData(schoolId: string = "s1") {
    try {
      const [tutRes, repRes] = await Promise.all([
        fetch(`/api/tutors?schoolId=${schoolId}`),
        fetch(`/api/reports?schoolId=${schoolId}`),
      ]);
      if (tutRes.ok) setAllTutorsList(await tutRes.json());
      if (repRes.ok) setSafeguardingReports(await repRes.json());
    } catch {
      /* ignore */
    }
  }

  async function handleToggleTutorApproval(tutorId: string, topicId: number, currentlyApproved: boolean) {
    try {
      const res = await fetch("/api/tutors/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: authSession?.user.school_id || "s1",
          actorId: authSession?.user.id || "teacher1",
          tutorId,
          topicId,
          approved: !currentlyApproved,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAllTutorsList((prev) =>
          prev.map((t) =>
            t.id === tutorId
              ? { ...t, teacherApproved: { ...(t.teacherApproved || {}), [topicId]: !currentlyApproved } }
              : t
          )
        );
        setMsg(`✓ Updated tutor approval status for Topic ${topicId}.`);
        if (selectedTopic) handleSelectTopic(selectedTopic);
      }
    } catch {
      setMsg("Failed to update tutor approval.");
    }
  }

  async function handleToggleTutorSuspension(tutorId: string, currentlySuspended: boolean) {
    try {
      const res = await fetch("/api/tutors/suspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: authSession?.user.school_id || "s1",
          actorId: authSession?.user.id || "teacher1",
          tutorId,
          suspended: !currentlySuspended,
          reason: !currentlySuspended ? "Teacher suspension review" : "Reinstated by teacher",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAllTutorsList((prev) =>
          prev.map((t) => (t.id === tutorId ? { ...t, isSuspended: !currentlySuspended } : t))
        );
        setMsg(`✓ Tutor ${!currentlySuspended ? "suspended from all matching" : "reinstated"}.`);
        if (selectedTopic) handleSelectTopic(selectedTopic);
      }
    } catch {
      setMsg("Failed to update tutor suspension.");
    }
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: authSession?.user.school_id || "s1",
          reporter_id: authSession?.user.id || LEARNER_ID,
          reporter_name: authSession?.user.full_name || "Amani R.",
          target_id: reportingTarget?.id,
          target_name: reportingTarget?.name,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowReportModal(false);
        setReportDetails("");
        setMsg("✓ Your confidential report has been submitted to your school administration.");
      }
    } catch {
      setMsg("Failed to submit report. Please try again.");
    }
  }

  async function handleResolveReport(reportId: string) {
    try {
      const res = await fetch("/api/reports/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: authSession?.user.school_id || "s1",
          actorId: authSession?.user.id || "teacher1",
          reportId,
          resolutionNotes: "Reviewed and resolved by teacher/admin.",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSafeguardingReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: "resolved" } : r))
        );
        setMsg("✓ Report marked as resolved.");
      }
    } catch {
      setMsg("Failed to resolve report.");
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
              title="Teacher Analytics & Content (DASH-1, CONT-1)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </button>

            <button
              className={`rail-icon-btn ${navView === "platform_admin" ? "active" : ""}`}
              onClick={() => {
                setNavView("platform_admin");
                loadPlatformAdminData();
              }}
              title="Platform Admin, School Health & Impact (DASH-2)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </button>

            {/* Phase 8: Tutor Training Hub */}
            <button
              className={`rail-icon-btn ${navView === "training" ? "active" : ""}`}
              onClick={() => {
                setNavView("training");
                setStage("browse");
              }}
              title="Tutor Pedagogical Training Hub & Certification (Phase 8)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
                <path d="M6 14h6" />
              </svg>
            </button>

            {/* Phase 8: Adaptive Prerequisite Graph */}
            <button
              className={`rail-icon-btn ${navView === "adaptive" ? "active" : ""}`}
              onClick={() => {
                setNavView("adaptive");
                setStage("browse");
              }}
              title="Adaptive Prerequisite Learning Graph (Phase 8)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="3" />
                <circle cx="18" cy="18" r="3" />
                <line x1="8.59" y1="8.59" x2="15.42" y2="15.42" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>

            {/* Phase 8: Small-Group Tutoring */}
            <button
              className={`rail-icon-btn ${navView === "groups" ? "active" : ""}`}
              onClick={() => {
                setNavView("groups");
                setStage("browse");
              }}
              title="Small-Group Peer Tutoring (Phase 8)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
          {/* Phase 5: Sandbox (DEMO-1..4) and Live Mode Control Bar */}
          <div className="demo-sandbox-bar">
            <div style={{ display: "flex", alignItems: "center" }}>
              <span className="demo-badge-pill">🎮 DEMO SANDBOX</span>
              <span style={{ color: "#94a3b8" }}>
                Multi-Device Demo: Device Role:
              </span>
              <div className="demo-controls-group" style={{ marginLeft: "8px" }}>
                <button
                  type="button"
                  className={`demo-role-btn ${demoRole === "learner" ? "active" : ""}`}
                  onClick={() => setDemoRole("learner")}
                >
                  Learner View
                </button>
                <button
                  type="button"
                  className={`demo-role-btn ${demoRole === "tutor" ? "active" : ""}`}
                  onClick={() => setDemoRole("tutor")}
                >
                  Tutor View
                </button>
              </div>
            </div>

            <div className="demo-controls-group">
              {(pending > 0 || pendingEvents > 0) && (
                <span className="sync-waiting-badge" title="Queued locally; syncs upon reconnect (LIVE-3)">
                  ⚡ {pending + pendingEvents} waiting to sync
                </span>
              )}
              <button
                type="button"
                className="demo-action-btn guest"
                onClick={handleGenerateGuestLink}
                title="Create temporary guest demo link that expires in 4 hours (DEMO-4)"
              >
                {guestLinkCopied ? "✓ Link Copied!" : "🔗 Guest Demo Link"}
              </button>
              <button
                type="button"
                className="demo-action-btn"
                onClick={handleResetDemo}
                title="Wipe and re-seed demo class in milliseconds (DEMO-3)"
              >
                🔄 Reset Demo
              </button>
            </div>
          </div>

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
              {/* Phase 7: Language Switcher, Accessibility & Storage */}
              <div className="a11y-toolbar">
                <div style={{ display: "flex", gap: "2px", background: "#f1f5f9", padding: "2px", borderRadius: "20px" }}>
                  <button
                    className={`lang-toggle-btn ${lang === "en" ? "active" : ""}`}
                    onClick={() => handleSetLanguage("en")}
                    aria-label="Switch interface to English"
                  >
                    EN
                  </button>
                  <button
                    className={`lang-toggle-btn ${lang === "sw" ? "active" : ""}`}
                    onClick={() => handleSetLanguage("sw")}
                    aria-label="Badilisha lugha kuwa Kiswahili"
                  >
                    SW
                  </button>
                </div>
                <button
                  className={`lang-toggle-btn ${highContrast ? "active" : ""}`}
                  onClick={() => setHighContrast(!highContrast)}
                  title="Toggle High Contrast Mode for improved visibility (A11Y-1)"
                  aria-pressed={highContrast}
                >
                  👁️ {highContrast ? "Normal" : "High Contrast"}
                </button>
                <button
                  className={`lang-toggle-btn ${lowDataMode ? "active" : ""}`}
                  onClick={() => setLowDataMode(!lowDataMode)}
                  title="Toggle Low Data Mode without animations or heavy media (A11Y-1)"
                  aria-pressed={lowDataMode}
                >
                  📶 {lowDataMode ? "Low Data: ON" : t.lowDataMode}
                </button>
                {storageStats && (
                  <button
                    className="lang-toggle-btn"
                    onClick={handleClearCache}
                    title={`${storageStats.cachedLessonsCount} lesson packs cached (${storageStats.usageFormatted}). Click to clear storage (OFF-1).`}
                  >
                    🗑️ {storageStats.usageFormatted}
                  </button>
                )}
                {/* Phase 8: Africa's Talking USSD & QR Transfer Quick Buttons */}
                <button
                  className="lang-toggle-btn"
                  onClick={() => setShowTelecomModal(true)}
                  title="Launch Africa's Talking USSD (*384#) Feature Phone Simulator (Phase 8)"
                >
                  📟 *384# USSD
                </button>
                <button
                  className="lang-toggle-btn"
                  onClick={() => setShowQRModal(true)}
                  title="Zero-Data Offline QR Code Transfer Engine (Phase 8)"
                >
                  📱 QR Transfer
                </button>
              </div>

              {/* Online / Offline status */}
              <div className={`status-chip ${online ? "online" : "offline"}`}>
                <span className="chip-dot" />
                <span>{online ? t.online : t.offline}</span>
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

              {authSession ? (
                <div className="user-profile-badge" onClick={handleLogout} title="Click to log out">
                  <div className="user-avatar-circle">
                    {authSession.user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                    <span className="user-name">{authSession.user.full_name}</span>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      {authSession.user.school_code} • {authSession.user.reg_number ? `Adm ${authSession.user.reg_number}` : authSession.user.role}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "4px" }}>✕</span>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="auth-btn-top signin"
                    onClick={() => {
                      setAuthError("");
                      setAuthSuccess("");
                      setAuthMode("login");
                      setShowAuthModal(true);
                    }}
                  >
                    Student Login / PIN Setup
                  </button>
                  <button
                    className="auth-btn-top apply"
                    onClick={() => {
                      setAuthError("");
                      setAuthSuccess("");
                      setAuthMode("school_apply");
                      setShowAuthModal(true);
                    }}
                  >
                    Onboard School
                  </button>
                </div>
              )}
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
          {stage === "browse" && navView !== "teacher" && navView !== "verify" && navView !== "training" && navView !== "adaptive" && navView !== "groups" && (
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
                      <button
                        className="btn-small-reset"
                        style={{ marginTop: "8px", color: "#64748b", border: "none", background: "transparent", cursor: "pointer", fontSize: "11px" }}
                        onClick={() => {
                          setReportingTarget({
                            id: selectedTutor?.tutor.id || "t1",
                            name: selectedTutor?.tutor.name || "Peer Tutor",
                          });
                          setShowReportModal(true);
                        }}
                      >
                        🚩 Report a Problem (SAFE-4)
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
                      emitSessionEvent("pre_quiz_done", { score, lesson: lesson.title });
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

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                      className="btn-small-reset"
                      style={{ color: "#ef4444", borderColor: "#fca5a5", fontSize: "12px", padding: "6px 12px" }}
                      onClick={() => {
                        setReportingTarget({
                          id: selectedTutor?.tutor.id || "t1",
                          name: selectedTutor?.tutor.name || "Peer Tutor",
                        });
                        setShowReportModal(true);
                      }}
                      title="Confidential incident report to school administration (SAFE-4)"
                    >
                      🚩 Report Problem
                    </button>
                    {/* Active In-Session Countdown Timer */}
                    <SessionTimer initialMinutes={20} />
                  </div>
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
                              const nextDone = !isDone;
                              setCheckedSteps({ ...checkedSteps, [idx]: nextDone });
                              emitSessionEvent("step_checked", { step_index: idx, step_text: step, checked: nextDone });
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

                {/* Phase 8: Adaptive Prerequisite Recommendation */}
                {adaptiveRec && (
                  <div className={`adaptive-result-notice ${adaptiveRec.type}`}>
                    <span className="rec-badge">
                      {adaptiveRec.type === "remediation_prerequisite" && "⚠️ Prerequisite Review Needed"}
                      {adaptiveRec.type === "reinforce_current" && "🔁 Peer Practice Recommended"}
                      {adaptiveRec.type === "progression_advance" && "🚀 Next Topic Progression Unlocked"}
                    </span>
                    <strong>{adaptiveRec.recommendedTopicName}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "12px" }}>{adaptiveRec.reason}</p>
                  </div>
                )}

                {/* Phase 8: Zero-Data QR Transfer Button */}
                <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                  <button
                    className="action-pill-btn"
                    onClick={() => setShowQRModal(true)}
                    title="Generate QR code for teacher to scan with zero internet"
                  >
                    📱 Display QR Code for Teacher Scan
                  </button>
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

                {/* PROOF-3: Retention Check Banner */}
                <div className="retention-alert-banner">
                  <div>
                    <strong>📅 7-Day Retention Check Scheduled (PROOF-3)</strong>
                    <div style={{ margin: "4px 0 0", color: "#6b21a8", fontSize: "12px" }}>
                      Ebbinghaus retention measurement is due in 7 days to evaluate sustained mastery.
                    </div>
                  </div>
                  <button className="ret-btn" onClick={() => startRetentionQuiz()}>
                    ⚡ Take 7-Day Check Now (Pilot Demo)
                  </button>
                </div>

                <button className="black-pill-btn" style={{ marginTop: "14px" }} onClick={resetSession}>
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* PROOF-3 & PROOF-2: 7-Day Long-Term Retention Check */}
          {stage === "retention" && lesson && (
            <div className="dash-stage-container">
              <div className="stage-back-bar">
                <button className="back-link-btn" onClick={resetSession}>
                  ← Back to Dashboard
                </button>
                <div className="stage-title-pill">Step 4: 7-Day Retention Assessment (PROOF-3)</div>
              </div>

              <div className="dash-card quiz-stage-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <h2 className="quiz-title">7-Day Retention Check: {lesson.title}</h2>
                    <p className="quiz-desc">
                      Measuring long-term memory retention approximately 7 days after peer-tutoring.
                    </p>
                  </div>
                  <span className="gain-chip retention">
                    Disjoint Questions (PROOF-2)
                  </span>
                </div>

                {!retentionResult ? (
                  <>
                    <div className="quiz-items-wrapper">
                      {(lesson.retention || []).map((q, i) => (
                        <div key={i} className="quiz-item-block">
                          <div className="quiz-item-prompt">
                            <span className="quiz-num">{i + 1}</span>
                            <strong>{q.q}</strong>
                            {q.sub_skill && (
                              <span style={{ marginLeft: "8px", fontSize: "11px", color: "#64748b", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                                {q.sub_skill} • Diff: {q.difficulty}
                              </span>
                            )}
                          </div>
                          <div className="quiz-options-grid">
                            {q.options.map((opt, j) => {
                              const isPicked = retentionAnswers[i] === j;
                              return (
                                <button
                                  key={j}
                                  type="button"
                                  className={`quiz-option-button ${isPicked ? "selected" : ""}`}
                                  onClick={() => {
                                    const ans = [...retentionAnswers];
                                    ans[i] = j;
                                    setRetentionAnswers(ans);
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
                        disabled={retentionAnswers.filter((a) => a !== undefined).length < (lesson.retention?.length || 0)}
                        onClick={submitRetentionQuiz}
                      >
                        Submit Retention Test & Record Score →
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎯</div>
                    <h3 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 8px" }}>
                      7-Day Retention Test Complete!
                    </h3>
                    <p style={{ color: "#64748b", margin: "0 0 20px" }}>
                      Retention score successfully recorded and synced to cohort analytics.
                    </p>

                    <div className="results-score-tiles" style={{ maxWidth: "450px", margin: "0 auto 20px" }}>
                      <div className="score-tile">
                        <span className="tile-label">PRE-QUIZ</span>
                        <strong className="tile-value">{pct(pre)}</strong>
                        <span className="tile-note">Baseline</span>
                      </div>
                      <div className="score-tile">
                        <span className="tile-label">POST-QUIZ</span>
                        <strong className="tile-value">{pct(post)}</strong>
                        <span className="tile-note">Immediate</span>
                      </div>
                      <div className="score-tile highlight">
                        <span className="tile-label">RETENTION</span>
                        <strong className="tile-value">{pct(retentionResult.score)}</strong>
                        <span className="tile-note">7-Day Recall</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "24px" }}>
                      <span className="gain-chip positive">
                        +{retentionResult.immediateGain}% Immediate Gain
                      </span>
                      <span className="gain-chip retention">
                        +{retentionResult.retentionGain}% 7-Day Retention Gain
                      </span>
                    </div>

                    <button className="black-pill-btn" onClick={resetSession}>
                      Return to Dashboard
                    </button>
                  </div>
                )}
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

          {/* Teacher Analytics & Class Management Dashboard */}
          {navView === "teacher" && (
            <div className="dash-stage-container">
              <div className="stage-back-bar">
                <button className="back-link-btn" onClick={() => setNavView("dashboard")}>
                  ← Back to Student Dashboard
                </button>
                <div className="stage-title-pill">Teacher Portal</div>
              </div>

              <div className="dash-card teacher-analytics-card">
                <div className="teacher-tabs-nav">
                  <button
                    className={`teacher-tab-btn ${teacherTab === "analytics" ? "active" : ""}`}
                    onClick={() => {
                      setTeacherTab("analytics");
                      loadTeacherDashboards();
                    }}
                  >
                    Cohort Learning Analytics
                  </button>
                  <button
                    className={`teacher-tab-btn ${teacherTab === "authoring" ? "active" : ""}`}
                    onClick={() => {
                      setTeacherTab("authoring");
                      loadAuthoringLessons();
                    }}
                  >
                    ✏️ Lesson Authoring (CONT-1..3)
                  </button>
                  <button
                    className={`teacher-tab-btn ${teacherTab === "roster" ? "active" : ""}`}
                    onClick={() => {
                      setTeacherTab("roster");
                      loadRoster(authSession?.user.school_id || "s1");
                    }}
                  >
                    Class Roster & Setup Slips (CLS-1..4)
                  </button>
                  <button
                    className={`teacher-tab-btn ${teacherTab === "safeguarding" ? "active" : ""}`}
                    onClick={() => {
                      setTeacherTab("safeguarding");
                      loadSafeguardingData(authSession?.user.school_id || "s1");
                    }}
                  >
                    Safeguarding & Reports (SAFE-1..6)
                  </button>
                  <button
                    className={`teacher-tab-btn ${teacherTab === "live" ? "active" : ""}`}
                    onClick={() => setTeacherTab("live")}
                  >
                    🔴 Live Event Stream (LIVE-1..3)
                  </button>
                </div>

                {teacherTab === "analytics" ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                      <div>
                        <h2 className="dash-section-heading" style={{ margin: 0 }}>Cohort Learning Impact & Retention Evidence (PROOF-1..5)</h2>
                        <p className="dash-section-desc" style={{ margin: "4px 0 0 0" }}>
                          Rigorous pilot telemetry tracking immediate mastery gains against 7-day retention persistence, verified against comparison control groups.
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="action-pill-btn" onClick={handleExportCSV}>
                          📥 Export Pilot CSV (DASH-1)
                        </button>
                        <button className="action-pill-btn" onClick={() => window.print()}>
                          🖨️ Print Report
                        </button>
                      </div>
                    </div>

                    <div className="analytics-topic-list">
                      {summary.map((s) => {
                        const immGain = Math.round(s.immediateGain * 100);
                        const retGain = typeof s.retentionGain === "number" ? Math.round(s.retentionGain * 100) : null;
                        return (
                          <div key={s.topic} className="analytics-topic-row">
                            <div className="analytics-row-header">
                              <div>
                                <strong>{s.topic}</strong>
                                <span className="analytics-session-count">
                                  {s.sessions} peer session{s.sessions === 1 ? "" : "s"}
                                  {s.retentionSessions > 0 ? ` • ${s.retentionSessions} 7-day retention check${s.retentionSessions === 1 ? "" : "s"}` : ""}
                                  {s.avgRating ? ` • Avg Rating: ★ ${s.avgRating.toFixed(1)}` : ""}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <span className={`gain-chip ${immGain >= 0 ? "positive" : "negative"}`} title="Immediate post-session mastery gain">
                                  {immGain >= 0 ? `+${immGain}%` : `${immGain}%`} Immediate Gain
                                </span>
                                {retGain !== null && (
                                  <span className="gain-chip retention" title="7-day post-session retention gain over pre-quiz baseline (PROOF-4)">
                                    {retGain >= 0 ? `+${retGain}%` : `${retGain}%`} Retention Gain (7d)
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="triple-progress-container">
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

                              <div className="progress-bar-item">
                                <div className="progress-label-row">
                                  <span>7-Day Retention Recall</span>
                                  <strong>{s.avgRetention !== undefined ? pct(s.avgRetention) : "Pending"}</strong>
                                </div>
                                <div className="progress-track">
                                  <div
                                    className="progress-fill retention"
                                    style={{ width: s.avgRetention !== undefined ? pct(s.avgRetention) : "0%" }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* PROOF-5: Pilot Comparison Group Separation & Proof Card */}
                            {s.comparisonGroup && (
                              <div className="comp-group-card">
                                <div>
                                  <span className="comp-badge">PILOT CONTROL GROUP (PROOF-5)</span>
                                  <span>
                                    Standard Instruction: {s.comparisonGroup.learnerCount} non-tutored comparison learner(s)
                                  </span>
                                </div>
                                <div>
                                  <span style={{ color: "#64748b", marginRight: "8px" }}>
                                    Control Gain: +{Math.round(s.comparisonGroup.avgGain * 100)}%
                                  </span>
                                  <span>vs</span>
                                  <strong style={{ margin: "0 8px", color: "#0f172a" }}>
                                    Peer Cohort: +{immGain}%
                                  </strong>
                                  <span className="gain-chip positive">
                                    +{Math.round((s.immediateGain - s.comparisonGroup.avgGain) * 100)}% Net Impact Lift
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* DASH-1: Topic Struggle Heatmap */}
                    <div style={{ marginTop: "24px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>
                        Topic Struggle Heatmap (DASH-1)
                      </h3>
                      <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                        Identifies curricula where learners exhibit persistent difficulty, highlighting priority peer tutoring intervention areas.
                      </p>
                      {struggleHeatmap.length === 0 ? (
                        <p style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic", marginTop: "12px" }}>
                          No struggle data yet. Complete sessions to populate heatmap.
                        </p>
                      ) : (
                        <div className="heatmap-grid">
                          {struggleHeatmap.map((item) => (
                            <div key={item.topicId} className={`heatmap-card ${item.struggleLevel}`}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                <strong>{item.topicName}</strong>
                                <span className={`struggle-badge ${item.struggleLevel}`}>
                                  {item.struggleLevel} struggle
                                </span>
                              </div>
                              <div style={{ fontSize: "12px", color: "#64748b", display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span>Subject & Form: <strong>{item.subject} (Form {item.grade})</strong></span>
                                <span>Pre-quiz Avg: <strong>{Math.round(item.averageBaseline * 100)}%</strong></span>
                                <span>Post-quiz Avg: <strong>{Math.round(item.averageMastery * 100)}%</strong></span>
                                <span>Struggle Index: <strong>{(item.struggleIndex * 100).toFixed(0)} / 100</strong></span>
                                <span>Students Needing Help: <strong>{item.studentsNeedingHelp}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* DASH-1: Flagged Sessions without Improvement */}
                    {noImpAlerts.length > 0 && (
                      <div className="no-improvement-banner">
                        <h4 style={{ margin: "0 0 8px 0", color: "#991b1b", display: "flex", alignItems: "center", gap: "6px" }}>
                          ⚠️ Flagged Sessions: No Mastery Improvement (DASH-1)
                        </h4>
                        <p style={{ fontSize: "12px", color: "#7f1d1d", margin: "0 0 12px 0" }}>
                          These sessions ended with a post-quiz score less than or equal to the pre-quiz baseline. Follow-up is recommended.
                        </p>
                        <div className="roster-table-wrapper" style={{ background: "#ffffff" }}>
                          <table className="roster-table">
                            <thead>
                              <tr>
                                <th>Session ID</th>
                                <th>Topic</th>
                                <th>Learner</th>
                                <th>Tutor</th>
                                <th>Pre Score</th>
                                <th>Post Score</th>
                                <th>Net Delta</th>
                              </tr>
                            </thead>
                            <tbody>
                              {noImpAlerts.map((a) => (
                                <tr key={a.sessionId}>
                                  <td><code>{a.sessionId.slice(0, 10)}</code></td>
                                  <td><strong>{a.topicName || `Topic ${a.topicId}`}</strong></td>
                                  <td>{a.learnerName || a.learnerId}</td>
                                  <td>{a.tutorName || a.tutorId}</td>
                                  <td>{Math.round(a.pre * 100)}%</td>
                                  <td><strong style={{ color: "#ef4444" }}>{Math.round(a.post * 100)}%</strong></td>
                                  <td>
                                    <span style={{ color: "#ef4444", fontWeight: "700" }}>
                                      {Math.round(a.gain * 100)}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : teacherTab === "authoring" ? (
                  <div className="authoring-container">
                    <div className="class-actions-bar">
                      <div>
                        <h2 className="dash-section-heading">Teacher Lesson Authoring & Publishing (CONT-1, CONT-2, CONT-3)</h2>
                        <span className="section-sub-tip">
                          Create custom school lesson modules with diagnostics, tutor guides, and retention questions. Lessons start in Draft mode; publishing bumps the version and pushes to student downloads.
                        </span>
                      </div>
                    </div>

                    {/* New Lesson Draft Form */}
                    <form onSubmit={handleCreateLesson} className="dash-card" style={{ padding: "20px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <h3 style={{ fontSize: "15px", fontWeight: "700", marginTop: 0, marginBottom: "12px", color: "#0f172a" }}>
                        Create New Lesson Draft (CONT-1)
                      </h3>
                      <div className="lesson-form-grid">
                        <div className="form-group">
                          <label className="form-label">Lesson Title</label>
                          <input
                            type="text"
                            className="form-input"
                            value={newLessonTitle}
                            onChange={(e) => setNewLessonTitle(e.target.value)}
                            placeholder="e.g. Commercial Arithmetic & Taxation"
                            required
                          />
                        </div>
                        <div style={{ display: "flex", gap: "12px" }}>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Subject</label>
                            <select
                              className="form-input"
                              value={newLessonSubject}
                              onChange={(e) => setNewLessonSubject(e.target.value)}
                            >
                              <option value="Math">Math</option>
                              <option value="Biology">Biology</option>
                              <option value="Chemistry">Chemistry</option>
                              <option value="Physics">Physics</option>
                            </select>
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Form Level</label>
                            <select
                              className="form-input"
                              value={newLessonGrade}
                              onChange={(e) => setNewLessonGrade(Number(e.target.value))}
                            >
                              <option value={1}>Form 1</option>
                              <option value={2}>Form 2</option>
                              <option value={3}>Form 3</option>
                              <option value={4}>Form 4</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Tutor Step-by-Step Guide (1 per line)</label>
                          <textarea
                            className="form-input"
                            rows={3}
                            value={newLessonGuide}
                            onChange={(e) => setNewLessonGuide(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Core Explanation</label>
                          <textarea
                            className="form-input"
                            rows={3}
                            value={newLessonExplanation}
                            onChange={(e) => setNewLessonExplanation(e.target.value)}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                        <button type="submit" className="action-pill-btn primary">
                          + Save Lesson Draft (v1)
                        </button>
                      </div>
                    </form>

                    {/* Lesson Library Table */}
                    <div className="roster-table-wrapper">
                      <table className="roster-table">
                        <thead>
                          <tr>
                            <th>Lesson / Topic</th>
                            <th>Subject & Form</th>
                            <th>Version</th>
                            <th>Status</th>
                            <th>Library Scope</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {authoringLessonsList.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                                No lessons authored yet.
                              </td>
                            </tr>
                          ) : (
                            authoringLessonsList.map((ls) => {
                              const isDraft = ls.status === "draft";
                              const isCustom = !!ls.school_id;
                              return (
                                <tr key={ls.topicId}>
                                  <td><strong>{ls.title}</strong></td>
                                  <td>{ls.subject || "Math"} • Form {ls.grade || 2}</td>
                                  <td>
                                    <span className="version-tag">v{ls.version || 1}</span>
                                  </td>
                                  <td>
                                    <span className={isDraft ? "status-badge-draft" : "status-badge-published"}>
                                      {isDraft ? "Draft (Unpublished)" : "Published"}
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{ fontSize: "12px", color: isCustom ? "#7c3aed" : "#0284c7", fontWeight: "600" }}>
                                      {isCustom ? "School Custom" : "Platform Standard"}
                                    </span>
                                  </td>
                                  <td>
                                    {isDraft ? (
                                      <button
                                        className="action-pill-btn primary"
                                        style={{ padding: "4px 10px", fontSize: "11px" }}
                                        onClick={() => handlePublishLesson(ls.topicId)}
                                        title="Bumps version and makes available to offline downloads (CONT-2)"
                                      >
                                        Publish (v{(ls.version || 1) + 1})
                                      </button>
                                    ) : (
                                      <button
                                        className="action-pill-btn"
                                        style={{ padding: "4px 10px", fontSize: "11px" }}
                                        onClick={() => handlePublishLesson(ls.topicId)}
                                        title="Republish with new version bump"
                                      >
                                        Re-publish (v{(ls.version || 1) + 1})
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : teacherTab === "roster" ? (
                  <div className="class-mgmt-container">
                    <div className="class-actions-bar">
                      <div>
                        <h2 className="dash-section-heading">Student Class Roster</h2>
                        <span className="section-sub-tip">
                          School Tenant: {authSession?.user.school_code || "ALLIANCE"} • {rosterStudents.length} Students Enrolled
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          className="action-pill-btn primary"
                          onClick={() => setShowSlipsModal(true)}
                          disabled={rosterStudents.length === 0}
                        >
                          🖨️ Printable Setup Slips ({rosterStudents.length})
                        </button>
                      </div>
                    </div>

                    {/* CSV Import Box (CLS-1) */}
                    <div className="csv-upload-box">
                      <div style={{ textAlign: "left", width: "100%" }}>
                        <strong>Bulk Import Students via CSV (CLS-1)</strong>
                        <span className="section-sub-tip">Format: reg_number, full_name, grade, class_stream</span>
                      </div>
                      <textarea
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        placeholder="reg_number, full_name, grade, class_stream&#10;ADM-201, Faith Muthoni, 2, North&#10;ADM-202, Brian Kiprono, 3, West&#10;ADM-203, Mary Wanjiku, 1, East"
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", gap: "8px" }}>
                        <button
                          className="action-pill-btn primary"
                          onClick={handleImportCSV}
                          disabled={!csvText.trim()}
                        >
                          Import Roster & Generate Setup Codes
                        </button>
                      </div>
                    </div>

                    {/* Roster Table */}
                    <div className="roster-table-wrapper">
                      <table className="roster-table">
                        <thead>
                          <tr>
                            <th>Adm / Reg No</th>
                            <th>Student Name</th>
                            <th>Form / Grade</th>
                            <th>Stream</th>
                            <th>One-Time Setup Code</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rosterStudents.map((s) => (
                            <tr key={s.id || s.reg_number}>
                              <td><strong>{s.reg_number}</strong></td>
                              <td>{s.full_name}</td>
                              <td>Form {s.grade}</td>
                              <td>{s.class_stream || "General"}</td>
                              <td>
                                {s.setup_code ? (
                                  <span className="setup-code-badge">{s.setup_code}</span>
                                ) : (
                                  <span style={{ color: "#10b981", fontSize: "12px", fontWeight: "700" }}>✓ Activated</span>
                                )}
                              </td>
                              <td>
                                <button
                                  className="btn-small-reset"
                                  onClick={() => handleResetPin(s)}
                                  title="Teacher PIN Reset (AUTH-6)"
                                >
                                  Reset PIN
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="class-mgmt-container">
                    <div className="class-actions-bar">
                      <div>
                        <h2 className="dash-section-heading">Tutor Safeguarding & Approvals (SAFE-1, SAFE-2)</h2>
                        <span className="section-sub-tip">
                          Tutors require $\ge 80\%$ mastery AND explicit teacher approval per topic before appearing in matches.
                        </span>
                      </div>
                    </div>

                    {/* Tutors Table */}
                    <div className="roster-table-wrapper" style={{ marginBottom: "24px" }}>
                      <table className="roster-table">
                        <thead>
                          <tr>
                            <th>Tutor Name</th>
                            <th>Grade</th>
                            <th>Diagnostic Score</th>
                            <th>Teacher Approved</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allTutorsList.map((t) => {
                            const curTopicId = selectedTopic?.id || 1;
                            const isApproved = !!t.teacherApproved?.[curTopicId];
                            const isSuspended = !!t.isSuspended;
                            const scoreVal = t.verifiedScore?.[curTopicId];
                            const scorePct = scoreVal !== undefined ? `${Math.round(scoreVal * 100)}%` : "N/A";

                            return (
                              <tr key={t.id}>
                                <td><strong>{t.name}</strong></td>
                                <td>Form {t.grade}</td>
                                <td>
                                  <span className={`stat-badge ${scoreVal && scoreVal >= 0.8 ? "gain" : "score"}`}>
                                    {scorePct}
                                  </span>
                                </td>
                                <td>
                                  {isApproved ? (
                                    <span style={{ color: "#10b981", fontWeight: "700", fontSize: "12px" }}>✓ Approved (Topic {curTopicId})</span>
                                  ) : (
                                    <span style={{ color: "#f59e0b", fontWeight: "700", fontSize: "12px" }}>⏳ Pending Review</span>
                                  )}
                                </td>
                                <td>
                                  {isSuspended ? (
                                    <span style={{ color: "#ef4444", fontWeight: "700", fontSize: "12px" }}>⛔ Suspended</span>
                                  ) : (
                                    <span style={{ color: "#10b981", fontWeight: "700", fontSize: "12px" }}>Active</span>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button
                                      className="btn-small-reset"
                                      onClick={() => handleToggleTutorApproval(t.id, curTopicId, isApproved)}
                                      style={{ borderColor: isApproved ? "#cbd5e1" : "#10b981", color: isApproved ? "#64748b" : "#065f46" }}
                                    >
                                      {isApproved ? "Revoke Approval" : "Approve Tutor"}
                                    </button>
                                    <button
                                      className="btn-small-reset"
                                      onClick={() => handleToggleTutorSuspension(t.id, isSuspended)}
                                      style={{ borderColor: isSuspended ? "#10b981" : "#ef4444", color: isSuspended ? "#065f46" : "#991b1b" }}
                                    >
                                      {isSuspended ? "Reinstate" : "Suspend (SAFE-2)"}
                                    </button>
                                    {isApproved && scoreVal && scoreVal >= 0.8 && (
                                      <button
                                        className="btn-small-reset"
                                        onClick={() => {
                                          setSelectedCertTutor(t);
                                          setShowCertModal(true);
                                        }}
                                        style={{ borderColor: "#3b82f6", color: "#1d4ed8" }}
                                        title="View Printable Peer Tutor Certificate (LATER item)"
                                      >
                                        📜 Certificate
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="class-actions-bar">
                      <div>
                        <h2 className="dash-section-heading">Confidential Safeguarding Reports (SAFE-4)</h2>
                        <span className="section-sub-tip">
                          Direct incident alerts from students and tutors forwarded to School Administration.
                        </span>
                      </div>
                    </div>

                    {/* Reports Table */}
                    <div className="roster-table-wrapper">
                      <table className="roster-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Reporter</th>
                            <th>Target</th>
                            <th>Reason</th>
                            <th>Details</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeguardingReports.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                                No safeguarding reports filed. All peer sessions are operating safely.
                              </td>
                            </tr>
                          ) : (
                            safeguardingReports.map((r) => (
                              <tr key={r.id}>
                                <td style={{ fontSize: "11px", color: "#64748b" }}>
                                  {new Date(r.created_at).toLocaleDateString()}
                                </td>
                                <td>{r.reporter_name || r.reporter_id}</td>
                                <td>{r.target_name || r.target_id || "Session"}</td>
                                <td><strong>{r.reason}</strong></td>
                                <td style={{ maxWidth: "220px", fontSize: "12px", color: "#475569" }}>{r.details || "None"}</td>
                                <td>
                                  <span className={`status-chip ${r.status === "open" ? "offline" : "online"}`}>
                                    {r.status.toUpperCase()}
                                  </span>
                                </td>
                                <td>
                                  {r.status === "open" ? (
                                    <button
                                      className="btn-small-reset"
                                      onClick={() => handleResolveReport(r.id)}
                                      style={{ backgroundColor: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0" }}
                                    >
                                      Mark Resolved
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>Resolved</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Phase 5: LIVE Events Stream Tab (LIVE-1..3) */}
                {teacherTab === "live" && (
                  <div className="live-feed-card">
                    <div className="live-feed-header">
                      <div>
                        <h2 className="dash-section-heading" style={{ margin: 0 }}>
                          <span className="live-pulse-dot" />
                          Live Real-Time Session Feed (LIVE-1, LIVE-2)
                        </h2>
                        <span className="section-sub-tip">
                          Subscribed to school stream ({authSession?.user.school_code || "ALLIANCE"}). Events sync across browser windows without refreshing.
                        </span>
                      </div>
                      <button
                        className="action-pill-btn"
                        onClick={() => {
                          const schoolId = authSession?.user.school_id || "s1";
                          fetch(`/api/events?schoolId=${schoolId}`)
                            .then((r) => r.json())
                            .then((evts) => {
                              if (Array.isArray(evts)) setLiveEvents(evts.reverse());
                            });
                        }}
                      >
                        Refresh Events
                      </button>
                    </div>

                    {liveEvents.length === 0 ? (
                      <div className="empty-subtext" style={{ padding: "20px 0" }}>
                        No session events recorded yet. Start a session in another window to see live sync!
                      </div>
                    ) : (
                      <div className="live-event-list">
                        {liveEvents.map((ev, i) => (
                          <div key={ev.id || i} className="live-event-row">
                            <div>
                              <strong style={{ textTransform: "uppercase", fontSize: "11px", color: "#3b82f6", marginRight: "8px" }}>
                                {ev.type.replace(/_/g, " ")}
                              </strong>
                              <span>
                                {ev.payload?.actor_name || "Student"} ({ev.payload?.actor_role || "learner"}): {ev.payload?.topic_name || "Session"}
                              </span>
                              {ev.payload?.score !== undefined && (
                                <span style={{ marginLeft: "8px", fontWeight: "600", color: "#10b981" }}>
                                  Score: {Math.round(ev.payload.score * 100)}%
                                </span>
                              )}
                              {ev.payload?.step_text && (
                                <span style={{ marginLeft: "8px", color: "#64748b", fontStyle: "italic" }}>
                                  "{ev.payload.step_text.slice(0, 40)}..."
                                </span>
                              )}
                            </div>
                            <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                              {ev.created_at ? new Date(ev.created_at).toLocaleTimeString() : "Just now"}
                              {ev.is_demo && <span style={{ marginLeft: "6px", color: "#6366f1" }}>[Demo]</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase 6: Platform Multi-School Admin & Impact Reporting (DASH-2, R5) */}
          {navView === "platform_admin" && (
            <div className="dash-stage-container">
              <div className="stage-back-bar">
                <button className="back-link-btn" onClick={() => setNavView("dashboard")}>
                  ← Back to Student Dashboard
                </button>
                <div className="stage-title-pill">Platform Operations & Impact</div>
              </div>

              <div className="dash-card teacher-analytics-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                  <div>
                    <h2 className="dash-section-heading" style={{ margin: 0 }}>
                      Ministry & Foundation Aggregate Impact Report (DASH-2)
                    </h2>
                    <span className="section-sub-tip">
                      Consolidated cross-school impact metrics for county education boards and research donors.
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="struggle-badge low" style={{ padding: "6px 12px", fontSize: "12px" }}>
                      🛡️ Demo Data Excluded (R5 Active)
                    </span>
                    <button className="action-pill-btn" onClick={loadPlatformAdminData}>
                      🔄 Refresh
                    </button>
                  </div>
                </div>

                {/* Hero Aggregate Metrics */}
                {platformReport && (
                  <div className="impact-hero-grid">
                    <div className="impact-metric-box">
                      <div className="impact-metric-value">{platformReport.totalSessions}</div>
                      <div className="impact-metric-label">Verified Sessions</div>
                    </div>
                    <div className="impact-metric-box">
                      <div className="impact-metric-value">{platformReport.totalLearners}</div>
                      <div className="impact-metric-label">Active Learners</div>
                    </div>
                    <div className="impact-metric-box">
                      <div className="impact-metric-value">{platformReport.totalTutors}</div>
                      <div className="impact-metric-label">Certified Tutors</div>
                    </div>
                    <div className="impact-metric-box">
                      <div className="impact-metric-value" style={{ color: "#10b981" }}>
                        +{Math.round(platformReport.avgImmediateGain * 100)}%
                      </div>
                      <div className="impact-metric-label">Avg Mastery Gain</div>
                    </div>
                    <div className="impact-metric-box">
                      <div className="impact-metric-value" style={{ color: "#6366f1" }}>
                        +{Math.round(platformReport.avgRetentionGain * 100)}%
                      </div>
                      <div className="impact-metric-label">7-Day Retention Gain</div>
                    </div>
                    <div className="impact-metric-box">
                      <div className="impact-metric-value" style={{ color: "#059669", fontSize: "18px", paddingTop: "6px" }}>
                        Active (R5)
                      </div>
                      <div className="impact-metric-label">Demo Filter Status</div>
                    </div>
                  </div>
                )}

                {/* Multi-School Health Table */}
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0f172a", marginTop: "24px", marginBottom: "8px" }}>
                  School Tenant Health & Real-World Engagement
                </h3>
                <div className="roster-table-wrapper">
                  <table className="roster-table">
                    <thead>
                      <tr>
                        <th>School Name</th>
                        <th>Code</th>
                        <th>Status</th>
                        <th>Students</th>
                        <th>Tutors</th>
                        <th>Real Sessions</th>
                        <th>Avg Gain</th>
                        <th>Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformSchools.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                            No schools active yet.
                          </td>
                        </tr>
                      ) : (
                        platformSchools.map((sc) => (
                          <tr key={sc.schoolId}>
                            <td><strong>{sc.schoolName}</strong></td>
                            <td><code>{sc.schoolCode}</code></td>
                            <td>
                              <span className={`status-chip ${sc.status === "active" ? "online" : "offline"}`}>
                                {sc.status.toUpperCase()}
                              </span>
                            </td>
                            <td>{sc.studentsCount}</td>
                            <td>{sc.tutorsCount}</td>
                            <td><strong>{sc.sessionsCount}</strong></td>
                            <td>
                              <span className="stat-badge gain">
                                +{Math.round(sc.avgGain * 100)}%
                              </span>
                            </td>
                            <td style={{ fontSize: "11px", color: "#64748b" }}>
                              {new Date(sc.lastActivity).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Phase 8: Tutor Training Hub */}
          {navView === "training" && (
            <div className="dash-stage-container">
              <div className="stage-back-bar">
                <button className="back-link-btn" onClick={() => setNavView("dashboard")}>
                  ← Back to Dashboard
                </button>
                <div className="stage-title-pill">Pedagogical Training & Certification</div>
              </div>
              <TutorTrainingHub
                tutorId={selectedTutor?.tutor.id || "t1"}
                tutorName={selectedTutor?.tutor.name || "Wanjiru"}
                onOpenCert={() => {
                  setSelectedCertTutor(selectedTutor?.tutor || tutors[0]?.tutor || null);
                  setShowCertModal(true);
                }}
              />
            </div>
          )}

          {/* Phase 8: Adaptive Prerequisite Learning Graph */}
          {navView === "adaptive" && (
            <div className="dash-stage-container">
              <div className="stage-back-bar">
                <button className="back-link-btn" onClick={() => setNavView("dashboard")}>
                  ← Back to Dashboard
                </button>
                <div className="stage-title-pill">Adaptive Knowledge Graph</div>
              </div>
              <AdaptiveGraphView
                onSelectTopic={(tid) => {
                  const t = topics.find((x) => x.id === tid);
                  if (t) handleSelectTopic(t);
                  setNavView("dashboard");
                }}
              />
            </div>
          )}

          {/* Phase 8: Small-Group Peer Tutoring */}
          {navView === "groups" && (
            <div className="dash-stage-container">
              <div className="stage-back-bar">
                <button className="back-link-btn" onClick={() => setNavView("dashboard")}>
                  ← Back to Dashboard
                </button>
                <div className="stage-title-pill">Small-Group Peer Tutoring</div>
              </div>
              <GroupTutoringView
                topics={topics}
                tutors={tutors.map((tr) => tr.tutor)}
              />
            </div>
          )}
        </section>
      </div>

      {/* ====================================================================== */}
      {/* Printable Setup Slips Modal (CLS-3)                                   */}
      {/* ====================================================================== */}
      {showSlipsModal && (
        <div className="auth-modal-overlay" onClick={() => setShowSlipsModal(false)}>
          <div className="auth-modal-card" style={{ maxWidth: "760px" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-x" onClick={() => setShowSlipsModal(false)}>✕</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 className="dash-section-heading">Printable Student Setup Slips</h2>
                <span className="section-sub-tip">Distribute these one-time codes to students for initial account setup</span>
              </div>
              <button className="action-pill-btn primary" onClick={() => window.print()}>
                🖨️ Print Slips
              </button>
            </div>

            <div className="slips-grid">
              {rosterStudents.map((s) => (
                <div key={s.reg_number} className="student-slip-card">
                  <div className="slip-school-code">PEERLEARN • {authSession?.user.school_code || "ALLIANCE"}</div>
                  <div className="slip-student-name">{s.full_name}</div>
                  <div className="slip-reg-number">Admission: <strong>{s.reg_number}</strong> (Form {s.grade})</div>
                  <div className="slip-code-box">
                    <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>One-Time Setup Code</span>
                    <div className="slip-code-highlight">{s.setup_code || "ACTIVE"}</div>
                  </div>
                  <div className="slip-instructions">
                    1. Go to peerlearn app.<br/>
                    2. Click "First-Time PIN Setup".<br/>
                    3. Enter this setup code and pick your secret 6-digit PIN.
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* Phase 2: Auth Modal (Login / First Setup / School Apply)              */}
      {/* ====================================================================== */}
      {showAuthModal && (
        <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-x" onClick={() => setShowAuthModal(false)}>✕</button>

            {/* Modal Tabs */}
            <div className="auth-tabs-row">
              <button
                className={`auth-tab-btn ${authMode === "login" ? "active" : ""}`}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                  setAuthSuccess("");
                }}
              >
                Student Sign In
              </button>
              <button
                className={`auth-tab-btn ${authMode === "first_setup" ? "active" : ""}`}
                onClick={() => {
                  setAuthMode("first_setup");
                  setAuthError("");
                  setAuthSuccess("");
                }}
              >
                First-Time Setup
              </button>
              <button
                className={`auth-tab-btn ${authMode === "school_apply" ? "active" : ""}`}
                onClick={() => {
                  setAuthMode("school_apply");
                  setAuthError("");
                  setAuthSuccess("");
                }}
              >
                Onboard School
              </button>
            </div>

            {authError && <div className="auth-error-banner">{authError}</div>}
            {authSuccess && <div className="auth-success-banner">{authSuccess}</div>}

            {/* Mode 1: Student Login (AUTH-4, AUTH-5) */}
            {authMode === "login" && (
              <form className="auth-form" onSubmit={handleStudentLogin}>
                <div className="form-group">
                  <label className="form-label">
                    <span>School Code</span>
                    <span className="form-hint">e.g. ALLIANCE</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={authSchoolCode}
                    onChange={(e) => setAuthSchoolCode(e.target.value.toUpperCase())}
                    className="form-input"
                    placeholder="ALLIANCE"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Registration / Admission Number</span>
                    <span className="form-hint">e.g. ADM-101</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={authRegNumber}
                    onChange={(e) => setAuthRegNumber(e.target.value)}
                    className="form-input"
                    placeholder="ADM-101"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>6-Digit Secret PIN</span>
                    <span className="form-hint">5 attempts before 15m lockout</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={authPin}
                    onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, ""))}
                    className="form-input pin-input"
                    placeholder="••••••"
                  />
                </div>

                <button type="submit" className="form-submit-btn" disabled={authLoading || authPin.length !== 6}>
                  {authLoading ? "Verifying..." : "Sign In to PeerLearn"}
                </button>

                <div style={{ textAlign: "center", fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
                  Haven't set your PIN yet?{" "}
                  <a
                    href="#setup"
                    style={{ color: "#0f172a", fontWeight: "700" }}
                    onClick={(e) => {
                      e.preventDefault();
                      setAuthMode("first_setup");
                    }}
                  >
                    Activate with setup slip →
                  </a>
                </div>
              </form>
            )}

            {/* Mode 2: First-Time Setup (AUTH-3) */}
            {authMode === "first_setup" && (
              <form className="auth-form" onSubmit={handleStudentFirstSetup}>
                <div className="form-group">
                  <label className="form-label">
                    <span>School Code</span>
                    <span className="form-hint">From your teacher's slip</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={authSchoolCode}
                    onChange={(e) => setAuthSchoolCode(e.target.value.toUpperCase())}
                    className="form-input"
                    placeholder="ALLIANCE"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Registration Number</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={authRegNumber}
                    onChange={(e) => setAuthRegNumber(e.target.value)}
                    className="form-input"
                    placeholder="ADM-101"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>One-Time Setup Code</span>
                    <span className="form-hint">6-character code printed on slip</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={authSetupCode}
                    onChange={(e) => setAuthSetupCode(e.target.value.toUpperCase().trim())}
                    className="form-input"
                    placeholder="e.g. 7K9X2B"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Choose Your 6-Digit PIN</span>
                    <span className="form-hint">You will use this to sign in</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={authPin}
                    onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, ""))}
                    className="form-input pin-input"
                    placeholder="••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="form-submit-btn"
                  disabled={authLoading || !authSetupCode || authPin.length !== 6}
                >
                  {authLoading ? "Activating..." : "Create PIN & Activate Account"}
                </button>
              </form>
            )}

            {/* Mode 3: School Onboarding Application (ONB-1..4) */}
            {authMode === "school_apply" && (
              <form className="auth-form" onSubmit={handleSchoolApplication}>
                <div className="form-group">
                  <label className="form-label">
                    <span>School Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={appSchoolName}
                    onChange={(e) => setAppSchoolName(e.target.value)}
                    className="form-input"
                    placeholder="e.g. Lenana School"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="form-group">
                    <label className="form-label">
                      <span>County</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={appCounty}
                      onChange={(e) => setAppCounty(e.target.value)}
                      className="form-input"
                      placeholder="Nairobi"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <span>School Type</span>
                    </label>
                    <select
                      value={appSchoolType}
                      onChange={(e) => setAppSchoolType(e.target.value)}
                      className="form-input"
                    >
                      <option value="Public National">Public National</option>
                      <option value="Public Extra-County">Public Extra-County</option>
                      <option value="Public County">Public County</option>
                      <option value="Private Secondary">Private Secondary</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="form-group">
                    <label className="form-label">
                      <span>Contact Teacher/Admin</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={appContactName}
                      onChange={(e) => setAppContactName(e.target.value)}
                      className="form-input"
                      placeholder="Mr. Kimani"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <span>Phone Number</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={appContactPhone}
                      onChange={(e) => setAppContactPhone(e.target.value)}
                      className="form-input"
                      placeholder="+254 712 345678"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Official Email</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={appContactEmail}
                    onChange={(e) => setAppContactEmail(e.target.value)}
                    className="form-input"
                    placeholder="admin@school.ac.ke"
                  />
                </div>

                <div className="form-group" style={{ flexDirection: "row", alignItems: "flex-start", gap: "10px" }}>
                  <input
                    type="checkbox"
                    id="consentCheck"
                    required
                    checked={appConsent}
                    onChange={(e) => setAppConsent(e.target.checked)}
                    style={{ marginTop: "3px" }}
                  />
                  <label htmlFor="consentCheck" style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.4" }}>
                    I confirm that student enrollment adheres to the Kenya Data Protection Act 2019 and parental/guardian consent is maintained on file at the school.
                  </label>
                </div>

                <button type="submit" className="form-submit-btn" disabled={authLoading || !appConsent}>
                  {authLoading ? "Submitting..." : "Submit Application for Sandbox Pilot"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* Problem Report Modal (SAFE-4)                                         */}
      {/* ====================================================================== */}
      {showReportModal && (
        <div className="auth-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-x" onClick={() => setShowReportModal(false)}>✕</button>

            <div>
              <h2 className="dash-section-heading">Report a Problem</h2>
              <span className="section-sub-tip">
                Confidential safeguarding report to your school teacher and administration.
              </span>
            </div>

            <form className="auth-form" onSubmit={handleSubmitReport}>
              <div className="form-group">
                <label className="form-label"><span>Subject / Target</span></label>
                <input
                  type="text"
                  disabled
                  value={reportingTarget ? reportingTarget.name : "Session Incident"}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label"><span>Category / Reason</span></label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="form-input"
                >
                  <option value="Inappropriate behavior">Inappropriate behavior</option>
                  <option value="Unsafe study location">Unsafe study location</option>
                  <option value="Tutor did not attend">Tutor did not attend</option>
                  <option value="Content difficulty or concern">Content difficulty or concern</option>
                  <option value="Other concern">Other concern</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label"><span>Additional Details (Optional)</span></label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Describe what occurred. This is kept strictly confidential."
                  className="form-input"
                  style={{ height: "90px" }}
                />
              </div>

              <button type="submit" className="form-submit-btn" style={{ backgroundColor: "#ef4444" }}>
                Submit Confidential Report (SAFE-4)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* Peer Tutor Certificate Modal (LATER item)                              */}
      {/* ====================================================================== */}
      {showCertModal && selectedCertTutor && (
        <div className="auth-modal-overlay" onClick={() => setShowCertModal(false)}>
          <div className="auth-modal-card" style={{ maxWidth: "620px" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-x" onClick={() => setShowCertModal(false)}>✕</button>
            <div className="cert-card-wrapper">
              <div className="cert-header">REPUBLIC OF KENYA • MINISTRY OF EDUCATION PILOT</div>
              <h2 className="cert-title">PEER TUTOR CERTIFICATE</h2>
              <div className="cert-subtitle">Certificate of Pedagogical & Subject Mastery</div>
              <div className="cert-recipient">{selectedCertTutor.name}</div>
              <p className="cert-body">
                Has successfully demonstrated mastery of Kenyan Secondary Curricula (Form {selectedCertTutor.grade}), completed peer instruction guidelines, and attained teacher verification with an evaluation score &ge; 80%.
              </p>
              <div className="cert-footer">
                <div>
                  <strong>School Tenant</strong><br/>
                  {authSession?.user.school_code || "ALLIANCE"}
                </div>
                <div>
                  <strong>Status</strong><br/>
                  <span style={{ color: "#10b981", fontWeight: "700" }}>✓ Certified Active</span>
                </div>
                <div>
                  <strong>Date Verified</strong><br/>
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button className="action-pill-btn" onClick={() => setShowCertModal(false)}>
                Close
              </button>
              <button className="action-pill-btn primary" onClick={() => window.print()}>
                🖨️ Print Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 8: Africa's Talking USSD & SMS Simulator Modal */}
      {showTelecomModal && (
        <TelecomSimulatorModal onClose={() => setShowTelecomModal(false)} />
      )}

      {/* Phase 8: Zero-Data Offline QR Handoff Modal */}
      {showQRModal && (
        <QRHandoffModal
          onClose={() => setShowQRModal(false)}
          activeLesson={lesson}
        />
      )}
    </div>
  );
}
