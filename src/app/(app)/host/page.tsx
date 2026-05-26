import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ReceiptText,
  ShieldCheck,
  Upload,
  UsersRound,
} from "lucide-react";
import { Badge, ProgressBar, StatusBadge, cn, getRideInstanceDisplayStatus } from "@/components/ui";
import { RecurringInstanceProofFlow } from "@/components/recurring-instance-proof-flow";
import { TaxiPartnerQuoteRequestCard } from "@/components/taxi-partner-quote-request-card";
import { TaxiPartnerCompletionCard } from "@/components/taxi-partner-completion-card";
import {
  currentUserId,
  formatMoney,
  getHostedPods,
  getUser,
  type RecurringRideInstancePreview,
  type RidePod,
} from "@/lib/mock-data";
import { HostQuoteUploadPanel } from "@/components/money-safety-ui";
import { getRideInstanceDetailWithFallback } from "@/lib/supabase/ride-instance-detail";
import { PublicMemberCard } from "@/components/public-member-card";
import { mapMemberToPublicProfileViewModel } from "@/lib/public-profile";
import {
  getTaxiPartnerQuoteRequest,
  type TaxiPartnerQuoteRequest,
  type TaxiPartnerTaxiType,
} from "@/lib/taxi-partner-quote";

type HostRideInstanceStatus = ReturnType<typeof getRideInstanceDisplayStatus>;

const taxiFirstTaxiTypeLabels: Record<TaxiPartnerTaxiType, string> = {
  STANDARD: "Standard taxi",
  ELECTRIC: "Electric taxi",
  LUGGAGE_FRIENDLY: "Luggage-friendly",
  LARGE: "Large / van",
  COMFORT: "Comfort",
  ACCESSIBLE: "Accessible taxi",
};

const accessModeLabels: Record<NonNullable<RidePod["accessMode"]>, string | null> = {
  open: null,
  verified_only: "Verified-only",
  community_only: "Community-only",
  high_trust_only: "High-trust-only",
  invite_only: "Invite-only",
};

function getReadyMembers(pod: RidePod) {
  return pod.members.filter(
    (member) => member.paymentStatus === "authorized" || member.paymentStatus === "charged",
  ).length;
}

function getHostAction(pod: RidePod) {
  const isTaxiPartnerQuote = pod.rideOption === "taxi_partner_quote";
  const isTaxiMeter = pod.rideOption === "taxi_meter" || pod.vehicleType === "Taxi";
  const nextRide = pod.upcomingRideInstances?.[0];

  if (isTaxiPartnerQuote && nextRide) {
    return getRideInstanceDisplayStatus(nextRide, pod).primaryActionLabel;
  }

  if (pod.moneyStatus === "host_replacement_needed") {
    return "Confirm backup host";
  }

  if (!isTaxiMeter && pod.moneyStatus === "quote_approval_needed") {
    return "Review higher quote";
  }

  if (pod.moneyStatus === "host_can_book" || pod.status === "host_booking") {
    return isTaxiMeter ? "Taxi meter ready" : "Book external ride";
  }

  if (pod.moneyStatus === "receipt_pending" || pod.status === "booked") {
    return isTaxiMeter ? "Upload meter proof" : "Upload receipt";
  }

  if (pod.moneyStatus === "settlement_ready" || pod.status === "completed") {
    return "Review settlement";
  }

  return "Monitor payments";
}

function getTaxiPartnerRequestForRide(pod: RidePod, ride: RecurringRideInstancePreview | null) {
  const requestFromRide = getTaxiPartnerQuoteRequest(ride?.taxiPartnerQuoteRequestId);
  if (requestFromRide) return requestFromRide;

  const rideWithRequest = pod.upcomingRideInstances?.find((candidate) => candidate.taxiPartnerQuoteRequestId);
  return getTaxiPartnerQuoteRequest(rideWithRequest?.taxiPartnerQuoteRequestId) ?? null;
}

function getTaxiTypeLabel(request: TaxiPartnerQuoteRequest | null) {
  return request ? taxiFirstTaxiTypeLabels[request.requestedTaxiType] : "Standard taxi";
}

function getLuggageLabel(request: TaxiPartnerQuoteRequest | null) {
  if (!request || request.luggageCount == null) return "Not specified";
  return `${request.luggageCount} large luggage`;
}

function getAccessibilityLabel(request: TaxiPartnerQuoteRequest | null) {
  const needs = [
    request?.wheelchairAccessibleRequested ? "Accessible taxi requested" : null,
    request?.stepFreeSupportRequested ? "Step-free support" : null,
    request?.extraSpaceNeeded ? "Extra space" : null,
  ].filter(Boolean);

  return needs.length ? needs.join(", ") : "Not specified";
}

function getTaxiPartnerNextActionCopy(status: HostRideInstanceStatus | null) {
  switch (status?.label) {
    case "Taxi quote needed":
    case "Partner declined":
      return {
        title: "Next action: Request taxi quote",
        body: "Guests are locked. Request one shared quote from a licensed taxi partner.",
      };
    case "Quote received":
      return {
        title: "Next action: Send quote to guests",
        body: "Taxi partner quoted one shared price. Guests need to accept before the ride proceeds.",
      };
    case "Guests accepting":
      return {
        title: "Waiting for guests",
        body: "Guests are reviewing the taxi partner quote.",
      };
    case "Ready for pickup":
    case "Taxi partner arrived":
    case "Ride started":
      return {
        title: "Taxi partner ready",
        body: "The quote is accepted. Coordinate pickup with the group.",
      };
    case "Payout pending":
    case "Ride completed":
      return {
        title: "Payout pending",
        body: "Ride completed. Payout waits for the dispute window.",
      };
    case "Dispute review":
    case "More info needed":
    case "Under review":
      return {
        title: "Manual review",
        body: "Payout is held while RidePod reviews the issue.",
      };
    default:
      return status
        ? {
            title: status.label,
            body: status.helperText,
          }
        : null;
  }
}

function HostMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">{label}</p>
        <Icon className="h-5 w-5 text-[var(--rp-primary)]" />
      </div>
      <p className="mt-3 text-2xl font-black text-[var(--rp-text)]">{value}</p>
    </div>
  );
}

function MemberPaymentRow({ pod, member }: { pod: RidePod; member: RidePod["members"][number] }) {
  const user = getUser(member.userId);
  const ready = member.paymentStatus === "authorized" || member.paymentStatus === "charged";
  const publicMember = mapMemberToPublicProfileViewModel(member, user);

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
      <div className="min-w-0">
        <PublicMemberCard
          member={publicMember}
          reportContext={{
            reporterUserId: currentUserId,
            reporterRole: pod.hostUserId === currentUserId ? "Host" : "Replacement host",
            reportedUserId: member.userId,
            reportedMemberDisplayName: user.name,
            podId: pod.id,
            podRoute: `${pod.fromLabel} to ${pod.toLabel}`,
            rideDateTime: `${pod.date}, ${pod.time}`,
          }}
          className="border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
        />
      </div>
      <Badge
        className={cn(
          ready
            ? "bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]"
            : "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]",
        )}
      >
        {member.paymentStatus.replace("_", " ")}
      </Badge>
    </div>
  );
}

function getTaxiPartnerDashboardRide(pod: RidePod) {
  const rides = pod.upcomingRideInstances ?? [];
  const reviewLabels = new Set([
    "Dispute review",
    "Payout ready",
    "Payout denied",
    "More info needed",
    "Under review",
    "Dispute resolved",
    "Closed",
  ]);

  return rides.find((ride) => reviewLabels.has(getRideInstanceDisplayStatus(ride, pod).label)) ?? rides[0] ?? null;
}

function HostPodCard({ pod }: { pod: RidePod }) {
  const readyMembers = getReadyMembers(pod);
  const progress = (readyMembers / pod.members.length) * 100;
  const nextRide = pod.rideOption === "taxi_partner_quote"
    ? getTaxiPartnerDashboardRide(pod)
    : pod.upcomingRideInstances?.[0] ?? null;
  const taxiPartnerQuoteStatus =
    pod.rideOption === "taxi_partner_quote" && nextRide
      ? getRideInstanceDisplayStatus(nextRide, pod)
      : null;
  const taxiPartnerRequest =
    pod.rideOption === "taxi_partner_quote" ? getTaxiPartnerRequestForRide(pod, nextRide) : null;
  const taxiPartnerNextAction = getTaxiPartnerNextActionCopy(taxiPartnerQuoteStatus);
  const safetyChips = [
    pod.genderMode === "women_only" ? "Women-only" : "Mixed pod",
    accessModeLabels[pod.accessMode ?? "open"],
  ].filter(Boolean);
  const action = taxiPartnerQuoteStatus?.primaryActionLabel ?? getHostAction(pod);
  const actionHref = taxiPartnerQuoteStatus?.primaryActionTarget ?? `/pods/${pod.id}/settlement`;

  return (
    <article className="overflow-hidden rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] shadow-[var(--rp-shadow-soft)]">
      <div className="bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_20%,transparent),transparent_36%),var(--rp-card)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={pod.status} />
              <Badge className="bg-[var(--rp-card-muted)] text-[var(--rp-primary)] ring-[var(--rp-border)]">
                {pod.type === "recurring" ? "Recurring" : "Scheduled"}
              </Badge>
              {taxiPartnerQuoteStatus ? (
                <Badge className={taxiPartnerQuoteStatus.chipClassName}>{taxiPartnerQuoteStatus.label}</Badge>
              ) : null}
              {pod.rideOption === "taxi_partner_quote" ? (
                <Badge className="bg-sky-400/10 text-sky-300 ring-sky-400/25">Shared taxi pod</Badge>
              ) : null}
            </div>
            <h2 className="mt-4 text-2xl font-black leading-tight text-[var(--rp-text)]">{pod.title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              {pod.fromLabel} to {pod.toLabel} | {pod.date} at {pod.time}
            </p>
            {taxiPartnerQuoteStatus ? (
              <div className="mt-2 grid gap-2">
                <p className="text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                  Taxi partner quote - Licensed taxi partner quotes one shared price.
                </p>
                <p className="text-xs font-bold leading-5 text-[var(--rp-muted)]">
                  {getTaxiTypeLabel(taxiPartnerRequest)} - Demo mode. No real taxi dispatch or payout yet.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {safetyChips.map((chip) => (
                    <Badge key={chip} className="bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] ring-[var(--rp-border)]">
                      {chip}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="rounded-[20px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 py-3 text-right">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Max fare</p>
            <p className="mt-1 text-2xl font-black text-[var(--rp-text)]">{formatMoney(pod.maxFare)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 min-[760px]:grid-cols-3">
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <UsersRound className="h-5 w-5 text-[var(--rp-primary)]" />
            <p className="mt-2 text-lg font-black text-[var(--rp-text)]">
              {readyMembers}/{pod.members.length}
            </p>
            <p className="text-xs font-bold text-[var(--rp-muted)]">Payment ready</p>
          </div>
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <Clock3 className="h-5 w-5 text-[var(--rp-primary)]" />
            <p className="mt-2 text-lg font-black text-[var(--rp-text)]">{pod.timeFlexibility}</p>
            <p className="text-xs font-bold text-[var(--rp-muted)]">Pickup flex</p>
          </div>
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <ShieldCheck className="h-5 w-5 text-[var(--rp-primary)]" />
            <p className="mt-2 text-lg font-black text-[var(--rp-text)]">{formatMoney(pod.estimatedShare)}</p>
            <p className="text-xs font-bold text-[var(--rp-muted)]">Est. share</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        {taxiPartnerQuoteStatus && taxiPartnerNextAction ? (
          <section className="rounded-[20px] border border-sky-400/20 bg-sky-400/10 p-4">
            <p className="text-sm font-black text-sky-200">{taxiPartnerNextAction.title}</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-[var(--rp-muted-strong)]">
              {taxiPartnerNextAction.body}
            </p>
            <Link
              href={actionHref}
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-[14px] border border-sky-400/25 bg-sky-400/10 px-4 text-xs font-black text-sky-200 transition hover:bg-sky-400/15"
            >
              {action}
            </Link>
          </section>
        ) : null}

        {taxiPartnerQuoteStatus ? (
          <section className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-[var(--rp-text)]">Taxi needs</h3>
              <Badge className="bg-sky-400/10 text-sky-300 ring-sky-400/25">Taxi partner quote</Badge>
            </div>
            <div className="mt-3 grid gap-2 text-xs font-bold text-[var(--rp-muted-strong)] min-[620px]:grid-cols-2">
              <p><span className="text-[var(--rp-muted)]">Taxi type:</span> {getTaxiTypeLabel(taxiPartnerRequest)}</p>
              <p><span className="text-[var(--rp-muted)]">Luggage:</span> {getLuggageLabel(taxiPartnerRequest)}</p>
              <p><span className="text-[var(--rp-muted)]">Accessibility:</span> {getAccessibilityLabel(taxiPartnerRequest)}</p>
              <p><span className="text-[var(--rp-muted)]">Pickup point:</span> {pod.pickupHub}</p>
              <p><span className="text-[var(--rp-muted)]">Dropoff point:</span> {pod.dropoffHub}</p>
            </div>
          </section>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">
            <span>Authorization</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>

        <div className="grid gap-2">
          {pod.members.map((member) => (
            <MemberPaymentRow key={member.userId} pod={pod} member={member} />
          ))}
        </div>

        <div className="grid gap-3 min-[520px]:grid-cols-2">
          <Link
            href={`/pods/${pod.id}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
          >
            Open pod <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={actionHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_16px_34px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
            style={{ background: "var(--rp-gradient-primary)" }}
          >
            <Upload className="h-4 w-4" /> {action}
          </Link>
        </div>

        <HostQuoteUploadPanel pod={pod} />
      </div>
    </article>
  );
}

export default async function HostDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ rideInstanceId?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const pods = getHostedPods();
  const selectedRideInstance = params.rideInstanceId
    ? await getRideInstanceDetailWithFallback(params.rideInstanceId)
    : null;
  const readyToBookCount = pods.filter(
    (pod) => pod.moneyStatus === "host_can_book" || pod.status === "host_booking",
  ).length;
  const receiptCount = pods.filter(
    (pod) => pod.moneyStatus === "receipt_pending" || pod.status === "booked",
  ).length;

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[30px] border border-[var(--rp-border)] bg-[var(--rp-card)] shadow-[var(--rp-shadow-soft)]">
        <div className="bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_24%,transparent),transparent_38%),var(--rp-card)] p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
                Host dashboard
              </p>
              <h1 className="mt-2 max-w-2xl text-[34px] font-black leading-tight text-[var(--rp-text)] sm:text-5xl">
                Book only after seats are covered
              </h1>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-[var(--rp-muted-strong)]">
                Payment status, quote checks, receipts, and backup host work are grouped by pod so hosts can act without chasing riders manually.
              </p>
            </div>
            <Link
              href="/settlement"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-5 text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
            >
              <ReceiptText className="h-5 w-5" /> Settlement center
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 min-[640px]:grid-cols-3">
        <HostMetric label="Hosted pods" value={String(pods.length)} icon={UsersRound} />
        <HostMetric label="Ready to book" value={String(readyToBookCount)} icon={CheckCircle2} />
        <HostMetric label="Receipts due" value={String(receiptCount)} icon={CalendarClock} />
      </section>

      {selectedRideInstance ? (
        <div className="grid gap-3">
          {selectedRideInstance.fallbackNote ? (
            <p className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-3 text-xs font-bold text-[var(--rp-muted-strong)]">
              {selectedRideInstance.fallbackNote}
            </p>
          ) : null}
          {selectedRideInstance.pod.rideOption === "taxi_partner_quote" ? (
            <>
              <TaxiPartnerQuoteRequestCard
                pod={selectedRideInstance.pod}
                rideInstance={selectedRideInstance.rideInstance}
              />
              <TaxiPartnerCompletionCard
                pod={selectedRideInstance.pod}
                rideInstance={selectedRideInstance.rideInstance}
              />
            </>
          ) : (
            <RecurringInstanceProofFlow
              pod={selectedRideInstance.pod}
              rideInstance={selectedRideInstance.rideInstance}
            />
          )}
        </div>
      ) : params.rideInstanceId ? (
        <div className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5">
          <h2 className="text-xl font-black text-[var(--rp-text)]">Ride not found</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Couldn&apos;t load this ride. Try again later.
          </p>
        </div>
      ) : null}

      <section className="grid gap-4">
        {pods.map((pod) => (
          <HostPodCard key={pod.id} pod={pod} />
        ))}
      </section>
    </div>
  );
}
