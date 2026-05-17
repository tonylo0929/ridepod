import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CalendarClock,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Home,
  Plus,
  Repeat2,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { formatMoney, getUser, type RidePod, type User } from "@/lib/mock-data";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const statusCopy: Record<RidePod["status"], { label: string; tone: string }> = {
  forming: {
    label: "Forming",
    tone: "bg-[var(--rp-badge-warning-bg)] text-[var(--rp-badge-warning-text)] ring-[var(--rp-border)]",
  },
  locked: {
    label: "Locked",
    tone: "bg-[var(--rp-badge-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]",
  },
  host_booking: {
    label: "Host booking",
    tone: "bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]",
  },
  booked: {
    label: "Booked",
    tone: "bg-[var(--rp-badge-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]",
  },
  completed: {
    label: "Completed",
    tone: "bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]",
  },
  cancelled: {
    label: "Cancelled",
    tone: "bg-[var(--rp-danger-bg)] text-[var(--rp-danger)] ring-[var(--rp-border)]",
  },
};

const accessModeLabels: Record<NonNullable<RidePod["accessMode"]>, string | null> = {
  open: null,
  verified_only: "Verified-only",
  community_only: "Community-only",
  high_trust_only: "High-trust-only",
  invite_only: "Invite-only",
};

const moneyStatusLabels: Record<NonNullable<RidePod["moneyStatus"]>, string> = {
  payment_needed: "Payment protected",
  seat_locked: "Seat locked",
  waiting_for_riders: "Waiting for riders",
  host_can_book: "Host can book",
  quote_approval_needed: "Quote approval needed",
  ride_booked: "Ride booked",
  receipt_pending: "Receipt pending",
  settlement_ready: "Settlement ready",
  host_replacement_needed: "Host replacement needed",
  dispute_review: "Dispute review",
};

function getDefaultMoneyStatus(pod: RidePod): NonNullable<RidePod["moneyStatus"]> {
  if (pod.status === "forming") return "waiting_for_riders";
  if (pod.status === "locked") return "seat_locked";
  if (pod.status === "host_booking") return "host_can_book";
  if (pod.status === "booked") return "ride_booked";
  if (pod.status === "completed") return "settlement_ready";
  return "dispute_review";
}

const recurringRideStatusLabels: Record<NonNullable<RidePod["upcomingRideInstances"]>[number]["status"], string> = {
  waiting_for_guests: "Waiting for guests",
  guests_locking: "Guests locking",
  quote_needed: "Quote needed",
  quote_under_review: "Quote under review",
  ready_to_book: "Ready to book",
  ride_booked: "Ride booked",
  ready_for_taxi_meter: "Ready for taxi meter",
  meter_proof_needed: "Meter proof needed",
  receipt_pending: "Receipt pending",
  settlement_ready: "Settlement ready",
  completed: "Completed",
};

const recurringRideChipLabels: Record<NonNullable<RidePod["upcomingRideInstances"]>[number]["status"], string> = {
  waiting_for_guests: "Locking",
  guests_locking: "Locking",
  quote_needed: "Quote needed",
  quote_under_review: "Under review",
  ready_to_book: "Ready to book",
  ride_booked: "Ride booked",
  ready_for_taxi_meter: "Taxi ready",
  meter_proof_needed: "Receipt pending",
  receipt_pending: "Receipt pending",
  settlement_ready: "Settled",
  completed: "Settled",
};

function getRecurringRideOptionLabel(pod: RidePod) {
  return pod.rideOption === "taxi_meter" || pod.vehicleType === "Taxi"
    ? "Taxi meter"
    : "Ride app / fixed quote";
}

function getRecurringProofCopy(pod: RidePod) {
  const nextRide = pod.upcomingRideInstances?.[0];
  const isTaxiMeter = getRecurringRideOptionLabel(pod) === "Taxi meter";

  if (isTaxiMeter) {
    return nextRide?.status === "meter_proof_needed" || nextRide?.status === "receipt_pending"
      ? "Upload meter proof after ride."
      : "No upfront quote needed.";
  }

  if (nextRide?.status === "quote_needed") {
    return "Upload quote before booking.";
  }

  if (nextRide?.status === "ready_to_book" || nextRide?.status === "ride_booked") {
    return "Quote approved. Host can book.";
  }

  return "Quote needed after guests lock.";
}

function getRecurringPrimaryAction(pod: RidePod) {
  const nextRide = pod.upcomingRideInstances?.[0];
  const isTaxiMeter = getRecurringRideOptionLabel(pod) === "Taxi meter";

  if (!nextRide) {
    return { label: "Review recurring pod", href: `/pods/${pod.id}` };
  }

  const instanceHref = `/host?rideInstanceId=${encodeURIComponent(nextRide.id)}`;

  if (isTaxiMeter && (nextRide.status === "meter_proof_needed" || nextRide.status === "receipt_pending")) {
    return { label: "Upload meter proof", href: instanceHref };
  }

  if (nextRide.status === "quote_needed") {
    return { label: "Upload quote", href: instanceHref };
  }

  if (nextRide.status === "ready_to_book") {
    return { label: "Mark booked", href: instanceHref };
  }

  if (nextRide.status === "receipt_pending" || nextRide.status === "settlement_ready" || nextRide.status === "completed") {
    return { label: "View settlement", href: instanceHref };
  }

  return { label: "View pod", href: `/pods/${pod.id}` };
}

function getRecurringRouteTitle(pod: RidePod) {
  if (pod.title.includes("↔")) return pod.title;
  return pod.recurringPattern === "back_and_forth"
    ? `${pod.fromLabel} ↔ ${pod.toLabel}`
    : `${pod.fromLabel} → ${pod.toLabel}`;
}

function RecurringPodCard({ pod, compact = false }: { pod: RidePod; compact?: boolean }) {
  const host = getUser(pod.hostUserId);
  const progress = (pod.seatsFilled / pod.seatsTotal) * 100;
  const remaining = pod.seatsTotal - pod.seatsFilled;
  const nextRide = pod.upcomingRideInstances?.[0] ?? null;
  const upcomingRides = pod.upcomingRideInstances?.slice(0, 5) ?? [];
  const primaryAction = getRecurringPrimaryAction(pod);
  const rideOptionLabel = getRecurringRideOptionLabel(pod);
  const patternLabel = pod.recurringPattern === "back_and_forth" ? "Back-and-forth" : "One-way";

  return (
    <article className="overflow-hidden rounded-[26px] border border-[var(--rp-border)] bg-[var(--rp-card)] shadow-[var(--rp-shadow-soft)]">
      <div className="bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_20%,transparent),transparent_36%),var(--rp-card)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]">
                Recurring
              </Badge>
              <Badge className="bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]">
                Weekly
              </Badge>
              <Badge className="bg-[var(--rp-card-muted)] text-[var(--rp-primary)] ring-[var(--rp-border)]">
                {patternLabel}
              </Badge>
            </div>
            <h2 className="mt-4 text-2xl font-black leading-tight text-[var(--rp-text)]">
              {getRecurringRouteTitle(pod)}
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
              {pod.recurringScheduleLine ?? `${pod.recurrenceRule ?? "Weekly"} · ${pod.time}`}
            </p>
            <p className="mt-1 text-xs font-bold text-[var(--rp-muted)]">
              Selected days: {pod.recurringDays?.join(", ") ?? pod.recurrenceRule ?? "Weekly"}
            </p>
          </div>
          <div className="rounded-[18px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 py-3 text-left sm:text-right">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Next ride</p>
            <p className="mt-1 text-sm font-black leading-6 text-[var(--rp-text)]">
              {nextRide
                ? `${nextRide.displayDate} · ${nextRide.departureTime} · ${nextRide.legType === "return" ? "Return" : "Outbound"}`
                : "No upcoming rides"}
            </p>
            <p className="mt-1 text-xs font-bold text-[var(--rp-muted)]">
              {nextRide ? recurringRideStatusLabels[nextRide.status] : "Check the recurring schedule or create a new ride date."}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 min-[720px]:grid-cols-3">
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <Repeat2 className="h-5 w-5 text-[var(--rp-primary)]" />
            <p className="mt-2 text-sm font-black text-[var(--rp-text)]">{rideOptionLabel}</p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted)]">{getRecurringProofCopy(pod)}</p>
          </div>
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <Users className="h-5 w-5 text-[var(--rp-primary)]" />
            <p className="mt-2 text-sm font-black text-[var(--rp-text)]">
              {pod.seatsFilled}/{pod.seatsTotal} guests locked
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted)]">
              {remaining > 0 ? `${remaining} open` : "Full"} for the template.
            </p>
          </div>
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <ShieldCheck className="h-5 w-5 text-[var(--rp-primary)]" />
            <p className="mt-2 text-sm font-black text-[var(--rp-text)]">Protection status</p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted)]">
              {pod.protectionStatus ?? "Each ride settles separately"}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">
            <span>Guest lock</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <div className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-[var(--rp-text)]">Next ride preview</h3>
            <p className="text-xs font-bold text-[var(--rp-primary)]">Each ride settles separately</p>
          </div>
          {upcomingRides.length ? (
            <div className="mt-3 grid gap-2">
              {upcomingRides.map((ride) => (
                <div
                  key={ride.id}
                  className="grid gap-2 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3 min-[560px]:grid-cols-[1fr_auto] min-[560px]:items-center"
                >
                  <div>
                    <p className="text-sm font-black text-[var(--rp-text)]">
                      {ride.displayDate} · {ride.departureTime} · {ride.legType === "return" ? "Return" : "Outbound"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[var(--rp-muted)]">
                      {ride.originLabel} → {ride.destinationLabel}
                    </p>
                  </div>
                  <Badge className="w-fit bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]">
                    {recurringRideChipLabels[ride.status]}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3">
              <p className="text-sm font-black text-[var(--rp-text)]">No upcoming rides</p>
              <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted)]">
                Check the recurring schedule or create a new ride date.
              </p>
            </div>
          )}
        </div>

        {!compact ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rp-border)] pt-4">
            <div className="flex items-center gap-2">
              <Avatar user={host} size="sm" />
              <div>
                <p className="text-xs font-black text-[var(--rp-text)]">{host.name}</p>
                <p className="text-xs font-bold text-[var(--rp-muted)]">Trust {host.trustScore}</p>
              </div>
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_28px_color-mix(in_srgb,var(--rp-primary)_18%,transparent)] transition hover:brightness-105"
              href={primaryAction.href}
              style={{ background: "var(--rp-gradient-primary)" }}
            >
              {primaryAction.label} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: RidePod["status"] }) {
  const meta = statusCopy[status];
  return <Badge className={meta.tone}>{meta.label}</Badge>;
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

type ButtonBaseProps = {
  children: React.ReactNode;
  className?: string;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ children, className, href, type = "button", ...props }: ButtonBaseProps) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_28px_rgba(0,124,137,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className, href, type = "button", ...props }: ButtonBaseProps) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-5 text-sm font-black text-[var(--rp-primary)] shadow-[var(--rp-shadow-soft)] transition hover:bg-[var(--rp-card-muted)] disabled:cursor-not-allowed disabled:opacity-55",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}

export function Stepper({
  steps,
  currentStep,
}: {
  steps: Array<{ label: string; icon?: LucideIcon }>;
  currentStep: number;
}) {
  return (
    <div className="grid grid-cols-[repeat(var(--step-count),minmax(0,1fr))] gap-0" style={{ "--step-count": steps.length } as React.CSSProperties}>
      {steps.map(({ label, icon: Icon }, index) => {
        const complete = index < currentStep;
        const active = index === currentStep;

        return (
          <div key={label} className="relative grid place-items-center gap-2 text-center">
            {index > 0 ? (
              <div
                className={cn(
                  "absolute left-[-50%] right-[50%] top-4 h-px",
                  complete || active ? "bg-[var(--rp-primary)]" : "bg-[var(--rp-border)]",
                )}
              />
            ) : null}
            <div
              className={cn(
                "relative z-10 grid h-8 w-8 place-items-center rounded-full border text-xs font-black",
                complete || active
                  ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                  : "border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-muted)]",
              )}
            >
              {complete ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : Icon ? (
                <Icon className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span
              className={cn(
                "text-[11px] font-bold",
                complete || active ? "text-[var(--rp-primary)]" : "text-[var(--rp-muted)]",
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[var(--rp-card-muted)]">
      <div
        className="h-full rounded-full bg-[var(--rp-primary)]"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Avatar({ user, size = "md" }: { user: User; size?: "sm" | "md" | "lg" }) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-zinc-900 text-white ring-2 ring-white",
        size === "sm" && "h-8 w-8 text-xs",
        size === "md" && "h-10 w-10 text-sm",
        size === "lg" && "h-14 w-14 text-lg",
      )}
    >
      {initials}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-emerald-700" />
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-950">{value}</p>
    </div>
  );
}

export function PodCard({ pod, compact = false }: { pod: RidePod; compact?: boolean }) {
  if (pod.type === "recurring") {
    return <RecurringPodCard pod={pod} compact={compact} />;
  }

  const host = getUser(pod.hostUserId);
  const progress = (pod.seatsFilled / pod.seatsTotal) * 100;
  const remaining = pod.seatsTotal - pod.seatsFilled;
  const reviewHref = pod.status === "completed" ? `/pods/${pod.id}/review` : null;
  const genderLabel = pod.genderMode === "women_only" ? "Women-only" : "Mixed pod";
  const accessLabel = accessModeLabels[pod.accessMode ?? "open"];
  const moneyLabel = moneyStatusLabels[pod.moneyStatus ?? getDefaultMoneyStatus(pod)];

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={pod.status} />
            <Badge className="bg-zinc-50 text-zinc-700 ring-zinc-200">
              Scheduled
            </Badge>
          </div>
          <h2 className="mt-3 text-lg font-bold tracking-tight text-zinc-950">
            {pod.title}
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge className="bg-emerald-50 text-emerald-800 ring-emerald-200">
              {genderLabel}
            </Badge>
            {accessLabel ? (
              <Badge className="bg-sky-50 text-sky-800 ring-sky-200">
                {accessLabel}
              </Badge>
            ) : null}
            <Badge className="bg-amber-50 text-amber-900 ring-amber-200">
              {moneyLabel}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-zinc-500">Est. share</p>
          <p className="text-xl font-bold text-zinc-950">
            {formatMoney(pod.estimatedShare)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-zinc-700">
        <div className="flex items-start gap-3">
          <Car className="mt-0.5 h-4 w-4 text-zinc-500" />
          <div>
            <p className="font-semibold text-zinc-950">
              {pod.fromLabel} to {pod.toLabel}
            </p>
            <p>
              {pod.pickupHub} to {pod.dropoffHub}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock3 className="h-4 w-4 text-zinc-500" />
          <p>
            {pod.date} at {pod.time} <span className="text-zinc-500">({pod.timeFlexibility})</span>
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-zinc-600">
          <span>
            {pod.seatsFilled}/{pod.seatsTotal} seats owned
          </span>
          <span>{remaining > 0 ? `${remaining} open` : "Full"}</span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {!compact ? (
        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
          <div className="flex items-center gap-2">
            <Avatar user={host} size="sm" />
            <div>
              <p className="text-xs font-semibold text-zinc-950">{host.name}</p>
              <p className="text-xs text-zinc-500">Trust {host.trustScore}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {reviewHref ? (
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--rp-border-strong)] px-3 text-sm font-semibold text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
                href={reviewHref}
              >
                Rate pod
              </Link>
            ) : null}
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              href={`/pods/${pod.id}`}
            >
              View <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function RuleCard() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-700" />
        <h2 className="font-bold text-zinc-950">Protected pod rules</h2>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-zinc-700">
        <p>Every seat needs a financial owner before the host books the ride.</p>
        <p>You are not charged final fare until the pod is locked and ride is completed.</p>
        <p>If fare is above the approved max, the group must re-approve before booking.</p>
        <p>After lock, cancellations and no-shows may still be responsible for the seat.</p>
      </div>
    </div>
  );
}

export function Timeline({ status }: { status: RidePod["status"] }) {
  const steps = ["Forming", "Payment locked", "Host books", "Pickup", "Settlement"];
  const activeIndex =
    status === "forming"
      ? 0
      : status === "locked"
        ? 1
        : status === "host_booking"
          ? 2
          : status === "booked"
            ? 3
            : 4;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold text-zinc-950">Pod timeline</h2>
      <div className="mt-4 grid gap-3">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3">
            <div
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-bold",
                index <= activeIndex
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-zinc-200 bg-white text-zinc-400",
              )}
            >
              {index + 1}
            </div>
            <p
              className={cn(
                "text-sm font-semibold",
                index <= activeIndex ? "text-zinc-950" : "text-zinc-400",
              )}
            >
              {step}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  href,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-emerald-700" />
      <h2 className="mt-3 text-lg font-bold text-zinc-950">{title}</h2>
      <p className="mt-2 text-sm text-zinc-600">{body}</p>
      <Link
        href={href}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white"
      >
        {action}
      </Link>
    </div>
  );
}

export const Icons = {
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Home,
  Plus,
  Repeat2,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
};
