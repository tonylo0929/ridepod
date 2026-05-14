import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Home,
  LockKeyhole,
  MapPin,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  designRidePods,
  formatMoney,
  getCurrentUser,
  getUser,
  type RidePod,
} from "@/lib/mock-data";
import type { DesignVariant } from "@/lib/design-variants";
import { cn } from "@/components/ui";
import { RidePodLogo } from "@/components/ridepod-logo";

const screenLinks = [
  { id: "feed", label: "Home", icon: Home },
  { id: "create", label: "Create", icon: PlusCircle },
  { id: "host", label: "My Pods", icon: UsersRound },
  { id: "profile", label: "Profile", icon: UserRound },
];

function variantIntroCopy(variant: DesignVariant) {
  const copy = {
    fintech:
      "Deposits, authorizations, seat ownership, and max-fare approvals are presented like financial controls.",
    community:
      "Members, host context, and shared expectations are brought forward so strangers feel less strange.",
    travel:
      "Route, date, time, terminal, and itinerary state dominate the screen for trip-planning clarity.",
    premium:
      "Verified members, reliability metrics, and host protection get a black-car transfer treatment.",
    campus:
      "The interface makes shared rides feel low-cost, quick to share, and easy for student groups.",
  } as const;

  return copy[variant.slug];
}

function Shell({ variant, children }: { variant: DesignVariant; children: React.ReactNode }) {
  return (
    <main className={cn("min-h-screen", variant.shell, variant.text)}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden w-72 border-r p-5 lg:block",
          variant.sidebar,
        )}
      >
        <Link href="/designs" className="flex items-center gap-3">
          <div className={cn("grid h-11 w-11 place-items-center", variant.radius, variant.accent)}>
            <ShieldCheck className="h-6 w-6 text-white mix-blend-normal" />
          </div>
          <div>
            <RidePodLogo className="h-8" priority />
            <p className={cn("text-xs font-semibold", variant.muted)}>{variant.navLabel} direction</p>
          </div>
        </Link>

        <nav className="mt-8 grid gap-2">
          {screenLinks.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                "flex items-center gap-3 border px-3 py-3 text-sm font-bold",
                variant.radius,
                item.id === "feed" ? variant.button : variant.ghost,
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </a>
          ))}
        </nav>

        <div className={cn("mt-8 border p-4", variant.radius, variant.mutedCard)}>
          <p className="text-sm font-black">Best for</p>
          <p className={cn("mt-1 text-sm leading-6", variant.muted)}>{variant.bestFor}</p>
        </div>
      </aside>

      <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:ml-72 lg:px-10 lg:pb-12 lg:pt-8">
        {children}
      </div>

      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.10)] lg:hidden",
          variant.panel,
        )}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {screenLinks.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[11px] font-bold",
                item.id === "feed" ? variant.accentText : variant.muted,
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </main>
  );
}

function ScreenFrame({
  id,
  label,
  title,
  variant,
  children,
}: {
  id: string;
  label: string;
  title: string;
  variant: DesignVariant;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className={cn("text-xs font-black uppercase tracking-[0.18em]", variant.accentText)}>
            {label}
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">{title}</h2>
        </div>
      </div>
      <div className={cn("border p-4 sm:p-5", variant.radius, variant.panel, variant.shadow)}>
        {children}
      </div>
    </section>
  );
}

function Pill({
  variant,
  children,
  tone = "default",
}: {
  variant: DesignVariant;
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "accent";
}) {
  const className =
    tone === "success"
      ? variant.success
      : tone === "warning"
        ? variant.warning
        : tone === "accent"
          ? variant.accentSoft
          : variant.badge;

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black", className)}>
      {children}
    </span>
  );
}

function AvatarStack({ userIds, variant }: { userIds: string[]; variant: DesignVariant }) {
  return (
    <div className="flex -space-x-2">
      {userIds.map((userId) => {
        const user = getUser(userId);
        const initials = user.name
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2);
        return (
          <div
            key={userId}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full border-2 text-xs font-black",
              variant.panel,
              variant.border,
            )}
          >
            {initials}
          </div>
        );
      })}
    </div>
  );
}

function RideCard({ pod, variant, featured = false }: { pod: RidePod; variant: DesignVariant; featured?: boolean }) {
  const memberIds = pod.members.map((member) => member.userId);
  const seatsOpen = pod.seatsTotal - pod.seatsFilled;
  const progress = (pod.seatsFilled / pod.seatsTotal) * 100;

  return (
    <article
      className={cn(
        "border p-4",
        variant.radius,
        featured ? variant.mutedCard : variant.card,
        featured ? variant.shadow : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Pill variant={variant} tone={pod.status === "forming" ? "accent" : "success"}>
              {pod.status.replace("_", " ")}
            </Pill>
            <Pill variant={variant}>{pod.type}</Pill>
          </div>
          <h3 className="mt-3 text-lg font-black tracking-tight">{pod.title}</h3>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-xs font-bold", variant.muted)}>Share</p>
          <p className="text-2xl font-black">{formatMoney(pod.estimatedShare)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="flex items-start gap-3">
          <MapPin className={cn("mt-0.5 h-4 w-4 shrink-0", variant.accentText)} />
          <div>
            <p className="font-black">
              {pod.fromLabel} to {pod.toLabel}
            </p>
            <p className={cn("text-sm", variant.muted)}>
              {pod.pickupHub} to {pod.dropoffHub}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className={cn("border p-3", variant.radius, variant.mutedCard)}>
            <p className={variant.muted}>Time</p>
            <p className="font-black">{pod.time}</p>
          </div>
          <div className={cn("border p-3", variant.radius, variant.mutedCard)}>
            <p className={variant.muted}>Seats</p>
            <p className="font-black">
              {pod.seatsFilled}/{pod.seatsTotal}
            </p>
          </div>
          <div className={cn("border p-3", variant.radius, variant.mutedCard)}>
            <p className={variant.muted}>Max fare</p>
            <p className="font-black">{formatMoney(pod.maxFare)}</p>
          </div>
          <div className={cn("border p-3", variant.radius, variant.mutedCard)}>
            <p className={variant.muted}>Open</p>
            <p className="font-black">{seatsOpen > 0 ? seatsOpen : "Waitlist"}</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className={cn("h-2 overflow-hidden rounded-full", variant.slug === "premium" ? "bg-zinc-800" : "bg-zinc-200")}>
          <div className={cn("h-full rounded-full", variant.accent)} style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <AvatarStack userIds={memberIds.slice(0, 4)} variant={variant} />
          <div className="flex flex-wrap justify-end gap-2">
            <Pill variant={variant} tone="success">Payment authorized</Pill>
            <Pill variant={variant} tone={pod.status === "forming" ? "warning" : "success"}>
              Lock {pod.lockDeadline.split(",")[0]}
            </Pill>
          </div>
        </div>
      </div>
    </article>
  );
}

function FeedScreen({ variant }: { variant: DesignVariant }) {
  return (
    <ScreenFrame id="feed" label="Home/feed" title="Ride pods near you" variant={variant}>
      <div className="grid gap-4">
        <div className={cn("border p-4", variant.radius, variant.mutedCard)}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-3xl font-black tracking-tight">4 ride pods forming</p>
              <p className={cn("mt-1 text-sm", variant.muted)}>
                Deposits and authorizations are visible before booking.
              </p>
            </div>
            <div className={cn("hidden h-12 w-12 place-items-center sm:grid", variant.radius, variant.accent)}>
              <LockKeyhole className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {["Scheduled", "Recurring", "Airport", "Campus"].map((tab, index) => (
            <span
              key={tab}
              className={cn(
                "shrink-0 border px-4 py-2 text-sm font-black",
                variant.radius,
                index === 0 ? variant.button : variant.ghost,
              )}
            >
              {tab}
            </span>
          ))}
        </div>

        <div className="grid gap-3">
          {designRidePods.map((pod, index) => (
            <RideCard key={pod.id} pod={pod} variant={variant} featured={index === 0} />
          ))}
        </div>
      </div>
    </ScreenFrame>
  );
}

function DetailScreen({ variant, pod }: { variant: DesignVariant; pod: RidePod }) {
  const host = getUser(pod.hostUserId);

  return (
    <ScreenFrame id="detail" label="Pod detail" title="Seat ownership and route detail" variant={variant}>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className={cn("border p-4", variant.radius, variant.card)}>
          <div className="flex flex-wrap items-center gap-2">
            <Pill variant={variant} tone="accent">Host protected</Pill>
            <Pill variant={variant} tone="success">Payment authorized</Pill>
            <Pill variant={variant} tone="warning">No-show rules active</Pill>
          </div>
          <h3 className="mt-4 text-3xl font-black tracking-tight">
            {pod.fromLabel} to {pod.toLabel}
          </h3>
          <p className={cn("mt-2 text-sm leading-6", variant.muted)}>
            Seat lock deadline is {pod.lockDeadline}. If the final fare exceeds {formatMoney(pod.maxFare)}, the pod must re-approve before the host books.
          </p>

          <div className="mt-5 grid gap-3">
            {["Forming", "Payment locked", "Host books", "Pickup", "Settlement"].map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <div className={cn("grid h-9 w-9 place-items-center rounded-full border text-sm font-black", index < 2 ? variant.accentSoft : variant.badge)}>
                  {index + 1}
                </div>
                <p className="font-black">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <div className={cn("border p-4", variant.radius, variant.mutedCard)}>
            <p className={cn("text-xs font-black uppercase tracking-[0.16em]", variant.muted)}>Host</p>
            <div className="mt-3 flex items-center gap-3">
              <AvatarStack userIds={[host.id]} variant={variant} />
              <div>
                <p className="font-black">{host.name}</p>
                <p className={cn("text-sm", variant.muted)}>Reliability {host.hostReliability}%</p>
              </div>
            </div>
          </div>
          <div className={cn("border p-4", variant.radius, variant.card)}>
            <p className="font-black">Member payment states</p>
            <div className="mt-3 grid gap-2">
              {pod.members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between gap-3 text-sm">
                  <span>{getUser(member.userId).name}</span>
                  <Pill variant={variant} tone={member.paymentStatus === "deposit_paid" ? "warning" : "success"}>
                    {member.paymentStatus.replace("_", " ")}
                  </Pill>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

function CreateScreen({ variant }: { variant: DesignVariant }) {
  return (
    <ScreenFrame id="create" label="Create pod" title="Create a scheduled pod" variant={variant}>
      <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
        <div className="grid gap-3">
          {[
            ["From", "USC Village"],
            ["To", "LAX Terminal 1"],
            ["Pickup hub", "Jefferson entrance rideshare curb"],
            ["Time", "May 22 at 6:15 AM"],
            ["Max approved fare", "$86"],
          ].map(([label, value]) => (
            <div key={label} className={cn("border p-3", variant.radius, variant.card)}>
              <p className={cn("text-xs font-black uppercase tracking-[0.14em]", variant.muted)}>{label}</p>
              <p className="mt-1 font-black">{value}</p>
            </div>
          ))}
        </div>
        <div className={cn("border p-4", variant.radius, variant.mutedCard)}>
          <PlusCircle className={cn("h-8 w-8", variant.accentText)} />
          <h3 className="mt-4 text-xl font-black">Host preference on</h3>
          <p className={cn("mt-2 text-sm leading-6", variant.muted)}>
            RidePod will show the pod as forming until every seat has a deposit or authorization. Host protected means no one books before the money state is clear.
          </p>
          <button className={cn("mt-5 h-12 w-full font-black", variant.radius, variant.button)}>
            Preview pod
          </button>
        </div>
      </div>
    </ScreenFrame>
  );
}

function JoinScreen({ variant, pod }: { variant: DesignVariant; pod: RidePod }) {
  return (
    <ScreenFrame id="join" label="Join confirmation" title="Seat confirmed after authorization" variant={variant}>
      <div className="grid gap-4 md:grid-cols-[0.9fr_1fr]">
        <div className={cn("border p-5 text-center", variant.radius, variant.mutedCard)}>
          <CheckCircle2 className={cn("mx-auto h-12 w-12", variant.accentText)} />
          <h3 className="mt-4 text-2xl font-black">Seat confirmed</h3>
          <p className={cn("mt-2 text-sm leading-6", variant.muted)}>
            You are not charged final fare until the pod is locked and ride is completed.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Pill variant={variant} tone="success">Payment authorized</Pill>
            <Pill variant={variant} tone="accent">Deposit paid</Pill>
          </div>
        </div>
        <div className="grid gap-3">
          {[
            ["Approved max", formatMoney(pod.maxFare / pod.seatsTotal + pod.platformFee), CircleDollarSign],
            ["No-show rule", "After booking, your seat may still be charged.", ShieldCheck],
            ["Replacement", "If waitlist fills your seat, credit may apply.", UsersRound],
          ].map(([label, value, Icon]) => (
            <div key={label as string} className={cn("flex gap-3 border p-4", variant.radius, variant.card)}>
              <Icon className={cn("h-5 w-5 shrink-0", variant.accentText)} />
              <div>
                <p className="font-black">{label as string}</p>
                <p className={cn("mt-1 text-sm", variant.muted)}>{value as string}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScreenFrame>
  );
}

function HostScreen({ variant }: { variant: DesignVariant }) {
  const hostPods = designRidePods.slice(0, 3);

  return (
    <ScreenFrame id="host" label="Host dashboard" title="Book only when the pod is ready" variant={variant}>
      <div className="grid gap-3">
        {hostPods.map((pod) => (
          <div key={pod.id} className={cn("border p-4", variant.radius, variant.card)}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Pill variant={variant} tone={pod.status === "forming" ? "warning" : "success"}>
                  {pod.status.replace("_", " ")}
                </Pill>
                <h3 className="mt-2 font-black">{pod.title}</h3>
                <p className={cn("mt-1 text-sm", variant.muted)}>
                  Approved max fare {formatMoney(pod.maxFare)}. Host never chases members manually.
                </p>
              </div>
              <button className={cn("h-10 shrink-0 px-3 text-xs font-black", variant.radius, variant.button)}>
                Receipt
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className={cn("border p-3 text-sm", variant.radius, variant.mutedCard)}>
                <CreditCard className={cn("mb-2 h-4 w-4", variant.accentText)} />
                Payment check
              </div>
              <div className={cn("border p-3 text-sm", variant.radius, variant.mutedCard)}>
                <CarFront className={cn("mb-2 h-4 w-4", variant.accentText)} />
                Mark booked
              </div>
              <div className={cn("border p-3 text-sm", variant.radius, variant.mutedCard)}>
                <BadgeCheck className={cn("mb-2 h-4 w-4", variant.accentText)} />
                Complete pod
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScreenFrame>
  );
}

function ProfileScreen({ variant }: { variant: DesignVariant }) {
  const user = getCurrentUser();

  return (
    <ScreenFrame id="profile" label="Profile/trust" title="Trust profile and preferences" variant={variant}>
      <div className="grid gap-4 md:grid-cols-[0.8fr_1fr]">
        <div className={cn("border p-5", variant.radius, variant.mutedCard)}>
          <AvatarStack userIds={[user.id]} variant={variant} />
          <h3 className="mt-4 text-2xl font-black">{user.name}</h3>
          <p className={cn("mt-1 text-sm", variant.muted)}>
            Phone verified, email verified, no no-shows.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill variant={variant} tone="success">Trust {user.trustScore}</Pill>
            <Pill variant={variant} tone="success">{user.completedPods} completed pods</Pill>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Host reliability", `${user.hostReliability}%`, ShieldCheck],
            ["Payment method", "Mock Visa ready", CreditCard],
            ["Ride style", "Quiet first", Bell],
            ["Community rules", "No-show policy accepted", LockKeyhole],
          ].map(([label, value, Icon]) => (
            <div key={label as string} className={cn("border p-4", variant.radius, variant.card)}>
              <Icon className={cn("h-5 w-5", variant.accentText)} />
              <p className="mt-3 font-black">{label as string}</p>
              <p className={cn("mt-1 text-sm", variant.muted)}>{value as string}</p>
            </div>
          ))}
        </div>
      </div>
    </ScreenFrame>
  );
}

export function DesignVariationPage({ variant }: { variant: DesignVariant }) {
  const primaryPod = designRidePods[0];

  return (
    <Shell variant={variant}>
      <div className="grid gap-5">
        <section className={cn("border p-5 sm:p-6", variant.radius, variant.panel, variant.shadow)}>
          <div className="flex flex-wrap items-center gap-2">
            <Pill variant={variant} tone="accent">{variant.name}</Pill>
            <Pill variant={variant}>{variant.bestFor}</Pill>
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            {variant.headline}
          </h1>
          <p className={cn("mt-3 max-w-2xl text-base leading-7", variant.muted)}>{variant.subhead}</p>
          <p className={cn("mt-4 text-sm leading-6", variant.muted)}>{variantIntroCopy(variant)}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/designs" className={cn("inline-flex h-11 items-center gap-2 border px-4 text-sm font-black", variant.radius, variant.ghost)}>
              All designs
            </Link>
            <a href="#feed" className={cn("inline-flex h-11 items-center gap-2 px-4 text-sm font-black", variant.radius, variant.button)}>
              Review screens <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        <FeedScreen variant={variant} />
        <DetailScreen variant={variant} pod={primaryPod} />
        <CreateScreen variant={variant} />
        <JoinScreen variant={variant} pod={primaryPod} />
        <HostScreen variant={variant} />
        <ProfileScreen variant={variant} />

        <section className={cn("border p-4", variant.radius, variant.panel)}>
          <div className="flex items-start gap-3">
            <Sparkles className={cn("mt-1 h-5 w-5", variant.accentText)} />
            <p className={cn("text-sm leading-6", variant.muted)}>
              Design-only route. It uses the same RidePod mock data and preserves the MVP logic: planned pods, locked seats, mock deposits, payment authorization, host protection, waitlist replacement, and no-show rules.
            </p>
          </div>
        </section>
      </div>
    </Shell>
  );
}
