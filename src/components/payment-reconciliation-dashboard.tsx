import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge, Card, SectionHeader } from "@/components/ui";
import { formatCents } from "@/lib/money-safety";
import { getPaymentReconciliationSnapshot } from "@/lib/payment-reconciliation";

function money(value: number | null | undefined, currency = "USD") {
  return typeof value === "number" ? formatCents(value, currency) : "None";
}

function stateTone(value: string) {
  if (["AUTHORIZED", "CAPTURED", "CONFIRMED", "LOCKED", "FINALIZED", "PAID", "AUTO_APPROVED", "QUOTE_APPROVED", "VERIFIED"].includes(value)) {
    return "bg-[var(--rp-badge-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]";
  }
  if (["ADMIN_REVIEW", "DISPUTE_HOLD", "DISPUTED", "FAILED", "CAPTURE_FAILED", "FRAUD_SUSPECTED", "REJECTED"].includes(value)) {
    return "bg-[var(--rp-danger-bg)] text-[var(--rp-danger)] ring-[var(--rp-border)]";
  }
  return "bg-[var(--rp-badge-neutral-bg)] text-[var(--rp-badge-neutral-text)] ring-[var(--rp-border)]";
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
      <dt className="text-[11px] font-black uppercase text-[var(--rp-muted)]">{label}</dt>
      <dd className="break-words text-sm font-bold text-[var(--rp-text)]">{value}</dd>
    </div>
  );
}

function StateBadge({ value }: { value: string }) {
  return <Badge className={stateTone(value)}>{value.replaceAll("_", " ")}</Badge>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-black text-[var(--rp-text)]">{children}</h2>;
}

export function PaymentReconciliationDashboard({ podId }: { podId?: string | null }) {
  const snapshot = getPaymentReconciliationSnapshot(podId);
  const { pod, settlement, hostReimbursement, latestQuote, latestReceipt, verifiedReceipt } = snapshot;
  const quoteStatus = latestQuote ? `${latestQuote.reviewState} ${money(latestQuote.quotedFareCents, latestQuote.currency)}` : "No quote";
  const receiptStatus = latestReceipt
    ? `${latestReceipt.verificationState} ${money(latestReceipt.fareTotalCents, latestReceipt.currency)}`
    : "No receipt";

  return (
    <div className="grid gap-5">
      <SectionHeader eyebrow="Admin test mode" title="Payment reconciliation" />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionTitle>Pod summary</SectionTitle>
            <p className="mt-1 text-sm font-semibold text-[var(--rp-muted)]">
              {pod.originGeneral} to {pod.destinationGeneral}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {snapshot.safetyBadges.map((badge) => (
              <Badge key={badge} className="bg-[var(--rp-card-muted)] text-[var(--rp-primary)] ring-[var(--rp-border)]">
                {badge}
              </Badge>
            ))}
          </div>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <KeyValue label="Pod id" value={pod.id} />
          <KeyValue label="Host" value={`${snapshot.hostName} (${pod.replacementHostUserId ?? pod.hostUserId})`} />
          <KeyValue label="Lifecycle" value={<StateBadge value={pod.lifecycleState} />} />
          <KeyValue label="Booking" value={<StateBadge value={pod.bookingState} />} />
          <KeyValue label="Money lock" value={`${snapshot.confirmedSeats}/${pod.minSeatsToBook} payment-authorized`} />
          <KeyValue label="Quote" value={quoteStatus} />
          <KeyValue label="Receipt" value={receiptStatus} />
          <KeyValue label="Settlement" value={settlement ? <StateBadge value={settlement.settlementState} /> : "No settlement"} />
          <KeyValue label="Reimbursement" value={hostReimbursement ? <StateBadge value={hostReimbursement.payoutState} /> : "No reimbursement"} />
        </dl>
      </Card>

      <Card>
        <SectionTitle>Rider payments</SectionTitle>
        <div className="mt-4 grid gap-3">
          {snapshot.members.map(({ member, userName, paymentIntent }) => (
            <div key={member.id} className="rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-[var(--rp-text)]">
                    {userName} <span className="font-semibold text-[var(--rp-muted)]">({member.userId})</span>
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--rp-muted)]">{member.role.replaceAll("_", " ")}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StateBadge value={member.memberState} />
                  <StateBadge value={member.paymentState} />
                </div>
              </div>
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <KeyValue label="Max charge" value={money(member.maxChargeCents, pod.currency)} />
                <KeyValue label="Platform fee" value={money(member.platformFeeCents, pod.currency)} />
                <KeyValue label="Final charge" value={money(member.finalChargeCents, pod.currency)} />
                <KeyValue label="Intent provider" value={paymentIntent?.provider ?? "None"} />
                <KeyValue label="Authorized" value={money(paymentIntent?.amountAuthorizedCents, pod.currency)} />
                <KeyValue label="Captured" value={money(paymentIntent?.amountCapturedCents, pod.currency)} />
                <KeyValue label="Refunded" value={money(paymentIntent?.amountRefundedCents, pod.currency)} />
                <KeyValue label="External intent" value={paymentIntent?.externalPaymentIntentId ?? "None"} />
              </dl>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Settlement and host reimbursement</SectionTitle>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <KeyValue label="Verified fare" value={money(settlement?.verifiedFareCents ?? verifiedReceipt?.fareTotalCents, pod.currency)} />
          <KeyValue label="Approved max" value={money(pod.higherMaxApprovedCents ?? pod.approvedMaxTotalFareCents, pod.currency)} />
          <KeyValue label="Eligible fare" value={money(settlement?.approvedFareCents, pod.currency)} />
          <KeyValue label="Billable seats" value={settlement?.billableSeatCount ?? "None"} />
          <KeyValue label="Platform fee total" value={money(settlement?.totalPlatformFeeCents, pod.currency)} />
          <KeyValue label="Host reimbursement" value={money(settlement?.hostReimbursementCents, pod.currency)} />
          <KeyValue label="Host user" value={hostReimbursement?.hostUserId ?? pod.hostUserId} />
          <KeyValue label="Transfer status" value={hostReimbursement ? <StateBadge value={hostReimbursement.payoutState} /> : "None"} />
          <KeyValue label="Total transfer" value={money(hostReimbursement?.totalTransferCents, pod.currency)} />
          <KeyValue label="External transfer" value={hostReimbursement?.externalTransferId ?? "None"} />
          <KeyValue label="Scheduled at" value={hostReimbursement?.scheduledAt ?? "None"} />
          <KeyValue label="Paid at" value={hostReimbursement?.paidAt ?? "None"} />
        </dl>
      </Card>

      <Card>
        <SectionTitle>Risk and review</SectionTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          {pod.adminReviewRequired ? <StateBadge value="ADMIN_REVIEW" /> : null}
          {pod.lifecycleState === "DISPUTE_HOLD" ? <StateBadge value="DISPUTE_HOLD" /> : null}
          {latestReceipt?.verificationState === "FRAUD_SUSPECTED" ? <StateBadge value="FRAUD_SUSPECTED" /> : null}
          {snapshot.riskFlags.length === 0 && !pod.adminReviewRequired && pod.lifecycleState !== "DISPUTE_HOLD" ? (
            <Badge className="bg-[var(--rp-badge-success-bg)] text-[var(--rp-badge-success-text)] ring-[var(--rp-border)]">No open flags</Badge>
          ) : null}
        </div>
        <div className="mt-4 grid gap-2">
          {snapshot.riskFlags.map((flag) => (
            <div key={flag.id} className="rounded-xl border border-[var(--rp-border)] bg-[var(--rp-card-soft)] p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StateBadge value={flag.riskType} />
                <StateBadge value={flag.status} />
                <span className="font-bold text-[var(--rp-muted)]">{flag.severity}</span>
              </div>
              <p className="mt-2 font-semibold text-[var(--rp-muted)]">{flag.notes ?? "No notes"}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Reconciliation warnings</SectionTitle>
        <div className="mt-4 grid gap-2">
          {snapshot.warnings.length ? (
            snapshot.warnings.map((warning) => (
              <div key={warning} className="flex gap-2 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-warning-bg)] p-3 text-sm font-bold text-[var(--rp-warning)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{warning}</span>
              </div>
            ))
          ) : (
            <div className="flex gap-2 rounded-xl border border-[var(--rp-border)] bg-[var(--rp-badge-success-bg)] p-3 text-sm font-bold text-[var(--rp-badge-success-text)]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>No reconciliation warnings for this mock pod.</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
