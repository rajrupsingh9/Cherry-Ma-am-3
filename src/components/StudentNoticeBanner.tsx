import React, { useState } from "react";
import { 
  Flame, 
  AlertTriangle, 
  Radio, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Sparkles
} from "lucide-react";
import { useSystemNotice } from "../hooks/useSystemNotice";

export const StudentNoticeBanner: React.FC = () => {
  const { activeNotice, isDismissed, dismiss } = useSystemNotice();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // If no active notice or student dismissed it, strictly render nothing (0px blank space)
  if (!activeNotice || !activeNotice.isActive || isDismissed) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissing(true);
    setTimeout(() => {
      dismiss();
      setIsDismissing(false);
    }, 200);
  };

  const isUrgent = activeNotice.priority === "urgent";
  const isWarning = activeNotice.priority === "warning";

  // Clean, high-contrast modern styling adhering strictly to AGENTS.md Brand Guidelines
  // (White/Slate surface, refined borders, precision accent tags, no heavy gradients)
  const meta = isUrgent
    ? {
        border: "border-rose-200/90 hover:border-rose-300",
        accentPill: "bg-rose-50 text-rose-700 border-rose-200/80",
        dotBg: "bg-rose-500",
        pulseBg: "bg-rose-400",
        tagText: "Urgent",
        icon: <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse" />,
        actionBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20",
      }
    : isWarning
    ? {
        border: "border-amber-200/90 hover:border-amber-300",
        accentPill: "bg-amber-50 text-amber-800 border-amber-200/80",
        dotBg: "bg-amber-500",
        pulseBg: "bg-amber-400",
        tagText: "Important",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        actionBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
      }
    : {
        border: "border-indigo-100 hover:border-indigo-200",
        accentPill: "bg-indigo-50 text-[#796AEF] border-indigo-100/90",
        dotBg: "bg-[#796AEF]",
        pulseBg: "bg-indigo-400",
        tagText: "Live Notice",
        icon: <Radio className="w-3.5 h-3.5 text-[#796AEF] animate-pulse" />,
        actionBtn: "bg-[#796AEF] hover:bg-indigo-700 text-white shadow-indigo-600/20",
      };

  const isLongMessage = activeNotice.message && activeNotice.message.length > 80;

  return (
    <div 
      id="student-live-notice-banner"
      className={`w-full shrink-0 relative rounded-2xl bg-white border shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] transition-all duration-300 overflow-hidden ${meta.border} ${
        isDismissing ? "opacity-0 -translate-y-2 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
      }`}
    >
      {/* Top micro status bar highlight */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#796AEF]/30 to-transparent" />

      <div className="p-3 sm:p-3.5">
        {/* Header Row: Live Tag, Title, and Action/Dismiss controls */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Live Indicator Capsule */}
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border shrink-0 ${meta.accentPill}`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${meta.pulseBg}`} />
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${meta.dotBg}`} />
              </span>
              <span className="uppercase tracking-wider">{meta.tagText}</span>
            </span>

            {/* Notice Title */}
            <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 truncate tracking-tight">
              {activeNotice.title}
            </h4>
          </div>

          {/* Right Controls: Expand/Collapse & Minimalist Close Button */}
          <div className="flex items-center gap-1 shrink-0">
            {isLongMessage && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                aria-label={isExpanded ? "Collapse notice" : "Expand notice"}
                className="h-6 px-2 rounded-full text-[10.5px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 active:scale-95 transition-all flex items-center gap-0.5 cursor-pointer"
              >
                <span>{isExpanded ? "Less" : "More"}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            <button
              type="button"
              id="dismiss-student-notice-btn"
              onClick={handleDismiss}
              aria-label="Dismiss notice"
              className="w-6 h-6 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 flex items-center justify-center transition-all cursor-pointer"
              title="Dismiss announcement"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Message Body */}
        <div className="mt-1.5 pl-0.5">
          <p className={`text-xs sm:text-[12.5px] leading-relaxed text-slate-600 font-normal transition-all ${
            isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
          }`}>
            {activeNotice.message}
          </p>
        </div>

        {/* Bottom CTA Row (if action link exists) */}
        {activeNotice.actionLink && activeNotice.actionText && (
          <div className="mt-2.5 pt-2 border-t border-slate-100/90 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 truncate">
              <Sparkles className="w-3 h-3 text-[#796AEF] shrink-0" />
              <span>Official action link</span>
            </span>

            <a
              href={activeNotice.actionLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer ${meta.actionBtn}`}
            >
              <span>{activeNotice.actionText}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
