import Image from "next/image";
import { cn } from "@/components/ui";

export function RidePodHeroBackground({
  className,
  priority = false,
  treatment = "banner",
}: {
  className?: string;
  priority?: boolean;
  treatment?: "banner" | "showcase";
}) {
  const showcase = treatment === "showcase";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute overflow-hidden border-[var(--rp-border)] shadow-[var(--rp-shadow-soft)]",
        showcase
          ? "inset-0 rounded-[34px] border"
          : "inset-x-0 top-0 h-72 rounded-b-[34px] border-b",
        className,
      )}
    >
      <Image
        src="/ridepod/dark-mode-background.png"
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, 768px"
        className="ridepod-theme-image-dark object-cover object-center"
      />
      <Image
        src="/ridepod/light-mode-background.png"
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, 768px"
        className="ridepod-theme-image-light object-cover object-center"
      />
      <div
        className={cn(
          "absolute inset-0",
          showcase ? "ridepod-showcase-overlay" : "bg-[var(--rp-hero-overlay)]",
        )}
      />
      {showcase ? null : (
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[var(--rp-bg)]" />
      )}
    </div>
  );
}

export function ThemeBackground({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-full overflow-hidden", className)}>
      <RidePodHeroBackground className="h-80 opacity-80" />
      <div className="relative">{children}</div>
    </div>
  );
}
