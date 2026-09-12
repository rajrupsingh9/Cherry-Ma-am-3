import React, { useState } from "react";
import {
  X,
  ShieldAlert,
  Snowflake,
  Unlock,
  AlertTriangle,
  Flag,
  Trash2,
  CheckCircle,
  Clock,
  Info
} from "lucide-react";
import {
  StudentReferralSummary,
  FraudFlag,
  toggleFreezeStudentReferralAccount,
  addStudentFraudFlag,
  dismissStudentFraudFlag
} from "../utils/referralStore";

interface AdminFraudControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentReferralSummary | null;
  onSuccess?: () => void;
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export const AdminFraudControlModal: React.FC<AdminFraudControlModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess,
  onToast,
}) => {
  const [freezeReason, setFreezeReason] = useState("");
  const [newFlagType, setNewFlagType] = useState<FraudFlag["type"]>("self_referral");
  const [newFlagSeverity, setNewFlagSeverity] = useState<"high" | "medium" | "low">("high");
  const [newFlagReason, setNewFlagReason] = useState("");
  const [showAddFlagForm, setShowAddFlagForm] = useState(false);

  if (!isOpen || !student) return null;

  const isFrozen = student.isFrozen || false;
  const flags = student.fraudFlags || [];

  const handleToggleFreeze = () => {
    const nextFreezeState = !isFrozen;
    const res = toggleFreezeStudentReferralAccount(
      student.studentId,
      student.studentName,
      nextFreezeState,
      freezeReason || "Administrative security lock triggered by admin"
    );

    if (res.success) {
      onToast?.(res.message, nextFreezeState ? "warning" : "success");
      onSuccess?.();
      onClose();
    } else {
      onToast?.(res.message, "error");
    }
  };

  const handleAddFlag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlagReason.trim()) {
      onToast?.("Please specify the fraud observation reason", "error");
      return;
    }

    const res = addStudentFraudFlag(student.studentId, student.studentName, {
      type: newFlagType,
      severity: newFlagSeverity,
      reason: newFlagReason.trim(),
    });

    if (res.success) {
      onToast?.(res.message, "info");
      setNewFlagReason("");
      setShowAddFlagForm(false);
      onSuccess?.();
    } else {
      onToast?.(res.message, "error");
    }
  };

  const handleDismissFlag = (flagId: string) => {
    const res = dismissStudentFraudFlag(student.studentId, student.studentName, flagId);
    if (res.success) {
      onToast?.(res.message, "info");
      onSuccess?.();
    } else {
      onToast?.(res.message, "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${
                isFrozen
                  ? "bg-gradient-to-br from-cyan-600 to-blue-700"
                  : flags.length > 0
                  ? "bg-gradient-to-br from-amber-500 to-rose-600"
                  : "bg-gradient-to-br from-slate-700 to-slate-900"
              }`}
            >
              {isFrozen ? <Snowflake className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  Anti-Fraud & Security Shield
                </h3>
                {isFrozen && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-mono font-black text-[9.5px]">
                    FROZEN ❄️
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {student.studentName} ({student.referralCode})
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

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto no-scrollbar">
          {/* Account Freeze / Unfreeze Action Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isFrozen
                ? "bg-cyan-50/70 border-cyan-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    {isFrozen ? "Account Frozen State" : "Account Operational State"}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  {isFrozen
                    ? "This account is currently FROZEN. Commission earnings, direct invites, and UPI withdrawal requests are completely blocked."
                    : "Freezing this account will immediately revoke referral capabilities, hold pending cashouts, and prevent further commission generation."}
                </p>
                {isFrozen && student.freezeReason && (
                  <div className="p-2 bg-white rounded-xl border border-cyan-200/80 text-[11px] text-cyan-900 font-medium mt-1">
                    <strong>Freeze Reason:</strong> {student.freezeReason}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleToggleFreeze}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 shrink-0 ${
                  isFrozen
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-cyan-600 hover:bg-cyan-700 text-white"
                }`}
              >
                {isFrozen ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unfreeze</span>
                  </>
                ) : (
                  <>
                    <Snowflake className="w-3.5 h-3.5" />
                    <span>Freeze</span>
                  </>
                )}
              </button>
            </div>

            {!isFrozen && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <input
                  type="text"
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder="Optional audit reason (e.g. Self-referring with duplicate numbers)"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Active Security & Fraud Flags Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-bold text-slate-900">
                  Security Risk Flags ({flags.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFlagForm(!showAddFlagForm)}
                className="text-[11px] font-bold text-[#796AEF] hover:text-indigo-800 cursor-pointer"
              >
                {showAddFlagForm ? "Cancel" : "+ Add Security Flag"}
              </button>
            </div>

            {/* Add Flag Sub-Form */}
            {showAddFlagForm && (
              <form
                onSubmit={handleAddFlag}
                className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-2xl space-y-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Violation Type
                    </label>
                    <select
                      value={newFlagType}
                      onChange={(e) => setNewFlagType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="self_referral">Self-Referral Loop</option>
                      <option value="duplicate_upi">Duplicate UPI Reuse</option>
                      <option value="rapid_claims">Rapid Automated Claims</option>
                      <option value="suspicious_ip">Same Device / IP Clone</option>
                      <option value="frozen_account">Policy Violation</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Severity Level
                    </label>
                    <select
                      value={newFlagSeverity}
                      onChange={(e) => setNewFlagSeverity(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="high">High (Clawback Required)</option>
                      <option value="medium">Medium (Under Watch)</option>
                      <option value="low">Low (Notice)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Audit Finding Description
                  </label>
                  <input
                    type="text"
                    required
                    value={newFlagReason}
                    onChange={(e) => setNewFlagReason(e.target.value)}
                    placeholder="e.g. 3 new accounts registered from same device ID within 10 minutes..."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFlagForm(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-2xs cursor-pointer"
                  >
                    Confirm Flag
                  </button>
                </div>
              </form>
            )}

            {/* List of Flags */}
            {flags.length === 0 ? (
              <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">Clean Integrity Record</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  No automated abuse flags or suspicious anomalies detected for this scholar.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {flags.map((flag) => (
                  <div
                    key={flag.id}
                    className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs flex items-start justify-between gap-2.5"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono font-black text-[9px] uppercase ${
                            flag.severity === "high"
                              ? "bg-rose-100 text-rose-800"
                              : flag.severity === "medium"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {flag.severity} Risk
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-800">
                          {flag.type.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400">• {flag.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-600 break-words">{flag.reason}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDismissFlag(flag.id)}
                      title="Dismiss Flag"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200/80 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-all"
          >
            Close Security Panel
          </button>
        </div>
      </div>
    </div>
  );
};
