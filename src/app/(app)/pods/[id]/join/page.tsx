import { notFound } from "next/navigation";
import { JoinFlow } from "@/components/join-flow";
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
    <div className="grid min-h-[calc(100vh-8rem)] place-items-start justify-center">
      <JoinFlow pod={pod} />
    </div>
  );
}
