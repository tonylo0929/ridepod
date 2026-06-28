import { CreatedPodStatusRouteClient } from "@/components/created-pod-route-client";
import { PodStatusPanel } from "@/components/normal-pod-detail-page";
import { getHomeRide } from "@/lib/home-ride-mock";
import { redirect } from "next/navigation";

export default async function PodStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { action, tab } = await searchParams;
  if (tab === "chat") redirect(`/pods/${id}/chat`);

  const ride = getHomeRide(id);
  const initialTab = tab === "riders" || tab === "route" ? tab : "summary";
  const initialAction = action === "confirm-by" ? "confirm-by" : undefined;

  if (!ride || ride.rideCategory !== "ride_app_self_settle") {
    return <CreatedPodStatusRouteClient id={id} />;
  }

  return (
    <PodStatusPanel
      ride={ride}
      seatsUsed={ride.seatsUsed}
      pageMode
      backHref={`/pods/${ride.id}`}
      initialTab={initialTab}
      initialAction={initialAction}
    />
  );
}
