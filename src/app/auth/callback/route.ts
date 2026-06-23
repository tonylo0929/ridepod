import { NextResponse, type NextRequest } from "next/server";
import { ensureProfileForAuthenticatedUser, isRidePodProfileComplete } from "@/lib/supabase/profiles";
import { getSupabaseRequestClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;
  if (value.startsWith("/login") || value.startsWith("/auth/callback")) return null;
  return value;
}

function loginRedirect(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
}

function oauthErrorCode(error: string | null, description: string | null) {
  const message = `${error ?? ""} ${description ?? ""}`.toLowerCase();

  if (message.includes("redirect") || message.includes("url not allowed")) {
    return "redirect_mismatch";
  }

  return "oauth_denied";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = safeNextPath(requestUrl.searchParams.get("next"));
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorDescription = requestUrl.searchParams.get("error_description");

  if (oauthError || oauthErrorDescription) {
    return loginRedirect(request, oauthErrorCode(oauthError, oauthErrorDescription));
  }

  if (!code) {
    return loginRedirect(request, "missing_code");
  }

  const supabase = await getSupabaseRequestClient();
  const exchange = await supabase.auth.exchangeCodeForSession(code);

  if (exchange.error) {
    return loginRedirect(request, "oauth_exchange_failed");
  }

  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;

  if (userResult.error || !user) {
    return loginRedirect(request, "oauth_exchange_failed");
  }

  try {
    const profile = await ensureProfileForAuthenticatedUser(supabase, user);

    if (!isRidePodProfileComplete(profile)) {
      return NextResponse.redirect(new URL("/profile/setup", request.url));
    }

    return NextResponse.redirect(new URL(nextPath ?? "/my-pods", request.url));
  } catch (error) {
    console.error("RidePod OAuth profile setup failed", error);
    return loginRedirect(request, "profile_setup_failed");
  }
}
