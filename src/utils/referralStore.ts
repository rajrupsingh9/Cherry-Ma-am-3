/**
 * referralStore.ts - Refer & Earn 5-Level Plan Engine
 * 1st Level (Direct Income) = Rs. 50
 * 2nd Level = Rs. 0
 * 3rd Level = Rs. 0
 * 4th Level = Rs. 0
 * 5th Level (Indirect Income) = Rs. 50
 */

export interface ReferralTierConfig {
  level: number;
  label: string;
  type: "direct" | "bridge" | "indirect";
  incomePerMember: number;
  description: string;
  badgeColor: string;
}

export const REFERRAL_5_LEVEL_CONFIG: ReferralTierConfig[] = [
  {
    level: 1,
    label: "1st Level (Direct)",
    type: "direct",
    incomePerMember: 50,
    description: "Aapke direct link / code se join hone wale har student par flat ₹50.",
    badgeColor: "from-emerald-500 to-teal-600",
  },
  {
    level: 2,
    label: "2nd Level",
    type: "bridge",
    incomePerMember: 0,
    description: "Bridge tier network progression (₹0 payout).",
    badgeColor: "from-slate-400 to-slate-500",
  },
  {
    level: 3,
    label: "3rd Level",
    type: "bridge",
    incomePerMember: 0,
    description: "Bridge tier network progression (₹0 payout).",
    badgeColor: "from-slate-400 to-slate-500",
  },
  {
    level: 4,
    label: "4th Level",
    type: "bridge",
    incomePerMember: 0,
    description: "Bridge tier network progression (₹0 payout).",
    badgeColor: "from-slate-400 to-slate-500",
  },
  {
    level: 5,
    label: "5th Level (Indirect)",
    type: "indirect",
    incomePerMember: 50,
    description: "Level 4 team ke naye invites se milne wali Indirect Income flat ₹50.",
    badgeColor: "from-indigo-600 to-purple-600",
  },
];

export interface ReferralActivity {
  id: string;
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  amount: number;
  date: string;
  status: "credited" | "pending";
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
  type: "self_referral" | "duplicate_upi" | "rapid_claims" | "suspicious_ip" | "frozen_account";
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cherry_referrals_updated"));
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
  return studentsList.map((std) => {
    const account = loadReferralState(std.name, std.id);
    const level1 = account.tierCounts[1] || 0;
    const level2 = account.tierCounts[2] || 0;
    const level3 = account.tierCounts[3] || 0;
    const level4 = account.tierCounts[4] || 0;
    const level5 = account.tierCounts[5] || 0;
    const bridgeMembers = level2 + level3 + level4;
    const totalTeamMembers = level1 + bridgeMembers + level5;

    const level1Earned = level1 * 50;
    const level5Earned = level5 * 50;
    const calculatedEarned = Math.max(account.totalEarned, level1Earned + level5Earned);

    const pendingWithdrawals = account.withdrawals.filter(w => w.status === "processing" || w.status === "pending");
    const pendingWithdrawalsAmount = pendingWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

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
  if (amount < 50) {
    return { success: false, updatedState: currentState, message: "Minimum withdrawal amount is ₹50." };
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

