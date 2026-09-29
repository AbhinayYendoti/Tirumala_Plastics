import { notFound } from "next/navigation";
import { Pencil, Phone } from "lucide-react";
import { RecordActions } from "@/components/record-actions";
import { RemovableList } from "@/components/removable-list";
import { SavedToast } from "@/components/toast";
import type { SearchParams } from "@/components/range-filter";
import { Badge, Card, Empty, LinkButton, PageHeader, Stat } from "@/components/ui";
import { SalaryTxnForm } from "@/components/worker-forms";
import { salaryBalance } from "@/lib/calc";
import { formatDate, formatMonth, MODE_LABELS, monthOf, rupees, todayIST } from "@/lib/format";
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
  const data = await workerDetail(Number(id));
  if (!data) notFound();
  const { worker, txns } = data;

  const today = todayIST();
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : monthOf(today);
  const monthTxns = txns.filter((t) => t.month === month);
  const sum = (type: string) => monthTxns.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
  const advances = sum("advance");
  const salaryPaid = sum("salary");
  const balance = salaryBalance({ monthlySalary: worker.monthlySalary, advances, salaryPaid });

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

      <h2 className="mb-2 text-sm font-medium text-muted">{formatMonth(month)}</h2>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Salary" value={rupees(worker.monthlySalary)} />
        <Stat label="Advances" value={rupees(advances)} />
        <Stat label="Salary paid" value={rupees(salaryPaid)} />
        <Stat label="Balance" value={rupees(balance)} tone={balance > 0 ? "out" : "in"} />
      </div>

      <Card className="mb-6">
        <div className="mb-3 font-medium">Give advance / pay salary</div>
        <SalaryTxnForm workerId={worker.id} today={today} month={month} balance={balance} />
      </Card>

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
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm text-muted">
        <span>
          {txns.length > 0
            ? "Left the job? Archive keeps the salary history."
            : "No salary entries yet — this worker can be deleted."}
        </span>
        <RecordActions
          kind="worker"
          id={worker.id}
          label="Worker"
          usage={txns.length}
          archived={!worker.active}
          listHref="/workers"
        />
      </div>
    </>
  );
}
