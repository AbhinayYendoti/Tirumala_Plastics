import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SearchParams } from "@/components/range-filter";
import { Badge, Card, Empty, LinkButton, PageHeader, Stat, cx } from "@/components/ui";
import { formatMonth, monthOf, monthRange, rupees, shiftDays, todayIST } from "@/lib/format";
import { workersForMonth } from "@/lib/queries";

export const metadata = { title: "Workers" };

export default async function WorkersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const current = monthOf(todayIST());
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : current;
  const { start, end } = monthRange(month);
  const prev = monthOf(shiftDays(start, -1));
  const next = monthOf(shiftDays(end, 1));
  const showLeft = sp.show === "left";
  const everyone = await workersForMonth(month, showLeft);
  const rows = showLeft ? everyone.filter((w) => !w.active) : everyone;
  const qs = (m: string) => `/workers?month=${m}${showLeft ? "&show=left" : ""}`;

  const payroll = rows.reduce((s, w) => s + w.monthlySalary, 0);
  const given = rows.reduce((s, w) => s + w.advances + w.salaryPaid, 0);
  const pending = rows.reduce((s, w) => s + Math.max(w.balance, 0), 0);

  return (
    <>
      <PageHeader
        title="Workers & salary"
        subtitle="Monthly salary sheet with advances"
        action={<LinkButton href="/workers/new">+ Worker</LinkButton>}
      />
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-line bg-paper px-2 py-1.5">
        <Link href={qs(prev)} className="rounded-lg p-2 text-maroon transition hover:bg-maroon/5" aria-label="Previous month">
          <ChevronLeft />
        </Link>
        <span className="font-serif text-lg">{formatMonth(month)}</span>
        <Link
          href={qs(next)}
          className={cx(
            "rounded-lg p-2 text-maroon transition hover:bg-maroon/5",
            month >= current && "pointer-events-none opacity-30",
          )}
          aria-label="Next month"
        >
          <ChevronRight />
        </Link>
      </div>
      <div className="mb-4 flex gap-2">
        {[
          { key: "", label: "Working" },
          { key: "left", label: "Left / archived" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/workers?month=${month}${t.key ? `&show=${t.key}` : ""}`}
            className={cx(
              "rounded-full border px-3.5 py-1.5 text-sm transition",
              (sp.show ?? "") === t.key ? "border-maroon bg-maroon text-white" : "border-line bg-paper hover:border-maroon/40 hover:bg-maroon/5 hover:text-maroon",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="stagger mb-4 grid grid-cols-3 gap-3">
        <Stat label="Payroll" value={rupees(payroll)} />
        <Stat label="Given" value={rupees(given)} />
        <Stat label="Pending" value={rupees(pending)} tone={pending > 0 ? "out" : undefined} />
      </div>

      {rows.length === 0 ? (
        <Empty>
          {showLeft ? "Nobody has been archived." : "No workers yet. Add your team to start the salary sheet."}
        </Empty>
      ) : (
        <Card className="stagger divide-y divide-line p-0">
          {rows.map((w) => (
            <Link
              key={w.id}
              href={`/workers/${w.id}?month=${month}`}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-ivory/60 active:bg-ivory"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">{w.name}</div>
                <div className="mt-0.5 text-xs text-muted">
                  Salary {rupees(w.monthlySalary)} · Advance {rupees(w.advances)} · Paid {rupees(w.salaryPaid)}
                </div>
              </div>
              {w.balance <= 0 ? (
                <Badge tone="in">Paid</Badge>
              ) : (
                <div className="text-right">
                  <div className="font-semibold text-outflow">{rupees(w.balance)}</div>
                  <div className="text-[11px] text-muted">to give</div>
                </div>
              )}
              <ChevronRight size={16} className="text-muted" />
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
