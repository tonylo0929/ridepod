import { AdminReviewClient } from "@/app/(app)/admin/review/admin-review-client";
import { getAdminReviewCasesWithFallback } from "@/lib/supabase/admin-review-cases";

export const dynamic = "force-dynamic";

export default async function AdminReviewPage() {
  const reviewCases = await getAdminReviewCasesWithFallback();

  return (
    <AdminReviewClient
      initialCases={reviewCases.cases}
      source={reviewCases.source}
      fallbackNote={reviewCases.fallbackNote}
      userFacingError={reviewCases.userFacingError}
    />
  );
}
