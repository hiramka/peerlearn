import { useState, useEffect } from "react";
import type { TopicPrerequisiteNode, AdaptiveRecommendation } from "../../../shared/types";

interface AdaptiveGraphViewProps {
  onSelectTopic?: (topicId: number) => void;
}

export function AdaptiveGraphView({ onSelectTopic }: AdaptiveGraphViewProps) {
  const [graph, setGraph] = useState<TopicPrerequisiteNode[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<number>(1);
  const [simulatedScore, setSimulatedScore] = useState<number>(45);
  const [recommendation, setRecommendation] = useState<AdaptiveRecommendation | null>(null);

  useEffect(() => {
    fetch("/api/adaptive/graph")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGraph(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedTopicId) {
      fetch(`/api/adaptive/recommendations/l1/${selectedTopicId}?score=${simulatedScore / 100}`)
        .then((r) => r.json())
        .then((rec) => setRecommendation(rec))
        .catch(() => {});
    }
  }, [selectedTopicId, simulatedScore]);

  const selectedNode = graph.find((n) => n.topicId === selectedTopicId);
  const mathNodes = graph.filter((n) => n.subject === "Math");
  const scienceNodes = graph.filter((n) => n.subject === "Science");

  return (
    <div className="adaptive-graph-container">
      {/* Header */}
      <div className="adaptive-header-banner">
        <div>
          <span className="badge-pill">Phase 8 • Knowledge Graph</span>
          <h2>Adaptive Prerequisite Learning Graph</h2>
          <p>
            Secondary school mastery is cumulative. PeerLearn connects Form 1 foundational
            skills with Form 4 KCSE concepts. When a student struggles, the system detects missing
            prerequisites and recommends targeted peer remediation.
          </p>
        </div>
      </div>

      {/* Main Grid: Interactive Graph Tracks + Recommendation Simulator */}
      <div className="adaptive-grid">
        {/* Visual Graph Tracks */}
        <div className="graph-tracks-column">
          {/* Math Track */}
          <div className="subject-track-card">
            <div className="track-header">
              <span className="track-icon">📐</span>
              <h4>Mathematics Prerequisite Sequence (Forms 1–4)</h4>
            </div>

            <div className="nodes-flow">
              {mathNodes.map((node, i) => {
                const isSelected = selectedTopicId === node.topicId;
                return (
                  <div key={node.topicId} className="node-wrapper">
                    <div
                      className={`topic-node-card ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedTopicId(node.topicId)}
                    >
                      <span className="form-tag">Form {node.grade}</span>
                      <strong>{node.topicName}</strong>
                      <small>Topic #{node.topicId}</small>
                    </div>
                    {i < mathNodes.length - 1 && (
                      <div className="node-connector">
                        <span>→</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Science Track */}
          <div className="subject-track-card">
            <div className="track-header">
              <span className="track-icon">🧪</span>
              <h4>Science Prerequisite Sequence (Forms 1–4)</h4>
            </div>

            <div className="nodes-flow">
              {scienceNodes.map((node, i) => {
                const isSelected = selectedTopicId === node.topicId;
                return (
                  <div key={node.topicId} className="node-wrapper">
                    <div
                      className={`topic-node-card ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedTopicId(node.topicId)}
                    >
                      <span className="form-tag">Form {node.grade}</span>
                      <strong>{node.topicName}</strong>
                      <small>Topic #{node.topicId}</small>
                    </div>
                    {i < scienceNodes.length - 1 && (
                      <div className="node-connector">
                        <span>→</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Adaptive Recommendation & Diagnostic Simulator */}
        <div className="recommendation-column">
          <div className="rec-card">
            <h3>Adaptive Engine Inspector</h3>
            <p className="rec-desc">
              Test how the recommendation engine routes a student based on their diagnostic or post-quiz score.
            </p>

            {selectedNode && (
              <div className="current-node-summary">
                <span className="label">Inspecting Topic:</span>
                <strong>{selectedNode.topicName} (Form {selectedNode.grade})</strong>
              </div>
            )}

            {/* Score Slider */}
            <div className="score-simulator-slider">
              <div className="slider-label-row">
                <span>Simulated Quiz Score:</span>
                <strong className={simulatedScore >= 80 ? "high" : simulatedScore >= 50 ? "mid" : "low"}>
                  {simulatedScore}%
                </strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={simulatedScore}
                onChange={(e) => setSimulatedScore(Number(e.target.value))}
                className="score-range-input"
              />
              <div className="slider-thresholds">
                <span className="th low">0-49%: Remediation</span>
                <span className="th mid">50-79%: Reinforce</span>
                <span className="th high">80-100%: Unlock</span>
              </div>
            </div>

            {/* Adaptive Recommendation Output Card */}
            {recommendation && (
              <div className={`recommendation-result-box ${recommendation.type}`}>
                <div className="rec-type-badge">
                  {recommendation.type === "remediation_prerequisite" && "⚠️ Prerequisite Remediation"}
                  {recommendation.type === "reinforce_current" && "🔁 Practice Reinforcement"}
                  {recommendation.type === "progression_advance" && "🚀 Advanced Progression Unlocked"}
                </div>
                <h4>{recommendation.recommendedTopicName}</h4>
                <p>{recommendation.reason}</p>

                <div className="rec-action-row">
                  <button
                    className="action-pill-btn primary"
                    onClick={() => {
                      if (onSelectTopic) onSelectTopic(recommendation.recommendedTopicId);
                    }}
                  >
                    Match Tutor for This Topic
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
