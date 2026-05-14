import { notFound } from "next/navigation";
import { JoinFlow } from "@/components/join-flow";
import { SectionHeader } from "@/components/ui";
import { getPod } from "@/lib/mock-data";

export default async function JoinPodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pod = getPod(id);
  if (!pod) notFound();

  return (
    <div className="grid gap-5">
      <SectionHeader eyebrow="Join flow" title="Claim your seat" />
      <JoinFlow pod={pod} />
    </div>
  );
}
