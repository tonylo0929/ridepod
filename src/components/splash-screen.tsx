"use client";

import { useEffect, useState } from "react";

const SPLASH_STORAGE_KEY = "ridepod_splash_seen";
const SPLASH_WINDOW_NAME_MARKER = "ridepod_splash_seen=true";
const SPLASH_VISIBLE_MS = 1700;
const SPLASH_EXIT_MS = 300;
const REDUCED_VISIBLE_MS = 1820;
const REDUCED_EXIT_MS = 180;

function hasSeenSplash() {
  try {
    if (window.sessionStorage.getItem(SPLASH_STORAGE_KEY)) return true;
  } catch {
    // Fall through to the tab-scoped fallback for browsers that block storage.
  }

  return window.name.split("|").includes(SPLASH_WINDOW_NAME_MARKER);
}

function markSplashSeen() {
  try {
    window.sessionStorage.setItem(SPLASH_STORAGE_KEY, "true");
  } catch {
    // Use a tab-scoped fallback when storage is unavailable.
  }

  if (!window.name.split("|").includes(SPLASH_WINDOW_NAME_MARKER)) {
    window.name = [window.name, SPLASH_WINDOW_NAME_MARKER].filter(Boolean).join("|");
  }
}

export function SplashScreen() {
  const [isMounted, setIsMounted] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (hasSeenSplash()) {
      document.documentElement.dataset.ridepodSplash = "seen";
      const removeTimer = window.setTimeout(() => {
        setIsMounted(false);
      }, 0);

      return () => {
        window.clearTimeout(removeTimer);
      };
    }

    markSplashSeen();
    document.documentElement.dataset.ridepodSplash = "showing";

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const visibleDuration = prefersReducedMotion ? REDUCED_VISIBLE_MS : SPLASH_VISIBLE_MS;
    const exitDuration = prefersReducedMotion ? REDUCED_EXIT_MS : SPLASH_EXIT_MS;
    const elapsedSinceNavigation = Math.max(0, window.performance.now());
    const exitDelay = Math.max(0, visibleDuration - elapsedSinceNavigation);
    const removeDelay = Math.max(0, visibleDuration + exitDuration - elapsedSinceNavigation);

    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, exitDelay);

    const removeTimer = window.setTimeout(() => {
      document.documentElement.dataset.ridepodSplash = "seen";
      setIsMounted(false);
    }, removeDelay);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!isMounted) return null;

  return (
    <div
      aria-hidden="true"
      className="ridepod-splash fixed inset-0 z-[9999] grid place-items-center overflow-hidden px-8 text-[var(--rp-text)]"
      data-state={isExiting ? "exit" : "intro"}
    >
      <style>{`
        html[data-ridepod-splash="seen"] .ridepod-splash {
          display: none !important;
        }

        .ridepod-splash {
          pointer-events: auto;
          background:
            radial-gradient(circle at 50% 42%, rgba(242, 193, 91, 0.14), transparent 28%),
            radial-gradient(circle at 50% 100%, rgba(14, 165, 233, 0.08), transparent 46%),
            linear-gradient(180deg, #02070d 0%, #07111a 52%, #03070d 100%);
          opacity: 0;
          isolation: isolate;
          animation: ridepod-splash-lifecycle 2000ms ease-in-out forwards;
        }

        .ridepod-splash::before {
          content: "";
          position: absolute;
          inset: 16%;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(242, 193, 91, 0.11), transparent 62%);
          filter: blur(24px);
        }

        .ridepod-splash[data-state="exit"] {
          animation: ridepod-splash-fade-out 300ms ease-in forwards;
        }

        .ridepod-splash__content {
          position: relative;
          display: grid;
          justify-items: center;
          gap: 14px;
          text-align: center;
          will-change: opacity, transform;
          animation: ridepod-splash-content-in 220ms ease-out both;
        }

        .ridepod-splash[data-state="exit"] .ridepod-splash__content {
          animation: ridepod-splash-logo-out 300ms ease-in forwards;
        }

        .ridepod-splash__route {
          position: relative;
          width: min(168px, 52vw);
          height: 28px;
          margin-bottom: 4px;
        }

        .ridepod-splash__route-line {
          position: absolute;
          left: 22px;
          right: 22px;
          top: 13px;
          height: 2px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(242, 193, 91, 0.16);
        }

        .ridepod-splash__route-line::after {
          content: "";
          display: block;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, transparent, var(--rp-primary), var(--rp-primary-strong));
          transform-origin: left center;
          animation: ridepod-splash-route 560ms 100ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .ridepod-splash__dot {
          position: absolute;
          top: 7px;
          display: block;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          border: 2px solid rgba(242, 193, 91, 0.72);
          background: #07111a;
          box-shadow: 0 0 22px rgba(242, 193, 91, 0.28);
        }

        .ridepod-splash__dot--start {
          left: 0;
        }

        .ridepod-splash__dot--end {
          right: 0;
          background: var(--rp-primary);
          animation: ridepod-splash-dot-glow 900ms 280ms ease-in-out infinite;
        }

        .ridepod-splash__logo {
          position: relative;
          display: inline-flex;
          margin: 0;
          overflow: hidden;
          isolation: isolate;
          font-size: clamp(48px, 16vw, 72px);
          line-height: 0.95;
          font-weight: 800;
          letter-spacing: 0;
          text-shadow: 0 18px 50px rgba(0, 0, 0, 0.44);
        }

        .ridepod-splash__logo-text {
          display: inline-flex;
          clip-path: inset(0 100% 0 0);
          animation: ridepod-splash-logo-reveal 560ms 80ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .ridepod-splash__logo-gold {
          color: var(--rp-primary);
          text-shadow: 0 0 34px rgba(242, 193, 91, 0.22);
        }

        .ridepod-splash__logo::after {
          content: "";
          position: absolute;
          z-index: 2;
          top: -18%;
          bottom: -18%;
          left: -58%;
          width: 46%;
          pointer-events: none;
          transform: skewX(-18deg);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.56),
            rgba(242, 193, 91, 0.42),
            transparent
          );
          mix-blend-mode: screen;
          animation: ridepod-splash-logo-flash 640ms 190ms ease-out both;
        }

        .ridepod-splash__tagline {
          margin: 0;
          color: var(--rp-muted-strong);
          font-size: clamp(15px, 4vw, 18px);
          font-weight: 700;
          line-height: 1.4;
          text-align: center !important;
          text-align-last: center !important;
        }

        @keyframes ridepod-splash-lifecycle {
          0% {
            opacity: 0;
            visibility: visible;
          }
          18% {
            opacity: 1;
            visibility: visible;
          }
          85% {
            opacity: 1;
            visibility: visible;
          }
          100% {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
          }
        }

        @keyframes ridepod-splash-fade-out {
          from {
            opacity: 1;
            visibility: visible;
          }
          to {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
          }
        }

        @keyframes ridepod-splash-content-in {
          from {
            opacity: 0;
            transform: scale(0.985);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes ridepod-splash-logo-reveal {
          from {
            clip-path: inset(0 100% 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }

        @keyframes ridepod-splash-logo-flash {
          0% {
            left: -58%;
            opacity: 0;
          }
          34% {
            opacity: 0.72;
          }
          100% {
            left: 112%;
            opacity: 0;
          }
        }

        @keyframes ridepod-splash-logo-out {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.985) translateY(-2px);
          }
        }

        @keyframes ridepod-splash-route {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        @keyframes ridepod-splash-dot-glow {
          0%, 100% { box-shadow: 0 0 16px rgba(242, 193, 91, 0.22); }
          50% { box-shadow: 0 0 30px rgba(242, 193, 91, 0.42); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ridepod-splash::before,
          .ridepod-splash__content,
          .ridepod-splash[data-state="exit"] .ridepod-splash__content,
          .ridepod-splash__logo-text,
          .ridepod-splash__logo::after,
          .ridepod-splash__route-line::after,
          .ridepod-splash__dot--end {
            animation: none !important;
            transform: none !important;
          }

          .ridepod-splash__logo-text {
            clip-path: none !important;
          }

          .ridepod-splash__logo::after {
            display: none;
          }

          .ridepod-splash {
            animation: ridepod-splash-reduced-lifecycle 2000ms ease-out forwards;
          }

          .ridepod-splash[data-state="exit"] {
            animation: ridepod-splash-fade-out 180ms ease-out forwards;
          }
        }

        @keyframes ridepod-splash-reduced-lifecycle {
          0% {
            opacity: 1;
            visibility: visible;
          }
          91% {
            opacity: 1;
            visibility: visible;
          }
          100% {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
          }
        }
      `}</style>

      <div className="ridepod-splash__content">
        <div className="ridepod-splash__route" aria-hidden="true">
          <span className="ridepod-splash__dot ridepod-splash__dot--start" />
          <span className="ridepod-splash__route-line" />
          <span className="ridepod-splash__dot ridepod-splash__dot--end" />
        </div>
        <h1 className="ridepod-splash__logo">
          <span className="ridepod-splash__logo-text">
            <span>Ride</span>
            <span className="ridepod-splash__logo-gold">Pod</span>
          </span>
        </h1>
        <p className="ridepod-splash__tagline">Your ride, together.</p>
      </div>
    </div>
  );
}
