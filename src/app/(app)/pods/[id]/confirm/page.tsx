import type { Metadata } from "next";
import { DraftRidePodConfirmPage } from "@/components/ride-groups/ride-groups-flow";

export const metadata: Metadata = {
  title: "Confirm Draft RidePod | RidePod",
  description: "Confirm and authorize a Draft RidePod invite before your seat locks.",
};

export default async function DraftRidePodConfirmRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DraftRidePodConfirmPage id={id} />;
}

