import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Volume2, ShieldCheck, Sparkles, X, ArrowRight } from "lucide-react";

interface PostLoginMicPromptModalProps {
  isOpen: boolean;
  studentName?: string;
  onAllow: () => Promise<void> | void;
  onDismiss: () => void;
}

export const PostLoginMicPromptModal: React.FC<PostLoginMicPromptModalProps> = ({
  isOpen,
  studentName,
  onAllow,
  onDismiss,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  if (!isOpen) return null;

  const handleAllowClick = async () => {
    setIsRequesting(true);
    try {
      await onAllow();
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        {/* Animated Bottom Sheet on Mobile / Centered Card on Desktop */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col relative"
        >
          {/* Header Visual Bar with Brand Purple Gradient */}
          <div className="bg-gradient-to-r from-[#796AEF] via-indigo-600 to-[#6252E0] p-6 pb-7 text-white relative overflow-hidden">
            {/* Ambient Background Circles */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/10 blur-lg pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Icon Stage */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
                  <Mic className="w-7 h-7 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-indigo-100 text-[11px] font-bold mb-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Interactive Voice Classroom</span>
                </div>
                <h3 className="text-xl font-black tracking-tight text-white">
                  Enable Voice Tutor
                </h3>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 bg-slate-50/50">
            <div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {studentName ? `Namaste ${studentName}! ` : "Namaste! "}
                Cherry Ma'am ke sath 1-on-1 real-time voice me padhne aur doubts bolkar poochne ke liye microphone access enable karein.
              </p>
            </div>

            {/* 3 Value Features */}
            <div className="space-y-2.5 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-[#796AEF] flex items-center justify-center shrink-0 mt-0.5">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Direct Voice Doubts</h4>
                  <p className="text-[11.5px] text-slate-500">Lamba type karne ki zarurat nahi, mic se bolkar sawal poochein.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-[#796AEF] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Hinglish & Multilingual</h4>
                  <p className="text-[11.5px] text-slate-500">Hindi, Hinglish ya English me natural conversation karein.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">100% Secure & Private</h4>
                  <p className="text-[11.5px] text-slate-500">Microphone sirf tabhi active hota hai jab class chal rahi ho.</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleAllowClick}
                disabled={isRequesting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#796AEF] hover:bg-[#6857ea] active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75"
              >
                {isRequesting ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Requesting Permission...</span>
                  </div>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Allow Microphone Access</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              <button
                onClick={onDismiss}
                disabled={isRequesting}
                className="w-full py-2.5 px-4 rounded-2xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 font-medium text-xs transition-colors cursor-pointer text-center"
              >
                Abhi Nahi (Type Only Mode)
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
