"use client";

import Link from "next/link";
import { PodChatClient } from "@/app/(app)/pods/[id]/chat/pod-chat-client";
import { AirportPodDetailPage } from "@/components/airport-pod-detail-page";
import { HomePodDetailPage } from "@/components/home-pod-detail-page";
import { NormalPodDetailPage, PodStatusPanel } from "@/components/normal-pod-detail-page";
import { RecurringPodDetailPage } from "@/components/recurring-pod-detail-page";
import { useCreatedHomeRides } from "@/lib/created-home-rides";
import { getRideAppChatAccessState } from "@/lib/ride-app-chat-unlock";

function CreatedPodMissingState() {
  return (
    <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 text-center shadow-[var(--rp-shadow-soft)]">
      <h1 className="text-2xl font-black text-[var(--rp-text)]">Pod not found</h1>
      <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
        This created pod is not available in this browser session.
      </p>
      <Link
        href="/home"
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]"
      >
        Back to Home
      </Link>
    </section>
  );
}

export function CreatedPodDetailRouteClient({ id }: { id: string }) {
  const ride = useCreatedHomeRides().find((item) => item.id === id);

  if (!ride) return <CreatedPodMissingState />;

  if (ride.rideKind === "airport" || ride.airportDirection) {
    return <AirportPodDetailPage ride={ride} />;
  }

  if (ride.rideKind === "recurring" || ride.repeatsPattern || ride.scheduleLabel) {
    return <RecurringPodDetailPage ride={ride} />;
  }

  if (ride.rideKind === "one_off" && !ride.airportDirection) {
    return <NormalPodDetailPage ride={ride} />;
  }

  return <HomePodDetailPage ride={ride} />;
}

export function CreatedPodStatusRouteClient({ id }: { id: string }) {
  const ride = useCreatedHomeRides().find((item) => item.id === id);

  if (!ride || ride.rideCategory !== "ride_app_self_settle") return <CreatedPodMissingState />;

  return (
    <PodStatusPanel
      ride={ride}
      seatsUsed={ride.seatsUsed}
      pageMode
      backHref={`/pods/${ride.id}`}
    />
  );
}

export function CreatedPodChatRouteClient({
  id,
  bookingDetailsSharedFromQuery = false,
  bookingDetailsSummary = null,
}: {
  id: string;
  bookingDetailsSharedFromQuery?: boolean;
  bookingDetailsSummary?: {
    pickupVenue: string;
    eta: string;
    estimatedFare: string;
    splitMethod: string;
    paymentMethod: string;
    bookingNote: string;
  } | null;
}) {
  const ride = useCreatedHomeRides().find((item) => item.id === id);

  if (!ride) return <CreatedPodMissingState />;

  const isRideAppSelfSettle = ride.rideCategory === "ride_app_self_settle";
  const isTaxiPartnerChat = !isRideAppSelfSettle;

  return (
    <PodChatClient
      podId={id}
      routeLabel={`${ride.fromLabel} -> ${ride.toLabel}`}
      timeLabel={`${ride.dateLabel} - ${ride.timeLabel}`}
      readOnly={false}
      isRideAppSelfSettle={isRideAppSelfSettle}
      isTaxiPartnerChat={isTaxiPartnerChat}
      currentUserRole={ride.currentUserRole ?? null}
      initialRideAppChecklist={ride.rideAppChecklist ?? null}
      bookingDetailsShared={Boolean(ride.bookingDetailsShared) || bookingDetailsSharedFromQuery}
      bookingDetailsSummary={bookingDetailsSummary}
      rideAppChatAccess={isRideAppSelfSettle ? getRideAppChatAccessState(ride) : null}
      taxiPartnerChatAccess={null}
      ride={ride}
    />
  );
}
