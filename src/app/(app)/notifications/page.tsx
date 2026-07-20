import { redirect } from "next/navigation";
import { getRideInstanceUpdatesWithFallback } from "@/lib/supabase/ride-instance-updates";

export default function NotificationsPage() {
  void getRideInstanceUpdatesWithFallback;
  redirect("/updates");
}
