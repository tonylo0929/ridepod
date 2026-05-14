import Link from "next/link";
import { Upload } from "lucide-react";
import { Avatar, Badge, SectionHeader, StatusBadge } from "@/components/ui";
import { formatMoney, getHostedPods, getUser } from "@/lib/mock-data";
import { HostQuoteUploadPanel } from "@/components/money-safety-ui";

export default function HostDashboardPage() {
  const pods = getHostedPods();

  return (
    <div className="grid gap-5">
      <SectionHeader eyebrow="Host dashboard" title="Book only after seats are covered" />

      <div className="grid gap-4">
        {pods.map((pod) => (
          <article key={pod.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <StatusBadge status={pod.status} />
                <h2 className="mt-3 text-xl font-bold text-zinc-950">{pod.title}</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Approved max fare {formatMoney(pod.maxFare)}
                </p>
              </div>
              <Link
                href={`/pods/${pod.id}/settlement`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-xs font-bold text-white"
              >
                <Upload className="h-4 w-4" /> Receipt
              </Link>
            </div>

            <div className="mt-4 grid gap-3">
              {pod.members.map((member) => {
                const user = getUser(member.userId);
                const ready = member.paymentStatus === "authorized" || member.paymentStatus === "charged";
                return (
                  <div key={member.userId} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 p-3">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} size="sm" />
                      <div>
                        <p className="text-sm font-bold text-zinc-950">{user.name}</p>
                        <p className="text-xs text-zinc-500">{member.role.replace("_", " ")}</p>
                      </div>
                    </div>
                    <Badge
                      className={
                        ready
                          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                          : "bg-amber-50 text-amber-800 ring-amber-200"
                      }
                    >
                      {member.paymentStatus.replace("_", " ")}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <HostQuoteUploadPanel pod={pod} />
          </article>
        ))}
      </div>
    </div>
  );
}
