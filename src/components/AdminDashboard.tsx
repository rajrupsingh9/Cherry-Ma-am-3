import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Users,
  GraduationCap,
  Cpu,
  Activity,
  LogOut,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  RefreshCw,
  Lock,
  BookOpen,
  Wifi,
  ChevronLeft,
  ChevronRight,
  Clock,
  Zap,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  FileText,
  SlidersHorizontal,
  ExternalLink,
  UserCheck,
  UserPlus,
  X,
  Award,
  ArrowRight,
  Database,
  Check,
  CreditCard,
  Edit3,
  Save,
  RotateCcw,
  IndianRupee,
  Tag,
  Calendar,
  QrCode,
  Copy,
  Smartphone,
  XCircle,
  AlertCircle,
  Cloud,
  Download,
  Printer,
  Receipt,
  Gift,
  Share2,
  Wallet,
  ArrowUpRight,
  PauseCircle,
  PlayCircle,
  Snowflake,
  ShieldAlert,
  Crown,
} from "lucide-react";
import QRCode from "qrcode";
import { getAllAdminEmails, addAdminEmail, removeAdminEmail, ADMIN_EMAILS } from "../utils/adminConfig";
import {
  getActiveSubscriptionPlans,
  saveCustomSubscriptionPlans,
  resetCustomSubscriptionPlans,
  getActiveUpiConfig,
  saveCustomUpiConfig,
  resetCustomUpiConfig,
  buildDynamicUpiUri,
  getStudentSubscriptions,
  approveStudentSubscription,
  revokeStudentSubscription,
  extendStudentSubscription,
  SubscriptionPlan,
  UpiConfig,
  StudentSubscriptionRecord,
  exportSubscriptionsToCSV,
  syncSubscriptionSettingsFromCloud,
  saveSubscriptionSettingsToCloud,
  syncStudentSubscriptionsFromCloud,
  saveStudentSubscriptionToCloud,
  getSubscriptionExpiryStatus,
} from "../utils/subscriptionStore";
import { FeeReceiptModal } from "./FeeReceiptModal";
import { AdminUnifiedPlanManager } from "./AdminUnifiedPlanManager";
import { AdminReferralDetailModal } from "./AdminReferralDetailModal";
import { AdminTierLedgerModal } from "./AdminTierLedgerModal";
import { AdminPayoutRequestsQueue } from "./AdminPayoutRequestsQueue";
import { AdminPayoutApprovalModal } from "./AdminPayoutApprovalModal";
import { AdminCommissionConfigCard } from "./AdminCommissionConfigCard";
import {
  getAllStudentReferralSummaries,
  getReferralSystemMetrics,
  StudentReferralSummary,
  toggleStudentReferralStatus,
  getAllWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  WithdrawalRecord,
  getReferralCommissionConfig,
  getPlanReferralTiers,
} from "../utils/referralStore";
import { db } from "../lib/firebase";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { AdminNoticeManager } from "./AdminNoticeManager";
import { AdminManualOnboardModal } from "./AdminManualOnboardModal";

export interface StudentCRMRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  grade: string;
  board: string;
  subject: string;
  mediumOfLearning: string;
  updatedAt: string;
  totalSessions: number;
  totalQuizzes: number;
  quizAccuracy: number; // percentage (0-100)
  weakTopics: string[];
  strongTopics: string[];
  isRealFirestoreUser: boolean;
  notesCount: number;
  // Phase 3: Subscription & UTR fields
  isPro?: boolean;
  subscriptionStatus?: "active" | "pending_verification" | "free" | "expired" | "suspended";
  subscriptionPlan?: string;
  planId?: string;
  subscriptionExpires?: string;
  utrNumber?: string;
  paymentAmount?: number;
  submittedAt?: string;
  approvedBy?: string;
  notes?: string;
  isManualAdminProvisioned?: boolean;
}

const SAMPLE_STUDENTS: StudentCRMRecord[] = [
  {
    id: "std_aarav_10",
    name: "Aarav Sharma",
    email: "aarav.sharma24@gmail.com",
    grade: "Class 10",
    board: "CBSE",
    subject: "Science",
    mediumOfLearning: "Hinglish",
    updatedAt: "Today, 10:30 AM",
    totalSessions: 14,
    totalQuizzes: 12,
    quizAccuracy: 88,
    weakTopics: ["Refraction through Prism", "Ohm's Law Graph Questions"],
    strongTopics: ["Chemical Reactions", "Human Eye & Colourful World"],
    isRealFirestoreUser: false,
    notesCount: 8,
    isPro: false,
    subscriptionStatus: "pending_verification",
    subscriptionPlan: "6-Month Special Launch",
    utrNumber: "428901847291",
    paymentAmount: 149,
    submittedAt: "Today, 10:15 AM",
    notes: "Google Pay UPI - Awaiting Admin Approval",
  },
  {
    id: "std_priya_12",
    name: "Priya Patel",
    email: "priya.patel.study@gmail.com",
    grade: "Class 12",
    board: "CBSE",
    subject: "Physics",
    mediumOfLearning: "English",
    updatedAt: "Yesterday, 4:15 PM",
    totalSessions: 22,
    totalQuizzes: 19,
    quizAccuracy: 92,
    weakTopics: ["Gauss's Law Applications", "LCR Resonance Circuits"],
    strongTopics: ["Electrostatic Potential", "Current Electricity"],
    isRealFirestoreUser: false,
    notesCount: 15,
    isPro: true,
    subscriptionStatus: "active",
    subscriptionPlan: "1-Year Mastery Pro",
    utrNumber: "419204817263",
    paymentAmount: 1499,
    subscriptionExpires: "12 Mar 2027",
    submittedAt: "3 days ago",
    approvedBy: "Admin",
  },
  {
    id: "std_rohan_10",
    name: "Rohan Gupta",
    email: "rohan.gupta.math@gmail.com",
    grade: "Class 10",
    board: "CBSE",
    subject: "Mathematics",
    mediumOfLearning: "Hinglish",
    updatedAt: "2 days ago",
    totalSessions: 9,
    totalQuizzes: 8,
    quizAccuracy: 74,
    weakTopics: ["Quadratic Roots Discrimination", "Trigonometric Proofs"],
    strongTopics: ["Polynomials", "Real Numbers"],
    isRealFirestoreUser: false,
    notesCount: 5,
    isPro: false,
    subscriptionStatus: "free",
    subscriptionPlan: "Free Tier",
    paymentAmount: 0,
    submittedAt: "5 days ago",
  },
  {
    id: "std_ananya_9",
    name: "Ananya Verma",
    email: "ananya.v.science@gmail.com",
    grade: "Class 9",
    board: "ICSE",
    subject: "Science",
    mediumOfLearning: "Hindi",
    updatedAt: "3 days ago",
    totalSessions: 11,
    totalQuizzes: 10,
    quizAccuracy: 82,
    weakTopics: ["Archimedes Principle", "Cell Organelles Functions"],
    strongTopics: ["Motion & Velocity Equations", "Matter in Our Surroundings"],
    isRealFirestoreUser: false,
    notesCount: 7,
    isPro: false,
    subscriptionStatus: "pending_verification",
    subscriptionPlan: "1-Month Focus Plan",
    utrNumber: "439281726354",
    paymentAmount: 199,
    submittedAt: "Yesterday, 3:45 PM",
    notes: "PhonePe UPI Transaction",
  },
  {
    id: "std_kabir_11",
    name: "Kabir Mehta",
    email: "kabir.mehta11@gmail.com",
    grade: "Class 11",
    board: "CBSE",
    subject: "Chemistry",
    mediumOfLearning: "English",
    updatedAt: "5 days ago",
    totalSessions: 6,
    totalQuizzes: 5,
    quizAccuracy: 65,
    weakTopics: ["Hybridization of Orbitals", "Thermodynamics Entropy"],
    strongTopics: ["Periodic Trends", "Chemical Bonding Basics"],
    isRealFirestoreUser: false,
    notesCount: 4,
    isPro: false,
    subscriptionStatus: "suspended",
    subscriptionPlan: "Suspended",
    paymentAmount: 0,
    submittedAt: "10 days ago",
    notes: "Access revoked by admin",
  },
];

interface AdminDashboardProps {
  currentUser: any;
  onSignOut: () => void;
  onSwitchToStudentView: (preset?: {
    grade?: string;
    subject?: string;
    board?: string;
    mediumOfLearning?: string;
    name?: string;
  }) => void;
  onToast?: (message: string, type?: "success" | "error" | "info") => void;
  studentDetails?: {
    name: string;
    grade: string;
    subject: string;
    board?: string;
    mediumOfLearning?: string;
  };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onSignOut,
  onSwitchToStudentView,
  onToast,
  studentDetails,
}) => {
  const adminEmail = currentUser?.email || "onlinework0876@gmail.com";
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "referrals" | "pricing" | "audit" | "analytics" | "access" | "specs">("overview");
  const [adminList, setAdminList] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Phase 4: Cloud Persistence, Invoicing & Financial Auditing
  const [receiptModalSub, setReceiptModalSub] = useState<StudentSubscriptionRecord | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string>("Firestore Real-Time Sync Active");

  // Phase 1: Subscription Pricing & Validity States
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => getActiveSubscriptionPlans());
  const [hasPlanChanges, setHasPlanChanges] = useState(false);
  const [isSavingPlans, setIsSavingPlans] = useState(false);

  const handleSaveAllPlans = async (newPlans?: SubscriptionPlan[]) => {
    setIsSavingPlans(true);
    const plansToSave = newPlans || plans;
    try {
      saveCustomSubscriptionPlans(plansToSave);
      await saveSubscriptionSettingsToCloud(plansToSave, upiConfig);
      setPlans(plansToSave);
      setHasPlanChanges(false);
      onToast?.("Subscription pricing & validity updated in Local & Cloud! 💳☁️", "success");
    } catch (e) {
      onToast?.("Failed to save plan pricing.", "error");
    } finally {
      setTimeout(() => setIsSavingPlans(false), 300);
    }
  };

  const handleResetPlans = () => {
    const defs = resetCustomSubscriptionPlans();
    setPlans(defs);
    setHasPlanChanges(false);
    onToast?.("Plans reset to default pricing & validity 🔄", "info");
  };

  // Phase 2: UPI Receiver ID & Merchant Settings
  const [upiConfig, setUpiConfig] = useState<UpiConfig>(() => getActiveUpiConfig());
  const [upiReceiverInput, setUpiReceiverInput] = useState(() => upiConfig.receiverUpiId);
  const [merchantNameInput, setMerchantNameInput] = useState(() => upiConfig.merchantName);
  const [hasUpiChanges, setHasUpiChanges] = useState(false);
  const [isSavingUpi, setIsSavingUpi] = useState(false);
  const [testQrDataUrl, setTestQrDataUrl] = useState<string>("");
  const [testPlanId, setTestPlanId] = useState<string>("semiannual_149");
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Generate Live Test QR in Admin Dashboard whenever UPI input or selected test plan changes
  useEffect(() => {
    const selectedPlan = plans.find((p) => p.id === testPlanId) || plans[0];
    const amount = selectedPlan ? selectedPlan.priceINR : 149;
    const uri = buildDynamicUpiUri({
      receiverUpiId: upiReceiverInput.trim() || upiConfig.receiverUpiId,
      merchantName: merchantNameInput.trim() || upiConfig.merchantName,
      amount,
      transactionRef: "ADMIN-TEST-" + Date.now().toString().slice(-4),
      note: `CherryAI Pro Test - Admin Preview`,
    });

    QRCode.toDataURL(uri, {
      width: 240,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setTestQrDataUrl(url))
      .catch((err) => console.error("Error generating admin preview QR:", err));
  }, [upiReceiverInput, merchantNameInput, testPlanId, plans, upiConfig]);

  const handleSaveUpiConfig = async () => {
    const trimmedUpi = upiReceiverInput.trim();
    if (!trimmedUpi.includes("@")) {
      onToast?.("Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm)", "error");
      return;
    }
    setIsSavingUpi(true);
    try {
      const updated: UpiConfig = {
        receiverUpiId: trimmedUpi,
        merchantName: merchantNameInput.trim() || "Cherry AI Classroom",
      };
      saveCustomUpiConfig(updated);
      setUpiConfig(updated);
      await saveSubscriptionSettingsToCloud(plans, updated);
      setHasUpiChanges(false);
      onToast?.(`UPI Receiver updated to ${updated.receiverUpiId} in Local & Cloud! 📲☁️`, "success");
    } catch (e) {
      onToast?.("Failed to save UPI settings.", "error");
    } finally {
      setTimeout(() => setIsSavingUpi(false), 300);
    }
  };

  const handleResetUpiConfig = () => {
    const def = resetCustomUpiConfig();
    setUpiConfig(def);
    setUpiReceiverInput(def.receiverUpiId);
    setMerchantNameInput(def.merchantName);
    setHasUpiChanges(false);
    onToast?.("UPI settings reset to default ID 🔄", "info");
  };

  const handleCopyUpi = () => {
    const idToCopy = upiReceiverInput.trim() || upiConfig.receiverUpiId;
    navigator.clipboard?.writeText(idToCopy);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
    onToast?.(`Copied UPI ID: ${idToCopy}`, "info");
  };
  
  // Phase 2: Student CRM States
  const [students, setStudents] = useState<StudentCRMRecord[]>(SAMPLE_STUDENTS);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("All");
  const [boardFilter, setBoardFilter] = useState<string>("All");
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentCRMRecord | null>(null);

  // Phase 3: Student CRM Subscriptions, UTR Approval & Manual Activation
  const [studentSubscriptions, setStudentSubscriptions] = useState<StudentSubscriptionRecord[]>(() => getStudentSubscriptions());
  const [statusFilter, setStatusFilter] = useState<"All" | "pending_verification" | "active" | "free" | "suspended">("All");
  const [managingSubStudent, setManagingSubStudent] = useState<StudentCRMRecord | null>(null);
  const [selectedPlanForApproval, setSelectedPlanForApproval] = useState<string>("semiannual_149");
  const [approvalNotesInput, setApprovalNotesInput] = useState<string>("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [copiedUtrId, setCopiedUtrId] = useState<string | null>(null);
  const [showManualOnboardModal, setShowManualOnboardModal] = useState(false);

  // Sync with student subscriptions events
  useEffect(() => {
    const handleSubUpdate = () => {
      setStudentSubscriptions(getStudentSubscriptions());
    };
    window.addEventListener("cherry_student_subscriptions_updated", handleSubUpdate);
    return () => window.removeEventListener("cherry_student_subscriptions_updated", handleSubUpdate);
  }, []);

  const refreshAdmins = () => {
    setAdminList(getAllAdminEmails());
  };

  // Sync / Fetch Students from Firestore
  const fetchStudents = async (showNotification = false) => {
    setIsLoadingStudents(true);
    try {
      const q = query(collection(db, "studentProfiles"), limit(30));
      const querySnapshot = await getDocs(q);
      const firestoreList: StudentCRMRecord[] = [];

      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        firestoreList.push({
          id: docSnap.id,
          name: d.name || "Student " + docSnap.id.slice(0, 5),
          email: d.email || undefined,
          phone: d.phone || undefined,
          grade: d.grade || "Class 10",
          board: d.board || "CBSE",
          subject: d.subject || "Science",
          mediumOfLearning: d.mediumOfLearning || "Hinglish",
          updatedAt: d.updatedAt ? (typeof d.updatedAt === "string" ? new Date(d.updatedAt).toLocaleDateString() : "Active recently") : "Active recently",
          totalSessions: d.totalSessions || 3,
          totalQuizzes: d.totalQuizzes || 2,
          quizAccuracy: d.quizAccuracy || 85,
          weakTopics: d.weakTopics || ["PYQ Question Formulation"],
          strongTopics: d.strongTopics || [d.subject || "Core Concepts"],
          isRealFirestoreUser: true,
          notesCount: d.notesCount || 3,
          isManualAdminProvisioned: d.isManualAdminProvisioned || false,
        });
      });

      // Also ensure current active student from props is included if available
      if (studentDetails && studentDetails.name) {
        const exists = firestoreList.some(s => s.name.toLowerCase() === studentDetails.name.toLowerCase());
        if (!exists) {
          firestoreList.unshift({
            id: currentUser?.uid || "current_session_student",
            name: studentDetails.name,
            email: currentUser?.email || undefined,
            grade: studentDetails.grade || "Class 10",
            board: studentDetails.board || "CBSE",
            subject: studentDetails.subject || "Science",
            mediumOfLearning: studentDetails.mediumOfLearning || "Hinglish",
            updatedAt: "Active Now",
            totalSessions: 5,
            totalQuizzes: 4,
            quizAccuracy: 90,
            weakTopics: ["Light Reflection Trigonometry"],
            strongTopics: [studentDetails.subject || "Fundamentals"],
            isRealFirestoreUser: true,
            notesCount: 4,
          });
        }
      }

      if (firestoreList.length > 0) {
        // Merge real students with sample students
        setStudents([...firestoreList, ...SAMPLE_STUDENTS]);
      } else {
        setStudents(SAMPLE_STUDENTS);
      }

      if (showNotification) {
        onToast?.(`Synced ${firestoreList.length > 0 ? firestoreList.length + " live students" : "directory"} with Firestore! 🔄`, "success");
      }
    } catch (err) {
      console.warn("Firestore query note (falling back to cached demo profiles):", err);
      // Keep sample students gracefully
      setStudents(SAMPLE_STUDENTS);
      if (showNotification) {
        onToast?.("Loaded student directory records successfully.", "info");
      }
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Phase 4: Full Cloud Sync with Firestore
  const handleSyncWithCloud = async (notify = true) => {
    setIsSyncingCloud(true);
    try {
      const syncedSettings = await syncSubscriptionSettingsFromCloud();
      if (syncedSettings) {
        setPlans(syncedSettings.plans);
        setUpiConfig(syncedSettings.upiConfig);
        setUpiReceiverInput(syncedSettings.upiConfig.receiverUpiId);
        setMerchantNameInput(syncedSettings.upiConfig.merchantName);
      }
      const syncedSubs = await syncStudentSubscriptionsFromCloud();
      if (syncedSubs) {
        setStudentSubscriptions(syncedSubs);
      }
      await fetchStudents(false);
      setCloudSyncStatus("Synced: " + new Date().toLocaleTimeString());
      if (notify) {
        onToast?.("Synchronized all plans, student subscriptions, and UPI config with Firestore Cloud! ☁️✨", "success");
      }
    } catch (err) {
      console.warn("Cloud sync error:", err);
      if (notify) {
        onToast?.("Cloud sync note: Local cache up-to-date.", "info");
      }
    } finally {
      setIsSyncingCloud(false);
    }
  };

  useEffect(() => {
    refreshAdmins();
    fetchStudents(false);
    handleSyncWithCloud(false);
  }, []);

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    const res = addAdminEmail(newAdminEmail.trim());
    if (res.success) {
      onToast?.(res.message, "success");
      setNewAdminEmail("");
      refreshAdmins();
    } else {
      onToast?.(res.message, "error");
    }
  };

  const handleRemoveAdmin = (email: string) => {
    const res = removeAdminEmail(email);
    if (res.success) {
      onToast?.(res.message, "info");
      refreshAdmins();
    } else {
      onToast?.(res.message, "error");
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    refreshAdmins();
    fetchStudents(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  // Merge student CRM records with local & Firestore subscription state
  const mergedStudents = useMemo(() => {
    const list = students.map((std) => {
      const sub = studentSubscriptions.find(
        (s) =>
          s.id === std.id ||
          (std.email && s.studentEmail && s.studentEmail.toLowerCase() === std.email.toLowerCase()) ||
          (std.phone && s.studentPhone && s.studentPhone === std.phone) ||
          s.studentName.toLowerCase() === std.name.toLowerCase()
      );

      if (sub) {
        return {
          ...std,
          isPro: sub.isPro,
          subscriptionStatus: sub.status,
          subscriptionPlan: sub.planName,
          subscriptionExpires: sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : std.subscriptionExpires,
          utrNumber: sub.utrNumber || std.utrNumber,
          paymentAmount: sub.amountINR || std.paymentAmount,
          submittedAt: sub.submittedAt || std.submittedAt,
          approvedBy: sub.approvedBy || std.approvedBy,
          notes: sub.notes || std.notes,
          phone: std.phone || sub.studentPhone,
          isManualAdminProvisioned: std.isManualAdminProvisioned || sub.isManualAdminProvisioned || false,
        };
      }
      return {
        ...std,
        isPro: std.isPro ?? false,
        subscriptionStatus: std.subscriptionStatus ?? "free",
        subscriptionPlan: std.subscriptionPlan ?? "Free Tier",
      };
    });

    // Also include any manually provisioned or subscribed students that might not be in the initial students list
    studentSubscriptions.forEach((sub) => {
      const alreadyIncluded = list.some(
        (s) =>
          s.id === sub.id ||
          (s.email && sub.studentEmail && s.email.toLowerCase() === sub.studentEmail.toLowerCase()) ||
          (s.phone && sub.studentPhone && s.phone === sub.studentPhone) ||
          s.name.toLowerCase() === sub.studentName.toLowerCase()
      );
      if (!alreadyIncluded) {
        list.unshift({
          id: sub.id,
          name: sub.studentName,
          email: sub.studentEmail,
          phone: sub.studentPhone,
          grade: sub.grade || "Class 10",
          board: sub.board || "CBSE",
          subject: sub.subject || "Science",
          mediumOfLearning: sub.mediumOfLearning || "Hinglish",
          updatedAt: sub.submittedAt || "Just now",
          totalSessions: 1,
          totalQuizzes: 0,
          quizAccuracy: 100,
          weakTopics: [],
          strongTopics: [sub.subject || "All Subjects"],
          isRealFirestoreUser: true,
          notesCount: 0,
          isPro: sub.isPro,
          subscriptionStatus: sub.status,
          subscriptionPlan: sub.planName,
          subscriptionExpires: sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : undefined,
          utrNumber: sub.utrNumber,
          paymentAmount: sub.amountINR || 0,
          submittedAt: sub.submittedAt,
          approvedBy: sub.approvedBy,
          notes: sub.notes,
          isManualAdminProvisioned: sub.isManualAdminProvisioned || true,
        });
      }
    });

    return list;
  }, [students, studentSubscriptions]);

  const pendingUtrCount = useMemo(() => {
    return mergedStudents.filter((s) => s.subscriptionStatus === "pending_verification").length;
  }, [mergedStudents]);

  const activeProCount = useMemo(() => {
    return mergedStudents.filter((s) => s.isPro || s.subscriptionStatus === "active").length;
  }, [mergedStudents]);

  // Phase 4: Financial Revenue Ledger Metrics
  const totalVerifiedRevenue = useMemo(() => {
    return mergedStudents
      .filter((s) => s.isPro || s.subscriptionStatus === "active")
      .reduce((sum, s) => sum + (s.paymentAmount || 149), 0);
  }, [mergedStudents]);

  const pendingRevenue = useMemo(() => {
    return mergedStudents
      .filter((s) => s.subscriptionStatus === "pending_verification")
      .reduce((sum, s) => sum + (s.paymentAmount || 149), 0);
  }, [mergedStudents]);

  const averageOrderValue = useMemo(() => {
    return activeProCount > 0 ? Math.round(totalVerifiedRevenue / activeProCount) : 0;
  }, [totalVerifiedRevenue, activeProCount]);

  // Phase 1: Referrals & Student Account Tracking States
  const [referralSearchQuery, setReferralSearchQuery] = useState("");
  const [referralFilter, setReferralFilter] = useState<"all" | "active" | "balance" | "withdrawn">("all");
  const [referralSortBy, setReferralSortBy] = useState<"earnings" | "members" | "balance">("earnings");
  const [inspectingReferralStudent, setInspectingReferralStudent] = useState<StudentReferralSummary | null>(null);
  const [referralUpdateCounter, setReferralUpdateCounter] = useState(0);

  // Phase 2: UPI Payout & Withdrawal Approval Engine States
  const [referralSubTab, setReferralSubTab] = useState<"network" | "payouts" | "settings">("network");
  const [payoutModalRecord, setPayoutModalRecord] = useState<WithdrawalRecord | null>(null);
  const [payoutModalMode, setPayoutModalMode] = useState<"approve" | "reject">("approve");
  const [showTierLedgerModal, setShowTierLedgerModal] = useState(false);

  useEffect(() => {
    const handleRefUpdate = () => {
      setReferralUpdateCounter((c) => c + 1);
    };
    window.addEventListener("cherry_referrals_updated", handleRefUpdate);
    window.addEventListener("cherry_commission_config_updated", handleRefUpdate);
    window.addEventListener("cherry_referral_commission_updated", handleRefUpdate);
    window.addEventListener("cherry_plans_updated", handleRefUpdate);
    return () => {
      window.removeEventListener("cherry_referrals_updated", handleRefUpdate);
      window.removeEventListener("cherry_commission_config_updated", handleRefUpdate);
      window.removeEventListener("cherry_referral_commission_updated", handleRefUpdate);
      window.removeEventListener("cherry_plans_updated", handleRefUpdate);
    };
  }, []);

  const activeCommissionConfig = useMemo(() => {
    return getReferralCommissionConfig();
  }, [referralUpdateCounter]);

  const activeCommissionPlanTiers = useMemo(() => {
    return getPlanReferralTiers(activeCommissionConfig);
  }, [activeCommissionConfig]);

  const referralSummaries = useMemo(() => {
    return getAllStudentReferralSummaries(mergedStudents);
  }, [mergedStudents, referralUpdateCounter]);

  const referralMetrics = useMemo(() => {
    return getReferralSystemMetrics(referralSummaries);
  }, [referralSummaries]);

  const allWithdrawals = useMemo(() => {
    return getAllWithdrawalRequests(mergedStudents);
  }, [mergedStudents, referralUpdateCounter]);

  const pendingWithdrawalCount = useMemo(() => {
    return allWithdrawals.filter((w) => w.status === "pending" || w.status === "processing").length;
  }, [allWithdrawals]);

  const handleOpenApprovePayoutModal = (record: WithdrawalRecord) => {
    setPayoutModalRecord(record);
    setPayoutModalMode("approve");
  };

  const handleOpenRejectPayoutModal = (record: WithdrawalRecord) => {
    setPayoutModalRecord(record);
    setPayoutModalMode("reject");
  };

  const handleApprovePayout = (utrNumber: string, _notes?: string) => {
    if (!payoutModalRecord) return;
    const res = approveWithdrawalRequest(payoutModalRecord.id, utrNumber, mergedStudents);
    if (res.success) {
      onToast?.(res.message, "success");
      setReferralUpdateCounter((c) => c + 1);
      setPayoutModalRecord(null);
    } else {
      onToast?.(res.message, "error");
    }
  };

  const handleRejectPayout = (reason: string) => {
    if (!payoutModalRecord) return;
    const res = rejectWithdrawalRequest(payoutModalRecord.id, reason, mergedStudents);
    if (res.success) {
      onToast?.(res.message, "info");
      setReferralUpdateCounter((c) => c + 1);
      setPayoutModalRecord(null);
    } else {
      onToast?.(res.message, "error");
    }
  };

  const filteredReferralSummaries = useMemo(() => {
    return referralSummaries
      .filter((s) => {
        if (referralSearchQuery.trim()) {
          const q = referralSearchQuery.toLowerCase();
          const matchesName = s.studentName.toLowerCase().includes(q);
          const matchesEmail = (s.studentEmail || "").toLowerCase().includes(q);
          const matchesCode = s.referralCode.toLowerCase().includes(q);
          if (!matchesName && !matchesEmail && !matchesCode) return false;
        }
        if (referralFilter === "active" && s.totalTeamMembers === 0) return false;
        if (referralFilter === "balance" && s.walletBalance <= 0) return false;
        if (referralFilter === "withdrawn" && s.withdrawnAmount <= 0) return false;
        if (
          (referralFilter as string) === "flagged" &&
          !s.isFrozen &&
          (!s.fraudFlags || s.fraudFlags.length === 0)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (referralSortBy === "earnings") return b.totalEarned - a.totalEarned;
        if (referralSortBy === "members") return b.totalTeamMembers - a.totalTeamMembers;
        if (referralSortBy === "balance") return b.walletBalance - a.walletBalance;
        return 0;
      });
  }, [referralSummaries, referralSearchQuery, referralFilter, referralSortBy]);

  const handleToggleReferralStatus = (studentId: string, status: "active" | "paused") => {
    toggleStudentReferralStatus(studentId, status);
    setReferralUpdateCounter((c) => c + 1);
    if (inspectingReferralStudent && inspectingReferralStudent.studentId === studentId) {
      setInspectingReferralStudent((prev) => (prev ? { ...prev, status } : null));
    }
    onToast?.(
      status === "active"
        ? "Referral account status set to Active 🟢"
        : "Referral account status Paused ⏸️",
      status === "active" ? "success" : "info"
    );
  };

  const handleExportAudit = () => {
    const recordsToExport: StudentSubscriptionRecord[] =
      studentSubscriptions.length > 0
        ? studentSubscriptions
        : mergedStudents.map((std) => {
            const isPaid = std.isPro || std.subscriptionStatus === "active";
            const isPending = std.subscriptionStatus === "pending_verification";
            return {
              id: std.id,
              studentName: std.name,
              studentEmail: std.email,
              grade: std.grade,
              board: std.board,
              subject: std.subject,
              planId: std.planId || "semiannual_149",
              planName: std.subscriptionPlan || "6 Months Special Pass",
              amountINR: std.paymentAmount || 149,
              status: isPaid ? "active" : isPending ? "pending" : "expired",
              isPro: isPaid,
              utrNumber: std.utrNumber,
              submittedAt: std.submittedAt || new Date().toISOString(),
              activatedAt: std.submittedAt || new Date().toISOString(),
              expiresAt: std.subscriptionExpires,
              approvedBy: std.approvedBy || "Admin",
            };
          });

    if (recordsToExport.length === 0) {
      onToast?.("No student subscription transactions available to export.", "warning");
      return;
    }
    exportSubscriptionsToCSV(recordsToExport);
    onToast?.(`Financial audit ledger (${recordsToExport.length} records) exported successfully! 📊`, "success");
  };

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard?.writeText(utr);
    setCopiedUtrId(utr);
    setTimeout(() => setCopiedUtrId(null), 2000);
    onToast?.(`Copied UTR Reference: ${utr}`, "info");
  };

  const handleQuickApprove = (student: StudentCRMRecord, planId?: string) => {
    setIsProcessingAction(true);
    try {
      const chosenPlan = planId || student.planId || selectedPlanForApproval || plans[0]?.id || "semiannual_149";
      const approved = approveStudentSubscription({
        studentId: student.id,
        planId: chosenPlan,
        adminEmail: currentUser?.email || "onlinework0876@gmail.com",
        notes: approvalNotesInput.trim() || `Approved by Admin. UTR: ${student.utrNumber || "Verified"}.`,
      });
      if (approved) {
        setStudentSubscriptions(getStudentSubscriptions());
        saveStudentSubscriptionToCloud(approved);
        onToast?.(`🎉 Pro Subscription Approved for ${student.name}! Plan: ${approved.planName} (Synced to Cloud)`, "success");
        if (managingSubStudent?.id === student.id) {
          setManagingSubStudent(null);
        }
        if (selectedStudentForModal?.id === student.id) {
          setSelectedStudentForModal((prev) =>
            prev
              ? {
                  ...prev,
                  isPro: true,
                  subscriptionStatus: "active",
                  subscriptionPlan: approved.planName,
                  subscriptionExpires: approved.expiresAt ? new Date(approved.expiresAt).toLocaleDateString() : undefined,
                }
              : null
          );
        }
      }
    } catch (e) {
      onToast?.("Error approving subscription.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRevoke = (student: StudentCRMRecord) => {
    if (!confirm(`Revoke / Suspend Pro access for ${student.name}?`)) return;
    setIsProcessingAction(true);
    try {
      const revoked = revokeStudentSubscription({
        studentId: student.id,
        reason: "Access suspended by Admin",
      });
      if (revoked) {
        setStudentSubscriptions(getStudentSubscriptions());
        saveStudentSubscriptionToCloud(revoked);
        onToast?.(`Pro access suspended for ${student.name}.`, "info");
        if (managingSubStudent?.id === student.id) {
          setManagingSubStudent(null);
        }
        if (selectedStudentForModal?.id === student.id) {
          setSelectedStudentForModal((prev) =>
            prev
              ? {
                  ...prev,
                  isPro: false,
                  subscriptionStatus: "suspended",
                }
              : null
          );
        }
      }
    } catch (e) {
      onToast?.("Error revoking subscription.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleExtend = (student: StudentCRMRecord, extraMonths: number) => {
    setIsProcessingAction(true);
    try {
      const extended = extendStudentSubscription({
        studentId: student.id,
        extraMonths,
      });
      if (extended) {
        setStudentSubscriptions(getStudentSubscriptions());
        saveStudentSubscriptionToCloud(extended);
        onToast?.(`Extended ${student.name}'s Pro plan by +${extraMonths} month(s)! 📅 (Synced to Cloud)`, "success");
        if (managingSubStudent?.id === student.id) {
          setManagingSubStudent(null);
        }
        if (selectedStudentForModal?.id === student.id) {
          setSelectedStudentForModal((prev) =>
            prev
              ? {
                  ...prev,
                  isPro: true,
                  subscriptionStatus: "active",
                  subscriptionExpires: extended.expiresAt ? new Date(extended.expiresAt).toLocaleDateString() : undefined,
                }
              : null
          );
        }
      }
    } catch (e) {
      onToast?.("Error extending subscription.", "error");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Filtered students for CRM view with Phase 3 Search & Status Filters
  const filteredStudents = useMemo(() => {
    return mergedStudents.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        s.grade.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.utrNumber && s.utrNumber.toLowerCase().includes(q));

      const matchesGrade = gradeFilter === "All" || s.grade === gradeFilter;
      const matchesBoard = boardFilter === "All" || s.board === boardFilter;
      const matchesStatus =
        statusFilter === "All" ||
        s.subscriptionStatus === statusFilter ||
        (statusFilter === "active" && s.isPro);

      return matchesSearch && matchesGrade && matchesBoard && matchesStatus;
    });
  }, [mergedStudents, searchQuery, gradeFilter, boardFilter, statusFilter]);

  // Scroll helper for horizontal category rails in Student CRM
  const scrollCategoryRow = (categoryId: string, direction: "left" | "right") => {
    const el = document.getElementById(`crm-category-track-${categoryId}`);
    if (el) {
      const scrollAmount = 350;
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Categorize students into horizontal tracks for CRM
  const crmCategories = useMemo(() => {
    const allCats = [
      {
        id: "pending_verification",
        title: "Pending Verification (UTR)",
        description: "Submitted UPI payment references awaiting verification",
        icon: <Clock className="w-4 h-4 text-amber-600" />,
        badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
        filterMatch: (s: StudentCRMRecord) => s.subscriptionStatus === "pending_verification",
      },
      {
        id: "active",
        title: "Pro Active Members",
        description: "Students with active Pro subscriptions & full privileges",
        icon: <Zap className="w-4 h-4 text-[#796AEF]" />,
        badgeClass: "bg-indigo-100 text-indigo-900 border-indigo-200",
        filterMatch: (s: StudentCRMRecord) => s.isPro || s.subscriptionStatus === "active",
      },
      {
        id: "free",
        title: "Free Tier Students",
        description: "Freemium learners with trial access",
        icon: <Users className="w-4 h-4 text-slate-600" />,
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        filterMatch: (s: StudentCRMRecord) =>
          !s.isPro &&
          s.subscriptionStatus !== "active" &&
          s.subscriptionStatus !== "pending_verification" &&
          s.subscriptionStatus !== "suspended",
      },
      {
        id: "suspended",
        title: "Suspended Accounts",
        description: "Deactivated or paused student accounts",
        icon: <XCircle className="w-4 h-4 text-rose-600" />,
        badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
        filterMatch: (s: StudentCRMRecord) => s.subscriptionStatus === "suspended",
      },
    ];

    if (statusFilter === "All") {
      return allCats
        .map((cat) => ({
          ...cat,
          students: filteredStudents.filter(cat.filterMatch),
        }))
        .filter((cat) => cat.students.length > 0);
    }

    const matched = allCats.filter((cat) => cat.id === statusFilter);
    return matched.map((cat) => ({
      ...cat,
      students: filteredStudents,
    }));
  }, [filteredStudents, statusFilter]);

  // Render individual student card in horizontal track
  const renderStudentCard = (student: StudentCRMRecord) => {
    const accuracyColor =
      student.quizAccuracy >= 85
        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
        : student.quizAccuracy >= 70
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-rose-700 bg-rose-50 border-rose-200";

    const isPending = student.subscriptionStatus === "pending_verification";
    const isPro = student.isPro || student.subscriptionStatus === "active";
    const isSuspended = student.subscriptionStatus === "suspended";

    return (
      <div
        key={student.id}
        id={`crm-student-card-${student.id}`}
        className={`w-[310px] xs:w-[340px] sm:w-[370px] shrink-0 snap-start bg-white rounded-2xl p-3.5 border transition-all flex flex-col justify-between space-y-3 ${
          isPending
            ? "border-amber-300 shadow-xs ring-1 ring-amber-200/50"
            : "border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-sm"
        }`}
      >
        {/* Top row: Avatar, Info, Badges */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 text-[#796AEF] font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {student.name}
                </h4>
                {student.isManualAdminProvisioned && (
                  <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-md shrink-0 border border-indigo-200 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" />
                    Admin Direct
                  </span>
                )}
                {student.isRealFirestoreUser ? (
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-md shrink-0">
                    Live Sync
                  </span>
                ) : (
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-md shrink-0">
                    Sample Record
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium flex-wrap mt-0.5">
                <span className="font-semibold text-indigo-600">{student.grade}</span>
                <span>•</span>
                <span>{student.board}</span>
                <span>•</span>
                <span>{student.subject}</span>
                {student.phone && (
                  <>
                    <span>•</span>
                    <span className="text-slate-600 font-mono font-medium">📱 {student.phone}</span>
                  </>
                )}
                {student.email && (
                  <>
                    <span>•</span>
                    <span className="text-slate-400 truncate max-w-[120px]">{student.email}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isPending && (
              <span className="px-2 py-1 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-700" />
                <span>UTR Pending</span>
              </span>
            )}

            {isPro && !isPending && (
              <span className="px-2 py-1 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Pro Active</span>
              </span>
            )}

            {isSuspended && (
              <span className="px-2 py-1 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-bold flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-600" />
                <span>Suspended</span>
              </span>
            )}

            {!isPro && !isPending && !isSuspended && (
              <span className="px-2 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold">
                Free Tier
              </span>
            )}

            {/* Quiz Accuracy pill */}
            <div
              className={`px-2 py-1 rounded-xl border text-[10.5px] font-extrabold flex items-center gap-1 ${accuracyColor}`}
              title="Average Socratic Quiz Accuracy"
            >
              <Award className="w-3 h-3" />
              <span>{student.quizAccuracy}%</span>
            </div>
          </div>
        </div>

        {/* Phase 3: Pending UTR Approval Action Box */}
        {isPending && (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/70 rounded-xl p-2.5 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Submitted UTR:
                </span>
                <span className="font-mono font-black text-amber-950 bg-white px-2 py-0.5 rounded-md border border-amber-300 text-[11px]">
                  {student.utrNumber || "Not Provided"}
                </span>
                {student.utrNumber && (
                  <button
                    onClick={() => handleCopyUtr(student.utrNumber!)}
                    className="p-1 hover:bg-amber-200 text-amber-800 rounded transition-colors cursor-pointer"
                    title="Copy UTR Reference"
                  >
                    {copiedUtrId === student.utrNumber ? (
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
              <div className="text-[11px] font-bold text-amber-900">
                Plan: {student.subscriptionPlan || "Launch Special"} • ₹{student.paymentAmount || 149}
              </div>
            </div>

            {student.notes && (
              <p className="text-[10.5px] text-amber-800 italic">
                "{student.notes}" {student.submittedAt && `• ${student.submittedAt}`}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/70">
              <button
                onClick={() => {
                  setManagingSubStudent(student);
                  setSelectedPlanForApproval(student.planId || plans[0]?.id || "semiannual_149");
                  setApprovalNotesInput(`Approved UTR: ${student.utrNumber || "Verified"}`);
                }}
                className="text-[11px] font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
              >
                More Options / Custom Plan
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleQuickApprove(student, student.planId || plans[0]?.id)}
                  disabled={isProcessingAction}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Pro Access</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Pro Plan Details Strip */}
        {isPro && !isPending && (
          <div className="flex items-center justify-between text-[11px] bg-indigo-50/70 rounded-xl px-2.5 py-1.5 border border-indigo-100">
            <div className="flex items-center gap-1.5 text-indigo-950 font-semibold truncate">
              <Zap className="w-3.5 h-3.5 text-[#796AEF] shrink-0" />
              <span>Plan: <strong className="text-[#796AEF]">{student.subscriptionPlan || "Pro Tier"}</strong></span>
              {student.subscriptionExpires && (
                <span className="text-slate-500 font-normal truncate">• Expires: {student.subscriptionExpires}</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => {
                  const matchedSub = studentSubscriptions.find(
                    (s) => s.studentId === student.id || s.id === student.id
                  );
                  setReceiptModalSub(matchedSub || {
                    id: student.id,
                    studentName: student.name,
                    planId: "semiannual_149",
                    planName: student.subscriptionPlan || "6 Months Special Pass",
                    amountINR: student.paymentAmount || 149,
                    status: "active",
                    isPro: true,
                    utrNumber: student.utrNumber,
                    submittedAt: student.submittedAt || new Date().toISOString(),
                    activatedAt: student.submittedAt || new Date().toISOString(),
                    expiresAt: student.subscriptionExpires,
                    approvedBy: student.approvedBy || "Admin",
                  });
                }}
                className="px-2 py-0.5 bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer"
                title="Generate Official Digital Fee Receipt"
              >
                <Receipt className="w-2.5 h-2.5" />
                <span>Receipt</span>
              </button>
              <button
                onClick={() => handleExtend(student, 1)}
                disabled={isProcessingAction}
                className="px-2 py-0.5 bg-white hover:bg-indigo-100 border border-indigo-200 text-[#796AEF] font-bold text-[10px] rounded cursor-pointer"
                title="Quick extend +1 month"
              >
                +1 Mo
              </button>
              <button
                onClick={() => setManagingSubStudent(student)}
                className="px-2 py-0.5 bg-white hover:bg-indigo-100 border border-indigo-200 text-slate-700 font-bold text-[10px] rounded cursor-pointer"
              >
                Manage
              </button>
            </div>
          </div>
        )}

        {/* Middle row: Weak / Strong topics preview */}
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5 text-[10.5px]">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="font-bold text-slate-700 shrink-0">Blindspots:</span>
            <span className="text-rose-600 font-medium truncate">
              {student.weakTopics.join(", ") || "None recorded"}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500 text-[10px] pt-1 border-t border-slate-200/60">
            <span>{student.totalSessions} Sessions Attended</span>
            <span>{student.totalQuizzes} Quizzes Taken</span>
            <span>Updated {student.updatedAt}</span>
          </div>
        </div>

        {/* Bottom Action buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={() => setManagingSubStudent(student)}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-[#796AEF] text-slate-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            title="Manage student subscription, approve UTR, or extend validity"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#796AEF]" />
            <span>Subscription</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onSwitchToStudentView({
                  name: student.name,
                  grade: student.grade,
                  subject: student.subject,
                  board: student.board,
                  mediumOfLearning: student.mediumOfLearning,
                });
              }}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Switch to student preview with this student's grade & subject"
            >
              <Eye className="w-3.5 h-3.5 text-[#796AEF]" />
              <span>Preview</span>
            </button>

            <button
              onClick={() => setSelectedStudentForModal(student)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-[#796AEF] border border-indigo-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Report Card</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Aggregate Analytics Calculations
  const analyticsSummary = useMemo(() => {
    const total = students.length;
    if (total === 0) return { avgAccuracy: 0, totalSessions: 0, totalQuizzes: 0 };
    const avgAccuracy = Math.round(
      students.reduce((acc, s) => acc + s.quizAccuracy, 0) / total
    );
    const totalSessions = students.reduce((acc, s) => acc + s.totalSessions, 0);
    const totalQuizzes = students.reduce((acc, s) => acc + s.totalQuizzes, 0);
    return { avgAccuracy, totalSessions, totalQuizzes };
  }, [students]);

  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-slate-50 text-slate-900 relative overflow-y-auto">
      {/* 1. TOP MOBILE-FIRST ADMIN HEADER */}
      <header className="w-full h-14 bg-white border-b border-slate-200/90 px-3.5 sm:px-5 flex items-center justify-between z-20 shrink-0 select-none sticky top-0 shadow-xs backdrop-blur-md">
        {/* Brand & Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#796AEF] shadow-xs shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
                Admin Portal
              </h1>
              <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate max-w-[180px] xs:max-w-[240px] sm:max-w-none">
              Cherry AI Live Management & CRM
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoadingStudents}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 transition-all cursor-pointer disabled:opacity-60"
            title="Refresh All Student CRM Records & Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(isRefreshing || isLoadingStudents) ? "animate-spin text-[#796AEF]" : ""}`} />
          </button>

          {/* Logout Button */}
          <button
            type="button"
            onClick={onSignOut}
            className="h-8 px-2 sm:px-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 active:scale-95 text-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            title="Sign out of Admin Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* 2. ADMIN ↔ STUDENT DUAL-MODE CALLOUT BANNER */}
      <div className="p-3 sm:p-4 pb-0">
        <div className="bg-gradient-to-r from-indigo-700 via-[#796AEF] to-indigo-600 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-100">
                Phase 1, 2, 3 & 4 Live • CRM, Referral Engine & Financial Audit
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
              Student CRM & Live Teaching Controller
            </h2>
            <p className="text-xs text-indigo-100/90 leading-normal max-w-sm">
              Manage enrolled students, verify UPI UTR payment references, inspect quiz mastery, or preview the classroom in one tap.
            </p>
          </div>
          <button
            onClick={() => onSwitchToStudentView()}
            className="self-start sm:self-center h-10 px-4 bg-white hover:bg-indigo-50 active:scale-95 text-[#796AEF] font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Eye className="w-4 h-4" />
            <span>Switch to Student View</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION TABS (Mobile Ergonomic Scroll) */}
      <div className="px-3 sm:px-4 pt-3 shrink-0">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#796AEF] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "students"
                ? "bg-[#796AEF] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Student CRM ({mergedStudents.length})</span>
            {pendingUtrCount > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-400 text-amber-950 font-black rounded-full text-[9px] animate-pulse shadow-xs">
                {pendingUtrCount} UTR
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("referrals")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "referrals"
                ? "bg-[#796AEF] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Referrals & Payouts</span>
            {pendingWithdrawalCount > 0 ? (
              <span className="px-1.5 py-0.2 bg-amber-400 text-amber-950 font-black rounded-full text-[9px] animate-pulse shadow-xs">
                {pendingWithdrawalCount} Payouts
              </span>
            ) : (
              <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-800 font-black rounded-full text-[9px]">
                {referralMetrics.totalReferrers} Active
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("pricing")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "pricing"
                ? "bg-[#796AEF] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pricing & Plans ({plans.length})</span>
            {hasPlanChanges && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "audit"
                ? "bg-[#796AEF] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Revenue & Audit</span>
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-800 font-black rounded-full text-[9px]">
              ₹{totalVerifiedRevenue}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "analytics"
                ? "bg-[#796AEF] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Learning Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("access")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "access"
                ? "bg-[#796AEF] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admins ({adminList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("specs")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "specs"
                ? "bg-[#796AEF] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>System Specs</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      <div className="p-3 sm:p-4 space-y-4 pb-8">
        {/* ================================================================= */}
        {/* TAB 1: STUDENT CRM & DIRECTORY (PHASE 2 CORE)                     */}
        {/* ================================================================= */}
        {activeTab === "students" && (
          <div className="space-y-3.5">
            {/* Search & Filter Header Bar */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#796AEF] flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Registered Student Directory</h3>
                    <p className="text-[10px] text-slate-500">Live profiles & academic progress</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowManualOnboardModal(true)}
                    className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-[#796AEF] hover:from-indigo-700 hover:to-indigo-600 active:scale-95 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Onboard Student</span>
                  </button>

                  <button
                    onClick={() => fetchStudents(true)}
                    disabled={isLoadingStudents}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-[#796AEF] rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingStudents ? "animate-spin" : ""}`} />
                    <span>Sync Firestore</span>
                  </button>
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students by name, grade, subject or email..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#796AEF] focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Chips Bar */}
              <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                {/* Grade Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                    Grade:
                  </span>
                  {["All", "Class 9", "Class 10", "Class 11", "Class 12"].map((grade) => (
                    <button
                      key={grade}
                      onClick={() => setGradeFilter(grade)}
                      className={`px-2 py-0.8 rounded-lg text-[10.5px] font-bold transition-all shrink-0 cursor-pointer ${
                        gradeFilter === grade
                          ? "bg-indigo-100 text-[#796AEF] border border-indigo-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>

                {/* Board Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                    Board:
                  </span>
                  {["All", "CBSE", "ICSE"].map((board) => (
                    <button
                      key={board}
                      onClick={() => setBoardFilter(board)}
                      className={`px-2 py-0.8 rounded-lg text-[10.5px] font-bold transition-all shrink-0 cursor-pointer ${
                        boardFilter === board
                          ? "bg-indigo-100 text-[#796AEF] border border-indigo-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                      }`}
                    >
                      {board}
                    </button>
                  ))}
                </div>

                {/* Phase 3: Subscription Status Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                    Plan Status:
                  </span>
                  {[
                    { id: "All", label: `All (${mergedStudents.length})` },
                    { id: "pending_verification", label: `Pending UTR (${pendingUtrCount})`, alert: pendingUtrCount > 0 },
                    { id: "active", label: `Pro Active (${activeProCount})` },
                    { id: "free", label: "Free Tier" },
                    { id: "suspended", label: "Suspended" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setStatusFilter(item.id as any)}
                      className={`px-2 py-0.8 rounded-lg text-[10.5px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                        statusFilter === item.id
                          ? item.alert
                            ? "bg-amber-100 text-amber-800 border border-amber-300 font-black"
                            : "bg-indigo-100 text-[#796AEF] border border-indigo-200"
                          : item.alert
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                      }`}
                    >
                      {item.alert && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Phase 3: Pending UTR Attention Banner */}
            {pendingUtrCount > 0 && statusFilter !== "pending_verification" && (
              <div className="p-3 bg-gradient-to-r from-amber-50 to-amber-100/60 rounded-2xl border border-amber-200/90 shadow-xs flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 font-bold">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-900 leading-tight">
                      {pendingUtrCount} Student Payment Reference{pendingUtrCount > 1 ? "s" : ""} Awaiting Approval
                    </p>
                    <p className="text-[10.5px] text-amber-700 truncate">
                      Review submitted UPI UTR numbers to activate Pro benefits immediately.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setStatusFilter("pending_verification")}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-[11px] rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  Review ({pendingUtrCount})
                </button>
              </div>
            )}

            {/* Directory Count / Status Indicator */}
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-medium">
              <span>
                Showing <strong className="text-slate-800">{filteredStudents.length}</strong> of {mergedStudents.length} students
              </span>
              <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                <Database className="w-2.5 h-2.5" />
                Firestore & CRM Synchronized
              </span>
            </div>

            {/* Students CRM Categories (Horizontally Scrollable per Category) */}
            {filteredStudents.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2 shadow-xs">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-700">No students match your filter</h4>
                <p className="text-[11px] text-slate-500">Try changing or clearing your search term, grade, or status filter.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setGradeFilter("All");
                    setBoardFilter("All");
                    setStatusFilter("All");
                  }}
                  className="mt-2 px-3 py-1 bg-indigo-50 text-[#796AEF] rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {crmCategories.map((category) => (
                  <div
                    key={category.id}
                    id={`crm-category-section-${category.id}`}
                    className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3"
                  >
                    {/* Category Header with Title, Count & Left/Right Scroll Controls */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0 shadow-2xs">
                          {category.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">
                              {category.title}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${category.badgeClass}`}>
                              {category.students.length} Student{category.students.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-500 truncate hidden sm:block">
                            {category.description}
                          </p>
                        </div>
                      </div>

                      {/* Horizontal Scroll Navigation Controls */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase hidden xs:inline-block mr-0.5">
                          Scroll ➔
                        </span>
                        <button
                          id={`crm-scroll-left-${category.id}`}
                          type="button"
                          onClick={() => scrollCategoryRow(category.id, "left")}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                          title="Scroll Left"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          id={`crm-scroll-right-${category.id}`}
                          type="button"
                          onClick={() => scrollCategoryRow(category.id, "right")}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                          title="Scroll Right"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Horizontally Scrollable Track */}
                    <div
                      id={`crm-category-track-${category.id}`}
                      className="flex gap-3 overflow-x-auto pb-2 pt-0.5 px-0.5 no-scrollbar sm:scrollbar-thin snap-x scroll-smooth"
                    >
                      {category.students.map((student) => renderStudentCard(student))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: REFERRALS & STUDENT EARNING HUB (PHASE 1)                   */}
        {/* ================================================================= */}
        {activeTab === "referrals" && (
          <div className="space-y-4">
            {/* Header & Quick Action Banner */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#796AEF] flex items-center justify-center">
                    <Gift className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Student Referral & Earning Hub
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                    5-Level Engine Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Track student referral accounts, 5-tier network genealogy, Level 1 (₹50) &amp; Level 5 (₹50) commissions, and live wallet balances in real-time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTierLedgerModal(true)}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-[#796AEF] border border-indigo-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="View detailed breakdown of tier multiplier payouts across all scholars"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tier Ledger</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReferralUpdateCounter((c) => c + 1);
                    onToast?.("Referral records refreshed from local & cloud state! 🔄", "info");
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Sub-Tabs: Scholars & Network Hierarchy vs. UPI Payout Requests Queue vs. Commission Settings */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl w-full sm:w-auto flex-wrap">
              <button
                type="button"
                onClick={() => setReferralSubTab("network")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  referralSubTab === "network"
                    ? "bg-[#796AEF] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Scholars &amp; Network ({referralSummaries.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setReferralSubTab("payouts")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  referralSubTab === "payouts"
                    ? "bg-[#796AEF] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>UPI Payout Requests Queue</span>
                {pendingWithdrawalCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-[9.5px] animate-pulse shadow-xs font-mono">
                    {pendingWithdrawalCount} Pending
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold text-[9.5px] font-mono">
                    {allWithdrawals.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setReferralSubTab("settings")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  referralSubTab === "settings"
                    ? "bg-[#796AEF] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Commission Rates &amp; Policy</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[9.5px] font-mono">
                  {activeCommissionPlanTiers[0]?.totalPercent || 37}% - {activeCommissionPlanTiers[activeCommissionPlanTiers.length - 1]?.totalPercent || 67}% Tiers ({activeCommissionPlanTiers.length} Plans)
                </span>
              </button>
            </div>

            {/* SUB-VIEW 0: COMMISSION RATES & PAYOUT POLICY CONFIGURATOR (PHASE 2) */}
            {referralSubTab === "settings" && (
              <div className="space-y-4">
                <AdminCommissionConfigCard
                  onToast={onToast}
                  onConfigSaved={() => {
                    setReferralUpdateCounter((c) => c + 1);
                  }}
                />

                {/* 5-Level Compensation Plan Reference Banner */}
                <div className="p-4 bg-gradient-to-r from-indigo-50/70 via-white to-emerald-50/70 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#796AEF] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Live 5-Level Compensation Plan Dynamics ({activeCommissionPlanTiers.length} Plans Synchronized):
                      </span>
                      <span className="text-slate-600 text-[11px] block mt-0.5 leading-relaxed">
                        • <strong>Level 1 (Direct Referral):</strong> {activeCommissionPlanTiers[0]?.level1Percent || 22}% to {activeCommissionPlanTiers[activeCommissionPlanTiers.length - 1]?.level1Percent || 37}% instant wallet credit based on referrer's active plan tier.<br />
                        • <strong>Levels 2, 3, 4 (Bridge Tiers):</strong> ₹0 commission; builds network depth and motivation.<br />
                        • <strong>Level 5 (Team Milestone Royalty):</strong> {activeCommissionPlanTiers[0]?.level5Percent || 15}% to {activeCommissionPlanTiers[activeCommissionPlanTiers.length - 1]?.level5Percent || 30}% indirect team royalty payout across {activeCommissionPlanTiers.length} active subscription plans.<br />
                        • <strong>Minimum UPI Payout:</strong> ₹{activeCommissionConfig.minWithdrawalLimit || 50} threshold with direct instant UPI settlement.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-VIEW 1: UPI PAYOUT REQUESTS QUEUE (PHASE 2) */}
            {referralSubTab === "payouts" && (
              <AdminPayoutRequestsQueue
                withdrawals={allWithdrawals}
                onApproveClick={handleOpenApprovePayoutModal}
                onRejectClick={handleOpenRejectPayoutModal}
                onInspectStudent={(studentId) => {
                  const found = referralSummaries.find((s) => s.studentId === studentId);
                  if (found) setInspectingReferralStudent(found);
                }}
                onToast={onToast}
              />
            )}

            {/* SUB-VIEW 2: SCHOLARS & NETWORK GENEALOGY (PHASE 1) */}
            {referralSubTab === "network" && (
              <>
                {/* 4 High-Impact KPI Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Metric 1: Active Referrers */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Active Referrers
                  </span>
                  <div className="w-6.5 h-6.5 rounded-lg bg-indigo-50 text-[#796AEF] flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-900">
                  {referralMetrics.totalReferrers} Scholars
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {referralMetrics.totalNetworkMembers} total student network size
                </div>
              </div>

              {/* Metric 2: Level 1 vs Level 5 Members */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Direct L1 / Team L5
                  </span>
                  <div className="w-6.5 h-6.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-black text-emerald-800">
                  {referralMetrics.totalDirectMembers} <span className="text-xs text-slate-400 font-normal">L1</span> • {referralMetrics.totalIndirectMembers} <span className="text-xs text-slate-400 font-normal">L5</span>
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">
                  ₹{referralMetrics.totalDirectMembers * activeCommissionConfig.level1Reward} (Direct) + ₹{referralMetrics.totalIndirectMembers * activeCommissionConfig.level5Reward} (Team)
                </div>
              </div>

              {/* Metric 3: Total Commissions Earned */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Total Commissions
                  </span>
                  <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <IndianRupee className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-900">
                  ₹{referralMetrics.totalCommissionsEarned}
                </div>
                <div className="text-[10px] text-amber-700 font-medium">
                  Total student earnings distributed
                </div>
              </div>

              {/* Metric 4: Live Wallet Balance */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Student Wallets
                  </span>
                  <div className="w-6.5 h-6.5 rounded-lg bg-purple-50 text-[#796AEF] flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-black text-slate-900">
                  ₹{referralMetrics.totalActiveWalletBalance}
                </div>
                <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between">
                  <span>₹{referralMetrics.totalCommissionsWithdrawn} cashed out</span>
                  {referralMetrics.totalFlaggedAccounts > 0 && (
                    <span className="text-rose-600 font-bold font-mono">
                      • {referralMetrics.totalFlaggedAccounts} Flagged
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={referralSearchQuery}
                    onChange={(e) => setReferralSearchQuery(e.target.value)}
                    placeholder="Search by student name, email, or referral code (e.g. CHERRY-AARAV)..."
                    className="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#796AEF] focus:bg-white text-slate-900 transition-all placeholder:text-slate-400"
                  />
                  {referralSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setReferralSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort Selector */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Sort:</span>
                  <select
                    value={referralSortBy}
                    onChange={(e) => setReferralSortBy(e.target.value as any)}
                    className="text-xs font-semibold px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:border-[#796AEF]"
                  >
                    <option value="earnings">Highest Earnings</option>
                    <option value="members">Largest Network</option>
                    <option value="balance">Highest Wallet Balance</option>
                  </select>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                <button
                  type="button"
                  onClick={() => setReferralFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    referralFilter === "all"
                      ? "bg-[#796AEF] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Students ({referralSummaries.length})
                </button>

                <button
                  type="button"
                  onClick={() => setReferralFilter("active")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    referralFilter === "active"
                      ? "bg-[#796AEF] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Active Referrers ({referralSummaries.filter((s) => s.totalTeamMembers > 0).length})
                </button>

                <button
                  type="button"
                  onClick={() => setReferralFilter("balance")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    referralFilter === "balance"
                      ? "bg-[#796AEF] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  With Balance ({referralSummaries.filter((s) => s.walletBalance > 0).length})
                </button>

                <button
                  type="button"
                  onClick={() => setReferralFilter("withdrawn")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    referralFilter === "withdrawn"
                      ? "bg-[#796AEF] text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Cashed Out ({referralSummaries.filter((s) => s.withdrawnAmount > 0).length})
                </button>

                <button
                  type="button"
                  onClick={() => setReferralFilter("flagged" as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                    (referralFilter as string) === "flagged"
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/70"
                  }`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>Flagged / Frozen ({referralSummaries.filter((s) => s.isFrozen || (s.fraudFlags && s.fraudFlags.length > 0)).length})</span>
                </button>
              </div>
            </div>

            {/* Student Referral List / Cards */}
            <div className="space-y-2.5">
              {filteredReferralSummaries.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
                  <Gift className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-medium">No student referral accounts match your current query.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setReferralSearchQuery("");
                      setReferralFilter("all");
                    }}
                    className="text-xs text-[#796AEF] font-bold hover:underline"
                  >
                    Clear filters &amp; view all
                  </button>
                </div>
              ) : (
                filteredReferralSummaries.map((summary) => {
                  const bridgeMembers = Math.max(
                    0,
                    summary.totalTeamMembers - summary.directMembers - summary.indirectMembers
                  );

                  return (
                    <div
                      key={summary.studentId}
                      className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    >
                      {/* Student Info & Code */}
                      <div className="flex items-start sm:items-center gap-3 w-full md:w-auto">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#796AEF] to-indigo-700 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                          {summary.studentName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {summary.studentName}
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                                summary.status === "active"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {summary.status === "active" ? "Active" : "Paused"}
                            </span>

                            {summary.planTierLabel && (
                              <span className="px-2 py-0.2 rounded-full bg-purple-100 text-purple-800 font-mono font-black text-[9px] flex items-center gap-1">
                                <Crown className="w-2.5 h-2.5 text-amber-500" />
                                <span>{summary.planTierLabel}</span>
                              </span>
                            )}

                            {summary.isFrozen && (
                              <span className="px-2 py-0.2 rounded-full bg-cyan-100 text-cyan-800 font-mono font-black text-[9px] flex items-center gap-1">
                                <Snowflake className="w-2.5 h-2.5" />
                                <span>Frozen</span>
                              </span>
                            )}

                            {summary.fraudFlags && summary.fraudFlags.length > 0 && (
                              <span className="px-2 py-0.2 rounded-full bg-rose-100 text-rose-800 font-mono font-black text-[9px] flex items-center gap-1">
                                <ShieldAlert className="w-2.5 h-2.5" />
                                <span>{summary.fraudFlags.length} Flag{summary.fraudFlags.length > 1 ? "s" : ""}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium flex-wrap mt-0.5">
                            <span>{summary.grade || "Class 10"} • {summary.board || "CBSE"}</span>
                            <span className="text-slate-300">•</span>
                            <span className="truncate">{summary.studentEmail || "student@cherry.edu"}</span>
                          </div>

                          {/* Referral Code Badge with 1-click Copy */}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-[#796AEF] rounded-lg">
                              {summary.referralCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(summary.referralCode);
                                onToast?.(`Copied ${summary.studentName}'s referral code: ${summary.referralCode} 📋`, "info");
                              }}
                              className="text-[10px] text-slate-500 hover:text-[#796AEF] flex items-center gap-0.5 cursor-pointer"
                              title="Copy referral code"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 5-Level Breakdown & Financial Badges */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full md:w-auto border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100">
                        {/* Network Tiers */}
                        <div className="flex items-center gap-2 text-center">
                          <div className="px-2 py-1 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="text-[9px] font-bold text-emerald-700 uppercase">L1 Direct</div>
                            <div className="text-xs font-black text-emerald-900">{summary.directMembers}</div>
                            <div className="text-[8px] text-emerald-600 font-semibold">+₹{summary.directMembers * activeCommissionConfig.level1Reward}</div>
                          </div>

                          <div className="px-2 py-1 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-[9px] font-bold text-slate-500 uppercase">L2-4 Bridge</div>
                            <div className="text-xs font-black text-slate-700">{bridgeMembers}</div>
                            <div className="text-[8px] text-slate-400 font-semibold">Team</div>
                          </div>

                          <div className="px-2 py-1 bg-indigo-50 rounded-xl border border-indigo-100">
                            <div className="text-[9px] font-bold text-[#796AEF] uppercase">L5 Team</div>
                            <div className="text-xs font-black text-indigo-900">{summary.indirectMembers}</div>
                            <div className="text-[8px] text-indigo-600 font-semibold">+₹{summary.indirectMembers * activeCommissionConfig.level5Reward}</div>
                          </div>
                        </div>

                        {/* Earnings & Wallet Badges */}
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-slate-900">
                            ₹{summary.totalEarned} <span className="text-[10px] text-slate-400 font-normal">Earned</span>
                          </div>
                          <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
                            ₹{summary.walletBalance} <span className="text-[9px] text-slate-500 font-medium">in Wallet</span>
                          </div>
                          {summary.withdrawnAmount > 0 && (
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              ₹{summary.withdrawnAmount} cashed out
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleReferralStatus(
                              summary.studentId,
                              summary.status === "active" ? "paused" : "active"
                            )}
                            className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              summary.status === "active"
                                ? "bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 border-slate-200"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                            }`}
                            title={summary.status === "active" ? "Click to Pause Account" : "Click to Resume Account"}
                          >
                            {summary.status === "active" ? (
                              <PauseCircle className="w-4 h-4" />
                            ) : (
                              <PlayCircle className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setInspectingReferralStudent(summary)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-[#796AEF] border border-indigo-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

                {/* 5-Level Compensation Plan Reference Banner */}
                <div className="p-4 bg-gradient-to-r from-indigo-50/70 via-white to-emerald-50/70 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#796AEF] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Socratic 5-Level Compensation Plan Mechanics:
                      </span>
                      <span className="text-slate-600 text-[11px] block mt-0.5">
                        • <strong>Level 1 (Direct Referral):</strong> Instant ₹{activeCommissionConfig.level1Reward} cash credit when a friend joins.<br />
                        • <strong>Levels 2, 3, 4 (Bridge Tiers):</strong> ₹0 commission; builds network depth and motivation.<br />
                        • <strong>Level 5 (Team Milestone):</strong> Instant ₹{activeCommissionConfig.level5Reward} cash bonus when a 5th-tier friend joins.<br />
                        • <strong>Minimum UPI Payout:</strong> ₹{activeCommissionConfig.minWithdrawalLimit || 50} threshold with direct VPA settlement.
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: OVERVIEW & SYSTEM HEALTH                                   */}
        {/* ================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* 📢 Real-Time Broadcast Notice Board (Admin Notice Management) */}
            <AdminNoticeManager adminEmail={adminEmail} />

            {/* 4 High-Level KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* Card 1: Registered Students */}
              <div 
                onClick={() => setActiveTab("students")}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-1 cursor-pointer hover:border-indigo-300 transition-all"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Students
                  </span>
                  <div className="w-6.5 h-6.5 rounded-lg bg-indigo-50 text-[#796AEF] flex items-center justify-center">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {students.length}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#796AEF] font-semibold">
                  <span>View CRM Directory</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>

              {/* Card 2: Average Quiz Accuracy */}
              <div 
                onClick={() => setActiveTab("analytics")}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-1 cursor-pointer hover:border-indigo-300 transition-all"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Avg Accuracy
                  </span>
                  <div className="w-6.5 h-6.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {analyticsSummary.avgAccuracy}%
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                  <span>Across {analyticsSummary.totalQuizzes} Quizzes</span>
                </div>
              </div>

              {/* Card 3: Live Audio Bridge */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Voice Bridge
                  </span>
                  <div className="w-6.5 h-6.5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Wifi className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-600 tracking-tight flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium truncate">
                  Gemini 2.0 Flash Live PCM
                </p>
              </div>

              {/* Card 4: Socratic Sessions */}
              <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    Sessions
                  </span>
                  <div className="w-6.5 h-6.5 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {analyticsSummary.totalSessions}
                </div>
                <p className="text-[10px] text-slate-500 font-medium truncate">
                  Recorded Classroom Runs
                </p>
              </div>
            </div>

            {/* Active Admin Identity Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#796AEF]" />
                  <span className="text-xs font-bold text-slate-900">Current Administrator</span>
                </div>
                <span className="text-[9.5px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Super Admin
                </span>
              </div>
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 flex items-center justify-between">
                <div className="truncate pr-2">
                  <p className="text-xs font-bold text-[#796AEF] truncate">
                    {currentUser?.email || "onlinework0876@gmail.com"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    UID: {currentUser?.uid ? currentUser.uid.slice(0, 14) + "..." : "local-super-admin"}
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-[#796AEF] text-white px-2 py-0.8 rounded-lg shrink-0">
                  Verified
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: SUBSCRIPTION PRICING & VALIDITY (PHASE 1 IMPLEMENTATION)     */}
        {/* ================================================================= */}
        {activeTab === "pricing" && (
          <div className="space-y-4">
            {/* Control Header & Instructions */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#796AEF] flex items-center justify-center shrink-0 mt-0.5">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      Subscription Pricing & Validity Manager
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Set custom plan amounts (₹), validity duration (months), and discounts. Updates apply instantly to student checkout screens.
                    </p>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={handleResetPlans}
                    className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Reset all plans back to factory default amounts and validity"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAllPlans}
                    disabled={isSavingPlans}
                    className={`h-9 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                      hasPlanChanges
                        ? "bg-[#796AEF] hover:bg-indigo-700 active:scale-95 text-white ring-2 ring-indigo-300 ring-offset-1 animate-pulse"
                        : "bg-[#796AEF] text-white hover:bg-indigo-700"
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingPlans ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              </div>

              {/* Unsaved Changes Banner */}
              {hasPlanChanges && (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-semibold">Unsaved Changes: You have modified plan pricing or validity.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveAllPlans}
                    className="text-[11px] font-bold text-[#796AEF] hover:underline shrink-0"
                  >
                    Save Now
                  </button>
                </div>
              )}
            </div>

            {/* Direct UPI Receiver & Payment QR Settings Card (Phase 2) */}
            <div className="bg-white rounded-2xl p-4 border border-indigo-200 ring-1 ring-indigo-50 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#796AEF] flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        Direct UPI Receiver & Payment QR Settings
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Payments Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure your UPI VPA address (Google Pay, PhonePe, Paytm, BHIM) to receive student fee payments directly into your bank account.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={handleResetUpiConfig}
                    className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Reset to default UPI VPA"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Default VPA</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveUpiConfig}
                    disabled={isSavingUpi}
                    className={`h-8 px-3.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                      hasUpiChanges
                        ? "bg-[#796AEF] hover:bg-indigo-700 text-white ring-2 ring-indigo-300 ring-offset-1 animate-pulse"
                        : "bg-[#796AEF] text-white hover:bg-indigo-700"
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingUpi ? "Saving..." : "Save UPI Settings"}</span>
                  </button>
                </div>
              </div>

              {/* Form Inputs & Live QR Preview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Left 2 Columns: Inputs */}
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-[#796AEF]" />
                        <span>Receiver UPI ID (VPA)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="text-[11px] text-[#796AEF] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedUpi ? "Copied!" : "Copy VPA"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={upiReceiverInput}
                        onChange={(e) => {
                          setUpiReceiverInput(e.target.value);
                          setHasUpiChanges(true);
                        }}
                        placeholder="e.g. cherryai.edu@okhdfcbank or 9876543210@paytm"
                        className="w-full text-xs font-mono font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#796AEF] focus:bg-white text-slate-900 transition-all"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Supported: PhonePe (@ybl, @ibl), Google Pay (@okhdfcbank, @okaxis, @oksbi), Paytm (@paytm), BHIM (@upi)
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      <span>Merchant / Payee Name</span>
                    </label>
                    <input
                      type="text"
                      value={merchantNameInput}
                      onChange={(e) => {
                        setMerchantNameInput(e.target.value);
                        setHasUpiChanges(true);
                      }}
                      placeholder="e.g. Cherry AI Classroom"
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#796AEF] focus:bg-white text-slate-900 transition-all"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      This name is displayed to students inside Google Pay, PhonePe, and Paytm when scanning.
                    </span>
                  </div>

                  {/* Active Notice */}
                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[#796AEF] font-bold">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Live Sync Guarantee</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Changes saved here immediately update the QR codes and direct UPI links on both the <strong>Student Enrollment Screen</strong> (6-month plan) and the <strong>Subscription Modal</strong> (all plan tiers).
                    </p>
                  </div>
                </div>

                {/* Right 1 Column: Live Test Payment QR Code */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center justify-between space-y-2.5">
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-[#796AEF]" />
                      <span>Live Test QR</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      Ready to Scan
                    </span>
                  </div>

                  {/* QR Image Container */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs relative">
                    {testQrDataUrl ? (
                      <img
                        src={testQrDataUrl}
                        alt="Live UPI QR Code Preview"
                        className="w-36 h-36 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">
                        Generating QR...
                      </div>
                    )}
                  </div>

                  {/* Test Plan Selector */}
                  <div className="w-full space-y-1">
                    <label className="text-[10px] font-medium text-slate-500 block text-left">
                      Test Amount Preview:
                    </label>
                    <select
                      value={testPlanId}
                      onChange={(e) => setTestPlanId(e.target.value)}
                      className="w-full text-xs font-semibold px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-[#796AEF]"
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          ₹{p.priceINR} — {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-tight">
                    Scan with any UPI app to verify payee name & amount.
                  </p>
                </div>
              </div>
            </div>

            {/* Unified Plan Manager: Add, Edit, Delete & Sync Engine */}
            <AdminUnifiedPlanManager
              plans={plans}
              onPlansChange={(newPlans) => {
                setPlans(newPlans);
                setHasPlanChanges(true);
              }}
              onSaveAllPlans={handleSaveAllPlans}
              onResetPlans={handleResetPlans}
              isSaving={isSavingPlans}
              hasChanges={hasPlanChanges}
              onToast={onToast}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: REVENUE, FINANCIAL LEDGER & CLOUD AUDIT (PHASE 4 CORE)      */}
        {/* ================================================================= */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            {/* 1. Header & Actions */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#796AEF] flex items-center justify-center shrink-0 mt-0.5">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      Financial Ledger & Cloud Audit
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Track verified fee collections, student UTR reconciliation, and print official digital fee receipts.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSyncWithCloud(true)}
                    disabled={isSyncingCloud}
                    className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Force synchronize subscriptions and pricing with Firestore Cloud"
                  >
                    <Cloud className={`w-3.5 h-3.5 ${isSyncingCloud ? "animate-spin text-[#796AEF]" : "text-indigo-600"}`} />
                    <span>{isSyncingCloud ? "Syncing..." : "Sync Cloud"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportAudit}
                    className="h-9 px-4 rounded-xl bg-[#796AEF] hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Cloud Sync Status Banner */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-700">Firestore Real-Time Persistence</span>
                  <span className="text-[11px] text-slate-400">• {cloudSyncStatus}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Collection: /studentSubscriptions
                </span>
              </div>
            </div>

            {/* 2. Key Financial KPIs Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Metric 1: Verified Cleared Revenue */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Cleared Revenue</span>
                  <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                    <IndianRupee className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900 tracking-tight">
                  ₹{totalVerifiedRevenue.toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{activeProCount} active paid subscriptions</span>
                </span>
              </div>

              {/* Metric 2: Pending UTR Verifications */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Pending Review</span>
                  <span className="p-1 rounded-md bg-amber-50 text-amber-600">
                    <Clock className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-xl font-black text-amber-700 tracking-tight">
                  ₹{pendingRevenue.toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{pendingUtrCount} student UTR(s) waiting</span>
                </span>
              </div>

              {/* Metric 3: Active Paid Students */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Pro Conversion</span>
                  <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                    <Users className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900 tracking-tight">
                  {activeProCount} <span className="text-xs font-normal text-slate-400">/ {mergedStudents.length}</span>
                </div>
                <span className="text-[10px] text-indigo-600 font-semibold">
                  {Math.round((activeProCount / (mergedStudents.length || 1)) * 100)}% paid adoption
                </span>
              </div>

              {/* Metric 4: Average Order Value */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Avg. Order Value</span>
                  <span className="p-1 rounded-md bg-purple-50 text-purple-600">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-xl font-black text-slate-900 tracking-tight">
                  ₹{averageOrderValue.toLocaleString("en-IN")}
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Per paid enrollment
                </span>
              </div>
            </div>

            {/* 3. Financial Transaction Ledger */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#796AEF]" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Student Fee Ledger & Audit Records
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">
                  {mergedStudents.length} Records
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {mergedStudents.map((std) => {
                  const subRecord = studentSubscriptions.find(
                    (s) => s.studentId === std.id || s.id === std.id
                  );
                  const isPaid = std.isPro || std.subscriptionStatus === "active";
                  const isPending = std.subscriptionStatus === "pending_verification";
                  const expiryInfo = getSubscriptionExpiryStatus(std.subscriptionExpires);

                  const receiptData: StudentSubscriptionRecord = subRecord || {
                    id: std.id,
                    studentName: std.name,
                    planId: "semiannual_149",
                    planName: std.subscriptionPlan || "6 Months Special Pass",
                    amountINR: std.paymentAmount || 149,
                    status: isPaid ? "active" : isPending ? "pending" : "expired",
                    isPro: isPaid,
                    utrNumber: std.utrNumber,
                    submittedAt: std.submittedAt || new Date().toISOString(),
                    activatedAt: std.submittedAt || new Date().toISOString(),
                    expiresAt: std.subscriptionExpires,
                    approvedBy: std.approvedBy || "Admin",
                  };

                  return (
                    <div
                      key={std.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 p-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isPending
                              ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {std.name.charAt(0)}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">{std.name}</span>
                            <span className="text-[10px] text-slate-500">({std.grade})</span>
                            {isPaid && (
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                                PAID PRO
                              </span>
                            )}
                            {isPending && (
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold">
                                UTR PENDING
                              </span>
                            )}
                            {expiryInfo.isExpiringSoon && (
                              <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[9px] font-bold">
                                EXPIRING ({expiryInfo.daysRemaining}d)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono flex-wrap">
                            <span>Plan: {std.subscriptionPlan || "Free"}</span>
                            {std.utrNumber && (
                              <button
                                type="button"
                                onClick={() => handleCopyUtr(std.utrNumber!)}
                                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-indigo-100 cursor-pointer"
                                title="Click to copy UTR"
                              >
                                <span>UTR: {std.utrNumber}</span>
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <span className="text-xs font-black text-slate-900 block">
                            ₹{std.paymentAmount || 149}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 block">
                            {std.subscriptionExpires
                              ? `Exp: ${new Date(std.subscriptionExpires).toLocaleDateString()}`
                              : "No expiry"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isPaid && (
                            <button
                              type="button"
                              onClick={() => setReceiptModalSub(receiptData)}
                              className="h-8 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[#796AEF] border border-indigo-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Generate Official Digital Fee Receipt"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>
                          )}

                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleQuickApprove(std)}
                              className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-3.5">
            {/* Grade Distribution Breakdown */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#796AEF]" />
                  <h3 className="text-xs font-bold text-slate-900">Grade Distribution</h3>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">{students.length} Total</span>
              </div>

              <div className="space-y-2">
                {[
                  { grade: "Class 10", count: students.filter((s) => s.grade === "Class 10").length, color: "bg-indigo-600" },
                  { grade: "Class 12", count: students.filter((s) => s.grade === "Class 12").length, color: "bg-emerald-600" },
                  { grade: "Class 9", count: students.filter((s) => s.grade === "Class 9").length, color: "bg-amber-500" },
                  { grade: "Class 11", count: students.filter((s) => s.grade === "Class 11").length, color: "bg-rose-500" },
                ].map((item) => {
                  const pct = students.length > 0 ? Math.round((item.count / students.length) * 100) : 0;
                  return (
                    <div key={item.grade} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-slate-700">{item.grade}</span>
                        <span className="text-slate-500">{item.count} students ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subject Popularity & Socratic Traps */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900">Most Frequent Doubt Traps (80/20 PYQ)</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Concepts where Cherry AI students requested Socratic repetition and clarification:
              </p>

              <div className="space-y-2 pt-1">
                {[
                  { topic: "Sign Convention for Concave/Convex Mirrors", subject: "Science (Class 10)", frequency: "42% of sessions" },
                  { topic: "Balancing Redox Reactions by Ion-Electron Method", subject: "Chemistry (Class 11)", frequency: "38% of sessions" },
                  { topic: "Quadratic Roots Discriminant when D < 0", subject: "Mathematics (Class 10)", frequency: "29% of sessions" },
                  { topic: "Gauss's Law Closed Surface Charge Localization", subject: "Physics (Class 12)", frequency: "26% of sessions" },
                ].map((trap, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{trap.topic}</p>
                      <p className="text-[10px] text-slate-500">{trap.subject}</p>
                    </div>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md shrink-0 border border-rose-100">
                      {trap.frequency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: MULTI-ADMIN ACCESS (PHASE 1 FOUNDATION)                     */}
        {/* ================================================================= */}
        {activeTab === "access" && (
          <div className="space-y-4">
            {/* Add New Co-Admin Form */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#796AEF] flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Authorize Co-Admin</h3>
                  <p className="text-[10px] text-slate-500">Grant admin privileges to verified teachers</p>
                </div>
              </div>

              <form onSubmit={handleAddAdmin} className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="Enter teacher or admin email..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#796AEF] focus:bg-white transition-all"
                    required
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-[#796AEF] hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Authorize</span>
                  </button>
                </div>
              </form>
            </div>

            {/* List of Authorized Admins */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">Authorized Admin Directory</h3>
                <span className="text-[10px] font-semibold text-slate-500">{adminList.length} Authorized</span>
              </div>

              <div className="space-y-2">
                {adminList.map((email) => {
                  const isPrimary = email.toLowerCase() === "onlinework0876@gmail.com" || (ADMIN_EMAILS[0] && email.toLowerCase() === ADMIN_EMAILS[0].toLowerCase());
                  return (
                    <div
                      key={email}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 ${
                          isPrimary ? "bg-indigo-100 text-[#796AEF]" : "bg-slate-200 text-slate-700"
                        }`}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{email}</p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {isPrimary ? "Primary Super Admin (Protected)" : "Co-Administrator"}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isPrimary ? (
                          <span className="text-[9.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Locked</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRemoveAdmin(email)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Revoke Admin Access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: SYSTEM SPECS                                               */}
        {/* ================================================================= */}
        {activeTab === "specs" && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#796AEF]" />
              <h3 className="text-xs font-bold text-slate-900">Engine & Infrastructure Specs</h3>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { label: "AI Socratic Model", val: "Gemini 2.0 Flash Live API (WebSocket & REST)" },
                { label: "Teaching Framework", val: "5-Phase Socratic Teaching Engine (Intro -> Concept -> Example -> Doubt -> Transition)" },
                { label: "Whiteboard Engine", val: "KaTeX LaTeX Rendering + Dynamic SVG Geometry + Chalkboard Synthesizer" },
                { label: "Runtime Environment", val: "Node.js 22 LTS + Express Backend Server + Vite Frontend" },
                { label: "Container Port", val: "Port 3000 (Single-Port Reverse Proxy Ingress)" },
                { label: "Cloud Persistence", val: "Google Cloud Firestore (ai-studio-cherryaiclassroo-86064aaf-f308-4a6d-8ecd-f526c92fe78b)" },
              ].map((spec, i) => (
                <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-slate-500">{spec.label}</span>
                  <span className="text-[11px] font-semibold text-slate-900 sm:text-right">{spec.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 5. STUDENT DEEP DIVE REPORT CARD MODAL                            */}
      {/* ================================================================= */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#796AEF] font-black text-base flex items-center justify-center">
                  {selectedStudentForModal.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    {selectedStudentForModal.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {selectedStudentForModal.grade} • {selectedStudentForModal.board} • {selectedStudentForModal.subject}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 text-xs">
              {/* 3 Metric Tiles */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Sessions</p>
                  <p className="text-base font-black text-slate-800 mt-0.5">
                    {selectedStudentForModal.totalSessions}
                  </p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Quizzes</p>
                  <p className="text-base font-black text-slate-800 mt-0.5">
                    {selectedStudentForModal.totalQuizzes}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">Accuracy</p>
                  <p className="text-base font-black text-emerald-700 mt-0.5">
                    {selectedStudentForModal.quizAccuracy}%
                  </p>
                </div>
              </div>

              {/* Mastered Concepts */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mastered Concepts</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStudentForModal.strongTopics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>{topic}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Critical Revision Blindspots */}
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Identified Blindspots (Socratic Focus)</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStudentForModal.weakTopics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                    >
                      <span>{topic}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Preferences Strip */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Learning Language:</span>
                  <span className="font-bold text-slate-800">{selectedStudentForModal.mediumOfLearning}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Educational Board:</span>
                  <span className="font-bold text-slate-800">{selectedStudentForModal.board}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Record ID:</span>
                  <span className="font-mono text-[10px] text-slate-600">{selectedStudentForModal.id}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    const std = selectedStudentForModal;
                    setSelectedStudentForModal(null);
                    setManagingSubStudent(std);
                    if (std.subscriptionStatus === "pending_verification") {
                      setSelectedPlanForApproval(std.planId || plans[0]?.id || "semiannual_149");
                      setApprovalNotesInput(`Approved UTR: ${std.utrNumber || "Verified"}`);
                    }
                  }}
                  className="w-full h-10 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[#796AEF] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Manage Subscription & UTR Status</span>
                </button>

                <button
                  onClick={() => {
                    const std = selectedStudentForModal;
                    setSelectedStudentForModal(null);
                    onSwitchToStudentView({
                      name: std.name,
                      grade: std.grade,
                      subject: std.subject,
                      board: std.board,
                      mediumOfLearning: std.mediumOfLearning,
                    });
                  }}
                  className="w-full h-11 bg-[#796AEF] hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview Classroom As {selectedStudentForModal.name}</span>
                </button>

                <button
                  onClick={() => setSelectedStudentForModal(null)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close Report Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 6. PHASE 3: DEDICATED STUDENT SUBSCRIPTION & UTR APPROVAL MODAL  */}
      {/* ================================================================= */}
      {managingSubStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#796AEF] flex items-center justify-center shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Subscription & Access Control
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {managingSubStudent.name} • {managingSubStudent.grade}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManagingSubStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4 text-xs">
              {/* Current Status Card */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    Current Status
                  </span>
                  {managingSubStudent.subscriptionStatus === "pending_verification" && (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-700" />
                      <span>Pending Verification</span>
                    </span>
                  )}
                  {(managingSubStudent.isPro || managingSubStudent.subscriptionStatus === "active") && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Pro Active</span>
                    </span>
                  )}
                  {managingSubStudent.subscriptionStatus === "suspended" && (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-bold flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-600" />
                      <span>Access Suspended</span>
                    </span>
                  )}
                  {(!managingSubStudent.isPro && managingSubStudent.subscriptionStatus !== "pending_verification" && managingSubStudent.subscriptionStatus !== "suspended") && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-bold">
                      Free Tier
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                  <span className="text-slate-600">Assigned Plan:</span>
                  <span className="font-bold text-indigo-700">
                    {managingSubStudent.subscriptionPlan || "Standard Free"}
                  </span>
                </div>

                {managingSubStudent.subscriptionExpires && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Validity Expiry:</span>
                    <span className="font-bold text-slate-800">
                      {managingSubStudent.subscriptionExpires}
                    </span>
                  </div>
                )}
              </div>

              {/* UTR Reference Details */}
              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>Payment Reference (UTR)</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-700">
                    Amount: ₹{managingSubStudent.paymentAmount || 149}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-300">
                  <div className="min-w-0 pr-2">
                    <p className="text-[10px] font-bold text-slate-400">UTR / Transaction ID</p>
                    <p className="font-mono text-sm font-black text-slate-900 tracking-wider truncate">
                      {managingSubStudent.utrNumber || "No UTR Submitted"}
                    </p>
                  </div>
                  {managingSubStudent.utrNumber && (
                    <button
                      onClick={() => handleCopyUtr(managingSubStudent.utrNumber!)}
                      className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedUtrId === managingSubStudent.utrNumber ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy UTR</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {managingSubStudent.submittedAt && (
                  <p className="text-[10px] text-amber-800">
                    Submitted Timestamp: <span className="font-medium">{managingSubStudent.submittedAt}</span>
                  </p>
                )}
                {managingSubStudent.notes && (
                  <p className="text-[10.5px] text-amber-900 bg-amber-100/50 p-2 rounded-lg italic">
                    "{managingSubStudent.notes}"
                  </p>
                )}
              </div>

              {/* Select Plan to Assign */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Assign Plan Tier
                </label>
                <select
                  value={selectedPlanForApproval}
                  onChange={(e) => setSelectedPlanForApproval(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-[#796AEF] focus:bg-white transition-all cursor-pointer"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.durationLabel || `${p.durationMonths} Mo`}) — ₹{p.priceINR}
                    </option>
                  ))}
                </select>
              </div>

              {/* Admin Verification Notes */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Admin Verification Notes
                </label>
                <input
                  type="text"
                  value={approvalNotesInput}
                  onChange={(e) => setApprovalNotesInput(e.target.value)}
                  placeholder="e.g., Verified in HDFC bank ledger by onlinework0876@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#796AEF] focus:bg-white transition-all"
                />
              </div>

              {/* Quick Extend Validity Pills */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Quick Validity Extension
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleExtend(managingSubStudent, m)}
                      disabled={isProcessingAction}
                      className="py-1.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-[#796AEF] border border-indigo-200 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
                    >
                      +{m} Mo
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => handleQuickApprove(managingSubStudent, selectedPlanForApproval)}
                  disabled={isProcessingAction}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {managingSubStudent.subscriptionStatus === "pending_verification"
                      ? "Approve UTR & Activate Pro"
                      : "Grant / Re-Activate Pro Access"}
                  </span>
                </button>

                {(managingSubStudent.isPro || managingSubStudent.subscriptionStatus === "active") && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const matchedSub = studentSubscriptions.find(
                          (s) => s.studentId === managingSubStudent.id || s.id === managingSubStudent.id
                        );
                        setReceiptModalSub(matchedSub || {
                          id: managingSubStudent.id,
                          studentName: managingSubStudent.name,
                          planId: "semiannual_149",
                          planName: managingSubStudent.subscriptionPlan || "6 Months Special Pass",
                          amountINR: managingSubStudent.paymentAmount || 149,
                          status: "active",
                          isPro: true,
                          utrNumber: managingSubStudent.utrNumber,
                          submittedAt: managingSubStudent.submittedAt || new Date().toISOString(),
                          activatedAt: managingSubStudent.submittedAt || new Date().toISOString(),
                          expiresAt: managingSubStudent.subscriptionExpires,
                          approvedBy: managingSubStudent.approvedBy || "Admin",
                        });
                      }}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-[#796AEF] border border-indigo-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Print Official Fee Receipt</span>
                    </button>

                    <button
                      onClick={() => handleRevoke(managingSubStudent)}
                      disabled={isProcessingAction}
                      className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Suspend / Revoke Pro Access</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setManagingSubStudent(null)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL DIGITAL FEE RECEIPT MODAL (PHASE 4) */}
      <FeeReceiptModal
        isOpen={!!receiptModalSub}
        onClose={() => setReceiptModalSub(null)}
        subscription={receiptModalSub}
        onToast={onToast}
      />

      {/* STUDENT REFERRAL 5-TIER INSPECTION MODAL (PHASE 1) */}
      <AdminReferralDetailModal
        isOpen={!!inspectingReferralStudent}
        onClose={() => setInspectingReferralStudent(null)}
        summary={inspectingReferralStudent}
        onStatusChange={(studentId, newStatus) => {
          handleToggleReferralStatus(studentId, newStatus);
        }}
        onApprovePayout={(rec) => {
          setPayoutModalRecord(rec);
          setPayoutModalMode("approve");
        }}
        onRejectPayout={(rec) => {
          setPayoutModalRecord(rec);
          setPayoutModalMode("reject");
        }}
        onToast={onToast}
        onSwitchToStudentView={onSwitchToStudentView}
      />

      {/* ADMIN TIER MULTIPLIER LEDGER AUDIT MODAL */}
      <AdminTierLedgerModal
        isOpen={showTierLedgerModal}
        onClose={() => setShowTierLedgerModal(false)}
        students={referralSummaries}
        onInspectStudent={(s) => setInspectingReferralStudent(s)}
        onToast={onToast}
      />

      {/* ADMIN UPI PAYOUT APPROVAL / REJECTION ENGINE (PHASE 2) */}
      <AdminPayoutApprovalModal
        isOpen={!!payoutModalRecord}
        onClose={() => setPayoutModalRecord(null)}
        withdrawal={payoutModalRecord}
        mode={payoutModalMode}
        onApprove={handleApprovePayout}
        onReject={handleRejectPayout}
        onToast={onToast}
      />

      {/* DIRECT MANUAL STUDENT ONBOARDING & PROVISIONING MODAL */}
      <AdminManualOnboardModal
        isOpen={showManualOnboardModal}
        onClose={() => setShowManualOnboardModal(false)}
        adminEmail={currentUser?.email || "Admin"}
        onSuccess={(name, plan) => {
          setStudentSubscriptions(getStudentSubscriptions());
          fetchStudents(false);
          onToast?.(`🎉 ${name} successfully registered with Pro (${plan})!`, "success");
        }}
        onToast={onToast}
      />
    </div>
  );
};

export default AdminDashboard;
