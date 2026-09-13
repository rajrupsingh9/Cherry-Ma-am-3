import { useState, useEffect, useCallback } from "react";
import { SystemNotice, NoticePriority } from "../types";
import { 
  subscribeToActiveNotice, 
  publishSystemNotice, 
  unpublishSystemNotice, 
  isNoticeDismissed, 
  markNoticeAsDismissed 
} from "../services/noticeService";

export function useSystemNotice() {
  const [activeNotice, setActiveNotice] = useState<SystemNotice | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeToActiveNotice((notice) => {
      setActiveNotice(notice);
      if (notice && notice.isActive) {
        // If it's a new or modified notice, check dismissal state by unique version/time identifier
        const identifier = (notice.id && notice.id !== "active") ? notice.id : (notice.updatedAt || notice.createdAt || notice.title);
        setIsDismissed(isNoticeDismissed(identifier));
      } else {
        setIsDismissed(false);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const dismiss = useCallback(() => {
    if (activeNotice) {
      const identifier = (activeNotice.id && activeNotice.id !== "active") ? activeNotice.id : (activeNotice.updatedAt || activeNotice.createdAt || activeNotice.title);
      markNoticeAsDismissed(identifier);
      setIsDismissed(true);
    }
  }, [activeNotice]);

  const publish = useCallback(async (params: {
    title: string;
    message: string;
    priority: NoticePriority;
    actionText?: string;
    actionLink?: string;
    publishedBy?: string;
  }) => {
    setIsLoading(true);
    try {
      await publishSystemNotice(params);
      setIsDismissed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(async () => {
    setIsLoading(true);
    try {
      await unpublishSystemNotice();
      setActiveNotice(null);
      setIsDismissed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Notice to show: exists, is active, has a message, and student hasn't dismissed it
  const visibleNotice = activeNotice && activeNotice.isActive && !isDismissed ? activeNotice : null;

  return {
    activeNotice,
    visibleNotice,
    isDismissed,
    isLoading,
    dismiss,
    publish,
    clear,
  };
}
