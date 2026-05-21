import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CalendarClock,
  Car,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Home,
  LayoutGrid,
  Plus,
  Repeat2,
  ReceiptText,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { formatMoney, getUser, type RecurringRideInstancePreview, type RidePod, type User } from "@/lib/mock-data";
import {
  getTaxiPartnerQuoteDisplayStatus,
  getTaxiPartnerQuoteRequest,
  type TaxiPartnerQuoteDisplayStatus,
} from "@/lib/taxi-partner-quote";

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

function getRecurringRideOptionLabel(pod: RidePod) {
  if (pod.rideOption === "taxi_partner_quote") return "Taxi partner quote";

  return pod.rideOption === "taxi_meter" || pod.vehicleType === "Taxi"
    ? "Taxi meter"
    : "Ride app / fixed quote";
}
function getRecurringRouteTitle(pod: RidePod) {
  return `${pod.fromLabel} \u2192 ${pod.toLabel}`;
}

type RideInstanceDisplayStatus = {
  label: string;
  chipClassName: string;
  cardClassName: string;
  helperText: string;
  primaryActionLabel: string;
  primaryActionTarget: string;
  bucket: "quote_needed" | "ready_to_book" | "ride_booked" | "receipt_needed" | "settlement_ready" | "closed";
};

const rideInstanceStatusTones = {
  gold: {
    chip: "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]",
    card: "border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-primary)_8%,var(--rp-card))] text-[var(--rp-primary)]",
  },
  green: {
    chip: "bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]",
    card: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  },
  purple: {
    chip: "bg-violet-400/10 text-violet-300 ring-violet-400/25",
    card: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  },
  orange: {
    chip: "bg-[var(--rp-danger-bg)] text-[var(--rp-danger)] ring-[var(--rp-border)]",
    card: "border-orange-400/20 bg-orange-400/10 text-orange-300",
  },
  amber: {
    chip: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
    card: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  },
  blue: {
    chip: "bg-sky-400/10 text-sky-300 ring-sky-400/25",
    card: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  },
  red: {
    chip: "bg-red-400/10 text-red-300 ring-red-400/25",
    card: "border-red-400/20 bg-red-400/10 text-red-300",
  },
  gray: {
    chip: "bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]",
    card: "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
  },
};

function getTaxiPartnerQuoteTone(tone: TaxiPartnerQuoteDisplayStatus["tone"]) {
  return rideInstanceStatusTones[tone];
}

function getTaxiPartnerQuoteBucket(label: string): RideInstanceDisplayStatus["bucket"] {
  if (label === "Closed" || label === "Payout denied" || label === "Dispute resolved") return "closed";
  if (
    label === "Payout pending" ||
    label === "Payout ready" ||
    label === "Dispute review" ||
    label === "More info needed" ||
    label === "Under review" ||
    label === "Ride completed"
  ) {
    return "settlement_ready";
  }
  if (label === "Ready for taxi partner" || label === "Guests accepting") return "ready_to_book";

  return "quote_needed";
}

type StatusOverviewItem = {
  key: string;
  count: number;
  label: string;
  helper: string;
  icon: LucideIcon;
  className: string;
};

function getTaxiPartnerOverviewIcon(bucket: RideInstanceDisplayStatus["bucket"]) {
  if (bucket === "ready_to_book") return CheckCircle2;
  if (bucket === "ride_booked") return Car;
  if (bucket === "receipt_needed") return ReceiptText;
  if (bucket === "settlement_ready") return WalletCards;
  if (bucket === "closed") return ShieldCheck;

  return FileText;
}

export function getRideInstanceDisplayStatus(
  rideInstance: RecurringRideInstancePreview,
  pod: RidePod,
): RideInstanceDisplayStatus {
  const rideOptionLabel = getRecurringRideOptionLabel(pod);
  const taxiMeter = rideOptionLabel === "Taxi meter";
  const taxiPartnerQuote = rideOptionLabel === "Taxi partner quote";
  const instanceHref = `/host?rideInstanceId=${encodeURIComponent(rideInstance.id)}`;
  const guestTaxiPartnerHref = `/pods/${pod.id}?rideInstanceId=${encodeURIComponent(rideInstance.id)}`;

  if (taxiPartnerQuote) {
    const quoteDisplayStatus = getTaxiPartnerQuoteDisplayStatus(
      getTaxiPartnerQuoteRequest(rideInstance.taxiPartnerQuoteRequestId),
    );
    const tone = getTaxiPartnerQuoteTone(quoteDisplayStatus.tone);

    return {
      label: quoteDisplayStatus.label,
      chipClassName: tone.chip,
      cardClassName: tone.card,
      helperText: quoteDisplayStatus.helperText,
      primaryActionLabel: quoteDisplayStatus.primaryActionLabel,
      primaryActionTarget:
        quoteDisplayStatus.primaryActionTarget ??
        (["Quote received", "Guests accepting", "Ready for taxi partner"].includes(quoteDisplayStatus.label)
          ? guestTaxiPartnerHref
          : instanceHref),
      bucket: getTaxiPartnerQuoteBucket(quoteDisplayStatus.label),
    };
  }

  if (rideInstance.settlementState === "PAID" || rideInstance.payoutState === "PAID") {
    return {
      label: "Closed",
      chipClassName: rideInstanceStatusTones.gray.chip,
      cardClassName: rideInstanceStatusTones.gray.card,
      helperText: "Settlement complete. Payout processed.",
      primaryActionLabel: "View receipt",
      primaryActionTarget: instanceHref,
      bucket: "closed",
    };
  }

  if (rideInstance.settlementState === "DISPUTE_REVIEW" || rideInstance.payoutState === "HELD_FOR_REVIEW") {
    return {
      label: "Dispute review",
      chipClassName: rideInstanceStatusTones.blue.chip,
      cardClassName: rideInstanceStatusTones.blue.card,
      helperText: "Payout is held while RidePod reviews this ride.",
      primaryActionLabel: "View settlement",
      primaryActionTarget: instanceHref,
      bucket: "settlement_ready",
    };
  }

  if (
    rideInstance.status === "settlement_ready" ||
    ((rideInstance.proofType === "FINAL_RECEIPT" || rideInstance.proofType === "METER_PROOF") &&
      rideInstance.proofStatus === "VERIFIED")
  ) {
    return {
      label: "Settlement ready",
      chipClassName: rideInstanceStatusTones.blue.chip,
      cardClassName: rideInstanceStatusTones.blue.card,
      helperText: "Proof verified. Dispute window is open.",
      primaryActionLabel: "View settlement",
      primaryActionTarget: instanceHref,
      bucket: "settlement_ready",
    };
  }

  if (taxiMeter) {
    if (rideInstance.status === "meter_proof_submitted" || rideInstance.status === "meter_proof_under_review") {
      return {
        label: "Meter proof under review",
        chipClassName: rideInstanceStatusTones.orange.chip,
        cardClassName: rideInstanceStatusTones.orange.card,
        helperText: "Meter proof submitted. RidePod will review it before settlement.",
        primaryActionLabel: "View ride",
        primaryActionTarget: instanceHref,
        bucket: "receipt_needed",
      };
    }

    if (rideInstance.status === "meter_proof_needed") {
      return {
        label: "Meter proof needed",
        chipClassName: rideInstanceStatusTones.orange.chip,
        cardClassName: rideInstanceStatusTones.orange.card,
        helperText: "Upload meter proof after the ride.",
        primaryActionLabel: "Upload meter proof",
        primaryActionTarget: instanceHref,
        bucket: "receipt_needed",
      };
    }

    return {
      label: "Ready for taxi meter",
      chipClassName: rideInstanceStatusTones.green.chip,
      cardClassName: rideInstanceStatusTones.green.card,
      helperText: "No upfront quote needed.",
      primaryActionLabel: "View ride",
      primaryActionTarget: instanceHref,
      bucket: "ready_to_book",
    };
  }

  if (
    rideInstance.status === "receipt_pending" ||
    rideInstance.status === "completed"
  ) {
    return {
      label: "Receipt needed",
      chipClassName: rideInstanceStatusTones.orange.chip,
      cardClassName: rideInstanceStatusTones.orange.card,
      helperText: "Upload the final receipt for settlement.",
      primaryActionLabel: "Upload receipt",
      primaryActionTarget: instanceHref,
      bucket: "receipt_needed",
    };
  }

  if (rideInstance.status === "receipt_submitted" || rideInstance.status === "receipt_under_review") {
    return {
      label: "Receipt under review",
      chipClassName: rideInstanceStatusTones.orange.chip,
      cardClassName: rideInstanceStatusTones.orange.card,
      helperText: "Receipt submitted. RidePod will review it before settlement.",
      primaryActionLabel: "View ride",
      primaryActionTarget: instanceHref,
      bucket: "receipt_needed",
    };
  }

  if (rideInstance.status === "ride_booked") {
    return {
      label: "Ride booked",
      chipClassName: rideInstanceStatusTones.purple.chip,
      cardClassName: rideInstanceStatusTones.purple.card,
      helperText: "Stay coordinated with guests.",
      primaryActionLabel: "Open chat",
      primaryActionTarget: instanceHref,
      bucket: "ride_booked",
    };
  }

  if (rideInstance.status === "ready_to_book" || rideInstance.proofStatus === "APPROVED") {
    return {
      label: "Ready to book",
      chipClassName: rideInstanceStatusTones.green.chip,
      cardClassName: rideInstanceStatusTones.green.card,
      helperText: "Quote approved. Mark the ride as booked.",
      primaryActionLabel: "Mark booked",
      primaryActionTarget: instanceHref,
      bucket: "ready_to_book",
    };
  }

  if (rideInstance.status === "quote_under_review") {
    return {
      label: "Quote under review",
      chipClassName: rideInstanceStatusTones.gold.chip,
      cardClassName: rideInstanceStatusTones.gold.card,
      helperText: "Quote submitted. RidePod will review it before booking.",
      primaryActionLabel: "View ride",
      primaryActionTarget: instanceHref,
      bucket: "quote_needed",
    };
  }

  return {
    label: "Quote needed",
    chipClassName: rideInstanceStatusTones.gold.chip,
    cardClassName: rideInstanceStatusTones.gold.card,
    helperText: "Upload a fresh quote before booking.",
    primaryActionLabel: "Upload quote",
    primaryActionTarget: instanceHref,
    bucket: "quote_needed",
  };
}

function getStatusOverviewItems(pod: RidePod): StatusOverviewItem[] {
  const rideOptionLabel = getRecurringRideOptionLabel(pod);
  const taxiMeter = rideOptionLabel === "Taxi meter";
  const taxiPartnerQuote = rideOptionLabel === "Taxi partner quote";
  const counts = {
    quote_needed: 0,
    ready_to_book: 0,
    ride_booked: 0,
    receipt_needed: 0,
    settlement_ready: 0,
    closed: 0,
  };

  for (const ride of pod.upcomingRideInstances ?? []) {
    counts[getRideInstanceDisplayStatus(ride, pod).bucket] += 1;
  }

  if (taxiPartnerQuote) {
    const groupedStatuses = new Map<string, StatusOverviewItem>();

    for (const ride of pod.upcomingRideInstances ?? []) {
      const status = getRideInstanceDisplayStatus(ride, pod);
      const existing = groupedStatuses.get(status.label);

      if (existing) {
        existing.count += 1;
      } else {
        groupedStatuses.set(status.label, {
          key: status.label,
          count: 1,
          label: status.label,
          helper: status.helperText,
          icon: getTaxiPartnerOverviewIcon(status.bucket),
          className: status.cardClassName,
        });
      }
    }

    return Array.from(groupedStatuses.values());
  }

  return [
    {
      key: "quote_needed",
      count: counts.quote_needed,
      label: taxiPartnerQuote ? "Partner quote needed" : "Quote needed",
      helper: taxiPartnerQuote
        ? "Request a quote from a licensed taxi partner."
        : taxiMeter ? "No upfront quote needed for taxi meter rides." : "Upload a fresh quote before booking.",
      icon: FileText,
      className: rideInstanceStatusTones.gold.card,
    },
    {
      key: "ready_to_book",
      count: counts.ready_to_book,
      label: taxiPartnerQuote ? "Ready for taxi partner" : taxiMeter ? "Ready for taxi meter" : "Ready to book",
      helper: taxiPartnerQuote
        ? "Guests accept the shared pod quote before the ride proceeds."
        : taxiMeter ? "No upfront quote needed." : "Quote approved. Mark the ride as booked.",
      icon: CheckCircle2,
      className: rideInstanceStatusTones.green.card,
    },
    {
      key: "ride_booked",
      count: counts.ride_booked,
      label: "Ride booked",
      helper: "Stay coordinated with guests.",
      icon: Car,
      className: rideInstanceStatusTones.purple.card,
    },
    {
      key: "receipt_needed",
      count: counts.receipt_needed,
      label: taxiPartnerQuote ? "Payout pending" : taxiMeter ? "Meter proof needed" : "Receipt needed",
      helper: taxiPartnerQuote
        ? "Payout after dispute window in this future beta prototype."
        : taxiMeter ? "Upload meter proof after the ride." : "Upload the final receipt for settlement.",
      icon: ReceiptText,
      className: rideInstanceStatusTones.orange.card,
    },
    {
      key: "settlement_ready",
      count: counts.settlement_ready,
      label: "Settlement ready",
      helper: "Proof verified. Dispute window is open.",
      icon: WalletCards,
      className: rideInstanceStatusTones.blue.card,
    },
    {
      key: "closed",
      count: counts.closed,
      label: "Closed",
      helper: "Settlement complete. Payout processed.",
      icon: ShieldCheck,
      className: rideInstanceStatusTones.gray.card,
    },
  ];
}

function formatRecurringRideLine(rideInstance: RecurringRideInstancePreview) {
  return rideInstance.displayDate.replace(/^(\w+)\s+(.+)$/, "$2 - $1");
}

function RecurringPodCard({ pod, compact = false }: { pod: RidePod; compact?: boolean }) {
  const nextRide = pod.upcomingRideInstances?.[0] ?? null;
  const upcomingRides = pod.upcomingRideInstances?.slice(1, 5) ?? [];
  const nextRideStatus = nextRide ? getRideInstanceDisplayStatus(nextRide, pod) : null;
  const scheduleLine =
    pod.recurringScheduleLine ?? `Every ${pod.recurringDays?.join(", ") ?? "Tue"} - Outbound ${pod.outboundTime ?? pod.time}`;

  return (
    <article className="grid gap-4">
      <Link
        href={`/pods/${pod.id}`}
        className="group rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)] transition hover:border-[var(--rp-border-strong)]"
      >
        <div className="grid grid-cols-[1fr_auto] items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-black text-[var(--rp-text)]">{getRecurringRouteTitle(pod)}</h2>
              <Badge className="bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]">Weekly</Badge>
            </div>
            <p className="mt-2 text-xs font-bold text-[var(--rp-muted-strong)]">{scheduleLine}</p>
            <p className="mt-1 text-xs font-bold text-[var(--rp-muted)]">Each ride settles separately</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted-strong)]">
              <Users className="h-4 w-4 text-[var(--rp-primary)]" />
              {pod.seatsFilled} / {pod.seatsTotal} seats locked
            </p>
          </div>
          <ArrowRight className="mt-3 h-5 w-5 text-[var(--rp-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--rp-primary)]" />
        </div>
      </Link>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-black text-[var(--rp-text)]">
            <LayoutGrid className="h-4 w-4 text-[var(--rp-primary)]" />
            Status overview
          </h3>
          <button type="button" className="text-xs font-bold text-[var(--rp-muted-strong)]">This week</button>
        </div>
        <div className="grid grid-cols-2 gap-3 min-[720px]:grid-cols-3">
          {getStatusOverviewItems(pod).map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className={cn("rounded-[18px] border p-3 shadow-[var(--rp-shadow-soft)]", item.className)}>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <p className="text-2xl font-black leading-none">{item.count}</p>
                </div>
                <p className="mt-3 text-sm font-black">{item.label}</p>
                <p className="mt-2 text-[11px] font-semibold leading-4 text-[var(--rp-muted-strong)]">{item.helper}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black text-[var(--rp-muted-strong)]">Next ride</p>
          {nextRideStatus ? <Badge className={nextRideStatus.chipClassName}>{nextRideStatus.label}</Badge> : null}
        </div>
        {nextRide && nextRideStatus ? (
          <>
            <div className="mt-3 grid grid-cols-[1fr_auto] items-start gap-3">
              <div>
                <p className="text-xl font-black text-[var(--rp-text)]">
                  {formatRecurringRideLine(nextRide)} - {nextRide.departureTime}
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">
                  {nextRide.legType === "return" ? "Return" : "Outbound"} - {nextRide.originLabel}
                  {" \u2192 "}
                  {nextRide.destinationLabel}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-black text-[var(--rp-muted-strong)]">
                  <Users className="h-4 w-4 text-[var(--rp-primary)]" />
                  {pod.seatsFilled} / {pod.seatsTotal} seats locked
                </p>
              </div>
              <ArrowRight className="mt-2 h-5 w-5 text-[var(--rp-muted)]" />
            </div>
            {!compact ? (
              <>
                <div className="mt-4 border-t border-[var(--rp-border)] pt-4">
                  <p className="text-xs font-bold text-[var(--rp-muted)]">Next action</p>
                  <p className="mt-1 text-lg font-black text-[var(--rp-text)]">{nextRideStatus.primaryActionLabel}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">{nextRideStatus.helperText}</p>
                </div>
                <Link
                  href={nextRideStatus.primaryActionTarget}
                  className="mt-4 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[16px] px-5 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_16px_34px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
                  style={{ background: "var(--rp-gradient-primary)" }}
                >
                  {nextRideStatus.primaryActionLabel} <Upload className="h-5 w-5" />
                </Link>
              </>
            ) : null}
          </>
        ) : (
          <div className="mt-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <p className="text-sm font-black text-[var(--rp-text)]">No upcoming rides</p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted)]">
              Check the recurring schedule or create a new ride date.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-[var(--rp-text)]">Upcoming rides</h3>
          <Link href={`/pods/${pod.id}`} className="text-xs font-black text-[var(--rp-primary)]">View all</Link>
        </div>
        {upcomingRides.length ? (
          <div className="grid gap-2">
            {upcomingRides.map((ride) => {
              const status = getRideInstanceDisplayStatus(ride, pod);
              return (
                <Link
                  key={ride.id}
                  href={status.primaryActionTarget}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 transition hover:bg-[var(--rp-card-muted)]"
                >
                  <CalendarClock className="h-4 w-4 text-[var(--rp-muted-strong)]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[var(--rp-text)]">
                      {formatRecurringRideLine(ride)} - {ride.departureTime}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-[var(--rp-muted)]">
                      {ride.legType === "return" ? "Return" : "Outbound"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("shrink-0", status.chipClassName)}>{status.label}</Badge>
                    <ArrowRight className="h-4 w-4 text-[var(--rp-muted)]" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <p className="text-sm font-black text-[var(--rp-text)]">No upcoming rides</p>
            <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted)]">
              Check the recurring schedule or create a new ride date.
            </p>
          </div>
        )}
      </section>
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
            {pod.seatsFilled}/{pod.seatsTotal} seats locked
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
