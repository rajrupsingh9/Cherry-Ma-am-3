/**
 * referralStore.ts - Refer & Earn 5-Level Plan Engine
 * Dynamic Commission Configuration & Payout Engine for Cherry AI Classroom
 * Level 1 (Direct Income) & Level 5 (Indirect Income) are dynamically configurable by Admin
 */

import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getActiveSubscriptionPlans, SubscriptionPlan } from "./subscriptionStore";

export interface PlanReferralTier {
  durationMonths: number;
  tierId: string;
  planId?: string;
  label: string;
  planName: string;
  badge: string;
  priceINR?: number;
  level1Percent: number; // e.g. 22, 27, 32, 37
  level5Percent: number; // e.g. 15, 20, 25, 30
  totalPercent: number; // e.g. 37, 47, 57, 67 (Max Cap)
  isMaxVip?: boolean;
}

export const DEFAULT_PLAN_REFERRAL_TIERS: PlanReferralTier[] = [
  {
    durationMonths: 1,
    tierId: "tier_1m",
    label: "1 Month Plan",
    planName: "Monthly Pro Pass",
    badge: "Starter Tier",
    level1Percent: 22,
    level5Percent: 15,
    totalPercent: 37,
  },
  {
    durationMonths: 3,
    tierId: "tier_3m",
    label: "3 Months Plan",
    planName: "Exam Booster Special",
    badge: "Booster Tier",
    level1Percent: 27,
    level5Percent: 20,
    totalPercent: 47,
  },
  {
    durationMonths: 6,
    tierId: "tier_6m",
    label: "6 Months Special Pass",
    planName: "6 Months Special Pass",
    badge: "Pro Scholar Tier",
    level1Percent: 32,
    level5Percent: 25,
    totalPercent: 57,
  },
  {
    durationMonths: 12,
    tierId: "tier_12m",
    label: "12 Months Master Pro",
    planName: "Annual All-Access Master",
    badge: "VIP Master Ambassador",
    level1Percent: 37,
    level5Percent: 30,
    totalPercent: 67,
    isMaxVip: true,
  },
];

export const PLAN_REFERRAL_TIERS = DEFAULT_PLAN_REFERRAL_TIERS;

export interface ReferralCommissionConfig {
  level1Reward: number; // Direct Income fallback (Default: Rs. 50)
  level2Reward: number; // Bridge (Default: Rs. 0)
  level3Reward: number; // Bridge (Default: Rs. 0)
  level4Reward: number; // Bridge (Default: Rs. 0)
  level5Reward: number; // Indirect Income fallback (Default: Rs. 50)
  minWithdrawalLimit: number; // Default: Rs. 50
  mode?: "percentage" | "flat"; // Default: "percentage"
  planTiers?: PlanReferralTier[];
  promoTagline?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_REFERRAL_COMMISSION_CONFIG: ReferralCommissionConfig = {
  level1Reward: 50,
  level2Reward: 0,
  level3Reward: 0,
  level4Reward: 0,
  level5Reward: 50,
  minWithdrawalLimit: 50,
  mode: "percentage",
  planTiers: DEFAULT_PLAN_REFERRAL_TIERS,
  promoTagline: "Refer & Earn: Up to 37% Direct + 30% Team Royalty (Max 67%) on 12-Month Plan!",
  updatedAt: "System Default",
  updatedBy: "Admin",
};

export const REFERRAL_COMMISSION_CONFIG_STORAGE_KEY = "cherry_referral_commission_config_v1";
const CLOUD_CONFIG_DOC_PATH = "systemSettings/referralConfig";

export interface PlanTierValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedTiers?: PlanReferralTier[];
}

/**
 * Generates an initial default referral tier for a subscription plan based on its duration
 */
export function createDefaultTierForPlan(plan: SubscriptionPlan): PlanReferralTier {
  const duration = Math.max(1, plan.durationMonths || 1);
  let l1 = 22;
  let l5 = 15;
  let badge = "Starter Tier";

  if (duration >= 12) {
    l1 = 37;
    l5 = 30;
    badge = "VIP Master Ambassador";
  } else if (duration >= 6) {
    l1 = 32;
    l5 = 25;
    badge = "Pro Scholar Tier";
  } else if (duration >= 3) {
    l1 = 27;
    l5 = 20;
    badge = "Booster Tier";
  } else {
    l1 = 22;
    l5 = 15;
    badge = "Starter Tier";
  }

  return {
    durationMonths: duration,
    tierId: `tier_${plan.id}`,
    planId: plan.id,
    label: plan.durationLabel || `${duration} Month${duration > 1 ? "s" : ""}`,
    planName: plan.name,
    badge,
    priceINR: plan.priceINR,
    level1Percent: l1,
    level5Percent: l5,
    totalPercent: l1 + l5,
    isMaxVip: duration >= 12,
  };
}

/**
 * Validates plan referral tiers ensuring safe margins, valid positive percentages and non-exceeding caps
 */
export function validatePlanReferralTiers(tiers: PlanReferralTier[]): PlanTierValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return { isValid: false, errors: ["At least one active plan tier is required."] };
  }

  const maxDuration = Math.max(...tiers.map((t) => t.durationMonths || 1), 12);
  const sanitizedTiers: PlanReferralTier[] = [];

  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    const duration = t.durationMonths || 1;
    const l1 = Number(t.level1Percent);
    const l5 = Number(t.level5Percent);

    if (isNaN(l1) || l1 < 0 || l1 > 70) {
      errors.push(`${t.label || `${duration}M`}: Level 1 % must be between 0% and 70%.`);
    }
    if (isNaN(l5) || l5 < 0 || l5 > 50) {
      errors.push(`${t.label || `${duration}M`}: Level 5 % must be between 0% and 50%.`);
    }

    const total = l1 + l5;
    if (total > 85) {
      errors.push(
        `${t.label || `${duration}M`}: Combined Cap (${total}%) exceeds safe platform sustainability limit of 85%.`
      );
    }

    sanitizedTiers.push({
      ...t,
      durationMonths: duration,
      level1Percent: Math.round(l1),
      level5Percent: Math.round(l5),
      totalPercent: Math.round(total),
      isMaxVip: duration === maxDuration || duration >= 12,
    });
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [], sanitizedTiers };
}

/**
 * Loads current commission configuration (Admin custom or defaults)
 */
export function getReferralCommissionConfig(): ReferralCommissionConfig {
  if (typeof window === "undefined") {
    return DEFAULT_REFERRAL_COMMISSION_CONFIG;
  }
  try {
    const raw = localStorage.getItem(REFERRAL_COMMISSION_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.level1Reward === "number" && typeof parsed.level5Reward === "number") {
        const mergedTiers =
          Array.isArray(parsed.planTiers) && parsed.planTiers.length > 0
            ? parsed.planTiers
            : DEFAULT_PLAN_REFERRAL_TIERS;
        return {
          ...DEFAULT_REFERRAL_COMMISSION_CONFIG,
          ...parsed,
          planTiers: mergedTiers,
        };
      }
    }
  } catch (e) {
    console.warn("Failed to load local referral commission config:", e);
  }
  return DEFAULT_REFERRAL_COMMISSION_CONFIG;
}

/**
 * Retrieves dynamic plan referral tiers synchronized with active subscription plans.
 * If an admin added or edited plans in Plan & Pricing, this automatically reflects them.
 */
export function getPlanReferralTiers(config?: ReferralCommissionConfig): PlanReferralTier[] {
  const current = config || getReferralCommissionConfig();
  const configuredTiers: PlanReferralTier[] = Array.isArray(current.planTiers) ? current.planTiers : [];

  let activePlans: SubscriptionPlan[] = [];
  try {
    activePlans = getActiveSubscriptionPlans();
  } catch {
    activePlans = [];
  }

  // If no active plans found, return configured tiers or defaults
  if (!activePlans || activePlans.length === 0) {
    return configuredTiers.length > 0 ? configuredTiers : DEFAULT_PLAN_REFERRAL_TIERS;
  }

  // Map each active plan to its referral tier
  const mergedTiers: PlanReferralTier[] = activePlans.map((plan) => {
    // Try to find configured tier by planId or durationMonths
    const matched = configuredTiers.find(
      (t) => (t.planId && t.planId === plan.id) || t.durationMonths === plan.durationMonths
    );

    const defaultTier = createDefaultTierForPlan(plan);

    if (matched) {
      const l1 = typeof matched.level1Percent === "number" ? matched.level1Percent : defaultTier.level1Percent;
      const l5 = typeof matched.level5Percent === "number" ? matched.level5Percent : defaultTier.level5Percent;
      return {
        ...matched,
        planId: plan.id,
        durationMonths: plan.durationMonths,
        label: plan.durationLabel || matched.label || `${plan.durationMonths} Month${plan.durationMonths > 1 ? "s" : ""}`,
        planName: plan.name || matched.planName,
        priceINR: plan.priceINR,
        badge: matched.badge || defaultTier.badge,
        level1Percent: l1,
        level5Percent: l5,
        totalPercent: l1 + l5,
      };
    }

    return defaultTier;
  });

  // Determine highest duration plan to mark as isMaxVip
  const maxDuration = Math.max(...mergedTiers.map((t) => t.durationMonths || 1), 12);
  const result = mergedTiers.map((t) => ({
    ...t,
    isMaxVip: t.durationMonths === maxDuration || t.durationMonths >= 12,
  }));

  // Sort by duration ascending
  result.sort((a, b) => a.durationMonths - b.durationMonths);
  return result;
}

/**
 * Updates plan referral tier multipliers in config and persists to LocalStorage & dispatches events
 */
export function updatePlanReferralTiers(newTiers: PlanReferralTier[]): {
  success: boolean;
  message: string;
  config: ReferralCommissionConfig;
} {
  const validation = validatePlanReferralTiers(newTiers);
  if (!validation.isValid || !validation.sanitizedTiers) {
    return {
      success: false,
      message: validation.errors.join(" "),
      config: getReferralCommissionConfig(),
    };
  }

  const current = getReferralCommissionConfig();
  const vipTier =
    validation.sanitizedTiers.find((t) => t.isMaxVip) ||
    validation.sanitizedTiers[validation.sanitizedTiers.length - 1];

  const updated: ReferralCommissionConfig = {
    ...current,
    planTiers: validation.sanitizedTiers,
    promoTagline: `Refer & Earn: Up to ${vipTier.level1Percent}% Direct + ${vipTier.level5Percent}% Team Royalty (Max ${vipTier.totalPercent}%) on ${vipTier.label}!`,
    updatedAt: new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    updatedBy: "Admin",
  };

  saveReferralCommissionConfig(updated);
  return {
    success: true,
    message: "Plan tier multipliers updated and saved successfully! 🚀",
    config: updated,
  };
}

/**
 * Saves modified commission configuration and dispatches global event
 */
export function saveReferralCommissionConfig(config: ReferralCommissionConfig): void {
  if (typeof window === "undefined") return;
  try {
    const normalized: ReferralCommissionConfig = {
      ...DEFAULT_REFERRAL_COMMISSION_CONFIG,
      ...config,
      planTiers:
        Array.isArray(config.planTiers) && config.planTiers.length > 0
          ? config.planTiers
          : DEFAULT_PLAN_REFERRAL_TIERS,
      updatedAt: new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    localStorage.setItem(REFERRAL_COMMISSION_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("cherry_commission_config_updated", { detail: normalized }));
  } catch (e) {
    console.warn("Failed to save referral commission config:", e);
  }
}

/**
 * Synchronizes referral commission rates from Firestore cloud document
 */
export async function syncCommissionConfigFromCloud(): Promise<{
  success: boolean;
  config: ReferralCommissionConfig;
  message: string;
}> {
  try {
    const docRef = doc(db, "systemSettings", "referralConfig");
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const cloudData = snapshot.data() as Partial<ReferralCommissionConfig>;
      const mergedTiers =
        Array.isArray(cloudData.planTiers) && cloudData.planTiers.length > 0
          ? cloudData.planTiers
          : DEFAULT_PLAN_REFERRAL_TIERS;
      const merged: ReferralCommissionConfig = {
        ...DEFAULT_REFERRAL_COMMISSION_CONFIG,
        ...cloudData,
        planTiers: mergedTiers,
      };
      saveReferralCommissionConfig(merged);
      return {
        success: true,
        config: merged,
        message: "Successfully synchronized commission rates from Firestore Cloud! ☁️",
      };
    } else {
      // Document does not exist yet in cloud; upload local current
      const current = getReferralCommissionConfig();
      await setDoc(docRef, current, { merge: true });
      return {
        success: true,
        config: current,
        message: "Initialized Firestore cloud commission config with current settings.",
      };
    }
  } catch (err: any) {
    console.warn("[syncCommissionConfigFromCloud] Cloud fetch fallback:", err?.message);
    return {
      success: false,
      config: getReferralCommissionConfig(),
      message: `Offline/Cloud fallback: Using local commission settings (${err?.message || "Cloud unavailable"}).`,
    };
  }
}

/**
 * Saves commission rates to Firestore cloud document
 */
export async function saveCommissionConfigToCloud(config: ReferralCommissionConfig): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    saveReferralCommissionConfig(config);
    const docRef = doc(db, "systemSettings", "referralConfig");
    await setDoc(docRef, config, { merge: true });
    return {
      success: true,
      message: "Commission settings saved to Firestore Cloud successfully! ☁️",
    };
  } catch (err: any) {
    console.error("[saveCommissionConfigToCloud] Error:", err);
    return {
      success: false,
      message: `Failed to save to cloud (${err?.message || "Unknown error"}), saved to local storage.`,
    };
  }
}

export interface ReferralTierConfig {
  level: number;
  label: string;
  type: "direct" | "bridge" | "indirect";
  incomePerMember: number;
  rateLabel?: string;
  percentage?: number;
  description: string;
  badgeColor: string;
}

export const REFERRAL_5_LEVEL_CONFIG: ReferralTierConfig[] = [
  {
    level: 1,
    label: "1st Level (Direct)",
    type: "direct",
    incomePerMember: 50,
    rateLabel: "22% / student",
    percentage: 22,
    description: "Aapke direct link / code se join hone wale har student par 22% plan reward.",
    badgeColor: "from-emerald-500 to-teal-600",
  },
  {
    level: 2,
    label: "2nd Level",
    type: "bridge",
    incomePerMember: 0,
    rateLabel: "₹0 / student",
    percentage: 0,
    description: "Bridge tier network progression (₹0 payout).",
    badgeColor: "from-slate-400 to-slate-500",
  },
  {
    level: 3,
    label: "3rd Level",
    type: "bridge",
    incomePerMember: 0,
    rateLabel: "₹0 / student",
    percentage: 0,
    description: "Bridge tier network progression (₹0 payout).",
    badgeColor: "from-slate-400 to-slate-500",
  },
  {
    level: 4,
    label: "4th Level",
    type: "bridge",
    incomePerMember: 0,
    rateLabel: "₹0 / student",
    percentage: 0,
    description: "Bridge tier network progression (₹0 payout).",
    badgeColor: "from-slate-400 to-slate-500",
  },
  {
    level: 5,
    label: "5th Level (Indirect)",
    type: "indirect",
    incomePerMember: 50,
    rateLabel: "15% / student",
    percentage: 15,
    description: "Level 4 team ke naye invites par 15% Team Royalty bonus.",
    badgeColor: "from-indigo-600 to-purple-600",
  },
];

/**
 * Returns dynamic 5-tier config based on current admin commission configuration
 */
export function getDynamicTierConfig(
  overrideConfig?: ReferralCommissionConfig,
  activeTier?: PlanReferralTier
): ReferralTierConfig[] {
  const cfg = overrideConfig || getReferralCommissionConfig();
  const l1Pct = activeTier?.level1Percent || cfg.planTiers?.[0]?.level1Percent || 22;
  const l5Pct = activeTier?.level5Percent || cfg.planTiers?.[0]?.level5Percent || 15;

  return [
    {
      level: 1,
      label: "1st Level (Direct)",
      type: "direct",
      incomePerMember: cfg.level1Reward,
      rateLabel: `${l1Pct}% / student`,
      percentage: l1Pct,
      description: `Aapke direct link / code se join hone wale har student par ${l1Pct}% plan reward.`,
      badgeColor: "from-emerald-500 to-teal-600",
    },
    {
      level: 2,
      label: "2nd Level",
      type: "bridge",
      incomePerMember: cfg.level2Reward,
      rateLabel: "₹0 / student",
      percentage: 0,
      description: cfg.level2Reward > 0 ? `Level 2 network member reward flat ₹${cfg.level2Reward}.` : "Bridge tier network progression (₹0 payout).",
      badgeColor: "from-slate-400 to-slate-500",
    },
    {
      level: 3,
      label: "3rd Level",
      type: "bridge",
      incomePerMember: cfg.level3Reward,
      rateLabel: "₹0 / student",
      percentage: 0,
      description: cfg.level3Reward > 0 ? `Level 3 network member reward flat ₹${cfg.level3Reward}.` : "Bridge tier network progression (₹0 payout).",
      badgeColor: "from-slate-400 to-slate-500",
    },
    {
      level: 4,
      label: "4th Level",
      type: "bridge",
      incomePerMember: cfg.level4Reward,
      rateLabel: "₹0 / student",
      percentage: 0,
      description: cfg.level4Reward > 0 ? `Level 4 network member reward flat ₹${cfg.level4Reward}.` : "Bridge tier network progression (₹0 payout).",
      badgeColor: "from-slate-400 to-slate-500",
    },
    {
      level: 5,
      label: "5th Level (Indirect)",
      type: "indirect",
      incomePerMember: cfg.level5Reward,
      rateLabel: `${l5Pct}% / student`,
      percentage: l5Pct,
      description: `Level 4 team ke naye invites par ${l5Pct}% Team Royalty bonus.`,
      badgeColor: "from-indigo-600 to-purple-600",
    },
  ];
}

/**
 * Finds plan referral tier configuration by duration in months
 */
export function getPlanReferralTierByDuration(
  durationMonths: number = 1,
  config?: ReferralCommissionConfig
): PlanReferralTier {
  const tiers = getPlanReferralTiers(config);
  // 1. Direct exact match
  const exact = tiers.find((t) => t.durationMonths === durationMonths);
  if (exact) return exact;

  // 2. Best lower or equal match (descending)
  const sortedDesc = [...tiers].sort((a, b) => (b.durationMonths || 1) - (a.durationMonths || 1));
  const matched = sortedDesc.find((t) => durationMonths >= (t.durationMonths || 1));
  if (matched) return matched;

  // 3. Fallback to closest or first
  return sortedDesc[sortedDesc.length - 1] || DEFAULT_PLAN_REFERRAL_TIERS[0];
}

/**
 * Finds plan referral tier by plan ID
 */
export function getPlanReferralTierByPlanId(
  planId: string,
  config?: ReferralCommissionConfig
): PlanReferralTier | undefined {
  if (!planId) return undefined;
  const tiers = getPlanReferralTiers(config);
  return tiers.find((t) => t.planId === planId);
}

/**
 * Determines a referrer's active plan tier based on their subscription status
 */
export function getReferrerActivePlanTier(
  referrerIdOrName: string,
  config?: ReferralCommissionConfig
): PlanReferralTier {
  if (typeof window === "undefined" || !referrerIdOrName) {
    return getPlanReferralTierByDuration(1, config);
  }
  try {
    // 1. Check all registered student subscriptions
    const subListRaw = localStorage.getItem("cherry_student_subscriptions_v1");
    if (subListRaw) {
      const subList = JSON.parse(subListRaw);
      if (Array.isArray(subList)) {
        const found = subList.find(
          (s: any) =>
            (s.id === referrerIdOrName ||
              s.studentId === referrerIdOrName ||
              (s.studentName && s.studentName.toLowerCase() === referrerIdOrName.toLowerCase())) &&
            (s.status === "active" || s.isPro)
        );
        if (found) {
          const planId = found.planId || "";
          const dur = Number(found.durationMonths);
          if (dur > 0) {
            return getPlanReferralTierByDuration(dur, config);
          }
          if (planId) {
            const byId = getPlanReferralTierByPlanId(planId, config);
            if (byId) return byId;
          }
          if (planId === "annual" || planId.includes("12")) {
            return getPlanReferralTierByDuration(12, config);
          }
          if (planId === "semiannual_149" || planId.includes("6")) {
            return getPlanReferralTierByDuration(6, config);
          }
          if (planId === "quarterly" || planId.includes("3")) {
            return getPlanReferralTierByDuration(3, config);
          }
          if (planId === "monthly") {
            return getPlanReferralTierByDuration(1, config);
          }
        }
      }
    }

    // 2. Check active student local session subscription
    const currentSubRaw = localStorage.getItem("cherry_subscription_state_v1");
    if (currentSubRaw) {
      const currentSub = JSON.parse(currentSubRaw);
      if (currentSub?.isPro && currentSub?.activePlanId) {
        const pid = currentSub.activePlanId;
        const dur = Number(currentSub.durationMonths);
        if (dur > 0) return getPlanReferralTierByDuration(dur, config);
        if (pid) {
          const byId = getPlanReferralTierByPlanId(pid, config);
          if (byId) return byId;
        }
        if (pid === "annual" || pid.includes("12")) return getPlanReferralTierByDuration(12, config);
        if (pid === "semiannual_149" || pid.includes("6")) return getPlanReferralTierByDuration(6, config);
        if (pid === "quarterly" || pid.includes("3")) return getPlanReferralTierByDuration(3, config);
        if (pid === "monthly") return getPlanReferralTierByDuration(1, config);
      }
    }

    // 3. Check account's saved tier if stored
    const acc = loadReferralState(referrerIdOrName, referrerIdOrName);
    if (acc?.planTierMonths) {
      return getPlanReferralTierByDuration(acc.planTierMonths, config);
    }
  } catch (err) {
    console.warn("getReferrerActivePlanTier check warning:", err);
  }

  // Base Starter Tier for trial/free student accounts
  return getPlanReferralTierByDuration(1, config);
}

export interface CalculatedCommissionResult {
  planPriceINR: number;
  planName: string;
  planDurationMonths: number;
  referrerTier: PlanReferralTier;
  level1Percent: number;
  level1Reward: number;
  vipTier: PlanReferralTier;
  maxVipLevel1Reward: number;
  missedL1Diff: number;
  canUpgradeForMore: boolean;
  level5Percent: number;
  level5Reward: number;
  totalDistributedPercent: number;
  companySafeRetentionPercent: number;
}

/**
 * Calculates tiered commission for Level 1 and Level 5 based on purchased plan & referrer tiers
 */
export function calculateTieredReferralReward(params: {
  planPriceINR?: number;
  planDurationMonths?: number;
  planId?: string;
  planName?: string;
  referrerIdOrName?: string;
  upline5IdOrName?: string;
  config?: ReferralCommissionConfig;
}): CalculatedCommissionResult {
  const config = params.config || getReferralCommissionConfig();

  let price = Number(params.planPriceINR || 0);
  let durationMonths = Number(params.planDurationMonths || 0);
  let planName = params.planName || "";

  if ((!price || price <= 0 || !durationMonths) && params.planId) {
    try {
      const activePlans = getActiveSubscriptionPlans();
      const matchedPlan = activePlans.find((p) => p.id === params.planId);
      if (matchedPlan) {
        price = matchedPlan.priceINR;
        durationMonths = matchedPlan.durationMonths;
        planName = planName || matchedPlan.name;
      }
    } catch (_) {}
  }

  if (!price || price <= 0 || !durationMonths) {
    if (params.planId === "annual") {
      price = 1499;
      durationMonths = 12;
      planName = "Annual All-Access Master";
    } else if (params.planId === "quarterly") {
      price = 499;
      durationMonths = 3;
      planName = "Exam Booster Special";
    } else if (params.planId === "monthly") {
      price = 199;
      durationMonths = 1;
      planName = "Monthly Pro Pass";
    } else {
      price = price > 0 ? price : 149;
      durationMonths = durationMonths > 0 ? durationMonths : 6;
      planName = planName || "6 Months Special Pass";
    }
  }

  const referrerTier = params.referrerIdOrName
    ? getReferrerActivePlanTier(params.referrerIdOrName, config)
    : getPlanReferralTierByDuration(1, config);

  const activeTiers = getPlanReferralTiers(config);
  // VIP tier is the highest duration tier (last in ascending sorted list)
  const vipTier =
    (activeTiers.length > 0 ? activeTiers[activeTiers.length - 1] : null) ||
    activeTiers.find((t) => t.isMaxVip) ||
    getPlanReferralTierByDuration(12, config);

  const l1Percent = referrerTier.level1Percent; // dynamic based on configured tiers
  const l1Reward = Math.max(1, Math.round((price * l1Percent) / 100));

  const maxVipL1Reward = Math.max(1, Math.round((price * vipTier.level1Percent) / 100));
  const missedDiff = Math.max(0, maxVipL1Reward - l1Reward);
  const canUpgrade = Boolean(!referrerTier.isMaxVip && referrerTier.durationMonths < (vipTier.durationMonths || 12));

  const uplineTier = params.upline5IdOrName
    ? getReferrerActivePlanTier(params.upline5IdOrName, config)
    : referrerTier;
  const l5Percent = uplineTier.level5Percent; // 15, 20, 25, or 30
  const l5Reward = Math.max(1, Math.round((price * l5Percent) / 100));

  const totalDist = l1Percent + l5Percent;
  const companyRetention = 100 - totalDist;

  return {
    planPriceINR: price,
    planName,
    planDurationMonths: durationMonths,
    referrerTier,
    level1Percent: l1Percent,
    level1Reward: l1Reward,
    vipTier,
    maxVipLevel1Reward: maxVipL1Reward,
    missedL1Diff: missedDiff,
    canUpgradeForMore: canUpgrade,
    level5Percent: l5Percent,
    level5Reward: l5Reward,
    totalDistributedPercent: totalDist,
    companySafeRetentionPercent: companyRetention,
  };
}

export interface ReferralActivity {
  id: string;
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  amount: number;
  date: string;
  status: "credited" | "pending";
  planName?: string;
  planPriceINR?: number;
  appliedPercent?: number;
  tierLabel?: string;
  missedDiff?: number;
}

export interface WithdrawalRecord {
  id: string;
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  grade?: string;
  board?: string;
  amount: number;
  upiId: string;
  date: string;
  status: "pending" | "successful" | "rejected" | "processing";
  referenceId: string;
  utrNumber?: string;
  rejectionReason?: string;
  processedAt?: string;
}

export interface FraudFlag {
  id: string;
  type: "self_referral" | "duplicate_upi" | "rapid_claims" | "suspicious_ip" | "frozen_account" | "same_device" | "suspicious_volume" | "ip_collision";
  severity: "high" | "medium" | "low";
  reason: string;
  timestamp: string;
}

export interface ReferralAccountState {
  referralCode: string;
  totalEarned: number;
  withdrawnAmount: number;
  walletBalance: number;
  tierCounts: Record<number, number>;
  activities: ReferralActivity[];
  withdrawals: WithdrawalRecord[];
  status?: "active" | "paused";
  isFrozen?: boolean;
  freezeReason?: string;
  fraudFlags?: FraudFlag[];
  joinedWithCode?: string;
  joinedReferrerName?: string;
  planTierMonths?: number;
  planTierName?: string;
  activeRatePercentL1?: number;
  activeRatePercentL5?: number;
  lastMissedEarning?: {
    newStudentName: string;
    planName: string;
    planPriceINR: number;
    earnedINR: number;
    vipCouldEarnINR: number;
    missedDiffINR: number;
    currentTierLabel: string;
    timestamp: string;
    isAcknowledged?: boolean;
  };
}

export interface StudentReferralSummary {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  grade?: string;
  board?: string;
  referralCode: string;
  levelCounts: Record<number, number>;
  directMembers: number; // Level 1
  bridgeMembers: number; // Levels 2-4
  indirectMembers: number; // Level 5
  totalTeamMembers: number;
  level1Earned: number;
  level5Earned: number;
  totalEarned: number;
  withdrawnAmount: number;
  walletBalance: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
  status: "active" | "paused";
  isFrozen?: boolean;
  freezeReason?: string;
  fraudFlags?: FraudFlag[];
  lastActive?: string;
  planTierLabel?: string;
  planTierPercentL1?: number;
  planTierPercentL5?: number;
}

export interface ReferralSystemMetrics {
  totalReferrers: number;
  totalDirectMembers: number;
  totalIndirectMembers: number;
  totalNetworkMembers: number;
  totalCommissionsEarned: number;
  totalCommissionsWithdrawn: number;
  totalActiveWalletBalance: number;
  totalPendingWithdrawalsCount: number;
  totalPendingWithdrawalsAmount: number;
  totalFlaggedAccounts: number;
}

const STORAGE_KEY = "cherry_refer_earn_v1";

export function generateReferralCode(studentName: string = "Student", uid: string = ""): string {
  const cleanName = studentName.trim().replace(/[^a-zA-Z]/g, "").slice(0, 5).toUpperCase() || "SCHOLAR";
  const suffix = uid ? uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() : Math.floor(1000 + Math.random() * 9000).toString();
  return `CHERRY-${cleanName}-${suffix}`;
}

// Sample referral states for demo students to allow instant Admin inspection
const DEMO_STUDENT_REFERRALS: Record<string, Partial<ReferralAccountState>> = {
  std_aarav_10: {
    referralCode: "CHERRY-AARAV-7821",
    totalEarned: 400,
    withdrawnAmount: 100,
    walletBalance: 300,
    tierCounts: { 1: 5, 2: 4, 3: 3, 4: 2, 5: 3 },
    activities: [
      { id: "act_a1", name: "Vikram R. (Class 10)", level: 1, amount: 50, date: "Yesterday", status: "credited" },
      { id: "act_a2", name: "Ananya M. (Class 10)", level: 1, amount: 50, date: "2 days ago", status: "credited" },
      { id: "act_a3", name: "Tanmay K. (Class 9)", level: 1, amount: 50, date: "4 days ago", status: "credited" },
      { id: "act_a4", name: "Rishabh S. (Class 10)", level: 5, amount: 50, date: "5 days ago", status: "credited" },
      { id: "act_a5", name: "Kunal J. (Class 11)", level: 5, amount: 50, date: "1 week ago", status: "credited" },
    ],
    withdrawals: [
      { id: "wd_a1", amount: 100, upiId: "aarav.sharma@okhdfcbank", date: "3 days ago", status: "successful", referenceId: "UPI-TXN-84920194" }
    ],
    status: "active"
  },
  std_diya_10: {
    referralCode: "CHERRY-DIYA-4923",
    totalEarned: 300,
    withdrawnAmount: 150,
    walletBalance: 150,
    tierCounts: { 1: 4, 2: 3, 3: 2, 4: 1, 5: 2 },
    activities: [
      { id: "act_d1", name: "Simran G. (Class 10)", level: 1, amount: 50, date: "Yesterday", status: "credited" },
      { id: "act_d2", name: "Bhavya T. (Class 10)", level: 1, amount: 50, date: "3 days ago", status: "credited" },
      { id: "act_d3", name: "Pranav V. (Class 12)", level: 5, amount: 50, date: "1 week ago", status: "credited" },
    ],
    withdrawals: [
      { id: "wd_d1", amount: 150, upiId: "diya.patel@icici", date: "Yesterday, 2:15 PM", status: "successful", referenceId: "UPI-TXN-49281729" }
    ],
    status: "active"
  },
  std_rohan_12: {
    referralCode: "CHERRY-ROHAN-9104",
    totalEarned: 150,
    withdrawnAmount: 0,
    walletBalance: 100,
    tierCounts: { 1: 3, 2: 1, 3: 1, 4: 0, 5: 0 },
    activities: [
      { id: "act_r1", name: "Harsh V. (Class 12)", level: 1, amount: 50, date: "Today, 10:40 AM", status: "credited" },
      { id: "act_r2", name: "Sameer N. (Class 12)", level: 1, amount: 50, date: "Yesterday", status: "credited" },
      { id: "act_r3", name: "Mehul J. (Class 12)", level: 1, amount: 50, date: "4 days ago", status: "credited" },
    ],
    withdrawals: [
      {
        id: "wd_r1",
        studentId: "std_rohan_12",
        studentName: "Rohan Verma",
        studentEmail: "rohan.verma@example.com",
        grade: "Class 12",
        board: "CBSE",
        amount: 50,
        upiId: "rohan.verma@okaxis",
        date: "Today, 10:45 AM",
        status: "pending",
        referenceId: "UPI-REQ-93821049",
      }
    ],
    status: "active"
  },
  std_priya_9: {
    referralCode: "CHERRY-PRIYA-3312",
    totalEarned: 550,
    withdrawnAmount: 100,
    walletBalance: 300,
    tierCounts: { 1: 6, 2: 5, 3: 4, 4: 3, 5: 5 },
    activities: [
      { id: "act_p1", name: "Anjali S. (Class 9)", level: 1, amount: 50, date: "Today, 11:30 AM", status: "credited" },
      { id: "act_p2", name: "Kavita R. (Class 9)", level: 1, amount: 50, date: "Yesterday", status: "credited" },
      { id: "act_p3", name: "Devansh P. (Class 10)", level: 5, amount: 50, date: "2 days ago", status: "credited" },
      { id: "act_p4", name: "Nidhi B. (Class 9)", level: 5, amount: 50, date: "3 days ago", status: "credited" },
    ],
    withdrawals: [
      {
        id: "wd_p2",
        studentId: "std_priya_9",
        studentName: "Priya Nair",
        studentEmail: "priya.nair@example.com",
        grade: "Class 9",
        board: "ICSE",
        amount: 150,
        upiId: "priya.nair@oksbi",
        date: "Today, 09:15 AM",
        status: "pending",
        referenceId: "UPI-REQ-84729103",
      },
      {
        id: "wd_p1",
        studentId: "std_priya_9",
        studentName: "Priya Nair",
        studentEmail: "priya.nair@example.com",
        grade: "Class 9",
        board: "ICSE",
        amount: 100,
        upiId: "priya.nair@oksbi",
        date: "4 days ago",
        status: "successful",
        referenceId: "UPI-TXN-10293847",
        utrNumber: "UTR-2026-91823719",
        processedAt: "4 days ago",
      }
    ],
    status: "active"
  },
  std_kabir_11: {
    referralCode: "CHERRY-KABIR-5521",
    totalEarned: 100,
    withdrawnAmount: 0,
    walletBalance: 100,
    tierCounts: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0 },
    activities: [
      { id: "act_k1", name: "Kabir S. (Self Phone)", level: 1, amount: 50, date: "Yesterday", status: "credited" },
      { id: "act_k2", name: "Kabir S. (2nd Sim)", level: 1, amount: 50, date: "Yesterday", status: "credited" },
    ],
    withdrawals: [
      {
        id: "wd_k1",
        studentId: "std_kabir_11",
        studentName: "Kabir Mehta",
        studentEmail: "kabir.mehta@example.com",
        grade: "Class 11",
        board: "CBSE",
        amount: 100,
        upiId: "kabir.mehta@okhdfc",
        date: "Yesterday, 6:30 PM",
        status: "pending",
        referenceId: "UPI-REQ-19283746",
      }
    ],
    status: "active",
    isFrozen: false,
    fraudFlags: [
      {
        id: "ff_1",
        type: "self_referral",
        severity: "high",
        reason: "Multiple joins detected from same device fingerprint / IP address within 5 minutes.",
        timestamp: "Yesterday, 6:28 PM",
      }
    ]
  },
};

export function loadReferralState(studentName: string = "Student", uid: string = ""): ReferralAccountState {
  try {
    const userKey = uid ? `cherry_refer_earn_${uid}` : STORAGE_KEY;
    const raw = localStorage.getItem(userKey) || (uid ? localStorage.getItem(STORAGE_KEY) : null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.referralCode) {
        return parsed;
      }
    }
  } catch (_) {}

  // Check if there is a demo profile template
  if (uid && DEMO_STUDENT_REFERRALS[uid]) {
    const template = DEMO_STUDENT_REFERRALS[uid];
    const seeded: ReferralAccountState = {
      referralCode: template.referralCode || generateReferralCode(studentName, uid),
      totalEarned: template.totalEarned ?? 0,
      withdrawnAmount: template.withdrawnAmount ?? 0,
      walletBalance: template.walletBalance ?? 0,
      tierCounts: template.tierCounts || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      activities: template.activities || [],
      withdrawals: template.withdrawals || [],
      status: template.status || "active",
      isFrozen: template.isFrozen ?? false,
      freezeReason: template.freezeReason,
      fraudFlags: template.fraudFlags || [],
    };
    saveReferralState(seeded, uid);
    return seeded;
  }

  // Initial starter state with realistic student sample data
  const starterCode = generateReferralCode(studentName, uid);
  const initialState: ReferralAccountState = {
    referralCode: starterCode,
    totalEarned: 200,
    withdrawnAmount: 0,
    walletBalance: 200,
    tierCounts: {
      1: 3, // 3 direct invites = 3 * 50 = ₹150
      2: 4, // 4 in tier 2 = ₹0
      3: 2, // 2 in tier 3 = ₹0
      4: 3, // 3 in tier 4 = ₹0
      5: 1, // 1 in tier 5 = 1 * 50 = ₹50
    },
    activities: [
      {
        id: "ref_1",
        name: "Rahul Verma (Class 10)",
        level: 1,
        amount: 50,
        date: "Yesterday",
        status: "credited",
      },
      {
        id: "ref_2",
        name: "Sneha Patel (Class 12)",
        level: 1,
        amount: 50,
        date: "3 days ago",
        status: "credited",
      },
      {
        id: "ref_3",
        name: "Aman Gupta (Class 9)",
        level: 1,
        amount: 50,
        date: "5 days ago",
        status: "credited",
      },
      {
        id: "ref_4",
        name: "Pooja Sharma (Class 11)",
        level: 2,
        amount: 0,
        date: "1 week ago",
        status: "credited",
      },
      {
        id: "ref_5",
        name: "Karan Singh (Class 10)",
        level: 5,
        amount: 50,
        date: "2 weeks ago",
        status: "credited",
      },
    ],
    withdrawals: [],
    status: "active",
  };

  saveReferralState(initialState, uid);
  return initialState;
}

export function saveReferralState(state: ReferralAccountState, uid: string = ""): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (uid) {
      localStorage.setItem(`cherry_refer_earn_${uid}`, JSON.stringify(state));
    }
    if (state.referralCode) {
      try {
        const rawIndex = localStorage.getItem("cherry_referral_code_index");
        const index = rawIndex ? JSON.parse(rawIndex) : {};
        index[state.referralCode.toUpperCase().trim()] = {
          id: uid || "current_user",
          name: (state as any).studentName || "Student",
        };
        localStorage.setItem("cherry_referral_code_index", JSON.stringify(index));
      } catch (_) {}
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cherry_referrals_updated", { detail: { state, uid } }));
    }
  } catch (_) {}
}

export function toggleStudentReferralStatus(studentId: string, status: "active" | "paused"): void {
  try {
    const current = loadReferralState("Student", studentId);
    current.status = status;
    saveReferralState(current, studentId);
  } catch (_) {}
}

/**
 * Loads all student referral accounts for Admin Dashboard tracking
 */
export function getAllStudentReferralSummaries(
  studentsList: Array<{ id: string; name: string; email?: string; grade?: string; board?: string }>
): StudentReferralSummary[] {
  const commissionCfg = getReferralCommissionConfig();

  return studentsList.map((std) => {
    const account = loadReferralState(std.name, std.id);
    const level1 = account.tierCounts[1] || 0;
    const level2 = account.tierCounts[2] || 0;
    const level3 = account.tierCounts[3] || 0;
    const level4 = account.tierCounts[4] || 0;
    const level5 = account.tierCounts[5] || 0;
    const bridgeMembers = level2 + level3 + level4;
    const totalTeamMembers = level1 + bridgeMembers + level5;

    const level1Earned = level1 * commissionCfg.level1Reward;
    const level5Earned = level5 * commissionCfg.level5Reward;
    const calculatedEarned = Math.max(account.totalEarned, level1Earned + level5Earned);

    const pendingWithdrawals = account.withdrawals.filter(w => w.status === "processing" || w.status === "pending");
    const pendingWithdrawalsAmount = pendingWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

    const tierInfo = getReferrerActivePlanTier(std.id, commissionCfg);

    return {
      studentId: std.id,
      studentName: std.name,
      studentEmail: std.email,
      grade: std.grade,
      board: std.board,
      referralCode: account.referralCode,
      levelCounts: account.tierCounts,
      directMembers: level1,
      bridgeMembers,
      indirectMembers: level5,
      totalTeamMembers,
      level1Earned,
      level5Earned,
      totalEarned: calculatedEarned,
      withdrawnAmount: account.withdrawnAmount,
      walletBalance: account.walletBalance,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      pendingWithdrawalsAmount,
      status: account.status || "active",
      isFrozen: account.isFrozen || false,
      freezeReason: account.freezeReason,
      fraudFlags: account.fraudFlags || [],
      lastActive: account.activities[0]?.date || "Recently",
      planTierLabel: tierInfo.label,
      planTierPercentL1: tierInfo.level1Percent,
      planTierPercentL5: tierInfo.level5Percent,
    };
  });
}

/**
 * Computes high-level aggregated metrics for the Admin Dashboard
 */
export function getReferralSystemMetrics(summaries: StudentReferralSummary[]): ReferralSystemMetrics {
  let totalReferrers = 0;
  let totalDirectMembers = 0;
  let totalIndirectMembers = 0;
  let totalNetworkMembers = 0;
  let totalCommissionsEarned = 0;
  let totalCommissionsWithdrawn = 0;
  let totalActiveWalletBalance = 0;
  let totalPendingWithdrawalsCount = 0;
  let totalPendingWithdrawalsAmount = 0;
  let totalFlaggedAccounts = 0;

  for (const s of summaries) {
    if (s.directMembers > 0 || s.totalTeamMembers > 0) {
      totalReferrers += 1;
    }
    if (s.isFrozen || (s.fraudFlags && s.fraudFlags.length > 0)) {
      totalFlaggedAccounts += 1;
    }
    totalDirectMembers += s.directMembers;
    totalIndirectMembers += s.indirectMembers;
    totalNetworkMembers += s.totalTeamMembers;
    totalCommissionsEarned += s.totalEarned;
    totalCommissionsWithdrawn += s.withdrawnAmount;
    totalActiveWalletBalance += s.walletBalance;
    totalPendingWithdrawalsCount += s.pendingWithdrawalsCount;
    totalPendingWithdrawalsAmount += s.pendingWithdrawalsAmount;
  }

  return {
    totalReferrers,
    totalDirectMembers,
    totalIndirectMembers,
    totalNetworkMembers,
    totalCommissionsEarned,
    totalCommissionsWithdrawn,
    totalActiveWalletBalance,
    totalPendingWithdrawalsCount,
    totalPendingWithdrawalsAmount,
    totalFlaggedAccounts,
  };
}

export function requestWithdrawal(
  currentState: ReferralAccountState,
  amount: number,
  upiId: string,
  studentId?: string,
  studentName?: string,
  studentEmail?: string,
  grade?: string,
  board?: string
): { success: boolean; updatedState: ReferralAccountState; message: string } {
  if (currentState.isFrozen) {
    return {
      success: false,
      updatedState: currentState,
      message: `Account is temporarily FROZEN: ${currentState.freezeReason || "Administrative security lock"}. Payouts cannot be requested.`,
    };
  }
  const cfg = getReferralCommissionConfig();
  const minLimit = cfg.minWithdrawalLimit || 50;
  if (amount < minLimit) {
    return { success: false, updatedState: currentState, message: `Minimum withdrawal amount is ₹${minLimit}.` };
  }
  if (amount > currentState.walletBalance) {
    return { success: false, updatedState: currentState, message: "Insufficient wallet balance." };
  }
  if (!upiId.includes("@") || upiId.length < 5) {
    return { success: false, updatedState: currentState, message: "Please enter a valid UPI ID (e.g. yourname@oksbi)." };
  }

  const newWithdrawal: WithdrawalRecord = {
    id: `wd_${Date.now()}`,
    studentId,
    studentName,
    studentEmail,
    grade,
    board,
    amount,
    upiId,
    date: "Just now",
    status: "pending",
    referenceId: `UPI-REQ-${Math.floor(10000000 + Math.random() * 90000000)}`,
  };

  const updated: ReferralAccountState = {
    ...currentState,
    walletBalance: currentState.walletBalance - amount,
    withdrawals: [newWithdrawal, ...currentState.withdrawals],
  };

  saveReferralState(updated, studentId);
  return {
    success: true,
    updatedState: updated,
    message: `₹${amount} withdrawal request submitted to ${upiId}! Verification & payout in progress. ⏳`,
  };
}

/**
 * Returns all withdrawal records across all student accounts, sorted newest first
 */
export function getAllWithdrawalRequests(
  studentsList: Array<{ id: string; name: string; email?: string; grade?: string; board?: string }>
): WithdrawalRecord[] {
  const all: WithdrawalRecord[] = [];
  const seenIds = new Set<string>();

  for (const std of studentsList) {
    const account = loadReferralState(std.name, std.id);
    for (const w of account.withdrawals) {
      if (!seenIds.has(w.id)) {
        seenIds.add(w.id);
        all.push({
          ...w,
          studentId: w.studentId || std.id,
          studentName: w.studentName || std.name,
          studentEmail: w.studentEmail || std.email,
          grade: w.grade || std.grade,
          board: w.board || std.board,
        });
      }
    }
  }

  // Also include default account if any unique withdrawals exist
  const defaultAccount = loadReferralState("Student", "");
  for (const w of defaultAccount.withdrawals) {
    if (!seenIds.has(w.id)) {
      seenIds.add(w.id);
      all.push(w);
    }
  }

  // Sort: pending first, then by id / timestamp descending
  return all.sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return b.id.localeCompare(a.id);
  });
}

/**
 * Approves a withdrawal request, marks it successful with UTR Number, and updates student ledger
 */
export function approveWithdrawalRequest(
  withdrawalId: string,
  utrNumber: string,
  studentsList: Array<{ id: string; name: string; email?: string; grade?: string; board?: string }>
): { success: boolean; message: string } {
  const cleanUtr = utrNumber.trim();
  if (!cleanUtr) {
    return { success: false, message: "Please provide a valid UTR / Bank Reference Number." };
  }

  for (const std of studentsList) {
    const account = loadReferralState(std.name, std.id);
    const targetIdx = account.withdrawals.findIndex((w) => w.id === withdrawalId);
    if (targetIdx !== -1) {
      const target = account.withdrawals[targetIdx];
      if (target.status === "successful") {
        return { success: false, message: "This request has already been marked as Paid." };
      }
      target.status = "successful";
      target.utrNumber = cleanUtr;
      target.processedAt = "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      account.withdrawnAmount = (account.withdrawnAmount || 0) + target.amount;
      saveReferralState(account, std.id);
      return {
        success: true,
        message: `₹${target.amount} payout to ${target.upiId} marked as Paid (UTR: ${cleanUtr})! 🟢`,
      };
    }
  }

  // Fallback for default storage
  const defaultAccount = loadReferralState("Student", "");
  const defIdx = defaultAccount.withdrawals.findIndex((w) => w.id === withdrawalId);
  if (defIdx !== -1) {
    const target = defaultAccount.withdrawals[defIdx];
    target.status = "successful";
    target.utrNumber = cleanUtr;
    target.processedAt = "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    defaultAccount.withdrawnAmount = (defaultAccount.withdrawnAmount || 0) + target.amount;
    saveReferralState(defaultAccount);
    return {
      success: true,
      message: `₹${target.amount} payout to ${target.upiId} marked as Paid (UTR: ${cleanUtr})! 🟢`,
    };
  }

  return { success: false, message: "Withdrawal request not found." };
}

/**
 * Rejects a withdrawal request, records the reason, and refunds the amount back to the student's wallet
 */
export function rejectWithdrawalRequest(
  withdrawalId: string,
  rejectionReason: string,
  studentsList: Array<{ id: string; name: string; email?: string; grade?: string; board?: string }>
): { success: boolean; message: string } {
  const cleanReason = rejectionReason.trim() || "Declined by Admin (Invalid UPI handle or verification issue)";

  for (const std of studentsList) {
    const account = loadReferralState(std.name, std.id);
    const targetIdx = account.withdrawals.findIndex((w) => w.id === withdrawalId);
    if (targetIdx !== -1) {
      const target = account.withdrawals[targetIdx];
      if (target.status === "rejected") {
        return { success: false, message: "This request has already been rejected." };
      }
      if (target.status === "successful") {
        return { success: false, message: "Cannot reject an already completed payout." };
      }
      target.status = "rejected";
      target.rejectionReason = cleanReason;
      target.processedAt = "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      // Instant wallet refund
      account.walletBalance = (account.walletBalance || 0) + target.amount;
      saveReferralState(account, std.id);
      return {
        success: true,
        message: `Request rejected. ₹${target.amount} has been refunded back to ${std.name}'s wallet balance. ↩️`,
      };
    }
  }

  // Fallback for default storage
  const defaultAccount = loadReferralState("Student", "");
  const defIdx = defaultAccount.withdrawals.findIndex((w) => w.id === withdrawalId);
  if (defIdx !== -1) {
    const target = defaultAccount.withdrawals[defIdx];
    target.status = "rejected";
    target.rejectionReason = cleanReason;
    target.processedAt = "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    defaultAccount.walletBalance = (defaultAccount.walletBalance || 0) + target.amount;
    saveReferralState(defaultAccount);
    return {
      success: true,
      message: `Request rejected. ₹${target.amount} refunded back to wallet. ↩️`,
    };
  }

  return { success: false, message: "Withdrawal request not found." };
}

/**
 * Phase 3: Manually credits or debits a student's referral wallet with admin audit trail
 */
export function adjustStudentWalletBalance(
  studentId: string,
  studentName: string,
  type: "credit" | "debit",
  amount: number,
  adminNotes: string
): { success: boolean; newBalance: number; message: string } {
  if (amount <= 0) {
    return { success: false, newBalance: 0, message: "Amount must be greater than ₹0." };
  }

  const account = loadReferralState(studentName, studentId);
  const cleanNotes = adminNotes.trim() || `Admin manual ${type} adjustment`;

  if (type === "debit" && (account.walletBalance || 0) < amount) {
    return {
      success: false,
      newBalance: account.walletBalance,
      message: `Cannot debit ₹${amount}. Current wallet balance is only ₹${account.walletBalance}.`,
    };
  }

  const prevBalance = account.walletBalance || 0;
  const newBalance = type === "credit" ? prevBalance + amount : prevBalance - amount;
  account.walletBalance = newBalance;

  if (type === "credit") {
    account.totalEarned = (account.totalEarned || 0) + amount;
  }

  // Record into activities for transparent student audit trail
  const activity: ReferralActivity = {
    id: `adj_${Date.now()}`,
    name: `Admin Adjustment: ${cleanNotes}`,
    level: 1,
    amount: type === "credit" ? amount : -amount,
    date: "Just now",
    status: "credited",
  };
  account.activities = [activity, ...(account.activities || [])];

  saveReferralState(account, studentId);

  return {
    success: true,
    newBalance,
    message: `Successfully ${type === "credit" ? "credited" : "debited"} ₹${amount} for ${studentName}. New Balance: ₹${newBalance}.`,
  };
}

/**
 * Phase 3: Freezes or unfreezes a student's referral account (prevents payouts & invites)
 */
export function toggleFreezeStudentReferralAccount(
  studentId: string,
  studentName: string,
  freeze: boolean,
  reason?: string
): { success: boolean; message: string } {
  const account = loadReferralState(studentName, studentId);
  account.isFrozen = freeze;
  if (freeze) {
    account.freezeReason = reason?.trim() || "Suspicious activity detected / Administrative Freeze";
  } else {
    account.freezeReason = undefined;
  }

  saveReferralState(account, studentId);

  return {
    success: true,
    message: freeze
      ? `Account for ${studentName} has been FROZEN ❄️. Payouts and referral income paused.`
      : `Account for ${studentName} has been UNFROZEN 🔓. Normal operations restored.`,
  };
}

/**
 * Phase 3: Adds an anti-fraud security flag to an account
 */
export function addStudentFraudFlag(
  studentId: string,
  studentName: string,
  flag: Omit<FraudFlag, "id" | "timestamp">
): { success: boolean; message: string } {
  const account = loadReferralState(studentName, studentId);
  const newFlag: FraudFlag = {
    ...flag,
    id: `ff_${Date.now()}`,
    timestamp: "Today, " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  account.fraudFlags = [newFlag, ...(account.fraudFlags || [])];
  saveReferralState(account, studentId);

  return {
    success: true,
    message: `Security flag [${flag.type}] added to ${studentName}'s profile.`,
  };
}

/**
 * Phase 3: Dismisses / resolves an existing fraud flag
 */
export function dismissStudentFraudFlag(
  studentId: string,
  studentName: string,
  flagId: string
): { success: boolean; message: string } {
  const account = loadReferralState(studentName, studentId);
  account.fraudFlags = (account.fraudFlags || []).filter((f) => f.id !== flagId);
  saveReferralState(account, studentId);

  return {
    success: true,
    message: "Security flag resolved and removed.",
  };
}

/**
 * Phase 3: Anti-Fraud Self-Referral and Device Collision Detector
 * Checks if a referral attempt is valid or suspicious (same device, same IP fingerprint, identical student name, or duplicate email)
 */
export function detectSelfReferralOrFraud(params: {
  referralCode: string;
  referrerStudentId: string;
  referrerStudentName: string;
  newStudentId: string;
  newStudentName: string;
  newStudentEmail?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
}): { isFraud: boolean; reason?: string; flagType?: "self_referral" | "same_device" | "suspicious_volume" | "ip_collision" } {
  const {
    referralCode,
    referrerStudentId,
    referrerStudentName,
    newStudentId,
    newStudentName,
    newStudentEmail,
    deviceFingerprint,
    ipAddress,
  } = params;

  // 1. Direct Self-Referral: Student referring themselves by ID
  if (referrerStudentId && newStudentId && referrerStudentId === newStudentId) {
    return {
      isFraud: true,
      reason: "Self-referral detected: You cannot use your own referral code.",
      flagType: "self_referral",
    };
  }

  // 2. Direct Name Match: Identical student name attempting to claim code
  if (
    referrerStudentName &&
    newStudentName &&
    referrerStudentName.trim().toLowerCase() === newStudentName.trim().toLowerCase()
  ) {
    return {
      isFraud: true,
      reason: "Self-referral detected: Referrer and new student have identical identity records.",
      flagType: "self_referral",
    };
  }

  // 3. Same Device Fingerprint in Local Storage
  const storedDevice = typeof window !== "undefined" ? localStorage.getItem("cherry_device_id") : null;
  if (deviceFingerprint && storedDevice && deviceFingerprint === storedDevice) {
    // If attempting to use referral code on the same physical browser instance
    const myCode = typeof window !== "undefined" ? localStorage.getItem("cherry_my_referral_code") : null;
    if (myCode && myCode.trim().toUpperCase() === referralCode.trim().toUpperCase()) {
      return {
        isFraud: true,
        reason: "Same device detected: An existing referral account exists on this hardware.",
        flagType: "same_device",
      };
    }
  }

  return { isFraud: false };
}

/**
 * Phase 3: Admin sets or updates a student's active referral earning plan tier
 */
export function assignStudentSubscriptionTier(
  studentId: string,
  studentName: string,
  durationMonths: number
): { success: boolean; tier: PlanReferralTier; message: string } {
  const config = getReferralCommissionConfig();
  const tier = getPlanReferralTierByDuration(durationMonths, config);
  const account = loadReferralState(studentName, studentId);

  account.planTierMonths = durationMonths;
  account.planTierName = tier.planName;
  account.activeRatePercentL1 = tier.level1Percent;
  account.activeRatePercentL5 = tier.level5Percent;

  saveReferralState(account, studentId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cherry_referrals_updated"));
  }

  return {
    success: true,
    tier,
    message: `Assigned ${studentName} to ${tier.label} (${tier.badge})! Direct: ${tier.level1Percent}%, Team: ${tier.level5Percent}%. 🎯`,
  };
}


export interface ReferralLookupResult {
  valid: boolean;
  referrerId?: string;
  referrerName?: string;
  referralCode?: string;
  level1Reward: number;
  level5Reward: number;
  level1Percent?: number;
  level5Percent?: number;
  referrerTierLabel?: string;
  isSelf?: boolean;
  isFrozen?: boolean;
  message: string;
}

export const KNOWN_STUDENT_CODE_REGISTRY: Record<string, { id: string; name: string }> = {
  "CHERRY-AARAV-7821": { id: "std_aarav_10", name: "Aarav Sharma" },
  "CHERRY-DIYA-4923": { id: "std_diya_10", name: "Ananya Verma" },
  "CHERRY-ROHAN-9104": { id: "std_rohan_10", name: "Rohan Gupta" },
  "CHERRY-PRIYA-3312": { id: "std_priya_12", name: "Priya Patel" },
  "CHERRY-KABIR-5521": { id: "std_kabir_11", name: "Kabir Mehta" },
};

/**
 * Phase 4: Look up and validate an invite / referral code
 */
export function lookupReferralCode(
  rawCode: string,
  currentUserId?: string,
  currentUserName?: string,
  planOptions?: { priceINR?: number; durationMonths?: number; planId?: string }
): ReferralLookupResult {
  const config = getReferralCommissionConfig();
  const defaultLevel1 = config.level1Reward;
  const defaultLevel5 = config.level5Reward;

  if (!rawCode || !rawCode.trim()) {
    return {
      valid: false,
      level1Reward: defaultLevel1,
      level5Reward: defaultLevel5,
      message: "Please enter an invite code.",
    };
  }

  const code = rawCode.trim().toUpperCase();

  // 1. Check known student code registry
  let matchedId = KNOWN_STUDENT_CODE_REGISTRY[code]?.id;
  let matchedName = KNOWN_STUDENT_CODE_REGISTRY[code]?.name;

  // 2. Check local dynamic referral code index
  if (!matchedId && typeof window !== "undefined") {
    try {
      const rawIndex = localStorage.getItem("cherry_referral_code_index");
      if (rawIndex) {
        const index = JSON.parse(rawIndex);
        if (index[code]) {
          matchedId = index[code].id;
          matchedName = index[code].name;
        }
      }
    } catch (_) {}
  }

  // 3. Check demo template references
  if (!matchedId) {
    for (const [sId, sData] of Object.entries(DEMO_STUDENT_REFERRALS)) {
      if (sData.referralCode && sData.referralCode.toUpperCase() === code) {
        matchedId = sId;
        matchedName =
          KNOWN_STUDENT_CODE_REGISTRY[sData.referralCode]?.name ||
          (sId.includes("aarav") ? "Aarav Sharma" : sId.includes("priya") ? "Priya Patel" : "Peer Scholar");
        break;
      }
    }
  }

  // 4. Check user local storage accounts
  if (!matchedId && typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("cherry_refer_earn_")) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.referralCode && parsed.referralCode.toUpperCase() === code) {
              matchedId = key.replace("cherry_refer_earn_", "");
              matchedName = parsed.studentName || "Cherry Scholar";
              break;
            }
          }
        }
      }
    } catch (_) {}
  }

  // 5. Fallback for valid format CHERRY-XXXXX-XXXX to support custom peer codes
  if (!matchedId && code.startsWith("CHERRY-")) {
    const parts = code.split("-");
    if (parts.length >= 2) {
      const parsedFragment = parts[1];
      matchedName = parsedFragment.charAt(0) + parsedFragment.slice(1).toLowerCase();
      matchedId = `student_${code.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    }
  }

  if (!matchedId) {
    return {
      valid: false,
      level1Reward: defaultLevel1,
      level5Reward: defaultLevel5,
      message: `Invalid referral code "${code}". Please check and re-enter.`,
    };
  }

  // Calculate dynamic reward based on selected plan and referrer tier
  const rewardCalc = calculateTieredReferralReward({
    planPriceINR: planOptions?.priceINR,
    planDurationMonths: planOptions?.durationMonths,
    planId: planOptions?.planId,
    referrerIdOrName: matchedId,
    config,
  });

  const level1Reward = rewardCalc.level1Reward || defaultLevel1;
  const level5Reward = rewardCalc.level5Reward || defaultLevel5;

  // Check self-referral
  if (currentUserId && matchedId === currentUserId) {
    return {
      valid: false,
      isSelf: true,
      level1Reward,
      level5Reward,
      message: "Self-referral is not allowed. You cannot use your own referral code.",
    };
  }

  if (
    currentUserName &&
    matchedName &&
    currentUserName.trim().toLowerCase() === matchedName.trim().toLowerCase()
  ) {
    return {
      valid: false,
      isSelf: true,
      level1Reward,
      level5Reward,
      message: "Self-referral detected. Name matches referrer profile.",
    };
  }

  // Check frozen status
  const referrerAccount = loadReferralState(matchedName, matchedId);
  if (referrerAccount.isFrozen || referrerAccount.status === "paused") {
    return {
      valid: false,
      isFrozen: true,
      level1Reward,
      level5Reward,
      message: "Referrer account is currently under administrative review.",
    };
  }

  return {
    valid: true,
    referrerId: matchedId,
    referrerName: matchedName,
    referralCode: code,
    level1Reward,
    level5Reward,
    level1Percent: rewardCalc.level1Percent,
    level5Percent: rewardCalc.level5Percent,
    referrerTierLabel: rewardCalc.referrerTier.label,
    message: `Invite verified! Invited by ${matchedName} • ${rewardCalc.level1Percent}% (₹${level1Reward}) Direct Reward Active! 🎉`,
  };
}

export interface ReferralDistributionResult {
  success: boolean;
  message: string;
  referrerId?: string;
  referrerName?: string;
  level1RewardCredited?: number;
  level5RewardCredited?: number;
  appliedPercentL1?: number;
  missedDiffL1?: number;
  canUpgradeForMore?: boolean;
  planName?: string;
  isSelfReferral?: boolean;
}

/**
 * Phase 4: Distribute and credit real 5-level commission ledger upon student enrollment/onboarding
 */
export async function distributeAndCreditReferralCommission(params: {
  referralCode: string;
  newStudentId: string;
  newStudentName: string;
  newStudentGrade?: string;
  newStudentEmail?: string;
  deviceFingerprint?: string;
  planPriceINR?: number;
  planDurationMonths?: number;
  planId?: string;
  planName?: string;
}): Promise<ReferralDistributionResult> {
  const {
    referralCode,
    newStudentId,
    newStudentName,
    newStudentGrade = "Class 10",
    newStudentEmail,
    deviceFingerprint,
    planPriceINR,
    planDurationMonths,
    planId,
    planName,
  } = params;

  if (!referralCode || !referralCode.trim()) {
    return { success: false, message: "No referral code provided." };
  }

  const lookup = lookupReferralCode(referralCode, newStudentId, newStudentName, {
    priceINR: planPriceINR,
    durationMonths: planDurationMonths,
    planId,
  });
  if (!lookup.valid || !lookup.referrerId || !lookup.referrerName) {
    return {
      success: false,
      message: lookup.message,
      isSelfReferral: lookup.isSelf,
    };
  }

  // Check if student has already redeemed a referral code
  const redemptionKey = `cherry_redeemed_ref_${newStudentId}`;
  if (typeof window !== "undefined") {
    const previousRedemption = localStorage.getItem(redemptionKey);
    if (previousRedemption) {
      return {
        success: false,
        message: "Referral welcome reward already redeemed for this student account.",
      };
    }
  }

  // Anti-fraud validation
  const fraudCheck = detectSelfReferralOrFraud({
    referralCode,
    referrerStudentId: lookup.referrerId,
    referrerStudentName: lookup.referrerName,
    newStudentId,
    newStudentName,
    newStudentEmail,
    deviceFingerprint,
  });

  if (fraudCheck.isFraud) {
    addStudentFraudFlag(lookup.referrerId, lookup.referrerName, {
      type: fraudCheck.flagType || "self_referral",
      severity: "high",
      reason: fraudCheck.reason || "Fraudulent referral attempt detected.",
    });
    return {
      success: false,
      message: fraudCheck.reason || "Referral rejected by security protocol.",
      isSelfReferral: true,
    };
  }

  const config = getReferralCommissionConfig();

  // Dynamic Tiered Reward Calculation for Level 1 Direct Referrer
  const rewardCalc = calculateTieredReferralReward({
    planPriceINR,
    planDurationMonths,
    planId,
    planName,
    referrerIdOrName: lookup.referrerId,
    config,
  });

  const l1Reward = rewardCalc.level1Reward;
  const l1Percent = rewardCalc.level1Percent;
  const missedDiff = rewardCalc.missedL1Diff;

  // 1. Credit Level 1 Direct Income to Referrer
  const referrerAccount = loadReferralState(lookup.referrerName, lookup.referrerId);
  referrerAccount.tierCounts[1] = (referrerAccount.tierCounts[1] || 0) + 1;
  referrerAccount.totalEarned = (referrerAccount.totalEarned || 0) + l1Reward;
  referrerAccount.walletBalance = (referrerAccount.walletBalance || 0) + l1Reward;
  referrerAccount.planTierMonths = rewardCalc.referrerTier.durationMonths;
  referrerAccount.planTierName = rewardCalc.referrerTier.label;
  referrerAccount.activeRatePercentL1 = l1Percent;
  referrerAccount.activeRatePercentL5 = rewardCalc.level5Percent;

  // Record Missed Earning Trigger if Referrer is on lower tier (< 12 months)
  if (rewardCalc.canUpgradeForMore && missedDiff > 0) {
    referrerAccount.lastMissedEarning = {
      newStudentName,
      planName: rewardCalc.planName,
      planPriceINR: rewardCalc.planPriceINR,
      earnedINR: l1Reward,
      vipCouldEarnINR: rewardCalc.maxVipLevel1Reward,
      missedDiffINR: missedDiff,
      currentTierLabel: rewardCalc.referrerTier.label,
      timestamp: new Date().toISOString(),
      isAcknowledged: false,
    };
  }

  const nowFormatted =
    "Today, " +
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const directActivity: ReferralActivity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: `${newStudentName} (${newStudentGrade})`,
    level: 1,
    amount: l1Reward,
    date: nowFormatted,
    status: "credited",
    planName: rewardCalc.planName,
    planPriceINR: rewardCalc.planPriceINR,
    appliedPercent: l1Percent,
    tierLabel: rewardCalc.referrerTier.label,
    missedDiff,
  };

  referrerAccount.activities = [directActivity, ...(referrerAccount.activities || [])];
  saveReferralState(referrerAccount, lookup.referrerId);

  // Cloud sync to Firestore if db is active
  try {
    const refDoc = doc(db, "referralAccounts", lookup.referrerId);
    await setDoc(
      refDoc,
      {
        referrerId: lookup.referrerId,
        referrerName: lookup.referrerName,
        referralCode: lookup.referralCode,
        totalEarned: referrerAccount.totalEarned,
        walletBalance: referrerAccount.walletBalance,
        tierCounts: referrerAccount.tierCounts,
        planTierMonths: referrerAccount.planTierMonths,
        planTierName: referrerAccount.planTierName,
        activeRatePercentL1: referrerAccount.activeRatePercentL1,
        activeRatePercentL5: referrerAccount.activeRatePercentL5,
        lastMissedEarning: referrerAccount.lastMissedEarning || null,
        lastReferralAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn("[distributeAndCreditReferralCommission] Firestore write warn:", err?.message);
  }

  // 2. Traverse Multi-Level Lineage (5-Level Compensation Tree)
  let l5RewardCredited = 0;
  if (typeof window !== "undefined") {
    try {
      const rawLineage = localStorage.getItem("cherry_referral_lineage");
      const lineageMap: Record<string, string> = rawLineage ? JSON.parse(rawLineage) : {};
      lineageMap[newStudentId] = lookup.referrerId;
      localStorage.setItem("cherry_referral_lineage", JSON.stringify(lineageMap));

      // Walk up the chain for tiers 2 through 5
      let currentUpline = lookup.referrerId;
      for (let lvl = 2; lvl <= 5; lvl++) {
        const parentUpline = lineageMap[currentUpline];
        if (!parentUpline) break;

        const uplineAcc = loadReferralState("Upline", parentUpline);
        uplineAcc.tierCounts[lvl] = (uplineAcc.tierCounts[lvl] || 0) + 1;

        if (lvl === 5 && !uplineAcc.isFrozen && uplineAcc.status !== "paused") {
          // Calculate Level 5 reward for this specific upline based on their tier or plan price
          const uplineRewardCalc = calculateTieredReferralReward({
            planPriceINR,
            planDurationMonths,
            planId,
            planName,
            referrerIdOrName: parentUpline,
            config,
          });
          const actualL5Reward = uplineRewardCalc.level5Reward;

          if (actualL5Reward > 0) {
            uplineAcc.totalEarned = (uplineAcc.totalEarned || 0) + actualL5Reward;
            uplineAcc.walletBalance = (uplineAcc.walletBalance || 0) + actualL5Reward;
            uplineAcc.activities = [
              {
                id: `act_${Date.now()}_l5_${Math.random().toString(36).substring(2, 6)}`,
                name: `${newStudentName} (5th-Level Network Team)`,
                level: 5,
                amount: actualL5Reward,
                date: nowFormatted,
                status: "credited",
                planName: rewardCalc.planName,
                planPriceINR: rewardCalc.planPriceINR,
                appliedPercent: uplineRewardCalc.level5Percent,
                tierLabel: uplineRewardCalc.referrerTier.label,
              },
              ...(uplineAcc.activities || []),
            ];
            l5RewardCredited = actualL5Reward;
          }
        }

        saveReferralState(uplineAcc, parentUpline);
        currentUpline = parentUpline;
      }
    } catch (err) {
      console.warn("[Referral Lineage] Traversal warn:", err);
    }
  }

  // 3. Mark as redeemed and link new student account
  if (typeof window !== "undefined") {
    localStorage.setItem(
      redemptionKey,
      JSON.stringify({
        code: lookup.referralCode,
        referrerId: lookup.referrerId,
        referrerName: lookup.referrerName,
        rewardCredited: l1Reward,
        timestamp: Date.now(),
      })
    );
    localStorage.removeItem("cherry_pending_ref_code");
  }

  const newStdAccount = loadReferralState(newStudentName, newStudentId);
  newStdAccount.joinedWithCode = lookup.referralCode;
  newStdAccount.joinedReferrerName = lookup.referrerName;
  saveReferralState(newStdAccount, newStudentId);

  // Global event update
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cherry_referrals_updated"));
  }

  return {
    success: true,
    message: `🎉 Referral attributed! ₹${l1Reward} (${l1Percent}%) credited to ${lookup.referrerName}'s wallet.${l5RewardCredited > 0 ? ` ₹${l5RewardCredited} credited to 5th level network upline.` : ""}`,
    referrerId: lookup.referrerId,
    referrerName: lookup.referrerName,
    level1RewardCredited: l1Reward,
    level5RewardCredited: l5RewardCredited,
    appliedPercentL1: l1Percent,
    missedDiffL1: missedDiff,
    canUpgradeForMore: rewardCalc.canUpgradeForMore,
    planName: rewardCalc.planName,
  };
}

