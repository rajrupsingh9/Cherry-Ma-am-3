import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Copy,
  Check,
  Users,
  Wallet,
  IndianRupee,
  TrendingUp,
  Award,
  Clock,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  ExternalLink,
  ArrowUpRight,
  Sparkles,
  Layers,
  ChevronRight,
  AlertCircle,
  ShieldAlert,
  Snowflake,
  PlusCircle,
  Lock,
  Zap,
  Crown
} from "lucide-react";
import {
  StudentReferralSummary,
  ReferralAccountState,
  WithdrawalRecord,
  loadReferralState,
  toggleStudentReferralStatus,
  REFERRAL_5_LEVEL_CONFIG,
  getReferralCommissionConfig,
  getReferrerActivePlanTier,
  assignStudentSubscriptionTier,
  PLAN_REFERRAL_TIERS,
  PlanReferralTier,
  getPlanReferralTiers,
  ReferralCommissionConfig,
} from "../utils/referralStore";
import { AdminWalletAdjustmentModal } from "./AdminWalletAdjustmentModal";
import { AdminFraudControlModal } from "./AdminFraudControlModal";

interface AdminReferralDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: StudentReferralSummary | null;
  onStatusChange?: (studentId: string, newStatus: "active" | "paused") => void;
  onApprovePayout?: (record: WithdrawalRecord) => void;
  onRejectPayout?: (record: WithdrawalRecord) => void;
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
  onSwitchToStudentView?: (preset?: any) => void;
}

export const AdminReferralDetailModal: React.FC<AdminReferralDetailModalProps> = ({
  isOpen,
  onClose,
  summary,
  onStatusChange,
  onApprovePayout,
  onRejectPayout,
  onToast,
  onSwitchToStudentView,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [commissionConfig, setCommissionConfig] = useState<ReferralCommissionConfig>(() =>
    getReferralCommissionConfig()
  );
  const [activeTab, setActiveTab] = useState<"network" | "activities" | "withdrawals">("network");
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showFraudModal, setShowFraudModal] = useState(false);
  const [currentTierMonths, setCurrentTierMonths] = useState<number>(() => {
    if (!summary) return 1;
    const acct = loadReferralState(summary.studentName, summary.studentId);
    return acct.planTierMonths || 1;
  });

  // Listen for real-time commission config / tier updates
  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      if (e?.detail) {
        setCommissionConfig(e.detail);
      } else {
        setCommissionConfig(getReferralCommissionConfig());
      }
    };
    window.addEventListener("cherry_commission_config_updated", handleConfigUpdate);
    window.addEventListener("cherry_referral_commission_updated", handleConfigUpdate);
    window.addEventListener("cherry_plans_updated", handleConfigUpdate);
    return () => {
      window.removeEventListener("cherry_commission_config_updated", handleConfigUpdate);
      window.removeEventListener("cherry_referral_commission_updated", handleConfigUpdate);
      window.removeEventListener("cherry_plans_updated", handleConfigUpdate);
    };
  }, []);

  const availablePlanTiers = useMemo(
    () => getPlanReferralTiers(commissionConfig),
    [commissionConfig]
  );

  // Re-sync tier when summary changes
  useEffect(() => {
    if (summary) {
      const acct = loadReferralState(summary.studentName, summary.studentId);
      setCurrentTierMonths(acct.planTierMonths || 1);
    }
  }, [summary]);

  if (!isOpen || !summary) return null;

  const fullAccount: ReferralAccountState = loadReferralState(summary.studentName, summary.studentId);
  const isFrozen = fullAccount.isFrozen ?? summary.isFrozen ?? false;
  const fraudFlags = fullAccount.fraudFlags || summary.fraudFlags || [];
  const referralLink = `${window.location.origin}?ref=${summary.referralCode}`;
  const activePlanTier = getReferrerActivePlanTier(summary.studentId, commissionConfig);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(summary.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    onToast?.(`Copied Referral Code: ${summary.referralCode} 📋`, "info");
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    onToast?.("Copied Referral Invite Link 🔗", "info");
  };

  const handleTierChange = (months: number) => {
    const result = assignStudentSubscriptionTier(summary.studentId, summary.studentName, months);
    if (result.success) {
      setCurrentTierMonths(months);
      onToast?.(result.message, "success");
      onStatusChange?.(summary.studentId, summary.status);
    }
  };

  const handleToggleAccountStatus = () => {
    const newStatus = summary.status === "active" ? "paused" : "active";
    toggleStudentReferralStatus(summary.studentId, newStatus);
    onStatusChange?.(summary.studentId, newStatus);
    onToast?.(
      newStatus === "active"
        ? `Referral account for ${summary.studentName} is now ACTIVE 🟢`
        : `Referral account for ${summary.studentName} has been PAUSED ⏸️`,
      newStatus === "active" ? "success" : "warning"
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#796AEF] to-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
              {summary.studentName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {summary.studentName}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    summary.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {summary.status === "active" ? "Active" : "Paused"}
                </span>

                {isFrozen && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-mono font-black text-[9.5px] flex items-center gap-1">
                    <Snowflake className="w-3 h-3" />
                    <span>Frozen</span>
                  </span>
                )}

                {fraudFlags.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-mono font-black text-[9.5px] flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>{fraudFlags.length} Flag{fraudFlags.length > 1 ? "s" : ""}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {summary.grade || "Class 10"} • {summary.board || "CBSE"} •{" "}
                {summary.studentEmail || "Student Account"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto no-scrollbar">
          {/* Phase 3 Admin Quick Controls: Wallet Adjustment & Anti-Fraud Shield */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setShowAdjustmentModal(true)}
              className="py-2 px-3 bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 text-slate-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#796AEF]" />
              <span>Adjust Wallet</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFraudModal(true)}
              className={`py-2 px-3 border rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                isFrozen
                  ? "bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-700"
                  : fraudFlags.length > 0
                  ? "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200"
                  : "bg-white hover:bg-slate-50 text-slate-900 border-slate-200"
              }`}
            >
              {isFrozen ? (
                <>
                  <Snowflake className="w-3.5 h-3.5" />
                  <span>Frozen Account</span>
                </>
              ) : (
                <>
                  <ShieldAlert className={`w-3.5 h-3.5 ${fraudFlags.length > 0 ? "text-rose-600" : "text-amber-500"}`} />
                  <span>Fraud & Security ({fraudFlags.length})</span>
                </>
              )}
            </button>
          </div>

          {/* Referral Code & Quick Link Box */}
          <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div>
              <div className="text-[10px] font-bold text-[#796AEF] uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3 h-3" />
                <span>Scholar Referral Code</span>
              </div>
              <div className="text-sm font-mono font-black text-slate-900 mt-0.5 tracking-wide">
                {summary.referralCode}
              </div>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedCode ? "Copied" : "Copy Code"}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 sm:flex-none px-3 py-1.5 bg-[#796AEF] hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Copied" : "Copy Link"}</span>
              </button>
            </div>
          </div>

          {/* Phase 3: Student Subscription Tier & Dynamic Commission Multiplier */}
          <div className="p-3.5 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border border-indigo-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-900">Subscription Tier & Commission Rates</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-[#796AEF] text-[10px] font-black uppercase tracking-wider">
                {activePlanTier.badge} {activePlanTier.label}
              </span>
            </div>

            {/* Current Rates Bar */}
            <div className="p-2 bg-white/90 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[11px]">Direct (L1):</span>
                <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {activePlanTier.level1Percent}%
                </span>
              </div>
              <div className="h-3 w-px bg-slate-200" />
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[11px]">5th Level Team (L5):</span>
                <span className="font-mono font-black text-[#796AEF] bg-indigo-50 px-1.5 py-0.5 rounded">
                  {activePlanTier.level5Percent}%
                </span>
              </div>
            </div>

            {/* Quick Tier Assignment Buttons */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Assign Active Plan Tier:</span>
                <span className="text-[10px] text-indigo-600 font-semibold">Instant Multiplier</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {availablePlanTiers.map((tier) => {
                  const isSelected = (currentTierMonths || 1) === tier.durationMonths;
                  return (
                    <button
                      key={tier.tierId}
                      type="button"
                      onClick={() => handleTierChange(tier.durationMonths)}
                      className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#796AEF] text-white border-[#796AEF] shadow-xs font-bold"
                          : "bg-white hover:bg-indigo-50/50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <div className="text-[11px] font-black leading-tight">{tier.label}</div>
                      <div className={`text-[9px] font-mono mt-0.5 ${isSelected ? "text-indigo-100" : "text-emerald-600 font-bold"}`}>
                        L1: {tier.level1Percent}%
                      </div>
                      <div className={`text-[8.5px] font-mono ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                        L5: {tier.level5Percent}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>


          {/* 3 Metric Summary Badges */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Total Earned</div>
              <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                ₹{summary.totalEarned}
              </div>
              <div className="text-[9px] text-emerald-600 font-semibold mt-0.5">
                L1 + L5 Payouts
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Withdrawn</div>
              <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                ₹{summary.withdrawnAmount}
              </div>
              <div className="text-[9px] text-slate-500 font-semibold mt-0.5">
                via Direct UPI
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-center">
              <div className="text-[10px] text-emerald-800 font-bold uppercase">Live Balance</div>
              <div className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">
                ₹{summary.walletBalance}
              </div>
              <div className="text-[9px] text-emerald-600 font-semibold mt-0.5">
                Available to Cashout
              </div>
            </div>
          </div>

          {/* Sub Navigation Segment */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab("network")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                activeTab === "network"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              5-Level Network ({summary.totalTeamMembers})
            </button>
            <button
              onClick={() => setActiveTab("activities")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                activeTab === "activities"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Referral Activity ({fullAccount.activities.length})
            </button>
            <button
              onClick={() => setActiveTab("withdrawals")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                activeTab === "withdrawals"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Withdrawals ({fullAccount.withdrawals.length})
            </button>
          </div>

          {/* TAB 1: 5-LEVEL NETWORK BREAKDOWN */}
          {activeTab === "network" && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Multi-Tier Network Distribution</span>
                <span className="text-[11px] text-[#796AEF] font-bold">
                  Total Team: {summary.totalTeamMembers} scholars
                </span>
              </div>

              {/* Level 1 Direct */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    L1
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <span>1st Level (Direct Income)</span>
                      <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded-full text-[9px] font-black">
                        ₹{commissionConfig.level1Reward} / member
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Direct students joined using invite code
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-800">
                    {summary.directMembers} Students
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600">
                    +₹{summary.directMembers * commissionConfig.level1Reward} Earned
                  </div>
                </div>
              </div>

              {/* Levels 2, 3, 4 Bridge Tiers */}
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((lvl) => {
                  const count = fullAccount.tierCounts[lvl] || 0;
                  return (
                    <div
                      key={lvl}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center"
                    >
                      <div className="text-[10px] font-bold text-slate-600">
                        Level {lvl} (Bridge)
                      </div>
                      <div className="text-xs font-black text-slate-800 mt-0.5">
                        {count} Members
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                        ₹0 (Network Step)
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Level 5 Indirect */}
              <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#796AEF] text-white flex items-center justify-center font-bold text-xs">
                    L5
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <span>5th Level (Indirect Income)</span>
                      <span className="px-1.5 py-0.2 bg-indigo-200 text-indigo-900 rounded-full text-[9px] font-black">
                        ₹{commissionConfig.level5Reward} / member
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Network progression invites from Tier 4 team
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-[#796AEF]">
                    {summary.indirectMembers} Students
                  </div>
                  <div className="text-[10px] font-bold text-indigo-600">
                    +₹{summary.indirectMembers * commissionConfig.level5Reward} Earned
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REFERRAL ACTIVITIES */}
          {activeTab === "activities" && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">
                Recent Network Onboarding Feed
              </div>
              {fullAccount.activities.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  No referral joins logged yet.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {fullAccount.activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center ${
                            act.level === 1
                              ? "bg-emerald-100 text-emerald-800"
                              : act.level === 5
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          L{act.level}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{act.name}</span>
                            {act.tierLabel && (
                              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded text-[8.5px] font-bold">
                                {act.tierLabel}
                              </span>
                            )}
                            {act.appliedPercent && (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[8.5px] font-mono font-bold">
                                {act.appliedPercent}% Comm.
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {act.date}
                            {act.planName && ` • Plan: ${act.planName}`}
                            {act.planPriceINR && ` (₹${act.planPriceINR})`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-black ${
                            act.amount > 0 ? "text-emerald-600" : "text-slate-400"
                          }`}
                        >
                          {act.amount > 0 ? `+₹${act.amount}` : "₹0"}
                        </span>
                        <div className="text-[9px] text-slate-400 capitalize">{act.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WITHDRAWALS */}
          {activeTab === "withdrawals" && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>UPI Cashout Transactions</span>
                <span className="text-[10.5px] font-mono text-slate-500">
                  Total Cashed Out: ₹{fullAccount.withdrawnAmount}
                </span>
              </div>
              {fullAccount.withdrawals.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  No withdrawal requests made yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {fullAccount.withdrawals.map((wd) => {
                    const isPending = wd.status === "pending" || wd.status === "processing";
                    const isPaid = wd.status === "successful";
                    const isRejected = wd.status === "rejected";

                    return (
                      <div
                        key={wd.id}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          isPending
                            ? "bg-amber-50/60 border-amber-300 ring-1 ring-amber-400/20"
                            : isPaid
                            ? "bg-slate-50 border-slate-200"
                            : "bg-rose-50/40 border-rose-200"
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="font-mono text-sm font-black text-slate-900">₹{wd.amount}</span>
                            {isPending && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                Pending Review
                              </span>
                            )}
                            {isPaid && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Paid / Settled
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                                Refunded to Wallet
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] font-mono font-bold text-slate-700">
                            UPI: {wd.upiId}
                          </div>
                          <div className="text-[9.5px] text-slate-400 font-mono">
                            {wd.date} • Ref: {wd.referenceId}
                            {wd.utrNumber && ` • UTR: ${wd.utrNumber}`}
                            {wd.rejectionReason && ` • Reason: ${wd.rejectionReason}`}
                          </div>
                        </div>

                        {/* Actions for Pending inside Inspection Modal */}
                        {isPending && (onApprovePayout || onRejectPayout) && (
                          <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                            {onApprovePayout && (
                              <button
                                type="button"
                                onClick={() => {
                                  onApprovePayout({
                                    ...wd,
                                    studentId: summary.studentId,
                                    studentName: summary.studentName,
                                    studentEmail: summary.studentEmail,
                                    grade: summary.grade,
                                    board: summary.board,
                                  });
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Approve &amp; Pay
                              </button>
                            )}
                            {onRejectPayout && (
                              <button
                                type="button"
                                onClick={() => {
                                  onRejectPayout({
                                    ...wd,
                                    studentId: summary.studentId,
                                    studentName: summary.studentName,
                                    studentEmail: summary.studentEmail,
                                    grade: summary.grade,
                                    board: summary.board,
                                  });
                                }}
                                className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleToggleAccountStatus}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              summary.status === "active"
                ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
            }`}
          >
            {summary.status === "active" ? (
              <>
                <PauseCircle className="w-4 h-4 text-amber-600" />
                <span>Pause Referral Program</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 text-emerald-600" />
                <span>Resume Referral Program</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onSwitchToStudentView && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToStudentView({
                    name: summary.studentName,
                    grade: summary.grade,
                    board: summary.board,
                  });
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-[#796AEF] border border-indigo-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Test Student View</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Phase 3 Modals */}
      {showAdjustmentModal && (
        <AdminWalletAdjustmentModal
          isOpen={showAdjustmentModal}
          onClose={() => setShowAdjustmentModal(false)}
          student={summary}
          onSuccess={() => {
            onStatusChange?.(summary.studentId, summary.status);
          }}
          onToast={onToast}
        />
      )}

      {showFraudModal && (
        <AdminFraudControlModal
          isOpen={showFraudModal}
          onClose={() => setShowFraudModal(false)}
          student={summary}
          onSuccess={() => {
            onStatusChange?.(summary.studentId, summary.status);
          }}
          onToast={onToast}
        />
      )}
    </div>
  );
};
