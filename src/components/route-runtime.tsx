"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthProvider } from "@/providers/AuthProvider";
import { SplashScreen } from "@/components/splash-screen";

/** The demo must never mount the production session/profile boot process. */
export function RouteRuntime({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/v2-preview" || pathname.startsWith("/v2-preview/"))
    return children;
  return (
    <>
      <AuthProvider>{children}</AuthProvider>
      <SplashScreen />
    </>
  );
}
