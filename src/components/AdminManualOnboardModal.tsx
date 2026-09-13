import React, { useState } from "react";
import {
  X,
  UserPlus,
  Phone,
  Mail,
  BookOpen,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileText,
} from "lucide-react";
import {
  SubscriptionPlan,
  getActiveSubscriptionPlans,
  provisionStudentDirectlyByAdmin,
} from "../utils/subscriptionStore";

interface AdminManualOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (studentName: string, planName: string) => void;
  adminEmail?: string;
  onToast?: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export const AdminManualOnboardModal: React.FC<AdminManualOnboardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  adminEmail,
  onToast,
}) => {
  const plans = getActiveSubscriptionPlans();

  // Form State
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [grade, setGrade] = useState("Class 10");
  const [board, setBoard] = useState("CBSE");
  const [customBoard, setCustomBoard] = useState("");
  const [subject, setSubject] = useState("Science");
  const [mediumOfLearning, setMediumOfLearning] = useState("Hinglish");
  const [customMedium, setCustomMedium] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    const popular = plans.find((p) => p.popular);
    return popular ? popular.id : plans[0]?.id || "semiannual_149";
  });
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const cleanName = studentName.trim();
    if (!cleanName || cleanName.length < 2) {
      setFormError("Please enter a valid student name (at least 2 characters).");
      return;
    }

    const cleanPhone = studentPhone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setFormError("Please enter a valid 10-digit mobile number for the student.");
      return;
    }

    if (studentEmail.trim() && !studentEmail.includes("@")) {
      setFormError("Please enter a valid email address or leave it empty.");
      return;
    }

    const finalBoard = board === "CUSTOM" ? (customBoard.trim() || "Other State Board") : board;
    const finalMedium = mediumOfLearning === "CUSTOM" ? (customMedium.trim() || "Hinglish") : mediumOfLearning;

    setIsSubmitting(true);
    try {
      const result = await provisionStudentDirectlyByAdmin({
        studentName: cleanName,
        studentPhone: cleanPhone,
        studentEmail: studentEmail.trim() || undefined,
        grade,
        board: finalBoard,
        subject,
        mediumOfLearning: finalMedium,
        planId: selectedPlanId,
        adminEmail: adminEmail || "Admin",
        notes: notes.trim() || "Direct Manual Enrollment by Admin (Bypass Form & Payment)",
      });

      onSuccess(cleanName, result.subscriptionRecord.planName);
      onToast?.(
        `🎉 ${cleanName} onboarded successfully with Pro Plan (${result.subscriptionRecord.planName})!`,
        "success"
      );
      onClose();
    } catch (err: any) {
      console.error("Direct student onboarding error:", err);
      setFormError(err?.message || "Failed to onboard student. Please try again.");
      onToast?.("Failed to onboard student. Check details and try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="admin-manual-onboard-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-[#796AEF] to-indigo-700 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Manual Student Onboarding</h3>
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Admin Direct
                </span>
              </div>
              <p className="text-xs text-indigo-100 font-medium">
                Instant registration & pre-activated Pro access without student form or payment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* Banner */}
          <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#796AEF] shrink-0" />
            <p className="leading-relaxed">
              Student will be saved in <strong>Firestore & Local CRM</strong> with <strong>Active Pro</strong> status. When they open the app with this phone, they skip all payment and registration screens!
            </p>
          </div>

          {/* Section 1: Basic Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <UserPlus className="w-3.5 h-3.5 text-[#796AEF]" />
              <span>Student Personal Details</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Aryan Kumar"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#796AEF] focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  10-Digit Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 font-bold text-xs pointer-events-none">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    className="w-full pl-14 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#796AEF] focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#796AEF] focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Academic Profile */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5 text-[#796AEF]" />
              <span>Academic Curriculum</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grade / Class</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#796AEF] focus:bg-white transition-all cursor-pointer"
                >
                  <optgroup label="Secondary Classes (6 - 10)">
                    <option value="Class 10">Class 10 (Board Exam Mastery)</option>
                    <option value="Class 9">Class 9 (Foundation)</option>
                    <option value="Class 8">Class 8</option>
                    <option value="Class 7">Class 7</option>
                    <option value="Class 6">Class 6</option>
                  </optgroup>
                  <optgroup label="Senior Secondary & Competitive">
                    <option value="Class 11">Class 11 (Science PCM / PCB)</option>
                    <option value="Class 12">Class 12 (Boards & Entrance)</option>
                    <option value="JEE">JEE (Main & Advanced)</option>
                    <option value="NEET">NEET UG (Medical Entrance)</option>
                    <option value="Dropper / JEE / NEET">Dropper / Target Batch</option>
                    <option value="Foundation / Olympiad">Foundation / Olympiad</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Educational Board</label>
                <select
                  value={board}
                  onChange={(e) => setBoard(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#796AEF] focus:bg-white transition-all cursor-pointer"
                >
                  <optgroup label="National & Central Boards">
                    <option value="CBSE">CBSE Board</option>
                    <option value="ICSE">ICSE / ISC Board</option>
                    <option value="Foundation / Olympiad">Foundation / Olympiad</option>
                  </optgroup>
                  <optgroup label="State Educational Boards">
                    <option value="UP Board">UP Board (Uttar Pradesh)</option>
                    <option value="Bihar Board">Bihar Board (BSEB)</option>
                    <option value="MP Board">MP Board (Madhya Pradesh)</option>
                    <option value="Rajasthan Board">Rajasthan Board (RBSE)</option>
                    <option value="Maharashtra Board">Maharashtra Board (MSBSHSE)</option>
                    <option value="Jharkhand Board">Jharkhand Board (JAC)</option>
                    <option value="West Bengal Board">West Bengal Board (WBBSE/WBCHSE)</option>
                    <option value="Odisha Board">Odisha Board (CHSE/BSE)</option>
                    <option value="Gujarat Board">Gujarat Board (GSEB)</option>
                    <option value="Karnataka Board">Karnataka Board (KSEEB)</option>
                    <option value="Tamil Nadu Board">Tamil Nadu State Board (TNBSE)</option>
                    <option value="AP / Telangana Board">Andhra Pradesh & Telangana Board</option>
                    <option value="Other State Board">Other State Board</option>
                    <option value="CUSTOM">✏️ Custom Board (Type Specific Name)...</option>
                  </optgroup>
                </select>
                {board === "CUSTOM" && (
                  <div className="mt-1.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={customBoard}
                      onChange={(e) => setCustomBoard(e.target.value)}
                      placeholder="Enter exact Board name (e.g. Haryana Board)"
                      className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#796AEF] transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#796AEF] focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Science">Science (Physics, Chem, Bio)</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Social Science">Social Science (SST)</option>
                  <option value="English">English Core</option>
                  <option value="All Subjects">All Subjects (Full Syllabus)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teaching Medium / Language</label>
                <select
                  value={mediumOfLearning}
                  onChange={(e) => setMediumOfLearning(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#796AEF] focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Hinglish">Hinglish (Recommended - Hindi + English)</option>
                  <option value="English">English (Pure English Medium)</option>
                  <option value="Hindi">Hindi (शुद्ध हिन्दी माध्यम)</option>
                  <option value="Bengali">Bengali (বাংলা মাধ্যম)</option>
                  <option value="Odisha">Odisha / Odia (ଓଡ଼ିଆ ମାଧ୍ୟମ)</option>
                  <option value="Marathi">Marathi (मराठी माध्यम)</option>
                  <option value="Gujarati">Gujarati (ગુજરાતી માધ્યમ)</option>
                  <option value="Tamil">Tamil (தமிழ் ஊடகம்)</option>
                  <option value="Telugu">Telugu (తెలుగు మాధ్యమం)</option>
                  <option value="CUSTOM">✏️ Custom Language (Type Specific)...</option>
                </select>
                {mediumOfLearning === "CUSTOM" && (
                  <div className="mt-1.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={customMedium}
                      onChange={(e) => setCustomMedium(e.target.value)}
                      placeholder="Enter exact Language (e.g. Malayalam / Assamese)"
                      className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:border-[#796AEF] transition-all"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Pro Plan Assignment */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pre-Activated Pro Plan</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                100% Free VIP Bypass
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {plans.map((p) => {
                const isSelected = selectedPlanId === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? "border-[#796AEF] bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{p.name}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{p.durationMonths} Months Duration</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-indigo-700">₹{p.priceINR}</span>
                        {p.popular && (
                          <span className="block text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded mt-0.5">
                            Popular
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Remark / Notes <span className="text-slate-400 font-normal">(Internal Reference)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Direct cash payment / Special merit scholar / Offline coaching student"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#796AEF] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Submit CTA */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-[#796AEF] hover:from-indigo-700 hover:to-indigo-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Onboarding & Activating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create & Activate Pro Access</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
