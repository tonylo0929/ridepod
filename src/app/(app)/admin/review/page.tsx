import { AdminReviewClient } from "@/app/(app)/admin/review/admin-review-client";
import { getAdminReviewCasesWithFallback } from "@/lib/supabase/admin-review-cases";

export const dynamic = "force-dynamic";

export default async function AdminReviewPage() {
  const reviewCases = await getAdminReviewCasesWithFallback();
  const stripeTestModeEnabled =
    process.env.RIDEPOD_ENABLE_STRIPE_TEST_MODE === "true" &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_") === true;

  return (
    <AdminReviewClient
      initialCases={reviewCases.cases}
      source={reviewCases.source}
      fallbackNote={reviewCases.fallbackNote}
      userFacingError={reviewCases.userFacingError}
      stripeTestModeEnabled={stripeTestModeEnabled}
    />
  );
}
