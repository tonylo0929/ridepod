"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { saveAvatarPreference, type RidePodAvatarPreference } from "@/components/animal-avatar";
import { ensureProfileForUser, mockRidePodProfile } from "@/lib/supabase/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RidePodProfileRow } from "@/lib/supabase/types";

type AuthSource = "supabase" | "mock";
export type RidePodAccountType = "rider" | "taxi_partner";

export type RegisterInput = {
  accountName: string;
  email: string;
  password: string;
  displayName: string;
  phone?: string | null;
  homeDistrict?: string | null;
  accountType?: RidePodAccountType;
  avatarPreference?: RidePodAvatarPreference;
};

export type TaxiPartnerInterestInput = {
  contactName: string;
  email: string;
  phone: string;
  legalLicenceName: string;
  partnerType: string;
  serviceAreas: string[];
  taxiCapabilities: string[];
};

export type ProfilePatch = Partial<
  Pick<
    RidePodProfileRow,
    | "display_name"
    | "avatar_url"
    | "preferred_name"
    | "phone"
    | "home_district"
    | "public_bio"
    | "trust_review_status"
  >
>;

type MockUser = Pick<User, "id" | "email"> & {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

type MockSession = Pick<Session, "access_token" | "refresh_token" | "expires_at" | "token_type"> & {
  user: MockUser;
};

type AuthUser = User | MockUser;
type AuthSession = Session | MockSession;

type AuthResult = {
  ok: boolean;
  error?: string;
  accountType?: RidePodAccountType;
  redirectTo?: string;
  requiresEmailConfirmation?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  profile: RidePodProfileRow | null;
  session: AuthSession | null;
  isLoading: boolean;
  source: AuthSource;
  fallbackNote: string | null;
  register: (input: RegisterInput) => Promise<AuthResult>;
  recordTaxiPartnerInterest: (input: TaxiPartnerInterestInput) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: (nextPath?: string | null) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const mockAuthKey = "ridepod:mock-auth";
const mockAuthRegistryKey = "ridepod:mock-auth-registry";
const authRequestTimeoutMs = 15_000;

type MockStoredProfile = RidePodProfileRow & {
  account_type?: RidePodAccountType;
  taxi_partner_verification_status?: "manual_review_pending";
  partner_type?: string;
  service_areas?: string[];
  taxi_capabilities?: string[];
};

function isMissingSupabaseConfig(error: unknown) {
  return error instanceof Error && error.message.includes("Supabase is not configured");
}

class RidePodAuthTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RidePodAuthTimeoutError";
  }
}

function isAuthTimeoutError(error: unknown) {
  return error instanceof RidePodAuthTimeoutError;
}

function withAuthTimeout<T>(promise: PromiseLike<T>, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => reject(new RidePodAuthTimeoutError(message)), authRequestTimeoutMs);

    Promise.resolve(promise)
      .then(resolve, reject)
      .finally(() => globalThis.clearTimeout(timeout));
  });
}

function nowIso() {
  return new Date().toISOString();
}

function mockIdFromEmail(email: string) {
  return `mock-${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "user"}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeAccountName(accountName: string) {
  return accountName.trim().toLowerCase();
}

function isEmailLoginIdentifier(value: string) {
  return value.includes("@");
}

async function resolveEmailForLogin(
  client: ReturnType<typeof getSupabaseBrowserClient>,
  loginIdentifier: string,
) {
  const normalized = loginIdentifier.trim();
  if (isEmailLoginIdentifier(normalized)) return normalizeEmail(normalized);

  const accountName = normalizeAccountName(normalized);
  if (!accountName) return null;
  const resolver = client as unknown as {
    rpc: (
      fn: string,
      args: Record<string, string>,
    ) => Promise<{ data: string | null; error: { message?: string } | null }>;
  };
  const result = await withAuthTimeout(
    resolver.rpc("resolve_account_login", { account_name_input: accountName }),
    "Account lookup took too long.",
  );
  if (result.error || !result.data) return null;
  return normalizeEmail(result.data);
}

function buildMockProfile(input: {
  id: string;
  accountName?: string | null;
  email: string;
  displayName?: string | null;
  phone?: string | null;
  homeDistrict?: string | null;
  accountType?: RidePodAccountType;
  partnerType?: string | null;
  serviceAreas?: string[];
  taxiCapabilities?: string[];
}): MockStoredProfile {
  const displayName = input.displayName?.trim() || input.email.split("@")[0] || "RidePod user";
  const accountType = input.accountType ?? "rider";

  return {
    ...mockRidePodProfile,
    id: input.id,
    account_name: normalizeAccountName(input.accountName ?? "") || null,
    email: input.email,
    display_name: displayName,
    preferred_name: displayName.split(" ")[0] ?? displayName,
    phone: input.phone?.trim() || mockRidePodProfile.phone,
    home_district: input.homeDistrict?.trim() || mockRidePodProfile.home_district,
    account_type: accountType,
    taxi_partner_verification_status: accountType === "taxi_partner" ? "manual_review_pending" : undefined,
    partner_type: input.partnerType ?? undefined,
    service_areas: input.serviceAreas,
    taxi_capabilities: input.taxiCapabilities,
    updated_at: nowIso(),
  };
}

function getAccountTypeFromProfile(profile: RidePodProfileRow | MockStoredProfile | null): RidePodAccountType {
  const accountType = (profile as MockStoredProfile | null)?.account_type;
  return accountType === "taxi_partner" ? "taxi_partner" : "rider";
}

function getRedirectForAccountType(accountType: RidePodAccountType) {
  return accountType === "taxi_partner" ? "/taxi-partner" : "/home";
}

function mockSessionFromProfile(profile: RidePodProfileRow | MockStoredProfile): MockSession {
  const accountType = getAccountTypeFromProfile(profile);

  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    token_type: "bearer",
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    user: {
      id: profile.id,
      email: profile.email ?? undefined,
      app_metadata: { provider: "mock" },
      user_metadata: {
        display_name: profile.display_name,
        account_type: accountType,
        taxi_partner_verification_status:
          accountType === "taxi_partner" ? "manual_review_pending" : undefined,
      },
    },
  };
}

function readMockProfile(): MockStoredProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(mockAuthKey);
    if (!raw) return null;
    return JSON.parse(raw) as MockStoredProfile;
  } catch {
    return null;
  }
}

function readMockRegistry() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(mockAuthRegistryKey);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MockStoredProfile>;
  } catch {
    return {};
  }
}

function writeMockRegistry(registry: Record<string, MockStoredProfile>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(mockAuthRegistryKey, JSON.stringify(registry));
}

function writeMockRegistryProfile(profile: MockStoredProfile) {
  const email = normalizeEmail(profile.email ?? "");
  const accountName = normalizeAccountName(profile.account_name ?? "");
  if (!email && !accountName) return;
  const registry = readMockRegistry();
  if (email) registry[email] = profile;
  if (accountName) registry[accountName] = profile;
  writeMockRegistry(registry);
}

function getMockRegistryProfile(loginIdentifier: string) {
  const normalized = isEmailLoginIdentifier(loginIdentifier)
    ? normalizeEmail(loginIdentifier)
    : normalizeAccountName(loginIdentifier);
  return readMockRegistry()[normalized] ?? null;
}

function writeMockProfile(profile: MockStoredProfile | RidePodProfileRow | null) {
  if (typeof window === "undefined") return;
  if (!profile) {
    window.localStorage.removeItem(mockAuthKey);
    return;
  }
  window.localStorage.setItem(mockAuthKey, JSON.stringify(profile));
  writeMockRegistryProfile(profile as MockStoredProfile);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<RidePodProfileRow | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<AuthSource>("supabase");
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);

  const loadProfile = useCallback(async (targetUser: AuthUser | null, nextSource: AuthSource) => {
    if (!targetUser) {
      setProfile(null);
      return;
    }

    if (nextSource === "mock") {
      const stored = readMockProfile();
      const nextProfile = stored ?? buildMockProfile({
        id: targetUser.id,
        email: targetUser.email ?? "demo@ridepod.local",
      });
      writeMockProfile(nextProfile);
      setProfile(nextProfile);
      return;
    }

    const client = getSupabaseBrowserClient();
    const result = await withAuthTimeout(
      client.from("profiles").select("*").eq("id", targetUser.id).maybeSingle(),
      "Profile load took too long.",
    );

    if (result.error) {
      setProfile(null);
      return;
    }

    const nextProfile = result.data ?? await withAuthTimeout(
      ensureProfileForUser(targetUser),
      "Profile setup took too long.",
    );
    setProfile(nextProfile);
  }, []);

  const boot = useCallback(async () => {
    setIsLoading(true);

    try {
      const client = getSupabaseBrowserClient();
      const result = await withAuthTimeout(client.auth.getSession(), "Session check took too long.");
      const nextSession = result.data.session;
      setSource("supabase");
      setFallbackNote(null);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      await loadProfile(nextSession?.user ?? null, "supabase");
    } catch (error) {
      if (!isMissingSupabaseConfig(error)) {
        setFallbackNote("Account service is unavailable. Try again later.");
        setSource("supabase");
        setSession(null);
        setUser(null);
        setProfile(null);
      } else {
        const stored = readMockProfile();
        setSource("mock");
        setFallbackNote("Supabase not configured; using local demo account behavior.");
        if (stored) {
          const nextSession = mockSessionFromProfile(stored);
          setSession(nextSession);
          setUser(nextSession.user);
          setProfile(stored);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    async function start() {
      await boot();

      if (!active) return;

      try {
        const client = getSupabaseBrowserClient();
        const subscription = client.auth.onAuthStateChange(async (_event, nextSession) => {
          setSource("supabase");
          setFallbackNote(null);
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          try {
            await loadProfile(nextSession?.user ?? null, "supabase");
          } catch (error) {
            console.warn("RidePod profile refresh after auth state change failed", error);
            setProfile(null);
          }
        });
        unsubscribe = () => subscription.data.subscription.unsubscribe();
      } catch {
        unsubscribe = null;
      }
    }

    start();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [boot, loadProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user, source);
  }, [loadProfile, source, user]);

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthResult> => {
      const email = normalizeEmail(input.email);
      const accountName = normalizeAccountName(input.accountName);
      const displayName = input.displayName.trim();
      if (!accountName || !email || !input.password || !displayName) return { ok: false, error: "Fill in all required fields." };

      try {
        const client = getSupabaseBrowserClient();
        const result = await withAuthTimeout(
          client.auth.signUp({
            email,
            password: input.password,
            options: {
              data: {
                account_name: accountName,
                display_name: displayName,
              },
            },
          }),
          "Account creation took too long.",
        );

        if (result.error) {
          return {
            ok: false,
            error: result.error.message || "Couldn't create account. Try again later.",
          };
        }
        if (result.data.user) {
          const nextProfile = await withAuthTimeout(
            ensureProfileForUser(result.data.user, displayName),
            "Profile setup took too long.",
          );
          if (input.avatarPreference) {
            saveAvatarPreference(result.data.user.id, input.avatarPreference);
          }
          if (input.homeDistrict?.trim() || input.phone?.trim() || accountName) {
            await withAuthTimeout(
              client
                .from("profiles")
                .update({
                  account_name: accountName,
                  home_district: input.homeDistrict?.trim() || null,
                  phone: input.phone?.trim() || null,
                  updated_at: nowIso(),
                })
                .eq("id", result.data.user.id),
              "Profile update took too long.",
            );
            void loadProfile(result.data.user, "supabase").catch((error) => {
              console.warn("RidePod profile refresh after registration failed", error);
            });
          } else {
            setProfile(nextProfile);
          }
        }
        setSession(result.data.session);
        setUser(result.data.user);
        if (result.data.user && !result.data.session) {
          return { ok: true, requiresEmailConfirmation: true };
        }
        return { ok: true };
      } catch (error) {
        if (!isMissingSupabaseConfig(error)) {
          return {
            ok: false,
            error: isAuthTimeoutError(error)
              ? "Account creation is taking too long. Check your connection and try again."
              : "Couldn't create account. Try again later.",
          };
        }

        const nextProfile = buildMockProfile({
          id: mockIdFromEmail(email),
          accountName,
          email,
          displayName,
          phone: input.phone,
          homeDistrict: input.homeDistrict,
          accountType: input.accountType ?? "rider",
        });
        const nextSession = mockSessionFromProfile(nextProfile);
        writeMockProfile(nextProfile);
        if (input.avatarPreference) {
          saveAvatarPreference(nextProfile.id, input.avatarPreference);
        }
        setSource("mock");
        setFallbackNote("Supabase not configured; using local demo account behavior.");
        setProfile(nextProfile);
        setSession(nextSession);
        setUser(nextSession.user);
        const accountType = getAccountTypeFromProfile(nextProfile);
        return { ok: true, accountType, redirectTo: getRedirectForAccountType(accountType) };
      }
    },
    [loadProfile],
  );

  const recordTaxiPartnerInterest = useCallback(async (input: TaxiPartnerInterestInput): Promise<AuthResult> => {
    const email = normalizeEmail(input.email);
    const displayName = input.contactName.trim();
    if (!email || !displayName || !input.phone.trim() || !input.legalLicenceName.trim()) {
      return { ok: false, error: "Fill in all required fields." };
    }

    const nextProfile = buildMockProfile({
      id: mockIdFromEmail(email),
      email,
      displayName,
      accountType: "taxi_partner",
      partnerType: input.partnerType,
      serviceAreas: input.serviceAreas,
      taxiCapabilities: input.taxiCapabilities,
    });

    writeMockRegistryProfile(nextProfile);
    return { ok: true, accountType: "taxi_partner", redirectTo: "/taxi-partner" };
  }, []);

  const login = useCallback(async (loginInput: string, password: string): Promise<AuthResult> => {
    const loginIdentifier = loginInput.trim();
    if (!loginIdentifier || !password) return { ok: false, error: "Account name or email and password are required." };

    try {
      const client = getSupabaseBrowserClient();
      const email = await resolveEmailForLogin(client, loginIdentifier);
      if (!email) return { ok: false, error: "Account name not found. Try your email or check the spelling." };
      const result = await withAuthTimeout(
        client.auth.signInWithPassword({ email, password }),
        "Login took too long.",
      );
      if (result.error || !result.data.user) return { ok: false, error: "Couldn't log in. Check your details and try again." };

      setSource("supabase");
      setFallbackNote(null);
      setSession(result.data.session);
      setUser(result.data.user);
      void loadProfile(result.data.user, "supabase").catch((error) => {
        console.warn("RidePod profile refresh after login failed", error);
      });
      const accountType =
        result.data.user.user_metadata?.account_type === "taxi_partner" ? "taxi_partner" : "rider";
      return { ok: true, accountType, redirectTo: getRedirectForAccountType(accountType) };
    } catch (error) {
      if (!isMissingSupabaseConfig(error)) {
        return {
          ok: false,
          error: isAuthTimeoutError(error)
            ? "Login is taking too long. Check your connection and try again."
            : "Couldn't log in. Try again later.",
        };
      }

      const stored = readMockProfile();
      const registered = getMockRegistryProfile(loginIdentifier);
      const email = isEmailLoginIdentifier(loginIdentifier)
        ? normalizeEmail(loginIdentifier)
        : normalizeEmail(registered?.email ?? "");
      const nextProfile = registered ?? (stored && getMockRegistryProfile(loginIdentifier)?.id === stored.id
        ? stored
        : buildMockProfile({
            id: mockIdFromEmail(email || loginIdentifier),
            accountName: isEmailLoginIdentifier(loginIdentifier) ? null : loginIdentifier,
            email: email || `${normalizeAccountName(loginIdentifier)}@ridepod.local`,
            accountType: "rider",
          }));
      const nextSession = mockSessionFromProfile(nextProfile);
      writeMockProfile(nextProfile);
      setSource("mock");
      setFallbackNote("Supabase not configured; using local demo account behavior.");
      setProfile(nextProfile);
      setSession(nextSession);
      setUser(nextSession.user);
      const accountType = getAccountTypeFromProfile(nextProfile);
      return { ok: true, accountType, redirectTo: getRedirectForAccountType(accountType) };
    }
  }, [loadProfile]);

  const loginWithGoogle = useCallback(async (nextPath?: string | null): Promise<AuthResult> => {
    try {
      const startUrl = new URL("/auth/google", window.location.origin);
      if (nextPath?.startsWith("/")) {
        startUrl.searchParams.set("next", nextPath);
      }

      window.location.assign(startUrl.toString());
      return { ok: true };
    } catch (error) {
      if (isMissingSupabaseConfig(error)) {
        return { ok: false, error: "Google login needs Supabase to be configured." };
      }

      return {
        ok: false,
        error: isAuthTimeoutError(error)
          ? "Google login is taking too long. Check your connection and try again."
          : "Couldn't start Google login. Check the OAuth redirect settings.",
      };
    }
  }, []);

  const logout = useCallback(async () => {
    if (source === "mock") {
      writeMockProfile(null);
      setProfile(null);
      setSession(null);
      setUser(null);
      return;
    }

    try {
      const client = getSupabaseBrowserClient();
      await client.auth.signOut();
    } catch {
      // Keep logout resilient; local state is cleared either way.
    } finally {
      setProfile(null);
      setSession(null);
      setUser(null);
    }
  }, [source]);

  const updateProfile = useCallback(
    async (patch: ProfilePatch): Promise<AuthResult> => {
      if (!user) return { ok: false, error: "Log in to continue." };
      const timestampedPatch = { ...patch, updated_at: nowIso() };

      if (source === "mock") {
        const nextProfile = {
          ...(profile ?? buildMockProfile({ id: user.id, email: user.email ?? "demo@ridepod.local" })),
          ...timestampedPatch,
        };
        writeMockProfile(nextProfile);
        setProfile(nextProfile);
        return { ok: true };
      }

      try {
        const client = getSupabaseBrowserClient();
        const result = await client
          .from("profiles")
          .upsert({ id: user.id, email: user.email ?? null, ...timestampedPatch }, { onConflict: "id" })
          .select("*")
          .maybeSingle();

        if (result.error || !result.data) return { ok: false, error: "Couldn't save profile. Try again later." };
        setProfile(result.data);
        return { ok: true };
      } catch {
        return { ok: false, error: "Couldn't save profile. Try again later." };
      }
    },
    [profile, source, user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      session,
      isLoading,
      source,
      fallbackNote,
      register,
      recordTaxiPartnerInterest,
      login,
      loginWithGoogle,
      logout,
      updateProfile,
      refreshProfile,
    }),
    [fallbackNote, isLoading, login, loginWithGoogle, logout, profile, recordTaxiPartnerInterest, refreshProfile, register, session, source, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
