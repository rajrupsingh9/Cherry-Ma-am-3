import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap,
  BookOpen,
  Globe,
  User,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Lock,
  Key,
  CreditCard,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Crown,
  Star,
  RefreshCw,
  AlertCircle,
  Smartphone,
  Award,
  Gift,
  Clock,
} from "lucide-react";
import QRCode from "qrcode";
import { getTranslations } from "../utils/i18n";
import { isAdminEmail } from "../utils/adminConfig";
import { auth, googleProvider, db } from "../lib/firebase";
import { signInWithPopup, User as FirebaseUser } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  SUBSCRIPTION_PLANS,
  getActiveSubscriptionPlans,
  SubscriptionPlan,
  SubscriptionState,
  loadSubscriptionState,
  saveSubscriptionState,
  buildDynamicUpiUri,
  generateTransactionReference,
  activateSubscription,
  DEFAULT_RECEIVER_UPI_ID,
  DEFAULT_MERCHANT_NAME,
  matchProvisionedStudent,
  recordStudentUtrPayment,
  checkStudentApprovalStatus,
  getStudentSubscriptions,
  saveStudentSubscriptionToCloud,
  StudentSubscriptionRecord,
} from "../utils/subscriptionStore";
import {
  addStoredApiKey,
  validateGeminiApiKey,
  getActiveApiKey,
} from "../utils/geminiKeyStorage";
import { triggerCelebrationConfetti } from "../utils/confetti";
import {
  getReferralCommissionConfig,
  lookupReferralCode,
  distributeAndCreditReferralCommission,
  ReferralLookupResult,
} from "../utils/referralStore";

export type OnboardingStep =
  | "google_login"
  | "profile_setup"
  | "payment_149"
  | "api_key_setup"
  | "launch_app";

export interface StudentEnrollmentScreenProps {
  initialDetails: {
    name: string;
    grade: string;
    board?: string;
    mediumOfLearning?: string;
    subject?: string;
  };
  currentUser?: FirebaseUser | null;
  subscriptionState?: SubscriptionState;
  onComplete: (data: {
    name: string;
    grade: string;
    board: string;
    mediumOfLearning: string;
    avatarEmoji?: string;
  }) => void;
  onSkipToDesk?: () => void;
  onToast?: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  onSubscriptionUpdated?: (state: SubscriptionState) => void;
  onUserAuthenticated?: (user: any) => void;
}

const AVATAR_OPTIONS = ["🧑‍🎓", "👩‍🎓", "🚀", "🔬", "⚡", "🍒"];

const GRADE_OPTIONS = [
  { id: "Class 6", label: "Class 6", desc: "Middle School Foundation" },
  { id: "Class 7", label: "Class 7", desc: "STEM Fundamentals" },
  { id: "Class 8", label: "Class 8", desc: "Pre-Boards & Science Core" },
  { id: "Class 9", label: "Class 9", desc: "Foundational STEM & CBSE/ICSE" },
  { id: "Class 10", label: "Class 10", desc: "Board Exam Mastery & PYQs" },
  { id: "Class 11", label: "Class 11", desc: "Science (Physics, Chem, Math/Bio)" },
  { id: "Class 12", label: "Class 12", desc: "Senior Boards & Fast Track" },
  { id: "NEET", label: "NEET", desc: "Medical Competitive Entrance" },
  { id: "JEE", label: "JEE", desc: "Engineering Competitive Entrance" },
];

const BOARD_OPTIONS = [
  "CBSE Board",
  "ICSE / ISC",
  "UP Board",
  "Bihar Board (BSEB)",
  "Jharkhand Board (JAC)",
  "West Bengal Board (WBBSE/WBCHSE)",
  "Odisha Board (CHSE/BSE)",
  "Maharashtra Board",
  "Rajasthan Board (RBSE)",
  "MP Board",
  "Other State Board",
];

const MEDIUM_OPTIONS = [
  { id: "Hinglish", label: "Hinglish", icon: "🇮🇳", desc: "Hindi + English Mix (Best)" },
  { id: "English", label: "English", icon: "🇬🇧", desc: "Pure English Explanation" },
  { id: "Hindi", label: "Hindi", icon: "🇮🇳", desc: "शुद्ध हिंदी माध्यम" },
  { id: "Bengali", label: "Bengali (বাংলা)", icon: "🇮🇳", desc: "বাংলা মাধ্যম" },
  { id: "Odisha", label: "Odisha / Odia (ଓଡ଼ିଆ)", icon: "🇮🇳", desc: "ଓଡ଼ିଆ ମାଧ୍ୟମ (Odisha)" },
  { id: "Marathi", label: "Marathi (मराठी)", icon: "🇮🇳", desc: "मराठी माध्यम" },
];

export const StudentEnrollmentScreen: React.FC<StudentEnrollmentScreenProps> = ({
  initialDetails,
  currentUser: propUser,
  subscriptionState: propSubState,
  onComplete,
  onToast,
  onSubscriptionUpdated,
  onUserAuthenticated,
}) => {
  // Determine authenticated Google user
  const activeAuthUser = auth.currentUser || propUser;
  const isGoogleAuthenticated = Boolean(
    activeAuthUser && !activeAuthUser.isAnonymous && !activeAuthUser.uid.startsWith("local_")
  );

  // Initialize step
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(() => {
    if (!isGoogleAuthenticated) return "google_login";
    if (initialDetails?.name && initialDetails.name.trim().length >= 2) {
      return "payment_149";
    }
    return "profile_setup";
  });

  // Local state for authenticated user if login occurs in-screen
  const [authedUser, setAuthedUser] = useState<FirebaseUser | null>(activeAuthUser || null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Profile Form State
  const [name, setName] = useState(
    initialDetails.name || activeAuthUser?.displayName || ""
  );
  const [grade, setGrade] = useState(initialDetails.grade || "Class 10");
  const [board, setBoard] = useState(initialDetails.board || "CBSE Board");
  const [mediumOfLearning, setMediumOfLearning] = useState(
    initialDetails.mediumOfLearning || "Hinglish"
  );
  const [selectedAvatar, setSelectedAvatar] = useState("🧑‍🎓");
  const [profileError, setProfileError] = useState<string | null>(null);

  // Subscription / Payment (Dynamic Admin Configured Plan)
  const [subState, setSubState] = useState<SubscriptionState>(() =>
    propSubState || loadSubscriptionState()
  );
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => getActiveSubscriptionPlans());

  useEffect(() => {
    const handlePlansUpdated = (e: any) => {
      setPlans(e.detail || getActiveSubscriptionPlans());
    };
    const handleUpiUpdated = (e: any) => {
      setSubState((prev) => ({
        ...prev,
        customUpiReceiverId: e.detail?.receiverUpiId || DEFAULT_RECEIVER_UPI_ID,
        merchantName: e.detail?.merchantName || DEFAULT_MERCHANT_NAME,
      }));
    };
    const handleSubUpdated = (e: any) => {
      const updated = e.detail || loadSubscriptionState();
      setSubState(updated);
    };
    window.addEventListener("cherry_plans_updated", handlePlansUpdated);
    window.addEventListener("cherry_upi_config_updated", handleUpiUpdated);
    window.addEventListener("cherry_subscription_updated", handleSubUpdated);
    return () => {
      window.removeEventListener("cherry_plans_updated", handlePlansUpdated);
      window.removeEventListener("cherry_upi_config_updated", handleUpiUpdated);
      window.removeEventListener("cherry_subscription_updated", handleSubUpdated);
    };
  }, []);

  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    const popular = plans.find((p) => p.popular);
    if (popular) return popular.id;
    const semiannual = plans.find((p) => p.id === "semiannual_149");
    if (semiannual) return semiannual.id;
    return plans[0]?.id || SUBSCRIPTION_PLANS[0]?.id || "semiannual_149";
  });

  const selectedPlan: SubscriptionPlan =
    plans.find((p) => p.id === selectedPlanId) ||
    plans.find((p) => p.popular) ||
    plans[0] ||
    SUBSCRIPTION_PLANS[0];

  const specialPlan = selectedPlan;
  const [activeTxnRef] = useState(() => generateTransactionReference());
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [userUtrInput, setUserUtrInput] = useState("");
  const [isActivatingPayment, setIsActivatingPayment] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submittedPendingRecord, setSubmittedPendingRecord] = useState<StudentSubscriptionRecord | null>(() => {
    try {
      const currentUid = activeAuthUser?.uid || propUser?.uid;
      const currentEmail = activeAuthUser?.email || propUser?.email;
      const list = getStudentSubscriptions();
      const found = list.find((s) => {
        if (currentUid && (s.id === currentUid || (s as any).userId === currentUid)) return true;
        if (currentEmail && s.studentEmail && s.studentEmail.toLowerCase() === currentEmail.toLowerCase()) return true;
        return false;
      });
      if (found && found.status === "pending_verification" && !found.isPro) {
        return found;
      }
    } catch (_) {}
    return null;
  });
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);

  // Sync pending status or realtime approval if updated in background or by Admin
  useEffect(() => {
    const currentUid = authedUser?.uid || activeAuthUser?.uid || propUser?.uid;
    const currentEmail = authedUser?.email || activeAuthUser?.email || propUser?.email;
    const currentName = name || authedUser?.displayName || activeAuthUser?.displayName;
    if (!currentUid && !currentEmail && !currentName) return;

    const checkApproval = () => {
      const list = getStudentSubscriptions();
      const found = list.find((s) => {
        if (currentUid && (s.id === currentUid || (s as any).userId === currentUid)) return true;
        if (currentEmail && s.studentEmail && s.studentEmail.toLowerCase() === currentEmail.toLowerCase()) return true;
        if (currentName && s.studentName && s.studentName.toLowerCase() === currentName.toLowerCase()) return true;
        return false;
      });

      if (found) {
        if (found.isPro && found.status === "active") {
          setSubmittedPendingRecord(null);
          const current = loadSubscriptionState();
          setSubState(current);
        } else if (found.status === "pending_verification" && !found.isPro) {
          setSubmittedPendingRecord(found);
          if (found.utrNumber && !userUtrInput) {
            setUserUtrInput(found.utrNumber);
          }
        }
      }
    };

    checkApproval();
    window.addEventListener("cherry_student_subscriptions_updated", checkApproval);
    window.addEventListener("cherry_subscription_updated", checkApproval);
    return () => {
      window.removeEventListener("cherry_student_subscriptions_updated", checkApproval);
      window.removeEventListener("cherry_subscription_updated", checkApproval);
    };
  }, [authedUser, activeAuthUser, propUser, name]);

  // API Key State
  const [apiKeyInput, setApiKeyInput] = useState(() => getActiveApiKey());
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [apiKeyMessage, setApiKeyMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const t = getTranslations(mediumOfLearning);

  // Referral / Invite Code State (Phase 4)
  const [referralCodeInput, setReferralCodeInput] = useState<string>(() => {
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlRef = urlParams.get("ref");
        if (urlRef && urlRef.trim()) return urlRef.trim().toUpperCase();
        return localStorage.getItem("cherry_pending_ref_code") || "";
      }
    } catch (_) {}
    return "";
  });
  const [appliedReferral, setAppliedReferral] = useState<ReferralLookupResult | null>(null);
  const [referralFeedback, setReferralFeedback] = useState<{
    status: "idle" | "valid" | "invalid";
    message: string;
  }>({ status: "idle", message: "" });
  const [showReferralInput, setShowReferralInput] = useState<boolean>(Boolean(referralCodeInput));
  const [commissionConfig, setCommissionConfig] = useState(() => getReferralCommissionConfig());

  // Direct Phone / Enrolled Student Quick-Access State
  const [phoneLookupInput, setPhoneLookupInput] = useState("");
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [showPhoneLookup, setShowPhoneLookup] = useState(false);

  // Auto-validate preloaded referral code from URL / localStorage on load
  useEffect(() => {
    const raw = referralCodeInput.trim();
    if (raw) {
      setShowReferralInput(true);
      const studentId = activeAuthUser?.uid || "student_enroll";
      const studentName = name || activeAuthUser?.displayName || "Student";
      const lookup = lookupReferralCode(raw, studentId, studentName, {
        priceINR: selectedPlan.priceINR,
        durationMonths: selectedPlan.durationMonths,
        planId: selectedPlan.id,
      });
      if (lookup.valid) {
        setAppliedReferral(lookup);
        setReferralFeedback({ status: "valid", message: lookup.message });
      } else {
        setAppliedReferral(null);
        setReferralFeedback({ status: "invalid", message: lookup.message });
      }
    }
  }, [selectedPlan]);

  const handleApplyReferralCode = (codeToVerify?: string) => {
    const targetCode = (codeToVerify || referralCodeInput).trim().toUpperCase();
    if (!targetCode) {
      setAppliedReferral(null);
      setReferralFeedback({ status: "invalid", message: "Please enter an invite code." });
      return;
    }
    const studentId = activeAuthUser?.uid || authedUser?.uid || "student_enroll";
    const studentName = name.trim() || activeAuthUser?.displayName || "Student";
    const lookup = lookupReferralCode(targetCode, studentId, studentName, {
      priceINR: selectedPlan.priceINR,
      durationMonths: selectedPlan.durationMonths,
      planId: selectedPlan.id,
    });
    if (lookup.valid) {
      setAppliedReferral(lookup);
      setReferralFeedback({
        status: "valid",
        message: lookup.message,
      });
      onToast?.(lookup.message, "success");
    } else {
      setAppliedReferral(null);
      setReferralFeedback({
        status: "invalid",
        message: lookup.message,
      });
      onToast?.(lookup.message, "warning");
    }
  };

  // Synchronize Google displayName when user signs in
  useEffect(() => {
    if (activeAuthUser?.displayName && !name) {
      setName(activeAuthUser.displayName);
    }
    if (activeAuthUser) {
      setAuthedUser(activeAuthUser);
    }
  }, [activeAuthUser, name]);

  // Generate UPI QR code for ₹149 Pro Payment
  useEffect(() => {
    if (currentStep !== "payment_149") return;
    const upiUri = buildDynamicUpiUri({
      receiverUpiId: subState.customUpiReceiverId || DEFAULT_RECEIVER_UPI_ID,
      merchantName: subState.merchantName || DEFAULT_MERCHANT_NAME,
      amount: specialPlan.priceINR,
      transactionRef: activeTxnRef,
      note: `CherryAI ${specialPlan.name} - ${name || "Student"}`,
    });

    QRCode.toDataURL(upiUri, {
      width: 240,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating UPI QR code:", err));
  }, [currentStep, subState, specialPlan.priceINR, activeTxnRef, name]);

  // STEP 1: Direct Session Helper (For enrolled student mobile lookup)
  const handleDirectStudentLogin = async (customEmailOrPhone?: string) => {
    const input = (customEmailOrPhone || "").trim();
    if (!input) return;
    const isPhone = /^\d{10}$/.test(input.replace(/\D/g, ""));
    const cleanPhone = isPhone ? input.replace(/\D/g, "") : "";
    const isEmail = input.includes("@");
    const isSuperAdmin = isAdminEmail(input);

    // 1. Check if this student was provisioned by Admin
    const matchedProvision = await matchProvisionedStudent({
      phone: cleanPhone || undefined,
      email: isEmail ? input.toLowerCase() : undefined,
    });

    if (matchedProvision && matchedProvision.profileData && matchedProvision.subscription) {
      const studentUser = {
        uid: matchedProvision.subscription.id,
        displayName: matchedProvision.profileData.name,
        email: matchedProvision.subscription.studentEmail || (cleanPhone ? `student_${cleanPhone}@cherry.ai` : "student@cherry.ai"),
        phoneNumber: cleanPhone || undefined,
        isAnonymous: false,
        photoURL: null,
      };
      try {
        localStorage.setItem("local_active_user", JSON.stringify(studentUser));
      } catch (_) {}
      setAuthedUser(studentUser as any);
      setName(matchedProvision.profileData.name);
      onUserAuthenticated?.(studentUser);
      onToast?.(
        `🎉 Welcome back ${matchedProvision.profileData.name}! Admin-activated ${matchedProvision.subscription.planName} Pro access loaded!`,
        "success"
      );
      onComplete({
        name: matchedProvision.profileData.name,
        grade: matchedProvision.profileData.grade,
        board: matchedProvision.profileData.board,
        mediumOfLearning: matchedProvision.profileData.mediumOfLearning,
      });
      return;
    }

    if (isSuperAdmin) {
      const adminUser = {
        uid: "admin_" + input.replace(/[^a-zA-Z0-9]/g, "_"),
        displayName: "Admin",
        email: input,
        phoneNumber: cleanPhone || undefined,
        isAnonymous: false,
        photoURL: null,
      };
      try {
        localStorage.setItem("local_active_user", JSON.stringify(adminUser));
      } catch (_) {}
      setAuthedUser(adminUser as any);
      onUserAuthenticated?.(adminUser);
      onToast?.(`Admin Access Granted: ${input}! Redirecting to Admin Dashboard 👑`, "success");
      return;
    }

    const studentName = name.trim() || (isEmail ? (input.split("@")[0] || "Student") : `Student ${cleanPhone.slice(-4)}`);
    const studentUser = {
      uid: cleanPhone ? `phone_${cleanPhone}` : ("student_" + Math.random().toString(36).substring(2, 9)),
      displayName: studentName,
      email: isEmail ? input : `${cleanPhone || "student"}@cherry.ai`,
      phoneNumber: cleanPhone || undefined,
      isAnonymous: false,
      photoURL: null,
    };
    try {
      localStorage.setItem("local_active_user", JSON.stringify(studentUser));
    } catch (_) {}
    setAuthedUser(studentUser as any);
    if (!name.trim()) {
      setName(studentName);
    }
    onUserAuthenticated?.(studentUser);
    onToast?.(
      `Logged in as ${studentName}! Profile verified 🧑‍🎓✨`,
      "success"
    );
    setTimeout(() => {
      setCurrentStep("profile_setup");
    }, 300);
  };

  // STEP 1: Handle Google Sign-In (Mandatory for both Students & Admins)
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const loggedUser = result.user;
      setAuthedUser(loggedUser);
      onUserAuthenticated?.(loggedUser);
      if (isAdminEmail(loggedUser.email)) {
        onToast?.(
          `Admin Access Granted: ${loggedUser.email}! Redirecting to Admin Dashboard 👑`,
          "success"
        );
        return;
      }
      if (loggedUser.displayName && !name) {
        setName(loggedUser.displayName);
      }

      // Check if Admin already provisioned Pro access for this user by exact UID, email, or phone
      const provisionCheck = await matchProvisionedStudent({
        uid: loggedUser.uid,
        email: loggedUser.email || undefined,
        phone: (loggedUser as any).phoneNumber || undefined,
      });

      if (provisionCheck && provisionCheck.profileData && provisionCheck.subscription) {
        onToast?.(
          `🎉 Welcome ${provisionCheck.profileData.name}! Admin has already pre-activated your ${provisionCheck.subscription.planName} Pro access!`,
          "success"
        );
        onComplete({
          name: provisionCheck.profileData.name,
          grade: provisionCheck.profileData.grade,
          board: provisionCheck.profileData.board,
          mediumOfLearning: provisionCheck.profileData.mediumOfLearning,
        });
        return;
      }

      onToast?.(
        `Google account verified: ${loggedUser.displayName || loggedUser.email}! 🧑‍🎓✨`,
        "success"
      );
      // Smoothly advance to Step 2 for Students
      setTimeout(() => {
        setCurrentStep("profile_setup");
      }, 400);
    } catch (err: any) {
      const isDomainError =
        err?.code === "auth/unauthorized-domain" ||
        err?.message?.includes("unauthorized-domain") ||
        err?.message?.includes("auth/unauthorized-domain");

      const isPopupClosed =
        err?.code === "auth/popup-closed-by-user" ||
        err?.message?.includes("popup-closed-by-user") ||
        err?.code === "auth/cancelled-popup-request" ||
        err?.message?.includes("cancelled-popup-request");

      const isPopupBlocked =
        err?.code === "auth/popup-blocked" ||
        err?.message?.includes("popup-blocked");

      if (isDomainError) {
        console.warn(
          "Firebase Auth unauthorized domain on preview environment."
        );
        onToast?.(
          "Firebase domain authorization pending: Please authorize this URL in Firebase Console.",
          "warning"
        );
      } else if (isPopupClosed) {
        // User closed or dismissed the popup window - harmless cancellation
        console.info("Google Sign-In popup was closed by user.");
        onToast?.(
          "Google sign-in was cancelled. Click again when ready.",
          "info"
        );
      } else if (isPopupBlocked) {
        console.warn("Google Sign-In popup was blocked by browser.");
        onToast?.(
          "Sign-in popup was blocked by your browser. Please allow popups.",
          "warning"
        );
      } else {
        console.error("Google sign-in error:", err);
        onToast?.(
          `Google Sign-In failed: ${err.message || "Please try again."}`,
          "error"
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // STEP 2: Handle Profile Setup Submission
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setProfileError(t.enterNamePrompt || "Please enter your valid name.");
      return;
    }
    setProfileError(null);

    // Save profile to Firestore if user is authenticated
    const targetUser = auth.currentUser || authedUser;
    if (targetUser && !targetUser.uid.startsWith("local_")) {
      try {
        const profileRef = doc(db, "studentProfiles", targetUser.uid);
        await setDoc(
          profileRef,
          {
            userId: targetUser.uid,
            name: cleanName,
            grade,
            board,
            mediumOfLearning,
            avatarEmoji: selectedAvatar,
            email: targetUser.email || "",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("Firestore profile save warning:", err);
      }
    }

    // Phase 4: Referral code commission attribution & distribution
    const activeCode = appliedReferral?.referralCode || referralCodeInput.trim().toUpperCase();
    if (activeCode) {
      const studentId = targetUser?.uid || ("std_" + Math.random().toString(36).substring(2, 8));
      try {
        const attribution = await distributeAndCreditReferralCommission({
          referralCode: activeCode,
          newStudentId: studentId,
          newStudentName: cleanName,
          newStudentGrade: grade,
          newStudentEmail: targetUser?.email || undefined,
          planPriceINR: selectedPlan.priceINR,
          planDurationMonths: selectedPlan.durationMonths,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
        });

        if (attribution.success) {
          triggerCelebrationConfetti();
          onToast?.(attribution.message, "success");
        } else if (attribution.isSelfReferral) {
          onToast?.(attribution.message, "warning");
        }
      } catch (err: any) {
        console.warn("[StudentEnrollmentScreen] Referral attribution error:", err);
      }
    }

    onToast?.(`Profile saved for ${cleanName}! 🎓 Proceeding to subscription activation.`, "success");
    // Advance to Step 3: Payment for ₹149 (6 months)
    setCurrentStep("payment_149");
  };

  // STEP 3: Handle Payment UTR Submission for Admin Approval
  const handleConfirmPayment = async () => {
    const cleanUtr = userUtrInput.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      onToast?.("Please enter a valid 12-digit UPI Reference / UTR Number from your payment app.", "warning");
      return;
    }

    setIsActivatingPayment(true);
    try {
      const targetUid = authedUser?.uid || activeAuthUser?.uid || propUser?.uid || `std_${Date.now()}`;
      const targetEmail = authedUser?.email || activeAuthUser?.email || propUser?.email || undefined;
      const targetName = name.trim() || authedUser?.displayName || activeAuthUser?.displayName || "Student";

      const record = recordStudentUtrPayment({
        studentId: targetUid,
        studentName: targetName,
        studentEmail: targetEmail,
        grade: grade || "Class 10",
        board: board || "CBSE Board",
        subject: "Science",
        mediumOfLearning: mediumOfLearning || "Hinglish",
        planId: selectedPlan.id,
        amountINR: selectedPlan.priceINR,
        utrNumber: cleanUtr,
        status: "pending_verification",
      });

      // Save directly to Firestore so Admin sees it in real time
      await saveStudentSubscriptionToCloud(record);

      setSubmittedPendingRecord(record);
      setIsActivatingPayment(false);

      onToast?.(
        `✅ Payment verification request submitted to Admin! 📩 Verification is pending. Admin will verify your UTR in the Admin Dashboard and approve your Pro access.`,
        "success"
      );
    } catch (err) {
      console.error("Error submitting UTR request:", err);
      setIsActivatingPayment(false);
      onToast?.("Could not submit UTR verification request. Please try again.", "error");
    }
  };

  // Helper to check if Admin has approved the request
  const handleCheckApprovalStatus = async () => {
    setIsCheckingApproval(true);
    try {
      const currentUid = authedUser?.uid || activeAuthUser?.uid || propUser?.uid;
      const currentEmail = authedUser?.email || activeAuthUser?.email || propUser?.email || undefined;
      const currentName = name.trim() || authedUser?.displayName || activeAuthUser?.displayName;

      const res = await checkStudentApprovalStatus({
        studentId: currentUid,
        studentEmail: currentEmail,
        studentName: currentName,
      });

      if (res.isApproved && res.record) {
        setSubmittedPendingRecord(null);
        triggerCelebrationConfetti();
        onToast?.("🎉 Payment Approved by Admin! Pro access is now active.", "success");
        // Also update local state
        const updatedSub = loadSubscriptionState();
        setSubState(updatedSub);
        onSubscriptionUpdated?.(updatedSub);
        // Advance to Step 4: API Key Setup
        setCurrentStep("api_key_setup");
      } else if (res.record?.status === "pending_verification") {
        setSubmittedPendingRecord(res.record);
        onToast?.("⏳ Verification is still pending. Admin has not approved this request yet.", "info");
      } else {
        onToast?.("No pending approval found. Please submit your UTR reference.", "info");
      }
    } catch (err) {
      console.warn("Approval status check error:", err);
      onToast?.("Could not check approval status right now. Please try again.", "error");
    } finally {
      setIsCheckingApproval(false);
    }
  };

  const handleOpenUpiIntent = (appScheme?: "gpay" | "phonepe" | "paytm") => {
    const genericUri = buildDynamicUpiUri({
      receiverUpiId: subState.customUpiReceiverId || DEFAULT_RECEIVER_UPI_ID,
      merchantName: subState.merchantName || DEFAULT_MERCHANT_NAME,
      amount: specialPlan.priceINR,
      transactionRef: activeTxnRef,
      note: `CherryAI ${specialPlan.name} - ${name || "Student"}`,
    });

    let targetUrl = genericUri;
    if (appScheme === "gpay") {
      targetUrl = genericUri.replace("upi://pay", "tez://upi/pay");
    } else if (appScheme === "phonepe") {
      targetUrl = genericUri.replace("upi://pay", "phonepe://pay");
    } else if (appScheme === "paytm") {
      targetUrl = genericUri.replace("upi://pay", "paytmmp://pay");
    }

    window.location.href = targetUrl;
    onToast?.("Opening UPI App... Complete payment and enter UTR below.", "info");
  };

  const handleCopyUpiId = () => {
    const idToCopy = subState.customUpiReceiverId || DEFAULT_RECEIVER_UPI_ID;
    navigator.clipboard.writeText(idToCopy);
    setCopiedUpi(true);
    onToast?.("Merchant UPI ID copied to clipboard! 📋", "success");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // STEP 4: Handle API Key Verification and Continuation
  const handleTestAndSaveApiKey = async () => {
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      setApiKeyMessage({
        text: "Please enter your Gemini API Key or choose Cloud Engine below.",
        type: "error",
      });
      return;
    }

    setIsValidatingKey(true);
    setApiKeyMessage({ text: "Connecting and verifying Gemini API key...", type: "info" });

    try {
      const res = await validateGeminiApiKey(cleanKey);
      if (res.valid) {
        addStoredApiKey(cleanKey, "Personal Key");
        setApiKeyMessage({ text: "✓ API Key verified and saved successfully! 🚀", type: "success" });
        onToast?.("Gemini API Key connected successfully!", "success");
        setTimeout(() => {
          setCurrentStep("launch_app");
        }, 600);
      } else {
        setApiKeyMessage({
          text: `Verification failed: ${res.message || "Invalid API Key"}. Check Google AI Studio.`,
          type: "error",
        });
      }
    } catch (err: any) {
      setApiKeyMessage({
        text: `Validation error: ${err.message || "Could not reach server"}. You can also use Cloud Engine.`,
        type: "error",
      });
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleUseCloudEngine = () => {
    onToast?.("Configured with Cherry AI High-Speed Cloud Engine! ⚡", "success");
    setCurrentStep("launch_app");
  };

  // STEP 5: Final Launch App Action
  const handleLaunchApp = () => {
    triggerCelebrationConfetti();
    onComplete({
      name: name.trim() || "Student",
      grade,
      board,
      mediumOfLearning,
      avatarEmoji: selectedAvatar,
    });
  };

  // Stepper Header Definitions
  const STEPS_NAV = [
    { id: "google_login", label: "1. Google Login", short: "Login" },
    { id: "profile_setup", label: "2. Profile", short: "Profile" },
    { id: "payment_149", label: "3. Choose Plan & Pay", short: "Plans" },
    { id: "api_key_setup", label: "4. API Key", short: "API Key" },
    { id: "launch_app", label: "5. Ready", short: "Use App" },
  ];

  const getStepIndex = (step: OnboardingStep) => {
    return STEPS_NAV.findIndex((s) => s.id === step);
  };
  const activeStepIdx = getStepIndex(currentStep);

  return (
    <div
      id="student-enrollment-flow"
      className="w-full h-full min-h-full flex-1 bg-[#F8FAFC] text-slate-900 flex flex-col justify-between relative overflow-hidden select-none"
    >
      {/* Centered Mobile App Canvas Viewport */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-between px-4 pt-3 pb-4 z-10 relative overflow-y-auto no-scrollbar">
        
        {/* UNIFIED APP HEADER (MATCHING SYLLABUS DESK & REST OF APP) */}
        <header className="py-2.5 shrink-0 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-3.5 -mx-4 -mt-3 mb-1 shadow-2xs">
          <div className="flex items-center gap-2.5">
            {activeStepIdx > 0 && currentStep !== "launch_app" ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === "api_key_setup") setCurrentStep("payment_149");
                  else if (currentStep === "payment_149") setCurrentStep("profile_setup");
                  else if (currentStep === "profile_setup") setCurrentStep("google_login");
                }}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:text-[#796AEF] hover:border-indigo-200 flex items-center justify-center shadow-2xs transition-all cursor-pointer active:scale-95"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div
                className="w-8 h-8 rounded-xl bg-white border border-slate-200/90 text-[#796AEF] flex items-center justify-center shadow-2xs select-none"
                title="Cherry AI"
              >
                <span className="text-base">🍒</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1">
                  Cherry AI
                  <span className="text-[8.5px] bg-indigo-50 text-[#796AEF] px-1.5 py-0.2 rounded-md font-bold border border-indigo-100/80">
                    Pro
                  </span>
                </h1>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Student Enrollment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {currentStep === "payment_149" ? (
              <span className="text-[9.5px] font-bold text-[#796AEF] bg-indigo-50 border border-indigo-100/80 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                <Crown className="w-3 h-3 text-amber-500" />
                <span>Selected: ₹{specialPlan.priceINR} ({specialPlan.durationLabel || `${specialPlan.durationMonths} Mo`})</span>
              </span>
            ) : (
              <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/80 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Verified Portal</span>
              </span>
            )}
          </div>
        </header>

        {/* STEP CONTENT CONTAINER */}
        <div className="my-auto py-3">
          <AnimatePresence mode="wait">
            
            {/* ============================================================ */}
            {/* STEP 1: GOOGLE LOGIN (MANDATORY)                             */}
            {/* ============================================================ */}
            {currentStep === "google_login" && (
              <motion.div
                key="step-google-login"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-3.5 text-left"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-[#796AEF] text-[10px] font-bold uppercase tracking-wider mb-1.5 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-[#796AEF]" />
                    <span>Welcome Aspirant • छात्र प्रवेश</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    Welcome to Cherry AI Classroom
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Sign in with your Google account to create your verified student profile, save notes, and start interactive learning.
                  </p>
                </div>

                {/* Google Login Card */}
                <div className="bg-white rounded-2xl p-4.5 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
                  {/* Verified State if already connected */}
                  {authedUser && !authedUser.isAnonymous ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                      <div className="flex items-center gap-3">
                        {authedUser.photoURL ? (
                          <img
                            src={authedUser.photoURL}
                            alt="Google User"
                            className="w-10 h-10 rounded-full border border-emerald-300"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#796AEF] text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                            {authedUser.displayName?.charAt(0) || "G"}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Google Account Connected</span>
                          </div>
                          <p className="text-xs font-black text-slate-900 truncate">
                            {authedUser.displayName || "Student"}
                          </p>
                          <p className="text-[10.5px] text-slate-500 font-mono truncate">
                            {authedUser.email}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep("profile_setup")}
                        className="w-full py-3 px-4 rounded-xl bg-[#796AEF] hover:bg-[#6858e0] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-all"
                      >
                        <span>Continue as {authedUser.displayName?.split(" ")[0] || "Student"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {/* Learning Highlights */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/70 text-[11px]">
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                          <span className="w-5 h-5 rounded-md bg-indigo-50 text-[#796AEF] flex items-center justify-center font-bold text-[11px] shrink-0">
                            🎙️
                          </span>
                          <span>Voice AI Mentor</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                          <span className="w-5 h-5 rounded-md bg-indigo-50 text-[#796AEF] flex items-center justify-center font-bold text-[11px] shrink-0">
                            📝
                          </span>
                          <span>Chalkboard Notes</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                          <span className="w-5 h-5 rounded-md bg-indigo-50 text-[#796AEF] flex items-center justify-center font-bold text-[11px] shrink-0">
                            ⚡
                          </span>
                          <span>Instant Doubts</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                          <span className="w-5 h-5 rounded-md bg-indigo-50 text-[#796AEF] flex items-center justify-center font-bold text-[11px] shrink-0">
                            🔒
                          </span>
                          <span>Cloud Sync</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isLoggingIn}
                        onClick={handleGoogleLogin}
                        className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 hover:border-[#796AEF] flex items-center justify-center gap-3 shadow-2xs cursor-pointer active:scale-98 transition-all font-bold text-xs sm:text-sm disabled:opacity-60"
                      >
                        {isLoggingIn ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-[#796AEF]" />
                            <span>Connecting Google Account...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                              />
                            </svg>
                            <span>Sign in with Google (Google खाते से जुड़ें)</span>
                          </>
                        )}
                      </button>

                      {/* Subtle Help / Direct Login Options */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        {!showPhoneLookup ? (
                          <div className="flex items-center justify-center px-1">
                            <button
                              type="button"
                              onClick={() => setShowPhoneLookup(true)}
                              className="text-slate-500 hover:text-[#796AEF] text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                              <span>Enrolled student? Login with mobile</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-indigo-200 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                                <Smartphone className="w-3.5 h-3.5 text-[#796AEF]" />
                                <span>Enter Registered 10-digit Mobile</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => setShowPhoneLookup(false)}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                  +91
                                </span>
                                <input
                                  type="tel"
                                  maxLength={10}
                                  value={phoneLookupInput}
                                  onChange={(e) => setPhoneLookupInput(e.target.value.replace(/\D/g, ""))}
                                  placeholder="9876543210"
                                  className="w-full pl-11 pr-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#796AEF]"
                                />
                              </div>
                              <button
                                type="button"
                                disabled={phoneLookupInput.length !== 10 || isCheckingPhone}
                                onClick={async () => {
                                  setIsCheckingPhone(true);
                                  try {
                                    await handleDirectStudentLogin(phoneLookupInput);
                                  } finally {
                                    setIsCheckingPhone(false);
                                  }
                                }}
                                className="px-3.5 py-2 bg-[#796AEF] hover:bg-[#6858e0] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                              >
                                {isCheckingPhone ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <span>Verify</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              Directly access your activated Pro syllabus without paying again.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-slate-400">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Official Google OAuth Authentication • Encrypted & Secure</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* STEP 2: PROFILE SETUP                                        */}
            {/* ============================================================ */}
            {currentStep === "profile_setup" && (
              <motion.div
                key="step-profile-setup"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-3.5 text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-[#796AEF] bg-indigo-50 border border-indigo-100/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                      Student Details / प्रोफ़ाइल सेटअप
                    </span>
                    {authedUser?.email && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-mono truncate max-w-[170px]">
                        ✓ {authedUser.email}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    {t.createProfileTitle}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    {t.enrollmentSubtitle}
                  </p>
                </div>

                <form
                  onSubmit={handleProfileSubmit}
                  className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/90 shadow-xs space-y-3.5 text-left"
                >
                  {profileError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px] font-bold">
                      ⚠️ {profileError}
                    </div>
                  )}

                  {/* Name & Avatar */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#796AEF]" />
                        <span>{t.studentNameLabel} *</span>
                      </span>
                      <span className="text-[9.5px] text-slate-400">{t.pickAvatar}</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/90 shrink-0">
                        {AVATAR_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setSelectedAvatar(emoji)}
                            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                              selectedAvatar === emoji
                                ? "bg-white text-slate-900 scale-105 shadow-xs border border-[#796AEF] ring-1 ring-[#796AEF]/30 font-bold"
                                : "hover:bg-white/60 opacity-70 hover:opacity-100"
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (profileError) setProfileError(null);
                        }}
                        placeholder={t.namePlaceholder}
                        className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#796AEF] focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-900 font-bold outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Target Class / Grade */}
                  <div className="space-y-1.5">
                    <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-[#796AEF]" />
                      <span>{t.targetClassLabel} *</span>
                    </label>

                    <div className="grid grid-cols-3 gap-1.5">
                      {GRADE_OPTIONS.map((g) => {
                        const isSelected = grade === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setGrade(g.id)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#796AEF] border-[#796AEF] text-white font-bold shadow-xs scale-[1.02]"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
                            }`}
                          >
                            <p className="text-[11px] leading-tight">{g.label}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Board & Medium */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-[#796AEF]" />
                        <span>{t.eduBoardLabel}</span>
                      </label>
                      <select
                        value={board}
                        onChange={(e) => setBoard(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#796AEF] focus:bg-white rounded-xl px-2.5 py-2 text-[11px] text-slate-900 font-bold outline-none cursor-pointer"
                      >
                        {BOARD_OPTIONS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-[#796AEF]" />
                        <span>{t.languageLabel}</span>
                      </label>
                      <select
                        value={mediumOfLearning}
                        onChange={(e) => setMediumOfLearning(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#796AEF] focus:bg-white rounded-xl px-2.5 py-2 text-[11px] text-slate-900 font-bold outline-none cursor-pointer"
                      >
                        {MEDIUM_OPTIONS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.icon} {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Phase 4: Referral / Invite Code Input Section */}
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 space-y-2.5 transition-all">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-[#796AEF]" />
                        <span>Have an Invite / Referral Code?</span>
                      </label>
                      {!showReferralInput && (
                        <button
                          type="button"
                          onClick={() => setShowReferralInput(true)}
                          className="text-[11px] font-bold text-[#796AEF] hover:underline cursor-pointer"
                        >
                          + Add Code
                        </button>
                      )}
                    </div>

                    {showReferralInput && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={referralCodeInput}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setReferralCodeInput(val);
                              if (appliedReferral) setAppliedReferral(null);
                              if (referralFeedback.status !== "idle") {
                                setReferralFeedback({ status: "idle", message: "" });
                              }
                            }}
                            placeholder="e.g. CHERRY-AARAV-7821"
                            className="flex-1 bg-white border border-slate-200 focus:border-[#796AEF] rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-wider text-slate-900 outline-none placeholder:text-slate-400 uppercase shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyReferralCode()}
                            disabled={!referralCodeInput.trim()}
                            className="bg-[#796AEF] hover:bg-[#6858e0] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50 transition-all shrink-0"
                          >
                            Apply
                          </button>
                        </div>

                        {/* Status Feedback Pill */}
                        {appliedReferral ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-start justify-between gap-2 text-emerald-800 animate-fadeIn">
                            <div className="flex items-start gap-2 min-w-0">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div className="text-[11px] leading-snug min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-emerald-900 truncate">
                                    Invite Verified: {appliedReferral.referrerName}
                                  </span>
                                  {appliedReferral.referrerTierLabel && (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9.5px] font-mono font-black">
                                      {appliedReferral.referrerTierLabel}
                                    </span>
                                  )}
                                </div>
                                <p className="text-emerald-700 mt-0.5">
                                  {appliedReferral.level1Percent ? `${appliedReferral.level1Percent}% (₹${appliedReferral.level1Reward})` : `₹${appliedReferral.level1Reward}`} Direct Referral reward active! 🎉
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAppliedReferral(null);
                                setReferralCodeInput("");
                                setReferralFeedback({ status: "idle", message: "" });
                                try {
                                  localStorage.removeItem("cherry_pending_ref_code");
                                } catch (_) {}
                              }}
                              className="text-[10px] text-slate-500 hover:text-rose-600 font-bold underline shrink-0 cursor-pointer pt-0.5"
                              title="Remove or enter another code"
                            >
                              Remove
                            </button>
                          </div>
                        ) : referralFeedback.status === "invalid" ? (
                          <div className="bg-rose-50 border border-rose-200 rounded-xl p-2 flex items-center gap-2 text-rose-800 text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{referralFeedback.message}</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] text-slate-400 font-medium">Quick Demo:</span>
                            {["CHERRY-AARAV-7821", "CHERRY-PRIYA-3312"].map((demoCode) => (
                              <button
                                key={demoCode}
                                type="button"
                                onClick={() => {
                                  setReferralCodeInput(demoCode);
                                  handleApplyReferralCode(demoCode);
                                }}
                                className="text-[10px] bg-white border border-slate-200 text-slate-600 hover:border-[#796AEF] hover:text-[#796AEF] px-2 py-0.5 rounded-md font-mono transition-colors cursor-pointer"
                              >
                                {demoCode}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Save Profile Button */}
                  <button
                    type="submit"
                    disabled={name.trim().length < 2}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-all bg-[#796AEF] hover:bg-[#6858e0] text-white disabled:opacity-50"
                  >
                    <span>Save Profile & Choose Pro Plan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* STEP 3: DYNAMIC SUBSCRIPTION PLANS & UPI PAYMENT            */}
            {/* ============================================================ */}
            {currentStep === "payment_149" && (
              <motion.div
                key="step-payment-dynamic"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-3.5 text-left"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-[#796AEF] text-[10px] font-bold uppercase tracking-wider mb-1.5 shadow-2xs">
                    <Crown className="w-3 h-3 text-amber-500" />
                    <span>Choose Your Pro Plan / सभी उपलब्ध प्लान्स</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    Select Your Learning Pass
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Choose any plan below. 1-time direct UPI payment with zero recurring charges or hidden fees.
                  </p>
                </div>

                {/* DYNAMIC SUBSCRIPTION PLAN SELECTION CARDS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-0.5">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#796AEF]" />
                      <span>Available Plans ({plans.length})</span>
                    </span>
                    <span className="text-[10px] text-[#796AEF] font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/70">
                      Tap to choose
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {plans.map((p) => {
                      const isSelected = p.id === selectedPlan.id;
                      const perMonthPrice =
                        p.durationMonths && p.durationMonths > 1
                          ? Math.round(p.priceINR / p.durationMonths)
                          : null;

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPlanId(p.id)}
                          className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer select-none text-left ${
                            isSelected
                              ? "bg-indigo-50/50 border-[#796AEF] shadow-sm ring-2 ring-[#796AEF]/25"
                              : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                          }`}
                        >
                          {/* Badge if Popular or Discount */}
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                  isSelected
                                    ? "bg-[#796AEF] text-white"
                                    : "bg-indigo-50 text-[#796AEF] border border-indigo-100/80"
                                }`}
                              >
                                {p.durationLabel || `${p.durationMonths} Months`}
                              </span>
                              {p.popular && (
                                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                  <span>Most Popular</span>
                                </span>
                              )}
                              {p.id === "semiannual_149" && !p.popular && (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Launch Special</span>
                                </span>
                              )}
                            </div>

                            {/* Price & Discount */}
                            <div className="text-right flex items-baseline gap-1.5 shrink-0">
                              {p.originalPriceINR && p.originalPriceINR > p.priceINR && (
                                <span className="text-[11px] text-slate-400 line-through font-semibold">
                                  ₹{p.originalPriceINR}
                                </span>
                              )}
                              <span
                                className={`text-lg sm:text-xl font-black ${
                                  isSelected ? "text-[#796AEF]" : "text-slate-900"
                                }`}
                              >
                                ₹{p.priceINR}
                              </span>
                              {p.discountPercent ? (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                  {p.discountPercent}% OFF
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Plan Name & Tagline & Per Month breakdown */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                                <span>{p.name}</span>
                                {perMonthPrice && (
                                  <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.2 rounded">
                                    Just ₹{perMonthPrice}/mo
                                  </span>
                                )}
                              </h3>
                              <p className="text-[11px] text-slate-600 font-medium line-clamp-1 mt-0.5">
                                {p.tagline || `${p.durationLabel} unlimited Socratic tutoring pass`}
                              </p>
                            </div>

                            {/* Radio indicator */}
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                isSelected
                                  ? "border-[#796AEF] bg-[#796AEF] text-white"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>

                          {/* Features Pills */}
                          {p.features && p.features.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                              {p.features.slice(0, 3).map((feat, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9.5px] font-medium text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[150px]">{feat}</span>
                                </span>
                              ))}
                              {p.features.length > 3 && (
                                <span className="text-[9px] font-bold text-slate-400 self-center">
                                  +{p.features.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Plan Summary Banner */}
                <div className="rounded-2xl p-3.5 bg-white border border-indigo-100/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#796AEF] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                        Selected Plan
                      </span>
                      <h4 className="text-xs font-black text-slate-900 mt-1">
                        {selectedPlan.name} ({selectedPlan.durationLabel || `${selectedPlan.durationMonths} Months`})
                      </h4>
                    </div>
                    <div className="text-right">
                      {selectedPlan.originalPriceINR && selectedPlan.originalPriceINR > selectedPlan.priceINR && (
                        <span className="text-xs text-slate-400 line-through mr-1 font-bold">
                          ₹{selectedPlan.originalPriceINR}
                        </span>
                      )}
                      <span className="text-xl font-black text-[#796AEF]">
                        ₹{selectedPlan.priceINR}
                      </span>
                    </div>
                  </div>

                  {/* Bullet perks */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-semibold text-slate-700 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{selectedPlan.durationMonths} Months AI Tutoring</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>STEM Whiteboard Labs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>10-Yr PYQ Predicted Papers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Refer & Earn ₹50 per friend</span>
                    </div>
                  </div>
                </div>

                {/* Active Pro Pass Status (Informational) */}
                {subState.isPro && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 shadow-xs">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs text-left">
                      <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="block">Active Pro Pass: {subState.activePlanName || subState.activePlanId || "Active"}</span>
                        <span className="text-[10px] text-emerald-600 font-normal">Choose any plan below to renew or upgrade</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep("api_key_setup")}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0 cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                    >
                      <span>Skip to AI Key</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Always show Payment Options for chosen plan */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3.5">
                  {/* Method 1: Mobile 1-Tap UPI Apps */}
                  <div className="space-y-1.5">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 block">
                      Method 1: Pay ₹{selectedPlan.priceINR} via 1-Tap Mobile UPI App
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenUpiIntent("gpay")}
                        className="py-2.5 px-2 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-[#796AEF] text-slate-800 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                      >
                        <span>🔵 GPay</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenUpiIntent("phonepe")}
                        className="py-2.5 px-2 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-[#796AEF] text-slate-800 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                      >
                        <span>🟣 PhonePe</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenUpiIntent("paytm")}
                        className="py-2.5 px-2 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-[#796AEF] text-slate-800 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                      >
                        <span>🔷 Paytm</span>
                      </button>
                    </div>
                  </div>

                  {/* Method 2: Dynamic QR Scan */}
                  <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 text-white flex flex-col items-center justify-center text-center space-y-2.5 shadow-xs">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                      Method 2: Scan Dynamic QR for ₹{selectedPlan.priceINR}
                    </span>

                    <div className="p-2 bg-white rounded-xl shadow-lg flex items-center justify-center">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="UPI QR Code"
                          className="w-36 h-36 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-[11px] font-mono">
                      <span className="text-slate-400">UPI ID:</span>
                      <span className="text-amber-300 font-bold">
                        {subState.customUpiReceiverId || DEFAULT_RECEIVER_UPI_ID}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpiId}
                        className="p-1 hover:text-white text-slate-400 cursor-pointer"
                      >
                        {copiedUpi ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* UTR Verification Submission & Pending Admin Approval Flow */}
                  {submittedPendingRecord && submittedPendingRecord.status === "pending_verification" && !subState.isPro ? (
                    <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 text-left space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-amber-950">
                              Payment Request Sent to Admin
                            </h4>
                            <p className="text-[10.5px] text-amber-800 font-medium">
                              व्यवस्थापक सत्यापन जारी है (Pending Admin Approval)
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[9.5px] font-bold tracking-tight animate-pulse">
                          Pending Review
                        </span>
                      </div>

                      <div className="bg-white/90 rounded-xl p-3 border border-amber-200/70 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-[11px]">Selected Plan:</span>
                          <span className="font-bold text-slate-900">{submittedPendingRecord.planName} (₹{submittedPendingRecord.amountINR})</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-[11px]">Submitted UTR:</span>
                          <span className="font-mono font-bold text-[#796AEF] bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {submittedPendingRecord.utrNumber}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-[11px]">Submitted Time:</span>
                          <span className="text-[11px] font-medium text-slate-500">{submittedPendingRecord.submittedAt || "Just now"}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-amber-900/90 leading-relaxed font-medium">
                        Aapka payment UTR verification request Admin ke pas bhej diya gaya hai. Admin ise <strong>Admin Dashboard</strong> se verify karke approve karega. Jaise hi Admin approve karega, aapka Pro Pass turant activate ho jayega.
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isCheckingApproval}
                          onClick={handleCheckApprovalStatus}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-60"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingApproval ? "animate-spin" : ""}`} />
                          <span>{isCheckingApproval ? "Checking Status..." : "Check Approval Status 🔄"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSubmittedPendingRecord(null);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                          title="Edit UTR or change plan"
                        >
                          Edit UTR
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 block">
                          Enter 12-Digit UPI UTR / Transaction Ref ID
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">Admin approval required</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={userUtrInput}
                          onChange={(e) => setUserUtrInput(e.target.value)}
                          placeholder="e.g. 423987654321"
                          className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#796AEF] focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none"
                        />
                        <button
                          type="button"
                          disabled={isActivatingPayment || !userUtrInput.trim()}
                          onClick={handleConfirmPayment}
                          className="py-2.5 px-4 rounded-xl bg-[#796AEF] hover:bg-[#6858e0] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-60"
                        >
                          {isActivatingPayment ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5" />
                          )}
                          <span>Submit for Admin Approval</span>
                        </button>
                      </div>
                      <p className="text-[10.5px] text-slate-500 font-medium">
                        UPI Payment complete karne ke bad UTR number yahan enter karke submit karein. Admin verification ke bad Pro Access activate hoga.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* STEP 4: API KEY SETUP                                        */}
            {/* ============================================================ */}
            {currentStep === "api_key_setup" && (
              <motion.div
                key="step-api-key-setup"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-3.5 text-left"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-[#796AEF] text-[10px] font-bold uppercase tracking-wider mb-1.5 shadow-2xs">
                    <Key className="w-3 h-3 text-[#796AEF]" />
                    <span>Gemini AI Engine Setup</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    Set Up Gemini AI Engine
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Connect your Gemini API key to power your personal 1-on-1 Socratic tutor and interactive chalkboard.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/90 shadow-xs space-y-4">
                  {/* Option A: Enter Custom Gemini Key */}
                  <div className="space-y-2">
                    <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-[#796AEF]" />
                        <span>Enter Gemini API Key</span>
                      </span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[#796AEF] hover:text-[#6858e0] font-bold flex items-center gap-0.5"
                      >
                        <span>Get Free Key</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </label>

                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#796AEF] focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 pr-10 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showApiKey ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {apiKeyMessage && (
                      <div
                        className={`p-2.5 rounded-xl text-[11px] font-bold ${
                          apiKeyMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : apiKeyMessage.type === "error"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-indigo-50 text-[#796AEF] border border-indigo-100/80"
                        }`}
                      >
                        {apiKeyMessage.text}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isValidatingKey || !apiKeyInput.trim()}
                      onClick={handleTestAndSaveApiKey}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#796AEF] hover:bg-[#6858e0] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-all disabled:opacity-50"
                    >
                      {isValidatingKey ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Verify & Connect API Key</span>
                    </button>
                  </div>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200" />
                    <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Or Quick Start
                    </span>
                    <div className="flex-grow border-t border-slate-200" />
                  </div>

                  {/* Option B: Quick Start Cloud Server */}
                  <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100/80 space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#796AEF] shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Use Cherry AI Cloud Engine
                        </h4>
                        <p className="text-[10.5px] text-slate-500 font-medium">
                          Included with your {specialPlan.name || "Student Pass"} (₹{specialPlan.priceINR}). Instant setup with zero configuration needed.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleUseCloudEngine}
                      className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 hover:border-[#796AEF] font-bold text-xs flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-98 transition-all"
                    >
                      <span>Continue with Cloud Engine (Fastest)</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#796AEF]" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* STEP 5: READY & USE APP                                      */}
            {/* ============================================================ */}
            {currentStep === "launch_app" && (
              <motion.div
                key="step-launch-app"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 text-left"
              >
                <div className="text-center space-y-1">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center mx-auto text-2xl shadow-xs">
                    {selectedAvatar}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Welcome, {name || "Student"}! 🎓
                  </h2>
                  <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto">
                    Your complete 6-Month Pro enrollment & classroom desk setup is ready!
                  </p>
                </div>

                {/* Summary Card */}
                <div className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200/90 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-medium text-slate-600">Google Account</span>
                    <span className="font-mono font-bold text-emerald-700 truncate max-w-[180px]">
                      {authedUser?.email || "Verified"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-medium text-slate-600">Class & Board</span>
                    <span className="font-bold text-slate-900">
                      {grade} • {board}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-medium text-slate-600">Pro Subscription</span>
                    <span className="font-bold text-[#796AEF] bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-md text-[11px]">
                      {specialPlan.name} ({specialPlan.durationLabel || `${specialPlan.durationMonths} Mo`}) Active • ₹{specialPlan.priceINR}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-medium text-slate-600">Medium</span>
                    <span className="font-bold text-slate-900">{mediumOfLearning}</span>
                  </div>

                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
                    <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-[11px] leading-snug">
                      <strong>Referral Program Unlocked:</strong> Share your referral code inside the app to earn ₹50 per friend who joins!
                    </p>
                  </div>
                </div>

                {/* Final Launch Button */}
                <button
                  type="button"
                  id="launch-study-desk-btn"
                  onClick={handleLaunchApp}
                  className="w-full py-3.5 sm:py-4 px-5 rounded-2xl bg-[#796AEF] hover:bg-[#6858e0] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md cursor-pointer active:scale-98 transition-all"
                >
                  <span>Launch Study Desk & Start Learning</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5px]" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TRUST FOOTER */}
        <footer className="shrink-0 flex items-center justify-center gap-2 text-[10px] font-sans text-slate-500 font-medium py-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#796AEF]" />
          <span>{t.trustBadge || "Secured by Google Auth & Official UPI 2.0 Integration"}</span>
        </footer>
      </div>
    </div>
  );
};
