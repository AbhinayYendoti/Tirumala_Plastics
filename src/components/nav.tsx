"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  Fuel,
  HandCoins,
  Home,
  LayoutGrid,
  Plus,
  Users,
  UserRound,
} from "lucide-react";
import { cx } from "./ui";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/inward", label: "Inward", icon: ArrowDownToLine },
  { href: "/outward", label: "Outward", icon: ArrowUpFromLine },
  { href: "/expenses", label: "Expenses", icon: Fuel },
  { href: "/payments", label: "Payments", icon: HandCoins },
  { href: "/parties", label: "Parties", icon: Users },
  { href: "/workers", label: "Workers", icon: UserRound },
  { href: "/materials", label: "Materials", icon: Boxes },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const MOBILE = [NAV[0], NAV[1], NAV[2], NAV[3], { href: "/more", label: "More", icon: LayoutGrid }];

const QUICK = [
  { href: "/inward/new", label: "Inward load", icon: ArrowDownToLine },
  { href: "/outward/new", label: "Outward load", icon: ArrowUpFromLine },
  { href: "/expenses#add", label: "Expense", icon: Fuel },
  { href: "/payments/new", label: "Payment", icon: HandCoins },
  { href: "/workers", label: "Salary / Advance", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/more")
    return ["/more", "/payments", "/parties", "/workers", "/materials", "/reports"].some((p) => pathname.startsWith(p));
  return pathname.startsWith(href);
}

/** Highlights the tapped tab immediately, before the next page has loaded. */
function useOptimisticPath() {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  const [prev, setPrev] = useState(pathname);
  if (prev !== pathname) {
    setPrev(pathname);
    setPending(null);
  }
  return { path: pending ?? pathname, setPending };
}

export function SideNav() {
  const { path, setPending } = useOptimisticPath();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setPending(href)}
          className={cx(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] transition-colors duration-150",
            isActive(path, href) ? "bg-maroon text-white" : "text-ink/80 hover:bg-maroon/5",
          )}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const { path, setPending } = useOptimisticPath();
  const activeIndex = MOBILE.findIndex((m) => isActive(path, m.href));
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-paper/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {activeIndex >= 0 && (
        <span
          aria-hidden
          className="absolute top-0 left-0 flex w-1/5 justify-center transition-transform duration-300 ease-[var(--ease-out-soft)]"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        >
          <span className="h-[3px] w-8 rounded-b-full bg-maroon" />
        </span>
      )}
      {MOBILE.map(({ href, label, icon: Icon }) => {
        const active = isActive(path, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setPending(href)}
            className={cx(
              "group flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors duration-150 active:scale-95",
              active ? "text-maroon" : "text-muted hover:text-maroon",
            )}
          >
            <span
              className={cx(
                "flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200",
                active ? "bg-maroon/10" : "bg-transparent group-hover:bg-maroon/5",
              )}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MoreLinks() {
  return (
    <div className="stagger grid grid-cols-2 gap-3">
      {NAV.slice(4).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-paper p-4 transition hover:-translate-y-0.5 hover:border-maroon/40 hover:shadow-sm active:scale-[0.97] active:bg-ivory"
        >
          <Icon className="text-maroon" />
          <span className="font-medium">{label}</span>
        </Link>
      ))}
    </div>
  );
}

export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (pathname.endsWith("/new") || pathname.includes("/edit")) return null;

  return (
    <div className="no-print">
      {open && (
        <button
          aria-label="Close"
          className="fixed inset-0 z-40 animate-fade-in bg-ink/30 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        className="fixed right-4 z-50 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 76px)" }}
      >
        {open &&
          QUICK.map(({ href, label, icon: Icon }, i) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              style={{ animationDelay: `${(QUICK.length - 1 - i) * 30}ms` }}
              className="flex origin-bottom-right animate-scale-in items-center gap-3 rounded-full bg-paper py-2.5 pl-4 pr-5 font-medium shadow-lg ring-1 ring-line transition hover:bg-ivory hover:text-maroon hover:ring-maroon/40 active:scale-95"
            >
              <Icon size={18} className="text-maroon" />
              {label}
            </Link>
          ))}
        <button
          aria-label={open ? "Close quick add" : "Quick add"}
          onClick={() => setOpen((o) => !o)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-maroon text-white shadow-xl shadow-maroon/30 transition duration-200 hover:scale-105 hover:bg-maroon-dark hover:shadow-2xl hover:shadow-maroon/40 active:scale-90"
        >
          <Plus size={26} className={cx("transition-transform duration-200", open && "rotate-45")} />
        </button>
      </div>
    </div>
  );
}
