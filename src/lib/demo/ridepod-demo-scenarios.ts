export const RIDE_POD_DEMO_SCENARIO_IDS = [
  "scheduled_ride_app_quote_needed",
  "scheduled_ride_app_ready_to_book",
  "scheduled_ride_app_receipt_needed",
  "scheduled_taxi_meter_proof_needed",
  "recurring_back_and_forth",
  "settlement_ready",
  "dispute_review",
  "admin_review_queue",
  "profile_eligibility",
  "safety_report",
] as const;

export type RidePodDemoScenarioId = (typeof RIDE_POD_DEMO_SCENARIO_IDS)[number];

export type RidePodDemoScenario = {
  id: RidePodDemoScenarioId;
  title: string;
  description: string;
  role: string;
  primaryStatus: string;
  recommendedRoute: string;
  tags: string[];
  notes: string;
};

export const RIDE_POD_DEMO_SCENARIOS: readonly RidePodDemoScenario[] = [
  {
    id: "scheduled_ride_app_quote_needed",
    title: "Scheduled Ride App - Quote Needed",
    description: "Guests are locked. Host needs to upload a fresh quote before booking.",
    role: "Host",
    primaryStatus: "Quote needed",
    recommendedRoute: "/host",
    tags: ["demo", "closed beta", "scheduled", "ride app", "quote needed"],
    notes: "Use this demo scenario to test host quote upload and booking permission copy.",
  },
  {
    id: "scheduled_ride_app_ready_to_book",
    title: "Scheduled Ride App - Ready to Book",
    description: "Quote is approved. Host can book the external ride.",
    role: "Host",
    primaryStatus: "Ready to book",
    recommendedRoute: "/host",
    tags: ["demo", "closed beta", "scheduled", "ride app", "ready to book"],
    notes: "Use this demo scenario to test the host can-book state after quote review.",
  },
  {
    id: "scheduled_ride_app_receipt_needed",
    title: "Scheduled Ride App - Receipt Needed",
    description: "Ride is completed. Host needs to upload final receipt.",
    role: "Host",
    primaryStatus: "Receipt needed",
    recommendedRoute: "/host",
    tags: ["demo", "closed beta", "scheduled", "ride app", "receipt needed"],
    notes: "Use this demo scenario to test final receipt proof and manual review expectations.",
  },
  {
    id: "scheduled_taxi_meter_proof_needed",
    title: "Scheduled Taxi Meter - Meter Proof Needed",
    description: "Taxi meter ride is completed. Host needs to upload meter proof.",
    role: "Host",
    primaryStatus: "Meter proof needed",
    recommendedRoute: "/host",
    tags: ["demo", "closed beta", "scheduled", "taxi meter", "meter proof needed"],
    notes: "Use this demo scenario to test the taxi meter path without upfront quote requirements.",
  },
  {
    id: "recurring_back_and_forth",
    title: "Recurring Back-and-Forth Pod",
    description: "Weekly recurring pod with outbound and return ride instances.",
    role: "Host",
    primaryStatus: "Recurring",
    recommendedRoute: "/create/recurring",
    tags: ["demo", "closed beta", "recurring", "back and forth"],
    notes: "Use this demo scenario to test recurring setup and per-ride-date settlement explanation.",
  },
  {
    id: "settlement_ready",
    title: "Settlement Ready",
    description: "Proof is verified. Guests can review final split during dispute window.",
    role: "Host / Guest",
    primaryStatus: "Settlement ready",
    recommendedRoute: "/pods/usc-lax-001/settlement",
    tags: ["demo", "closed beta", "settlement ready", "dispute window"],
    notes: "Use this demo scenario to test final split, dispute window, and manual payout status copy.",
  },
  {
    id: "dispute_review",
    title: "Dispute Review",
    description: "Guest reported an issue. Payout/settlement is under manual review.",
    role: "Admin / Host / Guest",
    primaryStatus: "Dispute review",
    recommendedRoute: "/admin/review",
    tags: ["demo", "closed beta", "dispute review", "manual review"],
    notes: "Use this demo scenario to test dispute evidence and payout hold messaging.",
  },
  {
    id: "admin_review_queue",
    title: "Admin Review Queue",
    description: "Admin reviews above-cap proof, suspicious proof, and disputes.",
    role: "Admin",
    primaryStatus: "Admin review",
    recommendedRoute: "/admin/review",
    tags: ["demo", "closed beta", "admin review", "manual review"],
    notes: "Use this demo scenario to test admin review triage and action copy.",
  },
  {
    id: "profile_eligibility",
    title: "Profile + Eligibility Gates",
    description:
      "Shows Women-only, Verified-only, Community-only, High-trust-only, and Invite-only eligibility outcomes.",
    role: "Guest",
    primaryStatus: "Eligibility",
    recommendedRoute: "/profile",
    tags: ["demo", "closed beta", "profile", "eligibility"],
    notes: "Use this demo scenario to test private profile fields, public badges, and join gating copy.",
  },
  {
    id: "safety_report",
    title: "Member Safety Report",
    description: "User reports a private member safety concern for manual review.",
    role: "Guest / Admin",
    primaryStatus: "Safety review",
    recommendedRoute: "/pods/usc-lax-001",
    tags: ["demo", "closed beta", "safety review", "manual review"],
    notes: "Use this demo scenario to test private report submission and admin visibility expectations.",
  },
];

export function listRidePodDemoScenarios() {
  return [...RIDE_POD_DEMO_SCENARIOS];
}

export function getRidePodDemoScenario(id: string) {
  return RIDE_POD_DEMO_SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}
