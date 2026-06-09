"use client";

import Link from "next/link";
import { CheckCircle2, MessageCircle, Star, WalletCards } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { SelfSettleReportIssue } from "@/components/self-settle-report-issue";
import { cn } from "@/components/ui";
import type { HomeRide } from "@/lib/home-ride-mock";
import {
  getRideAppCompletionResponse,
  isRideAppCompletionDue,
  saveRideAppCompletionResponse,
  type RideAppCompletionResponse,
} from "@/lib/ride-app-completion";
import { createRideAppTrustEvent } from "@/lib/ride-app-trust";
import { useAuth } from "@/providers/AuthProvider";

type SelfSettleCompletionCardProps = {
  ride: HomeRide;
  currentUserRole?: HomeRide["currentUserRole"] | null;
  canSubmit: boolean;
  chatHref: string;
  onQuickMessage?: (message: string) => void | Promise<void>;
  compact?: boolean;
};

const memberQuickMessages = [
  "What was the final fare?",
  "How much should each person pay?",
  "Please share the final ride app receipt",
  "I have paid",
  "Payment received",
];

const hostQuickMessages = [
  "Final fare was HK$___",
  "Please settle after the ride",
  "Payment received",
];

function CompletionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-blue-300/15 py-3 last:border-b-0">
      <span className="text-sm font-bold text-[var(--rp-muted-strong)]">{label}</span>
      <span className="max-w-[58%] text-right text-sm font-black text-[var(--rp-text)]">{value}</span>
    </div>
  );
}

export function SelfSettleCompletionCard({
  ride,
  currentUserRole,
  canSubmit,
  chatHref,
  onQuickMessage,
  compact = false,
}: SelfSettleCompletionCardProps) {
  const { user } = useAuth();
  const titleId = useId();
  const [response, setResponse] = useState<RideAppCompletionResponse | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [finalFareAmount, setFinalFareAmount] = useState("");
  const [savedFinalFareAmount, setSavedFinalFareAmount] = useState("");
  const isHost = currentUserRole === "host";
  const due = isRideAppCompletionDue(ride);
  const completed = response?.status === "completed";
  const issueReported = response?.status === "issue_reported";
  const routeLabel = `${ride.fromLabel} -> ${ride.toLabel}`;
  const rideDateTime = `${ride.dateLabel} · ${ride.timeLabel}`;

  useEffect(() => {
    if (!user) return;
    const timeoutId = window.setTimeout(() => {
      setResponse(getRideAppCompletionResponse(ride.id, user.id));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [ride.id, user]);

  if (!due || !canSubmit) return null;

  async function markCompleted() {
    if (!user || !understood || saving || completed || issueReported) return;
    setSaving(true);
    setError(null);

    try {
      const nextResponse = saveRideAppCompletionResponse({
        podId: ride.id,
        userId: user.id,
        status: "completed",
      });
      createRideAppTrustEvent({
        userId: user.id,
        podId: ride.id,
        eventType: "ride_app_completed",
        reason: "Member marked a self-settle ride app pod completed.",
        createdBy: user.id,
      });
      setResponse(nextResponse);
      setShowCompleteModal(false);
      setUnderstood(false);
      setRatingOpen(true);
    } catch {
      setError("Could not mark completed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function sendQuick(message: string) {
    void onQuickMessage?.(message);
  }

  function saveFinalFare() {
    setSavedFinalFareAmount(finalFareAmount.trim());
    // TODO: Persist host-only final fare fields on ride_app_completion or ride_app_booking_details when backend storage exists.
  }

  const quickMessages = isHost ? hostQuickMessages : memberQuickMessages;

  return (
    <>
      <section className="overflow-hidden rounded-[24px] border border-blue-300/25 bg-[linear-gradient(145deg,rgba(76,29,149,0.20),rgba(14,23,42,0.78)_45%,rgba(37,99,235,0.14))] shadow-[var(--rp-shadow-soft)]">
        <div className={cn("p-5", compact && "p-4")}>
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-blue-300/35 bg-blue-400/12 text-blue-100">
              <WalletCards className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-[var(--rp-text)]">
                  {completed ? "Completed" : issueReported ? "Issue reported" : "How did the self-settle ride go?"}
                </h2>
                <span className="rounded-full border border-blue-300/35 bg-blue-400/12 px-3 py-1 text-xs font-black text-blue-100">
                  {completed ? "Completed" : issueReported ? "Under review" : "Settlement pending"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                {completed
                  ? "You marked this self-settle pod as completed."
                  : issueReported
                    ? "RidePod can review safety, abuse, fraud, and platform misuse."
                    : "Settle the final ride fare directly with the person who booked the ride, then mark this pod as completed."}
              </p>
            </div>
          </div>

          {!completed ? (
            <>
              <h3 className="mt-4 text-sm font-black text-[var(--rp-text)]">After-ride fare settlement</h3>
              <div className="mt-4 rounded-[18px] border border-blue-300/15 bg-[rgba(2,6,23,0.34)] px-4">
                <CompletionRow label="RidePod join fee" value="HK$5 shown at join" />
                <CompletionRow label="Ride fare" value="Pay after ride" />
                <CompletionRow label="Payment recipient" value="Person who booked the ride" />
                <CompletionRow label="Final amount" value={savedFinalFareAmount || "Based on final ride app fare"} />
                <CompletionRow label="Fare protection" value="Not included" />
              </div>
              <p className="mt-4 rounded-[14px] border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-xs font-black leading-5 text-blue-100">
                RidePod does not collect or protect the ride fare. Confirm the final amount with your group before sending payment.
              </p>

              {isHost ? (
                <div className="mt-4 rounded-[18px] border border-blue-300/15 bg-[rgba(2,6,23,0.34)] p-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-black text-[var(--rp-text)]">Final ride app fare</span>
                    <input
                      value={finalFareAmount}
                      onChange={(event) => setFinalFareAmount(event.target.value)}
                      placeholder="e.g. HK$148"
                      className="min-h-11 rounded-[14px] border border-blue-300/20 bg-[var(--rp-card-muted)] px-3 text-sm font-bold text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)] focus:border-blue-300/45"
                    />
                    <span className="text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                      Optional. This is for group reference only and is not collected by RidePod.
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={saveFinalFare}
                    disabled={!finalFareAmount.trim()}
                    className="mt-3 min-h-10 rounded-[14px] border border-blue-300/25 bg-blue-400/10 px-4 text-xs font-black text-blue-100 disabled:opacity-50"
                  >
                    Save fare note
                  </button>
                  <p className="mt-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
                    Final fare is self-reported by the group and is not verified by RidePod.
                  </p>
                </div>
              ) : null}

              <div className="mt-4">
                <p className="text-sm font-black text-[var(--rp-text)]">
                  {isHost ? "Ask riders to confirm the final fare in chat." : "Confirm the final fare with the booker before paying."}
                </p>
                {onQuickMessage ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {quickMessages.map((message) => (
                      <button
                        key={message}
                        type="button"
                        onClick={() => sendQuick(message)}
                        className="shrink-0 rounded-full border border-blue-300/25 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-100"
                      >
                        {message}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <div className="grid gap-2 border-t border-blue-300/15 bg-[rgba(2,6,23,0.28)] p-4 sm:grid-cols-3">
          {completed ? (
            <button
              type="button"
              onClick={() => setRatingOpen(true)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#8b5cf6,#60a5fa)] px-4 text-sm font-black text-white"
            >
              <Star className="h-4 w-4" />
              Rate your group
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowCompleteModal(true)}
              disabled={saving || issueReported}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#8b5cf6,#60a5fa)] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark completed
            </button>
          )}
          <SelfSettleReportIssue
            podId={ride.id}
            routeLabel={routeLabel}
            rideDateTime={rideDateTime}
            chatHref={chatHref}
            currentUserRole={currentUserRole}
            canSubmit={canSubmit}
            triggerLabel="Report an issue"
          />
          <Link
            href={chatHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-blue-300/20 bg-[var(--rp-card-muted)] px-4 text-sm font-black text-[var(--rp-muted-strong)] transition hover:bg-[var(--rp-card-soft)]"
          >
            <MessageCircle className="h-4 w-4" />
            Open pod chat
          </Link>
        </div>
      </section>

      {showCompleteModal ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-end bg-[rgba(3,7,18,0.74)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 backdrop-blur-sm sm:place-items-center sm:py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setShowCompleteModal(false);
          }}
        >
          <section className="flex max-h-[92vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
            <div className="overflow-y-auto p-5">
              <h2 id={titleId} className="text-2xl font-black leading-tight">
                Mark self-settle ride as completed?
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
                Only mark completed if the ride happened or your group has finished coordinating. Ride fare is settled directly between members outside RidePod.
              </p>
              <label className="mt-5 flex items-start gap-3 rounded-[16px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] p-3">
                <input
                  type="checkbox"
                  checked={understood}
                  onChange={(event) => setUnderstood(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[var(--rp-primary)]"
                />
                <span className="text-sm font-black leading-6 text-[var(--rp-text)]">
                  I understand RidePod does not handle the ride fare.
                </span>
              </label>
              {error ? (
                <p className="mt-4 rounded-[14px] border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm font-bold text-rose-100">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-[var(--rp-border)] p-4">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                disabled={saving}
                className="min-h-12 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-sm font-black text-[var(--rp-muted-strong)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={markCompleted}
                disabled={!understood || saving}
                className="min-h-12 rounded-2xl bg-[var(--rp-gradient-primary)] text-sm font-black text-[var(--rp-primary-text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Mark completed"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {ratingOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-end bg-[rgba(3,7,18,0.74)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 backdrop-blur-sm sm:place-items-center sm:py-6">
          <section className="w-full max-w-[460px] rounded-[28px] border border-[var(--rp-border-strong)] bg-[var(--rp-shell)] p-5 text-[var(--rp-text)] shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
            <h2 className="text-2xl font-black leading-tight">Rate this self-settle pod</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--rp-muted-strong)]">
              Rating storage is coming next. For now, this helps preview the post-ride flow.
            </p>
            <div className="mt-4 grid gap-3">
              <div>
                <p className="text-sm font-black text-[var(--rp-text)]">Overall experience</p>
                <div className="mt-2 flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setOverallRating(rating)}
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-full border text-sm font-black",
                        overallRating >= rating
                          ? "border-blue-300/45 bg-blue-400/16 text-blue-100"
                          : "border-[var(--rp-border)] bg-[var(--rp-card-muted)] text-[var(--rp-muted-strong)]",
                      )}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>
              {["Was the group on time?", "Was fare split clear?", "Would you ride with this group again?"].map((question) => (
                <p key={question} className="rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-3 py-2 text-sm font-bold text-[var(--rp-muted-strong)]">
                  {question}
                </p>
              ))}
              <label className="grid gap-2">
                <span className="text-sm font-black text-[var(--rp-text)]">Optional comment</span>
                <textarea
                  rows={3}
                  placeholder="Add a short note..."
                  className="resize-none rounded-[14px] border border-[var(--rp-border)] bg-[var(--rp-card-muted)] px-3 py-3 text-sm font-bold text-[var(--rp-text)] outline-none placeholder:text-[var(--rp-muted)]"
                />
              </label>
              <p className="rounded-[14px] border border-blue-300/20 bg-blue-400/10 px-3 py-2 text-xs font-bold leading-5 text-blue-100">
                TODO: Persist rating responses when the self-settle rating backend is available.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRatingOpen(false)}
              className="mt-5 min-h-12 w-full rounded-2xl bg-[var(--rp-gradient-primary)] text-sm font-black text-[var(--rp-primary-text)]"
            >
              Done
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
