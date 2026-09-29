"use client";

import type { ReactNode } from "react";
import { BUSINESS } from "@/lib/business";
import { LogoMark } from "./logo";

const MODULES = ["Loads", "Khata", "Payroll", "Expenses"];

// Faint gold dot grid, a nod to kolam patterns drawn at the doorstep.
const KOLAM = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='14' cy='14' r='1.4' fill='%23d4a63a'/%3E%3Cpath d='M14 4 L24 14 L14 24 L4 14 Z' fill='none' stroke='%23d4a63a' stroke-width='0.5' opacity='0.6'/%3E%3C/svg%3E")`;

/** Split layout: animated brand hero (top on phones, left on desktop) + the auth card. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-ivory lg:grid lg:grid-cols-[1.1fr_1fr]">
      <section
        className="relative flex min-h-[46dvh] flex-col items-center justify-center overflow-hidden rounded-b-[2.5rem] px-6 pb-16 pt-12 text-center lg:min-h-dvh lg:rounded-none lg:pb-12"
        style={{
          background: "radial-gradient(120% 90% at 50% 0%, #8a2413 0%, #6b1a0e 45%, #3f0f07 100%)",
        }}
      >
        <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: KOLAM }} />
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-3xl"
        />
        <div className="relative flex flex-col items-center">
          <LogoMark animated className="h-28 w-28 drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] lg:h-40 lg:w-40" />
          <h1 className="tracking-in mt-6 font-serif text-4xl text-[#fff8ee] lg:text-5xl">
            Tirumala <span className="italic text-gold">Plastics</span>
          </h1>
          <p className="mt-2 animate-fade-up text-xs font-medium tracking-[0.35em] text-gold [animation-delay:700ms]">
            BUSINESS REGISTER
          </p>
          <ul className="mt-5 flex animate-fade-in items-center text-sm text-[#f3e3c3]/80 [animation-delay:950ms]">
            {MODULES.map((m, i) => (
              <li key={m} className="flex items-center">
                {i > 0 && <span aria-hidden className="mx-3 h-3 w-px bg-gold/40" />}
                {m}
              </li>
            ))}
          </ul>
        </div>
        <p className="absolute bottom-5 hidden text-[11px] tracking-[0.2em] text-[#f3e3c3]/50 lg:block">
          GSTIN {BUSINESS.gstin} · KOTTAVALASA, VIZIANAGARAM
        </p>
      </section>

      <section className="relative -mt-10 flex justify-center px-4 pb-10 lg:mt-0 lg:items-center lg:px-10">
        <div className="w-full max-w-md animate-fade-up [animation-delay:250ms]">{children}</div>
      </section>
    </main>
  );
}
