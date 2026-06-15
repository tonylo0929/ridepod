"use client";

import { useCallback, useEffect, useState } from "react";
import { getUnreadNotificationCount } from "@/lib/notifications/ridepod-notifications";
import { useAuth } from "@/providers/AuthProvider";

export function useRidePodUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }

    setCount(await getUnreadNotificationCount(user.id));
  }, [user]);

  useEffect(() => {
    function onRefreshRequested() {
      void refresh();
    }

    const initialRefresh = window.setTimeout(onRefreshRequested, 0);
    window.addEventListener("focus", onRefreshRequested);
    window.addEventListener("ridepod:updates-changed", onRefreshRequested);
    const interval = window.setInterval(onRefreshRequested, 10_000);

    return () => {
      window.clearTimeout(initialRefresh);
      window.removeEventListener("focus", onRefreshRequested);
      window.removeEventListener("ridepod:updates-changed", onRefreshRequested);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return count;
}
