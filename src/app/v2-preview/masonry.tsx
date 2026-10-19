"use client";

import { Children, useSyncExternalStore, type ReactNode } from "react";
import s from "./preview.module.css";

function subscribe(onChange: () => void) {
  const queries = [
    window.matchMedia("(min-width: 761px)"),
    window.matchMedia("(min-width: 1101px)"),
  ];
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () =>
    queries.forEach((query) => query.removeEventListener("change", onChange));
}
function columns() {
  return window.matchMedia("(min-width: 1101px)").matches
    ? 4
    : window.matchMedia("(min-width: 761px)").matches
      ? 3
      : 2;
}

/** Distribute cards by row; native columns can leave an entire lane blank. */
export function Masonry({ children }: { children: ReactNode }) {
  const count = useSyncExternalStore(subscribe, columns, () => 2);
  const cards = Children.toArray(children);
  return (
    <div className={s.feed}>
      {Array.from({ length: count }, (_, lane) => (
        <div className={s.lane} key={lane}>
          {cards.filter((_, index) => index % count === lane)}
        </div>
      ))}
    </div>
  );
}
