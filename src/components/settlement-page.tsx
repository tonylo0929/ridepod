"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Car,
  CheckCircle2,
  ChevronRight,
  Pencil,
  ReceiptText,
  Upload,
  UsersRound,
} from "lucide-react";
import { SettlementReceiptVerifiedScreen } from "@/components/settlement-receipt-verified-screen";
import { PrimaryButton, SecondaryButton, cn } from "@/components/ui";
import { formatCents } from "@/lib/money-safety";
import { getUser, type RecurringRideInstancePreview, type RidePod } from "@/lib/mock-data";
import {
  getTaxiPartnerQuoteMoneyDisplay,
  getTaxiPartnerQuoteRequest,
  taxiPartnerTaxiTypeLabels,
  type TaxiPartnerPayoutStatus,
  type TaxiPartnerQuoteRequest,
} from "@/lib/taxi-partner-quote";

type SettlementValues = {
  finalFare: number;
  baseFare: number;
  tolls: number;
  tip: number;
  platformFee: number;
  totalPaid: number;
  riderCount: number;
  finalSharePerRider: number;
  receiptUploaded: boolean;
  mockReceiptFileName: string;
};

type BreakdownItem = {
  label: string;
  value: number;
  colorVar: string;
};

const receiptVerificationStatuses = [
  "Submitted",
  "Under review",
  "Verified",
  "Needs more info",
  "Rejected",
] as const;

type ReceiptVerificationStatusLabel = (typeof receiptVerificationStatuses)[number];

const initialSettlement: SettlementValues = {
  finalFare: 87.45,
  baseFare: 72.4,
  tolls: 6.25,
  tip: 8.8,
  platformFee: 0,
  totalPaid: 87.45,
  riderCount: 4,
  finalSharePerRider: 21.86,
  receiptUploaded: false,
  mockReceiptFileName: "uber-receipt-may14.png",
};

export function SettlementPage({ pod }: { pod: RidePod }) {
  const [finalFare, setFinalFare] = useState(initialSettlement.finalFare);
  const [baseFare, setBaseFare] = useState(initialSettlement.baseFare);
  const [tolls, setTolls] = useState(initialSettlement.tolls);
  const [tip, setTip] = useState(initialSettlement.tip);
  const [platformFee, setPlatformFee] = useState(initialSettlement.platformFee);
  const [riderCount] = useState(initialSettlement.riderCount);
  const [selectedReceiptFile, setSelectedReceiptFile] = useState<string | null>(null);
  const [receiptVerificationStatus, setReceiptVerificationStatus] =
    useState<ReceiptVerificationStatusLabel>("Submitted");
  const [isEditingFare, setIsEditingFare] = useState(false);
  const [settlementReviewReady, setSettlementReviewReady] = useState(false);
  const host = getUser(pod.hostUserId);
  const isTaxiPartnerQuote = pod.rideOption === "taxi_partner_quote";
  const isTaxiMeter = pod.rideOption === "taxi_meter" || pod.vehicleType === "Taxi";

  const totalPaid = useMemo(
    () => roundCurrency(baseFare + tolls + tip + platformFee),
    [baseFare, platformFee, tip, tolls],
  );
  const finalSharePerRider = useMemo(
    () => roundCurrency(finalFare / Math.max(1, riderCount)),
    [finalFare, riderCount],
  );
  const receiptUploaded = Boolean(selectedReceiptFile);

  const breakdownItems: BreakdownItem[] = [
    { label: "Base fare", value: baseFare, colorVar: "--rp-chart-base" },
    { label: "Tolls", value: tolls, colorVar: "--rp-chart-tolls" },
    { label: "Tip", value: tip, colorVar: "--rp-chart-tip" },
    { label: "Platform fee", value: platformFee, colorVar: "--rp-chart-platform" },
  ];

  if (isTaxiPartnerQuote) {
    return <TaxiPartnerQuoteSettlement pod={pod} />;
  }

  if (pod.status === "completed" || pod.moneyStatus === "settlement_ready") {
    return (
      <SettlementReceiptVerifiedScreen
        backHref="/pods"
        onViewSettlementBreakdown={() => setSettlementReviewReady(true)}
        onViewFinalSplit={() => setSettlementReviewReady(true)}
      />
    );
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-[430px] gap-5 pb-4 min-[560px]:max-w-4xl">
      <SettlementHeader pod={pod} />
      <TripSummaryCard
        route={`${pod.fromLabel} to ${pod.toLabel}`}
        riders={`${riderCount} riders`}
        vehicle={pod.vehicleType}
        host={host.name}
      />
      <ReceiptProtectionNotice
        receiptUploaded={receiptUploaded}
        receiptVerificationStatus={receiptVerificationStatus}
        isTaxiMeter={isTaxiMeter}
      />

      <div className="grid gap-5 min-[820px]:grid-cols-[minmax(0,1fr)_340px] min-[820px]:items-start">
        <div className="grid gap-5">
          <FinalFareCard
            finalFare={finalFare}
            setFinalFare={setFinalFare}
            isEditingFare={isEditingFare}
            setIsEditingFare={setIsEditingFare}
            isTaxiMeter={isTaxiMeter}
          />
          <ReceiptUploadCard
            fileName={selectedReceiptFile}
            mockFileName={initialSettlement.mockReceiptFileName}
            receiptUploaded={receiptUploaded}
            receiptVerificationStatus={receiptVerificationStatus}
            setReceiptVerificationStatus={setReceiptVerificationStatus}
            setSelectedReceiptFile={setSelectedReceiptFile}
            isTaxiMeter={isTaxiMeter}
          />
          <FareBreakdownCard
            items={breakdownItems}
            totalPaid={totalPaid}
            baseFare={baseFare}
            setBaseFare={setBaseFare}
            tolls={tolls}
            setTolls={setTolls}
            tip={tip}
            setTip={setTip}
            platformFee={platformFee}
            setPlatformFee={setPlatformFee}
          />
        </div>
        <div className="grid gap-5">
          <FinalShareCard
            riderCount={riderCount}
            finalSharePerRider={finalSharePerRider}
            receiptUploaded={receiptUploaded}
          />
          <RiderFinalSplitCard
            verifiedReceiptTotal={finalFare}
            approvedMax={pod.maxFare}
            fareShare={finalSharePerRider}
            platformFee={pod.platformFee}
            noShowLateFee={0}
            finalCharge={finalSharePerRider + pod.platformFee}
            refundCredit={Math.max(0, pod.maxFare / Math.max(1, pod.seatsTotal) + pod.platformFee - (finalSharePerRider + pod.platformFee))}
          />
          <SettlementActions
            canReview={finalFare > 0}
            settlementReviewReady={settlementReviewReady}
            setSettlementReviewReady={setSettlementReviewReady}
          />
        </div>
      </div>
    </div>
  );
}

function TaxiPartnerQuoteSettlement({ pod }: { pod: RidePod }) {
  const [issueReported, setIssueReported] = useState(false);
  const rideInstance =
    pod.upcomingRideInstances?.find((instance) => instance.status === "completed" && instance.taxiPartnerQuoteRequestId) ??
    pod.upcomingRideInstances?.find((instance) => instance.taxiPartnerQuoteRequestId) ??
    null;
  const quoteRequest = getTaxiPartnerQuoteRequest(rideInstance?.taxiPartnerQuoteRequestId);
  const acceptedGuests = quoteRequest?.acceptedGuestCount ?? pod.seatsFilled;
  const guestCount = Math.max(1, acceptedGuests || pod.seatsFilled || pod.seatsTotal || 1);
  const money = quoteRequest ? getTaxiPartnerQuoteMoneyDisplay(quoteRequest, guestCount) : null;
  const payoutCopy = getTaxiPartnerPayoutCopy(quoteRequest?.payoutStatus, rideInstance?.payoutState);
  const disputeCopy = issueReported
    ? {
        label: "Under review",
        body: "RidePod is reviewing the reported issue.",
        cta: "View dispute",
      }
    : getTaxiPartnerDisputeCopy(quoteRequest, rideInstance);
  const route = `${rideInstance?.originLabel ?? pod.fromLabel} to ${rideInstance?.destinationLabel ?? pod.toLabel}`;
  const rideDateTime = rideInstance
    ? `${rideInstance.displayDate} • ${rideInstance.departureTime}`
    : `${pod.date} • ${pod.time}`;
  const taxiType = quoteRequest ? `${taxiPartnerTaxiTypeLabels[quoteRequest.requestedTaxiType]} taxi` : pod.vehicleType;
  const taxiPartner = quoteRequest?.quotedByPartnerName ?? "Demo Taxi Partner";

  return (
    <div className="mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-[430px] gap-5 pb-4 min-[560px]:max-w-4xl">
      <header className="grid gap-5 pt-1">
        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          <Link
            href="/host"
            aria-label="Back to Host Dashboard"
            className="grid h-11 w-11 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-black tracking-tight text-[var(--rp-text)]">Taxi quote settlement</h1>
            <p className="mt-1 text-xs font-semibold text-[var(--rp-muted)] min-[560px]:hidden">
              {route}
            </p>
          </div>
        </div>
        <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Taxi settlement</p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-[var(--rp-text)]">
            Review quote, acceptance, and payout status.
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
            Taxi Partner Quote uses the selected partner quote and guest acceptance state. No live payment or payout is enabled unless clearly stated.
          </p>
          <p className="mt-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-2 text-xs font-black text-[var(--rp-primary)]">
            Beta uses mock/test payment states. No live payment or payout is enabled.
          </p>
        </section>
      </header>

      <div className="grid gap-5 min-[820px]:grid-cols-[minmax(0,1fr)_340px] min-[820px]:items-start">
        <div className="grid gap-5">
          <TaxiSettlementStatusCard payoutCopy={payoutCopy} disputeCopy={disputeCopy} />
          <TaxiSettlementMoneyCard money={money} quoteRequest={quoteRequest} guestCount={guestCount} />
          <TaxiSettlementAcceptanceCard
            acceptedGuests={acceptedGuests}
            guestCount={guestCount}
            quoteAboveCap={Boolean(quoteRequest?.quoteAboveCap)}
          />
          <TaxiSettlementPaymentStateCard quoteRequest={quoteRequest} />
        </div>
        <div className="grid gap-5">
          <TaxiSettlementRideSummaryCard
            route={route}
            rideDateTime={rideDateTime}
            taxiType={taxiType}
            taxiPartner={taxiPartner}
            acceptedGuests={acceptedGuests}
            rideStatus={payoutCopy.label}
          />
          <TaxiSettlementDisputeCard
            disputeCopy={disputeCopy}
            issueReported={issueReported}
            onReportIssue={() => setIssueReported(true)}
          />
        </div>
      </div>
    </div>
  );
}

function TaxiSettlementStatusCard({
  payoutCopy,
  disputeCopy,
}: {
  payoutCopy: TaxiPayoutCopy;
  disputeCopy: TaxiDisputeCopy;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">Payout status</p>
          <h2 className="mt-2 text-3xl font-black text-[var(--rp-text)]">{payoutCopy.label}</h2>
        </div>
        <span className="rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-1 text-xs font-black text-[var(--rp-primary)]">
          {disputeCopy.label}
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">{payoutCopy.body}</p>
      <p className="mt-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
        {payoutCopy.helper}
      </p>
      <Link
        href={payoutCopy.href}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)]"
      >
        {payoutCopy.cta}
      </Link>
    </section>
  );
}

function TaxiSettlementMoneyCard({
  money,
  quoteRequest,
  guestCount,
}: {
  money: ReturnType<typeof getTaxiPartnerQuoteMoneyDisplay> | null;
  quoteRequest: TaxiPartnerQuoteRequest | null;
  guestCount: number;
}) {
  const quoteAmountCents = money?.quoteAmountCents ?? quoteRequest?.quoteAmountCents ?? 0;
  const fareShareCents = money?.fareShareCents ?? Math.ceil(quoteAmountCents / Math.max(1, guestCount));
  const platformFeeCents = money?.platformFeeCents ?? Math.max(Math.ceil(fareShareCents * 0.1), 600);
  const guestChargeCents = money?.guestChargeCents ?? fareShareCents + platformFeeCents;
  const platformFeeTotalCents = money?.platformFeeTotalCents ?? platformFeeCents * Math.max(1, guestCount);
  const taxiPartnerPayoutCents = money?.driverPayoutCents ?? quoteAmountCents;

  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <h2 className="text-xl font-black text-[var(--rp-text)]">Quote & split</h2>
      <dl className="mt-4 grid gap-2 text-sm">
        <SettlementRow label="Taxi partner quote" value={formatCents(quoteAmountCents, "HKD")} />
        <SettlementRow label="Fare share" value={formatCents(fareShareCents, "HKD")} />
        <SettlementRow label="Platform fee" value={formatCents(platformFeeCents, "HKD")} />
        <SettlementRow label="Guest total" value={formatCents(guestChargeCents, "HKD")} />
        <SettlementRow label="Platform fee total" value={formatCents(platformFeeTotalCents, "HKD")} />
        <SettlementRow label="Taxi partner payout" value={formatCents(taxiPartnerPayoutCents, "HKD")} />
      </dl>
      <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
        Platform fee is paid by guests. Taxi partner payout equals the accepted quote in this demo.
      </p>
    </section>
  );
}

function TaxiSettlementAcceptanceCard({
  acceptedGuests,
  guestCount,
  quoteAboveCap,
}: {
  acceptedGuests: number;
  guestCount: number;
  quoteAboveCap: boolean;
}) {
  const pendingGuests = Math.max(0, guestCount - acceptedGuests);

  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <h2 className="text-xl font-black text-[var(--rp-text)]">Guest acceptance</h2>
      <dl className="mt-4 grid gap-2 text-sm">
        <SettlementRow label="Accepted" value={`${acceptedGuests} / ${guestCount} guests accepted`} />
        <SettlementRow label="Pending" value={`${pendingGuests} pending`} />
        <SettlementRow label="Declined" value="0 declined" />
        {quoteAboveCap ? <SettlementRow label="Higher quote accepted" value="Yes" /> : null}
      </dl>
      <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
        The ride proceeds only after required guests accept the selected taxi quote.
      </p>
    </section>
  );
}

function TaxiSettlementPaymentStateCard({ quoteRequest }: { quoteRequest: TaxiPartnerQuoteRequest | null }) {
  const activeState = quoteRequest?.quoteStatus === "QUOTE_ACCEPTED" ? "Mock payment state" : "Mock payment state";

  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <h2 className="text-xl font-black text-[var(--rp-text)]">Payment state</h2>
      <p className="mt-3 text-base font-black text-[var(--rp-primary)]">{activeState}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
        No live money is charged in this beta flow.
      </p>
    </section>
  );
}

function TaxiSettlementRideSummaryCard({
  route,
  rideDateTime,
  taxiType,
  taxiPartner,
  acceptedGuests,
  rideStatus,
}: {
  route: string;
  rideDateTime: string;
  taxiType: string;
  taxiPartner: string;
  acceptedGuests: number;
  rideStatus: string;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <h2 className="text-xl font-black text-[var(--rp-text)]">Shared taxi ride</h2>
      <dl className="mt-4 grid gap-2 text-sm">
        <SettlementRow label="Route" value={route} />
        <SettlementRow label="Date/time" value={rideDateTime} />
        <SettlementRow label="Taxi type" value={taxiType} />
        <SettlementRow label="Taxi partner" value={taxiPartner} />
        <SettlementRow label="Guests accepted" value={`${acceptedGuests} accepted`} />
        <SettlementRow label="Ride status" value={rideStatus} />
      </dl>
    </section>
  );
}

function TaxiSettlementDisputeCard({
  disputeCopy,
  issueReported,
  onReportIssue,
}: {
  disputeCopy: TaxiDisputeCopy;
  issueReported: boolean;
  onReportIssue: () => void;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <h2 className="text-xl font-black text-[var(--rp-text)]">Dispute window</h2>
      <p className="mt-3 text-base font-black text-[var(--rp-primary)]">{disputeCopy.label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">{disputeCopy.body}</p>
      <p className="mt-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] px-3 py-2 text-xs font-bold leading-5 text-[var(--rp-warning)]">
        Do not use this form for emergencies. Contact local emergency services immediately.
      </p>
      <button
        type="button"
        disabled={issueReported}
        onClick={onReportIssue}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)] disabled:opacity-60"
      >
        {issueReported ? "Dispute under review" : disputeCopy.cta}
      </button>
      {issueReported ? (
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          RidePod will review this taxi partner ride. Payout may be held during review.
        </p>
      ) : null}
    </section>
  );
}

function SettlementRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-2">
      <dt className="font-semibold text-[var(--rp-muted)]">{label}</dt>
      <dd className="text-right font-black text-[var(--rp-text)]">{value}</dd>
    </div>
  );
}

type TaxiPayoutCopy = {
  label: string;
  body: string;
  helper: string;
  cta: string;
  href: string;
};

type TaxiDisputeCopy = {
  label: string;
  body: string;
  cta: string;
};

function getTaxiPartnerPayoutCopy(
  payoutStatus: TaxiPartnerPayoutStatus | null | undefined,
  ridePayoutState: string | null | undefined,
): TaxiPayoutCopy {
  if (payoutStatus === "HELD_FOR_REVIEW" || ridePayoutState === "HELD_FOR_REVIEW") {
    return {
      label: "Payout held",
      body: "Payout is held while RidePod reviews the case.",
      helper: "No real payout is sent while the case is under review.",
      cta: "View review",
      href: "/admin/review",
    };
  }

  if (payoutStatus === "READY_TO_RELEASE" || ridePayoutState === "READY") {
    return {
      label: "Payout ready",
      body: "Review is complete. Payout can be marked ready in demo mode.",
      helper: "No real payout is sent.",
      cta: "View payout details",
      href: "/taxi-partner",
    };
  }

  if (payoutStatus === "DENIED_MOCK") {
    return {
      label: "Payout denied in demo",
      body: "Payout was denied during demo review.",
      helper: "No real money moves.",
      cta: "View review",
      href: "/admin/review",
    };
  }

  if (payoutStatus === "RELEASED_MOCK" || payoutStatus === "RELEASED" || ridePayoutState === "PAID") {
    return {
      label: "Closed",
      body: "Case closed in app state.",
      helper: "Payout was only marked released in demo mode. No real payout was sent.",
      cta: "View details",
      href: "/taxi-partner",
    };
  }

  return {
    label: "Payout pending",
    body: "Payout stays pending until the dispute window clears.",
    helper: "No real payout is sent in beta.",
    cta: "View dispute window",
    href: "/taxi-partner",
  };
}

function getTaxiPartnerDisputeCopy(
  quoteRequest: TaxiPartnerQuoteRequest | null,
  rideInstance: RecurringRideInstancePreview | null,
): TaxiDisputeCopy {
  if (quoteRequest?.disputeStatus === "UNDER_REVIEW" || rideInstance?.settlementState === "DISPUTE_REVIEW") {
    return {
      label: "Under review",
      body: "RidePod is reviewing the reported issue.",
      cta: "View dispute",
    };
  }

  if (quoteRequest?.disputeStatus === "RESOLVED" || rideInstance?.settlementState === "PAID") {
    return {
      label: "Closed",
      body: "The dispute window is closed in app state.",
      cta: "View dispute",
    };
  }

  return {
    label: "Open",
    body: "Guests can report an issue before the dispute window ends.",
    cta: "Report an issue",
  };
}

function ReceiptProtectionNotice({
  receiptUploaded,
  receiptVerificationStatus,
  isTaxiMeter,
}: {
  receiptUploaded: boolean;
  receiptVerificationStatus: ReceiptVerificationStatusLabel;
  isTaxiMeter: boolean;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[var(--rp-text)]">
            {isTaxiMeter ? "Meter proof verification" : "Receipt verification"}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
            {isTaxiMeter
              ? "Host reimbursement is based on verified meter proof or taxi receipt and approved max fare."
              : "Host reimbursement is based on verified final receipt and approved max fare."}
          </p>
        </div>
        <span className="rounded-full bg-[var(--rp-card-muted)] px-3 py-1 text-xs font-black text-[var(--rp-primary)]">
          {receiptUploaded ? receiptVerificationStatus : "Not submitted"}
        </span>
      </div>
    </section>
  );
}

export function SettlementHeader({ pod }: { pod: RidePod }) {
  return (
    <header className="grid gap-8 pt-1">
      <div className="grid grid-cols-[44px_1fr_44px] items-center">
        <Link
          href="/host"
          aria-label="Back to Host Dashboard"
          className="grid h-11 w-11 place-items-center rounded-full text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-black tracking-tight text-[var(--rp-text)]">Settlement</h1>
          <p className="mt-1 text-xs font-semibold text-[var(--rp-muted)] min-[560px]:hidden">
            {pod.fromLabel} to {pod.toLabel}
          </p>
        </div>
      </div>

      <div>
        <p className="text-[34px] font-black leading-none tracking-normal text-[var(--rp-text)]">
          {pod.fromLabel} <span className="px-2 text-[var(--rp-primary)]">&rarr;</span> {pod.toLabel}
        </p>
        <p className="mt-3 text-xl font-semibold text-[var(--rp-muted)]">
          {pod.date} <span aria-hidden="true">&bull;</span> {pod.time}
        </p>
      </div>
    </header>
  );
}

export function TripSummaryCard({
  route,
  riders,
  vehicle,
  host,
}: {
  route: string;
  riders: string;
  vehicle: string;
  host: string;
}) {
  const summary = [
    { label: "Route", value: route, icon: CalendarClock },
    { label: "Seats", value: riders, icon: UsersRound },
    { label: "Vehicle", value: vehicle, icon: Car },
    { label: "Host", value: host, icon: CheckCircle2 },
  ];

  return (
    <section className="grid grid-cols-2 gap-2 min-[560px]:grid-cols-4" aria-label="Trip summary">
      {summary.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 shadow-[var(--rp-shadow-soft)]"
        >
          <div className="flex items-center gap-2 text-[var(--rp-primary)]">
            <Icon className="h-4 w-4" />
            <p className="text-[11px] font-black uppercase tracking-[0.12em]">{label}</p>
          </div>
          <p className="mt-2 text-sm font-black text-[var(--rp-text)]">{value}</p>
        </div>
      ))}
    </section>
  );
}

export function FinalFareCard({
  finalFare,
  setFinalFare,
  isEditingFare,
  setIsEditingFare,
  isTaxiMeter,
}: {
  finalFare: number;
  setFinalFare: (fare: number) => void;
  isEditingFare: boolean;
  setIsEditingFare: (isEditing: boolean) => void;
  isTaxiMeter: boolean;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border-strong)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-[var(--rp-muted)]">
            {isTaxiMeter ? "Final meter fare" : "Final fare"}
          </p>
          {isEditingFare ? (
            <label className="mt-3 block">
              <span className="sr-only">Final fare amount</span>
              <input
                value={finalFare}
                min={0}
                step="0.01"
                type="number"
                onChange={(event) => setFinalFare(Number(event.target.value))}
                className="h-14 w-full rounded-2xl border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-3xl font-black text-[var(--rp-text)]"
              />
            </label>
          ) : (
            <p className="mt-3 text-[42px] font-black leading-none tracking-normal text-[var(--rp-text)]">
              {formatSettlementMoney(finalFare)}
            </p>
          )}
        </div>
        <SecondaryButton
          className="min-h-12 shrink-0 rounded-xl px-4 text-base"
          onClick={() => setIsEditingFare(!isEditingFare)}
          aria-pressed={isEditingFare}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {isEditingFare ? "Done" : "Edit"}
        </SecondaryButton>
      </div>
    </section>
  );
}

export function ReceiptUploadCard({
  fileName,
  mockFileName,
  receiptUploaded,
  receiptVerificationStatus,
  setReceiptVerificationStatus,
  setSelectedReceiptFile,
  isTaxiMeter,
}: {
  fileName: string | null;
  mockFileName: string;
  receiptUploaded: boolean;
  receiptVerificationStatus: ReceiptVerificationStatusLabel;
  setReceiptVerificationStatus: (status: ReceiptVerificationStatusLabel) => void;
  setSelectedReceiptFile: (fileName: string | null) => void;
  isTaxiMeter: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showReceiptCertification, setShowReceiptCertification] = useState(false);
  const [receiptCertified, setReceiptCertified] = useState(false);
  const displayName = fileName ?? mockFileName;

  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-[var(--rp-text)]">
          {isTaxiMeter ? "Upload meter proof" : "Upload final receipt"}
        </h2>
        {receiptUploaded ? (
          <span className="rounded-full bg-[var(--rp-badge-success-bg)] px-3 py-1 text-xs font-black text-[var(--rp-badge-success-text)]">
            Submitted
          </span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setSelectedReceiptFile(file?.name ?? null);
          if (file) setReceiptVerificationStatus("Submitted");
        }}
      />

      <button
        type="button"
        onClick={() => {
          setReceiptCertified(false);
          setShowReceiptCertification(true);
        }}
        className="mt-4 flex w-full items-center gap-4 rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 text-left transition hover:bg-[var(--rp-card-muted)]"
      >
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
          {receiptUploaded ? <ReceiptText className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-black text-[var(--rp-text)]">
            {receiptUploaded ? displayName : isTaxiMeter ? "Upload meter proof" : "Upload receipt"}
          </span>
          <span className="mt-1 block text-sm font-semibold text-[var(--rp-muted)]">
            {receiptUploaded ? "Stored locally for this mock session" : "JPG, PNG, PDF, up to 10 MB"}
          </span>
        </span>
        <ChevronRight className="h-6 w-6 shrink-0 text-[var(--rp-primary)]" />
      </button>
      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
        Verification status: {receiptUploaded ? receiptVerificationStatus : isTaxiMeter ? "Awaiting meter proof" : "Awaiting final receipt"}
      </p>
      {receiptUploaded ? (
        <div className="mt-3 grid grid-cols-2 gap-2 min-[560px]:grid-cols-3">
          {receiptVerificationStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setReceiptVerificationStatus(status)}
              className={cn(
                "min-h-10 rounded-xl border px-2 text-xs font-black",
                receiptVerificationStatus === status
                  ? "border-[var(--rp-primary)] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]"
                  : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
              )}
            >
              {status}
            </button>
          ))}
        </div>
      ) : null}
      {showReceiptCertification ? (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="receipt-certification-title"
        >
          <section className="w-full max-w-[390px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
                <ReceiptText className="h-5 w-5" />
              </span>
              <div>
                <h2 id="receipt-certification-title" className="text-2xl font-black leading-tight">
                  {isTaxiMeter ? "Confirm meter proof" : "Confirm final receipt"}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                  {isTaxiMeter
                    ? "This meter proof or taxi receipt will be used to calculate the final split and host reimbursement."
                    : "This receipt will be used to calculate the final split and host reimbursement."}
                </p>
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4 text-sm font-black leading-6 text-[var(--rp-muted-strong)]">
              <input
                type="checkbox"
                checked={receiptCertified}
                onChange={(event) => setReceiptCertified(event.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--rp-primary)]"
              />
              <span>
                {isTaxiMeter
                  ? "I confirm this meter proof or taxi receipt is real, accurate, unaltered, and belongs to this completed ride."
                  : "I confirm this receipt is real, accurate, unaltered, and belongs to this completed ride."}
              </span>
            </label>

            <p className="mt-3 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] px-3 py-2 text-xs font-bold leading-5 text-[var(--rp-warning)]">
              Misleading or unsupported proof may go to manual review and account action if needed.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setReceiptCertified(false);
                  setShowReceiptCertification(false);
                }}
                className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!receiptCertified}
                onClick={() => {
                  if (!receiptCertified) return;
                  setShowReceiptCertification(false);
                  inputRef.current?.click();
                }}
                className="min-h-12 rounded-2xl bg-[var(--rp-gradient-primary)] text-sm font-black text-[var(--rp-primary-text)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isTaxiMeter ? "Submit meter proof" : "Submit receipt"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export function FareBreakdownCard({
  items,
  totalPaid,
  baseFare,
  setBaseFare,
  tolls,
  setTolls,
  tip,
  setTip,
  platformFee,
  setPlatformFee,
}: {
  items: BreakdownItem[];
  totalPaid: number;
  baseFare: number;
  setBaseFare: (value: number) => void;
  tolls: number;
  setTolls: (value: number) => void;
  tip: number;
  setTip: (value: number) => void;
  platformFee: number;
  setPlatformFee: (value: number) => void;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-[var(--rp-text)]">Fare breakdown</h2>
        <ReceiptText className="h-5 w-5 text-[var(--rp-primary)]" />
      </div>

      <div className="mt-6 grid gap-6 min-[390px]:grid-cols-[148px_1fr] min-[390px]:items-center">
        <DonutBreakdownChart items={items} />
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-base">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(${item.colorVar})` }}
                  aria-hidden="true"
                />
                <span className="truncate font-semibold text-[var(--rp-muted-strong)]">
                  {item.label}
                </span>
              </div>
              <span className="font-semibold text-[var(--rp-text)]">
                {formatSettlementMoney(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--rp-border)] pt-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xl font-black text-[var(--rp-text)]">Total paid</p>
          <p className="text-2xl font-black text-[var(--rp-text)]">
            {formatSettlementMoney(totalPaid)}
          </p>
        </div>
      </div>

      <details className="mt-4 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
        <summary className="cursor-pointer text-sm font-black text-[var(--rp-primary)]">
          Adjust line items
        </summary>
        <div className="mt-4 grid gap-3 min-[560px]:grid-cols-2">
          <MoneyInput label="Base fare" value={baseFare} onChange={setBaseFare} />
          <MoneyInput label="Tolls" value={tolls} onChange={setTolls} />
          <MoneyInput label="Tip" value={tip} onChange={setTip} />
          <MoneyInput label="Platform fee" value={platformFee} onChange={setPlatformFee} />
        </div>
      </details>
    </section>
  );
}

export function DonutBreakdownChart({ items }: { items: BreakdownItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const segments = items.reduce<{ cursor: number; parts: string[] }>(
    (chart, item) => {
      const start = chart.cursor;
      const end = total > 0 ? start + (item.value / total) * 100 : start;

      return {
        cursor: end,
        parts: [...chart.parts, `var(${item.colorVar}) ${start}% ${end}%`],
      };
    },
    { cursor: 0, parts: [] },
  ).parts;

  return (
    <div
      className="mx-auto grid h-36 w-36 place-items-center rounded-full shadow-[inset_0_0_0_1px_var(--rp-border)]"
      style={{ background: `conic-gradient(${segments.join(", ")})` }}
    >
      <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-[var(--rp-card)] shadow-[inset_0_0_0_1px_var(--rp-border)]">
        <span className="sr-only">Fare breakdown chart</span>
      </div>
    </div>
  );
}

export function FinalShareCard({
  riderCount,
  finalSharePerRider,
  receiptUploaded,
}: {
  riderCount: number;
  finalSharePerRider: number;
  receiptUploaded: boolean;
}) {
  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--rp-primary)]">
            Final share
          </p>
          <h2 className="mt-2 text-3xl font-black text-[var(--rp-text)]">
            {formatSettlementMoney(finalSharePerRider)}
          </h2>
        </div>
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--rp-card-muted)] text-center">
          <p className="text-xl font-black text-[var(--rp-text)]">{riderCount}</p>
          <p className="-mt-2 text-[10px] font-black uppercase text-[var(--rp-muted)]">riders</p>
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
        Final share is based on the uploaded receipt and total paid amount.
      </p>
      <p
        className={cn(
          "mt-4 rounded-2xl px-4 py-3 text-sm font-black",
          receiptUploaded
            ? "bg-[var(--rp-badge-success-bg)] text-[var(--rp-badge-success-text)]"
            : "bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]",
        )}
      >
        {receiptUploaded ? "Receipt attached for review." : "Receipt can be added before final review."}
      </p>
    </section>
  );
}

function RiderFinalSplitCard({
  verifiedReceiptTotal,
  approvedMax,
  fareShare,
  platformFee,
  noShowLateFee,
  finalCharge,
  refundCredit,
}: {
  verifiedReceiptTotal: number;
  approvedMax: number;
  fareShare: number;
  platformFee: number;
  noShowLateFee: number;
  finalCharge: number;
  refundCredit: number;
}) {
  const rows = [
    ["Verified receipt total", verifiedReceiptTotal],
    ["Approved max", approvedMax],
    ["Fare share", fareShare],
    ["Platform fee", platformFee],
    ["No-show / late fee", noShowLateFee],
    ["Final charge", finalCharge],
    ["Refund / credit", refundCredit],
  ] as const;

  return (
    <section className="rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <h2 className="text-lg font-black text-[var(--rp-text)]">Your final split</h2>
      <dl className="mt-4 grid gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="font-semibold text-[var(--rp-muted)]">{label}</dt>
            <dd className="font-black text-[var(--rp-text)]">{formatSettlementMoney(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
        Final settlement uses verified receipt. You cannot be charged above your approved max unless you approved an increase.
      </p>
    </section>
  );
}

function SettlementActions({
  canReview,
  settlementReviewReady,
  setSettlementReviewReady,
}: {
  canReview: boolean;
  settlementReviewReady: boolean;
  setSettlementReviewReady: (ready: boolean) => void;
}) {
  return (
    <section className="sticky bottom-24 z-10 grid gap-3 rounded-[24px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_92%,transparent)] p-4 shadow-[var(--rp-shadow-nav)] backdrop-blur-xl min-[560px]:static">
      <PrimaryButton
        className="min-h-14 w-full rounded-2xl text-base"
        disabled={!canReview}
        onClick={() => setSettlementReviewReady(true)}
      >
        Review settlement
      </PrimaryButton>
      <p className="text-center text-xs font-semibold leading-5 text-[var(--rp-muted)]">
        You can review charges before finalizing.
      </p>

      {settlementReviewReady ? (
        <div
          role="status"
          className="rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] p-4 text-sm leading-6 text-[var(--rp-muted-strong)]"
        >
          <p className="font-black text-[var(--rp-text)]">Settlement review ready</p>
          <p className="mt-1">Mock review prepared. No charges were submitted.</p>
        </div>
      ) : null}
    </section>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[var(--rp-muted-strong)]">
      {label}
      <input
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 rounded-xl border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-3 text-sm font-bold text-[var(--rp-text)]"
      />
    </label>
  );
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function formatSettlementMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
