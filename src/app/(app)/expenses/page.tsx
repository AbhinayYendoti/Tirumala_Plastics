import { ExpenseForm } from "@/components/expense-form";
import { RemovableList } from "@/components/removable-list";
import { RangeFilter, resolveRange, type SearchParams } from "@/components/range-filter";
import { Badge, Card, Empty, PageHeader, Stat } from "@/components/ui";
import { CATEGORY_LABELS, formatDate, MODE_LABELS, plain, rupees, todayIST } from "@/lib/format";
import { expenseTotals, listExpenses } from "@/lib/queries";

export const metadata = { title: "Expenses" };

export default async function ExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const range = await resolveRange(searchParams);
  const today = todayIST();
  const [rows, totals] = await Promise.all([listExpenses(range), expenseTotals(range)]);
  const total = totals.reduce((s, t) => s + t.amount, 0);
  const diesel = totals.find((t) => t.category === "diesel");
  const power = totals.find((t) => t.category === "electricity");

  return (
    <>
      <PageHeader title="Expenses" subtitle="Diesel, current bill and daily spends" />

      <Card id="add" className="mb-6 scroll-mt-20">
        <ExpenseForm today={today} />
      </Card>

      <RangeFilter path="/expenses" range={range} />
      <div className="stagger mb-4 grid grid-cols-3 gap-3">
        <Stat label="Total" value={rupees(total)} tone="out" />
        <Stat
          label="Diesel"
          value={rupees(diesel?.amount)}
          sub={diesel?.quantity ? `${plain(diesel.quantity)} L` : undefined}
        />
        <Stat
          label="Electricity"
          value={rupees(power?.amount)}
          sub={power?.quantity ? `${plain(power.quantity)} units` : undefined}
        />
      </div>
      {totals.length > 2 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {totals
            .filter((t) => t.category !== "diesel" && t.category !== "electricity")
            .map((t) => (
              <Badge key={t.category}>
                {CATEGORY_LABELS[t.category]}: {rupees(t.amount)}
              </Badge>
            ))}
        </div>
      )}

      {rows.length === 0 ? (
        <Empty>No expenses in this period.</Empty>
      ) : (
        <RemovableList
          kind="expense"
          label="Expense"
          edit={{ type: "expense", today }}
          rows={rows.map((e) => ({
            id: e.id,
            record: e,
            node: (
              <>
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {CATEGORY_LABELS[e.category]}
                  {e.quantity ? (
                    <span className="font-normal text-muted">
                      {" "}
                      · {plain(e.quantity)} {e.category === "diesel" ? "L" : "units"}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted">
                  {formatDate(e.date)} · {MODE_LABELS[e.mode]}
                  {e.meterReading ? ` · meter ${e.meterReading}` : ""}
                  {e.notes ? ` · ${e.notes}` : ""}
                </div>
              </div>
              <div className="font-semibold">{rupees(e.amount)}</div>
              </>
            ),
          }))}
        />
      )}
    </>
  );
}
