import type { Metadata } from "next";
import { RideCallDetail } from "@/components/ride-groups/ride-groups-flow";

export const metadata: Metadata = {
  title: "Ride Call | RidePod",
  description: "Show interest in a public Ride Call before a seat is locked.",
};

export default async function RideCallRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RideCallDetail id={id} />;
}

