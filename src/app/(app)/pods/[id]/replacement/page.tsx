import { HostReplacementModePanel } from "@/components/money-safety-ui";

export default async function HostReplacementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <HostReplacementModePanel podId={id} />;
}
