import type { Metadata } from "next";
import { CreateRideCallForm } from "@/components/ride-groups/ride-groups-flow";

export const metadata: Metadata = {
  title: "Create Ride Call | RidePod",
  description: "Post a low-friction Ride Call inside a Ride Group.",
};

export default async function CreateRideCallRoutePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CreateRideCallForm slug={slug} />;
}

