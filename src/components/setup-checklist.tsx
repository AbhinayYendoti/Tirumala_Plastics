"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronRight, X } from "lucide-react";
import { cx } from "./ui";

type Status = { parties: boolean; workers: boolean; inward: boolean; expenses: boolean };

const STEPS: { key: keyof Status; title: string; sub: string; href: string }[] = [
  { key: "parties", title: "Add a supplier", sub: "Who sends you scrap", href: "/parties/new" },
  { key: "workers", title: "Add your workers", sub: "Name and monthly salary", href: "/workers/new" },
  { key: "inward", title: "Record the first inward load", sub: "Weighbridge gross & tare", href: "/inward/new" },
  { key: "expenses", title: "Add today's diesel or expense", sub: "Two taps", href: "/expenses#add" },
];

const KEY = "tp-setup-dismissed";

export function SetupChecklist({ status }: { status: Status }) {
  const done = STEPS.filter((s) => status[s.key]).length;
  const complete = done === STEPS.length;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {}
    setHidden(dismissed || complete);
  }, [complete]);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setHidden(true);
  };

  const pct = done / STEPS.length;
  const C = 2 * Math.PI * 20;

  return (
    <div
      className={cx(
        "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out",
        hidden ? "mb-0 grid-rows-[0fr] opacity-0" : "mb-6 grid-rows-[1fr] opacity-100",
      )}
      aria-hidden={hidden}
    >
      <div className="overflow-hidden">
        <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-[#fff7e8] to-paper p-4 sm:p-5">
          <button
            onClick={dismiss}
            aria-label="Hide setup"
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted hover:bg-line/60"
          >
            <X size={16} />
          </button>
          <div className="mb-4 flex items-center gap-4">
            <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--color-line)" strokeWidth="4" />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="var(--color-maroon)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - pct)}
                className="transition-[stroke-dashoffset] duration-700 ease-out"
              />
            </svg>
            <div>
              <div className="font-serif text-lg">Let&apos;s set up your register</div>
              <div className="text-sm text-muted">
                {done} of {STEPS.length} done · takes about 3 minutes
              </div>
            </div>
          </div>
          <ol className="stagger grid gap-2 sm:grid-cols-2">
            {STEPS.map((s) => {
              const ok = status[s.key];
              return (
                <li key={s.key}>
                  <Link
                    href={s.href}
                    className={cx(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition active:scale-[0.98]",
                      ok ? "border-inflow/20 bg-inflow/5" : "border-line bg-paper hover:border-maroon/40",
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                        ok ? "border-inflow bg-inflow text-white" : "border-line",
                      )}
                    >
                      {ok && <Check size={15} strokeWidth={3} className="animate-pop" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cx("block text-[15px] font-medium", ok && "text-muted line-through")}>{s.title}</span>
                      <span className="block text-xs text-muted">{s.sub}</span>
                    </span>
                    {!ok && <ChevronRight size={16} className="text-muted" />}
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
