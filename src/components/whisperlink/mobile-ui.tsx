import Link from "next/link";
import type { ReactNode } from "react";
import {
  Clock3,
  Home,
  Palette,
  PlusCircle,
  Settings,
  ShieldCheck,
  Signal,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/cn";

type NavKey = "home" | "create" | "active" | "skins" | "settings";

const navItems: Array<{ id: NavKey; label: string; href: string; icon: typeof Home }> = [
  { id: "home", label: "Home", href: "/", icon: Home },
  { id: "create", label: "Create", href: "/create", icon: PlusCircle },
  { id: "active", label: "Active", href: "/demo/room", icon: Clock3 },
  { id: "skins", label: "Skins", href: "/demo/skins", icon: Palette },
  { id: "settings", label: "Settings", href: "/trust", icon: Settings },
];

export function MobileScreen({
  children,
  className,
  contentClassName,
  dark = false,
  withBottomInset = true,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  dark?: boolean;
  withBottomInset?: boolean;
}) {
  return (
    <main
      className={cn(
        "whisperlink-shell min-h-screen px-0 text-[#101815] sm:bg-[#eef5f1] sm:px-4 sm:py-6",
        dark ? "bg-[#001716] sm:bg-[#dfe9e5]" : "bg-[#f8fbf9]",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto min-h-screen w-full max-w-[430px] overflow-hidden shadow-none sm:min-h-[820px] sm:rounded-[34px] sm:border sm:border-black/10 sm:shadow-[0_28px_90px_rgba(15,33,27,0.18)]",
          dark ? "bg-[#001716] text-white" : "bg-[#fbfdfc] text-[#101815]",
          contentClassName,
        )}
      >
        {children}
        {withBottomInset ? <div className={cn("h-7", dark ? "bg-[#001716]" : "bg-[#fbfdfc]")} /> : null}
      </div>
    </main>
  );
}

export function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div className={cn("flex h-11 items-center justify-between px-7 pt-2 text-[17px] font-bold", dark ? "text-white" : "text-[#101815]")}>
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <Signal className="h-4 w-4" />
        <Wifi className="h-4 w-4" />
        <span className={cn("h-3.5 w-6 rounded-[4px] border p-[2px]", dark ? "border-white" : "border-[#101815]")}>
          <span className={cn("block h-full w-4 rounded-[2px]", dark ? "bg-white" : "bg-[#101815]")} />
        </span>
      </div>
    </div>
  );
}

export function BottomNav({ active, dark = false }: { active: NavKey; dark?: boolean }) {
  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t px-3 pb-4 pt-2",
        dark ? "border-white/10 bg-[#001716]/92 text-white/70 backdrop-blur" : "border-[#e3e9e5] bg-white/96 text-[#404b47] backdrop-blur",
      )}
    >
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[12px] font-semibold",
                isActive && (dark ? "text-[#66e7a8]" : "text-[#087356]"),
              )}
            >
              <Icon className="h-[23px] w-[23px]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className={cn("mx-auto mt-1 h-1 w-32 rounded-full", dark ? "bg-white" : "bg-[#101815]")} />
    </nav>
  );
}

export function PrimaryCTA({
  href,
  children,
  icon,
  className,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-[58px] w-full items-center justify-center gap-3 rounded-[18px] bg-[#007a55] px-5 text-[20px] font-bold text-white shadow-[0_16px_32px_rgba(0,122,85,0.22)]",
        className,
      )}
    >
      {children}
      {icon}
    </Link>
  );
}

export function SoftIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-[#e9f6f0] text-[#087356]", className)}>
      {children}
    </span>
  );
}

export function ShieldMotif({ className }: { className?: string }) {
  return (
    <div className={cn("relative grid place-items-center", className)}>
      <div className="absolute h-44 w-44 rounded-full border border-white/15" />
      <div className="absolute h-32 w-32 rounded-full border border-white/20" />
      <div className="absolute h-20 w-20 rounded-full bg-white/10 blur-sm" />
      <div className="relative grid h-24 w-24 place-items-center rounded-[28px] border border-[#9ff0ca]/55 bg-gradient-to-br from-[#c8fff0] via-[#5bdba0] to-[#065c47] text-[#003c31] shadow-[0_22px_46px_rgba(0,23,20,0.34)]">
        <ShieldCheck className="h-12 w-12" />
      </div>
    </div>
  );
}
