"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cx } from "./ui";

/**
 * Bottom sheet on phones, centred dialog on larger screens.
 * Stays mounted briefly after `open` turns false so it can slide away.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => setMounted(false), 180);
    return () => clearTimeout(t);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="no-print fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label={title}>
      <button
        aria-label="Close"
        onClick={onClose}
        className={cx("absolute inset-0 bg-ink/40 backdrop-blur-[2px]", closing ? "animate-fade-out" : "animate-fade-in")}
      />
      <div
        className={cx(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-ivory shadow-2xl sm:max-w-2xl sm:rounded-3xl",
          closing ? "animate-sheet-out sm:animate-fade-out" : "animate-sheet-in sm:animate-scale-in",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <div>
            <h2 className="font-serif text-xl">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-muted hover:bg-line/60">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
