import Link from "next/link";
import { monthOf, monthRange, shiftDays, todayIST } from "@/lib/format";
import type { Range } from "@/lib/queries";
import { cx } from "./ui";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const valid = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

function presets() {
  const today = todayIST();
  const thisMonth = monthRange(monthOf(today));
  const lastMonth = monthRange(monthOf(shiftDays(thisMonth.start, -1)));
  return [
    { key: "today", label: "Today", from: today, to: today },
    { key: "7d", label: "7 days", from: shiftDays(today, -6), to: today },
    { key: "month", label: "This month", from: thisMonth.start, to: today },
    { key: "last", label: "Last month", from: lastMonth.start, to: lastMonth.end },
  ];
}

/** Reads ?from=&to= and falls back to "this month". */
export async function resolveRange(searchParams: SearchParams, fallback = "month"): Promise<Range> {
  const sp = await searchParams;
  if (valid(sp.from) && valid(sp.to)) return { from: sp.from, to: sp.to };
  const p = presets().find((x) => x.key === fallback) ?? presets()[2];
  return { from: p.from, to: p.to };
}

export function RangeFilter({ path, range }: { path: string; range: Range }) {
  return (
    <div className="no-print mb-4 space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {presets().map((p) => {
          const active = p.from === range.from && p.to === range.to;
          return (
            <Link
              key={p.key}
              href={`${path}?from=${p.from}&to=${p.to}`}
              className={cx(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm",
                active ? "border-maroon bg-maroon text-white" : "border-line bg-paper text-ink/80",
              )}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
      <form action={path} className="flex flex-wrap items-center gap-2 text-sm">
        <input
          type="date"
          name="from"
          defaultValue={range.from}
          className="rounded-lg border border-line bg-paper px-2 py-1.5"
        />
        <span className="text-muted">to</span>
        <input
          type="date"
          name="to"
          defaultValue={range.to}
          className="rounded-lg border border-line bg-paper px-2 py-1.5"
        />
        <button className="rounded-lg border border-line bg-paper px-3 py-1.5 font-medium text-maroon">Show</button>
      </form>
    </div>
  );
}
