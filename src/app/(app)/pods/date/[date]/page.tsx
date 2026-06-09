import { MyRideDatePage } from "@/components/my-ride-date-page";

export default async function MyRideDateRoute({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;

  return <MyRideDatePage date={date} />;
}
