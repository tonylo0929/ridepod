"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CarFront,
  CheckCircle2,
  ChevronRight,
  MessageSquareText,
  ShieldCheck,
  Star,
  ThumbsUp,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "@/components/ui";

const completedPod = {
  route: "USC -> LAX",
  status: "Completed",
  dateTime: "Tue, May 14 / 7:30 AM",
  pickup: "Leavey Library",
  pickupFull: "USC - Leavey Library",
  dropoff: "Terminal 1",
  dropoffFull: "LAX - Terminal 1",
  host: "Maya Chen",
  hostRole: "RidePod host since 2023",
  hostRating: "4.9",
  taxiPartner: "Golden Taxi Partner",
  taxiPartnerRole: "Licensed taxi partner",
  taxiPartnerRating: "4.8",
};

const feedbackTags = [
  "On time",
  "Friendly",
  "Smooth ride",
  "Clear communication",
  "Safe driving",
];

const driverFeedbackTags = [
  "On time",
  "Safe driving",
  "Clear pickup",
  "Helpful with luggage",
  "Clean taxi",
];

const defaultComment = "Great ride! Everyone was on time and super friendly. Cool";

export function ReviewRatingPage() {
  const [overallRating, setOverallRating] = useState(5);
  const [hostRating, setHostRating] = useState(5);
  const [driverRating, setDriverRating] = useState(5);
  const [wouldRideAgain, setWouldRideAgain] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>(["On time", "Friendly"]);
  const [selectedDriverTags, setSelectedDriverTags] = useState<string[]>(["On time", "Safe driving"]);
  const [comment, setComment] = useState(defaultComment);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const overallLabel = useMemo(() => ratingLabel(overallRating), [overallRating]);

  if (submitted) {
    return <ReviewSubmittedState />;
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  function toggleDriverTag(tag: string) {
    setSelectedDriverTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[430px] gap-4 pb-4 min-[760px]:max-w-3xl">
      <ReviewHeader />
      <CompletedTripCard />
      <ReviewCard>
        <CardTitle icon={Star} title="Overall experience" />
        <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">
          How was your RidePod experience?
        </p>
        <div className="mt-5 flex items-center justify-between gap-4">
          <StarRating value={overallRating} onChange={setOverallRating} label="Overall experience rating" />
          <span className="rounded-full bg-[var(--rp-card-muted)] px-3 py-1 text-sm font-black text-[var(--rp-primary)]">
            {overallLabel}
          </span>
        </div>
      </ReviewCard>
      <HostRatingCard value={hostRating} onChange={setHostRating} />
      <TaxiPartnerRatingCard
        value={driverRating}
        selectedTags={selectedDriverTags}
        onChange={setDriverRating}
        onToggleTag={toggleDriverTag}
      />
      <ReviewCard>
        <CardTitle icon={UsersRound} title="Would you ride with this group again?" />
        <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">
          How was the group you rode with?
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setWouldRideAgain(true)}
            className={cn(
              "flex min-h-14 items-center justify-center gap-2 rounded-[18px] border px-3 text-sm font-black transition",
              wouldRideAgain
                ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)]"
                : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted)]",
            )}
            aria-pressed={wouldRideAgain}
          >
            <ThumbsUp className="h-5 w-5" />
            Yes
          </button>
          <button
            type="button"
            onClick={() => setWouldRideAgain(false)}
            className={cn(
              "flex min-h-14 items-center justify-center rounded-[18px] border px-3 text-sm font-black transition",
              !wouldRideAgain
                ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)]"
                : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted)]",
            )}
            aria-pressed={!wouldRideAgain}
          >
            Not sure
          </button>
        </div>
      </ReviewCard>
      <FeedbackTagGroup selectedTags={selectedTags} onToggleTag={toggleTag} />
      <CommentBox comment={comment} onChange={setComment} />
      <ReportIssueRow onOpen={() => setIssueModalOpen(true)} />
      <SubmitReviewCTA onSubmit={() => setSubmitted(true)} />
      {issueModalOpen ? <IssueModal onClose={() => setIssueModalOpen(false)} /> : null}
    </div>
  );
}

function ReviewHeader() {
  return (
    <header className="grid grid-cols-[44px_1fr_44px] items-center gap-3">
      <Link
        href="/pods"
        aria-label="Back to My Ride"
        className="grid h-11 w-11 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)]"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-normal text-[var(--rp-text)]">Review your ride</h1>
        <p className="mt-1 text-xs font-bold text-[var(--rp-muted)]">
          Help keep RidePod safe and trusted
        </p>
      </div>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)]">
        <ShieldCheck className="h-5 w-5" />
      </span>
    </header>
  );
}

function CompletedTripCard() {
  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_20%,transparent),transparent_44%),var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--rp-badge-success-bg)] px-3 py-1 text-xs font-black text-[var(--rp-badge-success-text)] ring-1 ring-[var(--rp-border)]">
            <CheckCircle2 className="h-4 w-4" />
            {completedPod.status}
          </span>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">
            Trip completed
          </p>
          <h2 className="mt-2 text-[34px] font-black leading-none tracking-normal text-[var(--rp-text)]">
            USC <span className="text-[var(--rp-primary)]">-&gt;</span> LAX
          </h2>
          <p className="mt-3 text-sm font-bold text-[var(--rp-muted)]">{completedPod.dateTime}</p>
        </div>
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[var(--rp-primary)] text-[var(--rp-primary-text)]">
          <CarFront className="h-7 w-7" />
        </span>
      </div>
      <div className="mt-5 rounded-[20px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-4">
        <div className="grid grid-cols-[24px_1fr] gap-3">
          <RouteDot active />
          <div>
            <p className="text-sm font-black text-[var(--rp-text)]">Pickup: {completedPod.pickup}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--rp-muted)]">{completedPod.pickupFull}</p>
          </div>
          <RouteDot />
          <div>
            <p className="text-sm font-black text-[var(--rp-text)]">Dropoff: {completedPod.dropoff}</p>
            <p className="mt-1 text-xs font-semibold text-[var(--rp-muted)]">{completedPod.dropoffFull}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RouteDot({ active = false }: { active?: boolean }) {
  return (
    <span className="relative flex justify-center">
      <span
        className={cn(
          "mt-0.5 h-5 w-5 rounded-full border-2",
          active
            ? "border-[var(--rp-primary)] bg-[var(--rp-primary)]"
            : "border-[var(--rp-primary)] bg-[var(--rp-card)]",
        )}
      />
      {active ? <span className="absolute top-6 h-7 w-px bg-[var(--rp-border-strong)]" /> : null}
    </span>
  );
}

function HostRatingCard({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <ReviewCard>
      <CardTitle icon={UserRound} title="Rate your host" />
      <div className="mt-4 grid grid-cols-[58px_1fr] gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--rp-gradient-primary)] text-base font-black text-[var(--rp-primary-text)] ring-2 ring-[var(--rp-card)]">
          MC
        </span>
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-black text-[var(--rp-text)]">{completedPod.host}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">{completedPod.hostRole}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--rp-card-muted)] px-2.5 py-1 text-xs font-black text-[var(--rp-primary)]">
              <Star className="h-3.5 w-3.5 fill-current" />
              {completedPod.hostRating}
            </span>
          </div>
          <div className="mt-4">
            <StarRating value={value} onChange={onChange} label="Host rating" />
          </div>
        </div>
      </div>
    </ReviewCard>
  );
}

function TaxiPartnerRatingCard({
  value,
  selectedTags,
  onChange,
  onToggleTag,
}: {
  value: number;
  selectedTags: string[];
  onChange: (value: number) => void;
  onToggleTag: (tag: string) => void;
}) {
  return (
    <ReviewCard>
      <CardTitle icon={CarFront} title="Rate your taxi partner" />
      <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">
        How was the driver and pickup experience?
      </p>
      <div className="mt-4 grid grid-cols-[58px_1fr] gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--rp-card-muted)] text-[var(--rp-primary)] ring-2 ring-[var(--rp-card)]">
          <CarFront className="h-7 w-7" />
        </span>
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-black text-[var(--rp-text)]">{completedPod.taxiPartner}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">{completedPod.taxiPartnerRole}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--rp-card-muted)] px-2.5 py-1 text-xs font-black text-[var(--rp-primary)]">
              <Star className="h-3.5 w-3.5 fill-current" />
              {completedPod.taxiPartnerRating}
            </span>
          </div>
          <div className="mt-4">
            <StarRating value={value} onChange={onChange} label="Taxi partner driver rating" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {driverFeedbackTags.map((tag) => {
          const selected = selectedTags.includes(tag);

          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              aria-pressed={selected}
              className={cn(
                "min-h-10 rounded-full border px-4 text-sm font-black transition",
                selected
                  ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)]"
                  : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-[var(--rp-muted)]">
        Driver ratings are demo-only in this beta and help RidePod understand taxi partner quality.
      </p>
    </ReviewCard>
  );
}

function FeedbackTagGroup({
  selectedTags,
  onToggleTag,
}: {
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}) {
  return (
    <ReviewCard>
      <CardTitle icon={MessageSquareText} title="What stood out?" />
      <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">Select all that apply</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {feedbackTags.map((tag) => {
          const selected = selectedTags.includes(tag);

          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              aria-pressed={selected}
              className={cn(
                "min-h-10 rounded-full border px-4 text-sm font-black transition",
                selected
                  ? "border-[var(--rp-primary)] bg-[color-mix(in_srgb,var(--rp-primary)_18%,transparent)] text-[var(--rp-primary)]"
                  : "border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-muted-strong)]",
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </ReviewCard>
  );
}

function CommentBox({
  comment,
  onChange,
}: {
  comment: string;
  onChange: (value: string) => void;
}) {
  const maxLength = 300;

  return (
    <ReviewCard>
      <div className="flex items-start justify-between gap-3">
        <CardTitle icon={MessageSquareText} title="Additional comments (optional)" />
        <span className="text-xs font-black text-[var(--rp-muted)]">
          {comment.length}/{maxLength}
        </span>
      </div>
      <label className="sr-only" htmlFor="review-comment">
        Additional comments
      </label>
      <textarea
        id="review-comment"
        value={comment}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-4 min-h-28 w-full resize-none rounded-[18px] border border-[var(--rp-input-border)] bg-[var(--rp-input-bg)] p-4 text-sm font-semibold leading-6 text-[var(--rp-text)] outline-none transition placeholder:text-[var(--rp-muted)] focus:border-[var(--rp-primary)]"
      />
    </ReviewCard>
  );
}

function ReportIssueRow({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[42px_1fr_20px] items-center gap-3 rounded-[22px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 text-left shadow-[var(--rp-shadow-soft)]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--rp-danger-bg)] text-[var(--rp-danger)]">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-base font-black text-[var(--rp-text)]">Report an issue</span>
        <span className="mt-1 block text-sm font-semibold text-[var(--rp-muted)]">
          Safety, payment, behavior, or other problems
        </span>
      </span>
      <ChevronRight className="h-5 w-5 text-[var(--rp-primary)]" />
    </button>
  );
}

function SubmitReviewCTA({ onSubmit }: { onSubmit: () => void }) {
  return (
    <section className="grid gap-3 rounded-[24px] border border-[var(--rp-border)] bg-[color-mix(in_srgb,var(--rp-shell)_92%,transparent)] p-4 shadow-[var(--rp-shadow-nav)] backdrop-blur-xl">
      <button
        type="button"
        onClick={onSubmit}
        className="flex min-h-14 items-center justify-center rounded-[18px] bg-[var(--rp-gradient-primary)] px-5 text-base font-black text-[var(--rp-primary-text)] shadow-[0_16px_36px_color-mix(in_srgb,var(--rp-primary)_28%,transparent)]"
      >
        Submit review
      </button>
      <p className="text-center text-xs font-black uppercase tracking-[0.1em] text-[var(--rp-muted)]">
        Secure <span aria-hidden="true">&bull;</span> Trusted <span aria-hidden="true">&bull;</span> Covered by RidePod
      </p>
      <p className="text-center text-xs font-semibold text-[var(--rp-muted)]">
        Earn credits after review
      </p>
    </section>
  );
}

function ReviewSubmittedState() {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-[430px] place-items-center">
      <section className="w-full rounded-[30px] border border-[var(--rp-border-strong)] bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--rp-primary)_22%,transparent),transparent_46%),var(--rp-card)] p-6 text-center shadow-[var(--rp-shadow-soft)]">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--rp-primary)] text-[var(--rp-primary-text)]">
          <CheckCircle2 className="h-10 w-10" />
        </span>
        <h1 className="mt-6 text-3xl font-black tracking-normal text-[var(--rp-text)]">
          Thanks for your review!
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          Your feedback helps keep RidePod trusted.
        </p>
        <Link
          href="/pods"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[18px] bg-[var(--rp-gradient-primary)] px-5 text-sm font-black text-[var(--rp-primary-text)]"
        >
          Back to My Ride
        </Link>
      </section>
    </div>
  );
}

function IssueModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 px-4 pb-4 backdrop-blur-sm min-[560px]:place-items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-title"
        className="w-full max-w-[430px] rounded-[28px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-5 shadow-[var(--rp-shadow-soft)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="issue-title" className="text-xl font-black text-[var(--rp-text)]">
              Report an issue
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              This demo keeps reports local. In the real app, this would open RidePod support.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close issue report"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-2">
          {["Safety concern", "Payment issue", "Behavior problem", "Other"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={onClose}
              className="flex min-h-12 items-center justify-between rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)]"
            >
              {item}
              <ChevronRight className="h-4 w-4 text-[var(--rp-primary)]" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex gap-1.5" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((rating) => {
        const selected = rating <= value;

        return (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            aria-label={`${label}: ${rating} star${rating === 1 ? "" : "s"}`}
            aria-pressed={selected}
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--rp-primary)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <Star
              className={cn(
                "h-7 w-7",
                selected ? "fill-current" : "fill-transparent text-[var(--rp-muted)]",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function ReviewCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-[var(--rp-border)] bg-[var(--rp-card)] p-4 shadow-[var(--rp-shadow-soft)]">
      {children}
    </section>
  );
}

function CardTitle({ icon: Icon, title }: { icon: typeof Star; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-[var(--rp-primary)]" />
      <h2 className="text-lg font-black tracking-normal text-[var(--rp-text)]">{title}</h2>
    </div>
  );
}

function ratingLabel(value: number) {
  if (value >= 5) return "Excellent";
  if (value === 4) return "Great";
  if (value === 3) return "Okay";
  if (value === 2) return "Could improve";
  return "Poor";
}
