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
  rideOption?: "ride_app_fixed_quote" | "taxi_meter";
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
    title: "Women-only airport pod",
    fromLabel: "USC",
    toLabel: "LAX",
    pickupHub: "USC Village rideshare zone",
    dropoffHub: "LAX departures curb",
    date: "May 14, 2026",
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
    lockDeadline: "May 14, 2026, 6:00 PM",
    cancellationDeadline: "May 14, 2026, 4:00 PM",
    members: [
      {
        userId: "u1",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 11",
      },
    ],
    waitlist: [],
  },
  {
    id: "mixed-open-demo",
    type: "scheduled",
    title: "Mixed pod join demo",
    fromLabel: "Downtown",
    toLabel: "Airport",
    pickupHub: "Central hotel loop",
    dropoffHub: "Departures level",
    date: "May 15, 2026",
    time: "8:00 AM",
    timeFlexibility: "+/- 15 min",
    vehicleType: "Lyft",
    maxFare: 96,
    estimatedFare: 80,
    estimatedShare: 22,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 1,
    genderMode: "mixed",
    accessMode: "open",
    moneyStatus: "payment_needed",
    status: "forming",
    hostUserId: "u1",
    backupHostUserId: "u2",
    lockDeadline: "May 14, 2026, 8:00 PM",
    cancellationDeadline: "May 14, 2026, 5:00 PM",
    members: [
      {
        userId: "u1",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 11",
      },
    ],
    waitlist: [],
  },
  {
    id: "usc-lax-001",
    type: "scheduled",
    title: "USC to LAX protected pod",
    fromLabel: "USC",
    toLabel: "LAX",
    pickupHub: "USC Village rideshare zone",
    dropoffHub: "LAX Terminal 3 departures",
    date: "Tue, May 14",
    time: "7:30 AM",
    timeFlexibility: "+/- 15 min",
    vehicleType: "UberXL",
    maxFare: 90,
    estimatedFare: 74,
    estimatedShare: 18.5,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 3,
    genderMode: "mixed",
    accessMode: "verified_only",
    moneyStatus: "host_can_book",
    status: "locked",
    hostUserId: "u1",
    backupHostUserId: "u6",
    lockDeadline: "Mon, May 13, 8:00 PM",
    cancellationDeadline: "Mon, May 13, 6:00 PM",
    members: [
      {
        userId: "u1",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "pending",
        joinedAt: "May 11",
      },
      {
        userId: "u6",
        role: "backup_host",
        paymentStatus: "authorized",
        attendanceStatus: "pending",
        joinedAt: "May 11",
      },
      {
        userId: "u7",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "pending",
        joinedAt: "May 12",
      },
    ],
    waitlist: [],
  },
  {
    id: "airport-sfo-721",
    type: "scheduled",
    title: "SFO early flight pod - payment locking",
    fromLabel: "Mission District",
    toLabel: "SFO Terminal 2",
    pickupHub: "16th St BART curb",
    dropoffHub: "Terminal 2 departures",
    date: "May 18, 2026",
    time: "5:45 AM",
    timeFlexibility: "+/- 10 min",
    vehicleType: "UberXL",
    maxFare: 92,
    estimatedFare: 74,
    estimatedShare: 21,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 3,
    genderMode: "mixed",
    accessMode: "verified_only",
    moneyStatus: "waiting_for_riders",
    status: "forming",
    hostUserId: "u1",
    backupHostUserId: "u4",
    lockDeadline: "May 17, 2026, 8:00 PM",
    cancellationDeadline: "May 17, 2026, 6:00 PM",
    members: [
      {
        userId: "u1",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 8",
      },
      {
        userId: "u2",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 9",
      },
      {
        userId: "u4",
        role: "backup_host",
        paymentStatus: "deposit_paid",
        attendanceStatus: "pending",
        joinedAt: "May 10",
      },
    ],
    waitlist: ["u5"],
  },
  {
    id: "locked-no-quote-demo",
    type: "scheduled",
    title: "Locked pod - quote needed",
    fromLabel: "Downtown",
    toLabel: "Airport",
    pickupHub: "Grand Ave hotel loop",
    dropoffHub: "Departures level, Door 4",
    date: "May 20, 2026",
    time: "7:40 AM",
    timeFlexibility: "+/- 5 min",
    vehicleType: "Lyft",
    maxFare: 72,
    estimatedFare: 57,
    estimatedShare: 16,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 3,
    genderMode: "mixed",
    accessMode: "open",
    moneyStatus: "seat_locked",
    status: "locked",
    hostUserId: "u1",
    backupHostUserId: "u2",
    lockDeadline: "May 19, 2026, 8:00 PM",
    cancellationDeadline: "May 19, 2026, 5:00 PM",
    members: [
      {
        userId: "u1",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 12",
      },
      {
        userId: "u2",
        role: "backup_host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 12",
      },
      {
        userId: "u4",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 13",
      },
    ],
    waitlist: [],
  },
  {
    id: "campus-commute-442",
    type: "recurring",
    title: "USC Village ??LAX Terminal 3",
    fromLabel: "USC Village",
    toLabel: "LAX Terminal 3",
    pickupHub: "USC Village rideshare zone",
    dropoffHub: "LAX Terminal 3 departures",
    date: "Starts May 19, 2026",
    time: "8:00 AM",
    timeFlexibility: "+/- 15 min",
    recurrenceRule: "Tue, Thu weekly",
    recurringDays: ["Tue", "Thu"],
    recurringPattern: "back_and_forth",
    recurringScheduleLine: "Tue, Thu · 8:00 AM outbound · 6:00 PM return",
    outboundTime: "8:00 AM",
    returnTime: "6:00 PM",
    protectionStatus: "Each ride settles separately",
    rideOption: "ride_app_fixed_quote",
    vehicleType: "UberXL",
    maxFare: 34,
    estimatedFare: 28,
    estimatedShare: 8,
    platformFee: 1,
    seatsTotal: 4,
    seatsFilled: 4,
    genderMode: "women_only",
    accessMode: "community_only",
    moneyStatus: "quote_approval_needed",
    status: "locked",
    hostUserId: "u4",
    backupHostUserId: "u1",
    lockDeadline: "May 22, 2026, 5:00 PM",
    cancellationDeadline: "Weekly by Sunday 6:00 PM",
    members: [
      {
        userId: "u4",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 2",
      },
      {
        userId: "u1",
        role: "backup_host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 3",
      },
      {
        userId: "u3",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 4",
      },
      {
        userId: "u5",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 5",
      },
    ],
    waitlist: ["u2"],
    upcomingRideInstances: [
      {
        id: "campus-commute-442-2026-05-19-outbound",
        recurringTemplateId: "campus-commute-442",
        instanceDate: "2026-05-19",
        displayDate: "Tue May 19",
        departureTime: "8:00 AM",
        legType: "outbound",
        originLabel: "USC Village",
        destinationLabel: "LAX Terminal 3",
        status: "quote_needed",
        proofType: "QUOTE_SCREENSHOT",
        proofStatus: "NEEDED",
        bookingFareCapCents: 3400,
        proofCertified: false,
        certificationTextVersion: "ride-instance-proof-v1",
      },
      {
        id: "campus-commute-442-2026-05-19-return",
        recurringTemplateId: "campus-commute-442",
        instanceDate: "2026-05-19",
        displayDate: "Tue May 19",
        departureTime: "6:00 PM",
        legType: "return",
        originLabel: "LAX Terminal 3",
        destinationLabel: "USC Village",
        status: "receipt_pending",
        proofType: "FINAL_RECEIPT",
        proofStatus: "NEEDED",
        quotedFareCents: 29800,
        bookingFareCapCents: 32000,
        proofCertified: false,
        certificationTextVersion: "ride-instance-proof-v1",
      },
      {
        id: "campus-commute-442-2026-05-21-outbound",
        recurringTemplateId: "campus-commute-442",
        instanceDate: "2026-05-21",
        displayDate: "Thu May 21",
        departureTime: "8:00 AM",
        legType: "outbound",
        originLabel: "USC Village",
        destinationLabel: "LAX Terminal 3",
        status: "ready_to_book",
        proofType: "QUOTE_SCREENSHOT",
        proofStatus: "APPROVED",
        quotedFareCents: 3300,
        bookingFareCapCents: 3400,
        proofCertified: true,
        certificationTextVersion: "ride-instance-proof-v1",
      },
      {
        id: "campus-commute-442-2026-05-19-settlement-outbound",
        recurringTemplateId: "campus-commute-442",
        instanceDate: "2026-05-19",
        displayDate: "Tue May 19",
        departureTime: "8:00 AM",
        legType: "outbound",
        originLabel: "USC Village",
        destinationLabel: "LAX Terminal 3",
        status: "settlement_ready",
        proofType: "FINAL_RECEIPT",
        proofStatus: "VERIFIED",
        quotedFareCents: 29800,
        finalFareCents: 29800,
        receiptFareCents: 29800,
        bookingFareCapCents: 32000,
        proofCertified: true,
        certificationTextVersion: "ride-instance-proof-v1",
        submittedAt: "2026-05-19T09:05:00.000Z",
        reviewedAt: "2026-05-19T09:30:00.000Z",
        settlementId: "settlement-campus-commute-442-2026-05-19-outbound",
        settlementState: "DISPUTE_WINDOW",
        rideCompletedAt: "2026-05-19T08:00:00.000Z",
        proofVerifiedAt: "2026-05-19T09:30:00.000Z",
        settlementReadyAt: "2026-05-19T10:15:00.000Z",
        disputeWindowEndsAt: "2026-05-22T08:00:00.000Z",
        disputeRaised: false,
        platformFeeCents: 2980,
        hostReimbursementCents: 26820,
        payoutState: "PENDING",
      },
    ],
  },
  {
    id: "concert-oak-118",
    type: "scheduled",
    title: "Arena concert ride home",
    fromLabel: "Oakland Arena",
    toLabel: "Hayes Valley",
    pickupHub: "South lot rideshare sign",
    dropoffHub: "Patricia's Green",
    date: "May 31, 2026",
    time: "10:55 PM",
    timeFlexibility: "+/- 20 min",
    vehicleType: "Taxi",
    maxFare: 88,
    estimatedFare: 63,
    estimatedShare: 18,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 2,
    genderMode: "mixed",
    accessMode: "high_trust_only",
    moneyStatus: "quote_approval_needed",
    status: "host_booking",
    hostUserId: "u2",
    backupHostUserId: "u5",
    lockDeadline: "May 31, 2026, 6:00 PM",
    cancellationDeadline: "May 31, 2026, 4:00 PM",
    members: [
      {
        userId: "u2",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 7",
      },
      {
        userId: "u5",
        role: "backup_host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 7",
      },
    ],
    waitlist: [],
  },
  {
    id: "taxi-meter-weekly-demo",
    type: "recurring",
    title: "USC Village -> LAX Terminal 3",
    fromLabel: "USC Village",
    toLabel: "LAX Terminal 3",
    pickupHub: "USC Village rideshare zone",
    dropoffHub: "LAX Terminal 3 arrivals",
    date: "Starts May 19, 2026",
    time: "8:00 AM",
    timeFlexibility: "+/- 10 min",
    recurrenceRule: "Tue weekly",
    recurringDays: ["Tue"],
    recurringPattern: "one_way",
    recurringScheduleLine: "Tue - 8:00 AM outbound",
    outboundTime: "8:00 AM",
    protectionStatus: "Each ride settles separately",
    rideOption: "taxi_meter",
    vehicleType: "Taxi",
    maxFare: 320,
    estimatedFare: 298,
    estimatedShare: 80,
    platformFee: 6,
    seatsTotal: 4,
    seatsFilled: 4,
    genderMode: "mixed",
    accessMode: "verified_only",
    moneyStatus: "receipt_pending",
    status: "booked",
    hostUserId: "u1",
    backupHostUserId: "u4",
    lockDeadline: "Weekly by Tuesday 8:00 PM",
    cancellationDeadline: "Weekly by Tuesday 6:00 PM",
    members: [
      {
        userId: "u1",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 12",
      },
      {
        userId: "u4",
        role: "backup_host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 12",
      },
      {
        userId: "u6",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 13",
      },
    ],
    waitlist: [],
    upcomingRideInstances: [
      {
        id: "taxi-meter-weekly-demo-2026-05-19-outbound",
        recurringTemplateId: "taxi-meter-weekly-demo",
        instanceDate: "2026-05-19",
        displayDate: "Tue May 19",
        departureTime: "8:00 AM",
        legType: "outbound",
        originLabel: "USC Village",
        destinationLabel: "LAX Terminal 3",
        status: "meter_proof_needed",
        proofType: "METER_PROOF",
        proofStatus: "NEEDED",
        bookingFareCapCents: 32000,
        proofCertified: false,
        certificationTextVersion: "ride-instance-proof-v1",
      },
      {
        id: "taxi-meter-weekly-demo-2026-05-27-outbound",
        recurringTemplateId: "taxi-meter-weekly-demo",
        instanceDate: "2026-05-27",
        displayDate: "Wed May 27",
        departureTime: "8:00 AM",
        legType: "outbound",
        originLabel: "USC Village",
        destinationLabel: "LAX Terminal 3",
        status: "ready_for_taxi_meter",
        proofType: "METER_PROOF",
        proofStatus: "NOT_REQUIRED",
        bookingFareCapCents: 32000,
        proofCertified: false,
        certificationTextVersion: "ride-instance-proof-v1",
      },
    ],
  },
  {
    id: "host-replacement-demo",
    type: "scheduled",
    title: "Host replacement needed",
    fromLabel: "UCLA",
    toLabel: "Burbank Airport",
    pickupHub: "Ackerman Union rideshare zone",
    dropoffHub: "BUR departures curb",
    date: "May 26, 2026",
    time: "9:20 AM",
    timeFlexibility: "+/- 15 min",
    vehicleType: "UberXL",
    maxFare: 78,
    estimatedFare: 62,
    estimatedShare: 20,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 3,
    genderMode: "mixed",
    accessMode: "verified_only",
    moneyStatus: "host_replacement_needed",
    status: "locked",
    hostUserId: "u2",
    backupHostUserId: "u1",
    lockDeadline: "May 25, 2026, 8:00 PM",
    cancellationDeadline: "May 25, 2026, 6:00 PM",
    members: [
      {
        userId: "u2",
        role: "host",
        paymentStatus: "refunded",
        attendanceStatus: "cancelled",
        joinedAt: "May 12",
      },
      {
        userId: "u1",
        role: "backup_host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 12",
      },
      {
        userId: "u6",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 13",
      },
    ],
    waitlist: ["u7"],
  },
  {
    id: "private-car-napa-906",
    type: "scheduled",
    title: "Napa day trip return",
    fromLabel: "Downtown Napa",
    toLabel: "San Francisco",
    pickupHub: "Oxbow Public Market",
    dropoffHub: "Ferry Building",
    date: "Jun 6, 2026",
    time: "6:30 PM",
    timeFlexibility: "+/- 15 min",
    vehicleType: "Private Car",
    maxFare: 180,
    estimatedFare: 148,
    estimatedShare: 39,
    platformFee: 3,
    seatsTotal: 5,
    seatsFilled: 5,
    genderMode: "mixed",
    accessMode: "invite_only",
    moneyStatus: "receipt_pending",
    status: "booked",
    hostUserId: "u3",
    backupHostUserId: "u1",
    lockDeadline: "Jun 5, 2026, 8:00 PM",
    cancellationDeadline: "Jun 5, 2026, 3:00 PM",
    members: [
      {
        userId: "u3",
        role: "host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 8",
      },
      {
        userId: "u1",
        role: "backup_host",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 9",
      },
      {
        userId: "u2",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 9",
      },
      {
        userId: "u4",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 10",
      },
      {
        userId: "u5",
        role: "member",
        paymentStatus: "authorized",
        attendanceStatus: "confirmed",
        joinedAt: "May 10",
      },
    ],
    waitlist: [],
  },
  {
    id: "settlement-complete-demo",
    type: "scheduled",
    title: "Settlement ready demo",
    fromLabel: "USC",
    toLabel: "LAX",
    pickupHub: "USC Village rideshare zone",
    dropoffHub: "LAX Terminal 1",
    date: "May 12, 2026",
    time: "6:15 AM",
    timeFlexibility: "+/- 10 min",
    vehicleType: "UberXL",
    maxFare: 90,
    estimatedFare: 74,
    estimatedShare: 22,
    platformFee: 2,
    seatsTotal: 4,
    seatsFilled: 4,
    genderMode: "mixed",
    accessMode: "verified_only",
    moneyStatus: "settlement_ready",
    status: "completed",
    hostUserId: "u1",
    backupHostUserId: "u6",
    lockDeadline: "May 11, 2026, 8:00 PM",
    cancellationDeadline: "May 11, 2026, 6:00 PM",
    members: [
      {
        userId: "u1",
        role: "host",
        paymentStatus: "charged",
        attendanceStatus: "checked_in",
        joinedAt: "May 10",
      },
      {
        userId: "u6",
        role: "backup_host",
        paymentStatus: "charged",
        attendanceStatus: "checked_in",
        joinedAt: "May 10",
      },
      {
        userId: "u7",
        role: "member",
        paymentStatus: "charged",
        attendanceStatus: "checked_in",
        joinedAt: "May 10",
      },
      {
        userId: "u4",
        role: "member",
        paymentStatus: "charged",
        attendanceStatus: "checked_in",
        joinedAt: "May 10",
      },
    ],
    waitlist: [],
  },
];

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
