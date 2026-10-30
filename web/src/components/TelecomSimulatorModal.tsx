import { useState, useEffect } from "react";
import type { USSDResponse, SMSMessageLog } from "../../../shared/types";

interface TelecomSimulatorModalProps {
  onClose: () => void;
}

export function TelecomSimulatorModal({ onClose }: TelecomSimulatorModalProps) {
  const [activeTab, setActiveTab] = useState<"ussd" | "sms">("ussd");

  // USSD state
  const [phoneNumber, setPhoneNumber] = useState("+254712345678");
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState(`ussd-sess-${Date.now()}`);
  const [currentText, setCurrentText] = useState("");
  const [inputVal, setInputVal] = useState("");
  const [screenMessage, setScreenMessage] = useState(
    "PeerLearn Telco Gateway (Africa's Talking)\nDial *384*500# to launch USSD service for feature phones."
  );
  const [loading, setLoading] = useState(false);

  // SMS state
  const [smsLogs, setSmsLogs] = useState<SMSMessageLog[]>([]);
  const [smsTo, setSmsTo] = useState("+254700987654");
  const [smsText, setSmsText] = useState(
    "PeerLearn Reminder: Your Math peer session with Wanjiru is scheduled today at 16:00 in Room 3B."
  );
  const [smsStatus, setSmsStatus] = useState("");

  useEffect(() => {
    loadSmsLogs();
  }, []);

  async function loadSmsLogs() {
    try {
      const res = await fetch("/api/sms/logs");
      if (res.ok) {
        const logs = await res.json();
        setSmsLogs(logs);
      }
    } catch {}
  }

  async function dialUSSD(textToSend: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/ussd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          serviceCode: "*384*500#",
          phoneNumber,
          text: textToSend,
        }),
      });
      const data: USSDResponse = await res.json();
      setScreenMessage(data.message);
      setSessionActive(data.continueSession);
      if (!data.continueSession) {
        // Reset session state for next call
        setCurrentText("");
        setInputVal("");
        setSessionId(`ussd-sess-${Date.now()}`);
      } else {
        setCurrentText(textToSend);
        setInputVal("");
      }
    } catch {
      setScreenMessage("END Network connection error. Please try again.");
      setSessionActive(false);
    } finally {
      setLoading(false);
    }
  }

  function handleDialStart() {
    dialUSSD("");
  }

  function handleSendInput() {
    if (!inputVal.trim()) return;
    const newText = currentText ? `${currentText}*${inputVal.trim()}` : inputVal.trim();
    dialUSSD(newText);
  }

  async function handleSendSMS(e: React.FormEvent) {
    e.preventDefault();
    if (!smsTo.trim() || !smsText.trim()) return;
    setSmsStatus("Sending SMS via Africa's Talking gateway...");
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: smsTo, message: smsText }),
      });
      const data = await res.json();
      if (data.ok) {
        setSmsStatus(`✓ SMS successfully dispatched to ${smsTo}! (Delivered)`);
        loadSmsLogs();
      }
    } catch {
      setSmsStatus("Failed to send SMS.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="telecom-modal-card">
        {/* Modal Header */}
        <div className="telecom-modal-header">
          <div>
            <span className="badge-pill">Africa's Talking Telecom Integration</span>
            <h3>SMS & USSD Mobile Connectivity</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="telecom-tab-switcher">
          <button
            className={`tab-btn ${activeTab === "ussd" ? "active" : ""}`}
            onClick={() => setActiveTab("ussd")}
          >
            📟 Interactive USSD Feature Phone (*384#)
          </button>
          <button
            className={`tab-btn ${activeTab === "sms" ? "active" : ""}`}
            onClick={() => setActiveTab("sms")}
          >
            💬 Automated SMS Gateway & Logs
          </button>
        </div>

        {/* USSD Simulator View */}
        {activeTab === "ussd" && (
          <div className="ussd-simulator-body">
            <div className="phone-device-chassis">
              {/* Phone Speaker & Screen */}
              <div className="phone-speaker" />
              <div className="phone-lcd-screen">
                <div className="lcd-header">
                  <span>Safaricom 4G / 2G</span>
                  <span>*384*500#</span>
                </div>
                <pre className="lcd-content">{screenMessage}</pre>
                {loading && <div className="lcd-spinner">Connecting to telco...</div>}
              </div>

              {/* Input for USSD Reply */}
              {sessionActive && (
                <div className="ussd-input-row">
                  <input
                    type="text"
                    placeholder="Enter menu number..."
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendInput();
                    }}
                    autoFocus
                  />
                  <button className="ussd-send-btn" onClick={handleSendInput}>
                    Send
                  </button>
                </div>
              )}

              {/* Physical Keypad */}
              <div className="phone-keypad-grid">
                {!sessionActive ? (
                  <button className="keypad-call-btn" onClick={handleDialStart}>
                    📞 Dial *384*500#
                  </button>
                ) : (
                  <>
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((key) => (
                      <button
                        key={key}
                        className="keypad-digit-btn"
                        onClick={() => setInputVal((prev) => prev + key)}
                      >
                        {key}
                      </button>
                    ))}
                    <button
                      className="keypad-action-btn cancel"
                      onClick={() => {
                        setSessionActive(false);
                        setScreenMessage("Session terminated by user.");
                      }}
                    >
                      End Call
                    </button>
                    <button
                      className="keypad-action-btn clear"
                      onClick={() => setInputVal((prev) => prev.slice(0, -1))}
                    >
                      ⌫
                    </button>
                    <button className="keypad-action-btn send" onClick={handleSendInput}>
                      OK
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Explanatory Panel */}
            <div className="ussd-explanation-panel">
              <h4>Why USSD Matters in Kenya</h4>
              <p>
                In rural and low-income counties (e.g. Turkana, Kilifi, Garissa), many parents
                and secondary students use basic 2G feature phones (Kabambe) with zero internet
                connectivity.
              </p>
              <div className="protocol-checklist">
                <div className="check-item">
                  <strong>✓ CON Protocol:</strong> Keeps telco session active for multi-step menus.
                </div>
                <div className="check-item">
                  <strong>✓ END Protocol:</strong> Terminates session without incurring telco airtime drain.
                </div>
                <div className="check-item">
                  <strong>✓ Kiswahili Default:</strong> Accessible in clear vernacular language.
                </div>
              </div>

              <div className="quick-test-actions">
                <span className="label">Quick Simulator Commands:</span>
                <button
                  className="quick-link-btn"
                  onClick={() => {
                    handleDialStart();
                    setTimeout(() => dialUSSD("1"), 400);
                  }}
                >
                  Check Today's Schedule (1)
                </button>
                <button
                  className="quick-link-btn"
                  onClick={() => {
                    handleDialStart();
                    setTimeout(() => dialUSSD("2"), 400);
                  }}
                >
                  View Learning Gain (2)
                </button>
                <button
                  className="quick-link-btn"
                  onClick={() => {
                    handleDialStart();
                    setTimeout(() => dialUSSD("4"), 400);
                  }}
                >
                  PIN Security Help (4)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SMS Gateway View */}
        {activeTab === "sms" && (
          <div className="sms-gateway-body">
            <div className="sms-compose-column">
              <h4>Dispatch Outbound SMS</h4>
              <form onSubmit={handleSendSMS} className="sms-form">
                <div className="form-group">
                  <label>Recipient Phone Number (Kenyan Format):</label>
                  <input
                    type="text"
                    value={smsTo}
                    onChange={(e) => setSmsTo(e.target.value)}
                    placeholder="+2547XXXXXXXX"
                  />
                </div>

                <div className="form-group">
                  <label>SMS Message Body (Max 160 chars):</label>
                  <textarea
                    rows={4}
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    maxLength={160}
                  />
                  <small>{160 - smsText.length} characters left</small>
                </div>

                <button type="submit" className="action-pill-btn primary">
                  📤 Send via Africa's Talking API
                </button>
              </form>

              {smsStatus && <div className="alert-banner info">{smsStatus}</div>}
            </div>

            <div className="sms-logs-column">
              <h4>Outbound SMS Audit Log</h4>
              <div className="sms-logs-stack">
                {smsLogs.map((log) => (
                  <div key={log.id} className="sms-log-card">
                    <div className="sms-log-header">
                      <span className="sms-to">{log.to}</span>
                      <span className="sms-status-pill">{log.status.toUpperCase()}</span>
                    </div>
                    <p className="sms-message">{log.message}</p>
                    <small className="sms-time">
                      {new Date(log.timestamp).toLocaleTimeString()} • ID: {log.id}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
