"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CarFront,
  Clock3,
  Info,
  WalletCards,
} from "lucide-react";
import { Badge, Card, cn } from "@/components/ui";
import {
  acceptTaxiPartnerMockJob,
  completeTaxiPartnerQuoteRequestMock,
  declineTaxiPartnerMockJob,
  getTaxiPartnerQuoteMoneyDisplay,
  getTaxiPartnerQuoteRequest,
  markTaxiPartnerArrivedMock,
  startTaxiPartnerRideMock,
  submitTaxiPartnerMockQuote,
  type TaxiPartnerQuoteRequest,
  type TaxiPartnerTaxiType,
} from "@/lib/taxi-partner-quote";

type TaxiType = "Standard" | "Electric" | "Luggage-friendly" | "Large" | "Comfort" | "Accessible";
type RequestStatus = "Quote requested" | "Quote submitted" | "Quote received";
type ActiveRideStatus =
  | "Job ready"
  | "Waiting for guests to accept"
  | "Ready for pickup"
  | "Taxi partner arrived"
  | "Ride started"
  | "Ride completed"
  | "Payout pending"
  | "Dispute review"
  | "Partner declined"
  | "Closed";
type PayoutStatus = "Payout pending" | "Payout held" | "Payout ready" | "Payout denied in demo" | "Closed";

type PodRequest = {
  id: string;
  rideInstanceId: string;
  route: string;
  dateTime: string;
  pickup: string;
  dropoff: string;
  stops?: string;
  guestCount: number;
  luggageCount: number;
  taxiType: TaxiType;
  accessibility: string;
  safetyBadges: string[];
  fareCapCents: number;
  baselineCents: number;
  status: RequestStatus;
  organizerNote: string;
};

const taxiTypes: TaxiType[] = ["Standard", "Electric", "Luggage-friendly", "Large", "Comfort", "Accessible"];
const expiryOptions = ["10 minutes", "15 minutes", "30 minutes"];

const initialRequests: PodRequest[] = [
  {
    id: "taxi_partner_quote_needed",
    rideInstanceId: "taxi-partner-quote-demo-needed",
    route: "USC Village to LAX Terminal 3",
    dateTime: "Tue May 19 - 8:00 AM",
    pickup: "USC Village rideshare pickup",
    dropoff: "LAX Terminal 3 departures",
    stops: "No extra stops",
    guestCount: 4,
    luggageCount: 2,
    taxiType: "Electric",
    accessibility: "Extra luggage space requested",
    safetyBadges: ["Women-only", "Verified-only"],
    fareCapCents: 26000,
    baselineCents: 23500,
    status: "Quote requested",
    organizerNote: "Guests have two large luggage items and prefer a quiet pickup area.",
  },
  {
    id: "taxi_partner_quote_received",
    rideInstanceId: "taxi-partner-quote-demo-received",
    route: "Tsim Sha Tsui to Causeway Bay",
    dateTime: "Today - 6:30 PM",
    pickup: "Tsim Sha Tsui MTR Exit L5",
    dropoff: "Times Square taxi stand",
    guestCount: 3,
    luggageCount: 0,
    taxiType: "Standard",
    accessibility: "None requested",
    safetyBadges: ["Community-only"],
    fareCapCents: 18000,
    baselineCents: 16500,
    status: "Quote requested",
    organizerNote: "Evening commute pod. Standard taxi is fine.",
  },
  {
    id: "taxi_partner_guests_accepting",
    rideInstanceId: "taxi-partner-quote-demo-accepting",
    route: "Central to Airport",
    dateTime: "Fri - 7:15 AM",
    pickup: "Central ferry pier taxi area",
    dropoff: "Airport departures",
    guestCount: 4,
    luggageCount: 4,
    taxiType: "Luggage-friendly",
    accessibility: "Large luggage space requested",
    safetyBadges: ["High-trust-only", "Invite-only"],
    fareCapCents: 34000,
    baselineCents: 31000,
    status: "Quote requested",
    organizerNote: "Airport pod with four large luggage items.",
  },
];

const initialActiveRides = [
  {
    id: "active-job-ready",
    requestId: "taxi_partner_guests_accepting",
    route: "USC Village to LAX Terminal 3",
    dateTime: "Tue May 19 - 8:00 AM",
    pickup: "USC Village rideshare pickup",
    dropoff: "LAX Terminal 3 departures",
    taxiType: "Electric",
    guestCount: 4,
    luggageCount: 2,
    accessibility: "Extra luggage space requested",
    quoteCents: 24000,
    status: "Job ready" as ActiveRideStatus,
    payoutStatus: "Payout pending" as PayoutStatus,
  },
  {
    id: "active-usc-lax",
    requestId: "taxi_partner_ready",
    route: "USC Village to LAX Terminal 3",
    dateTime: "Tue May 19 - 8:00 AM",
    pickup: "USC Village rideshare pickup",
    dropoff: "LAX Terminal 3 departures",
    taxiType: "Electric",
    guestCount: 4,
    luggageCount: 2,
    accessibility: "Extra luggage space requested",
    quoteCents: 24000,
    status: "Ready for pickup" as ActiveRideStatus,
    payoutStatus: "Payout pending" as PayoutStatus,
  },
  {
    id: "active-tst-cwb",
    requestId: "taxi_partner_quote_received",
    route: "Tsim Sha Tsui to Causeway Bay",
    dateTime: "Today - 6:30 PM",
    pickup: "Tsim Sha Tsui MTR Exit L5",
    dropoff: "Times Square taxi stand",
    taxiType: "Standard",
    guestCount: 3,
    luggageCount: 0,
    accessibility: "None requested",
    quoteCents: 16800,
    status: "Waiting for guests to accept" as ActiveRideStatus,
    payoutStatus: "Payout pending" as PayoutStatus,
  },
  {
    id: "active-review",
    requestId: "taxi_partner_dispute_review",
    route: "Central to Airport",
    dateTime: "Fri - 7:15 AM",
    pickup: "Central ferry pier taxi area",
    dropoff: "Airport departures",
    taxiType: "Luggage-friendly",
    guestCount: 4,
    luggageCount: 4,
    accessibility: "Large luggage space requested",
    quoteCents: 32000,
    status: "Dispute review" as ActiveRideStatus,
    payoutStatus: "Payout held" as PayoutStatus,
  },
];

function isDemoModeEnabled() {
  return process.env.NEXT_PUBLIC_RIDEPOD_DEMO_MODE === "true";
}

function formatHkdCents(cents: number) {
  return `HK$${(cents / 100).toFixed(2)}`;
}

function parseHkdToCents(value: string) {
  const normalized = value.replace(/[^\d.]/g, "");
  if (!normalized) return 0;

  return Math.round(Number(normalized) * 100);
}

function toTaxiPartnerTaxiType(taxiType: TaxiType): TaxiPartnerTaxiType {
  if (taxiType === "Electric") return "ELECTRIC";
  if (taxiType === "Luggage-friendly") return "LUGGAGE_FRIENDLY";
  if (taxiType === "Large") return "LARGE";
  if (taxiType === "Comfort") return "COMFORT";
  if (taxiType === "Accessible") return "ACCESSIBLE";

  return "STANDARD";
}

function expiryToMinutes(expiry: string) {
  if (expiry === "10 minutes") return 10;
  if (expiry === "30 minutes") return 30;
  if (expiry === "15 minutes") return 15;

  return 0;
}

function statusClass(status: string) {
  if (status === "Ready for pickup" || status === "Ride completed" || status === "Payout ready" || status === "Closed" || status === "Guests accepted") {
    return "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25";
  }

  if (status === "Taxi partner arrived" || status === "Ride started") {
    return "bg-sky-400/10 text-sky-300 ring-sky-400/25";
  }

  if (status === "Payout pending" || status === "Waiting for guests to accept" || status === "Quote requested") {
    return "bg-amber-400/10 text-amber-300 ring-amber-400/25";
  }

  if (status === "Dispute review" || status === "Payout held") {
    return "bg-orange-400/10 text-orange-300 ring-orange-400/25";
  }

  if (status === "Job ready" || status === "Partner declined") return "bg-sky-400/10 text-sky-300 ring-sky-400/25";

  if (status === "Payout denied in demo") return "bg-red-400/10 text-red-300 ring-red-400/25";

  return "bg-sky-400/10 text-sky-300 ring-sky-400/25";
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-sky-400/15 bg-[var(--rp-card-soft)] p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">{label}</p>
      <p className="mt-1 text-sm font-black leading-5 text-[var(--rp-text)]">{value}</p>
    </div>
  );
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--rp-border)] py-2 last:border-b-0">
      <dt className="text-sm font-bold text-[var(--rp-muted-strong)]">{label}</dt>
      <dd className="text-right text-sm font-black text-[var(--rp-text)]">{value}</dd>
    </div>
  );
}

export default function TaxiPartnerDashboardPage() {
  const demoModeEnabled = isDemoModeEnabled();
  const [requests, setRequests] = useState(initialRequests);
  const [selectedRequestId, setSelectedRequestId] = useState(initialRequests[0]?.id ?? "");
  const [quoteAmount, setQuoteAmount] = useState("240.00");
  const [selectedTaxiType, setSelectedTaxiType] = useState<TaxiType>("Electric");
  const [selectedExpiry, setSelectedExpiry] = useState("15 minutes");
  const [partnerNote, setPartnerNote] = useState("");
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteMessage, setQuoteMessage] = useState<string | null>(null);
  const [submittedQuoteRequest, setSubmittedQuoteRequest] = useState<TaxiPartnerQuoteRequest | null>(null);
  const [activeRides, setActiveRides] = useState(initialActiveRides);
  const [acceptJobRideId, setAcceptJobRideId] = useState<string | null>(null);
  const [declineJobRideId, setDeclineJobRideId] = useState<string | null>(null);
  const [arrivedRideId, setArrivedRideId] = useState<string | null>(null);
  const [startRideId, setStartRideId] = useState<string | null>(null);
  const [understandsJobAssignment, setUnderstandsJobAssignment] = useState(false);
  const [completionRideId, setCompletionRideId] = useState<string | null>(null);
  const [understandsCompletion, setUnderstandsCompletion] = useState(false);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);

  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? requests[0];
  const quoteCents = parseHkdToCents(quoteAmount);
  const quotePreview = useMemo(
    () => getTaxiPartnerQuoteMoneyDisplay({ quoteAmountCents: quoteCents, currency: "HKD" }, selectedRequest?.guestCount ?? 1),
    [quoteCents, selectedRequest?.guestCount],
  );
  const submittedQuoteAboveCap = Boolean(
    submittedQuoteRequest?.quoteAmountCents &&
      selectedRequest?.fareCapCents &&
      submittedQuoteRequest.quoteAmountCents > selectedRequest.fareCapCents,
  );
  const acceptJobRide = activeRides.find((ride) => ride.id === acceptJobRideId) ?? null;
  const declineJobRide = activeRides.find((ride) => ride.id === declineJobRideId) ?? null;
  const arrivedRide = activeRides.find((ride) => ride.id === arrivedRideId) ?? null;
  const startRideTarget = activeRides.find((ride) => ride.id === startRideId) ?? null;
  const completionRide = activeRides.find((ride) => ride.id === completionRideId) ?? null;
  const acceptJobMoney = acceptJobRide
    ? getTaxiPartnerQuoteMoneyDisplay({ quoteAmountCents: acceptJobRide.quoteCents, currency: "HKD" }, acceptJobRide.guestCount)
    : null;
  const completionRideMoney = completionRide
    ? getTaxiPartnerQuoteMoneyDisplay({ quoteAmountCents: completionRide.quoteCents, currency: "HKD" }, completionRide.guestCount)
    : null;

  if (!demoModeEnabled) {
    return (
      <main className="min-h-screen bg-[var(--rp-background)] px-4 py-6 text-[var(--rp-text)]">
        <section className="mx-auto max-w-3xl rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-6 shadow-[var(--rp-shadow-soft)]">
          <Badge className="bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]">
            Demo mode
          </Badge>
          <h1 className="mt-4 text-3xl font-black">Taxi Partner Dashboard is not enabled.</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
            Set <span className="font-mono text-[var(--rp-text)]">NEXT_PUBLIC_RIDEPOD_DEMO_MODE=true</span> to view
            the mock dashboard for licensed taxi partner quote requests.
          </p>
        </section>
      </main>
    );
  }

  function submitQuote() {
    if (!quoteAmount.trim()) {
      setQuoteError("Add a quote amount.");
      setQuoteMessage(null);
      return;
    }

    if (quoteCents <= 0) {
      setQuoteError("Quote amount must be greater than 0.");
      setQuoteMessage(null);
      return;
    }

    const result = submitTaxiPartnerMockQuote({
      requestId: selectedRequest.id,
      rideInstanceId: selectedRequest.rideInstanceId,
      quoteAmountCents: quoteCents,
      taxiType: toTaxiPartnerTaxiType(selectedTaxiType),
      quoteExpiresInMinutes: expiryToMinutes(selectedExpiry),
      partnerName: "Demo Taxi Partner",
      partnerNote,
      bookingFareCapCents: selectedRequest.fareCapCents,
    });

    if (!result.success) {
      setQuoteError(result.error ?? result.message);
      setQuoteMessage(null);
      return;
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === selectedRequest.id ? { ...request, status: "Quote received" } : request,
      ),
    );
    setSubmittedQuoteRequest(result.quoteRequest);
    setQuoteError(null);
    setQuoteMessage(result.message);
  }

  function markRideCompleted() {
    if (!completionRideId || !understandsCompletion) return;
    const ride = activeRides.find((activeRide) => activeRide.id === completionRideId);
    const request = getTaxiPartnerQuoteRequest(ride?.requestId);

    if (request) {
      completeTaxiPartnerQuoteRequestMock(request);
    }

    setActiveRides((current) =>
      current.map((ride) =>
        ride.id === completionRideId
          ? { ...ride, status: "Payout pending", payoutStatus: "Payout pending" }
          : ride,
      ),
    );
    setCompletionMessage("Ride completed. Payout is pending until the dispute window ends.");
    setCompletionRideId(null);
    setUnderstandsCompletion(false);
  }

  function acceptJob() {
    const ride = activeRides.find((activeRide) => activeRide.id === acceptJobRideId);
    if (!ride || !understandsJobAssignment) return;

    acceptTaxiPartnerMockJob(ride.requestId);
    setActiveRides((current) =>
      current.map((activeRide) =>
        activeRide.id === ride.id
          ? { ...activeRide, status: "Ready for pickup" }
          : activeRide,
      ),
    );
    setCompletionMessage("Job accepted. This ride is ready for pickup in demo mode.");
    setAcceptJobRideId(null);
    setUnderstandsJobAssignment(false);
  }

  function declineJob() {
    const ride = activeRides.find((activeRide) => activeRide.id === declineJobRideId);
    if (!ride) return;

    declineTaxiPartnerMockJob(ride.requestId);
    setActiveRides((current) =>
      current.map((activeRide) =>
        activeRide.id === ride.id
          ? { ...activeRide, status: "Partner declined" }
          : activeRide,
      ),
    );
    setCompletionMessage("Partner declined. Organizer may request another quote.");
    setDeclineJobRideId(null);
  }

  function markArrived() {
    const ride = activeRides.find((activeRide) => activeRide.id === arrivedRideId);
    if (!ride) return;

    markTaxiPartnerArrivedMock(ride.requestId);
    setActiveRides((current) =>
      current.map((activeRide) =>
        activeRide.id === ride.id
          ? { ...activeRide, status: "Taxi partner arrived" }
          : activeRide,
      ),
    );
    setCompletionMessage("Taxi partner arrived. Meet at the pickup point.");
    setArrivedRideId(null);
  }

  function startRide() {
    const ride = activeRides.find((activeRide) => activeRide.id === startRideId);
    if (!ride) return;

    startTaxiPartnerRideMock(ride.requestId);
    setActiveRides((current) =>
      current.map((activeRide) =>
        activeRide.id === ride.id
          ? { ...activeRide, status: "Ride started" }
          : activeRide,
      ),
    );
    setCompletionMessage("Ride started. The shared taxi ride is in progress.");
    setStartRideId(null);
  }

  return (
    <main className="min-h-screen bg-[var(--rp-background)] px-4 py-6 text-[var(--rp-text)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="overflow-hidden rounded-[32px] border border-sky-400/35 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_38%),var(--rp-card)] p-5 shadow-[0_18px_46px_rgba(14,165,233,0.12)] sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge className="bg-sky-400/10 text-sky-200 ring-sky-400/25">Future beta prototype</Badge>
              <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">Taxi Partner Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                Demo dashboard for licensed taxi partner quote requests.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Taxi partner", "Quote", "Shared pod", "Demo mode"].map((chip) => (
                <Badge key={chip} className="border border-sky-400/20 bg-sky-400/10 text-sky-100 ring-sky-400/25">
                  {chip}
                </Badge>
              ))}
            </div>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-[18px] border border-sky-400/25 bg-sky-400/10 p-4 text-sky-100">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" />
            <p className="text-sm font-bold leading-6">
              Future beta prototype. RidePod does not provide drivers. Taxi partners are external licensed providers. No real dispatch or payout yet.
            </p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="border-sky-400/25 bg-[linear-gradient(135deg,rgba(14,165,233,0.1),rgba(15,23,42,0.12)),var(--rp-card)]">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-sky-400/25 bg-sky-400/10 text-sky-300">
                <BriefcaseBusiness className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-black">Demo Taxi Partner</h2>
                <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">Licensed taxi partner</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="bg-sky-400/10 text-sky-200 ring-sky-400/25">Demo mode</Badge>
              {["Standard", "Electric", "Luggage-friendly", "Large", "Accessible"].map((option) => (
                <Badge key={option} className="bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] ring-[var(--rp-border)]">
                  {option}
                </Badge>
              ))}
            </div>
            <p className="mt-4 rounded-[16px] border border-sky-400/20 bg-sky-400/10 p-3 text-xs font-bold leading-5 text-sky-100">
              This is a mock partner profile for beta testing only. It does not collect license, plate, ID, or bank details.
            </p>
          </Card>

          <Card className="border-sky-400/25">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Incoming pod requests</h2>
                <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">
                  Shared pod quote requests from organizers.
                </p>
              </div>
              <Badge className="bg-amber-400/10 text-amber-300 ring-amber-400/25">Quote requested</Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className={cn(
                    "rounded-[20px] border bg-[var(--rp-card-soft)] p-4 transition",
                    selectedRequest.id === request.id ? "border-sky-400/60 ring-1 ring-sky-400/30" : "border-[var(--rp-border)]",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black">{request.route}</h3>
                      <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">{request.dateTime}</p>
                    </div>
                    <Badge className={statusClass(request.status)}>{request.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="bg-sky-400/10 text-sky-200 ring-sky-400/25">{request.guestCount} guests</Badge>
                    <Badge className="bg-sky-400/10 text-sky-200 ring-sky-400/25">{request.taxiType} taxi</Badge>
                    {request.luggageCount > 0 ? (
                      <Badge className="bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] ring-[var(--rp-border)]">
                        {request.luggageCount} large luggage
                      </Badge>
                    ) : null}
                    {request.safetyBadges.map((badge) => (
                      <Badge key={badge} className="bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)] ring-[var(--rp-border)]">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2 min-[520px]:grid-cols-2">
                    <button
                      type="button"
                  onClick={() => {
                        setSelectedRequestId(request.id);
                        setSelectedTaxiType(request.taxiType);
                        setSubmittedQuoteRequest(null);
                        setQuoteMessage(null);
                        setQuoteError(null);
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-sky-500 px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(14,165,233,0.22)] transition hover:bg-sky-400"
                    >
                      Quote this pod <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRequestId(request.id)}
                      className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-sky-400/30 bg-sky-400/10 px-4 text-sm font-black text-sky-200 transition hover:bg-sky-400/15"
                    >
                      View details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-sky-400/25">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Shared pod request</h2>
                <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">
                  Partner-facing detail view. Private rider data is hidden.
                </p>
              </div>
              <CarFront className="h-6 w-6 text-sky-300" />
            </div>
            <div className="mt-4 grid gap-3 min-[680px]:grid-cols-2">
              <FieldRow label="Route" value={selectedRequest.route} />
              <FieldRow label="Date/time" value={selectedRequest.dateTime} />
              <FieldRow label="Pickup" value={selectedRequest.pickup} />
              <FieldRow label="Dropoff" value={selectedRequest.dropoff} />
              <FieldRow label="Stops" value={selectedRequest.stops ?? "No extra stops"} />
              <FieldRow label="Guests" value={`${selectedRequest.guestCount} guests`} />
              <FieldRow label="Taxi type" value={`${selectedRequest.taxiType} taxi`} />
              <FieldRow label="Luggage" value={`${selectedRequest.luggageCount} large luggage`} />
              <FieldRow label="Accessibility" value={selectedRequest.accessibility} />
              <FieldRow label="Fare cap" value={formatHkdCents(selectedRequest.fareCapCents)} />
              <FieldRow label="Route estimate" value={formatHkdCents(selectedRequest.baselineCents)} />
              <FieldRow label="Organizer note" value={selectedRequest.organizerNote} />
            </div>
            <div className="mt-4 rounded-[16px] border border-sky-400/20 bg-sky-400/10 p-3">
              <p className="text-sm font-black text-sky-100">Safety/access mode summary</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedRequest.safetyBadges.map((badge) => (
                  <Badge key={badge} className="bg-sky-400/10 text-sky-200 ring-sky-400/25">
                    {badge}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 text-xs font-bold leading-5 text-sky-100">
                Safety modes control who can join the shared pod. They do not require a specific taxi driver unless supported by the taxi partner.
              </p>
            </div>
          </Card>

          <Card className="border-sky-400/25">
            <h2 className="text-xl font-black">Submit partner quote</h2>
            <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">
              Submit a mock shared pod quote for guests to review.
            </p>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-black">
                Quote amount
                <input
                  value={quoteAmount}
                  onChange={(event) => setQuoteAmount(event.target.value)}
                  placeholder="HK$0.00"
                  className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
                />
              </label>

              <label className="grid gap-2 text-sm font-black">
                Taxi type
                <select
                  value={selectedTaxiType}
                  onChange={(event) => setSelectedTaxiType(event.target.value as TaxiType)}
                  className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
                >
                  {taxiTypes.map((taxiType) => (
                    <option key={taxiType}>{taxiType}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-black">
                Quote expires in
                <select
                  value={selectedExpiry}
                  onChange={(event) => setSelectedExpiry(event.target.value)}
                  className="min-h-12 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 text-sm font-bold text-[var(--rp-text)]"
                >
                  {expiryOptions.map((expiry) => (
                    <option key={expiry}>{expiry}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-black">
                Partner note optional
                <textarea
                  value={partnerNote}
                  onChange={(event) => setPartnerNote(event.target.value)}
                  placeholder="Add pickup or vehicle notes."
                  className="min-h-24 rounded-[14px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] px-4 py-3 text-sm font-bold text-[var(--rp-text)]"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={submitQuote}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-[16px] bg-sky-500 px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(14,165,233,0.22)] transition hover:bg-sky-400"
            >
              Submit quote
            </button>

            {quoteError ? (
              <p className="mt-3 rounded-[14px] border border-red-400/20 bg-red-400/10 p-3 text-sm font-black text-red-300">
                {quoteError}
              </p>
            ) : null}
            {quoteMessage ? (
              <div className="mt-3 rounded-[14px] border border-emerald-400/20 bg-emerald-400/10 p-3">
                <p className="text-sm font-black text-emerald-300">Quote submitted</p>
                <p className="mt-1 text-xs font-bold leading-5 text-emerald-200">
                  Guests can now review and accept this shared taxi quote.
                </p>
                <p className="mt-2 text-xs font-bold leading-5 text-emerald-200">
                  Organizer view updates to Taxi quote received. Guest acceptance can now show Accept quote / Decline.
                </p>
              </div>
            ) : null}

            <div className="mt-4 rounded-[18px] border border-sky-400/20 bg-sky-400/10 p-4">
              <h3 className="text-base font-black">Quote breakdown preview</h3>
              {quotePreview ? (
                <dl className="mt-3">
                  <MoneyRow label="Quote" value={formatHkdCents(quotePreview.quoteAmountCents)} />
                  <MoneyRow label="Guests" value={String(selectedRequest.guestCount)} />
                  <MoneyRow label="Fare share" value={formatHkdCents(quotePreview.fareShareCents)} />
                  <MoneyRow label="Platform fee" value={`${formatHkdCents(quotePreview.platformFeeCents)} / guest`} />
                  <MoneyRow label="Guest total" value={formatHkdCents(quotePreview.guestChargeCents)} />
                  <MoneyRow label="Platform fee total" value={formatHkdCents(quotePreview.platformFeeTotalCents)} />
                  <MoneyRow label="Taxi partner payout" value={formatHkdCents(quotePreview.driverPayoutCents)} />
                </dl>
              ) : (
                <p className="mt-3 text-sm font-bold text-[var(--rp-muted-strong)]">Add a quote amount to preview guest totals.</p>
              )}
              {submittedQuoteAboveCap ? (
                <div className="mt-3 flex items-start gap-3 rounded-[16px] border border-orange-400/25 bg-orange-400/10 p-3 text-orange-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-xs font-bold leading-5">
                    Quote above fare cap. Guests must approve the higher amount before the ride can proceed.
                    <span className="sr-only"> TODO: Wire above-cap quote approval state later.</span>
                  </p>
                </div>
              ) : null}
              <p className="mt-3 text-xs font-bold leading-5 text-sky-100">
                Payout stays pending until ride completion and dispute window review in this demo flow.
              </p>
              <p className="mt-2 text-xs font-bold leading-5 text-sky-100">
                No real payout is sent in this demo.
              </p>
            </div>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <Card className="border-sky-400/25">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Accepted jobs / active rides</h2>
                <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">
                  Demo ride states for future taxi partner operations.
                </p>
              </div>
              <Clock3 className="h-6 w-6 text-sky-300" />
            </div>
            <div className="mt-4 grid gap-3">
              {activeRides.map((ride) => {
                const rideMoney = getTaxiPartnerQuoteMoneyDisplay(
                  { quoteAmountCents: ride.quoteCents, currency: "HKD" },
                  ride.guestCount,
                );
                const jobReady = ride.status === "Job ready";
                const partnerDeclined = ride.status === "Partner declined";

                return (
                  <article
                    key={ride.id}
                    className={cn(
                      "rounded-[20px] border bg-[var(--rp-card-soft)] p-4",
                      jobReady ? "border-sky-400/35" : "border-[var(--rp-border)]",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black">{jobReady ? "Job ready" : ride.route}</h3>
                        <p className="mt-1 text-sm font-bold text-[var(--rp-muted-strong)]">
                          {jobReady
                            ? "Guests accepted the quote. Accept this shared taxi job to proceed."
                            : ride.dateTime}
                        </p>
                      </div>
                      <Badge className={statusClass(jobReady ? "Guests accepted" : ride.status)}>
                        {jobReady ? "Guests accepted" : ride.status}
                      </Badge>
                    </div>

                    <div className="mt-3 grid gap-2 min-[620px]:grid-cols-2">
                      <FieldRow label="Route" value={ride.route} />
                      <FieldRow label="Date/time" value={ride.dateTime} />
                      <FieldRow label="Pickup" value={ride.pickup} />
                      <FieldRow label="Dropoff" value={ride.dropoff} />
                      <FieldRow label="Taxi type" value={`${ride.taxiType} taxi`} />
                      <FieldRow label="Guest count" value={`${ride.guestCount} guests`} />
                      <FieldRow label="Luggage" value={`${ride.luggageCount} large luggage`} />
                      <FieldRow label="Accessibility" value={ride.accessibility} />
                    </div>

                    {["Ready for pickup", "Taxi partner arrived", "Ride started"].includes(ride.status) ? (
                      <div className="mt-3 rounded-[18px] border border-sky-400/25 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(15,23,42,0.16))] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-black text-[var(--rp-text)]">Pickup coordination</h4>
                            <p className="mt-1 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                              Use this demo checklist to coordinate the shared pickup.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={statusClass(ride.status)}>{ride.status}</Badge>
                            <Badge className={statusClass("Guests accepted")}>Guests accepted</Badge>
                            <Badge className="bg-sky-400/10 text-sky-200 ring-sky-400/25">Demo mode</Badge>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 min-[620px]:grid-cols-2">
                          <FieldRow label="Pickup point" value={ride.pickup} />
                          <FieldRow label="Dropoff point" value={ride.dropoff} />
                          <FieldRow label="Pickup time" value={ride.dateTime} />
                          <FieldRow label="Guest count" value={`${ride.guestCount} guests accepted`} />
                          <FieldRow label="Taxi type" value={`${ride.taxiType} taxi`} />
                          <FieldRow label="Luggage" value={`${ride.luggageCount} large luggage`} />
                        </div>
                        <p className="mt-3 rounded-[14px] border border-sky-400/20 bg-sky-400/10 p-3 text-xs font-bold leading-5 text-sky-100">
                          Live GPS is not enabled yet. No rider phone numbers or private profile details are shown.
                        </p>
                        <div className="mt-4 grid gap-2 min-[620px]:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => setArrivedRideId(ride.id)}
                            disabled={ride.status !== "Ready for pickup"}
                            className={cn(
                              "inline-flex min-h-11 items-center justify-center rounded-[14px] px-4 text-sm font-black transition",
                              ride.status === "Ready for pickup"
                                ? "bg-sky-500 text-white shadow-[0_14px_28px_rgba(14,165,233,0.22)] hover:bg-sky-400"
                                : "border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
                            )}
                          >
                            Mark arrived
                          </button>
                          <button
                            type="button"
                            onClick={() => setStartRideId(ride.id)}
                            disabled={ride.status === "Ride started"}
                            className={cn(
                              "inline-flex min-h-11 items-center justify-center rounded-[14px] px-4 text-sm font-black transition",
                              ride.status !== "Ride started"
                                ? "border border-sky-400/30 bg-sky-400/10 text-sky-200 hover:bg-sky-400/15"
                                : "border border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
                            )}
                          >
                            Start ride
                          </button>
                          <button
                            type="button"
                            onClick={() => setCompletionMessage("Contact organizer placeholder. No phone number is exposed in this demo.")}
                            className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
                          >
                            Contact organizer
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 rounded-[16px] border border-sky-400/20 bg-sky-400/10 p-3">
                      <dl>
                        <MoneyRow label="Taxi partner quote" value={formatHkdCents(ride.quoteCents)} />
                        <MoneyRow
                          label="Taxi partner payout"
                          value={rideMoney ? formatHkdCents(rideMoney.driverPayoutCents) : formatHkdCents(ride.quoteCents)}
                        />
                      </dl>
                      <p className="mt-2 text-xs font-bold leading-5 text-sky-100">
                        RidePod platform fee is paid by guests. No real payout is sent in beta.
                      </p>
                    </div>

                    {partnerDeclined ? (
                      <p className="mt-3 rounded-[14px] border border-amber-400/20 bg-amber-400/10 p-3 text-xs font-bold leading-5 text-amber-200">
                        Organizer may request another quote.
                      </p>
                    ) : (
                      <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                        Demo only. No real dispatch happens.
                      </p>
                    )}

                    {jobReady ? (
                      <div className="mt-4 grid gap-2 min-[520px]:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAcceptJobRideId(ride.id);
                            setUnderstandsJobAssignment(false);
                          }}
                          className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-sky-500 px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(14,165,233,0.22)] transition hover:bg-sky-400"
                        >
                          Accept job
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeclineJobRideId(ride.id)}
                          className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-amber-400/30 bg-amber-400/10 px-4 text-sm font-black text-amber-200 transition hover:bg-amber-400/15"
                        >
                          Decline job
                        </button>
                      </div>
                    ) : null}

                    {ride.status === "Ready for pickup" || ride.status === "Taxi partner arrived" || ride.status === "Ride started" ? (
                      <button
                        type="button"
                        onClick={() => setCompletionRideId(ride.id)}
                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[14px] bg-sky-500 px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(14,165,233,0.22)] transition hover:bg-sky-400"
                      >
                        Mark completed
                      </button>
                    ) : null}

                    {ride.status === "Ride started" ? (
                      <div className="mt-3 rounded-[18px] border border-emerald-400/25 bg-emerald-400/10 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-black text-[var(--rp-text)]">Complete ride</h4>
                            <p className="mt-1 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                              Mark this shared taxi ride completed in demo mode.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={statusClass("Ride started")}>Ride started</Badge>
                            <Badge className="bg-sky-400/10 text-sky-200 ring-sky-400/25">Demo mode</Badge>
                            <Badge className="bg-amber-400/10 text-amber-300 ring-amber-400/25">No real payout yet</Badge>
                          </div>
                        </div>
                        <dl className="mt-3">
                          <MoneyRow label="Route" value={ride.route} />
                          <MoneyRow label="Date/time" value={ride.dateTime} />
                          <MoneyRow label="Taxi type" value={`${ride.taxiType} taxi`} />
                          <MoneyRow label="Taxi partner quote" value={formatHkdCents(ride.quoteCents)} />
                          <MoneyRow label="Accepted guests" value={`${ride.guestCount} guests`} />
                          <MoneyRow label="Pickup status" value="Ride started" />
                          <MoneyRow
                            label="Payout amount"
                            value={rideMoney ? formatHkdCents(rideMoney.driverPayoutCents) : formatHkdCents(ride.quoteCents)}
                          />
                        </dl>
                        <p className="mt-3 text-xs font-bold leading-5 text-emerald-100">
                          This starts the dispute window. No real payout is sent.
                        </p>
                      </div>
                    ) : null}

                    {["Payout pending", "Dispute review", "Ride completed"].includes(ride.status) ? (
                      <div className="mt-3 rounded-[18px] border border-sky-400/25 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(15,23,42,0.16))] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-black text-[var(--rp-text)]">Payout status</h4>
                            <p className="mt-1 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                              {ride.status === "Dispute review"
                                ? "Payout is held while RidePod reviews the case."
                                : "Payout stays pending until the dispute window clears."}
                            </p>
                          </div>
                          <Badge className={statusClass(ride.status === "Dispute review" ? "Payout held" : "Payout pending")}>
                            {ride.status === "Dispute review" ? "Payout held" : "Payout pending"}
                          </Badge>
                        </div>
                        <dl className="mt-3">
                          <MoneyRow label="Taxi partner quote" value={formatHkdCents(ride.quoteCents)} />
                          <MoneyRow
                            label="Taxi partner payout"
                            value={rideMoney ? formatHkdCents(rideMoney.driverPayoutCents) : formatHkdCents(ride.quoteCents)}
                          />
                          <MoneyRow
                            label="Platform fee total"
                            value={rideMoney ? formatHkdCents(rideMoney.platformFeeTotalCents) : "HK$0.00"}
                          />
                          <MoneyRow label="Dispute window" value="24h" />
                          <MoneyRow label="Payout mode" value="Demo only" />
                        </dl>
                        <p className="mt-3 rounded-[14px] border border-sky-400/20 bg-sky-400/10 p-3 text-xs font-bold leading-5 text-sky-100">
                          No real payout is sent in beta. Guests can report an issue before payout can be marked ready.
                        </p>
                        <div className="mt-4 grid gap-2 min-[520px]:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setCompletionMessage("Dispute window is open. Payout may be held if a guest reports an issue.")}
                            className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-sky-400/30 bg-sky-400/10 px-4 text-sm font-black text-sky-200 transition hover:bg-sky-400/15"
                          >
                            View dispute window
                          </button>
                          <button
                            type="button"
                            onClick={() => setCompletionMessage("Manual review status shown for demo only. RidePod is reviewing the case.")}
                            className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-orange-400/30 bg-orange-400/10 px-4 text-sm font-black text-orange-200 transition hover:bg-orange-400/15"
                          >
                            View review status
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
            {completionMessage ? (
              <div className="mt-4 rounded-[16px] border border-emerald-400/20 bg-emerald-400/10 p-3">
                <p className="text-sm font-black text-emerald-300">
                  {completionMessage.startsWith("Job accepted")
                    ? "Job accepted"
                    : completionMessage.startsWith("Partner declined")
                      ? "Partner declined"
                      : completionMessage.startsWith("Taxi partner arrived")
                        ? "Taxi partner arrived"
                        : completionMessage.startsWith("Ride started")
                          ? "Ride started"
                          : "Ride completed"}
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-emerald-200">
                  {completionMessage.startsWith("Job accepted")
                    ? "This ride is ready for pickup in demo mode."
                    : completionMessage.startsWith("Partner declined")
                      ? "Organizer may request another quote."
                      : completionMessage.startsWith("Taxi partner arrived")
                        ? "Meet at the pickup point."
                        : completionMessage.startsWith("Ride started")
                          ? "The shared taxi ride is in progress."
                          : "Payout is pending until the dispute window ends."}
                </p>
              </div>
            ) : null}
          </Card>

          <div className="grid gap-5">
            <Card className="border-sky-400/25 bg-[linear-gradient(135deg,rgba(14,165,233,0.1),rgba(15,23,42,0.12)),var(--rp-card)]">
              <div className="flex items-start gap-3">
                <CarFront className="mt-1 h-6 w-6 text-sky-300" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black">Live pickup tracking</h2>
                    <Badge className="bg-sky-400/10 text-sky-200 ring-sky-400/25">Coming later</Badge>
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                    Future: show taxi partner location and pickup progress here.
                  </p>
                </div>
              </div>
              <p className="mt-4 rounded-[16px] border border-sky-400/20 bg-sky-400/10 p-3 text-xs font-bold leading-5 text-sky-100">
                No live GPS is shared in this beta prototype.
              </p>
            </Card>

            <Card className="border-sky-400/25">
              <div className="flex items-start gap-3">
                <WalletCards className="mt-1 h-6 w-6 text-sky-300" />
                <div>
                  <h2 className="text-xl font-black">Payout status</h2>
                  <p className="mt-1 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                    Demo payout status preview for partner-facing ride states.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {[
                  ["Payout pending", "Payout stays pending until the dispute window clears.", "View dispute window"],
                  ["Payout held", "Payout is held while RidePod reviews the case.", "View review status"],
                  ["Payout ready", "Review is complete. Payout can be marked ready in demo mode.", "View payout details"],
                  ["Payout denied in demo", "Payout was denied during demo review.", "View review"],
                  ["Closed", "Payout was closed in demo mode.", "View details"],
                ].map(([status, body, cta]) => (
                  <div key={status} className="rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
                    <Badge className={statusClass(status)}>{status}</Badge>
                    <p className="mt-2 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">{body}</p>
                    <button
                      type="button"
                      onClick={() => setCompletionMessage(`${status} shown for demo only.`)}
                      className="mt-3 inline-flex min-h-9 items-center justify-center rounded-[12px] border border-sky-400/25 bg-sky-400/10 px-3 text-xs font-black text-sky-200 transition hover:bg-sky-400/15"
                    >
                      {cta}
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-[16px] border border-sky-400/20 bg-sky-400/10 p-3 text-xs font-bold leading-5 text-sky-100">
                No real payout is sent in beta.
              </p>
            </Card>

            <Card className="border-orange-400/25 bg-[linear-gradient(135deg,rgba(251,146,60,0.1),rgba(15,23,42,0.12)),var(--rp-card)]">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-6 w-6 text-orange-300" />
                <div>
                  <h2 className="text-xl font-black">Manual review</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-[var(--rp-muted-strong)]">
                    RidePod is reviewing this taxi partner ride. Payout may be held during review.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletionMessage("Manual review status shown for demo only.")}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[14px] border border-orange-400/30 bg-orange-400/10 px-4 text-sm font-black text-orange-200 transition hover:bg-orange-400/15"
              >
                View review status
              </button>
            </Card>
          </div>
        </section>
      </div>

      {acceptJobRide ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="taxi-partner-accept-job-title"
        >
          <section className="w-full max-w-[480px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <h2 id="taxi-partner-accept-job-title" className="text-2xl font-black leading-tight">
              Accept this taxi job?
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              You are accepting this shared taxi pod in demo mode. No real dispatch or payout happens.
            </p>
            <dl className="mt-5 rounded-[18px] border border-sky-400/20 bg-sky-400/10 p-3">
              <MoneyRow label="Route" value={acceptJobRide.route} />
              <MoneyRow label="Date/time" value={acceptJobRide.dateTime} />
              <MoneyRow label="Taxi partner quote" value={formatHkdCents(acceptJobRide.quoteCents)} />
              <MoneyRow label="Taxi type" value={`${acceptJobRide.taxiType} taxi`} />
              <MoneyRow label="Guest count" value={`${acceptJobRide.guestCount} guests`} />
              <MoneyRow
                label="Payout amount"
                value={acceptJobMoney ? formatHkdCents(acceptJobMoney.driverPayoutCents) : formatHkdCents(acceptJobRide.quoteCents)}
              />
            </dl>
            <label className="mt-4 flex gap-3 rounded-[16px] border border-sky-400/20 bg-sky-400/10 p-3 text-sm font-bold leading-6 text-sky-100">
              <input
                type="checkbox"
                checked={understandsJobAssignment}
                onChange={(event) => setUnderstandsJobAssignment(event.target.checked)}
                className="mt-1 h-4 w-4 accent-sky-500"
              />
              <span>I understand this is a beta mock job assignment.</span>
            </label>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setAcceptJobRideId(null);
                  setUnderstandsJobAssignment(false);
                }}
                className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!understandsJobAssignment}
                onClick={acceptJob}
                className={cn(
                  "min-h-12 rounded-2xl border text-sm font-black transition",
                  understandsJobAssignment
                    ? "border-sky-400 bg-sky-500 text-white hover:bg-sky-400"
                    : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
                )}
              >
                Accept job
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {declineJobRide ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="taxi-partner-decline-job-title"
        >
          <section className="w-full max-w-[460px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <h2 id="taxi-partner-decline-job-title" className="text-2xl font-black leading-tight">
              Decline this job?
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              If you decline, the organizer may need to request another taxi partner quote.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeclineJobRideId(null)}
                className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={declineJob}
                className="min-h-12 rounded-2xl border border-amber-400/30 bg-amber-400/10 text-sm font-black text-amber-200 transition hover:bg-amber-400/15"
              >
                Decline job
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {arrivedRide ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="taxi-partner-arrived-title"
        >
          <section className="w-full max-w-[460px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <h2 id="taxi-partner-arrived-title" className="text-2xl font-black leading-tight">
              Mark arrived?
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              This demo action tells the group the taxi partner is at the pickup point. No live GPS is shared.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setArrivedRideId(null)}
                className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={markArrived}
                className="min-h-12 rounded-2xl border border-sky-400 bg-sky-500 text-sm font-black text-white transition hover:bg-sky-400"
              >
                Mark arrived
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {startRideTarget ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="taxi-partner-start-ride-title"
        >
          <section className="w-full max-w-[460px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <h2 id="taxi-partner-start-ride-title" className="text-2xl font-black leading-tight">
              Start ride?
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              This demo action marks the shared taxi ride as started.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStartRideId(null)}
                className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startRide}
                className="min-h-12 rounded-2xl border border-sky-400 bg-sky-500 text-sm font-black text-white transition hover:bg-sky-400"
              >
                Start ride
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {completionRideId ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(3,7,18,0.68)] px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="taxi-partner-complete-title"
        >
          <section className="w-full max-w-[460px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <h2 id="taxi-partner-complete-title" className="text-2xl font-black leading-tight">
              Mark ride completed?
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              This demo action marks the taxi partner ride as completed and starts the dispute window. No real payout is sent.
            </p>
            {completionRide ? (
              <dl className="mt-5 rounded-[18px] border border-sky-400/20 bg-sky-400/10 p-3">
                <MoneyRow label="Route" value={completionRide.route} />
                <MoneyRow label="Date/time" value={completionRide.dateTime} />
                <MoneyRow label="Taxi partner quote" value={formatHkdCents(completionRide.quoteCents)} />
                <MoneyRow label="Accepted guests" value={`${completionRide.guestCount} guests`} />
                <MoneyRow
                  label="Taxi partner payout"
                  value={
                    completionRideMoney
                      ? formatHkdCents(completionRideMoney.driverPayoutCents)
                      : formatHkdCents(completionRide.quoteCents)
                  }
                />
                <MoneyRow
                  label="Platform fee total"
                  value={completionRideMoney ? formatHkdCents(completionRideMoney.platformFeeTotalCents) : "HK$0.00"}
                />
              </dl>
            ) : null}
            <label className="mt-4 flex gap-3 rounded-[16px] border border-sky-400/20 bg-sky-400/10 p-3 text-sm font-bold leading-6 text-sky-100">
              <input
                type="checkbox"
                checked={understandsCompletion}
                onChange={(event) => setUnderstandsCompletion(event.target.checked)}
                className="mt-1 h-4 w-4 accent-sky-500"
              />
              <span>I understand this is a beta mock completion.</span>
            </label>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCompletionRideId(null);
                  setUnderstandsCompletion(false);
                }}
                className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!understandsCompletion}
                onClick={markRideCompleted}
                className={cn(
                  "min-h-12 rounded-2xl border text-sm font-black transition",
                  understandsCompletion
                    ? "border-sky-400 bg-sky-500 text-white hover:bg-sky-400"
                    : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted)]",
                )}
              >
                Mark completed
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
