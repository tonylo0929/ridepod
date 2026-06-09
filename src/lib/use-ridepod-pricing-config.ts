"use client";

import { useSyncExternalStore } from "react";
import {
  getRidePodPricingConfig,
  ridePodPricingChangeEvent,
  ridePodPricingConfig,
} from "@/lib/ridepod-pricing";

function subscribePricingConfig(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(ridePodPricingChangeEvent, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(ridePodPricingChangeEvent, listener);
  };
}

export function useRidePodPricingConfig() {
  return useSyncExternalStore(
    subscribePricingConfig,
    getRidePodPricingConfig,
    () => ridePodPricingConfig,
  );
}
