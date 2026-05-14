"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/components/ui";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const Icon = isLight ? Moon : Sun;

  return (
    <button
      type="button"
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-primary)] shadow-[var(--rp-shadow-soft)] transition hover:bg-[var(--rp-card-muted)]",
        compact ? "h-9 w-9" : "h-11 gap-2 px-3",
      )}
    >
      <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      {compact ? null : (
        <span className="text-xs font-black text-[var(--rp-text)]">
          {isLight ? "Dark" : "Light"}
        </span>
      )}
    </button>
  );
}
