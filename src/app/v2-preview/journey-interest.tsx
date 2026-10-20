import { Users } from "lucide-react";
import { journeyCounts, type Journey } from "./data";
import s from "./preview.module.css";

/** Interest and intended group size are independent throughout the preview. */
export function JourneyInterest({ journey, interested = false }: { journey: Journey; interested?: boolean }) {
  const counts = journeyCounts(journey, interested);
  return (
    <span className={s.interestSummary}>
      <span><Users size={13} aria-hidden="true" />{counts.interested} 人有興趣<span className={s.srOnly}>（唔計發帖人）</span></span>
      <small>計劃最多 {counts.maxCapacity} 人 · 連發帖人</small>
    </span>
  );
}
