import React, { useState } from "react";
import {
  X,
  Wallet,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  IndianRupee,
  Check,
  ShieldCheck,
  FileText
} from "lucide-react";
import {
  StudentReferralSummary,
  adjustStudentWalletBalance
} from "../utils/referralStore";

interface AdminWalletAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentReferralSummary | null;
  onSuccess?: () => void;
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export const AdminWalletAdjustmentModal: React.FC<AdminWalletAdjustmentModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess,
  onToast,
}) => {
  const [adjustmentType, setAdjustmentType] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState<string>("");
  const [reasonPreset, setReasonPreset] = useState<string>("Promotion Bonus");
  const [customNotes, setCustomNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !student) return null;

  const numericAmount = parseFloat(amount) || 0;
  const currentBalance = student.walletBalance || 0;
  const simulatedNewBalance =
    adjustmentType === "credit"
      ? currentBalance + numericAmount
      : Math.max(0, currentBalance - numericAmount);

  const presetReasons =
    adjustmentType === "credit"
      ? [
          "Manual Bonus / Milestone Reward",
          "Compensation for Pending Inquiry",
          "Competition / Leaderboard Prize",
          "Offline Cash Settlement Credit",
          "Custom Reason",
        ]
      : [
          "Fraudulent / Self-Referral Clawback",
          "Chargeback / Incorrect Credit Reversal",
          "Offline Direct Cash Paid by Admin",
          "Account Disciplinary Penalty",
          "Custom Reason",
        ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      onToast?.("Please enter a valid amount greater than ₹0", "error");
      return;
    }

    if (adjustmentType === "debit" && numericAmount > currentBalance) {
      onToast?.(`Cannot debit more than the current wallet balance (₹${currentBalance})`, "error");
      return;
    }

    const finalNotes =
      reasonPreset === "Custom Reason"
        ? customNotes.trim() || `Admin manual ${adjustmentType}`
        : customNotes.trim()
        ? `${reasonPreset} - ${customNotes.trim()}`
        : reasonPreset;

    setIsSubmitting(true);
    try {
      const res = adjustStudentWalletBalance(
        student.studentId,
        student.studentName,
        adjustmentType,
        numericAmount,
        finalNotes
      );

      if (res.success) {
        onToast?.(res.message, "success");
        onSuccess?.();
        onClose();
      } else {
        onToast?.(res.message, "error");
      }
    } catch (err: any) {
      onToast?.(err?.message || "Failed to adjust balance", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${
                adjustmentType === "credit"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                  : "bg-gradient-to-br from-rose-500 to-red-600"
              }`}
            >
              {adjustmentType === "credit" ? (
                <PlusCircle className="w-5 h-5" />
              ) : (
                <MinusCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Manual Wallet Adjustment
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {student.studentName} • {student.grade || "Scholar"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto no-scrollbar">
          {/* Credit vs. Debit Segment */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setAdjustmentType("credit");
                setReasonPreset("Manual Bonus / Milestone Reward");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                adjustmentType === "credit"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Credit (+) Add Money</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAdjustmentType("debit");
                setReasonPreset("Fraudulent / Self-Referral Clawback");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                adjustmentType === "debit"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MinusCircle className="w-4 h-4" />
              <span>Debit (-) Deduct</span>
            </button>
          </div>

          {/* Current vs Projected Balance Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">
                Current Wallet Balance
              </span>
              <span className="text-base font-black text-slate-900 mt-0.5 block">
                ₹{currentBalance}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">
                Projected New Balance
              </span>
              <span
                className={`text-base font-black mt-0.5 block font-mono ${
                  adjustmentType === "credit" ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                ₹{simulatedNewBalance}
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Adjustment Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                ₹
              </div>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50, 100, 200"
                className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#796AEF]/30 focus:border-[#796AEF]"
              />
            </div>
            {/* Quick quick amount pills */}
            <div className="flex items-center gap-1.5 mt-2">
              {[50, 100, 150, 250, 500].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAmount(quick.toString())}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer transition-all active:scale-95"
                >
                  ₹{quick}
                </button>
              ))}
            </div>
          </div>

          {/* Audit Reason Preset */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Select Audit Reason Preset <span className="text-rose-500">*</span>
            </label>
            <select
              value={reasonPreset}
              onChange={(e) => setReasonPreset(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#796AEF]/30 focus:border-[#796AEF]"
            >
              {presetReasons.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Custom Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Internal Admin Notes / Audit Remark
            </label>
            <textarea
              rows={2}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Approved by Head of Ops for top performer incentive..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#796AEF]/30 focus:border-[#796AEF]"
            />
          </div>

          {/* Safety Notice */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-2 text-[11px] text-slate-600">
            <ShieldCheck className="w-4 h-4 text-[#796AEF] shrink-0 mt-0.5" />
            <span>
              This adjustment is instantly logged into the student&apos;s ledger with full administrative audit tracking.
            </span>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || numericAmount <= 0}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs text-white shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5 ${
                adjustmentType === "credit"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                Confirm {adjustmentType === "credit" ? `Credit (+₹${numericAmount})` : `Debit (-₹${numericAmount})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
