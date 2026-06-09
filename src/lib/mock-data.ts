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

export const ridePods: RidePod[] = [];

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
