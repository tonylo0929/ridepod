export type User = {
  id: string;
  name: string;
  avatarUrl: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  trustScore: number;
  completedPods: number;
  noShowCount: number;
  hostReliability: number;
};

export type PodMember = {
  userId: string;
  role: "host" | "backup_host" | "member";
  paymentStatus:
    | "not_started"
    | "deposit_paid"
    | "authorized"
    | "charged"
    | "refunded";
  attendanceStatus:
    | "pending"
    | "confirmed"
    | "checked_in"
    | "no_show"
    | "cancelled";
  joinedAt: string;
};

export type PodGenderMode = "mixed" | "women_only";
export type PodAccessMode =
  | "open"
  | "verified_only"
  | "community_only"
  | "high_trust_only"
  | "invite_only";
export type PodMoneyStatus =
  | "payment_needed"
  | "seat_locked"
  | "waiting_for_riders"
  | "host_can_book"
  | "quote_approval_needed"
  | "ride_booked"
  | "receipt_pending"
  | "settlement_ready"
  | "host_replacement_needed"
  | "dispute_review";

export type RecurringRideLegType = "outbound" | "return";
export type RecurringRideStatus =
  | "waiting_for_guests"
  | "guests_locking"
  | "quote_needed"
  | "quote_under_review"
  | "ready_to_book"
  | "ride_booked"
  | "ready_for_taxi_meter"
  | "meter_proof_needed"
  | "meter_proof_submitted"
  | "meter_proof_under_review"
  | "receipt_pending"
  | "receipt_submitted"
  | "receipt_under_review"
  | "settlement_ready"
  | "completed";

export type RideInstanceProofType = "QUOTE_SCREENSHOT" | "METER_PROOF" | "FINAL_RECEIPT";
export type RideInstanceProofStatus =
  | "NOT_REQUIRED"
  | "NEEDED"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "VERIFIED"
  | "REJECTED"
  | "NEEDS_MORE_INFO";

export type RideInstanceSettlementState =
  | "SETTLEMENT_READY"
  | "DISPUTE_WINDOW"
  | "DISPUTE_REVIEW"
  | "SETTLEMENT_FINAL"
  | "PAYOUT_PENDING"
  | "PAID";

export type RideInstancePayoutState =
  | "PENDING"
  | "HELD_FOR_REVIEW"
  | "READY"
  | "PAID";

export type RecurringRideInstancePreview = {
  id: string;
  recurringTemplateId?: string;
  instanceDate: string;
  displayDate: string;
  departureTime: string;
  legType: RecurringRideLegType;
  originLabel: string;
  destinationLabel: string;
  status: RecurringRideStatus;
  proofType?: RideInstanceProofType;
  proofStatus?: RideInstanceProofStatus;
  quotedFareCents?: number;
  bookingFareCapCents?: number;
  finalFareCents?: number;
  receiptFareCents?: number;
  proofCertified?: boolean;
  proofFileUrl?: string | null;
  proofFileName?: string | null;
  proofContentType?: string | null;
  certificationTextVersion?: string;
  submittedAt?: string;
  reviewedAt?: string;
  settlementId?: string;
  settlementState?: RideInstanceSettlementState;
  rideCompletedAt?: string;
  proofVerifiedAt?: string;
  settlementReadyAt?: string;
  disputeWindowEndsAt?: string;
  disputeRaised?: boolean;
  taxiPartnerQuoteRequestId?: string;
  platformFeeCents?: number;
  hostReimbursementCents?: number;
  payoutState?: RideInstancePayoutState;
  disputeReason?: string | null;
  disputeNote?: string | null;
};

export type RidePod = {
  id: string;
  type: "scheduled" | "recurring";
  title: string;
  fromLabel: string;
  toLabel: string;
  pickupHub: string;
  dropoffHub: string;
  date: string;
  time: string;
  timeFlexibility: string;
  recurrenceRule?: string;
  recurringDays?: string[];
  recurringPattern?: "one_way" | "back_and_forth";
  recurringScheduleLine?: string;
  outboundTime?: string;
  returnTime?: string;
  protectionStatus?: string;
  upcomingRideInstances?: RecurringRideInstancePreview[];
  vehicleType: "UberX" | "UberXL" | "Lyft" | "Taxi" | "Private Car";
  rideOption?: "ride_app_fixed_quote" | "taxi_meter" | "taxi_partner_quote";
  maxFare: number;
  estimatedFare: number;
  estimatedShare: number;
  platformFee: number;
  seatsTotal: number;
  seatsFilled: number;
  genderMode?: PodGenderMode;
  accessMode?: PodAccessMode;
  moneyStatus?: PodMoneyStatus;
  status:
    | "forming"
    | "locked"
    | "host_booking"
    | "booked"
    | "completed"
    | "cancelled";
  hostUserId: string;
  backupHostUserId: string;
  lockDeadline: string;
  cancellationDeadline: string;
  members: PodMember[];
  waitlist: string[];
};

export const currentUserId = "u1";

export const users: User[] = [
  {
    id: "u1",
    name: "Maya Chen",
    avatarUrl: "/avatars/maya.png",
    phoneVerified: true,
    emailVerified: true,
    trustScore: 96,
    completedPods: 18,
    noShowCount: 0,
    hostReliability: 98,
  },
  {
    id: "u2",
    name: "Andre Lee",
    avatarUrl: "/avatars/andre.png",
    phoneVerified: true,
    emailVerified: true,
    trustScore: 91,
    completedPods: 12,
    noShowCount: 1,
    hostReliability: 93,
  },
  {
    id: "u3",
    name: "Priya Shah",
    avatarUrl: "/avatars/priya.png",
    phoneVerified: true,
    emailVerified: false,
    trustScore: 88,
    completedPods: 9,
    noShowCount: 0,
    hostReliability: 89,
  },
  {
    id: "u4",
    name: "Sam Rivera",
    avatarUrl: "/avatars/sam.png",
    phoneVerified: true,
    emailVerified: true,
    trustScore: 94,
    completedPods: 21,
    noShowCount: 0,
    hostReliability: 97,
  },
  {
    id: "u5",
    name: "Nora Patel",
    avatarUrl: "/avatars/nora.png",
    phoneVerified: true,
    emailVerified: true,
    trustScore: 90,
    completedPods: 7,
    noShowCount: 0,
    hostReliability: 92,
  },
  {
    id: "u6",
    name: "Jordan Lee",
    avatarUrl: "/avatars/jordan.png",
    phoneVerified: true,
    emailVerified: true,
    trustScore: 94,
    completedPods: 16,
    noShowCount: 0,
    hostReliability: 96,
  },
  {
    id: "u7",
    name: "Alex Kim",
    avatarUrl: "/avatars/alex.png",
    phoneVerified: true,
    emailVerified: true,
    trustScore: 91,
    completedPods: 10,
    noShowCount: 0,
    hostReliability: 90,
  },
];

export const ridePods: RidePod[] = [
  {
    id: "women-only-demo",
    type: "scheduled",
    title: "Women-only USC to LAX demo pod",
    fromLabel: "USC Village",
    toLabel: "LAX Terminal 1",
    pickupHub: "Jefferson entrance rideshare curb",
    dropoffHub: "Terminal 1 departures",
    date: "May 22, 2026",
    time: "8:30 PM",
    timeFlexibility: "+/- 10 min",
    vehicleType: "UberXL",
    maxFare: 75,
    estimatedFare: 60,
    estimatedShare: 22,
    platformFee: 2,
    seatsTotal: 3,
    seatsFilled: 1,
    genderMode: "women_only",
    accessMode: "verified_only",
    moneyStatus: "payment_needed",
    status: "forming",
    hostUserId: "u1",
    backupHostUserId: "u3",
    lockDeadline: "May 22, 2026, 6:00 PM",
    cancellationDeadline: "May 22, 2026, 5:00 PM",
    members: [{ userId: "u1", role: "host", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 11" }],
    waitlist: [],
  },
  {
    id: "mixed-open-demo",
    type: "scheduled",
    title: "Mixed airport demo pod",
    fromLabel: "Downtown",
    toLabel: "Airport",
    pickupHub: "Grand Ave hotel loop",
    dropoffHub: "Departures level, Door 4",
    date: "May 24, 2026",
    time: "8:00 AM",
    timeFlexibility: "+/- 15 min",
    vehicleType: "Taxi",
    maxFare: 96,
    estimatedFare: 80,
    estimatedShare: 24,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 1,
    genderMode: "mixed",
    accessMode: "open",
    moneyStatus: "waiting_for_riders",
    status: "forming",
    hostUserId: "u1",
    backupHostUserId: "u2",
    lockDeadline: "May 23, 2026, 8:00 PM",
    cancellationDeadline: "May 23, 2026, 5:00 PM",
    members: [{ userId: "u1", role: "host", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 12" }],
    waitlist: [],
  },
  {
    id: "airport-sfo-721",
    type: "scheduled",
    title: "Airport SFO forming demo",
    fromLabel: "SFO Terminal 2",
    toLabel: "Mission District",
    pickupHub: "Rideshare pickup island",
    dropoffHub: "16th Street transit plaza",
    date: "May 25, 2026",
    time: "7:10 PM",
    timeFlexibility: "+/- 10 min",
    vehicleType: "UberX",
    maxFare: 88,
    estimatedFare: 70,
    estimatedShare: 24,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 2,
    genderMode: "mixed",
    accessMode: "verified_only",
    moneyStatus: "waiting_for_riders",
    status: "forming",
    hostUserId: "u2",
    backupHostUserId: "u1",
    lockDeadline: "May 25, 2026, 4:30 PM",
    cancellationDeadline: "May 25, 2026, 3:00 PM",
    members: [
      { userId: "u2", role: "host", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 12" },
      { userId: "u1", role: "member", paymentStatus: "authorized", attendanceStatus: "pending", joinedAt: "May 12" },
    ],
    waitlist: [],
  },
  {
    id: "locked-no-quote-demo",
    type: "scheduled",
    title: "Locked pod awaiting quote",
    fromLabel: "Campus Center",
    toLabel: "Concert Venue",
    pickupHub: "Student union flagpole",
    dropoffHub: "North gate rideshare zone",
    date: "Jun 8, 2026",
    time: "6:25 PM",
    timeFlexibility: "+/- 15 min",
    vehicleType: "UberXL",
    maxFare: 64,
    estimatedFare: 49,
    estimatedShare: 14,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 4,
    genderMode: "mixed",
    accessMode: "high_trust_only",
    moneyStatus: "seat_locked",
    status: "locked",
    hostUserId: "u4",
    backupHostUserId: "u5",
    lockDeadline: "Jun 8, 2026, 2:00 PM",
    cancellationDeadline: "Jun 8, 2026, 12:00 PM",
    members: [
      { userId: "u4", role: "host", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 13" },
      { userId: "u5", role: "backup_host", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 13" },
      { userId: "u2", role: "member", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 14" },
      { userId: "u3", role: "member", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 14" },
    ],
    waitlist: [],
  },
  {
    id: "usc-lax-001",
    type: "scheduled",
    title: "USC to LAX ready to book",
    fromLabel: "USC Village",
    toLabel: "LAX Terminal 1",
    pickupHub: "Jefferson entrance rideshare curb",
    dropoffHub: "Terminal 1 departures",
    date: "May 14, 2026",
    time: "7:30 AM",
    timeFlexibility: "+/- 5 min",
    vehicleType: "UberXL",
    maxFare: 96,
    estimatedFare: 82,
    estimatedShare: 28,
    platformFee: 3,
    seatsTotal: 4,
    seatsFilled: 3,
    genderMode: "mixed",
    accessMode: "verified_only",
    moneyStatus: "host_can_book",
    status: "host_booking",
    hostUserId: "u1",
    backupHostUserId: "u6",
    lockDeadline: "May 13, 2026, 9:00 PM",
    cancellationDeadline: "May 13, 2026, 6:00 PM",
    members: [
      { userId: "u1", role: "host", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 10" },
      { userId: "u6", role: "member", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 10" },
      { userId: "u7", role: "member", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 10" },
    ],
    waitlist: [],
  },
  {
    id: "campus-commute-442",
    type: "recurring",
    title: "Campus commute quote review",
    fromLabel: "Westside Apartments",
    toLabel: "Office District",
    pickupHub: "Building B lobby drive",
    dropoffHub: "Market Tower south entrance",
    date: "Starts Jun 1, 2026",
    time: "8:05 AM",
    timeFlexibility: "+/- 5 min",
    recurrenceRule: "Tue, Wed, Thu weekly",
    recurringPattern: "back_and_forth",
    recurringDays: ["Tue", "Wed", "Thu"],
    vehicleType: "UberX",
    maxFare: 42,
    estimatedFare: 34,
    estimatedShare: 10,
    platformFee: 1,
    seatsTotal: 4,
    seatsFilled: 4,
    genderMode: "mixed",
    accessMode: "community_only",
    moneyStatus: "quote_approval_needed",
    status: "locked",
    hostUserId: "u1",
    backupHostUserId: "u2",
    lockDeadline: "May 30, 2026, 6:00 PM",
    cancellationDeadline: "Weekly by Sunday 5:00 PM",
    members: [
      { userId: "u1", role: "host", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 10" },
      { userId: "u2", role: "backup_host", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 10" },
      { userId: "u3", role: "member", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 11" },
      { userId: "u4", role: "member", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 11" },
    ],
    waitlist: [],
  },
  {
    id: "host-replacement-demo",
    type: "scheduled",
    title: "Host replacement needed",
    fromLabel: "Museum District",
    toLabel: "North Station",
    pickupHub: "Main entrance",
    dropoffHub: "Station east curb",
    date: "Jun 4, 2026",
    time: "5:40 PM",
    timeFlexibility: "+/- 10 min",
    vehicleType: "Taxi",
    maxFare: 58,
    estimatedFare: 44,
    estimatedShare: 16,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 3,
    genderMode: "mixed",
    accessMode: "verified_only",
    moneyStatus: "host_replacement_needed",
    status: "locked",
    hostUserId: "u5",
    backupHostUserId: "u1",
    lockDeadline: "Jun 4, 2026, 2:00 PM",
    cancellationDeadline: "Jun 4, 2026, 12:00 PM",
    members: [
      { userId: "u5", role: "host", paymentStatus: "authorized", attendanceStatus: "cancelled", joinedAt: "May 20" },
      { userId: "u1", role: "backup_host", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 20" },
      { userId: "u2", role: "member", paymentStatus: "authorized", attendanceStatus: "confirmed", joinedAt: "May 20" },
    ],
    waitlist: [],
  },
  {
    id: "private-car-napa-906",
    type: "scheduled",
    title: "Private car receipt pending",
    fromLabel: "Downtown Hotel",
    toLabel: "Napa stop",
    pickupHub: "Lobby driveway",
    dropoffHub: "Town square",
    date: "Jun 12, 2026",
    time: "9:10 AM",
    timeFlexibility: "+/- 10 min",
    vehicleType: "Private Car",
    maxFare: 180,
    estimatedFare: 148,
    estimatedShare: 52,
    platformFee: 5,
    seatsTotal: 4,
    seatsFilled: 4,
    genderMode: "mixed",
    accessMode: "verified_only",
    moneyStatus: "receipt_pending",
    status: "booked",
    hostUserId: "u6",
    backupHostUserId: "u1",
    lockDeadline: "Jun 11, 2026, 6:00 PM",
    cancellationDeadline: "Jun 11, 2026, 4:00 PM",
    members: [
      { userId: "u6", role: "host", paymentStatus: "charged", attendanceStatus: "confirmed", joinedAt: "May 25" },
      { userId: "u1", role: "backup_host", paymentStatus: "charged", attendanceStatus: "confirmed", joinedAt: "May 25" },
      { userId: "u2", role: "member", paymentStatus: "charged", attendanceStatus: "confirmed", joinedAt: "May 25" },
      { userId: "u3", role: "member", paymentStatus: "charged", attendanceStatus: "confirmed", joinedAt: "May 25" },
    ],
    waitlist: [],
  },
  {
    id: "settlement-complete-demo",
    type: "scheduled",
    title: "Settlement ready demo",
    fromLabel: "Airport",
    toLabel: "Downtown",
    pickupHub: "Terminal arrivals curb",
    dropoffHub: "Market Street",
    date: "Jun 14, 2026",
    time: "10:20 PM",
    timeFlexibility: "+/- 10 min",
    vehicleType: "Taxi",
    maxFare: 96,
    estimatedFare: 84,
    estimatedShare: 28,
    platformFee: 3,
    seatsTotal: 4,
    seatsFilled: 4,
    genderMode: "mixed",
    accessMode: "verified_only",
    moneyStatus: "settlement_ready",
    status: "completed",
    hostUserId: "u7",
    backupHostUserId: "u1",
    lockDeadline: "Jun 14, 2026, 6:00 PM",
    cancellationDeadline: "Jun 14, 2026, 4:00 PM",
    members: [
      { userId: "u7", role: "host", paymentStatus: "charged", attendanceStatus: "confirmed", joinedAt: "May 28" },
      { userId: "u1", role: "backup_host", paymentStatus: "charged", attendanceStatus: "confirmed", joinedAt: "May 28" },
      { userId: "u2", role: "member", paymentStatus: "charged", attendanceStatus: "confirmed", joinedAt: "May 28" },
      { userId: "u3", role: "member", paymentStatus: "charged", attendanceStatus: "confirmed", joinedAt: "May 28" },
    ],
    waitlist: [],
  },
];

export const ridePodMockCoverageExamples = {
  recurringPatterns: [
    { recurringPattern: "one_way" },
    { recurringPattern: "back_and_forth" },
  ],
  rideOptions: [
    { rideOption: "ride_app_fixed_quote" },
    { rideOption: "taxi_meter" },
    { rideOption: "taxi_partner_quote" },
  ],
  taxiPartnerStatuses: [
    "taxi_partner_quote_needed",
    "taxi_partner_quote_received",
    "taxi_partner_guests_accepting",
    "taxi_partner_ready",
    "taxi_partner_completed_payout_pending",
    "taxi_partner_dispute_review",
  ],
  proofExamples: [
    {
      id: "campus-commute-442-2026-06-23-outbound",
      recurringTemplateId: "campus-commute-442",
      status: "ride_booked",
      proofType: "QUOTE_SCREENSHOT",
      proofStatus: "APPROVED",
      bookingFareCapCents: 32000,
      certificationTextVersion: "ride-instance-proof-v1",
      submittedAt: "2026-06-22T12:00:00.000Z",
      reviewedAt: "2026-06-22T12:20:00.000Z",
    },
    {
      id: "campus-commute-442-2026-06-30-outbound",
      recurringTemplateId: "campus-commute-442",
      status: "receipt_pending",
      proofType: "FINAL_RECEIPT",
      proofStatus: "VERIFIED",
      finalFareCents: 29800,
      settlementState: "DISPUTE_WINDOW",
      settlementId: "settlement-campus-commute-442-2026-05-19-outbound",
      disputeWindowEndsAt: "2026-07-01T12:00:00.000Z",
      platformFeeCents: 2980,
      hostReimbursementCents: 26820,
      payoutState: "PENDING",
    },
    {
      id: "taxi-meter-weekly-demo-2026-05-19-outbound",
      recurringTemplateId: "taxi-meter-weekly-demo",
      status: "settlement_ready",
      proofType: "METER_PROOF",
      proofStatus: "VERIFIED",
      finalFareCents: 28600,
    },
  ],
};

export function getUser(userId: string) {
  return users.find((user) => user.id === userId) ?? users[0];
}

export function getPod(podId: string) {
  return ridePods.find((pod) => pod.id === podId);
}

export function getCurrentUser() {
  return getUser(currentUserId);
}

export function getUserPods(userId = currentUserId) {
  return ridePods.filter((pod) =>
    pod.members.some((member) => member.userId === userId),
  );
}

export function getHostedPods(userId = currentUserId) {
  return ridePods.filter(
    (pod) => pod.hostUserId === userId || pod.backupHostUserId === userId,
  );
}

export function getRecurringRideInstance(rideInstanceId: string) {
  for (const pod of ridePods) {
    const rideInstance = pod.upcomingRideInstances?.find((instance) => instance.id === rideInstanceId);
    if (rideInstance) return { pod, rideInstance };
  }

  return null;
}

export function formatMoney(value: number) {
  const hasCents = !Number.isInteger(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(value);
}

export const designRidePods: RidePod[] = [
  {
    id: "usc-lax-commute",
    type: "scheduled",
    title: "USC to LAX finals-week pod",
    fromLabel: "USC Village",
    toLabel: "LAX Terminal 1",
    pickupHub: "Jefferson entrance rideshare curb",
    dropoffHub: "Terminal 1 departures",
    date: "May 22, 2026",
    time: "6:15 AM",
    timeFlexibility: "+/- 10 min",
    vehicleType: "UberXL",
    maxFare: 86,
    estimatedFare: 68,
    estimatedShare: 19,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 3,
    genderMode: "women_only",
    accessMode: "verified_only",
    moneyStatus: "payment_needed",
    status: "forming",
    hostUserId: "u5",
    backupHostUserId: "u1",
    lockDeadline: "May 21, 2026, 9:00 PM",
    cancellationDeadline: "May 21, 2026, 6:00 PM",
    members: [
      {
        userId: "u5",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 11",
      },
      {
        userId: "u1",
        role: "backup_host",
        paymentStatus: "deposit_paid",
        attendanceStatus: "confirmed",
        joinedAt: "May 11",
      },
      {
        userId: "u3",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 12",
      },
    ],
    waitlist: ["u2"],
  },
  {
    id: "downtown-airport-morning",
    type: "scheduled",
    title: "Downtown to Airport morning lock",
    fromLabel: "Downtown",
    toLabel: "Airport",
    pickupHub: "Grand Ave hotel loop",
    dropoffHub: "Departures level, Door 4",
    date: "May 24, 2026",
    time: "7:40 AM",
    timeFlexibility: "+/- 5 min",
    vehicleType: "Lyft",
    maxFare: 72,
    estimatedFare: 57,
    estimatedShare: 16,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 2,
    genderMode: "mixed",
    accessMode: "open",
    moneyStatus: "waiting_for_riders",
    status: "forming",
    hostUserId: "u2",
    backupHostUserId: "u4",
    lockDeadline: "May 23, 2026, 8:00 PM",
    cancellationDeadline: "May 23, 2026, 5:00 PM",
    members: [
      {
        userId: "u2",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 12",
      },
      {
        userId: "u4",
        role: "backup_host",
        paymentStatus: "deposit_paid",
        attendanceStatus: "pending",
        joinedAt: "May 12",
      },
    ],
    waitlist: [],
  },
  {
    id: "apartment-office-district",
    type: "recurring",
    title: "Apartment to Office District",
    fromLabel: "Westside Apartments",
    toLabel: "Office District",
    pickupHub: "Building B lobby drive",
    dropoffHub: "Market Tower south entrance",
    date: "Starts Jun 1, 2026",
    time: "8:05 AM",
    timeFlexibility: "+/- 5 min",
    recurrenceRule: "Tue, Wed, Thu weekly",
    vehicleType: "UberX",
    maxFare: 42,
    estimatedFare: 34,
    estimatedShare: 10,
    platformFee: 1,
    seatsTotal: 4,
    seatsFilled: 4,
    genderMode: "mixed",
    accessMode: "community_only",
    moneyStatus: "seat_locked",
    status: "locked",
    hostUserId: "u1",
    backupHostUserId: "u2",
    lockDeadline: "May 30, 2026, 6:00 PM",
    cancellationDeadline: "Weekly by Sunday 5:00 PM",
    members: [
      {
        userId: "u1",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 10",
      },
      {
        userId: "u2",
        role: "backup_host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 10",
      },
      {
        userId: "u3",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 11",
      },
      {
        userId: "u4",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 11",
      },
    ],
    waitlist: ["u5"],
  },
  {
    id: "campus-concert-venue",
    type: "scheduled",
    title: "Campus to Concert Venue",
    fromLabel: "Campus Center",
    toLabel: "Concert Venue",
    pickupHub: "Student union flagpole",
    dropoffHub: "North gate rideshare zone",
    date: "Jun 8, 2026",
    time: "6:25 PM",
    timeFlexibility: "+/- 15 min",
    vehicleType: "Taxi",
    maxFare: 64,
    estimatedFare: 49,
    estimatedShare: 14,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 3,
    genderMode: "mixed",
    accessMode: "high_trust_only",
    moneyStatus: "host_can_book",
    status: "host_booking",
    hostUserId: "u4",
    backupHostUserId: "u5",
    lockDeadline: "Jun 8, 2026, 2:00 PM",
    cancellationDeadline: "Jun 8, 2026, 12:00 PM",
    members: [
      {
        userId: "u4",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 13",
      },
      {
        userId: "u5",
        role: "backup_host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 13",
      },
      {
        userId: "u2",
        role: "member",
        paymentStatus: "deposit_paid",
        attendanceStatus: "pending",
        joinedAt: "May 14",
      },
    ],
    waitlist: ["u3"],
  },
];
