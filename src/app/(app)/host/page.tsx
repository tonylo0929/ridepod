import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ReceiptText,
  ShieldCheck,
  Upload,
  UsersRound,
} from "lucide-react";
import { Avatar, Badge, ProgressBar, StatusBadge, cn } from "@/components/ui";
import { formatMoney, getHostedPods, getUser, type RidePod } from "@/lib/mock-data";
import { HostQuoteUploadPanel } from "@/components/money-safety-ui";

function getReadyMembers(pod: RidePod) {
  return pod.members.filter(
    (member) => member.paymentStatus === "authorized" || member.paymentStatus === "charged",
  ).length;
}

function getHostAction(pod: RidePod) {
  const isTaxiMeter = pod.rideOption === "taxi_meter" || pod.vehicleType === "Taxi";

  if (pod.moneyStatus === "host_replacement_needed") {
    return "Confirm backup host";
  }

  if (!isTaxiMeter && pod.moneyStatus === "quote_approval_needed") {
    return "Review higher quote";
  }

  if (pod.moneyStatus === "host_can_book" || pod.status === "host_booking") {
    return isTaxiMeter ? "Taxi meter ready" : "Book external ride";
  }

  if (pod.moneyStatus === "receipt_pending" || pod.status === "booked") {
    return isTaxiMeter ? "Upload meter proof" : "Upload receipt";
  }

  if (pod.moneyStatus === "settlement_ready" || pod.status === "completed") {
    return "Review settlement";
  }

  return "Monitor payments";
}

function HostMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted)]">{label}</p>
        <Icon className="h-5 w-5 text-[var(--rp-primary)]" />
      </div>
      <p className="mt-3 text-2xl font-black text-[var(--rp-text)]">{value}</p>
    </div>
  );
}

function MemberPaymentRow({
  pod,
  member,
}: {
  pod: RidePod;
  member: RidePod["members"][number];
}) {
  const user = getUser(member.userId);
  const ready = member.paymentStatus === "authorized" || member.paymentStatus === "charged";
  const isHost = member.userId === pod.hostUserId;
  const isBackup = member.userId === pod.backupHostUserId;

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
      <Avatar user={user} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[var(--rp-text)]">{user.name}</p>
        <p className="mt-0.5 text-xs font-bold text-[var(--rp-muted)]">
          {isHost ? "Host" : isBackup ? "Backup host" : "Member"}
        </p>
      </div>
      <Badge
        className={cn(
          ready
            ? "bg-[var(--rp-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]"
            : "bg-[var(--rp-warning-bg)] text-[var(--rp-warning)] ring-[var(--rp-border)]",
        )}
      >
        {member.paymentStatus.replace("_", " ")}
      </Badge>
    </div>
  );
}

function HostPodCard({ pod }: { pod: RidePod }) {
  const readyMembers = getReadyMembers(pod);
  const progress = (readyMembers / pod.members.length) * 100;
  const action = getHostAction(pod);

  return (
    <article className="overflow-hidden rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] shadow-[var(--rp-shadow-soft)]">
      <div className="bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_20%,transparent),transparent_36%),var(--rp-card)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={pod.status} />
              <Badge className="bg-[var(--rp-card-muted)] text-[var(--rp-primary)] ring-[var(--rp-border)]">
                {pod.type === "recurring" ? "Recurring" : "Scheduled"}
              </Badge>
            </div>
            <h2 className="mt-4 text-2xl font-black leading-tight text-[var(--rp-text)]">{pod.title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              {pod.fromLabel} to {pod.toLabel} | {pod.date} at {pod.time}
            </p>
          </div>
          <div className="rounded-[20px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 py-3 text-right">
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">Max fare</p>
            <p className="mt-1 text-2xl font-black text-[var(--rp-text)]">{formatMoney(pod.maxFare)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 min-[760px]:grid-cols-3">
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <UsersRound className="h-5 w-5 text-[var(--rp-primary)]" />
            <p className="mt-2 text-lg font-black text-[var(--rp-text)]">
              {readyMembers}/{pod.members.length}
            </p>
            <p className="text-xs font-bold text-[var(--rp-muted)]">Payment ready</p>
          </div>
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <Clock3 className="h-5 w-5 text-[var(--rp-primary)]" />
            <p className="mt-2 text-lg font-black text-[var(--rp-text)]">{pod.timeFlexibility}</p>
            <p className="text-xs font-bold text-[var(--rp-muted)]">Pickup flex</p>
          </div>
          <div className="rounded-[18px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
            <ShieldCheck className="h-5 w-5 text-[var(--rp-primary)]" />
            <p className="mt-2 text-lg font-black text-[var(--rp-text)]">{formatMoney(pod.estimatedShare)}</p>
            <p className="text-xs font-bold text-[var(--rp-muted)]">Est. share</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">
            <span>Authorization</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>

        <div className="grid gap-2">
          {pod.members.map((member) => (
            <MemberPaymentRow key={member.userId} pod={pod} member={member} />
          ))}
        </div>

        <div className="grid gap-3 min-[520px]:grid-cols-2">
          <Link
            href={`/pods/${pod.id}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
          >
            Open pod <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/pods/${pod.id}/settlement`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_16px_34px_color-mix(in_srgb,var(--rp-primary)_24%,transparent)] transition hover:brightness-105"
            style={{ background: "var(--rp-gradient-primary)" }}
          >
            <Upload className="h-4 w-4" /> {action}
          </Link>
        </div>

        <HostQuoteUploadPanel pod={pod} />
      </div>
    </article>
  );
}

export default function HostDashboardPage() {
  const pods = getHostedPods();
  const readyToBookCount = pods.filter(
    (pod) => pod.moneyStatus === "host_can_book" || pod.status === "host_booking",
  ).length;
  const receiptCount = pods.filter(
    (pod) => pod.moneyStatus === "receipt_pending" || pod.status === "booked",
  ).length;

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[30px] border border-[var(--rp-border)] bg-[var(--rp-card)] shadow-[var(--rp-shadow-soft)]">
        <div className="bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_24%,transparent),transparent_38%),var(--rp-card)] p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--rp-primary)]">
                Host dashboard
              </p>
              <h1 className="mt-2 max-w-2xl text-[34px] font-black leading-tight text-[var(--rp-text)] sm:text-5xl">
                Book only after seats are covered
              </h1>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-[var(--rp-muted-strong)]">
                Payment status, quote checks, receipts, and backup host work are grouped by pod so hosts can act without chasing riders manually.
              </p>
            </div>
            <Link
              href="/settlement"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-5 text-sm font-black text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
            >
              <ReceiptText className="h-5 w-5" /> Settlement center
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 min-[640px]:grid-cols-3">
        <HostMetric label="Hosted pods" value={String(pods.length)} icon={UsersRound} />
        <HostMetric label="Ready to book" value={String(readyToBookCount)} icon={CheckCircle2} />
        <HostMetric label="Receipts due" value={String(receiptCount)} icon={CalendarClock} />
      </section>

      <section className="grid gap-4">
        {pods.map((pod) => (
          <HostPodCard key={pod.id} pod={pod} />
        ))}
      </section>
    </div>
  );
}
