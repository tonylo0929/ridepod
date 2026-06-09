import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RidePodProfileRow } from "@/lib/supabase/types";

export type RidePodGenderIdentity =
  | "FEMALE"
  | "MALE"
  | "NON_BINARY"
  | "PREFER_NOT_TO_SAY"
  | "UNKNOWN";

export type IdVerificationStatus = "NOT_REQUESTED" | "REQUESTED" | "UNDER_REVIEW" | "VERIFIED" | "REJECTED";
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
  communityId?: string | null;
  safetyNote?: string | null;
  avatarUrl?: string | null;
};

export type UpdateRidePodProfileResult = {
  ok: boolean;
  source: ProfileSource;
  profile: RidePodProfileRow | null;
  userFacingMessage: string;
  fallbackNote: string | null;
};

export type RequestManualIdVerificationReviewResult = {
  ok: boolean;
  source: ProfileSource;
  profile: RidePodProfileRow | null;
  userFacingMessage: string;
  fallbackNote: string | null;
};

export const mockRidePodProfile: RidePodProfileRow = {
  id: "mock-current-user",
  account_name: "maya",
  display_name: "Maya Chen",
  email: "maya@example.com",
  avatar_url: null,
  preferred_name: "Maya",
  phone: "+1 213 555 0101",
  home_district: "Central",
  public_bio: null,
  trust_review_status: "not_requested",
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
  id_verification_status: "NOT_REQUESTED",
  id_verified_at: null,
  manual_verification_requested_at: null,
  manually_verified_by: null,
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
    community_id: input.communityId?.trim() || null,
    safety_note: input.safetyNote?.trim() || null,
    ...(input.avatarUrl === undefined ? {} : { avatar_url: input.avatarUrl?.trim() || null }),
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

export function normalizeIdVerificationStatus(value: string | null | undefined): IdVerificationStatus {
  if (value === "REQUESTED" || value === "UNDER_REVIEW" || value === "VERIFIED" || value === "REJECTED") {
    return value;
  }

  return "NOT_REQUESTED";
}

export function idVerificationStatusLabel(value: string | null | undefined) {
  const status = normalizeIdVerificationStatus(value);
  if (status === "REQUESTED") return "Review requested";
  if (status === "UNDER_REVIEW") return "Under review";
  if (status === "VERIFIED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  return "Not requested";
}

function mockProfileWithIdVerificationRequest(): RidePodProfileRow {
  return {
    ...mockRidePodProfile,
    id_verification_status: "REQUESTED",
    manual_verification_requested_at: nowIso(),
    updated_at: nowIso(),
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

function metadataText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAccountName(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9._]{3,24}$/.test(normalized) ? normalized : "";
}

export async function ensureProfileForUser(
  user: Pick<User, "id" | "email"> & { user_metadata?: Record<string, unknown> | null },
  displayName?: string | null,
) {
  const client = getSupabaseBrowserClient();
  const metadataDisplayName = metadataText(user.user_metadata?.display_name);
  const metadataAccountName =
    normalizeAccountName(metadataText(user.user_metadata?.account_name)) ||
    normalizeAccountName(metadataDisplayName);
  const profile: Partial<RidePodProfileRow> = {
    id: user.id,
    account_name: metadataAccountName || null,
    email: user.email ?? null,
    display_name: displayName?.trim() || metadataDisplayName || metadataAccountName || user.email?.split("@")[0] || "RidePod user",
  };

  const result = await client
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (result.error) {
    const existing = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (!existing.error && existing.data) return existing.data;
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function profilePhotoExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extension) return extension;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

export async function updateCurrentProfilePhoto(file: File): Promise<UpdateRidePodProfileResult> {
  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      source: "supabase",
      profile: null,
      userFacingMessage: "Choose an image file.",
      fallbackNote: null,
    };
  }

  if (file.size > 3 * 1024 * 1024) {
    return {
      ok: false,
      source: "supabase",
      profile: null,
      userFacingMessage: "Profile photo must be under 3 MB.",
      fallbackNote: null,
    };
  }

  try {
    const currentUser = await getCurrentUser();

    if (currentUser.source === "mock") {
      const avatarUrl = await readFileAsDataUrl(file);
      return {
        ok: true,
        source: "mock",
        profile: {
          ...mockRidePodProfile,
          avatar_url: avatarUrl,
          updated_at: nowIso(),
        },
        userFacingMessage: "Profile photo saved.",
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
    await ensureProfileForUser(currentUser.user);

    const storagePath = `${currentUser.user.id}/profile-${Date.now()}.${profilePhotoExtension(file)}`;
    const upload = await client.storage.from("profile-photos").upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

    if (upload.error) {
      return {
        ok: false,
        source: "supabase",
        profile: null,
        userFacingMessage: "Couldn't upload profile photo. Try again later.",
        fallbackNote: null,
      };
    }

    const publicUrl = client.storage.from("profile-photos").getPublicUrl(storagePath).data.publicUrl;
    const result = await client
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: nowIso() })
      .eq("id", currentUser.user.id)
      .select("*")
      .maybeSingle();

    if (result.error) {
      return {
        ok: false,
        source: "supabase",
        profile: null,
        userFacingMessage: "Photo uploaded, but couldn't save it to your profile.",
        fallbackNote: null,
      };
    }

    return {
      ok: true,
      source: "supabase",
      profile: result.data,
      userFacingMessage: "Profile photo saved.",
      fallbackNote: null,
    };
  } catch (error) {
    if (isMissingSupabaseConfig(error)) {
      const avatarUrl = await readFileAsDataUrl(file);
      return {
        ok: true,
        source: "mock",
        profile: {
          ...mockRidePodProfile,
          avatar_url: avatarUrl,
          updated_at: nowIso(),
        },
        userFacingMessage: "Profile photo saved.",
        fallbackNote: "Supabase not configured; using mock profile data.",
      };
    }

    return {
      ok: false,
      source: "supabase",
      profile: null,
      userFacingMessage: "Couldn't upload profile photo. Try again later.",
      fallbackNote: null,
    };
  }
}

export async function requestManualIdVerificationReview(): Promise<RequestManualIdVerificationReviewResult> {
  try {
    const currentUser = await getCurrentUser();

    if (currentUser.source === "mock") {
      return {
        ok: true,
        source: "mock",
        profile: mockProfileWithIdVerificationRequest(),
        userFacingMessage: "Review requested.",
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
    const timestamp = nowIso();
    const profileUpdate = await client
      .from("profiles")
      .upsert(
        {
          id: currentUser.user.id,
          email: currentUser.user.email ?? null,
          id_verification_status: "REQUESTED",
          manual_verification_requested_at: timestamp,
          updated_at: timestamp,
        },
        { onConflict: "id" },
      )
      .select("*")
      .maybeSingle();

    if (profileUpdate.error || !profileUpdate.data) {
      return {
        ok: true,
        source: "mock",
        profile: mockProfileWithIdVerificationRequest(),
        userFacingMessage: "Review requested.",
        fallbackNote: "ID verification request is local until profile verification fields are available.",
      };
    }

    const caseInsert = await client
      .from("admin_review_cases")
      .insert({
        subject_user_id: currentUser.user.id,
        review_state: "OPEN",
        case_type: "ID_VERIFICATION_REQUEST",
        severity: "LOW",
        title: "ID verification request",
        description: "User requested manual ID verification review. No identity document was collected.",
        created_at: timestamp,
      });

    return {
      ok: true,
      source: "supabase",
      profile: profileUpdate.data,
      userFacingMessage: "Review requested.",
      fallbackNote: caseInsert.error
        ? "Profile status was saved, but the admin review request could not be created yet."
        : null,
    };
  } catch (error) {
    if (isMissingSupabaseConfig(error)) {
      return {
        ok: true,
        source: "mock",
        profile: mockProfileWithIdVerificationRequest(),
        userFacingMessage: "Review requested.",
        fallbackNote: "Supabase not configured; using mock profile data.",
      };
    }

    return {
      ok: false,
      source: "supabase",
      profile: null,
      userFacingMessage: "Couldn't request review. Try again later.",
      fallbackNote: null,
    };
  }
}
