import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { SystemNotice } from "../types";

const ACTIVE_NOTICE_DOC_ID = "active";
const LOCAL_STORAGE_ACTIVE_NOTICE_KEY = "cherry_active_system_notice";
const LOCAL_STORAGE_DISMISSED_NOTICES_KEY = "cherry_dismissed_notices";

// In-memory subscribers for zero-latency cross-component synchronization
const localSubscribers = new Set<(notice: SystemNotice | null) => void>();

function notifyLocalSubscribers(notice: SystemNotice | null): void {
  localSubscribers.forEach((cb) => {
    try {
      cb(notice);
    } catch (err) {
      console.error("[NoticeService] Subscriber callback error:", err);
    }
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cherry_notice_sync", { detail: notice }));
  }
}

/**
 * Publishes or updates the live system notice in Firestore and local fallback.
 */
// Helper to safely parse any timestamp (ISO string, number, or Firestore Timestamp) into milliseconds
function getSafeTime(val: any): number {
  if (!val) return 0;
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === "object" && typeof val.seconds === "number") {
    return val.seconds * 1000;
  }
  return 0;
}

export async function publishSystemNotice(notice: {
  title: string;
  message: string;
  priority: "info" | "warning" | "urgent";
  actionText?: string;
  actionLink?: string;
  publishedBy?: string;
}): Promise<void> {
  const cleanTitle = notice.title.trim();
  const cleanMessage = notice.message.trim();
  const timestamp = new Date().toISOString();

  const noticePayload: SystemNotice = {
    id: `notice_${Date.now()}`,
    title: cleanTitle,
    message: cleanMessage,
    priority: notice.priority,
    isActive: true,
    actionText: notice.actionText?.trim() || undefined,
    actionLink: notice.actionLink?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedBy: notice.publishedBy || auth.currentUser?.email || "Admin",
  };

  // Clear any previous dismissal history so this newly published broadcast is immediately visible
  try {
    localStorage.removeItem(LOCAL_STORAGE_DISMISSED_NOTICES_KEY);
  } catch (_) {}

  // Always update local storage for immediate zero-latency feedback & offline fallback
  try {
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_NOTICE_KEY, JSON.stringify(noticePayload));
  } catch (err) {
    console.warn("[NoticeService] Local storage save error:", err);
  }

  // Instant notification to local components
  notifyLocalSubscribers(noticePayload);

  // Persist to Firestore active document
  try {
    const firestoreData: Record<string, any> = {
      id: noticePayload.id,
      title: cleanTitle,
      message: cleanMessage,
      priority: notice.priority,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedBy: noticePayload.publishedBy,
      serverTime: serverTimestamp(),
    };
    if (notice.actionText?.trim()) {
      firestoreData.actionText = notice.actionText.trim();
    }
    if (notice.actionLink?.trim()) {
      firestoreData.actionLink = notice.actionLink.trim();
    }

    const activeDocRef = doc(db, "systemNotices", ACTIVE_NOTICE_DOC_ID);
    await setDoc(activeDocRef, firestoreData);

    // Also record in historical log for audit
    const historyDocRef = doc(db, "systemNotices", `log_${Date.now()}`);
    setDoc(historyDocRef, firestoreData).catch((e) => console.warn("[NoticeService] History log save issue:", e));
  } catch (err: any) {
    console.warn("[NoticeService] Firestore publish fallback mode:", err);
  }
}

/**
 * Disables the active notice (unpublish / clear).
 */
export async function unpublishSystemNotice(): Promise<void> {
  const timestamp = new Date().toISOString();

  // Clear local storage
  try {
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_NOTICE_KEY);
  } catch (_) {}

  // Instantly notify in-memory subscribers (clears student & admin view immediately)
  notifyLocalSubscribers(null);

  // Update Firestore active doc to inactive
  try {
    const activeDocRef = doc(db, "systemNotices", ACTIVE_NOTICE_DOC_ID);
    await setDoc(
      activeDocRef,
      {
        isActive: false,
        message: "",
        title: "",
        updatedAt: timestamp,
        serverTime: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("[NoticeService] Firestore unpublish error:", err);
  }
}

/**
 * Subscribes to real-time changes to the active system notice.
 * Returns an unsubscribe function.
 */
export function subscribeToActiveNotice(
  callback: (notice: SystemNotice | null) => void
): () => void {
  // Register in-memory local listener
  localSubscribers.add(callback);

  // First, check local storage for instantaneous initial state
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_ACTIVE_NOTICE_KEY);
    if (cached) {
      const parsed: SystemNotice = JSON.parse(cached);
      if (parsed && parsed.isActive && parsed.message) {
        callback(parsed);
      }
    }
  } catch (_) {}

  // Listen to cross-component custom events
  const onCustomSync = (e: Event) => {
    const customEvent = e as CustomEvent<SystemNotice | null>;
    callback(customEvent.detail);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("cherry_notice_sync", onCustomSync);
  }

  // Listen to Firestore real-time doc updates
  let firestoreUnsubscribe = () => {};
  try {
    const activeDocRef = doc(db, "systemNotices", ACTIVE_NOTICE_DOC_ID);
    firestoreUnsubscribe = onSnapshot(
      activeDocRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          // Check local storage fallback before assuming null
          try {
            const cached = localStorage.getItem(LOCAL_STORAGE_ACTIVE_NOTICE_KEY);
            if (cached) {
              const parsed: SystemNotice = JSON.parse(cached);
              if (parsed?.isActive && parsed?.message) {
                callback(parsed);
                return;
              }
            }
          } catch (_) {}
          callback(null);
          return;
        }

        const data = snapshot.data() as any;
        if (data && data.isActive && data.message) {
          const activeNotice: SystemNotice = {
            id: data.id || snapshot.id,
            title: data.title || "Announcement",
            message: data.message || "",
            priority: data.priority || "info",
            isActive: Boolean(data.isActive),
            actionText: data.actionText || undefined,
            actionLink: data.actionLink || undefined,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || undefined,
            publishedBy: data.publishedBy || undefined,
          };
          // Sync with local storage
          try {
            localStorage.setItem(LOCAL_STORAGE_ACTIVE_NOTICE_KEY, JSON.stringify(activeNotice));
          } catch (_) {}
          callback(activeNotice);
        } else {
          // Check if local storage has a newer active notice before unpublishing
          try {
            const cached = localStorage.getItem(LOCAL_STORAGE_ACTIVE_NOTICE_KEY);
            if (cached) {
              const parsed: SystemNotice = JSON.parse(cached);
              const firestoreUpdateTime = getSafeTime(data?.updatedAt || data?.serverTime);
              const localUpdateTime = getSafeTime(parsed?.updatedAt || parsed?.createdAt);

              // If the local notice is newer than the Firestore inactive record, keep it active!
              if (parsed && parsed.isActive && parsed.message && localUpdateTime > firestoreUpdateTime) {
                callback(parsed);
                // Self-heal and sync to Firestore
                const activeDocRef = doc(db, "systemNotices", ACTIVE_NOTICE_DOC_ID);
                const healData: Record<string, any> = {
                  id: parsed.id || `notice_${Date.now()}`,
                  title: parsed.title || "Announcement",
                  message: parsed.message,
                  priority: parsed.priority || "info",
                  isActive: true,
                  createdAt: parsed.createdAt || new Date().toISOString(),
                  updatedAt: parsed.updatedAt || new Date().toISOString(),
                  publishedBy: parsed.publishedBy || "Admin",
                  serverTime: serverTimestamp(),
                };
                if (parsed.actionText?.trim()) healData.actionText = parsed.actionText.trim();
                if (parsed.actionLink?.trim()) healData.actionLink = parsed.actionLink.trim();
                setDoc(activeDocRef, healData).catch(() => {});
                return;
              }
            }
          } catch (_) {}

          // Notice has truly been deactivated or unpublished
          try {
            localStorage.removeItem(LOCAL_STORAGE_ACTIVE_NOTICE_KEY);
          } catch (_) {}
          callback(null);
        }
      },
      (error) => {
        console.warn("[NoticeService] Firestore listener offline/fallback:", error);
        // On error, fallback to local storage
        try {
          const cached = localStorage.getItem(LOCAL_STORAGE_ACTIVE_NOTICE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.isActive && parsed?.message) {
              callback(parsed);
              return;
            }
          }
        } catch (_) {}
        callback(null);
      }
    );
  } catch (err) {
    console.warn("[NoticeService] Could not establish Firestore listener:", err);
  }

  return () => {
    localSubscribers.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("cherry_notice_sync", onCustomSync);
    }
    firestoreUnsubscribe();
  };
}

/**
 * Check if the student has dismissed a specific notice version.
 */
export function isNoticeDismissed(noticeIdOrTimestamp: string): boolean {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DISMISSED_NOTICES_KEY);
    if (!raw) return false;
    const dismissedMap = JSON.parse(raw);
    if (!dismissedMap || typeof dismissedMap !== "object") return false;
    return Boolean(dismissedMap[noticeIdOrTimestamp]);
  } catch (_) {
    return false;
  }
}

/**
 * Mark a notice as dismissed by the student locally.
 */
export function markNoticeAsDismissed(noticeIdOrTimestamp: string): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DISMISSED_NOTICES_KEY);
    const dismissedMap: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    dismissedMap[noticeIdOrTimestamp] = true;
    localStorage.setItem(LOCAL_STORAGE_DISMISSED_NOTICES_KEY, JSON.stringify(dismissedMap));
  } catch (err) {
    console.warn("[NoticeService] Error marking notice dismissed:", err);
  }
}
