import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AttendanceSheet, DateJump } from "@/components/attendance";
import type { SearchParams } from "@/components/range-filter";
import { Badge, Card, Empty, LinkButton, PageHeader, cx } from "@/components/ui";
import { formatMonth, monthOf, plain, rupees, shiftDays, todayIST } from "@/lib/format";
import { attendanceForDate, workersForMonth } from "@/lib/queries";

export const metadata = { title: "Workers" };

const weekday = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", timeZone: "UTC" });

const shortMonth = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });

/** One screen: mark the day's attendance for everyone and see what each worker is due this month. */
export default async function WorkersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const today = todayIST();
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) && sp.date <= today ? sp.date : today;
  const month = monthOf(date);
  const [sheet, everyone] = await Promise.all([attendanceForDate(date), workersForMonth(month, true)]);
  const pay = new Map(everyone.map((w) => [w.id, w]));
  const working = everyone.filter((w) => w.active);
  const left = everyone.filter((w) => !w.active);

  if (sp.show === "left") return <LeftList rows={left} month={month} />;

  const due = working.reduce((s, w) => s + Math.max(w.balance, 0), 0);
  const given = working.reduce((s, w) => s + w.advances + w.salaryPaid, 0);
  const mon = shortMonth(month);
  const href = (d: string) => `/workers?date=${d}`;

  return (
    <>
      <PageHeader
        title="Workers"
        subtitle={date === today ? `Today, ${weekday(date)}` : weekday(date)}
        action={<LinkButton href="/workers/new">+ Worker</LinkButton>}
      />
      <div className="mb-4 flex items-center justify-between rounded-2xl border border-line bg-paper px-2 py-1.5">
        <Link href={href(shiftDays(date, -1))} className="rounded-lg p-2 text-maroon transition hover:bg-maroon/5" aria-label="Previous day">
          <ChevronLeft />
        </Link>
        <div className="flex items-center gap-2">
          <DateJump date={date} today={today} />
          {date !== today && (
            <Link href="/workers" className="text-sm text-maroon underline">
              Today
            </Link>
          )}
        </div>
        <Link
          href={href(shiftDays(date, 1))}
          className={cx("rounded-lg p-2 text-maroon transition hover:bg-maroon/5", date >= today && "pointer-events-none opacity-30")}
          aria-label="Next day"
        >
          <ChevronRight />
        </Link>
      </div>

      {sheet.length === 0 ? (
        <Empty>
          No workers yet.{" "}
          <Link href="/workers/new" className="text-maroon underline">
            Add your team
          </Link>{" "}
          to start marking attendance.
        </Empty>
      ) : (
        // Keyed by date so moving to another day starts from that day's marks.
        <AttendanceSheet
          key={date}
          date={date}
          workers={sheet.map((w) => {
            const p = pay.get(w.id);
            const days = p
              ? w.payBasis === "daily"
                ? `${plain(p.daysWorked)} days`
                : `${plain(p.leaveDays)} absent`
              : "";
            const owed = p && p.balance > 0;
            return {
              id: w.id,
              name: w.name,
              status: w.status,
              wage: w.payBasis === "daily" ? `${rupees(w.dailyWage)}/day` : `${rupees(w.monthlySalary)}/mo`,
              summary: `${mon}: ${days} · ${owed ? `Due ${rupees(p.balance)}` : "Paid ✓"}`,
              due: !!owed,
            };
          })}
        />
      )}

      {working.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
          <span>
            {formatMonth(month)} due <span className={cx("font-semibold", due > 0 && "text-outflow")}>{rupees(due)}</span>
          </span>
          <span className="text-muted">Given {rupees(given)}</span>
        </div>
      )}
      {left.length > 0 && (
        <Link href={`/workers?date=${date}&show=left`} className="mt-4 block text-center text-sm text-muted underline">
          Left / archived ({left.length})
        </Link>
      )}
    </>
  );
}

function LeftList({ rows, month }: { rows: { id: number; name: string; role: string | null }[]; month: string }) {
  return (
    <>
      <PageHeader title="Left / archived" subtitle="Their salary and attendance history is kept" />
      <Link href="/workers" className="mb-4 inline-flex items-center gap-1 text-sm text-maroon">
        <ChevronLeft size={16} /> Back to workers
      </Link>
      {rows.length === 0 ? (
        <Empty>Nobody has been archived.</Empty>
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
                {w.role && <div className="mt-0.5 text-xs text-muted">{w.role}</div>}
              </div>
              <Badge tone="gold">Left</Badge>
              <ChevronRight size={16} className="text-muted" />
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
