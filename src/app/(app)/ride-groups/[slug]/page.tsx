import type { Metadata } from "next";
import { RideGroupPage } from "@/components/ride-groups/ride-groups-flow";

export const metadata: Metadata = {
  title: "Ride Groups | RidePod",
  description: "Find ride-mates going your way before creating a RidePod.",
};

export default async function RideGroupRoutePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RideGroupPage slug={slug} />;
}

