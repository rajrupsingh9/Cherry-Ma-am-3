import React, { useState } from "react";
import { 
  Megaphone, 
  Flame, 
  AlertTriangle, 
  X, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Radio
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

  // Palette adhering strictly to AGENTS.md brand design system
  const theme = isUrgent
    ? {
        container: "bg-rose-50/95 border-rose-200 shadow-sm text-rose-950",
        badge: "bg-rose-600 text-white",
        badgeText: "CRITICAL ALERT",
        iconBg: "bg-rose-100 text-rose-600",
        title: "text-rose-950",
        message: "text-rose-900/90",
        actionBtn: "bg-rose-600 hover:bg-rose-700 text-white",
        indicator: "bg-rose-500",
      }
    : isWarning
    ? {
        container: "bg-amber-50/95 border-amber-200/90 shadow-sm text-amber-950",
        badge: "bg-amber-500 text-slate-900 font-black",
        badgeText: "ANNOUNCEMENT",
        iconBg: "bg-amber-100 text-amber-800",
        title: "text-amber-950",
        message: "text-amber-900/90",
        actionBtn: "bg-amber-600 hover:bg-amber-700 text-white",
        indicator: "bg-amber-500",
      }
    : {
        container: "bg-indigo-50/95 border-indigo-200/80 shadow-sm text-indigo-950",
        badge: "bg-[#796AEF] text-white",
        badgeText: "NOTICE",
        iconBg: "bg-indigo-100 text-[#796AEF]",
        title: "text-slate-900",
        message: "text-slate-700",
        actionBtn: "bg-[#796AEF] hover:bg-[#6858e0] text-white",
        indicator: "bg-[#796AEF]",
      };

  return (
    <div 
      id="student-live-notice-banner"
      className={`w-full shrink-0 relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 transition-all duration-300 ${theme.container} ${
        isDismissing ? "opacity-0 -translate-y-2 scale-98" : "opacity-100 translate-y-0 scale-100"
      }`}
    >
      {/* Decorative pulse glow dot in the corner */}
      <div className="absolute top-2.5 right-11 flex items-center gap-1 opacity-75">
        <span className={`w-2 h-2 rounded-full ${theme.indicator} animate-ping`} />
      </div>

      <div className="flex items-start gap-3">
        {/* Left Icon Pill */}
        <div className={`w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center shrink-0 shadow-2xs mt-0.5`}>
          {isUrgent ? (
            <Flame className="w-4.5 h-4.5 animate-bounce" />
          ) : isWarning ? (
            <AlertTriangle className="w-4.5 h-4.5" />
          ) : (
            <Radio className="w-4.5 h-4.5 animate-pulse" />
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 pr-6">
          {/* Badge & Title Row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[9.5px] tracking-wider uppercase px-2 py-0.5 rounded-full font-extrabold ${theme.badge}`}>
              {theme.badgeText}
            </span>
            <h4 className={`text-xs sm:text-sm font-extrabold tracking-tight ${theme.title}`}>
              {activeNotice.title}
            </h4>
          </div>

          {/* Body Message */}
          <p className={`text-xs sm:text-[13px] leading-relaxed font-medium ${theme.message} ${
            isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
          }`}>
            {activeNotice.message}
          </p>

          {/* Action Row */}
          <div className="flex items-center gap-3 mt-2 pt-0.5">
            {activeNotice.message.length > 95 && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="text-[11px] font-bold text-[#796AEF] hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{isExpanded ? "Show Less" : "Read More"}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            {activeNotice.actionLink && activeNotice.actionText && (
              <a
                href={activeNotice.actionLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition-all ${theme.actionBtn}`}
              >
                <span>{activeNotice.actionText}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Right Dismiss (✕) Button */}
        <button
          type="button"
          id="dismiss-student-notice-btn"
          onClick={handleDismiss}
          aria-label="Dismiss notice"
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-xl bg-black/5 hover:bg-black/10 active:scale-90 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
          title="Dismiss Announcement"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
