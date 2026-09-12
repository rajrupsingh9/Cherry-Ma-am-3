/**
 * subscriptionStore.ts - Direct Dynamic UPI & Subscription Management Store
 * Zero-Fee Direct UPI Payment & Plan Engine for Cherry AI Classroom
 */

import { db, auth } from "../lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

export interface SubscriptionPlan {
  id: "semiannual_149" | "monthly" | "quarterly" | "annual" | string;
  name: string;
  tagline: string;
  durationMonths: number;
  durationLabel: string;
  priceINR: number;
  originalPriceINR: number;
  discountPercent: number;
  popular?: boolean;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "semiannual_149",
    name: "6 Months Special Pass",
    tagline: "Exclusive Student Launch Offer – ₹149 for 6 Full Months",
    durationMonths: 6,
    durationLabel: "6 Months",
    priceINR: 149,
    originalPriceINR: 999,
    discountPercent: 85,
    popular: true,
    features: [
      "Full 6 Months Unlimited 1-on-1 Cherry Ma'am Live Teaching",
      "Full Virtual Lab Simulation Sandbox (Class 6-12)",
      "10-Year PYQ Predicted Papers & Step-wise Marking",
      "Interactive 24/7 Kiara & Socratic Voice Whiteboard",
      "Chapter Smart Handbooks, Infographics & PDF Exports",
      "Instant Referral Earning Program (Earn ₹50 per friend)",
    ],
  },
  {
    id: "monthly",
    name: "Monthly Pro Pass",
    tagline: "Ideal for monthly syllabus coverage & test prep",
    durationMonths: 1,
    durationLabel: "1 Month",
    priceINR: 199,
    originalPriceINR: 499,
    discountPercent: 60,
    features: [
      "Unlimited 1-on-1 Cherry Ma'am Live Teaching",
      "Unlimited Kiara AI Socratic Counselor & Voice",
      "Full Virtual Lab Simulation Sandbox",
      "Chapter Smart Handbooks & PDF Exports",
      "Adaptive Exam Speed Sprint & Quiz Analysis",
    ],
  },
  {
    id: "quarterly",
    name: "Exam Booster Special",
    tagline: "Most popular for Term & Board Exam Readiness",
    durationMonths: 3,
    durationLabel: "3 Months",
    priceINR: 499,
    originalPriceINR: 1299,
    discountPercent: 62,
    popular: true,
    features: [
      "Everything in Monthly Pro Pass",
      "10-Year PYQ Predicted Papers & Step-wise Marking",
      "PYQ 80/20 High-Yield Topic Weightage Heatmaps",
      "Priority Low-Latency Live AI Stream Bandwidth",
      "Unlimited Homework Maker & Doubt Walkthroughs",
    ],
  },
  {
    id: "annual",
    name: "Annual All-Access Master",
    tagline: "Complete 365-day mastery for JEE, NEET & Boards",
    durationMonths: 12,
    durationLabel: "1 Full Year (12 Months)",
    priceINR: 1499,
    originalPriceINR: 4999,
    discountPercent: 70,
    features: [
      "Everything in Exam Booster Special",
      "Full 12-Month 24/7 Unlimited Socratic Tutoring",
      "Unlimited Battle Arena Room Matches & Tournaments",
      "Concept Infographic Poster Ultra-HD Generator",
      "Official Verified Student Certificate of Mastery",
      "Zero Platform Fee & Highest Priority Live AI Speed",
    ],
  },
];

export interface PaymentTransaction {
  transactionId: string;
  referenceId: string; // e.g. UTR / UPI Ref Number
  planId: "semiannual_149" | "monthly" | "quarterly" | "annual" | string;
  planName: string;
  amountINR: number;
  paidAt: string; // ISO date
  expiresAt: string; // ISO date
  status: "active" | "expired" | "pending_verification";
  studentName: string;
  upiReceiverId: string;
}

export interface SubscriptionState {
  isPro: boolean;
  activePlanId: "semiannual_149" | "monthly" | "quarterly" | "annual" | string | null;
  activePlanName: string | null;
  subscriptionStart: string | null; // ISO date
  subscriptionExpires: string | null; // ISO date
  transactions: PaymentTransaction[];
  customUpiReceiverId: string;
  merchantName: string;
}

export interface StudentSubscriptionRecord {
  id: string; // student ID or email
  studentName: string;
  studentEmail?: string;
  grade?: string;
  board?: string;
  subject?: string;
  isPro: boolean;
  status: "active" | "pending_verification" | "free" | "expired" | "suspended";
  planId: string;
  planName: string;
  amountINR: number;
  utrNumber?: string;
  submittedAt: string; // e.g. "Today, 10:15 AM" or ISO
  activatedAt?: string;
  expiresAt?: string;
  approvedBy?: string;
  notes?: string;
}

export const STUDENT_SUBSCRIPTIONS_STORAGE_KEY = "cherry_student_subscriptions_v1";

export const INITIAL_STUDENT_SUBSCRIPTIONS: StudentSubscriptionRecord[] = [
  {
    id: "std_aarav_10",
    studentName: "Aarav Sharma",
    studentEmail: "aarav.sharma24@gmail.com",
    grade: "Class 10",
    board: "CBSE",
    subject: "Science",
    isPro: false,
    status: "pending_verification",
    planId: "semiannual_149",
    planName: "6-Month Special Launch",
    amountINR: 149,
    utrNumber: "428901847291",
    submittedAt: "Today, 10:15 AM",
    notes: "Submitted via Google Pay with reference 428901847291",
  },
  {
    id: "std_ananya_9",
    studentName: "Ananya Verma",
    studentEmail: "ananya.v.science@gmail.com",
    grade: "Class 9",
    board: "ICSE",
    subject: "Science",
    isPro: false,
    status: "pending_verification",
    planId: "monthly",
    planName: "1-Month Focus Plan",
    amountINR: 199,
    utrNumber: "439281726354",
    submittedAt: "Yesterday, 3:45 PM",
    notes: "PhonePe UPI Transaction pending confirmation",
  },
  {
    id: "std_priya_12",
    studentName: "Priya Patel",
    studentEmail: "priya.patel.study@gmail.com",
    grade: "Class 12",
    board: "CBSE",
    subject: "Physics",
    isPro: true,
    status: "active",
    planId: "annual",
    planName: "1-Year Mastery Pro",
    amountINR: 1499,
    utrNumber: "419204817263",
    submittedAt: "3 days ago",
    activatedAt: "3 days ago",
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    approvedBy: "Admin (onlinework0876@gmail.com)",
    notes: "Annual Plan Verified in HDFC NetBanking",
  },
  {
    id: "std_rohan_10",
    studentName: "Rohan Gupta",
    studentEmail: "rohan.gupta.math@gmail.com",
    grade: "Class 10",
    board: "CBSE",
    subject: "Mathematics",
    isPro: false,
    status: "free",
    planId: "free",
    planName: "Free Trial",
    amountINR: 0,
    submittedAt: "5 days ago",
  },
];

export const DEFAULT_RECEIVER_UPI_ID = "cherryai.edu@okhdfcbank";
export const DEFAULT_MERCHANT_NAME = "Cherry AI Classroom";

const STORAGE_KEY = "cherry_subscription_state_v1";
export const CUSTOM_PLANS_STORAGE_KEY = "cherry_custom_subscription_plans_v1";

/**
 * Returns currently active subscription plans (from localStorage if custom configured by admin, else defaults)
 */
export function getActiveSubscriptionPlans(): SubscriptionPlan[] {
  if (typeof window === "undefined") {
    return SUBSCRIPTION_PLANS;
  }
  try {
    const raw = localStorage.getItem(CUSTOM_PLANS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load custom subscription plans:", e);
  }
  return SUBSCRIPTION_PLANS;
}

/**
 * Saves modified subscription plans (Admin Dashboard) and dispatches update event
 */
export function saveCustomSubscriptionPlans(plans: SubscriptionPlan[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_PLANS_STORAGE_KEY, JSON.stringify(plans));
    window.dispatchEvent(new CustomEvent("cherry_plans_updated", { detail: plans }));
  } catch (e) {
    console.warn("Failed to save custom subscription plans:", e);
  }
}

/**
 * Resets subscription plans back to default factory settings
 */
export function resetCustomSubscriptionPlans(): SubscriptionPlan[] {
  if (typeof window === "undefined") return SUBSCRIPTION_PLANS;
  try {
    localStorage.removeItem(CUSTOM_PLANS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("cherry_plans_updated", { detail: SUBSCRIPTION_PLANS }));
  } catch (e) {
    console.warn("Failed to reset subscription plans:", e);
  }
  return SUBSCRIPTION_PLANS;
}

export const CUSTOM_UPI_CONFIG_STORAGE_KEY = "cherry_custom_upi_config_v1";

export interface UpiConfig {
  receiverUpiId: string;
  merchantName: string;
}

/**
 * Returns currently active UPI Receiver ID and Merchant name
 */
export function getActiveUpiConfig(): UpiConfig {
  const defaults: UpiConfig = {
    receiverUpiId: DEFAULT_RECEIVER_UPI_ID,
    merchantName: DEFAULT_MERCHANT_NAME,
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(CUSTOM_UPI_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.receiverUpiId === "string" && parsed.receiverUpiId.trim()) {
        return {
          receiverUpiId: parsed.receiverUpiId.trim(),
          merchantName: (parsed.merchantName && parsed.merchantName.trim()) || DEFAULT_MERCHANT_NAME,
        };
      }
    }
  } catch (e) {
    console.warn("Failed to load custom upi config:", e);
  }
  return defaults;
}

/**
 * Saves custom UPI Receiver ID and Merchant name and dispatches update event
 */
export function saveCustomUpiConfig(config: UpiConfig): void {
  if (typeof window === "undefined") return;
  try {
    const cleanConfig: UpiConfig = {
      receiverUpiId: config.receiverUpiId.trim() || DEFAULT_RECEIVER_UPI_ID,
      merchantName: config.merchantName.trim() || DEFAULT_MERCHANT_NAME,
    };
    localStorage.setItem(CUSTOM_UPI_CONFIG_STORAGE_KEY, JSON.stringify(cleanConfig));

    // Keep active subscription state in sync
    const current = loadSubscriptionState();
    current.customUpiReceiverId = cleanConfig.receiverUpiId;
    current.merchantName = cleanConfig.merchantName;
    saveSubscriptionState(current);

    window.dispatchEvent(new CustomEvent("cherry_upi_config_updated", { detail: cleanConfig }));
  } catch (e) {
    console.warn("Failed to save custom upi config:", e);
  }
}

/**
 * Resets UPI configuration back to default
 */
export function resetCustomUpiConfig(): UpiConfig {
  const defaults: UpiConfig = {
    receiverUpiId: DEFAULT_RECEIVER_UPI_ID,
    merchantName: DEFAULT_MERCHANT_NAME,
  };
  if (typeof window === "undefined") return defaults;
  try {
    localStorage.removeItem(CUSTOM_UPI_CONFIG_STORAGE_KEY);
    const current = loadSubscriptionState();
    current.customUpiReceiverId = defaults.receiverUpiId;
    current.merchantName = defaults.merchantName;
    saveSubscriptionState(current);

    window.dispatchEvent(new CustomEvent("cherry_upi_config_updated", { detail: defaults }));
  } catch (e) {
    console.warn("Failed to reset upi config:", e);
  }
  return defaults;
}

export function loadSubscriptionState(): SubscriptionState {
  if (typeof window === "undefined") {
    return getInitialSubscriptionState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const activeUpi = getActiveUpiConfig();
    if (!raw) {
      const initial = getInitialSubscriptionState();
      initial.customUpiReceiverId = activeUpi.receiverUpiId;
      initial.merchantName = activeUpi.merchantName;
      return initial;
    }
    const parsed = JSON.parse(raw);

    // Verify if active subscription has expired
    if (parsed.subscriptionExpires) {
      const now = new Date().getTime();
      const exp = new Date(parsed.subscriptionExpires).getTime();
      if (now > exp) {
        parsed.isPro = false;
      } else {
        parsed.isPro = true;
      }
    }
    return {
      ...getInitialSubscriptionState(),
      ...parsed,
      customUpiReceiverId: activeUpi.receiverUpiId || parsed.customUpiReceiverId || DEFAULT_RECEIVER_UPI_ID,
      merchantName: activeUpi.merchantName || parsed.merchantName || DEFAULT_MERCHANT_NAME,
    };
  } catch (e) {
    console.warn("Failed to load subscription state:", e);
    return getInitialSubscriptionState();
  }
}

export function getInitialSubscriptionState(): SubscriptionState {
  return {
    isPro: false,
    activePlanId: null,
    activePlanName: null,
    subscriptionStart: null,
    subscriptionExpires: null,
    transactions: [],
    customUpiReceiverId: DEFAULT_RECEIVER_UPI_ID,
    merchantName: DEFAULT_MERCHANT_NAME,
  };
}

export function saveSubscriptionState(state: SubscriptionState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("cherry_subscription_updated", { detail: state }));
  } catch (e) {
    console.warn("Failed to save subscription state:", e);
  }
}

/**
 * Generate Dynamic Direct UPI URI compatible with all Indian UPI Apps
 * (Google Pay, PhonePe, Paytm, BHIM, Cred, Amazon Pay)
 */
export function buildDynamicUpiUri(params: {
  receiverUpiId: string;
  merchantName: string;
  amount: number;
  transactionRef: string;
  note: string;
}): string {
  const { receiverUpiId, merchantName, amount, transactionRef, note } = params;
  const pa = encodeURIComponent(receiverUpiId.trim());
  const pn = encodeURIComponent(merchantName.trim());
  const am = amount.toFixed(2);
  const cu = "INR";
  const tr = encodeURIComponent(transactionRef);
  const tn = encodeURIComponent(note);

  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tr=${tr}&tn=${tn}`;
}

/**
 * Generates unique payment reference for UPI tracking
 */
export function generateTransactionReference(): string {
  const prefix = "CHERRY";
  const randNum = Math.floor(100000 + Math.random() * 900000);
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${randNum}-${timestamp}`;
}

/**
 * Activate subscription with confirmed transaction
 */
export function activateSubscription(params: {
  planId: "semiannual_149" | "monthly" | "quarterly" | "annual" | string;
  referenceId: string;
  studentName: string;
  customUpiId?: string;
}): { success: boolean; state: SubscriptionState } {
  const { planId, referenceId, studentName, customUpiId } = params;
  const allPlans = getActiveSubscriptionPlans();
  const plan = allPlans.find((p) => p.id === planId) || allPlans[0];
  const currentState = loadSubscriptionState();

  const now = new Date();
  const expires = new Date();
  expires.setMonth(expires.getMonth() + plan.durationMonths);

  const txnId = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newTxn: PaymentTransaction = {
    transactionId: txnId,
    referenceId: referenceId.trim() || `UPI-AUTOREF-${Date.now().toString().slice(-6)}`,
    planId: plan.id,
    planName: plan.name,
    amountINR: plan.priceINR,
    paidAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: "active",
    studentName: studentName || "Student",
    upiReceiverId: customUpiId || currentState.customUpiReceiverId || DEFAULT_RECEIVER_UPI_ID,
  };

  const updatedState: SubscriptionState = {
    ...currentState,
    isPro: true,
    activePlanId: plan.id,
    activePlanName: plan.name,
    subscriptionStart: now.toISOString(),
    subscriptionExpires: expires.toISOString(),
    transactions: [newTxn, ...currentState.transactions],
  };

  saveSubscriptionState(updatedState);

  // Sync to Student CRM subscriptions list
  try {
    recordStudentUtrPayment({
      studentName: studentName || "Student",
      utrNumber: referenceId.trim() || `UTR-${Date.now().toString().slice(-6)}`,
      planId: plan.id,
      amountINR: plan.priceINR,
      status: "active",
    });
  } catch (_) {}

  return { success: true, state: updatedState };
}

/**
 * Updates merchant receiver UPI VPA address in settings
 */
export function updateMerchantUpiConfig(upiId: string, merchantName?: string): SubscriptionState {
  const current = loadSubscriptionState();
  const updated: SubscriptionState = {
    ...current,
    customUpiReceiverId: upiId.trim() || DEFAULT_RECEIVER_UPI_ID,
    merchantName: (merchantName || current.merchantName || DEFAULT_MERCHANT_NAME).trim(),
  };
  saveSubscriptionState(updated);
  return updated;
}

/**
 * Phase 3: Student Subscriptions & UTR Management Store
 */
export function getStudentSubscriptions(): StudentSubscriptionRecord[] {
  if (typeof window === "undefined") return INITIAL_STUDENT_SUBSCRIPTIONS;
  try {
    const raw = localStorage.getItem(STUDENT_SUBSCRIPTIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STUDENT_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(INITIAL_STUDENT_SUBSCRIPTIONS));
      return INITIAL_STUDENT_SUBSCRIPTIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_STUDENT_SUBSCRIPTIONS;
  } catch (e) {
    return INITIAL_STUDENT_SUBSCRIPTIONS;
  }
}

export function saveStudentSubscriptions(records: StudentSubscriptionRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STUDENT_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent("cherry_student_subscriptions_updated", { detail: records }));
  } catch (e) {
    console.warn("Failed to save student subscriptions:", e);
  }
}

export function recordStudentUtrPayment(params: {
  studentId?: string;
  studentName: string;
  studentEmail?: string;
  utrNumber: string;
  planId: string;
  amountINR: number;
  grade?: string;
  board?: string;
  subject?: string;
  status?: "active" | "pending_verification";
}): StudentSubscriptionRecord {
  const currentList = getStudentSubscriptions();
  const plans = getActiveSubscriptionPlans();
  const targetPlan = plans.find((p) => p.id === params.planId) || plans[0];

  const now = new Date();
  const expires = new Date();
  expires.setMonth(expires.getMonth() + targetPlan.durationMonths);

  const id = params.studentId || (params.studentEmail ? `std_${params.studentEmail.split("@")[0]}` : `std_${Date.now()}`);

  const existingIndex = currentList.findIndex(
    (s) => s.id === id || (params.studentEmail && s.studentEmail === params.studentEmail) || s.studentName.toLowerCase() === params.studentName.toLowerCase()
  );

  const newRecord: StudentSubscriptionRecord = {
    id,
    studentName: params.studentName,
    studentEmail: params.studentEmail,
    grade: params.grade || "Class 10",
    board: params.board || "CBSE",
    subject: params.subject || "Science",
    isPro: params.status === "active",
    status: params.status || "pending_verification",
    planId: targetPlan.id,
    planName: targetPlan.name,
    amountINR: params.amountINR || targetPlan.priceINR,
    utrNumber: params.utrNumber.trim(),
    submittedAt: "Today, Just now",
    activatedAt: params.status === "active" ? now.toISOString() : undefined,
    expiresAt: params.status === "active" ? expires.toISOString() : undefined,
    notes: `Submitted UTR: ${params.utrNumber.trim()}`,
  };

  let updatedList: StudentSubscriptionRecord[];
  if (existingIndex >= 0) {
    updatedList = [...currentList];
    updatedList[existingIndex] = { ...updatedList[existingIndex], ...newRecord };
  } else {
    updatedList = [newRecord, ...currentList];
  }

  saveStudentSubscriptions(updatedList);
  return newRecord;
}

export function approveStudentSubscription(params: {
  studentId: string;
  planId?: string;
  adminEmail?: string;
  notes?: string;
}): StudentSubscriptionRecord | null {
  const currentList = getStudentSubscriptions();
  const plans = getActiveSubscriptionPlans();

  const index = currentList.findIndex((s) => s.id === params.studentId);
  if (index === -1) return null;

  const targetRecord = currentList[index];
  const chosenPlanId = params.planId || targetRecord.planId || "semiannual_149";
  const chosenPlan = plans.find((p) => p.id === chosenPlanId) || plans[0];

  const now = new Date();
  const expires = new Date();
  expires.setMonth(expires.getMonth() + chosenPlan.durationMonths);

  const updatedRecord: StudentSubscriptionRecord = {
    ...targetRecord,
    isPro: true,
    status: "active",
    planId: chosenPlan.id,
    planName: chosenPlan.name,
    amountINR: chosenPlan.priceINR,
    activatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    approvedBy: params.adminEmail || "Admin (onlinework0876@gmail.com)",
    notes: params.notes || `Approved by Admin. UTR ${targetRecord.utrNumber || "verified"}.`,
  };

  const updatedList = [...currentList];
  updatedList[index] = updatedRecord;
  saveStudentSubscriptions(updatedList);

  // Helper to match active student session in current browser
  const isMatchCurrentSession = (): boolean => {
    try {
      const localUserRaw = localStorage.getItem("local_active_user");
      if (localUserRaw) {
        const localUser = JSON.parse(localUserRaw);
        if (
          localUser.uid === targetRecord.id ||
          (localUser.email && targetRecord.studentEmail && localUser.email.toLowerCase() === targetRecord.studentEmail.toLowerCase()) ||
          (localUser.displayName && localUser.displayName.toLowerCase() === targetRecord.studentName.toLowerCase())
        ) {
          return true;
        }
      }
      const profileRaw = localStorage.getItem("cherry_student_profile");
      if (profileRaw) {
        const profile = JSON.parse(profileRaw);
        if (profile.name && profile.name.toLowerCase() === targetRecord.studentName.toLowerCase()) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  };

  if (isMatchCurrentSession()) {
    const currentSub = loadSubscriptionState();
    saveSubscriptionState({
      ...currentSub,
      isPro: true,
      activePlanId: chosenPlan.id,
      activePlanName: chosenPlan.name,
      subscriptionStart: now.toISOString(),
      subscriptionExpires: expires.toISOString(),
    });
  }

  return updatedRecord;
}

export function revokeStudentSubscription(params: {
  studentId: string;
  reason?: string;
}): StudentSubscriptionRecord | null {
  const currentList = getStudentSubscriptions();
  const index = currentList.findIndex((s) => s.id === params.studentId);
  if (index === -1) return null;

  const targetRecord = currentList[index];
  const updatedRecord: StudentSubscriptionRecord = {
    ...targetRecord,
    isPro: false,
    status: "suspended",
    notes: params.reason ? `Access revoked: ${params.reason}` : "Access suspended by Admin.",
  };

  const updatedList = [...currentList];
  updatedList[index] = updatedRecord;
  saveStudentSubscriptions(updatedList);

  // If matches active session, sync local state
  try {
    let matched = false;
    const localUserRaw = localStorage.getItem("local_active_user");
    if (localUserRaw) {
      const localUser = JSON.parse(localUserRaw);
      if (
        localUser.uid === targetRecord.id ||
        (localUser.email && targetRecord.studentEmail && localUser.email.toLowerCase() === targetRecord.studentEmail.toLowerCase()) ||
        (localUser.displayName && localUser.displayName.toLowerCase() === targetRecord.studentName.toLowerCase())
      ) {
        matched = true;
      }
    }
    const profileRaw = localStorage.getItem("cherry_student_profile");
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      if (profile.name && profile.name.toLowerCase() === targetRecord.studentName.toLowerCase()) {
        matched = true;
      }
    }
    if (matched) {
      const currentSub = loadSubscriptionState();
      saveSubscriptionState({
        ...currentSub,
        isPro: false,
        activePlanId: null,
        activePlanName: null,
      });
    }
  } catch (_) {}

  return updatedRecord;
}

export function extendStudentSubscription(params: {
  studentId: string;
  extraMonths: number;
}): StudentSubscriptionRecord | null {
  const currentList = getStudentSubscriptions();
  const index = currentList.findIndex((s) => s.id === params.studentId);
  if (index === -1) return null;

  const target = currentList[index];
  const baseDate = target.expiresAt ? new Date(target.expiresAt) : new Date();
  const newExpires = new Date(baseDate);
  newExpires.setMonth(newExpires.getMonth() + params.extraMonths);

  const updated: StudentSubscriptionRecord = {
    ...target,
    isPro: true,
    status: "active",
    expiresAt: newExpires.toISOString(),
    notes: (target.notes || "") + ` Extended +${params.extraMonths} months on ${new Date().toLocaleDateString()}.`,
  };

  const updatedList = [...currentList];
  updatedList[index] = updated;
  saveStudentSubscriptions(updatedList);

  // If matches active session, sync extended expiry date
  try {
    let matched = false;
    const localUserRaw = localStorage.getItem("local_active_user");
    if (localUserRaw) {
      const localUser = JSON.parse(localUserRaw);
      if (
        localUser.uid === target.id ||
        (localUser.email && target.studentEmail && localUser.email.toLowerCase() === target.studentEmail.toLowerCase()) ||
        (localUser.displayName && localUser.displayName.toLowerCase() === target.studentName.toLowerCase())
      ) {
        matched = true;
      }
    }
    const profileRaw = localStorage.getItem("cherry_student_profile");
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      if (profile.name && profile.name.toLowerCase() === target.studentName.toLowerCase()) {
        matched = true;
      }
    }
    if (matched) {
      const currentSub = loadSubscriptionState();
      saveSubscriptionState({
        ...currentSub,
        isPro: true,
        subscriptionExpires: newExpires.toISOString(),
      });
    }
  } catch (_) {}

  return updated;
}

/**
 * PHASE 4: SUBSCRIPTION EXPIRY & GRACE PERIOD CALCULATOR
 */
export interface SubscriptionExpiryStatus {
  isExpired: boolean;
  daysRemaining: number;
  isExpiringSoon: boolean;
  expiryDateFormatted: string;
}

export function getSubscriptionExpiryStatus(expiresAt?: string): SubscriptionExpiryStatus {
  if (!expiresAt) {
    return { isExpired: false, daysRemaining: 0, isExpiringSoon: false, expiryDateFormatted: "Active" };
  }
  const expDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = diffMs <= 0;
  const isExpiringSoon = !isExpired && daysRemaining <= 7 && daysRemaining >= 0;
  const expiryDateFormatted = expDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return {
    isExpired,
    daysRemaining: Math.max(0, daysRemaining),
    isExpiringSoon,
    expiryDateFormatted,
  };
}

/**
 * PHASE 4: 1-CLICK FINANCIAL AUDIT LEDGER EXPORT (CSV)
 */
export function exportSubscriptionsToCSV(subscriptions: StudentSubscriptionRecord[]): void {
  if (typeof window === "undefined" || !subscriptions || subscriptions.length === 0) return;

  const headers = [
    "Receipt ID",
    "Student Name",
    "Email",
    "Grade",
    "Board",
    "Subject",
    "Status",
    "Pro Access",
    "Plan Name",
    "Amount (INR)",
    "UTR Reference No",
    "Submitted Date",
    "Activated Date",
    "Expiry Date",
    "Approved By",
    "Admin Notes",
  ];

  const escapeCSV = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = subscriptions.map((s) => {
    const receiptNo = `CHERRY-REC-2026-${(s.utrNumber || s.id || "000000").slice(-6).toUpperCase()}`;
    return [
      escapeCSV(receiptNo),
      escapeCSV(s.studentName),
      escapeCSV(s.studentEmail || ""),
      escapeCSV(s.grade || ""),
      escapeCSV(s.board || ""),
      escapeCSV(s.subject || ""),
      escapeCSV(s.status.toUpperCase()),
      escapeCSV(s.isPro ? "ACTIVE" : "INACTIVE"),
      escapeCSV(s.planName),
      escapeCSV(s.amountINR),
      escapeCSV(s.utrNumber || ""),
      escapeCSV(s.submittedAt),
      escapeCSV(s.activatedAt || ""),
      escapeCSV(s.expiresAt || ""),
      escapeCSV(s.approvedBy || ""),
      escapeCSV(s.notes || ""),
    ];
  });

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", `CherryAI_Financial_Audit_Ledger_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * PHASE 4: FIRESTORE CLOUD PERSISTENCE & CROSS-DEVICE SYNC
 */
export async function syncSubscriptionSettingsFromCloud(): Promise<{
  plans: SubscriptionPlan[];
  upiConfig: UpiConfig;
} | null> {
  try {
    const configDocRef = doc(db, "systemConfig", "subscriptionSettings");
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.plans) && data.plans.length > 0) {
        saveCustomSubscriptionPlans(data.plans);
      }
      if (data.upiConfig && data.upiConfig.receiverUpiId) {
        saveCustomUpiConfig(data.upiConfig);
      }
      return {
        plans: data.plans || getActiveSubscriptionPlans(),
        upiConfig: data.upiConfig || getActiveUpiConfig(),
      };
    }
  } catch (err) {
    console.warn("Could not sync subscription settings from Firestore cloud:", err);
  }
  return null;
}

export async function saveSubscriptionSettingsToCloud(
  plans: SubscriptionPlan[],
  upiConfig: UpiConfig
): Promise<boolean> {
  try {
    const configDocRef = doc(db, "systemConfig", "subscriptionSettings");
    await setDoc(
      configDocRef,
      {
        plans,
        upiConfig,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || "Admin (onlinework0876@gmail.com)",
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn("Could not persist subscription settings to Firestore:", err);
    return false;
  }
}

export async function syncStudentSubscriptionsFromCloud(): Promise<StudentSubscriptionRecord[]> {
  try {
    const colRef = collection(db, "studentSubscriptions");
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const cloudRecords: StudentSubscriptionRecord[] = [];
      snap.forEach((d) => {
        cloudRecords.push({ ...(d.data() as StudentSubscriptionRecord), id: d.id });
      });

      const localRecords = getStudentSubscriptions();
      const mergedMap = new Map<string, StudentSubscriptionRecord>();
      localRecords.forEach((r) => mergedMap.set(r.id, r));
      cloudRecords.forEach((r) => mergedMap.set(r.id, r));
      const mergedList = Array.from(mergedMap.values());

      saveStudentSubscriptions(mergedList);
      return mergedList;
    }
  } catch (err) {
    console.warn("Could not sync student subscriptions from Firestore:", err);
  }
  return getStudentSubscriptions();
}

export async function saveStudentSubscriptionToCloud(
  record: StudentSubscriptionRecord
): Promise<boolean> {
  try {
    const docRef = doc(db, "studentSubscriptions", record.id);
    await setDoc(docRef, record, { merge: true });
    return true;
  } catch (err) {
    console.warn("Could not save student subscription to Firestore:", err);
    return false;
  }
}

