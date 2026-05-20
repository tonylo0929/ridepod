import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RidePodProfileRow } from "@/lib/supabase/types";

export type RidePodGenderIdentity =
  | "FEMALE"
  | "MALE"
  | "NON_BINARY"
  | "PREFER_NOT_TO_SAY"
  | "UNKNOWN";

export type ProfileSource = "supabase" | "mock";

export type CurrentProfileResult = {
  source: ProfileSource;
  user: Pick<User, "id" | "email"> | null;
  profile: RidePodProfileRow | null;
  isLoggedIn: boolean;
  fallbackNote: string | null;
  userFacingError: string | null;
};

export type UpdateRidePodProfileInput = {
  displayName: string;
  phone?: string | null;
  genderIdentity: RidePodGenderIdentity;
  communityId?: string | null;
  safetyNote?: string | null;
};

export type UpdateRidePodProfileResult = {
  ok: boolean;
  source: ProfileSource;
  profile: RidePodProfileRow | null;
  userFacingMessage: string;
  fallbackNote: string | null;
};

export const mockRidePodProfile: RidePodProfileRow = {
  id: "mock-current-user",
  display_name: "Maya Chen",
  email: "maya@example.com",
  phone: "+1 213 555 0101",
  gender_identity: "FEMALE",
  gender_verified_at: null,
  verification_status: "EMAIL_VERIFIED",
  community_id: "usc",
  community_verified_at: null,
  safety_note: "",
  trust_score: 0,
  no_show_count: 0,
  late_cancel_count: 0,
  risk_status: "NORMAL",
  created_at: null,
  updated_at: null,
};

function isMissingSupabaseConfig(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase is not configured");
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeProfileInput(input: UpdateRidePodProfileInput) {
  return {
    display_name: input.displayName.trim(),
    phone: input.phone?.trim() || null,
    gender_identity: input.genderIdentity,
    community_id: input.communityId?.trim() || null,
    safety_note: input.safetyNote?.trim() || null,
    updated_at: nowIso(),
  };
}

function mockProfileFromInput(input: UpdateRidePodProfileInput): RidePodProfileRow {
  const update = normalizeProfileInput(input);

  return {
    ...mockRidePodProfile,
    ...update,
  };
}

export async function getCurrentUser() {
  try {
    const client = getSupabaseBrowserClient();
    const { data, error } = await client.auth.getUser();

    if (error) {
      return { user: null, source: "supabase" as const, fallbackNote: null };
    }

    return { user: data.user, source: "supabase" as const, fallbackNote: null };
  } catch (error) {
    if (isMissingSupabaseConfig(error)) {
      return {
        user: null,
        source: "mock" as const,
        fallbackNote: "Supabase not configured; using mock profile data.",
      };
    }

    throw error;
  }
}

export async function ensureProfileForUser(user: Pick<User, "id" | "email">, displayName?: string | null) {
  const client = getSupabaseBrowserClient();
  const profile: Partial<RidePodProfileRow> = {
    id: user.id,
    email: user.email ?? null,
    display_name: displayName?.trim() || user.email?.split("@")[0] || "RidePod user",
  };

  const result = await client
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export async function getCurrentProfile(): Promise<CurrentProfileResult> {
  const currentUser = await getCurrentUser();

  if (currentUser.source === "mock") {
    return {
      source: "mock",
      user: null,
      profile: mockRidePodProfile,
      isLoggedIn: true,
      fallbackNote: currentUser.fallbackNote,
      userFacingError: null,
    };
  }

  if (!currentUser.user) {
    return {
      source: "supabase",
      user: null,
      profile: null,
      isLoggedIn: false,
      fallbackNote: null,
      userFacingError: null,
    };
  }

  const client = getSupabaseBrowserClient();
  const result = await client
    .from("profiles")
    .select("*")
    .eq("id", currentUser.user.id)
    .maybeSingle();

  if (result.error) {
    return {
      source: "supabase",
      user: currentUser.user,
      profile: null,
      isLoggedIn: true,
      fallbackNote: null,
      userFacingError: "Couldn't load profile. Try again later.",
    };
  }

  const profile = result.data ?? await ensureProfileForUser(currentUser.user);

  return {
    source: "supabase",
    user: currentUser.user,
    profile,
    isLoggedIn: true,
    fallbackNote: null,
    userFacingError: null,
  };
}

export async function updateCurrentProfile(input: UpdateRidePodProfileInput): Promise<UpdateRidePodProfileResult> {
  try {
    const currentUser = await getCurrentUser();

    if (currentUser.source === "mock") {
      return {
        ok: true,
        source: "mock",
        profile: mockProfileFromInput(input),
        userFacingMessage: "Profile saved.",
        fallbackNote: currentUser.fallbackNote,
      };
    }

    if (!currentUser.user) {
      return {
        ok: false,
        source: "supabase",
        profile: null,
        userFacingMessage: "Log in to continue",
        fallbackNote: null,
      };
    }

    const client = getSupabaseBrowserClient();
    const update = normalizeProfileInput(input);
    const result = await client
      .from("profiles")
      .upsert(
        {
          id: currentUser.user.id,
          email: currentUser.user.email ?? null,
          ...update,
        },
        { onConflict: "id" },
      )
      .select("*")
      .maybeSingle();

    if (result.error) {
      return {
        ok: false,
        source: "supabase",
        profile: null,
        userFacingMessage: "Couldn't save profile. Try again later.",
        fallbackNote: null,
      };
    }

    return {
      ok: true,
      source: "supabase",
      profile: result.data,
      userFacingMessage: "Profile saved.",
      fallbackNote: null,
    };
  } catch (error) {
    if (isMissingSupabaseConfig(error)) {
      return {
        ok: true,
        source: "mock",
        profile: mockProfileFromInput(input),
        userFacingMessage: "Profile saved.",
        fallbackNote: "Supabase not configured; using mock profile data.",
      };
    }

    return {
      ok: false,
      source: "supabase",
      profile: null,
      userFacingMessage: "Couldn't save profile. Try again later.",
      fallbackNote: null,
    };
  }
}
