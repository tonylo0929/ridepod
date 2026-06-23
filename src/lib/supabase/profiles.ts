import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database, RidePodProfileRow } from "@/lib/supabase/types";

function metadataText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAccountName(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9._]{3,24}$/.test(normalized) ? normalized : "";
}

function emailPrefix(email?: string | null) {
  return email?.split("@")[0]?.trim() || "";
}

export function displayNameFromAuthUser(
  user: Pick<User, "email"> & { user_metadata?: Record<string, unknown> | null },
  fallbackDisplayName?: string | null,
) {
  const metadataDisplayName = metadataText(user.user_metadata?.display_name);
  const fullName = metadataText(user.user_metadata?.full_name);
  const name = metadataText(user.user_metadata?.name);
  const accountName =
    normalizeAccountName(metadataText(user.user_metadata?.account_name)) ||
    normalizeAccountName(metadataDisplayName);

  return (
    fallbackDisplayName?.trim() ||
    metadataDisplayName ||
    fullName ||
    name ||
    accountName ||
    emailPrefix(user.email) ||
    "RidePod user"
  );
}

export function profileDefaultsFromAuthUser(
  user: Pick<User, "id" | "email"> & { user_metadata?: Record<string, unknown> | null },
  displayName?: string | null,
) {
  const resolvedDisplayName = displayNameFromAuthUser(user, displayName);
  const metadataAccountName =
    normalizeAccountName(metadataText(user.user_metadata?.account_name)) ||
    normalizeAccountName(resolvedDisplayName);
  const avatarUrl = metadataText(user.user_metadata?.avatar_url) || metadataText(user.user_metadata?.picture);

  return {
    id: user.id,
    account_name: metadataAccountName || null,
    email: user.email ?? null,
    display_name: resolvedDisplayName,
    avatar_url: avatarUrl || null,
    created_at: new Date().toISOString(),
  } satisfies Partial<RidePodProfileRow>;
}

export function isRidePodProfileComplete(profile: Pick<RidePodProfileRow, "display_name" | "phone"> | null) {
  return Boolean(profile?.display_name?.trim() && profile?.phone?.trim());
}

export async function ensureProfileForAuthenticatedUser(
  client: SupabaseClient<Database>,
  user: Pick<User, "id" | "email"> & { user_metadata?: Record<string, unknown> | null },
  displayName?: string | null,
) {
  const existing = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) return existing.data;

  const result = await client
    .from("profiles")
    .insert(profileDefaultsFromAuthUser(user, displayName))
    .select("*")
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}
