import type { HomeRide, RoutePlanStop } from "@/lib/home-ride-mock";

type DemoProfileIdentity = {
  account_name?: string | null;
  display_name?: string | null;
  email?: string | null;
} | null;

type DemoUserIdentity = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null;

type DemoIdentity = {
  profile?: DemoProfileIdentity;
  user?: DemoUserIdentity;
};

type DemoPersona = "trial_1" | "trial_2" | "trial_3";

const demoRideIds = new Set(["ra-h-11"]);
const seedStopRequestId = "ra-h-11-stop-mandy";

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizedPersonName(value: unknown) {
  return normalized(value).replace(/\s*\(you\)\s*$/, "");
}

function emailName(value: unknown) {
  const text = normalized(value);
  return text.includes("@") ? text.split("@")[0] ?? "" : "";
}

function metadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

function getIdentityTokens(identity: DemoIdentity) {
  const metadata = identity.user?.user_metadata;
  return new Set(
    [
      identity.profile?.account_name,
      identity.profile?.display_name,
      identity.profile?.email,
      emailName(identity.profile?.email),
      identity.user?.email,
      emailName(identity.user?.email),
      metadataString(metadata, "account_name"),
      metadataString(metadata, "display_name"),
    ]
      .map(normalized)
      .filter(Boolean),
  );
}

export function getRideAppDemoPersona(identity: DemoIdentity): DemoPersona | null {
  const tokens = getIdentityTokens(identity);
  if (tokens.has("trial_1")) return "trial_1";
  if (tokens.has("trial_2")) return "trial_2";
  if (tokens.has("trial_3")) return "trial_3";
  return null;
}

function isDemoRide(ride: HomeRide) {
  return (
    ride.rideCategory === "ride_app_self_settle" &&
    (demoRideIds.has(ride.id) || ride.fromLabel.trim().toLowerCase() === "mock action test")
  );
}

function clearDemoRelationship(ride: HomeRide): HomeRide {
  if (!isDemoRide(ride)) return ride;

  return {
    ...ride,
    currentUserRole: undefined,
    currentUserName: undefined,
    currentUserJoined: false,
    currentUserBookingDetailsConfirmed: false,
    currentUserConfirmedBookingDetailsVersion: null,
    currentUserRideAppDetailVersionConfirmed: undefined,
    currentUserQuoteAccepted: false,
    currentUserJoinIntentStatus: "not_joined",
    currentUserConfirmationExpired: false,
    selfSettleConfirmationStatus: undefined,
    platformFeeStatus: "pending",
    quoteStatus: ride.quoteStatus === "joined" ? "quote_pending" : ride.quoteStatus,
    riderConfirmations: ride.riderConfirmations?.map((rider) => ({
      ...rider,
      isCurrentUser: false,
    })),
  };
}

function normalizeSeedStop(stop: RoutePlanStop): RoutePlanStop {
  if (stop.id !== seedStopRequestId) return stop;
  return {
    ...stop,
    requestedBy: "trial_3",
  };
}

function removeSeedStop(stops: RoutePlanStop[] | undefined) {
  return (stops ?? []).filter((stop) => stop.id !== seedStopRequestId);
}

function normalizeSeedStops(stops: RoutePlanStop[] | undefined) {
  return (stops ?? []).map(normalizeSeedStop);
}

function getExistingConfirmation(ride: HomeRide, name: string) {
  return ride.riderConfirmations?.find((rider) => normalizedPersonName(rider.name) === name) ?? null;
}

function demoRiderConfirmations(ride: HomeRide, currentName: string | null = null): HomeRide["riderConfirmations"] {
  const trial2 = getExistingConfirmation(ride, "trial_2");
  const trial3 = getExistingConfirmation(ride, "trial_3");
  const rider4 = getExistingConfirmation(ride, "rider 4");

  return [
    { name: "Mark", role: "host", status: "host", confirmedBookingDetailsVersion: 1 },
    {
      ...(trial2 ?? {}),
      name: currentName === "trial_2" ? "trial_2 (you)" : "trial_2",
      role: "rider",
      status: trial2?.status ?? "pending",
      isCurrentUser: currentName === "trial_2",
      confirmBy: trial2?.confirmBy ?? "2026-06-08T12:00:00.000Z",
    },
    {
      ...(trial3 ?? {}),
      name: currentName === "trial_3" ? "trial_3 (you)" : "trial_3",
      role: "rider",
      status: trial3?.status ?? "pending",
      isCurrentUser: currentName === "trial_3",
      confirmBy: trial3?.confirmBy ?? "2026-06-08T12:00:00.000Z",
    },
    {
      ...(rider4 ?? {}),
      name: "Rider 4",
      role: "rider",
      status: rider4?.status ?? "pending",
      confirmBy: rider4?.confirmBy ?? "2026-06-08T12:00:00.000Z",
    },
  ];
}

function withFinalizedBookingDetails(ride: HomeRide): HomeRide {
  return {
    ...ride,
    bookingDetailsShared: true,
    rideAppBookingDetailsConfirmed: true,
    rideAppBookingDetailsConfirmedBy: ride.rideAppBookingDetailsConfirmedBy ?? "Mark",
    rideAppBookingDetailsConfirmedAt: ride.rideAppBookingDetailsConfirmedAt ?? "2026-06-07T12:30:00.000Z",
    rideAppBookingDetailsFinalized: true,
    rideAppBookingDetailsFinalizedBy: ride.rideAppBookingDetailsFinalizedBy ?? "Mark",
    rideAppBookingDetailsFinalizedAt: ride.rideAppBookingDetailsFinalizedAt ?? "2026-06-07T12:30:00.000Z",
    rideAppPodStatus: "awaiting_rider_confirmation",
  };
}

function withDemoSeats(ride: HomeRide): HomeRide {
  return {
    ...ride,
    hostName: ride.rideAppHostCancellationStatus === "replacement_booker_selected"
      ? ride.rideAppReplacementBookerName ?? "New booker"
      : "Mark",
    seatsTotal: 4,
    seatsUsed: 4,
    joinedRiders: ["trial_2", "trial_3", "Rider 4"],
    joinedRiderCount: 3,
    rideAppRequiredConfirmations: 3,
    confirmedRiderCount: 0,
    rideAppConfirmedRiderCount: 0,
    rideAppConfirmedRiderIds: [],
  };
}

export function applyRideAppDemoPersona(ride: HomeRide, identity: DemoIdentity): HomeRide {
  if (!isDemoRide(ride)) return ride;

  const persona = getRideAppDemoPersona(identity);
  if (!persona) return clearDemoRelationship(ride);

  const seededRide = withDemoSeats(ride);
  const replacementBookerName = normalizedPersonName(seededRide.rideAppReplacementBookerName);

  if (seededRide.rideAppHostCancellationStatus === "replacement_booker_selected") {
    if (replacementBookerName === persona) {
      return {
        ...seededRide,
        currentUserRole: "host",
        currentUserName: persona,
        currentUserJoined: false,
        currentUserJoinIntentStatus: "not_joined",
        currentUserBookingDetailsConfirmed: false,
        currentUserConfirmedBookingDetailsVersion: null,
        currentUserRideAppDetailVersionConfirmed: undefined,
        currentUserConfirmationExpired: false,
        selfSettleConfirmationStatus: undefined,
        platformFeeStatus: seededRide.platformFeeStatus ?? "demo_confirmed",
        quoteStatus: "quote_pending",
        proposedStops: normalizeSeedStops(seededRide.proposedStops),
        riderConfirmations: demoRiderConfirmations(seededRide),
      };
    }

    if (persona === "trial_1") {
      return {
        ...seededRide,
        currentUserRole: "rider",
        currentUserName: "Mark",
        currentUserJoined: false,
        currentUserJoinIntentStatus: "not_joined",
        currentUserBookingDetailsConfirmed: false,
        currentUserConfirmedBookingDetailsVersion: null,
        currentUserRideAppDetailVersionConfirmed: undefined,
        currentUserConfirmationExpired: false,
        selfSettleConfirmationStatus: undefined,
        platformFeeStatus: "pending",
        quoteStatus: "quote_pending",
        proposedStops: normalizeSeedStops(seededRide.proposedStops),
        riderConfirmations: demoRiderConfirmations(seededRide),
      };
    }
  }

  if (persona === "trial_1") {
    return {
      ...seededRide,
      currentUserRole: "host",
      currentUserName: "Mark",
      currentUserJoined: false,
      currentUserJoinIntentStatus: "not_joined",
      currentUserBookingDetailsConfirmed: false,
      currentUserConfirmedBookingDetailsVersion: null,
      currentUserRideAppDetailVersionConfirmed: undefined,
      currentUserConfirmationExpired: false,
      selfSettleConfirmationStatus: undefined,
      platformFeeStatus: "pending",
      quoteStatus: "quote_pending",
      proposedStops: normalizeSeedStops(seededRide.proposedStops),
      riderConfirmations: demoRiderConfirmations(seededRide),
    };
  }

  const riderRide = persona === "trial_2" ? withFinalizedBookingDetails(seededRide) : seededRide;
  const currentConfirmation = getExistingConfirmation(riderRide, persona);
  const currentConfirmed = currentConfirmation?.status === "confirmed";
  const currentConfirmedVersion =
    currentConfirmation?.confirmedBookingDetailsVersion ?? currentConfirmation?.confirmedDetailVersion ?? null;

  return {
    ...riderRide,
    currentUserRole: "joined_rider",
    currentUserName: persona,
    currentUserJoined: true,
    currentUserJoinIntentStatus: currentConfirmed ? "confirmed" : "joined_interest",
    currentUserBookingDetailsConfirmed: currentConfirmed,
    currentUserConfirmedBookingDetailsVersion: currentConfirmedVersion,
    currentUserRideAppDetailVersionConfirmed: currentConfirmedVersion ?? undefined,
    currentUserConfirmationExpired: false,
    selfSettleConfirmationStatus: currentConfirmed ? "confirmed" : "pending",
    platformFeeStatus: currentConfirmed ? riderRide.platformFeeStatus ?? "demo_confirmed" : "pending",
    quoteStatus: "joined",
    proposedStops:
      persona === "trial_3"
        ? removeSeedStop(riderRide.proposedStops)
        : normalizeSeedStops(riderRide.proposedStops),
    riderConfirmations: demoRiderConfirmations(riderRide, persona),
  };
}
