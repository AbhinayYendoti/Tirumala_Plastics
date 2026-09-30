import type { ReactNode } from "react";
import { BUSINESS } from "@/lib/business";
import { DbWarmup } from "./db-warmup";
import { LogoMark } from "./logo";

const MODULES = ["Loads", "Khata", "Payroll", "Expenses"];

// Faint gold dot grid, a nod to kolam patterns drawn at the doorstep.
const KOLAM = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='14' cy='14' r='1.4' fill='%23d4a63a'/%3E%3Cpath d='M14 4 L24 14 L14 24 L4 14 Z' fill='none' stroke='%23d4a63a' stroke-width='0.5' opacity='0.6'/%3E%3C/svg%3E")`;

/**
 * Auth layout: brand hero + form.
 * Phones: hero on top, form below it in normal document flow (one page scroll, nothing
 * overlaps, no viewport-height units, so the address bar showing/hiding can't move anything).
 * Desktop: hero left, form right, both a stable full screen tall.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="overflow-x-clip bg-ivory lg:grid lg:min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Wakes the database while they type their password. */}
      <DbWarmup />
      <section
        className="relative isolate overflow-hidden rounded-b-[2rem] px-5 pb-10 pt-[calc(env(safe-area-inset-top)+2.25rem)] text-center sm:pb-12 lg:flex lg:flex-col lg:items-center lg:justify-center lg:rounded-none lg:px-10 lg:py-16"
        style={{ background: "radial-gradient(120% 90% at 50% 0%, #8a2413 0%, #6b1a0e 45%, #3f0f07 100%)" }}
      >
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.07]" style={{ backgroundImage: KOLAM }} />
        {/* Soft gold glow, centred with auto margins (no transforms). */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 m-auto h-72 w-72 max-w-full rounded-full bg-gold/10 blur-3xl lg:h-[26rem] lg:w-[26rem]"
        />
        <div className="flex flex-col items-center">
          <LogoMark animated className="h-20 w-20 drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24 lg:h-36 lg:w-36" />
          <h1 className="tracking-in mt-4 whitespace-nowrap font-serif text-[2rem] leading-tight text-[#fff8ee] sm:text-4xl lg:mt-6 lg:text-5xl">
            Tirumala <span className="italic text-gold">Plastics</span>
          </h1>
          <p className="mt-2 animate-fade-up text-[11px] font-medium tracking-[0.35em] text-gold [animation-delay:700ms]">
            BUSINESS REGISTER
          </p>
          <ul className="mt-4 flex animate-fade-in flex-wrap items-center justify-center text-[13px] text-[#f3e3c3]/80 [animation-delay:950ms] lg:mt-5 lg:text-sm">
            {MODULES.map((m, i) => (
              <li key={m} className="flex items-center">
                {i > 0 && <span aria-hidden className="mx-2.5 h-3 w-px bg-gold/40 lg:mx-3" />}
                {m}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-10 hidden text-[11px] tracking-[0.2em] text-[#f3e3c3]/50 lg:block">
          GSTIN {BUSINESS.gstin} · KOTHAVALASA, VIZIANAGARAM
        </p>
      </section>

      <section className="flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-6 sm:px-6 sm:pt-8 lg:items-center lg:px-10 lg:py-12">
        <div className="w-full min-w-0 max-w-[440px] animate-fade-up [animation-delay:250ms]">{children}</div>
      </section>
    </main>
  );
}

/**
 * The single card every auth screen sits in: a thin maroon–gold rule on top ties it to the
 * hero, and on desktop a small brand row introduces the form (phones already see the hero above).
 */
export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-line bg-paper shadow-[0_1px_2px_rgba(42,26,20,0.05),0_18px_40px_-18px_rgba(107,26,14,0.28)] ${className ?? ""}`}
    >
      <div aria-hidden className="h-1 bg-gradient-to-r from-maroon via-gold to-maroon" />
      <div className="hidden items-center gap-3 px-6 pt-6 sm:px-7 lg:flex">
        <LogoMark className="h-10 w-10 shrink-0" />
        <div className="leading-tight">
          <div className="font-serif text-lg text-ink">
            Tirumala <span className="italic text-maroon">Plastics</span>
          </div>
          <div className="text-[10px] font-medium tracking-[0.25em] text-[#9a7b4f]">BUSINESS REGISTER</div>
        </div>
      </div>
      {children}
    </div>
  );
}
