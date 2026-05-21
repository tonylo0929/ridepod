import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Car, CircleDollarSign, UserRoundPlus } from "lucide-react";
import {
  Avatar,
  Badge,
  ProgressBar,
  RuleCard,
  SectionHeader,
  StatusBadge,
  Timeline,
} from "@/components/ui";
import { currentUserId, formatMoney, getPod, getUser } from "@/lib/mock-data";
import { PremiumPodDetailPage } from "@/components/premium-pod-detail";
import { PublicMemberCard } from "@/components/public-member-card";
import { TaxiPartnerQuoteAcceptanceCard } from "@/components/taxi-partner-quote-acceptance-card";
import {
  MoneySafetyTimeline,
  PodChatSafetyPanel,
  PodDetailMoneyLockPanel,
} from "@/components/money-safety-ui";
import { getProtectedPod } from "@/lib/money-safety-mock";
import { mapMemberToPublicProfileViewModel } from "@/lib/public-profile";

export default async function PodDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "usc-lax-001" || id === "usc-lax-commute") {
    return <PremiumPodDetailPage />;
  }

  const pod = getPod(id);
  if (!pod) notFound();

  const host = getUser(pod.hostUserId);
  const backupHost = getUser(pod.backupHostUserId);
  const progress = (pod.seatsFilled / pod.seatsTotal) * 100;
  const isFull = pod.seatsFilled >= pod.seatsTotal;
  const protectedPod = getProtectedPod(pod.id);
  const taxiPartnerQuoteRide =
    pod.rideOption === "taxi_partner_quote"
      ? pod.upcomingRideInstances?.find((ride) =>
          [
            "taxi_partner_quote_needed",
            "taxi_partner_quote_received",
            "taxi_partner_guests_accepting",
            "taxi_partner_ready",
          ].includes(ride.taxiPartnerQuoteRequestId ?? ""),
        ) ?? null
      : null;
  const confirmedRiders = pod.members.filter(
    (member) => member.role === "member" && ["authorized", "charged"].includes(member.paymentStatus),
  );

  return (
    <div className="grid gap-5">
      <SectionHeader eyebrow={pod.type} title={pod.title} />

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={pod.status} />
          <Badge className="bg-zinc-50 text-zinc-700 ring-zinc-200">{pod.vehicleType}</Badge>
          {pod.recurrenceRule ? (
            <Badge className="bg-indigo-50 text-indigo-800 ring-indigo-200">
              {pod.recurrenceRule}
            </Badge>
          ) : null}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-2xl font-black tracking-tight text-zinc-950">
              {pod.fromLabel} to {pod.toLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Pickup at {pod.pickupHub}. Dropoff at {pod.dropoffHub}.
            </p>
          </div>
          <div className="rounded-lg bg-[#f7f5f0] p-4 text-left sm:text-right">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
              Estimated share
            </p>
            <p className="text-3xl font-black text-zinc-950">{formatMoney(pod.estimatedShare)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm text-zinc-700 sm:grid-cols-3">
          <div className="flex gap-2 rounded-lg bg-zinc-50 p-3">
            <CalendarClock className="h-4 w-4 text-emerald-700" />
            <span>{pod.date}, {pod.time}</span>
          </div>
          <div className="flex gap-2 rounded-lg bg-zinc-50 p-3">
            <CircleDollarSign className="h-4 w-4 text-emerald-700" />
            <span>Max fare {formatMoney(pod.maxFare)}</span>
          </div>
          <div className="flex gap-2 rounded-lg bg-zinc-50 p-3">
            <Car className="h-4 w-4 text-emerald-700" />
            <span>Lock by {pod.lockDeadline}</span>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm font-bold text-zinc-700">
            <span>{pod.seatsFilled}/{pod.seatsTotal} seats financially owned</span>
            <span>{isFull ? "Waitlist open" : `${pod.seatsTotal - pod.seatsFilled} open`}</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="font-bold text-zinc-950">Members</h2>
            <div className="mt-4 grid gap-3">
              {pod.members.map((member) => {
                const user = getUser(member.userId);
                const publicMember = mapMemberToPublicProfileViewModel(member, user);

                return (
                  <PublicMemberCard
                    key={member.userId}
                    member={publicMember}
                    reportContext={{
                      reporterUserId: currentUserId,
                      reporterRole: pod.hostUserId === currentUserId ? "Host" : "Guest",
                      reportedUserId: member.userId,
                      reportedMemberDisplayName: user.name,
                      podId: pod.id,
                      podRoute: `${pod.fromLabel} to ${pod.toLabel}`,
                      rideDateTime: `${pod.date}, ${pod.time}`,
                    }}
                  />
                );
              })}
            </div>
            {confirmedRiders.length === 0 ? (
              <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm font-semibold text-zinc-600">
                No confirmed riders yet. Seats lock after payment authorization.
              </div>
            ) : null}
            {pod.waitlist.length ? (
              <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
                Waitlist: {pod.waitlist.map((userId) => getUser(userId).name).join(", ")}
              </div>
            ) : null}
          </div>

          <Timeline status={pod.status} />
          {taxiPartnerQuoteRide ? (
            <TaxiPartnerQuoteAcceptanceCard
              pod={pod}
              rideInstance={taxiPartnerQuoteRide}
              currentUserId={currentUserId}
            />
          ) : null}
          {protectedPod ? (
            <>
              <PodDetailMoneyLockPanel podId={pod.id} />
              <MoneySafetyTimeline podId={pod.id} />
              <PodChatSafetyPanel podId={pod.id} />
            </>
          ) : null}
          <RuleCard />
        </div>

        <div className="grid content-start gap-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="font-bold text-zinc-950">Host team</h2>
            <div className="mt-4 grid gap-3">
              {[["Host", host], ["Backup host", backupHost]].map(([role, user]) => (
                <div key={role as string} className="flex items-center gap-3">
                  <Avatar user={user as typeof host} />
                  <div>
                    <p className="text-sm font-bold text-zinc-950">{(user as typeof host).name}</p>
                    <p className="text-xs text-zinc-500">{role as string}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <Link
              href={`/pods/${pod.id}/join`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-950 text-sm font-bold text-white"
            >
              <UserRoundPlus className="h-4 w-4" />
              {isFull ? "Join waitlist" : "Join pod"}
            </Link>
            <button className="h-11 rounded-lg border border-zinc-200 text-sm font-bold text-zinc-950">
              Invite
            </button>
            <button className="h-11 rounded-lg border border-zinc-200 text-sm font-bold text-zinc-950">
              Leave pod
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
