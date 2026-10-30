import { useState, useEffect } from "react";
import type { GroupMatch, GroupSessionResult, Topic, Tutor } from "../../../shared/types";

interface GroupTutoringViewProps {
  topics?: Topic[];
  tutors?: Tutor[];
}

export function GroupTutoringView({ topics = [], tutors = [] }: GroupTutoringViewProps) {
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupMatch | null>(null);

  // Form state
  const [newTopicId, setNewTopicId] = useState<number>(1);
  const [newTutorId, setNewTutorId] = useState<string>("t1");
  const [selectedLearners, setSelectedLearners] = useState<string[]>(["l1", "l2"]);
  const [scheduledSlot, setScheduledSlot] = useState("Today, 16:30 (Prep Room A)");
  const [isCreating, setIsCreating] = useState(false);

  // Session execution state
  const [isRunningSession, setIsRunningSession] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [scores, setScores] = useState<
    Record<string, { pre: number; post: number }>
  >({
    l1: { pre: 0.4, post: 0.8 },
    l2: { pre: 0.3, post: 0.7 },
  });
  const [completionResult, setCompletionResult] = useState<GroupSessionResult | null>(null);
  const [msg, setMsg] = useState("");

  const availableLearners = [
    { id: "l1", name: "Amani R. (Form 2)" },
    { id: "l2", name: "Faith K. (Form 2)" },
    { id: "l3", name: "Moses O. (Form 2)" },
    { id: "l4", name: "Mercy W. (Form 2)" },
  ];

  useEffect(() => {
    loadGroupMatches();
  }, []);

  async function loadGroupMatches() {
    try {
      const res = await fetch("/api/groups?schoolId=s1");
      if (res.ok) {
        const matches = await res.json();
        setGroupMatches(matches);
        if (matches.length > 0 && !activeGroup) {
          setActiveGroup(matches[0]);
        }
      }
    } catch {}
  }

  // Timer effect
  useEffect(() => {
    let interval: any = null;
    if (timerActive && secondsLeft > 0) {
      interval = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, secondsLeft]);

  async function handleCreateGroupMatch(e: React.FormEvent) {
    e.preventDefault();
    if (selectedLearners.length < 2) {
      setMsg("Please select at least 2 learners for small-group peer tutoring.");
      return;
    }
    try {
      const res = await fetch("/api/groups/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: "s1",
          tutorId: newTutorId,
          learnerIds: selectedLearners,
          topicId: newTopicId,
          scheduledAt: scheduledSlot,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setGroupMatches((prev) => [data.match, ...prev]);
        setActiveGroup(data.match);
        setIsCreating(false);
        setMsg(`✓ Group session scheduled with ${data.match.tutorName}!`);
      }
    } catch {
      setMsg("Failed to schedule group session.");
    }
  }

  function startGroupSession(match: GroupMatch) {
    setActiveGroup(match);
    setIsRunningSession(true);
    setTimerActive(true);
    setSecondsLeft(20 * 60);
    setCompletionResult(null);

    // Initialize scores for learners in match
    const initialScores: Record<string, { pre: number; post: number }> = {};
    match.learnerIds.forEach((lid, idx) => {
      initialScores[lid] = { pre: 0.3 + idx * 0.1, post: 0.75 + idx * 0.05 };
    });
    setScores(initialScores);
  }

  async function handleFinishGroupSession() {
    if (!activeGroup) return;
    const learnerResults = activeGroup.learnerIds.map((lid) => {
      const s = scores[lid] || { pre: 0.4, post: 0.8 };
      return {
        learnerId: lid,
        preScore: s.pre,
        postScore: s.post,
        gain: Number((s.post - s.pre).toFixed(2)),
      };
    });

    const payload: GroupSessionResult = {
      client_id: `grp-sess-${Date.now()}`,
      groupId: activeGroup.id,
      schoolId: activeGroup.schoolId,
      tutorId: activeGroup.tutorId,
      topicId: activeGroup.topicId,
      learnerResults,
      avgGain: 0,
      at: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/groups/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setCompletionResult(data.session);
        setTimerActive(false);
        setMsg(data.message);
        loadGroupMatches();
      }
    } catch {
      setMsg("Failed to complete group session.");
    }
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="group-tutoring-container">
      {/* Banner */}
      <div className="group-banner">
        <div>
          <span className="badge-pill">Phase 8 • Collaborative Learning</span>
          <h2>Small-Group Peer Tutoring (1 Tutor : 2–4 Peers)</h2>
          <p>
            When multiple students share the exact same topic struggle, group sessions enable
            high-yield collaborative practice. Tutors facilitate peer problem-solving and discuss
            common misconceptions while tracking each student's pre and post scores.
          </p>
        </div>

        <button
          className="action-pill-btn primary"
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? "Cancel" : "+ Schedule New Group Session"}
        </button>
      </div>

      {msg && <div className="alert-banner info">{msg}</div>}

      {/* Creation Modal / Inline Form */}
      {isCreating && (
        <form className="group-create-card" onSubmit={handleCreateGroupMatch}>
          <h3>Schedule Small-Group Session</h3>

          <div className="form-row">
            <div className="form-group">
              <label>Subject Topic:</label>
              <select
                value={newTopicId}
                onChange={(e) => setNewTopicId(Number(e.target.value))}
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Form {t.grade})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Certified Peer Tutor:</label>
              <select
                value={newTutorId}
                onChange={(e) => setNewTutorId(e.target.value)}
              >
                {tutors.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.name} (Form {tr.grade} • Verified)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Select Struggling Peers (2 to 4 learners):</label>
            <div className="learner-checkbox-grid">
              {availableLearners.map((lrn) => {
                const checked = selectedLearners.includes(lrn.id);
                return (
                  <label key={lrn.id} className={`checkbox-card ${checked ? "selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLearners([...selectedLearners, lrn.id]);
                        } else {
                          setSelectedLearners(selectedLearners.filter((x) => x !== lrn.id));
                        }
                      }}
                    />
                    <span>{lrn.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Classroom / Prep Location & Time:</label>
            <input
              type="text"
              value={scheduledSlot}
              onChange={(e) => setScheduledSlot(e.target.value)}
            />
          </div>

          <button type="submit" className="action-pill-btn primary">
            Confirm & Dispatch Session Invitations
          </button>
        </form>
      )}

      {/* Interactive Active Group Session Workspace */}
      {isRunningSession && activeGroup && (
        <div className="active-group-workspace">
          <div className="workspace-header">
            <div>
              <span className="live-pulse-dot" />
              <h3>Active Group Session: {activeGroup.topicName}</h3>
              <p>Tutor: <strong>{activeGroup.tutorName}</strong> • Venue: {activeGroup.scheduledAt}</p>
            </div>

            {/* Timer */}
            <div className="timer-box">
              <span className="timer-icon">⏱️</span>
              <span className="digits">{timeFormatted}</span>
              <button
                className="timer-toggle-btn"
                onClick={() => setTimerActive(!timerActive)}
              >
                {timerActive ? "Pause" : "Resume"}
              </button>
            </div>
          </div>

          {/* Multi-Learner Gains Table */}
          <div className="group-scores-table-wrapper">
            <table className="group-scores-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Pre-Quiz (Baseline)</th>
                  <th>Post-Quiz (Mastery)</th>
                  <th>Measured Gain</th>
                </tr>
              </thead>
              <tbody>
                {activeGroup.learnerIds.map((lid) => {
                  const s = scores[lid] || { pre: 0.3, post: 0.8 };
                  const gain = Math.round((s.post - s.pre) * 100);
                  return (
                    <tr key={lid}>
                      <td>
                        <strong>{lid === "l1" ? "Amani R." : lid === "l2" ? "Faith K." : lid === "l3" ? "Moses O." : "Mercy W."}</strong>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={s.pre}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setScores({
                              ...scores,
                              [lid]: { ...s, pre: val },
                            });
                          }}
                          className="score-cell-input"
                        />
                        <span className="pct-label">({Math.round(s.pre * 100)}%)</span>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={s.post}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setScores({
                              ...scores,
                              [lid]: { ...s, post: val },
                            });
                          }}
                          className="score-cell-input"
                        />
                        <span className="pct-label">({Math.round(s.post * 100)}%)</span>
                      </td>
                      <td>
                        <span className={`gain-badge ${gain >= 20 ? "high" : "positive"}`}>
                          +{gain}% Gain
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="workspace-footer">
            <button
              className="action-pill-btn secondary"
              onClick={() => setIsRunningSession(false)}
            >
              Exit Session View
            </button>
            <button
              className="action-pill-btn primary"
              onClick={handleFinishGroupSession}
            >
              ✓ Complete & Broadcast Group Results
            </button>
          </div>

          {completionResult && (
            <div className="group-completion-card">
              <div className="congrats-icon">🎉</div>
              <div>
                <h4>Group Session Verified & Saved!</h4>
                <p>
                  Average Cohort Gain: <strong>+{(completionResult.avgGain * 100).toFixed(0)}%</strong> across {completionResult.learnerResults.length} learners.
                  Results logged into tamper-evident audit trail.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* List of Scheduled / Past Group Matches */}
      <div className="group-matches-grid">
        <h3>Scheduled School Cohorts</h3>
        <div className="cards-stack">
          {groupMatches.map((m) => (
            <div key={m.id} className="group-match-card">
              <div className="match-card-top">
                <span className="topic-badge">{m.topicName}</span>
                <span className={`status-badge ${m.status}`}>{m.status.toUpperCase()}</span>
              </div>

              <div className="match-details">
                <p><strong>Tutor:</strong> {m.tutorName}</p>
                <p><strong>Peers:</strong> {m.learnerIds.length} learners enrolled ({m.learnerIds.join(", ")})</p>
                <p><strong>Time:</strong> {m.scheduledAt}</p>
              </div>

              <div className="match-actions">
                <button
                  className="action-pill-btn primary"
                  onClick={() => startGroupSession(m)}
                >
                  🚀 Launch Group Session
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
