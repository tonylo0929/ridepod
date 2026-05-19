import { NotificationsClient } from "@/app/(app)/notifications/notifications-client";
import { getRideInstanceUpdatesWithFallback } from "@/lib/supabase/ride-instance-updates";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const updates = await getRideInstanceUpdatesWithFallback("HOST");

  return (
    <NotificationsClient
      initialNotifications={updates.notifications}
      fallbackNote={updates.fallbackNote}
    />
  );
}
