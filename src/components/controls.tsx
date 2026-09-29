"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Printer, Trash2 } from "lucide-react";
import { Spinner } from "./spinner";
import { cx } from "./ui";

/** Two-tap delete: avoids browser confirm() dialogs, which are clumsy on phones. */
export function ConfirmDelete({
  onConfirm,
  label = "Delete",
  compact,
}: {
  onConfirm: () => Promise<unknown>;
  label?: string;
  compact?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          timer.current = setTimeout(() => setArmed(false), 3000);
          return;
        }
        start(async () => {
          await onConfirm();
        });
      }}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg text-sm font-medium transition",
        compact ? "p-1.5" : "px-3 py-2",
        armed ? "animate-scale-in bg-outflow text-white" : "text-outflow hover:bg-outflow/10",
      )}
      aria-label={label}
    >
      {pending ? <Spinner size="sm" /> : <Trash2 size={16} />}
      {pending ? null : armed ? "Tap again" : compact ? null : label}
    </button>
  );
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-xl bg-maroon px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-maroon-dark hover:shadow-md active:scale-[0.97]"
    >
      <Printer size={16} /> Print / Save PDF
    </button>
  );
}

export function BackButton() {
  return (
    <button type="button" onClick={() => history.back()} className="text-sm text-maroon underline-offset-4 transition hover:text-maroon-dark hover:underline">
      ← Back
    </button>
  );
}
