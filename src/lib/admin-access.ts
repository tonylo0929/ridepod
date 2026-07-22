import type { RidePodProfileRow } from "@/lib/supabase/types";

type AdminCheckUser = {
  email?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

const adminAccountNames = new Set(["admin", "trial_2"]);
const adminEmails = new Set(["admin@ridepod.local"]);

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export function isRidePodAdminUser(user: AdminCheckUser | null | undefined, profile: RidePodProfileRow | null | undefined) {
  const appRole = typeof user?.app_metadata?.role === "string" ? user.app_metadata.role : "";
  const metadataRole = typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : "";
  if (normalize(appRole) === "admin" || normalize(metadataRole) === "admin") return true;

  const email = normalize(user?.email ?? profile?.email);
  const accountName = normalize(profile?.account_name);

  return adminEmails.has(email) || adminAccountNames.has(accountName);
}
