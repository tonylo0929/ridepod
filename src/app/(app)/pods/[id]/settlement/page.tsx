import { notFound } from "next/navigation";
import { SettlementPage as SettlementExperience } from "@/components/settlement-page";
import { getPod } from "@/lib/mock-data";

export default async function PodSettlementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pod = getPod(id);

  if (!pod) notFound();

  return <SettlementExperience pod={pod} />;
}
