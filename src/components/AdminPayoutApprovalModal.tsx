import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Wallet,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { WithdrawalRecord } from "../utils/referralStore";

interface AdminPayoutApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: WithdrawalRecord | null;
  mode: "approve" | "reject";
  onApprove: (withdrawalId: string, utrNumber: string) => void;
  onReject: (withdrawalId: string, reason: string) => void;
  onToast?: (message: string, type?: "success" | "info" | "error") => void;
}

const COMMON_REJECTION_REASONS = [
  "Invalid UPI ID / VPA handle does not exist",
  "Bank account frozen or inactive",
  "Account holder name mismatch",
  "Transaction rejected by receiver's bank",
  "Duplicate withdrawal request",
];

export const AdminPayoutApprovalModal: React.FC<AdminPayoutApprovalModalProps> = ({
  isOpen,
  onClose,
  record,
  mode,
  onApprove,
  onReject,
  onToast,
}) => {
  const [utrNumber, setUtrNumber] = useState("");
  const [selectedReason, setSelectedReason] = useState(COMMON_REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Initialize or generate a sample UTR when opening approve mode
  useEffect(() => {
    if (isOpen && record) {
      if (mode === "approve") {
        const sampleUtr = `UTR-${new Date().getFullYear()}-${Math.floor(10000000 + Math.random() * 90000000)}`;
        setUtrNumber(sampleUtr);
      } else {
        setSelectedReason(COMMON_REJECTION_REASONS[0]);
        setCustomReason("");
      }
      setCopiedUpi(false);
    }
  }, [isOpen, record, mode]);

  if (!isOpen || !record) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(record.upiId);
    setCopiedUpi(true);
    onToast?.(`Copied UPI ID: ${record.upiId} 📋`, "info");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleRegenerateUtr = () => {
    const randomUtr = `UTR-${new Date().getFullYear()}-${Math.floor(10000000 + Math.random() * 90000000)}`;
    setUtrNumber(randomUtr);
    onToast?.("Generated test UTR reference! ⚡", "info");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "approve") {
      if (!utrNumber.trim()) {
        onToast?.("Please provide a valid UTR / Bank Reference Number.", "error");
        return;
      }
      onApprove(record.id, utrNumber.trim());
    } else {
      const finalReason = customReason.trim() ? customReason.trim() : selectedReason;
      onReject(record.id, finalReason);
    }
    onClose();
  };

  const upiPayLink = `upi://pay?pa=${encodeURIComponent(record.upiId)}&pn=${encodeURIComponent(
    record.studentName || "Scholar"
  )}&am=${record.amount}&cu=INR&tn=CherryAI_Scholarship_Payout`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-4 animate-fade-in text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                mode === "approve"
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-rose-50 text-rose-600 border border-rose-200"
              }`}
            >
              {mode === "approve" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                {mode === "approve" ? "Approve & Mark as Paid" : "Reject & Refund Withdrawal"}
              </h3>
              <span className="text-[10px] font-mono text-slate-500">
                Ref: {record.referenceId}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Student & Amount Summary Card */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-black text-slate-900 text-xs sm:text-sm">
                {record.studentName || "Student"}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {record.grade || "Scholar"} {record.board ? `• ${record.board}` : ""}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                Requested Payout
              </span>
              <span className="text-lg font-black text-emerald-600 font-mono">
                ₹{record.amount}
              </span>
            </div>
          </div>

          {/* UPI ID Row with 1-Tap Copy & App Launch */}
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="text-[10px] font-bold font-mono text-slate-500 uppercase">
                UPI:
              </span>
              <span className="text-xs font-black font-mono text-slate-800 truncate select-all">
                {record.upiId}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyUpi}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold font-mono text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="Copy UPI ID"
              >
                {copiedUpi ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedUpi ? "Copied" : "Copy UPI"}</span>
              </button>

              <a
                href={upiPayLink}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-[#796AEF] border border-indigo-200 rounded-lg text-[10px] font-bold font-mono transition-colors flex items-center gap-1"
                title="Open UPI Intent"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Pay App</span>
              </a>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "approve" ? (
            /* APPROVAL: UTR Number Input */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10.5px] font-mono uppercase font-bold text-slate-700 block">
                  Bank UTR / Transaction Reference Number <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateUtr}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Gen UTR</span>
                </button>
              </div>

              <input
                type="text"
                required
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="e.g. UTR-2026-98127391 or 421938210928"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[10.5px] text-emerald-800 flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Confirming will mark this payout as <strong>Successful</strong>, notify the student, and deduct the commission from the platform pending ledger.
                </span>
              </div>
            </div>
          ) : (
            /* REJECTION: Reason selection & Wallet Refund Notice */
            <div className="space-y-2.5">
              <label className="text-[10.5px] font-mono uppercase font-bold text-slate-700 block">
                Select Rejection Reason <span className="text-rose-500">*</span>
              </label>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {COMMON_REJECTION_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2 p-2 rounded-xl text-[11px] border cursor-pointer transition-all ${
                      selectedReason === reason
                        ? "bg-rose-50/70 border-rose-300 text-rose-900 font-bold"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejection_reason"
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="accent-rose-600"
                    />
                    <span className="truncate">{reason}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-mono text-slate-500">
                  Or write custom note (optional):
                </span>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g. Please update to active PhonePe handle and retry"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Instant Refund Guarantee Notice */}
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10.5px] text-amber-900 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Auto-Refund:</strong> Rejecting will automatically restore{" "}
                  <strong className="text-emerald-700 font-mono">₹{record.amount}</strong> back into{" "}
                  <strong>{record.studentName || "the student"}</strong>'s live wallet balance so they can re-request.
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-sm cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
                mode === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                  : "bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
              }`}
            >
              {mode === "approve" ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payout &amp; Save UTR</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Confirm Rejection &amp; Refund</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
