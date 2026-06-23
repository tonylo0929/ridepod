"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CarFront,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  Flag,
  LockKeyhole,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Share2,
  ShieldCheck,
  Smartphone,
  UsersRound,
} from "lucide-react";
import { cn } from "@/components/ui";
import {
  defaultRideGroupSlug,
  getDraftRidePodById,
  getDraftRidePodRiders,
  getLockedDraftRidePodRiders,
  getRideCallById,
  getRideCallInterests,
  getRideCallsForGroup,
  getRideGroupBySlug,
  getViewerDraftPodRider,
  getViewerInterest,
  rideTypeLabel,
  useRideGroupsState,
  type CreateRideCallInput,
  type DraftRidePod,
  type DraftRidePodRider,
  type RideCall,
  type RideCallRideType,
  type RideGroup,
  type RideGroupViewer,
  type RideGroupsState,
} from "@/lib/ride-groups";
import { useAuth } from "@/providers/AuthProvider";

type GroupTab = "all" | "Tuen Mun" | "Shatin" | "Central";

const groupTabs: Array<{ id: GroupTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "Tuen Mun", label: "To Tuen Mun" },
  { id: "Shatin", label: "To Shatin" },
  { id: "Central", label: "To Central" },
];

const avatarToneFallbacks = [
  "from-sky-300 to-cyan-500",
  "from-violet-200 to-fuchsia-500",
  "from-amber-200 to-orange-500",
  "from-emerald-200 to-green-500",
];

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return initials || "R";
}

function getViewerFromAuth({
  user,
  profile,
}: {
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
}): RideGroupViewer | null {
  if (!user) return null;
  const name =
    profile?.account_name?.trim() ||
    profile?.display_name?.trim() ||
    profile?.preferred_name?.trim() ||
    user.email?.split("@")[0]?.trim() ||
    "RidePod rider";

  return {
    id: user.id,
    name,
    initials: getInitials(name),
    avatarTone: avatarToneFallbacks[Math.abs(hashString(user.id)) % avatarToneFallbacks.length],
  };
}

function hashString(value: string) {
  return value.split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 0);
}

function routeToLogin(pathname: string) {
  return `/login?next=${encodeURIComponent(pathname)}`;
}

function formatRelativeMinutes(isoDate: string) {
  const date = new Date(isoDate).getTime();
  const diff = Math.max(1, Math.round((Date.now() - date) / 60_000));
  if (!Number.isFinite(diff)) return "10 min ago";
  if (diff < 60) return `${diff} min ago`;
  const hours = Math.round(diff / 60);
  return `${hours} hr ago`;
}

function avatarClass(tone: string) {
  return cn("bg-gradient-to-br", tone);
}

function MiniAvatar({
  initials,
  tone,
  className,
  label,
}: {
  initials: string;
  tone: string;
  className?: string;
  label?: string;
}) {
  return (
    <span
      aria-label={label}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border border-white/40 text-[10px] font-black text-[#06111b] shadow-[0_8px_18px_rgba(0,0,0,0.28)]",
        avatarClass(tone),
        className ?? "h-8 w-8",
      )}
    >
      {initials}
    </span>
  );
}

export function TrustBadge({ label = "Trusted" }: { label?: string }) {
  return (
    <span className="inline-flex min-h-6 items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 text-[10px] font-black text-emerald-100">
      <ShieldCheck className="h-3 w-3" />
      {label}
    </span>
  );
}

export function StatusChip({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "cyan" | "green" | "gray" }) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
      : tone === "green"
        ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
        : tone === "gray"
          ? "border-white/12 bg-white/[0.07] text-[var(--rp-muted-strong)]"
          : "border-[color-mix(in_srgb,var(--rp-primary)_48%,transparent)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] text-[var(--rp-primary)]";

  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full border px-2.5 text-[10px] font-black", toneClass)}>
      {children}
    </span>
  );
}

export function InterestedAvatarStack({
  interests,
  size = "sm",
  showPlus = false,
}: {
  interests: Array<{ id: string; userInitials: string; avatarTone: string; userName: string }>;
  size?: "xs" | "sm" | "md";
  showPlus?: boolean;
}) {
  const avatarSize = size === "md" ? "h-10 w-10 text-xs" : size === "xs" ? "h-6 w-6 text-[8px]" : "h-7 w-7";

  return (
    <span className="flex items-center">
      {interests.slice(0, 4).map((interest, index) => (
        <MiniAvatar
          key={interest.id}
          initials={interest.userInitials}
          tone={interest.avatarTone}
          label={interest.userName}
          className={cn(avatarSize, index > 0 && "-ml-2")}
        />
      ))}
      {showPlus ? (
        <span
          className={cn(
            "grid place-items-center rounded-full border border-dashed border-white/30 bg-[var(--rp-card-soft)] font-black text-[var(--rp-muted-strong)]",
            avatarSize,
            interests.length ? "-ml-2" : "",
          )}
        >
          +
        </span>
      ) : null}
    </span>
  );
}

export function CountdownTimer({ deadlineAt }: { deadlineAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remainingSeconds = Math.max(0, Math.floor((new Date(deadlineAt).getTime() - now) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <span className="font-mono text-[var(--rp-primary)]">
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

export function RideGroupHeader({ group }: { group: RideGroup }) {
  return (
    <header className="flex items-center justify-between gap-3 px-1">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/home"
          aria-label="Back to home"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.055] text-[var(--rp-text)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black text-[var(--rp-text)]">{group.name}</h1>
          <p className="text-left text-xs font-bold text-[var(--rp-muted)]">{group.subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        aria-label="More group actions"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.055] text-[var(--rp-muted-strong)]"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
    </header>
  );
}

export function RideGroupTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: GroupTab;
  onTabChange: (tab: GroupTab) => void;
}) {
  return (
    <div className="scrollbar-hide -mx-4 flex gap-6 overflow-x-auto border-b border-white/10 px-4">
      {groupTabs.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative min-h-10 shrink-0 text-xs font-black transition",
              active ? "text-[var(--rp-primary)]" : "text-[var(--rp-muted-strong)]",
            )}
          >
            {tab.label}
            {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--rp-primary)]" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function InterestButton({
  rideCall,
  state,
  compact = false,
}: {
  rideCall: RideCall;
  state: RideGroupsState;
  compact?: boolean;
}) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { setInterest } = useRideGroupsState();
  const viewer = getViewerFromAuth({ user, profile });
  const viewerInterest = getViewerInterest(state, rideCall.id, viewer?.id);
  const active = Boolean(viewerInterest);
  const disabled = rideCall.status === "converted" || rideCall.status === "cancelled" || rideCall.status === "expired";

  function handleClick() {
    if (isLoading) return;
    if (!viewer) {
      router.push(routeToLogin(pathname));
      return;
    }
    setInterest(rideCall.id, viewer, !active);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[11px] border text-[10px] font-black shadow-[0_10px_22px_rgba(242,193,91,0.18)] transition hover:brightness-105 disabled:opacity-60",
        compact ? "min-h-8 px-3" : "min-h-13 w-full px-5 text-sm",
        active
          ? "border-emerald-300/50 bg-emerald-300/15 text-emerald-100"
          : "border-[var(--rp-primary)] bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)]",
      )}
    >
      {active ? <Check className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} /> : null}
      {active ? "Interested" : "I'm interested"}
    </button>
  );
}

export function RideCallCard({
  rideCall,
  state,
}: {
  rideCall: RideCall;
  state: RideGroupsState;
}) {
  const interests = getRideCallInterests(state, rideCall.id);

  return (
    <article className="grid grid-cols-[42px_minmax(0,1fr)_auto] gap-3 rounded-[15px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,32,48,0.92),rgba(9,19,30,0.94))] p-3 shadow-[0_16px_36px_rgba(0,0,0,0.25)]">
      <div className="grid justify-items-center gap-1">
        <MiniAvatar
          initials={rideCall.creatorInitials}
          tone={rideCall.creatorAvatarTone}
          label={rideCall.creatorName}
          className="h-10 w-10 text-xs"
        />
        <span className="max-w-11 truncate text-[9px] font-bold text-[var(--rp-muted-strong)]">{rideCall.creatorName}</span>
      </div>

      <Link href={`/ride-calls/${rideCall.id}`} className="min-w-0">
        <h2 className="truncate text-sm font-black leading-5 text-[var(--rp-text)]">{rideCall.title}</h2>
        <p className="mt-0.5 truncate text-left text-[11px] font-bold text-[var(--rp-muted-strong)]">{rideCall.approximateTimeLabel}</p>
        <p className="mt-0.5 truncate text-left text-[10px] font-semibold text-[var(--rp-muted)]">
          {`${rideCall.fromLabel} -> ${rideCall.toLabel}`}
        </p>
        <p className="mt-1 text-left text-[10px] font-black text-[var(--rp-muted-strong)]">
          {interests.length}/{rideCall.targetPeopleCount} interested
        </p>
        <div className="mt-1.5">
          <InterestedAvatarStack interests={interests} size="xs" />
        </div>
      </Link>

      <div className="grid content-between justify-items-end gap-3">
        <Link href={`/ride-calls/${rideCall.id}`} aria-label={`Open ${rideCall.title}`} className="p-0.5 text-[var(--rp-muted)]">
          <ChevronRight className="h-4 w-4" />
        </Link>
        <InterestButton rideCall={rideCall} state={state} compact />
      </div>
    </article>
  );
}

export function RideCallList({
  rideCalls,
  state,
}: {
  rideCalls: RideCall[];
  state: RideGroupsState;
}) {
  if (!rideCalls.length) {
    return (
      <section className="rounded-[16px] border border-white/10 bg-white/[0.055] p-5 text-center">
        <p className="text-sm font-black text-[var(--rp-text)]">No Ride Calls here yet.</p>
        <p className="mt-1 text-center text-xs font-semibold text-[var(--rp-muted-strong)]">Post one and find people going your way first.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-3">
      {rideCalls.map((rideCall) => (
        <RideCallCard key={rideCall.id} rideCall={rideCall} state={state} />
      ))}
    </div>
  );
}

function MissingRideGroupState() {
  return (
    <section className="mx-auto max-w-[430px] rounded-[22px] border border-white/10 bg-[var(--rp-card)] p-5 text-center shadow-[var(--rp-shadow-soft)]">
      <h1 className="text-2xl font-black text-[var(--rp-text)]">Ride Group not found</h1>
      <p className="mt-2 text-center text-sm font-semibold text-[var(--rp-muted-strong)]">This group is not available in the demo state.</p>
      <Link href={`/ride-groups/${defaultRideGroupSlug}`} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]">
        Open Coldplay group
      </Link>
    </section>
  );
}

export function RideGroupPage({ slug }: { slug: string }) {
  const { state } = useRideGroupsState();
  const [activeTab, setActiveTab] = useState<GroupTab>("all");
  const group = getRideGroupBySlug(state, slug);
  const rideCalls = group ? getRideCallsForGroup(state, group.id) : [];
  const visibleRideCalls = activeTab === "all" ? rideCalls : rideCalls.filter((rideCall) => rideCall.toLabel === activeTab);

  if (!group) return <MissingRideGroupState />;

  return (
    <div className="mx-auto grid max-w-[430px] gap-4 pb-4">
      <RideGroupHeader group={group} />

      <section className="rounded-[15px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,32,48,0.96),rgba(9,19,30,0.92))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
        <h2 className="text-lg font-black leading-6 text-[var(--rp-text)]">Where are people going after?</h2>
        <p className="mt-1 text-left text-xs font-semibold text-[var(--rp-muted-strong)]">Find ride-mates and split the fare.</p>
        <Link
          href={`/ride-groups/${group.slug}/create-ride-call`}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_16px_30px_rgba(242,193,91,0.2)]"
        >
          <Plus className="h-4 w-4" />
          Create Ride Call
        </Link>
      </section>

      <RideGroupTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <RideCallList rideCalls={visibleRideCalls} state={state} />
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-black uppercase tracking-[0.08em] text-[var(--rp-muted-strong)]">{children}</span>;
}

function inputClassName() {
  return "mt-2 min-h-12 w-full rounded-[14px] border border-white/12 bg-white/[0.055] px-3 text-sm font-bold text-[var(--rp-text)] outline-none transition placeholder:text-[#6f7b88] focus:border-[var(--rp-primary)]";
}

export function CreateRideCallForm({ slug }: { slug: string }) {
  const { user, profile, isLoading } = useAuth();
  const { state, createRideCall } = useRideGroupsState();
  const group = getRideGroupBySlug(state, slug);
  const router = useRouter();
  const pathname = usePathname();
  const viewer = getViewerFromAuth({ user, profile });
  const [toLabel, setToLabel] = useState("Tuen Mun");
  const [fromLabel, setFromLabel] = useState(group?.fromLabel ?? "Coldplay Concert");
  const [approximateTimeLabel, setApproximateTimeLabel] = useState("After concert - ~11:15 PM");
  const [targetPeopleCount, setTargetPeopleCount] = useState(4);
  const [rideType, setRideType] = useState<RideCallRideType>("either");
  const [note, setNote] = useState("Let's split taxi or Uber back together.");
  const [error, setError] = useState<string | null>(null);

  if (!group) return <MissingRideGroupState />;
  const activeGroup = group;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    if (!viewer) {
      router.push(routeToLogin(pathname));
      return;
    }
    if (!toLabel.trim()) {
      setError("Destination is required.");
      return;
    }
    if (!approximateTimeLabel.trim()) {
      setError("Approximate time is required.");
      return;
    }

    const rideCall = createRideCall(
      {
        groupId: activeGroup.id,
        toLabel,
        fromLabel: fromLabel || activeGroup.fromLabel,
        approximateTimeLabel,
        targetPeopleCount,
        rideType,
        note,
      } satisfies CreateRideCallInput,
      viewer,
    );
    router.push(`/ride-calls/${rideCall.id}?posted=1`);
  }

  return (
    <div className="mx-auto grid max-w-[430px] gap-4 pb-4">
      <header className="flex items-center gap-3 px-1">
        <Link href={`/ride-groups/${activeGroup.slug}`} aria-label="Back to group" className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.055]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-[var(--rp-text)]">Create Ride Call</h1>
          <p className="text-left text-xs font-bold text-[var(--rp-muted)]">{activeGroup.name}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,32,48,0.96),rgba(9,19,30,0.94))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
        <label>
          <FieldLabel>Destination / To</FieldLabel>
          <input value={toLabel} onChange={(event) => setToLabel(event.target.value)} className={inputClassName()} placeholder="Tuen Mun" />
        </label>

        <label>
          <FieldLabel>From</FieldLabel>
          <input value={fromLabel} onChange={(event) => setFromLabel(event.target.value)} className={inputClassName()} placeholder={activeGroup.fromLabel} />
        </label>

        <label>
          <FieldLabel>Approximate time</FieldLabel>
          <input value={approximateTimeLabel} onChange={(event) => setApproximateTimeLabel(event.target.value)} className={inputClassName()} placeholder="After concert - ~11:15 PM" />
        </label>

        <label>
          <FieldLabel>People needed</FieldLabel>
          <input
            type="number"
            min={2}
            max={6}
            value={targetPeopleCount}
            onChange={(event) => setTargetPeopleCount(Math.max(2, Number(event.target.value) || 2))}
            className={inputClassName()}
          />
        </label>

        <div>
          <FieldLabel>Ride type</FieldLabel>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {([
              ["ride_app", "Ride app", Smartphone],
              ["taxi", "Taxi", CarFront],
              ["either", "Either", UsersRound],
            ] as const).map(([value, label, Icon]) => {
              const active = rideType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRideType(value)}
                  className={cn(
                    "grid min-h-14 place-items-center gap-1 rounded-[14px] border px-2 text-center text-[10px] font-black transition",
                    active
                      ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_16%,transparent)] text-[var(--rp-primary)]"
                      : "border-white/10 bg-white/[0.045] text-[var(--rp-muted-strong)]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <label>
          <FieldLabel>Optional note</FieldLabel>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={cn(inputClassName(), "min-h-24 resize-none py-3")}
            placeholder="Let's split taxi or Uber back together."
          />
        </label>

        <div className="rounded-[14px] border border-cyan-300/20 bg-cyan-300/8 p-3">
          <p className="text-left text-xs font-bold leading-5 text-cyan-100">
            Ride Calls are only interest posts. No payment, exact pickup, private chat, or locked seat is created here.
          </p>
        </div>

        {error ? <p className="text-left text-xs font-black text-rose-200">{error}</p> : null}

        <button type="submit" className="min-h-12 rounded-[12px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]">
          Post Ride Call
        </button>
      </form>
    </div>
  );
}

export function RideCallDetail({ id }: { id: string }) {
  const { user, profile, isLoading } = useAuth();
  const { state, convertRideCallToDraftPod } = useRideGroupsState();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rideCall = getRideCallById(state, id);
  const viewer = getViewerFromAuth({ user, profile });
  const posted = searchParams.get("posted") === "1";

  if (!rideCall) {
    return (
      <section className="mx-auto max-w-[430px] rounded-[22px] border border-white/10 bg-[var(--rp-card)] p-5 text-center shadow-[var(--rp-shadow-soft)]">
        <h1 className="text-2xl font-black text-[var(--rp-text)]">Ride Call not found</h1>
        <Link href={`/ride-groups/${defaultRideGroupSlug}`} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]">
          Back to Ride Groups
        </Link>
      </section>
    );
  }
  const activeRideCall = rideCall;

  const group = state.groups.find((item) => item.id === activeRideCall.groupId);
  const interests = getRideCallInterests(state, activeRideCall.id);
  const readyToConvert = activeRideCall.status === "ready_to_convert";
  const convertedPod = activeRideCall.convertedPodId ? getDraftRidePodById(state, activeRideCall.convertedPodId) : null;

  function handleConvert() {
    if (isLoading) return;
    if (!viewer) {
      router.push(routeToLogin(pathname));
      return;
    }
    const pod = convertRideCallToDraftPod(activeRideCall.id);
    if (pod) router.push(`/pods/${pod.id}/confirm`);
  }

  return (
    <div className="mx-auto grid max-w-[430px] gap-4 pb-4">
      {posted ? (
        <div className="rounded-[14px] border border-emerald-300/30 bg-emerald-300/12 p-3 text-xs font-black text-emerald-100">
          Ride Call posted.
        </div>
      ) : null}

      <header className="flex items-center gap-3 px-1">
        <Link href={group ? `/ride-groups/${group.slug}` : "/home"} aria-label="Back to group" className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.055]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <MiniAvatar initials={rideCall.creatorInitials} tone={rideCall.creatorAvatarTone} label={rideCall.creatorName} className="h-10 w-10 text-xs" />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--rp-text)]">{rideCall.creatorName}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-left text-[10px] font-bold text-[var(--rp-muted)]">{formatRelativeMinutes(rideCall.createdAt)}</p>
            <TrustBadge />
          </div>
        </div>
      </header>

      <section className="grid gap-4 rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,32,48,0.96),rgba(9,19,30,0.94))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
        <div>
          <h1 className="text-2xl font-black leading-7 text-[var(--rp-text)]">{rideCall.title}</h1>
          <p className="mt-1 text-left text-sm font-black text-[var(--rp-muted-strong)]">{rideCall.approximateTimeLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusChip tone="gray">Need {rideCall.targetPeopleCount} people</StatusChip>
          <StatusChip tone="gray">{rideTypeLabel(rideCall.rideType)}</StatusChip>
        </div>

        <div className="rounded-[14px] border border-white/10 bg-white/[0.055] p-3">
          <p className="text-left text-sm font-semibold leading-5 text-[var(--rp-muted-strong)]">{rideCall.note}</p>
        </div>

        <div>
          <p className="text-left text-sm font-black text-[var(--rp-primary)]">
            {interests.length}/{rideCall.targetPeopleCount} interested
          </p>
          <div className="mt-2">
            <InterestedAvatarStack interests={interests} size="md" showPlus />
          </div>
        </div>

        {readyToConvert ? (
          <div className="rounded-[14px] border border-[var(--rp-primary)]/40 bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] p-3">
            <p className="text-left text-sm font-black text-[var(--rp-primary)]">
              Enough people are interested. Ready to create a RidePod.
            </p>
            <button
              type="button"
              onClick={handleConvert}
              className="mt-3 min-h-11 w-full rounded-[12px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]"
            >
              Create RidePod
            </button>
          </div>
        ) : null}

        {convertedPod ? (
          <Link
            href={`/pods/${convertedPod.id}/confirm`}
            className="rounded-[14px] border border-emerald-300/30 bg-emerald-300/12 p-3 text-sm font-black text-emerald-100"
          >
            Draft RidePod created. Open invite
          </Link>
        ) : null}

        <div className="rounded-[14px] border border-white/10 bg-white/[0.055] p-3">
          <p className="text-left text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            This is an interest post. Ride is not confirmed yet.
          </p>
        </div>

        <InterestButton rideCall={rideCall} state={state} />

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.055] text-xs font-black text-[var(--rp-muted-strong)]">
            <Share2 className="h-4 w-4" />
            Share Ride Call
          </button>
          <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.055] text-xs font-black text-[var(--rp-muted-strong)]">
            <Flag className="h-4 w-4" />
            Report post
          </button>
        </div>
      </section>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-[var(--rp-muted)]" />
      <p className="text-left text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
        <span className="text-[var(--rp-text)]">{label}:</span> {value}
      </p>
    </div>
  );
}

export function DraftRidePodInvite({ pod, group }: { pod: DraftRidePod; group?: RideGroup | null }) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,32,48,0.96),rgba(9,19,30,0.94))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
      <h1 className="text-lg font-black text-[var(--rp-text)]">Draft RidePod</h1>
      <div className="mt-4 grid gap-2">
        <DetailRow icon={MapPin} label="From" value={group?.name ?? pod.fromLabel} />
        <DetailRow icon={MapPin} label="To" value={pod.toLabel} />
        <DetailRow icon={Clock3} label="Time" value={pod.approximateTimeLabel} />
        <DetailRow icon={UsersRound} label="Seats" value={String(pod.targetSeats)} />
      </div>
    </section>
  );
}

function PaymentRows({ rideType }: { rideType: DraftRidePod["rideType"] }) {
  const rows =
    rideType === "ride_app"
      ? [
          ["Estimated share", "HK$95", ShieldCheck],
          ["RidePod fee", "HK$8", CreditCard],
          ["You will only pay actual share after ride", "", Check],
          ["No payment, no seat", "", LockKeyhole],
        ]
      : [
          ["Protected max", "HK$120", ShieldCheck],
          ["RidePod fee", "HK$8", CreditCard],
          ["You will only pay actual share after ride", "", Check],
          ["No payment, no seat", "", LockKeyhole],
        ];

  return (
    <div className="grid gap-2">
      {rows.map(([label, value, Icon]) => (
        <div key={label as string} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-2">
          <Icon className="h-4 w-4 text-emerald-300" />
          <span className="text-left text-xs font-bold text-[var(--rp-muted-strong)]">{label as string}</span>
          {value ? <span className="font-mono text-xs font-black text-[var(--rp-text)]">{value as string}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function ConfirmSeatPanel({
  pod,
  rider,
}: {
  pod: DraftRidePod;
  rider: DraftRidePodRider | null;
}) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { confirmDraftPodSeat } = useRideGroupsState();
  const viewer = getViewerFromAuth({ user, profile });
  const locked = rider?.status === "locked";

  function handleConfirm() {
    if (isLoading) return;
    if (!viewer) {
      router.push(routeToLogin(pathname));
      return;
    }
    confirmDraftPodSeat(pod.id, viewer);
  }

  return (
    <section className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,32,48,0.96),rgba(9,19,30,0.94))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
      <h2 className="text-lg font-black text-[var(--rp-text)]">{locked ? "Seat locked" : "You're invited!"}</h2>
      <p className="mt-1 text-left text-xs font-semibold text-[var(--rp-muted-strong)]">
        {locked ? "Your seat is locked. Pod details unlock as the group confirms." : "Confirm your seat to lock it."}
      </p>

      <div className="mt-4">
        <PaymentRows rideType={pod.rideType} />
      </div>

      <div className="mt-4 rounded-[14px] border border-white/10 bg-white/[0.055] p-3">
        <p className="text-left text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
          Placeholder authorization only. No real money is charged in this demo.
        </p>
      </div>

      {rider || !user ? (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={locked}
          className={cn(
            "mt-4 min-h-12 w-full rounded-[12px] px-4 text-sm font-black shadow-[0_16px_30px_rgba(242,193,91,0.2)] transition disabled:opacity-70",
            locked
              ? "border border-emerald-300/40 bg-emerald-300/12 text-emerald-100"
              : "bg-[var(--rp-gradient-primary)] text-[var(--rp-primary-text)]",
          )}
        >
          {locked ? "Seat locked" : "Confirm & authorize"}
        </button>
      ) : (
        <div className="mt-4 rounded-[14px] border border-rose-300/25 bg-rose-300/10 p-3">
          <p className="text-left text-xs font-bold leading-5 text-rose-100">
            This invite is not assigned to your account.
          </p>
        </div>
      )}

      <p className="mt-3 text-center text-[10px] font-bold text-[var(--rp-muted-strong)]">
        Offer expires in <CountdownTimer deadlineAt={rider?.confirmationExpiresAt ?? pod.confirmationDeadlineAt} />
      </p>
    </section>
  );
}

export function DraftRidePodConfirmPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { state } = useRideGroupsState();
  const pod = getDraftRidePodById(state, id);
  const group = pod ? state.groups.find((item) => item.id === pod.rideGroupId) : null;
  const rider = pod ? getViewerDraftPodRider(state, pod.id, user?.id) : null;
  const riders = pod ? getDraftRidePodRiders(state, pod.id) : [];
  const lockedRiders = pod ? getLockedDraftRidePodRiders(state, pod.id) : [];

  if (!pod) {
    return (
      <section className="mx-auto max-w-[430px] rounded-[22px] border border-white/10 bg-[var(--rp-card)] p-5 text-center shadow-[var(--rp-shadow-soft)]">
        <h1 className="text-2xl font-black text-[var(--rp-text)]">Draft RidePod not found</h1>
        <Link href={`/ride-groups/${defaultRideGroupSlug}`} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]">
          Back to Ride Groups
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto grid max-w-[430px] gap-4 pb-4">
      <header className="flex items-center gap-3 px-1">
        <Link href={`/ride-calls/${pod.sourceRideCallId}`} aria-label="Back to Ride Call" className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.055]">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-[var(--rp-text)]">Draft RidePod</h1>
          <p className="text-left text-xs font-bold text-[var(--rp-muted)]">{rideTypeLabel(pod.rideType)}</p>
        </div>
      </header>

      <DraftRidePodInvite pod={pod} group={group} />
      <ConfirmSeatPanel pod={pod} rider={rider} />

      <section className="rounded-[18px] border border-white/10 bg-white/[0.055] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-[var(--rp-text)]">{lockedRiders.length}/{pod.targetSeats} locked riders</p>
          <InterestedAvatarStack
            interests={riders.map((item) => ({
              id: item.id,
              userInitials: item.userInitials,
              avatarTone: item.avatarTone,
              userName: item.userName,
            }))}
            size="xs"
          />
        </div>
        <p className="mt-2 text-left text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
          Interested users are invited only. Seats count after confirm and authorize.
        </p>
      </section>

      {rider?.status === "locked" ? (
        <Link
          href={`/pods/${pod.id}`}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border border-cyan-300/35 bg-cyan-300/10 px-4 text-sm font-black text-cyan-100"
        >
          Continue to RidePod
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

export function DraftRidePodDetailPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { state } = useRideGroupsState();
  const pod = getDraftRidePodById(state, id);
  const group = pod ? state.groups.find((item) => item.id === pod.rideGroupId) : null;
  const rider = pod ? getViewerDraftPodRider(state, pod.id, user?.id) : null;
  const locked = rider?.status === "locked";
  const lockedRiders = pod ? getLockedDraftRidePodRiders(state, pod.id) : [];

  if (!pod) return null;

  return (
    <div className="mx-auto grid max-w-[430px] gap-4 pb-4">
      <DraftRidePodInvite pod={pod} group={group} />

      <section className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,32,48,0.96),rgba(9,19,30,0.94))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[var(--rp-text)]">{locked ? "Private pod details" : "Confirm first"}</h2>
            <p className="mt-1 text-left text-xs font-semibold text-[var(--rp-muted-strong)]">
              {locked
                ? "You can now see group coordination details."
                : "Private chat, exact pickup notes, and rider details unlock after your seat is locked."}
            </p>
          </div>
          <StatusChip tone={locked ? "green" : "gold"}>{locked ? "Seat locked" : "Invite"}</StatusChip>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="rounded-[14px] border border-white/10 bg-white/[0.055] p-3">
            <p className="text-left text-sm font-black text-[var(--rp-text)]">
              Waiting for {Math.max(0, pod.targetSeats - lockedRiders.length)} more locked riders
            </p>
            <p className="mt-1 text-left text-xs font-semibold text-[var(--rp-muted-strong)]">
              Only locked riders count toward confirmed pod status.
            </p>
          </div>

          {locked ? (
            <div className="grid gap-2">
              <div className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-cyan-300/30 bg-cyan-300/10 px-3 text-sm font-black text-cyan-100">
                <MessageCircle className="h-4 w-4" />
                Pod chat unlocked
              </div>
              <div className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-emerald-300/30 bg-emerald-300/10 px-3 text-sm font-black text-emerald-100">
                <MapPin className="h-4 w-4" />
                Pickup instructions pending from host
              </div>
            </div>
          ) : (
            <Link
              href={`/pods/${pod.id}/confirm`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]"
            >
              Confirm your seat
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      {!locked ? (
        <section className="rounded-[16px] border border-white/10 bg-white/[0.055] p-3">
          <p className="text-left text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
            <CircleAlert className="mr-1 inline h-3.5 w-3.5 text-[var(--rp-primary)]" />
            Before lock, RidePod hides phone numbers, exact pickup notes, private chat, and sensitive rider details.
          </p>
        </section>
      ) : null}
    </div>
  );
}
