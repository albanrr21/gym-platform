"use client";

import { useState } from "react";

// The theme variables are inlined on <html> by the server layout, so they are
// available on first client render — a lazy read is enough.
export function useThemeColor(variable: string, fallback: string) {
  const [color] = useState(() => {
    if (typeof window === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim();
    return value || fallback;
  });

  return color;
}
