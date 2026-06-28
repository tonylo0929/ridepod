import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SplashScreen } from "@/components/splash-screen";
import { AuthProvider } from "@/providers/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RidePod",
  description: "Shared taxi pod coordination with taxi partner quote and beta settlement review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          id="ridepod-splash-session-boot"
          dangerouslySetInnerHTML={{
            __html: `
            (function () {
              try {
                var seen = false;
                var navigationEntries =
                  window.performance && window.performance.getEntriesByType
                    ? window.performance.getEntriesByType("navigation")
                    : [];
                var isRefresh = Boolean(navigationEntries[0] && navigationEntries[0].type === "reload");
                try {
                  seen = Boolean(window.sessionStorage && window.sessionStorage.getItem("ridepod_splash_seen"));
                } catch (storageError) {}
                if (!seen) {
                  seen = window.name.split("|").indexOf("ridepod_splash_seen=true") !== -1;
                }
                if (isRefresh) {
                  seen = false;
                }
                document.documentElement.dataset.ridepodSplash = seen ? "seen" : "fresh";
                if (seen && !document.getElementById("ridepod-splash-seen-style")) {
                  var style = document.createElement("style");
                  style.id = "ridepod-splash-seen-style";
                  style.textContent = ".ridepod-splash{display:none!important}";
                  document.head.appendChild(style);
                }
              } catch (error) {
                document.documentElement.dataset.ridepodSplash = "fresh";
              }
            })();
          `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
        <SplashScreen />
      </body>
    </html>
  );
}
