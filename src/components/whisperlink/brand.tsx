import { cn } from "@/lib/cn";

export function WhisperMark({
  className,
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const stroke = tone === "dark" ? "#7af0b7" : "#087356";

  return (
    <svg
      className={cn("h-10 w-12 shrink-0", className)}
      viewBox="0 0 72 54"
      role="img"
      aria-label="WhisperLink"
      fill="none"
    >
      <path
        d="M6.5 25.2C6.5 14.5 16.1 6 28 6h14.3c8.8 0 16.2 4.6 19.6 11.2"
        stroke={stroke}
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.6 40.3 12.4 49l12.4-5.1H42c7.9 0 14.8-3.7 18.5-9.2"
        stroke={stroke}
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.8" cy="25.2" r="2.7" fill={stroke} />
      <circle cx="34.2" cy="25.2" r="2.7" fill={stroke} />
      <circle cx="43.6" cy="25.2" r="2.7" fill={stroke} />
      <path
        d="M52.2 18.7h7.2a6.5 6.5 0 0 1 0 13h-7.2a6.5 6.5 0 0 1 0-13Z"
        stroke={stroke}
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M55.9 25.2H43.8"
        stroke={stroke}
        strokeWidth="3.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WhisperLogo({
  className,
  markClassName,
  dark = false,
}: {
  className?: string;
  markClassName?: string;
  dark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <WhisperMark className={markClassName} tone={dark ? "dark" : "light"} />
      <div className="leading-none">
        <p className={cn("text-[21px] font-extrabold tracking-[-0.02em]", dark ? "text-white" : "text-[#087356]")}>WhisperLink</p>
        <p className={cn("mt-1 text-[13px] font-medium", dark ? "text-white/72" : "text-[#4d5a55]")}>Private chat by link.</p>
      </div>
    </div>
  );
}
