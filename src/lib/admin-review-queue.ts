export type AdminReviewFilter = "All" | "Proof" | "Above cap" | "Disputes" | "Payout holds" | "Resolved";
export type AdminReviewState = "OPEN" | "UNDER_REVIEW" | "NEEDS_MORE_INFO" | "APPROVED" | "REJECTED" | "RESOLVED";
export type AdminReviewSeverity = "Low" | "Medium" | "High" | "Critical";
export type AdminReviewCaseType =
  | "Quote above booking fare cap"
  | "Receipt above cap"
  | "Meter proof above cap"
  | "Suspicious receipt"
  | "Guest dispute"
  | "Host cancellation after booking"
  | "No-show dispute"
  | "Receipt needs more info"
  | "Quote / receipt mismatch";

export type AdminReviewCase = {
  id: string;
  caseType: AdminReviewCaseType;
  filter: Exclude<AdminReviewFilter, "All">;
  severity: AdminReviewSeverity;
  reviewState: AdminReviewState;
  rideDateTime: string;
  route: string;
  rideOption: "Ride app / fixed quote" | "Taxi meter";
  host: string;
  reporter?: string;
  guestsLocked: string;
  fareLabel: string;
  fareAmountCents: number;
  bookingFareCapCents: number;
  maxChargePerGuestCents: number;
  proofType: "quote screenshot" | "final receipt" | "meter proof";
  proofStatus: "SUBMITTED" | "UNDER_REVIEW" | "VERIFIED" | "NEEDS_MORE_INFO" | "REJECTED" | "FRAUD_SUSPECTED";
  disputeStatus: "None" | "Submitted" | "Under review" | "Resolved";
  payoutStatus: "PENDING" | "HELD_FOR_REVIEW" | "RELEASED" | "DENIED";
  createdTime: string;
  submittedBy: string;
  submittedAt: string;
  certificationAccepted: boolean;
  ridepodEstimateCents: number;
  uploadedQuoteCents?: number;
  finalProofCents?: number;
  disputeIssueType?: string;
  disputeNote?: string;
  evidenceLabel?: string;
  fileUrl?: string | null;
  evidenceTimeline?: AdminEvidenceTimelineItem[];
  disputeEvidenceTimeline?: AdminDisputeEvidenceTimelineItem[];
  statusLabel: string;
  primaryAction: "Review case" | "View resolution";
};

export type AdminEvidenceTimelineItem = {
  id: string;
  title: string;
  proofType: AdminReviewCase["proofType"] | "review case" | "settlement";
  proofTypeLabel: string;
  amountCents: number | null;
  amountLabel: string;
  status: string;
  statusLabel: string;
  submittedAt: string | null;
  submittedAtLabel: string;
  reviewedAt: string | null;
  reviewedAtLabel: string;
  actorLabel: string;
  fileUrl: string | null;
  fileName: string | null;
  adminNotes: string | null;
  versionLabel: "Current proof" | "Previous proof" | "Review event";
  isCurrent: boolean;
};

export type AdminDisputeEvidenceTimelineItem = {
  id: string;
  title: string;
  timestamp: string | null;
  timestampLabel: string;
  actorLabel: "Host" | "Guest" | "Admin" | "System" | "RidePod";
  description: string;
  fileUrl: string | null;
  fileName: string | null;
  proofType?: AdminReviewCase["proofType"];
  adminNotes: string | null;
  tone: "neutral" | "blue" | "amber" | "red" | "green";
};

export const adminReviewDecisionCopy = {
  approveProof: "Proof approved. Settlement can continue.",
  requestMoreInfo: "More information is required before settlement can continue.",
  rejectProof: "Proof rejected. Valid proof is required before settlement can continue.",
  capReimbursement: "Reimbursement is capped at the booking fare cap unless guests approve a higher max.",
  holdPayout: "Payout is held for manual review.",
  releasePayout: "Payout can be processed.",
  resolveDispute: "Dispute marked resolved. Settlement can continue according to the admin decision.",
  restrictAccount: "Account restriction placeholder recorded for manual follow-up.",
} as const;

export type AdminDecisionKey = keyof typeof adminReviewDecisionCopy;

export const adminDecisionLabels: Array<{ key: AdminDecisionKey; label: string; requiresNotes: boolean }> = [
  { key: "approveProof", label: "Approve proof", requiresNotes: false },
  { key: "requestMoreInfo", label: "Request more info", requiresNotes: true },
  { key: "rejectProof", label: "Reject proof", requiresNotes: true },
  { key: "holdPayout", label: "Hold payout", requiresNotes: true },
];

export const adminReviewFilters: AdminReviewFilter[] = ["All", "Proof", "Above cap", "Disputes", "Payout holds", "Resolved"];

export const adminAuditEventPlaceholders = [
  "ADMIN_REVIEW_OPENED",
  "ADMIN_PROOF_APPROVED",
  "ADMIN_PROOF_REJECTED",
  "ADMIN_MORE_INFO_REQUESTED",
  "ADMIN_PAYOUT_HELD",
  "ADMIN_PAYOUT_RELEASED",
  "ADMIN_REIMBURSEMENT_CAPPED",
  "ADMIN_DISPUTE_RESOLVED",
];

export function formatAdminHkd(cents: number) {
  return `HK$${(cents / 100).toFixed(2)}`;
}

export function getAdminReviewCases(): AdminReviewCase[] {
  return [
    {
      id: "review-quote-above-cap",
      caseType: "Quote above booking fare cap",
      filter: "Above cap",
      severity: "High",
      reviewState: "OPEN",
      rideDateTime: "Tue May 19 · 8:00 AM · Outbound",
      route: "USC Village → LAX Terminal 3",
      rideOption: "Ride app / fixed quote",
      host: "Maya Chen",
      reporter: "System",
      guestsLocked: "4 / 4",
      fareLabel: "Quote",
      fareAmountCents: 35000,
      bookingFareCapCents: 32000,
      maxChargePerGuestCents: 9500,
      proofType: "quote screenshot",
      proofStatus: "UNDER_REVIEW",
      disputeStatus: "None",
      payoutStatus: "HELD_FOR_REVIEW",
      createdTime: "10m ago",
      submittedBy: "Maya Chen",
      submittedAt: "May 19, 7:40 AM",
      certificationAccepted: true,
      ridepodEstimateCents: 29800,
      uploadedQuoteCents: 35000,
      statusLabel: "Payout held",
      primaryAction: "Review case",
    },
    {
      id: "review-receipt-above-cap",
      caseType: "Receipt above cap",
      filter: "Above cap",
      severity: "High",
      reviewState: "UNDER_REVIEW",
      rideDateTime: "Tue May 19 · 8:00 AM · Outbound",
      route: "USC Village → LAX Terminal 3",
      rideOption: "Ride app / fixed quote",
      host: "Maya Chen",
      reporter: "System",
      guestsLocked: "4 / 4",
      fareLabel: "Receipt",
      fareAmountCents: 35000,
      bookingFareCapCents: 32000,
      maxChargePerGuestCents: 9500,
      proofType: "final receipt",
      proofStatus: "UNDER_REVIEW",
      disputeStatus: "None",
      payoutStatus: "HELD_FOR_REVIEW",
      createdTime: "34m ago",
      submittedBy: "Maya Chen",
      submittedAt: "May 19, 9:15 AM",
      certificationAccepted: true,
      ridepodEstimateCents: 29800,
      uploadedQuoteCents: 29800,
      finalProofCents: 35000,
      statusLabel: "Payout held",
      primaryAction: "Review case",
    },
    {
      id: "review-meter-above-cap",
      caseType: "Meter proof above cap",
      filter: "Above cap",
      severity: "Medium",
      reviewState: "OPEN",
      rideDateTime: "Wed May 20 · 6:00 PM · Return",
      route: "LAX Terminal 3 → USC Village",
      rideOption: "Taxi meter",
      host: "Maya Chen",
      reporter: "System",
      guestsLocked: "3 / 3",
      fareLabel: "Meter proof",
      fareAmountCents: 33800,
      bookingFareCapCents: 32000,
      maxChargePerGuestCents: 10600,
      proofType: "meter proof",
      proofStatus: "SUBMITTED",
      disputeStatus: "None",
      payoutStatus: "HELD_FOR_REVIEW",
      createdTime: "1h ago",
      submittedBy: "Maya Chen",
      submittedAt: "May 20, 7:05 PM",
      certificationAccepted: true,
      ridepodEstimateCents: 30500,
      finalProofCents: 33800,
      statusLabel: "Manual review",
      primaryAction: "Review case",
    },
    {
      id: "review-suspicious-receipt",
      caseType: "Suspicious receipt",
      filter: "Proof",
      severity: "Critical",
      reviewState: "OPEN",
      rideDateTime: "Thu May 21 · 8:00 AM · Outbound",
      route: "USC Village → LAX Terminal 3",
      rideOption: "Ride app / fixed quote",
      host: "Maya Chen",
      reporter: "System",
      guestsLocked: "4 / 4",
      fareLabel: "Receipt",
      fareAmountCents: 29800,
      bookingFareCapCents: 32000,
      maxChargePerGuestCents: 8195,
      proofType: "final receipt",
      proofStatus: "FRAUD_SUSPECTED",
      disputeStatus: "None",
      payoutStatus: "HELD_FOR_REVIEW",
      createdTime: "2h ago",
      submittedBy: "Maya Chen",
      submittedAt: "May 21, 9:20 AM",
      certificationAccepted: true,
      ridepodEstimateCents: 29800,
      uploadedQuoteCents: 29800,
      finalProofCents: 29800,
      evidenceLabel: "File metadata mismatch placeholder",
      statusLabel: "Fraud suspected",
      primaryAction: "Review case",
    },
    {
      id: "review-guest-dispute",
      caseType: "Guest dispute",
      filter: "Disputes",
      severity: "High",
      reviewState: "UNDER_REVIEW",
      rideDateTime: "Fri May 22 · 8:00 AM · Outbound",
      route: "USC Village → LAX Terminal 3",
      rideOption: "Ride app / fixed quote",
      host: "Maya Chen",
      reporter: "Tony Wong",
      guestsLocked: "4 / 4",
      fareLabel: "Receipt",
      fareAmountCents: 29800,
      bookingFareCapCents: 32000,
      maxChargePerGuestCents: 8195,
      proofType: "final receipt",
      proofStatus: "VERIFIED",
      disputeStatus: "Submitted",
      payoutStatus: "HELD_FOR_REVIEW",
      createdTime: "3h ago",
      submittedBy: "Maya Chen",
      submittedAt: "May 22, 9:20 AM",
      certificationAccepted: true,
      ridepodEstimateCents: 29800,
      uploadedQuoteCents: 29800,
      finalProofCents: 29800,
      disputeIssueType: "Wrong route",
      disputeNote: "Guest says the route included an unapproved extra stop.",
      evidenceLabel: "Guest screenshot placeholder",
      statusLabel: "Dispute review",
      primaryAction: "Review case",
    },
    {
      id: "review-host-cancel-after-booking",
      caseType: "Host cancellation after booking",
      filter: "Payout holds",
      severity: "High",
      reviewState: "OPEN",
      rideDateTime: "Sat May 23 · 10:00 AM · Outbound",
      route: "USC Village → LAX Terminal 3",
      rideOption: "Ride app / fixed quote",
      host: "Maya Chen",
      reporter: "System",
      guestsLocked: "4 / 4",
      fareLabel: "Quote",
      fareAmountCents: 29800,
      bookingFareCapCents: 32000,
      maxChargePerGuestCents: 8195,
      proofType: "quote screenshot",
      proofStatus: "VERIFIED",
      disputeStatus: "None",
      payoutStatus: "HELD_FOR_REVIEW",
      createdTime: "5h ago",
      submittedBy: "Maya Chen",
      submittedAt: "May 23, 9:30 AM",
      certificationAccepted: true,
      ridepodEstimateCents: 29800,
      uploadedQuoteCents: 29800,
      evidenceLabel: "Host cancelled after booking placeholder",
      statusLabel: "Payout hold",
      primaryAction: "Review case",
    },
    {
      id: "review-no-show-dispute",
      caseType: "No-show dispute",
      filter: "Disputes",
      severity: "Medium",
      reviewState: "OPEN",
      rideDateTime: "Mon May 25 · 8:00 AM · Outbound",
      route: "USC Village → LAX Terminal 3",
      rideOption: "Taxi meter",
      host: "Maya Chen",
      reporter: "Avery Lee",
      guestsLocked: "3 / 3",
      fareLabel: "Meter proof",
      fareAmountCents: 28600,
      bookingFareCapCents: 32000,
      maxChargePerGuestCents: 9534,
      proofType: "meter proof",
      proofStatus: "VERIFIED",
      disputeStatus: "Submitted",
      payoutStatus: "HELD_FOR_REVIEW",
      createdTime: "1d ago",
      submittedBy: "Maya Chen",
      submittedAt: "May 25, 9:10 AM",
      certificationAccepted: true,
      ridepodEstimateCents: 28000,
      finalProofCents: 28600,
      disputeIssueType: "I did not take this ride",
      disputeNote: "Guest reports they missed pickup and should not be billed.",
      evidenceLabel: "Chat timeline placeholder",
      statusLabel: "Dispute review",
      primaryAction: "Review case",
    },
    {
      id: "review-receipt-needs-info",
      caseType: "Receipt needs more info",
      filter: "Proof",
      severity: "Medium",
      reviewState: "NEEDS_MORE_INFO",
      rideDateTime: "Tue May 26 · 8:00 AM · Outbound",
      route: "USC Village → LAX Terminal 3",
      rideOption: "Ride app / fixed quote",
      host: "Maya Chen",
      reporter: "System",
      guestsLocked: "4 / 4",
      fareLabel: "Receipt",
      fareAmountCents: 29800,
      bookingFareCapCents: 32000,
      maxChargePerGuestCents: 8195,
      proofType: "final receipt",
      proofStatus: "NEEDS_MORE_INFO",
      disputeStatus: "None",
      payoutStatus: "PENDING",
      createdTime: "2d ago",
      submittedBy: "Maya Chen",
      submittedAt: "May 26, 9:00 AM",
      certificationAccepted: true,
      ridepodEstimateCents: 29800,
      uploadedQuoteCents: 29800,
      finalProofCents: 29800,
      evidenceLabel: "Receipt missing date placeholder",
      statusLabel: "Needs more info",
      primaryAction: "Review case",
    },
    {
      id: "review-quote-receipt-mismatch",
      caseType: "Quote / receipt mismatch",
      filter: "Proof",
      severity: "High",
      reviewState: "OPEN",
      rideDateTime: "Wed May 27 · 8:00 AM · Outbound",
      route: "USC Village → LAX Terminal 3",
      rideOption: "Ride app / fixed quote",
      host: "Maya Chen",
      reporter: "System",
      guestsLocked: "4 / 4",
      fareLabel: "Receipt",
      fareAmountCents: 33600,
      bookingFareCapCents: 34000,
      maxChargePerGuestCents: 9250,
      proofType: "final receipt",
      proofStatus: "UNDER_REVIEW",
      disputeStatus: "None",
      payoutStatus: "HELD_FOR_REVIEW",
      createdTime: "2d ago",
      submittedBy: "Maya Chen",
      submittedAt: "May 27, 9:35 AM",
      certificationAccepted: true,
      ridepodEstimateCents: 29800,
      uploadedQuoteCents: 29800,
      finalProofCents: 33600,
      statusLabel: "Mismatch review",
      primaryAction: "Review case",
    },
    {
      id: "review-resolved-demo",
      caseType: "Receipt above cap",
      filter: "Resolved",
      severity: "Low",
      reviewState: "RESOLVED",
      rideDateTime: "Thu May 14 · 8:00 AM · Outbound",
      route: "USC Village → LAX Terminal 3",
      rideOption: "Ride app / fixed quote",
      host: "Maya Chen",
      reporter: "System",
      guestsLocked: "4 / 4",
      fareLabel: "Receipt",
      fareAmountCents: 32100,
      bookingFareCapCents: 32000,
      maxChargePerGuestCents: 8800,
      proofType: "final receipt",
      proofStatus: "VERIFIED",
      disputeStatus: "Resolved",
      payoutStatus: "RELEASED",
      createdTime: "5d ago",
      submittedBy: "Maya Chen",
      submittedAt: "May 14, 9:12 AM",
      certificationAccepted: true,
      ridepodEstimateCents: 29800,
      uploadedQuoteCents: 29800,
      finalProofCents: 32100,
      statusLabel: "Resolved",
      primaryAction: "View resolution",
    },
  ];
}
