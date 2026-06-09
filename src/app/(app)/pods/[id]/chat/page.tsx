import { notFound } from "next/navigation";
import { PodChatClient } from "@/app/(app)/pods/[id]/chat/pod-chat-client";
import { CreatedPodChatRouteClient } from "@/components/created-pod-route-client";
import { getHomeRide } from "@/lib/home-ride-mock";
import { getPod } from "@/lib/mock-data";
import { getRideAppChatAccessState } from "@/lib/ride-app-chat-unlock";
import { getTaxiPartnerChatAccessState } from "@/lib/taxi-partner-chat-unlock";

export default async function PodChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const homeRide = getHomeRide(id);
  const pod = homeRide ? null : getPod(id);
  const bookingDetailsSharedFromQuery = firstQueryValue(query.bookingDetailsShared) === "1";
  const bookingDetailsSummary = bookingDetailsSharedFromQuery
    ? {
        pickupVenue: firstQueryValue(query.pickupVenue),
        eta: firstQueryValue(query.eta),
        estimatedFare: firstQueryValue(query.estimatedFare),
        splitMethod: firstQueryValue(query.splitMethod),
        paymentMethod: firstQueryValue(query.paymentMethod),
        bookingNote: firstQueryValue(query.bookingNote),
      }
    : null;

  if (!homeRide && !pod) {
    return (
      <CreatedPodChatRouteClient
        id={id}
        bookingDetailsSharedFromQuery={bookingDetailsSharedFromQuery}
        bookingDetailsSummary={bookingDetailsSummary}
      />
    );
  }

  const routeLabel = homeRide
    ? `${homeRide.fromLabel} -> ${homeRide.toLabel}`
    : `${pod?.fromLabel ?? "Pickup"} -> ${pod?.toLabel ?? "Dropoff"}`;
  const timeLabel = homeRide ? `${homeRide.dateLabel} - ${homeRide.timeLabel}` : `${pod?.date} - ${pod?.time}`;
  const readOnly = pod ? pod.status === "completed" || pod.status === "cancelled" : false;
  const isRideAppSelfSettle = homeRide?.rideCategory === "ride_app_self_settle";
  const isTaxiPartnerChat = Boolean(homeRide && !isRideAppSelfSettle);
  const currentUserRole = homeRide?.currentUserRole ?? null;
  const bookingDetailsShared = Boolean(homeRide?.bookingDetailsShared) || bookingDetailsSharedFromQuery;
  const rideAppChatAccess = homeRide && isRideAppSelfSettle ? getRideAppChatAccessState(homeRide) : null;
  const taxiPartnerChatAccess = homeRide && isTaxiPartnerChat ? getTaxiPartnerChatAccessState(homeRide) : null;

  return (
    <PodChatClient
      podId={id}
      routeLabel={routeLabel}
      timeLabel={timeLabel}
      readOnly={readOnly}
      isRideAppSelfSettle={isRideAppSelfSettle}
      isTaxiPartnerChat={isTaxiPartnerChat}
      currentUserRole={currentUserRole}
      initialRideAppChecklist={homeRide?.rideAppChecklist ?? null}
      bookingDetailsShared={bookingDetailsShared}
      bookingDetailsSummary={bookingDetailsSummary}
      rideAppChatAccess={rideAppChatAccess}
      taxiPartnerChatAccess={taxiPartnerChatAccess}
      ride={homeRide ?? null}
    />
  );
}

function firstQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
