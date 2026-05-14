import { ScheduledPodForm } from "@/components/create-pod-form";
import { SectionHeader } from "@/components/ui";

export default function CreateScheduledPage() {
  return (
    <div className="grid gap-5">
      <SectionHeader eyebrow="Scheduled pod" title="Plan a shared ride for a future trip" />
      <ScheduledPodForm />
    </div>
  );
}
