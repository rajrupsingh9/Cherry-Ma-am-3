import React, { useState, useEffect } from "react";
import { 
  Megaphone, 
  Send, 
  Trash2, 
  AlertTriangle, 
  Radio, 
  Sparkles, 
  Clock,
  CheckCircle2,
  Flame,
  Info,
  Layers,
  XCircle
} from "lucide-react";
import { 
  publishSystemNotice, 
  unpublishSystemNotice, 
  subscribeToActiveNotice 
} from "../services/noticeService";
import { SystemNotice, NoticePriority } from "../types";

interface AdminNoticeManagerProps {
  adminEmail?: string;
}

export const AdminNoticeManager: React.FC<AdminNoticeManagerProps> = ({ 
  adminEmail = "onlinework0876@gmail.com" 
}) => {
  const [activeNotice, setActiveNotice] = useState<SystemNotice | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<NoticePriority>("info");
  const [actionText, setActionText] = useState("");
  const [actionLink, setActionLink] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(true);

  // Subscribe to live active notice from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToActiveNotice((notice) => {
      setActiveNotice(notice);
      if (notice && notice.isActive) {
        setTitle(notice.title);
        setMessage(notice.message);
        setPriority(notice.priority);
        setActionText(notice.actionText || "");
        setActionLink(notice.actionLink || "");
      }
    });
    return () => unsubscribe();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsPublishing(true);
    setActionStatus(null);
    try {
      await publishSystemNotice({
        title: title.trim() || "Announcement",
        message: message.trim(),
        priority,
        actionText: actionText.trim() || undefined,
        actionLink: actionLink.trim() || undefined,
        publishedBy: adminEmail,
      });
      setActionStatus("Notice broadcasted successfully to all students!");
      setTimeout(() => setActionStatus(null), 3500);
    } catch (err) {
      console.error("Failed to broadcast notice", err);
      setActionStatus("Failed to broadcast notice. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setIsUnpublishing(true);
    setActionStatus(null);
    try {
      await unpublishSystemNotice();
      setActiveNotice(null);
      setTitle("");
      setMessage("");
      setActionText("");
      setActionLink("");
      setActionStatus("Notice unpublished successfully. Student screen cleared!");
      setTimeout(() => setActionStatus(null), 3500);
    } catch (err) {
      console.error("Failed to unpublish notice", err);
      setActionStatus("Failed to unpublish notice.");
    } finally {
      setIsUnpublishing(false);
    }
  };

  const applyPreset = (presetTitle: string, presetMsg: string, presetPrio: NoticePriority) => {
    setTitle(presetTitle);
    setMessage(presetMsg);
    setPriority(presetPrio);
  };

  return (
    <div 
      id="admin-notice-broadcast-section"
      className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-indigo-100 shadow-sm relative overflow-hidden transition-all"
    >
      {/* Top Banner Header with Status Pulse */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#796AEF] to-indigo-700 text-white flex items-center justify-center shadow-sm shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                📢 Broadcast Notice Board
              </h3>
              {activeNotice?.isActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE NOW
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                  Offline
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Instant real-time announcement ticker for all student dashboards
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFormOpen((prev) => !prev)}
          className="text-xs font-semibold text-[#796AEF] hover:text-indigo-800 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
        >
          {isFormOpen ? "Hide Form" : "Open Form"}
        </button>
      </div>

      {/* Main Broadcast Notice Form */}
      {isFormOpen && (
        <form onSubmit={handlePublish} className="mt-3.5 space-y-3.5">
          {/* 1-Tap Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#796AEF]" />
                1-Tap Quick Announcement Presets
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset("🔴 Live Doubt Class Starting", "Socratic interactive doubt clearing session is starting in 10 minutes. Join now with your questions!", "urgent")}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                🔴 Live Class Alert
              </button>
              <button
                type="button"
                onClick={() => applyPreset("🏆 JEE / NEET PYQ Battle Tonight", "Join today's Physics & Math speed sprint arena at 8:00 PM. Top ranks win extra streak points!", "warning")}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                🏆 Battle Arena Alert
              </button>
              <button
                type="button"
                onClick={() => applyPreset("✨ New Practice Sets Added", "Fresh 2024-2025 past year question blueprints are now unlocked in your Syllabus Desk.", "info")}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-[#796AEF] hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                ✨ Curriculum Update
              </button>
            </div>
          </div>

          {/* Title & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Headline / Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Live Physics Doubt Class in 15 Mins"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#796AEF]/30 focus:border-[#796AEF] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alert Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as NoticePriority)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#796AEF]/30 focus:border-[#796AEF] transition-all"
              >
                <option value="info">🔵 Info (Violet Brand)</option>
                <option value="warning">🟡 Warning (Amber Alert)</option>
                <option value="urgent">🔴 Urgent (Rose Flame)</option>
              </select>
            </div>
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notice Description / Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type announcement message here... (e.g., Keep your formula sheets ready for the upcoming electrostatics sprint!)"
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#796AEF]/30 focus:border-[#796AEF] transition-all resize-none"
            />
          </div>

          {/* ACTION BUTTON BAR - HIGH VISIBILITY */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="submit"
              id="admin-broadcast-notice-btn"
              disabled={isPublishing || !message.trim()}
              className={`flex-1 min-h-[48px] flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl text-sm font-extrabold text-white shadow-md transition-all duration-200 active:scale-[0.99] ${
                isPublishing || !message.trim()
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed opacity-75 shadow-none"
                  : "bg-gradient-to-r from-[#796AEF] via-indigo-600 to-indigo-700 hover:from-[#6858e0] hover:to-indigo-800 shadow-indigo-300/50 hover:shadow-lg cursor-pointer ring-2 ring-[#796AEF]/30"
              }`}
            >
              {isPublishing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Publishing Live Notice...</span>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                    <Send className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[14px] tracking-wide">
                    {activeNotice?.isActive ? "📢 Update & Broadcast Notice" : "📢 Broadcast Notice"}
                  </span>
                  {!activeNotice?.isActive && (
                    <span className="ml-1.5 text-[10px] uppercase font-black bg-white/25 px-2 py-0.5 rounded-full tracking-wider">
                      Publish Live
                    </span>
                  )}
                </>
              )}
            </button>

            {activeNotice?.isActive && (
              <button
                id="admin-unpublish-notice-btn"
                type="button"
                onClick={handleUnpublish}
                disabled={isUnpublishing}
                className="flex items-center justify-center gap-2 min-h-[48px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all active:scale-[0.99] cursor-pointer"
                title="Remove notice from student screen"
              >
                {isUnpublishing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                    <span>Unpublishing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Unpublish Notice</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Action Status Toast */}
          {actionStatus && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionStatus}</span>
            </div>
          )}
        </form>
      )}

      {/* Live Preview of Active Notice */}
      {activeNotice?.isActive && (
        <div className="mt-3.5 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Live Preview (Visible on Student Dashboard)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                {activeNotice.updatedAt ? new Date(activeNotice.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
              </span>
              <button
                type="button"
                onClick={handleUnpublish}
                disabled={isUnpublishing}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Unpublish immediately"
              >
                <Trash2 className="w-3 h-3" />
                <span>{isUnpublishing ? "Unpublishing..." : "Unpublish"}</span>
              </button>
            </div>
          </div>

          <div className={`p-3 rounded-xl border text-xs sm:text-[13px] ${
            activeNotice.priority === "urgent"
              ? "bg-rose-50/80 border-rose-200 text-rose-900"
              : activeNotice.priority === "warning"
              ? "bg-amber-50/80 border-amber-200 text-amber-900"
              : "bg-indigo-50/80 border-indigo-200 text-indigo-900"
          }`}>
            <div className="flex items-start gap-2.5">
              {activeNotice.priority === "urgent" ? (
                <Flame className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : activeNotice.priority === "warning" ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <Megaphone className="w-4 h-4 text-[#796AEF] shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <span className="font-extrabold mr-1.5">{activeNotice.title}:</span>
                <span className="opacity-90">{activeNotice.message}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
