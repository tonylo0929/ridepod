"use client";

import { Children, useEffect, useRef, type ReactNode } from "react";
import s from "./preview.module.css";

/** Sparse row-flow preserves source/keyboard order; measured spans keep masonry. */
export function Masonry({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const feed = ref.current;
    if (!feed) return;
    let frame = 0;
    const measure = () => {
      const gap = Number.parseFloat(getComputedStyle(feed).columnGap) || 10;
      const label = feed.querySelector("h3 span");
      // Use potential two-column width so switching to one column cannot oscillate.
      const textSize = label ? Number.parseFloat(getComputedStyle(label).fontSize) : 0;
      feed.dataset.textReflow = String(feed.clientWidth <= 760 && (feed.clientWidth - gap) / 2 < textSize * 9);
      Array.from(feed.children).forEach((item) => {
        const card = item.firstElementChild;
        if (item instanceof HTMLElement && card) {
          item.style.gridRowEnd = `span ${Math.ceil(card.getBoundingClientRect().height + gap)}`;
        }
      });
      feed.dataset.measured = "true";
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(feed);
    Array.from(feed.children).forEach((item) => {
      if (item.firstElementChild) observer.observe(item.firstElementChild);
    });
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [children]);
  return (
    <div className={s.feed} ref={ref}>
      {Children.map(children, (child) => <div className={s.masonryItem}>{child}</div>)}
    </div>
  );
}
