"use client";

import { Coffee, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Card } from "@/components/ui";

const paymePlaceholderSrc = "/images/ridepod/support/payme-placeholder.png";

export function SupportRidePodCard({ compact = false }: { compact?: boolean }) {
  const [paymeOpen, setPaymeOpen] = useState(false);

  return (
    <>
      <Card
        className={`border-[color-mix(in_srgb,var(--rp-primary)_48%,var(--rp-border))] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_16%,transparent),transparent_34%),linear-gradient(180deg,var(--rp-card),var(--rp-card-soft))] ${
          compact ? "p-5" : "p-6 sm:p-7"
        }`}
      >
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--rp-border-strong)] bg-[color-mix(in_srgb,var(--rp-primary)_12%,transparent)] text-[var(--rp-primary)]">
              <Coffee className="h-6 w-6" />
            </span>
            <h2 className={`${compact ? "mt-4 text-xl" : "mt-5 text-3xl"} font-black leading-tight text-[var(--rp-text)]`}>
              Support FareEnough
            </h2>
            <p className="mt-3 max-w-2xl text-left text-sm font-semibold leading-6 text-[var(--rp-muted)]">
              FareEnough helps riders in Hong Kong coordinate shared trips with clearer routes, costs, and plans. If it helped you, you can support the project.
            </p>
            <p className="mt-3 text-left text-xs font-black uppercase tracking-[0.12em] text-[var(--rp-muted-strong)]">
              Optional support only. This is not a ride payment, platform fee, or fare settlement.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPaymeOpen(true)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--rp-primary)] bg-[linear-gradient(180deg,#ffd36a_0%,#f2c15b_100%)] px-5 text-sm font-black text-[#07111a] shadow-[0_14px_30px_rgba(242,193,91,0.22)] transition hover:brightness-105"
          >
            <Coffee className="h-4 w-4" />
            Show PayMe code
          </button>
        </div>
      </Card>

      {paymeOpen ? <PayMeSupportModal onClose={() => setPaymeOpen(false)} /> : null}
    </>
  );
}

function PayMeSupportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[rgba(3,7,18,0.72)] px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-[28px] border border-[color-mix(in_srgb,var(--rp-primary)_45%,var(--rp-border))] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--rp-primary)_16%,transparent),transparent_34%),linear-gradient(180deg,var(--rp-card),var(--rp-card-soft))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.46)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--rp-primary)]">Support FareEnough</p>
            <h3 className="mt-2 text-2xl font-black text-[var(--rp-text)]">Buy us a coffee</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close PayMe support modal"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm font-semibold leading-6 text-[var(--rp-muted)]">
          Scan the PayMe code if you want to support FareEnough.
        </p>

        <div className="mt-5 rounded-[24px] border border-[var(--rp-border)] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(7,17,26,0.08)]">
          <Image
            src={paymePlaceholderSrc}
            alt="Placeholder PayMe support code"
            width={320}
            height={360}
            className="mx-auto aspect-square w-full max-w-[260px] rounded-[18px] object-contain"
          />
        </div>

        <p className="mt-4 rounded-2xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] px-4 py-3 text-xs font-bold leading-5 text-[var(--rp-muted-strong)]">
          This is optional support only. Paying here does not join a pod, pay a ride fare, or confirm a booking.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-[var(--rp-border-strong)] bg-[var(--rp-card-soft)] px-4 text-sm font-black text-[var(--rp-text)] transition hover:bg-[var(--rp-card-muted)]"
        >
          Close
        </button>
      </section>
    </div>
  );
}
