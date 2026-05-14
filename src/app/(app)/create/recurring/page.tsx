import { RecurringPodForm } from "@/components/create-pod-form";
import { SectionHeader } from "@/components/ui";

export default function CreateRecurringPage() {
  return (
    <div className="grid gap-5">
      <SectionHeader eyebrow="Recurring pod" title="Create seats for a repeat route" />
      <RecurringPodForm />
    </div>
  );
}
