import { Bell, Lock, MapPin, ShieldCheck } from "lucide-react";
import { SectionHeader } from "@/components/ui";

const settings = [
  {
    icon: Bell,
    title: "Notifications",
    body: "Lock deadline reminders, waitlist replacement alerts, receipt settlement updates.",
    value: "Push and email",
  },
  {
    icon: MapPin,
    title: "Area",
    body: "Use your default city for feed sorting and route suggestions.",
    value: "San Francisco Bay Area",
  },
  {
    icon: Lock,
    title: "Privacy",
    body: "Show only public profile details, verification badges, and pod membership context.",
    value: "Standard",
  },
  {
    icon: ShieldCheck,
    title: "Community rules",
    body: "Require seat acceptance before confirmation and allow waitlist replacement.",
    value: "Enabled",
  },
];

export default function SettingsPage() {
  return (
    <div className="grid gap-5">
      <SectionHeader eyebrow="Settings" title="Basic app settings" />
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div>
          <div>
            <h2 className="font-bold text-zinc-950">Appearance</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              RidePod now uses the premium dark style across the app.
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-3">
        {settings.map(({ icon: Icon, title, body, value }) => (
          <div key={title} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f7f5f0]">
                  <Icon className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h2 className="font-bold text-zinc-950">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">{body}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                {value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
