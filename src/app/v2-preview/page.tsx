import type { Metadata } from "next";
import Discovery from "./discovery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "FareEnough · 同路就夾，車費齊齊慳。| V2.2 Preview",
  description:
    "FareEnough 機場同路、日常夾車。搵個同路人，車費齊齊慳。V2.2 示範體驗。",
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return <Discovery today={today} />;
}
