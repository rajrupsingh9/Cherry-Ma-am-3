import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import {
  Share2,
  Copy,
  Check,
  TrendingUp,
  Wallet,
  Users,
  Sparkles,
  Info,
  ShieldCheck,
  Clock,
  Layers,
  ArrowRight,
  ChevronLeft,
  Gift,
  Zap,
  CheckCircle2,
  HelpCircle,
  QrCode,
  Snowflake,
  AlertTriangle,
  Crown,
  ArrowUpRight,
  Percent,
  X,
  Download,
} from "lucide-react";
import {
  REFERRAL_5_LEVEL_CONFIG,
  ReferralAccountState,
  loadReferralState,
  saveReferralState,
  requestWithdrawal,
  getReferralCommissionConfig,
  getDynamicTierConfig,
  ReferralCommissionConfig,
  syncCommissionConfigFromCloud,
  getReferrerActivePlanTier,
  calculateTieredReferralReward,
  PLAN_REFERRAL_TIERS,
  PlanReferralTier,
  getPlanReferralTiers,
} from "../utils/referralStore";
import {
  getActiveSubscriptionPlans,
  SubscriptionPlan,
} from "../utils/subscriptionStore";

interface ReferAndEarnHubProps {
  studentName?: string;
  userUid?: string;
  onToast?: (message: string, type?: "success" | "info" | "error") => void;
  onClose?: () => void;
  onOpenSubscriptionPlans?: () => void;
}

export const ReferAndEarnHub: React.FC<ReferAndEarnHubProps> = ({
  studentName = "Student",
  userUid = "",
  onToast,
  onClose,
  onOpenSubscriptionPlans,
}) => {
  const effectiveUid = useMemo(() => {
    if (userUid && userUid !== "local_learner") return userUid;
    try {
      const localUserRaw = localStorage.getItem("local_active_user");
      if (localUserRaw) {
        const parsed = JSON.parse(localUserRaw);
        if (parsed?.uid) return parsed.uid;
      }
    } catch (_) {}
    return userUid || "";
  }, [userUid]);

  const effectiveName = useMemo(() => {
    if (studentName && studentName !== "Student") return studentName;
    try {
      const localUserRaw = localStorage.getItem("local_active_user");
      if (localUserRaw) {
        const parsed = JSON.parse(localUserRaw);
        if (parsed?.displayName) return parsed.displayName;
      }
      const profRaw = localStorage.getItem("cherry_student_profile");
      if (profRaw) {
        const prof = JSON.parse(profRaw);
        if (prof?.name) return prof.name;
      }
    } catch (_) {}
    return studentName || "Student";
  }, [studentName]);

  const [refState, setRefState] = useState<ReferralAccountState>(() =>
    loadReferralState(effectiveName, effectiveUid)
  );
  const [commissionConfig, setCommissionConfig] = useState<ReferralCommissionConfig>(() =>
    getReferralCommissionConfig()
  );
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>(
    String(commissionConfig.minWithdrawalLimit || 50)
  );
  const [withdrawUpi, setWithdrawUpi] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"plan" | "calculator" | "history" | "rules">("plan");

  // Real-time synchronization with Admin referral actions (payout approvals, wallet adjustments)
  useEffect(() => {
    const handleReferralsUpdated = (e: any) => {
      const updatedAccount = loadReferralState(effectiveName, effectiveUid);
      setRefState((prev) => {
        // Check if an admin approved a withdrawal request in real time
        const newlyPaid = updatedAccount.withdrawals.find(
          (fw) =>
            fw.status === "successful" &&
            prev.withdrawals.some((pw) => pw.id === fw.id && pw.status !== "successful")
        );
        if (newlyPaid && onToast) {
          onToast(
            `🎉 Payout Approved! ₹${newlyPaid.amount} transferred to ${newlyPaid.upiId} (UTR: ${newlyPaid.utrNumber || "Verified"}).`,
            "success"
          );
        }
        // Check if wallet balance was directly credited by admin
        if (updatedAccount.walletBalance > prev.walletBalance && !newlyPaid && onToast) {
          const diff = updatedAccount.walletBalance - prev.walletBalance;
          onToast(`💰 Wallet Credited! +₹${diff} added to your referral balance.`, "success");
        }
        return updatedAccount;
      });
    };

    window.addEventListener("cherry_referrals_updated", handleReferralsUpdated);
    return () => {
      window.removeEventListener("cherry_referrals_updated", handleReferralsUpdated);
    };
  }, [effectiveName, effectiveUid, onToast]);

  // Sync with dynamic commission config updates (local events + cloud sync on mount)
  useEffect(() => {
    // Cloud sync on initial load
    syncCommissionConfigFromCloud().then((res) => {
      if (res?.config) {
        setCommissionConfig(res.config);
        setWithdrawAmount(String(res.config.minWithdrawalLimit || 50));
      }
    });

    const handleConfigUpdate = () => {
      const latest = getReferralCommissionConfig();
      setCommissionConfig(latest);
      setWithdrawAmount(String(latest.minWithdrawalLimit || 50));
    };
    window.addEventListener("cherry_commission_config_updated", handleConfigUpdate);
    window.addEventListener("cherry_referral_commission_updated", handleConfigUpdate);
    return () => {
      window.removeEventListener("cherry_commission_config_updated", handleConfigUpdate);
      window.removeEventListener("cherry_referral_commission_updated", handleConfigUpdate);
    };
  }, []);

  // Referrer Active Subscription Tier (1M, 3M, 6M, 12M, 24M or free)
  const referrerTier: PlanReferralTier = useMemo(() => {
    return getReferrerActivePlanTier(effectiveUid || effectiveName, commissionConfig);
  }, [effectiveUid, effectiveName, commissionConfig]);

  // Active dynamic plan referral tiers
  const activePlanTiers: PlanReferralTier[] = useMemo(() => {
    return getPlanReferralTiers(commissionConfig);
  }, [commissionConfig]);

  const vipTier: PlanReferralTier = useMemo(() => {
    return (
      activePlanTiers.find((t) => t.isMaxVip) ||
      activePlanTiers.find((t) => t.durationMonths >= 12) ||
      activePlanTiers[activePlanTiers.length - 1] ||
      PLAN_REFERRAL_TIERS[3]
    );
  }, [activePlanTiers]);

  const isReferrerVip = Boolean(
    referrerTier.isMaxVip ||
    referrerTier.durationMonths >= (vipTier.durationMonths || 12)
  );

  const dynamicTiers = useMemo(() => {
    return getDynamicTierConfig(commissionConfig, referrerTier);
  }, [commissionConfig, referrerTier]);

  // Active platform subscription plans - dynamically synchronized with admin plans
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(() => {
    try {
      return getActiveSubscriptionPlans();
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    const handlePlansUpdate = () => {
      try {
        const plans = getActiveSubscriptionPlans();
        setSubscriptionPlans(plans);
      } catch (_) {}
    };
    window.addEventListener("cherry_plans_updated", handlePlansUpdate);
    return () => {
      window.removeEventListener("cherry_plans_updated", handlePlansUpdate);
    };
  }, []);

  // Calculator state
  const [calcDirectInvites, setCalcDirectInvites] = useState<number>(5);
  const [calcDuplicationRate, setCalcDuplicationRate] = useState<number>(3);
  const [calcSelectedPlanId, setCalcSelectedPlanId] = useState<string>(() => {
    const initialPlans = getActiveSubscriptionPlans();
    return initialPlans[0]?.id || "semiannual_149";
  });

  const referralLink = `${window.location.origin}?ref=${refState.referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(refState.referralCode);
    setCopiedCode(true);
    if (onToast) onToast("Referral Code copied to clipboard! 📋", "success");
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    if (onToast) onToast("Referral Link copied to clipboard! 🔗", "success");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  useEffect(() => {
    if (showQrModal && referralLink) {
      QRCode.toDataURL(referralLink, {
        width: 280,
        margin: 1,
        color: { dark: "#0f172a", light: "#ffffff" },
      })
        .then(setQrDataUrl)
        .catch((err) => console.warn("[QR] code generation warn:", err));
    }
  }, [showQrModal, referralLink]);

  const handleShareWhatsApp = () => {
    const message = `🚀 *Namaste! Join Cherry AI 1-on-1 Socratic Classroom & Virtual Lab!*\n\nUse my referral invite code *${refState.referralCode}* to get instant access and earn up to 67% Referral Rewards! 🎉\n\n👉 Join here: ${referralLink}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    if (onToast) onToast("Opening WhatsApp share! 📲", "info");
  };

  const handleShareTelegram = () => {
    const text = `🚀 Join Cherry AI 1-on-1 Socratic Classroom & Virtual Lab!\n\nUse my invite code ${refState.referralCode} to get instant access and earn up to 67% Referral Rewards! 🎉\n\n👉 Join here: ${referralLink}`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, "_blank");
    if (onToast) onToast("Opening Telegram share! ✈️", "info");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Cherry AI - 1-on-1 AI Classroom & Lab",
          text: `Join Cherry AI with my referral code ${refState.referralCode} and earn up to 67% Referral Rewards!`,
          url: referralLink,
        });
        if (onToast) onToast("Shared successfully! 🎉", "success");
      } catch (_) {}
    } else {
      handleCopyLink();
    }
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    const minLimit = commissionConfig.minWithdrawalLimit || 50;
    if (isNaN(amt) || amt < minLimit) {
      if (onToast) onToast(`Minimum withdrawal amount is ₹${minLimit}.`, "error");
      return;
    }
    const res = requestWithdrawal(refState, amt, withdrawUpi, userUid, studentName);
    if (res.success) {
      setRefState(res.updatedState);
      setShowWithdrawModal(false);
      if (onToast) onToast(res.message, "success");
    } else {
      if (onToast) onToast(res.message, "error");
    }
  };

  // Level stats calculation dynamically linked to commissionConfig and activity records
  const level1Count = refState.tierCounts[1] || 0;
  const level1EarnedFromActivities = (refState.activities || [])
    .filter((a) => a.level === 1 && a.status === "credited")
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const level1Earned =
    level1EarnedFromActivities > 0
      ? level1EarnedFromActivities
      : level1Count * (referrerTier.level1Percent ? Math.max(1, Math.round(149 * (referrerTier.level1Percent / 100))) : commissionConfig.level1Reward);

  const level5Count = refState.tierCounts[5] || 0;
  const level5EarnedFromActivities = (refState.activities || [])
    .filter((a) => a.level === 5 && a.status === "credited")
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const level5Earned =
    level5EarnedFromActivities > 0
      ? level5EarnedFromActivities
      : level5Count * (referrerTier.level5Percent ? Math.max(1, Math.round(149 * (referrerTier.level5Percent / 100))) : commissionConfig.level5Reward);

  const totalTeamMembers = Object.values(refState.tierCounts).reduce(
    (a: number, b: number) => a + Number(b || 0),
    0
  );

  // Calculator selected plan lookup
  const calcTargetPlan = useMemo(() => {
    return (
      subscriptionPlans.find((p) => p.id === calcSelectedPlanId) ||
      subscriptionPlans[0] || {
        id: "semiannual_149",
        name: "6 Months Plan",
        priceINR: 149,
        durationMonths: 6,
      }
    );
  }, [subscriptionPlans, calcSelectedPlanId]);

  // Exact earnings per student joining with calcTargetPlan based on referrer's active tier
  const calcRewardBreakdown = useMemo(() => {
    return calculateTieredReferralReward({
      planPriceINR: calcTargetPlan.priceINR,
      planDurationMonths: calcTargetPlan.durationMonths,
      planId: calcTargetPlan.id,
      planName: calcTargetPlan.name,
      referrerIdOrName: effectiveUid || effectiveName,
      config: commissionConfig,
    });
  }, [calcTargetPlan, effectiveUid, effectiveName, commissionConfig]);

  // Dynamic compounding calculations
  const calcLevel1Earned = calcDirectInvites * calcRewardBreakdown.level1Reward;
  const calcLevel5Members = Math.round(
    calcDirectInvites * Math.pow(calcDuplicationRate, 4)
  );
  const calcLevel5Earned = calcLevel5Members * calcRewardBreakdown.level5Reward;
  const calcTotalPotential = calcLevel1Earned + calcLevel5Earned;

  // Comparison if referrer upgrades to 12M VIP
  const vipRewardBreakdown = useMemo(() => {
    const l1 = Math.max(1, Math.round(calcTargetPlan.priceINR * (vipTier.level1Percent / 100)));
    const l5 = Math.max(1, Math.round(calcTargetPlan.priceINR * (vipTier.level5Percent / 100)));
    return { l1, l5 };
  }, [calcTargetPlan, vipTier]);

  const calcVipTotalPotential =
    calcDirectInvites * vipRewardBreakdown.l1 + calcLevel5Members * vipRewardBreakdown.l5;
  const calcVipUpgradeDifference = Math.max(0, calcVipTotalPotential - calcTotalPotential);

  return (
    <div className="w-full flex-1 flex flex-col space-y-3.5 sm:space-y-4 text-left max-w-2xl mx-auto px-1 sm:px-2 pb-8 overflow-x-hidden">
      {/* Mobile-First Header Navigation */}
      <div className="flex items-center justify-between gap-2 pb-1">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
            <span>Profile</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white text-sm shadow-xs">
              🎁
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                Refer & Earn
              </h2>
              <span className="text-[10px] text-slate-500 font-mono font-medium">
                5-Level Income System
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10.5px] font-mono font-black flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
            {isReferrerVip ? "👑 VIP " : "⭐ "}
            L1 {referrerTier.level1Percent}%{referrerTier.level5Percent > 0 ? ` + L5 ${referrerTier.level5Percent}%` : ""}
          </span>
        </div>
      </div>

      {/* Account Frozen Alert Banner */}
      {refState.isFrozen && (
        <div className="p-3.5 bg-cyan-950/90 border border-cyan-500/50 rounded-2xl text-white flex items-start gap-2.5 shadow-sm">
          <Snowflake className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-200">
              Referral Account Temporarily Frozen
            </h4>
            <p className="text-[11px] text-cyan-100 leading-snug">
              {refState.freezeReason || "Administrative security lock. Withdrawals and referral earnings are temporarily paused."}
            </p>
          </div>
        </div>
      )}

      {/* Missed Higher Earnings Warning Banner */}
      {refState.lastMissedEarning && !refState.lastMissedEarning.isAcknowledged && (
        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl text-amber-950 shadow-xs space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                ⚡
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-900 leading-tight">
                  Higher Referral Reward Available!
                </h4>
                <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                  You earned <strong className="font-bold text-emerald-800">₹{refState.lastMissedEarning.earnedINR}</strong> from{" "}
                  <strong>{refState.lastMissedEarning.newStudentName}</strong> ({refState.lastMissedEarning.planName || "Subscription"}), but on {vipTier.label} VIP you could have earned{" "}
                  <strong className="text-purple-900">₹{refState.lastMissedEarning.vipCouldEarnINR}</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (refState.lastMissedEarning) {
                  const updated = {
                    ...refState,
                    lastMissedEarning: { ...refState.lastMissedEarning, isAcknowledged: true },
                  };
                  setRefState(updated);
                  saveReferralState(updated, effectiveUid);
                }
              }}
              className="text-amber-500 hover:text-amber-700 text-xs font-bold p-1 cursor-pointer"
              title="Dismiss notification"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/70 text-[11px]">
            <span className="font-semibold text-amber-800">
              Left on table: <strong className="text-rose-600 font-mono font-black">+₹{refState.lastMissedEarning.missedDiffINR}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                if (onOpenSubscriptionPlans) onOpenSubscriptionPlans();
                window.dispatchEvent(new CustomEvent("cherry_open_subscription_plans"));
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <span>Upgrade to {vipTier.label} VIP</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Referrer Active Tier Status Card & Upgrade Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs text-white ${
                isReferrerVip
                  ? "bg-gradient-to-tr from-amber-500 to-yellow-400"
                  : referrerTier.durationMonths >= 6
                  ? "bg-gradient-to-tr from-indigo-600 to-purple-600"
                  : "bg-gradient-to-tr from-slate-600 to-slate-800"
              }`}
            >
              {isReferrerVip ? "👑" : "⭐"}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-slate-900">
                  {referrerTier.label}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-black uppercase ${
                    isReferrerVip
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  }`}
                >
                  {referrerTier.level1Percent}% L1 {referrerTier.level5Percent > 0 ? `+ ${referrerTier.level5Percent}% L5` : ""}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                {referrerTier.badge || referrerTier.planName}
              </span>
            </div>
          </div>

          {!isReferrerVip && (
            <button
              type="button"
              onClick={() => {
                if (onOpenSubscriptionPlans) onOpenSubscriptionPlans();
                window.dispatchEvent(new CustomEvent("cherry_open_subscription_plans"));
              }}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <span>Upgrade</span>
              <ArrowUpRight className="w-3 h-3 text-indigo-600" />
            </button>
          )}
        </div>

        {/* Upgrade Prompt Banner if not VIP */}
        {!isReferrerVip && (
          <div className="p-2.5 bg-gradient-to-r from-indigo-50/90 via-purple-50/90 to-amber-50/90 rounded-xl border border-indigo-100 flex items-center justify-between gap-2">
            <span className="text-[10.5px] text-slate-700 font-medium leading-tight">
              💡 <strong className="text-indigo-950">Upgrade to {vipTier.label} VIP</strong> to unlock maximum <strong className="text-emerald-700 font-bold">{vipTier.level1Percent}% Level 1</strong> + <strong className="text-purple-700 font-bold">{vipTier.level5Percent}% Level 5</strong> (up to {vipTier.totalPercent}% Max Cap) network royalties!
            </span>
            <button
              type="button"
              onClick={() => {
                if (onOpenSubscriptionPlans) onOpenSubscriptionPlans();
                window.dispatchEvent(new CustomEvent("cherry_open_subscription_plans"));
              }}
              className="text-[10.5px] font-black text-indigo-700 hover:text-indigo-900 underline whitespace-nowrap cursor-pointer shrink-0"
            >
              Plans →
            </button>
          </div>
        )}
      </div>

      {/* Hero Wallet & Earnings Card - Mobile First High Impact Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-950 text-white p-4 sm:p-5 shadow-md border border-indigo-700/50">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          {/* Main Wallet Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-200 font-semibold flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Available Balance
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  ₹{refState.walletBalance}
                </span>
                <span className="text-[11px] text-indigo-300 font-mono">INR</span>
              </div>
            </div>

            <button
              type="button"
              disabled={refState.isFrozen}
              onClick={() => {
                if (refState.isFrozen) {
                  onToast?.("Account is frozen. Withdrawals cannot be requested.", "error");
                  return;
                }
                setShowWithdrawModal(true);
              }}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                refState.isFrozen
                  ? "bg-slate-800/80 text-slate-400 border-slate-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-emerald-400/30"
              }`}
            >
              {refState.isFrozen ? (
                <>
                  <Snowflake className="w-3.5 h-3.5" />
                  <span>Frozen</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Withdraw UPI</span>
                </>
              )}
            </button>
          </div>

          {/* 3 Micro-Metrics Grid for Mobile */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-indigo-800/80">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 sm:p-2.5 text-center border border-white/10">
              <span className="text-[9px] font-mono uppercase text-emerald-300 block font-bold truncate">
                1st Lvl (Direct)
              </span>
              <span className="text-sm sm:text-base font-black text-white block mt-0.5">
                ₹{level1Earned}
              </span>
              <span className="text-[8.5px] text-indigo-200 block truncate">
                {level1Count} Friends
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 sm:p-2.5 text-center border border-white/10">
              <span className="text-[9px] font-mono uppercase text-purple-300 block font-bold truncate">
                5th Lvl (Indirect)
              </span>
              <span className="text-sm sm:text-base font-black text-white block mt-0.5">
                ₹{level5Earned}
              </span>
              <span className="text-[8.5px] text-indigo-200 block truncate">
                {level5Count} Scholars
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 sm:p-2.5 text-center border border-white/10">
              <span className="text-[9px] font-mono uppercase text-amber-300 block font-bold truncate">
                Total Network
              </span>
              <span className="text-sm sm:text-base font-black text-white block mt-0.5">
                {totalTeamMembers}
              </span>
              <span className="text-[8.5px] text-indigo-200 block truncate">
                5 Tiers
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 1-Tap Share Strip for Mobile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-3">
        {/* WhatsApp Hero Button */}
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <span className="text-base">📲</span>
          <span>Share on WhatsApp & Invite Friends</span>
        </button>

        {/* Telegram & Instant QR Code Action Strip */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleShareTelegram}
            className="py-2.5 px-3 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>✈️</span>
            <span>Telegram</span>
          </button>
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 active:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>Show QR Code</span>
          </button>
        </div>

        {/* Code & Link Side by Side on Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Referral Code Box */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl">
            <div className="min-w-0 pr-2">
              <span className="text-[8.5px] font-mono font-bold uppercase text-slate-400 block">
                Your Referral Code
              </span>
              <span className="text-xs font-mono font-black text-indigo-700 tracking-wider block truncate">
                {refState.referralCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 ${
                copiedCode
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:text-indigo-600"
              }`}
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Link Copy Box */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/90 rounded-xl">
            <div className="min-w-0 pr-2">
              <span className="text-[8.5px] font-mono font-bold uppercase text-slate-400 block">
                Direct Invite Link
              </span>
              <span className="text-[11px] font-mono text-slate-600 truncate block">
                {referralLink}
              </span>
            </div>
            <button
              type="button"
              onClick={handleNativeShare}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 ${
                copiedLink
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:text-indigo-600"
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 3 Step Quick Explainer Ribbon */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
          <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
            <span className="text-xs block">1️⃣</span>
            <span className="text-[9px] font-bold text-slate-700 block leading-tight mt-0.5">
              Share Link
            </span>
            <span className="text-[8px] text-slate-400 block">with Friends</span>
          </div>
          <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
            <span className="text-xs block">2️⃣</span>
            <span className="text-[9px] font-bold text-slate-700 block leading-tight mt-0.5">
              Friend Joins
            </span>
            <span className="text-[8px] text-slate-400 block">Level 1 Direct</span>
          </div>
          <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-100">
            <span className="text-xs block">3️⃣</span>
            <span className="text-[9px] font-black text-emerald-700 block leading-tight mt-0.5">
              Get {referrerTier.level1Percent}% + {referrerTier.level5Percent}%
            </span>
            <span className="text-[8px] text-emerald-600 block">L1 & L5 Payout</span>
          </div>
        </div>
      </div>

      {/* Segmented Sub-Tabs Bar - Horizontal Scrollable & Mobile Ergonomic */}
      <div className="w-full overflow-x-auto flex items-center gap-1.5 p-1.5 bg-slate-100/90 border border-slate-200 rounded-2xl touch-pan-x overscroll-x-contain">
        {[
          { id: "plan", label: "5-Level Plan", icon: Layers },
          { id: "calculator", label: "Income Simulator", icon: TrendingUp },
          { id: "history", label: "History & Logs", icon: Clock },
          { id: "rules", label: "Rules & FAQ", icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer select-none active:scale-95 ${
                isActive
                  ? "bg-white text-indigo-700 shadow-xs font-black border border-slate-200/90"
                  : "text-slate-600 hover:text-slate-900 bg-transparent hover:bg-white/60 border border-transparent"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: 5-LEVEL PLAN STRUCTURE */}
      {activeTab === "plan" && (
        <div className="space-y-2.5">
          <div className="p-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-emerald-50/50 border border-indigo-100 rounded-xl text-slate-800 text-xs flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <span className="font-bold text-indigo-950 block text-[11.5px]">
                  5-Level Income Compensation Architecture
                </span>
                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold border border-indigo-200/60">
                  {referrerTier.label} ({referrerTier.level1Percent}%)
                </span>
              </div>
              <span className="text-slate-600 text-[10.5px] leading-relaxed mt-0.5 block">
                Direct referrals par <strong className="text-emerald-700 font-bold">{referrerTier.level1Percent}%</strong> aur 5th tier indirect network referrals par <strong className="text-purple-700 font-bold">{referrerTier.level5Percent}%</strong> active plan tier ke anusar milte hain.
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {dynamicTiers.map((tier) => {
              const count = refState.tierCounts[tier.level] || 0;
              const earnedFromActivities = (refState.activities || [])
                .filter((a) => a.level === tier.level && a.status === "credited")
                .reduce((acc, curr) => acc + (curr.amount || 0), 0);
              const earned =
                earnedFromActivities > 0
                  ? earnedFromActivities
                  : count *
                    (tier.level === 1
                      ? Math.max(1, Math.round(149 * (referrerTier.level1Percent / 100)))
                      : tier.level === 5
                      ? Math.max(1, Math.round(149 * (referrerTier.level5Percent / 100)))
                      : 0);
              const isEarningLevel = (tier.percentage ?? 0) > 0 || tier.incomePerMember > 0;
              const rateTag =
                tier.rateLabel ||
                (isEarningLevel
                  ? `${tier.percentage || (tier.level === 1 ? referrerTier.level1Percent : referrerTier.level5Percent)}% / student`
                  : "₹0 / student");

              return (
                <div
                  key={tier.level}
                  className={`p-3 rounded-2xl border transition-all shadow-2xs space-y-2 ${
                    isEarningLevel
                      ? tier.level === 1
                        ? "bg-emerald-50/70 border-emerald-200"
                        : "bg-purple-50/70 border-purple-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-mono font-black text-xs shadow-xs shrink-0 bg-gradient-to-tr ${tier.badgeColor}`}
                      >
                        L{tier.level}
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-black text-slate-900 text-xs truncate">
                          {tier.label}
                        </h4>
                        <p className="text-[10px] text-slate-500 truncate">
                          {tier.description}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black shrink-0 ${
                        isEarningLevel
                          ? tier.level === 1
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-purple-100 text-purple-800 border border-purple-300"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {rateTag}
                    </span>
                  </div>

                  {/* Stats Bar */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[10px]">
                    <span className="text-slate-500 font-medium">
                      Active: <strong className="text-slate-800">{count} Students</strong>
                    </span>
                    <span className="font-black">
                      Earned:{" "}
                      <span
                        className={
                          earned > 0
                            ? tier.level === 1
                              ? "text-emerald-700 font-mono font-black text-xs"
                              : "text-purple-700 font-mono font-black text-xs"
                            : "text-slate-400 font-mono font-bold"
                        }
                      >
                        ₹{earned}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subscription Plans Commission Rate Matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  <Percent className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                    Plan Commission Matrix
                  </h4>
                  <span className="text-[10px] text-slate-500 block">
                    Rewards dynamically scale by student's plan price & duration
                  </span>
                </div>
              </div>

              {!isReferrerVip && (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenSubscriptionPlans) onOpenSubscriptionPlans();
                    window.dispatchEvent(new CustomEvent("cherry_open_subscription_plans"));
                  }}
                  className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 cursor-pointer flex items-center gap-0.5"
                >
                  <span>Unlock VIP</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Plan Tier Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subscriptionPlans.map((plan) => {
                const myEarnings = calculateTieredReferralReward({
                  planPriceINR: plan.priceINR,
                  planDurationMonths: plan.durationMonths,
                  planId: plan.id,
                  planName: plan.name,
                  referrerIdOrName: effectiveUid || effectiveName,
                  config: commissionConfig,
                });

                // VIP potential for comparison
                const vipL1 = Math.max(1, Math.round(plan.priceINR * (vipTier.level1Percent / 100)));
                const vipL5 = Math.max(1, Math.round(plan.priceINR * (vipTier.level5Percent / 100)));

                return (
                  <div
                    key={plan.id}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 space-y-1.5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-slate-900 truncate">
                        {plan.name}
                      </span>
                      <span className="text-[11px] font-mono font-black text-indigo-700 shrink-0">
                        ₹{plan.priceINR}
                      </span>
                    </div>

                    {/* Level 1 & Level 5 Row */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-slate-200/60">
                      <div className="bg-white rounded-lg p-1.5 border border-slate-100 text-center">
                        <span className="text-[8.5px] font-mono uppercase text-slate-400 block">
                          Level 1 (Direct)
                        </span>
                        <span className="font-mono font-black text-emerald-700 text-xs">
                          ₹{myEarnings.level1Reward}
                        </span>
                        <span className="text-[8px] text-slate-400 block">
                          ({myEarnings.level1Percent}%)
                        </span>
                      </div>

                      <div className="bg-white rounded-lg p-1.5 border border-slate-100 text-center">
                        <span className="text-[8.5px] font-mono uppercase text-slate-400 block">
                          Level 5 (Team)
                        </span>
                        <span
                          className={`font-mono font-black text-xs ${
                            myEarnings.level5Reward > 0 ? "text-purple-700" : "text-slate-400"
                          }`}
                        >
                          ₹{myEarnings.level5Reward}
                        </span>
                        <span className="text-[8px] text-slate-400 block">
                          ({myEarnings.level5Percent}%)
                        </span>
                      </div>
                    </div>

                    {!isReferrerVip && vipL1 > myEarnings.level1Reward && (
                      <div className="text-[9px] text-amber-800 font-medium text-center bg-amber-50 rounded-md py-0.5 border border-amber-200/60">
                        On {vipTier.label} VIP: <strong className="text-amber-950 font-mono">₹{vipL1} L1 + ₹{vipL5} L5</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POTENTIAL INCOME SIMULATOR */}
      {activeTab === "calculator" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3.5">
          <div className="space-y-0.5">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              5-Level Compounding Income Simulator
            </h3>
            <p className="text-[11px] text-slate-500">
              Check potential earnings from 1st and 5th Level network growth based on chosen plan.
            </p>
          </div>

          {/* Plan Selector for Simulator */}
          <div className="space-y-1.5 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
            <div className="flex items-center justify-between text-[9.5px] font-mono font-bold uppercase tracking-wider text-indigo-900">
              <span>Select Student Plan:</span>
              <span className="text-indigo-600 lowercase font-sans font-semibold">
                rewards scale with price
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 touch-pan-x overscroll-x-contain">
              {subscriptionPlans.map((p) => {
                const isSelected = p.id === calcSelectedPlanId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCalcSelectedPlanId(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 shrink-0 ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="ml-1 opacity-80 font-mono">₹{p.priceINR}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            {/* Slider 1 */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>1st Level Direct Invites:</span>
                <span className="text-emerald-700 font-black font-mono">
                  {calcDirectInvites} Friends (₹{calcLevel1Earned})
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={calcDirectInvites}
                onChange={(e) => setCalcDirectInvites(parseInt(e.target.value))}
                className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex gap-1.5 pt-0.5">
                {[3, 5, 10, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCalcDirectInvites(num)}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold font-mono transition-all cursor-pointer ${
                      calcDirectInvites === num
                        ? "bg-emerald-600 text-white"
                        : "bg-white border border-slate-200 text-slate-600"
                    }`}
                  >
                    {num} Invites
                  </button>
                ))}
              </div>
            </div>

            {/* Slider 2 */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Team Duplication (per student):</span>
                <span className="text-purple-700 font-black font-mono">
                  {calcDuplicationRate} Invites/friend
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="5"
                value={calcDuplicationRate}
                onChange={(e) => setCalcDuplicationRate(parseInt(e.target.value))}
                className="w-full accent-purple-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                5th Level Network reaches ~<strong>{calcLevel5Members.toLocaleString()}</strong> students
              </span>
            </div>
          </div>

          {/* Calculator Output Grid */}
          <div className="p-3 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-indigo-200 block">
                Estimated Potential ({referrerTier.label}):
              </span>
              <span className="text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded-full text-indigo-200">
                {calcRewardBreakdown.level1Percent}% L1 / {calcRewardBreakdown.level5Percent}% L5
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 border border-white/10">
                <span className="text-[8px] font-mono text-emerald-300 uppercase font-bold block truncate">
                  1st Level (Direct)
                </span>
                <span className="text-xs sm:text-sm font-black text-white mt-0.5 block truncate">
                  ₹{calcLevel1Earned.toLocaleString()}
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 border border-white/10">
                <span className="text-[8px] font-mono text-purple-300 uppercase font-bold block truncate">
                  5th Level (Team)
                </span>
                <span className="text-xs sm:text-sm font-black text-white mt-0.5 block truncate">
                  ₹{calcLevel5Earned.toLocaleString()}
                </span>
              </div>

              <div className="bg-emerald-500 text-white rounded-xl p-2 shadow-xs border border-emerald-400/40">
                <span className="text-[8px] font-mono text-emerald-100 uppercase font-bold block truncate">
                  Total ₹
                </span>
                <span className="text-xs sm:text-sm font-black text-white mt-0.5 block truncate">
                  ₹{calcTotalPotential.toLocaleString()}
                </span>
              </div>
            </div>

            {/* VIP Comparison Banner inside Simulator */}
            {!isReferrerVip && calcVipUpgradeDifference > 0 && (
              <div className="p-2 bg-white/10 backdrop-blur-xs border border-amber-400/40 rounded-xl flex items-center justify-between gap-2 mt-1">
                <div className="min-w-0">
                  <span className="text-[9px] text-amber-300 font-mono font-bold uppercase block">
                    👑 {vipTier.label} VIP Earning Potential:
                  </span>
                  <span className="text-[11px] font-black text-white">
                    ₹{calcVipTotalPotential.toLocaleString()}{" "}
                    <span className="text-emerald-300 text-[10px] font-bold font-mono">
                      (+₹{calcVipUpgradeDifference.toLocaleString()} extra)
                    </span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onOpenSubscriptionPlans) onOpenSubscriptionPlans();
                    window.dispatchEvent(new CustomEvent("cherry_open_subscription_plans"));
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-950 font-black text-[10px] uppercase tracking-wider shadow-xs active:scale-95 cursor-pointer shrink-0"
                >
                  Upgrade VIP
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVITY & WITHDRAWAL LOGS */}
      {activeTab === "history" && (
        <div className="space-y-3">
          {/* Referral Activities */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-2.5">
            <h4 className="text-xs font-black uppercase font-mono tracking-wider text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Referral Activity
            </h4>

            {refState.activities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No referral activity recorded yet.</p>
            ) : (
              <div className="space-y-1.5">
                {refState.activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-lg text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 ${
                          act.level === 1
                            ? "bg-emerald-600"
                            : act.level === 5
                            ? "bg-purple-600"
                            : "bg-slate-400"
                        }`}
                      >
                        L{act.level}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate text-[11px]">{act.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono block truncate">
                          Level {act.level} • {act.date}
                          {act.planName ? ` • ${act.planName}` : ""}
                          {act.appliedPercent ? ` (${act.appliedPercent}%)` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-black text-xs block ${
                          act.amount > 0 ? "text-emerald-600 font-mono" : "text-slate-400 font-mono"
                        }`}
                      >
                        {act.amount > 0 ? `+₹${act.amount}` : "₹0"}
                      </span>
                      <span className="text-[8.5px] text-emerald-700 font-mono uppercase font-bold">
                        {act.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Withdrawal Logs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-2.5">
            <h4 className="text-xs font-black uppercase font-mono tracking-wider text-slate-900 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-indigo-600" />
              UPI Withdrawal History
            </h4>

            {refState.withdrawals.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No withdrawals requested yet.</p>
            ) : (
              <div className="space-y-2">
                {refState.withdrawals.map((w) => {
                  const isPending = w.status === "pending" || w.status === "processing";
                  const isPaid = w.status === "successful";
                  const isRejected = w.status === "rejected";

                  return (
                    <div
                      key={w.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isPending
                          ? "bg-amber-50/50 border-amber-200"
                          : isPaid
                          ? "bg-slate-50 border-slate-200/80"
                          : "bg-rose-50/40 border-rose-200"
                      }`}
                    >
                      <div className="min-w-0 pr-2 space-y-0.5">
                        <span className="font-bold text-slate-900 block text-[11px] truncate font-mono">
                          {w.upiId}
                        </span>
                        <div className="text-[9px] text-slate-400 font-mono block">
                          {w.referenceId} • {w.date}
                        </div>
                        {isPaid && w.utrNumber && (
                          <div className="text-[9.5px] text-emerald-700 font-mono font-medium">
                            UTR: {w.utrNumber}
                          </div>
                        )}
                        {isRejected && (
                          <div className="text-[9.5px] text-rose-600 font-medium">
                            Refunded: {w.rejectionReason || "Verification failed"}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-black text-xs font-mono block ${
                            isRejected ? "text-slate-400 line-through" : "text-rose-600"
                          }`}
                        >
                          -₹{w.amount}
                        </span>
                        {isPending && (
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold font-mono inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            Under Review
                          </span>
                        )}
                        {isPaid && (
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold font-mono">
                            Paid ✓
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold font-mono">
                            Refunded ↩
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: RULES & FAQ */}
      {activeTab === "rules" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-2.5 text-xs text-slate-700 leading-relaxed">
          <h4 className="font-black text-xs uppercase font-mono tracking-wider text-slate-900 pb-1 border-b border-slate-100">
            Rules & FAQ
          </h4>

          <div className="space-y-2 text-[11px]">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <strong className="text-slate-900 block font-bold mb-0.5">
                1. Plan-Wise Percentage Earning (1st Level Direct):
              </strong>
              <p className="text-slate-600">
                Aapke invite code se join hone wale student jo plan chunte hain, uske price ka {activePlanTiers[0]?.level1Percent}% se {vipTier.level1Percent}% commission turant aapke wallet me credit hota hai. Commission rate aapke active plan tier par depend karta hai.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <strong className="text-slate-900 block font-bold mb-0.5">
                2. 2nd, 3rd, 4th Levels (Network Bridge):
              </strong>
              <p className="text-slate-600">
                Ye intermediary tiers hain jo aapki team ko 5th tier tak expand karte hain bina kisi extra condition ke.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <strong className="text-slate-900 block font-bold mb-0.5">
                3. 5th Level (Team Indirect Royalty up to {vipTier.level5Percent}%):
              </strong>
              <p className="text-slate-600">
                Jab 4th level ke students aage referral karte hain, toh team growth par aapko {activePlanTiers[0]?.level5Percent}% se {vipTier.level5Percent}% indirect royalty income milti hai.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <strong className="text-slate-900 block font-bold mb-0.5">
                4. Why Upgrade to {vipTier.label} VIP Plan?
              </strong>
              <p className="text-slate-600">
                {vipTier.label} plan lene par aapko maximum {vipTier.level1Percent}% Direct Level 1 + {vipTier.level5Percent}% Indirect Level 5 commission (total {vipTier.totalPercent}% cap) unlock hota hai, jisse aapki har referral par maximum network income generate hoti hai.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <strong className="text-slate-900 block font-bold mb-0.5">
                5. Instant UPI Withdrawal:
              </strong>
              <p className="text-slate-600">
                Minimum ₹{commissionConfig.minWithdrawalLimit || 50} balance hone par kisi bhi UPI ID (Google Pay, PhonePe, Paytm, BHIM) par 1-click me withdraw request kar sakte hain.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAWAL MODAL - Mobile First Bottom Sheet / Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3.5 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">UPI Withdrawal Request</h4>
                  <span className="text-[10px] text-emerald-700 font-mono font-bold">
                    Available: ₹{refState.walletBalance}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1.5 cursor-pointer rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-bold text-slate-600 block">
                  Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min={commissionConfig.minWithdrawalLimit || 50}
                  max={refState.walletBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  placeholder={`Min ₹${commissionConfig.minWithdrawalLimit || 50}`}
                />

                {/* Quick Amount Chips */}
                <div className="flex gap-1.5 pt-1">
                  {[commissionConfig.minWithdrawalLimit || 50, 100, 200, refState.walletBalance].map((val, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setWithdrawAmount(String(val))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-mono font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      {val === refState.walletBalance ? `All (₹${val})` : `₹${val}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-bold text-slate-600 block">
                  UPI ID (Google Pay / PhonePe / Paytm / BHIM)
                </label>
                <input
                  type="text"
                  required
                  value={withdrawUpi}
                  onChange={(e) => setWithdrawUpi(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                />
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[10.5px] text-emerald-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Instant verification & payout direct to your UPI handle.</span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={refState.walletBalance < (commissionConfig.minWithdrawalLimit || 50)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer active:scale-95"
                >
                  Transfer ₹{withdrawAmount || "0"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHASE 4: INSTANT IN-CLASSROOM REFERRAL QR CODE MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#796AEF] flex items-center justify-center font-bold text-xs">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Invite QR Code
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Scan with any phone camera
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Frame Container */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 flex flex-col items-center justify-center space-y-3">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Referral QR Code"
                  className="w-52 h-52 rounded-xl bg-white p-2 shadow-xs border border-slate-200"
                />
              ) : (
                <div className="w-52 h-52 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-slate-900">{refState.studentName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-[#796AEF] border border-indigo-200 font-mono text-[10px] font-black uppercase">
                    {refState.referralCode}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 font-medium">
                  Friends scan to get instant access & up to 67% referral rewards!
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-[#796AEF] border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (qrDataUrl) {
                    const link = document.createElement("a");
                    link.href = qrDataUrl;
                    link.download = `CherryAI_Invite_${refState.referralCode}.png`;
                    link.click();
                    onToast?.("QR Code downloaded! 🖼️", "success");
                  }
                }}
                className="py-2.5 px-3 bg-[#796AEF] hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save QR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
