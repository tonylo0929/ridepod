import { EmptyState, PodCard } from "@/components/ui";
import { getUserPods } from "@/lib/mock-data";
import { Bell, CalendarCheck, Menu } from "lucide-react";

export default function MyPodsPage() {
  const pods = getUserPods();

  return (
    <div className="grid gap-5">
      <header className="flex items-center justify-between gap-4">
        <button
          type="button"
          aria-label="Open menu"
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-text)]"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-black text-[var(--rp-text)]">My Pods</h1>
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card)] text-[var(--rp-text)]"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--rp-primary)]" />
        </button>
      </header>
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
