import { notFound } from "next/navigation";
import { ReviewRatingPage } from "@/components/review-rating-page";
import { getPod } from "@/lib/mock-data";

export default async function PodReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pod = getPod(id);

  if (!pod) notFound();

  return <ReviewRatingPage />;
}
