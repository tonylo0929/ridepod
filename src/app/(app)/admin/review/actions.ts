"use server";

import {
  applyAdminReviewAction,
  type AdminReviewAction,
  type ApplyAdminReviewActionResult,
} from "@/lib/supabase/admin-review-actions";

export async function applyAdminReviewActionForCase(input: {
  caseId: string;
  action: AdminReviewAction;
  adminNotes?: string;
}): Promise<ApplyAdminReviewActionResult> {
  // TODO: Protect Admin Review route/actions with durable admin auth before production.
  return applyAdminReviewAction(input);
}
