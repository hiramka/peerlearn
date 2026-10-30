import React, { useState, useEffect } from "react";
import type { SessionResult } from "../../../shared/types";
import {
  getOutboxItems,
  exportOutboxBackupJSON,
  purgeCorruptedOutbox,
  getNetworkDiagnostics,
  syncOutbox,
} from "../db";

interface NetworkDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const NetworkDiagnosticsModal: React.FC<NetworkDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [diagnostics, setDiagnostics] = useState<{
    online: boolean;
    latencyMs: number;
    swActive: boolean;
    pendingOutbox: number;
    pendingEvents: number;
  } | null>(null);
  const [outboxItems, setOutboxItems] = useState<SessionResult[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const refreshData = async () => {
    const diag = await getNetworkDiagnostics();
    setDiagnostics(diag);
    const items = await getOutboxItems();
    setOutboxItems(items);
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReplay = async () => {
    setIsReplaying(true);
    setStatusMessage("Replaying outbox to server...");
    try {
      const res = await syncOutbox();
      setStatusMessage(`Replay complete: Synced ${res.syncedCount} sessions. Remaining: ${res.remainingCount}`);
      await refreshData();
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      setStatusMessage("Replay failed. Check network connection.");
    } finally {
      setIsReplaying(false);
    }
  };

  const handleDownloadBackup = async () => {
    const jsonStr = await exportOutboxBackupJSON();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peerlearn-outbox-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage("Outbox backup exported successfully as JSON.");
  };

  const handlePurgeCorrupted = async () => {
    const count = await purgeCorruptedOutbox();
    setStatusMessage(`Purged ${count} corrupted session item(s).`);
    await refreshData();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          color: "#0f172a",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f8fafc",
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold", color: "#1e293b" }}>
              🩺 Field Network Diagnostics & Outbox Inspector (Phase 13)
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              Offline sync resilience, telemetry queue inspector, and emergency JSON backup
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px" }}>
          {statusMessage && (
            <div
              style={{
                padding: "10px 14px",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1e40af",
                borderRadius: "6px",
                fontSize: "0.85rem",
                marginBottom: "16px",
              }}
            >
              ℹ️ {statusMessage}
            </div>
          )}

          {/* Metric Tiles */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            {/* Connectivity */}
            <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>CONNECTIVITY</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: diagnostics?.online ? "#16a34a" : "#dc2626",
                  }}
                />
                <strong style={{ fontSize: "1rem" }}>{diagnostics?.online ? "Online" : "Offline"}</strong>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                {diagnostics?.latencyMs && diagnostics.latencyMs >= 0 ? `RTT: ${diagnostics.latencyMs} ms` : "No network"}
              </div>
            </div>

            {/* Service Worker */}
            <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>PWA WORKBOX SW</div>
              <div style={{ marginTop: "4px" }}>
                <strong style={{ fontSize: "1rem", color: diagnostics?.swActive ? "#16a34a" : "#d97706" }}>
                  {diagnostics?.swActive ? "✓ Active (sw.js)" : "Standby"}
                </strong>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Zero-data cache ready</div>
            </div>

            {/* Outbox Count */}
            <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>OUTBOX SESSIONS</div>
              <div style={{ marginTop: "4px" }}>
                <strong style={{ fontSize: "1.2rem", color: (diagnostics?.pendingOutbox || 0) > 0 ? "#2563eb" : "#16a34a" }}>
                  {diagnostics?.pendingOutbox ?? 0}
                </strong>
                <span style={{ fontSize: "0.8rem", color: "#64748b", marginLeft: "4px" }}>queued</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Idempotent sync queue</div>
            </div>

            {/* Event Telemetry Queue */}
            <div style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>TELEMETRY EVENTS</div>
              <div style={{ marginTop: "4px" }}>
                <strong style={{ fontSize: "1.2rem", color: "#475569" }}>{diagnostics?.pendingEvents ?? 0}</strong>
                <span style={{ fontSize: "0.8rem", color: "#64748b", marginLeft: "4px" }}>events</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>SSE stream backlog</div>
            </div>
          </div>

          {/* Outbox Items List */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
                Local IndexedDB Outbox Queue ({outboxItems.length} items)
              </h3>
              <button
                onClick={refreshData}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.75rem",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  backgroundColor: "#f8fafc",
                  cursor: "pointer",
                }}
              >
                ↻ Refresh
              </button>
            </div>

            {outboxItems.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "0.85rem",
                }}
              >
                ✓ Outbox is completely clear. All local peer sessions have been synchronized with the cloud ledger.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: "180px",
                  overflowY: "auto",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}>
                      <th style={{ padding: "8px" }}>Client ID (Idempotency Key)</th>
                      <th style={{ padding: "8px" }}>Topic</th>
                      <th style={{ padding: "8px" }}>Learner</th>
                      <th style={{ padding: "8px" }}>Gain</th>
                      <th style={{ padding: "8px" }}>Recorded At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outboxItems.map((item) => (
                      <tr key={item.client_id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{item.client_id}</td>
                        <td style={{ padding: "6px 8px" }}>Topic #{item.topicId}</td>
                        <td style={{ padding: "6px 8px" }}>{item.learnerId}</td>
                        <td style={{ padding: "6px 8px", color: "#16a34a", fontWeight: "bold" }}>
                          +{Math.round((item.post - item.pre) * 100)}%
                        </td>
                        <td style={{ padding: "6px 8px", color: "#64748b" }}>{new Date(item.at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleDownloadBackup}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                💾 Export JSON Backup
              </button>
              <button
                onClick={handlePurgeCorrupted}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #fecaca",
                  backgroundColor: "#fff1f2",
                  color: "#b91c1c",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                🧹 Purge Corrupted
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={onClose}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                onClick={handleReplay}
                disabled={isReplaying || !diagnostics?.online}
                style={{
                  padding: "8px 18px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: diagnostics?.online ? "#0284c7" : "#94a3b8",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: isReplaying || !diagnostics?.online ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isReplaying ? "Syncing..." : "🔄 Force Replay Outbox Now"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
