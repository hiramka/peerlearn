import React, { useState, useEffect } from "react";
import type { Topic } from "../../../shared/types";

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: Topic[];
  onSelectTopic: (topic: Topic) => void;
  onNavigate: (view: string) => void;
  onOpenTools: () => void;
  onOpenForum: () => void;
  onOpenNotices: () => void;
  onOpenGradebook: () => void;
  onOpenPastPapers: () => void;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  topics,
  onSelectTopic,
  onNavigate,
  onOpenTools,
  onOpenForum,
  onOpenNotices,
  onOpenGradebook,
  onOpenPastPapers,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Static quick actions
  const staticActions = [
    {
      id: "action-forum",
      title: "Subject Q&A & Peer Homework Forum",
      category: "Learning",
      icon: "💬",
      action: () => {
        onClose();
        onOpenForum();
      },
    },
    {
      id: "action-papers",
      title: "KNEC KCSE & CBC Past Paper Library",
      category: "Revision",
      icon: "📚",
      action: () => {
        onClose();
        onOpenPastPapers();
      },
    },
    {
      id: "action-notices",
      title: "School Notice Board & Academic Bulletin",
      category: "Announcements",
      icon: "📢",
      action: () => {
        onClose();
        onOpenNotices();
      },
    },
    {
      id: "action-gradebook",
      title: "Teacher CAT Gradebook & Tutoring Impact",
      category: "Assessment",
      icon: "📈",
      action: () => {
        onClose();
        onOpenGradebook();
      },
    },
    {
      id: "action-training",
      title: "Tutor Pedagogical Training Hub & Certification",
      category: "Tutors",
      icon: "🎓",
      action: () => {
        onClose();
        onNavigate("training");
      },
    },
    {
      id: "action-adaptive",
      title: "Adaptive Prerequisite Knowledge Graph",
      category: "Curriculum",
      icon: "🕸️",
      action: () => {
        onClose();
        onNavigate("adaptive");
      },
    },
    {
      id: "action-groups",
      title: "Small-Group Peer Tutoring Circles",
      category: "Tutoring",
      icon: "👥",
      action: () => {
        onClose();
        onNavigate("groups");
      },
    },
    {
      id: "action-tools",
      title: "Lab & Field Operations Hub (QR, USSD, Diagnostics, Consent)",
      category: "Utilities",
      icon: "🛠️",
      action: () => {
        onClose();
        onOpenTools();
      },
    },
  ];

  // Dynamic topic items
  const topicActions = topics.map((t) => ({
    id: `topic-${t.id}`,
    title: `${t.name} (Form ${t.grade} ${t.subject})`,
    category: "Curriculum Topic",
    icon: "📖",
    action: () => {
      onClose();
      onSelectTopic(t);
    },
  }));

  const allItems = [...staticActions, ...topicActions];

  const filteredItems = allItems.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, filteredItems, selectedIndex]);

  if (!isOpen) return null;


  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-800 flex items-center gap-3 bg-slate-950/50">
          <span className="text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            autoFocus
            placeholder="Search topics, past papers, forums, or tools... (Esc to close)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <kbd className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No matching topics, tools, or resources found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3.5 py-2.5 rounded-xl flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? "bg-emerald-600/20 text-white border border-emerald-500/30"
                      : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs font-semibold">{item.title}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Navigate with <strong>↑</strong> <strong>↓</strong> and press <strong>Enter</strong>
          </span>
          <span>PeerLearn Quick Launcher</span>
        </div>
      </div>
    </div>
  );
}
