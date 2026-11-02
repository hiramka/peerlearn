import React, { useEffect } from "react";

interface LabToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQR: () => void;
  onOpenUSSD: () => void;
  onOpenDiagnostics: () => void;
  onOpenConsentSlip: () => void;
  onOpenDonorReport: () => void;
  onOpenStorageClear: () => void;
  storageUsageFormatted?: string;
  pendingCount?: number;
  isOnline: boolean;
}

export function LabToolsDrawer({
  isOpen,
  onClose,
  onOpenQR,
  onOpenUSSD,
  onOpenDiagnostics,
  onOpenConsentSlip,
  onOpenDonorReport,
  onOpenStorageClear,
  storageUsageFormatted = "0 B",
  pendingCount = 0,
  isOnline,
}: LabToolsDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tools = [
    {
      id: "qr",
      title: "Zero-Data Offline QR Transfer",
      category: "Connectivity",
      icon: "📱",
      badge: "Zero Data",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      description: "Transfer completed peer tutoring session results and lesson packs across offline devices via animated QR code.",
      action: () => {
        onClose();
        onOpenQR();
      },
      buttonText: "Open QR Engine",
    },
    {
      id: "ussd",
      title: "Africa's Talking USSD & SMS",
      category: "Telecoms",
      icon: "📟",
      badge: "*384# Feature Phone",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      description: "Simulate USSD session request dialing and parent SMS notifications via Africa's Talking gateway.",
      action: () => {
        onClose();
        onOpenUSSD();
      },
      buttonText: "Launch Simulator",
    },
    {
      id: "diagnostics",
      title: "Field Diagnostics & Outbox Inspector",
      category: "Diagnostics",
      icon: "🩺",
      badge: pendingCount > 0 ? `${pendingCount} Queued` : isOnline ? "Synced" : "Offline",
      badgeColor: pendingCount > 0 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-slate-700 text-slate-300",
      description: "Inspect network ping latency, local IndexedDB outbox queue, and run manual synchronization or emergency JSON backup.",
      action: () => {
        onClose();
        onOpenDiagnostics();
      },
      buttonText: "Run Diagnostics",
    },
    {
      id: "consent",
      title: "Kenya DPA 2019 Parental Consent Slip",
      category: "Safeguarding",
      icon: "📋",
      badge: "Official Legal Form",
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      description: "Generate and print official Ministry of Education dual-track parental consent slips with serial numbers.",
      action: () => {
        onClose();
        onOpenConsentSlip();
      },
      buttonText: "View / Print Slips",
    },
    {
      id: "donor",
      title: "Cryptographic Donor Impact Audit",
      category: "Accountability",
      icon: "📊",
      badge: "SHA-256 Verified",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      description: "Tamper-proof verifiable audit certificate showing school learning gains, tutoring hours, and Cohen's d effect size.",
      action: () => {
        onClose();
        onOpenDonorReport();
      },
      buttonText: "Generate Audit",
    },
    {
      id: "storage",
      title: "Offline Storage & Cache Manager",
      category: "Appliance",
      icon: "🗑️",
      badge: storageUsageFormatted,
      badgeColor: "bg-slate-700 text-slate-300",
      description: "View local browser cache utilization, indexed lesson packs, and clear obsolete offline data.",
      action: () => {
        onClose();
        onOpenStorageClear();
      },
      buttonText: "Manage Storage",
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xl font-bold">
              🛠️
            </span>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Lab & Field Operations Hub
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                  {tools.length} Tools
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Specialized appliance utilities for zero-internet rural school labs and field administrators.
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

        {/* Tools Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="p-5 rounded-xl bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/30 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-2 rounded-lg bg-slate-900 border border-slate-800">
                      {tool.icon}
                    </span>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                        {tool.category}
                      </span>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {tool.title}
                      </h3>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border font-medium whitespace-nowrap ${tool.badgeColor}`}
                  >
                    {tool.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {tool.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-end">
                <button
                  onClick={tool.action}
                  className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
                >
                  {tool.buttonText} →
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-500">
          <span>PeerLearn Kenya • Appliance v1.1.0</span>
          <span>Press <strong>Esc</strong> to close</span>
        </div>
      </div>
    </div>
  );
}
