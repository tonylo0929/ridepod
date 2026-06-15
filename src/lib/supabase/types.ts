// TODO: generate Supabase Database types after schema stabilizes.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type RidePodProfileRow = {
  id: string;
  account_name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  preferred_name: string | null;
  phone: string | null;
  home_district: string | null;
  public_bio: string | null;
  trust_review_status: string | null;
  gender_identity: "FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY" | "UNKNOWN" | string | null;
  gender_verified_at: string | null;
  verification_status: string | null;
  community_id: string | null;
  community_verified_at: string | null;
  safety_note: string | null;
  trust_score: number | null;
  no_show_count: number | null;
  late_cancel_count: number | null;
  risk_status: string | null;
  id_verification_status: string | null;
  id_verified_at: string | null;
  manual_verification_requested_at: string | null;
  manually_verified_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type RidePodPodRow = {
  id: string;
  host_user_id: string | null;
  pod_type: "SCHEDULED" | "RECURRING";
  lifecycle_state: string;
  ride_option: "RIDE_APP_FIXED_QUOTE" | "TAXI_METER";
  route_label: string;
  pickup_point: string | null;
  dropoff_point: string | null;
  ideal_pod_size: number;
  minimum_locked_guests: number;
  booking_fare_cap_cents: number;
  current_estimate_cents: number | null;
  platform_fee_rate_bps: number | null;
  minimum_platform_fee_cents: number | null;
  currency: string | null;
  departure_at: string | null;
  recurring_days: string[] | null;
  recurring_pattern: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type RidePodRideInstanceRow = {
  id: string;
  pod_id: string | null;
  instance_status: string;
  leg_type: string | null;
  route_label: string;
  departure_at: string;
  guests_locked_count: number | null;
  required_guests_count: number;
  booking_fare_cap_cents: number;
  quote_proof_id: string | null;
  receipt_proof_id: string | null;
  settlement_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type RidePodMemberRow = {
  id: string;
  pod_id: string | null;
  user_id: string | null;
  role: string;
  member_state: string;
  status: string;
  max_charge_cents: number | null;
  final_charge_cents: number | null;
  joined_at: string | null;
  cancelled_at: string | null;
  locked_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type RidePodSettlementItemRow = {
  id: string;
  settlement_id: string | null;
  user_id: string | null;
  item_type: string;
  amount_cents: number;
  direction: string;
  reason: string | null;
  created_at: string | null;
};

export type RidePodProofRow = {
  id: string;
  ride_instance_id: string | null;
  uploaded_by_user_id: string | null;
  proof_type: "QUOTE_SCREENSHOT" | "FINAL_RECEIPT" | "METER_PROOF";
  proof_status: string;
  amount_cents: number | null;
  file_url: string | null;
  provider_name: string | null;
  certification_accepted: boolean | null;
  certification_text_version: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
};

export type RidePodSettlementRow = {
  id: string;
  ride_instance_id: string | null;
  settlement_state: string;
  verified_fare_cents: number | null;
  booking_fare_cap_cents: number | null;
  billable_guest_count: number | null;
  fare_share_cents: number | null;
  platform_fee_cents: number | null;
  host_reimbursement_cents: number | null;
  dispute_deadline_at: string | null;
  finalized_at: string | null;
  created_at: string | null;
};

export type RidePodAdminReviewCaseRow = {
  id: string;
  ride_instance_id: string | null;
  proof_id: string | null;
  settlement_id: string | null;
  subject_user_id: string | null;
  review_state: string;
  case_type: string;
  severity: string;
  title: string;
  description: string | null;
  created_at: string | null;
  resolved_at: string | null;
  admin_notes: string | null;
};

export type RidePodEventRow = {
  id: string;
  pod_id: string | null;
  ride_instance_id: string | null;
  user_id: string | null;
  event_type: string;
  event_payload: Json | null;
  created_at: string | null;
};

export type RidePodPaymentEventRow = {
  id: string;
  ride_instance_id: string | null;
  pod_id: string | null;
  user_id: string | null;
  actor_role: string | null;
  event_type: string;
  payment_provider: string;
  stripe_payment_intent_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  previous_status: string | null;
  new_status: string | null;
  event_payload: Json | null;
  created_at: string | null;
};

export type RidePodUserNotificationRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  type: string;
  title: string;
  body: string | null;
  related_pod_id: string | null;
  related_url: string | null;
  metadata: Json;
  read_at: string | null;
  created_at: string | null;
};

export type RidePodLiveUpdateRow = {
  id: string;
  pod_id: string;
  user_id: string | null;
  update_type: string;
  message: string | null;
  metadata: Json;
  created_at: string | null;
};

export type RidePodMemberStatusRow = {
  id: string;
  pod_id: string;
  user_id: string;
  status: string;
  message: string | null;
  updated_at: string | null;
};

type TableDefinition<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<RidePodProfileRow>;
      pods: TableDefinition<RidePodPodRow>;
      ride_instances: TableDefinition<RidePodRideInstanceRow>;
      pod_members: TableDefinition<RidePodMemberRow>;
      proofs: TableDefinition<RidePodProofRow>;
      settlements: TableDefinition<RidePodSettlementRow>;
      settlement_items: TableDefinition<RidePodSettlementItemRow>;
      admin_review_cases: TableDefinition<RidePodAdminReviewCaseRow>;
      pod_events: TableDefinition<RidePodEventRow>;
      payment_events: TableDefinition<RidePodPaymentEventRow>;
      user_notifications: TableDefinition<RidePodUserNotificationRow>;
      pod_live_updates: TableDefinition<RidePodLiveUpdateRow>;
      pod_member_status: TableDefinition<RidePodMemberStatusRow>;
    };
    Views: Record<string, never>;
    Functions: {
      notify_pod_audience: {
        Args: {
          p_pod_id: string;
          p_actor_user_id: string;
          p_audiences: string[];
          p_type: string;
          p_title: string;
          p_body?: string | null;
          p_self_title?: string | null;
          p_self_body?: string | null;
          p_related_url?: string | null;
          p_metadata?: Json;
          p_dedupe?: boolean;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
