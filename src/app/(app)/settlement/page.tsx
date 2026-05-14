import { SettlementPage as SettlementExperience } from "@/components/settlement-page";
import { getPod, getHostedPods } from "@/lib/mock-data";

export default async function SettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ pod?: string }>;
}) {
  const { pod: podId } = await searchParams;
  const pod = (podId ? getPod(podId) : undefined) ?? getHostedPods()[0];

  return <SettlementExperience pod={pod} />;
}
