import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Phone } from "lucide-react";
import { AttendanceCalendar, SettleButton } from "@/components/attendance";
import { RecordActions } from "@/components/record-actions";
import { RemovableList } from "@/components/removable-list";
import { SavedToast } from "@/components/toast";
import type { SearchParams } from "@/components/range-filter";
import { Badge, Card, Empty, LinkButton, PageHeader, cx } from "@/components/ui";
import { AddSalaryTxn } from "@/components/worker-forms";
import { formatDate, formatMonth, MODE_LABELS, monthOf, monthRange, plain, rupees, shiftDays, todayIST } from "@/lib/format";
import { workerDetail } from "@/lib/queries";

const TYPE_LABEL = { advance: "Advance", salary: "Salary", bonus: "Bonus" } as const;

export default async function WorkerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const today = todayIST();
  const current = monthOf(today);
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : current;
  const data = await workerDetail(Number(id), month);
  if (!data) notFound();
  const { worker, txns, pay, days } = data;
  const { start, end } = monthRange(month);
  const prev = monthOf(shiftDays(start, -1));
  const next = monthOf(shiftDays(end, 1));
  const daily = worker.payBasis === "daily";

  return (
    <>
      <SavedToast message="Worker saved" />
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {worker.name}
            {!worker.active && <Badge tone="gold">Left</Badge>}
          </span>
        }
        subtitle={worker.role ?? undefined}
        action={
          <div className="flex gap-2">
            {worker.phone && (
              <a
                href={`tel:${worker.phone}`}
                className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-sm"
              >
                <Phone size={16} />
              </a>
            )}
            <LinkButton href={`/workers/${worker.id}/edit`} variant="secondary">
              <Pencil size={16} /> Edit
            </LinkButton>
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-line bg-paper px-2 py-1.5">
        <Link href={`/workers/${worker.id}?month=${prev}`} className="rounded-lg p-2 text-maroon transition hover:bg-maroon/5" aria-label="Previous month">
          <ChevronLeft />
        </Link>
        <span className="font-serif text-lg">{formatMonth(month)}</span>
        <Link
          href={`/workers/${worker.id}?month=${next}`}
          className={cx("rounded-lg p-2 text-maroon transition hover:bg-maroon/5", month >= current && "pointer-events-none opacity-30")}
          aria-label="Next month"
        >
          <ChevronRight />
        </Link>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="font-medium">Salary</span>
            <span className="text-xs text-muted">
              <span className="text-inflow">{pay.counts.present} P</span> · <span className="text-[#8a6412]">{pay.counts.half} ½</span> ·{" "}
              <span className="text-outflow">{pay.counts.absent} A</span>
            </span>
          </div>
          <p className="mb-3 text-xs text-muted">
            {daily
              ? `${plain(pay.daysWorked)} days × ${rupees(pay.perDay)}`
              : pay.deduction
                ? `${rupees(worker.monthlySalary)} − ${plain(pay.leaveDays)} day${pay.leaveDays === 1 ? "" : "s"} absent (${rupees(pay.deduction)})`
                : `${rupees(worker.monthlySalary)}, no absences`}
          </p>
          <dl className="mb-4 grid grid-cols-3 gap-2 text-center">
            <Figure label="Earned" value={rupees(pay.earned)} />
            <Figure label="Given" value={rupees(pay.advances + pay.salaryPaid)} />
            <Figure
              label={pay.balance < 0 ? "Overpaid" : "Due"}
              value={rupees(Math.abs(pay.balance))}
              className={pay.balance > 0 ? "text-outflow" : "text-inflow"}
            />
          </dl>
          {pay.bonus > 0 && <p className="mb-3 text-xs text-muted">Bonus given: {rupees(pay.bonus)} (extra, not deducted)</p>}
          <div className="mt-auto">
            <SettleButton workerId={worker.id} month={month} balance={pay.balance} />
          </div>
        </Card>

        <Card>
          <div className="mb-2 font-medium">Attendance</div>
          <AttendanceCalendar key={month} workerId={worker.id} month={month} days={days} today={today} joinDate={worker.joinDate} />
        </Card>
      </div>

      <div className="mb-6">
        <AddSalaryTxn workerId={worker.id} today={today} month={month} balance={pay.balance} />
      </div>

      <h2 className="mb-2 font-serif text-lg">History</h2>
      {txns.length === 0 ? (
        <Empty>No payments yet.</Empty>
      ) : (
        <RemovableList
          kind="salary_txn"
          label="Salary entry"
          edit={{ type: "salary", today }}
          rows={txns.map((t) => ({
            id: t.id,
            record: t,
            node: (
              <>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={t.type === "advance" ? "gold" : "neutral"}>{TYPE_LABEL[t.type]}</Badge>
                    <span className="text-xs text-muted">for {formatMonth(t.month)}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {formatDate(t.date)} · {MODE_LABELS[t.mode]}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </div>
                </div>
                <div className="font-semibold">{rupees(t.amount)}</div>
              </>
            ),
          }))}
        />
      )}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pb-2 pr-20 pt-4 text-sm text-muted">
        <span>
          {txns.length + data.attendanceMarked > 0
            ? "Left the job? Archive keeps their history. Delete removes the worker with all their salary and attendance entries."
            : "No salary or attendance entries yet — this worker can be deleted."}
        </span>
        <RecordActions
          kind="worker"
          id={worker.id}
          label="Worker"
          usage={txns.length + data.attendanceMarked}
          archived={!worker.active}
          listHref="/workers"
        />
      </div>
    </>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col-reverse rounded-xl bg-ivory px-2 py-2.5">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className={cx("font-semibold tabular-nums", className)}>{value}</dd>
    </div>
  );
}
