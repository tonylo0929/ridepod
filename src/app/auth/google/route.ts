import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseRequestClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;
  if (value.startsWith("/login") || value.startsWith("/auth/")) return null;
  return value;
}

function loginRedirect(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url));
}

function oauthStartErrorCode(status: number, body: string) {
  const normalizedBody = body.toLowerCase();

  if (normalizedBody.includes("unsupported provider") || normalizedBody.includes("provider is not enabled")) {
    return "oauth_provider_disabled";
  }

  if (normalizedBody.includes("redirect") || normalizedBody.includes("url not allowed")) {
    return "redirect_mismatch";
  }

  return status >= 400 ? "oauth_start_failed" : null;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const nextPath = safeNextPath(requestUrl.searchParams.get("next"));
  const callbackUrl = new URL("/auth/callback", request.url);

  if (nextPath) {
    callbackUrl.searchParams.set("next", nextPath);
  }

  const supabase = await getSupabaseRequestClient();
  const result = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      skipBrowserRedirect: true,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (result.error || !result.data.url) {
    return loginRedirect(request, "oauth_start_failed");
  }

  try {
    const authorizeResponse = await fetch(result.data.url, {
      cache: "no-store",
      redirect: "manual",
    });

    const responseBody = authorizeResponse.status >= 400 ? await authorizeResponse.text() : "";
    const errorCode = oauthStartErrorCode(authorizeResponse.status, responseBody);

    if (errorCode) {
      return loginRedirect(request, errorCode);
    }
  } catch (error) {
    console.error("RidePod Google OAuth preflight failed", error);
    return loginRedirect(request, "oauth_start_failed");
  }

  return NextResponse.redirect(result.data.url);
}
