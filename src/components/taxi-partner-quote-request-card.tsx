"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CarFront, CheckCircle2, Clock3, Info, Luggage, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import { Badge, cn } from "@/components/ui";
import type { RecurringRideInstancePreview, RidePod } from "@/lib/mock-data";
import {
  TAXI_PARTNER_TAXI_TYPES,
  getTaxiPartnerQuoteDisplayStatus,
  getTaxiPartnerQuoteMoneyDisplay,
  getTaxiPartnerQuoteRequest,
  taxiPartnerTaxiTypeLabels,
  type TaxiPartnerQuoteRequest,
  type TaxiPartnerTaxiType,
} from "@/lib/taxi-partner-quote";

type AccessibilityKey =
  | "extraSpaceNeeded"
  | "wheelchairAccessibleRequested"
  | "stepFreeSupportRequested";

const accessModeLabels: Record<NonNullable<RidePod["accessMode"]>, string> = {
  open: "Open",
  verified_only: "Verified-only",
  community_only: "Community-only",
  high_trust_only: "High-trust-only",
  invite_only: "Invite-only",
};

const accessibilityLabels: Record<AccessibilityKey, string> = {
  extraSpaceNeeded: "Extra space needed",
  wheelchairAccessibleRequested: "Wheelchair-accessible taxi requested",
  stepFreeSupportRequested: "Step-free support requested",
};

function isDemoModeEnabled() {
  return process.env.NEXT_PUBLIC_RIDEPOD_DEMO_MODE === "true";
}

function formatHkdCents(cents: number) {
  return `HK$${(cents / 100).toFixed(2)}`;
}

function formatQuoteExpiry(value: string | null) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function getTitle(label: string) {
  if (label === "Taxi quote needed") return "Request taxi quote";
  if (label === "Waiting for quote") return "Waiting for partner quote";
  if (label === "Quote received") return "Taxi quote received";
  if (label === "Guests accepting") return "Guests accepting quote";
  if (label === "Ready for pickup") return "Ready for pickup";

  return label;
}

function getBody(label: string) {
  if (label === "Taxi quote needed") {
    return "Guests are locked. Request one shared quote from a licensed taxi partner.";
  }

  if (label === "Waiting for quote") {
    return "Waiting for a licensed taxi partner to quote this shared pod.";
  }

  if (label === "Quote received") {
    return "Guests need to accept the shared taxi quote.";
  }

  if (label === "Guests accepting") {
    return "Waiting for guests to accept the shared taxi quote.";
  }

  if (label === "Ready for pickup") {
    return "Guests accepted the quote. Coordinate pickup next.";
  }

  return "Taxi partner quote is a future beta prototype.";
}

function getStatusChipClass(label: string) {
  if (label === "Quote received" || label === "Ready for pickup" || label === "Guests accepted") {
    return "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25";
  }

  if (label === "Waiting for quote" || label === "Taxi quote needed" || label === "Payout pending") {
    return "bg-amber-400/10 text-amber-300 ring-amber-400/25";
  }

  if (label === "Dispute review" || label === "More info needed" || label === "Under review") {
    return "bg-orange-400/10 text-orange-300 ring-orange-400/25";
  }

  if (label === "Payout denied") return "bg-red-400/10 text-red-300 ring-red-400/25";

  return "bg-sky-400/10 text-sky-300 ring-sky-400/25";
}

function createRequestedQuote({
  pod,
  rideInstance,
  requestedTaxiType,
  luggageCount,
  accessibility,
}: {
  pod: RidePod;
  rideInstance: RecurringRideInstancePreview;
  requestedTaxiType: TaxiPartnerTaxiType;
  luggageCount: number;
  accessibility: Record<AccessibilityKey, boolean>;
}): TaxiPartnerQuoteRequest {
  return {
    id: `${rideInstance.id}-local-request`,
    podId: pod.id,
    rideInstanceId: rideInstance.id,
    organizerUserId: pod.hostUserId,
    rideOption: "TAXI_PARTNER_QUOTE",
    requestedTaxiType,
    requestedAt: new Date().toISOString(),
    quoteStatus: "QUOTE_REQUESTED",
    quoteAmountCents: null,
    currency: "HKD",
    quotedByPartnerName: null,
    quotedByPartnerId: null,
    quoteExpiresAt: null,
    guestAcceptanceStatus: "GUESTS_LOCKED",
    driverAssignmentStatus: "NOT_ASSIGNED",
    payoutStatus: "NOT_READY",
    luggageCount,
    ...accessibility,
    notes: "Future beta prototype. No real taxi dispatch yet.",
  };
}

function simulateQuote(request: TaxiPartnerQuoteRequest | null, fallbackTaxiType: TaxiPartnerTaxiType) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return {
    ...(request ?? {
      id: "taxi_partner_quote_received_local",
      podId: "",
      organizerUserId: "",
      rideOption: "TAXI_PARTNER_QUOTE" as const,
      requestedAt: new Date().toISOString(),
      currency: "HKD" as const,
      guestAcceptanceStatus: "GUESTS_LOCKED" as const,
      driverAssignmentStatus: "NOT_ASSIGNED" as const,
      payoutStatus: "NOT_READY" as const,
      quotedByPartnerId: null,
    }),
    requestedTaxiType: request?.requestedTaxiType ?? fallbackTaxiType,
    quoteStatus: "QUOTE_RECEIVED" as const,
    quoteAmountCents: 24000,
    quotedByPartnerName: "Demo Taxi Partner",
    quotedByPartnerId: "demo-taxi-partner",
    quoteExpiresAt: expiresAt,
    notes: "Demo Taxi Partner quoted HK$240 for this shared pod.",
  };
}

function SummaryTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-[18px] border border-sky-400/20 bg-sky-400/10 p-3">
      <Icon className="h-5 w-5 text-sky-300" />
      <p className="mt-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">{label}</p>
      <p className="mt-1 text-sm font-black leading-5 text-[var(--rp-text)]">{value}</p>
    </div>
  );
}

export function TaxiPartnerQuoteRequestCard({
  pod,
  rideInstance,
}: {
  pod: RidePod;
  rideInstance: RecurringRideInstancePreview;
}) {
  const baseRequest = getTaxiPartnerQuoteRequest(rideInstance.taxiPartnerQuoteRequestId);
  const [localRequest, setLocalRequest] = useState<TaxiPartnerQuoteRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [selectedTaxiType, setSelectedTaxiType] = useState<TaxiPartnerTaxiType>(
    baseRequest?.requestedTaxiType ?? "ELECTRIC",
  );
  const [luggageCount, setLuggageCount] = useState(baseRequest?.luggageCount ?? 0);
  const [accessibility, setAccessibility] = useState<Record<AccessibilityKey, boolean>>({
    extraSpaceNeeded: Boolean(baseRequest?.extraSpaceNeeded),
    wheelchairAccessibleRequested: Boolean(baseRequest?.wheelchairAccessibleRequested),
    stepFreeSupportRequested: Boolean(baseRequest?.stepFreeSupportRequested),
  });

  const activeRequest = localRequest ?? baseRequest;
  const displayStatus = getTaxiPartnerQuoteDisplayStatus(activeRequest);
  const demoModeEnabled = isDemoModeEnabled();
  const lockedGuestCount = Math.max(1, pod.seatsFilled);
  const acceptedGuestCount =
    activeRequest?.acceptedGuestCount ??
    (displayStatus.label === "Guests accepting"
      ? Math.min(2, lockedGuestCount)
      : displayStatus.label === "Ready for pickup"
        ? lockedGuestCount
        : 0);
  const moneyDisplay = useMemo(
    () => activeRequest ? getTaxiPartnerQuoteMoneyDisplay(activeRequest, lockedGuestCount) : null,
    [activeRequest, lockedGuestCount],
  );
  const quoteAboveCap = Boolean(
    activeRequest?.quoteAmountCents &&
      rideInstance.bookingFareCapCents &&
      activeRequest.quoteAmountCents > rideInstance.bookingFareCapCents,
  );
  const safetyBadges = [
    pod.genderMode === "women_only" ? "Women-only" : "Mixed pod",
    pod.accessMode ? accessModeLabels[pod.accessMode] : null,
  ].filter(Boolean);
  const requestDetailBadges = [
    activeRequest?.luggageCount ? `Luggage: ${activeRequest.luggageCount}` : null,
    ...(activeRequest
      ? (Object.keys(accessibilityLabels) as AccessibilityKey[])
          .filter((key) => activeRequest[key])
          .map((key) => accessibilityLabels[key])
      : []),
  ].filter(Boolean);

  function submitRequest() {
    const request = createRequestedQuote({
      pod,
      rideInstance,
      requestedTaxiType: selectedTaxiType,
      luggageCount,
      accessibility,
    });
    setLocalRequest(request);
    setRequestMessage("Quote request created.");
    setShowRequestModal(false);
  }

  function handlePrimaryAction() {
    if (displayStatus.label === "Taxi quote needed") {
      setShowRequestModal(true);
      return;
    }

    if (displayStatus.label === "Quote received") {
      setRequestMessage("Next: guests accept the shared taxi quote.");
      return;
    }

    setRequestMessage(displayStatus.helperText);
  }

  function handleSimulateQuote() {
    setLocalRequest(simulateQuote(activeRequest, selectedTaxiType));
    setRequestMessage("Demo quote received.");
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-sky-400/30 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_36%),var(--rp-card)] p-4 shadow-[0_18px_46px_rgba(14,165,233,0.12)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-300">
            Taxi partner quote
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-[var(--rp-text)]">
            {getTitle(displayStatus.label)}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
            {getBody(displayStatus.label)}
          </p>
        </div>
        <Badge className={getStatusChipClass(displayStatus.label)}>
          {displayStatus.label === "Waiting for quote" ? "Quote requested" : displayStatus.label}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 min-[760px]:grid-cols-4">
        <SummaryTile
          icon={CarFront}
          label="Route"
          value={`${rideInstance.originLabel} to ${rideInstance.destinationLabel}`}
        />
        <SummaryTile
          icon={Clock3}
          label="Date/time"
          value={`${rideInstance.displayDate}, ${rideInstance.departureTime}`}
        />
        <SummaryTile icon={UsersRound} label="Guests locked" value={`${lockedGuestCount} guests locked`} />
        <SummaryTile
          icon={Luggage}
          label="Taxi type"
          value={taxiPartnerTaxiTypeLabels[activeRequest?.requestedTaxiType ?? selectedTaxiType]}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["Taxi partner", "Quote", "Mock payment", "Shared pod"].map((badge) => (
          <Badge key={badge} className="border border-sky-400/20 bg-sky-400/10 text-sky-100 ring-sky-400/25">
            {badge}
          </Badge>
        ))}
        {safetyBadges.map((badge) => (
          <Badge key={badge} className="bg-[var(--rp-card-muted)] text-sky-300 ring-sky-400/20">
            {badge}
          </Badge>
        ))}
        <Badge className="bg-sky-400/10 text-sky-200 ring-sky-400/25">
          Future beta prototype
        </Badge>
        {requestDetailBadges.map((badge) => (
          <Badge key={badge} className="bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] ring-[var(--rp-border)]">
            {badge}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-[16px] border border-sky-400/25 bg-sky-400/10 p-3 text-sky-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
        <p className="text-xs font-bold leading-5">
          Taxi Partner Quote is demo only. No real taxi dispatch or payout yet.
          <span className="sr-only"> Guest acceptance flow comes next.</span>
        </p>
      </div>

      {activeRequest?.quoteAmountCents ? (
        <div className="mt-4 rounded-[22px] border border-sky-400/25 bg-[linear-gradient(135deg,rgba(14,165,233,0.1),rgba(15,23,42,0.22))] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-[var(--rp-text)]">Taxi quote received</h3>
              <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">
                Taxi partner: {activeRequest.quotedByPartnerName ?? "Demo Taxi Partner"}
              </p>
            </div>
            <Badge className="bg-emerald-400/10 text-emerald-300 ring-emerald-400/25">
              Expires {formatQuoteExpiry(activeRequest.quoteExpiresAt)}
            </Badge>
          </div>
          {moneyDisplay ? (
            <dl className="mt-4 grid gap-2 min-[640px]:grid-cols-2">
              {[
                ["Quote", formatHkdCents(moneyDisplay.quoteAmountCents)],
                ["Guests", String(moneyDisplay.guestCount)],
                ["Fare share", `${formatHkdCents(moneyDisplay.fareShareCents)} / guest`],
                ["Platform fee", `${formatHkdCents(moneyDisplay.platformFeeCents)} / guest`],
                ["Guest charge", formatHkdCents(moneyDisplay.guestChargeCents)],
                ["Taxi partner payout", formatHkdCents(moneyDisplay.driverPayoutCents)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[16px] border border-sky-400/15 bg-[var(--rp-card)] p-3">
                  <dt className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">{label}</dt>
                  <dd className="mt-1 text-base font-black text-[var(--rp-text)]">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <p className="mt-3 rounded-[16px] border border-sky-400/20 bg-sky-400/10 p-3 text-xs font-bold leading-5 text-sky-100">
            Display/mock only. No real charge or payout is created.
          </p>
          {quoteAboveCap ? (
            <div className="mt-3 flex items-start gap-3 rounded-[16px] border border-orange-400/25 bg-orange-400/10 p-3 text-orange-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs font-bold leading-5">
                Quote above fare cap. Guests must approve the higher amount before the ride can proceed.
                <span className="sr-only"> TODO: Wire above-cap quote approval state later.</span>
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {displayStatus.label === "Guests accepting" ? (
        <div className="mt-4 rounded-[18px] border border-sky-400/20 bg-sky-400/10 p-4">
          <p className="text-sm font-black text-[var(--rp-text)]">
            {acceptedGuestCount} / {lockedGuestCount} guests accepted
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            Waiting for guests to accept the shared taxi quote.
          </p>
        </div>
      ) : null}

      {displayStatus.label === "Ready for pickup" ? (
        <div className="mt-4 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
          <CheckCircle2 className="h-5 w-5 text-[var(--rp-success)]" />
          <p className="mt-2 text-sm font-black text-[var(--rp-text)]">
            Guests accepted the quote. Coordinate pickup next.
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
            No real taxi dispatch or payout yet.
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 min-[520px]:grid-cols-2">
        <button
          type="button"
          onClick={handlePrimaryAction}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-sky-500 px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(14,165,233,0.22)] transition hover:bg-sky-400"
        >
          <WalletCards className="h-4 w-4" /> {displayStatus.primaryActionLabel}
        </button>
        {demoModeEnabled && displayStatus.label === "Waiting for quote" ? (
          <button
            type="button"
            onClick={handleSimulateQuote}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-sky-400/30 bg-sky-400/10 px-5 text-sm font-black text-sky-200 transition hover:bg-sky-400/15"
          >
            Simulate quote
          </button>
        ) : null}
      </div>

      {requestMessage ? (
        <p className="mt-4 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-black text-[var(--rp-success)]">
          {requestMessage}
        </p>
      ) : null}

      {showRequestModal ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="taxi-partner-request-title"
        >
          <section className="max-h-[92vh] w-full max-w-[460px] overflow-y-auto rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-sky-400/25 bg-sky-400/10 text-sky-300">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 id="taxi-partner-request-title" className="text-2xl font-black leading-tight">
                  Request taxi partner quote
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  RidePod will prepare this shared pod request for a licensed taxi partner.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <SummaryTile
                icon={CarFront}
                label="Route"
                value={`${rideInstance.originLabel} to ${rideInstance.destinationLabel}`}
              />
              <SummaryTile
                icon={Clock3}
                label="Date/time"
                value={`${rideInstance.displayDate}, ${rideInstance.departureTime}`}
              />
            </div>

            <div className="mt-5">
              <p className="text-sm font-black text-[var(--rp-text)]">Taxi type</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {TAXI_PARTNER_TAXI_TYPES.map((taxiType) => (
                  <button
                    key={taxiType}
                    type="button"
                    onClick={() => setSelectedTaxiType(taxiType)}
                    className={cn(
                      "min-h-11 rounded-xl border px-3 py-2 text-sm font-black",
                      selectedTaxiType === taxiType
                        ? "border-sky-400 bg-sky-500 text-white"
                        : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
                    )}
                  >
                    {taxiPartnerTaxiTypeLabels[taxiType]}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-5 grid gap-2 text-sm font-black text-[var(--rp-text)]">
              Luggage count
              <input
                type="number"
                min={0}
                value={luggageCount}
                onChange={(event) => setLuggageCount(Math.max(0, Number(event.target.value) || 0))}
                className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
              />
              <span className="text-xs font-bold text-[var(--rp-muted-strong)]">
                Helps match the right taxi type.
              </span>
            </label>

            <div className="mt-5 grid gap-2">
              <p className="text-sm font-black text-[var(--rp-text)]">Accessibility needs</p>
              {(Object.keys(accessibilityLabels) as AccessibilityKey[]).map((key) => (
                <label
                  key={key}
                  className="flex gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]"
                >
                  <input
                    type="checkbox"
                    checked={accessibility[key]}
                    onChange={(event) =>
                      setAccessibility((current) => ({ ...current, [key]: event.target.checked }))
                    }
                    className="mt-1 h-4 w-4 accent-sky-500"
                  />
                  <span>{accessibilityLabels[key]}</span>
                </label>
              ))}
              <p className="text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Available only if supported by the taxi partner.
              </p>
            </div>

            <div className="mt-5 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
              <p className="text-sm font-black text-[var(--rp-text)]">Safety/access mode</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {safetyBadges.map((badge) => (
                  <Badge
                    key={badge}
                    className="bg-sky-400/10 text-sky-200 ring-sky-400/25"
                  >
                    {badge}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                Safety modes control who can join the pod. Taxi partner assignment depends on partner availability.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRequest}
                className="min-h-12 rounded-2xl border border-sky-400 bg-sky-500 text-sm font-black text-white transition hover:bg-sky-400"
              >
                Submit request
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
