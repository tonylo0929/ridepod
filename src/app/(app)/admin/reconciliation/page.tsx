import { PaymentReconciliationDashboard } from "@/components/payment-reconciliation-dashboard";

export default async function AdminPaymentReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ pod?: string }>;
}) {
  const { pod } = await searchParams;

  return <PaymentReconciliationDashboard podId={pod} />;
}
