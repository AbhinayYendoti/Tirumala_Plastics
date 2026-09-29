"use client";

import { useEffect, useRef, useState } from "react";

const formats = {
  rupees: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }),
  kg: new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }),
  tonnes: new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }),
};

function render(n: number, format: keyof typeof formats) {
  if (format === "kg") return `${formats.kg.format(n)} kg`;
  if (format === "tonnes") return `${formats.tonnes.format(n / 1000)} t`;
  return formats.rupees.format(n);
}

/** Counts up to `value` over ~300ms on first paint. Skipped when the user prefers reduced motion. */
export function CountUp({ value, format }: { value: number; format: keyof typeof formats }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || value === 0) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (t: number) => {
      const k = Math.min((t - start) / 320, 1);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(origin + (value - origin) * eased);
      if (k < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{render(shown, format)}</>;
}
