import type { Metadata } from "next";
import Discovery from "./discovery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "RidePod · 搵個同路人 | V2 Preview",
  description: "機場同路、日常夾車，用一個新方式發現下一程。RidePod 示範體驗。",
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <Discovery today={today} />;
}
