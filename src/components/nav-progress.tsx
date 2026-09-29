"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Gold bar across the top while the next page loads. Starts on any internal link tap,
 * creeps toward 90%, and completes when the URL actually changes.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === location.pathname && url.search === location.search) return;

      clearInterval(timer.current);
      setVisible(true);
      setProgress(0.25);
      timer.current = setInterval(() => setProgress((p) => Math.min(p + (0.9 - p) * 0.15, 0.9)), 200);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    clearInterval(timer.current);
    setProgress((p) => (p > 0 ? 1 : 0));
    const hide = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 350);
    return () => clearTimeout(hide);
  }, [pathname, search]);

  return (
    <div
      aria-hidden
      className="nav-progress no-print"
      style={{ transform: `scaleX(${progress})`, opacity: visible ? 1 : 0 }}
    />
  );
}
