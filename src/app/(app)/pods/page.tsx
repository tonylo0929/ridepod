import { EmptyState, PodCard, SectionHeader } from "@/components/ui";
import { getUserPods } from "@/lib/mock-data";
import { CalendarCheck } from "lucide-react";

export default function MyPodsPage() {
  const pods = getUserPods();

  return (
    <div className="grid gap-5">
      <SectionHeader eyebrow="My pods" title="Seats you own or host" />
      {pods.length ? (
        <div className="grid gap-4">
          {pods.map((pod) => (
            <PodCard key={pod.id} pod={pod} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarCheck}
          title="No pods yet"
          body="Join a scheduled pod or create a recurring route to start owning seats."
          href="/home"
          action="Find pods"
        />
      )}
    </div>
  );
}
