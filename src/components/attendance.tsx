"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { CheckCheck } from "lucide-react";
import type { AttendanceStatus } from "@/db/schema";
import { markAllPresent, setAttendance, settleMonth } from "@/lib/actions/attendance";
import { MODE_LABELS, rupees } from "@/lib/format";
import { useToast } from "./toast";
import { Badge, Button, Card, Select, cx } from "./ui";

type Mark = AttendanceStatus | null;

const OPTIONS: { value: AttendanceStatus; short: string; label: string; on: string }[] = [
  { value: "present", short: "P", label: "Present", on: "border-inflow bg-inflow text-white" },
  { value: "half", short: "½", label: "Half day", on: "border-gold bg-gold text-ink" },
  { value: "absent", short: "A", label: "Absent", on: "border-outflow bg-outflow text-white" },
];

/** Background for a marked day in the calendar and the legend. */
const DAY_TONE: Record<AttendanceStatus, string> = {
  present: "bg-inflow text-white",
  half: "bg-gold text-ink",
  absent: "bg-outflow text-white",
};

/** Local marks shown instantly while the save runs; they fall back to the server's values once it lands. */
function useMarks<K extends string | number>(initial: Record<K, Mark>) {
  const [marks, apply] = useOptimistic(initial, (state, patch: Partial<Record<K, Mark>>) => ({ ...state, ...patch }));
  const [, startTransition] = useTransition();
  const toast = useToast();

  const save = (patch: Partial<Record<K, Mark>>, run: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      apply(patch);
      try {
        const res = await run();
        if (!res.ok) toast({ message: res.error ?? "Could not save", tone: "error" });
      } catch {
        toast({ message: "No connection — attendance not saved", tone: "error" });
      }
    });
  return { marks, save, toast };
}

// ---------- Daily sheet (/attendance) ----------

type SheetWorker = {
  id: number;
  name: string;
  status: Mark;
  wage: string;
  /** This month so far, e.g. "Sep: 24 days · Due ₹3,400". */
  summary: string;
  due: boolean;
};

export function AttendanceSheet({ date, workers }: { date: string; workers: SheetWorker[] }) {
  const { marks, save, toast } = useMarks<number>(Object.fromEntries(workers.map((w) => [w.id, w.status])));
  const [bulkPending, startBulk] = useTransition();

  const unmarked = workers.filter((w) => !marks[w.id]).length;

  const allPresent = () =>
    startBulk(async () => {
      const res = await markAllPresent(date);
      if (!res.ok) toast({ message: res.error, tone: "error" });
      else toast({ message: res.count ? `${res.count} marked present` : "Everyone is already marked" });
    });

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">
          {workers.length - unmarked} of {workers.length} marked
        </span>
        {unmarked > 0 && (
          <Button variant="secondary" className="py-2" pending={bulkPending} onClick={allPresent}>
            <CheckCheck size={18} /> Mark all present
          </Button>
        )}
      </div>

      <Card className="stagger divide-y divide-line p-0">
        {workers.map((w) => {
          const current = marks[w.id] ?? null;
          return (
            <div key={w.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/workers/${w.id}?month=${date.slice(0, 7)}`} className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {w.name} <span className="text-xs font-normal text-muted">{w.wage}</span>
                </div>
                <div className={cx("truncate text-xs", w.due ? "text-outflow" : "text-muted")}>{w.summary}</div>
              </Link>
              <div role="radiogroup" aria-label={`Attendance for ${w.name}`} className="flex shrink-0 gap-1.5">
                {OPTIONS.map((o) => {
                  const on = current === o.value;
                  return (
                    <button
                      key={o.value}
                      role="radio"
                      aria-checked={on}
                      aria-label={o.label}
                      title={on ? `${o.label} — tap again to clear` : o.label}
                      onClick={() => {
                        const next = on ? null : o.value;
                        save({ [w.id]: next }, () => setAttendance(w.id, date, next));
                      }}
                      className={cx(
                        "h-11 w-11 rounded-xl border text-base font-semibold transition duration-150 active:scale-90",
                        on ? o.on : "border-line bg-paper text-muted hover:border-maroon/40 hover:text-ink",
                      )}
                    >
                      {o.short}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Card>
      <p className="mt-3 text-center text-xs text-muted">Tap a marked button again to clear it. Changes save instantly.</p>
    </>
  );
}

/** The date in the day header; picking another day opens its sheet. */
export function DateJump({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      value={date}
      max={today}
      aria-label="Pick a date"
      onChange={(e) => e.target.value && router.push(`/workers?date=${e.target.value}`)}
      className="rounded-lg bg-transparent px-2 py-1 text-center font-serif text-lg outline-none focus:ring-2 focus:ring-maroon/15"
    />
  );
}

// ---------- Month calendar (worker page) ----------

const CYCLE: Mark[] = [null, "present", "half", "absent"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function AttendanceCalendar({
  workerId,
  month,
  days,
  today,
  joinDate,
}: {
  workerId: number;
  month: string;
  days: Record<string, AttendanceStatus>;
  today: string;
  joinDate: string | null;
}) {
  const { marks, save } = useMarks<string>(days);
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();

  return (
    <div>
      <div className="grid w-fit grid-cols-[repeat(7,2rem)] gap-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className={cx("text-[11px] font-medium", i === 0 ? "text-outflow/70" : "text-muted")}>
            {d}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const mark = marks[date] ?? null;
          const locked = date > today || (!!joinDate && date < joinDate);
          const next = CYCLE[(CYCLE.indexOf(mark) + 1) % CYCLE.length];
          return (
            <button
              key={date}
              disabled={locked}
              onClick={() => save({ [date]: next }, () => setAttendance(workerId, date, next))}
              aria-label={`${i + 1}: ${mark ?? "not marked"}`}
              className={cx(
                "h-8 w-8 rounded-md text-xs tabular-nums transition duration-150 active:scale-90",
                mark ? DAY_TONE[mark] : "bg-ivory text-ink/80 ring-1 ring-inset ring-line hover:ring-maroon/40",
                date === today && "outline-2 outline-offset-1 outline-maroon",
                locked && "cursor-default opacity-30",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        {OPTIONS.map((o) => (
          <span key={o.value} className="flex items-center gap-1.5">
            <span className={cx("h-2.5 w-2.5 rounded-full", DAY_TONE[o.value])} /> {o.short}
          </span>
        ))}
        <span>· tap a day to change</span>
      </div>
    </div>
  );
}

// ---------- Settle (worker page) ----------

export function SettleButton({ workerId, month, balance }: { workerId: number; month: string; balance: number }) {
  const [confirming, setConfirming] = useState(false);
  const [mode, setMode] = useState("cash");
  const [pending, start] = useTransition();
  const toast = useToast();

  if (balance <= 0) return <Badge tone="in">Settled for this month</Badge>;

  if (!confirming)
    return (
      <Button className="w-full sm:w-auto" onClick={() => setConfirming(true)}>
        Pay {rupees(balance)}
      </Button>
    );

  return (
    <div className="flex flex-wrap items-center gap-2 animate-fade-up">
      <span className="text-sm">Pay {rupees(balance)} by</span>
      <Select value={mode} onChange={(e) => setMode(e.target.value)} className="w-auto py-2.5" aria-label="Paid by">
        {["cash", "upi", "bank", "cheque"].map((m) => (
          <option key={m} value={m}>
            {MODE_LABELS[m]}
          </option>
        ))}
      </Select>
      <Button
        pending={pending}
        onClick={() =>
          start(async () => {
            const res = await settleMonth(workerId, month, mode);
            if (!res.ok) toast({ message: res.error, tone: "error" });
            else toast({ message: `Paid ${rupees(res.amount)} — month settled` });
            setConfirming(false);
          })
        }
      >
        Confirm
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
        Cancel
      </Button>
    </div>
  );
}
