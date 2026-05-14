"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { currentUserId, formatMoney, type RidePod } from "@/lib/mock-data";
import { getProtectedPod } from "@/lib/money-safety-mock";
import { checkPodEligibility } from "@/lib/pod-eligibility";
import { RuleCard } from "@/components/ui";

const steps = ["Review", "Rules", "Authorize", "Confirmed"];

export function JoinFlow({ pod }: { pod: RidePod }) {
  const [step, setStep] = useState(0);
  const protectedPod = getProtectedPod(pod.id);
  const eligibility = protectedPod
    ? checkPodEligibility(currentUserId, pod.id)
    : {
        eligible: true,
        reasons: [pod.genderMode === "women_only" ? "Women-only eligibility passed." : "Mixed pod."],
        blockingReason: null,
        requiredAction: null,
      };
  const maxCharge = (pod.maxFare / pod.seatsTotal) + pod.platformFee;

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          {steps.map((label, index) => (
            <div key={label}>
              <div
                className={`h-2 rounded-full ${index <= step ? "bg-emerald-700" : "bg-zinc-200"}`}
              />
              <p className="mt-2 text-[11px] font-bold text-zinc-600">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {step === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-zinc-950">Review this pod</h1>
          <div className="mt-4 grid gap-3 text-sm text-zinc-700">
            <p><strong>{pod.fromLabel}</strong> to <strong>{pod.toLabel}</strong></p>
            <p>{pod.date} at {pod.time}</p>
            <p>{pod.seatsTotal - pod.seatsFilled} seat open</p>
            <p>Estimated share: {formatMoney(pod.estimatedShare)} plus {formatMoney(pod.platformFee)} RidePod fee</p>
            <p>Max approved fare: {formatMoney(pod.maxFare)}</p>
          </div>
          <div className={`mt-4 rounded-lg border p-3 text-sm ${eligibility.eligible ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
            <div className="flex items-start gap-2">
              {eligibility.eligible ? (
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div>
                <p className="font-bold">
                  {eligibility.eligible ? "Safety eligibility passed" : "This pod is not available for your profile"}
                </p>
                <p className="mt-1 leading-5">
                  {eligibility.eligible
                    ? eligibility.reasons[0] ?? "Eligible to continue."
                    : eligibility.blockingReason ?? "Your profile is not eligible for this pod."}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setStep(1)}
            disabled={!eligibility.eligible}
            className="mt-5 h-12 w-full rounded-lg bg-zinc-950 text-sm font-bold text-white"
          >
            Continue
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <>
          <RuleCard />
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm leading-6 text-zinc-700">
              If you cancel after lock, penalties may apply. If someone replaces your seat, you may receive credit.
            </p>
            <button
              onClick={() => setStep(2)}
              className="mt-4 h-12 w-full rounded-lg bg-zinc-950 text-sm font-bold text-white"
            >
              I understand
            </button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <CreditCard className="h-9 w-9 text-emerald-700" />
          <h1 className="mt-4 text-2xl font-bold text-zinc-950">Payment authorization</h1>
          <div className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="font-bold text-zinc-950">Your max charge: {formatMoney(maxCharge)}</p>
            <p className="mt-2">You will never pay more than your approved max unless you approve a higher fare.</p>
            <p className="mt-2">Your seat is confirmed only after payment authorization.</p>
            <p className="mt-2">Chat and exact pickup unlock after your seat is locked.</p>
            <p>Expected charge: {formatMoney(pod.estimatedShare + pod.platformFee)}</p>
          </div>
          {eligibility.eligible ? (
            <button
              onClick={() => setStep(3)}
              className="mt-5 h-12 w-full rounded-lg bg-emerald-700 text-sm font-bold text-white"
            >
              Authorize payment and lock seat
            </button>
          ) : (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
              {eligibility.blockingReason ?? "Your profile is not eligible for this pod."}
            </div>
          )}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
          <CheckCircle2 className="h-10 w-10 text-emerald-700" />
          <h1 className="mt-4 text-2xl font-bold text-zinc-950">Seat locked</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Your seat is financially owned. The host can book after the remaining seats are authorized and the pod locks.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
            <ShieldCheck className="h-4 w-4" /> Host will not need to chase you for money.
          </div>
          <Link
            href={`/pods/${pod.id}`}
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg bg-zinc-950 text-sm font-bold text-white"
          >
            Back to pod
          </Link>
        </div>
      ) : null}
    </div>
  );
}
