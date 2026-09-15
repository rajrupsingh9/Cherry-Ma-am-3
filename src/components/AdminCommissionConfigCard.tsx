import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Save,
  RotateCcw,
  Cloud,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Layers,
  ArrowRight,
  TrendingUp,
  Sliders,
  Crown,
  Percent,
  ShieldCheck,
} from "lucide-react";
import {
  ReferralCommissionConfig,
  DEFAULT_REFERRAL_COMMISSION_CONFIG,
  getReferralCommissionConfig,
  saveReferralCommissionConfig,
  saveCommissionConfigToCloud,
  syncCommissionConfigFromCloud,
  PlanReferralTier,
  DEFAULT_PLAN_REFERRAL_TIERS,
  getPlanReferralTiers,
  validatePlanReferralTiers,
  createDefaultTierForPlan,
} from "../utils/referralStore";
import { getActiveSubscriptionPlans } from "../utils/subscriptionStore";

interface AdminCommissionConfigCardProps {
  onToast?: (msg: string, type?: "success" | "info" | "warning" | "error") => void;
  onConfigSaved?: () => void;
}

export const AdminCommissionConfigCard: React.FC<AdminCommissionConfigCardProps> = ({
  onToast,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<ReferralCommissionConfig>(() => getReferralCommissionConfig());
  const [level1Input, setLevel1Input] = useState<number>(50);
  const [level5Input, setLevel5Input] = useState<number>(50);
  const [minWithdrawalInput, setMinWithdrawalInput] = useState<number>(50);
  const [tiersInput, setTiersInput] = useState<PlanReferralTier[]>(() =>
    getPlanReferralTiers(getReferralCommissionConfig())
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("Synced with Local State");

  // Load and populate fields
  useEffect(() => {
    const current = getReferralCommissionConfig();
    setConfig(current);
    setLevel1Input(current.level1Reward);
    setLevel5Input(current.level5Reward);
    setMinWithdrawalInput(current.minWithdrawalLimit || 50);
    setTiersInput(getPlanReferralTiers(current));
  }, []);

  // Real-time listener: When Admin adds, edits, or deletes plans in Plan & Pricing, reflect instantly
  useEffect(() => {
    const handlePlansUpdated = () => {
      const current = getReferralCommissionConfig();
      const syncedTiers = getPlanReferralTiers(current);
      setTiersInput(syncedTiers);
      setSyncStatus(`Auto-synced with ${syncedTiers.length} Active Plans`);
    };

    window.addEventListener("cherry_plans_updated", handlePlansUpdated);
    window.addEventListener("cherry_referral_commission_updated", handlePlansUpdated);
    return () => {
      window.removeEventListener("cherry_plans_updated", handlePlansUpdated);
      window.removeEventListener("cherry_referral_commission_updated", handlePlansUpdated);
    };
  }, []);

  // Track unsaved modifications
  useEffect(() => {
    const activeConfigTiers = config.planTiers || DEFAULT_PLAN_REFERRAL_TIERS;
    const tiersChanged =
      JSON.stringify(tiersInput.map((t) => ({ id: t.tierId, l1: t.level1Percent, l5: t.level5Percent }))) !==
      JSON.stringify(activeConfigTiers.map((t) => ({ id: t.tierId, l1: t.level1Percent, l5: t.level5Percent })));

    const changed =
      minWithdrawalInput !== config.minWithdrawalLimit ||
      tiersChanged;
    setHasChanges(changed);
  }, [minWithdrawalInput, tiersInput, config]);

  const handleTierPercentageChange = (
    tierIdentifier: string | number,
    field: "level1Percent" | "level5Percent",
    val: number
  ) => {
    setTiersInput((prev) =>
      prev.map((t) => {
        const match =
          t.tierId === tierIdentifier ||
          t.planId === tierIdentifier ||
          t.durationMonths === tierIdentifier;
        if (!match) return t;
        const updatedL1 = field === "level1Percent" ? val : t.level1Percent;
        const updatedL5 = field === "level5Percent" ? val : t.level5Percent;
        return {
          ...t,
          level1Percent: updatedL1,
          level5Percent: updatedL5,
          totalPercent: updatedL1 + updatedL5,
        };
      })
    );
  };

  const handleResetTierDefaults = () => {
    try {
      const activePlans = getActiveSubscriptionPlans();
      if (activePlans && activePlans.length > 0) {
        const resetTiers = activePlans.map(createDefaultTierForPlan);
        const maxDur = Math.max(...resetTiers.map((t) => t.durationMonths || 1), 12);
        const finalTiers = resetTiers.map((t) => ({
          ...t,
          isMaxVip: t.durationMonths === maxDur || t.durationMonths >= 12,
        }));
        setTiersInput(finalTiers);
        onToast?.(`Tier multipliers reset for ${finalTiers.length} active plans! 🔄`, "info");
        return;
      }
    } catch {
      // fallback
    }
    setTiersInput(DEFAULT_PLAN_REFERRAL_TIERS);
    onToast?.("Tier multipliers reset to platform defaults! 🔄", "info");
  };

  const handleSave = async () => {
    if (level1Input < 0 || isNaN(level1Input)) {
      onToast?.("1st Level (Direct) reward must be a valid amount (>= ₹0).", "error");
      return;
    }
    if (level5Input < 0 || isNaN(level5Input)) {
      onToast?.("5th Level (Indirect) reward must be a valid amount (>= ₹0).", "error");
      return;
    }
    if (minWithdrawalInput < 10 || isNaN(minWithdrawalInput)) {
      onToast?.("Minimum withdrawal limit must be at least ₹10.", "error");
      return;
    }

    // Validate custom tier percentages
    const tierValidation = validatePlanReferralTiers(tiersInput);
    if (!tierValidation.isValid || !tierValidation.sanitizedTiers) {
      onToast?.(tierValidation.errors[0] || "Invalid plan tier percentages.", "error");
      return;
    }

    setIsSaving(true);
    try {
      const vipTier =
        tierValidation.sanitizedTiers.find((t) => t.isMaxVip) ||
        tierValidation.sanitizedTiers[tierValidation.sanitizedTiers.length - 1];

      const updated: ReferralCommissionConfig = {
        ...config,
        level1Reward: Math.round(level1Input),
        level5Reward: Math.round(level5Input),
        minWithdrawalLimit: Math.round(minWithdrawalInput),
        planTiers: tierValidation.sanitizedTiers,
        promoTagline: `Refer & Earn: Up to ${vipTier.level1Percent}% Direct + ${vipTier.level5Percent}% Team Royalty (Max ${vipTier.totalPercent}%) on ${vipTier.label}!`,
        updatedBy: "Admin",
      };

      // Save locally & persist to Firestore Cloud
      saveReferralCommissionConfig(updated);
      setConfig(updated);
      setTiersInput(tierValidation.sanitizedTiers);
      setHasChanges(false);

      const cloudRes = await saveCommissionConfigToCloud(updated);
      if (cloudRes.success) {
        setSyncStatus(`Cloud Synced: ${new Date().toLocaleTimeString()}`);
        onToast?.(
          `Commission & Tier Multipliers Saved to Cloud! ☁️ (${tierValidation.sanitizedTiers.length} Plans configured)`,
          "success"
        );
      } else {
        setSyncStatus("Saved locally (offline mode)");
        onToast?.(
          `Commission rates & tier multipliers updated locally! (${tierValidation.sanitizedTiers.length} Plans)`,
          "info"
        );
      }

      if (onConfigSaved) onConfigSaved();
    } catch (e: any) {
      onToast?.(`Failed to save commission rates: ${e?.message || "Error"}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    try {
      const currentPlans = getActiveSubscriptionPlans();
      const defaultTiers = currentPlans.map(createDefaultTierForPlan);
      const resetCfg: ReferralCommissionConfig = {
        ...DEFAULT_REFERRAL_COMMISSION_CONFIG,
        planTiers: defaultTiers.length > 0 ? defaultTiers : DEFAULT_PLAN_REFERRAL_TIERS,
      };
      setLevel1Input(resetCfg.level1Reward);
      setLevel5Input(resetCfg.level5Reward);
      setMinWithdrawalInput(resetCfg.minWithdrawalLimit || 50);
      setTiersInput(resetCfg.planTiers || DEFAULT_PLAN_REFERRAL_TIERS);
      saveReferralCommissionConfig(resetCfg);
      setConfig(resetCfg);
      await saveCommissionConfigToCloud(resetCfg);
      setHasChanges(false);
      setSyncStatus(`Reset to Platform Defaults (${defaultTiers.length} Plans)`);
      onToast?.("Commission rates & tier multipliers restored to default! 🔄", "info");
      if (onConfigSaved) onConfigSaved();
    } catch {
      setLevel1Input(DEFAULT_REFERRAL_COMMISSION_CONFIG.level1Reward);
      setLevel5Input(DEFAULT_REFERRAL_COMMISSION_CONFIG.level5Reward);
      setMinWithdrawalInput(DEFAULT_REFERRAL_COMMISSION_CONFIG.minWithdrawalLimit);
      setTiersInput(DEFAULT_PLAN_REFERRAL_TIERS);
      saveReferralCommissionConfig(DEFAULT_REFERRAL_COMMISSION_CONFIG);
      setConfig(DEFAULT_REFERRAL_COMMISSION_CONFIG);
      await saveCommissionConfigToCloud(DEFAULT_REFERRAL_COMMISSION_CONFIG);
      setHasChanges(false);
      setSyncStatus(`Reset to Defaults: Flat ₹50 + Standard Tiers (37%-67%)`);
      onToast?.("Commission rates & tier multipliers restored to default! 🔄", "info");
      if (onConfigSaved) onConfigSaved();
    }
  };

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await syncCommissionConfigFromCloud();
      if (res.success) {
        setConfig(res.config);
        setLevel1Input(res.config.level1Reward);
        setLevel5Input(res.config.level5Reward);
        setMinWithdrawalInput(res.config.minWithdrawalLimit || 50);
        setTiersInput(getPlanReferralTiers(res.config));
        setHasChanges(false);
        setSyncStatus(`Cloud Fetched: ${new Date().toLocaleTimeString()}`);
        onToast?.(res.message, "success");
        if (onConfigSaved) onConfigSaved();
      } else {
        onToast?.(res.message, "info");
      }
    } catch (err: any) {
      onToast?.(`Sync failed: ${err?.message || "Unknown error"}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-4 space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#796AEF] flex items-center justify-center font-bold">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Commission &amp; Payout Policy Configurator
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                Multipliers ({tiersInput[0]?.totalPercent || 37}% - {tiersInput[tiersInput.length - 1]?.totalPercent || 67}%) • {tiersInput.length} Plans
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Set direct income (Level 1) and team royalty (Level 5) multipliers dynamically across all active subscription plans.
            </p>
          </div>
        </div>

        {/* Sync & Reset Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleSyncCloud}
            disabled={isSyncing}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Fetch latest commission rates from Firestore Cloud"
          >
            <Cloud className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-[#796AEF]" : "text-indigo-600"}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Cloud"}</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Reset to default tier multipliers across active plans"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Plan Referral Tier Multipliers Dynamic Matrix */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#796AEF] flex items-center justify-center font-bold shrink-0">
              <Percent className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Plan Referral Tier Multipliers (Live %)
                </h4>
                <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {tiersInput.length} Active Plans Connected
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500">
                Direct (L1 %) and Team Royalty (L5 %) applied automatically to student referrals. New plans created in Plan &amp; Pricing appear here dynamically.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetTierDefaults}
            className="self-start sm:self-auto text-[10.5px] font-bold text-[#796AEF] hover:text-indigo-800 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer"
            title="Reset tier percentages to defaults across all active plans"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Tiers ({tiersInput[0]?.level1Percent || 22}/{tiersInput[0]?.level5Percent || 15} - {tiersInput[tiersInput.length - 1]?.level1Percent || 37}/{tiersInput[tiersInput.length - 1]?.level5Percent || 30})</span>
          </button>
        </div>

        {/* Dynamic Responsive Grid for all Active Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {tiersInput.map((tier) => {
            const totalCap = (Number(tier.level1Percent) || 0) + (Number(tier.level5Percent) || 0);
            const companyMargin = Math.max(0, 100 - totalCap);
            const isVip = Boolean(tier.isMaxVip || tier.durationMonths >= 12);
            const price = tier.priceINR || 0;
            const l1Est = price > 0 ? Math.round((price * (Number(tier.level1Percent) || 0)) / 100) : null;
            const l5Est = price > 0 ? Math.round((price * (Number(tier.level5Percent) || 0)) / 100) : null;

            return (
              <div
                key={tier.tierId || `tier_${tier.durationMonths}`}
                className={`p-3 rounded-xl border transition-all relative space-y-2.5 ${
                  isVip
                    ? "bg-gradient-to-b from-amber-50/50 to-white border-amber-300/80 shadow-2xs"
                    : "bg-slate-50/50 border-slate-200"
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isVip ? (
                      <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#796AEF] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-slate-900 truncate">
                          {tier.label}
                        </span>
                        {price > 0 && (
                          <span className="text-[9px] font-bold text-slate-600 bg-slate-200/70 px-1 py-0.2 rounded font-mono">
                            ₹{price}
                          </span>
                        )}
                      </div>
                      {tier.planName && tier.planName !== tier.label && (
                        <p className="text-[9.5px] text-slate-500 truncate leading-tight">
                          {tier.planName}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                      isVip
                        ? "bg-amber-200/80 text-amber-900"
                        : "bg-indigo-100 text-indigo-800"
                    }`}
                  >
                    {tier.badge}
                  </span>
                </div>

                {/* Level 1 & Level 5 Inputs */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Level 1 (Direct %) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-900 flex items-center justify-between">
                      <span>L1 Direct:</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={70}
                        value={tier.level1Percent}
                        onChange={(e) =>
                          handleTierPercentageChange(
                            tier.tierId || tier.planId || tier.durationMonths,
                            "level1Percent",
                            Number(e.target.value)
                          )
                        }
                        className="w-full pr-6 pl-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-black text-emerald-950 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-700">
                        %
                      </span>
                    </div>
                    {l1Est !== null && (
                      <div className="text-[9px] text-emerald-700 font-bold font-mono text-center">
                        ≈ ₹{l1Est}/sale
                      </div>
                    )}
                  </div>

                  {/* Level 5 (Team Royalty %) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-indigo-900 flex items-center justify-between">
                      <span>L5 Royalty:</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={tier.level5Percent}
                        onChange={(e) =>
                          handleTierPercentageChange(
                            tier.tierId || tier.planId || tier.durationMonths,
                            "level5Percent",
                            Number(e.target.value)
                          )
                        }
                        className="w-full pr-6 pl-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-black text-indigo-950 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-700">
                        %
                      </span>
                    </div>
                    {l5Est !== null && (
                      <div className="text-[9px] text-indigo-700 font-bold font-mono text-center">
                        ≈ ₹{l5Est}/sale
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Computed Stats Bar */}
                <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-600 font-semibold">
                    Cap:{" "}
                    <strong className={totalCap > 70 ? "text-rose-600" : "text-slate-900"}>
                      {totalCap}%
                    </strong>
                  </span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                    Margin: {companyMargin}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Policy Setting & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Min Withdrawal Limit */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Min. Withdrawal Threshold:</span>
          <div className="relative w-28">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
            <input
              type="number"
              min={10}
              step={10}
              value={minWithdrawalInput}
              onChange={(e) => setMinWithdrawalInput(Number(e.target.value))}
              className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:border-[#796AEF] focus:bg-white"
            />
          </div>
        </div>

        {/* Save to Cloud Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {hasChanges && (
            <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Unsaved changes</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              hasChanges
                ? "bg-[#796AEF] hover:bg-indigo-700 text-white animate-pulse"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            }`}
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? "animate-spin" : ""}`} />
            <span>{isSaving ? "Saving..." : "Save All Rates & Tiers to Cloud"}</span>
          </button>
        </div>
      </div>

      {/* Live Preview Strip */}
      <div className="p-2.5 bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-[11px] flex-wrap">
        <div className="flex items-center gap-2 text-slate-600">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            Active Formula:{" "}
            <strong>
              Tiers: {tiersInput[0]?.totalPercent || 37}% ({tiersInput[0]?.label || "Base"}) to {tiersInput[tiersInput.length - 1]?.totalPercent || 67}% ({tiersInput[tiersInput.length - 1]?.label || "VIP"}) • {tiersInput.length} Plans Active
            </strong>{" "}
            • Min Payout: ₹{minWithdrawalInput}
          </span>
          <span className="text-slate-400">• {syncStatus}</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
          Firestore: /systemSettings/referralConfig
        </span>
      </div>
    </div>
  );
};
