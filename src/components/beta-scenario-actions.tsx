"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Play } from "lucide-react";
import { resetRidePodDemoScenarioMock } from "@/lib/demo/ridepod-demo-reset-mock";

type BetaScenarioActionsProps = {
  scenarioId: string;
  routeReady: boolean;
};

export function BetaScenarioActions({ scenarioId, routeReady }: BetaScenarioActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  function loadDemoScenario() {
    const result = resetRidePodDemoScenarioMock(scenarioId);
    setMessage(result.message);
    setMessageTone(result.success ? "success" : "error");

    if (result.success && routeReady && result.routeToOpen) {
      router.push(result.routeToOpen);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={loadDemoScenario}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--rp-gradient-primary)] px-4 text-sm font-black text-[var(--rp-primary-text)] shadow-[0_14px_28px_rgba(0,124,137,0.18)] transition hover:brightness-105"
      >
        <Play className="h-4 w-4" />
        Load demo
      </button>

      {routeReady ? (
        <p className="inline-flex items-center justify-center gap-2 text-sm font-bold text-[var(--rp-primary)]">
          Opens scenario route <ArrowRight className="h-4 w-4" />
        </p>
      ) : (
        <div className="rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-center text-sm font-bold text-[var(--rp-muted)]">
          Scenario route coming soon.
        </div>
      )}

      {message ? (
        <p
          className={
            messageTone === "success"
              ? "rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-300"
              : "rounded-xl border border-[var(--rp-border)] bg-[var(--rp-danger-bg)] p-3 text-sm font-bold text-[var(--rp-danger)]"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
