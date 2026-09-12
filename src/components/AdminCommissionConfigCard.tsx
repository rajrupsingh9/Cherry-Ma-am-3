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
} from "lucide-react";
import {
  ReferralCommissionConfig,
  DEFAULT_REFERRAL_COMMISSION_CONFIG,
  getReferralCommissionConfig,
  saveReferralCommissionConfig,
  saveCommissionConfigToCloud,
  syncCommissionConfigFromCloud,
} from "../utils/referralStore";

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
  }, []);

  // Track unsaved modifications
  useEffect(() => {
    const changed =
      level1Input !== config.level1Reward ||
      level5Input !== config.level5Reward ||
      minWithdrawalInput !== config.minWithdrawalLimit;
    setHasChanges(changed);
  }, [level1Input, level5Input, minWithdrawalInput, config]);

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

    setIsSaving(true);
    try {
      const updated: ReferralCommissionConfig = {
        ...config,
        level1Reward: Math.round(level1Input),
        level5Reward: Math.round(level5Input),
        minWithdrawalLimit: Math.round(minWithdrawalInput),
        updatedBy: "Admin",
      };

      // Save locally & persist to Firestore Cloud
      saveReferralCommissionConfig(updated);
      setConfig(updated);
      setHasChanges(false);

      const cloudRes = await saveCommissionConfigToCloud(updated);
      if (cloudRes.success) {
        setSyncStatus(`Cloud Synced: ${new Date().toLocaleTimeString()}`);
        onToast?.(
          `Commission Rates Updated: Direct = ₹${updated.level1Reward}, Indirect = ₹${updated.level5Reward} (Saved to Cloud ☁️)`,
          "success"
        );
      } else {
        setSyncStatus("Saved locally (offline mode)");
        onToast?.(`Commission rates updated locally: Direct = ₹${updated.level1Reward}, Indirect = ₹${updated.level5Reward}`, "info");
      }

      if (onConfigSaved) onConfigSaved();
    } catch (e: any) {
      onToast?.(`Failed to save commission rates: ${e?.message || "Error"}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setLevel1Input(DEFAULT_REFERRAL_COMMISSION_CONFIG.level1Reward);
    setLevel5Input(DEFAULT_REFERRAL_COMMISSION_CONFIG.level5Reward);
    setMinWithdrawalInput(DEFAULT_REFERRAL_COMMISSION_CONFIG.minWithdrawalLimit);
    saveReferralCommissionConfig(DEFAULT_REFERRAL_COMMISSION_CONFIG);
    setConfig(DEFAULT_REFERRAL_COMMISSION_CONFIG);
    await saveCommissionConfigToCloud(DEFAULT_REFERRAL_COMMISSION_CONFIG);
    setHasChanges(false);
    setSyncStatus(`Reset to Defaults: ₹50 + ₹50`);
    onToast?.("Commission rates restored to default: Level 1 = ₹50, Level 5 = ₹50 🔄", "info");
    if (onConfigSaved) onConfigSaved();
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
                Level 1 &amp; Level 5 Live Control
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Set direct income (1st Level), team indirect income (5th Level), and minimum withdrawal limits.
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
            title="Reset to ₹50 Direct + ₹50 Team"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset (₹50)</span>
          </button>
        </div>
      </div>

      {/* Main Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Tier 1: Direct Income */}
        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <label className="text-xs font-bold text-emerald-950">1st Level (Direct Income)</label>
            </div>
            <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.2 bg-emerald-200/60 text-emerald-800 rounded">
              Direct Referral
            </span>
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700 font-bold text-sm">₹</div>
            <input
              type="number"
              min={0}
              step={5}
              value={level1Input}
              onChange={(e) => setLevel1Input(Number(e.target.value))}
              className="w-full pl-7 pr-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-black text-emerald-950 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              placeholder="50"
            />
          </div>
          <p className="text-[10px] text-emerald-800/90 leading-tight">
            Credited instantly to student's wallet whenever a friend uses their invite code.
          </p>
        </div>

        {/* Tier 2-4: Bridge Tiers (Info Strip) */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">2nd, 3rd, 4th Levels</span>
            </div>
            <span className="text-[9.5px] font-bold text-slate-500 px-1.5 py-0.2 bg-slate-200 rounded">
              Bridge Tiers
            </span>
          </div>

          <div className="py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 flex items-center justify-between">
            <span>Commission per invite:</span>
            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">₹0 (Bridge)</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Motivational bridge tiers leading scholars directly toward the 5th Level milestone bonus.
          </p>
        </div>

        {/* Tier 5: Indirect Income */}
        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/80 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#796AEF]" />
              <label className="text-xs font-bold text-indigo-950">5th Level (Indirect Income)</label>
            </div>
            <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.2 bg-indigo-200/60 text-indigo-800 rounded">
              Team Milestone
            </span>
          </div>

          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-700 font-bold text-sm">₹</div>
            <input
              type="number"
              min={0}
              step={5}
              value={level5Input}
              onChange={(e) => setLevel5Input(Number(e.target.value))}
              className="w-full pl-7 pr-3 py-2 bg-white border border-indigo-300 rounded-lg text-sm font-black text-indigo-950 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
              placeholder="50"
            />
          </div>
          <p className="text-[10px] text-indigo-800/90 leading-tight">
            Bonus payout earned whenever any student in their 4th-level network brings a new invite.
          </p>
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
            <span>{isSaving ? "Saving..." : "Save Commission Rates to Cloud"}</span>
          </button>
        </div>
      </div>

      {/* Live Preview Strip */}
      <div className="p-2.5 bg-gradient-to-r from-slate-50 to-indigo-50/50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-[11px] flex-wrap">
        <div className="flex items-center gap-2 text-slate-600">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            Active Formula: <strong>1st Level = ₹{level1Input}</strong> + <strong>Bridge = ₹0</strong> +{" "}
            <strong>5th Level = ₹{level5Input}</strong>
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
