import { notFound } from "next/navigation";
import { DesignVariationPage } from "@/components/design-variation";
import { designVariantSlugs, getDesignVariant } from "@/lib/design-variants";

export function generateStaticParams() {
  return designVariantSlugs.map((variant) => ({ variant }));
}

export default async function DesignVariantPage({
  params,
}: {
  params: Promise<{ variant: string }>;
}) {
  const { variant: slug } = await params;
  const variant = getDesignVariant(slug);

  if (!variant) {
    notFound();
  }

  return <DesignVariationPage variant={variant} />;
}
